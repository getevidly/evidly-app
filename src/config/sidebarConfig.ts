import type { UserRole } from '../contexts/RoleContext';

// ── Types ────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  iconColor?: string;
  roles: string[];
  description: string;
  badge?: string;
}

export interface SidebarSection {
  id: string;
  label: string;
  icon: string;
  roles: string[];
  tooltipTitle: string;
  tooltipDescription: string;
  items: NavItem[];
  path?: string;
}

export interface RoleHomeItem {
  label: string;
  labelEs: string;
  path: string;
  icon: string;
  description: string;
  descriptionEs: string;
}

export interface RoleSidebarConfig {
  home: RoleHomeItem;
  topLevelItems?: NavItem[];
  sections: SidebarSection[];
}

// ══════════════════════════════════════════════════════════
// CENTRALIZED NAV ITEM REGISTRY
// Every nav item defined once. Visibility is determined by
// ROLE_SECTIONS + ROLE_ITEM_HIDES below, not per-item roles.
// ══════════════════════════════════════════════════════════

const I: Record<string, NavItem> = {

  // ── Top-level items (outside sections) ──────────────────

  dashboard: {
    id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', iconColor: '#5B7CFA',
    roles: [], description: 'Your compliance overview — scores, open items, alerts, and priorities.',
  },
  calendar: {
    id: 'calendar', label: 'Calendar', path: '/calendar', icon: 'Calendar', iconColor: '#c2731a',
    roles: [], description: 'Inspections, permit renewals, service appointments, and compliance deadlines in one view.',
  },
  documents: {
    id: 'documents', label: 'Documents', path: '/documents', icon: 'FileText', iconColor: '#D85A30',
    roles: [], description: 'Compliance certificates, inspection reports, permits, and signed documentation — organized and searchable.',
  },
  policies: {
    id: 'policies', label: 'Policies', path: '/policies', icon: 'BookOpen', iconColor: '#185FA5',
    roles: [], description: 'Standardized food and fire safety policies — adopt, customize, and activate.',
  },
  kitchenToCommunity: {
    id: 'kitchenToCommunity', label: 'Kitchen to Community', path: '/kitchen-to-community', icon: 'Heart', iconColor: '#b3261e',
    roles: [], description: 'Cross-org participation and referral program — Kitchen to Community.',
  },

  // ── Food Safety section items ───────────────────────────

  'fs-temp': {
    id: 'fs-temp', label: 'Temperatures', path: '/temp-logs', icon: 'Thermometer', iconColor: '#185FA5',
    roles: [], description: 'Record temperatures manually, via QR Code scan, or from IoT sensors — storage, receiving, and cooking.',
  },
  'fs-checklists': {
    id: 'fs-checklists', label: 'Checklists', path: '/checklists', icon: 'CheckSquare', iconColor: '#2f7a4d',
    roles: [], description: 'Opening, closing, food safety, and custom daily task lists with completion tracking.',
  },
  'fs-haccp': {
    id: 'fs-haccp', label: 'HACCP', path: '/haccp', icon: 'Target', iconColor: '#c2731a',
    roles: [], description: 'Monitor critical control points, hazard analysis, and HACCP plan compliance.',
  },
  'fs-incidents': {
    id: 'fs-incidents', label: 'Incidents', path: '/incidents?pillar=food', icon: '⚠️',
    roles: [], description: 'Log and track food safety incidents with timestamped, immutable records.',
  },
  'fs-corrective': {
    id: 'fs-corrective', label: 'Corrective Actions', path: '/corrective-actions?pillar=food', icon: '🔧',
    roles: [], description: 'Track and resolve food safety violations with documented corrective action plans.',
  },
  'fs-self': {
    id: 'fs-self', label: 'Self-Inspection', path: '/self-inspection?pillar=food', icon: '🔍',
    roles: [], description: 'Run a self-inspection using the same criteria your health department applies.',
  },

  // ── Operations section items ───────────────────────────

  'op-self': {
    id: 'op-self', label: 'Self-Inspection', path: '/self-inspection', icon: 'Search', iconColor: '#534AB7',
    roles: [], description: 'Run a self-inspection using the same criteria your health department applies.',
  },
  'op-incidents': {
    id: 'op-incidents', label: 'Incidents', path: '/incidents', icon: 'AlertTriangle', iconColor: '#b3261e',
    roles: [], description: 'Log and track incidents with timestamped, immutable records.',
  },
  'op-deficiencies': {
    id: 'op-deficiencies', label: 'Deficiencies', path: '/deficiencies', icon: 'AlertCircle', iconColor: '#b3261e',
    roles: [], description: 'Track compliance code violations found during service visits — severity, status, and remediation.',
  },
  'op-corrective': {
    id: 'op-corrective', label: 'Corrective Actions', path: '/corrective-actions', icon: 'Wrench', iconColor: '#c2731a',
    roles: [], description: 'Track and resolve violations with documented corrective action plans.',
  },
  'op-current-shift': {
    id: 'op-current-shift', label: 'Current', path: '/current-shift', icon: 'TrendingUp', iconColor: '#2f7a4d',
    roles: [], description: 'Live mid-shift snapshot — task progress, temperatures, incidents, and PRP outlook.',
  },
  'op-shift': {
    id: 'op-shift', label: 'Handoff', path: '/shift-handoff', icon: 'Handshake', iconColor: '#c2731a',
    roles: [], description: 'End-of-shift handoff — stats, notes, and auto-send to next team.',
  },

  // ── Fire Safety section items ───────────────────────────

  'fr-kec': {
    id: 'fr-kec', label: 'Kitchen Exhaust Cleaning', path: '/fire-safety/kec', icon: 'Fan', iconColor: '#D85A30',
    roles: [], description: 'NFPA 96 hood and duct cleaning, filter exchange, fan performance, and rooftop grease containment.',
  },
  'fr-fpm': {
    id: 'fr-fpm', label: 'Fan Performance', path: '/fire-safety/kec/fpm', icon: 'Fan', iconColor: '#D85A30',
    roles: [], description: 'Exhaust fan preventive maintenance — belt service, bearing lubrication, airflow verification.',
  },
  'fr-rgc': {
    id: 'fr-rgc', label: 'Rooftop Grease', path: '/fire-safety/kec/rgc', icon: 'Droplet', iconColor: '#D85A30',
    roles: [], description: 'Rooftop grease containment — CWA wastewater compliance and roof protection.',
  },
  'fr-gfx': {
    id: 'fr-gfx', label: 'Filter Exchange', path: '/fire-safety/kec/gfx', icon: 'Filter', iconColor: '#D85A30',
    roles: [], description: 'Grease filter exchange — off-site cleaned baffle filter swap program.',
  },
  'fr-protection': {
    id: 'fr-protection', label: 'Fire Protection', path: '/fire-safety/protection', icon: 'Flame', iconColor: '#D85A30',
    roles: [], description: 'Fire suppression, alarm, sprinkler, and extinguisher inspection and certification status.',
  },
  'fr-incidents': {
    id: 'fr-incidents', label: 'Incidents', path: '/incidents?pillar=fire', icon: '⚠️',
    roles: [], description: 'Log and track fire safety incidents with timestamped, immutable records.',
  },
  'fr-corrective': {
    id: 'fr-corrective', label: 'Corrective Actions', path: '/corrective-actions?pillar=fire', icon: '🔧',
    roles: [], description: 'Track and resolve fire safety violations with documented corrective action plans.',
  },
  'fr-deficiencies': {
    id: 'fr-deficiencies', label: 'Deficiencies', path: '/deficiencies?pillar=fire', icon: '⚠️',
    roles: [], description: 'Track compliance code violations found during service visits — severity, status, and remediation.',
  },

  // ── Programs section items (org-conditional) ────────────

  'pg-sb1383': {
    id: 'pg-sb1383', label: 'SB 1383', path: '/sb1383', icon: '♻️',
    roles: [], description: 'SB 1383 organic waste diversion and edible food recovery — two tabs, one law.',
  },
  'pg-k12': {
    id: 'pg-k12', label: 'K-12 Compliance', path: '/k12', icon: '🎓',
    roles: [], description: 'Audit readiness dashboard — USDA + County EH dual authority, meal metrics, NSLP claims.',
  },
  'pg-usda': {
    id: 'pg-usda', label: 'USDA Production', path: '/usda/production-records', icon: '📊',
    roles: [], description: 'USDA Child Nutrition Program meal production records and CN label tracking.',
  },

  // ── Jurisdiction section items ──────────────────────────

  'ju-intel': {
    id: 'ju-intel', label: 'Jurisdiction Intelligence', path: '/jurisdiction-intelligence', icon: '🧠',
    roles: [], description: 'Your applicable food and fire safety authorities, inspection requirements, and recent regulatory changes.',
  },
  'ju-regulatory': {
    id: 'ju-regulatory', label: 'Regulatory Updates', path: '/regulatory-alerts', icon: '🔔',
    roles: [], description: 'Track upcoming inspections, permit renewals, certificate expirations, and regulatory deadlines.',
  },
  'ju-signals': {
    id: 'ju-signals', label: 'Jurisdiction Signals', path: '/insights/signals', icon: '📡',
    roles: [], description: 'Real-time regulatory signals for your county from 80+ sources.',
  },

  // ── Vendors section items ───────────────────────────────

  've-network': {
    id: 've-network', label: 'Vendor Network', path: '/vendor-network', icon: 'Users', iconColor: '#0F6E56',
    roles: [], description: 'EvidLY\'s vetted ecosystem of approved vendors — connect, manage, and track service providers.',
  },
  've-services': {
    id: 've-services', label: 'Vendor Services', path: '/vendors', icon: 'Wrench', iconColor: '#c2731a',
    roles: [], description: 'Log and track vendor-provided service records — hood cleaning, HVAC, pest control, and fire suppression.',
  },
  've-threads': {
    id: 've-threads', label: 'Service Threads', path: '/vendors/threads', icon: 'MessageCircle', iconColor: '#185FA5',
    roles: [], description: 'Track vendor communication and scheduling for your service requests.',
  },

  // ── Insights section items ──────────────────────────────

  'in-ai': {
    id: 'in-ai', label: 'AI Insights', path: '/ai-advisor', icon: '✨',
    roles: [], description: 'Food Safety Advisor and Fire Safety Advisor — ask questions, get recommendations, and analyze trends.',
  },
  'in-forecast': {
    id: 'in-forecast', label: 'Inspection Forecast', path: '/insights/inspection-forecast', icon: '🎯',
    roles: [], description: 'Predict your next inspection window based on county patterns and historical frequency.',
  },
  'in-trends': {
    id: 'in-trends', label: 'Compliance Trends', path: '/compliance-trends', icon: '📈',
    roles: [], description: '30/60/90-day compliance score trajectories with per-category breakdown across locations.',
  },
  'in-bench': {
    id: 'in-bench', label: 'Benchmarks', path: '/benchmarks', icon: '🏆',
    roles: [], description: 'Compare your compliance performance against industry benchmarks and your own historical baseline.',
  },
  'in-leader': {
    id: 'in-leader', label: 'Team Leaderboard', path: '/insights/leaderboard', icon: '🏅',
    roles: [], description: 'Staff ranked by compliance task performance — checklists, temp logs, and corrective actions.',
  },
  'in-reports': {
    id: 'in-reports', label: 'Reporting', path: '/reports', icon: '📊',
    roles: [], description: 'Export compliance summaries, inspection history, and documentation packages for auditors or clients.',
  },
  'in-audit': {
    id: 'in-audit', label: 'Audit Log', path: '/audit-trail', icon: '🔒',
    roles: [], description: 'Immutable timestamped record of every action taken in EvidLY — required for regulatory documentation.',
  },

  // ── Tools section items ─────────────────────────────────

  'to-inspector': {
    id: 'to-inspector', label: 'Inspector Arrival', path: '/inspector-view', icon: '🏛️',
    roles: [], description: 'Instant access mode when an inspector arrives — documents, recent logs, and compliance status.',
  },
  'to-diagnosis': {
    id: 'to-diagnosis', label: 'Self-Diagnosis', path: '/self-diagnosis', icon: '🔧',
    roles: [], description: 'Troubleshoot equipment issues, get resolution steps, attach photo + video, and notify your vendor.',
  },

  // ── Administration section items ────────────────────────

  'ad-locations': {
    id: 'ad-locations', label: 'Locations', path: '/org-hierarchy', icon: 'MapPin', iconColor: '#5B7CFA',
    roles: [], description: 'Add, edit, or configure locations including jurisdiction mapping and compliance requirements.',
  },
  'ad-team': {
    id: 'ad-team', label: 'Team', path: '/team', icon: 'Users', iconColor: '#0F6E56',
    roles: [], description: 'Manage staff roles, access levels, and location assignments across your organization.',
  },
  'ad-roles': {
    id: 'ad-roles', label: 'Role Permissions', path: '/settings/roles-permissions', icon: 'ShieldCheck', iconColor: '#534AB7',
    roles: [], description: 'Manage role-based permissions and user exceptions across your organization.',
  },
  'ad-vendors': {
    id: 'ad-vendors', label: 'Vendors', path: '/vendors?tab=vendors', icon: 'Store', iconColor: '#c2731a',
    roles: [], description: 'Your vendor roster — hood cleaning, pest control, grease collection, and every vendor who touches your operation.',
  },
  'ad-equipment': {
    id: 'ad-equipment', label: 'Equipment', path: '/equipment', icon: 'Wrench', iconColor: '#993C1D',
    roles: [], description: 'Asset register for all kitchen equipment with service history, maintenance dates, and warranty tracking.',
  },
  'ad-import': {
    id: 'ad-import', label: 'Import Data', path: '/import', icon: 'Upload', iconColor: '#2f7a4d',
    roles: [], description: 'Import temperature logs and compliance data from Zenput, Squadle, ComplianceMate, or CSV exports.',
  },
  'ad-integrations': {
    id: 'ad-integrations', label: 'Integrations', path: '/integrations', icon: 'Plug', iconColor: '#185FA5',
    roles: [], description: 'Connect EvidLY with POS, accounting, HR, IoT, insurance, and 25+ other platforms.',
  },
  'ad-billing': {
    id: 'ad-billing', label: 'Billing', path: '/settings/billing', icon: 'CreditCard', iconColor: '#A08C5A',
    roles: [], description: 'Manage your subscription plan, view invoices, and update payment details.',
  },
  'ad-settings': {
    id: 'ad-settings', label: 'Settings', path: '/settings', icon: 'Settings', iconColor: '#5F5E5A',
    roles: [], description: 'Account preferences, notification settings, language, and platform configuration.',
  },
};

