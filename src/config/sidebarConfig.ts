import type { UserRole } from '../contexts/RoleContext';

// ── Types ────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
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
  sections: SidebarSection[];
}

// ── Nav Item Registry ────────────────────────────────────
// Define every possible nav item once. Roles field is vestigial
// since visibility is now determined by per-role configs below.

const I: Record<string, NavItem> = {
  // ── Daily Operations ──
  checklists: {
    id: 'checklists', label: 'Checklists', path: '/checklists', icon: '✓',
    roles: [], description: 'Opening, closing, food safety, and custom daily task lists with completion tracking.',
  },
  temperatures: {
    id: 'temperatures', label: 'Temperature Logs', path: '/temp-logs', icon: '🌡️',
    roles: [], description: 'Record temperatures manually, via QR Code scan, or from Internet of Things sensors — storage, receiving, and cooking.',
  },
  incidents: {
    id: 'incidents', label: 'Incidents', path: '/incidents', icon: '⚠️',
    roles: [], description: 'Log and track food safety or compliance incidents with timestamped, immutable records.',
  },
  incidentsViewOnly: {
    id: 'incidents', label: 'Incidents 👁', path: '/incidents', icon: '⚠️',
    roles: [], description: '(View) Review incident reports and compliance issues across locations.',
  },
  temperaturesViewOnly: {
    id: 'temperatures', label: 'Temperature Logs 👁', path: '/temp-logs', icon: '🌡️',
    roles: [], description: '(View) Review temperature monitoring records and compliance history.',
  },

  // ── Compliance ──
  documents: {
    id: 'documents', label: 'Documents', path: '/documents', icon: '📋',
    roles: [], description: 'Compliance certificates, inspection reports, permits, and signed documentation — organized and searchable.',
  },
  selfInspection: {
    id: 'self-inspection', label: 'Self-Inspection', path: '/self-inspection', icon: '🔍',
    roles: [], description: 'Run a self-inspection using the same criteria your health department or fire authority applies.',
  },
  regulatory: {
    id: 'regulatory', label: 'Regulatory Tracking', path: '/regulatory-alerts', icon: '📅',
    roles: [], description: 'Track upcoming inspections, permit renewals, certificate expirations, and regulatory deadlines.',
  },
  reporting: {
    id: 'reporting', label: 'Reporting', path: '/reports', icon: '📊',
    roles: [], description: 'Export compliance summaries, inspection history, and documentation packages for auditors or clients.',
  },
  correctiveActions: {
    id: 'corrective-actions', label: 'Corrective Actions', path: '/corrective-actions', icon: '🔧',
    roles: [], description: 'Track and resolve compliance violations with documented corrective action plans and follow-up verification.',
  },
  fireSafety: {
    id: 'fire-safety', label: 'Fire Safety', path: '/fire-safety', icon: '🔥',
    roles: [], description: 'Fire safety compliance checklists, suppression system status, and fire inspection readiness.',
  },

  // ── Insights ──
  intelligence: {
    id: 'intelligence', label: 'Compliance Intelligence', path: '/intelligence', icon: '🧠',
    roles: [], description: 'EvidLY Intelligence — cross-location pattern detection, predictive risk scoring, and proactive compliance recommendations.',
    badge: 'NEW',
  },
  aiInsights: {
    id: 'ai-insights', label: 'Artificial Intelligence Insights', path: '/ai-advisor', icon: '🤖',
    roles: [], description: 'Artificial Intelligence-powered compliance advisor — ask questions, get recommendations, and analyze trends.',
  },
  analytics: {
    id: 'analytics', label: 'Predictive Analytics', path: '/analysis', icon: '📈',
    roles: [], description: 'Trend data for compliance scores, incident frequency, and checklist completion across locations and time.',
  },
  auditLog: {
    id: 'audit-log', label: 'Inspection Trail & Chain of Custody', path: '/audit-trail', icon: '🔒',
    roles: [], description: 'Immutable timestamped record of every action taken in EvidLY — required for regulatory documentation.',
  },
  benchmarks: {
    id: 'benchmarks', label: 'Benchmarks', path: '/benchmarks', icon: '🏆',
    roles: [], description: 'Compare your compliance performance against industry benchmarks, peer operators, and your own historical baseline.',
  },
  businessIntelligence: {
    id: 'business-intelligence', label: 'Business Intelligence', path: '/business-intelligence', icon: '💡',
    roles: [], description: 'Artificial Intelligence executive briefings, scenario intelligence engine, jurisdiction scores, and risk analysis across your full portfolio.',
  },
  iotDashboard: {
    id: 'iot-dashboard', label: 'Internet of Things Dashboard', path: '/iot-monitoring', icon: '📡',
    roles: [], description: 'Real-time sensor data — temperature sensors, refrigeration monitoring, and automated compliance readings.',
  },
  jurisdictionIntelligence: {
    id: 'jurisdiction-intelligence', label: 'Jurisdiction Intelligence', path: '/jurisdiction', icon: '⚖️',
    roles: [], description: 'Jurisdiction-specific compliance scoring, regulatory requirements, and authority-having-jurisdiction mapping.',
  },

  // ── Tools ──
  selfDiagnosis: {
    id: 'self-diagnosis', label: 'Self-Diagnosis', path: '/self-diagnosis', icon: '🔧',
    roles: [], description: 'Troubleshoot equipment issues, get resolution steps, attach photo + video, and notify your vendor — in under 2 minutes.',
  },
  calendar: {
    id: 'calendar', label: 'Calendar', path: '/calendar', icon: '📅',
    roles: [], description: 'Inspections, permit renewals, service appointments, and compliance deadlines in one view.',
  },
  inspectorArrival: {
    id: 'inspector-arrival', label: 'Inspector Arrival Mode', path: '/inspector-view', icon: '🏛️',
    roles: [], description: 'Instant access mode when an inspector arrives — surfaces documents, recent logs, and compliance status.',
  },
  iotSensors: {
    id: 'iot-sensors', label: 'Internet of Things Sensors', path: '/sensors', icon: '📡',
    roles: [], description: 'Add, configure, and manage Internet of Things temperature sensors across your locations.',
  },
  foodSafetyOverview: {
    id: 'food-safety-overview', label: 'Food Safety', path: '/scoring-breakdown', icon: '🍽️',
    roles: [], description: 'Food safety compliance scoring, critical control points, and inspection readiness overview.',
  },
  serviceROI: {
    id: 'service-roi', label: 'Service Return on Investment', path: '/business-intelligence', icon: '💰',
    roles: [], description: 'Calculate the return on investment for compliance services and cost of non-compliance.',
  },
  services: {
    id: 'services', label: 'Vendor Services', path: '/services', icon: '🛠️',
    roles: [], description: 'Log and track vendor-provided service records — hood cleaning, Heating Ventilation and Air Conditioning, pest control, and fire suppression.',
  },

  // ── Equipment (Facilities subcategories) ──
  allEquipment: {
    id: 'all-equipment', label: 'All Equipment', path: '/equipment', icon: '📦',
    roles: [], description: 'Full equipment registry — all kitchen assets, service history, and maintenance schedules.',
  },
  equipment: {
    id: 'equipment', label: 'Equipment', path: '/equipment', icon: '⚙️',
    roles: [], description: 'Asset register for all kitchen equipment with service history, maintenance dates, and warranty tracking.',
  },

  // ── Service (Facilities) ──
  serviceReporting: {
    id: 'service-reporting', label: 'Reporting', path: '/reports', icon: '📊',
    roles: [], description: 'Service history reports, maintenance compliance summaries, and vendor performance data.',
  },
  vendors: {
    id: 'vendors', label: 'Vendors', path: '/vendors', icon: '🤝',
    roles: [], description: 'Service providers on file — hood cleaning, Heating Ventilation and Air Conditioning, pest, plumbing, roofing, and fire suppression.',
  },

  // ── Food Safety (Chef) ──
  haccp: {
    id: 'haccp', label: 'Hazard Analysis Critical Control Points', path: '/haccp', icon: '🛡️',
    roles: [], description: 'Monitor critical control points, hazard analysis, and Hazard Analysis Critical Control Points plan compliance.',
  },

  // ── Administration ──
  locations: {
    id: 'locations', label: 'Locations', path: '/org-hierarchy', icon: '📍',
    roles: [], description: 'Add, edit, or configure locations including jurisdiction mapping and compliance requirements.',
  },
  settings: {
    id: 'settings', label: 'Settings', path: '/settings', icon: '⚙️',
    roles: [], description: 'Account preferences, notification settings, language, and platform configuration.',
  },
  team: {
    id: 'team', label: 'Team', path: '/team', icon: '👥',
    roles: [], description: 'Manage staff roles, access levels, and location assignments across your organization.',
  },

  // ── Help ──
  help: {
    id: 'help', label: 'Help', path: '/help', icon: '❓',
    roles: [], description: 'Documentation, training guides, support chat, and contact options.',
  },
};

