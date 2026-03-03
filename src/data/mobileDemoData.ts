import type { UserRole } from '../contexts/RoleContext';

// ── Types ────────────────────────────────────────────────────

export interface MobileQuickAction {
  id: string;
  label: string;
  icon: string;
  path: string;
}

export interface MobileAlert {
  id: string;
  text: string;
  type: 'critical' | 'warning' | 'success' | 'info';
  path: string;
}

export interface MobileTask {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  status: 'due' | 'upcoming';
  time: string;
  path?: string;
}

export interface MobileNavTab {
  id: string;
  label: string;
  icon: string;
  path: string;
}

export interface MobileRoleData {
  greeting: string;
  roleLabel: string;
  quickActions: MobileQuickAction[];
  alerts: MobileAlert[];
  tasks: MobileTask[];
  bottomNav: MobileNavTab[];
}

// ── Helpers ──────────────────────────────────────────────────

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getGreeting(name: string): string {
  return `${getTimeGreeting()}, ${name.split(' ')[0]}`;
}

// ── Role Data ────────────────────────────────────────────────

const ownerOperator: MobileRoleData = {
  greeting: 'Maria',
  roleLabel: 'Owner / Operator',
  quickActions: [
    { id: 'scores', label: 'Scores', icon: '📊', path: '/scoring-breakdown' },
    { id: 'locations', label: 'Locations', icon: '📍', path: '/org-hierarchy' },
    { id: 'reports', label: 'Reports', icon: '📄', path: '/reports' },
    { id: 'alerts', label: 'Alerts', icon: '🔔', path: '/action-items' },
  ],
  alerts: [
    { id: 'a1', text: 'University Dining dropped below 75% — corrective action needed', type: 'critical', path: '/scoring-breakdown?location=university' },
    { id: 'a2', text: 'Annual fire inspection due in 21 days at Downtown Kitchen', type: 'warning', path: '/facility-safety' },
    { id: 'a3', text: '3 locations operating above 85% compliance this week', type: 'success', path: '/scoring-breakdown' },
  ],
  tasks: [
    { id: 't1', title: 'Review Compliance Dashboard', subtitle: 'All 3 Locations', icon: '📊', status: 'due', time: 'Daily review' },
    { id: 't2', title: 'Approve Corrective Action Plan', subtitle: 'University Dining — Critical violations', icon: '✅', status: 'due', time: 'Due today' },
    { id: 't3', title: 'Review Vendor Invoices', subtitle: 'Hood cleaning + Fire suppression', icon: '💰', status: 'due', time: '3 pending' },
    { id: 't4', title: 'Sign Off Inspection Report', subtitle: 'Airport Cafe — Fire marshal visit', icon: '📝', status: 'upcoming', time: 'Due tomorrow' },
    { id: 't5', title: 'Review Monthly Trend Report', subtitle: 'All locations — Feb summary', icon: '📈', status: 'upcoming', time: 'Due this week' },
    { id: 't6', title: 'Renew Insurance Documentation', subtitle: 'Business liability — expiring', icon: '📋', status: 'upcoming', time: 'Due in 14 days' },
  ],
  bottomNav: [
    { id: 'tasks', label: 'Tasks', icon: '✓', path: '/dashboard' },
    { id: 'scores', label: 'Scores', icon: '📊', path: '/scoring-breakdown' },
    { id: 'sites', label: 'Sites', icon: '📍', path: '/org-hierarchy' },
    { id: 'more', label: 'More', icon: '☰', path: '#more' },
  ],
};

const executive: MobileRoleData = {
  greeting: 'James',
  roleLabel: 'Executive',
  quickActions: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
    { id: 'reports', label: 'Reports', icon: '📄', path: '/reports' },
    { id: 'trends', label: 'Trends', icon: '📈', path: '/copilot-insights' },
    { id: 'export', label: 'Export', icon: '📥', path: '/reports' },
  ],
  alerts: [
    { id: 'a1', text: 'Q1 compliance average: 81% across all locations', type: 'info', path: '/scoring-breakdown' },
    { id: 'a2', text: '2 locations flagged for reinspection this month', type: 'warning', path: '/action-items' },
  ],
  tasks: [
    { id: 't1', title: 'Review Multi-Location Summary', subtitle: 'All locations — weekly rollup', icon: '📊', status: 'due', time: 'Weekly review' },
    { id: 't2', title: 'Compliance Trend Analysis', subtitle: 'Month-over-month comparison', icon: '📈', status: 'due', time: 'Due today' },
    { id: 't3', title: 'Review Incident Summary', subtitle: '3 incidents this week', icon: '⚠️', status: 'due', time: '3 open' },
    { id: 't4', title: 'Approve Budget for Services', subtitle: 'Fire suppression contract renewal', icon: '💰', status: 'upcoming', time: 'Due Friday' },
    { id: 't5', title: 'Board Report Prep', subtitle: 'Quarterly compliance summary', icon: '📄', status: 'upcoming', time: 'Due next week' },
  ],
  bottomNav: [
    { id: 'tasks', label: 'Tasks', icon: '✓', path: '/dashboard' },
    { id: 'reports', label: 'Reports', icon: '📄', path: '/reports' },
    { id: 'trends', label: 'Trends', icon: '📈', path: '/copilot-insights' },
    { id: 'more', label: 'More', icon: '☰', path: '#more' },
  ],
};