// ══════════════════════════════════════════════════════════
// SECTION DEFINITIONS
// ══════════════════════════════════════════════════════════

interface SectionDef {
  id: string;
  label: string;
  icon: string;
  tooltipTitle: string;
  tooltipDescription: string;
  itemIds: string[];
  path?: string;
}

const SECTION_DEFS: Record<string, SectionDef> = {
  shiftIntelligence: {
    id: 'shift-intelligence', label: 'Shift Intelligence', icon: '🕒',
    tooltipTitle: 'Shift Intelligence',
    tooltipDescription: 'Live mid-shift snapshot and end-of-shift handoff with auto-summary.',
    itemIds: ['op-current-shift', 'op-shift'],
  },
  operations: {
    id: 'operations', label: 'Operations', icon: '📋',
    tooltipTitle: 'Operations',
    tooltipDescription: 'Incidents, corrective actions, self-inspections, and deficiencies across all pillars.',
    itemIds: ['op-incidents', 'op-corrective', 'op-self', 'op-deficiencies'],
  },
  foodSafety: {
    id: 'food-safety', label: 'Food Safety', icon: '🍽️',
    tooltipTitle: 'Food Safety',
    tooltipDescription: 'Checklists, temperature monitoring, and HACCP plans.',
    itemIds: ['fs-temp', 'fs-checklists', 'fs-haccp'],
    path: '/food-safety',
  },
  fireSafety: {
    id: 'fire-safety', label: 'Fire Safety', icon: '🔥',
    tooltipTitle: 'Fire Safety',
    tooltipDescription: 'Kitchen exhaust cleaning and fire protection systems.',
    itemIds: ['fr-kec', 'fr-protection'],
    path: '/fire-safety',
  },
  programs: {
    id: 'programs', label: 'Programs', icon: '♻️',
    tooltipTitle: 'Programs',
    tooltipDescription: 'SB 1383 organic waste and food recovery, K-12 compliance, and USDA production records.',
    itemIds: ['pg-sb1383', 'pg-k12', 'pg-usda'],
  },
  jurisdiction: {
    id: 'jurisdiction', label: 'Jurisdiction', icon: '🧠',
    tooltipTitle: 'Jurisdiction',
    tooltipDescription: 'Your applicable authorities, regulatory updates, and jurisdiction signals.',
    itemIds: ['ju-intel', 'ju-regulatory', 'ju-signals'],
  },
  vendors: {
    id: 'vendors', label: 'Vendors', icon: '👥',
    tooltipTitle: 'Vendors',
    tooltipDescription: 'Vendor network, service records, and performance tracking.',
    itemIds: ['ve-services', 've-threads', 've-network'],
  },
  insights: {
    id: 'insights', label: 'Insights', icon: '✨',
    tooltipTitle: 'Insights',
    tooltipDescription: 'Food Safety Advisor, Fire Safety Advisor, inspection forecast, trends, benchmarks, leaderboard, reporting, audit log, and IoT.',
    // POST-LAUNCH: 'in-reports' removed — backend not built (report_runs absent, no generation engine). Restore when wired.
    itemIds: ['in-ai', 'in-forecast', 'in-trends', 'in-bench', 'in-leader', 'in-audit'],
    path: '/insights',
  },
  tools: {
    id: 'tools', label: 'Tools', icon: '🔧',
    tooltipTitle: 'Tools',
    tooltipDescription: 'Inspector arrival mode and self-diagnosis.',
    itemIds: ['to-inspector', 'to-diagnosis'],
    path: '/tools',
  },
  admin: {
    id: 'administration', label: 'Administration', icon: '⚙️',
    tooltipTitle: 'Administration',
    tooltipDescription: 'Equipment, locations, team, role permissions, IoT sensors, integrations, import, and settings.',
    itemIds: ['ad-locations', 'ad-team', 'ad-roles', 'ad-vendors', 'ad-equipment', 'ad-import', 'ad-integrations', 'ad-billing', 'ad-settings'],
    path: '/admin',
  },
};

