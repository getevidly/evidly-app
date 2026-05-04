/**
 * TaskDefinitionForm.jsx — TASK-ASSIGN-01
 *
 * Modal form for creating/editing task definitions.
 * Name, type, schedule, assignment, escalation levels.
 */

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, BookOpen, PenLine, ClipboardList, Sparkles, UserCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useOrgMembers, getMemberName } from '../../hooks/useOrgMembers';
import { useAuth } from '../../contexts/AuthContext';

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


const inputClass = 'w-full text-sm px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2';
const labelClass = 'block text-xs font-semibold text-[var(--text-secondary)] mb-1';

export function TaskDefinitionForm({ definition, onSave, onClose }) {
  const isEdit = !!definition;
  const { members } = useOrgMembers();
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  // H2 — Tab state. Edits skip Template tab and land on Scratch.
  const [createTab, setCreateTab] = useState('scratch');

  const [aiDraftApplied, setAiDraftApplied] = useState(false);

  // H3 — Hardcoded drafts keyed on task_type. Refactor to ai-text-assist later.
  const AI_DRAFT_DATA = {
    temperature_log: {
      name: 'Walk-in cooler temperature check',
      description: 'Record walk-in cooler temperature using calibrated thermometer. Verify reading is at or below 41°F per FDA Food Code 3-501.16.',
      task_type: 'temperature_log',
      schedule_type: 'daily',
      schedule_shifts: ['morning', 'evening'],
      due_time: '07:00',
      assigned_to_role: '',
    },
    checklist: {
      name: 'Opening checklist',
      description: 'Complete the daily opening checklist: sanitizer concentration, handwashing stations stocked, hot/cold holding temperatures verified, prep area clean.',
      task_type: 'checklist',
      schedule_type: 'daily',
      schedule_shifts: ['morning'],
      due_time: '06:30',
      assigned_to_role: '',
    },
    corrective_action: {
      name: 'Review open corrective actions',
      description: 'Review all open corrective actions, update status, verify completion of overdue items. Escalate any stalled actions to manager.',
      task_type: 'corrective_action',
      schedule_type: 'weekly',
      schedule_days: [1],
      due_time: '09:00',
      assigned_to_role: '',
    },
    document_upload: {
      name: 'Upload weekly compliance documents',
      description: 'Upload weekly hood cleaning certificate, pest control service report, and any inspection findings to the document repository.',
      task_type: 'document_upload',
      schedule_type: 'weekly',
      schedule_days: [5],
      due_time: '15:00',
      assigned_to_role: '',
    },
    equipment_check: {
      name: 'Equipment safety check',
      description: 'Inspect equipment for damage, leaks, electrical issues, and proper guarding. Verify thermometer calibration and refrigeration gauge readings.',
      task_type: 'equipment_check',
      schedule_type: 'weekly',
      schedule_days: [1],
      due_time: '08:00',
      assigned_to_role: '',
    },
    vendor_service: {
      name: 'Schedule next vendor service',
      description: 'Confirm upcoming vendor services (hood cleaning, pest control, fire suppression) are scheduled and certificates of insurance are current.',
      task_type: 'vendor_service',
      schedule_type: 'weekly',
      schedule_days: [1],
      due_time: '10:00',
      assigned_to_role: '',
    },
    custom: {
      name: 'New recurring task',
      description: 'Description of what needs to be done, why it matters, and what evidence to capture.',
      task_type: 'custom',
      schedule_type: 'daily',
      due_time: '09:00',
      assigned_to_role: '',
    },
  };

  const handleAiDraft = () => {
    const draft = AI_DRAFT_DATA[form.task_type] || AI_DRAFT_DATA.custom;
    setForm((prev) => ({
      ...prev,
      name: prev.name || draft.name,
      description: draft.description,
      task_type: draft.task_type,
      schedule_type: draft.schedule_type,
      schedule_days: draft.schedule_days || prev.schedule_days,
      schedule_shifts: draft.schedule_shifts || prev.schedule_shifts,
      due_time: draft.due_time,
      assigned_to_user_id: '',
    }));
    setAiDraftApplied(true);
    setCreateTab('scratch');
  };

  const [form, setForm] = useState({
    name: '',
    description: '',
    task_type: 'custom',
    schedule_type: 'daily',
    schedule_days: [],
    schedule_shifts: [],
    due_time: '',
    assigned_to_user_id: '',
    reminder_minutes: 30,
    due_soon_minutes: 15,
    escalation_config: { enabled: true, levels: [{ delay_minutes: 30, notify_user_id: '' }] },
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
        assigned_to_user_id: definition.assigned_to_user_id || '',
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
    const levels = [...form.escalation_config.levels, { delay_minutes: 60, notify_user_id: '' }];
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
    <Modal isOpen={true} onClose={onClose} size="lg" className="max-h-[90vh] flex flex-col">
      <div
        className="flex flex-col flex-1 min-h-0"
        style={{ border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            {isEdit ? 'Edit Task Template' : 'New Task Template'}
          </h2>
          <div className="flex items-center gap-2">
            {!isEdit && (
              <button
                type="button"
                onClick={handleAiDraft}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: '#fdf8e8', color: '#b8962f', border: '1px solid #A08C5A' }}
              >
                <Sparkles className="h-4 w-4" />
                AI Draft
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-panel)]">
              <X className="w-5 h-5 text-[var(--text-tertiary)]" />
            </button>
          </div>
        </div>

          {/* Tab toggle — hidden when editing (edits always work in scratch form) */}
          {!isEdit && (
            <div className="flex flex-shrink-0 border-b border-[#1E2D4D]/10 px-5">
              <button
                type="button"
                onClick={() => setCreateTab('scratch')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  createTab === 'scratch'
                    ? 'border-[#1E2D4D] text-[#1E2D4D] font-semibold'
                    : 'border-transparent text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80'
                }`}
              >
                <PenLine className="w-3.5 h-3.5" />
                From Scratch
              </button>
              <button
                type="button"
                onClick={() => setCreateTab('template')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  createTab === 'template'
                    ? 'border-[#1E2D4D] text-[#1E2D4D] font-semibold'
                    : 'border-transparent text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                From Template
              </button>
            </div>
          )}

          {/* From Template empty state — shown only when on Template tab */}
          {!isEdit && createTab === 'template' && (
            <div className="flex flex-col items-center justify-center text-center px-5 py-10 flex-1 min-h-0">
              <ClipboardList className="w-10 h-10 mb-3 text-[var(--text-tertiary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No starter templates yet</h3>
              <p className="text-xs text-[var(--text-tertiary)] mb-4 max-w-sm">
                Pre-built task templates for common kitchen operations are coming soon. For now, build your own from scratch.
              </p>
              <button
                type="button"
                onClick={() => setCreateTab('scratch')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ backgroundColor: '#1E2D4D' }}
              >
                <PenLine className="w-4 h-4" />
                Build From Scratch
              </button>
            </div>
          )}

          {/* From Scratch form — original form, now gated to scratch tab */}
          <form
            onSubmit={handleSubmit}
            className={`p-5 space-y-4 overflow-y-auto flex-1 min-h-0 ${
              !isEdit && createTab === 'template' ? 'hidden' : ''
            }`}
          >
            {aiDraftApplied && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: '#fdf8e8', border: '1px solid #fde68a', color: '#92400e' }}>
                <Sparkles className="h-4 w-4 flex-shrink-0" style={{ color: '#A08C5A' }} />
                <span>AI-generated draft — review and edit before saving</span>
              </div>
            )}

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
              <label className={labelClass}>Assign to Person</label>
              <select className={inputClass} value={form.assigned_to_user_id} onChange={(e) => set('assigned_to_user_id', e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email || 'Unknown'}</option>)}
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
                      className="text-sm px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 w-20 flex-shrink-0"
                      value={level.delay_minutes}
                      onChange={(e) => updateEscalationLevel(idx, 'delay_minutes', e.target.value)}
                      min={1}
                      placeholder="min"
                    />
                    <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap flex-shrink-0">min →</span>
                    <select
                      className="text-sm px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 flex-1 min-w-0"
                      value={level.notify_user_id}
                      onChange={(e) => updateEscalationLevel(idx, 'notify_user_id', e.target.value)}
                    >
                      <option value="">Select person…</option>
                      {members
                        .filter((m) => {
                          if (m.id === currentUserId) return false;
                          if (m.id === form.assigned_to_user_id) return false;
                          const earlierIds = form.escalation_config.levels.slice(0, idx).map((l) => l.notify_user_id);
                          return !earlierIds.includes(m.id);
                        })
                        .map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email || 'Unknown'}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeEscalationLevel(idx)}
                      className="p-1 rounded hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
                {(() => {
                  const usedIds = new Set(form.escalation_config.levels.map((l) => l.notify_user_id).filter(Boolean));
                  if (currentUserId) usedIds.add(currentUserId);
                  if (form.assigned_to_user_id) usedIds.add(form.assigned_to_user_id);
                  const eligible = members.filter((m) => !usedIds.has(m.id));
                  return (
                    <button
                      type="button"
                      onClick={addEscalationLevel}
                      disabled={eligible.length === 0}
                      className="flex items-center gap-1 text-xs text-[#1E2D4D] font-medium hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Level
                    </button>
                  );
                })()}
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
    </Modal>
  );
}
