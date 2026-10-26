'use strict';

function canCreate(u)         { return u && ['warehouse_officer', 'admin', 'manager'].indexOf(u.role) >= 0; }
function canManageUsers(u)    { return u && (u.role === 'admin' || u.role === 'manager'); }
function canManageProducts(u) { return u && (u.role === 'admin' || u.role === 'manager'); }
function canZeroOut(u)        { return u && u.role === 'admin'; }

function canEditUser(target) {
  if (!App.user || !target) return false;
  if (target.id === App.user.id) return false;
  if (App.user.role === 'admin') return true;
  if (App.user.role === 'manager') return target.role !== 'admin';
  return false;
}

function canAssignRole(role) {
  if (!App.user) return false;
  if (App.user.role === 'admin') return true;
  if (App.user.role === 'manager') return role !== 'admin';
  return false;
}

function canApprove(u, t) {
  if (!u || !t) return false;
  if (t.status === 'approved' || t.status === 'rejected') return false;
  // Block self-approval by admin to preserve 3-step separation
  if (u.role === 'admin' && t.createdBy === u.id) return false;
  if (t.status === 'pending_warehouse')  return u.role === 'warehouse_officer' || u.role === 'admin';
  if (t.status === 'pending_accountant') return u.role === 'accountant'        || u.role === 'admin';
  if (t.status === 'pending_manager')    return u.role === 'manager'           || u.role === 'admin';
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
