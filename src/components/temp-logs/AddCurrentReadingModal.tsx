import { useState } from 'react';
import { Check } from 'lucide-react';
import { ModalShell, FormField, ReadingMethodSelect, OutOfRangeWarning, tempInputClass, formatDateTimeLocal, INPUT_CLASS, BTN_PRIMARY, BTN_CANCEL, isOutOfRange } from './shared';
import type { TemperatureEquipment, ReadingMethod } from './types';

export interface CurrentReadingSaveData {
  equipmentId: string;
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
  onSave: (data: CurrentReadingSaveData) => void;
}

export function AddCurrentReadingModal({ open, onClose, equipment, onSave }: Props) {
  const [equipmentId, setEquipmentId] = useState('');
  const [temperature, setTemperature] = useState('');
  const [readingMethod, setReadingMethod] = useState<ReadingMethod>('manual_thermometer');
  const [readingTime, setReadingTime] = useState(formatDateTimeLocal(new Date()));
  const [notes, setNotes] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');

  const selectedEq = equipment.find(e => e.id === equipmentId);
  const tempVal = temperature ? parseFloat(temperature) : null;
  const inRange = selectedEq && tempVal !== null && !isNaN(tempVal)
    ? !isOutOfRange(tempVal, selectedEq.min_temp, selectedEq.max_temp)
    : null;

  const resetForm = () => {
    setEquipmentId('');
    setTemperature('');
    setReadingMethod('manual_thermometer');
    setReadingTime(formatDateTimeLocal(new Date()));
    setNotes('');
    setCorrectiveAction('');
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentId || !temperature || tempVal === null || isNaN(tempVal)) return;
    onSave({
      equipmentId,
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
    ? selectedEq.min_temp === -Infinity
      ? '0°F or below'
      : `${selectedEq.min_temp}°F – ${selectedEq.max_temp}°F`
    : '';

  return (
    <ModalShell open={open} onClose={handleClose} title="Add Reading" subtitle="Current Readings — Storage Equipment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Equipment / Location" required>
          <select value={equipmentId} onChange={e => setEquipmentId(e.target.value)} required className={INPUT_CLASS}>
            <option value="">Select equipment...</option>
            {equipment.map(eq => (
              <option key={eq.id} value={eq.id}>{eq.name}{eq.location ? ` — ${eq.location}` : ''}</option>
            ))}
          </select>
          {selectedEq && (
            <p className="mt-1.5 text-xs font-medium text-[#1e4d6b]">Safe range: {rangeLabel}</p>
          )}
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
          />
        )}

        <FormField label="Reading Method">
          <ReadingMethodSelect value={readingMethod} onChange={setReadingMethod} />
        </FormField>

        <FormField label="Date / Time">
          <input type="datetime-local" value={readingTime} onChange={e => setReadingTime(e.target.value)} className={INPUT_CLASS} />
        </FormField>

        <FormField label="Notes">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes..." className={INPUT_CLASS} />
        </FormField>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={handleClose} className={BTN_CANCEL}>Cancel</button>
          <button type="submit" disabled={!equipmentId || !temperature} className={BTN_PRIMARY}>Save Reading</button>
        </div>
      </form>
    </ModalShell>
  );
}
