/* public/piai-embed-engine.loader.js */
(function (w, d) {
  'use strict';

  // Nếu đã có engine thì thôi
  if (w.PiaiEmbed && typeof w.PiaiEmbed.render === 'function') return;

  // Tránh append trùng
  if (d.querySelector('script[data-piai-embed-engine]')) return;

  var s = d.createElement('script');

  // dùng same-origin (khuyên dùng). Nếu bạn host ở domain khác thì đổi path.
  s.src = '/piai-embed-engine.obf.js';

  s.async = true;
  s.dataset.piaiEmbedEngine = '1';
  d.head.appendChild(s);
})(window, document);
