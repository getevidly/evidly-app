import { useState, useMemo, useCallback } from 'react';
import { Clock, Users, Calendar } from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { useRole } from '../contexts/RoleContext';
import {
  DEMO_SHIFTS,
  DEMO_PAY_PERIODS,
  type ShiftEntry,
  type PayPeriod,
} from '../data/timecardsDemoData';
import { MyTimecard } from '../components/timecards/MyTimecard';
import { TeamTimecards } from '../components/timecards/TeamTimecards';
import { PayPeriods } from '../components/timecards/PayPeriods';
import { ClockInOutModal } from '../components/timecards/ClockInOutModal';
import { ShiftDetailModal } from '../components/timecards/ShiftDetailModal';

const NAVY = '#1e4d6b';
const F: React.CSSProperties = { fontFamily: "'DM Sans', 'Inter', sans-serif" };

type Tab = 'my' | 'team' | 'periods';

// Map app roles to demo employee IDs
const ROLE_EMPLOYEE_MAP: Record<string, { id: string; name: string }> = {
  owner_operator:     { id: 'd1', name: 'Marcus Johnson' },
  platform_admin:     { id: 'd1', name: 'Marcus Johnson' },
  executive:          { id: 'd1', name: 'Marcus Johnson' },
  kitchen_manager:    { id: 'd2', name: 'Sofia Chen' },
  compliance_manager: { id: 'd2', name: 'Sofia Chen' },
  chef:               { id: 'd3', name: 'David Kim' },
  facilities_manager: { id: 'd3', name: 'David Kim' },
  kitchen_staff:      { id: 'd4', name: 'Ana Torres' },
};

const SUPERVISOR_ROLES = ['owner_operator', 'executive', 'platform_admin', 'kitchen_manager', 'compliance_manager', 'facilities_manager'];

