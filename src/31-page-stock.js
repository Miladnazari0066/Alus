'use strict';

/** Shared transfer summary card used by dashboard, transfers, inbounds. */
function transferItemHTML(db, t) {
  var st = stOf(t);
  var isIn = t.type === 'inbound';
  var p = getProd(db, t.productId);
  var src = getWh(db, t.sourceWarehouseId);
  var dst = getWh(db, t.destinationWarehouseId);
  var stepsHTML = '';
  for (var i = 1; i <= 4; i++) {
    var cls = '';
    if (t.status === 'approved') {
      cls = 'done';
    } else if (t.status === 'rejected') {
      var rMap = { warehouse: 1, accountant: 2, manager: 3 };
      var rS = t.rejection ? rMap[t.rejection.stage] : 0;
      if (i < rS) cls = 'done';
      else if (i === rS) cls = 'rejected';
    } else {
      if (i < st.step) cls = 'done';
      else if (i === st.step) cls = 'active';
    }
    stepsHTML += '<div class="t-step ' + cls + '"></div>';
  }
  var route = isIn ?
    '<div class="t-route" style="color:#0369a1">' + IC.factory + ' ' + esc(t.supplierName || '—') + ' ' + IC.arrowL + ' ' + esc((dst && dst.name) || '—') + '</div>' :
    '<div class="t-route">' + esc((src && src.name) || '—') + ' ' + IC.arrowL + ' ' + esc((dst && dst.name) || '—') + '</div>';
  return '<div class="t-item" data-tid="' + t.id + '">' +
    '<div class="t-row1">' +
      '<span class="t-code" style="direction:ltr;unicode-bidi:isolate;display:inline-block">' + esc(t.code) + '</span>' +
      '<span class="badge ' + st.tone + '"><span class="dot"></span>' + st.label + '</span>' +
      (isIn ? '<span class="badge inbound">' + IC.inbound + ' ورود</span>' : '') +
      '<span class="small muted" style="margin-right:auto">' + relTime(t.createdAt) + '</span>' +
    '</div>' +
    '<div class="t-row2">' + route +
      '<span>' + esc((p && p.name) || '') + '</span>' +
      '<span class="t-qty">' + t.quantity + ' ' + esc((p && p.unit) || '') + '</span>' +
      '<div class="t-progress">' + stepsHTML + '</div>' +
    '</div>' +
  '</div>';
}

