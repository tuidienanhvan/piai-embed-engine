// piai-embed-engine.js
// v3.5.0 – FIX: logo positioning + text blur on hover/fullscreen
// Giữ: fullscreen desktop, iOS standalone (mở tab), scale mượt, không memory leak

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
    // 'scroll' (default) | 'no-scroll' | 'compact'
    fitMode: 'scroll',
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
    const isMobile = isIOS || /Mobi|Android/i.test(ua);
    return { isIOS, isMobile };
  }

  function getThemeByName(name) {
    return THEMES[name] || THEMES[DEFAULT_CONFIG.themeName];
  }

  function normalizeFitMode(mode) {
    const m = String(mode || '').toLowerCase().trim();
    if (m === 'no-scroll' || m === 'noscroll' || m === 'compact') return 'no-scroll';
    return 'scroll';
  }

  // Base CSS trong iframe
  // FIX 1: Logo positioning - đảm bảo nằm trong .piai-wrap với overflow visible cho logo
  // FIX 2: Text blur - loại bỏ transform trên text elements, dùng box-shadow thay vì transform cho hover
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
  /* FIX TEXT BLUR: Force better text rendering */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
.piai-wrap{
  width:100%;
  height:100%;
  background:var(--piai-bg);
  display:flex;
  flex-direction:column;
  overflow:hidden;
  position:relative;
  /* FIX TEXT BLUR: Isolation context để tránh blur từ parent transforms */
  isolation: isolate;
}

/* ========== HEADER (align icon + text) ========== */
.piai-hdr{
  background:var(--piai-primary);
  color:#fff;
  padding:12px 20px;
  padding-right:130px;
  font-weight:700;
  display:flex;
  align-items:center;
  gap:10px;
  line-height:1.2;
  border-bottom:3px solid var(--piai-accent);
  position:relative;
}
.piai-hdr svg{width:20px;height:20px;display:block;flex:0 0 auto}

/* Body */
.piai-body{
  flex:1;
  padding:15px 20px;
  overflow-y:auto;
  overflow-x:hidden;
  display:flex;
  flex-direction:column;
  min-height:0;
  /* FIX TEXT BLUR: Tạo stacking context riêng */
  position: relative;
  z-index: 1;
}
.piai-body>*{margin-bottom:15px}
.piai-body>*:last-child{margin-bottom:0}
.piai-body::-webkit-scrollbar{width:6px}
.piai-body::-webkit-scrollbar-thumb{
  background:var(--piai-text-light);
  border-radius:3px;
}

/* Def box - FIX: Loại bỏ transform, dùng box-shadow cho hover effect */
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

/* Grid */
.piai-grid{display:flex;flex:1;min-height:0}
.piai-grid>*{margin-right:20px}
.piai-grid>*:last-child{margin-right:0}

/* ========== LIST - FIX TEXT BLUR ========== */
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

/* Item: FIX - Loại bỏ transform, chỉ dùng box-shadow cho hover */
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

  /* FIX TEXT BLUR: Chỉ transition box-shadow, KHÔNG dùng transform */
  transition: box-shadow .18s ease;
  
  /* REMOVED: Những dòng này gây blur text khi scale
  transform:translateZ(0);
  backface-visibility:hidden;
  */
}
.piai-list-item:last-child{margin-bottom:0}
.piai-list-item:hover{
  box-shadow: inset 0 0 0 2px var(--piai-accent), 0 2px 8px rgba(0,0,0,0.08);
}

