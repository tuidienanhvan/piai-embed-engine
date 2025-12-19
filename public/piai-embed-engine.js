// piai-embed-engine.js
// v3.7.1 – SHARP EDITION (Native Scaling for Games)
// 1. Minigame: Dùng Native Responsive (Nét căng, không scale).
// 2. Standard: Dùng Transform Scale (Chuẩn layout).
// 3. Logic: Auto-API, Auth, Bridge.

(function (global) {
  'use strict';

  // ============================================================
  // 1) THEMES
  // ============================================================
  const THEMES = {
    classic: { name: 'classic', primary: '#800020', accent: '#b8860b', secondary: '#002b5c', bg: '#f9f7f5', text: '#002b4a', textLight: '#666666' },
    educational: { name: 'educational', primary: '#2196F3', accent: '#FFC107', secondary: '#4CAF50', bg: '#FFFFFF', text: '#212121', textLight: '#757575' },
    night: { name: 'night', primary: '#A1C2BD', accent: '#1D24CA', secondary: '#A8A1CE', bg: '#19183B', text: '#F9E8C9', textLight: '#9BA4B5' },
  };
  
  const DEFAULT_CONFIG = {
    width: 800, height: 450, aspect: '16 / 9', themeName: 'classic', fitMode: 'scroll',
    debug: false
  };

  const SYSTEM_FONT_STACK = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif';
  const BASE_RADIUS = 16;

  // ============================================================
  // 2) HELPERS
  // ============================================================
  function detectDevice() {
    const ua = navigator.userAgent || '';
    return { 
      isIOS: /iPad|iPhone|iPod/.test(ua) && !window.MSStream,
      isAndroid: /Android/i.test(ua),
      isMobile: /Mobi|Android/i.test(ua)
    };
  }
  function getThemeByName(name) { return THEMES[name] || THEMES[DEFAULT_CONFIG.themeName]; }
  function normalizeFitMode(mode) {
    const m = String(mode || '').toLowerCase().trim();
    return (m === 'no-scroll' || m === 'noscroll' || m === 'compact') ? 'no-scroll' : 'scroll';
  }

  // ============================================================
  // 3) CSS GENERATOR
  // ============================================================
  function getBaseCss(theme) {
    return `:root{--piai-primary:${theme.primary};--piai-accent:${theme.accent};--piai-secondary:${theme.secondary};--piai-bg:${theme.bg};--piai-text:${theme.text};--piai-text-light:${theme.textLight}}*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%}body{font-family:${SYSTEM_FONT_STACK};color:var(--piai-text);background:transparent;overflow:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}.piai-wrap{width:100%;height:100%;background:var(--piai-bg);display:flex;flex-direction:column;overflow:hidden;position:relative;isolation:isolate}
/* STANDARD UI (THEORY) */
.piai-hdr{background:var(--piai-primary);color:#fff;padding:12px 20px;padding-right:130px;font-weight:700;display:flex;align-items:center;gap:10px;line-height:1.2;border-bottom:3px solid var(--piai-accent);position:relative}
.piai-hdr svg{width:20px;height:20px;display:block;flex:0 0 auto}
.piai-body{flex:1;padding:15px 20px;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;min-height:0;position:relative;z-index:1}
.piai-body>*{margin-bottom:15px}.piai-body>*:last-child{margin-bottom:0}
.piai-body::-webkit-scrollbar{width:6px}.piai-body::-webkit-scrollbar-thumb{background:var(--piai-text-light);border-radius:3px}
/* MINIGAME UI (FULLSCREEN) */
.piai-body.no-pad{padding:0!important;overflow:hidden!important;width:100%;height:100%}
iframe.game-frame{border:none;width:100%;height:100%;display:block}
/* COMPONENTS */
.piai-def{background:var(--piai-bg);border-left:5px solid var(--piai-primary);padding:12px 18px;border-radius:0 8px 8px 0;transition:box-shadow .25s ease}.piai-def-title{color:var(--piai-primary);font-weight:700;display:flex;align-items:center;gap:10px;line-height:1.25;margin-bottom:6px}.piai-grid{display:flex;flex:1;min-height:0;gap:20px}.piai-list{flex:1;display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;padding-right:26px;padding-left:6px}.piai-list-item{display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:8px;background:var(--piai-bg);border-radius:10px;box-shadow:inset 0 0 0 1px var(--piai-text-light);transition:box-shadow .18s ease}.piai-list-item:hover{box-shadow:inset 0 0 0 2px var(--piai-accent),0 2px 8px rgba(0,0,0,0.08)}.piai-list-item .piai-ico{color:var(--piai-accent);width:24px;height:24px;flex:0 0 24px;display:flex;align-items:center;justify-content:center}.piai-visual{flex:0 0 280px;display:flex;align-items:center;justify-content:center}
/* UTILS */
.hdr-btn{position:absolute;top:50%;transform:translateY(-50%);z-index:999;width:48px;height:48px;background:transparent;border:none;cursor:pointer;color:var(--piai-accent);display:flex;align-items:center;justify-content:center;transition:color .2s ease}.hdr-btn:hover{color:#fff}.fs-btn{right:0}.theme-btn{right:58px}
.piai-loader{position:absolute;inset:0;background:rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);transition:opacity .3s ease,visibility .3s ease}.piai-loader.hide{opacity:0;visibility:hidden}.piai-loader .loader-inner{padding:14px 28px;border-radius:30px;background:rgba(255,255,255,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.5);box-shadow:0 8px 32px 0 rgba(31,38,135,0.15);display:flex;align-items:center;gap:12px}.spinner{width:24px;height:24px;border:3px solid transparent;border-top-color:var(--piai-primary,#007bff);border-right-color:var(--piai-primary,#007bff);border-radius:50%;animation:spin .8s linear infinite}.loader-text{font-size:.9rem;font-weight:600;color:#333}@keyframes spin{to{transform:rotate(360deg)}}
.piai-brand{position:absolute;right:-20px;bottom:12px;width:96px;height:26px;background:var(--piai-primary);opacity:.95;pointer-events:none;z-index:10;-webkit-mask-image:url("https://piai-embed-engine.vercel.app/public/logo.svg");-webkit-mask-repeat:no-repeat;-webkit-mask-position:left center;-webkit-mask-size:contain;mask-image:url("https://piai-embed-engine.vercel.app/public/logo.svg");mask-repeat:no-repeat;mask-position:left center;mask-size:contain}
/* MathJax */
.MathJax,.MathJax_Display,.MathJax svg,mjx-container,mjx-container svg{image-rendering:-webkit-optimize-contrast;-webkit-font-smoothing:antialiased;shape-rendering:geometricPrecision;text-rendering:geometricPrecision}.MathJax,mjx-container{transform:none!important;backface-visibility:visible!important}
@media (max-width:650px){.piai-grid{flex-direction:column}.piai-visual{flex:0 0 auto;padding:10px;width:100%}}`;
  }

  function buildHtmlDocument(content, baseCss, headExtra) {
    if (!content) return '';
    const inject = `<style>${baseCss}</style>${headExtra || ''}`;
    if (/<!doctype html/i.test(content)) {
      if (content.includes('</head>')) return content.replace('</head>', inject + '</head>');
      return inject + content;
    }
    return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${inject}</head><body>${content}</body></html>`;
  }

  function createBaseStyle(theme, aspect) {
    const borderCol = (theme.primary || '#800020') + '26';
    return {
      default: `width:100%;max-width:100%;display:block;position:relative;box-sizing:border-box;aspect-ratio:${aspect};height:auto;border-radius:${BASE_RADIUS}px;border:1px solid ${borderCol};overflow:hidden;background:transparent;`,
      fullscreen: `position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;box-sizing:border-box;margin:0;border-radius:0;z-index:99999;background:#000;border:none;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)`,
    };
  }

  // ============================================================
  // 4) GENERATOR HTML (MINIGAME LOGIC - NO HEADER, NO FOOTER)
  // ============================================================
  function generateMinigameHTML(ctx, config) {
    const PARENT_DATA = {
        cookie: document.cookie || '',
        origin: window.location.origin,
        isStudio: window.location.hostname.includes('studio'),
        gameKey: config.gameKey || 'unknown-game',
        gameUrl: config.gameUrl,
        gameOrigin: config.gameOrigin || new URL(config.gameUrl).origin,
        debug: config.debug || false
    };

    const apiPath = PARENT_DATA.isStudio ? "https://pistudy.vn/api/minigames/" : "/api/minigames/";
    const apiBase = apiPath.startsWith('http') ? apiPath : (PARENT_DATA.origin + apiPath);
    const safeCookie = PARENT_DATA.cookie.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');

    return `
    <div class="piai-wrap" style="background: transparent;">
      <div class="piai-loader" id="loader"><div class="loader-inner"><div class="spinner"></div><div class="loader-text">Đang tải...</div></div></div>
      <main class="piai-body no-pad">
        <iframe class="game-frame" src="${PARENT_DATA.gameUrl}" allow="autoplay; encrypted-media; fullscreen"></iframe>
      </main>
    </div>
    
    <script>
    (function(){
      const CFG = { cookies:\`${safeCookie}\`, apiBase:"${apiBase}", gameKey:"${PARENT_DATA.gameKey}", gameUrl:"${PARENT_DATA.gameUrl}", isStudio:${PARENT_DATA.isStudio}, debug:${PARENT_DATA.debug} };
      
      function log(m,d){ if(CFG.debug) console.log("[Bridge] "+m, d||""); }
      function getCookie(n){ let v=CFG.cookies.match('(^|;) ?'+n+'=([^;]*)(;|$)'); return v?v[2]:null; }
      function getUser(){
          let u={name:"Khách",username:"guest"}, jwt=getCookie("edx-jwt-cookie-header-payload"), old=getCookie("edx-user-info");
          try { if(jwt){ let p=JSON.parse(atob(jwt.split(".")[1])); u.name=p.name||p.preferred_username; u.username=p.preferred_username; return u; } } catch(e){}
          try { if(old){ let i=JSON.parse(old.replace(/^"|"$/g,'').split('\\\\054').join(',').split('\\\\\\\\').join('')); u.name=i.username; u.username=i.username; return u; } } catch(e){}
          return u;
      }
      
      async function api(ep, opt={}) {
          try {
             let r = await fetch(CFG.apiBase+ep, opt);
             if(!r.ok) throw new Error(r.status);
             return r;
          } catch(e) { log("API Error", e); throw e; }
      }

      async function fetchStats() {
          if(CFG.isStudio) return {playCount:0,bestScore:0};
          try {
             let r = await api("logs/"), d=await r.json(), rows=Array.isArray(d)?d:(d.results||[]), pc=0, bs=0;
             rows.forEach(x=>{ if(x.payload?.gameKey===CFG.gameKey){ pc++; let s=Number(x.payload.score||0); if(s>bs)bs=s; }});
             return {playCount:pc, bestScore:bs};
          } catch(e){ return {playCount:0,bestScore:0}; }
      }

      async function saveResult(p) {
          if(CFG.isStudio) return true;
          try {
             await api("logs/", { method:"POST", headers:{"Content-Type":"application/json","X-CSRFToken":getCookie('csrftoken')||""}, body:JSON.stringify({msgtype:"RESULT",tsms:Date.now(),payload:{...p,userId:null,username:getUser().username}}) });
             return true;
          } catch(e){ return false; }
      }

      const iframe = document.querySelector('iframe.game-frame'), loader = document.getElementById('loader');
      iframe.onload = () => setTimeout(() => loader.classList.add('hide'), 500);

      window.addEventListener('message', (e) => {
         if(e.origin !== new URL(CFG.gameUrl).origin) return;
         const msg = e.data;
         const send = (d) => iframe.contentWindow.postMessage(d, CFG.gameUrl);
         (async () => {
             if(msg.type==="MINIGAME_READY" || (msg.type==="MINIGAME_ACTION" && msg.action==="REFRESH_STATS")) {
                 send({type:"MINIGAME_DATA", userName:getUser().name, stats:await fetchStats()});
             }
             if(msg.type==="MINIGAME_ACTION" && msg.action==="SAVE_RESULT") {
                 await saveResult(msg.data);
                 send({type:"MINIGAME_DATA", userName:getUser().name, stats:await fetchStats()});
             }
         })();
      });
    })();
    <\/script>`;
  }

  // ============================================================
  // 5) RENDER (UNIFIED - SPLIT LOGIC)
  // ============================================================
  function render(options) {
    const config = Object.assign({}, DEFAULT_CONFIG, options || {});
    const isMinigame = !!config.gameUrl;
    
    // Default theme for minigames
    if (isMinigame && (!options.themeName && !options.theme)) config.themeName = 'educational'; 

    const { id, container: cNode, width, height, aspect, themeName, theme: tOverride, html, htmlGenerator, headExtra, onReady, onThemeChange, fitMode } = config;
    const container = cNode || (typeof id === 'string' ? document.getElementById(id) : null);
    if (!container) return;

    if (typeof container.__piaiCleanup === 'function') { try { container.__piaiCleanup(); } catch (_) {} container.__piaiCleanup = null; }
    const containerId = container.id || (typeof id === 'string' ? id : 'piai_' + Date.now());
    container.id = containerId;

    const { isIOS, isAndroid, isMobile } = detectDevice();
    let currentTheme = tOverride || getThemeByName(themeName);
    let currentThemeName = currentTheme.name || themeName || DEFAULT_CONFIG.themeName;
    let baseCss = getBaseCss(currentTheme);
    let baseStyle = createBaseStyle(currentTheme, aspect);

    while (container.firstChild) container.removeChild(container.firstChild);
    container.style.cssText = baseStyle.default;

    const wrapper = document.createElement('div');
    
    // ======================================================
    // LOGIC TÁCH BIỆT: GAME (NATIVE) vs THEORY (SCALE)
    // ======================================================
    if (isMinigame) {
        // --- GAME: Full Size, No Scale (Nét căng) ---
        wrapper.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;`;
    } else {
        // --- THEORY: Fixed 800x450, Scale Transform ---
        wrapper.style.cssText = `position:absolute;top:0;left:0;width:${width}px;height:${height}px;transform-origin:0 0;`;
    }

    const ctxBase = { id: containerId, embedId: containerId, width, height, aspect, theme: currentTheme, themeName: currentThemeName, baseCss, isIOS };

    // --- GENERATOR SWITCH ---
    let finalHtml = '';
    if (isMinigame) {
        finalHtml = generateMinigameHTML(ctxBase, config);
    } else {
        const generator = typeof htmlGenerator === 'function' ? htmlGenerator : () => html || '';
        finalHtml = generator(Object.assign({}, ctxBase, { isStandalone: false }));
    }

    const fitNorm = normalizeFitMode(fitMode);
    const fitHead = fitNorm === 'no-scroll' ? `<script>(function(){try{document.documentElement.classList.add('piai-fit-noscroll');}catch(_){}})();<\/script>` : '';
    const headExtraFinal = (headExtra || '') + fitHead;

    if (!finalHtml) return;
    const iframeHtml = buildHtmlDocument(finalHtml, baseCss, headExtraFinal);

    // iOS Standalone URL (Chỉ cho Theory)
    let iosStandaloneUrl = '';
    if (isIOS && !isMinigame) {
      const generator = typeof htmlGenerator === 'function' ? htmlGenerator : () => html;
      const standaloneRaw = generator(Object.assign({}, ctxBase, { isStandalone: true }));
      if (standaloneRaw) {
        try { iosStandaloneUrl = URL.createObjectURL(new Blob([buildHtmlDocument(standaloneRaw, baseCss, headExtraFinal)], { type: 'text/html' })); } catch (e) {}
      }
    }

    const blobUrl = URL.createObjectURL(new Blob([iframeHtml], { type: 'text/html' }));
    const iframe = document.createElement('iframe');
    iframe.src = blobUrl;
    iframe.style.cssText = `width:100%;height:100%;border:none;display:block;background:${isMinigame ? 'transparent' : (currentTheme.bg || '#f9f7f5')};`;
    iframe.scrolling = 'no';
    iframe.loading = 'lazy';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-popups';
    iframe.allow = 'fullscreen; clipboard-read; clipboard-write; autoplay; encrypted-media';
    if (iosStandaloneUrl) iframe.dataset.iosStandaloneUrl = iosStandaloneUrl;

    iframe.onload = function () {
      try { URL.revokeObjectURL(blobUrl); } catch (_) {}
      try { if (iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme }, '*'); } catch (_) {}
      if (typeof onReady === 'function') onReady(iframe, ctxBase);
    };

    // ============================================================
    // 6) EVENTS & SCALING
    // ============================================================
    let isFull = false;
    let resizeRAF = null;

    const updateScale = () => {
      const rect = container.getBoundingClientRect();
      const cw = rect.width || container.clientWidth || width;
      const ch = rect.height || container.clientHeight || height;

      if (isFull) {
        // Fullscreen: Scale to fit viewport center
        let scale = Math.min(cw / width, ch / height);
        if (!Number.isFinite(scale) || scale <= 0) scale = 1;
        const roundedScale = Math.floor(scale * 1000) / 1000 || 1;
        const dx = Math.round((cw - width * roundedScale) / 2);
        const dy = Math.round((ch - height * roundedScale) / 2);
        wrapper.style.transform = `translate(${dx}px, ${dy}px) scale(${roundedScale})`;
      } else {
        // Embed Mode
        if (isMinigame) {
            // GAME: Fluid / Responsive (No Transform) -> Nét căng
            wrapper.style.transform = 'none';
            wrapper.style.width = '100%';
            wrapper.style.height = '100%';
            // Tính height dựa trên width để giữ tỷ lệ 16:9 cho container
            container.style.height = `${cw * (9/16)}px`;
        } else {
            // THEORY: Transform Scale (Giữ layout chuẩn)
            let scale = cw / width;
            if (!Number.isFinite(scale) || scale <= 0) scale = 1;
            let roundedScale = Math.round(scale * 1000) / 1000 || 1;
            if (isAndroid && isMobile) {
              const idealH = (height / width) * cw;
              if ((width * roundedScale) < (cw - 0.5) || (height * roundedScale) < (idealH - 0.5)) roundedScale = Math.ceil(scale * 1000) / 1000 || 1;
              wrapper.style.transform = `scale(${roundedScale})`;
              container.style.height = `${Math.round(height * roundedScale)}px`;
            } else {
              wrapper.style.transform = `scale(${roundedScale})`;
              container.style.height = `${cw * (height / width)}px`;
            }
        }
      }
    };

    const setFullscreen = (state) => {
      isFull = state;
      container.style.cssText = state ? baseStyle.fullscreen : baseStyle.default;
      requestAnimationFrame(updateScale);
      try { iframe.contentWindow && iframe.contentWindow.postMessage({ type: 'fullscreenState', id: containerId, isFullscreen: state }, '*'); } catch (_) {}
    };

    const switchTheme = () => {
      let idx = THEME_ORDER.indexOf(currentThemeName);
      if (idx < 0) idx = 0;
      currentThemeName = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
      currentTheme = getThemeByName(currentThemeName);
      baseCss = getBaseCss(currentTheme);
      baseStyle = createBaseStyle(currentTheme, aspect);
      container.style.cssText = isFull ? baseStyle.fullscreen : baseStyle.default;
      iframe.style.background = isMinigame ? 'transparent' : (currentTheme.bg || '#f9f7f5');
      updateScale();
      try { iframe.contentWindow.postMessage({ type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme }, '*'); } catch (_) {}
      if (typeof onThemeChange === 'function') onThemeChange(currentThemeName, currentTheme);
    };

    const onMessage = (e) => {
      if (!e.data || e.data.id !== containerId) return;
      if (e.data.type === 'toggleFullscreen') {
        if (isIOS) return;
        if (document.fullscreenElement) document.exitFullscreen();
        else if (isFull) setFullscreen(false);
        else if (container.requestFullscreen) container.requestFullscreen().then(() => setFullscreen(true)).catch(() => setFullscreen(true));
        else setFullscreen(true);
      }
      if (e.data.type === 'switchTheme') switchTheme();
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
            cleanup(); observer.disconnect(); return;
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

    // MOUNT
    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
    updateScale();
  }

  // ============================================================
  // 7) EXPORT
  // ============================================================
  global.PiaiEmbed = {
    version: '3.7.1',
    render,
    themes: THEMES,
    getThemeByName,
    getBaseCss,
    defaults: DEFAULT_CONFIG
  };
})(window);
