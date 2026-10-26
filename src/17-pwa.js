'use strict';

var PWA = (function () {

  /**
   * Draws a PWA icon (192/512, normal or maskable) on a canvas.
   * Returns a data URL string, or null if canvas is unavailable.
   */
  function drawIcon(size, maskable) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var x = c.getContext('2d');
    if (!x) return null;
    var s = size;
    var pad = maskable ? s * 0.18 : s * 0.06;
    var g = x.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#007AFF');
    g.addColorStop(0.55, '#5856D6');
    g.addColorStop(1, '#AF52DE');
    x.fillStyle = g;
    if (maskable) {
      x.fillRect(0, 0, s, s);
    } else {
      var r = s * 0.22;
      x.beginPath();
      x.moveTo(r, 0);
      x.lineTo(s - r, 0);
      x.quadraticCurveTo(s, 0, s, r);
      x.lineTo(s, s - r);
      x.quadraticCurveTo(s, s, s - r, s);
      x.lineTo(r, s);
      x.quadraticCurveTo(0, s, 0, s - r);
      x.lineTo(0, r);
      x.quadraticCurveTo(0, 0, r, 0);
      x.closePath();
      x.fill();
    }
    x.save();
    x.globalCompositeOperation = 'source-atop';
    var hg = x.createRadialGradient(s * 0.75, s * 0.2, 0, s * 0.75, s * 0.2, s * 0.9);
    hg.addColorStop(0, 'rgba(255,255,255,.35)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = hg;
    x.fillRect(0, 0, s, s);
    x.restore();
    var inner = s - pad * 2;
    var w = inner * 0.62, h = inner * 0.70;
    var cx = s / 2, cy = s / 2 + s * 0.01;
    x.strokeStyle = '#fff';
    x.lineWidth = Math.max(2, inner * 0.085);
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.beginPath();
    x.moveTo(cx - w / 2, cy + h / 2);
    x.lineTo(cx, cy - h / 2);
    x.lineTo(cx + w / 2, cy + h / 2);
    x.stroke();
    var barY = cy + h * 0.17;
    x.beginPath();
    x.moveTo(cx - w * 0.24, barY);
    x.lineTo(cx + w * 0.24, barY);
    x.stroke();
    try { return c.toDataURL('image/png'); } catch (e) { return null; }
  }

  /**
   * Computes the deployment base URL from the current page location.
   * On GitHub Pages (e.g. https://user.github.io/Alus/) returns ".../Alus/";
   * on localhost returns "http://localhost:port/".
   */
  function getBaseUrl() {
    try {
      var origin = location.origin;
      var path = location.pathname;
      // Strip the last segment ("index.html" or empty) and keep the trailing slash
      var basePath = path.substring(0, path.lastIndexOf('/') + 1);
      if (!basePath) basePath = '/';
      return origin + basePath;
    } catch (e) {
      return location.href;
    }
  }

  function installManifest() {
    var i192  = drawIcon(192, false), i512  = drawIcon(512, false);
    var i192m = drawIcon(192, true),  i512m = drawIcon(512, true);
    if (!i192 || !i512 || !i192m || !i512m) {
      console.warn('[pwa] icon canvas unavailable, skipping manifest');
      return;
    }

    var fav = document.createElement('link');
    fav.rel = 'icon';
    fav.type = 'image/png';
    fav.href = i192;
    document.head.appendChild(fav);

    var apple = document.createElement('link');
    apple.rel = 'apple-touch-icon';
    apple.href = i192;
    document.head.appendChild(apple);

    // Absolute URLs — required because the manifest is served from a blob: URL,
    // so relative paths would be resolved against "blob:" (invalid).
    var base = getBaseUrl();

    var manifest = {
      name: 'Alus — پنل مدیریت',
      short_name: 'Alus',
      description: 'مدیریت هوشمند موجودی و جابه‌جایی مبلمان',
      start_url: base,
      scope: base,
      display: 'standalone',
      display_override: ['standalone', 'minimal-ui'],
      orientation: 'any',
      background_color: '#007AFF',
      theme_color: '#007AFF',
      dir: 'rtl',
      lang: 'fa-IR',
      categories: ['business', 'productivity'],
      icons: [
        { src: i192,  sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: i512,  sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: i192m, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: i512m, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    };

    var url;
    try {
      url = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
    } catch (e) {
      url = 'data:application/manifest+json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifest));
    }

    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = url;
    document.head.appendChild(link);
  }

  var deferredPrompt = null;
  var installShown = false;

  function showInstallToast() {
    if (installShown || !deferredPrompt) return;
    try { if (sessionStorage.getItem('alus_install_dismissed') === '1') return; } catch (e) {}
    if (document.querySelector('.install-toast')) return;
    installShown = true;
    var t = document.createElement('div');
    t.className = 'install-toast';
    t.innerHTML = '<div class="alus-mark" style="width:36px;height:36px;border-radius:50%;flex-shrink:0">' + BRAND_A + '</div>' +
      '<div class="txt">نصب Alus<small>برای دسترسی سریع روی صفحه اصلی</small></div>' +
      '<button type="button" data-act="install">' + IC.download + ' نصب</button>' +
      '<button type="button" class="x" data-act="dismiss">' + IC.close + '</button>';
    document.body.appendChild(t);
    t.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'install') {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
        }
        t.remove();
      } else if (b.dataset.act === 'dismiss') {
        try { sessionStorage.setItem('alus_install_dismissed', '1'); } catch (e) {}
        t.remove();
      }
    });
    setTimeout(function () { if (t.parentNode) t.remove(); }, 12000);
  }

  function init() {
    try { installManifest(); } catch (e) { console.error('[pwa-manifest]', e); }
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      setTimeout(showInstallToast, 3500);
    });
    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      var t = document.querySelector('.install-toast');
      if (t) t.remove();
    });
  }

  return { init: init };
})();