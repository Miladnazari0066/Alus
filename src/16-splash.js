'use strict';

/** Animated launch splash (skipped under prefers-reduced-motion). */
function showSplash() {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var existing = document.querySelector('.splash');
    if (existing) existing.remove();
    var wrap = document.createElement('div');
    wrap.className = 'splash';
    wrap.innerHTML =
      '<div class="splash-inner">' +
        '<div class="splash-logo-wrap">' +
          '<div class="splash-glow"></div>' +
          '<div class="splash-ring"></div>' +
          '<div class="splash-ring r2"></div>' +
          '<div class="splash-ring r3"></div>' +
          '<div class="splash-logo">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' +
              '<path class="splash-path-1" d="M5 19L12 4L19 19" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>' +
              '<path class="splash-path-2" d="M8.5 13.5h7" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>' +
            '</svg>' +
          '</div>' +
        '</div>' +
        '<div class="splash-wordmark"><span>A</span><span>l</span><span>u</span><span>s</span></div>' +
        // 👇 عبارت Furniture Management از اینجا حذف شد 👇
        '<div class="splash-progress-track"><div class="splash-progress-bar"></div></div>' +
        '<div class="splash-percent">0%</div>' +
      '</div>';
    (document.body || document.documentElement).appendChild(wrap);
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
    var removed = false;
    function cleanup() {
      if (removed) return;
      removed = true;
      if (wrap && wrap.parentNode) wrap.remove();
      try { document.body.style.overflow = ''; } catch (e) {}
    }
    setTimeout(cleanup, 3100);
    wrap.addEventListener('animationend', function (e) { if (e.animationName === 'splashFade') cleanup(); });
    setTimeout(cleanup, 4000);
    var pctEl = wrap.querySelector('.splash-percent');
    if (pctEl) {
      var start = null, dur = 1400, delay = 1300;
      function tick(now) {
        if (!start) start = now;
        var t = Math.max(0, now - start - delay);
        var p = Math.min(t / dur, 1);
        var eased = 1 - Math.pow(1 - p, 2);
        if (pctEl && pctEl.parentNode) pctEl.textContent = Math.round(eased * 100) + '%';
        if (p < 1 && wrap.parentNode) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
  } catch (e) { console.error('[splash]', e); }
}