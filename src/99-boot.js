'use strict';

async function upgradePasswords() {
  var db = loadDB();
  var changed = false;
  for (var i = 0; i < db.users.length; i++) {
    var u = db.users[i];
    if (u.password && u.password.length !== 64) {
      u.password = await hashPassword(u.password);
      changed = true;
    }
  }
  if (changed) {
    saveDB(db);
    console.log('[Security] Passwords upgraded to SHA-256');
  }
}

function showWelcomeGuide() {
  if (localStorage.getItem('alus_welcome_shown') === '1') return;
  setTimeout(function() {
    openModal({
      title: 'به پنل مدیریت Alus خوش آمدید 👋',
      desc: 'راهنمای سریع برای شروع کار با سیستم',
      body: 
        '<div style="line-height:1.9; font-size:13px; color:var(--text-2)">' +
          '<p style="margin-bottom:12px">این سیستم برای مدیریت موجودی مبلمان طراحی شده است. برای شروع، پیشنهاد می‌کنیم این مراحل را طی کنید:</p>' +
          '<ul style="padding-right:20px; margin-bottom:16px; display:flex; flex-direction:column; gap:8px">' +
            '<li><b>۱. تعریف کالاها:</b> از منوی «مقداردهی» می‌توانید کالاها را با عکس ثبت کنید.</li>' +
            '<li><b>۲. ثبت موجودی اولیه:</b> موجودی انبار مرکزی را مشخص کنید.</li>' +
            '<li><b>۳. گردش کار:</b> با ثبت «ورود کالا» و «درخواست انتقال»، چرخه تأیید سه‌مرحله‌ای را تجربه کنید.</li>' +
            '<li><b>۴. مدیریت کاربران:</b> از بخش «کاربران» برای همکاران خود اکانت بسازید.</li>' +
          '</ul>' +
          '<div style="background:rgba(0,122,255,.1); border:1px solid rgba(0,122,255,.24); padding:12px; border-radius:12px; font-size:12px; color:#0369a1">' +
            IC.info + ' شما می‌توانید در هر زمان از طریق صفحه «تنظیمات» از اطلاعات پشتیبان تهیه کنید.' +
          '</div>' +
        '</div>',
      actions: [
        { label: IC.check + ' متوجه شدم، شروع کنیم!', cls: 'primary', onClick: function(c) { 
            localStorage.setItem('alus_welcome_shown', '1');
            c.remove(); 
        }}
      ]
    });
  }, 2500);
}

try {
  if (typeof initSupabase === 'function') initSupabase();

  upgradePasswords().then(function() {
    if (!loadDB().users.length) saveDB(seed());

    App.user = currentUser();
    App.route = App.user ? restoreRoute() : { name: 'dashboard', params: {} };

    try { PWA.init(); } catch (e) { console.error('[pwa]', e); }
    try { showSplash(); } catch (e) { console.error('[splash]', e); }

    render();
    if (App.user && typeof startPresence === 'function') startPresence();
    showWelcomeGuide();
  });

} catch (err) {
  var ee = document.getElementById('err');
  if (ee) {
    ee.style.display = 'block';
    ee.textContent = 'BOOT ERROR: ' + (err.message || err) + '\n' + (err.stack || '');
  }
  console.error('[boot]', err);
}