/**
 * TaskDefinitionForm.jsx — TASK-ASSIGN-01
 *
 * Modal form for creating/editing task definitions.
 * Name, type, schedule, assignment, escalation levels.
 */

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const TASK_TYPES = [
  { value: 'temperature_log', label: 'Temperature Log' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'corrective_action', label: 'Corrective Action' },
  { value: 'document_upload', label: 'Document Upload' },
  { value: 'equipment_check', label: 'Equipment Check' },
  { value: 'vendor_service', label: 'Vendor Service' },
  { value: 'custom', label: 'Custom' },
];

const SCHEDULE_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'shift', label: 'Per Shift' },
  { value: 'once', label: 'One Time' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHIFTS = ['morning', 'midday', 'evening', 'closing'];

const ROLES = [
  { value: 'kitchen_staff', label: 'Kitchen Staff' },
  { value: 'chef', label: 'Chef' },
  { value: 'kitchen_manager', label: 'Kitchen Manager' },
  { value: 'owner_operator', label: 'Owner/Operator' },
  { value: 'compliance_manager', label: 'Compliance Manager' },
  { value: 'facilities_manager', label: 'Facilities Manager' },
];

const inputClass = 'w-full text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]';
const labelClass = 'block text-xs font-semibold text-[var(--text-secondary)] mb-1';

export function TaskDefinitionForm({ definition, onSave, onClose }) {
  const isEdit = !!definition;

  const [form, setForm] = useState({
    name: '',
    description: '',
    task_type: 'custom',
    schedule_type: 'daily',
    schedule_days: [],
    schedule_shifts: [],
    due_time: '',
    assigned_to_role: '',
    reminder_minutes: 30,
    due_soon_minutes: 15,
    escalation_config: { enabled: true, levels: [{ delay_minutes: 30, notify_role: 'kitchen_manager' }] },
    is_active: true,
  });

  useEffect(() => {
    if (definition) {
      setForm({
        name: definition.name || '',
        description: definition.description || '',
        task_type: definition.task_type || 'custom',
        schedule_type: definition.schedule_type || 'daily',
        schedule_days: definition.schedule_days || [],
        schedule_shifts: definition.schedule_shifts || [],
        due_time: definition.due_time || '',
        assigned_to_role: definition.assigned_to_role || '',
        reminder_minutes: definition.reminder_minutes ?? 30,
        due_soon_minutes: definition.due_soon_minutes ?? 15,
        escalation_config: definition.escalation_config || { enabled: true, levels: [] },
        is_active: definition.is_active ?? true,
      });
    }
  }, [definition]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleDay = (day) => {
    const days = form.schedule_days.includes(day)
      ? form.schedule_days.filter((d) => d !== day)
      : [...form.schedule_days, day];
    set('schedule_days', days);
  };

  const toggleShift = (shift) => {
    const shifts = form.schedule_shifts.includes(shift)
      ? form.schedule_shifts.filter((s) => s !== shift)
      : [...form.schedule_shifts, shift];
    set('schedule_shifts', shifts);
  };

  const addEscalationLevel = () => {
    const levels = [...form.escalation_config.levels, { delay_minutes: 60, notify_role: 'owner_operator' }];
    set('escalation_config', { ...form.escalation_config, levels });
  };

  const removeEscalationLevel = (idx) => {
    const levels = form.escalation_config.levels.filter((_, i) => i !== idx);
    set('escalation_config', { ...form.escalation_config, levels });
  };

  const updateEscalationLevel = (idx, field, value) => {
    const levels = form.escalation_config.levels.map((l, i) =>
      i === idx ? { ...l, [field]: field === 'delay_minutes' ? parseInt(value, 10) || 0 : value } : l
    );
    set('escalation_config', { ...form.escalation_config, levels });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave?.(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            {isEdit ? 'Edit Task Template' : 'New Task Template'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-panel)]">
            <X className="w-5 h-5 text-[var(--text-tertiary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className={labelClass}>Task Name *</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Morning Walk-in Temp Check"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass + ' resize-none'}
              rows={2}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Optional details..."
            />
          </div>

          {/* Type + Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Task Type</label>
              <select className={inputClass} value={form.task_type} onChange={(e) => set('task_type', e.target.value)}>
                {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Schedule</label>
              <select className={inputClass} value={form.schedule_type} onChange={(e) => set('schedule_type', e.target.value)}>
                {SCHEDULE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Weekly days */}
          {form.schedule_type === 'weekly' && (
            <div>
              <label className={labelClass}>Days of Week</label>
              <div className="flex gap-1.5">
                {DAY_NAMES.map((name, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className="px-2.5 py-1 text-xs rounded-lg font-medium transition-colors"
                    style={{
                      backgroundColor: form.schedule_days.includes(idx) ? '#1E2D4D' : 'var(--bg-panel)',
                      color: form.schedule_days.includes(idx) ? '#FFFFFF' : 'var(--text-secondary)',
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Shift selection */}
          {form.schedule_type === 'shift' && (
            <div>
              <label className={labelClass}>Shifts</label>
              <div className="flex gap-1.5 flex-wrap">
                {SHIFTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleShift(s)}
                    className="px-3 py-1 text-xs rounded-lg font-medium capitalize transition-colors"
                    style={{
                      backgroundColor: form.schedule_shifts.includes(s) ? '#1E2D4D' : 'var(--bg-panel)',
                      color: form.schedule_shifts.includes(s) ? '#FFFFFF' : 'var(--text-secondary)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Due time + Assignment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Due Time</label>
              <input
                type="time"
                className={inputClass}
                value={form.due_time}
                onChange={(e) => set('due_time', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Assign to Role</label>
              <select className={inputClass} value={form.assigned_to_role} onChange={(e) => set('assigned_to_role', e.target.value)}>
                <option value="">Anyone</option>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {/* Reminder + Due Soon */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Reminder (min before)</label>
              <input
                type="number"
                className={inputClass}
                value={form.reminder_minutes}
                onChange={(e) => set('reminder_minutes', parseInt(e.target.value, 10) || 0)}
                min={0}
              />
            </div>
            <div>
              <label className={labelClass}>Due Soon Alert (min)</label>
              <input
                type="number"
                className={inputClass}
                value={form.due_soon_minutes}
                onChange={(e) => set('due_soon_minutes', parseInt(e.target.value, 10) || 0)}
                min={0}
              />
            </div>
          </div>

          {/* Escalation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass + ' mb-0'}>Escalation Levels</label>
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.escalation_config.enabled}
                  onChange={(e) => set('escalation_config', { ...form.escalation_config, enabled: e.target.checked })}
                  className="rounded"
                />
                Enabled
              </label>
            </div>

            {form.escalation_config.enabled && (
              <div className="space-y-2">
                {form.escalation_config.levels.map((level, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="number"
                      className={inputClass + ' w-20'}
                      value={level.delay_minutes}
                      onChange={(e) => updateEscalationLevel(idx, 'delay_minutes', e.target.value)}
                      min={1}
                      placeholder="min"
                    />
                    <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">min →</span>
                    <select
                      className={inputClass + ' flex-1'}
                      value={level.notify_role}
                      onChange={(e) => updateEscalationLevel(idx, 'notify_role', e.target.value)}
                    >
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeEscalationLevel(idx)}
                      className="p-1 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEscalationLevel}
                  className="flex items-center gap-1 text-xs text-[#1E2D4D] font-medium hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Level
                </button>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-lg text-white"
              style={{ backgroundColor: '#1E2D4D' }}
            >
              {isEdit ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
