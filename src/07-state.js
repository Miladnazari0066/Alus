'use strict';

var App = {
  user: null,
  route: { name: 'dashboard', params: {} },
  theme: 'light',
  prefs: {}
};

// تشخیص خودکار فصل بر اساس تقویم شمسی
function getAutoSeason() {
  try {
    var monthStr = new Intl.DateTimeFormat('fa-IR', { month: 'numeric' }).format(new Date());
    // اعداد فارسی را به انگلیسی تبدیل میکنیم
    var faDigits = '۰۱۲۳۴۵۶۷۸۹';
    var enDigits = '0123456789';
    for (var i = 0; i < 10; i++) {
      monthStr = monthStr.replace(new RegExp(faDigits[i], 'g'), enDigits[i]);
    }
    var m = parseInt(monthStr, 10);
    
    if (m >= 1 && m <= 3) return 'spring';   // فروردین تا خرداد
    if (m >= 4 && m <= 6) return 'summer';   // تیر تا شهریور
    if (m >= 7 && m <= 9) return 'autumn';   // مهر تا آذر
    return 'winter';                         // دی تا اسفند
  } catch (e) {
    return 'spring'; // پیش‌فرض
  }
}

try { App.prefs = JSON.parse(localStorage.getItem(K_PREF) || '{}'); } catch (e) { App.prefs = {}; }

// منطق انتخاب تم
var savedTheme = App.prefs.theme || 'smart';
if (savedTheme === 'smart') {
  App.theme = getAutoSeason();
} else {
  App.theme = savedTheme;
}

document.documentElement.setAttribute('data-theme', App.theme);

function savePrefs() {
  try { 
    localStorage.setItem(K_PREF, JSON.stringify({ 
      theme: App.prefs.theme || 'smart', 
      searchHistory: App.prefs.searchHistory || [] 
    })); 
  } catch (e) {}
}

function sanitizeUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, username: u.username, role: u.role, isActive: u.isActive, permissions: u.permissions || {} };
}

function currentUser() {
  var id = null;
  try { id = localStorage.getItem(K_SES); } catch (e) {}
  if (!id) return null;
  var us = loadDB().users;
  for (var i = 0; i < us.length; i++) {
    if (us[i].id === id && us[i].isActive) return sanitizeUser(us[i]);
  }
  return null;
}

function saveRoute() {
  try { sessionStorage.setItem(K_ROUTE, JSON.stringify(App.route)); } catch (e) {}
}

function clearRoute() {
  try { sessionStorage.removeItem(K_ROUTE); } catch (e) {}
}

function restoreRoute() {
  try {
    var r = sessionStorage.getItem(K_ROUTE);
    if (!r) return { name: 'dashboard', params: {} };
    var p = JSON.parse(r);
    if (!p || typeof p.name !== 'string') return { name: 'dashboard', params: {} };
    return { name: p.name, params: p.params || {} };
  } catch (e) {
    return { name: 'dashboard', params: {} };
  }
}