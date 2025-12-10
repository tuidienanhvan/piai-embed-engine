// piai-embed-engine.js v2.2 - Optimized & Simplified
// Smaller, faster, more reliable
(function(global) {
  'use strict';

  const VERSION = '2.2.0';
  
  // ============================================================
  // THEMES
  // ============================================================
  const THEMES = {
    classic: { name: 'classic', primary: '#800020', accent: '#b8860b', secondary: '#002b5c', bg: '#f9f7f5', text: '#1a1a1a', textLight: '#666666' },
    educational: { name: 'educational', primary: '#2196F3', accent: '#FFC107', secondary: '#4CAF50', bg: '#FFFFFF', text: '#212121', textLight: '#757575' },
    night: { name: 'night', primary: '#9BA4B5', accent: '#394867', secondary: '#F1F6F9', bg: '#212A3E', text: '#F1F6F9', textLight: '#9BA4B5' }
  };

  // ============================================================
  // CSS GENERATOR - MINIFIED for performance
  // ============================================================
  const generateCSS = (theme) => {
    return `:root{--piai-primary:${theme.primary};--piai-accent:${theme.accent};--piai-secondary:${theme.secondary};--piai-bg:${theme.bg};--piai-text:${theme.text};--piai-text-light:${theme.textLight};--piai-primary-light:${theme.primary}15;--piai-accent-light:${theme.accent}20}*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:var(--piai-text);background:transparent;width:100%;height:100%;overflow:hidden}.piai-wrap{width:100%;height:100%;background:var(--piai-bg);display:flex;flex-direction:column;overflow:hidden}.piai-hdr{background:var(--piai-primary);color:#fff;padding:12px 20px;padding-right:85px;font-weight:700;display:flex;align-items:center;border-bottom:3px solid var(--piai-accent);position:relative}.piai-hdr>*{margin-right:10px}.piai-hdr>*:last-child{margin-right:0}.piai-hdr svg{width:20px;height:20px}.piai-body{flex:1;padding:15px 20px;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column}.piai-body>*{margin-bottom:15px}.piai-body>*:last-child{margin-bottom:0}.piai-body::-webkit-scrollbar{width:6px}.piai-body::-webkit-scrollbar-thumb{background:var(--piai-text-light);border-radius:3px}.piai-def{background:var(--piai-bg);border-left:5px solid var(--piai-primary);padding:12px 18px;box-shadow:0 4px 10px rgba(0,0,0,0.05);border-radius:0 8px 8px 0;transition:all 0.3s}.piai-def:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,0.1)}.piai-def-title{color:var(--piai-primary);font-weight:700;display:flex;align-items:center;margin-bottom:6px}.piai-def-title>*{margin-right:8px}.piai-def-title>*:last-child{margin-right:0}.piai-def-content{line-height:1.5;font-size:0.95rem}.piai-grid{display:flex;flex:1;min-height:0}.piai-grid>*{margin-right:20px}.piai-grid>*:last-child{margin-right:0}.piai-list{flex:1;display:flex;flex-direction:column;overflow-y:auto;list-style:none;padding-right:12px}.piai-list-item{display:flex;align-items:flex-start;padding:10px 14px;background:var(--piai-bg);border:1px solid var(--piai-text-light);border-radius:8px;font-size:0.9rem;transition:all 0.3s;margin-bottom:8px}.piai-list-item:last-child{margin-bottom:0}.piai-list-item:hover{transform:translateY(-2px);border-color:var(--piai-accent);box-shadow:0 4px 12px var(--piai-accent-light)}.piai-list-item>*{margin-right:12px}.piai-list-item>*:last-child{margin-right:0}.piai-list-item .piai-ico{color:var(--piai-accent);display:flex;margin-top:2px;transition:all 0.3s}.piai-list-item:hover .piai-ico{transform:scale(1.15) rotate(8deg)}.piai-list-item>div{flex:1;min-width:0;word-wrap:break-word}.piai-list-item strong{color:var(--piai-primary)}.piai-visual{flex:0 0 280px;display:flex;align-items:center;justify-content:center}.piai-visual svg{max-width:100%;max-height:100%}.hdr-btn{position:absolute;top:0;z-index:999;width:40px;height:48px;background:transparent;border:none;cursor:pointer;color:var(--piai-accent);display:flex;align-items:center;justify-content:center;transition:all 0.2s}.hdr-btn:hover{color:#fff;transform:scale(1.1)}.hdr-btn svg{width:22px;height:22px}.theme-btn{right:40px}.fs-btn{right:0}.piai-loader{position:absolute;inset:0;background:var(--piai-bg);display:flex;align-items:center;justify-content:center;z-index:100;transition:opacity 0.3s}.piai-loader.hide{opacity:0;pointer-events:none}.spinner{width:32px;height:32px;border:3px solid var(--piai-text-light);border-top-color:var(--piai-primary);border-radius:50%;animation:spin 0.8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media (max-width:650px){.piai-grid{flex-direction:column}.piai-grid>*{margin-right:0;margin-bottom:16px}.piai-grid>*:last-child{margin-bottom:0}.piai-visual{flex:0 0 auto;padding:10px;width:100%}.piai-hdr{padding:10px 16px;padding-right:85px}.piai-list{padding-right:4px}}`;
  };

  // ============================================================
  // UTILITIES
  // ============================================================
  const Utils = {
    uid: (prefix = 'piai') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    
    throttle: (fn, wait) => {
      let lastTime = 0;
      return function(...args) {
        const now = Date.now();
        if (now - lastTime >= wait) {
          lastTime = now;
          fn.apply(this, args);
        }
      };
    },
    
    merge: (target, source) => Object.assign({}, target, source)
  };

  // ============================================================
  // EMBED CLASS - Simplified
  // ============================================================
  class Embed {
    constructor(opts) {
      this.opts = Utils.merge({
        width: 800,
        height: 450,
        themeName: 'classic',
        debug: false
      }, opts);
      
      this.id = this.opts.id || Utils.uid();
      this.theme = THEMES[this.opts.themeName] || THEMES.classic;
      this.state = { isFullscreen: false, isReady: false };
      this._listeners = {};
      this._cleanups = [];
    }

    // Theme management
    setTheme(name) {
      if (!THEMES[name] || this.state.isDestroyed) return this;
      
      const old = this.theme.name;
      this.theme = THEMES[name];
      this.opts.themeName = name;
      
      // Update container border
      if (this.container && !this.state.isFullscreen) {
        this.container.style.borderColor = `${this.theme.primary}26`;
      }
      
      // Update iframe background
      if (this.iframe) {
        this.iframe.style.background = this.theme.bg;
      }
      
      // Send to iframe
      this._postMessage({ 
        type: 'themeChange',
        cssVars: {
          '--piai-primary': this.theme.primary,
          '--piai-accent': this.theme.accent,
          '--piai-secondary': this.theme.secondary,
          '--piai-bg': this.theme.bg,
          '--piai-text': this.theme.text,
          '--piai-text-light': this.theme.textLight,
          '--piai-primary-light': `${this.theme.primary}15`,
          '--piai-accent-light': `${this.theme.accent}20`
        }
      });
      
      this._emit('themechange', { themeName: name, previousTheme: old });
      this._log('Theme changed:', old, '->', name);
      
      return this;
    }

    // Fullscreen management
    toggleFullscreen() {
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

    _setFullscreen(state) {
      this.state.isFullscreen = state;
      const s = this._getStyles();
      this.container.style.cssText = state ? s.containerFullscreen : s.container;
      this.iframe.style.borderRadius = state ? '0' : '16px';
      this._updateScale();
      this._emit('fullscreen', { isFullscreen: state });
    }

    // HTML generation
    _generateHTML() {
      const ctx = {
        id: this.id,
        theme: this.theme,
        themeName: this.theme.name,
        width: this.opts.width,
        height: this.opts.height
      };
      
      let html = this.opts.htmlGenerator(ctx);
      const css = '<style>' + generateCSS(this.theme) + '</style>';
      
      return html.includes('</head>') 
        ? html.replace('</head>', css + '</head>')
        : css + html;
    }

    // Styles
    _getStyles() {
      const { width, height } = this.opts;
      return {
        container: `width:${width}px;max-width:100%;height:${height}px;margin:20px auto;display:flex;justify-content:center;align-items:center;position:relative;border-radius:16px;border:1px solid ${this.theme.primary}26;overflow:hidden;background:transparent`,
        containerFullscreen: `position:fixed;top:0;left:0;width:100vw;height:100vh;margin:0;border-radius:0;z-index:99999;background:#000;border:none;display:flex;justify-content:center;align-items:center;overflow:hidden`,
        wrapper: `width:${width}px;height:${height}px;transform-origin:center;transition:transform 0.2s`,
        iframe: `width:100%;height:100%;border:none;background:${this.theme.bg};border-radius:16px`
      };
    }

    // Scaling
    _updateScale() {
      if (!this.container || !this.wrapper) return;
      
      if (this.state.isFullscreen) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const scale = Math.min(vw / this.opts.width, vh / this.opts.height);
        this.wrapper.style.transform = `scale(${scale})`;
        this.container.style.height = `${vh}px`;
      } else {
        const rect = this.container.getBoundingClientRect();
        const scale = Math.min(rect.width / this.opts.width, 1);
        this.wrapper.style.transform = `scale(${scale})`;
        this.container.style.height = `${this.opts.height * scale}px`;
      }
    }

    // Message handling
    _postMessage(data) {
      try {
        this.iframe?.contentWindow?.postMessage({ ...data, id: this.id }, '*');
      } catch (e) {
        this._log('PostMessage error', e);
      }
    }

    // Event listeners setup
    _setupListeners() {
      // Message listener
      const onMessage = (e) => {
        if (!e.data || e.data.id !== this.id) return;
        
        if (e.data.type === 'ready') {
          this.state.isReady = true;
          this._emit('ready', this);
        } else if (e.data.type === 'themeSwitch' && e.data.themeName) {
          this.setTheme(e.data.themeName);
        } else if (e.data.type === 'toggleFullscreen') {
          this.toggleFullscreen();
        }
      };
      window.addEventListener('message', onMessage);
      this._cleanups.push(() => window.removeEventListener('message', onMessage));

      // Fullscreen change
      const onFullscreenChange = () => {
        if (document.fullscreenElement === this.container) {
          this._setFullscreen(true);
        } else if (this.state.isFullscreen && !document.fullscreenElement) {
          this._setFullscreen(false);
        }
      };
      document.addEventListener('fullscreenchange', onFullscreenChange);
      this._cleanups.push(() => document.removeEventListener('fullscreenchange', onFullscreenChange));

      // Resize
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(Utils.throttle(() => this._updateScale(), 16));
        ro.observe(this.container);
        this._cleanups.push(() => ro.disconnect());
      } else {
        const onResize = Utils.throttle(() => this._updateScale(), 16);
        window.addEventListener('resize', onResize);
        this._cleanups.push(() => window.removeEventListener('resize', onResize));
      }
    }

    // Render
    render() {
      if (this.state.isDestroyed) return this;

      this.container = this.opts.container || document.getElementById(this.opts.id);
      if (!this.container) {
        console.error('PiaiEmbed: Container not found');
        return this;
      }

      const s = this._getStyles();
      this.container.id = this.id;
      this.container.style.cssText = s.container;

      this.wrapper = document.createElement('div');
      this.wrapper.style.cssText = s.wrapper;

      this.iframe = document.createElement('iframe');
      this.iframe.style.cssText = s.iframe;
      this.iframe.scrolling = 'no';
      this.iframe.sandbox = 'allow-scripts allow-same-origin';
      this.iframe.title = 'Interactive content';

      const html = this._generateHTML();
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);

      this.iframe.onload = () => {
        URL.revokeObjectURL(blobUrl);
        this._log('Loaded');
        this._emit('load', this);
      };

      this.iframe.src = blobUrl;

      this.wrapper.appendChild(this.iframe);
      this.container.innerHTML = '';
      this.container.appendChild(this.wrapper);

      this._setupListeners();
      requestAnimationFrame(() => this._updateScale());

      this._log('Rendered');
      return this;
    }

    // Event system
    on(evt, fn) {
      if (!this._listeners[evt]) this._listeners[evt] = [];
      this._listeners[evt].push(fn);
      return this;
    }

    _emit(evt, data) {
      (this._listeners[evt] || []).forEach(fn => {
        try { fn(data); } catch (e) { this._log('Event error', e); }
      });
    }

    // Destroy
    destroy() {
      if (this.state.isDestroyed) return;
      
      this._cleanups.forEach(fn => { try { fn(); } catch {} });
      this._cleanups = [];
      
      if (this.wrapper?.parentNode) {
        this.wrapper.parentNode.removeChild(this.wrapper);
      }
      
      this.container = null;
      this.wrapper = null;
      this.iframe = null;
      this.state.isDestroyed = true;
      
      this._emit('destroy', this);
      this._listeners = {};
    }

    _log(...args) {
      if (this.opts.debug) console.log(`[PiaiEmbed:${this.id}]`, ...args);
    }

    // Getters
    get isFullscreen() { return this.state.isFullscreen; }
    get isReady() { return this.state.isReady; }
  }

  // ============================================================
  // API
  // ============================================================
  const instances = new Map();

  const api = {
    render: (opts) => {
      const instance = new Embed(opts).render();
      instances.set(instance.id, instance);
      return instance;
    },
    
    get: (id) => instances.get(id),
    
    getAll: () => Array.from(instances.values()),
    
    destroyAll: () => {
      instances.forEach(i => i.destroy());
      instances.clear();
    },
    
    themes: THEMES,
    version: VERSION
  };

  // Export
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  global.PiaiEmbed = api;

})(typeof window !== 'undefined' ? window : this);
