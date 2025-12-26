// piai-embed-engine.js
// v3.12.0 – FINAL STABLE (Pixel Perfect + Theme Compatibility)
// ==============================================================================
//
// CHANGELOG v3.12.0:
// ------------------
// 1. PIXEL PERFECT SCALING (from v3.11.0):
//    - Removed all scale rounding (no Math.floor/ceil)
//    - Scale uses full decimal precision for zero-gap rendering
//    - Container dimensions sync exactly with scaled content
//
// 2. THEME COMPATIBILITY FIX (from v3.10.3):
//    - Added 'id' back to 'piaiApplyTheme' message for iframe validation
//    - Ensures games that check e.data.id can receive theme updates
//
// 3. PRESERVED ALL FEATURES:
//    - Separate piaiInit (security) vs piaiApplyTheme (UI) messages
//    - iOS standalone URL support for fullscreen workaround
//    - Fullscreen toggle with proper state management
//    - Theme switching (classic, educational, night)
//    - Minigame bridge with cookie parsing, stats, and result saving
//    - MutationObserver cleanup on DOM removal
//    - Responsive resize handling with RAF debouncing
//    - Debug logging option
//
// 4. MINIGAME API BRIDGE UPDATE:
//    - Added apiBase override + same-origin first + fallback list to avoid 404
//    - Added mateId + question-pool proxy (postMessage) to avoid CORS
//    - Fixed postMessage targetOrigin to use origin (not full URL)
//    - Added credentials:'include' for API calls
//
// ==============================================================================

