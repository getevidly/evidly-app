/**
 * ROLE-PERMS-1 — Demo seed data for the permissions management page.
 *
 * In demo mode the permissions page runs entirely client-side.
 * This file provides realistic seed data so the UI is populated
 * on first visit without any Supabase calls.
 */

import type { UserRole } from '../contexts/RoleContext';

/* ------------------------------------------------------------------ */
/*  Shared types                                                       */
/* ------------------------------------------------------------------ */

export interface RolePermissionOverride {
  id: string;
  role: UserRole;
  permissionKey: string;
  granted: boolean;
  modifiedBy: string;
  modifiedAt: string;
}

export interface UserPermissionException {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  permissionKey: string;
  granted: boolean;
  reason: string;
  grantedBy: string;
  grantedAt: string;
}

export interface PermissionAuditEntry {
  id: string;
  changedBy: string;
  changeType: 'role_default_change' | 'user_exception_add' | 'user_exception_remove' | 'user_reset';
  targetRole?: UserRole;
  targetUserId?: string;
  targetUserName?: string;
  permissionKey: string;
  oldValue?: boolean;
  newValue: boolean;
  reason?: string;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Demo team members (matches Team.tsx DEMO_MEMBERS)                  */
/* ------------------------------------------------------------------ */

export interface DemoTeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  location: string;
}

export const DEMO_TEAM_MEMBERS: DemoTeamMember[] = [
  { id: 'd1', name: 'Marcus Johnson', email: 'marcus@cleaningprosplus.com', role: 'owner_operator', location: 'All Locations' },
  { id: 'd2', name: 'Sarah Chen', email: 'sarah@cleaningprosplus.com', role: 'kitchen_manager', location: 'Downtown Kitchen' },
  { id: 'd3', name: 'Maria Garcia', email: 'maria@cleaningprosplus.com', role: 'kitchen_manager', location: 'Airport Cafe' },
  { id: 'd4', name: 'David Park', email: 'david@cleaningprosplus.com', role: 'kitchen_staff', location: 'University Dining' },
  { id: 'd5', name: 'Michael Torres', email: 'michael@cleaningprosplus.com', role: 'kitchen_staff', location: 'Airport Cafe' },
  { id: 'd6', name: 'Emma Rodriguez', email: 'emma@cleaningprosplus.com', role: 'kitchen_staff', location: 'Downtown Kitchen' },
  { id: 'd7', name: 'Alex Thompson', email: 'alex@cleaningprosplus.com', role: 'facilities_manager', location: 'Downtown Kitchen' },
  { id: 'd8', name: 'Lisa Wang', email: 'lisa@cleaningprosplus.com', role: 'compliance_manager', location: 'Airport Cafe' },
  { id: 'd9', name: 'James Park', email: 'jpark@cleaningprosplus.com', role: 'executive', location: 'All Locations' },
  { id: 'd10', name: 'Ana Torres', email: 'atorres@cleaningprosplus.com', role: 'chef', location: 'Downtown Kitchen' },
  { id: 'd11', name: 'Carlos Reyes', email: 'creyes@cleaningprosplus.com', role: 'chef', location: 'Airport Cafe' },
  { id: 'd12', name: 'Rachel Kim', email: 'rkim@cleaningprosplus.com', role: 'executive', location: 'All Locations' },
  { id: 'd13', name: 'Tony Nguyen', email: 'tnguyen@cleaningprosplus.com', role: 'kitchen_staff', location: 'University Dining' },
];

/* ------------------------------------------------------------------ */
/*  Seed: role-level overrides (org customisations of defaults)        */
/* ------------------------------------------------------------------ */

export const DEMO_ROLE_OVERRIDES: RolePermissionOverride[] = [
  {
    id: 'ro-1',
    role: 'kitchen_manager',
    permissionKey: 'sidebar.intelligence',
    granted: true,
    modifiedBy: 'James Chen',
    modifiedAt: '2026-02-15T10:30:00Z',
  },
  {
    id: 'ro-2',
    role: 'kitchen_staff',
    permissionKey: 'sidebar.incidents',
    granted: true,
    modifiedBy: 'James Chen',
    modifiedAt: '2026-02-18T09:00:00Z',
  },
];

/* ------------------------------------------------------------------ */
/*  Seed: per-user exceptions                                          */
/* ------------------------------------------------------------------ */

export const DEMO_USER_EXCEPTIONS: UserPermissionException[] = [
  {
    id: 'ue-1',
    userId: 'd3',
    userName: 'Maria Garcia',
    userEmail: 'maria@cleaningprosplus.com',
    userRole: 'kitchen_manager',
    permissionKey: 'sidebar.billing',
    granted: true,
    reason: 'Temporary access for Q1 budget review',
    grantedBy: 'James Chen',
    grantedAt: '2026-02-20T14:00:00Z',
  },
  {
    id: 'ue-2',
    userId: 'd3',
    userName: 'Maria Garcia',
    userEmail: 'maria@cleaningprosplus.com',
    userRole: 'kitchen_manager',
    permissionKey: 'sidebar.analytics',
    granted: true,
    reason: 'Needs analytics for quarterly report',
    grantedBy: 'James Chen',
    grantedAt: '2026-02-20T14:05:00Z',
  },
  {
    id: 'ue-3',
    userId: 'd4',
    userName: 'David Park',
    userEmail: 'david@cleaningprosplus.com',
    userRole: 'kitchen_staff',
    permissionKey: 'sidebar.haccp',
    granted: true,
    reason: 'HACCP training programme participant',
    grantedBy: 'Marcus Johnson',
    grantedAt: '2026-02-22T11:00:00Z',
  },
];

/* ------------------------------------------------------------------ */
/*  Seed: audit log                                                    */
/* ------------------------------------------------------------------ */

export const DEMO_AUDIT_LOG: PermissionAuditEntry[] = [
  {
    id: 'al-1',
    changedBy: 'James Chen',
    changeType: 'role_default_change',
    targetRole: 'kitchen_manager',
    permissionKey: 'sidebar.intelligence',
    oldValue: false,
    newValue: true,
    timestamp: '2026-02-15T10:30:00Z',
  },
  {
    id: 'al-2',
    changedBy: 'James Chen',
    changeType: 'user_exception_add',
    targetUserId: 'd3',
    targetUserName: 'Maria Garcia',
    permissionKey: 'sidebar.billing',
    newValue: true,
    reason: 'Temporary access for Q1 budget review',
    timestamp: '2026-02-20T14:00:00Z',
  },
  {
    id: 'al-3',
    changedBy: 'Marcus Johnson',
    changeType: 'user_exception_add',
    targetUserId: 'd4',
    targetUserName: 'David Park',
    permissionKey: 'sidebar.haccp',
    newValue: true,
    reason: 'HACCP training programme participant',
    timestamp: '2026-02-22T11:00:00Z',
  },
  {
    id: 'al-4',
    changedBy: 'James Chen',
    changeType: 'role_default_change',
    targetRole: 'kitchen_staff',
    permissionKey: 'sidebar.incidents',
    oldValue: false,
    newValue: true,
    timestamp: '2026-02-18T09:00:00Z',
  },
];
