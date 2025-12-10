// piai-embed-engine.js v2.1 OPTIMIZED
// Full features + Performance fixes
// Fixes: CSS memoization, template literal optimization, throttle/debounce tuning
(function (global) {
  'use strict';

  const VERSION = '2.1.0-optimized';
  
  // ============================================================
  // CONSTANTS & THEMES
  // ============================================================
  
  const THEMES = {
    classic: {
      name: 'classic',
      label: 'Classic',
      primary: '#800020',
      accent: '#b8860b',
      secondary: '#002b5c',
      bg: '#f9f7f5',
      text: '#1a1a1a',
      textLight: '#666666',
    },
    educational: {
      name: 'educational',
      label: 'Education',
      primary: '#2196F3',
      accent: '#FFC107',
      secondary: '#4CAF50',
      bg: '#FFFFFF',
      text: '#212121',
      textLight: '#757575',
    },
    night: {
      name: 'night',
      label: 'Night',
      primary: '#9BA4B5',
      accent: '#394867',
      secondary: '#F1F6F9',
      bg: '#212A3E',
      text: '#F1F6F9',
      textLight: '#9BA4B5',
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
  // CSS GENERATION - MEMOIZED for performance
  // ============================================================
  
  // CSS cache to avoid regenerating same CSS
  const CSS_CACHE = new Map();
  
  const generateBaseCSS = (theme) => {
    const cacheKey = theme.name || JSON.stringify(theme);
    
    // Return cached CSS if available
    if (CSS_CACHE.has(cacheKey)) {
      return CSS_CACHE.get(cacheKey);
    }
    
    // Generate CSS (using array join for better performance than template literals)
    const cssRules = [
      '/* PIAI EMBED BASE CSS v2.1 OPTIMIZED */',
      ':root {',
      `  --piai-primary: ${theme.primary};`,
      `  --piai-accent: ${theme.accent};`,
      `  --piai-secondary: ${theme.secondary};`,
      `  --piai-bg: ${theme.bg};`,
      `  --piai-text: ${theme.text};`,
      `  --piai-text-light: ${theme.textLight};`,
      `  --piai-primary-light: ${theme.primary}15;`,
      `  --piai-primary-border: ${theme.primary}26;`,
      `  --piai-accent-light: ${theme.accent}20;`,
      `  --piai-shadow-sm: 0 2px 8px rgba(0,0,0,0.08);`,
      `  --piai-shadow-md: 0 4px 12px rgba(0,0,0,0.12);`,
      `  --piai-shadow-hover: 0 6px 20px rgba(0,0,0,0.15);`,
      `  --piai-font: ${SYSTEM_FONT_STACK};`,
      '  --piai-fs-xs: 0.7rem;',
      '  --piai-fs-sm: 0.8rem;',
      '  --piai-fs-base: 0.85rem;',
      '  --piai-fs-md: 0.95rem;',
      '  --piai-fs-lg: 1.1rem;',
      '  --piai-space-xs: 4px;',
      '  --piai-space-sm: 8px;',
      '  --piai-space-md: 12px;',
      '  --piai-space-lg: 16px;',
      '  --piai-space-xl: 24px;',
      '  --piai-radius-sm: 4px;',
      '  --piai-radius-md: 8px;',
      '  --piai-radius-lg: 12px;',
      '  --piai-transition: all 0.25s ease;',
      '}',
      '*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }',
      'html, body { font-family: var(--piai-font); font-size: 16px; line-height: 1.5; color: var(--piai-text); background: transparent; width: 100%; height: 100%; overflow: hidden; -webkit-font-smoothing: antialiased; }',
      '.piai-wrap { width: 100%; height: 100%; position: relative; background: var(--piai-bg); display: flex; flex-direction: column; overflow: hidden; }',
      '.piai-wrap.standalone { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); }',
      '.piai-hdr { background: var(--piai-primary); color: #fff; padding: var(--piai-space-sm) var(--piai-space-lg); padding-right: 85px; font-weight: 700; font-size: var(--piai-fs-md); display: flex; align-items: center; border-bottom: 3px solid var(--piai-accent); flex-shrink: 0; position: relative; }',
      '.piai-hdr > * { margin-right: 10px; }',
      '.piai-hdr > *:last-child { margin-right: 0; }',
      '.piai-hdr svg, .piai-hdr i { width: 20px; height: 20px; flex-shrink: 0; }',
      '.piai-body { flex: 1; min-height: 0; padding: var(--piai-space-sm) var(--piai-space-lg); overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; }',
      '.piai-body > * { margin-bottom: 15px; }',
      '.piai-body > *:last-child { margin-bottom: 0; }',
      '.piai-body::-webkit-scrollbar { width: 6px; }',
      '.piai-body::-webkit-scrollbar-thumb { background: var(--piai-text-light); border-radius: 3px; }',
      '.piai-body::-webkit-scrollbar-thumb:hover { background: var(--piai-text); }',
      '.piai-def { background: var(--piai-bg); border-left: 5px solid var(--piai-primary); padding: var(--piai-space-sm) var(--piai-space-md); box-shadow: var(--piai-shadow-sm); border-radius: 0 var(--piai-radius-md) var(--piai-radius-md) 0; transition: var(--piai-transition); flex-shrink: 0; }',
      '.piai-def:hover { transform: translateY(-2px); border-left-color: var(--piai-accent); box-shadow: var(--piai-shadow-hover); }',
      '.piai-def-title { color: var(--piai-primary); font-weight: 700; font-size: var(--piai-fs-base); display: flex; align-items: center; margin-bottom: 6px; }',
      '.piai-def-title > * { margin-right: 8px; }',
      '.piai-def-title > *:last-child { margin-right: 0; }',
      '.piai-def-title svg, .piai-def-title i { width: 16px; height: 16px; flex-shrink: 0; }',
      '.piai-def-content { font-size: var(--piai-fs-sm); line-height: 1.5; color: var(--piai-text); }',
      '.piai-def-content b, .piai-def-content strong { color: var(--piai-primary); }',
      '.piai-grid { display: flex; flex: 1; min-height: 0; min-width: 0; }',
      '.piai-grid > * { margin-right: var(--piai-space-lg); }',
      '.piai-grid > *:last-child { margin-right: 0; }',
      '.piai-grid.reverse { flex-direction: row-reverse; }',
      '.piai-grid.reverse > * { margin-right: 0; margin-left: var(--piai-space-lg); }',
      '.piai-grid.reverse > *:last-child { margin-left: 0; }',
      '.piai-grid.vertical { flex-direction: column; }',
      '.piai-grid.vertical > * { margin-right: 0; margin-bottom: var(--piai-space-lg); }',
      '.piai-grid.vertical > *:last-child { margin-bottom: 0; }',
      '.piai-list { flex: 1; display: flex; flex-direction: column; overflow-y: auto; overflow-x: hidden; padding-right: 12px; list-style: none; width: 100%; min-width: 0; }',
      '.piai-list-item { display: flex; align-items: flex-start; padding: var(--piai-space-sm) var(--piai-space-md); background: var(--piai-bg); border-radius: var(--piai-radius-md); border: 1px solid var(--piai-text-light); transition: var(--piai-transition); font-size: var(--piai-fs-sm); color: var(--piai-text); min-width: 0; width: 100%; margin-bottom: 8px; }',
      '.piai-list-item:last-child { margin-bottom: 0; }',
      '.piai-list-item:hover { transform: translateY(-2px); border-color: var(--piai-accent); box-shadow: 0 2px 8px var(--piai-accent-light); }',
      '.piai-list-item > * { margin-right: 12px; }',
      '.piai-list-item > *:last-child { margin-right: 0; }',
      '.piai-list-item .piai-ico { color: var(--piai-accent); margin-top: 2px; transition: var(--piai-transition); flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; }',
      '.piai-list-item:hover .piai-ico { color: var(--piai-primary); transform: scale(1.15) rotate(8deg); }',
      '.piai-list-item-content { flex: 1; min-width: 0; word-wrap: break-word; overflow-wrap: break-word; }',
      '.piai-list-item-content strong { color: var(--piai-primary); font-weight: 700; }',
      '.piai-visual { flex: 0 0 280px; display: flex; flex-direction: column; justify-content: center; align-items: center; overflow: hidden; }',
      '.piai-visual.wide { flex: 0 0 340px; }',
      '.piai-visual.narrow { flex: 0 0 200px; }',
      '.piai-visual svg { width: 100%; height: auto; max-height: 100%; }',
      '.hdr-btn { position: absolute; top: 0; z-index: 999; width: 40px; height: 48px; background: transparent; border: none; cursor: pointer; color: var(--piai-accent); display: flex; align-items: center; justify-content: center; transition: var(--piai-transition); }',
      '.hdr-btn:hover { color: #fff; transform: scale(1.1); }',
      '.hdr-btn svg { width: 22px; height: 22px; }',
      '.theme-btn { right: 40px; }',
      '.fs-btn { right: 0; }',
      '.piai-loader { position: absolute; inset: 0; background: var(--piai-bg); display: flex; align-items: center; justify-content: center; z-index: 100; transition: opacity 0.3s; }',
      '.piai-loader.hide { opacity: 0; pointer-events: none; }',
      '.piai-loader-spinner { width: 32px; height: 32px; border: 3px solid var(--piai-text-light); border-top-color: var(--piai-primary); border-radius: 50%; animation: piai-spin 0.8s linear infinite; }',
      '@keyframes piai-spin { to { transform: rotate(360deg); } }',
      'mjx-container { font-size: 105% !important; margin: 0 !important; }',
      '.piai-text-center { text-align: center; }',
      '.piai-text-primary { color: var(--piai-primary); }',
      '.piai-text-accent { color: var(--piai-accent); }',
      '.piai-text-bold { font-weight: 700; }',
      '.piai-mt-sm { margin-top: var(--piai-space-sm); }',
      '.piai-mt-md { margin-top: var(--piai-space-md); }',
      '.piai-mb-sm { margin-bottom: var(--piai-space-sm); }',
      '.piai-mb-md { margin-bottom: var(--piai-space-md); }',
      '.piai-flex { display: flex; }',
      '.piai-flex-center { display: flex; align-items: center; justify-content: center; }',
      '@media (max-width: 650px) {',
      '  .piai-grid { flex-direction: column; }',
      '  .piai-grid > * { margin-right: 0; margin-bottom: var(--piai-space-lg); }',
      '  .piai-grid > *:last-child { margin-bottom: 0; }',
      '  .piai-grid.reverse { flex-direction: column-reverse; }',
      '  .piai-visual { flex: 0 0 auto; width: 100%; padding: 10px; }',
      '  .piai-hdr { padding: 10px 16px; padding-right: 85px; font-size: var(--piai-fs-sm); }',
      '  .piai-body { padding: var(--piai-space-sm); }',
      '  .piai-list { padding-right: 4px; }',
      '}'
    ];
    
    const css = cssRules.join('\n');
    
    // Cache result
    CSS_CACHE.set(cacheKey, css);
    
    // Limit cache size (prevent memory leak)
    if (CSS_CACHE.size > 10) {
      const firstKey = CSS_CACHE.keys().next().value;
      CSS_CACHE.delete(firstKey);
    }
    
    return css;
  };

  // ============================================================
  // UTILITIES - OPTIMIZED
  // ============================================================
  
  const Utils = {
    detectDevice() {
      const ua = navigator.userAgent || '';
      return {
        isIOS: /iPad|iPhone|iPod/.test(ua) && !window.MSStream,
        isAndroid: /Android/.test(ua),
        isMobile: /Mobi|Android/i.test(ua),
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      };
    },

    prefersReducedMotion() {
      return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    },

    prefersDarkMode() {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    },

    // Optimized deepMerge - non-recursive for performance
    deepMerge(target, source) {
      const result = { ...target };
      
      for (const key in source) {
        if (!source.hasOwnProperty(key)) continue;
        
        const sourceValue = source[key];
        const targetValue = result[key];
        
        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
            result[key] = { ...targetValue, ...sourceValue };
          } else {
            result[key] = { ...sourceValue };
          }
        } else {
          result[key] = sourceValue;
        }
      }
      
      return result;
    },

    uid(prefix = 'piai') {
      return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    },

    // Throttle optimized for 60fps (16ms)
    throttle(fn, wait = 16) {
      let lastTime = 0;
      let timeoutId = null;
      
      return function throttled(...args) {
        const now = Date.now();
        const remaining = wait - (now - lastTime);
        
        if (remaining <= 0) {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          lastTime = now;
          fn.apply(this, args);
        } else if (!timeoutId) {
          timeoutId = setTimeout(() => {
            lastTime = Date.now();
            timeoutId = null;
            fn.apply(this, args);
          }, remaining);
        }
      };
    },

    debounce(fn, wait) {
      let timeout;
      return function debounced(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), wait);
      };
    },
  };

  // ============================================================
  // EVENT EMITTER - KEPT FOR FULL FEATURES
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
      const listeners = this._events.get(event);
      if (!listeners) return;
      
      listeners.forEach(fn => {
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
  // EMBED INSTANCE CLASS - FULL FEATURES + OPTIMIZED
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
      
      this.container = null;
      this.wrapper = null;
      this.iframe = null;
      this._cleanups = [];
      
      this.theme = this._resolveTheme(this.config.theme || this.config.themeName);
      this._reduceMotion = this.config.reduceMotion === 'auto' 
        ? Utils.prefersReducedMotion() 
        : this.config.reduceMotion;
    }

    _resolveTheme(themeInput) {
      if (typeof themeInput === 'string') {
        return THEMES[themeInput] || THEMES.classic;
      }
      if (typeof themeInput === 'object') {
        return { ...THEMES.classic, ...themeInput };
      }
      return THEMES.classic;
    }

    setTheme(themeName) {
      if (this.state.isDestroyed) return this;
      
      if (!THEMES[themeName]) {
        this._log('Invalid theme:', themeName);
        return this;
      }
      
      const oldThemeName = this.theme.name || this.config.themeName;
      if (oldThemeName === themeName) return this;
      
      this.theme = this._resolveTheme(themeName);
      this.config.themeName = themeName;
      
      if (this.container && !this.state.isFullscreen) {
        this.container.style.borderColor = `${this.theme.primary}26`;
      }
      
      if (this.iframe) {
        this.iframe.style.background = this.theme.bg;
      }
      
      this._postMessage({ 
        type: 'themeChange', 
        theme: this.theme,
        themeName: themeName,
        cssVars: {
          '--piai-primary': this.theme.primary,
          '--piai-accent': this.theme.accent,
          '--piai-secondary': this.theme.secondary,
          '--piai-bg': this.theme.bg,
          '--piai-text': this.theme.text,
          '--piai-text-light': this.theme.textLight,
          '--piai-primary-light': `${this.theme.primary}15`,
          '--piai-primary-border': `${this.theme.primary}26`,
          '--piai-accent-light': `${this.theme.accent}20`,
        }
      });
      
      this.emit('themechange', { 
        theme: this.theme, 
        themeName: themeName,
        previousTheme: oldThemeName 
      });
      
      this._log('Theme changed:', oldThemeName, '->', themeName);
      
      return this;
    }

    getThemeName() {
      return this.theme.name || this.config.themeName;
    }
    
    getTheme() {
      return this.theme;
    }

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

    _injectSystemFontCss(html) {
      if (!html || typeof html !== 'string') return html;
      if (html.includes('__NO_SYSTEM_FONT_OVERRIDE__')) return html;
      
      const baseCSS = '<style id="piai-base-css">' + generateBaseCSS(this.theme) + '</style>';
      
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
        themeName: this.theme.name,
        isIOS: this.device.isIOS,
        isMobile: this.device.isMobile,
        isStandalone,
        reduceMotion: this._reduceMotion,
      };

      const generator = typeof htmlGenerator === 'function' ? htmlGenerator : () => html;
      let generatedHtml = generator(context);
      
      return this._injectSystemFontCss(generatedHtml);
    }

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

    _setFullscreen(state) {
      const styles = this._getStyles();
      
      this.state.isFullscreen = state;
      this.container.style.cssText = state ? styles.container.fullscreen : styles.container.default;
      this.iframe.style.boxShadow = state ? '0 0 60px rgba(0,0,0,.4)' : 'none';
      this.iframe.style.borderRadius = state ? '0' : `${BASE_RADIUS}px`;

      this.container.setAttribute('aria-expanded', state);
      
      this._updateScale();
      
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

    send(type, payload) {
      this._postMessage({ type, payload });
    }

    _setupEventListeners() {
      const { width, height, lazyLoad, lazyLoadMargin, focusTrap } = this.config;

      const onMessage = (e) => {
        if (!e.data || e.data.id !== this.id) return;
        
        switch (e.data.type) {
          case 'toggleFullscreen':
            this.toggleFullscreen();
            break;
          case 'themeSwitch':
            if (e.data.themeName) this.setTheme(e.data.themeName);
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

      const onKeydown = (e) => {
        if (e.key === 'Escape' && this.state.isFullscreen && !document.fullscreenElement) {
          this._setFullscreen(false);
        }
      };
      document.addEventListener('keydown', onKeydown);
      this._cleanups.push(() => document.removeEventListener('keydown', onKeydown));

      // ResizeObserver with 16ms throttle (60fps)
      if (typeof ResizeObserver !== 'undefined') {
        const throttledUpdate = Utils.throttle(() => this._updateScale(), 16);
        const ro = new ResizeObserver(throttledUpdate);
        ro.observe(this.container);
        this._cleanups.push(() => ro.disconnect());
      } else {
        const onResize = Utils.throttle(() => this._updateScale(), 16);
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);
        this._cleanups.push(() => {
          window.removeEventListener('resize', onResize);
          window.removeEventListener('orientationchange', onResize);
        });
      }

      // IntersectionObserver - no throttle needed
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

      if (focusTrap) {
        const onFocusIn = (e) => {
          if (this.state.isFullscreen && !this.container.contains(e.target)) {
            this.iframe?.focus();
          }
        };
        document.addEventListener('focusin', onFocusIn);
        this._cleanups.push(() => document.removeEventListener('focusin', onFocusIn));
      }

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

    _log(...args) {
      if (this.config.debug) {
        console.log(`[PiaiEmbed:${this.id}]`, ...args);
      }
    }

    render() {
      if (this.state.isDestroyed) {
        console.error('PiaiEmbed: Cannot render destroyed instance');
        return this;
      }

      const { container: containerFromConfig, id, lazyLoad } = this.config;

      this.container = containerFromConfig ||
        (typeof id === 'string' ? document.getElementById(id) : null);

      if (!this.container) {
        console.error('PiaiEmbed: Container not found');
        this.emit('error', { message: 'Container not found' });
        return this;
      }

      if (!this.container.id) this.container.id = this.id;

      const styles = this._getStyles();

      this.container.style.cssText = styles.container.default;
      this.container.setAttribute('role', 'application');
      this.container.setAttribute('aria-label', 'Interactive embed');
      this.container.setAttribute('aria-expanded', 'false');

      this.wrapper = document.createElement('div');
      this.wrapper.style.cssText = styles.wrapper;
      this.wrapper.className = 'piai-embed-wrapper';

      const iframeHtml = this._generateHTML(false);
      if (!iframeHtml) {
        console.error('PiaiEmbed: No HTML content');
        this.emit('error', { message: 'No HTML content' });
        return this;
      }

      let blobUrl;
      try {
        const blob = new Blob([iframeHtml], { type: 'text/html' });
        blobUrl = URL.createObjectURL(blob);
      } catch (e) {
        console.error('PiaiEmbed: Blob creation failed', e);
        this.emit('error', { message: 'Blob creation failed', error: e });
        return this;
      }

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

      this.iframe.onload = () => {
        try { URL.revokeObjectURL(blobUrl); } catch {}
        this._log('Iframe loaded');
        this.emit('load', this);
      };

      this.iframe.onerror = (e) => {
        this._log('Iframe error', e);
        this.emit('error', { message: 'Iframe load error', error: e });
      };

      this.iframe.src = blobUrl;

      this.wrapper.appendChild(this.iframe);
      this.container.appendChild(this.wrapper);

      this._setupEventListeners();

      this._updateScale();

      this._log('Rendered');
      this.emit('render', this);

      return this;
    }

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

    destroy() {
      if (this.state.isDestroyed) return;
      
      this._log('Destroying');
      
      this._cleanups.forEach(fn => {
        try { fn(); } catch {}
      });
      this._cleanups = [];
      
      if (this.wrapper && this.wrapper.parentNode) {
        this.wrapper.parentNode.removeChild(this.wrapper);
      }
      
      this.container = null;
      this.wrapper = null;
      this.iframe = null;
      
      this.state.isDestroyed = true;
      
      this.emit('destroy', this);
      this.removeAllListeners();
    }

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
  // FACTORY FUNCTIONS
  // ============================================================
  
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
  // EXPORT
  // ============================================================
  
  const api = {
    render,
    EmbedInstance,
    get,
    getAll,
    destroyAll,
    themes: THEMES,
    themeNames: Object.keys(THEMES),
    getTheme: (name) => THEMES[name] || THEMES.classic,
    generateBaseCSS,
    utils: Utils,
    defaults: { ...DEFAULT_CONFIG },
    version: VERSION,
  };

  if (typeof define === 'function' && define.amd) {
    define([], () => api);
  }
  else if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  global.PiaiEmbed = api;

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
