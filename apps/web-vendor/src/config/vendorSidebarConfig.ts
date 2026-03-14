/**
 * HoodOps Vendor Sidebar Configuration
 */
import type { NavItem, SidebarSection, RoleSidebarConfig, RoleHomeItem } from '@shared/config/sidebarConfig';

const I: Record<string, NavItem> = {
  schedule: { id: 'schedule', label: 'Schedule', path: '/schedule', icon: '📅', roles: [], description: 'Service job scheduling.' },
  fleet: { id: 'fleet', label: 'Fleet', path: '/fleet', icon: '🚛', roles: [], description: 'Vehicle inventory and maintenance.' },
  insurance: { id: 'insurance', label: 'Insurance', path: '/insurance', icon: '🛡️', roles: [], description: 'Insurance policies and coverage.' },
  emergencyInfo: { id: 'emergency-info', label: 'Emergency Info', path: '/emergency', icon: '📞', roles: [], description: 'Roadside assistance and contacts.' },
  timecards: { id: 'timecards', label: 'Timecards', path: '/timecards', icon: '⏱️', roles: [], description: 'Clock in/out and shift tracking.' },
  timecardAlterations: { id: 'timecard-alterations', label: 'Timecard Alterations', path: '/timecards/alterations', icon: '📝', roles: [], description: 'Timecard modification audit trail.' },
  employees: { id: 'employees', label: 'Employees', path: '/employees', icon: '👷', roles: [], description: 'Employee directory and certifications.' },
  bonuses: { id: 'bonuses', label: 'Bonus Management', path: '/bonuses', icon: '💰', roles: [], description: 'Bonus calculations and payouts.' },
  performanceMetrics: { id: 'performance-metrics', label: 'Performance Metrics', path: '/performance', icon: '🎯', roles: [], description: 'QA rates and bonus multipliers.' },
  myPerformance: { id: 'my-performance', label: 'My Performance', path: '/performance/me', icon: '📊', roles: [], description: 'Personal performance metrics.' },
  callbacks: { id: 'callbacks', label: 'Callbacks', path: '/quality/callbacks', icon: '🔄', roles: [], description: 'Job callback tracking.' },
  inventory: { id: 'inventory', label: 'Inventory', path: '/inventory', icon: '📦', roles: [], description: 'Stock levels and usage.' },
  equipment: { id: 'equipment', label: 'Equipment', path: '/equipment', icon: '⚙️', roles: [], description: 'Equipment asset register.' },
  equipmentIncidents: { id: 'equipment-incidents', label: 'Equipment Incidents', path: '/equipment/incidents', icon: '⚠️', roles: [], description: 'Equipment damage and loss reports.' },
  deficiencies: { id: 'deficiencies', label: 'Deficiencies', path: '/deficiencies', icon: '⚠️', roles: [], description: 'Compliance violation tracking.' },
  safetyIncidents: { id: 'safety-incidents', label: 'Safety Incidents', path: '/safety/incidents', icon: '🛡️', roles: [], description: 'Injury and near-miss reports.' },
  myAvailability: { id: 'my-availability', label: 'My Availability', path: '/availability', icon: '📅', roles: [], description: 'Submit availability.' },
  teamAvailability: { id: 'team-availability', label: 'Team Availability', path: '/availability/team', icon: '👥', roles: [], description: 'Manage team availability.' },
  availabilityApprovals: { id: 'availability-approvals', label: 'Availability Approvals', path: '/availability/approvals', icon: '✅', roles: [], description: 'Approve late submissions.' },
  clockReminders: { id: 'clock-reminders', label: 'Clock & Attendance', path: '/settings/clock-reminders', icon: '⏰', roles: [], description: 'Clock-in/out reminders.' },
  reports: { id: 'reports', label: 'Reports', path: '/reports', icon: '📊', roles: [], description: 'Operational reports.' },
  leaderboard: { id: 'leaderboard', label: 'Leaderboard', path: '/leaderboard', icon: '🏆', roles: [], description: 'Performance rankings.' },
  settings: { id: 'settings', label: 'Settings', path: '/settings', icon: '⚙️', roles: [], description: 'Company settings.' },
};

