import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Archive,
  ArrowRight,
  User,
  MapPin,
  Calendar,
  Shield,
  Paperclip,
  MessageSquare,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { useRole } from '../contexts/RoleContext';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import {
  DEMO_CORRECTIVE_ACTIONS,
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  SOURCE_TYPE_LABELS,
  isOverdue,
  type CAStatus,
  type CASeverity,
  type CANote,
  type CorrectiveActionItem,
} from '../data/correctiveActionsDemoData';

// ── Constants ────────────────────────────────────────────────

const NAVY = '#1e4d6b';

const SEVERITY_CONFIG: Record<CASeverity, { color: string; bg: string; border: string }> = {
  critical: { color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
  high:     { color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  medium:   { color: NAVY, bg: '#eef4f8', border: '#b8d4e8' },
  low:      { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
};

const STATUS_CONFIG: Record<CAStatus, { label: string; color: string; bg: string }> = {
  created:     { label: 'Created', color: '#6366f1', bg: '#eef2ff' },
  in_progress: { label: 'In Progress', color: '#d97706', bg: '#fffbeb' },
  completed:   { label: 'Completed', color: '#16a34a', bg: '#f0fdf4' },
  verified:    { label: 'Verified', color: NAVY, bg: '#eef4f8' },
  closed:      { label: 'Closed', color: '#6b7280', bg: '#f3f4f6' },
  archived:    { label: 'Archived', color: '#9ca3af', bg: '#f9fafb' },
};

const LIFECYCLE_NEXT: Partial<Record<CAStatus, { label: string; next: CAStatus }>> = {
  created:     { label: 'Start Work', next: 'in_progress' },
  in_progress: { label: 'Mark Completed', next: 'completed' },
  completed:   { label: 'Verify', next: 'verified' },
  verified:    { label: 'Close', next: 'closed' },
};

const TIMELINE_STEPS: { key: CAStatus; label: string }[] = [
  { key: 'created', label: 'Created' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'verified', label: 'Verified' },
  { key: 'closed', label: 'Closed' },
];

const STATUS_ORDER: Record<string, number> = {
  created: 0, in_progress: 1, completed: 2, verified: 3, closed: 4, archived: 4,
};

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ── Verify permission by role ────────────────────────────────

const VERIFY_ROLES = ['owner_operator', 'executive', 'compliance_manager', 'platform_admin'];

// ── Component ────────────────────────────────────────────────

export function CorrectiveActionDetail() {
  const { actionId } = useParams<{ actionId: string }>();
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const { userRole } = useRole();

  // Local state for demo lifecycle + notes
  const [localAction, setLocalAction] = useState<CorrectiveActionItem | null>(() => {
    if (!isDemoMode || !actionId) return null;
    const found = DEMO_CORRECTIVE_ACTIONS.find(a => a.id === actionId);
    return found ? { ...found } : null;
  });

  const [newNote, setNewNote] = useState('');

  const item = localAction;
  const canVerify = VERIFY_ROLES.includes(userRole);

  // ── Handlers ─────────────────────────────────────────────

  const handleAdvanceStatus = useCallback((nextStatus: CAStatus) => {
    guardAction('update', 'Corrective Actions', () => {
      setLocalAction(prev => {
        if (!prev) return prev;
        const now = new Date().toISOString().slice(0, 10);
        const updates: Partial<CorrectiveActionItem> = { status: nextStatus };
        if (nextStatus === 'completed') updates.completedAt = now;
        if (nextStatus === 'verified') { updates.verifiedAt = now; updates.verified_by = 'You'; }
        if (nextStatus === 'closed') updates.closedAt = now;
        if (nextStatus === 'archived') updates.archivedAt = now;
        return { ...prev, ...updates };
      });
      toast.success(`Status updated to ${STATUS_CONFIG[nextStatus].label}`);
    });
  }, [guardAction]);

  const handleArchive = useCallback(() => {
    guardAction('update', 'Corrective Actions', () => {
      setLocalAction(prev =>
        prev ? { ...prev, status: 'archived' as CAStatus, archivedAt: new Date().toISOString().slice(0, 10) } : prev
      );
      toast.success('Corrective action archived');
    });
  }, [guardAction]);

  const handleAddNote = useCallback(() => {
    if (!newNote.trim()) return;
    guardAction('update', 'Corrective Actions', () => {
      const note: CANote = {
        text: newNote.trim(),
        author: 'You',
        timestamp: new Date().toISOString(),
      };
      setLocalAction(prev =>
        prev ? { ...prev, notes: [...prev.notes, note] } : prev
      );
      setNewNote('');
      toast.success('Note added');
    });
  }, [newNote, guardAction]);

  // ── Not found ────────────────────────────────────────────

  if (!item) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => navigate('/corrective-actions')} className="flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: NAVY }}>
          <ArrowLeft size={16} /> Back to Corrective Actions
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">Corrective action not found</p>
          <p className="text-xs text-gray-500 mt-1">The requested corrective action does not exist.</p>
        </div>
      </div>
    );
  }

  const sev = SEVERITY_CONFIG[item.severity];
  const stat = STATUS_CONFIG[item.status];
  const overdue = isOverdue(item);
  const lifecycle = LIFECYCLE_NEXT[item.status];
  const currentStepIdx = STATUS_ORDER[item.status] ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-8">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Corrective Actions', path: '/corrective-actions' },
        { label: item.title },
      ]} />

      {/* Back link */}
      <button onClick={() => navigate('/corrective-actions')} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: NAVY }}>
        <ArrowLeft size={16} /> Back to list
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h1 className="text-lg font-bold text-gray-900">{item.title}</h1>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
            style={{ color: sev.color, backgroundColor: sev.bg, border: `1px solid ${sev.border}` }}
          >
            {SEVERITY_LABELS[item.severity]}
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: stat.color, backgroundColor: stat.bg }}
          >
            {stat.label}
          </span>
          {overdue && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-red-700 bg-red-50 border border-red-200">
              OVERDUE
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">{item.description}</p>
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><MapPin size={12} />{item.location}</span>
          <span className="flex items-center gap-1"><User size={12} />Assigned to: {item.assignee}</span>
          <span className="flex items-center gap-1"><User size={12} />Assigned by: {item.assigned_by}</span>
          <span className="flex items-center gap-1"><Calendar size={12} />Due: {formatDate(item.dueDate)}</span>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Timeline</h3>
        <div className="flex items-center justify-between relative">
          {TIMELINE_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            const isFuture = idx > currentStepIdx;
            const dateForStep =
              idx === 0 ? item.createdAt :
              idx === 1 && STATUS_ORDER[item.status] >= 1 ? item.createdAt : // approximate
              idx === 2 ? item.completedAt :
              idx === 3 ? item.verifiedAt :
              idx === 4 ? item.closedAt : null;

            return (
              <div key={step.key} className="flex flex-col items-center relative z-10 flex-1">
                {/* Connector line (before this step) */}
                {idx > 0 && (
                  <div
                    className="absolute top-3 right-1/2 h-0.5"
                    style={{
                      width: '100%',
                      backgroundColor: isCompleted || isCurrent ? '#16a34a' : '#e5e7eb',
                    }}
                  />
                )}
                {/* Circle */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center relative z-10"
                  style={{
                    backgroundColor: isCompleted ? '#16a34a' : isCurrent ? NAVY : '#e5e7eb',
                    border: isFuture ? '2px solid #d1d5db' : 'none',
                  }}
                >
                  {isCompleted && <CheckCircle2 size={14} className="text-white" />}
                  {isCurrent && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                {/* Label */}
                <span
                  className={`text-[10px] mt-1.5 text-center ${isCurrent ? 'font-bold' : 'font-medium'}`}
                  style={{ color: isCurrent ? NAVY : isCompleted ? '#16a34a' : '#9ca3af' }}
                >
                  {step.label}
                </span>
                {/* Date */}
                {dateForStep && (
                  <span className="text-[9px] text-gray-400">{formatDate(dateForStep)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailField label="Category" value={CATEGORY_LABELS[item.category]} />
          <DetailField label="Source Type" value={SOURCE_TYPE_LABELS[item.source_type]} />
          <DetailField label="Source" value={item.source} />
          <DetailField label="Regulation" value={item.regulationReference || 'N/A'} />
          <DetailField label="Root Cause" value={item.rootCause || 'Not yet documented'} full />
          {item.correctiveSteps && (
            <DetailField label="Corrective Steps" value={item.correctiveSteps} full />
          )}
          {item.preventiveMeasures && (
            <DetailField label="Preventive Measures" value={item.preventiveMeasures} full />
          )}
        </div>
      </div>

      {/* Notes / Comments Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={16} style={{ color: NAVY }} />
          <h3 className="text-sm font-semibold text-gray-700">Notes & Comments</h3>
          <span className="text-xs text-gray-400">({item.notes.length})</span>
        </div>

        {item.notes.length === 0 && (
          <p className="text-xs text-gray-400 mb-3">No notes yet. Add the first note below.</p>
        )}

        <div className="space-y-3 mb-4">
          {item.notes.map((note, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-700">{note.author}</span>
                <span className="text-[10px] text-gray-400">{formatTimestamp(note.timestamp)}</span>
              </div>
              <p className="text-sm text-gray-600">{note.text}</p>
            </div>
          ))}
        </div>

        {/* Add note form */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            placeholder="Add a note..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e4d6b]"
          />
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            className="px-3 py-2 rounded-lg text-white disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium"
            style={{ backgroundColor: NAVY }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Paperclip size={16} style={{ color: NAVY }} />
          <h3 className="text-sm font-semibold text-gray-700">Attachments</h3>
          <span className="text-xs text-gray-400">({item.attachments.length})</span>
        </div>

        {item.attachments.length === 0 ? (
          <p className="text-xs text-gray-400">No attachments.</p>
        ) : (
          <div className="space-y-2">
            {item.attachments.map((att, idx) => (
              <button
                key={idx}
                onClick={() => toast.info('File download not available in demo mode')}
                className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText size={14} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700 flex-1">{att.name}</span>
                <span className="text-[10px] text-gray-400 uppercase">{att.type.split('/').pop()}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Verification Section */}
      {(item.status === 'completed' || item.status === 'verified' || item.status === 'closed') && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} style={{ color: NAVY }} />
            <h3 className="text-sm font-semibold text-gray-700">Verification</h3>
          </div>

          {item.verified_by ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-600" />
                <span className="text-sm font-medium text-green-800">Verified by {item.verified_by}</span>
              </div>
              {item.verifiedAt && (
                <p className="text-xs text-green-600 mt-1">on {formatDate(item.verifiedAt)}</p>
              )}
            </div>
          ) : item.status === 'completed' && canVerify ? (
            <div>
              <p className="text-xs text-gray-500 mb-2">This corrective action is awaiting verification.</p>
              <button
                onClick={() => handleAdvanceStatus('verified')}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5"
                style={{ backgroundColor: NAVY }}
              >
                <CheckCircle2 size={14} />
                Verify Completion
              </button>
            </div>
          ) : item.status === 'completed' ? (
            <p className="text-xs text-gray-500">Awaiting verification from a manager or compliance officer.</p>
          ) : null}
        </div>
      )}

      {/* Lifecycle Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {lifecycle && item.status !== 'archived' && !(item.status === 'completed' && !canVerify) && (
          <button
            onClick={() => handleAdvanceStatus(lifecycle.next)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5"
            style={{ backgroundColor: NAVY }}
          >
            <ArrowRight size={14} />
            {lifecycle.label}
          </button>
        )}
        {item.status !== 'archived' && item.status !== 'closed' && (
          <button
            onClick={handleArchive}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 flex items-center gap-1.5"
          >
            <Archive size={14} />
            Archive
          </button>
        )}
      </div>

      {/* Demo upgrade prompt */}
      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          feature={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}

// ── Detail field helper ──────────────────────────────────────

function DetailField({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-1 sm:col-span-2' : ''}>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-700">{value}</p>
    </div>
  );
}
