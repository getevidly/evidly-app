import { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { ModalShell, FormField, ReadingMethodSelect, OutOfRangeWarning, tempInputClass, formatDateTimeLocal, INPUT_CLASS, BTN_PRIMARY, BTN_CANCEL, isOutOfRange } from './shared';
import type { TemperatureEquipment, ReadingMethod } from './types';
import { AIAssistButton, AIGeneratedIndicator } from '../../components/ui/AIAssistButton';

export interface HoldingReadingSaveData {
  equipmentId: string;
  foodItem: string;
  holdingType: 'hot' | 'cold';
  temperature: number;
  readingMethod: ReadingMethod;
  readingTime: string;
  notes: string;
  correctiveAction: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  equipment: TemperatureEquipment[];
  isHoldingHot: (type: string) => boolean;
  onSave: (data: HoldingReadingSaveData) => void;
}

export function AddHoldingReadingModal({ open, onClose, equipment, isHoldingHot: checkHot, onSave }: Props) {
  const [equipmentId, setEquipmentId] = useState('');
  const [foodItem, setFoodItem] = useState('');
  const [temperature, setTemperature] = useState('');
  const [readingMethod, setReadingMethod] = useState<ReadingMethod>('manual_thermometer');
  const [readingTime, setReadingTime] = useState(formatDateTimeLocal(new Date()));
  const [notes, setNotes] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());

  const selectedEq = equipment.find(e => e.id === equipmentId);
  const holdingType = selectedEq ? (checkHot(selectedEq.equipment_type) ? 'hot' : 'cold') : null;
  const tempVal = temperature ? parseFloat(temperature) : null;
  const inRange = selectedEq && tempVal !== null && !isNaN(tempVal)
    ? !isOutOfRange(tempVal, selectedEq.min_temp, selectedEq.max_temp)
    : null;

  // Group equipment by hot/cold
  const { coldEquip, hotEquip } = useMemo(() => ({
    coldEquip: equipment.filter(eq => !checkHot(eq.equipment_type)),
    hotEquip: equipment.filter(eq => checkHot(eq.equipment_type)),
  }), [equipment, checkHot]);

  const resetForm = () => {
    setEquipmentId(''); setFoodItem(''); setTemperature('');
    setReadingMethod('manual_thermometer');
    setReadingTime(formatDateTimeLocal(new Date()));
    setNotes(''); setCorrectiveAction('');
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentId || !foodItem || !temperature || tempVal === null || isNaN(tempVal) || !holdingType) return;
    onSave({
      equipmentId,
      foodItem,
      holdingType,
      temperature: tempVal,
      readingMethod,
      readingTime: new Date(readingTime).toISOString(),
      notes,
      correctiveAction,
    });
    resetForm();
    onClose();
  };

  const rangeLabel = selectedEq
    ? holdingType === 'hot' ? '135°F or above' : `${selectedEq.min_temp}°F – ${selectedEq.max_temp}°F`
    : '';

  return (
    <ModalShell open={open} onClose={handleClose} title="Add Holding Reading" subtitle="Hot / Cold Holding Temperature Log">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Equipment / Location" required>
          <select value={equipmentId} onChange={e => setEquipmentId(e.target.value)} required className={INPUT_CLASS}>
            <option value="">Select equipment...</option>
            {coldEquip.length > 0 && (
              <optgroup label="Cold Holding (≤ 41°F)">
                {coldEquip.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </optgroup>
            )}
            {hotEquip.length > 0 && (
              <optgroup label="Hot Holding (≥ 135°F)">
                {hotEquip.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </optgroup>
            )}
          </select>
          {selectedEq && holdingType && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${holdingType === 'hot' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {holdingType === 'hot' ? 'Hot Holding' : 'Cold Holding'}
              </span>
              <span className="text-xs text-gray-500">Safe range: {rangeLabel}</span>
            </div>
          )}
        </FormField>

        <FormField label="Food Item" required>
          <input type="text" value={foodItem} onChange={e => setFoodItem(e.target.value)} required placeholder="e.g., Chicken Wings, Caesar Salad" className={INPUT_CLASS} />
        </FormField>

        <FormField label="Temperature (°F)" required>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={temperature}
            onChange={e => setTemperature(e.target.value)}
            required
            placeholder="00.0"
            className={tempInputClass(temperature, inRange)}
          />
          {temperature && inRange !== null && (
            <p className={`mt-2 text-center text-sm font-semibold ${inRange ? 'text-green-600' : 'text-red-600'}`}>
              {inRange ? <><Check className="inline h-4 w-4 mr-1" />Within safe range</> : 'Outside safe range'}
            </p>
          )}
        </FormField>

        {tempVal !== null && selectedEq && inRange === false && (
          <OutOfRangeWarning
            temperature={tempVal}
            minTemp={selectedEq.min_temp}
            maxTemp={selectedEq.max_temp}
            correctiveAction={correctiveAction}
            onCorrectiveActionChange={setCorrectiveAction}
            equipmentName={selectedEq.name}
          />
        )}

        <FormField label="Reading Method">
          <ReadingMethodSelect value={readingMethod} onChange={setReadingMethod} />
        </FormField>

        <FormField label="Date / Time">
          <input type="datetime-local" value={readingTime} onChange={e => setReadingTime(e.target.value)} className={INPUT_CLASS} />
        </FormField>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <AIAssistButton
              fieldLabel="Notes"
              context={{ equipmentName: selectedEq?.name || '', temperature }}
              currentValue={notes}
              onGenerated={(text) => { setNotes(text); setAiFields(prev => new Set(prev).add('notes')); }}
            />
          </div>
          <textarea value={notes} onChange={e => { setNotes(e.target.value); setAiFields(prev => { const s = new Set(prev); s.delete('notes'); return s; }); }} rows={2} placeholder="Optional notes..." className={INPUT_CLASS} />
          {aiFields.has('notes') && <AIGeneratedIndicator />}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={handleClose} className={BTN_CANCEL}>Cancel</button>
          <button type="submit" disabled={!equipmentId || !foodItem || !temperature} className={BTN_PRIMARY}>Save Reading</button>
        </div>
      </form>
    </ModalShell>
  );
}
