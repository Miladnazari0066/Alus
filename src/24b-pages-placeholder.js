'use strict';

/**
 * Placeholder pages — replaced by real implementations in rounds 4-5.
 * Later files with the same function names will override these (classic script hoisting).
 */
function _stubPage(page, title) {
  page.innerHTML = '<div class="page-head"><div><h1>' + esc(title) + '</h1>' +
    '<div class="sub">این صفحه در نوبت ۴ یا ۵ تکمیل می‌شود</div></div></div>' +
    '<div class="widget">' + emptyState('در حال ساخت', 'کد کامل این صفحه در نوبت‌های بعدی ارسال می‌شود') + '</div>';
}

function pageDashboard(page)      { _stubPage(page, 'داشبورد'); }
function pageStock(page)          { _stubPage(page, 'موجودی'); }
function pageStockInit(page)      { _stubPage(page, 'مقداردهی اولیه'); }
function pageTransfers(page)      { _stubPage(page, 'جابه‌جایی‌ها'); }
function pageInbounds(page)       { _stubPage(page, 'ورود کالا'); }
function pageNewTransfer(page)    { _stubPage(page, 'درخواست جابه‌جایی'); }
function pageNewInbound(page)     { _stubPage(page, 'ثبت ورود'); }
function pageDirectCustomer(page){ _stubPage(page, 'ارسال مستقیم'); }
function pageProducts(page)       { _stubPage(page, 'کالاها'); }
function pageUsers(page)          { _stubPage(page, 'کاربران'); }
function pageReports(page)        { _stubPage(page, 'گزارش‌ها'); }
function pageSettings(page)       { _stubPage(page, 'تنظیمات'); }
