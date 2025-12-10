// piai-embed-engine.js
// Phiên bản 2025 v3 – Theme & CSS centralized + system font stack
// Giữ nguyên: fullscreen desktop, iOS standalone (mở trang mới), scale mượt, không memory leak
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
      text: '#1a1a1a',
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
    themeName: 'classic', // hoặc truyền theme object trực tiếp
    headExtra: '',        // thêm script/meta/link vào <head> nếu cần
  };

  const SYSTEM_FONT_STACK =
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,' +
    '"Helvetica Neue",Arial,"Noto Sans",sans-serif,' +
    '"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';

  // bo góc gốc, sẽ scale theo kích thước
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

  // Base CSS cho mọi embed – dùng class .piai-*
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
}
.piai-body>*{margin-bottom:15px}
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
}
.piai-grid>*{margin-right:20px}
.piai-grid>*:last-child{margin-right:0}
.piai-list{
  flex:1;
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
}
.piai-list-item strong{color:var(--piai-primary)}
.piai-visual{
  flex:0 0 280px;
  display:flex;
  align-items:center;
  justify-content:center;
}
.piai-visual svg{
  max-width:100%;
  max-height:100%;
}
/* Header buttons */
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
/* Loader */
.piai-loader{
  position:absolute;
  inset:0;
  background:var(--piai-bg);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:100;
  transition:opacity 0.3s;
}
.piai-loader.hide{
  opacity:0;
  pointer-events:none;
}
.spinner{
  width:32px;
  height:32px;
  border:3px solid var(--piai-text-light);
  border-top-color:var(--piai-primary);
  border-radius:50%;
  animation:spin 0.8s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}
/* Responsive */
@media (max-width:650px){
  .piai-grid{flex-direction:column}
  .piai-grid>*{
    margin-right:0;
    margin-bottom:16px;
  }
  .piai-grid>*:last-child{margin-bottom:0}
  .piai-visual{
    flex:0 0 auto;
    padding:10px;
    width:100%;
  }
  .piai-hdr{
    padding:10px 16px;
    padding-right:100px;
  }
}
`;
  }

  /**
   * Nếu content đã là full HTML (có <!DOCTYPE html>), engine sẽ inject
   *   - baseCss
   *   - headExtra
   * vào trước </head>.
   * Nếu chỉ là fragment, engine wrap thành full document.
   */
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

    // Fragment -> wrap
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
    } = config;

    const container =
      containerFromConfig ||
      (typeof id === 'string' ? document.getElementById(id) : null);

    if (!container) return;

    const containerId =
      container.id || (typeof id === 'string' ? id : 'piai_' + Date.now());
    container.id = containerId;

    const { isIOS, isMobile } = detectDevice();
    const theme = themeOverride || getThemeByName(themeName);
    const baseCss = getBaseCss(theme);

    // Style chính – giống bản sạch: có max-width, aspect-ratio, bg theo theme
    const baseStyle = {
      default:
        `width:${width}px;max-width:100%;height:${height}px;` +
        `margin:20px auto;display:flex;justify-content:center;align-items:center;` +
        `position:relative;border-radius:${BASE_RADIUS}px;` +
        `border:1px solid ${(theme.primary || '#800020')}26;` +
        `box-shadow:0 10px 30px ${(theme.navy || theme.secondary || '#002b5c')}26;` +
        `overflow:hidden;background:${theme.bg || '#f9f7f5'};aspect-ratio:${aspect}`,
      fullscreen:
        `position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;` +
        `margin:0;border-radius:0;z-index:99999;background:#000;border:none;` +
        `box-shadow:none;display:flex;justify-content:center;align-items:center;` +
        `overflow:hidden;` +
        `padding:env(safe-area-inset-top) env(safe-area-inset-right) ` +
        `env(safe-area-inset-bottom) env(safe-area-inset-left)`,
    };

    container.style.cssText = baseStyle.default;

    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      `width:${width}px;height:${height}px;position:relative;` +
      `transform-origin:center;transition:transform .3s ease;flex-shrink:0`;

    // ------------------------------------------------------------
    // 3.1. Generate HTML (iframe + iOS standalone)
    // ------------------------------------------------------------
    const generator =
      typeof htmlGenerator === 'function' ? htmlGenerator : () => html;

    const ctxBase = {
      id: containerId,
      embedId: containerId,
      width,
      height,
      aspect,
      theme,
      themeName: theme.name,
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

    // ------------------------------------------------------------
    // 3.2. Blob & iframe
    // ------------------------------------------------------------
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
      'allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-popups';
    iframe.allow = 'fullscreen; clipboard-read; clipboard-write';
    if (iosStandaloneUrl) iframe.dataset.iosStandaloneUrl = iosStandaloneUrl;

    iframe.onload = function () {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (_) {}
    };

    // ============================================================
    // 4. FULLSCREEN & SCALING
    // ============================================================
    let isFull = false;
    let resizeRAF = null;

    const updateScale = () => {
      if (isFull) {
        // Giống bản sạch: fullscreen scale
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let scaleFull = Math.min(vw / width, vh / height);
        if (!Number.isFinite(scaleFull) || scaleFull <= 0) scaleFull = 1;
        wrapper.style.transform = 'scale(' + scaleFull + ')';
        container.style.height = vh + 'px';
        return;
      }

      if (!isMobile) {
        // Desktop: giữ kích thước gốc
        wrapper.style.transform = 'scale(1)';
        container.style.height = height + 'px';
        return;
      }

      // Mobile: scale để full width mà không bé xíu
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
        iframe.contentWindow &&
          iframe.contentWindow.postMessage(
            { type: 'fullscreenState', id: containerId, isFullscreen: state },
            '*'
          );
      } catch (_) {}
    };

    // ============================================================
    // 5. EVENTS
    // ============================================================
    const onMessage = (e) => {
      if (!e.data || e.data.id !== containerId) return;
      if (e.data.type === 'toggleFullscreen') {
        // iOS: KHÔNG giả lập fullscreen CSS
        // logic mở tab mới nằm trong script bên trong iframe,
        // đọc window.frameElement.dataset.iosStandaloneUrl
        if (detectDevice().isIOS) return;

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
              setFullscreen(true); // fallback CSS full nếu FS API fail
            });
        } else {
          setFullscreen(true);
        }
      }
    };

    const onFullscreenChange = () => {
      if (detectDevice().isIOS) return;
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

    // Cleanup khi element bị xóa
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

    // Mount
    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
    updateScale();
  }

  // ============================================================
  // 6. EXPORT
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
