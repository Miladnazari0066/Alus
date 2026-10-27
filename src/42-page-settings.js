'use strict';

function pageSettings(page) {
  var db = loadDB();
  var totalStock = db.stocks.reduce(function (a, s) { return a + s.quantity; }, 0);
  var nonZero = db.stocks.filter(function (s) { return s.quantity > 0 || (s.reservedQty || 0) > 0; });
  var dbSize = 0;
  try { dbSize = new Blob([JSON.stringify(db)]).size; } catch (e) {}
  var notifPerm = ('Notification' in window) ? Notification.permission : 'unsupported';

  var zeroHistory = (db.adjustments || []).filter(function(a) { return a.type === 'period_close'; });
  zeroHistory.sort(function(a, b) { return new Date(b.at) - new Date(a.at); });

  var historyHTML = '';
  if (zeroHistory.length === 0) {
    historyHTML = '<div class="muted small" style="text-align:center; padding: 24px; background:var(--surface); border-radius:16px;">تاریخچه‌ای وجود ندارد</div>';
  } else {
    zeroHistory.forEach(function(a) {
       historyHTML += '<div style="background:var(--surface); padding:12px 14px; border-radius:12px; font-size:12px; border:1px solid var(--border); margin-bottom:8px;">' +
          '<div style="display:flex; justify-content:space-between; margin-bottom:4px;">' +
            '<b style="color:var(--text)">' + esc(a.byName || '—') + '</b>' +
            '<span class="muted" style="font-size:10.5px; direction:ltr;">' + faDate(a.at) + '</span>' +
          '</div>' +
          '<div style="color:var(--text-2); font-size:11.5px;">' + (a.itemsCount || 0) + ' قلم صفر شد. ' + (a.note ? 'یادداشت: ' + esc(a.note) : '') + '</div>' +
       '</div>';
    });
  }

  page.innerHTML = '<div class="page-head"><div><h1>تنظیمات</h1>' +
    '<div class="sub">مدیریت سیستمی — فقط راهبر</div></div></div>' +
    
    '<div class="acc-list">' +
      
      // ۱. وضعیت سیستم و سرورها
      '<div class="acc-item open" id="acc-status">' +
        '<div class="acc-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
          '<div class="acc-icon info">' + IC.layers + '</div>' +
          '<div class="acc-titles"><div class="acc-title">وضعیت سرورها و حجم مصرفی</div><div class="acc-sub">وضعیت اتصال دیتابیس و استوریج عکس‌ها</div></div>' +
          '<div class="acc-chevron">' + IC.chevD + '</div>' +
        '</div>' +
        '<div class="acc-body"><div class="acc-content">' +
          '<div style="display:flex; justify-content:flex-end; margin-bottom:12px;"><button type="button" class="btn xs ghost" id="refresh-status-btn">' + IC.refresh + ' بروزرسانی</button></div>' +
          '<div class="table-scroll">' +
            '<table class="dt" style="min-width: 100%; margin:0">' +
              '<thead><tr><th>سرویس</th><th>وضعیت اتصال</th><th style="text-align:left">حجم مصرفی</th></tr></thead>' +
              '<tbody>' +
                '<tr>' +
                  '<td><div class="cell-product"><div class="img-thumb-placeholder" style="background:rgba(0,122,255,.1);color:var(--blue);border-color:rgba(0,122,255,.2)">' + IC.package + '</div><div class="info"><b>دیتابیس</b><br><small style="font-size:10px;color:var(--muted)">Supabase DB</small></div></div></td>' +
                  '<td id="db-status-cell" style="font-size:11px;direction:ltr;text-align:left"><span style="color:var(--orange);display:flex;align-items:center;gap:6px;direction:rtl;"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--orange);display:inline-block"></span>در حال بررسی...</span></td>' +
                  '<td class="num" id="db-size-cell">-</td>' +
                '</tr>' +
                '<tr>' +
                  '<td><div class="cell-product"><div class="img-thumb-placeholder" style="background:rgba(175,82,222,.1);color:var(--purple);border-color:rgba(175,82,222,.2)">' + IC.image + '</div><div class="info"><b>استوریج عکس‌ها</b><br><small style="font-size:10px;color:var(--muted)">Supabase Storage</small></div></div></td>' +
                  '<td id="storage-status-cell" style="font-size:11px;direction:ltr;text-align:left"><span style="color:var(--orange);display:flex;align-items:center;gap:6px;direction:rtl;"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--orange);display:inline-block"></span>در حال بررسی...</span></td>' +
                  '<td class="num" id="storage-size-cell">-</td>' +
                '</tr>' +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div></div>' +
      '</div>' +

      // ۲. اعلان‌ها
      '<div class="acc-item" id="acc-notif">' +
        '<div class="acc-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
          '<div class="acc-icon warn">' + IC.bell + '</div>' +
          '<div class="acc-titles"><div class="acc-title">اعلان مرورگر</div><div class="acc-sub">دریافت هشدارها روی دستگاه</div></div>' +
          '<div class="acc-chevron">' + IC.chevD + '</div>' +
        '</div>' +
        '<div class="acc-body"><div class="acc-content">' +
          '<p style="font-size:12.5px;line-height:1.9;margin-bottom:14px;color:var(--text-2)">با فعال‌سازی این گزینه، هنگام تأیید نهایی اسناد یا ورود کالا، یک اعلان در گوشی یا کامپیوتر شما نمایش داده می‌شود.</p>' +
          (notifPerm === 'granted' ?
            '<div style="padding:12px 14px;background:rgba(52,199,89,.1);border:1px solid rgba(52,199,89,.24);border-radius:14px;font-size:12.5px;color:#047857;display:inline-block">' + IC.check + ' فعال است</div>' :
            notifPerm === 'denied' ?
            '<div style="padding:12px 14px;background:rgba(255,59,48,.1);border:1px solid rgba(255,59,48,.24);border-radius:14px;font-size:12.5px;color:#b91c1c;display:inline-block">' + IC.x + ' مسدود شده — از تنظیمات مرورگر فعال کنید</div>' :
            '<button type="button" class="btn primary" id="req-notif">' + IC.bell + ' فعال‌سازی اعلان‌ها</button>') +
        '</div></div>' +
      '</div>' +

      // ۳. پشتیبان‌گیری
      '<div class="acc-item" id="acc-backup">' +
        '<div class="acc-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
          '<div class="acc-icon primary">' + IC.download + '</div>' +
          '<div class="acc-titles"><div class="acc-title">پشتیبان‌گیری و بازیابی</div><div class="acc-sub">دانلود و بارگذاری فایل اطلاعات</div></div>' +
          '<div class="acc-chevron">' + IC.chevD + '</div>' +
        '</div>' +
        '<div class="acc-body"><div class="acc-content">' +
          '<p style="font-size:12.5px;line-height:1.9;margin-bottom:14px;color:var(--text-2)">اطلاعات فعلی سیستم (کالاها، انبارها و اسناد) را به صورت یک فایل دانلود کنید یا یک فایل قبلی را بازیابی کنید.</p>' +
          '<div class="row">' +
            '<button type="button" class="btn ghost" id="imp-btn">' + IC.upload + ' بازیابی از فایل</button>' +
            '<button type="button" class="btn success" id="exp-btn">' + IC.download + ' دانلود فایل پشتیبان</button>' +
            '<input type="file" id="imp-file" accept=".json" style="display:none" />' +
          '</div>' +
        '</div></div>' +
      '</div>' +

      // ۴. مدیریت موجودی (صفر کردن)
      '<div class="acc-item" id="acc-zero">' +
        '<div class="acc-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
          '<div class="acc-icon danger">' + IC.refresh + '</div>' +
          '<div class="acc-titles"><div class="acc-title">صفر کردن موجودی</div><div class="acc-sub">بستن دوره مالی و صفر کردن انبارها</div></div>' +
          '<div class="acc-chevron">' + IC.chevD + '</div>' +
        '</div>' +
        '<div class="acc-body"><div class="acc-content">' +
          '<div style="padding:14px;background:var(--surface);border-radius:14px;border:1px solid var(--border);margin-bottom:14px">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-size:12.5px;color:var(--muted)">تعداد ردیف‌های دارای موجودی:</span><b>' + nonZero.length + ' ردیف</b></div>' +
            '<div style="display:flex;justify-content:space-between"><span style="font-size:12.5px;color:var(--muted)">جمع کل موجودی:</span><b>' + totalStock.toLocaleString('fa-IR') + ' عدد</b></div>' +
          '</div>' +
          '<button type="button" class="btn danger" id="zero-btn">' + IC.refresh + ' صفر کردن موجودی</button>' +
        '</div></div>' +
      '</div>' +

      // ۵. تاریخچه صفر کردن
      '<div class="acc-item" id="acc-history">' +
        '<div class="acc-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
          '<div class="acc-icon info">' + IC.history + '</div>' +
          '<div class="acc-titles"><div class="acc-title">تاریخچه صفر کردن</div><div class="acc-sub">سوابق بستن دوره‌های مالی</div></div>' +
          '<div class="acc-chevron">' + IC.chevD + '</div>' +
        '</div>' +
        '<div class="acc-body"><div class="acc-content">' +
          '<div style="max-height: 250px; overflow-y: auto; padding-right:4px;">' + historyHTML + '</div>' +
        '</div></div>' +
      '</div>' +

      // ۶. ابزارهای تست و بازنشانی
      '<div class="acc-item" id="acc-tools" style="border-color:rgba(255,59,48,.3)">' +
        '<div class="acc-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
          '<div class="acc-icon danger" style="background:linear-gradient(135deg, #FF3B30, #D70015)">' + IC.settings + '</div>' +
          '<div class="acc-titles"><div class="acc-title" style="color:#b91c1c">ابزارهای تست و بازنشانی</div><div class="acc-sub">عملیات پیشرفته (مخصوص توسعه‌دهنده)</div></div>' +
          '<div class="acc-chevron">' + IC.chevD + '</div>' +
        '</div>' +
        '<div class="acc-body"><div class="acc-content">' +
          '<p style="font-size:12.5px;line-height:1.9;margin-bottom:14px;color:var(--text-2)">با دکمه اول می‌توانید ۱۰۰ کالای تصادفی بسازید. دکمه قرمز، تمام اطلاعات (کالاها، اسناد، موجودی و عکس‌ها) را برای همیشه پاک می‌کند.</p>' +
          '<div class="row">' +
            '<button type="button" class="btn success" id="gen-100-btn">' + IC.plus + ' تولید ۱۰۰ کالای تستی</button>' +
            '<button type="button" class="btn danger" id="factory-reset-btn" style="background: #111; border-color: #333;">' + IC.trash + ' بازنشانی کارخانه‌ای</button>' +
          '</div>' +
        '</div></div>' +
      '</div>' +

    '</div>';

  // -------------------------------------------------------------
  // توابع وضعیت ابری
  // -------------------------------------------------------------
  function checkServerStatus() {
    var dbStatusEl = document.getElementById('db-status-cell');
    var dbSizeEl = document.getElementById('db-size-cell');
    var stStatusEl = document.getElementById('storage-status-cell');
    var stSizeEl = document.getElementById('storage-size-cell');

    if (!dbStatusEl) return;

    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
      dbStatusEl.innerHTML = '<span style="color:var(--red);display:flex;align-items:center;gap:6px;direction:rtl;"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--red);display:inline-block"></span>آفلاین</span>';
      dbSizeEl.innerHTML = '—';
    } else {
      supabaseClient.from('alus_sync').select('count', { count: 'exact', head: true })
        .then(function (res) {
          if (res.error) {
             dbStatusEl.innerHTML = '<span style="color:var(--red);direction:rtl;font-size:11px;display:block;text-align:right">خطا:<br><span style="font-size:10px;color:var(--text-2)">' + (res.error.message || res.error.code) + '</span></span>';
          } else {
             dbStatusEl.innerHTML = '<span style="color:var(--green);display:flex;align-items:center;gap:6px;direction:rtl;"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block;box-shadow:0 0 6px var(--green)"></span>آنلاین</span>';
          }
        })
        .catch(function (err) {
          dbStatusEl.innerHTML = '<span style="color:var(--red);direction:rtl;font-size:11px;display:block;text-align:right">خطای شبکه:<br><span style="font-size:10px;color:var(--text-2)">' + err.message + '</span></span>';
        });
      dbSizeEl.innerHTML = (dbSize / 1024).toFixed(1) + ' <span class="unit">KB</span>';
    }

    if (typeof supabaseStorageClient === 'undefined' || !supabaseStorageClient) {
      stStatusEl.innerHTML = '<span style="color:var(--red);display:flex;align-items:center;gap:6px;direction:rtl;"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--red);display:inline-block"></span>آفلاین</span>';
      stSizeEl.innerHTML = '—';
    } else {
      supabaseStorageClient.storage.from('product-images').list()
        .then(function (res) {
          if (res.error) {
            stStatusEl.innerHTML = '<span style="color:var(--red);direction:rtl;font-size:11px;display:block;text-align:right">خطا:<br><span style="font-size:10px;color:var(--text-2)">' + (res.error.message || res.error.name) + '</span></span>';
            stSizeEl.innerHTML = '—';
          } else {
            stStatusEl.innerHTML = '<span style="color:var(--green);display:flex;align-items:center;gap:6px;direction:rtl;"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block;box-shadow:0 0 6px var(--green)"></span>آنلاین</span>';
            var totalBytes = 0;
            res.data.forEach(function(file) {
              if (file.metadata && file.metadata.size) totalBytes += file.metadata.size;
            });
            stSizeEl.innerHTML = totalBytes === 0 ? '0 <span class="unit">KB</span>' : (totalBytes < 1024 * 1024 ? (totalBytes / 1024).toFixed(1) + ' KB' : (totalBytes / (1024 * 1024)).toFixed(2) + ' MB');
          }
        })
        .catch(function (err) {
          stStatusEl.innerHTML = '<span style="color:var(--red);direction:rtl;font-size:11px;display:block;text-align:right">خطای شبکه:<br><span style="font-size:10px;color:var(--text-2)">' + err.message + '</span></span>';
          stSizeEl.innerHTML = '—';
        });
    }
  }

  setTimeout(checkServerStatus, 500);
  
  document.getElementById('refresh-status-btn').addEventListener('click', function(e) {
    e.stopPropagation(); // جلوگیری از بسته شدن آکاردئون
    var btn = this;
    btn.innerHTML = IC.refresh + ' در حال بررسی...';
    checkServerStatus();
    setTimeout(function() { btn.innerHTML = IC.refresh + ' بروزرسانی'; }, 1000);
  });

  // -------------------------------------------------------------
  // بقیه رویدادها
  // -------------------------------------------------------------
  var reqBtn = $('#req-notif');
  if (reqBtn) { reqBtn.addEventListener('click', function () { requestNotifPermission(); setTimeout(render, 500); }); }
  
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
          title: 'بازیابی', desc: 'کل داده جایگزین می‌شود',
          body: '<div style="padding:12px 14px;background:rgba(255,59,48,.1);border-radius:14px;font-size:12px;color:#b91c1c">' + IC.alert + ' از حساب خارج می‌شوید</div>',
          actions: [
            { label: 'انصراف', cls: 'ghost', onClick: function (c) { c.remove(); } },
            { label: IC.check + ' بازیابی', cls: 'danger', onClick: function (c) {
                try { migrateDB(parsed); saveDB(parsed); try { localStorage.removeItem(K_SES); } catch (e) {} c.remove(); celebrate('بازیابی', 'دوباره وارد شوید', 'success', 2200); setTimeout(function () { App.user = null; render(); }, 700); }
                catch (err) { c.remove(); toast('خطا', err.message || '', 'error'); }
            }}
          ]
        });
      } catch (err) { toast('نامعتبر', err.message || '', 'error'); }
    };
    rd.readAsText(f);
  });

  $('#gen-100-btn').addEventListener('click', function () {
    var btn = this;
    btn.classList.add('loading');
    setTimeout(function() {
      try {
        var fresh = loadDB();
        var central = whByType(fresh, 'central');
        var store = whByType(fresh, 'store');
        var units = ['دست', 'سرویس', 'عدد', 'متر', 'بسته'];
        for (var i = 1; i <= 100; i++) {
          var pId = uid();
          fresh.products.push({ id: pId, name: 'محصول تست ' + i, code: 'TEST-' + Math.floor(Math.random() * 10000), unit: units[Math.floor(Math.random() * units.length)], image: '', components: [], isTestData: true, createdAt: new Date().toISOString() });
          if (central) fresh.stocks.push({ id: uid(), productId: pId, warehouseId: central.id, quantity: Math.floor(Math.random() * 100), reservedQty: 0, minQuantity: 5, updatedAt: new Date().toISOString() });
          if (store) fresh.stocks.push({ id: uid(), productId: pId, warehouseId: store.id, quantity: Math.floor(Math.random() * 20), reservedQty: 0, minQuantity: 5, updatedAt: new Date().toISOString() });
        }
        saveDB(fresh);
        btn.classList.remove('loading');
        toast('انجام شد', '۱۰۰ کالای تستی تولید شد', 'success');
        render();
      } catch (err) { btn.classList.remove('loading'); toast('خطا', err.message || '', 'error'); }
    }, 300);
  });

  document.getElementById('factory-reset-btn').addEventListener('click', function() {
    openModal({
      title: 'بازنشانی کارخانه‌ای',
      desc: 'هشدار! این عملیات غیرقابل بازگشت است.',
      body: '<div style="padding:12px 14px;background:rgba(255,59,48,.1);border-radius:14px;font-size:13px;color:#b91c1c;line-height:1.8">' +
        IC.alert + ' با این کار، <b>تمام کالاها، موجودی‌ها، اسناد و عکس‌ها</b> (هم در مرورگر و هم در سرورهای ابری) برای همیشه پاک می‌شوند. آیا مطمئن هستید؟</div>',
      actions: [
        { label: 'انصراف', cls: 'ghost', onClick: function (c) { c.remove(); } },
        {
          label: IC.trash + ' بله، همه چیز را پاک کن', cls: 'danger',
          onClick: function (c) {
            var btn = c.querySelector('button.danger');
            if (btn) btn.classList.add('loading');
            localStorage.clear();
            if (typeof clearCache === 'function') clearCache();
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
              supabaseClient.from('alus_sync').delete().eq('id', 'main_db').then(function() {
                if (typeof supabaseStorageClient !== 'undefined' && supabaseStorageClient) {
                  supabaseStorageClient.storage.from('product-images').list().then(function(res) {
                    if (res.data && res.data.length > 0) {
                      var files = res.data.map(function(f) { return f.name; });
                      supabaseStorageClient.storage.from('product-images').remove(files).then(function() { window.location.reload(); });
                    } else { window.location.reload(); }
                  });
                } else { window.location.reload(); }
              });
            } else { window.location.reload(); }
          }
        }
      ]
    });
  });
}

