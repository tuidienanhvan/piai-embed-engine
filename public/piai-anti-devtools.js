/* piai-anti-devtools.js
 * Anti DevTools (client-side) – NOT bulletproof.
 * Modes:
 *  - soft: warn/blur/overlay (ít phá)
 *  - hard: blank page / redirect (phá mạnh)
 *
 * Usage:
 *   <script>
 *     window.PIAI_ANTI_DEVTOOLS = { enabled:true, mode:'hard', ... };
 *   </script>
 *   <script src="/piai-anti-devtools.js"></script>
 */

(function () {
    'use strict';
  
    // ============================================================
    // CONFIG (override via window.PIAI_ANTI_DEVTOOLS)
    // ============================================================
    const DEFAULTS = {
      enabled: true,
  
      // 'soft' | 'hard'
      mode: 'hard',
  
      // Detection interval (ms)
      interval: 400,
  
      // 5.1: detect by outer-inner diff threshold
      threshold: 160,
  
      // Enable strategies
      strategies: {
        sizeDiff: true,       // 5.1
        consoleBait: true,    // 5.2
        debuggerTrap: false,  // 5.3 (default OFF vì phá dev mạnh)
        killSwitch: true      // 5.5 (khi detect => hành động mạnh)
      },
  
      // 5.2 console bait frequency
      consoleBaitInterval: 1200,
  
      // 5.3 debugger trap config
      debuggerInterval: 1000,
      debuggerDelayMs: 120,
  
      // action when detected
      action: {
        // 'blank' | 'overlay' | 'redirect'
        type: 'blank',
        redirectTo: 'about:blank',
        overlayText: 'Access denied'
      },
  
      // Allowlist hostnames (vd: cho phép devtools ở localhost)
      allowHosts: ['localhost', '127.0.0.1'],
  
      // Optional: only activate for specific paths
      // activePathPrefix: '/embed'
      activePathPrefix: ''
    };
  
    const userCfg = (typeof window !== 'undefined' && window.PIAI_ANTI_DEVTOOLS) || {};
    const CFG = deepMerge(DEFAULTS, userCfg);
  
    if (!CFG.enabled) return;
  
    try {
      const host = location.hostname;
      if (CFG.allowHosts && CFG.allowHosts.includes(host)) return;
      if (CFG.activePathPrefix && !location.pathname.startsWith(CFG.activePathPrefix)) return;
    } catch (_) {}
  
    // ============================================================
    // INTERNAL STATE
    // ============================================================
    let triggered = false;
    let timer = null;
    let baitTimer = null;
    let dbgTimer = null;
  
    // ============================================================
    // HELPERS
    // ============================================================
    function deepMerge(a, b) {
      const out = Array.isArray(a) ? a.slice() : Object.assign({}, a);
      if (!b || typeof b !== 'object') return out;
  
      for (const k of Object.keys(b)) {
        const v = b[k];
        if (v && typeof v === 'object' && !Array.isArray(v) && a && typeof a[k] === 'object') {
          out[k] = deepMerge(a[k], v);
        } else {
          out[k] = v;
        }
      }
      return out;
    }
  
    function now() {
      return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    }
  
    // ============================================================
    // ACTIONS
    // ============================================================
    function applyAction() {
      if (triggered) return;
      triggered = true;
  
      // best-effort stop timers
      try { if (timer) clearInterval(timer); } catch (_) {}
      try { if (baitTimer) clearInterval(baitTimer); } catch (_) {}
      try { if (dbgTimer) clearInterval(dbgTimer); } catch (_) {}
  
      const type = (CFG.action && CFG.action.type) || 'blank';
      const mode = CFG.mode || 'hard';
  
      // "soft" mode: prefer overlay
      if (mode === 'soft') {
        return showOverlay(CFG.action.overlayText || 'DevTools detected');
      }
  
      // "hard" mode actions
      if (type === 'redirect') {
        try { location.replace(CFG.action.redirectTo || 'about:blank'); } catch (_) {}
        return;
      }
  
      if (type === 'overlay') {
        return showOverlay(CFG.action.overlayText || 'Access denied');
      }
  
      // default: blank
      blankPage();
    }
  
    function blankPage() {
      try {
        document.documentElement.innerHTML = '';
        document.documentElement.style.background = '#000';
      } catch (_) {
        try {
          document.body.innerHTML = '';
          document.body.style.background = '#000';
        } catch (_) {}
      }
    }
  
    function showOverlay(text) {
      try {
        const overlay = document.createElement('div');
        overlay.id = '__piai_anti_overlay__';
        overlay.style.cssText =
          'position:fixed;inset:0;z-index:2147483647;' +
          'background:rgba(0,0,0,.92);display:flex;' +
          'align-items:center;justify-content:center;' +
          'color:#fff;font:600 16px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Arial;' +
          'text-align:center;padding:24px;';
        overlay.textContent = text || 'Access denied';
        document.documentElement.appendChild(overlay);
  
        // optional blur underlying
        try { document.documentElement.style.filter = 'blur(6px)'; } catch (_) {}
      } catch (_) {
        blankPage();
      }
    }
  
    // ============================================================
    // DETECTION STRATEGIES
    // ============================================================
  
    // 5.1 Size-diff detector (outer vs inner)
    function detectBySizeDiff() {
      try {
        const w = Math.abs((window.outerWidth || 0) - (window.innerWidth || 0));
        const h = Math.abs((window.outerHeight || 0) - (window.innerHeight || 0));
        return (w > CFG.threshold) || (h > CFG.threshold);
      } catch (_) {
        return false;
      }
    }
  
    // 5.2 Console bait (toString trap)
    function startConsoleBait() {
      const bait = function () {};
      bait.toString = function () {
        // When DevTools console tries to render it
        applyAction();
        return '';
      };
  
      baitTimer = setInterval(() => {
        try {
          // The %c helps forcing console formatting path
          console.log('%c', bait);
          console.clear && console.clear(); // optional, keep console clean
        } catch (_) {}
      }, CFG.consoleBaitInterval);
    }
  
    // 5.3 Debugger trap (measure pause time)
    function startDebuggerTrap() {
      dbgTimer = setInterval(() => {
        try {
          const t0 = now();
          // If DevTools open + breakpoints allowed, this pauses
          debugger; // eslint-disable-line no-debugger
          const dt = now() - t0;
          if (dt > CFG.debuggerDelayMs) applyAction();
        } catch (_) {}
      }, CFG.debuggerInterval);
    }
  
    // 5.5 Kill switch (when ANY detector says open)
    function mainLoop() {
      if (triggered) return;
  
      let open = false;
  
      if (CFG.strategies.sizeDiff) {
        open = open || detectBySizeDiff();
      }
  
      // add more detectors here if you want (performance, devtools API quirks...)
  
      if (open && CFG.strategies.killSwitch) {
        applyAction();
      }
    }
  
    // ============================================================
    // START
    // ============================================================
    timer = setInterval(mainLoop, CFG.interval);
  
    if (CFG.strategies.consoleBait) startConsoleBait();
    if (CFG.strategies.debuggerTrap) startDebuggerTrap();
  
  })();
  