'use strict';

function pageReports(page) {
  var tab = 'inventory';
  var filterWh = '';
  var fromDate = '';
  var toDate = '';
  var statusFilter = '';
  var sortState = { key: null, dir: null };

  function exportMenuHTML() {
    return '<div class="exp-dd" id="exp-dd">' +
      '<button type="button" class="btn ghost xs" id="exp-toggle">' + IC.download + ' خروجی ' + IC.chevD + '</button>' +
      '<div class="exp-dd-menu">' +
        '<button type="button" data-exp="excel">' + IC.download + ' Excel</button>' +
        '<button type="button" data-exp="csv">' + IC.file + ' CSV</button>' +
        '<button type="button" data-exp="pdf">' + IC.print + ' PDF</button>' +
      '</div>' +
    '</div>';
  }

  function inventoryRows(db, whs) {
    var whIds = whs.map(function (w) { return w.id; });
    return db.stocks.filter(function (s) {
      if (whIds.indexOf(s.warehouseId) < 0) return false;
      if (s.quantity === 0 && (s.reservedQty || 0) === 0) return false;
      return true;
    }).map(function (s) {
      var p = getProd(db, s.productId);
      var w = getWh(db, s.warehouseId);
      if (!p || !w) return null;
      return { product: p, warehouse: w, stock: s, avail: s.quantity - (s.reservedQty || 0) };
    }).filter(Boolean).sort(function (a, b) {
      if (a.warehouse.name !== b.warehouse.name) return a.warehouse.name.localeCompare(b.warehouse.name, 'fa');
      return a.product.name.localeCompare(b.product.name, 'fa');
    });
  }

  function render() {
    var db = loadDB();
    var whs = db.warehouses.filter(function (w) { return w.type !== 'customer'; });

    page.innerHTML = '<div class="page-head"><div><h1>گزارش‌ها</h1>' +
      '<div class="sub">خروجی Excel، CSV و PDF</div></div></div>' +
      '<div class="rep-tabs">' +
        '<button type="button" class="rep-tab ' + (tab === 'inventory' ? 'active' : '') + '" data-t="inventory">' + IC.layers + ' موجودی</button>' +
        '<button type="button" class="rep-tab ' + (tab === 'showrooms' ? 'active' : '') + '" data-t="showrooms">' + IC.store + ' نمایشگاه‌ها</button>' +
        '<button type="button" class="rep-tab ' + (tab === 'sold' ? 'active' : '') + '" data-t="sold">' + IC.receipt + ' فروش‌رفته</button>' +
        '<button type="button" class="rep-tab ' + (tab === 'paint' ? 'active' : '') + '" data-t="paint">' + IC.palette + ' رنگ‌کاری</button>' +
        '<button type="button" class="rep-tab ' + (tab === 'transfers' ? 'active' : '') + '" data-t="transfers">' + IC.swap + ' جابه‌جایی‌ها</button>' +
        '<button type="button" class="rep-tab ' + (tab === 'adjustments' ? 'active' : '') + '" data-t="adjustments">' + IC.refresh + ' تعدیلات</button>' +
      '</div>' +
      '<div class="table-card"><div id="rep-body"></div></div>';

    $$('.rep-tab').forEach(function (b) {
      b.addEventListener('click', function () { tab = b.dataset.t; render(); });
    });

    var body = $('#rep-body');
    if (tab === 'inventory') {
      body.innerHTML = renderInventory(db, whs, filterWh, true);
    } else if (tab === 'showrooms') {
      body.innerHTML = renderInventory(db, whs.filter(function (w) { return ['showroom_khalij', 'showroom_alus'].indexOf(w.type) >= 0; }), '', false);
    } else if (tab === 'sold') {
      body.innerHTML = renderInventory(db, whs.filter(function (w) { return w.type === 'sold'; }), '', false);
    } else if (tab === 'paint') {
      body.innerHTML = renderInventory(db, whs.filter(function (w) { return ['paint_in', 'paint_out'].indexOf(w.type) >= 0; }), '', false);
    } else if (tab === 'transfers') {
      body.innerHTML = renderTransfers(db);
    } else {
      body.innerHTML = renderAdj(db);
    }
    bindActions(db, whs);
  }

  function renderInventory(db, whs, whFilter, showFilter) {
    var effective = whFilter ? whs.filter(function (w) { return w.id === whFilter; }) : whs;
    var rows = inventoryRows(db, effective);
    if (sortState.key && sortState.dir) {
      rows = sortRows(rows, sortState.key, sortState.dir, function (r, k) {
        if (k === 'name')  return r.product.name;
        if (k === 'wh')    return r.warehouse.name;
        if (k === 'qty')   return r.stock.quantity;
        if (k === 'avail') return r.avail;
        return '';
      });
    }

    var stats = '<div class="rep-stat-grid">';
    effective.forEach(function (w) {
      var total = rows.filter(function (r) { return r.warehouse.id === w.id; })
        .reduce(function (a, r) { return a + r.stock.quantity; }, 0);
      stats += '<div class="rep-stat"><div class="k">' +
        '<span class="wh-dot" style="background:' + (WH_COLOR[w.type] || '#94a3b8') + '"></span>' +
        esc(w.name) + '</div>' +
        '<div class="v">' + total.toLocaleString('fa-IR') + ' <small>عدد</small></div></div>';
    });
    stats += '</div>';

    var segments = effective.map(function (w) {
      var total = rows.filter(function (r) { return r.warehouse.id === w.id; })
        .reduce(function (a, r) { return a + r.stock.quantity; }, 0);
      return { name: w.name, value: total, color: WH_COLOR[w.type] || '#94a3b8' };
    }).filter(function (s) { return s.value > 0; });

    var donutHTML = '';
    if (segments.length) {
      donutHTML = '<div class="chart-donut-wrap">' + renderDonutSVG(segments, 130) +
        '<div class="chart-donut-legend">' +
          segments.map(function (s) {
            var total = segments.reduce(function (a, x) { return a + x.value; }, 0);
            var pct = Math.round(s.value / total * 100);
            return '<div class="chart-legend-item">' +
              '<span class="chart-legend-dot" style="background:' + s.color + '"></span>' +
              '<span class="chart-legend-name">' + esc(s.name) + '</span>' +
              '<span class="chart-legend-value">' + s.value.toLocaleString('fa-IR') + '</span>' +
              '<span class="chart-legend-pct">' + pct + '%</span></div>';
          }).join('') +
        '</div></div>';
    }

    var filters = '<div class="rep-filters">' +
      (showFilter ?
        '<div class="field"><label>انبار:</label><select id="rep-wh"><option value="">همه</option>' +
          whs.map(function (w) {
            return '<option value="' + w.id + '" ' + (whFilter === w.id ? 'selected' : '') + '>' + esc(w.name) + '</option>';
          }).join('') +
        '</select></div>' : '') +
      '<div class="rep-actions">' + exportMenuHTML() + '</div>' +
    '</div>';

    var ind = function (key) {
      return '<span class="sort-ind">' + (sortState.key === key ? (sortState.dir === 'asc' ? '▲' : '▼') : '⇅') + '</span>';
    };
    var sa = function (key) {
      var c = 'data-sort="' + key + '"';
      if (sortState.key === key) c += ' class="' + (sortState.dir === 'asc' ? 'sort-asc' : 'sort-desc') + '"';
      return c;
    };

    var table = '<div class="table-scroll">';
    if (!rows.length) {
      table += emptyState('موردی نیست', 'گزارشی برای این فیلتر وجود ندارد');
    } else {
      table += '<table class="dt"><thead><tr>' +
        '<th ' + sa('name')  + '>کالا ' + ind('name') + '</th>' +
        '<th>کد</th><th>واحد</th>' +
        '<th ' + sa('wh')    + '>انبار ' + ind('wh') + '</th>' +
        '<th ' + sa('qty')   + ' style="text-align:left">موجودی ' + ind('qty') + '</th>' +
        '<th style="text-align:left">رزرو</th>' +
        '<th ' + sa('avail') + ' style="text-align:left">قابل استفاده ' + ind('avail') + '</th>' +
        '<th class="col-sm-hide">به‌روزرسانی</th>' +
      '</tr></thead><tbody>';
      rows.forEach(function (r) {
        table += '<tr><td><b style="color:var(--text)">' + esc(r.product.name) + '</b></td>' +
          '<td>' + (r.product.code ? '<span class="code-chip">' + esc(r.product.code) + '</span>' : '—') + '</td>' +
          '<td>' + esc(r.product.unit || '—') + '</td>' +
          '<td><div class="wh-cell"><span class="wh-dot" style="background:' + (WH_COLOR[r.warehouse.type] || '#94a3b8') + '"></span>' + esc(r.warehouse.name) + '</div></td>' +
          '<td class="num">' + r.stock.quantity + '</td>' +
          '<td class="num muted">' + (r.stock.reservedQty || 0) + '</td>' +
          '<td class="num"><span class="qty-hl">' + r.avail + '</span></td>' +
          '<td class="date-cell col-sm-hide">' + faDateShort(r.stock.updatedAt) + '</td></tr>';
      });
      table += '</tbody></table>';
    }
    table += '</div>';
    return stats + donutHTML + filters + table;
  }

  function renderTransfers(db) {
    var list = db.transfers.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    if (fromDate) list = list.filter(function (t) { return new Date(t.createdAt) >= new Date(fromDate); });
    if (toDate) {
      var td = new Date(toDate);
      td.setDate(td.getDate() + 1);
      list = list.filter(function (t) { return new Date(t.createdAt) < td; });
    }
    if (statusFilter) list = list.filter(function (t) { return t.status === statusFilter; });

    var rows = list.map(function (t) {
      return { t: t, p: getProd(db, t.productId), src: getWh(db, t.sourceWarehouseId), dst: getWh(db, t.destinationWarehouseId), st: stOf(t) };
    });

    var filters = '<div class="rep-filters">' +
      '<div class="field"><label>از تاریخ:</label><input type="date" id="rep-from" value="' + fromDate + '" /></div>' +
      '<div class="field"><label>تا تاریخ:</label><input type="date" id="rep-to" value="' + toDate + '" /></div>' +
      '<div class="field"><label>وضعیت:</label><select id="rep-status"><option value="">همه</option>' +
        '<option value="pending_warehouse" ' + (statusFilter === 'pending_warehouse' ? 'selected' : '') + '>در انتظار انبار</option>' +
        '<option value="pending_accountant" ' + (statusFilter === 'pending_accountant' ? 'selected' : '') + '>در انتظار حسابدار</option>' +
        '<option value="pending_manager" ' + (statusFilter === 'pending_manager' ? 'selected' : '') + '>در انتظار مدیر</option>' +
        '<option value="approved" ' + (statusFilter === 'approved' ? 'selected' : '') + '>تأییدشده</option>' +
        '<option value="rejected" ' + (statusFilter === 'rejected' ? 'selected' : '') + '>ردشده</option>' +
      '</select></div>' +
      '<div class="rep-actions">' + exportMenuHTML() + '</div>' +
    '</div>';

    var table = '<div class="table-scroll">';
    if (!rows.length) {
      table += emptyState('موردی نیست', 'در این بازه گزارشی وجود ندارد');
    } else {
      table += '<table class="dt"><thead><tr><th>کد</th><th>تاریخ</th><th>نوع</th><th>مبدأ</th><th>مقصد</th><th>کالا</th>' +
        '<th style="text-align:left">تعداد</th><th>وضعیت</th><th class="col-sm-hide">ایجادکننده</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        var typeLabel = r.t.type === 'inbound' ? 'ورود' : (r.t.type === 'direct-customer' ? 'ارسال' : 'انتقال');
        var srcLabel = r.t.type === 'inbound' ? ('تأمین‌کننده: ' + (r.t.supplierName || '')) : ((r.src && r.src.name) || '—');
        table += '<tr><td><span class="t-code" style="direction:ltr;unicode-bidi:isolate;display:inline-block">' + esc(r.t.code) + '</span></td>' +
          '<td class="date-cell">' + faDateShort(r.t.createdAt) + '</td>' +
          '<td>' + typeLabel + '</td>' +
          '<td>' + esc(srcLabel) + '</td>' +
          '<td>' + esc((r.dst && r.dst.name) || '—') + '</td>' +
          '<td>' + esc((r.p && r.p.name) || '—') + '</td>' +
          '<td class="num">' + r.t.quantity + ' <span class="unit">' + esc((r.p && r.p.unit) || '') + '</span></td>' +
          '<td><span class="badge ' + r.st.tone + '">' + r.st.label + '</span></td>' +
          '<td class="muted small col-sm-hide">' + esc(r.t.createdByName || '—') + '</td></tr>';
      });
      table += '</tbody></table>';
    }
    table += '</div>';
    return filters + table;
  }

  function renderAdj(db) {
    var list = (db.adjustments || []).slice().sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
    var table = '<div class="table-scroll">';
    if (!list.length) {
      table += emptyState('تعدیلی ثبت نشده', 'صفر کردن موجودی تاریخچه می‌سازد');
    } else {
      table += '<table class="dt"><thead><tr><th>#</th><th>تاریخ</th><th>کاربر</th><th>نوع</th>' +
        '<th class="col-sm-hide">اقلام</th><th>یادداشت</th><th></th></tr></thead><tbody>';
      list.forEach(function (a, i) {
        table += '<tr><td><span class="row-num">' + (i + 1) + '</span></td>' +
          '<td class="date-cell">' + faDate(a.at) + '</td>' +
          '<td>' + esc(a.byName || '—') + '</td>' +
          '<td>' + (a.type === 'period_close' ? 'بستن دوره' : esc(a.type)) + '</td>' +
          '<td class="col-sm-hide">' + (a.itemsCount || 0) + ' قلم</td>' +
          '<td class="muted small">' + esc(a.note || '—') + '</td>' +
          '<td class="actions-cell"><button type="button" class="btn ghost xs" data-adj="' + a.id + '">جزئیات</button></td></tr>';
      });
      table += '</tbody></table>';
    }
    table += '</div>';
    return table;
  }

  function bindActions(db, whs) {
    var whSel = $('#rep-wh');
    if (whSel) whSel.addEventListener('change', function (e) { filterWh = e.target.value; render(); });
    var fromInp = $('#rep-from');
    if (fromInp) fromInp.addEventListener('change', function (e) { fromDate = e.target.value; render(); });
    var toInp = $('#rep-to');
    if (toInp) toInp.addEventListener('change', function (e) { toDate = e.target.value; render(); });
    var stSel = $('#rep-status');
    if (stSel) stSel.addEventListener('change', function (e) { statusFilter = e.target.value; render(); });

    var expToggle = $('#exp-toggle');
    var expDD = $('#exp-dd');
    if (expToggle) {
      expToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        expDD.classList.toggle('open');
      });
    }
    document.addEventListener('click', function () {
      var dd = document.getElementById('exp-dd');
      if (dd) dd.classList.remove('open');
    });

    $$('[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.dataset.sort;
        if (sortState.key !== k) { sortState.key = k; sortState.dir = 'asc'; }
        else if (sortState.dir === 'asc') { sortState.dir = 'desc'; }
        else { sortState.key = null; sortState.dir = null; }
        render();
      });
    });

    $$('[data-exp]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var kind = btn.dataset.exp;
        var dbf = loadDB();
        var title = '', headers = [], rows = [], filename = 'alus-' + ymd();

        if (tab === 'inventory' || tab === 'showrooms' || tab === 'sold' || tab === 'paint') {
          var whs2 = dbf.warehouses.filter(function (w) { return w.type !== 'customer'; });
          if (tab === 'showrooms') whs2 = whs2.filter(function (w) { return ['showroom_khalij', 'showroom_alus'].indexOf(w.type) >= 0; });
          if (tab === 'sold')      whs2 = whs2.filter(function (w) { return w.type === 'sold'; });
          if (tab === 'paint')     whs2 = whs2.filter(function (w) { return ['paint_in', 'paint_out'].indexOf(w.type) >= 0; });
          if (tab === 'inventory' && filterWh) whs2 = whs2.filter(function (w) { return w.id === filterWh; });
          var r2 = inventoryRows(dbf, whs2);
          title = (tab === 'inventory' ? 'موجودی انبارها' : tab === 'showrooms' ? 'موجودی نمایشگاه‌ها' : tab === 'sold' ? 'فروش‌رفته' : 'رنگ‌کاری');
          headers = ['کالا', 'کد', 'واحد', 'انبار', 'موجودی', 'رزرو', 'قابل استفاده', 'به‌روزرسانی'];
          rows = r2.map(function (r) {
            return [r.product.name, r.product.code || '', r.product.unit || '', r.warehouse.name,
                    r.stock.quantity, r.stock.reservedQty || 0, r.avail, faDateShort(r.stock.updatedAt)];
          });
        } else if (tab === 'transfers') {
          var list = dbf.transfers.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
          if (fromDate) list = list.filter(function (t) { return new Date(t.createdAt) >= new Date(fromDate); });
          if (toDate) {
            var td = new Date(toDate);
            td.setDate(td.getDate() + 1);
            list = list.filter(function (t) { return new Date(t.createdAt) < td; });
          }
          if (statusFilter) list = list.filter(function (t) { return t.status === statusFilter; });
          title = 'جابه‌جایی‌ها';
          headers = ['کد', 'تاریخ', 'نوع', 'مبدأ', 'مقصد', 'کالا', 'تعداد', 'واحد', 'وضعیت', 'ایجادکننده'];
          rows = list.map(function (t) {
            var p = getProd(dbf, t.productId);
            var src = getWh(dbf, t.sourceWarehouseId);
            var dst = getWh(dbf, t.destinationWarehouseId);
            var st = stOf(t);
            return [
              t.code, faDate(t.createdAt),
              t.type === 'inbound' ? 'ورود' : t.type === 'direct-customer' ? 'ارسال' : 'انتقال',
              t.type === 'inbound' ? ('تأمین‌کننده: ' + (t.supplierName || '')) : ((src && src.name) || ''),
              (dst && dst.name) || '', (p && p.name) || '', t.quantity, (p && p.unit) || '', st.label, t.createdByName || ''
            ];
          });
        } else if (tab === 'adjustments') {
          var adj = (dbf.adjustments || []).slice().sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
          title = 'تعدیلات موجودی';
          headers = ['تاریخ', 'کاربر', 'نوع', 'تعداد اقلام', 'یادداشت'];
          rows = adj.map(function (a) {
            return [faDate(a.at), a.byName || '', a.type === 'period_close' ? 'بستن دوره' : a.type, a.itemsCount || 0, a.note || ''];
          });
        }

        if (kind === 'excel') exportExcel(filename, title, headers, rows);
        else if (kind === 'csv') exportCSV(filename, headers, rows);
        else if (kind === 'pdf') exportPDF(title, 'Alus · پنل مدیریت', headers, rows);
      });
    });

    $$('[data-adj]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.adj;
        var dbf = loadDB();
        var adj = (dbf.adjustments || []).filter(function (a) { return a.id === id; })[0];
        if (!adj) return;
        var snap = adj.snapshot || [];
        var body = '<div style="margin-bottom:12px" class="muted small">' +
          snap.length + ' قلم · جمع: ' + snap.reduce(function (a, s) { return a + s.quantity; }, 0) + ' عدد</div>' +
          '<div style="max-height:400px;overflow:auto;border:1px solid var(--border);border-radius:14px">' +
            '<table class="dt" style="min-width:auto"><thead><tr><th>کالا</th><th>انبار</th><th style="text-align:left">موجودی قبلی</th></tr></thead><tbody>';
        snap.forEach(function (s) {
          var p = getProd(dbf, s.productId);
          var w = getWh(dbf, s.warehouseId);
          if (!p || !w) return;
          body += '<tr><td>' + esc(p.name) + '</td><td>' + esc(w.name) + '</td><td class="num">' + s.quantity + '</td></tr>';
        });
        body += '</tbody></table></div>';
        openModal({
          title: 'جزئیات تعدیل',
          desc: faDate(adj.at) + ' — ' + (adj.byName || '—'),
          body: body,
          actions: [{ label: 'بستن', cls: 'ghost', onClick: function (c) { c.remove(); } }]
        });
      });
    });
  }

  render();
}
