import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  Search, MapPin, ChevronRight, Award, GraduationCap,
  Plus, Filter,
} from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';
import { useRole } from '../contexts/RoleContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { AssignTrainingModal } from '../components/training/AssignTrainingModal';
import {
  TRAINING_EMPLOYEES, LOCATION_OPTIONS,
  getTrainingStatus, getStatusLabel, getStatusColors,
  getNextExpiration, getCertStats,
  type TrainingEmployee, type TrainingStatus,
} from '../data/trainingRecordsDemoData';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, TEXT_TERTIARY } from '../components/dashboard/shared/constants';

const NAVY = '#1e4d6b';
const F: React.CSSProperties = { fontFamily: "'DM Sans', 'Inter', sans-serif" };

type SortKey = 'name' | 'status' | 'expiration' | 'role';

const STATUS_PRIORITY: Record<TrainingStatus, number> = { needs_renewal: 0, coming_due: 1, current: 2 };

function formatDate(d: string | null): string {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TrainingRecords() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetId, setAssignTargetId] = useState<string | null>(null);

  const employees: TrainingEmployee[] = isDemoMode ? TRAINING_EMPLOYEES : [];

  // Role-based filtering
  const roleFilteredEmployees = useMemo(() => {
    if (userRole === 'kitchen_staff') {
      // Staff sees only themselves — match first staff employee for demo
      return employees.filter(e => e.appRole === 'kitchen_staff').slice(0, 1);
    }
    if (userRole === 'kitchen_manager' || userRole === 'chef') {
      // Managers/chefs see their location only (demo: show first matching location)
      const loc = employees.find(e => e.appRole === userRole)?.locationId;
      if (loc) return employees.filter(e => e.locationId === loc);
    }
    return employees;
  }, [employees, userRole]);

  // User-applied filters + search
  const filtered = useMemo(() => {
    return roleFilteredEmployees.filter(emp => {
      if (locationFilter !== 'all' && emp.locationId !== locationFilter) return false;
      if (roleFilter !== 'all' && emp.role.toLowerCase() !== roleFilter) return false;
      if (statusFilter !== 'all' && getTrainingStatus(emp) !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!emp.name.toLowerCase().includes(q) && !emp.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [roleFilteredEmployees, locationFilter, roleFilter, statusFilter, search]);

  // Sorting
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'status': return STATUS_PRIORITY[getTrainingStatus(a)] - STATUS_PRIORITY[getTrainingStatus(b)];
        case 'expiration': {
          const ea = getNextExpiration(a);
          const eb = getNextExpiration(b);
          if (!ea && !eb) return 0;
          if (!ea) return 1;
          if (!eb) return -1;
          return ea.localeCompare(eb);
        }
        case 'role': return a.role.localeCompare(b.role);
        default: return 0;
      }
    });
    return arr;
  }, [filtered, sortBy]);

  const stats = getCertStats(roleFilteredEmployees);

  const handleAssignClick = (empId: string) => {
    guardAction('assign', 'Training Records', () => {
      setAssignTargetId(empId);
      setShowAssignModal(true);
    });
  };

  const handleBulkAssign = () => {
    guardAction('assign', 'Training Records', () => {
      setAssignTargetId(null);
      setShowAssignModal(true);
    });
  };

  // Empty state — no employees
  if (employees.length === 0 && !isDemoMode) {
    return (
      <div style={F}>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Users size={48} color="#d1d5db" />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: BODY_TEXT, marginTop: 16 }}>No team members yet</h2>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 8, maxWidth: 400, margin: '8px auto 0' }}>
            Add team members first to start tracking training.
          </p>
          <button
            onClick={() => navigate('/team')}
            style={{ marginTop: 20, padding: '10px 20px', borderRadius: 8, background: NAVY, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Go to Team Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={F}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: BODY_TEXT, margin: 0 }}>Training Records</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: MUTED }}>Employee certifications, training completion, and compliance tracking</p>
        </div>
        <button
          onClick={handleBulkAssign}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, background: NAVY, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={16} /> Assign Training
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Team Members', value: stats.teamMembers, icon: Users, color: NAVY },
          { label: 'Certs Current', value: stats.currentCerts, icon: CheckCircle2, color: '#15803d' },
          { label: 'Coming Due', value: stats.comingDue, icon: Clock, color: '#d97706' },
          { label: 'Needs Renewal', value: stats.needsRenewal, icon: AlertTriangle, color: '#dc2626' },
          { label: 'Training Completion', value: `${stats.completionPct}%`, icon: TrendingUp, color: NAVY },
        ].map((s, i) => (
          <div key={i} style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: 16, boxShadow: CARD_SHADOW }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <s.icon size={18} color={s.color} />
              <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_TERTIARY, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</span>
            </div>
            <span style={{ fontSize: 26, fontWeight: 700, color: BODY_TEXT }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
          <Search size={16} color={TEXT_TERTIARY} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: CARD_BG, fontSize: 13, color: BODY_TEXT, outline: 'none' }}
          />
        </div>

        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: CARD_BG, fontSize: 13, color: BODY_TEXT, cursor: 'pointer' }}>
          <option value="all">All Locations</option>
          {LOCATION_OPTIONS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: CARD_BG, fontSize: 13, color: BODY_TEXT, cursor: 'pointer' }}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: CARD_BG, fontSize: 13, color: BODY_TEXT, cursor: 'pointer' }}>
          <option value="all">All Statuses</option>
          <option value="current">All Current</option>
          <option value="coming_due">Coming Due</option>
          <option value="needs_renewal">Needs Renewal</option>
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
          style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: CARD_BG, fontSize: 13, color: BODY_TEXT, cursor: 'pointer' }}>
          <option value="name">Sort: Name (A-Z)</option>
          <option value="status">Sort: Status (Urgent First)</option>
          <option value="expiration">Sort: Next Expiration</option>
          <option value="role">Sort: Role</option>
        </select>
      </div>

      {/* Results count */}
      <p style={{ fontSize: 13, color: TEXT_TERTIARY, margin: '0 0 12px' }}>
        {sorted.length} of {roleFilteredEmployees.length} team member{roleFilteredEmployees.length !== 1 ? 's' : ''}
      </p>

      {/* Employee Grid */}
      {sorted.length === 0 ? (
        <div style={{ background: PANEL_BG, borderRadius: 10, border: `1px solid ${CARD_BORDER}`, padding: 48, textAlign: 'center' }}>
          <Filter size={32} color="#d1d5db" />
          <p style={{ color: MUTED, fontSize: 14, marginTop: 12 }}>No employees match your filters</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {sorted.map(emp => {
            const status = getTrainingStatus(emp);
            const statusColors = getStatusColors(status);
            const nextExp = getNextExpiration(emp);
            const completedCount = emp.internalTraining.filter(t => t.status === 'completed').length;
            const totalCount = emp.internalTraining.length;

            return (
              <div
                key={emp.id}
                onClick={() => navigate(`/dashboard/training/${emp.id}`)}
                style={{
                  background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 10,
                  padding: 18, boxShadow: CARD_SHADOW, cursor: 'pointer',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = NAVY; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(30,77,107,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = CARD_BORDER; (e.currentTarget as HTMLElement).style.boxShadow = CARD_SHADOW; }}
              >
                {/* Top row: name + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: BODY_TEXT }}>{emp.name}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                      <span style={{ padding: '1px 8px', borderRadius: 6, background: PANEL_BG, fontWeight: 600, fontSize: 11 }}>{emp.role}</span>
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: statusColors.bg, color: statusColors.text,
                  }}>
                    {getStatusLabel(status)}
                  </span>
                </div>

                {/* Location */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: TEXT_TERTIARY, marginBottom: 12 }}>
                  <MapPin size={12} />
                  <span>{emp.locationName}</span>
                </div>

                {/* Cert count + next expiry */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MUTED, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Award size={13} color={NAVY} />
                    <span>{emp.certifications.length} certification{emp.certifications.length !== 1 ? 's' : ''}</span>
                  </div>
                  {nextExp && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      <span>Next: {formatDate(nextExp)}</span>
                    </div>
                  )}
                </div>

                {/* Training progress bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: TEXT_TERTIARY, marginBottom: 4 }}>
                    <span>Training Progress</span>
                    <span>{completedCount}/{totalCount} completed</span>
                  </div>
                  <div style={{ height: 6, background: PANEL_BG, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '100%',
                      height: '100%',
                      background: totalCount > 0 && completedCount === totalCount ? '#15803d' : NAVY,
                      borderRadius: 3,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>

                {/* Footer: assign + view */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={e => { e.stopPropagation(); handleAssignClick(emp.id); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: `1px solid ${CARD_BORDER}`, background: 'transparent', fontSize: 12, color: NAVY, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <GraduationCap size={13} /> Assign
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: NAVY, fontWeight: 600 }}>
                    View Profile <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No certs coming due — all good */}
      {stats.comingDue === 0 && stats.needsRenewal === 0 && roleFilteredEmployees.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, padding: '12px 16px', background: '#dcfce7', borderRadius: 8, border: '1px solid #bbf7d0' }}>
          <CheckCircle2 size={18} color="#15803d" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Everyone's current — nice.</span>
        </div>
      )}

      <div style={{ height: 40 }} />

      {/* Modals */}
      {showAssignModal && (
        <AssignTrainingModal
          open={showAssignModal}
          onClose={() => { setShowAssignModal(false); setAssignTargetId(null); }}
          employeeId={assignTargetId ?? undefined}
          employeeName={assignTargetId ? TRAINING_EMPLOYEES.find(e => e.id === assignTargetId)?.name : undefined}
          employees={roleFilteredEmployees}
          onAssign={(data) => {
            toast.success(`Training assigned to ${data.employeeName} (demo)`);
            setShowAssignModal(false);
            setAssignTargetId(null);
          }}
        />
      )}

      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          feature={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
