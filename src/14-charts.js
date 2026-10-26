'use strict';

/** Renders a simple bar chart as SVG (no external library). */
function renderBarChartSVG(values, labels, color) {
  if (!values.length) {
    return '<div class="empty" style="padding:20px"><b style="font-size:13px">داده‌ای نیست</b></div>';
  }
  var max = Math.max.apply(null, values.concat([1]));
  var html = '<div class="chart-bar">';
  values.forEach(function (v, i) {
    var h = Math.max(3, (v / max) * 100);
    var hl = v === max && max > 0 ? ' hl' : '';
    html += '<div class="chart-bar-col" title="' + esc(labels[i] || '') + ': ' + v + '">' +
      '<div class="chart-bar-value">' + (v > 0 ? v : '') + '</div>' +
      '<div class="chart-bar-fill' + hl + '" style="height:' + h + '%"></div>' +
      '<div class="chart-bar-label">' + esc(labels[i] || '') + '</div>' +
    '</div>';
  });
  html += '</div>';
  return html;
}

/** Renders a donut chart from {name, value, color}[] segments. */
function renderDonutSVG(segments, size) {
  size = size || 120;
  var total = segments.reduce(function (a, s) { return a + s.value; }, 0);
  if (total === 0) {
    return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:var(--surface-3)"></div>';
  }
  var r = size / 2 - 10, cx = size / 2, cy = size / 2;
  var circ = 2 * Math.PI * r;
  var out = '<svg class="chart-donut" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">';
  out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--surface-3)" stroke-width="16"/>';
  var offset = 0;
  segments.forEach(function (s) {
    var pct = s.value / total;
    var dash = pct * circ;
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + s.color + '" stroke-width="16" ' +
      'stroke-dasharray="' + dash + ' ' + circ + '" stroke-dashoffset="' + (-offset) + '" ' +
      'transform="rotate(-90 ' + cx + ' ' + cy + ')" stroke-linecap="butt"/>';
    offset += dash;
  });
  out += '<text x="' + cx + '" y="' + (cy + 2) + '" text-anchor="middle" dominant-baseline="middle" ' +
    'font-family="Vazirmatn,sans-serif" font-size="18" font-weight="800" fill="var(--text)">' + total.toLocaleString('fa-IR') + '</text>';
  out += '<text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" dominant-baseline="middle" ' +
    'font-family="Vazirmatn,sans-serif" font-size="9" fill="var(--muted)">عدد</text>';
  out += '</svg>';
  return out;
}
