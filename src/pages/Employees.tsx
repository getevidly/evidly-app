import { useState, useMemo, useCallback } from 'react';
import { Users, UserPlus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import {
  DEMO_EMPLOYEES,
  type Employee,
  type EmployeeRole,
  type EmployeeStatus,
  getStats,
} from '../data/employeesDemoData';
import { EmployeesList } from '../components/employees/EmployeesList';
import { InviteEmployeeModal } from '../components/employees/InviteEmployeeModal';

const NAVY = '#1e4d6b';
const F: React.CSSProperties = { fontFamily: "'DM Sans', 'Inter', sans-serif" };

const ROLE_OPTIONS: { value: EmployeeRole | 'all'; label: string }[] = [
  { value: 'all', label: 'All Roles' },
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'technician', label: 'Technician' },
  { value: 'office', label: 'Office' },
];

const STATUS_OPTIONS: { value: EmployeeStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
];

export function Employees() {
  const navigate = useNavigate();
  const { userRole } = useRole();
  const isAdmin = ['owner_operator', 'platform_admin', 'executive'].includes(userRole);

  const [employees, setEmployees] = useState<Employee[]>(() => [...DEMO_EMPLOYEES]);
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const stats = useMemo(() => getStats(), []);

  const filtered = useMemo(() => {
    return employees.filter(e => {
      if (roleFilter !== 'all' && e.role !== roleFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.name.toLowerCase().includes(q) && !e.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [employees, roleFilter, statusFilter, search]);

  const handleSelect = useCallback((emp: Employee) => {
    navigate(`/employees/${emp.id}`);
  }, [navigate]);

  const handleInvite = useCallback((data: { firstName: string; lastName: string; email: string; phone: string; role: EmployeeRole; hourlyRate: number; serviceTypes: string[] }) => {
    const newEmp: Employee = {
      id: `d-new-${Date.now()}`,
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      role: data.role,
      status: 'pending',
      avatarUrl: null,
      locationId: 'downtown',
      locationName: 'Downtown Kitchen',
      hireDate: new Date().toISOString().slice(0, 10),
      hourlyRate: data.hourlyRate,
      serviceTypes: data.serviceTypes,
      lastLogin: null,
      clockState: 'off',
      clockSince: null,
      jobLocation: null,
      hoursThisWeek: 0,
      jobsAssignedThisWeek: 0,
      certifications: [],
      performance: {
        jobsAllTime: 0, jobsThisMonth: 0, avgQaScore: 0, deficienciesDocumented: 0,
        customerCompliments: 0, onTimeRate: 0, pointsEarned: 0, leaderboardPosition: 10,
        achievements: [], weeklyJobs: [0, 0, 0, 0, 0, 0, 0, 0], weeklyQaScores: [],
      },
    };
    setEmployees(prev => [...prev, newEmp]);
    setShowInvite(false);
    alert(`Invite sent to ${data.email}`);
  }, []);

  return (
    <div className="p-4 lg:p-6 max-w-[1200px] mx-auto" style={F}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Users className="w-6 h-6" style={{ color: NAVY }} />
            <h1 className="text-xl lg:text-2xl font-bold" style={{ color: '#0B1628' }}>HoodOps Employees</h1>
          </div>
          <p className="text-sm" style={{ color: '#6B7F96' }}>Manage your team, certifications, and performance</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowInvite(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white hover:opacity-90 transition-colors" style={{ backgroundColor: NAVY }}>
            <UserPlus className="w-4 h-4" /> Invite Employee
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Employees', value: stats.total, color: '#0B1628' },
          { label: 'Active', value: stats.active, color: '#16a34a' },
          { label: 'Technicians', value: stats.technicians, color: NAVY },
          { label: 'Clocked In', value: stats.clockedIn, color: '#2563eb' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
            <p className="text-xs" style={{ color: '#6B7F96' }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as EmployeeRole | 'all')} className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}>
          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as EmployeeStatus | 'all')} className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7F96' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: '#D1D9E6', color: '#0B1628' }} />
        </div>
      </div>

      {/* Employee list */}
      <EmployeesList employees={filtered} onSelect={handleSelect} />

      {/* Invite Modal */}
      <InviteEmployeeModal open={showInvite} onClose={() => setShowInvite(false)} onInvite={handleInvite} />
    </div>
  );
}
