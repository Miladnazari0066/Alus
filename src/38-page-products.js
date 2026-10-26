'use strict';

function pageProducts(page) {
  var db = loadDB();

  page.innerHTML = '<div class="page-head"><div><h1>کالاها</h1>' +
    '<div class="sub">' + db.products.length.toLocaleString('fa-IR') + ' قلم کالا</div></div></div>' +
    '<div class="widget" style="margin-bottom:16px;max-width:900px">' +
      '<form id="pf" class="form-grid">' +
        '<div class="field"><label>نام <span class="req">*</span></label><input id="pn" required /></div>' +
        '<div class="field"><label>کد</label>' +
          '<input id="pc" style="font-family:monospace;direction:ltr;text-align:left" /></div>' +
        '<div class="field"><label>واحد</label>' +
          '<select id="pu">' +
            UNITS.map(function (u) { return '<option value="' + u + '">' + u + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="field" style="grid-column:1/-1;flex-direction:row;justify-content:flex-end">' +
          '<button type="submit" class="btn primary">' + IC.plus + ' افزودن</button>' +
        '</div>' +
      '</form>' +
      '<div class="hint" style="padding:8px 6px 0">' + IC.info + ' برای ثبت اقلام و تصویر، از صفحه مقداردهی استفاده کنید</div>' +
    '</div>' +
    '<div class="table-card"><div class="table-scroll">' +
      (db.products.length ?
        '<table class="dt"><thead><tr>' +
          '<th>#</th><th>کالا</th><th>کد</th><th>واحد</th>' +
          '<th class="col-sm-hide">اقلام</th><th class="col-sm-hide">تاریخ</th><th></th>' +
        '</tr></thead><tbody>' +
          db.products.map(function (p, i) {
            var cc = (p.components || []).length;
            var kc = (cc && isKitUnit(p.unit)) ?
              '<span class="kit-chip" data-pid="' + p.id + '">' + IC.grid + ' ' + cc + ' قلم</span>' :
              '<span class="muted small">—</span>';
            var img = p.image ?
              '<img class="img-thumb" src="' + esc(p.image) + '" alt="">' :
              '<div class="img-thumb-placeholder">' + IC.package + '</div>';
            return '<tr>' +
              '<td><span class="row-num">' + (i + 1) + '</span></td>' +
              '<td><div class="cell-product"><div class="img-wrap">' + img +
                '<div class="info"><b>' + esc(p.name) + '</b></div></div></div></td>' +
              '<td>' + (p.code ? '<span class="code-chip">' + esc(p.code) + '</span>' : '—') + '</td>' +
              '<td><span class="unit-chip">' + esc(p.unit || '—') + '</span></td>' +
              '<td class="col-sm-hide">' + kc + '</td>' +
              '<td class="date-cell col-sm-hide">' + faDate(p.createdAt) + '</td>' +
              '<td class="actions-cell">' +
                '<button type="button" class="btn xs danger" data-del="' + p.id + '">' + IC.trash + '</button>' +
              '</td></tr>';
          }).join('') +
        '</tbody></table>' :
        emptyState('کالایی ثبت نشده')) +
    '</div></div>';

  $('#pf').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#pn').value.trim();
    var code = $('#pc').value.trim();
    var unit = $('#pu').value || 'دست';
    if (!name) return;
    var fresh = loadDB();
    if (findProductByName(fresh, name)) { toast('تکراری', 'این کالا قبلاً ثبت شده', 'warn'); return; }
    fresh.products.push({
      id: uid(), name: name, code: code, unit: unit,
      image: '', components: [], createdAt: new Date().toISOString()
    });
    saveDB(fresh);
    toast('افزوده شد', name, 'success');
    render();
  });

  $$('[data-del]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.dataset.del;
      var fresh = loadDB();
      var used = fresh.stocks.some(function (s) { return s.productId === id && s.quantity > 0; }) ||
                 fresh.transfers.some(function (t) { return t.productId === id; });
      if (used) { toast('قابل حذف نیست', 'این کالا در موجودی یا انتقال‌ها استفاده شده', 'error'); return; }
      var backup = {
        product: fresh.products.filter(function (p) { return p.id === id; })[0],
        stocks: fresh.stocks.filter(function (s) { return s.productId === id; })
      };
      if (!backup.product) return;
      fresh.products = fresh.products.filter(function (p) { return p.id !== id; });
      fresh.stocks = fresh.stocks.filter(function (s) { return s.productId !== id; });
      saveDB(fresh);
      showUndoToast('کالای «' + backup.product.name + '» حذف شد', function () {
        try {
          var f2 = loadDB();
          f2.products.push(backup.product);
          backup.stocks.forEach(function (s) { f2.stocks.push(s); });
          saveDB(f2);
          toast('بازگردانی شد', '', 'success');
          render();
        } catch (e) {}
      }, 5000);
      render();
    });
  });
}
