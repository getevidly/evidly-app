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
  topLevelItems?: NavItem[];
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
    id: 'temperatures', label: 'Temperature Readings', path: '/temp-logs', icon: '🌡️',
    roles: [], description: 'Record temperatures manually, via QR Code scan, or from Internet of Things sensors — storage, receiving, and cooking.',
  },
  incidents: {
    id: 'incidents', label: 'Incidents', path: '/incidents', icon: '⚠️',
    roles: [], description: 'Log and track food safety or compliance incidents with timestamped, immutable records.',
  },
  incidentsViewOnly: {
    id: 'incidents', label: 'Incidents 👁', path: '/incidents', icon: '⚠️',
    roles: [], description: '(View) Review incident reports and compliance issues across locations.', // demo
  },
  temperaturesViewOnly: {
    id: 'temperatures', label: 'Temperature Readings 👁', path: '/temp-logs', icon: '🌡️',
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
  mockInspection: {
    id: 'mock-inspection', label: 'Mock Inspection', path: '/mock-inspection', icon: '🎯',
    roles: [], description: 'Practice with an AI-simulated inspector using your jurisdiction\'s criteria.',
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
  facilitySafety: {
    id: 'facility-safety', label: 'Facility Safety', path: '/facility-safety', icon: '🔥',
    roles: [], description: 'Facility safety compliance checklists, suppression system status, and fire inspection readiness.',
  },
  deficiencies: {
    id: 'deficiencies', label: 'Deficiencies', path: '/deficiencies', icon: '⚠️',
    roles: [], description: 'Track compliance code violations found during service visits — severity, status, remediation, and resolution.',
  },
  workforceRisk: {
    id: 'workforce-risk', label: 'Workforce Risk', path: '/workforce-risk', icon: '👷',
    roles: [], description: 'Employee certification status, training compliance gaps, and staffing risk signals.',
    badge: 'P5',
  },
  cicPse: {
    id: 'cic-pse', label: 'CIC / PSE', path: '/cic-pse', icon: '🛡️',
    roles: [], description: 'Compliance Intelligence Center, Protective Safeguards Endorsement records, and insurance program.',
  },

  // ── Insights ──
  intelligence: {
    id: 'intelligence', label: 'Compliance Intelligence', path: '/intelligence', icon: '🧠',
    roles: [], description: 'EvidLY Intelligence — cross-location pattern detection, predictive risk scoring, and proactive compliance recommendations.',
    badge: 'NEW',
  },
  rfpIntelligence: {
    id: 'rfp-intelligence', label: 'RFP Monitor', path: '/admin/rfp-intelligence', icon: '📋',
    roles: [], description: 'Government RFP and procurement opportunity monitoring with AI-powered relevance classification.',
    badge: 'NEW',
  },
  aiInsights: {
    id: 'ai-insights', label: 'Artificial Intelligence Insights', path: '/ai-advisor', icon: '🤖',
    roles: [], description: 'Artificial Intelligence-powered compliance advisor — ask questions, get recommendations, and analyze trends.',
  },
  copilotInsights: {
    id: 'copilot-insights', label: 'Copilot Insights', path: '/copilot', icon: '🤖',
    roles: [], description: 'Proactive AI-generated insights — anomaly detection, predictive alerts, and compliance recommendations.',
    badge: 'NEW',
  },
  analytics: {
    id: 'analytics', label: 'Predictive Analytics', path: '/analysis', icon: '📈',
    roles: [], description: 'Trend data for compliance scores, incident frequency, and checklist completion across locations and time.',
  },
  complianceTrends: {
    id: 'compliance-trends', label: 'Compliance Trends', path: '/compliance-trends', icon: '📊',
    roles: [], description: '30/60/90-day compliance score trajectories with per-category breakdown across locations.',
  },
  auditLog: {
    id: 'audit-log', label: 'Inspection Trail & Chain of Custody', path: '/audit-trail', icon: '🔒',
    roles: [], description: 'Immutable timestamped record of every action taken in EvidLY — required for regulatory documentation.',
  },
  benchmarks: {
    id: 'benchmarks', label: 'Benchmarks', path: '/benchmarks', icon: '🏆',
    roles: [], description: 'Compare your compliance performance against industry benchmarks, peer operators, and your own historical baseline.',
  },
  iotDashboard: {
    id: 'iot-dashboard', label: 'Internet of Things Dashboard', path: '/iot-monitoring', icon: '📡',
    roles: [], description: 'Real-time sensor data — temperature sensors, refrigeration monitoring, and automated compliance readings.',
  },
  clientIntelligence: {
    id: 'client-intelligence', label: 'Business Intelligence', path: '/insights/intelligence', icon: '📡',
    roles: [], description: 'Actionable intelligence from 80+ regulatory, legislative, and industry sources — filtered to your jurisdictions.',
    badge: 'NEW',
  },
  clientReports: {
    id: 'client-reports', label: 'Reports', path: '/insights/reports', icon: '📋',
    roles: [], description: 'Compliance, insurance, and operational reports generated for your organization.',
    badge: 'NEW',
  },
  jurisdictionIntelligence: {
    id: 'jurisdiction-intelligence', label: 'Know Your Inspector', path: '/jurisdiction', icon: '⚖️',
    roles: [], description: "Your jurisdiction's scoring system, inspector priorities, and violation patterns.",
  },

  // ── Tools ──
  kitchenCheckup: {
    id: 'kitchen-checkup', label: 'Kitchen Checkup', path: '/checkup', icon: '📋',
    roles: [], description: 'Self-assessment to evaluate compliance readiness across Food Safety and Facility Safety.',
  },
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
    id: 'iot-sensors', label: 'Manage Sensors', path: '/sensors', icon: '📡',
    roles: [], description: 'Add, configure, and manage Internet of Things temperature sensors across your locations.',
  },
  foodSafetyOverview: {
    id: 'food-safety-overview', label: 'Food Safety', path: '/scoring-breakdown', icon: '🍽️',
    roles: [], description: 'Food safety compliance scoring, critical control points, and inspection readiness overview.',
  },
  complianceOverview: {
    id: 'compliance-overview', label: 'Compliance Overview', path: '/compliance-overview', icon: '📊',
    roles: [], description: 'Side-by-side Food Safety and Facility Safety scores with jurisdiction status and operational metrics.',
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
  vendorMarketplace: {
    id: 'vendor-marketplace', label: 'Vendor Marketplace', path: '/marketplace', icon: '🏪',
    roles: [], description: 'Discover and compare EvidLY-verified service vendors — hood cleaning, fire suppression, pest control, and more.',
  },

  // ── Food Recovery (SB 1383) ──
  foodRecovery: {
    id: 'food-recovery', label: 'Food Recovery', path: '/food-recovery', icon: '♻️',
    roles: [], description: 'SB 1383 organic waste diversion tracking, food recovery agreements, and CalRecycle compliance.',
    badge: 'NEW',
  },
  sb1383: {
    id: 'sb1383', label: 'SB 1383 Compliance', path: '/sb1383', icon: '♻️',
    roles: [], description: 'Full SB 1383 organic waste reduction module — log entries, hauler records, annual reports.',
    badge: 'NEW',
  },

  // ── K-12 Food Safety ──
  k12Compliance: {
    id: 'k12-compliance', label: 'K-12 Food Safety', path: '/k12', icon: '🏫',
    roles: [], description: 'Audit readiness dashboard — USDA + County EH dual authority, meal metrics, NSLP claims.',
    badge: 'NEW',
  },
  usdaProductionRecords: {
    id: 'usda-production-records', label: 'USDA Production Records', path: '/usda/production-records', icon: '🏫',
    roles: [], description: 'USDA Child Nutrition Program meal production records, meal pattern compliance, and CN label tracking.',
    badge: 'NEW',
  },

  // ── Insurance ──
  insuranceRisk: {
    id: 'insurance-risk', label: 'Insurance Risk', path: '/insurance-risk', icon: '🛡️',
    roles: [], description: 'PSE insurance risk scoring, protective safeguard compliance, carrier-ready documentation, and premium reduction tracking.',
  },
  insurance: {
    id: 'insurance', label: 'Insurance', path: '/insurance', icon: '🛡️',
    roles: [], description: 'Company and vehicle insurance policies, coverage details, and roadside assistance.',
  },

  // ── Fleet ──
  fleet: {
    id: 'fleet', label: 'Fleet', path: '/fleet', icon: '🚛',
    roles: [], description: 'Vehicle inventory, maintenance schedules, registrations, and incidents.',
  },

  // ── Emergency ──
  emergencyInfo: {
    id: 'emergency-info', label: 'Emergency Info', path: '/emergency', icon: '📞',
    roles: [], description: 'Quick access to roadside assistance, insurance, and company contacts.',
  },

  // ── Availability ──
  myAvailability: {
    id: 'my-availability', label: 'My Availability', path: '/availability', icon: '📅',
    roles: [], description: 'Submit your weekly availability for scheduling.',
  },
  teamAvailability: {
    id: 'team-availability', label: 'Team Availability', path: '/availability/team', icon: '👥',
    roles: [], description: 'View and manage team availability submissions.',
  },
  availabilityApprovals: {
    id: 'availability-approvals', label: 'Availability Approvals', path: '/availability/approvals', icon: '✅',
    roles: [], description: 'Review and approve late availability submissions.',
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
  trainingRecords: {
    id: 'training-records', label: 'Training Records', path: '/dashboard/training', icon: '🎓',
    roles: [], description: 'Employee certifications, training completion, and compliance tracking per team member.',
  },
  trainingCatalog: {
    id: 'training-catalog', label: 'Training Catalog', path: '/dashboard/training-catalog', icon: '📚',
    roles: [], description: 'Library of all required and recommended training courses with certification requirements and renewal schedules.',
  },
  timecards: {
    id: 'timecards', label: 'Timecards', path: '/timecards', icon: '⏱️',
    roles: [], description: 'Clock in/out, shift tracking, timecard approval, and pay period management.',
  },
  employees: {
    id: 'employees', label: 'Employees', path: '/employees', icon: '👷',
    roles: [], description: 'Employee directory, certifications, performance tracking, and invite management.',
  },

  // ── Permissions ──
  rolesPermissions: {
    id: 'roles-permissions', label: 'Role Permissions', path: '/settings/roles-permissions', icon: '🔐',
    roles: [], description: 'Manage role-based permissions and user exceptions across your organization.',
  },

  // ── Command Center (Admin) ──
  commandCenter: {
    id: 'command-center', label: 'Command Center', path: '/admin/command-center', icon: '🎛️',
    roles: [], description: 'Platform operations health — live events, crawl status, open tickets, and system diagnostics.',
    badge: 'NEW',
  },

  // ── Demo Generator (Admin) ──
  demoGenerator: {
    id: 'demo-generator', label: 'Demo Generator', path: '/admin/demo-generator', icon: '✨',
    roles: [], description: 'Generate personalized, jurisdiction-accurate demo environments for sales prospects.',
    badge: 'NEW',
  },
  demoPipeline: {
    id: 'demo-pipeline', label: 'Demo Pipeline', path: '/admin/demos', icon: '🎯',
    roles: [], description: 'Manage prospect demo pipeline — scheduling, generation, live demos, and conversion.',
    badge: 'NEW',
  },

  // ── Assessment (Admin) ──
  assessmentLeads: {
    id: 'assessment-leads', label: 'Leads', path: '/admin/assessments', icon: '📊',
    roles: [], description: 'View and analyze compliance assessment leads, risk scores, and business impact estimates.',
    badge: 'NEW',
  },

  // ── Insurance API Keys (Admin) ──
  apiKeys: {
    id: 'api-keys', label: 'API Keys', path: '/admin/api-keys', icon: '🔑',
    roles: [], description: 'Manage insurance partner API keys, view request logs, and configure data export permissions.',
    badge: 'NEW',
  },

  // ── Integrations Hub ──
  integrations: {
    id: 'integrations', label: 'Integrations', path: '/integrations', icon: '🔌',
    roles: [], description: 'Connect EvidLY with POS, accounting, HR, IoT, insurance, and 25+ other platforms.',
  },

  // ── System (Admin) ──
  edgeFunctions: {
    id: 'edge-functions', label: 'Edge Functions', path: '/admin/system/edge-functions', icon: '⚡',
    roles: [], description: 'Health monitoring, invocation timeline, error logs, and manual invoke for all 18 Supabase Edge Functions.',
    badge: 'NEW',
  },
  crawlMonitor: {
    id: 'crawl-monitor', label: 'Crawl Monitor', path: '/admin/intelligence', icon: '🕷️',
    roles: [], description: 'Intelligence crawl health, source uptime, and execution logs from the Command Center.',
  },
  adminDashboard: {
    id: 'admin-dashboard', label: 'Admin Dashboard', path: '/admin/dashboard', icon: '📊',
    roles: [], description: 'Platform admin dashboard — crawl monitor, event log, API keys, leads, demo sessions, K2C tracking, and usage analytics.',
    badge: 'NEW',
  },

  verification: {
    id: 'verification', label: 'Verification', path: '/admin/verification', icon: '🛡️',
    roles: [], description: 'Platform-wide content verification coverage, audit log, and source health monitoring.',
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
    topLevelItems: [I.calendar],
    sections: [
      section('food-safety', 'Food Safety', '🍽️',
        'Food Safety', 'Checklists, temperature monitoring, HACCP plans, corrective actions, and incident tracking.',
        [I.checklists, I.temperatures, I.haccp, I.correctiveActions, I.foodSafetyOverview, I.incidents],
        '/food-safety',
      ),
      section('facility-safety', 'Facility Safety', '🔥',
        'Facility Safety', 'Facility safety compliance checklists, suppression system status, and fire inspection readiness.',
        [], '/facility-safety',
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Documents, inspections, insurance risk, regulatory tracking, vendor marketplace, and more.',
        [I.complianceOverview, I.deficiencies, I.documents, I.inspectorArrival, I.insuranceRisk, I.workforceRisk, I.cicPse, I.jurisdictionIntelligence, I.regulatory, I.reporting, I.selfInspection, I.mockInspection, I.services, I.vendorMarketplace],
        '/compliance',
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'Artificial Intelligence advisor, analytics, compliance trends, audit logs, benchmarks, compliance intelligence, and Internet of Things.',
        [I.aiInsights, I.copilotInsights, I.analytics, I.complianceTrends, I.auditLog, I.benchmarks, I.intelligence, I.clientIntelligence, I.clientReports, I.iotDashboard],
        '/insights',
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Self-diagnosis and inspector arrival mode.',
        [I.inspectorArrival, I.selfDiagnosis],
        '/tools',
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Equipment, Internet of Things sensors, integrations, locations, settings, team, vendors, and role permissions.',
        [I.equipment, I.fleet, I.insurance, I.myAvailability, I.teamAvailability, I.availabilityApprovals, I.integrations, I.iotSensors, I.locations, I.settings, I.rolesPermissions, I.team, I.timecards, I.employees, I.trainingRecords, I.trainingCatalog, I.vendors, I.emergencyInfo],
        '/admin',
      ),
      // System section removed — admin tools accessed via AdminShell (/admin) outside demo mode.
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
      section('food-safety', 'Food Safety', '🍽️',
        'Food Safety', 'Your assigned checklists and temperature logs.',
        [I.checklists, I.temperatures],
        '/food-safety',
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Equipment diagnosis.',
        [I.selfDiagnosis, I.emergencyInfo],
        '/tools',
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
    topLevelItems: [I.calendar],
    sections: [
      section('food-safety', 'Food Safety', '🍽️',
        'Food Safety', 'Checklists, temperature logs, HACCP plans, corrective actions, and food safety overview.',
        [I.checklists, I.temperatures, I.haccp, I.correctiveActions, I.foodSafetyOverview],
        '/food-safety',
      ),
      section('facility-safety', 'Facility Safety', '🔥',
        'Facility Safety', 'Facility safety compliance and fire inspection readiness.',
        [], '/facility-safety',
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'Artificial Intelligence-powered analysis and recommendations.',
        [I.aiInsights, I.copilotInsights],
        '/insights',
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Equipment troubleshooting.',
        [I.selfDiagnosis],
        '/tools',
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Team management and training records.',
        [I.team, I.timecards, I.employees, I.trainingRecords, I.myAvailability, I.emergencyInfo],
        '/admin',
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
    topLevelItems: [I.calendar],
    sections: [
      section('food-safety', 'Food Safety', '🍽️',
        'Food Safety', 'Checklists, temperature logs, HACCP plans, corrective actions, and food safety overview.',
        [I.checklists, I.temperatures, I.haccp, I.correctiveActions, I.foodSafetyOverview],
        '/food-safety',
      ),
      section('facility-safety', 'Facility Safety', '🔥',
        'Facility Safety', 'Facility safety compliance and fire inspection readiness.',
        [], '/facility-safety',
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Documentation, incidents, regulatory tracking, reporting, self-inspection, services, and vendor marketplace.',
        [I.complianceOverview, I.deficiencies, I.documents, I.incidents, I.regulatory, I.reporting, I.selfInspection, I.mockInspection, I.services, I.vendorMarketplace],
        '/compliance',
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'Artificial Intelligence-powered analysis, analytics, compliance trends, and recommendations.',
        [I.aiInsights, I.copilotInsights, I.analytics, I.complianceTrends],
        '/insights',
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Equipment troubleshooting.',
        [I.selfDiagnosis],
        '/tools',
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Account settings, team management, and training records.',
        [I.settings, I.team, I.timecards, I.employees, I.trainingRecords, I.myAvailability, I.teamAvailability, I.availabilityApprovals, I.emergencyInfo],
        '/admin',
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
    topLevelItems: [I.calendar],
    sections: [
      section('food-safety', 'Food Safety', '🍽️',
        'Food Safety', 'Checklists, temperature monitoring, HACCP plans, and corrective actions.',
        [I.checklists, I.temperaturesViewOnly, I.haccp, I.correctiveActions],
        '/food-safety',
      ),
      section('facility-safety', 'Facility Safety', '🔥',
        'Facility Safety', 'Facility safety compliance and fire inspection readiness.',
        [], '/facility-safety',
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Documentation, incidents, inspector view, jurisdiction intelligence, regulatory tracking, reporting, services, and vendor marketplace.',
        [I.complianceOverview, I.deficiencies, I.documents, I.incidentsViewOnly, I.inspectorArrival, I.insuranceRisk, I.workforceRisk, I.cicPse, I.jurisdictionIntelligence, I.regulatory, I.reporting, I.services, I.vendorMarketplace],
        '/compliance',
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'Artificial Intelligence-powered analysis — audit logs, compliance intelligence, and Internet of Things monitoring.',
        [I.aiInsights, I.copilotInsights, I.auditLog, I.intelligence, I.clientIntelligence, I.clientReports, I.iotDashboard],
        '/insights',
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Equipment troubleshooting tools.',
        [],
        '/tools',
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Account settings and training records.',
        [I.settings, I.timecards, I.employees, I.trainingRecords, I.emergencyInfo],
        '/admin',
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
    topLevelItems: [I.calendar],
    sections: [
      section('facility-safety', 'Facility Safety', '🔥',
        'Facility Safety', 'Facility safety compliance, incidents, and inspection readiness.',
        [I.incidents, I.correctiveActions, I.inspectorArrival], '/facility-safety',
      ),
      section('food-safety', 'Food Safety', '🍽️',
        'Food Safety', 'Checklists for daily food safety operations.',
        [I.checklists],
        '/food-safety',
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Compliance reporting, documentation, workforce risk, and vendor marketplace.',
        [I.deficiencies, I.reporting, I.workforceRisk, I.cicPse, I.vendorMarketplace],
        '/compliance',
      ),
      section('service', 'Service', '🤝',
        'Service', 'Reporting, vendor services, and vendor management.',
        [I.serviceReporting, I.services, I.vendors],
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Equipment troubleshooting.',
        [I.selfDiagnosis],
        '/tools',
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'Internet of Things sensor monitoring.',
        [I.iotDashboard],
        '/insights',
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Equipment, Internet of Things sensors, account settings, team management, and vendors.',
        [I.equipment, I.fleet, I.insurance, I.iotSensors, I.settings, I.team, I.vendors, I.myAvailability, I.teamAvailability, I.availabilityApprovals, I.emergencyInfo],
        '/admin',
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
    topLevelItems: [I.calendar],
    sections: [
      section('food-safety', 'Food Safety', '🍽️',
        'Food Safety', 'Checklists, temperature monitoring, HACCP plans, corrective actions, and food safety overview.',
        [I.checklists, I.temperatures, I.haccp, I.correctiveActions, I.foodSafetyOverview],
        '/food-safety',
      ),
      section('facility-safety', 'Facility Safety', '🔥',
        'Facility Safety', 'Facility safety compliance checklists, suppression system status, and fire inspection readiness.',
        [], '/facility-safety',
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Documents, incidents, insurance risk, regulatory tracking, reporting, self-inspection, vendor services, and vendor marketplace.',
        [I.complianceOverview, I.deficiencies, I.documents, I.incidents, I.insuranceRisk, I.workforceRisk, I.cicPse, I.jurisdictionIntelligence, I.regulatory, I.reporting, I.selfInspection, I.mockInspection, I.services, I.vendorMarketplace],
        '/compliance',
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'Artificial Intelligence-powered analysis, analytics, compliance trends, audit logs, benchmarks, compliance intelligence, and Internet of Things monitoring.',
        [I.aiInsights, I.copilotInsights, I.analytics, I.complianceTrends, I.auditLog, I.benchmarks, I.intelligence, I.clientIntelligence, I.clientReports, I.iotDashboard],
        '/insights',
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Inspector arrival mode and self-diagnosis.',
        [I.inspectorArrival, I.selfDiagnosis],
        '/tools',
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Equipment, integrations, Internet of Things sensors, locations, settings, team, vendors, and role permissions.',
        [I.equipment, I.fleet, I.insurance, I.integrations, I.iotSensors, I.locations, I.settings, I.rolesPermissions, I.team, I.timecards, I.employees, I.trainingRecords, I.trainingCatalog, I.vendors, I.teamAvailability, I.availabilityApprovals, I.emergencyInfo],
        '/admin',
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
    topLevelItems: [I.calendar],
    sections: [
      section('food-safety', 'Food Safety', '🍽️',
        'Food Safety', 'Food safety scoring and compliance overview.',
        [I.foodSafetyOverview],
        '/food-safety',
      ),
      section('facility-safety', 'Facility Safety', '🔥',
        'Facility Safety', 'Facility safety compliance and fire inspection readiness.',
        [], '/facility-safety',
      ),
      section('insights', 'Insights', '💡',
        'Insights', 'Artificial Intelligence-powered analysis — analytics, compliance trends, audit logs, benchmarks, compliance intelligence, and Internet of Things monitoring.',
        [I.aiInsights, I.copilotInsights, I.analytics, I.complianceTrends, I.auditLog, I.benchmarks, I.intelligence, I.clientIntelligence, I.clientReports, I.iotDashboard],
        '/insights',
      ),
      section('compliance', 'Compliance', '📋',
        'Compliance', 'Incidents, insurance risk, Know Your Inspector, regulatory tracking, compliance reporting, vendor services, and vendor marketplace.',
        [I.complianceOverview, I.correctiveActions, I.deficiencies, I.incidentsViewOnly, I.insuranceRisk, I.workforceRisk, I.cicPse, I.jurisdictionIntelligence, I.regulatory, I.reporting, I.services, I.vendorMarketplace],
        '/compliance',
      ),
      section('tools', 'Tools', '🔧',
        'Tools', 'Inspector arrival mode and operational tools.',
        [],
        '/tools',
      ),
      section('administration', 'Administration', '⚙️',
        'Administration', 'Account settings, integrations, role permissions, and training records.',
        [I.fleet, I.insurance, I.integrations, I.settings, I.rolesPermissions, I.timecards, I.employees, I.trainingRecords, I.teamAvailability, I.availabilityApprovals, I.emergencyInfo],
        '/admin',
      ),
      section('help', 'Help', '❓',
        'Help', 'Documentation, support, and contact options.',
        [], '/help',
      ),
    ],
  },
};

// ── Org-Type Section Overlays ────────────────────────────
// Additional sidebar sections injected when the org matches a specific industry type.
// Appended before the 'administration' section (or at the end if none).

interface OrgTypeSectionOverlay {
  orgTypes: string[];
  roles: UserRole[];
  section: SidebarSection;
}

const ORG_TYPE_OVERLAYS: OrgTypeSectionOverlay[] = [
  {
    orgTypes: ['RESTAURANT', 'HEALTHCARE', 'SENIOR_LIVING', 'K12_EDUCATION', 'HIGHER_EDUCATION'],
    roles: ['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'kitchen_manager'],
    section: section('food-recovery', 'Food Recovery', '♻️',
      'Food Recovery (SB 1383)',
      'Organic waste diversion tracking, food recovery agreements, and CalRecycle SB 1383 compliance.',
      [I.foodRecovery, I.sb1383],
    ),
  },
  {
    orgTypes: ['K12_EDUCATION'],
    roles: ['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'chef'],
    section: section('usda-k12', 'K-12 Food Safety', '🏫',
      'K-12 Food Safety & USDA',
      'Audit readiness, dual authority dashboard, meal metrics, NSLP claims, and USDA production records.',
      [I.k12Compliance, I.usdaProductionRecords],
    ),
  },
];

// ── Public API ───────────────────────────────────────────

/** Get the full sidebar configuration for a role, optionally filtered by org type */
export function getRoleConfig(role: UserRole, orgType?: string | null): RoleSidebarConfig {
  const base = ROLE_CONFIGS[role];
  if (!orgType) return base;

  const extraSections = ORG_TYPE_OVERLAYS
    .filter(o => o.orgTypes.includes(orgType) && o.roles.includes(role))
    .map(o => o.section);

  if (extraSections.length === 0) return base;

  // Insert before 'administration' and 'help' sections
  const adminIdx = base.sections.findIndex(s => s.id === 'administration');
  const insertIdx = adminIdx >= 0 ? adminIdx : base.sections.length;

  return {
    ...base,
    sections: [
      ...base.sections.slice(0, insertIdx),
      ...extraSections,
      ...base.sections.slice(insertIdx),
    ],
  };
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
export const getSectionsForRole = (role: string, orgType?: string | null): SidebarSection[] => {
  const config = getRoleConfig(role as UserRole, orgType);
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
    description: 'Equipment, vendors, facility safety, and maintenance alerts',
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