function pageStock(page) {
  var db = loadDB();
  var state = { wh: '', q: '', sort: null, dir: null };

  page.innerHTML = '<div class="page-head"><div><h1>موجودی انبارها</h1>' +
    '<div class="sub">نمای کلی موجودی همه انبارها و نمایشگاه‌ها</div></div></div>' +
    '<div class="table-card">' +
      '<div class="table-toolbar">' +
        '<div class="search-input">' + IC.search + '<input id="s-q" placeholder="جستجو..." /></div>' +
        '<select class="chip" id="s-wh" style="height:40px;padding:0 36px 0 16px;appearance:none;' +
          'background-image:url(&quot;data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2.5\'><polyline points=\'6 9 12 15 18 9\'/></svg>&quot;);' +
          'background-repeat:no-repeat;background-position:left 14px center;background-size:12px;border-radius:100px">' +
          '<option value="">همه انبارها</option>' +
          db.warehouses.filter(function (w) { return w.type !== 'customer'; }).map(function (w) {
            return '<option value="' + w.id + '">' + esc(w.name) + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<div class="table-scroll" id="s-table"></div>' +
    '</div>';

  function buildRows() {
    return db.stocks.filter(function (s) {
      if (state.wh && s.warehouseId !== state.wh) return false;
      if (state.q) {
        var p = getProd(db, s.productId);
        if (!p) return false;
        var q = state.q.toLowerCase();
        if (p.name.toLowerCase().indexOf(q) < 0 && (p.code || '').toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    }).map(function (s) {
      return { s: s, p: getProd(db, s.productId), w: getWh(db, s.warehouseId) };
    }).filter(function (r) { return r.p && r.w && r.w.type !== 'customer'; });
  }

  function draw() {
    var rows = buildRows();
    if (state.sort && state.dir) {
      rows = sortRows(rows, state.sort, state.dir, function (r, k) {
        if (k === 'name')     return r.p.name;
        if (k === 'wh')       return r.w.name;
        if (k === 'qty')      return r.s.quantity;
        if (k === 'reserved') return r.s.reservedQty || 0;
        if (k === 'avail')    return r.s.quantity - (r.s.reservedQty || 0);
        if (k === 'updated')  return r.s.updatedAt || '';
        return '';
      });
    }
    var tbl = $('#s-table');
    if (!rows.length) {
      tbl.innerHTML = emptyState('موردی یافت نشد', 'فیلترها را تغییر دهید یا کالای جدیدی اضافه کنید');
      return;
    }
    var sa = function (key) {
      var c = 'data-sort="' + key + '"';
      if (state.sort === key) c += ' class="' + (state.dir === 'asc' ? 'sort-asc' : 'sort-desc') + '"';
      return c;
    };
    var ind = function (key) {
      return '<span class="sort-ind">' + (state.sort === key ? (state.dir === 'asc' ? '▲' : '▼') : '⇅') + '</span>';
    };
    tbl.innerHTML = '<table class="dt"><thead><tr>' +
      '<th ' + sa('name')     + '>کالا ' + ind('name') + '</th>' +
      '<th ' + sa('wh')       + '>انبار ' + ind('wh') + '</th>' +
      '<th ' + sa('qty')      + ' style="text-align:left">موجودی ' + ind('qty') + '</th>' +
      '<th ' + sa('reserved') + ' style="text-align:left">رزرو ' + ind('reserved') + '</th>' +
      '<th ' + sa('avail')    + ' style="text-align:left">قابل استفاده ' + ind('avail') + '</th>' +
      '<th class="col-sm-hide" ' + sa('updated') + '>به‌روزرسانی ' + ind('updated') + '</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        var hasComp = r.p.components && r.p.components.length;
        var kitChip = hasComp ? '<span class="kit-chip" data-pid="' + r.p.id + '">' + IC.grid + ' ' + r.p.components.length + ' قلم</span>' : '';
        var minQ = r.s.minQuantity || 5;
        var isLow = r.s.quantity > 0 && r.s.quantity <= minQ;
        var rowCls = isLow ? ' class="row-low"' : '';
        var lowBadge = isLow ? ' <span class="low-stock-badge">' + IC.alert + ' کم</span>' : '';
        var imgHTML = r.p.image ?
          '<img class="img-thumb" src="' + esc(r.p.image) + '" alt="">' :
          '<div class="img-thumb-placeholder">' + IC.package + '</div>';
        return '<tr' + rowCls + '><td><div class="cell-product"><div class="img-wrap">' + imgHTML +
          '<div class="info"><b>' + esc(r.p.name) + '</b>' +
            '<div style="display:flex;gap:4px;margin-top:2px">' +
              (r.p.code ? '<span class="code-chip">' + esc(r.p.code) + '</span>' : '') +
              '<span class="unit-chip">' + esc(r.p.unit || '') + '</span>' +
              kitChip +
            '</div></div></div></div></td>' +
          '<td><div class="wh-cell"><span class="wh-dot" style="background:' + (WH_COLOR[r.w.type] || '#94a3b8') + '"></span>' + esc(r.w.name) + '</div></td>' +
          '<td class="num">' + r.s.quantity + ' <span class="unit">' + esc(r.p.unit || '') + '</span>' + lowBadge + '</td>' +
          '<td class="num muted">' + (r.s.reservedQty || 0) + '</td>' +
          '<td class="num"><span class="qty-hl">' + (r.s.quantity - (r.s.reservedQty || 0)) + '</span></td>' +
          '<td class="date-cell col-sm-hide">' + relTime(r.s.updatedAt) + '</td></tr>';
      }).join('') + '</tbody></table>';
    $$('th[data-sort]', tbl).forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.dataset.sort;
        if (state.sort !== k) { state.sort = k; state.dir = 'asc'; }
        else if (state.dir === 'asc') { state.dir = 'desc'; }
        else { state.sort = null; state.dir = null; }
        draw();
      });
    });
  }

  $('#s-q').addEventListener('input', function (e) { state.q = e.target.value.trim(); draw(); });
  $('#s-wh').addEventListener('change', function (e) { state.wh = e.target.value; draw(); });
  draw();
}
