import {
  LayoutDashboard,
  ClipboardCheck,
  Thermometer,
  AlertTriangle,
  FileText,
  Wrench,
  Users,
  ShoppingBag,
  Shield,
  Brain,
  BarChart3,
  Trophy,
  Camera,
  Bell,
  Scale,
  MapPin,
  Settings,
  HelpCircle,
  Eye,
  GraduationCap,
  Newspaper,
  Store,
  Calendar,
  BookOpen,
  Cog,
  Flame,
  Radio,
  QrCode,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '../contexts/RoleContext';

// ── Types ────────────────────────────────────────────────

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  roles: UserRole[];
  dividerAfter?: boolean;
  requiresAdmin?: boolean; // EvidLY platform admin only (not a customer role)
}

// ── Role shorthands ──────────────────────────────────────
// Mapping from spec roles to existing UserRole values:
//   owner/operator → 'management'
//   executive → 'executive'
//   kitchen_manager → 'kitchen_manager'
//   kitchen_staff → 'kitchen'
//   facilities_manager → 'facilities'

const ALL: UserRole[] = ['executive', 'management', 'kitchen_manager', 'kitchen', 'facilities'];
const MGMT: UserRole[] = ['management'];
const MGMT_EXEC: UserRole[] = ['management', 'executive'];
const OPS: UserRole[] = ['management', 'kitchen_manager'];
const OPS_FAC: UserRole[] = ['management', 'kitchen_manager', 'facilities'];

// ── Master Nav Items (flat, ordered, with dividerAfter) ──

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  // ── PRIMARY ──
  { id: 'dashboard',           label: 'Dashboard',           icon: LayoutDashboard,  route: '/dashboard',             roles: ['executive', 'management', 'kitchen_manager', 'facilities'] },
  { id: 'my-tasks',            label: 'My Tasks',            icon: ClipboardCheck,   route: '/dashboard',             roles: ['kitchen'], dividerAfter: true },

  // ── DAILY OPERATIONS ──
  { id: 'checklists',          label: 'Checklists',          icon: ClipboardCheck,   route: '/checklists',            roles: ['management', 'kitchen_manager', 'kitchen'] },
  { id: 'fire-safety',         label: 'Fire Safety',         icon: Flame,            route: '/fire-safety',           roles: ALL },
  { id: 'temperatures',        label: 'Temperatures',        icon: Thermometer,      route: '/temp-logs',             roles: OPS },
  { id: 'log-temp',            label: 'Log Temp',            icon: Thermometer,      route: '/temp-logs',             roles: ['kitchen'] },
  { id: 'qr-scan',             label: 'QR Scan',             icon: QrCode,           route: '/temp-logs/scan',        roles: ALL },
  { id: 'iot-monitoring',      label: 'IoT Monitoring',      icon: Radio,            route: '/iot-monitoring',        roles: ['executive', 'management', 'facilities', 'kitchen_manager'] },
  { id: 'calendar',            label: 'Calendar',            icon: Calendar,         route: '/calendar',              roles: OPS },
  { id: 'incidents',           label: 'Incidents',           icon: AlertTriangle,    route: '/playbooks',             roles: OPS_FAC },
  { id: 'incident-reporting',  label: 'Incident Reporting',  icon: AlertTriangle,    route: '/incidents',             roles: OPS_FAC },
  { id: 'incident-playbook',   label: 'Incident Playbook',   icon: BookOpen,         route: '/playbooks',             roles: OPS_FAC },
  { id: 'report-issue',        label: 'Report Issue',        icon: AlertTriangle,    route: '/playbooks',             roles: ['kitchen'], dividerAfter: true },

  // ── DOCUMENTS & EQUIPMENT ──
  { id: 'documents',           label: 'Documents',           icon: FileText,         route: '/documents',             roles: ['management', 'kitchen_manager', 'facilities'] },
  { id: 'equipment',           label: 'Equipment',           icon: Cog,              route: '/equipment',             roles: ['executive', 'management', 'kitchen_manager', 'facilities'] },
  { id: 'vendors',             label: 'Vendors',             icon: ShoppingBag,      route: '/vendors',               roles: ['management', 'kitchen_manager', 'facilities'] },
  { id: 'haccp',               label: 'HACCP',               icon: Shield,           route: '/haccp',                 roles: OPS, dividerAfter: true },

  // ── PHOTOS ──
  { id: 'photos',              label: 'Photos',              icon: Camera,           route: '/photo-evidence',        roles: ['management', 'kitchen'], dividerAfter: true },

  // ── INSIGHTS & COMPLIANCE ──
  { id: 'compliance',          label: 'Compliance Score',    icon: Scale,            route: '/scoring-breakdown',     roles: MGMT_EXEC },
  { id: 'self-inspection',     label: 'Self-Inspection',     icon: ClipboardCheck,   route: '/self-inspection',       roles: MGMT },
  { id: 'inspector',           label: 'Inspector View',      icon: Eye,              route: '/inspector-view',        roles: MGMT },
  { id: 'ai-copilot',          label: 'AI Copilot',          icon: Brain,            route: '/copilot',               roles: OPS },
  { id: 'regulatory',          label: 'Regulatory Updates',  icon: Newspaper,        route: '/regulatory-alerts',     roles: [...OPS, 'executive'] },
  { id: 'reporting',           label: 'Reporting',           icon: BarChart3,        route: '/reports',               roles: [...MGMT_EXEC] },
  { id: 'alerts',              label: 'Alerts',              icon: Bell,             route: '/analysis',              roles: ['management', 'facilities'], dividerAfter: true },

  // ── ENTERPRISE & STRATEGIC ──
  { id: 'locations',           label: 'Locations',           icon: MapPin,           route: '/org-hierarchy',         roles: ['executive', 'management'] },
  { id: 'benchmarks',          label: 'Benchmarks',          icon: BarChart3,        route: '/benchmarks',            roles: MGMT_EXEC },
  { id: 'risk-score',          label: 'Risk Score',          icon: Shield,           route: '/insurance-risk',        roles: MGMT_EXEC },
  { id: 'leaderboard',         label: 'Leaderboard',         icon: Trophy,           route: '/leaderboard',           roles: MGMT_EXEC },
  { id: 'marketplace',         label: 'Marketplace',         icon: Store,            route: '/marketplace',           roles: MGMT, dividerAfter: true },

  // ── TEAM & ADMIN ──
  { id: 'team',                label: 'Team',                icon: Users,            route: '/team',                  roles: ['management', 'executive', 'kitchen_manager'] },
  { id: 'training',            label: 'Training',            icon: GraduationCap,    route: '/training',              roles: ALL },
  { id: 'system-admin',        label: 'System Admin',        icon: Cog,              route: '/admin/onboard-client',  roles: MGMT },
  { id: 'settings',            label: 'Settings',            icon: Settings,         route: '/settings',              roles: ['management', 'executive', 'kitchen_manager', 'facilities'] },
  { id: 'help',                label: 'Help & Support',      icon: HelpCircle,       route: '/help',                  roles: ALL },

  // ── EVIDLY ADMIN ONLY (not customer-facing) ──
  { id: 'usage-analytics',     label: 'Usage Analytics',     icon: BarChart3,        route: '/admin/usage-analytics', roles: MGMT, requiresAdmin: true },
];

