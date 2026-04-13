/**
 * ShiftHandoff — MOBILE-EMOTIONAL-01
 *
 * End-of-shift summary page. Shows shift stats (temp count, checklists,
 * CAs resolved, open items), notes field, and handoff completion.
 *
 * Route: /shift-handoff
 * Access: kitchen_manager, chef, owner_operator
 */
import { useState, useMemo } from 'react';
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

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

function getShiftName() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Morning';
  if (hour < 16) return 'Afternoon';
  return 'Evening';
}

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

  // Demo shift stats (in production these would come from DB queries)
  const stats = useMemo(() => ({
    tempCount: isDemoMode ? 12 : 0,
    checklistCount: isDemoMode ? 2 : 0,
    caResolved: isDemoMode ? 1 : 0,
    openItems: isDemoMode ? 0 : 0,
    allTempsInRange: true,
  }), [isDemoMode]);

  // Shift intelligence summary
  const shiftSummary = useMemo(() => {
    const shiftName = getShiftName().toLowerCase();
    return computeShiftSummary({
      shift: shiftName === 'afternoon' ? 'midday' : shiftName,
      checklistsCompleted: stats.checklistCount,
      checklistsTotal: isDemoMode ? 2 : 0,
      tempLogs: Array.from({ length: stats.tempCount }, () => ({ temp_pass: stats.allTempsInRange })),
      correctiveActionsOpened: 0,
      correctiveActionsResolved: stats.caResolved,
    });
  }, [stats, isDemoMode]);

  // Demo open items for next shift
  const openItems = useMemo(() => {
    if (!isDemoMode) return [];
    return [
      'Walk-in cooler check at 6pm',
      'Facility safety cert due in 7 days',
    ];
  }, [isDemoMode]);

  const handleComplete = () => {
    guardAction('update', 'Shift Handoff', () => {
      triggerConfetti();
      navigator.vibrate?.(50);
      setCompleted(true);
      toast.success('Shift handoff completed!');
    });
  };

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
          {getShiftDateLabel()} &middot; {getShiftName()} Shift
        </p>
      </div>

      {/* Shift stats */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
        <h3 className="text-sm font-semibold text-[#1E2D4D]/80 mb-4">Your shift in numbers</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Thermometer, label: 'Temperature readings', value: stats.tempCount, color: '#1E2D4D' },
            { icon: CheckSquare, label: 'Checklists completed', value: stats.checklistCount, color: '#059669' },
            { icon: Wrench, label: 'CAs resolved', value: stats.caResolved, color: '#d97706' },
            { icon: AlertCircle, label: 'Items left open', value: stats.openItems, color: stats.openItems > 0 ? '#dc2626' : '#059669' },
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
      <button
        onClick={handleComplete}
        className="w-full flex items-center justify-center gap-2 rounded-xl text-white font-bold transition-colors"
        style={{ backgroundColor: NAVY, height: 56, fontSize: 16 }}
      >
        <Send size={18} />
        Complete Handoff
      </button>

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
