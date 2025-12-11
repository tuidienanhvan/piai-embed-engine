// piai-embed-engine.js
// Phiên bản 2025 v3.2 – Theme & CSS centralized + system font stack + loader UX
// FIX: Overflow issues with flex shrink + min-width:0
// API: PiaiEmbed.render({ id, container, width, height, aspect, themeName, theme, html, htmlGenerator, headExtra })

(function (global) {
  'use strict';

  // ============================================================
  // 1. THEMES, DEFAULTS & FONT STACK
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
  };

  const SYSTEM_FONT_STACK =
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,' +
    '"Helvetica Neue",Arial,"Noto Sans",sans-serif,' +
    '"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';

  const BASE_RADIUS = 16;

  // ============================================================
  // 2. HELPERS
  // ============================================================
  function detectDevice() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isMobile = isIOS || /Mobi|Android/i.test(ua);
    return { isIOS, isMobile };
  }

  function getThemeByName(name) {
    return THEMES[name] || THEMES[DEFAULT_CONFIG.themeName];
  }

  // Base CSS - FIX: Added min-width:0, flex shrink for overflow prevention
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
*{margin:0;padding:0;box-sizing:border-box}
body{
  font-family:${SYSTEM_FONT_STACK};
  color:var(--piai-text);
  background:transparent;
  overflow:hidden;
  width:100%;
  height:100%;
}
.piai-wrap{
  width:100%;
  height:100%;
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
  padding:15px 20px;
  overflow-y:auto;
  overflow-x:hidden;
  display:flex;
  flex-direction:column;
  min-width:0;
  max-width:100%;
}
.piai-body>*{margin-bottom:15px;min-width:0;max-width:100%}
.piai-body>*:last-child{margin-bottom:0}
.piai-body::-webkit-scrollbar{width:6px}
.piai-body::-webkit-scrollbar-thumb{
  background:var(--piai-text-light);
  border-radius:3px;
}
.piai-def{
  background:var(--piai-bg);
  border-left:5px solid var(--piai-primary);
  padding:12px 18px;
  box-shadow:0 4px 10px rgba(0,0,0,0.05);
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
.piai-def-title>*{margin-right:8px}
.piai-def-title>*:last-child{margin-right:0}
.piai-def-content{
  line-height:1.5;
  font-size:0.95rem;
}
.piai-grid{
  display:flex;
  flex:1;
  min-height:0;
  overflow:visible;
}
.piai-grid>*{flex:1;min-width:0;margin-right:20px}
.piai-grid>*:last-child{margin-right:0}
.piai-list{
  flex:1;
  display:flex;
  flex-direction:column;
  overflow-y:auto;
  overflow-x:hidden;
  list-style:none;
  padding-left:6px;
  padding-right:4px;
  min-width:0;
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
.piai-list-item:hover{
  transform:translateX(-4px);
  border-color:var(--piai-accent);
}
.piai-list-item>*{margin-right:12px}
.piai-list-item>*:last-child{margin-right:0}
.piai-list-item .piai-ico{
  color:var(--piai-accent);
  display:flex;
  margin-top:2px;
  transition:all 0.3s;
}
.piai-list-item:hover .piai-ico{
  transform:scale(1.15) rotate(8deg);
}
.piai-list-item>div{
  flex:1;
  min-width:0;
  word-wrap:break-word;
  overflow-wrap:break-word;
}
.piai-list-item strong{color:var(--piai-primary)}
.piai-visual{
  flex:0 1 280px;
  display:flex;
  align-items:center;
  justify-content:center;
  min-width:0;
  max-width:100%;
}
.piai-visual svg{
  max-width:100%;
  max-height:100%;
  width:auto;
  height:auto;
}
.hdr-btn{
  position:absolute;
  top:0;
  z-index:999;
  width:48px;
  height:48px;
  background:transparent;
  border:none;
  cursor:pointer;
  color:var(--piai-accent);
  display:flex;
  align-items:center;
  justify-content:center;
  transition:all 0.2s;
}
.hdr-btn:hover{
  color:#fff;
  transform:scale(1.1);
}
.hdr-btn svg{width:22px;height:22px}
.theme-btn{right:24px}
.fs-btn{right:0}
.piai-loader{
  position:absolute;
  inset:0;
  background:var(--piai-primary);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:1000;
  backdrop-filter:blur(2px);
  transition:opacity 0.3s ease,visibility 0.3s ease;
}
.piai-loader.hide{
  opacity:0;
  visibility:hidden;
  pointer-events:none;
}
.piai-loader .loader-inner{
  min-width:160px;
  padding:10px 16px;
  border-radius:999px;
  background:var(--piai-bg);
  border:1px solid var(--piai-text-light);
  box-shadow:0 6px 18px rgba(0,0,0,0.08);
  display:flex;
  align-items:center;
  gap:10px;
}
.spinner{
  width:22px;
  height:22px;
  border:3px solid var(--piai-text-light);
  border-top-color:var(--piai-primary);
  border-radius:50%;
  animation:spin 0.8s linear infinite;
}
.loader-text{
  font-size:0.85rem;
  color:var(--piai-text-light);
}
@keyframes spin{to{transform:rotate(360deg)}}
@media (max-width:800px){
  .piai-visual{
    flex:0 1 200px;
    max-width:200px;
  }
  .piai-visual svg{
    max-width:200px;
  }
}
@media (max-width:650px){
  .piai-grid{flex-direction:column}
  .piai-grid>*{margin-right:0;margin-bottom:16px}
  .piai-grid>*:last-child{margin-bottom:0}
  .piai-visual{
    flex:0 0 auto;
    padding:10px;
    width:100%;
    max-width:100%;
  }
  .piai-visual svg{
    max-width:280px;
    margin:0 auto;
  }
  .piai-hdr{padding:10px 16px;padding-right:100px}
  .piai-body{padding:12px 16px}
}
`;
  }

  function buildHtmlDocument(content, baseCss, headExtra) {
    if (!content) return '';

    const hasDocType = /<!doctype html/i.test(content);
    const cssTag = baseCss ? `<style>${baseCss}</style>` : '';
    const extra = headExtra || '';

    if (hasDocType) {
      if (baseCss) {
        if (content.includes('</head>')) {
          const inject = `${cssTag}${extra}`;
          return content.replace('</head>', inject + '</head>');
        }
      }
      return content;
    }

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  ${cssTag}
  ${extra}
</head>
<body>
${content}
</body>
</html>`;
  }

  function createBaseStyle(theme, width, height, aspect) {
    return {
      default:
        `width:${width}px;max-width:100%;height:${height}px;` +
        `margin:20px auto;display:flex;justify-content:center;align-items:center;` +
        `position:relative;border-radius:${BASE_RADIUS}px;` +
        `border:1px solid ${(theme.primary || '#800020')}26;` +
        `box-shadow:0 10px 30px ${(theme.secondary || '#002b5c')}26;` +
        `overflow:hidden;background:${theme.bg || '#f9f7f5'};aspect-ratio:${aspect}`,
      fullscreen:
        `position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;` +
        `margin:0;border-radius:0;z-index:99999;background:#000;border:none;` +
        `box-shadow:none;display:flex;justify-content:center;align-items:center;` +
        `overflow:hidden;` +
        `padding:env(safe-area-inset-top) env(safe-area-inset-right) ` +
        `env(safe-area-inset-bottom) env(safe-area-inset-left)`,
    };
  }

  // ============================================================
  // 3. CORE RENDER FUNCTION
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
      headExtra,
      onReady,
      onThemeChange,
    } = config;

    const container =
      containerFromConfig ||
      (typeof id === 'string' ? document.getElementById(id) : null);

    if (!container) return;

    const containerId =
      container.id || (typeof id === 'string' ? id : 'piai_' + Date.now());
    container.id = containerId;

    const deviceInfo = detectDevice();
    const isIOS = deviceInfo.isIOS;
    const isMobile = deviceInfo.isMobile;

    let currentTheme = themeOverride || getThemeByName(themeName);
    let currentThemeName = currentTheme.name || themeName || DEFAULT_CONFIG.themeName;

    let baseCss = getBaseCss(currentTheme);
    let baseStyle = createBaseStyle(currentTheme, width, height, aspect);

    container.style.cssText = baseStyle.default;

    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      `width:100%;max-width:${width}px;height:${height}px;position:relative;` +
      `transform-origin:center;transition:transform .3s ease;flex-shrink:0;margin:0 auto`;

    const generator =
      typeof htmlGenerator === 'function' ? htmlGenerator : () => html;

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

    const iframeRaw = generator(
      Object.assign({}, ctxBase, { isStandalone: false })
    );
    if (!iframeRaw) return;

    const iframeHtml = buildHtmlDocument(iframeRaw, baseCss, headExtra);

    let standaloneHtml = null;
    let iosStandaloneUrl = '';

    if (isIOS) {
      const standaloneRaw = generator(
        Object.assign({}, ctxBase, { isStandalone: true })
      );
      if (standaloneRaw) {
        standaloneHtml = buildHtmlDocument(
          standaloneRaw,
          baseCss,
          headExtra
        );
        try {
          const blobStandalone = new Blob([standaloneHtml], {
            type: 'text/html',
          });
          iosStandaloneUrl = URL.createObjectURL(blobStandalone);
        } catch (e) {
          console.error('PiaiEmbed: standalone blob error', e);
        }
      }
    }

    const blob = new Blob([iframeHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.src = blobUrl;
    iframe.style.cssText =
      'width:100%;height:100%;border:none;border-radius:' +
      BASE_RADIUS +
      'px;background:#fff';
    iframe.scrolling = 'no';
    iframe.loading = 'lazy';
    iframe.sandbox =
      'allow-scripts allow-same-origin allow-modals allow-popups';
    iframe.allow = 'fullscreen';
    if (iosStandaloneUrl) iframe.dataset.iosStandaloneUrl = iosStandaloneUrl;

    iframe.onload = function () {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (_) {}

      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: 'piaiApplyTheme',
              id: containerId,
              themeName: currentThemeName,
              theme: currentTheme,
            },
            '*'
          );
        }
      } catch (_) {}

      if (typeof onReady === 'function') {
        try {
          onReady(iframe, {
            id: containerId,
            themeName: currentThemeName,
            theme: currentTheme,
          });
        } catch (err) {
          console.error('PiaiEmbed onReady callback error:', err);
        }
      }
    };

    let isFull = false;
    let resizeRAF = null;

    const updateScale = () => {
      if (isFull) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let scaleFull = Math.min(vw / width, vh / height);
        if (!Number.isFinite(scaleFull) || scaleFull <= 0) scaleFull = 1;
        wrapper.style.transform = 'scale(' + scaleFull + ')';
        container.style.height = vh + 'px';
        return;
      }

      if (!isMobile) {
        wrapper.style.transform = 'scale(1)';
        container.style.height = height + 'px';
        return;
      }

      const rect = container.getBoundingClientRect();
      const availableWidth = rect.width || window.innerWidth;
      const availableHeight = Math.max(window.innerHeight - rect.top - 24, 0);

      let scale = availableWidth > 0 ? availableWidth / width : 1;
      if (availableHeight > 0) scale = Math.min(scale, availableHeight / height);
      scale = Math.min(scale, 1);
      if (!Number.isFinite(scale) || scale <= 0) scale = 1;

      wrapper.style.transform = 'scale(' + scale + ')';
      container.style.height = height * scale + 'px';
    };

    const setFullscreen = (state) => {
      isFull = state;
      container.style.cssText = state ? baseStyle.fullscreen : baseStyle.default;
      iframe.style.boxShadow = state ? '0 0 60px rgba(0,0,0,.4)' : 'none';
      iframe.style.borderRadius = state ? '0' : BASE_RADIUS + 'px';

      updateScale();
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            { type: 'fullscreenState', id: containerId, isFullscreen: state },
            '*'
          );
        }
      } catch (_) {}
    };

    const switchTheme = () => {
      let idx = THEME_ORDER.indexOf(currentThemeName);
      if (idx < 0) idx = 0;
      const nextName = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
      currentThemeName = nextName;
      currentTheme = getThemeByName(nextName);

      baseCss = getBaseCss(currentTheme);
      baseStyle = createBaseStyle(currentTheme, width, height, aspect);

      if (isFull) {
        container.style.cssText = baseStyle.fullscreen;
      } else {
        container.style.cssText = baseStyle.default;
      }

      iframe.style.boxShadow = isFull ? '0 0 60px rgba(0,0,0,.4)' : 'none';
      iframe.style.borderRadius = isFull ? '0' : BASE_RADIUS + 'px';

      updateScale();

      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: 'piaiApplyTheme',
              id: containerId,
              themeName: currentThemeName,
              theme: currentTheme,
            },
            '*'
          );
        }
      } catch (_) {}

      if (typeof onThemeChange === 'function') {
        try {
          onThemeChange(currentThemeName, currentTheme);
        } catch (err) {
          console.error('PiaiEmbed onThemeChange callback error:', err);
        }
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
          container
            .requestFullscreen()
            .then(function () {
              setFullscreen(true);
            })
            .catch(function () {
              setFullscreen(true);
            });
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
      if (document.fullscreenElement === container) {
        setFullscreen(true);
      } else if (isFull && !document.fullscreenElement) {
        setFullscreen(false);
      }
    };

    const onKeydown = (e) => {
      if (e.key === 'Escape' && isFull && !document.fullscreenElement) {
        setFullscreen(false);
      }
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
          if (
            node === container ||
            (node.contains && node.contains(container))
          ) {
            window.removeEventListener('message', onMessage);
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('keydown', onKeydown);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
            observer.disconnect();
            try {
              if (iosStandaloneUrl) URL.revokeObjectURL(iosStandaloneUrl);
            } catch (_) {}
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
    updateScale();
  }

  // ============================================================
  // 4. EXPORT
  // ============================================================
  const api = {
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

  global.PiaiEmbed = api;
})(window);
