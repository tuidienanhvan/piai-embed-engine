// piai-embed-engine.js
// Phiên bản 2025 – gọn, không dùng ensureResponsiveStyle
// Tính năng: fullscreen, iOS standalone, scale mượt, không memory leak

(function (global) {
  'use strict';

  // ============================================================
  // 1. DEFAULTS
  // ============================================================
  const DEFAULT_THEME = {
    red: '#800020',
    gold: '#b8860b',
    navy: '#002b5c',
    bg: '#f9f7f5',
  };

  const DEFAULT_CONFIG = {
    width: 800,
    height: 450,
    aspect: '16 / 9',
    theme: DEFAULT_THEME,
  };

  // ============================================================
  // 2. HELPERS
  // ============================================================
  function detectDevice() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isMobile = isIOS || /Mobi|Android/i.test(ua);
    return { isIOS, isMobile };
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
      theme,
      html,
      htmlGenerator,
    } = config;

    const container =
      containerFromConfig ||
      (typeof id === 'string' ? document.getElementById(id) : null);

    if (!container) return;

    const containerId = container.id || id;
    const { isIOS } = detectDevice();

    // Style chính – background để transparent để không lộ màu nền
    const baseStyle = {
      default:
        `width:${width}px;max-width:100%;height:${height}px;` +
        `margin:20px auto;display:flex;justify-content:center;align-items:center;` +
        `position:relative;border-radius:16px;` +
        `border:1px solid ${theme.red}26;` +
        `box-shadow:0 10px 30px ${theme.navy}26;` +
        `overflow:hidden;background:transparent;aspect-ratio:${aspect}`,
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
    // 3.1. Generate HTML
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
      isIOS,
    };

    const iframeHtml = generator(
      Object.assign({}, ctxBase, { isStandalone: false })
    );

    let standaloneHtml = null;
    if (isIOS) {
      standaloneHtml = generator(
        Object.assign({}, ctxBase, { isStandalone: true })
      );
    }

    if (!iframeHtml) return;

    // ------------------------------------------------------------
    // 3.2. Blob & iframe
    // ------------------------------------------------------------
    let iosStandaloneUrl = '';
    if (isIOS && standaloneHtml) {
      try {
        const blob = new Blob([standaloneHtml], { type: 'text/html' });
        iosStandaloneUrl = URL.createObjectURL(blob);
      } catch (e) {
        console.error('PiaiEmbed: standalone blob error', e);
      }
    }

    const blob = new Blob([iframeHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.src = blobUrl;
    iframe.style.cssText =
      'width:100%;height:100%;border:none;border-radius:16px;background:#fff';
    iframe.scrolling = 'no';
    iframe.loading = 'lazy';
    iframe.sandbox =
      'allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-popups';
    iframe.allow = 'fullscreen; clipboard-read; clipboard-write';
    if (iosStandaloneUrl) iframe.dataset.iosStandaloneUrl = iosStandaloneUrl;

    iframe.onload = () => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {}
    };

    // ============================================================
    // 4. FULLSCREEN & SCALING
    // ============================================================
    let isFull = false;
    let resizeRAF = null;

    const updateScale = () => {
      if (!container || !wrapper) return;

      if (isFull) {
        // Scale cho fullscreen (trong khung đen toàn màn hình)
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let scaleFull = Math.min(vw / width, vh / height);
        if (!Number.isFinite(scaleFull) || scaleFull <= 0) scaleFull = 1;
        wrapper.style.transform = `scale(${scaleFull})`;
        container.style.height = `${vh}px`;
        return;
      }

      // Inline: scale theo chiều rộng thực tế của container
      const rect = container.getBoundingClientRect();
      const availableWidth = rect.width || width;

      let scale = availableWidth / width;
      if (!Number.isFinite(scale) || scale <= 0) scale = 1;
      scale = Math.min(scale, 1); // Không phóng to quá kích thước gốc

      wrapper.style.transform = `scale(${scale})`;
      container.style.height = `${height * scale}px`;
    };

    const setFullscreen = (state) => {
      isFull = state;
      container.style.cssText = state ? baseStyle.fullscreen : baseStyle.default;
      iframe.style.boxShadow = state ? '0 0 60px rgba(0,0,0,.4)' : 'none';
      iframe.style.borderRadius = state ? '0' : '16px';

      updateScale();
      try {
        iframe.contentWindow?.postMessage(
          { type: 'fullscreenState', id: containerId, isFullscreen: state },
          '*'
        );
      } catch {}
    };

    // ============================================================
    // 5. EVENTS
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
          container
            .requestFullscreen()
            .then(() => setFullscreen(true))
            .catch(() => setFullscreen(true)); // fallback CSS full
        } else {
          setFullscreen(true);
        }
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

    // Cleanup khi element bị xóa
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.removedNodes) {
          if (node === container || (node.contains && node.contains(container))) {
            window.removeEventListener('message', onMessage);
            document.removeEventListener(
              'fullscreenchange',
              onFullscreenChange
            );
            document.removeEventListener('keydown', onKeydown);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
            observer.disconnect();
            try {
              if (iosStandaloneUrl) URL.revokeObjectURL(iosStandaloneUrl);
            } catch {}
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
    defaults: {
      theme: DEFAULT_THEME,
      width: DEFAULT_CONFIG.width,
      height: DEFAULT_CONFIG.height,
      aspect: DEFAULT_CONFIG.aspect,
    },
  };

  global.PiaiEmbed = api;
})(window);