/* Icon trong list item - FIX: Transform chỉ cho icon SVG, không ảnh hưởng text */
.piai-list-item .piai-ico{
  color:var(--piai-accent);
  width:24px;height:24px;
  flex:0 0 24px;
  display:flex;
  align-items:center;
  justify-content:center;
  /* Icon có thể transform vì không chứa text */
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

/* Visual */
.piai-visual{flex:0 0 280px;display:flex;align-items:center;justify-content:center}
.piai-visual svg{max-width:100%;max-height:100%}

/* Header buttons */
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
.hdr-btn:hover{
  color:#fff;
}
/* Separate transform for button hover - icon only */
.hdr-btn svg{
  width:26px;height:26px;display:block;
  transition: transform .2s ease;
}
.hdr-btn:hover svg{
  transform: scale(1.1);
}
.fs-btn{right:0}
.theme-btn{right:58px}

/* Loader */
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
  width:24px;height:24px;border:3px solid transparent;
  border-top-color:var(--piai-primary,#007bff);
  border-right-color:var(--piai-primary,#007bff);
  border-radius:50%;
  animation:spin .8s linear infinite;
}
.loader-text{font-size:.9rem;font-weight:600;color:#333}
@keyframes spin{to{transform:rotate(360deg)}}

/* ===========================
   EX BOX (Ví dụ) styles
   =========================== */
.ex-box{
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed rgba(0,0,0,.12);
  display:flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 0.95em;
  color: var(--piai-text);
  min-width:0;
}
.ex-tag{
  font-weight: 700;
  font-size: 8px;
  line-height: 1.2;
  color: #fff;
  background: var(--piai-secondary);
  padding: 2px 6px;
  border-radius: 2px;
  text-transform: uppercase;
  white-space: nowrap;
  flex: 0 0 auto;
}
.ex-box > span:last-child{
  font-size: 10px;
  line-height: 1.25;
  min-width: 0;
  word-break: break-word;
}

/* ===========================
   FIX 1: BRAND LOGO POSITIONING
   - Phải nằm trực tiếp trong .piai-wrap
   - Dùng calc() để đảm bảo vị trí chính xác
   =========================== */
.piai-brand{
  position: absolute;
  /* FIX: Dùng calc để đảm bảo vị trí, right: -2px có thể bị clip */
  right: 0;
  bottom: 12px;
  width: 96px;
  height: 26px;
  background: var(--piai-primary);
  opacity: .95;
  pointer-events: none;
  /* FIX: Đảm bảo logo không bị ảnh hưởng bởi parent overflow */
  z-index: 10;

  -webkit-mask-image: url("https://piai-embed-engine.vercel.app/public/logo.svg");
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: left center;
  -webkit-mask-size: contain;

  mask-image: url("https://piai-embed-engine.vercel.app/public/logo.svg");
  mask-repeat: no-repeat;
  mask-position: left center;
  mask-size: contain;
}

/* ==========================================
   FIT MODE (no-scroll / compact) OPT-IN
   ========================================== */
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

/* ==========================================
   FIX 2: MATHJAX & TEXT CLARITY
   Force crisp rendering cho MathJax elements
   ========================================== */
.MathJax,
.MathJax_Display,
.MathJax svg,
mjx-container,
mjx-container svg {
  /* Prevent blurry rendering */
  image-rendering: -webkit-optimize-contrast;
  -webkit-font-smoothing: antialiased;
  /* Force pixel-perfect rendering */
  shape-rendering: geometricPrecision;
  text-rendering: geometricPrecision;
}

/* Ensure MathJax containers don't inherit problematic transforms */
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

  // CSS container: radius clean
  function createBaseStyle(theme, aspect) {
    const borderCol = (theme.primary || '#800020') + '26';

    return {
      default:
        `width:100%;max-width:100%;display:block;position:relative;` +
        `aspect-ratio:${aspect};height:auto;` +
        `border-radius:${BASE_RADIUS}px;` +
        `border:1px solid ${borderCol};` +
        `overflow:hidden;` +
        `background:transparent;`,
      fullscreen:
        `position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;` +
        `margin:0;border-radius:0;z-index:99999;background:#000;border:none;` +
        `overflow:hidden;` +
        `padding:env(safe-area-inset-top) env(safe-area-inset-right) ` +
        `env(safe-area-inset-bottom) env(safe-area-inset-left)`,
    };
  }

  // ============================================================
  // 3) RENDER
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
      fitMode,
    } = config;

    const container =
      containerFromConfig || (typeof id === 'string' ? document.getElementById(id) : null);
    if (!container) return;

    // cleanup instance cũ nếu render lại cùng container
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

    // reset DOM
    while (container.firstChild) container.removeChild(container.firstChild);
    container.style.cssText = baseStyle.default;

    // wrapper: design canvas 800x450 (scale để full width)
    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      `position:absolute;top:0;left:0;` +
      `width:${width}px;height:${height}px;` +
      `transform-origin:0 0;`;
      // FIX TEXT BLUR: Removed will-change:transform - causes blur on scaled content

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

    // fitMode -> inject a tiny script that adds class on <html>
    const fitNorm = normalizeFitMode(fitMode);
    const fitHead =
      fitNorm === 'no-scroll'
        ? `<script>(function(){try{document.documentElement.classList.add('piai-fit-noscroll');}catch(_){}})();<\/script>`
        : '';

    const headExtraFinal = (headExtra || '') + fitHead;

    const iframeRaw = generator(Object.assign({}, ctxBase, { isStandalone: false }));
    if (!iframeRaw) return;

    const iframeHtml = buildHtmlDocument(iframeRaw, baseCss, headExtraFinal);

    // iOS standalone url
    let iosStandaloneUrl = '';
    if (isIOS) {
      const standaloneRaw = generator(Object.assign({}, ctxBase, { isStandalone: true }));
      if (standaloneRaw) {
        const standaloneHtml = buildHtmlDocument(standaloneRaw, baseCss, headExtraFinal);
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

    iframe.style.cssText =
      `width:100%;height:100%;border:none;display:block;` +
      `background:${currentTheme.bg || '#f9f7f5'};`;

    iframe.scrolling = 'no';
    iframe.loading = 'lazy';
    iframe.sandbox =
      'allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-popups';
    iframe.allow = 'fullscreen; clipboard-read; clipboard-write';
    if (iosStandaloneUrl) iframe.dataset.iosStandaloneUrl = iosStandaloneUrl;

    iframe.onload = function () {
      try { URL.revokeObjectURL(blobUrl); } catch (_) {}

      // apply theme message
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            { type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme },
            '*'
          );
        }
      } catch (_) {}

      if (typeof onReady === 'function') {
        try { onReady(iframe, { id: containerId, themeName: currentThemeName, theme: currentTheme }); }
        catch (err) { console.error('PiaiEmbed onReady callback error:', err); }
      }
    };

    // ============================================================
    // 4) FULLSCREEN & SCALING
    // FIX TEXT BLUR: Round scale to avoid sub-pixel rendering
    // ============================================================
    let isFull = false;
    let resizeRAF = null;

    const updateScale = () => {
      const cw = container.clientWidth || width;
      let scale = cw / width;

      if (isFull) {
        const vw = window.innerWidth || cw;
        const vh = window.innerHeight || (cw * (height / width));
        scale = Math.min(vw / width, vh / height);
      }

      if (!Number.isFinite(scale) || scale <= 0) scale = 1;

      // FIX TEXT BLUR: Round scale to 3 decimal places để giảm sub-pixel issues
      // Và dùng scale3d thay vì scale để force GPU compositing đúng cách
      const roundedScale = Math.round(scale * 1000) / 1000;
      
      // FIX: Dùng transform không có translateZ để tránh blur
      // translateZ(0) force GPU layer nhưng gây blur text
      wrapper.style.transform = `scale(${roundedScale})`;

      // fallback khi aspect-ratio không hoạt động
      if (!isFull) {
        container.style.height = `${cw * (height / width)}px`;
      }
    };

    const setFullscreen = (state) => {
      isFull = state;
      container.style.cssText = state ? baseStyle.fullscreen : baseStyle.default;
      
      // FIX TEXT BLUR: Thêm delay nhỏ để browser render lại đúng
      requestAnimationFrame(() => {
        updateScale();
      });

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
      iframe.style.background = currentTheme.bg || '#f9f7f5';

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

    // ============================================================
    // 5) EVENTS + CLEANUP
    // ============================================================
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

    // mount
    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
    updateScale();
  }

  // ============================================================
  // 6) EXPORT
  // ============================================================
  global.PiaiEmbed = {
    version: '3.5.0',
    render,
    themes: THEMES,
    getThemeByName,
    getBaseCss,
    defaults: {
      width: DEFAULT_CONFIG.width,
      height: DEFAULT_CONFIG.height,
      aspect: DEFAULT_CONFIG.aspect,
      themeName: DEFAULT_CONFIG.themeName,
      fitMode: DEFAULT_CONFIG.fitMode,
    },
  };
})(window);
