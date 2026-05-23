/**
 * CurrentShift — Live mid-shift snapshot
 *
 * Shows real-time shift progress: temps logged, tasks completed/remaining,
 * incidents, open CAs, and PRP outlook with live semantics.
 *
 * Route: /current-shift
 * Access: all operational roles
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Thermometer, CheckSquare, AlertTriangle, Wrench, Clock, ArrowRight } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { ShiftPRPBand } from '../components/shifts/ShiftPRPBand';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { getCurrentShift, getShiftLabel, DEFAULT_SHIFTS } from '../lib/shifts';
import { useLocations } from '../hooks/api/useLocations';
import { useCurrentShiftData } from '../hooks/useCurrentShiftData';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

function getShiftDateLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatHour(hour) {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  return `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function CurrentShift() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const shiftName = getCurrentShift();
  const shiftDate = new Date().toISOString().slice(0, 10);
  const organizationId = profile?.organization_id ?? null;

  const { data: locations } = useLocations();
  const locationId = locations?.[0]?.id ?? null;
  const locationName = locations?.[0]?.name ?? null;

  const {
    stats: liveStats,
    prpMetrics: livePRPMetrics,
    openTasks: liveOpenTasks,
    shiftStartHour,
    shiftEndHour,
    loading,
  } = useCurrentShiftData(
    isDemoMode
      ? { locationId: null, organizationId: null, shiftName, shiftDate }
      : { locationId, organizationId, shiftName, shiftDate }
  );

  const stats = useMemo(() => {
    if (isDemoMode) return { tempCount: 8, completedTasks: 5, totalTasks: 7, incidentCount: 0, openCACount: 1, allTempsInRange: true };
    return liveStats;
  }, [isDemoMode, liveStats]);

  const prpMetrics = useMemo(() => {
    if (isDemoMode) return { predict: 2, reduce: 1, prove: { ready: 5, total: 7, pct: 71 } };
    return livePRPMetrics;
  }, [isDemoMode, livePRPMetrics]);

  const openTasks = useMemo(() => {
    if (isDemoMode) return [
      { title: 'Walk-in cooler temp check', dueAt: '2:00 PM', status: 'pending' },
      { title: 'Sanitizer concentration test', dueAt: '3:00 PM', status: 'pending' },
    ];
    return liveOpenTasks;
  }, [isDemoMode, liveOpenTasks]);

  const displayStartHour = isDemoMode ? DEFAULT_SHIFTS[shiftName].startHour : shiftStartHour;
  const displayEndHour = isDemoMode ? DEFAULT_SHIFTS[shiftName].endHour : shiftEndHour;
  const shiftLabel = getShiftLabel(shiftName);
  const progressPct = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-24">
      <Breadcrumb items={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Current Shift' },
      ]} />

      {/* Header */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: GOLD }}>{shiftLabel} Shift</p>
          <Clock size={18} style={{ color: GOLD }} />
        </div>
        <h1 className="text-lg font-bold mb-1" style={{ color: NAVY }}>Current Shift</h1>
        <p className="text-[11px] text-[#8A93A6] mb-1">Predict &middot; Reduce &middot; Prove</p>
        <p className="text-sm text-[#1E2D4D]/50">
          {getShiftDateLabel()} &middot; {formatHour(displayStartHour)} – {formatHour(displayEndHour)}
          {locationName && <span> &middot; {locationName}</span>}
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[#1E2D4D]/80">Shift progress</h3>
          <span className="text-sm font-bold" style={{ color: NAVY }}>{progressPct}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#1E2D4D]/5">
          <div className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, backgroundColor: progressPct === 100 ? '#059669' : GOLD }} />
        </div>
        <p className="text-xs text-[#1E2D4D]/40 mt-2">{stats.completedTasks} of {stats.totalTasks} tasks completed</p>
      </div>

      {/* Stats grid */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
        <h3 className="text-sm font-semibold text-[#1E2D4D]/80 mb-4">Shift snapshot</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Thermometer, label: 'Temperatures logged', value: stats.tempCount, color: '#1E2D4D' },
            { icon: CheckSquare, label: 'Tasks completed', value: `${stats.completedTasks}/${stats.totalTasks}`, color: '#059669' },
            { icon: AlertTriangle, label: 'Incidents reported', value: stats.incidentCount, color: stats.incidentCount > 0 ? '#dc2626' : '#059669' },
            { icon: Wrench, label: 'Open corrective actions', value: stats.openCACount, color: '#d97706' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-[#FAF7F0]">
                <Icon size={20} style={{ color: item.color }} className="shrink-0" />
                <div>
                  <p className="text-xl font-bold" style={{ color: NAVY }}>{item.value}</p>
                  <p className="text-xs text-[#1E2D4D]/50">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
        {stats.allTempsInRange && stats.tempCount > 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#ECFDF5' }}>
            <span className="text-green-600 text-sm font-medium">All temps in range</span>
          </div>
        )}
      </div>

      {/* PRP band — live variant */}
      <ShiftPRPBand metrics={prpMetrics} loading={isDemoMode ? false : loading} variant="live" />

      {/* Remaining tasks */}
      {openTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
          <h3 className="text-sm font-semibold text-[#1E2D4D]/80 mb-3">Remaining tasks</h3>
          <ul className="space-y-2">
            {openTasks.map((task, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: task.status === 'overdue' ? '#dc2626' : '#1E2D4D30' }} />
                <span className="flex-1 text-[#1E2D4D]/70">{task.title}</span>
                {task.dueAt && <span className="text-xs text-[#1E2D4D]/40 shrink-0">{task.dueAt}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Link to handoff */}
      <button onClick={() => navigate('/shift-handoff')}
        className="w-full flex items-center justify-center gap-2 rounded-xl text-white font-bold transition-colors"
        style={{ backgroundColor: NAVY, height: 56, fontSize: 16 }}>
        Go to Shift Handoff <ArrowRight size={18} />
      </button>

      {showUpgrade && (
        <DemoUpgradePrompt action={upgradeAction} feature={upgradeFeature} onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  );
}

export default CurrentShift;
