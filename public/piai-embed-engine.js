// piai-embed-engine.js
// v3.11.0 – PIXEL PERFECT EDITION (Zero Gap Guarantee)
// ==============================================================================
//
// CHANGELOG v3.11.0:
// ------------------
// 1. ROOT CAUSE FIX: Removed all scale rounding (no Math.floor/ceil).
//    - Scale now uses full decimal precision for pixel-perfect calculations.
//
// 2. CONTAINER-CONTENT SYNC: Container dimensions are set EXACTLY to scaled
//    content dimensions, eliminating any CSS vs JS calculation mismatch.
//
// 3. OVERFLOW SAFETY: Added overflow:hidden to clip any sub-pixel rendering
//    differences across browsers.
//
// 4. TRANSFORM ORIGIN: Fixed at '0 0' (top-left) for embed mode to ensure
//    predictable positioning without centering artifacts.
//
// 5. PRESERVED ALL FEATURES:
//    - Separate piaiInit (security) vs piaiApplyTheme (UI) messages
//    - iOS standalone URL support
//    - Fullscreen toggle with proper state management
//    - Theme switching (classic, educational, night)
//    - Minigame bridge with cookie parsing, stats, and result saving
//    - MutationObserver cleanup on DOM removal
//    - Responsive resize handling with RAF debouncing
//
// ==============================================================================