/** Section render order */
const SECTION_ORDER = [
  'shiftIntelligence', 'operations', 'foodSafety', 'fireSafety', 'programs', 'jurisdiction',
  'vendors', 'insights', 'tools', 'admin',
] as const;

// ══════════════════════════════════════════════════════════
// TOP-LEVEL ITEM IDS (rendered above sections, not in any section)
// These appear in ROLE_SECTIONS to gate per-role visibility.
// Calendar is ALWAYS visible and not gated by ROLE_SECTIONS.
// ══════════════════════════════════════════════════════════

const TOP_LEVEL_IDS = [
  'documents', 'policies', 'kitchenToCommunity',
] as const;

// ══════════════════════════════════════════════════════════
// ROLE_SECTIONS — section-level + top-level-item visibility
// ══════════════════════════════════════════════════════════

const ROLE_SECTIONS: Record<UserRole, string[]> = {
  platform_admin:     ['dashboard', 'shiftIntelligence', 'operations', 'foodSafety', 'fireSafety', 'programs', 'documents', 'policies', 'kitchenToCommunity', 'jurisdiction', 'vendors', 'insights', 'tools', 'admin'],
  owner_operator:     ['dashboard', 'shiftIntelligence', 'operations', 'foodSafety', 'fireSafety', 'programs', 'documents', 'policies', 'kitchenToCommunity', 'jurisdiction', 'vendors', 'insights', 'tools', 'admin'],
  executive:          ['dashboard', 'shiftIntelligence', 'operations', 'foodSafety', 'fireSafety', 'programs', 'documents', 'policies', 'kitchenToCommunity', 'jurisdiction', 'vendors', 'insights', 'tools', 'admin'],
  compliance_manager: ['dashboard', 'shiftIntelligence', 'operations', 'foodSafety', 'fireSafety', 'programs', 'documents', 'policies', 'kitchenToCommunity', 'jurisdiction', 'vendors', 'insights', 'tools', 'admin'],
  facilities_manager: ['dashboard', 'shiftIntelligence', 'operations',               'fireSafety',             'documents', 'policies',                        'jurisdiction', 'vendors', 'insights', 'tools', 'admin'],
  kitchen_manager:    ['dashboard', 'shiftIntelligence', 'operations', 'foodSafety',               'programs', 'documents', 'policies', 'kitchenToCommunity',                              'insights', 'tools', 'admin'],
  chef:               ['dashboard', 'shiftIntelligence', 'operations', 'foodSafety',                                                                                            'insights', 'tools'],
  kitchen_staff:      ['dashboard', 'shiftIntelligence', 'operations', 'foodSafety',                                                                                                       'tools'],
};

