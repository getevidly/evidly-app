import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Thermometer, CheckCircle, ArrowLeft, QrCode, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useDemo } from '../contexts/DemoContext';
import { useConfetti } from '../hooks/useConfetti';
import { useMilestoneCheck } from '../hooks/useMilestoneCheck';
import { MilestoneCelebrationModal } from '../components/ambassador/MilestoneCelebrationModal';
import { incrementStreak, STREAK_MILESTONES } from '../lib/streakTracker';
import { AIAssistButton, AIGeneratedIndicator } from '../components/ui/AIAssistButton';

interface QuickEquipment {
  id: string;
  name: string;
  type: string;
  minTemp: number;
  maxTemp: number;
}

const DEMO_EQUIPMENT: QuickEquipment[] = [
  { id: 'eq-1', name: 'Walk-in Cooler #1', type: 'cooler', minTemp: 33, maxTemp: 41 }, // demo
  { id: 'eq-2', name: 'Walk-in Freezer #1', type: 'freezer', minTemp: -Infinity, maxTemp: 0 },
  { id: 'eq-3', name: 'Prep Cooler', type: 'cooler', minTemp: 33, maxTemp: 41 },
  { id: 'eq-4', name: 'Walk-in Cooler #2', type: 'cooler', minTemp: 33, maxTemp: 41 },
  { id: 'eq-5', name: 'Hot Hold Station', type: 'hot', minTemp: 135, maxTemp: 165 },
];

export function TempLogQuick() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const preselectedId = searchParams.get('equipment');
  const inputMethod = (searchParams.get('method') as 'manual' | 'qr_scan') || 'manual';

  const [selectedEquipment, setSelectedEquipment] = useState<string>(preselectedId || '');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [streakMessage, setStreakMessage] = useState<string | null>(null);
  const { triggerConfetti } = useConfetti();
  const { pendingMilestone, checkMilestone, dismissMilestone } = useMilestoneCheck();

  const equipment = useMemo(() => isDemoMode ? DEMO_EQUIPMENT : [], [isDemoMode]);
  const selected = equipment.find(e => e.id === selectedEquipment);

  const isInRange = selected && temperature
    ? parseFloat(temperature) >= selected.minTemp && parseFloat(temperature) <= selected.maxTemp
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment || !temperature) {
      toast.error('Please select equipment and enter a temperature.');
      return;
    }

    if (isInRange === false) {
      toast.error('Temperature logged — OUT OF RANGE. Corrective action may be required.');
    } else if (isDemoMode) {
      toast.success('Temperature logged! (Demo mode — data not saved)');
    } else {
      toast.success('Temperature logged successfully!');
    }

    // Haptic feedback on save
    navigator.vibrate?.(50);

    // Milestone check (first temp log)
    checkMilestone('first_temp_log');

    // Streak tracking
    const newStreak = incrementStreak('temp_log');
    if (STREAK_MILESTONES.includes(newStreak)) {
      triggerConfetti();
      navigator.vibrate?.(200);
      setStreakMessage(`${newStreak}-day logging streak!`);
      setTimeout(() => setStreakMessage(null), 3000);
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8 max-w-sm w-full text-center modal-content-enter">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Temperature Logged!</h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3"
            style={{ backgroundColor: '#eef4f8', color: '#1E2D4D' }}>
            {inputMethod === 'qr_scan' ? <QrCode className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
            {inputMethod === 'qr_scan' ? 'Logged via QR Scan' : 'Logged via Manual Entry'}
          </div>
          <p className="text-sm text-[#1E2D4D]/70 mb-1">{selected?.name}</p>
          <p className="text-2xl font-bold tracking-tight mb-4" style={{ color: isInRange ? '#22c55e' : '#ef4444' }}>
            {temperature}°F
          </p>
          <p className="text-xs text-[#1E2D4D]/30 mb-6">
            {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => { setSubmitted(false); setTemperature(''); setNotes(''); }}
              className="w-full px-4 py-3 bg-[#1E2D4D] text-white font-semibold rounded-lg hover:bg-[#162340] transition-all duration-150 active:scale-[0.98]"
            >
              Log Another Reading
            </button>
            <button
              onClick={() => navigate('/temp-logs')}
              className="w-full px-4 py-2 text-sm text-[#1E2D4D]/70 hover:text-[#1E2D4D] transition-colors"
            >
              View All Temperature Logs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 w-full max-w-sm overflow-hidden modal-content-enter">
        <div className="px-6 py-5" style={{ backgroundColor: '#1E2D4D' }}>
          <div className="flex items-center gap-3">
            <Thermometer className="h-8 w-8 text-[#A08C5A]" />
            <div>
              <h1 className="text-lg font-bold text-white">Log Temperature</h1>
              <p className="text-xs text-[#1E2D4D]/30">Quick entry via QR code</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Equipment</label>
            <select
              value={selectedEquipment}
              onChange={e => setSelectedEquipment(e.target.value)}
              className="w-full px-3 py-3 border border-[#1E2D4D]/15 rounded-xl text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-[#1E2D4D] bg-white"
            >
              <option value="">Select equipment...</option>
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name}</option>
              ))}
            </select>
          </div>

          {selected && (
            <p className="text-xs text-[#1E2D4D]/50">
              {selected.type === 'freezer'
                ? `Must remain: ${selected.maxTemp}°F or below`
                : `Acceptable range: ${selected.minTemp}°F – ${selected.maxTemp}°F`
              }
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Temperature (°F)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={temperature}
              onChange={e => setTemperature(e.target.value)}
              onFocus={e => { setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300); }}
              placeholder="Enter temperature..."
              className={`w-full px-3 py-3 border rounded-xl text-lg font-semibold tracking-tight focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-[#1E2D4D] ${
                isInRange === false ? 'border-red-300 bg-red-50' : 'border-[#1E2D4D]/15'
              }`}
              className="text-base"
              autoFocus={!!preselectedId}
            />
            {isInRange === false && (
              <p className="text-xs text-red-600 mt-1 font-medium">Out of acceptable range! Corrective action may be required.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-[#1E2D4D]/80">Notes (optional)</label>
              <AIAssistButton
                fieldLabel="Notes"
                context={{ temperature, equipmentName: selected?.name || '' }}
                currentValue={notes}
                onGenerated={(text) => { setNotes(text); setAiFields(prev => new Set(prev).add('notes')); }}
              />
            </div>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setAiFields(prev => { const s = new Set(prev); s.delete('notes'); return s; }); }}
              onFocus={e => { setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300); }}
              placeholder="Any observations..."
              rows={2}
              className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-[#1E2D4D]"
            />
            {aiFields.has('notes') && <AIGeneratedIndicator />}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/temp-logs')}
              className="flex-1 px-4 py-3 border border-[#1E2D4D]/15 text-[#1E2D4D]/80 font-semibold rounded-lg hover:bg-[#FAF7F0] transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-[#1E2D4D] text-white font-semibold rounded-lg hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] text-sm"
            >
              Save Temperature Reading
            </button>
          </div>
        </form>
      </div>

      {/* Streak celebration overlay */}
      {streakMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 text-center animate-slide-up">
            <p className="text-3xl mb-2">🔥</p>
            <p className="text-lg font-bold" style={{ color: '#1E2D4D' }}>{streakMessage}</p>
          </div>
        </div>
      )}

      {/* Milestone modal */}
      <MilestoneCelebrationModal milestone={pendingMilestone} onDismiss={dismissMilestone} />
    </div>
  );
}
