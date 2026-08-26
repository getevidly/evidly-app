import type { UserRole } from '../contexts/RoleContext';
import type { MobileQuickAction } from '../data/mobileDemoData';

// ── Quick Actions per Role ──────────────────────────────────

export function getMobileQuickActions(role: UserRole): MobileQuickAction[] {
  switch (role) {
    case 'platform_admin':
    case 'owner_operator':
      return [
        { id: 'scores', label: 'Scores', icon: '📊', path: '/scoring-breakdown' },
        { id: 'locations', label: 'Locations', icon: '📍', path: '/org-hierarchy' },
        // POST-LAUNCH: Reports hidden — backend not built. Restore when wired.
        // { id: 'reports', label: 'Reports', icon: '📄', path: '/reports' },      ];
    case 'executive':
      return [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
        // POST-LAUNCH: Reports hidden — backend not built. Restore when wired.
        // { id: 'reports', label: 'Reports', icon: '📄', path: '/reports' },
        // { id: 'export', label: 'Export', icon: '📥', path: '/reports' },
      ];
    case 'compliance_manager':
      return [
        { id: 'audit', label: 'Audit', icon: '🔍', path: '/self-diagnosis' },
        { id: 'upload', label: 'Upload Doc', icon: '📄', path: '/documents' },        // POST-LAUNCH: Reports hidden — backend not built. Restore when wired.
        // { id: 'inspection', label: 'Inspection', icon: '📋', path: '/reports/inspection-readiness' },
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
