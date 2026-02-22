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
} from 'lucide-react';

export interface BottomNavItem {
  path: string;
  icon: any;
  label: string;
}

/** Universal bottom nav for all roles except kitchen_staff (4 items + More) */
export const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { path: '/dashboard', icon: Home, label: 'Dashboard' },
  { path: '/checklists', icon: ClipboardList, label: 'Checklists' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
];

/** Kitchen staff: 5 dedicated tabs, no More button */
export const KITCHEN_STAFF_NAV_ITEMS: BottomNavItem[] = [
  { path: '/dashboard', icon: Home, label: 'Today' },
  { path: '/checklists', icon: ClipboardList, label: 'Checklists' },
  { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
  { path: '/self-diagnosis', icon: Wrench, label: 'Diagnosis' },
  { path: '/incidents', icon: AlertTriangle, label: 'Report' },
];

/** Paths in the universal bottom bar — used to filter More drawer items */
export const BOTTOM_NAV_PATHS = new Set(
  BOTTOM_NAV_ITEMS.map(i => i.path),
);
