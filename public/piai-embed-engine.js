// piai-embed-engine.js
// Phiên bản 2025 v2 – Tối ưu hoàn chỉnh
// Features: Event system, ResizeObserver, IntersectionObserver, Accessibility, Error handling
// Theme: classic, educational, neon + custom support

(function (global) {
  'use strict';

  // ============================================================
  // 1. CONSTANTS & THEMES
  // ============================================================
  
  const VERSION = '2.0.0';
  
  const THEMES = {
    classic: {
      name: 'classic',
      label: 'Classic',
      primary: '#800020',
      accent: '#b8860b',
      secondary: '#002b5c',
      bg: '#f9f7f5',
    },
    educational: {
      name: 'educational',
      label: 'Education',
      primary: '#2196F3',
      accent: '#FFC107',
      secondary: '#4CAF50',
      bg: '#FFFFFF',
    },
    neon: {
      name: 'neon',
      label: 'Neon',
      primary: '#F1F6F9',
      accent: '#394867',
      secondary: '#9BA4B5',
      bg: '#212A3E',
    },
  };

  const DEFAULT_CONFIG = {
    width: 800,
    height: 450,
    aspect: '16 / 9',
    theme: THEMES.classic,
    themeName: 'classic',
    lazyLoad: true,
    lazyLoadMargin: '200px',
    reduceMotion: 'auto',
    focusTrap: true,
    debug: false,
  };

  const BASE_RADIUS = 16;

  const SYSTEM_FONT_STACK =
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,' +
    '"Helvetica Neue",Arial,"Noto Sans",sans-serif,' +
    '"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';

  // ============================================================
  // CSS BASE COMPONENTS - Tái sử dụng cho mọi embed
  // ============================================================
  
  const generateBaseCSS = (theme) => `
/* ═══════════════════════════════════════════════════════════════
   PIAI EMBED BASE CSS - Auto-injected by Engine
   Theme: ${theme.name || 'custom'}
═══════════════════════════════════════════════════════════════ */

:root {
  --piai-primary: ${theme.primary};
  --piai-accent: ${theme.accent};
  --piai-secondary: ${theme.secondary};
  --piai-bg: ${theme.bg};
  
  /* Derived colors */
  --piai-primary-light: ${theme.primary}15;
  --piai-primary-border: ${theme.primary}26;
  --piai-accent-light: ${theme.accent}20;
  --piai-shadow-sm: 0 2px 8px rgba(0,0,0,0.08);
  --piai-shadow-md: 0 4px 12px rgba(0,0,0,0.12);
  --piai-shadow-hover: 0 6px 20px rgba(0,0,0,0.15);
  
  /* Spacing */
  --piai-space-xs: 4px;
  --piai-space-sm: 8px;
  --piai-space-md: 12px;
  --piai-space-lg: 16px;
  --piai-space-xl: 24px;
  
  /* Typography */
  --piai-font: ${SYSTEM_FONT_STACK};
  --piai-fs-xs: 0.7rem;
  --piai-fs-sm: 0.8rem;
  --piai-fs-base: 0.85rem;
  --piai-fs-md: 0.95rem;
  --piai-fs-lg: 1.1rem;
  
  /* Radius */
  --piai-radius-sm: 4px;
  --piai-radius-md: 8px;
  --piai-radius-lg: 12px;
  
  /* Transitions */
  --piai-transition: all 0.25s ease;
}

/* ═══════════════════════════════════════════════════════════════
   RESET & BASE
═══════════════════════════════════════════════════════════════ */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  font-family: var(--piai-font);
  font-size: 16px;
  line-height: 1.5;
  color: var(--piai-secondary);
  background: transparent;
  width: 100%; height: 100%;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

/* ═══════════════════════════════════════════════════════════════
   LAYOUT: WRAP
═══════════════════════════════════════════════════════════════ */
.piai-wrap {
  width: 100%; height: 100%;
  position: relative;
  background: var(--piai-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.piai-wrap.standalone {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
}

/* ═══════════════════════════════════════════════════════════════
   HEADER (.piai-hdr)
═══════════════════════════════════════════════════════════════ */
.piai-hdr {
  background: linear-gradient(135deg, var(--piai-primary), color-mix(in srgb, var(--piai-primary) 70%, black));
  color: #fff;
  padding: var(--piai-space-sm) var(--piai-space-lg);
  padding-right: 48px; /* Space for fullscreen button */
  font-weight: 700;
  font-size: var(--piai-fs-md);
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 3px solid var(--piai-accent);
  flex-shrink: 0;
  position: relative;
}
.piai-hdr svg, .piai-hdr i { width: 20px; height: 20px; flex-shrink: 0; }

/* Header variants */
.piai-hdr.compact { padding: 6px 14px; font-size: var(--piai-fs-sm); }
.piai-hdr.compact svg { width: 16px; height: 16px; }

.piai-hdr.gradient-gold {
  background: linear-gradient(135deg, var(--piai-accent), color-mix(in srgb, var(--piai-accent) 70%, black));
}
.piai-hdr.gradient-navy {
  background: linear-gradient(135deg, var(--piai-secondary), color-mix(in srgb, var(--piai-secondary) 70%, black));
}

/* ═══════════════════════════════════════════════════════════════
   BODY / MAIN CONTENT
═══════════════════════════════════════════════════════════════ */
.piai-body {
  flex: 1;
  min-height: 0;
  padding: var(--piai-space-sm) var(--piai-space-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.piai-body.scrollable { overflow-y: auto; }
.piai-body::-webkit-scrollbar { width: 4px; }
.piai-body::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
.piai-body::-webkit-scrollbar-thumb:hover { background: #bbb; }

/* ═══════════════════════════════════════════════════════════════
   DEFINITION BOX (.piai-def)
═══════════════════════════════════════════════════════════════ */
.piai-def {
  background: #fff;
  border-left: 4px solid var(--piai-primary);
  padding: var(--piai-space-sm) var(--piai-space-md);
  margin-bottom: var(--piai-space-sm);
  box-shadow: var(--piai-shadow-sm);
  border-radius: 0 var(--piai-radius-md) var(--piai-radius-md) 0;
  transition: var(--piai-transition);
  flex-shrink: 0;
}
.piai-def:hover {
  transform: translateY(-2px);
  border-left-color: var(--piai-accent);
  box-shadow: var(--piai-shadow-hover);
}

.piai-def-title {
  color: var(--piai-primary);
  font-weight: 700;
  font-size: var(--piai-fs-base);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.piai-def-title svg, .piai-def-title i { width: 16px; height: 16px; flex-shrink: 0; }

.piai-def-content {
  font-size: var(--piai-fs-sm);
  line-height: 1.5;
  color: var(--piai-secondary);
}
.piai-def-content b, .piai-def-content strong { color: var(--piai-primary); }

/* Definition variants */
.piai-def.accent { border-left-color: var(--piai-accent); }
.piai-def.accent .piai-def-title { color: var(--piai-accent); }

.piai-def.secondary { border-left-color: var(--piai-secondary); }
.piai-def.secondary .piai-def-title { color: var(--piai-secondary); }

.piai-def.filled {
  background: var(--piai-primary-light);
  border-left-width: 5px;
}

.piai-def.compact {
  padding: 6px 10px;
  margin-bottom: 6px;
}
.piai-def.compact .piai-def-title { font-size: var(--piai-fs-sm); margin-bottom: 2px; }
.piai-def.compact .piai-def-content { font-size: var(--piai-fs-xs); }

/* ═══════════════════════════════════════════════════════════════
   GRID LAYOUT
═══════════════════════════════════════════════════════════════ */
.piai-grid {
  display: flex;
  gap: var(--piai-space-lg);
  flex: 1;
  min-height: 0;
}
.piai-grid.reverse { flex-direction: row-reverse; }
.piai-grid.vertical { flex-direction: column; }

/* ═══════════════════════════════════════════════════════════════
   LIST (.piai-list)
═══════════════════════════════════════════════════════════════ */
.piai-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  padding-right: 4px;
  list-style: none;
}

.piai-list-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: var(--piai-space-sm) var(--piai-space-md);
  background: #fff;
  border-radius: var(--piai-radius-md);
  border: 1px solid #eee;
  transition: var(--piai-transition);
  font-size: var(--piai-fs-sm);
}
.piai-list-item:hover {
  transform: translateX(4px);
  background: #fffcf5;
  border-color: var(--piai-accent);
  box-shadow: 0 2px 8px rgba(184,134,11,0.15);
}

.piai-list-item .piai-ico {
  color: var(--piai-accent);
  margin-top: 2px;
  transition: var(--piai-transition);
}
.piai-list-item:hover .piai-ico {
  color: var(--piai-primary);
  transform: scale(1.15) rotate(8deg);
}

.piai-list-item-content { flex: 1; min-width: 0; }
.piai-list-item-title { font-weight: 600; margin-bottom: 2px; }
.piai-list-item-desc { color: #666; line-height: 1.4; }

/* ═══════════════════════════════════════════════════════════════
   ICON (.piai-ico)
═══════════════════════════════════════════════════════════════ */
.piai-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px; height: 18px;
  flex-shrink: 0;
}
.piai-ico svg { width: 100%; height: 100%; }
.piai-ico.sm { width: 14px; height: 14px; }
.piai-ico.lg { width: 24px; height: 24px; }

/* ═══════════════════════════════════════════════════════════════
   VISUAL AREA (.piai-visual)
═══════════════════════════════════════════════════════════════ */
.piai-visual {
  flex: 0 0 280px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
.piai-visual.wide { flex: 0 0 340px; }
.piai-visual.narrow { flex: 0 0 200px; }
.piai-visual svg { width: 100%; height: auto; max-height: 100%; }

/* ═══════════════════════════════════════════════════════════════
   EXAMPLE BOX
═══════════════════════════════════════════════════════════════ */
.piai-example {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #ddd;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: var(--piai-fs-sm);
}
.piai-example-tag {
  font-size: var(--piai-fs-xs);
  font-weight: 700;
  color: #fff;
  background: var(--piai-accent);
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ═══════════════════════════════════════════════════════════════
   CARD (.piai-card)
═══════════════════════════════════════════════════════════════ */
.piai-card {
  background: #fff;
  border-radius: var(--piai-radius-md);
  padding: var(--piai-space-md);
  box-shadow: var(--piai-shadow-sm);
  border: 1px solid #eee;
  transition: var(--piai-transition);
}
.piai-card:hover {
  box-shadow: var(--piai-shadow-md);
  transform: translateY(-2px);
}
.piai-card-header {
  font-weight: 700;
  color: var(--piai-primary);
  margin-bottom: var(--piai-space-sm);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ═══════════════════════════════════════════════════════════════
   BUTTONS
═══════════════════════════════════════════════════════════════ */
.piai-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: var(--piai-fs-sm);
  font-weight: 600;
  border: none;
  border-radius: var(--piai-radius-md);
  cursor: pointer;
  transition: var(--piai-transition);
  font-family: inherit;
}
.piai-btn:active { transform: scale(0.97); }

.piai-btn.primary {
  background: var(--piai-primary);
  color: #fff;
}
.piai-btn.primary:hover { filter: brightness(1.1); }

.piai-btn.accent {
  background: var(--piai-accent);
  color: #fff;
}
.piai-btn.accent:hover { filter: brightness(1.1); }

.piai-btn.outline {
  background: transparent;
  border: 2px solid var(--piai-primary);
  color: var(--piai-primary);
}
.piai-btn.outline:hover {
  background: var(--piai-primary);
  color: #fff;
}

.piai-btn.ghost {
  background: transparent;
  color: var(--piai-primary);
}
.piai-btn.ghost:hover { background: var(--piai-primary-light); }

/* ═══════════════════════════════════════════════════════════════
   FULLSCREEN BUTTON (Fixed position)
═══════════════════════════════════════════════════════════════ */
.piai-fs-btn {
  position: absolute;
  top: 0; right: 0;
  z-index: 999;
  width: 40px; height: 40px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--piai-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--piai-transition);
}
.piai-fs-btn:hover {
  color: #fff;
  transform: scale(1.1);
}
.piai-fs-btn svg { width: 20px; height: 20px; }

.piai-close-btn {
  position: absolute;
  top: 6px; right: 6px;
  z-index: 999;
  width: 32px; height: 32px;
  background: rgba(0,0,0,0.5);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--piai-transition);
}
.piai-close-btn:hover { background: var(--piai-primary); }

/* ═══════════════════════════════════════════════════════════════
   LOADER
═══════════════════════════════════════════════════════════════ */
.piai-loader {
  position: absolute;
  inset: 0;
  background: var(--piai-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  transition: opacity 0.3s;
}
.piai-loader.hide { opacity: 0; pointer-events: none; }
.piai-loader-spinner {
  width: 32px; height: 32px;
  border: 3px solid #eee;
  border-top-color: var(--piai-primary);
  border-radius: 50%;
  animation: piai-spin 0.8s linear infinite;
}
@keyframes piai-spin { to { transform: rotate(360deg); } }

/* ═══════════════════════════════════════════════════════════════
   MATHJAX OVERRIDES
═══════════════════════════════════════════════════════════════ */
mjx-container { font-size: 105% !important; margin: 0 !important; }

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════ */
.piai-text-center { text-align: center; }
.piai-text-primary { color: var(--piai-primary); }
.piai-text-accent { color: var(--piai-accent); }
.piai-text-bold { font-weight: 700; }
.piai-mt-sm { margin-top: var(--piai-space-sm); }
.piai-mt-md { margin-top: var(--piai-space-md); }
.piai-mb-sm { margin-bottom: var(--piai-space-sm); }
.piai-mb-md { margin-bottom: var(--piai-space-md); }
.piai-flex { display: flex; }
.piai-flex-center { display: flex; align-items: center; justify-content: center; }
.piai-gap-sm { gap: var(--piai-space-sm); }
.piai-gap-md { gap: var(--piai-space-md); }

/* ═══════════════════════════════════════════════════════════════
   RESPONSIVE
═══════════════════════════════════════════════════════════════ */
@media (max-width: 600px) {
  .piai-grid { flex-direction: column; }
  .piai-grid.reverse { flex-direction: column-reverse; }
  .piai-visual { flex: 0 0 140px; width: 100%; }
  .piai-hdr { padding: 6px 12px; font-size: var(--piai-fs-sm); }
  .piai-body { padding: var(--piai-space-sm); }
}
`;

  const SYSTEM_FONT_CSS =
    '\n<style>\n' +
    '  * { font-family: ' + SYSTEM_FONT_STACK + ' !important; }\n' +
    '</style>';

  // ============================================================
  // 2. UTILITIES
  // ============================================================
  
  const Utils = {
    // Device detection
    detectDevice() {
      const ua = navigator.userAgent || '';
      return {
        isIOS: /iPad|iPhone|iPod/.test(ua) && !window.MSStream,
        isAndroid: /Android/.test(ua),
        isMobile: /Mobi|Android/i.test(ua),
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      };
    },

    // Check prefers-reduced-motion
    prefersReducedMotion() {
      return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    },

    // Check dark mode preference
    prefersDarkMode() {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    },

    // Deep merge objects
    deepMerge(target, source) {
      const result = { ...target };
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
      return result;
    },

    // Generate unique ID
    uid(prefix = 'piai') {
      return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    },

    // Throttle function
    throttle(fn, wait) {
      let lastTime = 0;
      return function (...args) {
        const now = Date.now();
        if (now - lastTime >= wait) {
          lastTime = now;
          fn.apply(this, args);
        }
      };
    },

    // Debounce function
    debounce(fn, wait) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), wait);
      };
    },
  };

  // ============================================================
  // 3. EVENT EMITTER
  // ============================================================
  
  class EventEmitter {
    constructor() {
      this._events = new Map();
    }

    on(event, listener) {
      if (!this._events.has(event)) {
        this._events.set(event, new Set());
      }
      this._events.get(event).add(listener);
      return () => this.off(event, listener);
    }

    once(event, listener) {
      const wrapper = (...args) => {
        this.off(event, wrapper);
        listener(...args);
      };
      return this.on(event, wrapper);
    }

    off(event, listener) {
      if (listener) {
        this._events.get(event)?.delete(listener);
      } else {
        this._events.delete(event);
      }
    }

    emit(event, ...args) {
      this._events.get(event)?.forEach(fn => {
        try {
          fn(...args);
        } catch (e) {
          console.error(`PiaiEmbed: Error in ${event} listener`, e);
        }
      });
    }

    removeAllListeners() {
      this._events.clear();
    }
  }

  // ============================================================
  // 4. EMBED INSTANCE CLASS
  // ============================================================
  
  class EmbedInstance extends EventEmitter {
    constructor(options) {
      super();
      
      this.config = Utils.deepMerge(DEFAULT_CONFIG, options || {});
      this.id = this.config.id || Utils.uid();
      this.device = Utils.detectDevice();
      this.state = {
        isFullscreen: false,
        isReady: false,
        isVisible: false,
        isDestroyed: false,
      };
      
      // DOM references
      this.container = null;
      this.wrapper = null;
      this.iframe = null;
      
      // Cleanup functions
      this._cleanups = [];
      
      // Resolve theme
      this.theme = this._resolveTheme(this.config.theme || this.config.themeName);
      
      // Check reduced motion
      this._reduceMotion = this.config.reduceMotion === 'auto' 
        ? Utils.prefersReducedMotion() 
        : this.config.reduceMotion;
    }

    // --------------------------------------------------------
    // Theme Resolution
    // --------------------------------------------------------
    _resolveTheme(themeInput) {
      if (typeof themeInput === 'string') {
        return THEMES[themeInput] || THEMES.classic;
      }
      if (typeof themeInput === 'object') {
        return { ...THEMES.classic, ...themeInput };
      }
      return THEMES.classic;
    }

    // --------------------------------------------------------
    // Theme Switching API
    // --------------------------------------------------------
    
    // Switch to a different theme
    setTheme(themeName) {
      if (this.state.isDestroyed) return this;
      
      // Validate theme exists
      if (!THEMES[themeName]) {
        this._log('Invalid theme:', themeName);
        return this;
      }
      
      const oldThemeName = this.theme.name || this.config.themeName;
      if (oldThemeName === themeName) return this; // No change
      
      // Update theme
      this.theme = this._resolveTheme(themeName);
      this.config.themeName = themeName;
      
      // Update container border color
      if (this.container && !this.state.isFullscreen) {
        this.container.style.borderColor = `${this.theme.primary}26`;
      }
      
      // Update iframe background
      if (this.iframe) {
        this.iframe.style.background = this.theme.bg;
      }
      
      // Update CSS variables inside iframe
      this._postMessage({ 
        type: 'themeChange', 
        theme: this.theme,
        themeName: themeName,
        cssVars: {
          '--piai-primary': this.theme.primary,
          '--piai-accent': this.theme.accent,
          '--piai-secondary': this.theme.secondary,
          '--piai-bg': this.theme.bg,
          '--piai-primary-light': `${this.theme.primary}15`,
          '--piai-primary-border': `${this.theme.primary}26`,
          '--piai-accent-light': `${this.theme.accent}20`,
        }
      });
      
      // Emit event cho external listeners
      this.emit('themechange', { 
        theme: this.theme, 
        themeName: themeName,
        previousTheme: oldThemeName 
      });
      
      this._log('Theme changed:', oldThemeName, '->', themeName);
      
      return this;
    }

    // Get current theme name
    getThemeName() {
      return this.theme.name || this.config.themeName;
    }
    
    // Get current theme object
    getTheme() {
      return this.theme;
    }

    // --------------------------------------------------------
    // Style Generation
    // --------------------------------------------------------
    _getStyles() {
      const { width, height, aspect } = this.config;
      const transition = this._reduceMotion ? 'none' : 'transform .3s ease';
      
      return {
        container: {
          default: [
            `width:${width}px`,
            `max-width:100%`,
            `height:${height}px`,
            `margin:20px auto`,
            `display:flex`,
            `justify-content:center`,
            `align-items:center`,
            `position:relative`,
            `border-radius:${BASE_RADIUS}px`,
            `border:1px solid ${this.theme.primary}26`,
            `overflow:hidden`,
            `background:transparent`,
            `aspect-ratio:${aspect}`,
            `font-family:${SYSTEM_FONT_STACK}`,
          ].join(';'),
          
          fullscreen: [
            `position:fixed`,
            `top:0`,
            `left:0`,
            `width:100vw`,
            `height:100vh`,
            `height:100dvh`,
            `margin:0`,
            `border-radius:0`,
            `z-index:99999`,
            `background:#000`,
            `border:none`,
            `box-shadow:none`,
            `display:flex`,
            `justify-content:center`,
            `align-items:center`,
            `overflow:hidden`,
            `padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)`,
            `font-family:${SYSTEM_FONT_STACK}`,
          ].join(';'),
        },
        
        wrapper: [
          `width:${width}px`,
          `height:${height}px`,
          `position:relative`,
          `transform-origin:center`,
          `transition:${transition}`,
          `flex-shrink:0`,
        ].join(';'),
        
        iframe: [
          `width:100%`,
          `height:100%`,
          `border:none`,
          `background:${this.theme.bg}`,
        ].join(';'),
      };
    }

    // --------------------------------------------------------
    // HTML Processing
    // --------------------------------------------------------
    _injectSystemFontCss(html) {
      if (!html || typeof html !== 'string') return html;
      if (html.includes('__NO_SYSTEM_FONT_OVERRIDE__')) return html;
      
      // Generate base CSS với theme hiện tại
      const baseCSS = `<style id="piai-base-css">${generateBaseCSS(this.theme)}</style>`;
      
      if (html.includes('<head>')) {
        return html.replace('<head>', '<head>' + baseCSS);
      }
      return baseCSS + html;
    }

    _generateHTML(isStandalone = false) {
      const { html, htmlGenerator } = this.config;
      const { width, height, aspect } = this.config;
      
      const context = {
        id: this.id,
        embedId: this.id,
        width,
        height,
        aspect,
        theme: this.theme,
        isIOS: this.device.isIOS,
        isMobile: this.device.isMobile,
        isStandalone,
        reduceMotion: this._reduceMotion,
      };

      const generator = typeof htmlGenerator === 'function' ? htmlGenerator : () => html;
      let generatedHtml = generator(context);
      
      return this._injectSystemFontCss(generatedHtml);
    }

    // --------------------------------------------------------
    // Scaling Logic
    // --------------------------------------------------------
    _updateScale() {
      if (!this.container || !this.wrapper || this.state.isDestroyed) return;

      const { width, height } = this.config;

      if (this.state.isFullscreen) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let scale = Math.min(vw / width, vh / height);
        if (!Number.isFinite(scale) || scale <= 0) scale = 1;
        
        this.wrapper.style.transform = `scale(${scale})`;
        this.container.style.height = `${vh}px`;
        return;
      }

      // Inline mode
      const rect = this.container.getBoundingClientRect();
      const availableWidth = rect.width || width;
      let scale = Math.min(availableWidth / width, 1);
      if (!Number.isFinite(scale) || scale <= 0) scale = 1;

      this.wrapper.style.transform = `scale(${scale})`;
      this.container.style.height = `${height * scale}px`;

      const radius = BASE_RADIUS * scale;
      this.container.style.borderRadius = `${radius}px`;
      this.iframe.style.borderRadius = `${radius}px`;
      
      this.emit('scale', { scale, width: width * scale, height: height * scale });
    }

    // --------------------------------------------------------
    // Fullscreen Control
    // --------------------------------------------------------
    _setFullscreen(state) {
      const styles = this._getStyles();
      
      this.state.isFullscreen = state;
      this.container.style.cssText = state ? styles.container.fullscreen : styles.container.default;
      this.iframe.style.boxShadow = state ? '0 0 60px rgba(0,0,0,.4)' : 'none';
      this.iframe.style.borderRadius = state ? '0' : `${BASE_RADIUS}px`;

      // ARIA
      this.container.setAttribute('aria-expanded', state);
      
      this._updateScale();
      
      // Notify iframe
      this._postMessage({ type: 'fullscreenState', isFullscreen: state });
      
      this.emit('fullscreen', { isFullscreen: state });
    }

    toggleFullscreen() {
      if (this.device.isIOS) {
        this._log('Fullscreen not supported on iOS');
        return;
      }

      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (this.state.isFullscreen) {
        this._setFullscreen(false);
      } else if (this.container.requestFullscreen) {
        this.container.requestFullscreen()
          .then(() => this._setFullscreen(true))
          .catch(() => this._setFullscreen(true));
      } else {
        this._setFullscreen(true);
      }
    }

    // --------------------------------------------------------
    // Communication
    // --------------------------------------------------------
    _postMessage(data) {
      try {
        this.iframe?.contentWindow?.postMessage(
          { ...data, id: this.id },
          '*'
        );
      } catch (e) {
        this._log('PostMessage error', e);
      }
    }

    // Send custom data to iframe
    send(type, payload) {
      this._postMessage({ type, payload });
    }

    // --------------------------------------------------------
    // Event Handlers
    // --------------------------------------------------------
    _setupEventListeners() {
      const { width, height, lazyLoad, lazyLoadMargin, focusTrap } = this.config;

      // Message handler
      const onMessage = (e) => {
        if (!e.data || e.data.id !== this.id) return;
        
        switch (e.data.type) {
          case 'toggleFullscreen':
            this.toggleFullscreen();
            break;
          case 'ready':
            this.state.isReady = true;
            this.emit('ready', this);
            break;
          default:
            this.emit('message', e.data);
        }
      };
      window.addEventListener('message', onMessage);
      this._cleanups.push(() => window.removeEventListener('message', onMessage));

      // Fullscreen change
      const onFullscreenChange = () => {
        if (this.device.isIOS) return;
        if (document.fullscreenElement === this.container) {
          this._setFullscreen(true);
        } else if (this.state.isFullscreen && !document.fullscreenElement) {
          this._setFullscreen(false);
        }
      };
      document.addEventListener('fullscreenchange', onFullscreenChange);
      this._cleanups.push(() => document.removeEventListener('fullscreenchange', onFullscreenChange));

      // Escape key
      const onKeydown = (e) => {
        if (e.key === 'Escape' && this.state.isFullscreen && !document.fullscreenElement) {
          this._setFullscreen(false);
        }
      };
      document.addEventListener('keydown', onKeydown);
      this._cleanups.push(() => document.removeEventListener('keydown', onKeydown));

      // ResizeObserver (better than window.resize)
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(Utils.throttle(() => this._updateScale(), 16));
        ro.observe(this.container);
        this._cleanups.push(() => ro.disconnect());
      } else {
        // Fallback
        const onResize = Utils.throttle(() => this._updateScale(), 16);
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);
        this._cleanups.push(() => {
          window.removeEventListener('resize', onResize);
          window.removeEventListener('orientationchange', onResize);
        });
      }

      // IntersectionObserver for lazy loading visibility tracking
      if (typeof IntersectionObserver !== 'undefined') {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach(entry => {
              const wasVisible = this.state.isVisible;
              this.state.isVisible = entry.isIntersecting;
              
              if (this.state.isVisible && !wasVisible) {
                this.emit('visible', this);
              } else if (!this.state.isVisible && wasVisible) {
                this.emit('hidden', this);
              }
            });
          },
          { rootMargin: lazyLoadMargin }
        );
        io.observe(this.container);
        this._cleanups.push(() => io.disconnect());
      }

      // Focus trap for accessibility (optional)
      if (focusTrap) {
        const onFocusIn = (e) => {
          if (this.state.isFullscreen && !this.container.contains(e.target)) {
            this.iframe?.focus();
          }
        };
        document.addEventListener('focusin', onFocusIn);
        this._cleanups.push(() => document.removeEventListener('focusin', onFocusIn));
      }

      // Reduced motion change
      if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onMotionChange = (e) => {
          if (this.config.reduceMotion === 'auto') {
            this._reduceMotion = e.matches;
            this.wrapper.style.transition = e.matches ? 'none' : 'transform .3s ease';
          }
        };
        mq.addEventListener?.('change', onMotionChange) || mq.addListener?.(onMotionChange);
        this._cleanups.push(() => {
          mq.removeEventListener?.('change', onMotionChange) || mq.removeListener?.(onMotionChange);
        });
      }
    }

    // --------------------------------------------------------
    // Logging
    // --------------------------------------------------------
    _log(...args) {
      if (this.config.debug) {
        console.log(`[PiaiEmbed:${this.id}]`, ...args);
      }
    }

    // --------------------------------------------------------
    // Render
    // --------------------------------------------------------
    render() {
      if (this.state.isDestroyed) {
        console.error('PiaiEmbed: Cannot render destroyed instance');
        return this;
      }

      const { container: containerFromConfig, id, lazyLoad } = this.config;

      // Find container
      this.container = containerFromConfig ||
        (typeof id === 'string' ? document.getElementById(id) : null);

      if (!this.container) {
        console.error('PiaiEmbed: Container not found');
        this.emit('error', { message: 'Container not found' });
        return this;
      }

      // Apply container ID
      if (!this.container.id) this.container.id = this.id;

      const styles = this._getStyles();

      // Setup container
      this.container.style.cssText = styles.container.default;
      this.container.setAttribute('role', 'application');
      this.container.setAttribute('aria-label', 'Interactive embed');
      this.container.setAttribute('aria-expanded', 'false');

      // Create wrapper
      this.wrapper = document.createElement('div');
      this.wrapper.style.cssText = styles.wrapper;
      this.wrapper.className = 'piai-embed-wrapper';

      // Generate HTML
      const iframeHtml = this._generateHTML(false);
      if (!iframeHtml) {
        console.error('PiaiEmbed: No HTML content');
        this.emit('error', { message: 'No HTML content' });
        return this;
      }

      // Create blob URL
      let blobUrl;
      try {
        const blob = new Blob([iframeHtml], { type: 'text/html' });
        blobUrl = URL.createObjectURL(blob);
      } catch (e) {
        console.error('PiaiEmbed: Blob creation failed', e);
        this.emit('error', { message: 'Blob creation failed', error: e });
        return this;
      }

      // iOS standalone URL
      let iosStandaloneUrl = '';
      if (this.device.isIOS) {
        try {
          const standaloneHtml = this._generateHTML(true);
          if (standaloneHtml) {
            const blobStandalone = new Blob([standaloneHtml], { type: 'text/html' });
            iosStandaloneUrl = URL.createObjectURL(blobStandalone);
          }
        } catch (e) {
          this._log('Standalone blob error', e);
        }
      }

      // Create iframe
      this.iframe = document.createElement('iframe');
      this.iframe.className = 'piai-embed-iframe';
      this.iframe.style.cssText = styles.iframe;
      this.iframe.scrolling = 'no';
      this.iframe.loading = lazyLoad ? 'lazy' : 'eager';
      this.iframe.sandbox = 'allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-popups';
      this.iframe.allow = 'fullscreen; clipboard-read; clipboard-write';
      this.iframe.title = 'Interactive content';
      this.iframe.setAttribute('aria-label', 'Interactive content frame');
      
      if (iosStandaloneUrl) {
        this.iframe.dataset.iosStandaloneUrl = iosStandaloneUrl;
        this._cleanups.push(() => {
          try { URL.revokeObjectURL(iosStandaloneUrl); } catch {}
        });
      }

      // Load handling
      this.iframe.onload = () => {
        try { URL.revokeObjectURL(blobUrl); } catch {}
        this._log('Iframe loaded');
        this.emit('load', this);
      };

      this.iframe.onerror = (e) => {
        this._log('Iframe error', e);
        this.emit('error', { message: 'Iframe load error', error: e });
      };

      // Set src (triggers load)
      this.iframe.src = blobUrl;

      // Mount
      this.wrapper.appendChild(this.iframe);
      this.container.appendChild(this.wrapper);

      // Setup events
      this._setupEventListeners();

      // Initial scale
      this._updateScale();

      this._log('Rendered');
      this.emit('render', this);

      return this;
    }

    // --------------------------------------------------------
    // Update Config
    // --------------------------------------------------------
    update(newOptions) {
      if (this.state.isDestroyed) return this;
      
      this.config = Utils.deepMerge(this.config, newOptions);
      
      if (newOptions.theme || newOptions.themeName) {
        this.theme = this._resolveTheme(newOptions.theme || newOptions.themeName);
      }
      
      this._updateScale();
      this.emit('update', this.config);
      
      return this;
    }

    // --------------------------------------------------------
    // Refresh Content
    // --------------------------------------------------------
    refresh() {
      if (this.state.isDestroyed || !this.iframe) return this;
      
      const html = this._generateHTML(false);
      if (!html) return this;
      
      try {
        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        
        this.iframe.onload = () => {
          try { URL.revokeObjectURL(blobUrl); } catch {}
          this.emit('refresh', this);
        };
        
        this.iframe.src = blobUrl;
      } catch (e) {
        this._log('Refresh error', e);
      }
      
      return this;
    }

    // --------------------------------------------------------
    // Destroy
    // --------------------------------------------------------
    destroy() {
      if (this.state.isDestroyed) return;
      
      this._log('Destroying');
      
      // Run all cleanups
      this._cleanups.forEach(fn => {
        try { fn(); } catch {}
      });
      this._cleanups = [];
      
      // Remove DOM
      if (this.wrapper && this.wrapper.parentNode) {
        this.wrapper.parentNode.removeChild(this.wrapper);
      }
      
      // Clear references
      this.container = null;
      this.wrapper = null;
      this.iframe = null;
      
      this.state.isDestroyed = true;
      
      this.emit('destroy', this);
      this.removeAllListeners();
    }

    // --------------------------------------------------------
    // Getters
    // --------------------------------------------------------
    get isFullscreen() {
      return this.state.isFullscreen;
    }

    get isReady() {
      return this.state.isReady;
    }

    get isVisible() {
      return this.state.isVisible;
    }

    get isDestroyed() {
      return this.state.isDestroyed;
    }
  }

  // ============================================================
  // 5. FACTORY FUNCTIONS
  // ============================================================
  
  // Track all instances
  const instances = new Map();

  function render(options) {
    const instance = new EmbedInstance(options);
    instance.render();
    instances.set(instance.id, instance);
    return instance;
  }

  function get(id) {
    return instances.get(id);
  }

  function getAll() {
    return Array.from(instances.values());
  }

  function destroyAll() {
    instances.forEach(instance => instance.destroy());
    instances.clear();
  }

  // ============================================================
  // 6. EXPORT
  // ============================================================
  
  const api = {
    // Core
    render,
    EmbedInstance,
    
    // Instance management
    get,
    getAll,
    destroyAll,
    
    // Themes
    themes: THEMES,
    themeNames: Object.keys(THEMES),  // ['classic', 'educational', 'neon']
    getTheme: (name) => THEMES[name] || THEMES.classic,
    
    // CSS Generation (for advanced usage)
    generateBaseCSS,
    
    // Utilities
    utils: Utils,
    
    // Defaults
    defaults: { ...DEFAULT_CONFIG },
    
    // Version
    version: VERSION,
  };

  // AMD
  if (typeof define === 'function' && define.amd) {
    define([], () => api);
  }
  // CommonJS
  else if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  // Browser global
  global.PiaiEmbed = api;

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
