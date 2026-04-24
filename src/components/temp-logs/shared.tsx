import { ReactNode, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { ReadingMethod } from './types';
import { AIAssistButton, AIGeneratedIndicator } from '../../components/ui/AIAssistButton';

// ── Modal Shell ──────────────────────────────────────────────
interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function ModalShell({ open, onClose, title, subtitle, children }: ModalShellProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-[95vw] sm:w-auto sm:min-w-[440px] max-w-lg max-h-[90vh] flex flex-col relative modal-content-enter">
        <div className="flex-shrink-0 p-5 pb-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70 transition-colors bg-transparent border-none cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-xl font-bold text-[#1E2D4D] mb-1 pr-8">{title}</h3>
          {subtitle && <p className="text-sm text-[#1E2D4D]/50 mb-5">{subtitle}</p>}
          {!subtitle && <div className="mb-5" />}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-5">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Form Field Wrapper ───────────────────────────────────────
interface FormFieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
}

export function FormField({ label, required, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Reading Method Select ────────────────────────────────────
interface ReadingMethodSelectProps {
  value: ReadingMethod;
  onChange: (v: ReadingMethod) => void;
}

export function ReadingMethodSelect({ value, onChange }: ReadingMethodSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ReadingMethod)}
      className="w-full px-4 py-3 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] bg-white"
    >
      <option value="manual_thermometer">Manual Thermometer</option>
      <option value="infrared_gun">Infrared Gun</option>
      <option value="other">Other</option>
    </select>
  );
}

// ── Out-of-Range Warning ─────────────────────────────────────
interface OutOfRangeWarningProps {
  temperature: number;
  minTemp: number;
  maxTemp: number;
  correctiveAction: string;
  onCorrectiveActionChange: (v: string) => void;
  equipmentName?: string;
}

export function OutOfRangeWarning({ temperature, minTemp, maxTemp, correctiveAction, onCorrectiveActionChange, equipmentName }: OutOfRangeWarningProps) {
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const rangeText = minTemp === -Infinity
    ? `0°F or below`
    : `${minTemp}–${maxTemp}°F`;

  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
        <span className="text-sm font-bold text-amber-700">
          {temperature}°F is outside the safe range ({rangeText})
        </span>
      </div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-[#1E2D4D]/80">
          Corrective action taken <span className="text-[#1E2D4D]/30">(recommended)</span>
        </label>
        <AIAssistButton
          fieldLabel="Corrective Action"
          context={{ temperature: String(temperature), equipmentName: equipmentName || '', status: 'out_of_range' }}
          currentValue={correctiveAction}
          onGenerated={(text) => { onCorrectiveActionChange(text); setAiFields(prev => new Set(prev).add('correctiveAction')); }}
        />
      </div>
      <textarea
        value={correctiveAction}
        onChange={(e) => { onCorrectiveActionChange(e.target.value); setAiFields(prev => { const s = new Set(prev); s.delete('correctiveAction'); return s; }); }}
        rows={2}
        placeholder="Describe corrective action taken..."
        className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
      />
      {aiFields.has('correctiveAction') && <AIGeneratedIndicator />}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────
export function isOutOfRange(temp: number, min: number, max: number): boolean {
  return temp < (min === -Infinity ? -9999 : min) || temp > max;
}

export function tempInputClass(temp: string, inRange: boolean | null): string {
  const base = 'w-full px-4 py-4 text-3xl font-bold tracking-tight text-center border-3 rounded-lg focus:outline-none focus:ring-4 transition-all';
  if (!temp) return `${base} border-[#1E2D4D]/15 focus:ring-[#A08C5A]`;
  if (inRange) return `${base} border-green-500 focus:ring-green-200 bg-green-50`;
  return `${base} border-red-500 focus:ring-red-200 bg-red-50`;
}

export function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const INPUT_CLASS = 'w-full px-4 py-3 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]';
export const BTN_PRIMARY = 'flex-1 px-6 py-3 bg-[#1E2D4D] text-white rounded-lg font-semibold hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] min-h-[44px]';
export const BTN_CANCEL = 'flex-1 px-6 py-3 border-2 border-[#1E2D4D]/15 text-[#1E2D4D]/80 rounded-lg font-medium hover:bg-[#FAF7F0] transition-colors min-h-[44px]';
