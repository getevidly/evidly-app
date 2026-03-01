import { ReactNode } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { ReadingMethod } from './types';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl p-5 w-[95vw] sm:w-auto sm:min-w-[440px] max-w-lg max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-gray-900 mb-1 pr-8">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mb-5">{subtitle}</p>}
        {!subtitle && <div className="mb-5" />}
        {children}
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
      <label className="block text-sm font-medium text-gray-700 mb-2">
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
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] bg-white"
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
}

export function OutOfRangeWarning({ temperature, minTemp, maxTemp, correctiveAction, onCorrectiveActionChange }: OutOfRangeWarningProps) {
  const rangeText = minTemp === -Infinity
    ? `0°F or below`
    : `${minTemp}–${maxTemp}°F`;

  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
        <span className="text-sm font-bold text-amber-700">
          {temperature}°F is outside the safe range ({rangeText})
        </span>
      </div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Corrective action taken <span className="text-gray-400">(recommended)</span>
      </label>
      <textarea
        value={correctiveAction}
        onChange={(e) => onCorrectiveActionChange(e.target.value)}
        rows={2}
        placeholder="Describe corrective action taken..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
      />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────
export function isOutOfRange(temp: number, min: number, max: number): boolean {
  return temp < (min === -Infinity ? -9999 : min) || temp > max;
}

export function tempInputClass(temp: string, inRange: boolean | null): string {
  const base = 'w-full px-4 py-4 text-3xl font-bold text-center border-3 rounded-lg focus:outline-none focus:ring-4 transition-all';
  if (!temp) return `${base} border-gray-300 focus:ring-[#d4af37]`;
  if (inRange) return `${base} border-green-500 focus:ring-green-200 bg-green-50`;
  return `${base} border-red-500 focus:ring-red-200 bg-red-50`;
}

export function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const INPUT_CLASS = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]';
export const BTN_PRIMARY = 'flex-1 px-6 py-3 bg-[#1e4d6b] text-white rounded-lg font-semibold hover:bg-[#163a52] transition-colors min-h-[44px]';
export const BTN_CANCEL = 'flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors min-h-[44px]';
