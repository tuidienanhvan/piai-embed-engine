/* piai-anti-devtools.js
 * Anti DevTools – EMBED SAFE VERSION
 * ⚠️ Not bulletproof – anti casual inspection only
 *
 * Rules:
 * - NEVER kill when running inside iframe
 * - NEVER use sizeDiff inside embed
 * - Delay detection until layout stable
 */
(function () {
    'use strict';
 
    // ============================================================
    // 0. HARD STOP IF INSIDE IFRAME (EMBED CONTEXT)
    // ============================================================
    let isIframe = false;
    try {
      if (window.top !== window.self) {
        isIframe = true;
      }
    } catch (_) {
      isIframe = true;
    }
 
    // ============================================================
    // CONFIG
    // ============================================================
    const DEFAULTS = {
      enabled: true,
      allowInIframe: false,
      mode: 'soft', // 'soft' | 'hard'
      warmupDelay: 1500,
      interval: 600,
      threshold: 160,
      strategies: {
        sizeDiff: true, // ONLY for top-level
        consoleBait: true,
        debuggerTrap: false,
        killSwitch: true
      },
      consoleBaitInterval: 1500,
      debuggerInterval: 1200,
      debuggerDelayMs: 150,
      action: {
        type: 'overlay' // 'overlay' | 'blank' | 'redirect' | 'hide'
        // overlayText: 'Restricted access',
        // redirectTo: 'about:blank'
        // hideSelector: '.piai-wrap'
      },
      allowHosts: ['localhost', '127.0.0.1'],
      activePathPrefix: ''
    };
 
    const userCfg = window.PIAI_ANTI_DEVTOOLS || {};
    const CFG = deepMerge(DEFAULTS, userCfg);
 
    if (!CFG.enabled) return;
 
    if (isIframe && !CFG.allowInIframe) return;
 
    if (isIframe) {
      CFG.strategies.sizeDiff = false;
    }
 
    try {
      const host = location.hostname;
      if (CFG.allowHosts.includes(host)) return;
      if (CFG.activePathPrefix && !location.pathname.startsWith(CFG.activePathPrefix)) return;
    } catch (_) {}
 
    // ============================================================
    // STATE
    // ============================================================
    let triggered = false;
    let started = false;
    let timer = null;
    let baitTimer = null;
    let dbgTimer = null;
 
    // ============================================================
    // HELPERS
    // ============================================================
    function deepMerge(a, b) {
      const out = { ...a };
      for (const k in b) {
        if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
          out[k] = deepMerge(a[k] || {}, b[k]);
        } else {
          out[k] = b[k];
        }
      }
      return out;
    }
 
    function now() {
      return performance && performance.now ? performance.now() : Date.now();
    }
 
    // ============================================================
    // ACTIONS
    // ============================================================
    function applyAction() {
      if (triggered) return;
      triggered = true;
 
      cleanup();
 
      if (CFG.mode === 'soft') {
        showOverlay(CFG.action.overlayText);
        return;
      }
 
      const actionType = CFG.action.type;
 
      if (actionType === 'redirect') {
        location.replace(CFG.action.redirectTo || 'about:blank');
        return;
      }
 
      if (actionType === 'overlay') {
        showOverlay(CFG.action.overlayText);
        return;
      }
 
      if (actionType === 'blank') {
        blankPage();
        return;
      }
 
      if (actionType === 'hide') {
        const selector = CFG.action.hideSelector || 'body';
        const el = document.querySelector(selector);
        if (el) {
          el.style.display = 'none';
        }
        return;
      }
 
      // Default to blank
      blankPage();
    }
 
    function cleanup() {
      try { clearInterval(timer); } catch (_) {}
      try { clearInterval(baitTimer); } catch (_) {}
      try { clearInterval(dbgTimer); } catch (_) {}
    }
 
    function blankPage() {
      document.documentElement.innerHTML = '';
      document.documentElement.style.background = '#000';
    }
 
    function showOverlay(text) {
      if (document.getElementById('__piai_anti_overlay__')) return;
 
      const overlay = document.createElement('div');
      overlay.id = '__piai_anti_overlay__';
      overlay.style.cssText =
        'position:fixed;inset:0;z-index:2147483647;' +
        'background:rgba(0,0,0,.92);display:flex;' +
        'align-items:center;justify-content:center;' +
        'color:#fff;font:600 16px/1.5 system-ui,-apple-system,Segoe UI,Roboto;' +
        'text-align:center;padding:24px;';
      overlay.textContent = text || 'Restricted access';
 
      document.body.appendChild(overlay);
    }
 
    // ============================================================
    // DETECTORS
    // ============================================================
    function detectBySizeDiff() {
      const w = Math.abs(window.outerWidth - window.innerWidth);
      const h = Math.abs(window.outerHeight - window.innerHeight);
      return w > CFG.threshold || h > CFG.threshold;
    }
 
    function startConsoleBait() {
      const bait = function () {};
      bait.toString = function () {
        applyAction();
        return '';
      };
 
      baitTimer = setInterval(() => {
        try {
          console.log('%c', bait);
        } catch (_) {}
      }, CFG.consoleBaitInterval);
    }
 
    function startDebuggerTrap() {
      dbgTimer = setInterval(() => {
        const t0 = now();
        debugger; // eslint-disable-line
        if (now() - t0 > CFG.debuggerDelayMs) {
          applyAction();
        }
      }, CFG.debuggerInterval);
    }
 
    function mainLoop() {
      if (triggered || !started) return;
 
      let open = false;
 
      if (CFG.strategies.sizeDiff) {
        open = open || detectBySizeDiff();
      }
 
      if (open && CFG.strategies.killSwitch) {
        applyAction();
      }
    }
 
    // ============================================================
    // START (DELAYED)
    // ============================================================
    setTimeout(function () {
      started = true;
      timer = setInterval(mainLoop, CFG.interval);
 
      if (CFG.strategies.consoleBait) startConsoleBait();
      if (CFG.strategies.debuggerTrap) startDebuggerTrap();
    }, CFG.warmupDelay);
 
  })();