'use strict';

var K_DB   = 'alus_db_v1';
var K_SES  = 'alus_ses_v1';
var K_PREF = 'alus_pref_v1';
var K_ROUTE= 'alus_route_v1';

var _dbCache = null;

function clearCache() {
  _dbCache = null;
}

function emptyDB() {
  return { users: [], warehouses: [], products: [], stocks: [], transfers: [], adjustments: [] };
}

function migrateDB(d) {
  var changed = false;
  if (!d.adjustments) { d.adjustments = []; changed = true; }
  if (!d.users) { d.users = []; changed = true; }
  if (!d.warehouses) { d.warehouses = []; changed = true; }
  if (!d.products) { d.products = []; changed = true; }
  if (!d.stocks) { d.stocks = []; changed = true; }
  if (!d.transfers) { d.transfers = []; changed = true; }

  for (var i = 0; i < d.products.length; i++) {
    if (!d.products[i].components) { d.products[i].components = []; changed = true; }
    if (d.products[i].image === undefined) { d.products[i].image = ''; changed = true; }
  }

  for (var j = 0; j < d.warehouses.length; j++) {
    var w = d.warehouses[j];
    if (w.type === 'paint') {
      w.type = 'paint_in';
      if (!w.name || w.name === 'رنگ‌کاری') w.name = 'رنگ‌کاری داخلی';
      changed = true;
    }
  }

  for (var k = 0; k < d.stocks.length; k++) {
    if (d.stocks[k].minQuantity === undefined) { d.stocks[k].minQuantity = 5; changed = true; }
  }

  function ensure(type, name, order) {
    for (var x = 0; x < d.warehouses.length; x++) {
      if (d.warehouses[x].type === type) return;
    }
    d.warehouses.push({ id: uid(), name: name, type: type, isActive: true, order: order || 0 });
    changed = true;
  }
  ensure('central',         'انبار مرکزی', 1);
  ensure('paint_in',        'رنگ‌کاری داخلی', 2);
  ensure('paint_out',       'رنگ‌کاری بیرون', 3);
  ensure('upholstery',      'رویه‌کوبی', 4);
  ensure('store',           'فروشگاه', 5);
  ensure('showroom_khalij', 'نمایشگاه خلیج فارس', 6);
  ensure('showroom_alus',   'نمایشگاه الوس', 7);
  ensure('sold',            'کالای فروش‌رفته', 8);
  ensure('customer',        'مشتری', 9);

  var oldDefaults = { admin: 'admin', manager: 'manager', acc: 'acc', wh: 'wh' };
  for (var u = 0; u < d.users.length; u++) {
    if (oldDefaults[d.users[u].username] && d.users[u].password === oldDefaults[d.users[u].username]) {
      d.users[u].password = '1111';
      changed = true;
    }
  }
  return changed;
}

function loadDB() {
  if (_dbCache) return _dbCache;

  var raw = null;
  try { raw = localStorage.getItem(K_DB); } catch (e) {}
  if (!raw) { _dbCache = emptyDB(); return _dbCache; }
  
  try {
    var d = JSON.parse(raw);
    var changed = migrateDB(d);
    _dbCache = d;
    if (changed) {
      try { localStorage.setItem(K_DB, JSON.stringify(d)); } catch (e) {}
    }
    return _dbCache;
  } catch (e) {
    console.error('[loadDB]', e);
    return emptyDB();
  }
}

function saveDB(db) {
  _dbCache = db;
  
  try {
    localStorage.setItem(K_DB, JSON.stringify(db));
  } catch (e) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) {
      if (typeof toast === 'function') toast('حافظه پر شد', 'حجم تصاویر کالاها را کم کنید', 'error');
    }
    console.error('[saveDB]', e);
    return false;
  }

  if (typeof syncToCloud === 'function') {
    syncToCloud(db);
  }
  return true;
}

function nextSeq(db, prefix) {
  var max = 0;
  for (var i = 0; i < db.transfers.length; i++) {
    var c = db.transfers[i] && db.transfers[i].code;
    if (c && c.indexOf(prefix) === 0) {
      var n = parseInt(c.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return max + 1;
}

function tcode(db) {
  var p = 'TR-' + ymd() + '-';
  return p + ('00' + nextSeq(db, p)).slice(-3);
}

function icode(db) {
  var p = 'IN-' + ymd() + '-';
  return p + ('00' + nextSeq(db, p)).slice(-3);
}

function seed() {
  var central  = { id: uid(), name: 'انبار مرکزی',            type: 'central',         isActive: true };
  var paintIn  = { id: uid(), name: 'رنگ‌کاری داخلی',        type: 'paint_in',        isActive: true };
  var paintOut = { id: uid(), name: 'رنگ‌کاری بیرون',         type: 'paint_out',       isActive: true };
  var uph      = { id: uid(), name: 'رویه‌کوبی',              type: 'upholstery',      isActive: true };
  var store    = { id: uid(), name: 'فروشگاه',                type: 'store',           isActive: true };
  var showK    = { id: uid(), name: 'نمایشگاه خلیج فارس',    type: 'showroom_khalij', isActive: true };
  var showA    = { id: uid(), name: 'نمایشگاه الوس',         type: 'showroom_alus',   isActive: true };
  var sold     = { id: uid(), name: 'کالای فروش‌رفته',       type: 'sold',            isActive: true };
  var customer = { id: uid(), name: 'مشتری',                  type: 'customer',        isActive: true };

  var users = [
    { id: uid(), name: 'راهبر سیستم', username: 'admin',   password: '1111', role: 'admin',             isActive: true },
    { id: uid(), name: 'مدیر',        username: 'manager', password: '1111', role: 'manager',           isActive: true },
    { id: uid(), name: 'حسابدار',     username: 'acc',     password: '1111', role: 'accountant',        isActive: true },
    { id: uid(), name: 'انباردار',    username: 'wh',      password: '1111', role: 'warehouse_officer', isActive: true }
  ];

  return {
    warehouses: [central, paintIn, paintOut, uph, store, showK, showA, sold, customer],
    users: users,
    products: [],
    stocks: [],
    transfers: [],
    adjustments: []
  };
}