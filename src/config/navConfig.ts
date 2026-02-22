/**
 * navConfig.ts — Single source of truth for bottom navigation
 *
 * LOCKED: Do not add items without product approval.
 * Bottom nav = exactly 5 slots: 4 tabs + More button.
 * Kitchen staff: 5 dedicated tabs, no More button.
 */

import {
  Home,
  ClipboardList,
  Calendar,
  Thermometer,
  Wrench,
  AlertTriangle,
  BarChart3,
  FileText,
  CheckSquare,
  Flame,
  Shield,
} from 'lucide-react';
import type { UserRole } from '../contexts/RoleContext';

export interface BottomNavItem {
  path: string;
  icon: any;
  label: string;
}

/** Kitchen staff: 5 dedicated tabs, no More button */
export const KITCHEN_STAFF_NAV_ITEMS: BottomNavItem[] = [
  { path: '/dashboard', icon: Home, label: 'Today' },
  { path: '/checklists', icon: ClipboardList, label: 'Checklists' },
  { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
  { path: '/self-diagnosis', icon: Wrench, label: 'Diagnosis' },
  { path: '/incidents', icon: AlertTriangle, label: 'Report' },
];

/** Role-specific bottom nav (4 items + More button) */
const ROLE_NAV_ITEMS: Record<Exclude<UserRole, 'kitchen_staff'>, BottomNavItem[]> = {
  owner_operator: [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/checklists', icon: ClipboardList, label: 'Checklists' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
  ],
  executive: [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/analysis', icon: BarChart3, label: 'Analytics' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
  ],
  compliance_manager: [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/checklists', icon: ClipboardList, label: 'Checklists' },
    { path: '/corrective-actions', icon: CheckSquare, label: 'Actions' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
  ],
  facilities_manager: [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/equipment', icon: Wrench, label: 'Equipment' },
    { path: '/calendar', icon: Calendar, label: 'Service Cal' },
    { path: '/fire-safety', icon: Flame, label: 'Fire Safety' },
  ],
  chef: [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/checklists', icon: ClipboardList, label: 'Checklists' },
    { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
    { path: '/haccp', icon: Shield, label: 'HACCP' },
  ],
  kitchen_manager: [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/checklists', icon: ClipboardList, label: 'Checklists' },
    { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
  ],
};

/** Get bottom nav items for a given role */
export function getBottomNavItems(role: UserRole): BottomNavItem[] {
  if (role === 'kitchen_staff') return KITCHEN_STAFF_NAV_ITEMS;
  return ROLE_NAV_ITEMS[role];
}

/** Get bottom nav paths for a given role — used to filter More drawer items */
export function getBottomNavPaths(role: UserRole): Set<string> {
  return new Set(getBottomNavItems(role).map(i => i.path));
}
