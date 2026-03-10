// ==============================================================================
// PiAI Embed Engine v4.3.0 (Content-Only, Open edX + Local)
// ==============================================================================
// CHANGELOG v4.3.0:
// ------------------
// 1. REFACTOR: Shared instance registry, event hub, host runtime bridge.
// 2. IMPROVE: Diagnostics/recovery hooks, retry/destroy/getState APIs.
// 3. IMPROVE: Asset resolver with same-origin-first strategy and hybrid fallback.
// 4. REMOVE: Inline blob service worker flow; external SW only and opt-in.
// 5. ADD: PiaiEmbedLoader queue API for minimal wrapper boilerplate.
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
    }
  };

  const THEME_ORDER = ['educational', 'classic', 'night'];
  const ENGINE_VERSION = '4.3.0';
  const SYSTEM_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';
  const DEFAULT_ENGINE_SRC = 'https://piai-embed-engine.vercel.app/public/piai-embed-engine.js';
  const BRAND_DATA_URI = 'https://piai-embed-engine.vercel.app/public/logo.svg';
  const MAX_DOC_CACHE = 72;
  const DEFAULT_TIMEOUTS = {
    iframeReadyMs: 6000,
    assetLoadMs: 6000
  };

  const REMOTE_CDN = {
    lucide: 'https://unpkg.com/lucide@0.294.0/dist/umd/lucide.min.js',
    mathjax: 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js',
    jsxgraphCore: 'https://cdn.jsdelivr.net/npm/jsxgraph@1.5.0/distrib/jsxgraphcore.js',
    jsxgraphCss: 'https://cdn.jsdelivr.net/npm/jsxgraph@1.5.0/distrib/jsxgraph.css'
  };

  const ICON_SVG = {
    'book-open': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7.5A2.5 2.5 0 0 1 4.5 5H11v14H4.5A2.5 2.5 0 0 0 2 21.5z"></path><path d="M22 7.5A2.5 2.5 0 0 0 19.5 5H13v14h6.5a2.5 2.5 0 0 1 2.5 2.5z"></path></svg>',
    'graduation-cap': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5Z"></path><path d="M6 12v5c3 2 9 2 12 0v-5"></path><path d="M19 13v4"></path></svg>',
    'moon-star': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 1 0 9 9 9 9 0 1 1-9-9Z"></path><path d="M19 3v4"></path><path d="M21 5h-4"></path></svg>',
    maximize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path></svg>',
    minimize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"></path><path d="M21 8h-3a2 2 0 0 1-2-2V3"></path><path d="M3 16h3a2 2 0 0 1 2 2v3"></path><path d="M16 21v-3a2 2 0 0 1 2-2h3"></path></svg>',
    'book-text': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path><path d="M8 7h8"></path><path d="M8 11h8"></path></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.1 12a11 11 0 0 1 19.8 0 11 11 0 0 1-19.8 0Z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4H9.5L7.5 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2.5L14.5 4Z"></path><circle cx="12" cy="13" r="3"></circle></svg>',
    award: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"></circle><path d="m15.477 12.89 1.515 8.358L12 18l-4.992 3.248 1.515-8.357"></path></svg>',
    'shield-check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6l8-4 8 4v7Z"></path><path d="m9 12 2 2 4-4"></path></svg>',
    'scan-eye': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><path d="M2.1 12a11 11 0 0 1 19.8 0 11 11 0 0 1-19.8 0Z"></path><circle cx="12" cy="12" r="3"></circle></svg>'
  };

  const ENGINE_STATE = global.__PIAI_ENGINE_STATE__ || (global.__PIAI_ENGINE_STATE__ = {
    instances: new Map(),
    assets: {
      scripts: new Map(),
      styles: new Map(),
      preloaded: new Set(),
      preconnected: new Set()
    },
    docCache: new Map(),
    runtimeInstalled: false,
    eventHubBound: false,
    resizeObserver: null,
    resizeFallbackBound: false,
    sweepHandle: null,
    sweepScheduled: false,
    externalSW: {
      promise: null,
      url: '',
      mode: 'off'
    },
    engineScriptSrc: ''
  });

  function detectCurrentScriptSrc() {
    if (ENGINE_STATE.engineScriptSrc) return ENGINE_STATE.engineScriptSrc;
    const current = document.currentScript;
    if (current && current.src) {
      ENGINE_STATE.engineScriptSrc = current.src;
      return current.src;
    }
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i -= 1) {
      const src = scripts[i].src || '';
      if (src.indexOf('piai-embed-engine') >= 0) {
        ENGINE_STATE.engineScriptSrc = src;
        return src;
      }
    }
    ENGINE_STATE.engineScriptSrc = DEFAULT_ENGINE_SRC;
    return ENGINE_STATE.engineScriptSrc;
  }

  function now() {
    return (global.performance && typeof global.performance.now === 'function') ? global.performance.now() : Date.now();
  }

  function safeIdle(fn, timeout) {
    if (typeof global.requestIdleCallback === 'function') {
      return global.requestIdleCallback(fn, { timeout: timeout || 1000 });
    }
    return global.setTimeout(fn, timeout || 64);
  }

  function normalizeDiagnostics(input) {
    if (input === true) {
      return { enabled: true, overlay: true, metrics: true, console: true };
    }
    if (!input) {
      return { enabled: false, overlay: false, metrics: false, console: false };
    }
    return {
      enabled: true,
      overlay: input.overlay !== false,
      metrics: input.metrics !== false,
      console: !!input.console
    };
  }

  function detectDevice() {
    const ua = navigator.userAgent || '';
    return {
      isIOS: /iPad|iPhone|iPod/.test(ua) && !global.MSStream
    };
  }

  function debugLog(message, data, debugEnabled) {
    if (debugEnabled) console.log(`[PiAI Engine v${ENGINE_VERSION}] ${message}`, data || '');
  }

  function warnLog(message, data, enabled) {
    if (enabled) console.warn(`[PiAI Engine v${ENGINE_VERSION}] ${message}`, data || '');
  }

  function getThemeByName(name) {
    return THEMES[name] || THEMES.educational;
  }

  function normalizeFitMode(mode) {
    const m = String(mode || '').toLowerCase().trim();
    return (m === 'no-scroll' || m === 'noscroll' || m === 'compact') ? 'no-scroll' : 'scroll';
  }

  function normalizeAssetPolicy(value) {
    return String(value || 'hybrid').toLowerCase() === 'self-contained' ? 'self-contained' : 'hybrid';
  }

  function normalizeAssetFlag(value) {
    if (value === true || value === false) return value;
    return 'auto';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function hashString(input) {
    let hash = 2166136261;
    const text = String(input || '');
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
  }

  function setDocCache(key, value) {
    if (ENGINE_STATE.docCache.has(key)) {
      ENGINE_STATE.docCache.delete(key);
    }
    ENGINE_STATE.docCache.set(key, value);
    while (ENGINE_STATE.docCache.size > MAX_DOC_CACHE) {
      const oldest = ENGINE_STATE.docCache.keys().next().value;
      ENGINE_STATE.docCache.delete(oldest);
    }
  }

  function dirname(url) {
    if (!url) return '';
    const clean = String(url).split('#')[0].split('?')[0];
    const slash = clean.lastIndexOf('/');
    return slash >= 0 ? clean.slice(0, slash + 1) : '';
  }

  function joinUrl(base, path) {
    if (!base) return path || '';
    if (!path) return base;
    if (/^https?:\/\//i.test(path) || path.indexOf('data:') === 0) return path;
    return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
  }

  function sameOrigin(url) {
    if (!url) return false;
    try {
      return new URL(url, global.location.href).origin === global.location.origin;
    } catch (_) {
      return false;
    }
  }

  function getAssetBase(config) {
    const explicit = String(config.assetBase || '').trim();
    if (explicit) return explicit;
    return dirname(detectCurrentScriptSrc()).replace(/\/$/, '');
  }

  function resolveAssetUrl(kind, config) {
    const base = getAssetBase(config);
    const policy = normalizeAssetPolicy(config.assetPolicy);
    const candidates = [];
    if (base) {
      if (kind === 'lucide') candidates.push(joinUrl(base, 'lucide.min.js'));
      if (kind === 'mathjax') candidates.push(joinUrl(base, 'mathjax/tex-mml-chtml.js'));
      if (kind === 'jsxgraphCore') candidates.push(joinUrl(base, 'jsxgraph/jsxgraphcore.js'));
      if (kind === 'jsxgraphCss') candidates.push(joinUrl(base, 'jsxgraph/jsxgraph.css'));
    }
    if (policy === 'hybrid') {
      if (kind === 'lucide') candidates.push(REMOTE_CDN.lucide);
      if (kind === 'mathjax') candidates.push(REMOTE_CDN.mathjax);
      if (kind === 'jsxgraphCore') candidates.push(REMOTE_CDN.jsxgraphCore);
      if (kind === 'jsxgraphCss') candidates.push(REMOTE_CDN.jsxgraphCss);
    }
    return candidates.filter(Boolean);
  }

  function appendLink(rel, href, as, crossOrigin) {
    if (!href || ENGINE_STATE.assets.preloaded.has(`${rel}:${href}`)) return;
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    if (as) link.as = as;
    if (crossOrigin) link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    ENGINE_STATE.assets.preloaded.add(`${rel}:${href}`);
  }

  function appendPreconnect(url) {
    if (!url) return;
    try {
      const origin = new URL(url, global.location.href).origin;
      if (ENGINE_STATE.assets.preconnected.has(origin) || origin === global.location.origin) return;
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      ENGINE_STATE.assets.preconnected.add(origin);
    } catch (_) {
      // ignore invalid urls
    }
  }

  function preloadAssets(config) {
    const assetPolicy = normalizeAssetPolicy(config.assetPolicy);
    const sameOriginCandidates = [
      resolveAssetUrl('lucide', Object.assign({}, config, { assetPolicy: 'self-contained' }))[0],
      resolveAssetUrl('mathjax', Object.assign({}, config, { assetPolicy: 'self-contained' }))[0],
      resolveAssetUrl('jsxgraphCore', Object.assign({}, config, { assetPolicy: 'self-contained' }))[0],
      resolveAssetUrl('jsxgraphCss', Object.assign({}, config, { assetPolicy: 'self-contained' }))[0]
    ].filter(Boolean);

    sameOriginCandidates.forEach((url) => {
      appendLink('preload', url, url.endsWith('.css') ? 'style' : 'script', !sameOrigin(url));
    });

    if (assetPolicy === 'hybrid') {
      appendPreconnect(REMOTE_CDN.lucide);
      appendPreconnect(REMOTE_CDN.mathjax);
      appendPreconnect(REMOTE_CDN.jsxgraphCore);
    }
  }

  function withTimeout(promise, ms, label) {
    const timeoutMs = Number(ms) > 0 ? Number(ms) : 0;
    if (!timeoutMs) return promise;
    return new Promise((resolve, reject) => {
      const timer = global.setTimeout(() => {
        reject(new Error(`${label || 'Operation'} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      promise.then((value) => {
        global.clearTimeout(timer);
        resolve(value);
      }).catch((error) => {
        global.clearTimeout(timer);
        reject(error);
      });
    });
  }

  function ensureScript(doc, url, timeoutMs) {
    if (!url) return Promise.resolve(false);
    const targetDoc = doc || document;
    const win = targetDoc.defaultView || global;
    if (!win.__piaiDocScripts) win.__piaiDocScripts = new Map();
    if (win.__piaiDocScripts.has(url)) return win.__piaiDocScripts.get(url);

    const promise = withTimeout(new Promise((resolve, reject) => {
      const existing = targetDoc.querySelector(`script[src="${url}"]`);
      if (existing) {
        resolve(true);
        return;
      }
      const script = targetDoc.createElement('script');
      script.src = url;
      script.async = true;
      if (!sameOrigin(url)) script.crossOrigin = 'anonymous';
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      targetDoc.head.appendChild(script);
    }), timeoutMs, `Script load ${url}`);

    win.__piaiDocScripts.set(url, promise);
    return promise.catch((error) => {
      win.__piaiDocScripts.delete(url);
      throw error;
    });
  }

  function ensureStyle(doc, url, timeoutMs) {
    if (!url) return Promise.resolve(false);
    const targetDoc = doc || document;
    const win = targetDoc.defaultView || global;
    if (!win.__piaiDocStyles) win.__piaiDocStyles = new Map();
    if (win.__piaiDocStyles.has(url)) return win.__piaiDocStyles.get(url);

    const promise = withTimeout(new Promise((resolve, reject) => {
      const existing = targetDoc.querySelector(`link[href="${url}"]`);
      if (existing) {
        resolve(true);
        return;
      }
      const link = targetDoc.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => resolve(true);
      link.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));
      targetDoc.head.appendChild(link);
    }), timeoutMs, `Style load ${url}`);

    win.__piaiDocStyles.set(url, promise);
    return promise.catch((error) => {
      win.__piaiDocStyles.delete(url);
      throw error;
    });
  }

  function loadExternalServiceWorker(mode, swUrl, debugEnabled) {
    const normalizedMode = String(mode || 'off').toLowerCase();
    if (!('serviceWorker' in navigator) || normalizedMode === 'off') return Promise.resolve(false);
    if (normalizedMode !== 'external') {
      warnLog('Ignoring deprecated serviceWorkerMode. Only external is supported in v4.3.0.', normalizedMode, debugEnabled);
      return Promise.resolve(false);
    }
    if (!swUrl) return Promise.resolve(false);

    let resolvedUrl;
    try {
      resolvedUrl = new URL(swUrl, global.location.href).href;
    } catch (_) {
      return Promise.resolve(false);
    }

    if (!sameOrigin(resolvedUrl)) {
      warnLog('Skipped external service worker because URL is not same-origin.', resolvedUrl, debugEnabled);
      return Promise.resolve(false);
    }

    if (ENGINE_STATE.externalSW.promise && ENGINE_STATE.externalSW.url === resolvedUrl) {
      return ENGINE_STATE.externalSW.promise;
    }

    ENGINE_STATE.externalSW.url = resolvedUrl;
    ENGINE_STATE.externalSW.mode = normalizedMode;
    ENGINE_STATE.externalSW.promise = navigator.serviceWorker.register(resolvedUrl, { scope: '/' })
      .then(() => true)
      .catch((error) => {
        warnLog('Service worker registration skipped', error && error.message ? error.message : String(error), debugEnabled);
        ENGINE_STATE.externalSW.promise = null;
        return false;
      });

    return ENGINE_STATE.externalSW.promise;
  }

  function getTargetOrigin() {
    try {
      if (global.location && global.location.origin && global.location.origin !== 'null') {
        return global.location.origin;
      }
    } catch (_) {
      // ignore
    }
    return '*';
  }

  function createInstance(config, container) {
    const currentTheme = config.theme || getThemeByName(config.themeName);
    return {
      id: container.id,
      container,
      iframe: null,
      wrapper: null,
      overlay: null,
      frameWindow: null,
      frameDocument: null,
      frameBootstrapped: false,
      frameOptions: null,
      isFullscreen: false,
      destroyed: false,
      resizeRAF: null,
      lastScale: 1,
      readyTimer: null,
      cleanupFns: [],
      startedAt: now(),
      renderedAt: 0,
      state: 'idle',
      lastError: null,
      targetOrigin: getTargetOrigin(),
      config,
      currentTheme,
      currentThemeName: currentTheme.name || config.themeName || 'educational',
      finalHtml: '',
      lastOptions: config,
      lastMetrics: []
    };
  }

  function metric(instance, name, value, extra) {
    if (!instance) return;
    const payload = Object.assign({ id: instance.id, name, value, ts: Date.now() }, extra || {});
    instance.lastMetrics.push(payload);
    if (instance.lastMetrics.length > 25) instance.lastMetrics.shift();
    if (typeof instance.config.onMetric === 'function') {
      try { instance.config.onMetric(payload); } catch (_) { }
    }
    if (instance.config.diagnostics.metrics) {
      debugLog(`metric:${name}`, payload, instance.config.debug || instance.config.diagnostics.console);
    }
  }

  function setState(instance, nextState, extra) {
    if (!instance || instance.state === nextState) return;
    instance.state = nextState;
    const payload = Object.assign({ id: instance.id, state: nextState, ts: Date.now() }, extra || {});
    if (typeof instance.config.onStatusChange === 'function') {
      try { instance.config.onStatusChange(payload); } catch (_) { }
    }
    if (instance.config.diagnostics.console) {
      debugLog(`state:${nextState}`, payload, true);
    }
  }

  function clearOverlay(instance) {
    if (!instance || !instance.overlay) return;
    try { instance.overlay.remove(); } catch (_) { }
    instance.overlay = null;
  }

  function reportError(instance, error, meta) {
    if (!instance) return;
    instance.lastError = error;
    const payload = Object.assign({
      id: instance.id,
      message: error && error.message ? error.message : String(error || 'Unknown error')
    }, meta || {});
    if (typeof instance.config.onError === 'function') {
      try { instance.config.onError(payload); } catch (_) { }
    }
    setState(instance, meta && meta.recoverable ? 'degraded' : 'error', payload);
    if (instance.config.diagnostics.console || instance.config.debug) {
      console.error(`[PiAI Engine v${ENGINE_VERSION}]`, payload, error);
    }
    if (instance.config.diagnostics.overlay !== false) {
      renderErrorOverlay(instance, payload);
    }
  }

  function getStandAloneUrl(instance) {
    if (!instance) return '';
    if (instance.config.standaloneUrl) return instance.config.standaloneUrl;
    if (instance.iframe && instance.iframe.dataset && instance.iframe.dataset.iosStandaloneUrl) {
      return instance.iframe.dataset.iosStandaloneUrl;
    }
    return '';
  }

  function renderErrorOverlay(instance, payload) {
    if (!instance || !instance.container) return;
    clearOverlay(instance);
    const overlay = document.createElement('div');
    overlay.className = 'piai-engine-error';
    overlay.innerHTML = [
      '<div class="piai-engine-error-card">',
      '<div class="piai-engine-error-title">Embed loi</div>',
      `<div class="piai-engine-error-text">${escapeHtml(payload.message || 'Khong the tai noi dung.')}</div>`,
      instance.config.diagnostics.console ? `<pre class="piai-engine-error-debug">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>` : '',
      '<div class="piai-engine-error-actions">',
      '<button type="button" class="piai-engine-btn" data-piai-action="retry">Retry</button>',
      getStandAloneUrl(instance) ? '<button type="button" class="piai-engine-btn piai-engine-btn-secondary" data-piai-action="open">Open standalone</button>' : '',
      '</div>',
      '</div>'
    ].join('');
    overlay.addEventListener('click', (event) => {
      const action = event.target && event.target.getAttribute && event.target.getAttribute('data-piai-action');
      if (!action) return;
      if (action === 'retry') retry(instance.id);
      if (action === 'open') {
        const standaloneUrl = getStandAloneUrl(instance);
        if (standaloneUrl) global.open(standaloneUrl, instance.config.openStandaloneTarget || '_blank');
      }
    });
    instance.container.appendChild(overlay);
    instance.overlay = overlay;
  }

  function getBaseCss(theme) {
    return `:root{--piai-primary:${theme.primary};--piai-accent:${theme.accent};--piai-secondary:${theme.secondary};--piai-bg:${theme.bg};--piai-text:${theme.text};--piai-text-light:${theme.textLight};--piai-danger:#d32f2f}*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}html,body{width:100%;height:100%;overflow:hidden}body{font-family:${SYSTEM_FONT_STACK};font-size:16px;line-height:1.6;color:var(--piai-text);background:transparent;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}.piai-wrap{width:100%;height:100%;background:var(--piai-bg);display:flex;flex-direction:column;overflow:hidden;position:relative;isolation:isolate}.piai-loader{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:color-mix(in srgb,var(--piai-bg) 92%, transparent);z-index:9999;transition:opacity .22s ease}.piai-loader.hide{opacity:0;pointer-events:none}.spinner{width:30px;height:30px;border:3px solid color-mix(in srgb,var(--piai-primary) 20%, transparent);border-top-color:var(--piai-primary);border-radius:50%;animation:piai-spin 1s linear infinite}.loader-text{font-size:13px;font-weight:700;color:var(--piai-text)}@keyframes piai-spin{to{transform:rotate(360deg)}}.piai-hdr{background:var(--piai-primary);color:#fff;padding:12px 20px;padding-right:130px;font-size:18px;font-weight:700;display:flex;align-items:center;gap:10px;line-height:1.2;border-bottom:3px solid var(--piai-accent);position:relative;min-height:62px}.piai-hdr svg{width:20px;height:20px;display:block;flex:0 0 auto}.piai-body{flex:1;padding:15px 20px;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;min-height:0;position:relative;z-index:1;font-size:16px;-webkit-overflow-scrolling:touch}.piai-body>*{margin-bottom:15px}.piai-body>*:last-child{margin-bottom:0}.piai-body::-webkit-scrollbar{width:6px}.piai-body::-webkit-scrollbar-thumb{background:var(--piai-text-light);border-radius:3px}.piai-body.no-pad{padding:0!important;overflow:hidden!important;width:100%;height:100%}.piai-def{background:var(--piai-bg);border-left:5px solid var(--piai-primary);padding:12px 18px;border-radius:0 8px 8px 0;transition:box-shadow .25s ease;font-size:16px}.piai-def-title{color:var(--piai-primary);font-size:16px;font-weight:700;display:flex;align-items:center;gap:10px;line-height:1.25;margin-bottom:6px}.piai-grid{display:flex;flex:1;min-height:0;gap:20px}.piai-list{flex:1;display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;padding-right:26px;padding-left:6px}.piai-list-item{display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:8px;background:var(--piai-bg);border-radius:10px;box-shadow:inset 0 0 0 1px var(--piai-text-light);transition:box-shadow .18s ease;font-size:16px}.piai-list-item .piai-ico{color:var(--piai-accent);width:24px;height:24px;flex:0 0 24px;display:flex;align-items:center;justify-content:center}.piai-visual{flex:0 0 280px;display:flex;align-items:center;justify-content:center}.hdr-btn{position:absolute;top:50%;transform:translateY(-50%);z-index:999;width:48px;height:48px;background:transparent;border:none;cursor:pointer;color:var(--piai-accent);display:flex;align-items:center;justify-content:center;transition:color .2s ease}.fs-btn{right:0}.theme-btn{right:58px}.hdr-btn svg,.hdr-btn i svg{width:22px;height:22px;display:block}.hdr-btn:hover{color:#fff}.piai-brand{position:absolute;right:8px;bottom:8px;width:96px;height:28px;background-image:url('${BRAND_DATA_URI}');background-repeat:no-repeat;background-position:center;background-size:contain;opacity:.96;pointer-events:none;z-index:10}.piai-skeleton{width:100%;height:100%;background:linear-gradient(90deg,var(--piai-bg) 25%,rgba(255,255,255,0.15) 50%,var(--piai-bg) 75%);background-size:200% 100%;animation:piai-shimmer 1.5s ease-in-out infinite;display:flex;align-items:center;justify-content:center;color:var(--piai-text-light);font-size:14px;font-weight:500}@keyframes piai-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}.piai-engine-error{position:absolute;inset:12px;display:flex;align-items:center;justify-content:center;background:rgba(6,14,26,.62);backdrop-filter:blur(3px);border-radius:14px;z-index:10005}.piai-engine-error-card{width:min(100%,420px);background:#fff;border-radius:14px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.22);display:flex;flex-direction:column;gap:10px}.piai-engine-error-title{font-size:16px;font-weight:800;color:#0f172a}.piai-engine-error-text{font-size:13px;line-height:1.45;color:#334155}.piai-engine-error-debug{max-height:140px;overflow:auto;padding:10px;border-radius:10px;background:#f8fafc;font-size:11px;color:#334155}.piai-engine-error-actions{display:flex;gap:8px;flex-wrap:wrap}.piai-engine-btn{appearance:none;border:none;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;cursor:pointer;background:#0f172a;color:#fff}.piai-engine-btn-secondary{background:#e2e8f0;color:#0f172a}.MathJax,.MathJax_Display,.MathJax svg,mjx-container,mjx-container svg{image-rendering:-webkit-optimize-contrast;-webkit-font-smoothing:antialiased;shape-rendering:geometricPrecision;text-rendering:geometricPrecision}.MathJax,mjx-container{transform:none!important;backface-visibility:visible!important}`;
  }

  const FRAME_BRIDGE_INJECT = `<script>(function(){if(window.PiaiFrameRuntime)return;function hideLoader(id){var loader=document.getElementById(id||'loader');if(!loader)return;loader.classList.add('hide');setTimeout(function(){try{loader.style.display='none';}catch(_){ }},240);}window.PiaiFrameRuntime={bootstrap:function(opts){opts=opts||{};try{var host=window.parent&&window.parent.__PIAI_HOST_RUNTIME__;if(host&&typeof host.bootstrap==='function'){host.bootstrap(window,opts);return;}}catch(_){ }try{var origin=(window.location&&window.location.origin&&window.location.origin!=='null')?window.location.origin:'*';window.parent.postMessage({type:'piaiFrameBootstrap',id:opts.id||'',opts:opts},origin);}catch(_){hideLoader(opts.loaderId||'loader');}},notify:function(type,payload){try{var host=window.parent&&window.parent.__PIAI_HOST_RUNTIME__;if(host&&typeof host.notify==='function'){host.notify(window,type,payload||{});return;}}catch(_){ }}}})();<\/script>`;

  function createRuntimeBootstrapScript(options) {
    const themeName = escapeHtml(options.themeName || 'educational');
    const loadMathJax = options.loadMathJax === true ? 'true' : 'false';
    const loadJSXGraph = options.loadJSXGraph === true ? 'true' : 'false';
    const loadLucide = options.loadLucide === false ? 'false' : `'${options.loadLucide || 'auto'}'`;
    return `<script>(function(){if(window.PiaiFrameRuntime&&typeof window.PiaiFrameRuntime.bootstrap==='function'){window.PiaiFrameRuntime.bootstrap({id:'${escapeHtml(options.id)}',isStandalone:${options.isStandalone ? 'true' : 'false'},themeName:'${themeName}',loaderId:'${escapeHtml(options.loaderId || 'loader')}',themeBtnId:'${escapeHtml(options.themeBtnId || 'themeBtn')}',themeIconId:'${escapeHtml(options.themeIconId || 'themeBtnIcon')}',fsBtnId:'${escapeHtml(options.fsBtnId || 'fsBtn')}',loadLucide:${loadLucide},loadMathJax:${loadMathJax},loadJSXGraph:${loadJSXGraph}});}else{var loader=document.getElementById('${escapeHtml(options.loaderId || 'loader')}');if(loader){loader.classList.add('hide');setTimeout(function(){try{loader.style.display='none';}catch(_){ }},240);}}})();<\/script>`;
  }

  function detectLegacyRuntime(scriptContent) {
    if (!scriptContent) return false;
    const markers = [
      'piaiApplyTheme',
      'parent.postMessage',
      'themeBtn',
      'fsBtn',
      'themeBtnIcon',
      'window.MathJax',
      'lucide.min.js'
    ];
    let score = 0;
    markers.forEach((marker) => {
      if (scriptContent.indexOf(marker) >= 0) score += 1;
    });
    return score >= 3;
  }

  function upgradeLegacyRuntime(content, context) {
    if (!content || content.indexOf('<script') < 0) return content;
    const matches = [];
    const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(content))) {
      matches.push({ full: match[0], body: match[1], index: match.index });
    }
    if (!matches.length) return content;
    const last = matches[matches.length - 1];
    if (!detectLegacyRuntime(last.body)) return content;

    const loadMathJax = /mathjax|typesetPromise|window\.MathJax/i.test(last.body);
    const loadJSXGraph = /jsxgraph|JXG\./i.test(last.body);
    const loadLucide = /lucide/i.test(last.body) || /data-lucide=/i.test(content);

    const replacement = createRuntimeBootstrapScript({
      id: context.id,
      isStandalone: false,
      themeName: context.themeName,
      loaderId: 'loader',
      themeBtnId: 'themeBtn',
      themeIconId: 'themeBtnIcon',
      fsBtnId: 'fsBtn',
      loadLucide: loadLucide ? 'auto' : false,
      loadMathJax,
      loadJSXGraph
    });

    return content.slice(0, last.index) + replacement + content.slice(last.index + last.full.length);
  }

  function buildHtmlDocument(content, baseCss, headExtra, instance) {
    if (!content) return '';
    const cacheKey = [
      instance.currentThemeName,
      instance.config.fitMode,
      instance.config.injectFrameRuntime === false ? '0' : '1',
      instance.config.upgradeLegacyRuntime === true ? '1' : '0',
      hashString(content),
      hashString(headExtra || '')
    ].join('|');

    if (ENGINE_STATE.docCache.has(cacheKey)) {
      const cached = ENGINE_STATE.docCache.get(cacheKey);
      ENGINE_STATE.docCache.delete(cacheKey);
      ENGINE_STATE.docCache.set(cacheKey, cached);
      return cached;
    }

    const runtimeInject = instance.config.injectFrameRuntime === false ? '' : FRAME_BRIDGE_INJECT;
    const shouldUpgradeLegacyRuntime = instance.config.upgradeLegacyRuntime === true;
    const upgraded = shouldUpgradeLegacyRuntime ? upgradeLegacyRuntime(content, {
      id: instance.id,
      themeName: instance.currentThemeName
    }) : content;
    const inject = `<style>${baseCss}</style>${runtimeInject}${headExtra || ''}`;

    let finalDocument = '';
    if (/<!doctype html/i.test(upgraded)) {
      if (upgraded.includes('</head>')) finalDocument = upgraded.replace('</head>', inject + '</head>');
      else finalDocument = inject + upgraded;
    } else {
      finalDocument = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">${inject}</head><body>${upgraded}</body></html>`;
    }

    setDocCache(cacheKey, finalDocument);
    metric(instance, 'document_build_ms', Math.round(now() - instance.startedAt));
    return finalDocument;
  }

  function createBaseStyle() {
    return {
      default: 'width:100%;height:100%;max-width:100%;display:block;position:relative;box-sizing:border-box;overflow:hidden;background:transparent;',
      fullscreen: 'position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;box-sizing:border-box;margin:0;border-radius:0;z-index:99999;background:#000;border:none;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);'
    };
  }

  function createIconMarkup(name) {
    return ICON_SVG[name] || '';
  }

  function setElementIcon(el, name) {
    if (!el) return false;
    const svg = createIconMarkup(name);
    if (!svg) return false;
    el.innerHTML = svg;
    el.setAttribute('data-piai-inline-icon', '1');
    if (el.tagName && el.tagName.toLowerCase() === 'i') {
      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
    }
    return true;
  }

  function applyInlineIcons(doc) {
    const unresolved = [];
    const nodes = doc.querySelectorAll('[data-lucide]');
    nodes.forEach((node) => {
      const name = node.getAttribute('data-lucide');
      if (!setElementIcon(node, name)) unresolved.push(name);
    });
    return unresolved;
  }

  function applyThemeToFrame(instance) {
    if (!instance || !instance.frameDocument) return;
    const root = instance.frameDocument.documentElement;
    const theme = instance.currentTheme;
    if (!root || !theme) return;
    root.style.setProperty('--piai-primary', theme.primary);
    root.style.setProperty('--piai-accent', theme.accent);
    root.style.setProperty('--piai-secondary', theme.secondary);
    root.style.setProperty('--piai-bg', theme.bg);
    root.style.setProperty('--piai-text', theme.text);
    root.style.setProperty('--piai-text-light', theme.textLight);
  }

  function hideLoaderInFrame(instance) {
    if (!instance || !instance.frameDocument) return;
    const loaderId = (instance.frameOptions && instance.frameOptions.loaderId) || 'loader';
    const loader = instance.frameDocument.getElementById(loaderId);
    if (!loader) return;
    loader.classList.add('hide');
    global.setTimeout(() => {
      try { loader.style.display = 'none'; } catch (_) { }
    }, 240);
  }

  function updateThemeButton(instance) {
    if (!instance || !instance.frameDocument) return;
    const iconTarget = instance.frameDocument.getElementById((instance.frameOptions && instance.frameOptions.themeIconId) || 'themeBtnIcon');
    const iconName = instance.currentThemeName === 'educational' ? 'graduation-cap' : instance.currentThemeName === 'night' ? 'moon-star' : 'book-open';
    setElementIcon(iconTarget, iconName);
  }

  function updateFullscreenButton(instance) {
    if (!instance || !instance.frameDocument) return;
    const fsTarget = instance.frameDocument.getElementById((instance.frameOptions && instance.frameOptions.fsBtnId) || 'fsBtn');
    if (!fsTarget) return;
    setElementIcon(fsTarget, instance.isFullscreen ? 'minimize' : 'maximize');
  }

  function normalizeTimeouts(config) {
    return {
      iframeReadyMs: Number(config.iframeReadyTimeoutMs) > 0 ? Number(config.iframeReadyTimeoutMs) : DEFAULT_TIMEOUTS.iframeReadyMs,
      assetLoadMs: Number(config.assetLoadTimeoutMs) > 0 ? Number(config.assetLoadTimeoutMs) : DEFAULT_TIMEOUTS.assetLoadMs
    };
  }

  function inferMathJaxNeed(instance) {
    if (!instance) return false;
    const opt = instance.frameOptions && typeof instance.frameOptions.loadMathJax !== 'undefined' ? instance.frameOptions.loadMathJax : instance.config.loadMathJax;
    if (opt === true) return true;
    if (opt === false) return false;
    return /mathjax|typesetPromise|window\.MathJax|\\\(|\\\[|<math|mjx-container|\$\$/.test(instance.finalHtml);
  }

  function inferJSXGraphNeed(instance) {
    if (!instance) return false;
    const opt = instance.frameOptions && typeof instance.frameOptions.loadJSXGraph !== 'undefined' ? instance.frameOptions.loadJSXGraph : instance.config.loadJSXGraph;
    if (opt === true) return true;
    if (opt === false) return false;
    return /jsxgraph|JXG\.|jxgbox/i.test(instance.finalHtml);
  }

  function inferLucideNeed(instance, unresolvedIcons) {
    const opt = instance.frameOptions && typeof instance.frameOptions.loadLucide !== 'undefined' ? instance.frameOptions.loadLucide : instance.config.loadLucide;
    if (opt === true) return true;
    if (opt === false) return false;
    return Array.isArray(unresolvedIcons) && unresolvedIcons.length > 0;
  }

  async function loadLucideIntoFrame(instance, unresolvedIcons) {
    if (!inferLucideNeed(instance, unresolvedIcons)) return false;
    const urls = resolveAssetUrl('lucide', instance.config);
    if (!urls.length) return false;
    const start = now();
    let lastError = null;
    for (let i = 0; i < urls.length; i += 1) {
      try {
        await ensureScript(instance.frameDocument, urls[i], normalizeTimeouts(instance.config).assetLoadMs);
        if (instance.frameWindow && instance.frameWindow.lucide && typeof instance.frameWindow.lucide.createIcons === 'function') {
          instance.frameWindow.lucide.createIcons();
        }
        metric(instance, 'asset_lucide_ms', Math.round(now() - start), { source: urls[i] });
        return true;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) throw lastError;
    return false;
  }

  async function loadMathJaxIntoFrame(instance) {
    if (!inferMathJaxNeed(instance)) return false;
    const urls = resolveAssetUrl('mathjax', instance.config);
    if (!urls.length) return false;
    const targetDoc = instance.frameDocument;
    const targetWindow = instance.frameWindow;
    if (!targetWindow.MathJax) {
      targetWindow.MathJax = {
        tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
        startup: { typeset: false }
      };
    }
    const start = now();
    let lastError = null;
    for (let i = 0; i < urls.length; i += 1) {
      try {
        await ensureScript(targetDoc, urls[i], normalizeTimeouts(instance.config).assetLoadMs);
        if (targetWindow.MathJax && typeof targetWindow.MathJax.typesetPromise === 'function') {
          await withTimeout(targetWindow.MathJax.typesetPromise(), normalizeTimeouts(instance.config).assetLoadMs, 'MathJax typeset');
        }
        metric(instance, 'asset_mathjax_ms', Math.round(now() - start), { source: urls[i] });
        return true;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) throw lastError;
    return false;
  }

  async function loadJSXGraphIntoFrame(instance) {
    if (!inferJSXGraphNeed(instance)) return false;
    const styleUrls = resolveAssetUrl('jsxgraphCss', instance.config);
    const scriptUrls = resolveAssetUrl('jsxgraphCore', instance.config);
    const start = now();
    let styleError = null;
    let scriptError = null;

    for (let i = 0; i < styleUrls.length; i += 1) {
      try {
        await ensureStyle(instance.frameDocument, styleUrls[i], normalizeTimeouts(instance.config).assetLoadMs);
        styleError = null;
        break;
      } catch (error) {
        styleError = error;
      }
    }

    for (let i = 0; i < scriptUrls.length; i += 1) {
      try {
        await ensureScript(instance.frameDocument, scriptUrls[i], normalizeTimeouts(instance.config).assetLoadMs);
        metric(instance, 'asset_jsxgraph_ms', Math.round(now() - start), { source: scriptUrls[i] });
        return true;
      } catch (error) {
        scriptError = error;
      }
    }

    if (scriptError || styleError) {
      throw scriptError || styleError;
    }
    return false;
  }

  function bindFrameButtons(instance) {
    if (!instance || !instance.frameDocument) return;
    const opts = instance.frameOptions || {};
    const doc = instance.frameDocument;
    const fsBtn = doc.getElementById(opts.fsBtnId || 'fsBtn');
    if (fsBtn && !fsBtn.__piaiBound) {
      fsBtn.__piaiBound = true;
      fsBtn.addEventListener('click', () => {
        const standaloneUrl = getStandAloneUrl(instance);
        if (standaloneUrl && detectDevice().isIOS) {
          global.open(standaloneUrl, instance.config.openStandaloneTarget || '_blank');
          return;
        }
        toggleFullscreen(instance.id);
      });
    }
    if (fsBtn && opts.isStandalone) {
      fsBtn.style.display = 'none';
    }

    const themeBtn = doc.getElementById(opts.themeBtnId || 'themeBtn');
    if (themeBtn && !themeBtn.__piaiBound) {
      themeBtn.__piaiBound = true;
      themeBtn.addEventListener('click', () => cycleTheme(instance.id));
    }
  }

  function postToFrame(instance, payload) {
    if (!instance || !instance.frameWindow) return;
    try {
      instance.frameWindow.postMessage(payload, instance.targetOrigin);
    } catch (error) {
      if (instance.targetOrigin !== '*') {
        warnLog('Falling back to wildcard postMessage targetOrigin.', error && error.message ? error.message : String(error), instance.config.debug || instance.config.diagnostics.console);
        try { instance.frameWindow.postMessage(payload, '*'); } catch (_) { }
      }
    }
  }

  function syncFrameTheme(instance) {
    applyThemeToFrame(instance);
    updateThemeButton(instance);
    updateFullscreenButton(instance);
    postToFrame(instance, {
      type: 'piaiApplyTheme',
      id: instance.id,
      themeName: instance.currentThemeName,
      theme: instance.currentTheme
    });
  }

  async function bootstrapFrame(frameWindow, opts) {
    const id = opts && opts.id ? opts.id : (frameWindow && frameWindow.frameElement ? frameWindow.frameElement.getAttribute('data-piai-id') : '');
    const instance = ENGINE_STATE.instances.get(id);
    if (!instance || instance.destroyed) return;
    if (instance.frameBootstrapped && instance.frameWindow === frameWindow) return;

    instance.frameWindow = frameWindow;
    instance.frameDocument = frameWindow.document;
    instance.frameOptions = opts || {};
    instance.frameBootstrapped = true;

    if (instance.readyTimer) {
      global.clearTimeout(instance.readyTimer);
      instance.readyTimer = null;
    }

    setState(instance, 'loading_assets');
    clearOverlay(instance);
    applyThemeToFrame(instance);
    bindFrameButtons(instance);
    const unresolvedIcons = applyInlineIcons(instance.frameDocument);
    updateThemeButton(instance);
    updateFullscreenButton(instance);

    const jobs = [];
    jobs.push(loadLucideIntoFrame(instance, unresolvedIcons));
    jobs.push(loadMathJaxIntoFrame(instance));
    jobs.push(loadJSXGraphIntoFrame(instance));

    const results = await Promise.allSettled(jobs);
    const rejected = results.filter((item) => item.status === 'rejected');
    if (rejected.length) {
      metric(instance, 'recoveries', rejected.length);
      reportError(instance, rejected[0].reason, { recoverable: true, phase: 'frame-bootstrap' });
    }

    hideLoaderInFrame(instance);
    syncFrameTheme(instance);
    setState(instance, rejected.length ? 'degraded' : 'ready');
    instance.renderedAt = now();
    metric(instance, 'iframe_ready_ms', Math.round(instance.renderedAt - instance.startedAt));
    if (typeof instance.config.onReady === 'function') {
      try {
        instance.config.onReady(instance.iframe, {
          id: instance.id,
          embedId: instance.id,
          width: instance.config.width,
          height: instance.config.height,
          theme: instance.currentTheme,
          themeName: instance.currentThemeName,
          baseCss: getBaseCss(instance.currentTheme),
          isIOS: detectDevice().isIOS
        });
      } catch (_) {
        // noop
      }
    }
  }

  function installHostRuntime() {
    if (ENGINE_STATE.runtimeInstalled) return;
    global.__PIAI_HOST_RUNTIME__ = {
      bootstrap(frameWindow, opts) {
        bootstrapFrame(frameWindow, opts).catch((error) => {
          const id = opts && opts.id;
          const instance = id ? ENGINE_STATE.instances.get(id) : null;
          if (instance) reportError(instance, error, { recoverable: true, phase: 'host-runtime-bootstrap' });
        });
      },
      notify(frameWindow, type, payload) {
        const id = payload && payload.id ? payload.id : (frameWindow && frameWindow.frameElement ? frameWindow.frameElement.getAttribute('data-piai-id') : '');
        if (!id) return;
        if (type === 'requestFullscreen') toggleFullscreen(id);
        if (type === 'requestTheme') cycleTheme(id);
      }
    };
    ENGINE_STATE.runtimeInstalled = true;
  }

  function updateScale(instance) {
    if (!instance || instance.destroyed || !instance.wrapper) return;
    const width = Number(instance.config.width) || 800;
    const height = Number(instance.config.height) || 450;
    const rect = instance.container.getBoundingClientRect();
    const containerWidth = instance.isFullscreen ? global.innerWidth : (rect.width || instance.container.clientWidth || width);
    const containerHeight = instance.isFullscreen ? global.innerHeight : (rect.height || instance.container.clientHeight || height);
    if (containerWidth <= 0 || !Number.isFinite(containerWidth)) return;

    let scale = 1;
    if (instance.isFullscreen) {
      scale = Math.min(containerWidth / width, containerHeight / height);
    } else {
      scale = containerWidth / width;
    }
    if (!Number.isFinite(scale) || scale <= 0) scale = instance.lastScale || 1;
    if (Math.abs(scale - instance.lastScale) < 0.001 && instance.lastScale > 0) return;

    instance.lastScale = scale;
    const scaledW = width * scale;
    const scaledH = height * scale;

    if (instance.isFullscreen) {
      const x = (containerWidth - scaledW) / 2;
      const y = (containerHeight - scaledH) / 2;
      instance.wrapper.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    } else {
      instance.container.style.height = `${Math.ceil(scaledH)}px`;
      instance.wrapper.style.transform = `scale(${scale})`;
    }
  }

  function requestScale(instance) {
    if (!instance) return;
    if (instance.resizeRAF) cancelAnimationFrame(instance.resizeRAF);
    instance.resizeRAF = requestAnimationFrame(() => updateScale(instance));
  }

  function getInstanceFromFrameSource(source) {
    if (!source) return null;
    for (const instance of ENGINE_STATE.instances.values()) {
      if (instance.frameWindow === source) return instance;
    }
    return null;
  }

  function onWindowMessage(event) {
    const data = event && event.data;
    if (!data || !data.type) return;

    if (data.type === 'piaiFrameBootstrap') {
      const instance = data.id ? ENGINE_STATE.instances.get(data.id) : getInstanceFromFrameSource(event.source);
      if (!instance) return;
      bootstrapFrame(event.source, Object.assign({}, data.opts || {}, { id: instance.id })).catch((error) => {
        reportError(instance, error, { recoverable: true, phase: 'message-bootstrap' });
      });
      return;
    }

    const instance = data.id ? ENGINE_STATE.instances.get(data.id) : getInstanceFromFrameSource(event.source);
    if (!instance) return;
    if (event.source && instance.frameWindow && event.source !== instance.frameWindow) return;

    if (data.type === 'toggleFullscreen') toggleFullscreen(instance.id);
    if (data.type === 'switchTheme') cycleTheme(instance.id);
  }

  function onFullscreenChange() {
    const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
    ENGINE_STATE.instances.forEach((instance) => {
      const nextState = fsElement && fsElement === instance.container;
      if (instance.isFullscreen !== !!nextState) {
        setFullscreen(instance.id, !!nextState);
      }
    });
  }

  function onKeydown(event) {
    if (event.key !== 'Escape') return;
    ENGINE_STATE.instances.forEach((instance) => {
      if (instance.isFullscreen && detectDevice().isIOS) {
        setFullscreen(instance.id, false);
      }
    });
  }

  function scheduleSweep() {
    if (ENGINE_STATE.sweepScheduled) return;
    ENGINE_STATE.sweepScheduled = true;
    ENGINE_STATE.sweepHandle = safeIdle(() => {
      ENGINE_STATE.sweepScheduled = false;
      ENGINE_STATE.instances.forEach((instance, id) => {
        if (!instance.container || !instance.container.isConnected) {
          destroy(id, true);
        }
      });
    }, 1000);
  }

  function bindEventHub() {
    if (ENGINE_STATE.eventHubBound) return;
    installHostRuntime();
    global.addEventListener('message', onWindowMessage);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeydown);

    if (typeof ResizeObserver !== 'undefined') {
      ENGINE_STATE.resizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const target = entry.target;
          ENGINE_STATE.instances.forEach((instance) => {
            if (instance.container === target) requestScale(instance);
          });
        });
      });
    } else if (!ENGINE_STATE.resizeFallbackBound) {
      ENGINE_STATE.resizeFallbackBound = true;
      global.addEventListener('resize', () => {
        ENGINE_STATE.instances.forEach((instance) => requestScale(instance));
      });
      global.addEventListener('orientationchange', () => {
        global.setTimeout(() => {
          ENGINE_STATE.instances.forEach((instance) => requestScale(instance));
        }, 180);
      });
    }

    ENGINE_STATE.eventHubBound = true;
  }

  function observeInstance(instance) {
    if (!instance) return;
    bindEventHub();
    if (ENGINE_STATE.resizeObserver) {
      try { ENGINE_STATE.resizeObserver.observe(instance.container); } catch (_) { }
    }
    scheduleSweep();
  }

  function unobserveInstance(instance) {
    if (!instance) return;
    if (ENGINE_STATE.resizeObserver) {
      try { ENGINE_STATE.resizeObserver.unobserve(instance.container); } catch (_) { }
    }
  }

  function setFullscreen(id, state) {
    const instance = ENGINE_STATE.instances.get(id);
    if (!instance || instance.destroyed) return;
    instance.isFullscreen = !!state;
    instance.container.style.cssText = instance.isFullscreen ? createBaseStyle().fullscreen : createBaseStyle().default;
    requestScale(instance);
    updateFullscreenButton(instance);
    postToFrame(instance, { type: 'fullscreenState', id: instance.id, isFullscreen: instance.isFullscreen });
  }

  function toggleFullscreen(id) {
    const instance = ENGINE_STATE.instances.get(id);
    if (!instance || instance.destroyed) return;
    const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsElement) {
      if (instance.container.requestFullscreen) {
        instance.container.requestFullscreen().then(() => setFullscreen(id, true)).catch(() => setFullscreen(id, true));
      } else if (instance.container.webkitRequestFullscreen) {
        instance.container.webkitRequestFullscreen();
        setFullscreen(id, true);
      } else {
        setFullscreen(id, true);
      }
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      setFullscreen(id, false);
    }
  }

  function cycleTheme(id) {
    const instance = ENGINE_STATE.instances.get(id);
    if (!instance || instance.destroyed) return;
    let idx = THEME_ORDER.indexOf(instance.currentThemeName);
    if (idx < 0) idx = 0;
    instance.currentThemeName = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    instance.currentTheme = getThemeByName(instance.currentThemeName);
    syncFrameTheme(instance);
    if (typeof instance.config.onThemeChange === 'function') {
      try { instance.config.onThemeChange(instance.currentThemeName, instance.currentTheme); } catch (_) { }
    }
  }

  function cleanupInstance(instance, fromSweep) {
    if (!instance || instance.destroyed) return;
    instance.destroyed = true;
    if (instance.readyTimer) global.clearTimeout(instance.readyTimer);
    if (instance.resizeRAF) cancelAnimationFrame(instance.resizeRAF);
    clearOverlay(instance);
    unobserveInstance(instance);
    if (instance.container) {
      instance.container.__piaiCleanup = null;
    }
    try { if (instance.iframe) instance.iframe.src = 'about:blank'; } catch (_) { }
    try { if (instance.wrapper && instance.wrapper.parentNode) instance.wrapper.parentNode.removeChild(instance.wrapper); } catch (_) { }
    ENGINE_STATE.instances.delete(instance.id);
    if (!fromSweep) scheduleSweep();
  }

  function destroy(id, fromSweep) {
    const instance = ENGINE_STATE.instances.get(id);
    if (!instance) return false;
    cleanupInstance(instance, fromSweep);
    return true;
  }

  function retry(id) {
    const instance = ENGINE_STATE.instances.get(id);
    if (!instance || !instance.lastOptions) return false;
    const opts = instance.lastOptions;
    destroy(id);
    render(opts);
    return true;
  }

  function getState(id) {
    const instance = ENGINE_STATE.instances.get(id);
    if (!instance) return null;
    return {
      id: instance.id,
      state: instance.state,
      isFullscreen: instance.isFullscreen,
      themeName: instance.currentThemeName,
      lastError: instance.lastError ? (instance.lastError.message || String(instance.lastError)) : null,
      metrics: instance.lastMetrics.slice(-10)
    };
  }

  function normalizeConfig(options) {
    const config = Object.assign({
      width: 800,
      height: 450,
      aspect: '16 / 9',
      themeName: 'educational',
      headExtra: '',
      fitMode: 'scroll',
      header: true,
      branding: true,
      debug: false,
      assetBase: '',
      assetPolicy: 'hybrid',
      loadLucide: 'auto',
      loadMathJax: 'auto',
      loadJSXGraph: 'auto',
      diagnostics: false,
      onStatusChange: null,
      onMetric: null,
      onError: null,
      onReady: null,
      onThemeChange: null,
      serviceWorkerMode: 'off',
      serviceWorkerUrl: '',
      injectFrameRuntime: true,
      upgradeLegacyRuntime: false,
      lazy: false,
      lazyThreshold: 200,
      iframeReadyTimeoutMs: DEFAULT_TIMEOUTS.iframeReadyMs,
      assetLoadTimeoutMs: DEFAULT_TIMEOUTS.assetLoadMs,
      standaloneUrl: '',
      openStandaloneTarget: '_blank'
    }, options || {});

    config.assetPolicy = normalizeAssetPolicy(config.assetPolicy);
    config.loadLucide = normalizeAssetFlag(config.loadLucide);
    config.loadMathJax = normalizeAssetFlag(config.loadMathJax);
    config.loadJSXGraph = normalizeAssetFlag(config.loadJSXGraph);
    config.fitMode = normalizeFitMode(config.fitMode);
    config.diagnostics = normalizeDiagnostics(config.diagnostics);
    return config;
  }

  function renderLazy(options) {
    const opts = normalizeConfig(options);
    opts.lazy = false;
    if (!opts.id) {
      console.error('[PiAI Engine] renderLazy requires an id');
      return;
    }
    const container = opts.container || document.getElementById(opts.id);
    if (!container) {
      console.error('[PiAI Engine] Container not found:', opts.id);
      return;
    }
    container.innerHTML = '<div class="piai-skeleton" style="aspect-ratio:16/9;border-radius:16px;overflow:hidden;background:#f0f0f0;">Dang tai...</div>';

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          render(opts);
        }
      });
    }, { rootMargin: `${opts.lazyThreshold || 200}px` });

    observer.observe(container);
  }

  function render(options) {
    const config = normalizeConfig(options);
    if (config.lazy) {
      config.lazy = false;
      return renderLazy(config);
    }
    const container = config.container || (typeof config.id === 'string' ? document.getElementById(config.id) : null);
    if (!container) {
      console.error('[PiAI Engine] Container not found:', config.id);
      return;
    }

    const containerId = container.id || (typeof config.id === 'string' ? config.id : `piai_${Date.now()}`);
    container.id = containerId;
    config.id = containerId;

    if (ENGINE_STATE.instances.has(containerId)) {
      destroy(containerId);
    }
    if (typeof container.__piaiCleanup === 'function') {
      try { container.__piaiCleanup(); } catch (_) { }
    }

    bindEventHub();
    preloadAssets(config);
    loadExternalServiceWorker(config.serviceWorkerMode, config.serviceWorkerUrl, config.debug || config.diagnostics.console).catch(() => { });

    const instance = createInstance(config, container);
    const baseStyle = createBaseStyle();
    const baseCss = getBaseCss(instance.currentTheme);
    const ctxBase = {
      id: containerId,
      embedId: containerId,
      width: config.width,
      height: config.height,
      theme: instance.currentTheme,
      themeName: instance.currentThemeName,
      baseCss,
      isIOS: detectDevice().isIOS,
      isStandalone: false
    };

    while (container.firstChild) container.removeChild(container.firstChild);
    container.style.cssText = baseStyle.default;
    setState(instance, 'loading_engine');
    setState(instance, 'building_document');

    const generator = typeof config.htmlGenerator === 'function' ? config.htmlGenerator : () => config.html || '';
    const finalHtml = generator(Object.assign({}, ctxBase));
    if (!finalHtml) {
      console.warn('[PiAI Engine] No content to render');
      return;
    }
    instance.finalHtml = finalHtml;

    const fitHead = config.fitMode === 'no-scroll' ? '<script>(function(){try{document.documentElement.classList.add("piai-fit-noscroll");}catch(_){}})();<\/script>' : '';
    const headExtraFinal = `${config.headExtra || ''}${fitHead}`;
    const iframeHtml = buildHtmlDocument(finalHtml, baseCss, headExtraFinal, instance);

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position:absolute;top:0;left:0;width:${config.width}px;height:${config.height}px;transform-origin:0 0;`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = `width:100%;height:100%;border:none;display:block;background:${instance.currentTheme.bg || '#f9f7f5'};`;
    iframe.scrolling = 'no';
    iframe.loading = 'lazy';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-popups';
    iframe.allow = 'fullscreen; clipboard-read; clipboard-write; autoplay; encrypted-media';
    iframe.setAttribute('data-piai-id', containerId);
    iframe.srcdoc = iframeHtml;

    instance.wrapper = wrapper;
    instance.iframe = iframe;
    ENGINE_STATE.instances.set(containerId, instance);
    container.__piaiCleanup = function () { destroy(containerId); };

    iframe.addEventListener('load', () => {
      setState(instance, 'mounting_iframe');
      try {
        if (iframe.contentWindow && !instance.frameBootstrapped) {
          bootstrapFrame(iframe.contentWindow, {
            id: containerId,
            themeName: instance.currentThemeName,
            isStandalone: false,
            loaderId: 'loader',
            themeBtnId: 'themeBtn',
            themeIconId: 'themeBtnIcon',
            fsBtnId: 'fsBtn',
            loadLucide: config.loadLucide,
            loadMathJax: config.loadMathJax === true,
            loadJSXGraph: config.loadJSXGraph === true
          }).catch((error) => {
            reportError(instance, error, { recoverable: true, phase: 'iframe-load' });
          });
        }
      } catch (error) {
        reportError(instance, error, { recoverable: true, phase: 'iframe-load-access' });
      }
    });

    instance.readyTimer = global.setTimeout(() => {
      if (instance.state !== 'ready' && instance.state !== 'degraded') {
        reportError(instance, new Error('Frame bootstrap timed out'), { recoverable: true, phase: 'iframe-timeout' });
        try {
          if (iframe.contentWindow && !instance.frameBootstrapped) {
            bootstrapFrame(iframe.contentWindow, { id: containerId, themeName: instance.currentThemeName }).catch(() => { });
          }
        } catch (_) {
          // noop
        }
      }
    }, normalizeTimeouts(config).iframeReadyMs);

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
    observeInstance(instance);
    requestScale(instance);
    metric(instance, 'engine_load_ms', Math.round(now() - instance.startedAt));
    debugLog('Embed mounted successfully', { containerId, version: ENGINE_VERSION }, config.debug);
  }

  function flushLoaderQueue() {
    const existing = global.PiaiEmbedLoader;
    const queued = existing && Array.isArray(existing.queue) ? existing.queue.slice() : [];

    const loaderApi = {
      version: ENGINE_VERSION,
      queue: [],
      enqueue(config) {
        if (!config) return Promise.resolve(false);
        render(config);
        return Promise.resolve(true);
      },
      render(config) {
        return this.enqueue(config);
      },
      renderLazy(config) {
        return this.enqueue(Object.assign({}, config || {}, { lazy: true }));
      },
      destroy,
      retry,
      getState,
      ensure() {
        return Promise.resolve(true);
      }
    };

    global.PiaiEmbedLoader = loaderApi;
    queued.forEach((config) => {
      try {
        loaderApi.enqueue(config);
      } catch (error) {
        console.error('[PiAI Engine] Failed to flush queued config', error);
      }
    });
  }

  global.PiaiEmbed = {
    version: ENGINE_VERSION,
    render,
    renderLazy,
    destroy,
    retry,
    getState,
    themes: THEMES,
    getThemeByName,
    getBaseCss,
    defaults: {
      width: 800,
      height: 450,
      aspect: '16 / 9',
      themeName: 'educational',
      headExtra: '',
      fitMode: 'scroll',
      header: true,
      branding: true,
      debug: false,
      assetBase: '',
      assetPolicy: 'hybrid',
      loadLucide: 'auto',
      loadMathJax: 'auto',
      loadJSXGraph: 'auto',
      diagnostics: false,
      serviceWorkerMode: 'off',
      serviceWorkerUrl: '',
      injectFrameRuntime: true,
      upgradeLegacyRuntime: false,
      lazy: false,
      lazyThreshold: 200,
      iframeReadyTimeoutMs: DEFAULT_TIMEOUTS.iframeReadyMs,
      assetLoadTimeoutMs: DEFAULT_TIMEOUTS.assetLoadMs,
      standaloneUrl: '',
      openStandaloneTarget: '_blank'
    },
    cdn: {
      registry: REMOTE_CDN,
      loadScript(url) {
        return ensureScript(document, url, DEFAULT_TIMEOUTS.assetLoadMs);
      },
      loadStyle(url) {
        return ensureStyle(document, url, DEFAULT_TIMEOUTS.assetLoadMs);
      },
      preload: preloadAssets
    },
    serviceWorker: {
      register: loadExternalServiceWorker
    }
  };

  flushLoaderQueue();
})(window);