// ── Filtered nav items for a role ────────────────────────

export function getNavItemsForRole(role: UserRole, isEvidlyAdmin: boolean = false): SidebarNavItem[] {
  return SIDEBAR_NAV_ITEMS.filter(item => {
    if (item.requiresAdmin && !isEvidlyAdmin) return false;
    return item.roles.includes(role);
  });
}

// ── Test mode detection ──────────────────────────────────

export function checkTestMode(): boolean {
  if (typeof window === 'undefined') return false;
  if ((window as any).__EVIDLY_TEST_MODE__) return true;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('testMode') === 'true';
  } catch {
    return false;
  }
}

// ── Roles that see the bottom Locations section ──────────

export const LOCATION_VISIBLE_ROLES: UserRole[] = ['management', 'executive'];

// ── Roles that can book meetings / see Calendly CTAs ─────

export const BOOKING_ROLES: UserRole[] = ['executive', 'management', 'facilities'];

export function canBookMeeting(role: UserRole): boolean {
  return BOOKING_ROLES.includes(role);
}

// ── Demo role definitions with descriptions ──────────────

export interface DemoRoleDefinition {
  role: UserRole;
  label: string;
  description: string;
  i18nKey: string;
}

// ── Sidebar sections for collapsible groups ─────────────

export interface SidebarSection {
  id: string;
  label: string;
  itemIds: string[];
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'operations',
    label: 'Operations',
    itemIds: ['temperatures', 'log-temp', 'qr-scan', 'iot-monitoring', 'checklists', 'fire-safety', 'incidents', 'incident-reporting', 'incident-playbook', 'report-issue'],
  },
  {
    id: 'documents',
    label: 'Documents & Assets',
    itemIds: ['equipment', 'training', 'haccp', 'documents', 'vendors', 'photos'],
  },
  {
    id: 'compliance',
    label: 'Compliance & Insights',
    itemIds: ['alerts', 'reporting', 'compliance', 'ai-copilot', 'self-inspection', 'inspector', 'regulatory'],
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    itemIds: ['locations', 'benchmarks', 'risk-score', 'leaderboard', 'marketplace'],
  },
  {
    id: 'admin',
    label: 'Admin',
    itemIds: ['team', 'system-admin', 'settings', 'help', 'usage-analytics'],
  },
];

/** Items that are always visible at top, never grouped into sections */
export const UNGROUPED_IDS = ['dashboard', 'my-tasks', 'calendar'];

export const DEMO_ROLES: DemoRoleDefinition[] = [
  {
    role: 'management',
    label: 'Owner / Operator',
    description: 'Full access to all locations, settings, and compliance tools',
    i18nKey: 'topBar.ownerOperator',
  },
  {
    role: 'executive',
    label: 'Executive View',
    description: 'Org-wide analytics, benchmarks, and strategic reports',
    i18nKey: 'topBar.executiveView',
  },
  {
    role: 'facilities',
    label: 'Facilities Manager',
    description: 'Equipment, vendors, fire safety, and maintenance alerts',
    i18nKey: 'topBar.facilitiesManager',
  },
  {
    role: 'kitchen_manager',
    label: 'Kitchen Manager',
    description: 'Daily operations, checklists, team management',
    i18nKey: 'topBar.kitchenManager',
  },
  {
    role: 'kitchen',
    label: 'Kitchen Staff',
    description: 'Task-focused: checklists, temp logs, and issue reporting',
    i18nKey: 'topBar.kitchenStaff',
  },
];