(function (global) {
  'use strict';

  const THEMES = {
    classic: {
      name: 'classic',
      primary: '#800020',
      accent: '#b8860b',
      secondary: '#002b5c',
      bg: '#f9f7f5',
      text: '#002b4a',
      textLight: '#666666'
    },
    educational: {
      name: 'educational',
      primary: '#2196F3',
      accent: '#FFC107',
      secondary: '#4CAF50',
      bg: '#FFFFFF',
      text: '#212121',
      textLight: '#757575'
    },
    night: {
      name: 'night',
      primary: '#A1C2BD',
      accent: '#1D24CA',
      secondary: '#A8A1CE',
      bg: '#19183B',
      text: '#F9E8C9',
      textLight: '#9BA4B5'
    }
  };

  const THEME_ORDER = Object.keys(THEMES);

  const DEFAULT_CONFIG = {
    width: 800,
    height: 450,
    aspect: '16 / 9',
    themeName: 'classic',
    headExtra: '',
    fitMode: 'scroll',
    header: true,
    branding: true,
    debug: false,
    mateId: 'math_lesson_001',
    apiBase: ''
  };

  const SYSTEM_FONT_STACK =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

  const BASE_RADIUS = 16;

  function detectDevice() {
    const ua = navigator.userAgent || '';
    return {
      isIOS: /iPad|iPhone|iPod/.test(ua) && !window.MSStream,
      isAndroid: /Android/i.test(ua),
      isMobile: /Mobi|Android/i.test(ua)
    };
  }

  function getThemeByName(name) {
    return THEMES[name] || THEMES[DEFAULT_CONFIG.themeName];
  }

  function normalizeFitMode(mode) {
    const m = String(mode || '').toLowerCase().trim();
    return (m === 'no-scroll' || m === 'noscroll' || m === 'compact') ? 'no-scroll' : 'scroll';
  }

  function debugLog(message, data, debugEnabled) {
    if (debugEnabled) console.log(`[PiAI Engine v3.12.0] ${message}`, data || '');
  }

  function safeOrigin(url) {
    try {
      return new URL(url, window.location.href).origin;
    } catch (_) {
      return '';
    }
  }

  function normalizeApiBase(base, origin) {
    const b = String(base || '').trim();
    if (!b) return '';
    if (/^https?:\/\//i.test(b)) return b;
    if (b.startsWith('/')) return origin + b;
    return origin + '/' + b;
  }

  function uniqBases(arr) {
    const out = [];
    const seen = new Set();
    for (let i = 0; i < arr.length; i++) {
      const v = String(arr[i] || '').trim();
      if (!v) continue;
      const vv = v.endsWith('/') ? v : (v + '/');
      if (!seen.has(vv)) {
        seen.add(vv);
        out.push(vv);
      }
    }
    return out;
  }

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

      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; }

      body {
        font-family: ${SYSTEM_FONT_STACK};
        color: var(--piai-text);
        background: transparent;
        overflow: hidden;
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
        isolation: isolate;
      }

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

      .piai-body > * { margin-bottom: 15px; }
      .piai-body > *:last-child { margin-bottom: 0; }

      .piai-body::-webkit-scrollbar { width: 6px; }
      .piai-body::-webkit-scrollbar-thumb { background: var(--piai-text-light); border-radius: 3px; }

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

      .hdr-btn:hover { color: #fff; }

      .hdr-btn svg {
        width: 26px;
        height: 26px;
        transition: transform 0.2s ease;
      }

      .hdr-btn:hover svg { transform: scale(1.1); }

      .fs-btn { right: 0; }
      .theme-btn { right: 58px; }

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

      .piai-loader.hide { opacity: 0; visibility: hidden; }

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

      @keyframes spin { to { transform: rotate(360deg); } }

      .MathJax, mjx-container { transform: none !important; }
    `;
  }

  function buildHtmlDocument(content, baseCss, headExtra) {
    if (!content) return '';
    const inject = `<style>${baseCss}</style>${headExtra || ''}`;
    if (/<!doctype html/i.test(content)) {
      if (content.includes('</head>')) return content.replace('</head>', inject + '</head>');
      return inject + content;
    }
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

  function createBaseStyle(theme) {
    const borderCol = (theme.primary || '#800020') + '26';
    return {
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
      `.replace(/\s+/g, ' ').trim()
    };
  }

  function generateMinigameHTML(ctx, config) {
    const gameUrl = config.gameUrl;
    const gameOrigin = config.gameOrigin || safeOrigin(gameUrl);
    const mateId = config.mateId || DEFAULT_CONFIG.mateId;

    const origin = window.location.origin;

    const bases = [];
    const cfgApiBaseAbs = normalizeApiBase(config.apiBase, origin);
    if (cfgApiBaseAbs) bases.push(cfgApiBaseAbs);
    bases.push(origin + '/api/minigames/');
    bases.push('https://apps.pistudy.vn/api/minigames/');
    bases.push('https://pistudy.vn/api/minigames/');
    const apiBases = uniqBases(bases);

    const cookieRaw = document.cookie || '';
    const safeCookie = cookieRaw
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\${/g, '\\${');

    return `
    <div class="piai-wrap" style="background: transparent;">
      <div class="piai-loader" id="loader">
        <div class="loader-inner">
          <div class="spinner"></div>
          <div class="loader-text">Đang tải...</div>
        </div>
      </div>
      <main class="piai-body no-pad">
        <iframe
          class="game-frame"
          src="${gameUrl}"
          allow="autoplay; encrypted-media; fullscreen"
        ></iframe>
      </main>
    </div>

    <script>
    (function() {
      const CFG = {
        cookies: \`${safeCookie}\`,
        apiBases: ${JSON.stringify(apiBases)},
        apiBase: null,
        gameKey: "${config.gameKey || 'unknown-game'}",
        gameUrl: "${gameUrl}",
        gameOrigin: "${gameOrigin}",
        debug: ${!!config.debug},
        mateId: "${mateId}"
      };

      function log(m, d) { if (CFG.debug) console.log("[Bridge] " + m, d || ""); }

      function getCookie(name) {
        const match = CFG.cookies.match('(^|;) ?' + name + '=([^;]*)(;|$)');
        return match ? match[2] : null;
      }

      function getUser() {
        let user = { name: "Khách", username: "guest" };
        const jwt = getCookie("edx-jwt-cookie-header-payload");
        if (jwt) {
          try {
            const payload = JSON.parse(atob(jwt.split(".")[1]));
            user.name = payload.name || payload.preferred_username;
            user.username = payload.preferred_username;
            return user;
          } catch(e) { log("JWT parse error", e); }
        }
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
          } catch(e) { log("Legacy cookie parse error", e); }
        }
        return user;
      }

      async function api(endpoint, options = {}) {
        const opt = Object.assign({ credentials: "include" }, options);
        const list = CFG.apiBase ? [CFG.apiBase] : CFG.apiBases;

        let lastErr = null;
        for (var i = 0; i < list.length; i++) {
          var base = list[i];
          try {
            const res = await fetch(base + endpoint, opt);
            if (!res.ok) throw new Error("HTTP " + res.status);
            CFG.apiBase = base;
            return res;
          } catch (e) {
            lastErr = e;
          }
        }
        throw lastErr || new Error("API Error");
      }

      async function fetchStats() {
        try {
          const res = await api("logs/");
          const data = await res.json();
          const rows = Array.isArray(data) ? data : (data.results || []);
          let playCount = 0, bestScore = 0;
          rows.forEach(item => {
            if (item.payload?.gameKey === CFG.gameKey) {
              playCount++;
              const score = Number(item.payload.score || 0);
              if (score > bestScore) bestScore = score;
            }
          });
          return { playCount, bestScore };
        } catch(e) {
          return { playCount: 0, bestScore: 0 };
        }
      }

      async function saveResult(payload) {
        try {
          await api("logs/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": getCookie("csrftoken") || ""
            },
            body: JSON.stringify({
              msgtype: "RESULT",
              tsms: Date.now(),
              payload: Object.assign({}, payload, {
                userId: null,
                username: getUser().username
              })
            })
          });
          return true;
        } catch(e) {
          return false;
        }
      }

      async function fetchQuestionPool(mateId) {
        const mid = mateId || CFG.mateId || "${DEFAULT_CONFIG.mateId}";
        const res = await api("question-pool/" + encodeURIComponent(mid) + "/");
        return await res.json();
      }

      const iframe = document.querySelector("iframe.game-frame");
      const loader = document.getElementById("loader");

      iframe.onload = function() {
        setTimeout(function() { loader.classList.add("hide"); }, 500);
      };

      function send(data) {
        try {
          iframe.contentWindow && iframe.contentWindow.postMessage(data, CFG.gameOrigin || "*");
        } catch(e) {
          iframe.contentWindow && iframe.contentWindow.postMessage(data, "*");
        }
      }

      function sendBaseData(stats) {
        send({
          type: "MINIGAME_DATA",
          userName: getUser().name,
          stats: stats,
          env: {
            gameKey: CFG.gameKey,
            mateId: CFG.mateId,
            apiBase: CFG.apiBase || "",
            apiBases: CFG.apiBases || []
          }
        });
      }

      window.addEventListener("message", function(event) {
        if (CFG.gameOrigin && event.origin !== CFG.gameOrigin) return;
        const msg = event.data || {};

        (async function() {
          if (msg.type === "MINIGAME_READY" ||
              (msg.type === "MINIGAME_ACTION" && msg.action === "REFRESH_STATS")) {
            const st = await fetchStats();
            sendBaseData(st);
          }

          if (msg.type === "MINIGAME_ACTION" && msg.action === "SAVE_RESULT") {
            await saveResult(msg.data || {});
            const st = await fetchStats();
            sendBaseData(st);
          }

          if (msg.type === "MINIGAME_ACTION" &&
              (msg.action === "FETCH_QUESTION_POOL" || msg.action === "GET_QUESTION_POOL")) {
            const mid = (msg.data && msg.data.mateId) || msg.mateId || CFG.mateId;
            try {
              const qp = await fetchQuestionPool(mid);
              send({ type: "MINIGAME_QUESTION_POOL", mateId: mid, payload: qp });
            } catch(e) {
              send({ type: "MINIGAME_QUESTION_POOL", mateId: mid, payload: null, error: String(e && e.message ? e.message : e) });
            }
          }
        })();
      });
    })();
    <\/script>`;
  }

  function render(options) {
    const config = Object.assign({}, DEFAULT_CONFIG, options || {});
    const isMinigame = !!config.gameUrl;

    if (isMinigame && (!options.themeName && !options.theme)) {
      config.themeName = 'educational';
    }

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

    const container = cNode || (typeof id === 'string' ? document.getElementById(id) : null);
    if (!container) {
      console.error('[PiAI Engine] Container not found:', id);
      return;
    }

    if (typeof container.__piaiCleanup === 'function') {
      try { container.__piaiCleanup(); } catch (_) {}
      container.__piaiCleanup = null;
    }

    const containerId = container.id || (typeof id === 'string' ? id : 'piai_' + Date.now());
    container.id = containerId;

    const { isIOS } = detectDevice();

    let currentTheme = tOverride || getThemeByName(themeName);
    let currentThemeName = currentTheme.name || themeName || DEFAULT_CONFIG.themeName;
    let baseCss = getBaseCss(currentTheme);
    let baseStyle = createBaseStyle(currentTheme, aspect);

    while (container.firstChild) container.removeChild(container.firstChild);
    container.style.cssText = baseStyle.default;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${width}px;
      height: ${height}px;
      transform-origin: 0 0;
    `.replace(/\s+/g, ' ').trim();

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

    let finalHtml = '';
    if (isMinigame) {
      finalHtml = generateMinigameHTML(ctxBase, config);
    } else {
      const generator = typeof htmlGenerator === 'function' ? htmlGenerator : () => html || '';
      finalHtml = generator(Object.assign({}, ctxBase, { isStandalone: false }));
    }

    const fitNorm = normalizeFitMode(fitMode);
    const fitHead = fitNorm === 'no-scroll'
      ? `<script>(function(){try{document.documentElement.classList.add('piai-fit-noscroll');}catch(_){}})();<\/script>`
      : '';
    const headExtraFinal = (headExtra || '') + fitHead;

    if (!finalHtml) {
      console.warn('[PiAI Engine] No content to render');
      return;
    }

    const iframeHtml = buildHtmlDocument(finalHtml, baseCss, headExtraFinal);

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

    const blobUrl = URL.createObjectURL(new Blob([iframeHtml], { type: 'text/html' }));

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

    if (iosStandaloneUrl) iframe.dataset.iosStandaloneUrl = iosStandaloneUrl;

    iframe.onload = function () {
      try { URL.revokeObjectURL(blobUrl); } catch (_) {}

      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'piaiInit', id: containerId, version: '3.12.0' }, '*');
        iframe.contentWindow.postMessage({ type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme }, '*');
      }

      if (typeof onReady === 'function') onReady(iframe, ctxBase);
    };

    let isFull = false;
    let resizeRAF = null;

    const updateScale = () => {
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width || container.clientWidth || width;
      const containerHeight = rect.height || container.clientHeight || height;

      let scale;
      if (isFull) scale = Math.min(containerWidth / width, containerHeight / height);
      else scale = containerWidth / width;

      if (!Number.isFinite(scale) || scale <= 0) scale = 1;

      const contentWidth = width * scale;
      const contentHeight = height * scale;

      if (isFull) {
        const dx = (containerWidth - contentWidth) / 2;
        const dy = (containerHeight - contentHeight) / 2;
        wrapper.style.transformOrigin = '0 0';
        wrapper.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      } else {
        container.style.height = `${contentHeight}px`;
        wrapper.style.transformOrigin = '0 0';
        wrapper.style.transform = `scale(${scale})`;
      }
    };

    const setFullscreen = (state) => {
      isFull = state;
      container.style.cssText = state ? baseStyle.fullscreen : baseStyle.default;
      requestAnimationFrame(updateScale);
      try {
        iframe.contentWindow && iframe.contentWindow.postMessage({ type: 'fullscreenState', id: containerId, isFullscreen: state }, '*');
      } catch (_) {}
    };

    const switchTheme = () => {
      let idx = THEME_ORDER.indexOf(currentThemeName);
      if (idx < 0) idx = 0;
      currentThemeName = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
      currentTheme = getThemeByName(currentThemeName);
      baseCss = getBaseCss(currentTheme);
      baseStyle = createBaseStyle(currentTheme, aspect);

      container.style.cssText = isFull ? baseStyle.fullscreen : baseStyle.default;
      iframe.style.background = isMinigame ? 'transparent' : (currentTheme.bg || '#f9f7f5');

      updateScale();

      try {
        iframe.contentWindow && iframe.contentWindow.postMessage({ type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme }, '*');
      } catch (_) {}

      if (typeof onThemeChange === 'function') onThemeChange(currentThemeName, currentTheme);
    };

    const onMessage = (e) => {
      if (!e.data || e.data.id !== containerId) return;

      if (e.data.type === 'toggleFullscreen') {
        if (detectDevice().isIOS) return;

        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else if (isFull) {
          setFullscreen(false);
        } else if (container.requestFullscreen) {
          container.requestFullscreen().then(() => setFullscreen(true)).catch(() => setFullscreen(true));
        } else {
          setFullscreen(true);
        }
      }

      if (e.data.type === 'switchTheme') switchTheme();
    };

    const onFullscreenChange = () => {
      if (detectDevice().isIOS) return;
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

    window.addEventListener('message', onMessage);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

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
      try { iosStandaloneUrl && URL.revokeObjectURL(iosStandaloneUrl); } catch (_) {}
      try { observer.disconnect(); } catch (_) {}
    }

    container.__piaiCleanup = cleanup;

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
    updateScale();

    debugLog('Embed mounted successfully', { containerId, version: '3.12.0' }, debug);
  }

  global.PiaiEmbed = {
    version: '3.12.0',
    render,
    themes: THEMES,
    getThemeByName,
    getBaseCss,
    defaults: DEFAULT_CONFIG
  };

})(window);
