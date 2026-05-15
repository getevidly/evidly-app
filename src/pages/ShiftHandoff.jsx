/**
 * ShiftHandoff — MOBILE-EMOTIONAL-01
 *
 * End-of-shift summary page. Shows shift stats (temp count, checklists,
 * CAs resolved, open items), notes field, and handoff completion.
 *
 * Route: /shift-handoff
 * Access: kitchen_manager, chef, owner_operator
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Thermometer, CheckSquare, Wrench, AlertCircle, Send, Clock } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useConfetti } from '../hooks/useConfetti';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { ShiftSummaryCard } from '../components/superpowers/ShiftSummaryCard';
import { computeShiftSummary } from '../lib/shiftIntelligence';
import { getCurrentShift, getShiftLabel } from '../lib/shifts';
import { useLocations } from '../hooks/api/useLocations';
import { useShiftHandoffData } from '../hooks/useShiftHandoffData';
import { useCompleteHandoff } from '../hooks/useCompleteHandoff';
import { formatRelativeTime } from '../utils/format';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

function getShiftDateLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function ShiftHandoff() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const { triggerConfetti } = useConfetti();

  const [notes, setNotes] = useState('');
  const [completed, setCompleted] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] || 'Team';
  const shiftName = getCurrentShift();
  const shiftDate = new Date().toISOString().slice(0, 10);
  const organizationId = profile?.organization_id ?? null;

  // Location — first active location for this org
  const { data: locations } = useLocations();
  const locationId = locations?.[0]?.id ?? null;
  const locationName = locations?.[0]?.name ?? null;

  // Live shift data (skipped in demo — null locationId disables queries)
  const {
    stats: liveStats,
    openItems: liveOpenItems,
    previousHandoff: livePreviousHandoff,
    existingHandoff,
    shiftTemplateId,
    loading: dataLoading,
  } = useShiftHandoffData(
    isDemoMode
      ? { locationId: null, organizationId: null, shiftName, shiftDate }
      : { locationId, organizationId, shiftName, shiftDate }
  );

  const { complete, isSubmitting } = useCompleteHandoff();

  // Stats — demo preserves hardcoded values, live uses DB
  const stats = useMemo(() => {
    if (isDemoMode) return { tempCount: 12, checklistCount: 2, caResolved: 1, openItemCount: 0, allTempsInRange: true };
    return liveStats;
  }, [isDemoMode, liveStats]);

  // Shift intelligence summary
  const shiftSummary = useMemo(() => {
    return computeShiftSummary({
      shift: shiftName,
      checklistsCompleted: stats.checklistCount,
      checklistsTotal: isDemoMode ? 2 : stats.checklistCount,
      tempLogs: Array.from({ length: stats.tempCount }, () => ({ temp_pass: stats.allTempsInRange })),
      correctiveActionsOpened: 0,
      correctiveActionsResolved: stats.caResolved,
    });
  }, [stats, isDemoMode, shiftName]);

  // Open items — demo preserves hardcoded values, live uses DB
  const openItems = useMemo(() => {
    if (isDemoMode) return ['Walk-in cooler check at 6pm', 'Fire safety cert due in 7 days'];
    return liveOpenItems;
  }, [isDemoMode, liveOpenItems]);

  // Previous handoff — demo shows sample, live from DB
  const previousHandoff = useMemo(() => {
    if (isDemoMode) {
      return {
        shift_name: 'morning', shift_date: shiftDate,
        completed_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        notes: 'Walk-in cooler running slightly warm — maintenance notified. All checklists complete.',
        open_items: ['Follow up on cooler repair ETA', 'Restock sanitizer at station 3'],
      };
    }
    return livePreviousHandoff;
  }, [isDemoMode, livePreviousHandoff, shiftDate]);

  const handleComplete = useCallback(() => {
    if (isDemoMode) {
      guardAction('update', 'Shift Handoff', () => {
        triggerConfetti();
        navigator.vibrate?.(50);
        setCompleted(true);
        toast.success('Shift handoff completed!');
      });
      return;
    }
    if (!locationId || !organizationId) {
      toast.error('Unable to determine your location');
      return;
    }
    (async () => {
      const result = await complete({
        locationId, organizationId, shiftName, shiftDate, notes,
        stats: { tempCount: stats.tempCount, checklistCount: stats.checklistCount, caResolved: stats.caResolved },
        openItems, shiftTemplateId,
      });
      if (result.success) {
        triggerConfetti();
        navigator.vibrate?.(50);
        setCompleted(true);
        toast.success('Shift handoff completed!');
      } else {
        toast.error(result.error ?? 'Failed to save handoff');
      }
    })();
  }, [isDemoMode, guardAction, triggerConfetti, complete, locationId, organizationId, shiftName, shiftDate, notes, stats, openItems, shiftTemplateId]);

  if (completed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">🎉</p>
          <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: NAVY }}>
            Great shift, {firstName}!
          </h2>
          <p className="text-sm text-[#1E2D4D]/50 mb-6">
            Your handoff notes have been saved. The next team is set up for success.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-lg text-white font-semibold transition-colors"
            style={{ backgroundColor: NAVY }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-24">
      <Breadcrumb items={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Shift Handoff' },
      ]} />

      {/* Header */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold" style={{ color: NAVY }}>End of Shift Summary</h1>
          <Clock size={18} style={{ color: GOLD }} />
        </div>
        <p className="text-sm text-[#1E2D4D]/50">
          {getShiftDateLabel()} &middot; {getShiftLabel(shiftName)} Shift
          {locationName && <span> &middot; {locationName}</span>}
        </p>
      </div>

      {/* What the previous shift left you */}
      {previousHandoff ? (
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
          <h3 className="text-sm font-semibold text-[#1E2D4D]/80 mb-3">What the previous shift left you</h3>
          <p className="text-xs text-[#1E2D4D]/40 mb-3">
            {getShiftLabel(previousHandoff.shift_name)} Shift
            {previousHandoff.completed_at && <> &middot; {formatRelativeTime(previousHandoff.completed_at)}</>}
          </p>
          {previousHandoff.notes && (
            <p className="text-sm text-[#1E2D4D]/70 mb-3">{previousHandoff.notes}</p>
          )}
          {Array.isArray(previousHandoff.open_items) && previousHandoff.open_items.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-[#1E2D4D]/50 mb-1">Items carried forward</p>
              <ul className="space-y-1">
                {previousHandoff.open_items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#1E2D4D]/70">
                    <span className="text-[#1E2D4D]/30 mt-0.5">&#8226;</span>
                    {typeof item === 'string' ? item : String(item)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : !isDemoMode && !dataLoading ? (
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
          <h3 className="text-sm font-semibold text-[#1E2D4D]/80 mb-2">What the previous shift left you</h3>
          <p className="text-sm text-[#1E2D4D]/40">No prior handoff on file</p>
        </div>
      ) : null}

      {/* Shift stats */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
        <h3 className="text-sm font-semibold text-[#1E2D4D]/80 mb-4">Your shift in numbers</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Thermometer, label: 'Temperature readings', value: stats.tempCount, color: '#1E2D4D' },
            { icon: CheckSquare, label: 'Checklists completed', value: stats.checklistCount, color: '#059669' },
            { icon: Wrench, label: 'CAs resolved', value: stats.caResolved, color: '#d97706' },
            { icon: AlertCircle, label: 'Items left open', value: stats.openItemCount, color: stats.openItemCount > 0 ? '#dc2626' : '#059669' },
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

        {stats.allTempsInRange && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#ECFDF5' }}>
            <span className="text-green-600 text-sm font-medium">All critical temps in range</span>
          </div>
        )}
      </div>

      {/* Shift Intelligence Summary */}
      <ShiftSummaryCard summary={shiftSummary} />

      {/* Open items for next shift */}
      {openItems.length > 0 && (
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
          <h3 className="text-sm font-semibold text-[#1E2D4D]/80 mb-3">Open items for next shift</h3>
          <ul className="space-y-2">
            {openItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#1E2D4D]/70">
                <span className="text-[#1E2D4D]/30 mt-0.5">&#8226;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes field */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
        <h3 className="text-sm font-semibold text-[#1E2D4D]/80 mb-2">Notes for next shift</h3>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onFocus={e => { setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300); }}
          placeholder="Anything the next team should know..."
          rows={3}
          className="w-full text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-[#1E2D4D]"
          style={{ fontSize: 16 }}
        />
      </div>

      {/* Complete button */}
      {existingHandoff && !isDemoMode ? (
        <div className="w-full flex items-center justify-center gap-2 rounded-xl font-bold"
          style={{ backgroundColor: '#E8EDF5', color: NAVY, height: 56, fontSize: 16 }}
        >
          Handoff already submitted
        </div>
      ) : (
        <button
          onClick={handleComplete}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl text-white font-bold transition-colors disabled:opacity-50"
          style={{ backgroundColor: NAVY, height: 56, fontSize: 16 }}
        >
          <Send size={18} />
          {isSubmitting ? 'Saving...' : 'Complete Handoff'}
        </button>
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

export default ShiftHandoff;
