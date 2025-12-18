// piai-embed-engine.js
// v3.6.0 – SUPPORT EXTERNAL SRC (real origin for React games) + INLINE SRCDOC
// Features: fullscreen, theme switch, responsive scale, logo positioning, text clarity
// FIX: text blur (no transform on text), Android alignment, memory leak free
// NEW: optional config.src → dùng iframe src thật (real origin) cho bridge postMessage ổn định
//       nếu không có src → dùng srcdoc inline như cũ (cho game thuần HTML/JS như Đua Xe)
(function (global) {
  'use strict';
  // ============================================================
  // 1) THEMES
  // ============================================================
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
    fitMode: 'scroll',
    src: null, // NEW: nếu có → dùng iframe src thật (external React game)
  };
  const SYSTEM_FONT_STACK =
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,' +
    '"Helvetica Neue",Arial,"Noto Sans",sans-serif,' +
    '"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';
  const BASE_RADIUS = 16;

  // ============================================================
  // 2) HELPERS
  // ============================================================
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

  // Base CSS (giữ nguyên fix text blur, logo positioning)
  function getBaseCss(theme) {
    return `:root{
  --piai-primary:${theme.primary};
  --piai-accent:${theme.accent};
  --piai-secondary:${theme.secondary};
  --piai-bg:${theme.bg};
  --piai-text:${theme.text};
  --piai-text-light:${theme.textLight};
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%}
body{
  font-family:${SYSTEM_FONT_STACK};
  color:var(--piai-text);
  background:transparent;
  overflow:hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
.piai-wrap{
  width:100%;height:100%;background:var(--piai-bg);display:flex;flex-direction:column;overflow:hidden;position:relative;isolation:isolate;
}
.piai-hdr{
  background:var(--piai-primary);color:#fff;padding:12px 20px;padding-right:130px;font-weight:700;display:flex;align-items:center;gap:10px;line-height:1.2;border-bottom:3px solid var(--piai-accent);position:relative;
}
.piai-hdr svg{width:20px;height:20px;display:block;flex:0 0 auto}
.piai-body{flex:1;padding:15px 20px;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;min-height:0;position:relative;z-index:1;}
.piai-body>*{margin-bottom:15px}
.piai-body>*:last-child{margin-bottom:0}
.piai-body::-webkit-scrollbar{width:6px}
.piai-body::-webkit-scrollbar-thumb{background:var(--piai-text-light);border-radius:3px;}
.piai-def{
  background:var(--piai-bg);
  border-left:5px solid var(--piai-primary);
  padding:12px 18px;
  border-radius:0 8px 8px 0;
  transition: box-shadow .25s ease, border-color .25s ease;
}
.piai-def:hover{
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.piai-def-title{
  color:var(--piai-primary);
  font-weight:700;
  display:flex;
  align-items:center;
  gap:10px;
  line-height:1.25;
  margin-bottom:6px;
}
.piai-def-title svg{display:block;flex:0 0 auto}
.piai-def-content{line-height:1.5;font-size:.95rem}
.piai-grid{display:flex;flex:1;min-height:0}
.piai-grid>*{margin-right:20px}
.piai-grid>*:last-child{margin-right:0}
.piai-list{
  flex:1;
  display:flex;
  flex-direction:column;
  overflow-y:auto;
  overflow-x:hidden;
  scrollbar-gutter: stable;
  position:relative;
  list-style:none;
  padding-right:26px;
  padding-left:6px;
  min-height:0;
}
.piai-list-item{
  position:relative;
  z-index:0;
  display:flex;
  align-items:center;
  gap:12px;
  padding:12px 16px;
  margin-bottom:8px;
  background:var(--piai-bg);
  border:1px solid transparent;
  border-radius:10px;
  background-clip:padding-box;
  box-shadow: inset 0 0 0 1px var(--piai-text-light);
  font-size:.9rem;
  line-height:1.45;
  transition: box-shadow .18s ease;
}
.piai-list-item:last-child{margin-bottom:0}
.piai-list-item:hover{
  box-shadow: inset 0 0 0 2px var(--piai-accent), 0 2px 8px rgba(0,0,0,0.08);
}
.piai-list-item .piai-ico{
  color:var(--piai-accent);
  width:24px;height:24px;
  flex:0 0 24px;
  display:flex;
  align-items:center;
  justify-content:center;
}
.piai-list-item .piai-ico svg{
  width:22px;height:22px;display:block;
  transition: transform .18s ease;
}
.piai-list-item:hover .piai-ico svg{
  transform: scale(1.22) rotate(8deg);
}
.piai-list-item>div{flex:1;min-width:0;word-wrap:break-word}
.piai-list-item strong{color:var(--piai-primary)}
.piai-visual{flex:0 0 280px;display:flex;align-items:center;justify-content:center}
.piai-visual svg{max-width:100%;max-height:100%}
.hdr-btn{
  position:absolute;
  top:50%;
  transform:translateY(-50%);
  z-index:999;
  width:48px;height:48px;
  background:transparent;
  border:none;
  cursor:pointer;
  color:var(--piai-accent);
  display:flex;
  align-items:center;
  justify-content:center;
  transition: color .2s ease;
}
.hdr-btn:hover{color:#fff;}
.hdr-btn svg{
  width:26px;height:26px;display:block;
  transition: transform .2s ease;
}
.hdr-btn:hover svg{transform: scale(1.1);}
.fs-btn{right:0}
.theme-btn{right:58px}
.piai-loader{
  position:absolute;inset:0;
  background:rgba(0,0,0,0.2);
  display:flex;align-items:center;justify-content:center;
  z-index:1000;
  backdrop-filter:blur(4px);
  -webkit-backdrop-filter:blur(4px);
  transition:opacity .3s ease,visibility .3s ease;
}
.piai-loader.hide{opacity:0;visibility:hidden}
.piai-loader .loader-inner{
  padding:14px 28px;border-radius:30px;
  background:rgba(255,255,255,0.85);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,0.5);
  box-shadow:0 8px 32px 0 rgba(31,38,135,0.15);
  display:flex;align-items:center;gap:12px;
}
.spinner{
  width:24px;height:24px;border:3px solid transparent;border-top-color:var(--piai-primary,#007bff);border-right-color:var(--piai-primary,#007bff);border-radius:50%;animation:spin .8s linear infinite;
}
.loader-text{font-size:.9rem;font-weight:600;color:#333}
@keyframes spin{to{transform:rotate(360deg)}}
.piai-fit-noscroll .piai-body{ overflow:hidden !important; }
.piai-fit-noscroll .piai-def{ margin-bottom: 8px !important; }
.piai-fit-noscroll .piai-def-title{ font-size: 14px !important; }
.piai-fit-noscroll .piai-def-content{ font-size: 13px !important; line-height: 1.25 !important; }
.piai-fit-noscroll .piai-grid{
  display:flex !important;
  gap: 12px !important;
  align-items: stretch !important;
  overflow: hidden !important;
  min-height: 0 !important;
  flex: 1 1 auto !important;
}
.piai-fit-noscroll .piai-grid>*{ margin-right: 0 !important; }
.piai-fit-noscroll .piai-list{
  flex: 1 1 auto !important;
  min-width: 0 !important;
  overflow: hidden !important;
  padding-right: 0 !important;
}
.piai-fit-noscroll .piai-list-item{
  padding: 9px 11px !important;
  margin: 0 0 8px 0 !important;
}
.piai-fit-noscroll .piai-list-item > div{
  min-width: 0;
  font-size: 13px !important;
  line-height: 1.25 !important;
}
.piai-fit-noscroll .piai-list-item strong{
  display:inline-block;
  margin-bottom: 2px;
}
.piai-fit-noscroll .piai-visual{
  width: 270px;
  max-width: 270px;
  overflow: hidden;
  flex: 0 0 auto;
}
.piai-fit-noscroll .piai-visual svg{
  width:100%;
  height:auto;
  display:block;
}
.MathJax,
.MathJax_Display,
.MathJax svg,
mjx-container,
mjx-container svg {
  image-rendering: -webkit-optimize-contrast;
  -webkit-font-smoothing: antialiased;
  shape-rendering: geometricPrecision;
  text-rendering: geometricPrecision;
}
.MathJax,
mjx-container {
  transform: none !important;
  backface-visibility: visible !important;
}
@media (max-width:650px){
  .piai-grid{flex-direction:column}
  .piai-grid>*{margin-right:0;margin-bottom:16px}
  .piai-grid>*:last-child{margin-bottom:0}
  .piai-visual{flex:0 0 auto;padding:10px;width:100%}
  .piai-hdr{padding:10px 16px;padding-right:130px}
  .piai-fit-noscroll .piai-visual{
    width: 100%;
    max-width: 100%;
  }
}`;
  }

  function buildHtmlDocument(content, baseCss, headExtra) {
    if (!content) return '';
    const hasDocType = /<!doctype html/i.test(content);
    const cssTag = baseCss ? `<style>${baseCss}</style>` : '';
    const extra = headExtra || '';
    const inject = `${cssTag}${extra}`;
    if (hasDocType) {
      if (inject) {
        if (content.includes('</head>')) return content.replace('</head>', inject + '</head>');
        if (/<head[^>]*>/i.test(content)) return content.replace(/<head([^>]*)>/i, `<head$1>${inject}`);
        return inject + content;
      }
      return content;
    }
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  ${inject}
</head>
<body>
${content}
</body>
</html>`;
  }

  function createBaseStyle(theme, aspect) {
    const borderCol = (theme.primary || '#800020') + '26';
    return {
      default: `width:100%;max-width:100%;display:block;position:relative;box-sizing:border-box;aspect-ratio:${aspect};height:auto;border-radius:${BASE_RADIUS}px;border:1px solid ${borderCol};overflow:hidden;background:transparent;`,
      fullscreen: `position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;box-sizing:border-box;margin:0;border-radius:0;z-index:99999;background:#000;border:none;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)`,
    };
  }

  // ============================================================
  // 3) RENDER (UPDATE ĐỂ HỖ TRỢ SRC EXTERNAL)
  // ============================================================
  function render(options) {
    const config = Object.assign({}, DEFAULT_CONFIG, options || {});
    const {
      id,
      container: containerFromConfig,
      width,
      height,
      aspect,
      themeName,
      theme: themeOverride,
      html,
      htmlGenerator,
      src, // NEW
      headExtra,
      onReady,
      onThemeChange,
      fitMode,
    } = config;

    const container = containerFromConfig || (typeof id === 'string' ? document.getElementById(id) : null);
    if (!container) return;

    // cleanup cũ
    if (typeof container.__piaiCleanup === 'function') {
      try { container.__piaiCleanup(); } catch (_) {}
    }

    const containerId = container.id || 'piai_' + Date.now();
    container.id = containerId;

    const { isIOS, isAndroid, isMobile } = detectDevice();

    let currentTheme = themeOverride || getThemeByName(themeName);
    let currentThemeName = currentTheme.name || themeName || DEFAULT_CONFIG.themeName;

    let baseCss = getBaseCss(currentTheme);
    let baseStyle = createBaseStyle(currentTheme, aspect);

    // reset DOM
    while (container.firstChild) container.removeChild(container.firstChild);
    container.style.cssText = baseStyle.default;

    // wrapper cho scale
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position:absolute;top:0;left:0;width:${width}px;height:${height}px;transform-origin:0 0;`;

    let iframe = document.createElement('iframe');
    iframe.style.cssText = `width:100%;height:100%;border:none;display:block;background:${currentTheme.bg || '#f9f7f5'};`;
    iframe.scrolling = 'no';
    iframe.allow = 'fullscreen; autoplay; encrypted-media; clipboard-write';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-modals';

    let iframeSrc = null;
    let iosStandaloneUrl = '';

    if (src) {
      // EXTERNAL SRC (React game) → real origin for stable postMessage
      iframe.src = src;
      iframeSrc = src;
    } else {
      // INLINE SRCDOC (Đua Xe) → srcdoc blob
      const generator = typeof htmlGenerator === 'function' ? htmlGenerator : () => html || '';
      const ctxBase = { id: containerId, embedId: containerId, width, height, aspect, theme: currentTheme, themeName: currentThemeName, baseCss, isIOS, isStandalone: false };
      const iframeRaw = generator(ctxBase);
      const iframeHtml = buildHtmlDocument(iframeRaw, baseCss, headExtra || '');
      const blob = new Blob([iframeHtml], { type: 'text/html' });
      iframeSrc = URL.createObjectURL(blob);
      iframe.src = iframeSrc;

      // iOS standalone (giữ nguyên)
      if (isIOS) {
        const standaloneRaw = generator(Object.assign({}, ctxBase, { isStandalone: true }));
        if (standaloneRaw) {
          const standaloneHtml = buildHtmlDocument(standaloneRaw, baseCss, headExtra || '');
          try {
            iosStandaloneUrl = URL.createObjectURL(new Blob([standaloneHtml], { type: 'text/html' }));
          } catch (e) {}
        }
        if (iosStandaloneUrl) iframe.dataset.iosStandaloneUrl = iosStandaloneUrl;
      }
    }

    iframe.onload = function () {
      if (!src) try { URL.revokeObjectURL(iframeSrc); } catch (_) {}
      // gửi theme message (cho cả 2 mode)
      try {
        iframe.contentWindow.postMessage(
          { type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme },
          '*'
        );
      } catch (_) {}
      if (typeof onReady === 'function') {
        try { onReady(iframe, { id: containerId, themeName: currentThemeName, theme: currentTheme }); }
        catch (err) { console.error('PiaiEmbed onReady error:', err); }
      }
    };

    let isFull = false;
    let resizeRAF = null;

    const updateScale = () => {
      const rect = container.getBoundingClientRect();
      const cw = rect.width || container.clientWidth || width;
      const ch = rect.height || container.clientHeight || height;
      if (isFull) {
        let scale = Math.min(cw / width, ch / height);
        if (!Number.isFinite(scale) || scale <= 0) scale = 1;
        const roundedScale = Math.floor(scale * 1000) / 1000 || 1;
        const scaledW = width * roundedScale;
        const scaledH = height * roundedScale;
        const dx = Math.round((cw - scaledW) / 2);
        const dy = Math.round((ch - scaledH) / 2);
        wrapper.style.transform = `translate(${dx}px, ${dy}px) scale(${roundedScale})`;
        return;
      }
      let scale = cw / width;
      if (!Number.isFinite(scale) || scale <= 0) scale = 1;
      let roundedScale = Math.round(scale * 1000) / 1000 || 1;
      if (isAndroid && isMobile) {
        const idealH = (height / width) * cw;
        const underUnderW = (width * roundedScale) < (cw - 0.5);
        const underH = (height * roundedScale) < (idealH - 0.5);
        if (underW || underH) {
          roundedScale = Math.ceil(scale * 1000) / 1000 || 1;
        }
        wrapper.style.transform = `scale(${roundedScale})`;
        container.style.height = `${Math.round(height * roundedScale)}px`;
      } else {
        wrapper.style.transform = `scale(${roundedScale})`;
        container.style.height = `${cw * (height / width)}px`;
      }
    };

    const setFullscreen = (state) => {
      isFull = state;
      container.style.cssText = state ? baseStyle.fullscreen : baseStyle.default;
      requestAnimationFrame(updateScale);
      try {
        iframe.contentWindow.postMessage(
          { type: 'fullscreenState', id: containerId, isFullscreen: state },
          '*'
        );
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
      iframe.style.background = currentTheme.bg || '#f9f7f5';
      updateScale();
      try {
        iframe.contentWindow.postMessage(
          { type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme },
          '*'
        );
      } catch (_) {}
      if (typeof onThemeChange === 'function') {
        try { onThemeChange(currentThemeName, currentTheme); } catch (err) {}
      }
    };

    // EVENTS + CLEANUP (giữ nguyên)
    const onMessage = (e) => {
      if (!e.data || e.data.id !== containerId) return;
      if (e.data.type === 'toggleFullscreen') {
        if (isIOS) return;
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else if (isFull) {
          setFullscreen(false);
        } else if (container.requestFullscreen) {
          container.requestFullscreen().then(() => setFullscreen(true)).catch(() => setFullscreen(true));
        } else {
          setFullscreen(true);
        }
        return;
      }
      if (e.data.type === 'switchTheme') {
        switchTheme();
        return;
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
      try { if (iosStandaloneUrl) URL.revokeObjectURL(iosStandaloneUrl); } catch (_) {}
      try { observer.disconnect(); } catch (_) {}
    }
    container.__piaiCleanup = cleanup;

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
    updateScale();
  }

  // EXPORT
  global.PiaiEmbed = {
    version: '3.6.0',
    render,
    themes: THEMES,
    getThemeByName,
    getBaseCss,
    defaults: DEFAULT_CONFIG,
  };
})(window);