const complianceManager: MobileRoleData = {
  greeting: 'Sofia',
  roleLabel: 'Compliance Officer',
  quickActions: [
    { id: 'audit', label: 'Audit', icon: '🔍', path: '/self-diagnosis' },
    { id: 'upload', label: 'Upload Doc', icon: '📄', path: '/documents' },
    { id: 'violations', label: 'Violations', icon: '⚠️', path: '/action-items' },
    { id: 'inspection', label: 'Inspection', icon: '📋', path: '/inspection-readiness' },
  ],
  alerts: [
    { id: 'a1', text: 'Health dept inspection scheduled — Airport Cafe, March 8', type: 'critical', path: '/inspection-readiness' },
    { id: 'a2', text: '4 documents expiring within 30 days', type: 'warning', path: '/documents' },
    { id: 'a3', text: 'CalCode §113948 deadline: 2 staff need food handler certs', type: 'warning', path: '/dashboard/training' },
  ],
  tasks: [
    { id: 't1', title: 'Pre-Inspection Checklist', subtitle: 'Airport Cafe — Health dept March 8', icon: '🔍', status: 'due', time: '5 days away' },
    { id: 't2', title: 'Review Self-Inspection Results', subtitle: 'Downtown Kitchen — completed yesterday', icon: '📋', status: 'due', time: 'Needs review' },
    { id: 't3', title: 'Upload Fire Inspection Cert', subtitle: 'Airport Cafe — received today', icon: '📄', status: 'due', time: 'Upload now' },
    { id: 't4', title: 'Verify Food Handler Certs', subtitle: '2 staff past 30-day deadline', icon: '🎓', status: 'due', time: 'Overdue' },
    { id: 't5', title: 'Track Corrective Actions', subtitle: 'University Dining — 3 open CAPAs', icon: '🔧', status: 'upcoming', time: 'Follow up' },
    { id: 't6', title: 'Review Jurisdiction Updates', subtitle: 'Fresno County — new requirements', icon: '📜', status: 'upcoming', time: 'This week' },
    { id: 't7', title: 'Generate Chain of Custody', subtitle: 'Monthly compliance report', icon: '🔗', status: 'upcoming', time: 'Due March 7' },
  ],
  bottomNav: [
    { id: 'tasks', label: 'Tasks', icon: '✓', path: '/dashboard' },
    { id: 'docs', label: 'Docs', icon: '📄', path: '/documents' },
    { id: 'inspect', label: 'Inspect', icon: '🔍', path: '/inspection-readiness' },
    { id: 'more', label: 'More', icon: '☰', path: '#more' },
  ],
};

