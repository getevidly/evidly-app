import { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ModalShell, FormField, ReadingMethodSelect, formatDateTimeLocal, INPUT_CLASS, BTN_PRIMARY, BTN_CANCEL } from './shared';
import type { Cooldown, ReadingMethod } from './types';
import { AIAssistButton, AIGeneratedIndicator } from '../../components/ui/AIAssistButton';

export interface CooldownNewSaveData {
  mode: 'new';
  foodItem: string;
  startTemp: number;
  currentTemp: number;
  timeStarted: string;
  currentReadingTime: string;
  location: string;
  readingMethod: ReadingMethod;
  notes: string;
}

export interface CooldownCheckSaveData {
  mode: 'check';
  cooldownId: string;
  temperature: number;
  readingTime: string;
  notes: string;
}

export type CooldownSaveData = CooldownNewSaveData | CooldownCheckSaveData;

interface Props {
  open: boolean;
  onClose: () => void;
  activeCooldowns: Cooldown[];
  locations: string[];
  onSave: (data: CooldownSaveData) => void;
}

export function AddCooldownReadingModal({ open, onClose, activeCooldowns, locations, onSave }: Props) {
  const [mode, setMode] = useState<'check' | 'new'>(activeCooldowns.length > 0 ? 'check' : 'new');

  // Check mode state
  const [selectedCooldownId, setSelectedCooldownId] = useState('');
  const [checkTemp, setCheckTemp] = useState('');
  const [checkTime, setCheckTime] = useState(formatDateTimeLocal(new Date()));
  const [checkNotes, setCheckNotes] = useState('');

  // New cooldown state
  const [foodItem, setFoodItem] = useState('');
  const [startTemp, setStartTemp] = useState('');
  const [currentTemp, setCurrentTemp] = useState('');
  const [timeStarted, setTimeStarted] = useState(formatDateTimeLocal(new Date()));
  const [currentReadingTime, setCurrentReadingTime] = useState(formatDateTimeLocal(new Date()));
  const [location, setLocation] = useState('');
  const [readingMethod, setReadingMethod] = useState<ReadingMethod>('manual_thermometer');
  const [newNotes, setNewNotes] = useState('');
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());

  // Computed stage for new cooldown
  const currentTempVal = currentTemp ? parseFloat(currentTemp) : null;
  const stage = currentTempVal !== null && !isNaN(currentTempVal)
    ? currentTempVal > 70 ? 'Stage 1 — 135°F → 70°F (within 2 hours)' : 'Stage 2 — 70°F → 41°F (within 4 hours)'
    : null;
  const stageWarning = useMemo(() => {
    if (!currentTempVal || isNaN(currentTempVal)) return null;
    const startTempVal = startTemp ? parseFloat(startTemp) : null;
    if (!startTempVal || isNaN(startTempVal)) return null;
    if (currentTempVal > 70 && startTempVal < 135) return 'Start temperature should be ≥ 135°F for proper cooling tracking';
    return null;
  }, [currentTempVal, startTemp]);

  // Check mode validation
  const selectedCooldown = activeCooldowns.find(c => c.id === selectedCooldownId);
  const checkTempVal = checkTemp ? parseFloat(checkTemp) : null;

  const resetForm = () => {
    setSelectedCooldownId(''); setCheckTemp(''); setCheckTime(formatDateTimeLocal(new Date())); setCheckNotes('');
    setFoodItem(''); setStartTemp(''); setCurrentTemp('');
    setTimeStarted(formatDateTimeLocal(new Date())); setCurrentReadingTime(formatDateTimeLocal(new Date()));
    setLocation(''); setReadingMethod('manual_thermometer'); setNewNotes('');
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'check') {
      if (!selectedCooldownId || checkTempVal === null || isNaN(checkTempVal)) return;
      onSave({ mode: 'check', cooldownId: selectedCooldownId, temperature: checkTempVal, readingTime: new Date(checkTime).toISOString(), notes: checkNotes });
    } else {
      const s = startTemp ? parseFloat(startTemp) : null;
      if (!foodItem || s === null || isNaN(s) || currentTempVal === null || isNaN(currentTempVal)) return;
      onSave({
        mode: 'new', foodItem, startTemp: s, currentTemp: currentTempVal,
        timeStarted: new Date(timeStarted).toISOString(),
        currentReadingTime: new Date(currentReadingTime).toISOString(),
        location, readingMethod, notes: newNotes,
      });
    }
    resetForm();
    onClose();
  };

  return (
    <ModalShell open={open} onClose={handleClose} title="Add Cooldown Reading" subtitle="FDA 2-Stage Cooling Compliance">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-5">
        <button
          type="button"
          onClick={() => setMode('check')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${mode === 'check' ? 'bg-white shadow-sm text-[#1e4d6b]' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Log Check on Existing
        </button>
        <button
          type="button"
          onClick={() => setMode('new')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${mode === 'new' ? 'bg-white shadow-sm text-[#1e4d6b]' : 'text-gray-500 hover:text-gray-700'}`}
        >
          New Cooldown
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'check' ? (
          <>
            <FormField label="Active Cooldown" required>
              <select value={selectedCooldownId} onChange={e => setSelectedCooldownId(e.target.value)} required className={INPUT_CLASS}>
                <option value="">Select cooldown...</option>
                {activeCooldowns.map(c => {
                  const lastTemp = c.checks.length > 0 ? c.checks[c.checks.length - 1].temperature : c.startTemp;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.itemName} — last: {lastTemp}°F ({c.location})
                    </option>
                  );
                })}
              </select>
              {activeCooldowns.length === 0 && (
                <p className="mt-1.5 text-xs text-gray-500">No active cooldowns. Start a new one instead.</p>
              )}
            </FormField>

            <FormField label="Current Temperature (°F)" required>
              <input type="number" step="0.1" inputMode="decimal" value={checkTemp} onChange={e => setCheckTemp(e.target.value)} required placeholder="00.0" className={INPUT_CLASS} />
            </FormField>

            <FormField label="Reading Time">
              <input type="datetime-local" value={checkTime} onChange={e => setCheckTime(e.target.value)} className={INPUT_CLASS} />
            </FormField>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <AIAssistButton
                  fieldLabel="Notes"
                  context={{ equipmentName: selectedCooldown?.itemName || '', temperature: checkTemp }}
                  currentValue={checkNotes}
                  onGenerated={(text) => { setCheckNotes(text); setAiFields(prev => new Set(prev).add('checkNotes')); }}
                />
              </div>
              <textarea value={checkNotes} onChange={e => { setCheckNotes(e.target.value); setAiFields(prev => { const s = new Set(prev); s.delete('checkNotes'); return s; }); }} rows={2} placeholder="Optional notes..." className={INPUT_CLASS} />
              {aiFields.has('checkNotes') && <AIGeneratedIndicator />}
            </div>
          </>
        ) : (
          <>
            <FormField label="Food Item" required>
              <input type="text" value={foodItem} onChange={e => setFoodItem(e.target.value)} required placeholder="e.g., Chicken Soup, Rice" className={INPUT_CLASS} />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start Temperature (°F)" required>
                <input type="number" step="0.1" inputMode="decimal" value={startTemp} onChange={e => setStartTemp(e.target.value)} required placeholder="135" className={INPUT_CLASS} />
              </FormField>
              <FormField label="Current Temperature (°F)" required>
                <input type="number" step="0.1" inputMode="decimal" value={currentTemp} onChange={e => setCurrentTemp(e.target.value)} required placeholder="00.0" className={INPUT_CLASS} />
              </FormField>
            </div>

            {stage && (
              <div className="p-3 rounded-lg bg-[#eef4f8] border border-[#D1D9E6]">
                <p className="text-sm font-medium text-[#1e4d6b]">{stage}</p>
              </div>
            )}

            {stageWarning && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">{stageWarning}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Time Started" required>
                <input type="datetime-local" value={timeStarted} onChange={e => setTimeStarted(e.target.value)} required className={INPUT_CLASS} />
              </FormField>
              <FormField label="Current Reading Time">
                <input type="datetime-local" value={currentReadingTime} onChange={e => setCurrentReadingTime(e.target.value)} className={INPUT_CLASS} />
              </FormField>
            </div>

            <FormField label="Equipment / Location">
              <select value={location} onChange={e => setLocation(e.target.value)} className={INPUT_CLASS}>
                <option value="">Select location (optional)...</option>
                {locations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </FormField>

            <FormField label="Reading Method">
              <ReadingMethodSelect value={readingMethod} onChange={setReadingMethod} />
            </FormField>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <AIAssistButton
                  fieldLabel="Notes"
                  context={{ equipmentName: foodItem, temperature: currentTemp }}
                  currentValue={newNotes}
                  onGenerated={(text) => { setNewNotes(text); setAiFields(prev => new Set(prev).add('newNotes')); }}
                />
              </div>
              <textarea value={newNotes} onChange={e => { setNewNotes(e.target.value); setAiFields(prev => { const s = new Set(prev); s.delete('newNotes'); return s; }); }} rows={2} placeholder="Optional notes..." className={INPUT_CLASS} />
              {aiFields.has('newNotes') && <AIGeneratedIndicator />}
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={handleClose} className={BTN_CANCEL}>Cancel</button>
          <button
            type="submit"
            disabled={mode === 'check' ? (!selectedCooldownId || !checkTemp) : (!foodItem || !startTemp || !currentTemp)}
            className={BTN_PRIMARY}
          >
            {mode === 'check' ? 'Log Check' : 'Start Cooldown'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