function section(id: string, label: string, icon: string, tt: string, td: string, items: NavItem[], path?: string): SidebarSection {
  return { id, label, icon, roles: [], tooltipTitle: tt, tooltipDescription: td, items, ...(path ? { path } : {}) };
}

const VENDOR_HOME: RoleHomeItem = {
  label: 'Dashboard', labelEs: 'Panel de Control', path: '/dashboard', icon: 'LayoutDashboard',
  description: 'Service provider operations dashboard', descriptionEs: 'Panel de operaciones',
};

const ROLE_CONFIGS: Record<string, RoleSidebarConfig> = {
  vendor_admin: { home: VENDOR_HOME, sections: [
    section('operations', 'Operations', '📋', 'Operations', 'Schedule, timecards, employees.', [I.schedule, I.timecards, I.timecardAlterations, I.employees, I.leaderboard]),
    section('performance', 'Performance', '🎯', 'Performance', 'Bonuses and quality.', [I.bonuses, I.performanceMetrics, I.callbacks]),
    section('assets', 'Assets', '📦', 'Assets', 'Equipment, inventory, fleet.', [I.equipment, I.equipmentIncidents, I.inventory, I.fleet, I.insurance]),
    section('compliance', 'Compliance', '⚠️', 'Compliance', 'Deficiencies and safety.', [I.deficiencies, I.safetyIncidents]),
    section('team', 'Team', '👥', 'Team', 'Availability management.', [I.myAvailability, I.teamAvailability, I.availabilityApprovals]),
    section('reports', 'Reports', '📊', 'Reports', 'Operational reports.', [I.reports]),
    section('admin', 'Administration', '⚙️', 'Admin', 'Settings and config.', [I.settings, I.clockReminders, I.emergencyInfo]),
  ]},
  hood_technician: { home: VENDOR_HOME, sections: [
    section('operations', 'Operations', '📋', 'Operations', 'Schedule and timecards.', [I.schedule, I.timecards, I.leaderboard]),
    section('performance', 'Performance', '🎯', 'Performance', 'Your performance.', [I.myPerformance, I.callbacks]),
    section('assets', 'Assets', '📦', 'Assets', 'Equipment and inventory.', [I.equipment, I.equipmentIncidents, I.inventory]),
    section('compliance', 'Compliance', '⚠️', 'Compliance', 'Deficiencies and safety.', [I.deficiencies, I.safetyIncidents]),
    section('team', 'Team', '👥', 'Team', 'Your availability.', [I.myAvailability]),
    section('tools', 'Tools', '🔧', 'Tools', 'Emergency info.', [I.emergencyInfo]),
  ]},
  owner_operator: { home: VENDOR_HOME, sections: [
    section('operations', 'Operations', '📋', 'Operations', 'Schedule, timecards, employees.', [I.schedule, I.timecards, I.timecardAlterations, I.employees, I.leaderboard]),
    section('performance', 'Performance', '🎯', 'Performance', 'Bonuses and quality.', [I.bonuses, I.performanceMetrics, I.callbacks]),
    section('assets', 'Assets', '📦', 'Assets', 'Equipment, inventory, fleet.', [I.equipment, I.equipmentIncidents, I.inventory, I.fleet, I.insurance]),
    section('compliance', 'Compliance', '⚠️', 'Compliance', 'Deficiencies and safety.', [I.deficiencies, I.safetyIncidents]),
    section('team', 'Team', '👥', 'Team', 'Availability management.', [I.myAvailability, I.teamAvailability, I.availabilityApprovals]),
    section('reports', 'Reports', '📊', 'Reports', 'Operational reports.', [I.reports]),
    section('admin', 'Administration', '⚙️', 'Admin', 'Settings and config.', [I.settings, I.clockReminders, I.emergencyInfo]),
  ]},
};

export function getVendorRoleConfig(role: string): RoleSidebarConfig {
  return ROLE_CONFIGS[role] || ROLE_CONFIGS.vendor_admin;
}

export { I as VENDOR_NAV_ITEMS };
