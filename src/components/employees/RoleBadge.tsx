import { ROLE_CONFIG, type EmployeeRole } from '../../data/employeesDemoData';

interface RoleBadgeProps {
  role: EmployeeRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}