const facilitiesManager: MobileRoleData = {
  greeting: 'Michael',
  roleLabel: 'Facilities Manager',
  quickActions: [
    { id: 'schedule', label: 'Schedule', icon: '📅', path: '/calendar' },
    { id: 'upload', label: 'Upload Doc', icon: '📄', path: '/documents' },
    { id: 'vendors', label: 'Vendors', icon: '🤝', path: '/vendors' },
    { id: 'report', label: 'Report Issue', icon: '🔧', path: '/incidents' },
  ],
  alerts: [
    { id: 'a1', text: 'Hood cleaning overdue by 2 weeks — NFPA 96 Table 12.4', type: 'critical', path: '/facility-safety' },
    { id: 'a2', text: 'Fire extinguisher 6-year maintenance due', type: 'warning', path: '/equipment' },
    { id: 'a3', text: 'Pest control contract expires in 30 days', type: 'warning', path: '/vendors' },
  ],
  tasks: [
    { id: 't1', title: 'Schedule Hood Cleaning', subtitle: 'Kitchen exhaust — 2 weeks overdue', icon: '🔥', status: 'due', time: 'Overdue' },
    { id: 't2', title: 'Fire Extinguisher Inspection', subtitle: '6 units — annual service due', icon: '🧯', status: 'due', time: 'Due this week' },
    { id: 't3', title: 'Upload Ansul Certificate', subtitle: 'Suppression system — inspected yesterday', icon: '📄', status: 'due', time: 'Upload now' },
    { id: 't4', title: 'Grease Trap Service', subtitle: 'Quarterly pump — vendor confirmed', icon: '🔧', status: 'due', time: 'Scheduled today' },
    { id: 't5', title: 'Renew Pest Control Contract', subtitle: 'Expires in 30 days', icon: '🐛', status: 'upcoming', time: 'Due in 30 days' },
    { id: 't6', title: 'Backflow Prevention Test', subtitle: 'Annual certification required', icon: '💧', status: 'upcoming', time: 'Due April 1' },
    { id: 't7', title: 'Elevator Inspection', subtitle: 'Annual state inspection', icon: '🛗', status: 'upcoming', time: 'Due June' },
  ],
  bottomNav: [
    { id: 'tasks', label: 'Tasks', icon: '✓', path: '/dashboard' },
    { id: 'vendors', label: 'Vendors', icon: '🤝', path: '/vendors' },
    { id: 'equip', label: 'Equip', icon: '🔧', path: '/equipment' },
    { id: 'more', label: 'More', icon: '☰', path: '#more' },
  ],
};

const chef: MobileRoleData = {
  greeting: 'Ana',
  roleLabel: 'Chef',
  quickActions: [
    { id: 'temp', label: 'Log Temp', icon: '🌡️', path: '/temp-logs' },
    { id: 'checklist', label: 'Checklist', icon: '📋', path: '/checklists' },
    { id: 'receiving', label: 'Receiving', icon: '📦', path: '/receiving' },
    { id: 'report', label: 'Report Issue', icon: '🔧', path: '/incidents' },
  ],
  alerts: [
    { id: 'a1', text: 'Walk-in cooler #1 reading 43°F — above 41°F threshold', type: 'critical', path: '/temp-logs' },
    { id: 'a2', text: '2 staff food handler certs expiring this month', type: 'warning', path: '/dashboard/training' },
  ],
  tasks: [
    { id: 't1', title: 'Walk-in Cooler Temp Check', subtitle: 'Unit #1 — reading high (43°F)', icon: '🌡️', status: 'due', time: 'URGENT' },
    { id: 't2', title: 'Opening Food Safety Check', subtitle: 'Kitchen prep areas + stations', icon: '📋', status: 'due', time: 'Due 6:00 AM' },
    { id: 't3', title: 'Receiving Inspection', subtitle: 'Sysco delivery — verify temps', icon: '📦', status: 'due', time: 'Arriving 7:30 AM' },
    { id: 't4', title: 'Hot Hold Station Temps', subtitle: 'Service line — lunch prep', icon: '🌡️', status: 'due', time: 'Due 10:30 AM' },
    { id: 't5', title: 'Staff Handwashing Audit', subtitle: 'Observe and document', icon: '🧼', status: 'upcoming', time: 'Midday' },
    { id: 't6', title: 'Cooling Log — Soup Batch', subtitle: 'Must reach 41°F within 6 hours', icon: '❄️', status: 'upcoming', time: 'Started 2:00 PM' },
    { id: 't7', title: 'Closing Food Safety Check', subtitle: 'Full kitchen walkthrough', icon: '📋', status: 'upcoming', time: 'Due 9:00 PM' },
  ],
  bottomNav: [
    { id: 'tasks', label: 'Tasks', icon: '✓', path: '/dashboard' },
    { id: 'temps', label: 'Temps', icon: '🌡️', path: '/temp-logs' },
    { id: 'team', label: 'Team', icon: '👥', path: '/team' },
    { id: 'more', label: 'More', icon: '☰', path: '#more' },
  ],
};

