import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { type Employee, ROLE_CONFIG, STATUS_CONFIG, getInitials, hasExpiringCerts } from '../../data/employeesDemoData';
import { RoleBadge } from './RoleBadge';
import { ClockStatus } from './ClockStatus';

type SortKey = 'name' | 'role' | 'status';

interface EmployeesListProps {
  employees: Employee[];
  onSelect: (employee: Employee) => void;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'role', label: 'Role' },
  { value: 'status', label: 'Status' },
];

const ROLE_ORDER = { owner: 0, admin: 1, supervisor: 2, technician: 3, office: 4 };
const STATUS_ORDER = { active: 0, pending: 1, inactive: 2, terminated: 3 };

export function EmployeesList({ employees, onSelect }: EmployeesListProps) {
  const [sortBy, setSortBy] = useState<SortKey>('name');

  const sorted = useMemo(() => {
    const arr = [...employees];
    arr.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'role': return ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
        case 'status': return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        default: return 0;
      }
    });
    return arr;
  }, [employees, sortBy]);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}>
        <p className="text-sm" style={{ color: '#6B7F96' }}>No employees match your filters</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sort */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs" style={{ color: '#6B7F96' }}>Sort by:</span>
        {SORT_OPTIONS.map(o => (
          <button key={o.value} onClick={() => setSortBy(o.value)} className="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors" style={{ color: sortBy === o.value ? '#FFFFFF' : '#3D5068', backgroundColor: sortBy === o.value ? '#1e4d6b' : '#EEF1F7' }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map(emp => {
          const statCfg = STATUS_CONFIG[emp.status];
          const certWarning = hasExpiringCerts(emp);

          return (
            <div
              key={emp.id}
              onClick={() => onSelect(emp)}
              className="rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: ROLE_CONFIG[emp.role].bg, color: ROLE_CONFIG[emp.role].color }}>
                  {getInitials(emp.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#0B1628' }}>{emp.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <RoleBadge role={emp.role} />
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: statCfg.color, backgroundColor: statCfg.bg }}>
                      {statCfg.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-xs" style={{ color: '#3D5068' }}>
                <p className="truncate">{emp.email}</p>
                <p>{emp.phone}</p>
                <ClockStatus state={emp.clockState} since={emp.clockSince} jobLocation={emp.jobLocation} />
              </div>

              {certWarning && (
                <div className="mt-3 flex items-center gap-1.5 text-xs px-2 py-1 rounded" style={{ backgroundColor: '#fffbeb', color: '#92400e' }}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Certification expiring soon</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