// ══════════════════════════════════════════════════════════
// ROLE_ITEM_HIDES — per-item hiding within visible sections
// Stale entries (referencing killed items) are harmless.
// ══════════════════════════════════════════════════════════

const ROLE_ITEM_HIDES: Record<string, string[]> = {
  kitchen_staff:   ['fs-deficiencies', 'op-self', 'fs-mock', 'fs-analysis', 'fs-trajectory', 'fs-haccp', 'op-deficiencies'],
  chef:            ['fs-mock', 'fs-trajectory'],
  kitchen_manager: ['ad-roles'],
};

// ══════════════════════════════════════════════════════════
// PROGRAMS ORG-TYPE FILTER
// Each Programs item is visible only for specific org types.
// ══════════════════════════════════════════════════════════

const PROGRAMS_ORG_FILTER: Record<string, string[]> = {
  'pg-sb1383': ['restaurant', 'healthcare_facility', 'senior_living', 'k12_school', 'higher_education'],
  'pg-k12':    ['k12_school'],
  'pg-usda':   ['k12_school'],
};

// ══════════════════════════════════════════════════════════
// PER-ROLE HOME DEFINITIONS
// ══════════════════════════════════════════════════════════

const ROLE_HOMES: Record<UserRole, RoleHomeItem> = {
  platform_admin: {
    label: 'Dashboard', labelEs: 'Panel',
    path: '/dashboard', icon: '🛡️',
    description: 'Platform admin — full access to every feature, every location, every tool.',
    descriptionEs: 'Administrador de plataforma — acceso total a todas las funciones.',
  },
  owner_operator: {
    label: 'Dashboard', labelEs: 'Panel',
    path: '/dashboard', icon: '🏢',
    description: 'Multi-location compliance overview — alerts, tasks, and operational status.',
    descriptionEs: 'Resumen de cumplimiento multi-ubicación — alertas, tareas y estado operativo.',
  },
  executive: {
    label: 'Dashboard', labelEs: 'Panel',
    path: '/dashboard', icon: '📊',
    description: 'Organization-wide analytics, benchmarks, and strategic compliance insights.',
    descriptionEs: 'Analítica organizacional, benchmarks y perspectivas estratégicas de cumplimiento.',
  },
  compliance_manager: {
    label: 'Dashboard', labelEs: 'Panel',
    path: '/dashboard', icon: '🏠',
    description: 'Compliance overview — scoring, regulatory status, and inspection readiness.',
    descriptionEs: 'Resumen de cumplimiento — puntuaciones, estado regulatorio y preparación.',
  },
  facilities_manager: {
    label: 'Dashboard', labelEs: 'Panel',
    path: '/dashboard', icon: '⚙️',
    description: 'Equipment status, maintenance schedules, and vendor services.',
    descriptionEs: 'Estado del equipo, calendarios de mantenimiento y servicios de proveedores.',
  },
  kitchen_manager: {
    label: 'Dashboard', labelEs: 'Panel',
    path: '/dashboard', icon: '🏠',
    description: 'Your compliance overview — scores, open items, alerts, and priorities.',
    descriptionEs: 'Su resumen de cumplimiento — puntuaciones, alertas y prioridades.',
  },
  chef: {
    label: 'Dashboard', labelEs: 'Panel',
    path: '/dashboard', icon: '👨‍🍳',
    description: 'Kitchen operations dashboard — tasks, temps, and team overview.',
    descriptionEs: 'Panel de operaciones de cocina — tareas, temperaturas y equipo.',
  },
  kitchen_staff: {
    label: 'Dashboard', labelEs: 'Panel',
    path: '/dashboard', icon: '🏠',
    description: 'Your daily tasks, checklists, and priorities at a glance.',
    descriptionEs: 'Sus tareas diarias, listas de verificación y prioridades.',
  },
};

