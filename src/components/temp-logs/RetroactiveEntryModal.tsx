import { useState, useEffect } from 'react';
import { Check, Clock } from 'lucide-react';
import { ModalShell, FormField, ReadingMethodSelect, OutOfRangeWarning, tempInputClass, formatDateTimeLocal, INPUT_CLASS, BTN_PRIMARY, BTN_CANCEL, isOutOfRange } from './shared';
import type { ReadingMethod } from './types';
import type { TemperatureEquipment } from '../../pages/TempLogs';
import type { RetroactiveSaveData } from './TemperatureHistoryTab';

interface Props {
  open: boolean;
  onClose: () => void;
  equipment: TemperatureEquipment[];
  prefillEquipmentId: string;
  prefillReadingTime: string;
  onSave: (data: RetroactiveSaveData) => void;
}

export function RetroactiveEntryModal({ open, onClose, equipment, prefillEquipmentId, prefillReadingTime, onSave }: Props) {
  const [equipmentId, setEquipmentId] = useState('');
  const [temperature, setTemperature] = useState('');
  const [readingMethod, setReadingMethod] = useState<ReadingMethod>('manual_thermometer');
  const [readingTime, setReadingTime] = useState('');
  const [reason, setReason] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');

  // Reset and pre-fill when modal opens
  useEffect(() => {
    if (open) {
      setEquipmentId(prefillEquipmentId);
      setTemperature('');
      setReadingMethod('manual_thermometer');
      setReadingTime(prefillReadingTime ? formatDateTimeLocal(new Date(prefillReadingTime)) : formatDateTimeLocal(new Date()));
      setReason('');
      setCorrectiveAction('');
    }
  }, [open, prefillEquipmentId, prefillReadingTime]);

  const selectedEq = equipment.find(e => e.id === equipmentId);
  const tempVal = temperature ? parseFloat(temperature) : null;
  const inRange = selectedEq && tempVal !== null && !isNaN(tempVal)
    ? !isOutOfRange(tempVal, selectedEq.min_temp, selectedEq.max_temp)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentId || !temperature || tempVal === null || isNaN(tempVal) || !reason.trim()) return;
    onSave({
      equipmentId,
      temperature: tempVal,
      readingMethod: readingMethod || 'manual',
      readingTime: new Date(readingTime).toISOString(),
      reason: reason.trim(),
      correctiveAction: inRange === false && correctiveAction.trim() ? correctiveAction.trim() : null,
    });
  };

  const rangeLabel = selectedEq
    ? selectedEq.min_temp === -Infinity
      ? '0°F or below'
      : `${selectedEq.min_temp}°F – ${selectedEq.max_temp}°F`
    : '';

  return (
    <ModalShell open={open} onClose={onClose} title="Log Retroactive Reading" subtitle="Fill a coverage gap with a past reading">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Retroactive notice */}
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: '#fef6e8', border: '1px solid #c2731a', color: '#c2731a' }}>
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-semibold">This entry will be flagged as retroactive in the audit trail.</span>
        </div>

        <FormField label="Equipment / Location" required>
          <select value={equipmentId} onChange={e => setEquipmentId(e.target.value)} required className={INPUT_CLASS}>
            <option value="">Select equipment...</option>
            {equipment.map(eq => (
              <option key={eq.id} value={eq.id}>{eq.name}{eq.location ? ` — ${eq.location}` : ''}</option>
            ))}
          </select>
          {selectedEq && (
            <p className="mt-1.5 text-xs font-medium text-[#1E2D4D]">Safe range: {rangeLabel}</p>
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
            equipmentName={selectedEq.name}
          />
        )}

        <FormField label="Reading Method">
          <ReadingMethodSelect value={readingMethod} onChange={setReadingMethod} />
        </FormField>

        <FormField label="Reading Date / Time" required>
          <input type="datetime-local" value={readingTime} onChange={e => setReadingTime(e.target.value)} required className={INPUT_CLASS} />
        </FormField>

        <FormField label="Reason for retroactive entry" required>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            required
            placeholder="Why is this reading being logged after the fact?"
            className={INPUT_CLASS}
          />
        </FormField>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className={BTN_CANCEL}>Cancel</button>
          <button type="submit" disabled={!equipmentId || !temperature || !reason.trim()} className={BTN_PRIMARY}>Save Retroactive Reading</button>
        </div>
      </form>
    </ModalShell>
  );
}
