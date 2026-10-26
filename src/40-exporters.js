'use strict';

/** Trigger a browser download from a Blob. */
function exportCSV(filename, headers, rows) {
  function e2(v) {
    var s = String(v == null ? '' : v);
    if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }
  var csv = '\ufeff' + headers.map(e2).join(',') + '\n' +
    rows.map(function (r) { return r.map(e2).join(','); }).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename + '.csv');
}

/** HTML-based Excel export — works without any library. */
function exportExcel(filename, title, headers, rows) {
  function e(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  var html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8">' +
    '<style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px;text-align:right;font-family:Tahoma}th{background:#eef2f9;font-weight:bold;color:#334155}</style>' +
    '</head><body>';
  html += '<h3 style="font-family:Tahoma;color:#007AFF">' + e(title) + '</h3>';
  html += '<p style="font-family:Tahoma;font-size:11px;color:#666">تاریخ: ' + faDate(new Date().toISOString()) + '</p>';
  html += '<table><thead><tr>' + headers.map(function (h) { return '<th>' + e(h) + '</th>'; }).join('') + '</tr></thead><tbody>';
  rows.forEach(function (r) {
    html += '<tr>' + r.map(function (c) { return '<td>' + e(c) + '</td>'; }).join('') + '</tr>';
  });
  html += '</tbody></table></body></html>';
  downloadBlob(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' }), filename + '.xls');
}

/** Build a full printable HTML doc for PDF export. */
function buildPdfHtml(title, subtitle, headers, rows, autoPrint) {
  function e(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  var html = '<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"><title>' + e(title) + '</title>';
  html += '<style>' +
    'body{font-family:Tahoma,"Vazirmatn",sans-serif;padding:20px;color:#1e293b;margin:0}' +
    'h1{font-size:20px;margin:0 0 6px;color:#007AFF}' +
    'h2{font-size:12px;font-weight:500;color:#64748b;margin:0 0 18px}' +
    'table{width:100%;border-collapse:collapse;font-size:11px}' +
    'th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:right;vertical-align:middle}' +
    'th{background:#eef2f9;font-weight:bold;color:#334155}' +
    'tr:nth-child(even) td{background:#f8fafc}' +
    '.empty{padding:40px;text-align:center;color:#94a3b8}' +
    '@media print{@page{size:A4 landscape;margin:10mm}body{padding:0}h1{font-size:16px}}' +
  '</style></head><body>';
  html += '<h1>' + e(title) + '</h1>';
  html += '<h2>' + e(subtitle || '') + ' — تاریخ: ' + faDate(new Date().toISOString()) + '</h2>';
  if (!rows || !rows.length) {
    html += '<div class="empty">موردی برای نمایش نیست</div>';
  } else {
    html += '<table><thead><tr>' + headers.map(function (h) { return '<th>' + e(h) + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr>' + r.map(function (c) { return '<td>' + e(c) + '</td>'; }).join('') + '</tr>';
    });
    html += '</tbody></table>';
  }
  if (autoPrint) {
    html += '<scr' + 'ipt>setTimeout(function(){try{window.focus();window.print();}catch(e){}},500);</scr' + 'ipt>';
  }
  html += '</body></html>';
  return html;
}

/** Open a PDF preview modal with print + new-tab actions. */
function exportPDF(title, subtitle, headers, rows) {
  try {
    var old = document.querySelector('.pdf-modal');
    if (old) old.remove();
    var inlineHtml = buildPdfHtml(title, subtitle, headers, rows, false);
    var printableHtml = buildPdfHtml(title, subtitle, headers, rows, true);
    var m = document.createElement('div');
    m.className = 'pdf-modal';
    m.innerHTML =
      '<div class="pdf-toolbar">' +
        '<button type="button" class="btn ghost sm" id="pdf-close" title="بستن">' + IC.chevR + ' <span class="lbl">بستن</span></button>' +
        '<div class="pdf-title">' + esc(title) + '</div>' +
        '<button type="button" class="btn ghost sm" id="pdf-newwin" title="تب جدید">' + IC.file + ' <span class="lbl">تب جدید</span></button>' +
        '<button type="button" class="btn primary sm" id="pdf-print" title="چاپ">' + IC.print + ' <span class="lbl">چاپ</span></button>' +
      '</div>' +
      '<div class="pdf-frame-wrap"><iframe id="pdf-frame" sandbox="allow-same-origin allow-modals allow-popups allow-scripts"></iframe></div>';
    document.body.appendChild(m);
    var frame = m.querySelector('#pdf-frame');
    try {
      frame.srcdoc = inlineHtml;
    } catch (e) {
      try {
        frame.contentDocument.open();
        frame.contentDocument.write(inlineHtml);
        frame.contentDocument.close();
      } catch (e2) {}
    }
    function closePdf() { try { m.remove(); } catch (e) {} }
    m.querySelector('#pdf-close').addEventListener('click', closePdf);
    m.querySelector('#pdf-print').addEventListener('click', function () {
      try {
        var win = frame.contentWindow;
        if (!win) throw new Error('iframe');
        win.focus();
        win.print();
      } catch (e) {
        try {
          var w = window.open('', '_blank');
          if (!w) { toast('پاپ‌آپ مسدود', '', 'warn'); return; }
          w.document.open();
          w.document.write(printableHtml);
          w.document.close();
        } catch (err) { toast('خطا', err.message || '', 'error'); }
      }
    });
    m.querySelector('#pdf-newwin').addEventListener('click', function () {
      try {
        var w = window.open('', '_blank');
        if (!w) { toast('پاپ‌آپ مسدود', '', 'warn'); return; }
        w.document.open();
        w.document.write(printableHtml);
        w.document.close();
      } catch (e) { toast('خطا', e.message || '', 'error'); }
    });
    attachRippleAll(m);
  } catch (e) { toast('خطا', e.message || '', 'error'); }
}
