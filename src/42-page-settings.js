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
      
      // بخش جدید: ابزارهای تست
      '<div class="widget w-12">' +
        '<div class="w-head"><div><div class="w-title danger"><div class="ic danger">' + IC.zap + '</div>ابزارهای تست و عیب‌یابی (محیط آزمایشی)</div></div></div>' +
        '<p style="font-size:12.5px;line-height:1.9;margin-bottom:14px">در اینجا می‌توانید ۱۰۰ کالای تصادفی تولید کنید، آن‌ها را پاک کنید، یا اتصال دیتابیس ابری را تست کنید.</p>' +
        '<div class="row" style="justify-content:flex-end;gap:8px;flex-wrap:wrap">' +
          '<button type="button" class="btn primary" id="test-sb-btn" style="background: linear-gradient(135deg, #10b981, #059669);">' + IC.info + ' تست اتصال به Supabase</button>' +
          '<button type="button" class="btn success" id="gen-100-btn">' + IC.plus + ' تولید ۱۰۰ کالای تستی</button>' +
          '<button type="button" class="btn danger hold-btn" id="del-random-btn">' +
            '<span class="hold-progress"></span>' +
            '<span class="hold-text">' + IC.trash + ' پاک کردن کالاهای تستی (نگه دارید)</span>' +
          '</button>' +
        '</div>' +
      '</div>' +

      '<div class="widget w-6">' +
        '<div class="w-head"><div><div class="w-title danger"><div class="ic danger">' + IC.alert + '</div>صفر کردن موجودی</div></div></div>' +
        '<p style="font-size:12.5px;line-height:1.9;margin-bottom:14px"><b>' + nonZero.length + ' ردیف</b> صفر می‌شود — تاریخچه حفظ می‌شود.</p>' +
        '<div class="row" style="justify-content:flex-end"><button type="button" class="btn danger" id="zero-btn">' + IC.refresh + ' صفر کردن</button></div>' +
      '</div>' +
      '<div class="widget w-6">' +
        '<div class="w-head"><div><div class="w-title"><div class="ic">' + IC.download + '</div>پشتیبان‌گیری</div></div></div>' +
        '<div class="row" style="justify-content:flex-end;gap:8px">' +
          '<button type="button" class="btn ghost" id="imp-btn">' + IC.upload + ' بازیابی</button>' +
          '<button type="button" class="btn success" id="exp-btn">' + IC.download + ' دانلود JSON</button>' +
          '<input type="file" id="imp-file" accept=".json" style="display:none" />' +
        '</div>' +
      '</div>' +
    '</div>';

  // تنظیمات اعلان
  var reqBtn = $('#req-notif');
  if (reqBtn) {
    reqBtn.addEventListener('click', function () {
      requestNotifPermission();
      setTimeout(render, 500);
    });
  }
  
  // صفر کردن موجودی
  $('#zero-btn').addEventListener('click', openZeroOutModal);
  
  // پشتیبان‌گیری
  $('#exp-btn').addEventListener('click', function () {
    var fresh = loadDB();
    var blob = new Blob([JSON.stringify(fresh, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'alus-backup-' + ymd() + '.json');
    celebrate('پشتیبان', 'فایل دانلود شد', 'success', 1800);
  });
  
  // بازیابی از فایل
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

  // -------------------------------------------------------------
  // دکمه تست اتصال به Supabase
  // -------------------------------------------------------------
  $('#test-sb-btn').addEventListener('click', function () {
    var btn = this;
    btn.classList.add('loading');
    
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
      setTimeout(function() {
        btn.classList.remove('loading');
        toast('اتصال برقرار نیست', 'تنظیمات Supabase در فایل 00-supabase.js یافت نشد.', 'error');
      }, 500);
      return;
    }

    // یک درخواست ساده به جدول می‌فرستیم تا ببینیم آیا پاسخ می‌دهد یا نه
    supabaseClient.from('alus_sync').select('updated_at').eq('id', 'main_db').single()
      .then(function (res) {
        btn.classList.remove('loading');
        
        if (res.error) {
          if (res.error.code === 'PGRST116') {
            // رکوردی وجود ندارد (یعنی به دیتابیس وصل شد ولی هنوز دیتایی ذخیره نشده)
            toast('اتصال موفقیت‌آمیز بود ✅', 'دیتابیس وصل است اما هنوز هیچ دیتایی در ابر ذخیره نشده است.', 'success');
          } else {
            // خطای مربوط به نبودن جدول یا دسترسی
            toast('خطا در اتصال ❌', 'لطفاً کدهای SQL را در Supabase اجرا کرده‌اید؟ (' + (res.error.message || 'دسترسی مسدود') + ')', 'error');
          }
        } else if (res.data) {
          // دیتا وجود دارد و خوانده شد
          var dateStr = new Date(res.data.updated_at).toLocaleString('fa-IR');
          toast('اتصال موفقیت‌آمیز بود ✅', 'آخرین سینک اطلاعات در: ' + dateStr, 'success');
        }
      })
      .catch(function (err) {
        btn.classList.remove('loading');
        toast('خطای شبکه ❌', err.message || 'ارتباط با سرور Supabase برقرار نشد.', 'error');
        console.error('[Supabase Test Error]', err);
      });
  });

  // -------------------------------------------------------------
  // بخش تولید ۱۰۰ کالای تستی
  // -------------------------------------------------------------
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
          var randomNum = Math.floor(Math.random() * 10000);
          var pId = uid();
          var pName = 'محصول تست ' + i;
          
          fresh.products.push({
            id: pId,
            name: pName,
            code: 'TEST-' + randomNum,
            unit: units[Math.floor(Math.random() * units.length)],
            image: '',
            components: [],
            isTestData: true,
            createdAt: new Date().toISOString()
          });
          
          if (central) {
            fresh.stocks.push({
              id: uid(),
              productId: pId,
              warehouseId: central.id,
              quantity: Math.floor(Math.random() * 100),
              reservedQty: 0,
              minQuantity: 5,
              updatedAt: new Date().toISOString()
            });
          }
          if (store) {
            fresh.stocks.push({
              id: uid(),
              productId: pId,
              warehouseId: store.id,
              quantity: Math.floor(Math.random() * 20),
              reservedQty: 0,
              minQuantity: 5,
              updatedAt: new Date().toISOString()
            });
          }
        }
        
        saveDB(fresh);
        btn.classList.remove('loading');
        toast('انجام شد', '۱۰۰ کالای تستی تولید شد', 'success');
        render();
      } catch (err) {
        btn.classList.remove('loading');
        toast('خطا', err.message || '', 'error');
      }
    }, 300);
  });

  // -------------------------------------------------------------
  // بخش حذف کالاهای تستی (با نگه داشتن ۳ ثانیه)
  // -------------------------------------------------------------
  var delBtn = $('#del-random-btn');
  var holdTimer = null;
  var holdInterval = null;
  var holdDuration = 3000;
  var holdProgress = 0;
  var progressBar = delBtn.querySelector('.hold-progress');

  function startHold(e) {
    e.preventDefault();
    holdProgress = 0;
    progressBar.style.width = '0%';
    
    holdInterval = setInterval(function() {
      holdProgress += 50;
      var pct = (holdProgress / holdDuration) * 100;
      if (pct > 100) pct = 100;
      progressBar.style.width = pct + '%';
    }, 50);
    
    holdTimer = setTimeout(function() {
      clearInterval(holdInterval);
      progressBar.style.width = '0%';
      
      try {
        var fresh = loadDB();
        var testProductIds = fresh.products
          .filter(function (p) { return p.isTestData === true; })
          .map(function (p) { return p.id; });
          
        if (testProductIds.length === 0) {
          toast('موردی یافت نشد', 'هیچ کالای تستی برای حذف وجود ندارد', 'info');
          return;
        }
        
        fresh.products = fresh.products.filter(function (p) { return p.isTestData !== true; });
        fresh.stocks = fresh.stocks.filter(function (s) { return testProductIds.indexOf(s.productId) < 0; });
        fresh.transfers = fresh.transfers.filter(function (t) { return testProductIds.indexOf(t.productId) < 0; });
        
        saveDB(fresh);
        toast('پاکسازی شد', testProductIds.length + ' کالای تستی حذف شد', 'success');
        render();
      } catch (err) {
        toast('خطا در حذف', err.message || '', 'error');
      }
    }, holdDuration);
  }

  function cancelHold() {
    if (holdTimer) clearTimeout(holdTimer);
    if (holdInterval) clearInterval(holdInterval);
    progressBar.style.width = '0%';
  }

  delBtn.addEventListener('mousedown', startHold);
  delBtn.addEventListener('touchstart', startHold, { passive: false });
  
  delBtn.addEventListener('mouseup', cancelHold);
  delBtn.addEventListener('mouseleave', cancelHold);
  delBtn.addEventListener('touchend', cancelHold);
  delBtn.addEventListener('touchcancel', cancelHold);
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
