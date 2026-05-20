import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';
import type { UserRole } from '../../contexts/RoleContext';

interface ActionDef {
  key: string;
  label: string;
  icon: string;
  route: string;
}

const ACTION_DEFS: Record<string, ActionDef> = {
  log_temp:     { key: 'log_temp',     label: 'Log temp',      icon: 'ti-temperature',     route: '/temp-logs' },
  checklist:    { key: 'checklist',    label: 'Checklist',     icon: 'ti-clipboard-check', route: '/checklists' },
  upload_doc:   { key: 'upload_doc',   label: 'Upload doc',    icon: 'ti-upload',          route: '/documents' },
  report_issue: { key: 'report_issue', label: 'Report issue',  icon: 'ti-alert-triangle',  route: '/incidents' },
};

const ACTIONS_BY_ROLE: Record<UserRole, string[]> = {
  owner_operator:     ['log_temp', 'checklist', 'upload_doc', 'report_issue'],
  executive:          ['log_temp', 'checklist', 'upload_doc', 'report_issue'],
  compliance_manager: ['log_temp', 'checklist', 'upload_doc', 'report_issue'],
  facilities_manager: ['checklist', 'upload_doc', 'report_issue'],
  chef:               ['log_temp', 'checklist', 'upload_doc', 'report_issue'],
  kitchen_manager:    ['log_temp', 'checklist', 'upload_doc', 'report_issue'],
  kitchen_staff:      ['log_temp', 'checklist', 'report_issue'],
};

export function QuickActionBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useRole();

  const actions = useMemo(() => {
    const keys = ACTIONS_BY_ROLE[userRole] || ACTIONS_BY_ROLE.owner_operator;
    return keys.map((k) => ACTION_DEFS[k]).filter(Boolean);
  }, [userRole]);

  // Hide during onboarding
  if (location.pathname === '/onboarding') return null;
  if (actions.length === 0) return null;

  return (
    <div className="qa">
      {actions.map((action) => (
        <span
          key={action.key}
          className="qai"
          role="button"
          tabIndex={0}
          onClick={() => navigate(action.route)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(action.route); }}
        >
          <i className={`ti ${action.icon}`} />
          {action.label}
        </span>
      ))}
    </div>
  );
}
