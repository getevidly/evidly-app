import type { UserRole } from '../contexts/RoleContext';

// ── Types ────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  roles: string[];
  description: string;
}

export interface SidebarSection {
  id: string;
  label: string;
  icon: string;
  roles: string[];
  tooltipTitle: string;
  tooltipDescription: string;
  items: NavItem[];
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
    roles: [], description: 'Record temperatures manually, via QR scan, or from IoT sensors — storage, receiving, and cooking.',
  },
  incidents: {
    id: 'incidents', label: 'Incidents', path: '/incidents', icon: '⚠️',
    roles: [], description: 'Log and track food safety or compliance incidents with timestamped, immutable records.',
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
  vendorCertifications: {
    id: 'vendor-certifications', label: 'Vendor Certifications', path: '/vendor-certifications', icon: '📄',
    roles: [], description: 'Verify and track vendor compliance certifications, insurance documents, and licensing status.',
  },

  // ── Insights ──
  analytics: {
    id: 'analytics', label: 'Analytics', path: '/analysis', icon: '📈',
    roles: [], description: 'Trend data for compliance scores, incident frequency, and checklist completion across locations and time.',
  },
  auditLog: {
    id: 'audit-log', label: 'Audit Log', path: '/audit-trail', icon: '🔒',
    roles: [], description: 'Immutable timestamped record of every action taken in EvidLY — required for regulatory documentation.',
  },
  benchmarks: {
    id: 'benchmarks', label: 'Benchmarks', path: '/benchmarks', icon: '🏆',
    roles: [], description: 'Compare your compliance performance against industry benchmarks, peer operators, and your own historical baseline.',
  },
  businessIntelligence: {
    id: 'business-intelligence', label: 'Business Intelligence', path: '/business-intelligence', icon: '💡',
    roles: [], description: 'AI executive briefings, scenario intelligence engine, jurisdiction scores, and risk analysis across your full portfolio.',
  },
  iotDashboard: {
    id: 'iot-dashboard', label: 'IoT Dashboard', path: '/iot-monitoring', icon: '📡',
    roles: [], description: 'Real-time sensor data — temperature sensors, refrigeration monitoring, and automated compliance readings.',
  },
  jurisdictionIntelligence: {
    id: 'jurisdiction-intelligence', label: 'Jurisdiction Intelligence', path: '/jurisdiction', icon: '⚖️',
    roles: [], description: 'Jurisdiction-specific compliance scoring, regulatory requirements, and authority-having-jurisdiction mapping.',
  },
  scoreTable: {
    id: 'score-table', label: 'ScoreTable', path: '/scoring-breakdown', icon: '🎯',
    roles: [], description: 'Detailed compliance score breakdown by pillar — food safety, fire safety, and vendor compliance.',
  },
  violationTrends: {
    id: 'violation-trends', label: 'Violation Trends', path: '/violation-trends', icon: '📉',
    roles: [], description: 'Analyze violation patterns over time to identify systemic issues and improvement opportunities.',
  },

  // ── Tools ──
  selfDiagnosis: {
    id: 'self-diagnosis', label: 'Self-Diagnosis', path: '/self-diagnosis', icon: '🔧',
    roles: [], description: 'Troubleshoot equipment issues, get resolution steps, attach photo + video, and notify your vendor — in under 2 minutes.',
  },
  reportIssue: {
    id: 'report-issue', label: 'Report an Issue', path: '/incidents', icon: '🚨',
    roles: [], description: 'Report a people, process, or safety incident with timestamped records.',
  },
  exportCenter: {
    id: 'export-center', label: 'Export Center', path: '/export-center', icon: '📤',
    roles: [], description: 'Export compliance reports, documentation packages, and data extracts in multiple formats.',
  },

  // ── Equipment (Facilities subcategories) ──
  equipment: {
    id: 'equipment', label: 'Equipment', path: '/equipment', icon: '⚙️',
    roles: [], description: 'Asset register for all kitchen equipment with service history, maintenance dates, and warranty tracking.',
  },
  hoodExhaust: {
    id: 'hood-exhaust', label: 'Hood and Exhaust', path: '/equipment/hood-exhaust', icon: '🏭',
    roles: [], description: 'Hood and exhaust system maintenance, cleaning schedules, and fire suppression inspections.',
  },
  hvac: {
    id: 'hvac', label: 'HVAC', path: '/equipment/hvac', icon: '❄️',
    roles: [], description: 'Heating, ventilation, and air conditioning system maintenance and service records.',
  },
  iceMachines: {
    id: 'ice-machines', label: 'Ice Machines', path: '/equipment/ice-machines', icon: '🧊',
    roles: [], description: 'Ice machine maintenance, cleaning schedules, and water quality monitoring.',
  },
  refrigeration: {
    id: 'refrigeration', label: 'Refrigeration', path: '/equipment/refrigeration', icon: '🥶',
    roles: [], description: 'Walk-in coolers, freezers, and refrigeration units — temperature monitoring and service records.',
  },
  suppressionSystems: {
    id: 'suppression-systems', label: 'Suppression Systems', path: '/equipment/suppression-systems', icon: '🧯',
    roles: [], description: 'Fire suppression system inspections, certifications, and maintenance compliance.',
  },

  // ── Service (Facilities) ──
  certsDocs: {
    id: 'certs-docs', label: 'Certifications and Documents', path: '/documents', icon: '📋',
    roles: [], description: 'Equipment certifications, service documentation, and compliance records.',
  },
  serviceCalendar: {
    id: 'service-calendar', label: 'Service Calendar', path: '/calendar', icon: '📅',
    roles: [], description: 'Scheduled maintenance, vendor service appointments, and inspection dates.',
  },
  serviceReporting: {
    id: 'service-reporting', label: 'Service Reporting', path: '/reports', icon: '📊',
    roles: [], description: 'Service history reports, maintenance compliance summaries, and vendor performance data.',
  },
  vendors: {
    id: 'vendors', label: 'Vendors', path: '/vendors', icon: '🤝',
    roles: [], description: 'Service providers on file — hood cleaning, HVAC, pest, plumbing, roofing, and fire suppression.',
  },

  // ── Food Safety (Chef) ──
  allergenTracking: {
    id: 'allergen-tracking', label: 'Allergen Tracking', path: '/allergen-tracking', icon: '⚠️',
    roles: [], description: 'Track allergen presence in menu items, cross-contamination risks, and allergen-free preparation zones.',
  },
  coolingLogs: {
    id: 'cooling-logs', label: 'Cooling Logs', path: '/cooling-logs', icon: '❄️',
    roles: [], description: 'Record cooling times and temperatures for cooked foods to ensure safe cooling compliance.',
  },
  haccp: {
    id: 'haccp', label: 'HACCP Control Points', path: '/haccp', icon: '🛡️',
    roles: [], description: 'Monitor critical control points, hazard analysis, and HACCP plan compliance.',
  },
  receivingLog: {
    id: 'receiving-log', label: 'Receiving Log', path: '/receiving-log', icon: '📦',
    roles: [], description: 'Log incoming deliveries with temperature checks, quality inspections, and supplier verification.',
  },

  // ── Administration ──
  billing: {
    id: 'billing', label: 'Billing', path: '/billing', icon: '💳',
    roles: [], description: 'Manage your EvidLY subscription, payment method, and invoice history.',
  },
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
): SidebarSection {
  return { id, label, icon, roles: [], tooltipTitle, tooltipDescription, items };
}