(function (global) {
  'use strict';

  // ============================================================================
  // 1) THEMES & CONFIGURATION
  // ============================================================================
  
  /**
   * Predefined themes for the embed engine.
   * Each theme defines colors for primary actions, accents, backgrounds, and text.
   */
  const THEMES = {
    classic: { 
      name: 'classic', 
      primary: '#800020',      // Burgundy - elegant, traditional
      accent: '#b8860b',       // Dark goldenrod - warm highlight
      secondary: '#002b5c',    // Navy blue - professional
      bg: '#f9f7f5',           // Off-white - easy on eyes
      text: '#002b4a',         // Dark blue - readable
      textLight: '#666666'     // Gray - secondary text
    },
    educational: { 
      name: 'educational', 
      primary: '#2196F3',      // Material blue - friendly, modern
      accent: '#FFC107',       // Amber - attention-grabbing
      secondary: '#4CAF50',    // Green - positive, growth
      bg: '#FFFFFF',           // Pure white - clean
      text: '#212121',         // Near black - high contrast
      textLight: '#757575'     // Medium gray - secondary
    },
    night: { 
      name: 'night', 
      primary: '#A1C2BD',      // Muted teal - calm
      accent: '#1D24CA',       // Deep blue - focused
      secondary: '#A8A1CE',    // Lavender - soft accent
      bg: '#19183B',           // Dark purple - easy night viewing
      text: '#F9E8C9',         // Warm cream - readable on dark
      textLight: '#9BA4B5'     // Muted blue-gray - secondary
    },
  };

  /**
   * Order of themes for cycling through with theme switch button.
   */
  const THEME_ORDER = Object.keys(THEMES);

  /**
   * Default configuration values.
   * These can be overridden by passing options to render().
   */
  const DEFAULT_CONFIG = {
    width: 800,                // Base content width in pixels
    height: 450,               // Base content height in pixels
    aspect: '16 / 9',          // Aspect ratio (used for initial layout)
    themeName: 'classic',      // Default theme
    headExtra: '',             // Additional HTML to inject in <head>
    fitMode: 'scroll',         // 'scroll' or 'no-scroll'
    header: true,              // Show header bar
    branding: true,            // Show PiAI branding
    debug: false               // Enable debug logging
  };

  /**
   * System font stack for consistent cross-platform typography.
   */
  const SYSTEM_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';
  
  /**
   * Base border radius for containers.
   */
  const BASE_RADIUS = 16;

  // ============================================================================
  // 2) HELPER FUNCTIONS
  // ============================================================================

  /**
   * Detect device type based on user agent.
   * @returns {Object} Device detection results
   */
  function detectDevice() {
    const ua = navigator.userAgent || '';
    return { 
      isIOS: /iPad|iPhone|iPod/.test(ua) && !window.MSStream,
      isAndroid: /Android/i.test(ua),
      isMobile: /Mobi|Android/i.test(ua)
    };
  }

  /**
   * Get theme object by name, with fallback to default.
   * @param {string} name - Theme name
   * @returns {Object} Theme object
   */
  function getThemeByName(name) { 
    return THEMES[name] || THEMES[DEFAULT_CONFIG.themeName]; 
  }

  /**
   * Normalize fit mode string to valid value.
   * @param {string} mode - Input fit mode
   * @returns {string} Normalized fit mode ('scroll' or 'no-scroll')
   */
  function normalizeFitMode(mode) {
    const m = String(mode || '').toLowerCase().trim();
    return (m === 'no-scroll' || m === 'noscroll' || m === 'compact') ? 'no-scroll' : 'scroll';
  }

  /**
   * Debug logger - only logs when debug mode is enabled.
   * @param {string} message - Log message
   * @param {*} data - Optional data to log
   * @param {boolean} debugEnabled - Whether debug is enabled
   */
  function debugLog(message, data, debugEnabled) {
    if (debugEnabled) {
      console.log(`[PiAI Engine v3.11.0] ${message}`, data || '');
    }
  }

  // ============================================================================
  // 3) CSS GENERATOR
  // ============================================================================

  /**
   * Generate base CSS with theme variables.
   * This CSS is injected into the iframe document.
   * @param {Object} theme - Theme object
   * @returns {string} CSS string
   */
  function getBaseCss(theme) {
    return `
      /* ========================================
         CSS RESET & VARIABLES
         ======================================== */
      :root {
        --piai-primary: ${theme.primary};
        --piai-accent: ${theme.accent};
        --piai-secondary: ${theme.secondary};
        --piai-bg: ${theme.bg};
        --piai-text: ${theme.text};
        --piai-text-light: ${theme.textLight};
      }
      
      * { 
        margin: 0; 
        padding: 0; 
        box-sizing: border-box; 
      }
      
      html, body { 
        width: 100%; 
        height: 100%; 
      }
      
      body {
        font-family: ${SYSTEM_FONT_STACK};
        color: var(--piai-text);
        background: transparent;
        overflow: hidden;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }

      /* ========================================
         MAIN WRAPPER
         ======================================== */
      .piai-wrap {
        width: 100%; 
        height: 100%;
        background: var(--piai-bg);
        display: flex; 
        flex-direction: column;
        overflow: hidden; 
        position: relative; 
        isolation: isolate;
      }

      /* ========================================
         HEADER
         ======================================== */
      .piai-hdr {
        background: var(--piai-primary); 
        color: #fff;
        padding: 12px 20px; 
        padding-right: 130px;
        font-weight: 700; 
        display: flex; 
        align-items: center; 
        gap: 10px;
        line-height: 1.2; 
        border-bottom: 3px solid var(--piai-accent);
        position: relative; 
        flex: 0 0 auto;
      }
      
      .piai-hdr svg { 
        width: 20px; 
        height: 20px; 
        display: block; 
        flex: 0 0 auto; 
      }

      /* ========================================
         BODY / CONTENT AREA
         ======================================== */
      .piai-body {
        flex: 1; 
        padding: 15px 20px;
        overflow-y: auto; 
        overflow-x: hidden;
        display: flex; 
        flex-direction: column;
        min-height: 0; 
        position: relative; 
        z-index: 1;
      }
      
      .piai-body > * { 
        margin-bottom: 15px; 
      }
      
      .piai-body > *:last-child { 
        margin-bottom: 0; 
      }
      
      .piai-body::-webkit-scrollbar { 
        width: 6px; 
      }
      
      .piai-body::-webkit-scrollbar-thumb { 
        background: var(--piai-text-light); 
        border-radius: 3px; 
      }

      /* ========================================
         MINIGAME BODY (No Padding)
         ======================================== */
      .piai-body.no-pad { 
        padding: 0 !important; 
        overflow: hidden !important; 
        width: 100%; 
        height: 100%; 
      }
      
      iframe.game-frame { 
        border: none; 
        width: 100%; 
        height: 100%; 
        display: block; 
      }

      /* ========================================
         CONTENT COMPONENTS
         ======================================== */
      .piai-def {
        background: var(--piai-bg); 
        border-left: 5px solid var(--piai-primary);
        padding: 12px 18px; 
        border-radius: 0 8px 8px 0; 
        transition: box-shadow 0.25s ease;
      }
      
      .piai-def:hover { 
        box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
      }
      
      .piai-def-title { 
        color: var(--piai-primary); 
        font-weight: 700; 
        display: flex; 
        align-items: center; 
        gap: 10px; 
        margin-bottom: 6px; 
      }
      
      .piai-grid { 
        display: flex; 
        flex: 1; 
        min-height: 0; 
        gap: 20px; 
      }
      
      .piai-list {
        flex: 1; 
        display: flex; 
        flex-direction: column; 
        overflow-y: auto; 
        overflow-x: hidden;
        padding-right: 26px; 
        padding-left: 6px;
      }
      
      .piai-list-item {
        display: flex; 
        align-items: center; 
        gap: 12px; 
        padding: 12px 16px; 
        margin-bottom: 8px;
        background: var(--piai-bg); 
        border-radius: 10px;
        box-shadow: inset 0 0 0 1px var(--piai-text-light); 
        transition: box-shadow 0.18s ease;
      }
      
      .piai-list-item:hover { 
        box-shadow: inset 0 0 0 2px var(--piai-accent), 0 2px 8px rgba(0,0,0,0.08); 
      }
      
      .piai-list-item .piai-ico { 
        color: var(--piai-accent); 
        width: 24px; 
        height: 24px; 
        flex: 0 0 24px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
      }
      
      .piai-visual { 
        flex: 0 0 280px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
      }
      
      .piai-visual svg { 
        max-width: 100%; 
        max-height: 100%; 
      }

      /* ========================================
         HEADER CONTROL BUTTONS
         ======================================== */
      .hdr-btn {
        position: absolute; 
        top: 50%; 
        transform: translateY(-50%); 
        z-index: 999;
        width: 48px; 
        height: 48px; 
        background: transparent; 
        border: none; 
        cursor: pointer;
        color: var(--piai-accent); 
        display: flex; 
        align-items: center; 
        justify-content: center;
        transition: color 0.2s ease;
      }
      
      .hdr-btn:hover { 
        color: #fff; 
      }
      
      .hdr-btn svg { 
        width: 26px; 
        height: 26px; 
        transition: transform 0.2s ease; 
      }
      
      .hdr-btn:hover svg { 
        transform: scale(1.1); 
      }
      
      .fs-btn { 
        right: 0; 
      }
      
      .theme-btn { 
        right: 58px; 
      }

      /* ========================================
         LOADING OVERLAY
         ======================================== */
      .piai-loader {
        position: absolute; 
        inset: 0; 
        background: rgba(0,0,0,0.2);
        display: flex; 
        align-items: center; 
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px); 
        -webkit-backdrop-filter: blur(4px);
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }
      
      .piai-loader.hide { 
        opacity: 0; 
        visibility: hidden; 
      }
      
      .piai-loader .loader-inner {
        padding: 14px 28px; 
        border-radius: 30px; 
        background: rgba(255,255,255,0.85);
        backdrop-filter: blur(12px); 
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,0.5); 
        box-shadow: 0 8px 32px 0 rgba(31,38,135,0.15);
        display: flex; 
        align-items: center; 
        gap: 12px;
      }
      
      .spinner {
        width: 24px; 
        height: 24px; 
        border: 3px solid transparent;
        border-top-color: var(--piai-primary); 
        border-right-color: var(--piai-primary);
        border-radius: 50%; 
        animation: spin 0.8s linear infinite;
      }
      
      @keyframes spin { 
        to { transform: rotate(360deg); } 
      }

      /* ========================================
         BRANDING
         ======================================== */
      .piai-brand {
        position: absolute; 
        right: -20px; 
        bottom: 12px; 
        width: 96px; 
        height: 26px;
        background: var(--piai-primary); 
        opacity: 0.95; 
        pointer-events: none; 
        z-index: 10;
        -webkit-mask-image: url("https://piai-embed-engine.vercel.app/public/logo.svg");
        -webkit-mask-repeat: no-repeat; 
        -webkit-mask-position: left center; 
        -webkit-mask-size: contain;
        mask-image: url("https://piai-embed-engine.vercel.app/public/logo.svg");
        mask-repeat: no-repeat; 
        mask-position: left center; 
        mask-size: contain;
      }

      /* ========================================
         MATHJAX OVERRIDE
         ======================================== */
      .MathJax, mjx-container { 
        transform: none !important; 
      }

      /* ========================================
         RESPONSIVE STYLES
         ======================================== */
      @media (max-width: 650px) {
        .piai-grid { 
          flex-direction: column; 
        }
        
        .piai-visual { 
          flex: 0 0 auto; 
          padding: 10px; 
          width: 100%; 
        }
        
        .piai-hdr { 
          padding: 10px 16px; 
          padding-right: 130px; 
        }
      }
    `;
  }

  /**
   * Build complete HTML document with injected styles and scripts.
   * @param {string} content - HTML content
   * @param {string} baseCss - CSS to inject
   * @param {string} headExtra - Additional head content
   * @returns {string} Complete HTML document
   */
  function buildHtmlDocument(content, baseCss, headExtra) {
    if (!content) return '';
    
    const inject = `<style>${baseCss}</style>${headExtra || ''}`;
    
    // If content is already a full HTML document
    if (/<!doctype html/i.test(content)) {
      if (content.includes('</head>')) {
        return content.replace('</head>', inject + '</head>');
      }
      return inject + content;
    }
    
    // Wrap content in basic HTML structure
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${inject}
</head>
<body>
  ${content}
</body>
</html>`;
  }

  /**
   * Create base style strings for container.
   * @param {Object} theme - Theme object
   * @param {string} aspect - Aspect ratio string
   * @returns {Object} Style strings for default and fullscreen modes
   */
  function createBaseStyle(theme, aspect) {
    const borderCol = (theme.primary || '#800020') + '26'; // 26 = ~15% opacity
    
    return {
      // Default embedded mode
      // NOTE v3.11.0: Removed aspect-ratio from CSS - JS controls dimensions directly
      default: `
        width: 100%;
        max-width: 100%;
        display: block;
        position: relative;
        box-sizing: border-box;
        border-radius: ${BASE_RADIUS}px;
        border: 1px solid ${borderCol};
        overflow: hidden;
        background: transparent;
      `.replace(/\s+/g, ' ').trim(),
      
      // Fullscreen mode
      fullscreen: `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        height: 100dvh;
        box-sizing: border-box;
        margin: 0;
        border-radius: 0;
        z-index: 99999;
        background: #000;
        border: none;
        overflow: hidden;
        padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
      `.replace(/\s+/g, ' ').trim(),
    };
  }

  // ============================================================================
  // 4) MINIGAME HTML GENERATOR
  // ============================================================================

  /**
   * Generate HTML for minigame mode with bridge script.
   * This creates the iframe wrapper and communication bridge for Open edX integration.
   * @param {Object} ctx - Context object with embed settings
   * @param {Object} config - Full configuration object
   * @returns {string} HTML string
   */
  function generateMinigameHTML(ctx, config) {
    // Extract parent page data for bridge communication
    const PARENT_DATA = {
      cookie: document.cookie || '',
      origin: window.location.origin,
      isStudio: window.location.hostname.includes('studio'),
      gameKey: config.gameKey || 'unknown-game',
      gameUrl: config.gameUrl,
      gameOrigin: config.gameOrigin || new URL(config.gameUrl).origin,
      debug: config.debug || false
    };

    // Determine API base URL
    const apiPath = PARENT_DATA.isStudio 
      ? "https://pistudy.vn/api/minigames/" 
      : "/api/minigames/";
    const apiBase = apiPath.startsWith('http') 
      ? apiPath 
      : (PARENT_DATA.origin + apiPath);
    
    // Escape cookie string for safe embedding in template literal
    const safeCookie = PARENT_DATA.cookie
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\${/g, '\\${');

    return `
    <div class="piai-wrap" style="background: transparent;">
      <!-- Loading Overlay -->
      <div class="piai-loader" id="loader">
        <div class="loader-inner">
          <div class="spinner"></div>
          <div class="loader-text">Đang tải...</div>
        </div>
      </div>
      
      <!-- Game Iframe Container -->
      <main class="piai-body no-pad">
        <iframe 
          class="game-frame" 
          src="${PARENT_DATA.gameUrl}" 
          allow="autoplay; encrypted-media; fullscreen"
        ></iframe>
      </main>
    </div>
    
    <script>
    /**
     * PiAI Minigame Bridge Script
     * Handles communication between parent page (LMS) and game iframe.
     * Features:
     * - Cookie-based user authentication
     * - Stats fetching and result saving via API
     * - PostMessage communication with origin validation
     */
    (function() {
      // Configuration
      const CFG = { 
        cookies: \`${safeCookie}\`, 
        apiBase: "${apiBase}", 
        gameKey: "${PARENT_DATA.gameKey}", 
        gameUrl: "${PARENT_DATA.gameUrl}", 
        isStudio: ${PARENT_DATA.isStudio}, 
        debug: ${PARENT_DATA.debug} 
      };
      
      /**
       * Debug logger
       */
      function log(message, data) { 
        if (CFG.debug) {
          console.log("[Bridge] " + message, data || ""); 
        }
      }
      
      /**
       * Parse cookie value by name
       */
      function getCookie(name) { 
        const match = CFG.cookies.match('(^|;) ?' + name + '=([^;]*)(;|$)'); 
        return match ? match[2] : null; 
      }
      
      /**
       * Extract user info from JWT or legacy cookie
       */
      function getUser() {
        let user = { name: "Khách", username: "guest" };
        
        // Try JWT cookie first (newer Open edX)
        const jwt = getCookie("edx-jwt-cookie-header-payload");
        if (jwt) { 
          try { 
            const payload = JSON.parse(atob(jwt.split(".")[1])); 
            user.name = payload.name || payload.preferred_username; 
            user.username = payload.preferred_username; 
            return user; 
          } catch(e) {
            log("JWT parse error", e);
          } 
        }
        
        // Fall back to legacy cookie
        const oldCookie = getCookie("edx-user-info");
        if (oldCookie) { 
          try { 
            const cleaned = oldCookie
              .replace(/^"|"$/g, '')
              .split('\\\\054').join(',')
              .split('\\\\\\\\').join(''); 
            const info = JSON.parse(cleaned); 
            user.name = info.username; 
            user.username = info.username; 
            return user; 
          } catch(e) {
            log("Legacy cookie parse error", e);
          } 
        }
        
        return user;
      }
      
      /**
       * Make API request with error handling
       */
      async function api(endpoint, options = {}) { 
        try { 
          const response = await fetch(CFG.apiBase + endpoint, options); 
          if (!response.ok) {
            throw new Error('HTTP ' + response.status); 
          }
          return response; 
        } catch(e) { 
          log("API Error", e); 
          throw e; 
        } 
      }
      
      /**
       * Fetch user's game statistics
       */
      async function fetchStats() { 
        // In Studio mode, return empty stats
        if (CFG.isStudio) {
          return { playCount: 0, bestScore: 0 }; 
        }
        
        try { 
          const response = await api("logs/"); 
          const data = await response.json(); 
          const rows = Array.isArray(data) ? data : (data.results || []); 
          
          let playCount = 0;
          let bestScore = 0; 
          
          rows.forEach(item => { 
            if (item.payload?.gameKey === CFG.gameKey) { 
              playCount++; 
              const score = Number(item.payload.score || 0); 
              if (score > bestScore) {
                bestScore = score; 
              }
            } 
          }); 
          
          return { playCount, bestScore }; 
        } catch(e) { 
          return { playCount: 0, bestScore: 0 }; 
        } 
      }
      
      /**
       * Save game result to API
       */
      async function saveResult(payload) { 
        // Skip saving in Studio mode
        if (CFG.isStudio) {
          return true; 
        }
        
        try { 
          await api("logs/", { 
            method: "POST", 
            headers: { 
              "Content-Type": "application/json", 
              "X-CSRFToken": getCookie('csrftoken') || "" 
            }, 
            body: JSON.stringify({ 
              msgtype: "RESULT", 
              tsms: Date.now(), 
              payload: { 
                ...payload, 
                userId: null, 
                username: getUser().username 
              } 
            }) 
          }); 
          return true; 
        } catch(e) { 
          return false; 
        } 
      }
      
      // DOM Elements
      const iframe = document.querySelector('iframe.game-frame'); 
      const loader = document.getElementById('loader'); 
      
      // Hide loader when game loads
      iframe.onload = function() {
        setTimeout(function() {
          loader.classList.add('hide');
        }, 500);
      };
      
      // Message Handler - Communication Bridge
      window.addEventListener('message', function(event) {
        // Validate origin for security
        if (event.origin !== new URL(CFG.gameUrl).origin) {
          return;
        }
        
        const msg = event.data; 
        
        /**
         * Send message to game iframe
         */
        function send(data) {
          iframe.contentWindow.postMessage(data, CFG.gameUrl);
        }
        
        // Async handler for messages
        (async function() {
          // Handle MINIGAME_READY or REFRESH_STATS
          if (msg.type === "MINIGAME_READY" || 
              (msg.type === "MINIGAME_ACTION" && msg.action === "REFRESH_STATS")) { 
            send({ 
              type: "MINIGAME_DATA", 
              userName: getUser().name, 
              stats: await fetchStats() 
            }); 
          }
          
          // Handle SAVE_RESULT
          if (msg.type === "MINIGAME_ACTION" && msg.action === "SAVE_RESULT") { 
            await saveResult(msg.data); 
            send({ 
              type: "MINIGAME_DATA", 
              userName: getUser().name, 
              stats: await fetchStats() 
            }); 
          }
        })();
      });
    })();
    <\/script>`;
  }

  // ============================================================================
  // 5) MAIN RENDER FUNCTION
  // ============================================================================

  /**
   * Main render function - creates and manages the embed.
   * @param {Object} options - Configuration options
   */
  function render(options) {
    // Merge options with defaults
    const config = Object.assign({}, DEFAULT_CONFIG, options || {});
    
    // Auto-detect minigame mode
    const isMinigame = !!config.gameUrl;
    
    // Set default theme for minigames if not specified
    if (isMinigame && (!options.themeName && !options.theme)) {
      config.themeName = 'educational'; 
    }

    // Destructure configuration
    const {
      id, 
      container: cNode, 
      width, 
      height, 
      aspect,
      themeName, 
      theme: tOverride, 
      html, 
      htmlGenerator,
      headExtra, 
      onReady, 
      onThemeChange, 
      fitMode,
      debug
    } = config;

    // Get container element
    const container = cNode || (typeof id === 'string' ? document.getElementById(id) : null);
    if (!container) {
      console.error('[PiAI Engine] Container not found:', id);
      return;
    }

    // Cleanup previous instance if exists
    if (typeof container.__piaiCleanup === 'function') { 
      try { 
        container.__piaiCleanup(); 
      } catch (_) {} 
      container.__piaiCleanup = null; 
    }
    
    // Ensure container has an ID
    const containerId = container.id || (typeof id === 'string' ? id : 'piai_' + Date.now());
    container.id = containerId;

    debugLog('Initializing embed', { containerId, width, height, isMinigame }, debug);

    // Device detection
    const { isIOS, isMobile } = detectDevice();
    
    // Theme setup
    let currentTheme = tOverride || getThemeByName(themeName);
    let currentThemeName = currentTheme.name || themeName || DEFAULT_CONFIG.themeName;
    let baseCss = getBaseCss(currentTheme);
    let baseStyle = createBaseStyle(currentTheme, aspect);

    // Clear container
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    // Apply initial container style
    container.style.cssText = baseStyle.default;

    // Create wrapper div for scaling
    // This wrapper has the ORIGINAL dimensions (e.g., 1920x1080)
    // and will be scaled down to fit the container
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${width}px;
      height: ${height}px;
      transform-origin: 0 0;
    `.replace(/\s+/g, ' ').trim();

    // Build context for HTML generators
    const ctxBase = { 
      id: containerId, 
      embedId: containerId, 
      width, 
      height, 
      aspect, 
      theme: currentTheme, 
      themeName: currentThemeName, 
      baseCss, 
      isIOS 
    };

    // Generate content HTML
    let finalHtml = '';
    if (isMinigame) {
      finalHtml = generateMinigameHTML(ctxBase, config);
    } else {
      const generator = typeof htmlGenerator === 'function' ? htmlGenerator : () => html || '';
      finalHtml = generator(Object.assign({}, ctxBase, { isStandalone: false }));
    }

    // Handle fit mode
    const fitNorm = normalizeFitMode(fitMode);
    const fitHead = fitNorm === 'no-scroll' 
      ? `<script>(function(){try{document.documentElement.classList.add('piai-fit-noscroll');}catch(_){}})();<\/script>` 
      : '';
    const headExtraFinal = (headExtra || '') + fitHead;

    // Bail if no content
    if (!finalHtml) {
      console.warn('[PiAI Engine] No content to render');
      return;
    }
    
    // Build final HTML document
    const iframeHtml = buildHtmlDocument(finalHtml, baseCss, headExtraFinal);

    // iOS standalone URL (for fullscreen workaround)
    let iosStandaloneUrl = '';
    if (isIOS && !isMinigame) {
      const generator = typeof htmlGenerator === 'function' ? htmlGenerator : () => html;
      const standaloneRaw = generator(Object.assign({}, ctxBase, { isStandalone: true }));
      if (standaloneRaw) { 
        try { 
          iosStandaloneUrl = URL.createObjectURL(
            new Blob([buildHtmlDocument(standaloneRaw, baseCss, headExtraFinal)], { type: 'text/html' })
          ); 
        } catch (e) {
          debugLog('iOS standalone URL creation failed', e, debug);
        } 
      }
    }

    // Create blob URL for iframe src
    const blobUrl = URL.createObjectURL(new Blob([iframeHtml], { type: 'text/html' }));
    
    // Create iframe element
    const iframe = document.createElement('iframe');
    iframe.src = blobUrl;
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      background: ${isMinigame ? 'transparent' : (currentTheme.bg || '#f9f7f5')};
    `.replace(/\s+/g, ' ').trim();
    iframe.scrolling = 'no';
    iframe.loading = 'lazy';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-popups';
    iframe.allow = 'fullscreen; clipboard-read; clipboard-write; autoplay; encrypted-media';
    
    if (iosStandaloneUrl) {
      iframe.dataset.iosStandaloneUrl = iosStandaloneUrl;
    }

    // Iframe load handler
    iframe.onload = function () {
      // Clean up blob URL
      try { 
        URL.revokeObjectURL(blobUrl); 
      } catch (_) {}
      
      // Send initialization messages to iframe
      if (iframe.contentWindow) {
        // 1. Send ID for handshake/security (no theme data)
        iframe.contentWindow.postMessage({ 
          type: 'piaiInit', 
          id: containerId,
          version: '3.11.0'
        }, '*');

        // 2. Send theme for UI styling (separate message)
        iframe.contentWindow.postMessage({ 
          type: 'piaiApplyTheme', 
          themeName: currentThemeName, 
          theme: currentTheme 
        }, '*');
      }

      debugLog('Iframe loaded', { containerId }, debug);

      // Call user callback
      if (typeof onReady === 'function') {
        onReady(iframe, ctxBase);
      }
    };

    // ========================================================================
    // 6) SCALING & EVENT HANDLING
    // ========================================================================
    
    let isFull = false;        // Fullscreen state
    let resizeRAF = null;      // RAF handle for resize debouncing

    /**
     * UPDATE SCALE - Core scaling logic (v3.11.0 Fix)
     * 
     * KEY CHANGES:
     * 1. NO ROUNDING of scale value - use full decimal precision
     * 2. Container dimensions set EXACTLY to scaled content size
     * 3. Transform origin at 0,0 for predictable positioning
     */
    const updateScale = () => {
      // Get container dimensions
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width || container.clientWidth || width;
      const containerHeight = rect.height || container.clientHeight || height;

      // Calculate scale factor
      let scale;
      if (isFull) {
        // Fullscreen: fit within available space (maintain aspect ratio)
        scale = Math.min(containerWidth / width, containerHeight / height);
      } else {
        // Embed: scale to fit width exactly
        scale = containerWidth / width;
      }
      
      // Safety check
      if (!Number.isFinite(scale) || scale <= 0) {
        scale = 1;
      }

      // =====================================================================
      // v3.11.0 FIX: NO ROUNDING
      // =====================================================================
      // Previous versions used Math.floor or Math.ceil which caused gaps.
      // We now use the EXACT scale value for pixel-perfect rendering.
      // 
      // Example with containerWidth = 360px, baseWidth = 1920px:
      // - Exact scale = 0.1875
      // - Math.floor(0.1875 * 1000) / 1000 = 0.187 → contentWidth = 359.04px → GAP!
      // - Math.ceil(0.1875 * 1000) / 1000 = 0.188 → contentWidth = 360.96px → OVERFLOW!
      // - Exact: 0.1875 → contentWidth = 360px → PERFECT!
      // =====================================================================

      // Calculate exact content dimensions after scaling
      const contentWidth = width * scale;
      const contentHeight = height * scale;

      debugLog('Scale calculation', { 
        containerWidth, 
        containerHeight, 
        scale: scale.toFixed(6), 
        contentWidth: contentWidth.toFixed(2), 
        contentHeight: contentHeight.toFixed(2),
        isFull 
      }, debug);

      if (isFull) {
        // =================================================================
        // FULLSCREEN MODE
        // =================================================================
        // Center content within viewport
        const dx = (containerWidth - contentWidth) / 2;
        const dy = (containerHeight - contentHeight) / 2;
        
        wrapper.style.transformOrigin = '0 0';
        wrapper.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
        
      } else {
        // =================================================================
        // EMBED MODE (v3.11.0 Fix)
        // =================================================================
        // KEY: Set container height to EXACT content height.
        // This eliminates any gap between CSS aspect-ratio and JS scaling.
        //
        // The container's initial aspect-ratio (from HTML) serves only as
        // a placeholder for layout shift prevention. Once JS runs, we
        // override with the exact calculated height.
        // =================================================================
        
        // Set container height to exact scaled content height
        container.style.height = `${contentHeight}px`;
        
        // Position wrapper at origin (no centering needed in embed mode)
        wrapper.style.transformOrigin = '0 0';
        wrapper.style.transform = `scale(${scale})`;
        
        // Note: translate(0, 0) is default, no need to specify
      }
    };

    /**
     * Set fullscreen state
     */
    const setFullscreen = (state) => {
      isFull = state;
      container.style.cssText = state ? baseStyle.fullscreen : baseStyle.default;
      
      // Update scale on next frame
      requestAnimationFrame(updateScale);
      
      // Notify iframe of fullscreen state
      try { 
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({ 
            type: 'fullscreenState', 
            id: containerId, 
            isFullscreen: state 
          }, '*'); 
        }
      } catch (_) {}
      
      debugLog('Fullscreen state changed', { state }, debug);
    };

    /**
     * Switch to next theme
     */
    const switchTheme = () => {
      // Find current theme index
      let idx = THEME_ORDER.indexOf(currentThemeName);
      if (idx < 0) idx = 0;
      
      // Move to next theme (cycle)
      currentThemeName = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
      currentTheme = getThemeByName(currentThemeName);
      baseCss = getBaseCss(currentTheme);
      baseStyle = createBaseStyle(currentTheme, aspect);
      
      // Update container style
      container.style.cssText = isFull ? baseStyle.fullscreen : baseStyle.default;
      
      // Update iframe background
      iframe.style.background = isMinigame ? 'transparent' : (currentTheme.bg || '#f9f7f5');
      
      // Recalculate scale (in case container size changed)
      updateScale();
      
      // Notify iframe of theme change
      try { 
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({ 
            type: 'piaiApplyTheme', 
            themeName: currentThemeName, 
            theme: currentTheme 
          }, '*'); 
        }
      } catch (_) {}
      
      // User callback
      if (typeof onThemeChange === 'function') {
        onThemeChange(currentThemeName, currentTheme);
      }
      
      debugLog('Theme switched', { themeName: currentThemeName }, debug);
    };

    /**
     * Handle postMessage events from iframe
     */
    const onMessage = (e) => {
      // Validate message has our container ID
      if (!e.data || e.data.id !== containerId) return;
      
      // Handle fullscreen toggle
      if (e.data.type === 'toggleFullscreen') {
        if (isIOS) return; // Fullscreen not supported on iOS
        
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else if (isFull) {
          setFullscreen(false);
        } else if (container.requestFullscreen) {
          container.requestFullscreen()
            .then(() => setFullscreen(true))
            .catch(() => setFullscreen(true)); // Fallback to manual fullscreen
        } else {
          setFullscreen(true);
        }
      }
      
      // Handle theme switch
      if (e.data.type === 'switchTheme') {
        switchTheme();
      }
    };

    /**
     * Handle native fullscreen change
     */
    const onFullscreenChange = () => {
      if (isIOS) return;
      
      if (document.fullscreenElement === container) {
        setFullscreen(true);
      } else if (isFull && !document.fullscreenElement) {
        setFullscreen(false);
      }
    };

    /**
     * Handle keyboard events (Escape to exit fullscreen)
     */
    const onKeydown = (e) => {
      if (e.key === 'Escape' && isFull && !document.fullscreenElement) {
        setFullscreen(false);
      }
    };

    /**
     * Handle resize events (debounced with RAF)
     */
    const onResize = () => {
      if (resizeRAF) {
        cancelAnimationFrame(resizeRAF);
      }
      resizeRAF = requestAnimationFrame(updateScale);
    };

    // Register event listeners
    window.addEventListener('message', onMessage);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    // MutationObserver to detect container removal
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.removedNodes) {
          if (node === container || (node.contains && node.contains(container))) {
            cleanup();
            observer.disconnect();
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    /**
     * Cleanup function - removes all event listeners and URLs
     */
    function cleanup() {
      window.removeEventListener('message', onMessage);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('keydown', onKeydown);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      
      try { 
        if (iosStandaloneUrl) {
          URL.revokeObjectURL(iosStandaloneUrl); 
        }
      } catch (_) {}
      
      try { 
        observer.disconnect(); 
      } catch (_) {}
      
      debugLog('Cleanup complete', { containerId }, debug);
    }
    
    // Store cleanup function on container for future re-renders
    container.__piaiCleanup = cleanup;

    // ========================================================================
    // 7) MOUNT & INITIAL RENDER
    // ========================================================================
    
    // Mount iframe into wrapper
    wrapper.appendChild(iframe);
    
    // Mount wrapper into container
    container.appendChild(wrapper);
    
    // Initial scale calculation
    updateScale();
    
    debugLog('Embed mounted successfully', { containerId, version: '3.11.0' }, debug);
  }

  // ============================================================================
  // 8) PUBLIC API EXPORT
  // ============================================================================
  
  global.PiaiEmbed = {
    /**
     * Engine version
     */
    version: '3.11.0',
    
    /**
     * Main render function
     */
    render,
    
    /**
     * Available themes
     */
    themes: THEMES,
    
    /**
     * Get theme by name
     */
    getThemeByName,
    
    /**
     * Get base CSS for a theme
     */
    getBaseCss,
    
    /**
     * Default configuration
     */
    defaults: DEFAULT_CONFIG
  };

})(window);
