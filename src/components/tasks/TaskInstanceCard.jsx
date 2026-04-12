/**
 * TaskInstanceCard.jsx — TASK-ASSIGN-01
 *
 * Status-driven task card for task_instances.
 * Colors: pending=gray, in_progress=Navy, completed=Green,
 *         overdue=Red+pulse, escalated=Red+badge.
 */

import { useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, Play, SkipForward, MessageSquare } from 'lucide-react';

const STATUS_STYLES = {
  pending: {
    border: '#D1D9E6',
    bg: '#FFFFFF',
    icon: Clock,
    iconColor: '#6B7F96',
    label: 'Pending',
    labelBg: '#F1F5F9',
    labelColor: '#475569',
  },
  in_progress: {
    border: '#1E2D4D',
    bg: '#FFFFFF',
    icon: Play,
    iconColor: '#1E2D4D',
    label: 'In Progress',
    labelBg: '#EFF6FF',
    labelColor: '#1E2D4D',
  },
  completed: {
    border: '#166534',
    bg: '#FFFFFF',
    icon: CheckCircle2,
    iconColor: '#166534',
    label: 'Completed',
    labelBg: '#F0FDF4',
    labelColor: '#166534',
  },
  overdue: {
    border: '#991B1B',
    bg: '#FFFBFB',
    icon: AlertTriangle,
    iconColor: '#991B1B',
    label: 'Overdue',
    labelBg: '#FEF2F2',
    labelColor: '#991B1B',
  },
  skipped: {
    border: '#D1D9E6',
    bg: '#F8FAFC',
    icon: SkipForward,
    iconColor: '#94A3B8',
    label: 'Skipped',
    labelBg: '#F1F5F9',
    labelColor: '#64748B',
  },
  escalated: {
    border: '#991B1B',
    bg: '#FFFBFB',
    icon: AlertTriangle,
    iconColor: '#991B1B',
    label: 'Escalated',
    labelBg: '#FEF2F2',
    labelColor: '#991B1B',
  },
};

const TYPE_LABELS = {
  temperature_log: 'Temp Log',
  checklist: 'Checklist',
  corrective_action: 'Corrective Action',
  document_upload: 'Document',
  equipment_check: 'Equipment',
  vendor_service: 'Vendor Service',
  custom: 'Custom',
};

export function TaskInstanceCard({ task, onStart, onComplete, onSkip }) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');

  const style = STATUS_STYLES[task.status] || STATUS_STYLES.pending;
  const StatusIcon = style.icon;
  const isActionable = task.status === 'pending' || task.status === 'in_progress' || task.status === 'overdue' || task.status === 'escalated';
  const dueTime = new Date(task.due_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const handleComplete = () => {
    if (showNote && note.trim()) {
      onComplete?.(task.id, note.trim());
      setShowNote(false);
      setNote('');
    } else if (!showNote) {
      onComplete?.(task.id);
    }
  };

  return (
    <div
      className="rounded-xl px-4 py-3 transition-all"
      style={{
        backgroundColor: style.bg,
        border: `2px solid ${style.border}`,
        boxShadow: '0 1px 3px rgba(11,22,40,.06)',
        animation: task.status === 'overdue' ? 'pulse 2s infinite' : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        <StatusIcon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: style.iconColor }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{task.title}</h3>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: style.labelBg, color: style.labelColor }}
            >
              {style.label}
            </span>
            {task.status === 'escalated' && task.escalation_level > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                Level {task.escalation_level}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
            <span>{TYPE_LABELS[task.task_type] || task.task_type}</span>
            <span>Due {dueTime}</span>
            {task.shift && <span>Shift: {task.shift}</span>}
          </div>

          {task.completion_note && task.status === 'completed' && (
            <p className="text-xs text-[var(--text-secondary)] mt-1 italic">
              Note: {task.completion_note}
            </p>
          )}
        </div>

        {isActionable && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {task.status === 'pending' && (
              <button
                onClick={() => onStart?.(task.id)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-panel)] transition-colors"
                title="Start Task"
              >
                <Play className="w-4 h-4" style={{ color: '#1E2D4D' }} />
              </button>
            )}
            <button
              onClick={() => setShowNote(!showNote)}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-panel)] transition-colors"
              title="Add Note"
            >
              <MessageSquare className="w-4 h-4 text-[var(--text-tertiary)]" />
            </button>
            <button
              onClick={handleComplete}
              className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
              title="Complete"
            >
              <CheckCircle2 className="w-4 h-4" style={{ color: '#166534' }} />
            </button>
            <button
              onClick={() => onSkip?.(task.id)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Skip"
            >
              <SkipForward className="w-4 h-4 text-[var(--text-tertiary)]" />
            </button>
          </div>
        )}
      </div>

      {showNote && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]"
            onKeyDown={(e) => { if (e.key === 'Enter') handleComplete(); }}
          />
          <button
            onClick={handleComplete}
            className="text-xs px-3 py-1.5 rounded-lg text-white font-medium"
            style={{ backgroundColor: '#166534' }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