// ── Per-Role Sidebar Configurations ──────────────────────

const ROLE_CONFIGS: Record<UserRole, RoleSidebarConfig> = {

  // ── STAFF ─────────────────────────────────────────────
  kitchen_staff: {
    home: {
      label: 'Today', labelEs: 'Hoy',
      path: '/dashboard', icon: '🏠',
      description: 'Your daily tasks, checklists, and priorities at a glance.',
      descriptionEs: 'Sus tareas diarias, listas de verificación y prioridades.',
    },
    sections: [
      section('tasks', 'Tasks', '✓',
        'Tasks', 'Your assigned checklists and temperature logs for today.',
        [I.checklists, I.temperatures],
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Report issues and diagnose equipment problems.',
        [I.reportIssue, I.selfDiagnosis],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [I.help],
      ),
    ],
  },

  // ── CHEF ──────────────────────────────────────────────
  chef: {
    home: {
      label: 'Kitchen', labelEs: 'Cocina',
      path: '/dashboard', icon: '👨‍🍳',
      description: 'Kitchen operations dashboard — tasks, temps, and team overview.',
      descriptionEs: 'Panel de operaciones de cocina — tareas, temperaturas y equipo.',
    },
    sections: [
      section('food-safety', 'Food Safety', '🛡️',
        'Food Safety', 'Temperature logs, HACCP control points, allergen tracking, and food receiving.',
        [I.allergenTracking, I.coolingLogs, I.haccp, I.receivingLog, I.temperatures],
      ),
      section('team', 'Team', '👥',
        'Team', 'Checklists and incident tracking for your kitchen team.',
        [I.checklists, I.incidents],
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Equipment troubleshooting and vendor notification.',
        [I.selfDiagnosis],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [I.help],
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
        'Daily Operations', 'Everything your team does every day to maintain compliance — checklists, temperature logs, and incident reporting.',
        [I.checklists, I.incidents, I.temperatures],
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Documentation, regulatory tracking, reporting, and self-inspection tools.',
        [I.documents, I.regulatory, I.reporting, I.selfInspection],
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Equipment troubleshooting and vendor notification.',
        [I.selfDiagnosis],
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Team management and account settings.',
        [I.settings, I.team],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [I.help],
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
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Corrective actions, documentation, regulatory tracking, reporting, self-inspections, and vendor certifications.',
        [I.correctiveActions, I.documents, I.regulatory, I.reporting, I.selfInspection, I.vendorCertifications],
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'AI-powered analysis — audit logs, intelligence dashboards, jurisdiction scoring, and violation trends.',
        [I.auditLog, I.businessIntelligence, I.iotDashboard, I.jurisdictionIntelligence, I.scoreTable, I.violationTrends],
      ),
      section('daily', 'Daily Operations', '✓',
        'Daily Operations', 'Incident tracking and temperature monitoring.',
        [I.incidents, I.temperatures],
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Export compliance data and diagnose equipment issues.',
        [I.exportCenter, I.selfDiagnosis],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [I.help],
      ),
    ],
  },

  // ── FACILITIES MANAGER ────────────────────────────────
  facilities_manager: {
    home: {
      label: 'Equipment', labelEs: 'Equipos',
      path: '/dashboard', icon: '⚙️',
      description: 'Equipment status, maintenance schedules, and vendor services.',
      descriptionEs: 'Estado del equipo, calendarios de mantenimiento y servicios de proveedores.',
    },
    sections: [
      section('equipment', 'Equipment', '⚙️',
        'Equipment', 'Equipment categories — hoods, HVAC, ice machines, refrigeration, and fire suppression systems.',
        [I.hoodExhaust, I.hvac, I.iceMachines, I.refrigeration, I.suppressionSystems],
      ),
      section('service', 'Service', '🤝',
        'Service', 'Certifications, self-diagnosis, service scheduling, reporting, and vendor management.',
        [I.certsDocs, I.selfDiagnosis, I.serviceCalendar, I.serviceReporting, I.vendors],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [I.help],
      ),
    ],
  },

  // ── OWNER / OPERATOR ──────────────────────────────────
  owner_operator: {
    home: {
      label: 'Portfolio', labelEs: 'Portafolio',
      path: '/dashboard', icon: '🏢',
      description: 'Multi-location compliance portfolio — scores, alerts, and operational status.',
      descriptionEs: 'Portafolio de cumplimiento multi-ubicación — puntuaciones, alertas y estado operativo.',
    },
    sections: [
      section('daily', 'Daily Operations', '✓',
        'Daily Operations', 'Checklists, incident tracking, and temperature monitoring across all locations.',
        [I.checklists, I.incidents, I.temperatures],
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Corrective actions, documentation, regulatory tracking, reporting, and self-inspection tools.',
        [I.correctiveActions, I.documents, I.regulatory, I.reporting, I.selfInspection],
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'AI-powered analysis — analytics, audit logs, business intelligence, IoT monitoring, jurisdiction scoring, and compliance scores.',
        [I.analytics, I.auditLog, I.businessIntelligence, I.iotDashboard, I.jurisdictionIntelligence, I.scoreTable],
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Equipment troubleshooting and vendor notification.',
        [I.selfDiagnosis],
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Billing, location setup, account settings, team management, and vendor directory.',
        [I.billing, I.locations, I.settings, I.team, I.vendors],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [I.help],
      ),
    ],
  },

  // ── EXECUTIVE ─────────────────────────────────────────
  executive: {
    home: {
      label: 'Insights Dashboard', labelEs: 'Panel de Perspectivas',
      path: '/dashboard', icon: '📊',
      description: 'Organization-wide analytics, benchmarks, and strategic compliance insights.',
      descriptionEs: 'Analítica organizacional, benchmarks y perspectivas estratégicas de cumplimiento.',
    },
    sections: [
      section('insights', 'Insights', '💡',
        'Insights', 'AI-powered analysis — analytics, audit logs, benchmarks, business intelligence, IoT monitoring, and compliance scores.',
        [I.analytics, I.auditLog, I.benchmarks, I.businessIntelligence, I.iotDashboard, I.scoreTable],
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Regulatory tracking and compliance reporting.',
        [I.regulatory, I.reporting],
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Billing and account settings.',
        [I.billing, I.settings],
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [I.help],
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

export const LOCATION_VISIBLE_ROLES: UserRole[] = ['owner_operator', 'executive', 'compliance_manager', 'chef', 'kitchen_manager', 'kitchen_staff'];

// ── Roles that can book meetings / see Calendly CTAs ─────

export const BOOKING_ROLES: UserRole[] = ['executive', 'owner_operator', 'compliance_manager', 'facilities_manager'];

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
