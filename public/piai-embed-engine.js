// piai-embed-engine.js
// v3.3.0 – Container full width (100%), keep 16:9, scale canvas to fill container
// Giữ nguyên: fullscreen desktop, iOS standalone (mở tab), không memory leak

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
    width: 800,   // design canvas
    height: 450,  // design canvas
    aspect: '16 / 9',
    themeName: 'classic',
    headExtra: '',
  };

  const SYSTEM_FONT_STACK =
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,' +
    '"Helvetica Neue",Arial,"Noto Sans",sans-serif,' +
    '"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';

  const BASE_RADIUS = 16;

  function detectDevice() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isMobile = isIOS || /Mobi|Android/i.test(ua);
    return { isIOS, isMobile };
  }

  function getThemeByName(name) {
    return THEMES[name] || THEMES[DEFAULT_CONFIG.themeName];
  }

  function getBaseCss(theme) {
    return `
:root{
  --piai-primary:${theme.primary};
  --piai-accent:${theme.accent};
  --piai-secondary:${theme.secondary};
  --piai-bg:${theme.bg};
  --piai-text:${theme.text};
  --piai-text-light:${theme.textLight};
}
html,body{width:100%;height:100%}
*{margin:0;padding:0;box-sizing:border-box}
body{
  font-family:${SYSTEM_FONT_STACK};
  color:var(--piai-text);
  background:var(--piai-bg);
  overflow:hidden;
}
.piai-wrap{
  width:100%;
  height:100%;
  min-height:100%;
  background:var(--piai-bg);
  display:flex;
  flex-direction:column;
  overflow:hidden;
  position:relative;
}
.piai-wrap,.piai-hdr,.piai-def,.piai-list-item,.piai-body{
  transition:background-color .25s ease,color .25s ease,border-color .25s ease,box-shadow .25s ease;
}
.piai-hdr{
  background:var(--piai-primary);
  color:#fff;
  padding:12px 20px;
  padding-right:100px;
  font-weight:700;
  display:flex;
  align-items:center;
  border-bottom:3px solid var(--piai-accent);
  position:relative;
}
.piai-hdr>*{margin-right:10px}
.piai-hdr>*:last-child{margin-right:0}
.piai-hdr svg{width:20px;height:20px}
.piai-body{
  flex:1;
  min-height:0;
  padding:15px 20px;
  overflow-y:auto;
  overflow-x:hidden;
  display:flex;
  flex-direction:column;
}
.piai-body>*{margin-bottom:15px}
.piai-body>*:last-child{margin-bottom:0}
.piai-body::-webkit-scrollbar{width:6px}
.piai-body::-webkit-scrollbar-thumb{background:var(--piai-text-light);border-radius:3px}
.piai-def{
  background:var(--piai-bg);
  border-left:5px solid var(--piai-primary);
  padding:12px 18px;
  border-radius:0 8px 8px 0;
  transition:all 0.3s;
}
.piai-def:hover{transform:translateY(-2px)}
.piai-def-title{
  color:var(--piai-primary);
  font-weight:700;
  display:flex;
  align-items:center;
  margin-bottom:6px;
}
.piai-def-title>*{margin-right:12px}
.piai-def-title>*:last-child{margin-right:0}
.piai-def-content{line-height:1.5;font-size:0.95rem}
.piai-grid{display:flex;flex:1;min-height:0}
.piai-grid>*{margin-right:20px}
.piai-grid>*:last-child{margin-right:0}
.piai-list{
  flex:1;
  min-height:0;
  display:flex;
  flex-direction:column;
  overflow-y:auto;
  list-style:none;
  padding-left:6px;
  padding-right:4px;
}
.piai-list-item{
  display:flex;
  align-items:flex-start;
  padding:10px 14px;
  background:var(--piai-bg);
  border:1px solid var(--piai-text-light);
  border-radius:8px;
  font-size:0.9rem;
  transition:all 0.3s;
  margin-bottom:8px;
}
.piai-list-item:last-child{margin-bottom:0}
.piai-list-item:hover{transform:translateX(-4px);border-color:var(--piai-accent)}
.piai-list-item>*{margin-right:12px}
.piai-list-item>*:last-child{margin-right:0}
.piai-list-item .piai-ico{
  color:var(--piai-accent);
  display:flex;
  margin-top:2px;
  transition:all 0.3s;
}
.piai-list-item:hover .piai-ico{transform:scale(1.15) rotate(8deg)}
.piai-list-item>div{flex:1;min-width:0;word-wrap:break-word}
.piai-list-item strong{color:var(--piai-primary)}
.piai-visual{flex:0 0 280px;display:flex;align-items:center;justify-content:center}
.piai-visual svg{max-width:100%;max-height:100%}

/* Header buttons */
.hdr-btn{
  position:absolute;top:0;z-index:999;width:48px;height:48px;
  background:transparent;border:none;cursor:pointer;color:var(--piai-accent);
  display:flex;align-items:center;justify-content:center;transition:all 0.2s;
}
.hdr-btn:hover{color:#fff;transform:scale(1.1)}
.hdr-btn svg{width:22px;height:22px}
.theme-btn{right:24px}
.fs-btn{right:0}

/* Loader */
.piai-loader{
  position:absolute;inset:0;background:rgba(0,0,0,0.2);
  display:flex;align-items:center;justify-content:center;
  z-index:1000;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
  transition:opacity .3s ease,visibility .3s ease;
}
.piai-loader.hide{opacity:0;visibility:hidden}
.piai-loader .loader-inner{
  padding:14px 28px;border-radius:30px;background:rgba(255,255,255,0.85);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,0.5);
  box-shadow:0 8px 32px 0 rgba(31,38,135,0.15);
  display:flex;align-items:center;gap:12px;
}
.spinner{
  width:24px;height:24px;border:3px solid transparent;
  border-top-color:var(--piai-primary,#007bff);
  border-right-color:var(--piai-primary,#007bff);
  border-radius:50%;animation:spin .8s linear infinite;
}
.loader-text{font-size:.9rem;font-weight:600;color:#333}
@keyframes spin{to{transform:rotate(360deg)}}

@media (max-width:650px){
  .piai-grid{flex-direction:column}
  .piai-grid>*{margin-right:0;margin-bottom:16px}
  .piai-grid>*:last-child{margin-bottom:0}
  .piai-visual{flex:0 0 auto;padding:10px;width:100%}
  .piai-hdr{padding:10px 16px;padding-right:100px}
}
`;
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

  // IMPORTANT: default style = full width of parent, keep 16:9
  function createBaseStyle(theme, aspect) {
    const borderCol = (theme.primary || '#800020') + '26';
    const shadowCol = (theme.secondary || '#002b5c') + '26';

    return {
      default:
        `width:100%;max-width:100%;` +
        `aspect-ratio:${aspect};height:auto;` +
        `position:relative;overflow:hidden;` +
        `border-radius:${BASE_RADIUS}px;` +
        `border:1px solid ${borderCol};` +
        `background:${theme.bg || '#f9f7f5'};`,
      fullscreen:
        `position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;` +
        `margin:0;border-radius:0;z-index:99999;background:#000;border:none;` +
        `box-shadow:none;overflow:hidden;` +
        `padding:env(safe-area-inset-top) env(safe-area-inset-right) ` +
        `env(safe-area-inset-bottom) env(safe-area-inset-left)`,
    };
  }

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
      headExtra,
      onReady,
      onThemeChange,
    } = config;

    const container =
      containerFromConfig || (typeof id === 'string' ? document.getElementById(id) : null);
    if (!container) return;

    if (typeof container.__piaiCleanup === 'function') {
      try { container.__piaiCleanup(); } catch (_) {}
      container.__piaiCleanup = null;
    }

    const containerId = container.id || (typeof id === 'string' ? id : 'piai_' + Date.now());
    container.id = containerId;

    const { isIOS } = detectDevice();

    let currentTheme = themeOverride || getThemeByName(themeName);
    let currentThemeName = currentTheme.name || themeName || DEFAULT_CONFIG.themeName;

    let baseCss = getBaseCss(currentTheme);
    let baseStyle = createBaseStyle(currentTheme, aspect);

    while (container.firstChild) container.removeChild(container.firstChild);
    container.style.cssText = baseStyle.default;

    // wrapper = design canvas (800x450), scale to fill container
    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      `position:absolute;top:0;left:0;` +
      `width:${width}px;height:${height}px;` +
      `transform-origin:0 0;` +
      `will-change:transform;`;

    const generator = typeof htmlGenerator === 'function' ? htmlGenerator : () => html;

    const ctxBase = {
      id: containerId,
      embedId: containerId,
      width,
      height,
      aspect,
      theme: currentTheme,
      themeName: currentThemeName,
      baseCss,
      isIOS,
    };

    const iframeRaw = generator(Object.assign({}, ctxBase, { isStandalone: false }));
    if (!iframeRaw) return;

    const iframeHtml = buildHtmlDocument(iframeRaw, baseCss, headExtra);

    let iosStandaloneUrl = '';
    if (isIOS) {
      const standaloneRaw = generator(Object.assign({}, ctxBase, { isStandalone: true }));
      if (standaloneRaw) {
        const standaloneHtml = buildHtmlDocument(standaloneRaw, baseCss, headExtra);
        try {
          iosStandaloneUrl = URL.createObjectURL(new Blob([standaloneHtml], { type: 'text/html' }));
        } catch (e) {
          console.error('PiaiEmbed: standalone blob error', e);
        }
      }
    }

    const blobUrl = URL.createObjectURL(new Blob([iframeHtml], { type: 'text/html' }));

    const iframe = document.createElement('iframe');
    iframe.src = blobUrl;
    iframe.style.cssText = `width:100%;height:100%;border:none;display:block;` +
      `background:transparent;border-radius:${BASE_RADIUS}px;`;
    iframe.scrolling = 'no';
    iframe.loading = 'lazy';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-popups';
    iframe.allow = 'fullscreen; clipboard-read; clipboard-write';
    if (iosStandaloneUrl) iframe.dataset.iosStandaloneUrl = iosStandaloneUrl;

    iframe.onload = function () {
      try { URL.revokeObjectURL(blobUrl); } catch (_) {}

      // defensive: luôn phủ full + nền đúng theme (tránh override)
      try {
        const doc = iframe.contentDocument;
        if (doc && doc.documentElement && doc.body) {
          doc.documentElement.style.height = '100%';
          doc.body.style.height = '100%';
          doc.body.style.background = currentTheme.bg || '#f9f7f5';
        }
        iframe.style.background = currentTheme.bg || '#f9f7f5';
      } catch (_) {}

      try {
        iframe.contentWindow && iframe.contentWindow.postMessage(
          { type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme },
          '*'
        );
      } catch (_) {}

      if (typeof onReady === 'function') {
        try { onReady(iframe, { id: containerId, themeName: currentThemeName, theme: currentTheme }); }
        catch (err) { console.error('PiaiEmbed onReady callback error:', err); }
      }
    };

    // ===== Scale logic: fill width of container (no side gap) =====
    let isFull = false;
    let resizeRAF = null;

    const updateScale = () => {
      const cw = container.clientWidth || width;

      // normal mode: fill full width => scale = cw/width
      let scale = cw / width;

      if (isFull) {
        const vw = window.innerWidth || cw;
        const vh = window.innerHeight || (cw * (height / width));
        scale = Math.min(vw / width, vh / height);
      }

      if (!Number.isFinite(scale) || scale <= 0) scale = 1;

      wrapper.style.transform = `scale(${scale})`;

      // fallback nếu aspect-ratio bị ignore ở môi trường lạ:
      // giữ 16:9 theo cw
      if (!isFull) {
        container.style.height = `${cw * (height / width)}px`;
      }
    };

    const setFullscreen = (state) => {
      isFull = state;
      container.style.cssText = state ? baseStyle.fullscreen : baseStyle.default;

      iframe.style.boxShadow = state ? '0 0 60px rgba(0,0,0,.4)' : 'none';
      iframe.style.borderRadius = state ? '0' : BASE_RADIUS + 'px';

      updateScale();

      try {
        iframe.contentWindow && iframe.contentWindow.postMessage(
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
      updateScale();

      try {
        iframe.contentWindow && iframe.contentWindow.postMessage(
          { type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme },
          '*'
        );
      } catch (_) {}

      if (typeof onThemeChange === 'function') {
        try { onThemeChange(currentThemeName, currentTheme); }
        catch (err) { console.error('PiaiEmbed onThemeChange callback error:', err); }
      }
    };

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

  global.PiaiEmbed = {
    version: '3.3.0',
    render,
    themes: THEMES,
    getThemeByName,
    getBaseCss,
    defaults: {
      width: DEFAULT_CONFIG.width,
      height: DEFAULT_CONFIG.height,
      aspect: DEFAULT_CONFIG.aspect,
      themeName: DEFAULT_CONFIG.themeName,
    },
  };
})(window);
