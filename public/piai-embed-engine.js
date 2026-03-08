// ==============================================================================
// PiAI Embed Engine v4.1.0 (Content-Only, High Performance)
// ==============================================================================
// CHANGELOG v4.1.0:
// ------------------
// 1. REMOVE: Full minigame/question bridge and API sync logic.
// 2. SIMPLIFY: Render pipeline is now content-only.
// 3. OPTIMIZE: Use iframe.srcdoc directly (no Blob URL lifecycle).
// 4. KEEP: lazy render, service worker preloading, theme/fullscreen controls.
// ==============================================================================

(function (global) {
  'use strict';

  const THEMES = {
    classic: {
      name: 'classic',
      primary: '#800020',
      accent: '#C9A227',
      secondary: '#1E4D78',
      bg: '#FAF8F5',
      text: '#2D3748',
      textLight: '#718096'
    },
    educational: {
      name: 'educational',
      primary: '#1976D2',
      accent: '#FF9800',
      secondary: '#388E3C',
      bg: '#FAFAFA',
      text: '#1A1A1A',
      textLight: '#5F6368'
    },
    night: {
      name: 'night',
      primary: '#79B8A4',
      accent: '#FF4081',
      secondary: '#9A8FC2',
      bg: '#1E1E2E',
      text: '#E8E6E3',
      textLight: '#A8A5A0'
    },
  };

  const THEME_ORDER = ['educational', 'classic', 'night'];
  const ENGINE_VERSION = '4.1.0';

  // ==============================================================================
  // CDN OPTIMIZATION
  // ==============================================================================
  const CDN_REGISTRY = {
    jsxgraph: {
      core: 'https://cdn.jsdelivr.net/npm/jsxgraph@1.5.0/distrib/jsxgraphcore.js',
      css: 'https://cdn.jsdelivr.net/npm/jsxgraph@1.5.0/distrib/jsxgraph.css'
    },
    mathjax: 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js',
    lucide: 'https://unpkg.com/lucide@0.294.0/dist/umd/lucide.min.js'
  };

  if (!window.__piaiCDN) {
    window.__piaiCDN = {
      loaded: new Set(),
      loading: new Map(),
      preloaded: false
    };
  }

  function preloadCDN() {
    if (window.__piaiCDN.preloaded) return;
    window.__piaiCDN.preloaded = true;

    const head = document.head;
    const urls = [
      CDN_REGISTRY.jsxgraph.core,
      CDN_REGISTRY.jsxgraph.css,
      CDN_REGISTRY.mathjax,
      CDN_REGISTRY.lucide
    ];

    urls.forEach(url => {
      if (url.endsWith('.css')) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = url;
        head.appendChild(link);
      } else {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'script';
        link.href = url;
        link.crossOrigin = 'anonymous';
        head.appendChild(link);
      }
    });

    if ('serviceWorker' in navigator && !window.__piaiSWRegistered) {
      window.__piaiSWRegistered = true;
      navigator.serviceWorker.register('/piai-sw.js', { scope: '/' }).catch(() => { });
    }
  }

  function loadCDNScript(url) {
    if (window.__piaiCDN.loaded.has(url)) {
      return Promise.resolve(true);
    }
    if (window.__piaiCDN.loading.has(url)) {
      return window.__piaiCDN.loading.get(url);
    }
    const promise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${url}"]`);
      if (existing) {
        window.__piaiCDN.loaded.add(url);
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.onload = () => {
        window.__piaiCDN.loaded.add(url);
        window.__piaiCDN.loading.delete(url);
        resolve(true);
      };
      script.onerror = () => {
        window.__piaiCDN.loading.delete(url);
        reject(new Error(`Failed to load ${url}`));
      };
      document.head.appendChild(script);
    });
    window.__piaiCDN.loading.set(url, promise);
    return promise;
  }

  function loadCDNStyle(url) {
    if (window.__piaiCDN.loaded.has(url)) {
      return Promise.resolve(true);
    }
    if (window.__piaiCDN.loading.has(url)) {
      return window.__piaiCDN.loading.get(url);
    }
    const promise = new Promise((resolve) => {
      const existing = document.querySelector(`link[href="${url}"]`);
      if (existing) {
        window.__piaiCDN.loaded.add(url);
        resolve(true);
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => {
        window.__piaiCDN.loaded.add(url);
        window.__piaiCDN.loading.delete(url);
        resolve(true);
      };
      link.onerror = () => {
        window.__piaiCDN.loading.delete(url);
        resolve(false);
      };
      document.head.appendChild(link);
    });
    window.__piaiCDN.loading.set(url, promise);
    return promise;
  }

  let preloadInitialized = false;

  // ==============================================================================
  // CONFIG
  // ==============================================================================
  const DEFAULT_CONFIG = {
    width: 800,
    height: 450,
    aspect: '16 / 9',
    themeName: 'educational',
    headExtra: '',
    fitMode: 'scroll',
    header: true,
    branding: true,
    debug: false,

    lazy: false,
    lazyThreshold: 200,
  };

  const SYSTEM_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

  function detectDevice() {
    const ua = navigator.userAgent || '';
    return {
      isIOS: /iPad|iPhone|iPod/.test(ua) && !window.MSStream,
    };
  }

  function getThemeByName(name) { return THEMES[name] || THEMES[DEFAULT_CONFIG.themeName]; }

  function normalizeFitMode(mode) {
    const m = String(mode || '').toLowerCase().trim();
    return (m === 'no-scroll' || m === 'noscroll' || m === 'compact') ? 'no-scroll' : 'scroll';
  }

  function debugLog(message, data, debugEnabled) {
    if (debugEnabled) console.log(`[PiAI Engine v${ENGINE_VERSION}] ${message}`, data || '');
  }

  function getBaseCss(theme) {
    return `:root{--piai-primary:${theme.primary};--piai-accent:${theme.accent};--piai-secondary:${theme.secondary};--piai-bg:${theme.bg};--piai-text:${theme.text};--piai-text-light:${theme.textLight}}*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}html,body{width:100%;height:100%;overflow:hidden}body{font-family:${SYSTEM_FONT_STACK};font-size:16px;line-height:1.6;color:var(--piai-text);background:transparent;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}.piai-wrap{width:100%;height:100%;background:var(--piai-bg);display:flex;flex-direction:column;overflow:hidden;position:relative;isolation:isolate}
.piai-hdr{background:var(--piai-primary);color:#fff;padding:12px 20px;padding-right:130px;font-size:18px;font-weight:700;display:flex;align-items:center;gap:10px;line-height:1.2;border-bottom:3px solid var(--piai-accent);position:relative}
.piai-hdr svg{width:20px;height:20px;display:block;flex:0 0 auto}
.piai-body{flex:1;padding:15px 20px;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;min-height:0;position:relative;z-index:1;font-size:16px;-webkit-overflow-scrolling:touch}
.piai-body>*{margin-bottom:15px}.piai-body>*:last-child{margin-bottom:0}
.piai-body::-webkit-scrollbar{width:6px}.piai-body::-webkit-scrollbar-thumb{background:var(--piai-text-light);border-radius:3px}
.piai-body.no-pad{padding:0!important;overflow:hidden!important;width:100%;height:100%}
.piai-def{background:var(--piai-bg);border-left:5px solid var(--piai-primary);padding:12px 18px;border-radius:0 8px 8px 0;transition:box-shadow .25s ease;font-size:16px}.piai-def-title{color:var(--piai-primary);font-size:16px;font-weight:700;display:flex;align-items:center;gap:10px;line-height:1.25;margin-bottom:6px}.piai-grid{display:flex;flex:1;min-height:0;gap:20px}.piai-list{flex:1;display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;padding-right:26px;padding-left:6px}.piai-list-item{display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:8px;background:var(--piai-bg);border-radius:10px;box-shadow:inset 0 0 0 1px var(--piai-text-light);transition:box-shadow .18s ease;font-size:16px}.piai-list-item .piai-ico{color:var(--piai-accent);width:24px;height:24px;flex:0 0 24px;display:flex;align-items:center;justify-content:center}.piai-visual{flex:0 0 280px;display:flex;align-items:center;justify-content:center}
.hdr-btn{position:absolute;top:50%;transform:translateY(-50%);z-index:999;width:48px;height:48px;background:transparent;border:none;cursor:pointer;color:var(--piai-accent);display:flex;align-items:center;justify-content:center;transition:color .2s ease}.fs-btn{right:0}.theme-btn{right:58px}
.piai-brand{position:absolute;right:-20px;bottom:12px;width:96px;height:26px;background:var(--piai-primary);opacity:.95;pointer-events:none;z-index:10;-webkit-mask-image:url("https://piai-embed-engine.vercel.app/public/logo.svg ");-webkit-mask-repeat:no-repeat;-webkit-mask-position:left center;-webkit-mask-size:contain;mask-image:url("https://piai-embed-engine.vercel.app/public/logo.svg ");mask-repeat:no-repeat;mask-position:left center;mask-size:contain}
.piai-skeleton{width:100%;height:100%;background:linear-gradient(90deg,var(--piai-bg) 25%,rgba(255,255,255,0.15) 50%,var(--piai-bg) 75%);background-size:200% 100%;animation:piai-shimmer 1.5s ease-in-out infinite;display:flex;align-items:center;justify-content:center;color:var(--piai-text-light);font-size:14px;font-weight:500}@keyframes piai-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.MathJax,.MathJax_Display,.MathJax svg,mjx-container,mjx-container svg{image-rendering:-webkit-optimize-contrast;-webkit-font-smoothing:antialiased;shape-rendering:geometricPrecision;text-rendering:geometricPrecision}.MathJax,mjx-container{transform:none!important;backface-visibility:visible!important}`;
  }

  function buildHtmlDocument(content, baseCss, headExtra) {
    if (!content) return '';
    const inject = `<style>${baseCss}</style>${headExtra || ''}`;
    if (/<!doctype html/i.test(content)) {
      if (content.includes('</head>')) return content.replace('</head>', inject + '</head>');
      return inject + content;
    }
    return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">${inject}</head><body>${content}</body></html>`;
  }

  function getBorderColor(theme) {
    return (theme.primary || '#800020') + '26';
  }

  function createBaseStyle(theme) {
    return {
      default: `width:100%;height:100%;max-width:100%;display:block;position:relative;box-sizing:border-box;overflow:hidden;background:transparent;`,
      fullscreen: `position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;box-sizing:border-box;margin:0;border-radius:0;z-index:99999;background:#000;border:none;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);`,
    };
  }

  function renderLazy(options) {
    if (!options.id) { console.error('[PiAI Engine] renderLazy requires an id'); return; }

    const container = document.getElementById(options.id);
    if (container) {
      container.innerHTML = '<div class="piai-skeleton" style="aspect-ratio:16/9;border-radius:16px;overflow:hidden;background:#f0f0f0;">Dang tai...</div>';
    }

    const opts = Object.assign({}, DEFAULT_CONFIG, options);
    const threshold = opts.lazyThreshold || 200;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          observer.disconnect();
          render(opts);
        }
      });
    }, { rootMargin: `${threshold}px` });

    if (container) observer.observe(container);
  }

  function render(options) {
    const config = Object.assign({}, DEFAULT_CONFIG, options || {});

    const { id, container: cNode, width, height, themeName, theme: tOverride, html, htmlGenerator, headExtra, onReady, onThemeChange, fitMode, debug } = config;

    const container = cNode || (typeof id === 'string' ? document.getElementById(id) : null);
    if (!container) { console.error('[PiAI Engine] Container not found:', id); return; }

    if (typeof container.__piaiCleanup === 'function') { try { container.__piaiCleanup(); } catch (_) { } container.__piaiCleanup = null; }

    const containerId = container.id || (typeof id === 'string' ? id : 'piai_' + Date.now());
    container.id = containerId;

    const { isIOS } = detectDevice();

    let currentTheme = tOverride || getThemeByName(themeName);
    let currentThemeName = currentTheme.name || themeName || DEFAULT_CONFIG.themeName;
    let baseCss = getBaseCss(currentTheme);
    let baseStyle = createBaseStyle(currentTheme);

    while (container.firstChild) container.removeChild(container.firstChild);
    container.style.cssText = baseStyle.default;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position:absolute;top:0;left:0;width:${width}px;height:${height}px;transform-origin:0 0;`;

    const ctxBase = { id: containerId, embedId: containerId, width, height, theme: currentTheme, themeName: currentThemeName, baseCss, isIOS };

    const generator = typeof htmlGenerator === 'function' ? htmlGenerator : () => html || '';
    const finalHtml = generator(Object.assign({}, ctxBase, { isStandalone: false }));

    const fitNorm = normalizeFitMode(fitMode);
    const fitHead = fitNorm === 'no-scroll' ? `<script>(function(){try{document.documentElement.classList.add('piai-fit-noscroll');}catch(_){}})();<\/script>` : '';
    const headExtraFinal = (headExtra || '') + fitHead;

    if (!finalHtml) { console.warn('[PiAI Engine] No content to render'); return; }

    const iframeHtml = buildHtmlDocument(finalHtml, baseCss, headExtraFinal);

    const iframe = document.createElement('iframe');
    iframe.srcdoc = iframeHtml;
    iframe.style.cssText = `width:100%;height:100%;border:none;display:block;background:${currentTheme.bg || '#f9f7f5'};`;
    iframe.scrolling = 'no';
    iframe.loading = 'lazy';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-popups';
    iframe.allow = 'fullscreen; clipboard-read; clipboard-write; autoplay; encrypted-media';

    iframe.onload = function () {
      if (debug && performance.memory) {
        const usedMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
        const limitMB = (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
        debugLog('Memory', { used: `${usedMB}MB`, limit: `${limitMB}MB` }, debug);
      }

      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'piaiInit', id: containerId, version: ENGINE_VERSION }, '*');
        iframe.contentWindow.postMessage({ type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme }, '*');
      }
      if (typeof onReady === 'function') onReady(iframe, ctxBase);
    };

    let isFull = false;
    let resizeRAF = null;
    let lastScale = 1;

    const updateScale = () => {
      const rect = container.getBoundingClientRect();
      const containerWidth = isFull ? window.innerWidth : (rect.width || container.clientWidth || width);
      const containerHeight = isFull ? window.innerHeight : (rect.height || container.clientHeight || height);

      if (containerWidth <= 0 || !Number.isFinite(containerWidth)) return;

      let scale;
      if (isFull) {
        scale = Math.min(containerWidth / width, containerHeight / height);
      } else {
        // High-precision scale calculation
        scale = containerWidth / width;
      }

      if (!Number.isFinite(scale) || scale <= 0) scale = lastScale || 1;
      
      // Precision threshold to avoid micro-jitters (0.001)
      if (Math.abs(scale - lastScale) < 0.001 && lastScale > 0) return;

      lastScale = scale;
      const scaledW = width * scale;
      const scaledH = height * scale;

      if (isFull) {
        const x = (containerWidth - scaledW) / 2;
        const y = (containerHeight - scaledH) / 2;
        wrapper.style.transformOrigin = '0 0';
        wrapper.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      } else {
        // Use min-height to ensure container doesn't collapse but allows growing
        container.style.height = `${Math.ceil(scaledH)}px`;
        wrapper.style.transformOrigin = '0 0';
        wrapper.style.transform = `scale(${scale})`;
      }
    };

    const setFullscreen = (state) => {
      isFull = state;
      container.style.cssText = state ? baseStyle.fullscreen : baseStyle.default;
      requestAnimationFrame(updateScale);
      try { iframe.contentWindow && iframe.contentWindow.postMessage({ type: 'fullscreenState', id: containerId, isFullscreen: state }, '*'); } catch (_) { }
    };

    const switchTheme = () => {
      let idx = THEME_ORDER.indexOf(currentThemeName);
      if (idx < 0) idx = 0;
      currentThemeName = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
      currentTheme = getThemeByName(currentThemeName);
      baseCss = getBaseCss(currentTheme);
      baseStyle = createBaseStyle(currentTheme);

      if (isFull) {
        container.style.cssText = baseStyle.fullscreen;
      } else {
        const borderCol = getBorderColor(currentTheme);
        container.style.borderColor = borderCol;
      }

      iframe.style.background = currentTheme.bg || '#f9f7f5';
      updateScale();
      try { iframe.contentWindow && iframe.contentWindow.postMessage({ type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme }, '*'); } catch (_) { }
      if (typeof onThemeChange === 'function') onThemeChange(currentThemeName, currentTheme);
    };

    const onMessage = (e) => {
      if (!e.data || e.data.id !== containerId) return;

      if (e.data.type === 'toggleFullscreen') {
        const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
        if (!fsElement) {
          if (container.requestFullscreen) {
            container.requestFullscreen()
              .then(() => setFullscreen(true))
              .catch(() => setFullscreen(true));
          } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
            setFullscreen(true);
          } else {
            setFullscreen(true);
          }
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
          setFullscreen(false);
        }
      }
      if (e.data.type === 'switchTheme') switchTheme();
    };

    const onFullscreenChange = () => {
      const { isIOS } = detectDevice();
      const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsElement && fsElement === container) setFullscreen(true);
      else if (!fsElement && !isIOS) setFullscreen(false);
    };

    const onKeydown = (e) => {
      const { isIOS } = detectDevice();
      if (e.key === 'Escape' && isFull && isIOS) setFullscreen(false);
    };

    const onResize = () => {
      if (resizeRAF) cancelAnimationFrame(resizeRAF);
      resizeRAF = requestAnimationFrame(updateScale);
    };

    const onOrientationChange = () => {
      if (resizeRAF) cancelAnimationFrame(resizeRAF);
      setTimeout(() => {
        resizeRAF = requestAnimationFrame(updateScale);
      }, 200);
    };

    window.addEventListener('message', onMessage);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeydown);

    // v4.1.0: High efficiency resize handling via ResizeObserver
    let resizer = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizer = new ResizeObserver(() => {
        if (resizeRAF) cancelAnimationFrame(resizeRAF);
        resizeRAF = requestAnimationFrame(updateScale);
      });
      resizer.observe(isFull ? document.body : container);
    } else {
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onOrientationChange);
    }

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
      try { if (iframe) iframe.src = 'about:blank'; } catch (_) { }
      window.removeEventListener('message', onMessage);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('keydown', onKeydown);
      
      if (resizer) {
        resizer.disconnect();
      } else {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onOrientationChange);
      }

      try { observer.disconnect(); } catch (_) { }
      try { if (iframe && iframe.parentNode) iframe.remove(); } catch (_) { }
    }

    container.__piaiCleanup = cleanup;
    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
    updateScale();

    if (!preloadInitialized) {
      preloadInitialized = true;
      setTimeout(preloadCDN, 0);
    }

    debugLog('Embed mounted successfully', { containerId, version: ENGINE_VERSION }, debug);
  }

  global.PiaiEmbed = {
    version: ENGINE_VERSION,
    render,
    renderLazy,
    themes: THEMES,
    getThemeByName,
    getBaseCss,
    defaults: DEFAULT_CONFIG,
    cdn: {
      registry: CDN_REGISTRY,
      loadScript: loadCDNScript,
      loadStyle: loadCDNStyle,
      preload: preloadCDN
    }
  };
})(window);
