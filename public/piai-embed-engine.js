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
      primary: '#800020',
      accent: '#b8860b',
      secondary: '#002b5c',
      bg: '#f9f7f5',
    },
    educational: {
      primary: '#2196F3',
      accent: '#FFC107',
      secondary: '#4CAF50',
      bg: '#FFFFFF',
    },
    neon: {
      primary: '#00FFFF',
      accent: '#FF00FF',
      secondary: '#00FF00',
      bg: '#0a0a0a',
    },
  };

  const DEFAULT_CONFIG = {
    width: 800,
    height: 450,
    aspect: '16 / 9',
    theme: THEMES.classic,
    themeName: 'classic',
    lazyLoad: true,           // IntersectionObserver
    lazyLoadMargin: '200px',  // Load trước khi vào viewport
    reduceMotion: 'auto',     // 'auto' | true | false
    focusTrap: true,          // Accessibility
    debug: false,
  };

  const BASE_RADIUS = 16;

  const SYSTEM_FONT_STACK =
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,' +
    '"Helvetica Neue",Arial,"Noto Sans",sans-serif,' +
    '"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';

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
      if (html.includes('<head>')) {
        return html.replace('<head>', '<head>' + SYSTEM_FONT_CSS);
      }
      return SYSTEM_FONT_CSS + html;
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
