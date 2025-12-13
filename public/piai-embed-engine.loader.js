/* public/piai-embed-engine.loader.js */
(function (w, d) {
    'use strict';
  
    // ============================================================
    // PiAI Embed Engine Loader (robust)
    // - Tránh load trùng
    // - Append engine obf/min
    // - CHỜ tới khi window.PiaiEmbed.render sẵn sàng
    // - Expose window.PiaiEmbedReady (Promise) cho nơi gọi await
    // ============================================================
  
    // Nếu engine đã sẵn thì thôi
    if (w.PiaiEmbed && typeof w.PiaiEmbed.render === 'function') return;
  
    // Nếu đang loading thì thôi (tránh append trùng)
    if (w.__piaiEmbedLoading) return;
    w.__piaiEmbedLoading = true;
  
    // Promise ready (để phía nhúng có thể await)
    var _resolveReady, _rejectReady;
    if (!w.PiaiEmbedReady || typeof w.PiaiEmbedReady.then !== 'function') {
      w.PiaiEmbedReady = new Promise(function (resolve, reject) {
        _resolveReady = resolve;
        _rejectReady = reject;
      });
    }
  
    function resolveReady() {
      w.__piaiEmbedLoaded = true;
      w.__piaiEmbedLoading = false;
      if (_resolveReady) _resolveReady(w.PiaiEmbed);
      try {
        d.dispatchEvent(new CustomEvent('piaiEmbedReady'));
      } catch (e) {}
    }
  
    function rejectReady(err) {
      w.__piaiEmbedLoading = false;
      if (_rejectReady) _rejectReady(err);
      try {
        d.dispatchEvent(new CustomEvent('piaiEmbedError', { detail: err }));
      } catch (e) {}
    }
  
    // Lấy URL hiện tại của loader (an toàn nhất)
    var loaderSrc = (d.currentScript && d.currentScript.src) ? d.currentScript.src : '';
    if (!loaderSrc) {
      // fallback: cố gắng tìm script có data-piai-embed-engine
      var guess = d.querySelector('script[data-piai-embed-engine]');
      loaderSrc = (guess && guess.src) ? guess.src : location.href;
    }
  
    // Cho phép override engine path nếu muốn:
    // <script src=".../piai-embed-engine.loader.js?engine=/custom-engine.js" ...>
    var engineOverride = null;
    try {
      var u = new URL(loaderSrc, location.href);
      engineOverride = u.searchParams.get('engine'); // có thể là '/piai-embed-engine.obf.js' hoặc full URL
    } catch (e) {}
  
    function toAbsolute(url) {
      try {
        return new URL(url, loaderSrc || location.href).toString();
      } catch (e) {
        return url;
      }
    }
  
    // Mặc định engine nằm cùng host với loader, file: piai-embed-engine.obf.js
    var engineUrl = engineOverride ? toAbsolute(engineOverride) : toAbsolute('piai-embed-engine.obf.js');
  
    // Append engine script
    var s = d.createElement('script');
    s.async = true;
    s.src = engineUrl;
    s.crossOrigin = 'anonymous';
    // đánh dấu đây là engine script (để nơi nhúng có thể detect)
    s.dataset.piaiEmbedEngine = '1';
  
    // Poll tới khi PiaiEmbed.render sẵn sàng
    function waitUntilReady(timeoutMs) {
      var start = Date.now();
      (function tick() {
        if (w.PiaiEmbed && typeof w.PiaiEmbed.render === 'function') {
          resolveReady();
          return;
        }
        if (Date.now() - start > timeoutMs) {
          rejectReady(new Error('[PiAI Embed] Engine loaded but window.PiaiEmbed is not ready: ' + engineUrl));
          return;
        }
        setTimeout(tick, 50);
      })();
    }
  
    s.onload = function () {
      // Engine script đã tải xong, nhưng global có thể set trễ -> wait
      waitUntilReady(8000);
    };
  
    s.onerror = function () {
      rejectReady(new Error('[PiAI Embed] Failed to load engine script: ' + engineUrl));
    };
  
    d.head.appendChild(s);
  })(window, document);
  