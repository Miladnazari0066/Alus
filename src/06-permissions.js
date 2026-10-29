'use strict';

// لیست تمام دسترسی‌های موجود در سیستم
var ALL_PERMISSIONS = {
  create_transfer: 'ثبت درخواست انتقال',
  create_inbound: 'ثبت ورود کالا',
  approve_warehouse: 'تأیید مرحله ۱ (انباردار)',
  approve_accountant: 'تأیید مرحله ۲ (حسابدار)',
  approve_manager: 'تأیید مرحله ۳ (مدیر)',
  manage_products: 'مدیریت کالاها و مقداردهی',
  view_reports: 'مشاهده گزارش‌ها',
  delete_stock: 'حذف ردیف موجودی',
  manage_users: 'مدیریت کاربران',
  manage_settings: 'دسترسی به تنظیمات',
  zero_stock: 'صفر کردن موجودی'
};

// دسترسی‌های پیش‌فرض برای هر نقش
var ROLE_DEFAULTS = {
  admin: ['create_transfer', 'create_inbound', 'approve_warehouse', 'approve_accountant', 'approve_manager', 'manage_products', 'view_reports', 'delete_stock', 'manage_users', 'manage_settings', 'zero_stock'],
  manager: ['create_transfer', 'create_inbound', 'approve_manager', 'manage_products', 'view_reports', 'delete_stock', 'manage_users'],
  accountant: ['approve_accountant', 'view_reports'],
  warehouse_officer: ['create_transfer', 'create_inbound', 'approve_warehouse', 'manage_products', 'view_reports', 'delete_stock']
};

// تابع اصلی بررسی دسترسی
function hasPermission(u, perm) {
  if (!u) return false;
  
  // ادمین اصلی همیشه به همه چیز دسترسی دارد (مگر اینکه دسترسی‌اش قطع شده باشد)
  if (u.role === 'admin' && (!u.permissions || u.permissions[perm] === undefined)) {
    return true;
  }
  
  // اگر ادمین برای این کاربر دسترسی سفارشی تعریف کرده باشد، از آن استفاده می‌کند
  if (u.permissions && u.permissions[perm] !== undefined) {
    return u.permissions[perm];
  }
  
  // اگر دسترسی سفارشی نبود، از دسترسی‌های پیش‌فرض نقش استفاده می‌کند
  var defaults = ROLE_DEFAULTS[u.role] || [];
  return defaults.indexOf(perm) >= 0;
}

function canCreate(u)         { return hasPermission(u, 'create_transfer') || hasPermission(u, 'create_inbound'); }
function canManageUsers(u)    { return hasPermission(u, 'manage_users'); }
function canManageProducts(u) { return hasPermission(u, 'manage_products'); }
function canZeroOut(u)        { return hasPermission(u, 'zero_stock'); }

function canEditUser(target) {
  if (!App.user || !target) return false;
  if (target.id === App.user.id) return false; // نمی‌تواند خودش را ویرایش کند
  if (App.user.role === 'admin') return true;
  if (App.user.role === 'manager' && target.role !== 'admin') return true;
  return false;
}

function canAssignRole(role) {
  if (!App.user) return false;
  if (App.user.role === 'admin') return true;
  if (App.user.role === 'manager' && role !== 'admin') return true;
  return false;
}

function canApprove(u, t) {
  if (!u || !t) return false;
  if (t.status === 'approved' || t.status === 'rejected') return false;
  
  if (u.role === 'admin' && t.createdBy === u.id) return false; // ادمین نمی‌تواند درخواست خودش را تایید کند
  
  if (t.status === 'pending_warehouse')  return hasPermission(u, 'approve_warehouse');
  if (t.status === 'pending_accountant') return hasPermission(u, 'approve_accountant');
  if (t.status === 'pending_manager')    return hasPermission(u, 'approve_manager');
  return false;
}

function allowedDest(type) {
  if (type === 'central')          return ['paint_in', 'paint_out'];
  if (type === 'paint_in')         return ['upholstery'];
  if (type === 'paint_out')        return ['upholstery'];
  if (type === 'upholstery')       return ['store', 'showroom_khalij', 'showroom_alus', 'sold', 'customer'];
  if (type === 'store')            return ['showroom_khalij', 'showroom_alus', 'sold', 'customer'];
  if (type === 'showroom_khalij')  return ['sold', 'customer'];
  if (type === 'showroom_alus')    return ['sold', 'customer'];
  if (type === 'sold')             return ['customer'];
  return [];
}

function allowedSourceTypes() {
  return ['central', 'paint_in', 'paint_out', 'upholstery', 'store', 'showroom_khalij', 'showroom_alus', 'sold'];
}