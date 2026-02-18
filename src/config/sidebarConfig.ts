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
  Cog,
  Flame,
  Radio,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '../contexts/RoleContext';

// ── Types ────────────────────────────────────────────────

export interface SidebarSubItem {
  id: string;
  label: string;
  route: string;
}

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  roles: UserRole[];
  dividerAfter?: boolean;
  requiresAdmin?: boolean;
  subItems?: SidebarSubItem[];
}

// ── Role shorthands ──────────────────────────────────────
// owner/operator → 'management'
// executive → 'executive'
// compliance_manager → 'compliance_manager'
// kitchen_manager → 'kitchen_manager'
// kitchen_staff → 'kitchen'
// facilities_manager → 'facilities'

const ALL: UserRole[] = ['executive', 'management', 'compliance_manager', 'kitchen_manager', 'kitchen', 'facilities'];
const MGMT: UserRole[] = ['management'];
const MGMT_EXEC: UserRole[] = ['management', 'executive'];
const COMPLIANCE: UserRole[] = ['management', 'compliance_manager'];
const OPS: UserRole[] = ['management', 'kitchen_manager'];

// ── Master Nav Items ─────────────────────────────────────
// QR Scan REMOVED (now on bottom bar only)
// Incidents CONSOLIDATED with sub-items (replaces incident-reporting, incident-playbook, report-issue)

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  // ── UNGROUPED (always visible at top) ──
  { id: 'dashboard',           label: 'Dashboard',           icon: LayoutDashboard,  route: '/dashboard',             roles: ['executive', 'management', 'compliance_manager', 'kitchen_manager', 'facilities'] },
  { id: 'my-tasks',            label: 'My Tasks',            icon: ClipboardCheck,   route: '/dashboard',             roles: ['kitchen'], dividerAfter: true },
  { id: 'calendar',            label: 'Calendar',            icon: Calendar,         route: '/calendar',              roles: ALL },

  // ── DAILY OPERATIONS ──
  { id: 'checklists',          label: 'Checklists',          icon: ClipboardCheck,   route: '/checklists',            roles: ['management', 'compliance_manager', 'kitchen_manager', 'kitchen'] },
  { id: 'temperatures',        label: 'Temperatures',        icon: Thermometer,      route: '/temp-logs',             roles: ['management', 'compliance_manager', 'kitchen_manager'] },
  { id: 'log-temp',            label: 'Log Temp',            icon: Thermometer,      route: '/temp-logs',             roles: ['kitchen'] },
  { id: 'iot-monitoring',      label: 'IoT Monitoring',      icon: Radio,            route: '/iot-monitoring',        roles: ['management', 'kitchen_manager'] },
  { id: 'fire-safety',         label: 'Fire Safety',         icon: Flame,            route: '/fire-safety',           roles: ['management', 'compliance_manager', 'facilities'] },
  {
    id: 'incidents',
    label: 'Incidents',
    icon: AlertTriangle,
    route: '/incidents',
    roles: ['management', 'compliance_manager', 'kitchen_manager', 'facilities'],
    subItems: [
      { id: 'incident-report',    label: 'Report',    route: '/incidents' },
      { id: 'incident-playbooks', label: 'Playbooks', route: '/playbooks' },
      { id: 'incident-history',   label: 'History',   route: '/playbooks?tab=analytics' },
    ],
  },

  // ── RECORDS & ASSETS ──
  { id: 'documents',           label: 'Documents',           icon: FileText,         route: '/documents',             roles: ['management', 'compliance_manager', 'kitchen_manager', 'facilities'] },
  { id: 'equipment',           label: 'Equipment',           icon: Cog,              route: '/equipment',             roles: ['management', 'compliance_manager', 'kitchen_manager', 'facilities'] },
  { id: 'haccp',               label: 'HACCP',               icon: Shield,           route: '/haccp',                 roles: ['management', 'compliance_manager', 'kitchen_manager'] },
  { id: 'vendors',             label: 'Vendors',             icon: ShoppingBag,      route: '/vendors',               roles: ['management', 'kitchen_manager', 'facilities'] },
  { id: 'photos',              label: 'Photos',              icon: Camera,           route: '/photo-evidence',        roles: ['management', 'kitchen'] },
  { id: 'training',            label: 'Training',            icon: GraduationCap,    route: '/training',              roles: ['management', 'kitchen_manager', 'kitchen'] },

  // ── COMPLIANCE & INSIGHTS ──
  { id: 'compliance',          label: 'Compliance Score',    icon: Scale,            route: '/scoring-breakdown',     roles: ['management', 'executive', 'compliance_manager'] },
  { id: 'self-inspection',     label: 'Self-Inspection',     icon: ClipboardCheck,   route: '/self-inspection',       roles: COMPLIANCE },
  { id: 'inspector',           label: 'Inspector View',      icon: Eye,              route: '/inspector-view',        roles: COMPLIANCE },
  { id: 'ai-copilot',          label: 'AI Copilot',          icon: Brain,            route: '/copilot',               roles: ['management', 'kitchen_manager'] },
  { id: 'regulatory',          label: 'Regulatory Updates',  icon: Newspaper,        route: '/regulatory-alerts',     roles: ['management', 'executive', 'compliance_manager'] },
  { id: 'reporting',           label: 'Reporting',           icon: BarChart3,        route: '/reports',               roles: ['management', 'executive', 'compliance_manager', 'facilities', 'kitchen_manager'] },
  { id: 'alerts',              label: 'Alerts',              icon: Bell,             route: '/analysis',              roles: ['management', 'compliance_manager', 'facilities'] },

  // ── ENTERPRISE ──
  { id: 'locations',           label: 'Locations',           icon: MapPin,           route: '/org-hierarchy',         roles: MGMT_EXEC },
  { id: 'benchmarks',          label: 'Benchmarks',          icon: BarChart3,        route: '/benchmarks',            roles: MGMT_EXEC },
  { id: 'risk-score',          label: 'Risk Score',          icon: Shield,           route: '/insurance-risk',        roles: MGMT_EXEC },
  { id: 'leaderboard',         label: 'Leaderboard',         icon: Trophy,           route: '/leaderboard',           roles: MGMT_EXEC },
  { id: 'marketplace',         label: 'Marketplace',         icon: Store,            route: '/marketplace',           roles: MGMT },

  // ── ADMIN ──
  { id: 'team',                label: 'Team',                icon: Users,            route: '/team',                  roles: ['management', 'executive', 'kitchen_manager'] },
  { id: 'system-admin',        label: 'System Admin',        icon: Cog,              route: '/admin/onboard-client',  roles: MGMT },
  { id: 'settings',            label: 'Settings',            icon: Settings,         route: '/settings',              roles: ['management', 'executive', 'compliance_manager', 'kitchen_manager', 'facilities'] },
  { id: 'help',                label: 'Help & Support',      icon: HelpCircle,       route: '/help',                  roles: ALL },

  // ── EVIDLY ADMIN ONLY ──
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

export const LOCATION_VISIBLE_ROLES: UserRole[] = ['management', 'executive', 'compliance_manager', 'kitchen_manager', 'kitchen'];

// ── Roles that can book meetings / see Calendly CTAs ─────

export const BOOKING_ROLES: UserRole[] = ['executive', 'management', 'compliance_manager', 'facilities'];

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
    label: 'Daily Operations',
    itemIds: ['checklists', 'temperatures', 'log-temp', 'iot-monitoring', 'fire-safety', 'incidents'],
  },
  {
    id: 'records',
    label: 'Records & Assets',
    itemIds: ['documents', 'equipment', 'haccp', 'vendors', 'photos', 'training'],
  },
  {
    id: 'compliance',
    label: 'Compliance & Insights',
    itemIds: ['compliance', 'self-inspection', 'inspector', 'ai-copilot', 'regulatory', 'reporting', 'alerts'],
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
    role: 'compliance_manager',
    label: 'Compliance Manager',
    description: 'Food safety scoring, self-inspections, regulatory tracking',
    i18nKey: 'topBar.complianceManager',
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