// ══════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════

/** Build the full sidebar configuration for a role, optionally filtered by kitchen/org type */
export function getRoleConfig(role: UserRole, kitchenType?: string | null): RoleSidebarConfig {
  const allowed = ROLE_SECTIONS[role] || [];
  const hiddenIds = ROLE_ITEM_HIDES[role] || [];

  // ── Top-level items ──
  // Calendar is always visible to every role
  const topItems: NavItem[] = [];
  for (const id of TOP_LEVEL_IDS) {
    if (allowed.includes(id) && I[id]) {
      topItems.push(I[id]);
    }
  }
  topItems.push(I.calendar);

  // ── Sections ──
  const sections: SidebarSection[] = [];

  for (const sectionKey of SECTION_ORDER) {
    if (!allowed.includes(sectionKey)) continue;

    const def = SECTION_DEFS[sectionKey];
    if (!def) continue;

    let itemIds = def.itemIds;

    // Programs section: filter items by org type
    if (sectionKey === 'programs') {
      if (!kitchenType) continue; // Unknown org type → skip Programs entirely
      itemIds = itemIds.filter(id => {
        const orgFilter = PROGRAMS_ORG_FILTER[id];
        return !orgFilter || orgFilter.includes(kitchenType);
      });
    }

    // Filter out role-hidden items
    const items = itemIds
      .filter(id => !hiddenIds.includes(id))
      .map(id => I[id])
      .filter(Boolean) as NavItem[];

    if (items.length === 0) continue; // Skip empty sections

    sections.push({
      id: def.id,
      label: def.label,
      icon: def.icon,
      roles: [],
      tooltipTitle: def.tooltipTitle,
      tooltipDescription: def.tooltipDescription,
      items,
      ...(def.path ? { path: def.path } : {}),
    });
  }

  return {
    home: ROLE_HOMES[role],
    topLevelItems: topItems.length > 0 ? topItems : undefined,
    sections,
  };
}

