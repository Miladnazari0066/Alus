'use strict';

function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    if (c === '&') return '&amp;';
    if (c === '<') return '&lt;';
    if (c === '>') return '&gt;';
    if (c === '"') return '&quot;';
    return '&#39;';
  });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function ymd() {
  var d = new Date();
  return '' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
}

function initials(n) {
  var s = (n || '').split(' ').filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('');
  return s || '؟';
}

function faDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return iso; }
}

function faDateShort(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (e) { return iso; }
}

function relTime(iso) {
  if (!iso) return '';
  var d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60) return 'همین حالا';
  if (d < 3600) return Math.floor(d / 60) + ' دقیقه پیش';
  if (d < 86400) return Math.floor(d / 3600) + ' ساعت پیش';
  if (d < 604800) return Math.floor(d / 86400) + ' روز پیش';
  return faDate(iso);
}

/** Convert any number/string to Persian digits with separators. */
function faNum(n) {
  if (n == null) return '—';
  try { return Number(n).toLocaleString('fa-IR'); } catch (e) { return String(n); }
}

/** Sort rows by key + direction. Uses localeCompare with 'fa' for Persian strings. */
function sortRows(rows, key, dir, getter) {
  if (!dir) return rows.slice();
  var copy = rows.slice();
  copy.sort(function (a, b) {
    var va = getter ? getter(a, key) : a[key];
    var vb = getter ? getter(b, key) : b[key];
    if (va == null) va = '';
    if (vb == null) vb = '';
    if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va;
    var sa = String(va), sb = String(vb);
    return dir === 'asc' ? sa.localeCompare(sb, 'fa') : sb.localeCompare(sa, 'fa');
  });
  return copy;
}

function countUp(el, target, dur) {
  dur = dur || 800;
  var t0 = performance.now();
  function tick(now) {
    var p = Math.min((now - t0) / dur, 1);
    var e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * e).toLocaleString('fa-IR');
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function emptyState(title, desc, actionHTML) {
  return '<div class="empty"><div class="empty-art"><div class="empty-circle">' + IC.inbox + '</div></div>' +
    '<b>' + esc(title) + '</b>' +
    (desc ? '<p>' + esc(desc) + '</p>' : '') +
    (actionHTML || '') +
  '</div>';
}

/** Resize + re-encode an image file to JPEG. Used by product image upload. */
function compressImage(file, maxDim, quality) {
  return new Promise(function (resolve, reject) {
    try {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          try {
            var w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
              else { w = Math.round(w * maxDim / h); h = maxDim; }
            }
            var c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            var ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            var dataUrl = c.toDataURL('image/jpeg', quality || 0.75);
            resolve(dataUrl);
          } catch (err) { reject(err); }
        };
        img.onerror = function () { reject(new Error('تصویر نامعتبر')); };
        img.src = e.target.result;
      };
      reader.onerror = function () { reject(new Error('خطا در خواندن فایل')); };
      reader.readAsDataURL(file);
    } catch (err) { reject(err); }
  });
}

function downloadBlob(blob, filename) {
  try {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.remove();
    }, 500);
  } catch (e) {
    if (typeof toast === 'function') toast('خطا در دانلود', e.message || '', 'error');
    else console.error('[downloadBlob]', e);
  }
}
