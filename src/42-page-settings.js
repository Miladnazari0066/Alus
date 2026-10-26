'use strict';

function pageSettings(page) {
  var db = loadDB();
  var totalStock = db.stocks.reduce(function (a, s) { return a + s.quantity; }, 0);
  var nonZero = db.stocks.filter(function (s) { return s.quantity > 0 || (s.reservedQty || 0) > 0; });
  var dbSize = 0;
  try { dbSize = new Blob([JSON.stringify(db)]).size; } catch (e) {}
  var notifPerm = ('Notification' in window) ? Notification.permission : 'unsupported';

  page.innerHTML = '<div class="page-head"><div><h1>تنظیمات</h1>' +
    '<div class="sub">مدیریت سیستمی — فقط راهبر</div></div></div>' +
    '<div class="bento">' +
      '<div class="widget w-6">' +
        '<div class="w-head"><div><div class="w-title info"><div class="ic info">' + IC.info + '</div>وضعیت</div></div></div>' +
        '<div class="dl" style="grid-template-columns:1fr 1fr;display:grid;gap:1px">' +
          '<div class="dl-item"><div class="k">کالاها</div><div class="v">' + db.products.length + '</div></div>' +
          '<div class="dl-item"><div class="k">انبارها</div><div class="v">' + db.warehouses.filter(function (w) { return w.type !== 'customer'; }).length + '</div></div>' +
          '<div class="dl-item"><div class="k">اسناد</div><div class="v">' + db.transfers.length + '</div></div>' +
          '<div class="dl-item"><div class="k">تعدیلات</div><div class="v">' + (db.adjustments || []).length + '</div></div>' +
          '<div class="dl-item"><div class="k">جمع موجودی</div><div class="v">' + totalStock.toLocaleString('fa-IR') + ' عدد</div></div>' +
          '<div class="dl-item"><div class="k">حجم داده‌ها</div><div class="v">' + (dbSize / 1024).toFixed(1) + ' KB</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="widget w-6">' +
        '<div class="w-head"><div><div class="w-title warn"><div class="ic warn">' + IC.bellRing + '</div>اعلان مرورگر</div></div></div>' +
        '<p style="font-size:12.5px;line-height:1.9;margin-bottom:14px">اعلان‌های مرورگر برای اطلاع سریع از تغییرات مهم (تأیید نهایی، ورود کالا).</p>' +
        (notifPerm === 'granted' ?
          '<div style="padding:12px 14px;background:rgba(52,199,89,.1);border:1px solid rgba(52,199,89,.24);border-radius:14px;font-size:12.5px;color:#047857">' + IC.check + ' فعال است</div>' :
          notifPerm === 'denied' ?
          '<div style="padding:12px 14px;background:rgba(255,59,48,.1);border:1px solid rgba(255,59,48,.24);border-radius:14px;font-size:12.5px;color:#b91c1c">' + IC.x + ' مسدود شده — از تنظیمات مرورگر فعال کنید</div>' :
          '<div class="row" style="justify-content:flex-end"><button type="button" class="btn primary" id="req-notif">' + IC.bellRing + ' فعال‌سازی</button></div>') +
      '</div>' +
      '<div class="widget w-6">' +
        '<div class="w-head"><div><div class="w-title danger"><div class="ic danger">' + IC.alert + '</div>صفر کردن موجودی</div></div></div>' +
        '<p style="font-size:12.5px;line-height:1.9;margin-bottom:14px"><b>' + nonZero.length + ' ردیف</b> صفر می‌شود — تاریخچه حفظ می‌شود.</p>' +
        '<div class="row" style="justify-content:flex-end"><button type="button" class="btn danger" id="zero-btn">' + IC.refresh + ' صفر کردن</button></div>' +
      '</div>' +
      '<div class="widget w-12">' +
        '<div class="w-head"><div><div class="w-title"><div class="ic">' + IC.download + '</div>پشتیبان‌گیری</div></div></div>' +
        '<div class="row" style="justify-content:flex-end;gap:8px">' +
          '<button type="button" class="btn ghost" id="imp-btn">' + IC.upload + ' بازیابی</button>' +
          '<button type="button" class="btn success" id="exp-btn">' + IC.download + ' دانلود JSON</button>' +
          '<input type="file" id="imp-file" accept=".json" style="display:none" />' +
        '</div>' +
      '</div>' +
    '</div>';

  var reqBtn = $('#req-notif');
  if (reqBtn) {
    reqBtn.addEventListener('click', function () {
      requestNotifPermission();
      setTimeout(render, 500);
    });
  }
  $('#zero-btn').addEventListener('click', openZeroOutModal);
  $('#exp-btn').addEventListener('click', function () {
    var fresh = loadDB();
    var blob = new Blob([JSON.stringify(fresh, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'alus-backup-' + ymd() + '.json');
    celebrate('پشتیبان', 'فایل دانلود شد', 'success', 1800);
  });
  $('#imp-btn').addEventListener('click', function () { $('#imp-file').click(); });
  $('#imp-file').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var parsed = JSON.parse(rd.result);
        if (!parsed || !parsed.users || !parsed.warehouses) throw new Error('نامعتبر');
        openModal({
          title: 'بازیابی',
          desc: 'کل داده جایگزین می‌شود',
          body: '<div style="padding:12px 14px;background:rgba(255,59,48,.1);border-radius:14px;font-size:12px;color:#b91c1c">' +
            IC.alert + ' از حساب خارج می‌شوید</div>',
          actions: [
            { label: 'انصراف', cls: 'ghost', onClick: function (c) { c.remove(); } },
            {
              label: IC.check + ' بازیابی',
              cls: 'danger',
              onClick: function (c) {
                try {
                  migrateDB(parsed);
                  saveDB(parsed);
                  try { localStorage.removeItem(K_SES); } catch (e) {}
                  c.remove();
                  celebrate('بازیابی', 'دوباره وارد شوید', 'success', 2200);
                  setTimeout(function () { App.user = null; render(); }, 700);
                } catch (err) { c.remove(); toast('خطا', err.message || '', 'error'); }
              }
            }
          ]
        });
      } catch (err) { toast('نامعتبر', err.message || '', 'error'); }
    };
    rd.readAsText(f);
  });
}

