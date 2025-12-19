// piai-embed-engine.js
// v3.6.0 – ULTIMATE EDITION
// Updated: 2025-12-19
// --------------------------------------------------------
// CHANGELOG:
// 1. UNIFIED RENDER: Tích hợp Minigame + Standard vào một hàm render().
// 2. SMART BRIDGE: Tự động lấy Auth, Cookie, CSRF từ Parent.
// 3. ROBUST NETWORKING: Thêm cơ chế `fetchWithRetry` (thử lại khi lỗi mạng).
// 4. ERROR HANDLING: Safe JSON parse, chặn crash khi cookie lỗi.
// 5. FLEXIBLE UI: Thêm config `header: false` để ẩn thanh tiêu đề.
// 6. PERFORMANCE: Tối ưu Repaint/Reflow, fix Android scaling, fix Text Blur.
// --------------------------------------------------------

(function (global) {
  'use strict';

  // ============================================================
  // 1) CONFIGURATION & CONSTANTS
  // ============================================================
  const VERSION = '3.6.0';
  
  const THEMES = {
    classic: {
      name: 'classic',
      primary: '#800020',
      accent: '#b8860b',
      secondary: '#002b5c',
      bg: '#f9f7f5',
      text: '#002b4a',
      textLight: '#666666',
    },
    educational: {
      name: 'educational',
      primary: '#2196F3',
      accent: '#FFC107',
      secondary: '#4CAF50',
      bg: '#FFFFFF',
      text: '#212121',
      textLight: '#757575',
    },
    night: {
      name: 'night',
      primary: '#A1C2BD',
      accent: '#1D24CA',
      secondary: '#A8A1CE',
      bg: '#19183B',
      text: '#F9E8C9',
      textLight: '#9BA4B5',
    },
  };

  const THEME_ORDER = ['classic', 'educational', 'night'];

  const DEFAULT_CONFIG = {
    width: 800,
    height: 450,
    aspect: '16 / 9',
    themeName: 'classic',
    headExtra: '',
    fitMode: 'scroll', // Options: 'scroll' | 'no-scroll' | 'compact'
    header: true,      // Options: true | false (Ẩn/Hiện header)
    debug: false       // Options: true (Hiện log chi tiết)
  };

  const SYSTEM_FONT_STACK =
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,' +
    '"Helvetica Neue",Arial,"Noto Sans",sans-serif,' +
    '"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';

  const BASE_RADIUS = 16;

  // ============================================================
  // 2) HELPER FUNCTIONS (UTILITIES)
  // ============================================================
  
  /**
   * Phát hiện loại thiết bị để áp dụng các bản vá lỗi hiển thị riêng biệt.
   */
  function detectDevice() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/i.test(ua);
    const isMobile = isIOS || /Mobi|Android/i.test(ua);
    return { isIOS, isAndroid, isMobile };
  }

  function getThemeByName(name) {
    return THEMES[name] || THEMES[DEFAULT_CONFIG.themeName];
  }

  function normalizeFitMode(mode) {
    const m = String(mode || '').toLowerCase().trim();
    if (m === 'no-scroll' || m === 'noscroll' || m === 'compact') return 'no-scroll';
    return 'scroll';
  }

  // ============================================================
  // 3) CSS GENERATOR (OPTIMIZED FOR PERFORMANCE)
  // ============================================================
  function getBaseCss(theme) {
    return `
      :root {
        --piai-primary: ${theme.primary};
        --piai-accent: ${theme.accent};
        --piai-secondary: ${theme.secondary};
        --piai-bg: ${theme.bg};
        --piai-text: ${theme.text};
        --piai-text-light: ${theme.textLight};
      }
      * { margin:0; padding:0; box-sizing:border-box; }
      html, body { width:100%; height:100%; }
      body {
        font-family: ${SYSTEM_FONT_STACK};
        color: var(--piai-text);
        background: transparent;
        overflow: hidden;
        /* Text rendering optimization */
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }
      .piai-wrap {
        width: 100%;
        height: 100%;
        background: var(--piai-bg);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        isolation: isolate; /* Create new stacking context */
      }

      /* ========== HEADER ========== */
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
        transition: transform 0.3s ease;
      }
      .piai-hdr svg { width:20px; height:20px; display:block; flex:0 0 auto; }
      /* Class utility to hide header */
      .piai-hdr.hidden { display: none !important; }

      /* ========== BODY ========== */
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
      /* Special mode for games */
      .piai-body.no-pad { padding: 0 !important; overflow: hidden !important; }
      iframe.game-frame { border: none; width: 100%; flex: 1; display: block; }

      /* Custom Scrollbar */
      .piai-body::-webkit-scrollbar { width:6px; }
      .piai-body::-webkit-scrollbar-thumb { background:var(--piai-text-light); border-radius:3px; }

      /* ========== COMPONENTS (Standard Mode) ========== */
      .piai-def {
        background: var(--piai-bg);
        border-left: 5px solid var(--piai-primary);
        padding: 12px 18px;
        border-radius: 0 8px 8px 0;
        transition: box-shadow .25s ease;
      }
      .piai-def:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      .piai-def-title { color: var(--piai-primary); font-weight: 700; display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }

      .piai-list-item {
        display: flex; align-items: center; gap: 12px; padding: 12px 16px; margin-bottom: 8px;
        background: var(--piai-bg); border-radius: 10px;
        box-shadow: inset 0 0 0 1px var(--piai-text-light);
        transition: box-shadow .18s ease;
      }
      .piai-list-item:hover { box-shadow: inset 0 0 0 2px var(--piai-accent), 0 2px 8px rgba(0,0,0,0.08); }
      .piai-list-item .piai-ico { color: var(--piai-accent); width: 24px; height: 24px; flex: 0 0 24px; display: flex; align-items: center; justify-content: center; }
      .piai-list-item:hover .piai-ico svg { transform: scale(1.22) rotate(8deg); transition: transform .18s ease; }

      .piai-grid { display:flex; flex:1; min-height:0; gap:20px; }

      /* ========== BUTTONS ========== */
      .hdr-btn {
        position: absolute; top: 50%; transform: translateY(-50%); z-index: 999;
        width: 48px; height: 48px; background: transparent; border: none; cursor: pointer;
        color: var(--piai-accent); display: flex; align-items: center; justify-content: center;
        transition: color .2s ease;
      }
      .hdr-btn:hover { color: #fff; }
      .hdr-btn svg { width: 26px; height: 26px; transition: transform .2s ease; }
      .hdr-btn:hover svg { transform: scale(1.1); }
      .fs-btn { right: 0; }
      .theme-btn { right: 58px; }

      /* ========== LOADER ========== */
      .piai-loader {
        position: absolute; inset: 0; background: rgba(0,0,0,0.2);
        display: flex; align-items: center; justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        transition: opacity .3s ease, visibility .3s ease;
      }
      .piai-loader.hide { opacity: 0; visibility: hidden; }
      .piai-loader .loader-inner {
        padding: 14px 28px; border-radius: 30px;
        background: rgba(255,255,255,0.85);
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,0.5);
        box-shadow: 0 8px 32px 0 rgba(31,38,135,0.15);
        display: flex; align-items: center; gap: 12px;
      }
      .spinner {
        width: 24px; height: 24px; border: 3px solid transparent;
        border-top-color: var(--piai-primary); border-right-color: var(--piai-primary);
        border-radius: 50%; animation: spin .8s linear infinite;
      }
      .loader-text { font-size: .9rem; font-weight: 600; color: #333; }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* ========== BRAND LOGO ========== */
      .piai-brand {
        position: absolute; right: -20px; bottom: 12px; width: 96px; height: 26px;
        background: var(--piai-primary); opacity: .95; pointer-events: none; z-index: 10;
        -webkit-mask-image: url("https://piai-embed-engine.vercel.app/public/logo.svg");
        -webkit-mask-repeat: no-repeat; -webkit-mask-position: left center; -webkit-mask-size: contain;
        mask-image: url("https://piai-embed-engine.vercel.app/public/logo.svg");
        mask-repeat: no-repeat; mask-position: left center; mask-size: contain;
      }

      /* ========== UTILS ========== */
      .piai-fit-noscroll .piai-body { overflow: hidden !important; }
      .MathJax, mjx-container { image-rendering: -webkit-optimize-contrast; transform: none !important; }

      @media (max-width: 650px) {
        .piai-grid { flex-direction: column; }
        .piai-hdr { padding-right: 130px; }
      }
    `;
  }

  function buildHtmlDocument(content, baseCss, headExtra) {
    if (!content) return '';
    const inject = `<style>${baseCss}</style>${headExtra || ''}`;
    if (/<!doctype html/i.test(content)) {
      if (content.includes('</head>')) return content.replace('</head>', inject + '</head>');
      return inject + content;
    }
    return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${inject}</head><body>${content}</body></html>`;
  }

  function createBaseStyle(theme, aspect) {
    const borderCol = (theme.primary || '#800020') + '26';
    return {
      default:
        `width:100%;max-width:100%;display:block;position:relative;` +
        `box-sizing:border-box;aspect-ratio:${aspect};height:auto;` +
        `border-radius:${BASE_RADIUS}px;border:1px solid ${borderCol};` +
        `overflow:hidden;background:transparent;`,
      fullscreen:
        `position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;` +
        `box-sizing:border-box;margin:0;border-radius:0;z-index:99999;` +
        `background:#000;border:none;overflow:hidden;` +
        `padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)`,
    };
  }

  // ============================================================
  // 4) MINIGAME GENERATOR & BRIDGE LOGIC (CORE INTELLIGENCE)
  // ============================================================
  function generateMinigameHTML(ctx, config) {
    // 1. Snapshot Parent Environment
    const PARENT_DATA = {
        cookie: document.cookie || '',
        origin: window.location.origin,
        isStudio: window.location.hostname.includes('studio'),
        gameKey: config.gameKey || 'unknown-game',
        gameUrl: config.gameUrl,
        gameOrigin: config.gameOrigin || new URL(config.gameUrl).origin,
        debug: config.debug || false
    };

    // 2. Logic Hiển thị Header
    const showHeader = config.header !== false; // Default true, set false to hide

    // 3. Tính toán API Endpoint (Bắt buộc tuyệt đối vì Blob URL)
    const apiPath = PARENT_DATA.isStudio ? "https://pistudy.vn/api/minigames/" : "/api/minigames/";
    const apiBase = apiPath.startsWith('http') ? apiPath : (PARENT_DATA.origin + apiPath);
    
    // 4. Escape string để inject an toàn
    const safeCookie = PARENT_DATA.cookie.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');

    // 5. Build Header HTML (Conditional)
    const headerHTML = showHeader ? `
      <header class="piai-hdr">
        <i data-lucide="gamepad-2"></i><span>${config.title || 'Trò chơi'}</span>
        <button class="hdr-btn fs-btn" id="fsBtn" title="Phóng to"><i data-lucide="maximize"></i></button>
      </header>` : '';

    // 6. Return the full HTML String
    return `
    <div class="piai-wrap">
      <div class="piai-loader" id="loader">
        <div class="loader-inner"><div class="spinner"></div><div class="loader-text">Đang tải dữ liệu...</div></div>
      </div>
      
      ${headerHTML}
      
      <main class="piai-body no-pad">
        <iframe class="game-frame" src="${PARENT_DATA.gameUrl}" allow="autoplay; encrypted-media; fullscreen"></iframe>
      </main>
      
      <div class="piai-brand"></div>
    </div>
    
    <script src="https://unpkg.com/lucide@0.294.0/dist/umd/lucide.min.js"><\/script>
    
    <script>
    (function(){
      // --- A. CONFIG & UTILS ---
      const CFG = {
         cookies: \`${safeCookie}\`,
         apiBase: "${apiBase}",
         gameKey: "${PARENT_DATA.gameKey}",
         gameUrl: "${PARENT_DATA.gameUrl}",
         isStudio: ${PARENT_DATA.isStudio},
         debug: ${PARENT_DATA.debug}
      };

      function log(msg, data) {
         if(CFG.debug) console.log("%c[PiaiBridge] " + msg, "color:#00e676;font-weight:bold", data || "");
      }

      function safeJSONParse(str) {
         try { return JSON.parse(str); } catch(e) { return null; }
      }

      // --- B. AUTHENTICATION LOGIC ---
      function getCookie(n) { 
          let v = CFG.cookies.match('(^|;) ?' + n + '=([^;]*)(;|$)'); 
          return v ? v[2] : null; 
      }
      
      function getUser() {
          let u = { name: "Khách", username: "guest" };
          
          // 1. Try JWT
          let jwt = getCookie("edx-jwt-cookie-header-payload");
          if(jwt) {
             try {
                let p = JSON.parse(atob(jwt.split(".")[1]));
                u.name = p.name || p.preferred_username || "User";
                u.username = p.preferred_username;
                return u;
             } catch(e) { log("JWT Parse Error", e); }
          }

          // 2. Try Legacy edx-user-info
          let old = getCookie("edx-user-info");
          if(old) {
             // Cleanup Edx's weird cookie format
             let cleaned = old.replace(/^"|"$/g,'').split('\\\\054').join(',').split('\\\\\\\\').join('');
             let i = safeJSONParse(cleaned);
             if(i) {
                u.name = i.username;
                u.username = i.username;
                return u;
             }
          }
          return u;
      }

      // --- C. NETWORK LOGIC (WITH RETRY) ---
      async function fetchWithRetry(url, options = {}, retries = 3, backoff = 500) {
          try {
             let res = await fetch(url, options);
             if(!res.ok) throw new Error("Status " + res.status);
             return res;
          } catch(err) {
             if(retries > 0) {
                 log("Retry fetch...", url);
                 await new Promise(r => setTimeout(r, backoff));
                 return fetchWithRetry(url, options, retries - 1, backoff * 2);
             }
             throw err;
          }
      }

      async function fetchStats() {
          if(CFG.isStudio) return {playCount:0, bestScore:0};
          try {
             let r = await fetchWithRetry(CFG.apiBase + "logs/");
             let d = await r.json();
             let rows = Array.isArray(d) ? d : (d.results || []);
             let pc=0, bs=0;
             rows.forEach(x => { 
                 if(x.payload?.gameKey === CFG.gameKey) { 
                     pc++; 
                     let s = Number(x.payload.score || 0); 
                     if(s > bs) bs = s; 
                 }
             });
             log("Stats Fetched", {pc, bs});
             return {playCount:pc, bestScore:bs};
          } catch(e) { 
             log("FetchStats Failed", e);
             return {playCount:0, bestScore:0}; 
          }
      }

      async function saveResult(p) {
          if(CFG.isStudio) return true;
          try {
             await fetchWithRetry(CFG.apiBase + "logs/", {
                 method: "POST", 
                 headers: {
                     "Content-Type": "application/json",
                     "X-CSRFToken": getCookie('csrftoken') || ""
                 },
                 body: JSON.stringify({
                     msgtype: "RESULT",
                     tsms: Date.now(),
                     payload: { ...p, userId: null, username: getUser().username }
                 })
             });
             log("Result Saved");
             return true;
          } catch(e){ 
             log("SaveResult Failed", e);
             return false; 
          }
      }

      // --- D. UI & EVENTS CONTROLLER ---
      if(window.lucide) window.lucide.createIcons();
      
      const iframe = document.querySelector('iframe.game-frame');
      const loader = document.getElementById('loader');
      const fsBtn = document.getElementById('fsBtn'); // Có thể null nếu header=false
      
      // Hide Loader
      iframe.onload = () => setTimeout(() => {
          loader.classList.add('hide');
          log("Iframe Loaded");
      }, 500);

      // Handle Fullscreen Button
      if(fsBtn) {
          fsBtn.onclick = () => parent.postMessage({ type: 'toggleFullscreen', id: '${ctx.id}' }, '*');
      }
      
      // Handle Messages
      window.addEventListener('message', (e) => {
         // 1. Fullscreen UI Update
         if(e.data?.type === 'fullscreenState' && fsBtn) {
            fsBtn.innerHTML = '<i data-lucide="' + (e.data.isFullscreen ? 'minimize' : 'maximize') + '"></i>';
            if(window.lucide) window.lucide.createIcons();
         }
         
         // 2. BRIDGE COMMS (Security Check)
         if(e.origin !== new URL(CFG.gameUrl).origin) return;
         
         const msg = e.data;
         const sendToGame = (d) => iframe.contentWindow.postMessage(d, CFG.gameUrl);

         (async () => {
             // Game Init / Refresh
             if(msg.type === "MINIGAME_READY" || (msg.type === "MINIGAME_ACTION" && msg.action === "REFRESH_STATS")) {
                 const u = getUser();
                 const s = await fetchStats();
                 sendToGame({ type: "MINIGAME_DATA", userName: u.name, stats: s });
             }
             // Game Save Result
             if(msg.type === "MINIGAME_ACTION" && msg.action === "SAVE_RESULT") {
                 await saveResult(msg.data);
                 // Send updated stats back
                 const u = getUser();
                 const s = await fetchStats();
                 sendToGame({ type: "MINIGAME_DATA", userName: u.name, stats: s });
             }
         })();
      });
    })();
    <\/script>`;
  }

  // ============================================================
  // 5) MAIN RENDER FUNCTION (UNIFIED)
  // ============================================================
  function render(options) {
    const config = Object.assign({}, DEFAULT_CONFIG, options || {});
    
    // Auto-detect Minigame Mode based on gameUrl presence
    let isMinigame = !!config.gameUrl;
    
    // Default theme for minigames is educational unless specified
    if (isMinigame && (!options.themeName && !options.theme)) {
        config.themeName = 'educational'; 
    }

    const {
      id, container: cNode, width, height, aspect,
      themeName, theme: tOverride, html, htmlGenerator,
      headExtra, onReady, onThemeChange, fitMode
    } = config;

    // Resolve Container
    const container = cNode || (typeof id === 'string' ? document.getElementById(id) : null);
    if (!container) return;

    // Cleanup previous instance to prevent memory leaks
    if (typeof container.__piaiCleanup === 'function') {
      try { container.__piaiCleanup(); } catch (_) {}
      container.__piaiCleanup = null;
    }

    const containerId = container.id || (typeof id === 'string' ? id : 'piai_' + Date.now());
    container.id = containerId;

    // Device Detection & Theme Setup
    const { isIOS, isAndroid, isMobile } = detectDevice();
    let currentTheme = tOverride || getThemeByName(themeName);
    let currentThemeName = currentTheme.name || themeName || DEFAULT_CONFIG.themeName;

    let baseCss = getBaseCss(currentTheme);
    let baseStyle = createBaseStyle(currentTheme, aspect);

    // DOM Reconstruction
    while (container.firstChild) container.removeChild(container.firstChild);
    container.style.cssText = baseStyle.default;

    // Wrapper for Scaling Logic
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position:absolute;top:0;left:0;width:${width}px;height:${height}px;transform-origin:0 0;`;

    // Context object for Generators
    const ctxBase = {
      id: containerId, embedId: containerId,
      width, height, aspect,
      theme: currentTheme, themeName: currentThemeName,
      baseCss, isIOS
    };

    // GENERATE HTML CONTENT
    let finalHtml = '';
    if (isMinigame) {
        finalHtml = generateMinigameHTML(ctxBase, config);
    } else {
        const generator = typeof htmlGenerator === 'function' ? htmlGenerator : () => html || '';
        finalHtml = generator(Object.assign({}, ctxBase, { isStandalone: false }));
    }

    // Add FitMode Script
    const fitNorm = normalizeFitMode(fitMode);
    const fitHead = fitNorm === 'no-scroll' 
        ? `<script>(function(){try{document.documentElement.classList.add('piai-fit-noscroll');}catch(_){}})();<\/script>` 
        : '';
    const headExtraFinal = (headExtra || '') + fitHead;

    if (!finalHtml) return;
    const iframeHtml = buildHtmlDocument(finalHtml, baseCss, headExtraFinal);

    // Handle iOS Standalone Blob (Only for Standard content)
    let iosStandaloneUrl = '';
    if (isIOS && !isMinigame) {
      const generator = typeof htmlGenerator === 'function' ? htmlGenerator : () => html;
      const standaloneRaw = generator(Object.assign({}, ctxBase, { isStandalone: true }));
      if (standaloneRaw) {
        try { iosStandaloneUrl = URL.createObjectURL(new Blob([buildHtmlDocument(standaloneRaw, baseCss, headExtraFinal)], { type: 'text/html' })); } 
        catch (_) {}
      }
    }

    // Create Blob for Main Iframe
    const blobUrl = URL.createObjectURL(new Blob([iframeHtml], { type: 'text/html' }));

    const iframe = document.createElement('iframe');
    iframe.src = blobUrl;
    iframe.style.cssText = `width:100%;height:100%;border:none;display:block;background:${currentTheme.bg || '#f9f7f5'};`;
    iframe.scrolling = 'no';
    iframe.loading = 'lazy';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-popups';
    iframe.allow = 'fullscreen; clipboard-read; clipboard-write; autoplay; encrypted-media';
    if (iosStandaloneUrl) iframe.dataset.iosStandaloneUrl = iosStandaloneUrl;

    // On Load Handler
    iframe.onload = function () {
      try { URL.revokeObjectURL(blobUrl); } catch (_) {} // Release memory
      
      // Initialize Theme inside iframe
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme }, '*');
        }
      } catch (_) {}

      if (typeof onReady === 'function') onReady(iframe, ctxBase);
    };

    // ============================================================
    // 6) SCALING ENGINE (Fullscreen + Android Fixes)
    // ============================================================
    let isFull = false;
    let resizeRAF = null;

    const updateScale = () => {
      const rect = container.getBoundingClientRect();
      const cw = rect.width || container.clientWidth || width;
      const ch = rect.height || container.clientHeight || height;

      if (isFull) {
        // Fullscreen Mode: Center & Fit
        let scale = Math.min(cw / width, ch / height);
        if (!Number.isFinite(scale) || scale <= 0) scale = 1;
        const roundedScale = Math.floor(scale * 1000) / 1000 || 1;
        
        const dx = Math.round((cw - width * roundedScale) / 2);
        const dy = Math.round((ch - height * roundedScale) / 2);
        wrapper.style.transform = `translate(${dx}px, ${dy}px) scale(${roundedScale})`;
      } else {
        // Embed Mode: Width-based Scale
        let scale = cw / width;
        if (!Number.isFinite(scale) || scale <= 0) scale = 1;
        let roundedScale = Math.round(scale * 1000) / 1000 || 1;

        if (isAndroid && isMobile) {
          // Android Rounding Fix (Prevent white gaps)
          const idealH = (height / width) * cw;
          if ((width * roundedScale) < (cw - 0.5) || (height * roundedScale) < (idealH - 0.5)) {
            roundedScale = Math.ceil(scale * 1000) / 1000 || 1;
          }
          wrapper.style.transform = `scale(${roundedScale})`;
          container.style.height = `${Math.round(height * roundedScale)}px`;
        } else {
          wrapper.style.transform = `scale(${roundedScale})`;
          container.style.height = `${cw * (height / width)}px`;
        }
      }
    };

    const setFullscreen = (state) => {
      isFull = state;
      container.style.cssText = state ? baseStyle.fullscreen : baseStyle.default;
      requestAnimationFrame(() => updateScale());
      try { iframe.contentWindow && iframe.contentWindow.postMessage({ type: 'fullscreenState', id: containerId, isFullscreen: state }, '*'); } catch (_) {}
    };

    // ============================================================
    // 7) EVENT HANDLING
    // ============================================================
    const onMessage = (e) => {
      if (!e.data || e.data.id !== containerId) return;

      if (e.data.type === 'toggleFullscreen') {
        if (isIOS) return; // iOS needs manual action often
        if (document.fullscreenElement) document.exitFullscreen();
        else if (isFull) setFullscreen(false);
        else if (container.requestFullscreen) container.requestFullscreen().then(() => setFullscreen(true)).catch(() => setFullscreen(true));
        else setFullscreen(true);
      }

      if (e.data.type === 'switchTheme') {
        let idx = THEME_ORDER.indexOf(currentThemeName);
        currentThemeName = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
        currentTheme = getThemeByName(currentThemeName);
        baseCss = getBaseCss(currentTheme);
        baseStyle = createBaseStyle(currentTheme, aspect);
        container.style.cssText = isFull ? baseStyle.fullscreen : baseStyle.default;
        iframe.style.background = currentTheme.bg || '#f9f7f5';
        updateScale();
        try { iframe.contentWindow.postMessage({ type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme }, '*'); } catch (_) {}
      }
    };

    const onFullscreenChange = () => {
      if (isIOS) return;
      if (document.fullscreenElement === container) setFullscreen(true);
      else if (isFull && !document.fullscreenElement) setFullscreen(false);
    };

    const onKeydown = (e) => {
      if (e.key === 'Escape' && isFull && !document.fullscreenElement) setFullscreen(false);
    };

    const onResize = () => {
      if (resizeRAF) cancelAnimationFrame(resizeRAF);
      resizeRAF = requestAnimationFrame(updateScale);
    };

    // Attach Global Listeners
    window.addEventListener('message', onMessage);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    // Auto-cleanup via MutationObserver
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

    function cleanup() {
      window.removeEventListener('message', onMessage);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('keydown', onKeydown);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      try { if (iosStandaloneUrl) URL.revokeObjectURL(iosStandaloneUrl); } catch (_) {}
      try { observer.disconnect(); } catch (_) {}
    }
    container.__piaiCleanup = cleanup;

    // MOUNT
    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
    updateScale();
  }

  // ============================================================
  // 8) EXPORT GLOBAL
  // ============================================================
  global.PiaiEmbed = {
    version: VERSION,
    render,
    themes: THEMES,
    getThemeByName,
    getBaseCss,
    defaults: DEFAULT_CONFIG
  };
})(window);
