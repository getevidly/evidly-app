/**
 * TeamTaskStatus.jsx — TASK-ASSIGN-01
 *
 * Kitchen manager team task overview widget.
 * Shows progress bar + per-status breakdown.
 */

import { useNavigate } from 'react-router-dom';
import { Users, Plus } from 'lucide-react';
import { useTaskInstances } from '../../../hooks/useTaskInstances';
import { useDemo } from '../../../contexts/DemoContext';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, TEXT_TERTIARY } from './constants';

export function TeamTaskStatus() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { tasks, loading } = useTaskInstances();

  if (isDemoMode) {
    return (
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4" style={{ color: '#1E2D4D' }} />
          <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Team Tasks</h3>
        </div>
        <p className="text-xs" style={{ color: TEXT_TERTIARY }}>
          Team task status will appear here when task templates are active.
        </p>
      </div>
    );
  }

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const overdue = tasks.filter((t) => t.status === 'overdue' || t.status === 'escalated').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: '#1E2D4D' }} />
          <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Team Tasks</h3>
        </div>
        <button
          onClick={() => navigate('/tasks?action=new')}
          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg hover:bg-[var(--bg-panel)]"
          style={{ color: '#1E2D4D' }}
        >
          <Plus className="w-3 h-3" /> Assign
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse h-12 rounded-lg bg-[var(--bg-panel)]" />
      ) : total === 0 ? (
        <p className="text-xs" style={{ color: TEXT_TERTIARY }}>No tasks scheduled for today.</p>
      ) : (
        <>
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: BODY_TEXT }}>{pct}% Complete</span>
              <span className="text-xs" style={{ color: TEXT_TERTIARY }}>{completed}/{total}</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--bg-panel)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: '#166534' }}
              />
            </div>
          </div>

          {/* Status breakdown */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Pending', count: pending, color: '#6B7F96' },
              { label: 'Active', count: inProgress, color: '#1E2D4D' },
              { label: 'Done', count: completed, color: '#166534' },
              { label: 'Overdue', count: overdue, color: '#991B1B' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.count}</div>
                <div className="text-xs" style={{ color: TEXT_TERTIARY }}>{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
