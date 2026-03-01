import { useState } from 'react';
import { Check, X as XIcon } from 'lucide-react';
import { ModalShell, FormField, ReadingMethodSelect, formatDateTimeLocal, INPUT_CLASS, BTN_PRIMARY, BTN_CANCEL } from './shared';
import type { ReadingMethod, CategoryTempConfig } from './types';

export interface ReceivingReadingSaveData {
  itemDescription: string;
  vendorName: string;
  foodCategory: string;
  temperature: number | null;
  isPass: boolean;
  readingMethod: ReadingMethod;
  readingTime: string;
  notes: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  vendors: string[];
  categoryConfig: CategoryTempConfig;
  onSave: (data: ReceivingReadingSaveData) => void;
}

export function AddReceivingReadingModal({ open, onClose, vendors, categoryConfig, onSave }: Props) {
  const [itemDescription, setItemDescription] = useState('');
  const [foodCategory, setFoodCategory] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [showVendorOther, setShowVendorOther] = useState(false);
  const [temperature, setTemperature] = useState('');
  const [readingMethod, setReadingMethod] = useState<ReadingMethod>('manual_thermometer');
  const [readingTime, setReadingTime] = useState(formatDateTimeLocal(new Date()));
  const [notes, setNotes] = useState('');

  const cfg = foodCategory ? categoryConfig[foodCategory] : null;
  const tempRequired = cfg?.tempRequired ?? true;
  const maxTemp = cfg?.maxTemp ?? 41;
  const tempVal = temperature ? parseFloat(temperature) : null;
  const isPass = !tempRequired ? true : (tempVal !== null && !isNaN(tempVal) ? tempVal <= maxTemp : null);

  const resetForm = () => {
    setItemDescription(''); setFoodCategory(''); setVendorName('');
    setShowVendorOther(false); setTemperature('');
    setReadingMethod('manual_thermometer');
    setReadingTime(formatDateTimeLocal(new Date()));
    setNotes('');
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemDescription || !foodCategory) return;
    if (tempRequired && (tempVal === null || isNaN(tempVal!))) return;
    onSave({
      itemDescription,
      vendorName,
      foodCategory,
      temperature: tempRequired ? tempVal : null,
      isPass: isPass === true,
      readingMethod,
      readingTime: new Date(readingTime).toISOString(),
      notes,
    });
    resetForm();
    onClose();
  };

  return (
    <ModalShell open={open} onClose={handleClose} title="Add Receiving Reading" subtitle="Log temperature for incoming delivery">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Item / Product Name" required>
          <input type="text" value={itemDescription} onChange={e => setItemDescription(e.target.value)} required placeholder="e.g., Ground Beef, Chicken Breast" className={INPUT_CLASS} />
        </FormField>

        <FormField label="Food Category" required>
          <select value={foodCategory} onChange={e => { setFoodCategory(e.target.value); setTemperature(''); }} required className={INPUT_CLASS}>
            <option value="">Select category...</option>
            {Object.entries(categoryConfig).map(([key, c]) => (
              <option key={key} value={key}>{c.label}</option>
            ))}
          </select>
          {cfg && (
            <div className={`mt-2 p-2.5 rounded-lg text-xs font-medium ${tempRequired ? 'bg-[#eef4f8] text-[#1e4d6b] border border-[#D1D9E6]' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
              {tempRequired ? `Required: Must be ≤${maxTemp}°F` : 'No temperature check required for this category'}
            </div>
          )}
        </FormField>

        <FormField label="Supplier / Vendor">
          <select
            value={showVendorOther ? 'Other' : vendorName}
            onChange={e => {
              if (e.target.value === 'Other') { setShowVendorOther(true); setVendorName(''); }
              else { setShowVendorOther(false); setVendorName(e.target.value); }
            }}
            className={INPUT_CLASS}
          >
            <option value="">Select vendor...</option>
            {vendors.map(v => <option key={v} value={v}>{v}</option>)}
            <option value="Other">Other</option>
          </select>
          {showVendorOther && (
            <input type="text" value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="Enter vendor name" className={`${INPUT_CLASS} mt-2`} />
          )}
        </FormField>

        {tempRequired && (
          <>
            <FormField label="Temperature (°F)" required>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={temperature}
                onChange={e => setTemperature(e.target.value)}
                required
                placeholder="00.0"
                className={`w-full px-4 py-4 text-3xl font-bold text-center border-3 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                  !temperature ? 'border-gray-300 focus:ring-[#d4af37]'
                  : isPass ? 'border-green-500 focus:ring-green-200 bg-green-50'
                  : 'border-red-500 focus:ring-red-200 bg-red-50'
                }`}
              />
            </FormField>

            {temperature && isPass !== null && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold ${
                isPass ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {isPass ? <Check className="h-5 w-5" /> : <XIcon className="h-5 w-5" />}
                {isPass ? `ACCEPT — ${tempVal}°F is within safe range (≤${maxTemp}°F)` : `REJECT — ${tempVal}°F exceeds safe limit (≤${maxTemp}°F)`}
              </div>
            )}
          </>
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
          <button type="submit" disabled={!itemDescription || !foodCategory || (tempRequired && !temperature)} className={BTN_PRIMARY}>Save Reading</button>
        </div>
      </form>
    </ModalShell>
  );
}