function openZeroOutModal() {
  var db = loadDB();
  var nonZero = db.stocks.filter(function (s) { return s.quantity > 0 || (s.reservedQty || 0) > 0; });
  var totalQ = nonZero.reduce(function (a, s) { return a + s.quantity; }, 0);
  var pendingCount = db.transfers.filter(function(t) { return t.status.indexOf('pending') === 0; }).length;

  openModal({
    title: 'صفر کردن موجودی', desc: 'با ثبت snapshot تاریخی',
    body: '<div class="field"><label>یادداشت (دلیل صفر کردن)</label><input id="zo-note" placeholder="مثلاً: بستن سال یا پایان دوره" /></div>' +
      '<div style="margin-top:14px;padding:14px;background:var(--surface-2);border-radius:16px;font-size:12.5px;line-height:1.9">' +
        '<div style="display:flex;justify-content:space-between"><span>ردیف‌های موجودی:</span><b>' + nonZero.length + '</b></div>' +
        '<div style="display:flex;justify-content:space-between"><span>جمع موجودی:</span><b>' + totalQ + ' عدد</b></div>' +
        '<div style="display:flex;justify-content:space-between;color:var(--red);margin-top:8px;padding-top:8px;border-top:1px dashed var(--border)"><span>درخواست‌های در انتظار:</span><b>' + pendingCount + ' مورد (لغو می‌شوند)</b></div>' +
      '</div>' +
      '<div style="margin-top:14px;padding:12px;background:rgba(255,59,48,.1);border-radius:12px;font-size:11.5px;color:#b91c1c">' + IC.alert + ' با این کار تمام درخواست‌های در انتظار (اعلان‌های زنگوله) لغو شده و موجودی تمام انبارها صفر می‌شود.</div>',
    actions: [
      { label: 'انصراف', cls: 'ghost', onClick: function (c) { c.remove(); } },
      { label: IC.refresh + ' تایید و صفر کردن', cls: 'danger', onClick: function (c) {
          var btn = c.querySelector('button.danger'); if (btn) btn.classList.add('loading');
          var note = (c.querySelector('#zo-note') || {}).value || '';
          setTimeout(function () {
            try {
              var fresh = loadDB();
              var snap = fresh.stocks.filter(function (s) { return s.quantity > 0 || (s.reservedQty || 0) > 0; }).map(function (s) { return { productId: s.productId, warehouseId: s.warehouseId, quantity: s.quantity, reservedQty: s.reservedQty || 0 }; });
              fresh.transfers.forEach(function(t) { if (t.status.indexOf('pending') === 0) { t.status = 'rejected'; t.rejection = { userId: App.user.id, userName: App.user.name, at: new Date().toISOString(), reason: 'سیستم: موجودی انبارها صفر شد', stage: 'system' }; } });
              fresh.adjustments = fresh.adjustments || [];
              var adjId = uid();
              fresh.adjustments.push({ id: adjId, at: new Date().toISOString(), by: App.user.id, byName: App.user.name, type: 'period_close', note: note, itemsCount: snap.length, snapshot: snap });
              fresh.stocks.forEach(function (s) { s.quantity = 0; s.reservedQty = 0; s.updatedAt = new Date().toISOString(); });
              saveDB(fresh); c.remove();
              showUndoToast('موجودی و اعلان‌ها صفر شدند', function () {
                try { var f2 = loadDB(); f2.adjustments = (f2.adjustments || []).filter(function (a) { return a.id !== adjId; }); snap.forEach(function (old) { var s = findStock(f2, old.productId, old.warehouseId); if (s) { s.quantity = old.quantity; s.reservedQty = old.reservedQty; s.updatedAt = new Date().toISOString(); } }); saveDB(f2); toast('بازگردانی شد', 'موجودی‌ها بازگشتند', 'success'); render(); } catch (e) {}
              }, 6000);
              requestAnimationFrame(function () { requestAnimationFrame(function () { render(); }); });
            } catch (err) { try { c.remove(); } catch (e) {} toast('خطا', err.message || '', 'error'); }
          }, 400);
      }}
    ]
  });
}