export function Timecards() {
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade } = useDemoGuard();
  const { userRole } = useRole();

  const [tab, setTab] = useState<Tab>('my');
  const [shifts, setShifts] = useState<ShiftEntry[]>(() => [...DEMO_SHIFTS]);
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>(() => [...DEMO_PAY_PERIODS]);
  const [clockModal, setClockModal] = useState<'in' | 'out' | null>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftEntry | null>(null);

  const currentEmployee = ROLE_EMPLOYEE_MAP[userRole] || ROLE_EMPLOYEE_MAP.kitchen_staff;
  const isSupervisor = SUPERVISOR_ROLES.includes(userRole);

  // Compute clocked-in duration for current employee
  const activeShift = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return shifts.find(s => s.employeeId === currentEmployee.id && s.date === today && s.clockOut === null) ?? null;
  }, [shifts, currentEmployee.id]);

  const clockedInDuration = useMemo(() => {
    if (!activeShift?.clockIn) return undefined;
    const now = new Date();
    const match = activeShift.clockIn.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return undefined;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    if (match[3].toUpperCase() === 'PM' && h < 12) h += 12;
    if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
    const start = new Date(now); start.setHours(h, m, 0, 0);
    const diffMin = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 60000));
    return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
  }, [activeShift]);

  // Handlers
  const handleClockIn = useCallback(() => setClockModal('in'), []);
  const handleClockOut = useCallback(() => setClockModal('out'), []);

  const handleClockSubmit = useCallback((notes: string) => {
    if (clockModal === 'in') {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const newShift: ShiftEntry = {
        id: `sh-new-${Date.now()}`,
        employeeId: currentEmployee.id,
        employeeName: currentEmployee.name,
        locationId: 'downtown',
        locationName: 'Downtown Kitchen',
        date: today,
        clockIn: timeStr,
        clockOut: null,
        breakMinutes: 0,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        doubleTimeHours: 0,
        status: 'pending',
        notes: notes || null,
        anomalies: [],
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
      };
      setShifts(prev => [...prev, newShift]);
    } else {
      // Clock out: find the active shift and update it
      setShifts(prev => prev.map(s => {
        if (s.employeeId === currentEmployee.id && s.clockOut === null) {
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          return { ...s, clockOut: timeStr, totalHours: 8, regularHours: 8, notes: notes || s.notes };
        }
        return s;
      }));
    }
    setClockModal(null);
  }, [clockModal, currentEmployee]);

  const handleApprove = useCallback((shiftId: string) => {
    setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, status: 'approved' as const, approvedBy: currentEmployee.name, approvedAt: new Date().toISOString() } : s));
  }, [currentEmployee.name]);

  const handleBulkApprove = useCallback((shiftIds: string[]) => {
    setShifts(prev => prev.map(s => shiftIds.includes(s.id) && s.status === 'pending' ? { ...s, status: 'approved' as const, approvedBy: currentEmployee.name, approvedAt: new Date().toISOString() } : s));
  }, [currentEmployee.name]);

  const handleReject = useCallback((reason: string) => {
    if (!selectedShift) return;
    setShifts(prev => prev.map(s => s.id === selectedShift.id ? { ...s, status: 'rejected' as const, rejectionReason: reason } : s));
    setSelectedShift(null);
  }, [selectedShift]);

  const handleFlag = useCallback((reason: string) => {
    if (!selectedShift) return;
    setShifts(prev => prev.map(s => s.id === selectedShift.id ? { ...s, status: 'flagged' as const, notes: reason } : s));
    setSelectedShift(null);
  }, [selectedShift]);

  const handleViewShift = useCallback((shift: ShiftEntry) => setSelectedShift(shift), []);

  const handleSubmitTimecard = useCallback(() => alert('Timecard submitted for approval.'), []);

  const handleClosePeriod = useCallback((id: string) => {
    setPayPeriods(prev => prev.map(p => p.id === id ? { ...p, status: 'closed' as const, closedBy: currentEmployee.name, closedAt: new Date().toISOString() } : p));
  }, [currentEmployee.name]);

  const handleExportPeriod = useCallback((_id: string, format: string) => {
    alert(`Exported pay period as ${format}. Download starting...`);
  }, []);

  const handleMarkPaid = useCallback((id: string) => {
    setPayPeriods(prev => prev.map(p => p.id === id ? { ...p, status: 'paid' as const } : p));
  }, []);

  const handleCreatePeriod = useCallback(() => alert('Create Pay Period — available in the live app.'), []);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: 'my', label: 'My Timecard', icon: <Clock className="w-4 h-4" />, show: true },
    { key: 'team', label: 'Team', icon: <Users className="w-4 h-4" />, show: isSupervisor },
    { key: 'periods', label: 'Pay Periods', icon: <Calendar className="w-4 h-4" />, show: true },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-[1200px] mx-auto" style={F}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Clock className="w-6 h-6" style={{ color: NAVY }} />
          <h1 className="text-xl lg:text-2xl font-bold" style={{ color: '#0B1628' }}>HoodOps Timecards</h1>
        </div>
        <p className="text-sm" style={{ color: '#6B7F96' }}>
          Clock in/out, review shifts, and manage pay periods
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b" style={{ borderColor: '#D1D9E6' }}>
        {tabs.filter(t => t.show).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors -mb-px"
            style={{
              color: tab === t.key ? NAVY : '#6B7F96',
              borderBottom: tab === t.key ? `2px solid ${NAVY}` : '2px solid transparent',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'my' && (
        <MyTimecard
          shifts={shifts}
          employeeId={currentEmployee.id}
          employeeName={currentEmployee.name}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
          onViewShift={handleViewShift}
          onSubmitTimecard={handleSubmitTimecard}
        />
      )}

      {tab === 'team' && isSupervisor && (
        <TeamTimecards
          shifts={shifts}
          onApprove={handleApprove}
          onBulkApprove={handleBulkApprove}
          onViewShift={handleViewShift}
          userRole={userRole}
        />
      )}

      {tab === 'periods' && (
        <PayPeriods
          payPeriods={payPeriods}
          onClosePeriod={handleClosePeriod}
          onExportPeriod={handleExportPeriod}
          onMarkPaid={handleMarkPaid}
          onCreatePeriod={handleCreatePeriod}
          isAdmin={userRole === 'owner_operator' || userRole === 'platform_admin'}
        />
      )}

      {/* Clock In/Out Modal */}
      {clockModal && (
        <ClockInOutModal
          mode={clockModal}
          currentDuration={clockedInDuration}
          onClose={() => setClockModal(null)}
          onSubmit={handleClockSubmit}
        />
      )}

      {/* Shift Detail Modal */}
      {selectedShift && (
        <ShiftDetailModal
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
          onApprove={() => {
            handleApprove(selectedShift.id);
            setSelectedShift(null);
          }}
          onReject={handleReject}
          onFlag={handleFlag}
          canApprove={isSupervisor}
        />
      )}
    </div>
  );
}