/** Get the home/dashboard NavItem for a role (with role-specific label) */
export function getHomeItemForRole(role: UserRole): NavItem {
  const home = ROLE_HOMES[role];
  return {
    id: 'dashboard',
    label: home.label,
    path: home.path,
    icon: home.icon,
    roles: ['all'],
    description: home.description,
  };
}

/** Get sections for a role (backward-compatible wrapper) */
export const getSectionsForRole = (role: string, kitchenType?: string | null): SidebarSection[] => {
  const config = getRoleConfig(role as UserRole, kitchenType);
  return config ? config.sections : [];
};

// ── Backward compat — DASHBOARD_ITEM ─────────────────────

export const DASHBOARD_ITEM: NavItem = {
  id: 'dashboard',
  label: 'Dashboard',
  path: '/dashboard',
  icon: '🏠',
  roles: ['all'],
  description: "Your compliance overview — scores, open items, alerts, and today's priorities at a glance.",
};

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

export const LOCATION_VISIBLE_ROLES: UserRole[] = ['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'chef', 'kitchen_manager', 'kitchen_staff'];

// ── Roles that can book meetings / see Calendly CTAs ─────

export const BOOKING_ROLES: UserRole[] = ['platform_admin', 'executive', 'owner_operator', 'compliance_manager', 'facilities_manager'];

export function canBookMeeting(role: UserRole): boolean {
  return BOOKING_ROLES.includes(role);
}

// ── Demo role definitions with descriptions ──────────────

export interface DemoRoleDefinition {
  role: UserRole;
  label: string;
  description: string;
  i18nKey: string;
  i18nDescKey: string;
}

export const DEMO_ROLES: DemoRoleDefinition[] = [
  {
    role: 'platform_admin',
    label: 'Platform Admin',
    description: 'Full platform access — every feature, every route, every tool',
    i18nKey: 'topBar.platformAdmin',
    i18nDescKey: 'topBar.roleDescPlatformAdmin',
  },
  {
    role: 'owner_operator',
    label: 'Owner / Operator',
    description: 'Full access to all locations, settings, and compliance tools',
    i18nKey: 'topBar.ownerOperator',
    i18nDescKey: 'topBar.roleDescOwnerOperator',
  },
  {
    role: 'executive',
    label: 'Executive View',
    description: 'Org-wide analytics, benchmarks, and strategic reports',
    i18nKey: 'topBar.executiveView',
    i18nDescKey: 'topBar.roleDescExecutive',
  },
  {
    role: 'compliance_manager',
    label: 'Compliance Officer',
    description: 'Food safety scoring, self-inspections, regulatory tracking',
    i18nKey: 'topBar.complianceManager',
    i18nDescKey: 'topBar.roleDescComplianceManager',
  },
  {
    role: 'chef',
    label: 'Chef',
    description: 'Kitchen operations, checklists, temps, and team oversight',
    i18nKey: 'topBar.chef',
    i18nDescKey: 'topBar.roleDescChef',
  },
  {
    role: 'facilities_manager',
    label: 'Facilities Manager',
    description: 'Equipment, vendors, fire safety, and maintenance alerts',
    i18nKey: 'topBar.facilitiesManager',
    i18nDescKey: 'topBar.roleDescFacilitiesManager',
  },
  {
    role: 'kitchen_manager',
    label: 'Kitchen Manager',
    description: 'Daily operations, checklists, team management',
    i18nKey: 'topBar.kitchenManager',
    i18nDescKey: 'topBar.roleDescKitchenManager',
  },
  {
    role: 'kitchen_staff',
    label: 'Kitchen Staff',
    description: 'Task-focused: checklists, temperature readings, and issue reporting',
    i18nKey: 'topBar.kitchenStaff',
    i18nDescKey: 'topBar.roleDescKitchenStaff',
  },
];
