import {
  LayoutDashboard,
  CheckSquare,
  Thermometer,
  ClipboardList,
  FileText,
  Cog,
  Camera,
  Siren,
  Truck,
  ShoppingBag,
  ShieldCheck,
  ClipboardCheck,
  Building2,
  BarChart3,
  ShieldAlert,
  Scale,
  TrendingUp,
  Bot,
  GraduationCap,
  Network,
  Trophy,
  Users,
  Settings,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '../contexts/RoleContext';

// ── Types ────────────────────────────────────────────────

export interface SidebarNavItem {
  id: string;
  label: string;
  i18nKey: string;
  icon: LucideIcon;
  route: string;
  roles: UserRole[];
  /** Logical group number — dividers render between consecutive items with different groups */
  group: number;
  badge?: number;
  featureId?: string;
  /** Per-role label overrides (fallback when i18n key not found) */
  roleLabels?: Partial<Record<UserRole, string>>;
  roleI18nKeys?: Partial<Record<UserRole, string>>;
}

// ── Role shorthands ──────────────────────────────────────

const ALL: UserRole[] = ['executive', 'management', 'kitchen_manager', 'kitchen', 'facilities'];

// ── Groups ───────────────────────────────────────────────
// 1: Entry  2: Daily Ops  3: Vendors  4: Analytics/Reports
// 5: Monitoring  6: AI & Training  7: Organization  8: Settings

// ── Master Nav Items (flat, ordered) ─────────────────────

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  // ── Group 1: Entry ──
  {
    id: 'dashboard',
    label: 'Dashboard',
    i18nKey: 'nav.dashboard',
    icon: LayoutDashboard,
    route: '/dashboard',
    roles: ALL,
    group: 1,
    roleLabels: { kitchen: 'My Tasks' },
    roleI18nKeys: { kitchen: 'nav.myTasks' },
  },

  // ── Group 2: Daily Operations ──
  {
    id: 'checklists',
    label: 'Checklists',
    i18nKey: 'nav.dailyChecklists',
    icon: CheckSquare,
    route: '/checklists',
    roles: ['management', 'kitchen_manager', 'kitchen'],
    group: 2,
  },
  {
    id: 'temperatures',
    label: 'Temperatures',
    i18nKey: 'nav.temperatureLogs',
    icon: Thermometer,
    route: '/temp-logs',
    roles: ['management', 'kitchen_manager', 'kitchen'],
    group: 2,
    roleLabels: { kitchen: 'Log Temp' },
    roleI18nKeys: { kitchen: 'nav.logTemp' },
  },
  {
    id: 'haccp',
    label: 'HACCP',
    i18nKey: 'nav.foodSafety',
    icon: ClipboardList,
    route: '/haccp',
    roles: ['management', 'kitchen_manager'],
    group: 2,
  },
  {
    id: 'documents',
    label: 'Documents',
    i18nKey: 'nav.documents',
    icon: FileText,
    route: '/documents',
    roles: ['management', 'kitchen_manager', 'facilities'],
    group: 2,
  },
  {
    id: 'equipment',
    label: 'Equipment',
    i18nKey: 'nav.equipment',
    icon: Cog,
    route: '/equipment',
    roles: ['management', 'kitchen_manager', 'facilities'],
    group: 2,
  },
  {
    id: 'photos',
    label: 'Photos',
    i18nKey: 'nav.photoEvidence',
    icon: Camera,
    route: '/photo-evidence',
    roles: ['management', 'kitchen'],
    group: 2,
  },
  {
    id: 'incidents',
    label: 'Incidents',
    i18nKey: 'nav.incidentPlaybooks',
    icon: Siren,
    route: '/playbooks',
    roles: ['management', 'kitchen_manager', 'facilities', 'kitchen'],
    group: 2,
    roleLabels: { kitchen: 'Report Issue' },
    roleI18nKeys: { kitchen: 'nav.reportIssue' },
  },

  // ── Group 3: Vendors ──
  {
    id: 'vendors',
    label: 'Vendors',
    i18nKey: 'nav.vendorManagement',
    icon: Truck,
    route: '/vendors',
    roles: ['management', 'kitchen_manager', 'facilities'],
    group: 3,
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    i18nKey: 'nav.vendorPortal',
    icon: ShoppingBag,
    route: '/marketplace',
    roles: ['management', 'executive'],
    group: 3,
  },

  // ── Group 4: Analytics & Reports ──
  {
    id: 'compliance',
    label: 'Compliance',
    i18nKey: 'nav.complianceScore',
    icon: ShieldCheck,
    route: '/scoring-breakdown',
    roles: ['management', 'executive', 'kitchen_manager'],
    group: 4,
  },
  {
    id: 'self-audit',
    label: 'Self-Audit',
    i18nKey: 'nav.selfAudit',
    icon: ClipboardCheck,
    route: '/self-audit',
    roles: ['management'],
    group: 4,
  },
  {
    id: 'inspector-view',
    label: 'Inspector View',
    i18nKey: 'nav.inspectorView',
    icon: ClipboardCheck,
    route: '/inspector-view',
    roles: ['management'],
    group: 4,
  },
  {
    id: 'reports',
    label: 'Reports',
    i18nKey: 'nav.healthDeptReports',
    icon: Building2,
    route: '/health-dept-report',
    roles: ['management', 'executive'],
    group: 4,
  },
  {
    id: 'benchmarks',
    label: 'Benchmarks',
    i18nKey: 'nav.benchmarks',
    icon: BarChart3,
    route: '/benchmarks',
    roles: ['management', 'executive'],
    group: 4,
    featureId: 'industry-benchmarks',
  },
  {
    id: 'risk-score',
    label: 'Risk Score',
    i18nKey: 'nav.insuranceRisk',
    icon: ShieldAlert,
    route: '/insurance-risk',
    roles: ['management', 'executive'],
    group: 4,
    featureId: 'insurance-risk-score',
  },

  // ── Group 5: Monitoring ──
  {
    id: 'regulatory',
    label: 'Regulatory Updates',
    i18nKey: 'nav.regulatoryUpdates',
    icon: Scale,
    route: '/regulatory-alerts',
    roles: ['management'],
    group: 5,
  },
  {
    id: 'alerts',
    label: 'Alerts',
    i18nKey: 'nav.predictiveAlerts',
    icon: TrendingUp,
    route: '/analysis',
    roles: ['management', 'facilities'],
    group: 5,
    badge: 4,
    featureId: 'ai-predictive-insights',
  },

  // ── Group 6: AI & Training ──
  {
    id: 'copilot',
    label: 'AI Copilot',
    i18nKey: 'nav.copilot',
    icon: Bot,
    route: '/copilot',
    roles: ['management', 'kitchen_manager'],
    group: 6,
  },
  {
    id: 'training',
    label: 'Onboarding',
    i18nKey: 'nav.training',
    icon: GraduationCap,
    route: '/training',
    roles: ['management'],
    group: 6,
  },

  // ── Group 7: Organization ──
  {
    id: 'locations',
    label: 'Locations',
    i18nKey: 'nav.locations',
    icon: Network,
    route: '/org-hierarchy',
    roles: ['executive'],
    group: 7,
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    i18nKey: 'nav.leaderboard',
    icon: Trophy,
    route: '/leaderboard',
    roles: ['management', 'executive'],
    group: 7,
  },
  {
    id: 'team',
    label: 'Team',
    i18nKey: 'nav.teams',
    icon: Users,
    route: '/team',
    roles: ['management', 'executive', 'kitchen_manager'],
    group: 7,
  },

  // ── Group 8: Settings ──
  {
    id: 'settings',
    label: 'Settings',
    i18nKey: 'nav.settings',
    icon: Settings,
    route: '/settings',
    roles: ['management', 'executive', 'kitchen_manager', 'facilities'],
    group: 8,
  },
  {
    id: 'help',
    label: 'Help & Support',
    i18nKey: 'nav.helpSupport',
    icon: HelpCircle,
    route: '/help',
    roles: ALL,
    group: 8,
  },
];

// ── Filtered nav items for a role ────────────────────────

export function getNavItemsForRole(role: UserRole): (SidebarNavItem | 'divider')[] {
  const filtered = SIDEBAR_NAV_ITEMS.filter(item => item.roles.includes(role));
  const result: (SidebarNavItem | 'divider')[] = [];
  let lastGroup = -1;

  for (const item of filtered) {
    if (lastGroup !== -1 && item.group !== lastGroup) {
      result.push('divider');
    }
    result.push(item);
    lastGroup = item.group;
  }

  return result;
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
