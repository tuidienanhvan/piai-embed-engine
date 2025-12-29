// piai-embed-engine.js
// v3.14.0 – SEND HISTORY TO GAME
// ==============================================================================
//
// CHANGELOG v3.14.0:
// ------------------
// 1. fetchStats() now returns history array with both RESULT and PURCHASE records
// 2. sendBaseData() includes history for game to display
// 3. All previous features preserved
//
// ==============================================================================

(function (global) {
  'use strict';

  const THEMES = {
    classic: { name: 'classic', primary: '#800020', accent: '#b8860b', secondary: '#002b5c', bg: '#f9f7f5', text: '#002b4a', textLight: '#666666' },
    educational: { name: 'educational', primary: '#2196F3', accent: '#FFC107', secondary: '#4CAF50', bg: '#FFFFFF', text: '#212121', textLight: '#757575' },
    night: { name: 'night', primary: '#A1C2BD', accent: '#1D24CA', secondary: '#A8A1CE', bg: '#19183B', text: '#F9E8C9', textLight: '#9BA4B5' },
  };

  const THEME_ORDER = Object.keys(THEMES);

  const DEFAULT_CONFIG = {
    width: 800,
    height: 450,
    aspect: '16 / 9',
    themeName: 'classic',
    headExtra: '',
    fitMode: 'scroll',
    header: true,
    branding: true,
    debug: false,

    gameKey: '',
    gameUrl: '',
    gameOrigin: '',

    mateId: 'math_lesson_001',
    apiBase: '',
    apiBases: null,
    questionPoolEndpoints: null,
  };

  const SYSTEM_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';
  const BASE_RADIUS = 16;

  function detectDevice() {
    const ua = navigator.userAgent || '';
    return {
      isIOS: /iPad|iPhone|iPod/.test(ua) && !window.MSStream,
      isAndroid: /Android/i.test(ua),
      isMobile: /Mobi|Android/i.test(ua),
    };
  }

  function getThemeByName(name) { return THEMES[name] || THEMES[DEFAULT_CONFIG.themeName]; }

  function normalizeFitMode(mode) {
    const m = String(mode || '').toLowerCase().trim();
    return (m === 'no-scroll' || m === 'noscroll' || m === 'compact') ? 'no-scroll' : 'scroll';
  }

  function debugLog(message, data, debugEnabled) {
    if (debugEnabled) console.log(`[PiAI Engine v3.14.0] ${message}`, data || '');
  }

  function safeOrigin(url) {
    try { return new URL(url, window.location.href).origin; } catch (_) { return ''; }
  }

  function normalizeApiBase(base, origin) {
    const b = String(base || '').trim();
    if (!b) return '';
    if (/^https?:\/\//i.test(b)) return b.endsWith('/') ? b : (b + '/');
    if (b.startsWith('/')) return (origin + b).replace(/\/+$/, '') + '/';
    return (origin + '/' + b).replace(/\/+$/, '') + '/';
  }

  function uniq(arr) {
    const out = [];
    const seen = new Set();
    for (let i = 0; i < arr.length; i++) {
      const v = String(arr[i] || '').trim();
      if (!v) continue;
      const vv = v.endsWith('/') ? v : (v + '/');
      if (!seen.has(vv)) { seen.add(vv); out.push(vv); }
    }
    return out;
  }

  function getBaseCss(theme) {
    return `
      :root { --piai-primary:${theme.primary}; --piai-accent:${theme.accent}; --piai-secondary:${theme.secondary}; --piai-bg:${theme.bg}; --piai-text:${theme.text}; --piai-text-light:${theme.textLight}; }
      *{margin:0;padding:0;box-sizing:border-box;}
      html,body{width:100%;height:100%;}
      body{font-family:${SYSTEM_FONT_STACK};color:var(--piai-text);background:transparent;overflow:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;}
      
      /* === LAYOUT === */
      .piai-wrap{width:100%;height:100%;background:var(--piai-bg);display:flex;flex-direction:column;overflow:hidden;position:relative;isolation:isolate;}
      .piai-body{flex:1;padding:15px 20px;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;min-height:0;position:relative;z-index:1;}
      .piai-body.no-pad{padding:0!important;overflow:hidden!important;width:100%;height:100%;}
      iframe.game-frame{border:none;width:100%;height:100%;display:block;}
      
      /* === LOADER === */
      .piai-loader{position:absolute;inset:0;background:rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);transition:opacity .3s ease,visibility .3s ease;}
      .piai-loader.hide{opacity:0;visibility:hidden;pointer-events:none;}
      .piai-loader .loader-inner{padding:14px 28px;border-radius:30px;background:rgba(255,255,255,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.5);box-shadow:0 8px 32px 0 rgba(31,38,135,0.15);display:flex;align-items:center;gap:12px;}
      .spinner{width:24px;height:24px;border:3px solid transparent;border-top-color:var(--piai-primary);border-right-color:var(--piai-primary);border-radius:50%;animation:spin .8s linear infinite;}
      @keyframes spin{to{transform:rotate(360deg);}}
      
      /* === HEADER === */
      .piai-hdr{display:flex;align-items:center;gap:10px;padding:12px 20px;background:var(--piai-primary);color:#fff;font-weight:600;font-size:15px;}
      .piai-hdr i,.piai-hdr svg{width:20px;height:20px;flex-shrink:0;}
      .hdr-btn{background:rgba(255,255,255,0.15);border:none;color:#fff;padding:8px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s;}
      .hdr-btn:hover{background:rgba(255,255,255,0.25);}
      .hdr-btn svg,.hdr-btn i{width:18px;height:18px;}
      .theme-btn{margin-left:auto;}
      .fs-btn{margin-left:8px;}
      
      /* === DEFINITION BOX === */
      .piai-def{background:linear-gradient(135deg,rgba(128,0,32,0.08),rgba(184,134,11,0.08));border-left:4px solid var(--piai-primary);padding:16px 20px;border-radius:8px;margin-bottom:20px;}
      .piai-def-title{font-weight:700;color:var(--piai-primary);display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:15px;}
      .piai-def-title i,.piai-def-title svg{width:18px;height:18px;}
      .piai-def-content{line-height:1.6;font-size:14px;}
      
      /* === GRID LAYOUT === */
      .piai-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
      @media(max-width:600px){.piai-grid{grid-template-columns:1fr;}}
      
      /* === LIST === */
      .piai-list{list-style:none;display:flex;flex-direction:column;gap:12px;}
      .piai-list-item{display:flex;gap:12px;padding:12px 16px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.06);font-size:14px;line-height:1.5;}
      .piai-ico{flex-shrink:0;width:32px;height:32px;background:var(--piai-secondary);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;}
      .piai-ico i,.piai-ico svg{width:16px;height:16px;}
      
      /* === VISUAL ASIDE === */
      .piai-visual{display:flex;flex-direction:column;gap:20px;align-items:center;padding:20px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.06);}
      
      /* === BRANDING === */
      .piai-brand{position:absolute;bottom:8px;right:12px;width:24px;height:24px;background:var(--piai-accent);border-radius:4px;opacity:0.5;}
      
      /* === MATHJAX FIX === */
      .MathJax,mjx-container{transform:none!important;}
    `;
  }

  function buildHtmlDocument(content, baseCss, headExtra) {
    if (!content) return '';
    const inject = `<style>${baseCss}</style>${headExtra || ''}`;
    if (/<!doctype html/i.test(content)) {
      if (content.includes('</head>')) return content.replace('</head>', inject + '</head>');
      return inject + content;
    }
    return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">${inject}</head><body>${content}</body></html>`;
  }

  function createBaseStyle(theme) {
    const borderCol = (theme.primary || '#800020') + '26';
    return {
      default: `width:100%;max-width:100%;display:block;position:relative;box-sizing:border-box;border-radius:${BASE_RADIUS}px;border:1px solid ${borderCol};overflow:hidden;background:transparent;`,
      fullscreen: `position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;box-sizing:border-box;margin:0;border-radius:0;z-index:99999;background:#000;border:none;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);`,
    };
  }

  function generateMinigameHTML(ctx, config) {
    const origin = window.location.origin;
    const gameUrl = config.gameUrl;
    const gameOrigin = config.gameOrigin || safeOrigin(gameUrl);
    const mateId = config.mateId || DEFAULT_CONFIG.mateId;

    const cookieRaw = document.cookie || '';
    const safeCookie = cookieRaw.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');

    const bases = [];
    if (Array.isArray(config.apiBases)) {
      for (let i = 0; i < config.apiBases.length; i++) bases.push(normalizeApiBase(config.apiBases[i], origin));
    }
    const abs = normalizeApiBase(config.apiBase, origin);
    if (abs) bases.push(abs);

    bases.push(origin + '/api/minigames/');
    bases.push('https://apps.pistudy.vn/api/minigames/');
    bases.push('https://pistudy.vn/api/minigames/');

    const apiBases = uniq(bases);

    const defaultEndpoints = [
      'question-pool/{mateId}/',
      'question_pool/{mateId}/',
      'question-pool/?mate_id={mateId}',
      'question_pool/?mate_id={mateId}',
      'question-pool/{mateId}',
      'question_pool/{mateId}',
    ];

    const eps = Array.isArray(config.questionPoolEndpoints) && config.questionPoolEndpoints.length
      ? config.questionPoolEndpoints
      : defaultEndpoints;

    return `
      <div class="piai-wrap" style="background:transparent;">
        <div class="piai-loader" id="loader"><div class="loader-inner"><div class="spinner"></div><div>Đang tải...</div></div></div>
        <main class="piai-body no-pad">
          <iframe class="game-frame" src="${gameUrl}" allow="autoplay; encrypted-media; fullscreen"></iframe>
        </main>
      </div>

      <script>
      (function(){
        const CFG = {
          cookies: \`${safeCookie}\`,
          apiBases: ${JSON.stringify(apiBases)},
          apiBase: null,
          eps: ${JSON.stringify(eps)},
          mateId: "${mateId}",
          gameKey: "${config.gameKey || 'unknown-game'}",
          gameUrl: "${gameUrl}",
          gameOrigin: "${gameOrigin}",
          debug: ${!!config.debug}
        };

        function log(m, d){ if(CFG.debug) console.log("[Bridge] "+m, d||""); }

        function getCookie(name){
          const match = CFG.cookies.match('(^|;) ?' + name + '=([^;]*)(;|$)');
          return match ? match[2] : null;
        }

        function getUser(){
          let user = { name:"Khách", username:"guest" };
          const jwt = getCookie("edx-jwt-cookie-header-payload");
          if(jwt){
            try{
              const payload = JSON.parse(atob(jwt.split(".")[1]));
              user.name = payload.name || payload.preferred_username;
              user.username = payload.preferred_username;
              return user;
            }catch(e){}
          }
          const oldCookie = getCookie("edx-user-info");
          if(oldCookie){
            try{
              const cleaned = oldCookie.replace(/^"|"$/g,'').split('\\\\054').join(',').split('\\\\\\\\').join('');
              const info = JSON.parse(cleaned);
              user.name = info.username;
              user.username = info.username;
              return user;
            }catch(e){}
          }
          return user;
        }

        async function fetchTry(url, options){
          return await fetch(url, options);
        }

        async function apiAny(endpoint, options){
          const opt = Object.assign({ credentials:"include" }, options || {});
          const list = CFG.apiBase ? [CFG.apiBase] : CFG.apiBases;

          let lastErr = null;
          for(let i=0;i<list.length;i++){
            const base = list[i];
            const url = base + endpoint;
            try{
              const res = await fetchTry(url, opt);
              if(!res.ok) throw new Error("HTTP "+res.status);
              CFG.apiBase = base;
              return res;
            }catch(e){
              lastErr = e;
            }
          }
          throw lastErr || new Error("API Error");
        }

        // =====================================================================
        // FETCH STATS + HISTORY
        // Returns: { playCount, bestScore, history: [...] }
        // =====================================================================
        async function fetchStats(){
          try{
            const res = await apiAny("logs/");
            const data = await res.json();
            const rows = Array.isArray(data) ? data : (data.results || []);
            
            let playCount = 0, bestScore = 0;
            const history = [];  // All records for this game
            
            rows.forEach(item => {
              if(item.payload && item.payload.gameKey === CFG.gameKey){
                // Count game results
                if(item.msgtype === 'RESULT'){
                  playCount++;
                  const s = Number(item.payload.score || 0);
                  if(s > bestScore) bestScore = s;
                }
                
                // Add to history (both RESULT and PURCHASE)
                history.push({
                  id: item.id,
                  msgtype: item.msgtype,
                  tsms: item.tsms,
                  payload: item.payload
                });
              }
            });
            
            // Sort history by time descending (newest first)
            history.sort((a, b) => (b.tsms || 0) - (a.tsms || 0));
            
            // Limit to 50 most recent
            const recentHistory = history.slice(0, 50);
            
            log("fetchStats", { playCount, bestScore, historyCount: recentHistory.length });
            
            return { playCount, bestScore, history: recentHistory };
          }catch(e){
            log("fetchStats error", e);
            return { playCount: 0, bestScore: 0, history: [] };
          }
        }

        // =====================================================================
        // SAVE RESULT - Forward game payload to API
        // =====================================================================
        async function saveResult(data){
          try{
            const innerPayload = data.payload || data;
            
            const body = {
              msgtype: data.msgtype || 'RESULT',
              tsms: data.tsms || Date.now(),
              payload: Object.assign({}, innerPayload, { 
                userId: null,
                username: getUser().username
              })
            };

            log("saveResult body", body);

            await apiAny("logs/", {
              method:"POST",
              headers:{ "Content-Type":"application/json", "X-CSRFToken": getCookie("csrftoken") || "" },
              body: JSON.stringify(body)
            });
            
            log("saveResult success");
            return true;
          }catch(e){
            log("saveResult error", e);
            return false;
          }
        }

        function buildEndpoint(tpl, mateId){
          return String(tpl).replaceAll("{mateId}", encodeURIComponent(mateId));
        }

        async function fetchQuestionPool(mateId){
          const mid = mateId || CFG.mateId;

          const bases = CFG.apiBase ? [CFG.apiBase].concat(CFG.apiBases) : CFG.apiBases.slice();
          const baseList = [];
          const seen = new Set();
          for(let i=0;i<bases.length;i++){
            const b = String(bases[i]||'');
            if(!b) continue;
            if(!seen.has(b)){ seen.add(b); baseList.push(b); }
          }

          let lastErr = null;

          for(let bi=0; bi<baseList.length; bi++){
            const base = baseList[bi];

            for(let ei=0; ei<CFG.eps.length; ei++){
              const ep = buildEndpoint(CFG.eps[ei], mid);
              const url = base + ep;

              try{
                const res = await fetchTry(url, { credentials:"include" });
                if(res.ok){
                  CFG.apiBase = base;
                  log("question-pool OK", { base: base, endpoint: ep });
                  return await res.json();
                }
                if(res.status === 404){
                  lastErr = new Error("HTTP 404");
                  continue;
                }
                lastErr = new Error("HTTP "+res.status);
              }catch(e){
                lastErr = e;
              }
            }
          }

          throw lastErr || new Error("No valid question-pool endpoint");
        }

        const iframe = document.querySelector("iframe.game-frame");
        const loader = document.getElementById("loader");

        iframe.onload = function(){ setTimeout(function(){ loader.classList.add("hide"); }, 500); };

        function send(data){
          try{
            iframe.contentWindow && iframe.contentWindow.postMessage(data, CFG.gameOrigin || "*");
          }catch(e){
            iframe.contentWindow && iframe.contentWindow.postMessage(data, "*");
          }
        }

        // =====================================================================
        // SEND BASE DATA - Now includes history!
        // =====================================================================
        function sendBaseData(statsWithHistory){
          const data = {
            type: "MINIGAME_DATA",
            userName: getUser().name,
            stats: {
              playCount: statsWithHistory.playCount,
              bestScore: statsWithHistory.bestScore
            },
            history: statsWithHistory.history,  // 👈 NEW: Full history array
            env: { 
              gameKey: CFG.gameKey, 
              mateId: CFG.mateId, 
              apiBase: CFG.apiBase || "", 
              apiBases: CFG.apiBases 
            }
          };
          
          log("sendBaseData", { stats: data.stats, historyCount: data.history.length });
          send(data);
        }

        window.addEventListener("message", function(event){
          if(CFG.gameOrigin && event.origin !== CFG.gameOrigin) return;
          const msg = event.data || {};

          (async function(){
            if(msg.type === "MINIGAME_READY" || (msg.type === "MINIGAME_ACTION" && msg.action === "REFRESH_STATS")){
              log("Received MINIGAME_READY or REFRESH_STATS");
              const st = await fetchStats();
              sendBaseData(st);
            }

            if(msg.type === "MINIGAME_ACTION" && msg.action === "SAVE_RESULT"){
              log("Received SAVE_RESULT", msg.data);
              await saveResult(msg.data || {});
              const st = await fetchStats();
              sendBaseData(st);
            }

            if(msg.type === "MINIGAME_ACTION" && (msg.action === "FETCH_QUESTION_POOL" || msg.action === "GET_QUESTION_POOL")){
              const mid = (msg.data && msg.data.mateId) || msg.mateId || CFG.mateId;
              try{
                const qp = await fetchQuestionPool(mid);
                send({ type:"MINIGAME_QUESTION_POOL", mateId: mid, payload: qp });
              }catch(e){
                send({ type:"MINIGAME_QUESTION_POOL", mateId: mid, payload: null, error: String(e && e.message ? e.message : e) });
              }
            }
          })();
        });
      })();
      <\/script>
    `;
  }

  function render(options) {
    const config = Object.assign({}, DEFAULT_CONFIG, options || {});
    const isMinigame = !!config.gameUrl;

    if (isMinigame && (!options.themeName && !options.theme)) config.themeName = 'educational';

    const { id, container: cNode, width, height, themeName, theme: tOverride, html, htmlGenerator, headExtra, onReady, onThemeChange, fitMode, debug } = config;

    const container = cNode || (typeof id === 'string' ? document.getElementById(id) : null);
    if (!container) { console.error('[PiAI Engine] Container not found:', id); return; }

    if (typeof container.__piaiCleanup === 'function') { try { container.__piaiCleanup(); } catch (_) { } container.__piaiCleanup = null; }

    const containerId = container.id || (typeof id === 'string' ? id : 'piai_' + Date.now());
    container.id = containerId;

    const { isIOS } = detectDevice();

    let currentTheme = tOverride || getThemeByName(themeName);
    let currentThemeName = currentTheme.name || themeName || DEFAULT_CONFIG.themeName;
    let baseCss = getBaseCss(currentTheme);
    let baseStyle = createBaseStyle(currentTheme);

    while (container.firstChild) container.removeChild(container.firstChild);
    container.style.cssText = baseStyle.default;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position:absolute;top:0;left:0;width:${width}px;height:${height}px;transform-origin:0 0;`;

    const ctxBase = { id: containerId, embedId: containerId, width, height, theme: currentTheme, themeName: currentThemeName, baseCss, isIOS };

    let finalHtml = '';
    if (isMinigame) finalHtml = generateMinigameHTML(ctxBase, config);
    else {
      const generator = typeof htmlGenerator === 'function' ? htmlGenerator : () => html || '';
      finalHtml = generator(Object.assign({}, ctxBase, { isStandalone: false }));
    }

    const fitNorm = normalizeFitMode(fitMode);
    const fitHead = fitNorm === 'no-scroll' ? `<script>(function(){try{document.documentElement.classList.add('piai-fit-noscroll');}catch(_){}})();<\/script>` : '';
    const headExtraFinal = (headExtra || '') + fitHead;

    if (!finalHtml) { console.warn('[PiAI Engine] No content to render'); return; }

    const iframeHtml = buildHtmlDocument(finalHtml, baseCss, headExtraFinal);
    const blobUrl = URL.createObjectURL(new Blob([iframeHtml], { type: 'text/html' }));

    const iframe = document.createElement('iframe');
    iframe.src = blobUrl;
    iframe.style.cssText = `width:100%;height:100%;border:none;display:block;background:${isMinigame ? 'transparent' : (currentTheme.bg || '#f9f7f5')};`;
    iframe.scrolling = 'no';
    iframe.loading = 'lazy';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-popups';
    iframe.allow = 'fullscreen; clipboard-read; clipboard-write; autoplay; encrypted-media';

    iframe.onload = function () {
      try { URL.revokeObjectURL(blobUrl); } catch (_) { }
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'piaiInit', id: containerId, version: '3.14.0' }, '*');
        iframe.contentWindow.postMessage({ type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme }, '*');
      }
      if (typeof onReady === 'function') onReady(iframe, ctxBase);
    };

    let isFull = false;
    let resizeRAF = null;
    let lastScale = 1;
    let baseHeight = 0;

    // Check if user is actively editing text (keyboard likely open)
    const isTextEditing = () => {
      const el = document.activeElement;
      if (!el) return false;
      if (el instanceof HTMLInputElement) {
        const textTypes = ['text', 'password', 'email', 'search', 'tel', 'url', 'number'];
        return textTypes.includes(el.type);
      }
      if (el instanceof HTMLTextAreaElement) return true;
      if (el instanceof HTMLElement && el.isContentEditable) return true;
      return false;
    };

    const updateScale = () => {
      const rect = container.getBoundingClientRect();

      // Use container dimensions for normal mode, window for fullscreen
      const containerWidth = isFull ? window.innerWidth : (rect.width || container.clientWidth || width);
      const containerHeight = isFull ? window.innerHeight : (rect.height || container.clientHeight || height);

      // Track base height when not editing
      if (!isTextEditing() && containerHeight > 0) {
        baseHeight = containerHeight;
      }

      // Detect keyboard open: editing + height reduced significantly (>150px)
      const isKeyboardOpen = isTextEditing() && baseHeight > 0 && (baseHeight - containerHeight) > 150;

      let scale;
      if (isKeyboardOpen) {
        // Freeze scale when keyboard is open
        scale = lastScale;
      } else {
        // Always use fit-to-screen formula
        scale = Math.min(containerWidth / width, containerHeight / height);
        if (!Number.isFinite(scale) || scale <= 0) scale = lastScale || 1;
        lastScale = scale;
      }

      // Calculate centered position
      const scaledW = width * scale;
      const scaledH = height * scale;
      const x = (containerWidth - scaledW) / 2;
      const y = (containerHeight - scaledH) / 2;

      if (isFull) {
        // Fullscreen: center content in viewport
        wrapper.style.transformOrigin = '0 0';
        wrapper.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      } else {
        // Normal mode: set aspect ratio and scale content
        // Set container height based on scaled content
        container.style.height = `${scaledH}px`;
        container.style.aspectRatio = `${width} / ${height}`;

        // Center the wrapper within container
        wrapper.style.transformOrigin = '0 0';
        wrapper.style.transform = `translate(${x >= 0 ? x : 0}px, ${y >= 0 ? y : 0}px) scale(${scale})`;
      }
    };

    const setFullscreen = (state) => {
      isFull = state;
      container.style.cssText = state ? baseStyle.fullscreen : baseStyle.default;
      requestAnimationFrame(updateScale);
      try { iframe.contentWindow && iframe.contentWindow.postMessage({ type: 'fullscreenState', id: containerId, isFullscreen: state }, '*'); } catch (_) { }
    };

    const switchTheme = () => {
      let idx = THEME_ORDER.indexOf(currentThemeName);
      if (idx < 0) idx = 0;
      currentThemeName = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
      currentTheme = getThemeByName(currentThemeName);
      baseCss = getBaseCss(currentTheme);
      baseStyle = createBaseStyle(currentTheme);
      container.style.cssText = isFull ? baseStyle.fullscreen : baseStyle.default;
      iframe.style.background = isMinigame ? 'transparent' : (currentTheme.bg || '#f9f7f5');
      updateScale();
      try { iframe.contentWindow && iframe.contentWindow.postMessage({ type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme }, '*'); } catch (_) { }
      if (typeof onThemeChange === 'function') onThemeChange(currentThemeName, currentTheme);
    };

    // Toggle fullscreen logic matching useFullscreen hook
    const onMessage = (e) => {
      if (!e.data || e.data.id !== containerId) return;

      if (e.data.type === 'toggleFullscreen') {
        const { isIOS } = detectDevice();

        // iOS: Open game URL in new tab for true fullscreen experience
        // iOS Safari doesn't support Fullscreen API - new tab gives best UX
        if (isIOS) {
          window.open(iframe.src, '_blank');
          return;
        }

        // Non-iOS: Try native fullscreen API with fallback
        const fsElement = document.fullscreenElement || document.webkitFullscreenElement;

        if (!fsElement) {
          // Request fullscreen
          if (container.requestFullscreen) {
            container.requestFullscreen()
              .then(() => setFullscreen(true))
              .catch(() => setFullscreen(true)); // CSS fallback on error
          } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
            setFullscreen(true);
          } else {
            // No API available, use CSS fallback
            setFullscreen(true);
          }
        } else {
          // Exit fullscreen
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          }
          setFullscreen(false);
        }
      }

      if (e.data.type === 'switchTheme') switchTheme();
    };

    // Fullscreen change handler matching useFullscreen hook
    const onFullscreenChange = () => {
      const { isIOS } = detectDevice();
      const fsElement = document.fullscreenElement || document.webkitFullscreenElement;

      // Sync state: If we have a native FS element and it matches our container
      if (fsElement && fsElement === container) {
        setFullscreen(true);
      } else if (!fsElement && !isIOS) {
        // Only set false if NOT iOS (iOS uses CSS mode)
        setFullscreen(false);
      }
    };

    // Escape key handler - only for iOS CSS fullscreen mode
    const onKeydown = (e) => {
      const { isIOS } = detectDevice();
      if (e.key === 'Escape' && isFull && isIOS) {
        setFullscreen(false);
      }
    };

    const onResize = () => {
      if (resizeRAF) cancelAnimationFrame(resizeRAF);
      resizeRAF = requestAnimationFrame(updateScale);
    };

    window.addEventListener('message', onMessage);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
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
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('keydown', onKeydown);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      try { observer.disconnect(); } catch (_) { }
    }

    container.__piaiCleanup = cleanup;
    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
    updateScale();
    debugLog('Embed mounted successfully', { containerId, version: '3.14.0' }, debug);
  }

  global.PiaiEmbed = { version: '3.14.0', render, themes: THEMES, getThemeByName, getBaseCss, defaults: DEFAULT_CONFIG };
})(window);
