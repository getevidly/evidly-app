import type { UserRole } from '../contexts/RoleContext';
import type { MobileQuickAction, MobileNavTab } from '../data/mobileDemoData';

// ── Quick Actions per Role ──────────────────────────────────

export function getMobileQuickActions(role: UserRole): MobileQuickAction[] {
  switch (role) {
    case 'platform_admin':
    case 'owner_operator':
      return [
        { id: 'scores', label: 'Scores', icon: '📊', path: '/scoring-breakdown' },
        { id: 'locations', label: 'Locations', icon: '📍', path: '/org-hierarchy' },
        { id: 'reports', label: 'Reports', icon: '📄', path: '/reports' },
        { id: 'alerts', label: 'Alerts', icon: '🔔', path: '/action-items' },
      ];
    case 'executive':
      return [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
        { id: 'reports', label: 'Reports', icon: '📄', path: '/reports' },
        { id: 'trends', label: 'Trends', icon: '📈', path: '/copilot-insights' },
        { id: 'export', label: 'Export', icon: '📥', path: '/reports' },
      ];
    case 'compliance_manager':
      return [
        { id: 'audit', label: 'Audit', icon: '🔍', path: '/self-diagnosis' },
        { id: 'upload', label: 'Upload Doc', icon: '📄', path: '/documents' },
        { id: 'violations', label: 'Violations', icon: '⚠️', path: '/action-items' },
        { id: 'inspection', label: 'Inspection', icon: '📋', path: '/reports/inspection-readiness' },
      ];
    case 'facilities_manager':
      return [
        { id: 'schedule', label: 'Schedule', icon: '📅', path: '/calendar' },
        { id: 'upload', label: 'Upload Doc', icon: '📄', path: '/documents' },
        { id: 'vendors', label: 'Vendors', icon: '🤝', path: '/vendors' },
        { id: 'report', label: 'Report Issue', icon: '🔧', path: '/incidents' },
      ];
    case 'chef':
      return [
        { id: 'temp', label: 'Log Temp', icon: '🌡️', path: '/temp-logs' },
        { id: 'checklist', label: 'Checklist', icon: '📋', path: '/checklists' },
        { id: 'receiving', label: 'Receiving', icon: '📦', path: '/receiving' },
        { id: 'report', label: 'Report Issue', icon: '🔧', path: '/incidents' },
      ];
    case 'kitchen_manager':
      return [
        { id: 'temp', label: 'Log Temp', icon: '🌡️', path: '/temp-logs' },
        { id: 'checklist', label: 'Checklist', icon: '📋', path: '/checklists' },
        { id: 'upload', label: 'Upload Doc', icon: '📄', path: '/documents' },
        { id: 'report', label: 'Report Issue', icon: '🔧', path: '/incidents' },
      ];
    case 'kitchen_staff':
      return [
        { id: 'temp', label: 'Log Temp', icon: '🌡️', path: '/temp-logs' },
        { id: 'checklist', label: 'Checklist', icon: '📋', path: '/checklists' },
        { id: 'upload', label: 'Upload Doc', icon: '📄', path: '/documents' },
        { id: 'report', label: 'Report Issue', icon: '🔧', path: '/incidents' },
      ];
  }
}

// ── Bottom Nav per Role ─────────────────────────────────────

export function getMobileBottomNav(role: UserRole): MobileNavTab[] {
  switch (role) {
    case 'platform_admin':
    case 'owner_operator':
      return [
        { id: 'tasks', label: 'Tasks', icon: '✓', path: '/dashboard' },
        { id: 'scores', label: 'Scores', icon: '📊', path: '/scoring-breakdown' },
        { id: 'sites', label: 'Sites', icon: '📍', path: '/org-hierarchy' },
        { id: 'more', label: 'More', icon: '☰', path: '#more' },
      ];
    case 'executive':
      return [
        { id: 'tasks', label: 'Tasks', icon: '✓', path: '/dashboard' },
        { id: 'reports', label: 'Reports', icon: '📄', path: '/reports' },
        { id: 'trends', label: 'Trends', icon: '📈', path: '/copilot-insights' },
        { id: 'more', label: 'More', icon: '☰', path: '#more' },
      ];
    case 'compliance_manager':
      return [
        { id: 'tasks', label: 'Tasks', icon: '✓', path: '/dashboard' },
        { id: 'docs', label: 'Docs', icon: '📄', path: '/documents' },
        { id: 'inspect', label: 'Inspect', icon: '🔍', path: '/reports/inspection-readiness' },
        { id: 'more', label: 'More', icon: '☰', path: '#more' },
      ];
    case 'facilities_manager':
      return [
        { id: 'tasks', label: 'Tasks', icon: '✓', path: '/dashboard' },
        { id: 'vendors', label: 'Vendors', icon: '🤝', path: '/vendors' },
        { id: 'equip', label: 'Equip', icon: '🔧', path: '/equipment' },
        { id: 'more', label: 'More', icon: '☰', path: '#more' },
      ];
    case 'chef':
      return [
        { id: 'tasks', label: 'Tasks', icon: '✓', path: '/dashboard' },
        { id: 'temps', label: 'Temps', icon: '🌡️', path: '/temp-logs' },
        { id: 'team', label: 'Team', icon: '👥', path: '/team' },
        { id: 'more', label: 'More', icon: '☰', path: '#more' },
      ];
    case 'kitchen_manager':
      return [
        { id: 'tasks', label: 'Tasks', icon: '✓', path: '/dashboard' },
        { id: 'temps', label: 'Temps', icon: '🌡️', path: '/temp-logs' },
        { id: 'staff', label: 'Staff', icon: '👥', path: '/team' },
        { id: 'more', label: 'More', icon: '☰', path: '#more' },
      ];
    case 'kitchen_staff':
      return [
        { id: 'tasks', label: 'Tasks', icon: '✓', path: '/dashboard' },
        { id: 'temps', label: 'Temps', icon: '🌡️', path: '/temp-logs' },
        { id: 'docs', label: 'Docs', icon: '📄', path: '/documents' },
        { id: 'more', label: 'More', icon: '☰', path: '#more' },
      ];
  }
}

// ── Role Labels ─────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  platform_admin: 'Platform Admin',
  owner_operator: 'Owner / Operator',
  executive: 'Executive',
  compliance_manager: 'Compliance Officer',
  chef: 'Chef',
  facilities_manager: 'Facilities Manager',
  kitchen_manager: 'Kitchen Manager',
  kitchen_staff: 'Kitchen Staff',
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}
