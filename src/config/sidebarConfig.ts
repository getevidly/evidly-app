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
const OPS_STAFF: UserRole[] = ['management', 'kitchen_manager', 'kitchen'];
const FAC_OPS: UserRole[] = ['management', 'kitchen_manager', 'facilities'];

// ── Master Nav Items (flat, ordered, with dividerAfter) ──

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  // ── PRIMARY ──
  { id: 'dashboard',      label: 'Dashboard',          icon: LayoutDashboard,  route: '/dashboard',          roles: ['executive', 'management', 'kitchen_manager', 'facilities'] },
  { id: 'my-tasks',       label: 'My Tasks',           icon: ClipboardCheck,   route: '/dashboard',          roles: ['kitchen'], dividerAfter: true },

  // ── DAILY OPERATIONS (Food Safety) ──
  { id: 'checklists',     label: 'Checklists',         icon: ClipboardCheck,   route: '/checklists',         roles: OPS_STAFF },
  { id: 'temperatures',   label: 'Temperatures',       icon: Thermometer,      route: '/temp-logs',          roles: OPS },
  { id: 'log-temp',       label: 'Log Temp',           icon: Thermometer,      route: '/temp-logs',          roles: ['kitchen'] },
  { id: 'calendar',       label: 'Calendar',           icon: Calendar,         route: '/calendar',           roles: OPS },
  { id: 'incidents',      label: 'Incidents',          icon: AlertTriangle,    route: '/playbooks',          roles: [...OPS, 'facilities'] },
  { id: 'report-issue',   label: 'Report Issue',       icon: AlertTriangle,    route: '/playbooks',          roles: ['kitchen'], dividerAfter: true },

  // ── DOCUMENTS & EQUIPMENT ──
  { id: 'documents',      label: 'Documents',          icon: FileText,         route: '/documents',          roles: FAC_OPS },
  { id: 'equipment',      label: 'Equipment',          icon: Wrench,           route: '/equipment',          roles: FAC_OPS },
  { id: 'vendors',        label: 'Vendors',            icon: ShoppingBag,      route: '/vendors',            roles: FAC_OPS },
  { id: 'haccp',          label: 'HACCP',              icon: Shield,           route: '/haccp',              roles: OPS, dividerAfter: true },

  // ── PHOTOS ──
  { id: 'photos',         label: 'Photos',             icon: Camera,           route: '/photo-evidence',     roles: ['management', 'kitchen'], dividerAfter: true },

  // ── INSIGHTS & COMPLIANCE ──
  { id: 'compliance',     label: 'Compliance',         icon: Scale,            route: '/scoring-breakdown',  roles: ['management', 'executive', 'kitchen_manager'] },
  { id: 'self-audit',     label: 'Self-Audit',         icon: ClipboardCheck,   route: '/self-audit',         roles: MGMT },
  { id: 'inspector',      label: 'Inspector View',     icon: Eye,              route: '/inspector-view',     roles: MGMT },
  { id: 'ai-copilot',     label: 'AI Copilot',         icon: Brain,            route: '/copilot',            roles: OPS },
  { id: 'regulatory',     label: 'Regulatory Updates', icon: Newspaper,        route: '/regulatory-alerts',  roles: MGMT },
  { id: 'reports',        label: 'Reports',            icon: BarChart3,        route: '/health-dept-report', roles: MGMT_EXEC },
  { id: 'alerts',         label: 'Alerts',             icon: Bell,             route: '/analysis',           roles: ['management', 'facilities'], dividerAfter: true },

  // ── ENTERPRISE & STRATEGIC ──
  { id: 'locations',      label: 'Locations',          icon: MapPin,           route: '/org-hierarchy',      roles: ['executive'] },
  { id: 'benchmarks',     label: 'Benchmarks',         icon: BarChart3,        route: '/benchmarks',         roles: MGMT_EXEC },
  { id: 'risk-score',     label: 'Risk Score',         icon: Shield,           route: '/insurance-risk',     roles: MGMT_EXEC },
  { id: 'leaderboard',    label: 'Leaderboard',        icon: Trophy,           route: '/leaderboard',        roles: MGMT_EXEC },
  { id: 'marketplace',    label: 'Marketplace',        icon: Store,            route: '/marketplace',        roles: MGMT_EXEC, dividerAfter: true },

  // ── TEAM & ADMIN ──
  { id: 'team',           label: 'Team',               icon: Users,            route: '/team',               roles: ['management', 'executive', 'kitchen_manager'] },
  { id: 'onboarding',     label: 'Onboarding',         icon: GraduationCap,    route: '/training',           roles: MGMT },
  { id: 'settings',       label: 'Settings',           icon: Settings,         route: '/settings',           roles: ['management', 'executive', 'kitchen_manager', 'facilities'] },
  { id: 'help',           label: 'Help',               icon: HelpCircle,       route: '/help',               roles: ALL },
];

// ── Filtered nav items for a role ────────────────────────

export function getNavItemsForRole(role: UserRole): SidebarNavItem[] {
  return SIDEBAR_NAV_ITEMS.filter(item => item.roles.includes(role));
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

// ── Demo role definitions with descriptions ──────────────

export interface DemoRoleDefinition {
  role: UserRole;
  label: string;
  description: string;
  i18nKey: string;
}

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
    role: 'kitchen_manager',
    label: 'Kitchen Manager',
    description: 'Daily operations, checklists, team management, and compliance',
    i18nKey: 'topBar.kitchenManager',
  },
  {
    role: 'kitchen',
    label: 'Kitchen Staff',
    description: 'Task-focused: checklists, temp logs, and issue reporting',
    i18nKey: 'topBar.kitchenStaff',
  },
  {
    role: 'facilities',
    label: 'Facilities Manager',
    description: 'Equipment, vendors, fire safety, and maintenance alerts',
    i18nKey: 'topBar.facilitiesManager',
  },
];