// ── Section builder helper ───────────────────────────────

function section(
  id: string, label: string, icon: string,
  tooltipTitle: string, tooltipDescription: string,
  items: NavItem[],
  path?: string,
): SidebarSection {
  return { id, label, icon, roles: [], tooltipTitle, tooltipDescription, items, ...(path ? { path } : {}) };
}

// ── Per-Role Sidebar Configurations ──────────────────────

const ROLE_CONFIGS: Record<UserRole, RoleSidebarConfig> = {

  // ── PLATFORM ADMIN (Arthur — software owner) ──────────
  platform_admin: {
    home: {
      label: 'Dashboard', labelEs: 'Panel',
      path: '/dashboard', icon: '🛡️',
      description: 'Platform admin — full access to every feature, every location, every tool.',
      descriptionEs: 'Administrador de plataforma — acceso total a todas las funciones.',
    },
    sections: [
      section('daily', 'Daily Operations', '✓',
        'Daily Operations', 'Calendar, checklists, and temperature monitoring across all locations.',
        [I.calendar, I.checklists, I.temperatures, I.incidents],
      ),
      section('food-safety', 'Food Safety', '🛡️',
        'Food Safety', 'Hazard Analysis Critical Control Points plans and critical control points.',
        [I.haccp],
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Every compliance tool — documents, inspections, corrective actions, regulatory tracking, fire safety, and more.',
        [I.correctiveActions, I.documents, I.fireSafety, I.foodSafetyOverview, I.inspectorArrival, I.jurisdictionIntelligence, I.regulatory, I.reporting, I.selfInspection, I.services],
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'Artificial Intelligence advisor, analytics, audit logs, benchmarks, business intelligence, compliance intelligence, Internet of Things, and service Return on Investment.',
        [I.aiInsights, I.analytics, I.auditLog, I.benchmarks, I.businessIntelligence, I.intelligence, I.iotDashboard, I.serviceROI],
      ),
      section('equipment', 'Equipment', '⚙️',
        'Equipment', 'Full equipment registry — all kitchen assets, service history, and maintenance schedules.',
        [I.allEquipment],
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Self-diagnosis and inspector arrival mode.',
        [I.inspectorArrival, I.selfDiagnosis],
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Equipment, Internet of Things sensors, locations, settings, team, and vendors.',
        [I.equipment, I.iotSensors, I.locations, I.settings, I.team, I.vendors],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [], '/help',
      ),
    ],
  },

  // ── STAFF ─────────────────────────────────────────────
  kitchen_staff: {
    home: {
      label: 'Dashboard', labelEs: 'Panel',
      path: '/dashboard', icon: '🏠',
      description: 'Your daily tasks, checklists, and priorities at a glance.',
      descriptionEs: 'Sus tareas diarias, listas de verificación y prioridades.',
    },
    sections: [
      section('tasks', 'Daily Operations', '✓',
        'Daily Operations', 'Your assigned checklists, temperature logs, and daily tasks.',
        [I.checklists, I.temperatures],
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Diagnose equipment problems.',
        [I.selfDiagnosis],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [], '/help',
      ),
    ],
  },

  // ── CHEF ──────────────────────────────────────────────
  chef: {
    home: {
      label: 'Dashboard', labelEs: 'Panel',
      path: '/dashboard', icon: '👨‍🍳',
      description: 'Kitchen operations dashboard — tasks, temps, and team overview.',
      descriptionEs: 'Panel de operaciones de cocina — tareas, temperaturas y equipo.',
    },
    sections: [
      section('daily', 'Daily Operations', '✓',
        'Daily Operations', 'Calendar for inspections, deadlines, and service appointments.',
        [I.calendar],
      ),
      section('food-safety', 'Food Safety', '🛡️',
        'Food Safety', 'Temperature logs and Hazard Analysis Critical Control Points.',
        [I.haccp, I.temperatures],
      ),
      section('team', 'Team', '👥',
        'Team', 'Checklists and incident tracking for your kitchen team.',
        [I.checklists, I.incidents],
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Food safety scoring, corrective action tracking, and resolution.',
        [I.correctiveActions, I.foodSafetyOverview],
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'Artificial Intelligence-powered analysis and recommendations.',
        [I.aiInsights],
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Equipment troubleshooting and vendor notification.',
        [I.selfDiagnosis],
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Team management.',
        [I.team],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [], '/help',
      ),
    ],
  },

  // ── MANAGER (kitchen_manager) ─────────────────────────
  kitchen_manager: {
    home: {
      label: 'Dashboard', labelEs: 'Panel',
      path: '/dashboard', icon: '🏠',
      description: 'Your compliance overview — scores, open items, alerts, and priorities.',
      descriptionEs: 'Su resumen de cumplimiento — puntuaciones, alertas y prioridades.',
    },
    sections: [
      section('daily', 'Daily Operations', '✓',
        'Daily Operations', 'Calendar, checklists, corrective actions, and temperature logs.',
        [I.calendar, I.checklists, I.correctiveActions, I.temperatures],
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Documentation, food safety, Hazard Analysis Critical Control Points, incidents, regulatory tracking, reporting, self-inspection, and services.',
        [I.documents, I.foodSafetyOverview, I.haccp, I.incidents, I.regulatory, I.reporting, I.selfInspection, I.services],
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'Artificial Intelligence-powered analysis, analytics, and recommendations.',
        [I.aiInsights, I.analytics],
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Equipment troubleshooting and vendor notification.',
        [I.selfDiagnosis],
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Account settings and team management.',
        [I.settings, I.team],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [], '/help',
      ),
    ],
  },

  // ── COMPLIANCE MANAGER ────────────────────────────────
  compliance_manager: {
    home: {
      label: 'Dashboard', labelEs: 'Panel',
      path: '/dashboard', icon: '🏠',
      description: 'Compliance overview — scoring, regulatory status, and inspection readiness.',
      descriptionEs: 'Resumen de cumplimiento — puntuaciones, estado regulatorio y preparación.',
    },
    sections: [
      section('daily', 'Daily Operations', '✓',
        'Daily Operations', 'Checklists, calendar, and temperature monitoring.',
        [I.calendar, I.checklists, I.temperaturesViewOnly],
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Corrective actions, documentation, fire safety, Hazard Analysis Critical Control Points, incidents, inspector view, jurisdiction intelligence, regulatory tracking, reporting, and services.',
        [I.correctiveActions, I.documents, I.fireSafety, I.haccp, I.incidentsViewOnly, I.inspectorArrival, I.jurisdictionIntelligence, I.regulatory, I.reporting, I.services],
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'Artificial Intelligence-powered analysis — audit logs, business intelligence, intelligence, and Internet of Things monitoring.',
        [I.aiInsights, I.auditLog, I.businessIntelligence, I.intelligence, I.iotDashboard],
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Account settings.',
        [I.settings],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [], '/help',
      ),
    ],
  },

  // ── FACILITIES MANAGER ────────────────────────────────
  facilities_manager: {
    home: {
      label: 'Dashboard', labelEs: 'Panel',
      path: '/dashboard', icon: '⚙️',
      description: 'Equipment status, maintenance schedules, and vendor services.',
      descriptionEs: 'Estado del equipo, calendarios de mantenimiento y servicios de proveedores.',
    },
    sections: [
      section('calendar-section', 'Calendar', '📅',
        'Calendar', 'Inspections, permit renewals, service appointments, and compliance deadlines.',
        [], '/calendar',
      ),
      section('equipment', 'Equipment', '⚙️',
        'Equipment', 'Full equipment registry — all kitchen assets, service history, and maintenance schedules.',
        [I.allEquipment],
      ),
      section('daily', 'Daily Operations', '✓',
        'Daily Operations', 'Task scheduling and daily operations.',
        [I.checklists],
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Fire safety compliance, incidents, inspector view, and inspection readiness.',
        [I.fireSafety, I.incidents, I.inspectorArrival],
      ),
      section('service', 'Service', '🤝',
        'Service', 'Reporting, vendor services, and vendor management.',
        [I.serviceReporting, I.services, I.vendors],
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Equipment troubleshooting, vendor notification, and service Return on Investment.',
        [I.selfDiagnosis, I.serviceROI],
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'Internet of Things sensor monitoring.',
        [I.iotDashboard],
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Equipment, Internet of Things sensors, account settings, team management, and vendors.',
        [I.equipment, I.iotSensors, I.settings, I.team, I.vendors],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [], '/help',
      ),
    ],
  },

  // ── OWNER / OPERATOR ──────────────────────────────────
  owner_operator: {
    home: {
      label: 'Dashboard', labelEs: 'Panel',
      path: '/dashboard', icon: '🏢',
      description: 'Multi-location compliance overview — alerts, tasks, and operational status.',
      descriptionEs: 'Resumen de cumplimiento multi-ubicación — alertas, tareas y estado operativo.',
    },
    sections: [
      section('daily', 'Daily Operations', '✓',
        'Daily Operations', 'Calendar, checklists, and temperature monitoring across all locations.',
        [I.calendar, I.checklists, I.temperatures],
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Corrective actions, documents, food safety, Hazard Analysis Critical Control Points, incidents, regulatory tracking, reporting, self-inspection, and vendor services.',
        [I.correctiveActions, I.documents, I.fireSafety, I.foodSafetyOverview, I.haccp, I.incidents, I.jurisdictionIntelligence, I.regulatory, I.reporting, I.selfInspection, I.services],
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'Artificial Intelligence-powered analysis, analytics, audit logs, benchmarks, business intelligence, intelligence, Internet of Things monitoring, and service Return on Investment.',
        [I.aiInsights, I.analytics, I.auditLog, I.benchmarks, I.businessIntelligence, I.intelligence, I.iotDashboard, I.serviceROI],
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Inspector arrival mode and self-diagnosis.',
        [I.inspectorArrival, I.selfDiagnosis],
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Equipment, Internet of Things sensors, locations, settings, team, and vendors.',
        [I.equipment, I.iotSensors, I.locations, I.settings, I.team, I.vendors],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [], '/help',
      ),
    ],
  },

  // ── EXECUTIVE ─────────────────────────────────────────
  executive: {
    home: {
      label: 'Dashboard', labelEs: 'Panel',
      path: '/dashboard', icon: '📊',
      description: 'Organization-wide analytics, benchmarks, and strategic compliance insights.',
      descriptionEs: 'Analítica organizacional, benchmarks y perspectivas estratégicas de cumplimiento.',
    },
    sections: [
      section('calendar-section', 'Calendar', '📅',
        'Calendar', 'Inspections, permit renewals, service appointments, and compliance deadlines.',
        [], '/calendar',
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'Artificial Intelligence-powered analysis — analytics, audit logs, benchmarks, business intelligence, intelligence, and Internet of Things monitoring.',
        [I.aiInsights, I.analytics, I.auditLog, I.benchmarks, I.businessIntelligence, I.intelligence, I.iotDashboard],
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Fire safety, incidents, jurisdiction intelligence, regulatory tracking, compliance reporting, and vendor services.',
        [I.fireSafety, I.incidentsViewOnly, I.jurisdictionIntelligence, I.regulatory, I.reporting, I.services],
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Service Return on Investment analysis.',
        [I.serviceROI],
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Account settings.',
        [I.settings],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [], '/help',
      ),
    ],
  },
};

// ── Public API ───────────────────────────────────────────

/** Get the full sidebar configuration for a role */
export function getRoleConfig(role: UserRole): RoleSidebarConfig {
  return ROLE_CONFIGS[role];
}

/** Get the home/dashboard NavItem for a role (with role-specific label) */
export function getHomeItemForRole(role: UserRole): NavItem {
  const config = ROLE_CONFIGS[role];
  return {
    id: 'dashboard',
    label: config.home.label,
    path: config.home.path,
    icon: config.home.icon,
    roles: ['all'],
    description: config.home.description,
  };
}

/** Get sections for a role (backward-compatible wrapper) */
export const getSectionsForRole = (role: string): SidebarSection[] => {
  const config = ROLE_CONFIGS[role as UserRole];
  return config ? config.sections : [];
};

// ── Backward compat — DASHBOARD_ITEM (deprecated, use getHomeItemForRole) ──

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
    label: 'Compliance Manager',
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
    description: 'Task-focused: checklists, temp logs, and issue reporting',
    i18nKey: 'topBar.kitchenStaff',
    i18nDescKey: 'topBar.roleDescKitchenStaff',
  },
];