function openZeroOutModal() {
  var db = loadDB();
  var nonZero = db.stocks.filter(function (s) { return s.quantity > 0 || (s.reservedQty || 0) > 0; });
  var totalQ = nonZero.reduce(function (a, s) { return a + s.quantity; }, 0);

  openModal({
    title: 'صفر کردن موجودی',
    desc: 'با ثبت snapshot تاریخی',
    body: '<div class="field"><label>یادداشت</label>' +
      '<input id="zo-note" placeholder="مثلاً: بستن سال" /></div>' +
      '<div style="margin-top:14px;padding:14px;background:var(--surface-2);border-radius:16px;font-size:12.5px;line-height:1.9">' +
        '<div style="display:flex;justify-content:space-between"><span>ردیف‌ها:</span><b>' + nonZero.length + '</b></div>' +
        '<div style="display:flex;justify-content:space-between"><span>جمع:</span><b>' + totalQ + ' عدد</b></div>' +
        '<div style="display:flex;justify-content:space-between"><span>اسناد حفظ‌شده:</span><b>' + db.transfers.length + '</b></div>' +
      '</div>',
    actions: [
      { label: 'انصراف', cls: 'ghost', onClick: function (c) { c.remove(); } },
      {
        label: IC.refresh + ' تأیید',
        cls: 'danger',
        onClick: function (c) {
          var btn = c.querySelector('button.danger');
          if (btn) btn.classList.add('loading');
          var note = (c.querySelector('#zo-note') || {}).value || '';
          setTimeout(function () {
            try {
              var fresh = loadDB();
              var snap = fresh.stocks
                .filter(function (s) { return s.quantity > 0 || (s.reservedQty || 0) > 0; })
                .map(function (s) {
                  return { productId: s.productId, warehouseId: s.warehouseId, quantity: s.quantity, reservedQty: s.reservedQty || 0 };
                });
              if (!snap.length) { c.remove(); toast('صفر است', '', 'info'); return; }
              fresh.adjustments = fresh.adjustments || [];
              var adjId = uid();
              fresh.adjustments.push({
                id: adjId, at: new Date().toISOString(), by: App.user.id, byName: App.user.name,
                type: 'period_close', note: note, itemsCount: snap.length, snapshot: snap
              });
              fresh.stocks.forEach(function (s) {
                s.quantity = 0;
                s.reservedQty = 0;
                s.updatedAt = new Date().toISOString();
              });
              saveDB(fresh);
              c.remove();

              showUndoToast('موجودی صفر شد (' + snap.length + ' ردیف)', function () {
                try {
                  var f2 = loadDB();
                  f2.adjustments = (f2.adjustments || []).filter(function (a) { return a.id !== adjId; });
                  snap.forEach(function (old) {
                    var s = findStock(f2, old.productId, old.warehouseId);
                    if (s) {
                      s.quantity = old.quantity;
                      s.reservedQty = old.reservedQty;
                      s.updatedAt = new Date().toISOString();
                    }
                  });
                  saveDB(f2);
                  toast('بازگردانی شد', '', 'success');
                  render();
                } catch (e) {}
              }, 6000);
              requestAnimationFrame(function () {
                requestAnimationFrame(function () { render(); });
              });
            } catch (err) {
              try { c.remove(); } catch (e) {}
              toast('خطا', err.message || '', 'error');
            }
          }, 400);
        }
      }
    ]
  });
}
