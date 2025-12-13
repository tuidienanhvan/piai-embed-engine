/* public/piai-embed-engine.loader.js */
(function (w, d) {
    'use strict';
  
    // ============================================================
    // Mục tiêu:
    // - Loader được nhúng ở bất kỳ domain nào (LMS, website...)
    // - Nhưng engine phải được load theo "origin của loader",
    //   KHÔNG bị hiểu nhầm thành "/..." của domain host hiện tại.
    // - Idempotent: không append trùng
    // - Có queue callback để ai gọi loader nhiều lần vẫn OK
    // ============================================================
  
    // Nếu engine đã có sẵn thì thôi
    if (w.PiaiEmbed && typeof w.PiaiEmbed.render === 'function') return;
  
    // Queue callbacks (nếu ai muốn hook)
    w.__piaiEmbedLoaderQueue = w.__piaiEmbedLoaderQueue || [];
    w.__piaiEmbedLoaderReady = w.__piaiEmbedLoaderReady || false;
    w.__piaiEmbedLoaderLoading = w.__piaiEmbedLoaderLoading || false;
  
    // Nếu đã load xong trước đó thì flush queue
    function flushQueue() {
      if (!w.__piaiEmbedLoaderReady) return;
      var q = w.__piaiEmbedLoaderQueue || [];
      w.__piaiEmbedLoaderQueue = [];
      for (var i = 0; i < q.length; i++) {
        try { q[i](); } catch (e) {}
      }
    }
  
    // Expose API nhỏ để nơi khác có thể đăng ký callback (optional)
    w.PiaiEmbedLoader = w.PiaiEmbedLoader || {
      onReady: function (cb) {
        if (typeof cb !== 'function') return;
        if (w.PiaiEmbed && typeof w.PiaiEmbed.render === 'function') {
          try { cb(); } catch (e) {}
          return;
        }
        w.__piaiEmbedLoaderQueue.push(cb);
        flushQueue();
      }
    };
  
    // Nếu đang loading thì thôi (đợi)
    if (w.__piaiEmbedLoaderLoading) return;
    w.__piaiEmbedLoaderLoading = true;
  
    // ============================================================
    // 1) Xác định URL engine theo URL của chính loader
    //    => tuyệt đối, không bao giờ bị /... trỏ về domain LMS.
    // ============================================================
    function resolveEngineUrl() {
      // Ưu tiên currentScript (đáng tin nhất)
      var cs = d.currentScript;
  
      // Fallback: tìm script có src chứa "piai-embed-engine.loader.js"
      if (!cs) {
        var list = d.getElementsByTagName('script');
        for (var i = list.length - 1; i >= 0; i--) {
          var src = list[i].src || '';
          if (src.indexOf('piai-embed-engine.loader.js') !== -1) {
            cs = list[i];
            break;
          }
        }
      }
  
      // Nếu vẫn không có thì hardcode fallback (ít khi xảy ra)
      var base = (cs && cs.src) ? cs.src : 'https://piai-embed-engine.vercel.app/piai-embed-engine.loader.js';
  
      // Có thể override bằng data-engine (nếu cần)
      // <script src=".../piai-embed-engine.loader.js" data-engine=".../piai-embed-engine.obf.js"></script>
      if (cs && cs.dataset && cs.dataset.engine) {
        return cs.dataset.engine;
      }
  
      // Mặc định: cùng thư mục với loader (./piai-embed-engine.obf.js)
      // new URL('./file', base) sẽ ra URL tuyệt đối theo origin loader
      try {
        return new URL('./piai-embed-engine.obf.js', base).href;
      } catch (e) {
        // fallback cuối
        return 'https://piai-embed-engine.vercel.app/piai-embed-engine.obf.js';
      }
    }
  
    var ENGINE_URL = resolveEngineUrl();
  
    // ============================================================
    // 2) Append engine script (idempotent)
    // ============================================================
    var existing = d.querySelector('script[data-piai-embed-engine="1"]');
    if (existing) {
      // Nếu engine tag đã tồn tại, chỉ cần chờ ready
      waitUntilReady();
      return;
    }
  
    var s = d.createElement('script');
    s.src = ENGINE_URL;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.dataset.piaiEmbedEngine = '1';
  
    s.onerror = function () {
      w.__piaiEmbedLoaderLoading = false;
      // giữ queue lại để lần sau có thể retry (nếu user reload fragment)
      try {
        console.error('[PiAI Loader] Failed to load engine:', ENGINE_URL);
      } catch (e) {}
    };
  
    s.onload = function () {
      // onload chưa chắc PiaiEmbed đã “ready” ngay (tùy bundle)
      waitUntilReady();
    };
  
    d.head.appendChild(s);
  
    // ============================================================
    // 3) Poll đến khi window.PiaiEmbed.render sẵn sàng
    // ============================================================
    function waitUntilReady() {
      var t0 = Date.now();
  
      (function loop() {
        if (w.PiaiEmbed && typeof w.PiaiEmbed.render === 'function') {
          w.__piaiEmbedLoaderReady = true;
          w.__piaiEmbedLoaderLoading = false;
          flushQueue();
          return;
        }
  
        // timeout 15s để khỏi treo vô hạn
        if (Date.now() - t0 > 15000) {
          w.__piaiEmbedLoaderLoading = false;
          try {
            console.error('[PiAI Loader] Engine loaded but PiaiEmbed not ready (timeout). URL:', ENGINE_URL);
          } catch (e) {}
          return;
        }
  
        setTimeout(loop, 50);
      })();
    }
  })(window, document);
  