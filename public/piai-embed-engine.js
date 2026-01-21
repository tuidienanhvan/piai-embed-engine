// ==============================================================================
// PiAI Embed Engine v3.18.0
// ==============================================================================
// CHANGELOG v3.18.0:
// ------------------
// 1. BREAKING: Replace mateId with questionPoolConfig
//    - questionPoolConfig: { taxo_subject, taxo_section, taxo_subsection, quantity }
// 2. REMOVE: apiBases, questionPoolEndpoints (game calls API directly now)
// 3. NEW: Pass questionPoolConfig to game via postMessage
// 4. All v3.17.0 features preserved (lazy loading, service worker, memory monitoring)
//
// CHANGELOG v3.17.0:
// ------------------
// 1. CHANGE: Aspect ratio reverted to 16:9 (800x450)
// 2. NEW: renderLazy() for lazy loading components
// 3. NEW: Service Worker auto-registration for CDN caching
// 4. NEW: Mobile CSS optimizations (tap-highlight, touch-action)
// 5. NEW: Memory monitoring in debug mode
// ==============================================================================

(function (global) {
    'use strict';

    const THEMES = {
        classic: {
            name: 'classic',
            primary: '#800020',
            accent: '#C9A227',
            secondary: '#1E4D78',
            bg: '#FAF8F5',
            text: '#2D3748',
            textLight: '#718096'
        },
        educational: {
            name: 'educational',
            primary: '#1976D2',
            accent: '#FF9800',
            secondary: '#388E3C',
            bg: '#FAFAFA',
            text: '#1A1A1A',
            textLight: '#5F6368'
        },
        night: {
            name: 'night',
            primary: '#79B8A4',
            accent: '#FF4081',
            secondary: '#9A8FC2',
            bg: '#1E1E2E',
            text: '#E8E6E3',
            textLight: '#A8A5A0'
        },
    };

    const THEME_ORDER = ['educational', 'classic', 'night'];

    // ==============================================================================
    // CDN OPTIMIZATION
    // ==============================================================================
    const CDN_REGISTRY = {
        jsxgraph: {
            core: 'https://cdn.jsdelivr.net/npm/jsxgraph@1.5.0/distrib/jsxgraphcore.js',
            css: 'https://cdn.jsdelivr.net/npm/jsxgraph@1.5.0/distrib/jsxgraph.css'
        },
        mathjax: 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js',
        lucide: 'https://unpkg.com/lucide@0.294.0/dist/umd/lucide.min.js'
    };

    if (!window.__piaiCDN) {
        window.__piaiCDN = {
            loaded: new Set(),
            loading: new Map(),
            preloaded: false
        };
    }

    function preloadCDN() {
        if (window.__piaiCDN.preloaded) return;
        window.__piaiCDN.preloaded = true;

        const head = document.head;
        const urls = [
            CDN_REGISTRY.jsxgraph.core,
            CDN_REGISTRY.jsxgraph.css,
            CDN_REGISTRY.mathjax,
            CDN_REGISTRY.lucide
        ];

        urls.forEach(url => {
            if (url.endsWith('.css')) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'style';
                link.href = url;
                head.appendChild(link);
            } else {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'script';
                link.href = url;
                link.crossOrigin = 'anonymous';
                head.appendChild(link);
            }
        });

        if ('serviceWorker' in navigator && !window.__piaiSWRegistered) {
            window.__piaiSWRegistered = true;
            navigator.serviceWorker.register('/piai-sw.js', { scope: '/' }).catch(() => { });
        }
    }

    function loadCDNScript(url) {
        if (window.__piaiCDN.loaded.has(url)) {
            return Promise.resolve(true);
        }
        if (window.__piaiCDN.loading.has(url)) {
            return window.__piaiCDN.loading.get(url);
        }
        const promise = new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${url}"]`);
            if (existing) {
                window.__piaiCDN.loaded.add(url);
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = url;
            script.crossOrigin = 'anonymous';
            script.async = true;
            script.onload = () => {
                window.__piaiCDN.loaded.add(url);
                window.__piaiCDN.loading.delete(url);
                resolve(true);
            };
            script.onerror = () => {
                window.__piaiCDN.loading.delete(url);
                reject(new Error(`Failed to load ${url}`));
            };
            document.head.appendChild(script);
        });
        window.__piaiCDN.loading.set(url, promise);
        return promise;
    }

    function loadCDNStyle(url) {
        if (window.__piaiCDN.loaded.has(url)) {
            return Promise.resolve(true);
        }
        if (window.__piaiCDN.loading.has(url)) {
            return window.__piaiCDN.loading.get(url);
        }
        const promise = new Promise((resolve) => {
            const existing = document.querySelector(`link[href="${url}"]`);
            if (existing) {
                window.__piaiCDN.loaded.add(url);
                resolve(true);
                return;
            }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = () => {
                window.__piaiCDN.loaded.add(url);
                window.__piaiCDN.loading.delete(url);
                resolve(true);
            };
            link.onerror = () => {
                window.__piaiCDN.loading.delete(url);
                resolve(false);
            };
            document.head.appendChild(link);
        });
        window.__piaiCDN.loading.set(url, promise);
        return promise;
    }

    let preloadInitialized = false;

    // ==============================================================================
    // CONFIG - v3.18.0: New questionPoolConfig
    // ==============================================================================
    const DEFAULT_CONFIG = {
        width: 800,
        height: 450,
        aspect: '16 / 9',
        themeName: 'educational',
        headExtra: '',
        fitMode: 'scroll',
        header: true,
        branding: true,
        debug: false,

        lazy: false,
        lazyThreshold: 200,

        gameKey: '',
        gameUrl: '',
        gameOrigin: '',

        // v3.18.0: New questionPoolConfig (replaces mateId)
        questionPoolConfig: {
            taxo_subject: 'AIPRO_6',
            taxo_section: 'MODULE_1_AI_DOI_SONG',
            taxo_subsection: 'BAI_1_AI_QUANH_TA',
            quantity: 15
        }
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
        if (debugEnabled) console.log(`[PiAI Engine v3.18.0] ${message}`, data || '');
    }

    function safeOrigin(url) {
        try { return new URL(url, window.location.href).origin; } catch (_) { return ''; }
    }

    function getBaseCss(theme) {
        return `:root{--piai-primary:${theme.primary};--piai-accent:${theme.accent};--piai-secondary:${theme.secondary};--piai-bg:${theme.bg};--piai-text:${theme.text};--piai-text-light:${theme.textLight}}*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}html,body{width:100%;height:100%}body{font-family:${SYSTEM_FONT_STACK};font-size:16px;line-height:1.6;color:var(--piai-text);background:transparent;overflow:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}.piai-wrap{width:100%;height:100%;background:var(--piai-bg);display:flex;flex-direction:column;overflow:hidden;position:relative;isolation:isolate}
.piai-hdr{background:var(--piai-primary);color:#fff;padding:12px 20px;padding-right:130px;font-size:18px;font-weight:700;display:flex;align-items:center;gap:10px;line-height:1.2;border-bottom:3px solid var(--piai-accent);position:relative}
.piai-hdr svg{width:20px;height:20px;display:block;flex:0 0 auto}
.piai-body{flex:1;padding:15px 20px;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;min-height:0;position:relative;z-index:1;font-size:16px;-webkit-overflow-scrolling:touch}
.piai-body>*{margin-bottom:15px}.piai-body>*:last-child{margin-bottom:0}
.piai-body::-webkit-scrollbar{width:6px}.piai-body::-webkit-scrollbar-thumb{background:var(--piai-text-light);border-radius:3px}
.piai-body.no-pad{padding:0!important;overflow:hidden!important;width:100%;height:100%}
iframe.game-frame{border:none;width:100%;height:100%;display:block}
.piai-def{background:var(--piai-bg);border-left:5px solid var(--piai-primary);padding:12px 18px;border-radius:0 8px 8px 0;transition:box-shadow .25s ease;font-size:16px}.piai-def-title{color:var(--piai-primary);font-size:16px;font-weight:700;display:flex;align-items:center;gap:10px;line-height:1.25;margin-bottom:6px}.piai-grid{display:flex;flex:1;min-height:0;gap:20px}.piai-list{flex:1;display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;padding-right:26px;padding-left:6px}.piai-list-item{display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:8px;background:var(--piai-bg);border-radius:10px;box-shadow:inset 0 0 0 1px var(--piai-text-light);transition:box-shadow .18s ease;font-size:16px}.piai-list-item:hover{box-shadow:inset 0 0 0 2px var(--piai-accent),0 2px 8px rgba(0,0,0,0.08)}.piai-list-item .piai-ico{color:var(--piai-accent);width:24px;height:24px;flex:0 0 24px;display:flex;align-items:center;justify-content:center}.piai-visual{flex:0 0 280px;display:flex;align-items:center;justify-content:center}
.hdr-btn{position:absolute;top:50%;transform:translateY(-50%);z-index:999;width:48px;height:48px;background:transparent;border:none;cursor:pointer;color:var(--piai-accent);display:flex;align-items:center;justify-content:center;transition:color .2s ease}.hdr-btn:hover{color:#fff}.fs-btn{right:0}.theme-btn{right:58px}
.piai-loader{position:absolute;inset:0;background:rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);transition:opacity .3s ease,visibility .3s ease}.piai-loader.hide{opacity:0;visibility:hidden}.piai-loader .loader-inner{padding:14px 28px;border-radius:30px;background:rgba(255,255,255,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.5);box-shadow:0 8px 32px 0 rgba(31,38,135,0.15);display:flex;align-items:center;gap:12px}.spinner{width:24px;height:24px;border:3px solid transparent;border-top-color:var(--piai-primary,#007bff);border-right-color:var(--piai-primary,#007bff);border-radius:50%;animation:spin .8s linear infinite}.loader-text{font-size:16px;font-weight:600;color:#333}@keyframes spin{to{transform:rotate(360deg)}}
.piai-brand{position:absolute;right:-20px;bottom:12px;width:96px;height:26px;background:var(--piai-primary);opacity:.95;pointer-events:none;z-index:10;-webkit-mask-image:url("https://piai-embed-engine.vercel.app/public/logo.svg");-webkit-mask-repeat:no-repeat;-webkit-mask-position:left center;-webkit-mask-size:contain;mask-image:url("https://piai-embed-engine.vercel.app/public/logo.svg");mask-repeat:no-repeat;mask-position:left center;mask-size:contain}
.piai-skeleton{width:100%;height:100%;background:linear-gradient(90deg,var(--piai-bg) 25%,rgba(255,255,255,0.15) 50%,var(--piai-bg) 75%);background-size:200% 100%;animation:piai-shimmer 1.5s ease-in-out infinite;display:flex;align-items:center;justify-content:center;color:var(--piai-text-light);font-size:14px;font-weight:500}@keyframes piai-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.MathJax,.MathJax_Display,.MathJax svg,mjx-container,mjx-container svg{image-rendering:-webkit-optimize-contrast;-webkit-font-smoothing:antialiased;shape-rendering:geometricPrecision;text-rendering:geometricPrecision}.MathJax,mjx-container{transform:none!important;backface-visibility:visible!important}`;
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

    function getBorderColor(theme) {
        return (theme.primary || '#800020') + '26';
    }

    function createBaseStyle(theme) {
        const borderCol = getBorderColor(theme);
        return {
            default: `width:100%;max-width:100%;display:block;position:relative;box-sizing:border-box;border-radius:${BASE_RADIUS}px;border:1px solid ${borderCol};overflow:hidden;background:transparent;`,
            fullscreen: `position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;box-sizing:border-box;margin:0;border-radius:0;z-index:99999;background:#000;border:none;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);`,
        };
    }

    function generateMinigameHTML(ctx, config) {
        const origin = window.location.origin;
        const gameUrl = config.gameUrl;
        const gameOrigin = config.gameOrigin || safeOrigin(gameUrl);

        const cookieRaw = document.cookie || '';
        const safeCookie = cookieRaw.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');

        // v3.18.0: Use questionPoolConfig instead of mateId
        const qpConfig = config.questionPoolConfig || DEFAULT_CONFIG.questionPoolConfig;

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
          gameKey: "${config.gameKey || 'unknown-game'}",
          gameUrl: "${gameUrl}",
          gameOrigin: "${gameOrigin}",
          debug: ${!!config.debug},
          questionPoolConfig: ${JSON.stringify(qpConfig)}
        };

        function log(m, d){ if(CFG.debug) console.log("[Bridge] "+m, d||""); }

        function getCookie(name){
          const match = CFG.cookies.match('(^|;) ?' + name + '=([^;]*)(;|$)');
          return match ? match[2] : null;
        }

        function getUser(){
          let user = { name:"Khách", username:"guest", email:"", userId:null };
          const jwt = getCookie("edx-jwt-cookie-header-payload");
          if(jwt){
            try{
              const payload = JSON.parse(atob(jwt.split(".")[1]));
              user.name = payload.name || payload.preferred_username;
              user.username = payload.preferred_username;
              user.email = payload.email || '';
              user.userId = payload.user_id || null;
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

        function getCourseId(){
          try{
            var path = window.location && window.location.pathname ? window.location.pathname : '';
            var parts = path.split('/');
            for(var i=0; i<parts.length; i++){
              var seg = parts[i];
              if(!seg) continue;
              if(seg.indexOf('course-v1:') === 0) return seg;
              if(seg.indexOf('block-v1:') === 0){
                var s = seg.substring('block-v1:'.length);
                var tp = s.indexOf('+type');
                var coursePart = tp !== -1 ? s.substring(0, tp) : s;
                if(coursePart) return 'course-v1:' + coursePart;
              }
            }
          }catch(e){}
          try{
            var referrer = document.referrer || '';
            if(referrer){
              var url = new URL(referrer);
              var rParts = url.pathname.split('/');
              for(var j=0; j<rParts.length; j++){
                var segR = rParts[j];
                if(!segR) continue;
                if(segR.indexOf('course-v1:') === 0) return segR;
                if(segR.indexOf('block-v1:') === 0){
                  var ss = segR.substring('block-v1:'.length);
                  var tpos = ss.indexOf('+type');
                  var cpart = tpos !== -1 ? ss.substring(0, tpos) : ss;
                  if(cpart) return 'course-v1:' + cpart;
                }
              }
            }
          }catch(e){}
          try{
            var anc = window;
            var depth = 0;
            while(anc && anc !== anc.parent && depth < 6){
              try{
                var ap = anc.location && anc.location.pathname ? anc.location.pathname : '';
                if(ap){
                  var aparts = ap.split('/');
                  for(var k=0; k<aparts.length; k++){
                    var segA = aparts[k];
                    if(!segA) continue;
                    if(segA.indexOf('course-v1:') === 0) return segA;
                    if(segA.indexOf('block-v1:') === 0){
                      var sss = segA.substring('block-v1:'.length);
                      var tpos2 = sss.indexOf('+type');
                      var cpart2 = tpos2 !== -1 ? sss.substring(0, tpos2) : sss;
                      if(cpart2) return 'course-v1:' + cpart2;
                    }
                  }
                }
              }catch(e){}
              try{ anc = anc.parent; }catch(e){ break; }
              depth++;
            }
          }catch(e){}
          return '';
        }

        async function fetchTry(url, options){
          return await fetch(url, options);
        }

        // v3.18.0: Simplified API - only for logs, no question pool fetching
        const API_BASES = [
          window.location.origin + '/api/minigames/',
          'https://apps.pistudy.vn/api/minigames/',
          'https://pistudy.vn/api/minigames/'
        ];
        let apiBase = null;

        async function apiAny(endpoint, options){
          const opt = Object.assign({ credentials:"include" }, options || {});
          const list = apiBase ? [apiBase] : API_BASES;
          let lastErr = null;
          for(let i=0;i<list.length;i++){
            const base = list[i];
            const url = base + endpoint;
            try{
              const res = await fetchTry(url, opt);
              if(!res.ok) throw new Error("HTTP "+res.status);
              apiBase = base;
              return res;
            }catch(e){
              lastErr = e;
            }
          }
          throw lastErr || new Error("API Error");
        }

        async function fetchStats(){
          try{
            const res = await apiAny("logs/");
            const data = await res.json();
            const rows = Array.isArray(data) ? data : (data.results || []);
            let playCount = 0, bestScore = 0;
            const history = [];
            rows.forEach(item => {
              if(item.payload && item.payload.gameKey === CFG.gameKey){
                if(item.msgtype === 'RESULT'){
                  playCount++;
                  const s = Number(item.payload.score || 0);
                  if(s > bestScore) bestScore = s;
                }
                history.push({
                  id: item.id,
                  msgtype: item.msgtype,
                  tsms: item.tsms,
                  payload: item.payload
                });
              }
            });
            history.sort((a, b) => (b.tsms || 0) - (a.tsms || 0));
            const recentHistory = history.slice(0, 50);
            log("fetchStats", { playCount, bestScore, historyCount: recentHistory.length });
            return { playCount, bestScore, history: recentHistory };
          }catch(e){
            log("fetchStats error", e);
            return { playCount: 0, bestScore: 0, history: [] };
          }
        }

        async function fetchUserStats(){
          try{
            const res = await apiAny("user-stats/");
            const data = await res.json();
            log("fetchUserStats", data);
            return {
              total_coins: data.total_coins || 0,
              total_xp: data.total_xp || 0,
              level: data.level || 0
            };
          }catch(e){
            log("fetchUserStats error", e);
            return { total_coins: 0, total_xp: 0, level: 0 };
          }
        }

        async function saveResult(data){
          try{
            const body = data;
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

        function sendBaseData(statsWithHistory, userStats){
          const currentUser = getUser();
          const data = {
            type: "MINIGAME_DATA",
            name: currentUser.name,
            username: currentUser.username,
            email: currentUser.email,
            userId: currentUser.userId,
            total_coins: userStats ? userStats.total_coins : 0,
            total_xp: userStats ? userStats.total_xp : 0,
            level: userStats ? userStats.level : 0,
            stats: {
              playCount: statsWithHistory.playCount,
              bestScore: statsWithHistory.bestScore
            },
            history: statsWithHistory.history,
            env: { 
              gameKey: CFG.gameKey,
              questionPoolConfig: CFG.questionPoolConfig
            }
          };
          log("sendBaseData", { stats: data.stats, total_coins: data.total_coins, historyCount: data.history.length });
          send(data);
        }

        window.addEventListener("message", function(event){
          if(CFG.gameOrigin && event.origin !== CFG.gameOrigin) return;
          const msg = event.data || {};
          (async function(){
            if(msg.type === "MINIGAME_READY" || (msg.type === "MINIGAME_ACTION" && msg.action === "REFRESH_STATS")){
              log("Received MINIGAME_READY or REFRESH_STATS");
              const st = await fetchStats();
              const us = await fetchUserStats();
              sendBaseData(st, us);
            }
            if(msg.type === "MINIGAME_ACTION" && msg.action === "SAVE_RESULT"){
              log("Received SAVE_RESULT", msg.data);
              await saveResult(msg.data || {});
              const st = await fetchStats();
              const us = await fetchUserStats();
              sendBaseData(st, us);
            }
          })();
        });
      })();
      <\/script>
    `;
    }

    function renderLazy(options) {
        if (!options.id) { console.error('[PiAI Engine] renderLazy requires an id'); return; }

        const container = document.getElementById(options.id);
        if (container) {
            container.innerHTML = `<div class="piai-skeleton" style="aspect-ratio:16/9;border-radius:16px;overflow:hidden;background:#f0f0f0;">Đang tải...</div>`;
        }

        const opts = Object.assign({}, DEFAULT_CONFIG, options);
        const threshold = opts.lazyThreshold || 200;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    observer.disconnect();
                    render(opts);
                }
            });
        }, { rootMargin: `${threshold}px` });

        if (container) observer.observe(container);
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
            setTimeout(function () {
                try { URL.revokeObjectURL(blobUrl); } catch (_) { }
            }, 100);

            if (debug && performance.memory) {
                const usedMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
                const limitMB = (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
                debugLog('Memory', { used: `${usedMB}MB`, limit: `${limitMB}MB` }, debug);
            }

            if (iframe.contentWindow) {
                iframe.contentWindow.postMessage({ type: 'piaiInit', id: containerId, version: '3.18.0' }, '*');
                iframe.contentWindow.postMessage({ type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme }, '*');
            }
            if (typeof onReady === 'function') onReady(iframe, ctxBase);
        };

        let isFull = false;
        let resizeRAF = null;
        let lastScale = 1;

        const updateScale = () => {
            const rect = container.getBoundingClientRect();
            const containerWidth = isFull ? window.innerWidth : (rect.width || container.clientWidth || width);
            const containerHeight = isFull ? window.innerHeight : (rect.height || container.clientHeight || height);

            if (containerWidth <= 0 || !Number.isFinite(containerWidth)) return;

            let scale;
            if (isFull) {
                scale = Math.min(containerWidth / width, containerHeight / height);
            } else {
                scale = containerWidth / width;
            }

            if (!Number.isFinite(scale) || scale <= 0) scale = lastScale || 1;
            if (Math.abs(scale - lastScale) < 0.005 && lastScale > 0) return;

            lastScale = scale;
            const scaledW = width * scale;
            const scaledH = height * scale;

            if (isFull) {
                const x = (containerWidth - scaledW) / 2;
                const y = (containerHeight - scaledH) / 2;
                wrapper.style.transformOrigin = '0 0';
                wrapper.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
            } else {
                container.style.height = `${scaledH}px`;
                wrapper.style.transformOrigin = '0 0';
                wrapper.style.transform = `scale(${scale})`;
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

            if (isFull) {
                container.style.cssText = baseStyle.fullscreen;
            } else {
                const borderCol = getBorderColor(currentTheme);
                container.style.borderColor = borderCol;
            }

            iframe.style.background = isMinigame ? 'transparent' : (currentTheme.bg || '#f9f7f5');
            updateScale();
            try { iframe.contentWindow && iframe.contentWindow.postMessage({ type: 'piaiApplyTheme', id: containerId, themeName: currentThemeName, theme: currentTheme }, '*'); } catch (_) { }
            if (typeof onThemeChange === 'function') onThemeChange(currentThemeName, currentTheme);
        };

        const onMessage = (e) => {
            if (!e.data || e.data.id !== containerId) return;

            if (e.data.type === 'toggleFullscreen') {
                const { isIOS } = detectDevice();
                if (isIOS) {
                    window.open(iframe.src, '_blank');
                    return;
                }
                const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
                if (!fsElement) {
                    if (container.requestFullscreen) {
                        container.requestFullscreen()
                            .then(() => setFullscreen(true))
                            .catch(() => setFullscreen(true));
                    } else if (container.webkitRequestFullscreen) {
                        container.webkitRequestFullscreen();
                        setFullscreen(true);
                    } else {
                        setFullscreen(true);
                    }
                } else {
                    if (document.exitFullscreen) document.exitFullscreen();
                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                    setFullscreen(false);
                }
            }
            if (e.data.type === 'switchTheme') switchTheme();
        };

        const onFullscreenChange = () => {
            const { isIOS } = detectDevice();
            const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
            if (fsElement && fsElement === container) setFullscreen(true);
            else if (!fsElement && !isIOS) setFullscreen(false);
        };

        const onKeydown = (e) => {
            const { isIOS } = detectDevice();
            if (e.key === 'Escape' && isFull && isIOS) setFullscreen(false);
        };

        const onResize = () => {
            if (resizeRAF) cancelAnimationFrame(resizeRAF);
            resizeRAF = requestAnimationFrame(updateScale);
        };

        const onOrientationChange = () => {
            if (resizeRAF) cancelAnimationFrame(resizeRAF);
            setTimeout(() => {
                resizeRAF = requestAnimationFrame(updateScale);
            }, 200);
        };

        window.addEventListener('message', onMessage);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange);
        document.addEventListener('keydown', onKeydown);
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onOrientationChange);

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
            try { if (iframe && iframe.src) iframe.src = 'about:blank'; } catch (_) { }
            try { URL.revokeObjectURL(blobUrl); } catch (_) { }
            window.removeEventListener('message', onMessage);
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
            document.removeEventListener('keydown', onKeydown);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onOrientationChange);
            try { observer.disconnect(); } catch (_) { }
            try { if (iframe && iframe.parentNode) iframe.remove(); } catch (_) { }
        }

        container.__piaiCleanup = cleanup;
        wrapper.appendChild(iframe);
        container.appendChild(wrapper);
        updateScale();

        if (!preloadInitialized) {
            preloadInitialized = true;
            setTimeout(preloadCDN, 0);
        }

        debugLog('Embed mounted successfully', { containerId, version: '3.18.0' }, debug);
    }

    global.PiaiEmbed = {
        version: '3.18.0',
        render,
        renderLazy,
        themes: THEMES,
        getThemeByName,
        getBaseCss,
        defaults: DEFAULT_CONFIG,
        cdn: {
            registry: CDN_REGISTRY,
            loadScript: loadCDNScript,
            loadStyle: loadCDNStyle,
            preload: preloadCDN
        }
    };
})(window);