const kitchenManager: MobileRoleData = {
  greeting: 'David',
  roleLabel: 'Kitchen Manager',
  quickActions: [
    { id: 'temp', label: 'Log Temp', icon: '🌡️', path: '/temp-logs' },
    { id: 'checklist', label: 'Checklist', icon: '📋', path: '/checklists' },
    { id: 'upload', label: 'Upload Doc', icon: '📄', path: '/documents' },
    { id: 'report', label: 'Report Issue', icon: '🔧', path: '/incidents' },
  ],
  alerts: [
    { id: 'a1', text: '3 of 12 staff missing food handler certification', type: 'critical', path: '/dashboard/training' },
    { id: 'a2', text: 'Midday checklist incomplete — 2 hours overdue', type: 'warning', path: '/checklists' },
  ],
  tasks: [
    { id: 't1', title: 'Opening Checklist', subtitle: 'Kitchen prep + cold storage', icon: '📋', status: 'due', time: 'Due 6:00 AM' },
    { id: 't2', title: 'Walk-in Cooler Temps', subtitle: 'Cooler #1 + #2', icon: '🌡️', status: 'due', time: 'Due 6:30 AM' },
    { id: 't3', title: 'Verify Staff Certs', subtitle: '3 staff past 30-day deadline', icon: '🎓', status: 'due', time: 'Overdue' },
    { id: 't4', title: 'Assign Midday Tasks', subtitle: 'Delegate to kitchen staff', icon: '👥', status: 'due', time: 'Before 11 AM' },
    { id: 't5', title: 'Review Incident Report', subtitle: 'Slip-and-fall — filed yesterday', icon: '📝', status: 'upcoming', time: 'Needs response' },
    { id: 't6', title: 'Prep Area Temps', subtitle: 'All prep stations', icon: '🌡️', status: 'upcoming', time: 'Due 2:00 PM' },
    { id: 't7', title: 'Closing Checklist', subtitle: 'Full kitchen + walk-ins', icon: '📋', status: 'upcoming', time: 'Due 9:00 PM' },
    { id: 't8', title: 'Weekly Staff Schedule', subtitle: "Next week's assignments", icon: '📅', status: 'upcoming', time: 'Due Friday' },
  ],
  bottomNav: [
    { id: 'tasks', label: 'Tasks', icon: '✓', path: '/dashboard' },
    { id: 'temps', label: 'Temps', icon: '🌡️', path: '/temp-logs' },
    { id: 'staff', label: 'Staff', icon: '👥', path: '/team' },
    { id: 'more', label: 'More', icon: '☰', path: '#more' },
  ],
};

const kitchenStaff: MobileRoleData = {
  greeting: 'Lisa',
  roleLabel: 'Kitchen Staff',
  quickActions: [
    { id: 'temp', label: 'Log Temp', icon: '🌡️', path: '/temp-logs' },
    { id: 'checklist', label: 'Checklist', icon: '📋', path: '/checklists' },
    { id: 'upload', label: 'Upload Doc', icon: '📄', path: '/documents' },
    { id: 'report', label: 'Report Issue', icon: '🔧', path: '/incidents' },
  ],
  alerts: [
    { id: 'a1', text: 'Your food handler cert expires in 12 days — renew now', type: 'warning', path: '/dashboard/training' },
  ],
  tasks: [
    { id: 't1', title: 'Opening Checklist', subtitle: 'Kitchen Prep Area', icon: '📋', status: 'due', time: 'Due 6:00 AM' },
    { id: 't2', title: 'Walk-in Cooler Temp', subtitle: 'Unit #1 — Cold Storage', icon: '🌡️', status: 'due', time: 'Due 6:30 AM' },
    { id: 't3', title: 'Walk-in Freezer Temp', subtitle: 'Unit #2 — Cold Storage', icon: '🌡️', status: 'due', time: 'Due 6:30 AM' },
    { id: 't4', title: 'Hot Hold Station Check', subtitle: 'Service Line', icon: '🌡️', status: 'upcoming', time: 'Due 10:30 AM' },
    { id: 't5', title: 'Midday Checklist', subtitle: 'Kitchen & Front of House', icon: '📋', status: 'upcoming', time: 'Due 12:00 PM' },
    { id: 't6', title: 'Receiving Temp Log', subtitle: 'Loading Dock', icon: '📦', status: 'upcoming', time: 'When delivery arrives' },
    { id: 't7', title: 'Closing Checklist', subtitle: 'Full Kitchen', icon: '📋', status: 'upcoming', time: 'Due 9:00 PM' },
  ],
  bottomNav: [
    { id: 'tasks', label: 'Tasks', icon: '✓', path: '/dashboard' },
    { id: 'temps', label: 'Temps', icon: '🌡️', path: '/temp-logs' },
    { id: 'docs', label: 'Docs', icon: '📄', path: '/documents' },
    { id: 'more', label: 'More', icon: '☰', path: '#more' },
  ],
};

// ── Export ────────────────────────────────────────────────────

export const MOBILE_DEMO_DATA: Record<UserRole, MobileRoleData> = {
  platform_admin: ownerOperator, // mirrors owner
  owner_operator: ownerOperator,
  executive,
  compliance_manager: complianceManager,
  chef,
  facilities_manager: facilitiesManager,
  kitchen_manager: kitchenManager,
  kitchen_staff: kitchenStaff,
};
