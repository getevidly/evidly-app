import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ArrowRight,
  User,
  MapPin,
  Calendar,
  Shield,
  Paperclip,
  MessageSquare,
  Send,
  History,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { SuggestionPill } from '../components/ai/SuggestionPill';
import { GhostInput } from '../components/ai/GhostInput';
import { useRole } from '../contexts/RoleContext';
import { useConfetti } from '../hooks/useConfetti';
import { useMilestoneCheck } from '../hooks/useMilestoneCheck';
import { MilestoneCelebrationModal } from '../components/ambassador/MilestoneCelebrationModal';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import {
  CA_STATUS_MAP,
  CA_STATUS_ORDER,
  SEVERITY_CONFIG,
  DEMO_TEAM_MEMBERS,
  type CAStatus,
} from '../constants/correctiveActionStatus';
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  SOURCE_TYPE_LABELS,
  isOverdue,
  type CANote,
  type CorrectiveActionItem,
} from '../data/correctiveActionsDemoData';

// ── Constants ────────────────────────────────────────────────

const NAVY = '#1E2D4D';

const TIMELINE_STEPS: { key: CAStatus; label: string }[] = [
  { key: 'reported', label: 'Reported' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'verified', label: 'Verified' },
];

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ── Component ────────────────────────────────────────────────

export function CorrectiveActionDetail() {
  const { actionId } = useParams<{ actionId: string }>();
  const navigate = useNavigate();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const { userRole } = useRole();
  const { triggerConfetti } = useConfetti();
  const { pendingMilestone, checkMilestone, dismissMilestone } = useMilestoneCheck();

  // Local state for lifecycle + notes (no seeded data — items come from list page or DB)
  const [localAction, setLocalAction] = useState<CorrectiveActionItem | null>(null);

  const [newNote, setNewNote] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [verificationNote, setVerificationNote] = useState('');

  const item = localAction;

  // ── Handlers ─────────────────────────────────────────────

  const handleAdvanceStatus = useCallback((nextStatus: CAStatus) => {
    guardAction('update', 'Corrective Actions', () => {
      setLocalAction(prev => {
        if (!prev) return prev;
        const now = new Date();
        const updates: Partial<CorrectiveActionItem> = { status: nextStatus };
        const historyEntry = {
          action: 'status_changed' as const,
          from: prev.status,
          to: nextStatus,
          by: 'You',
          timestamp: now.toISOString(),
          detail: '',
        };

        if (nextStatus === 'assigned' && !prev.assignee) {
          // Can't assign without an assignee — handled by UI disabling
          return prev;
        }
        if (nextStatus === 'resolved') {
          updates.resolvedAt = now.toISOString().slice(0, 10);
          updates.resolved_by = 'You';
          updates.resolution_note = resolutionNote;
          historyEntry.detail = resolutionNote;
        }
        if (nextStatus === 'verified') {
          updates.verifiedAt = now.toISOString().slice(0, 10);
          updates.verified_by = 'You';
          updates.verification_note = verificationNote;
          historyEntry.detail = verificationNote;
        }

        return {
          ...prev,
          ...updates,
          history: [...prev.history, historyEntry],
        };
      });
      toast.success(`Status updated to ${CA_STATUS_MAP[nextStatus].label}`);

      // Celebration on verified (final status)
      if (nextStatus === 'verified') {
        triggerConfetti();
        navigator.vibrate?.([30, 20, 30]);
        checkMilestone('zero_open_cas');
      }
    });
  }, [guardAction, resolutionNote, verificationNote, triggerConfetti, checkMilestone]);

  const handleReassign = useCallback((newAssignee: string) => {
    guardAction('update', 'Corrective Actions', () => {
      setLocalAction(prev => {
        if (!prev) return prev;
        const now = new Date();
        return {
          ...prev,
          assignee: newAssignee,
          assigned_by: 'You',
          assignedAt: now.toISOString().slice(0, 10),
          history: [...prev.history, {
            action: 'reassigned',
            from: prev.assignee || 'Unassigned',
            to: newAssignee,
            by: 'You',
            timestamp: now.toISOString(),
            detail: `Reassigned to ${newAssignee}`,
          }],
        };
      });
      toast.success(`Reassigned to ${newAssignee}`);
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
        prev ? {
          ...prev,
          notes: [...prev.notes, note],
          history: [...prev.history, {
            action: 'note_added',
            by: 'You',
            timestamp: new Date().toISOString(),
            detail: newNote.trim().length > 60 ? newNote.trim().substring(0, 60) + '\u2026' : newNote.trim(),
          }],
        } : prev
      );
      setNewNote('');
      toast.success('Note added');
    });
  }, [newNote, guardAction]);

  const handleApplyAiDraft = useCallback(() => {
    if (!item?.ai_draft) return;
    setResolutionNote(item.ai_draft);
    toast.success('AI draft applied to resolution note');
  }, [item?.ai_draft]);

  // ── Not found ────────────────────────────────────────────

  if (!item) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => navigate('/corrective-actions')} className="flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: NAVY }}>
          <ArrowLeft size={16} /> Back to Corrective Actions
        </button>
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-[#1E2D4D]/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-[#1E2D4D]/80">Corrective action not found</p>
          <p className="text-xs text-[#1E2D4D]/50 mt-1">The requested corrective action does not exist.</p>
        </div>
      </div>
    );
  }

  const sev = SEVERITY_CONFIG[item.severity];
  const stat = CA_STATUS_MAP[item.status];
  const overdue = isOverdue(item);
  const currentStepIdx = CA_STATUS_ORDER[item.status] ?? 0;
  const lifecycle = stat.nextStatus ? { next: stat.nextStatus, label: stat.nextLabel! } : null;
  const canAdvance = stat.allowedRoles.includes(userRole);

  // Resolution time
  const resolveDays = item.resolvedAt
    ? Math.ceil((new Date(item.resolvedAt).getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Gate: resolved requires resolution note, verified requires verification note
  const advanceBlocked = (() => {
    if (!lifecycle) return true;
    if (lifecycle.next === 'resolved' && !resolutionNote.trim()) return true;
    if (lifecycle.next === 'verified' && !verificationNote.trim()) return true;
    return false;
  })();

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
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h1 className="text-lg font-bold text-[#1E2D4D]">{item.title}</h1>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full uppercase"
            style={{ color: sev.color, backgroundColor: sev.bg, border: `1px solid ${sev.border}` }}
          >
            {SEVERITY_LABELS[item.severity]}
          </span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ color: stat.color, backgroundColor: stat.bg }}
          >
            {stat.label}
          </span>
          {overdue && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-red-700 bg-red-50 border border-red-200">
              OVERDUE
            </span>
          )}
          {resolveDays !== null && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full text-green-700 bg-green-50 border border-green-200">
              Resolved in {resolveDays}d
            </span>
          )}
        </div>
        <p className="text-sm text-[#1E2D4D]/70">{item.description}</p>
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-[#1E2D4D]/30">
          <span className="flex items-center gap-1"><MapPin size={12} />{item.location}</span>
          {item.assignee && <span className="flex items-center gap-1"><User size={12} />Assigned to: {item.assignee}</span>}
          {item.assigned_by && <span className="flex items-center gap-1"><User size={12} />Assigned by: {item.assigned_by}</span>}
          <span className="flex items-center gap-1"><Calendar size={12} />Due: {formatDate(item.dueDate)}</span>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
        <h3 className="text-sm font-semibold text-[#1E2D4D]/80 mb-4">Status Timeline</h3>
        <div className="flex items-center justify-between relative">
          {TIMELINE_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            const isFuture = idx > currentStepIdx;
            // Find relevant date from history or timestamp fields
            const dateForStep =
              idx === 0 ? item.createdAt :
              idx === 1 ? item.assignedAt :
              idx === 2 ? (item.history.find(h => h.to === 'in_progress')?.timestamp?.slice(0, 10) || null) :
              idx === 3 ? item.resolvedAt :
              idx === 4 ? item.verifiedAt : null;

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
                  className={`text-xs mt-1.5 text-center ${isCurrent ? 'font-bold' : 'font-medium'}`}
                  style={{ color: isCurrent ? NAVY : isCompleted ? '#16a34a' : '#9ca3af' }}
                >
                  {step.label}
                </span>
                {/* Date */}
                {dateForStep && (
                  <span className="text-[11px] text-[#1E2D4D]/30">{formatDate(dateForStep)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Assignment Section */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
        <div className="flex items-center gap-2 mb-3">
          <User size={16} style={{ color: NAVY }} />
          <h3 className="text-sm font-semibold text-[#1E2D4D]/80">Assignment</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-[#1E2D4D]/30 uppercase tracking-wide mb-0.5">Assignee</p>
            <p className="text-sm text-[#1E2D4D]/80">{item.assignee || 'Unassigned'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#1E2D4D]/30 uppercase tracking-wide mb-0.5">Assigned By</p>
            <p className="text-sm text-[#1E2D4D]/80">{item.assigned_by || '\u2014'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#1E2D4D]/30 uppercase tracking-wide mb-0.5">Assigned Date</p>
            <p className="text-sm text-[#1E2D4D]/80">{item.assignedAt ? formatDate(item.assignedAt) : '\u2014'}</p>
          </div>
        </div>
        {/* Reassign dropdown — only for management roles and non-terminal statuses */}
        {item.status !== 'verified' && canAdvance && (
          <div className="mt-3 pt-3 border-t border-[#1E2D4D]/5">
            <label className="block text-xs font-medium text-[#1E2D4D]/50 mb-1">Reassign to</label>
            <select
              value=""
              onChange={e => { if (e.target.value) handleReassign(e.target.value); }}
              className="text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-1.5 text-[#1E2D4D]/80 w-full sm:w-auto"
            >
              <option value="">Select team member...</option>
              {DEMO_TEAM_MEMBERS.filter(m => m.name !== item.assignee).map(m => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Detail Grid */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
        <h3 className="text-sm font-semibold text-[#1E2D4D]/80 mb-3">Details</h3>
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

      {/* AI Draft Card */}
      {item.ai_draft && item.status !== 'verified' && (
        <div className="bg-white rounded-xl border-2 border-amber-300 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">AI-Suggested Resolution Plan</h3>
          </div>
          <p className="text-xs text-amber-600 mb-3">AI-generated \u2014 review before saving</p>
          <p className="text-sm text-[#1E2D4D]/80 bg-amber-50 rounded-lg p-3">{item.ai_draft}</p>
          {item.status === 'in_progress' && (
            <button
              onClick={handleApplyAiDraft}
              className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 transition-colors"
            >
              Apply to Resolution Note
            </button>
          )}
        </div>
      )}

      {/* Resolution Note Section */}
      {['in_progress', 'resolved', 'verified'].includes(item.status) && (
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} style={{ color: NAVY }} />
            <h3 className="text-sm font-semibold text-[#1E2D4D]/80">Resolution Note</h3>
          </div>
          {item.resolution_note ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-sm text-green-800">{item.resolution_note}</p>
              {item.resolved_by && item.resolvedAt && (
                <p className="text-xs text-green-600 mt-2">Resolved by {item.resolved_by} on {formatDate(item.resolvedAt)}</p>
              )}
            </div>
          ) : item.status === 'in_progress' ? (
            <div>
              <p className="text-xs text-[#1E2D4D]/50 mb-2">Describe what was done to resolve this issue. Required to mark as resolved.</p>
              <textarea
                value={resolutionNote}
                onChange={e => setResolutionNote(e.target.value)}
                rows={3}
                placeholder="Describe resolution actions taken..."
                className="w-full text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2 focus:outline-none focus:border-[#1E2D4D] resize-none"
              />
              <SuggestionPill
                fieldLabel="Resolution Note"
                formContext={{ title: item?.title, category: item?.category, severity: item?.severity }}
                entityType="corrective_action"
                onAccept={(text) => setResolutionNote(text)}
              />
            </div>
          ) : (
            <p className="text-xs text-[#1E2D4D]/30">No resolution note recorded.</p>
          )}
        </div>
      )}

      {/* Verification Note Section */}
      {['resolved', 'verified'].includes(item.status) && (
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} style={{ color: NAVY }} />
            <h3 className="text-sm font-semibold text-[#1E2D4D]/80">Verification</h3>
          </div>
          {item.verification_note ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-600" />
                <span className="text-sm font-medium text-green-800">Verified by {item.verified_by}</span>
              </div>
              <p className="text-sm text-green-700 mt-2">{item.verification_note}</p>
              {item.verifiedAt && (
                <p className="text-xs text-green-600 mt-1">on {formatDate(item.verifiedAt)}</p>
              )}
            </div>
          ) : item.status === 'resolved' && canAdvance ? (
            <div>
              <p className="text-xs text-[#1E2D4D]/50 mb-2">Confirm this corrective action has been properly implemented. Required to verify.</p>
              <textarea
                value={verificationNote}
                onChange={e => setVerificationNote(e.target.value)}
                rows={3}
                placeholder="Describe verification findings..."
                className="w-full text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2 focus:outline-none focus:border-[#1E2D4D] resize-none"
              />
              <SuggestionPill
                fieldLabel="Verification Note"
                formContext={{ title: item?.title, category: item?.category, severity: item?.severity }}
                entityType="corrective_action"
                onAccept={(text) => setVerificationNote(text)}
              />
            </div>
          ) : item.status === 'resolved' ? (
            <p className="text-xs text-[#1E2D4D]/50">Awaiting verification from a manager or compliance officer.</p>
          ) : null}
        </div>
      )}

      {/* Notes / Comments Section */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={16} style={{ color: NAVY }} />
          <h3 className="text-sm font-semibold text-[#1E2D4D]/80">Notes & Comments</h3>
          <span className="text-xs text-[#1E2D4D]/30">({item.notes.length})</span>
        </div>

        {item.notes.length === 0 && (
          <p className="text-xs text-[#1E2D4D]/30 mb-3">No notes yet. Add the first note below.</p>
        )}

        <div className="space-y-3 mb-4">
          {item.notes.map((note, idx) => (
            <div key={idx} className="bg-[#FAF7F0] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-[#1E2D4D]/80">{note.author}</span>
                <span className="text-xs text-[#1E2D4D]/30">{formatTimestamp(note.timestamp)}</span>
              </div>
              <p className="text-sm text-[#1E2D4D]/70">{note.text}</p>
            </div>
          ))}
        </div>

        {/* Add note form */}
        <div className="flex gap-2">
          <GhostInput
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            placeholder="Add a note..."
            fieldLabel="Add a note"
            formContext={{ title: item?.title, category: item?.category, severity: item?.severity }}
            entityType="corrective_action"
            className="flex-1 text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2 focus:outline-none focus:border-[#1E2D4D]"
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
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Paperclip size={16} style={{ color: NAVY }} />
          <h3 className="text-sm font-semibold text-[#1E2D4D]/80">Attachments</h3>
          <span className="text-xs text-[#1E2D4D]/30">({item.attachments.length})</span>
        </div>

        {item.attachments.length === 0 ? (
          <p className="text-xs text-[#1E2D4D]/30">No attachments.</p>
        ) : (
          <div className="space-y-2">
            {item.attachments.map((att, idx) => (
              <button
                key={idx}
                onClick={() => toast.info('File download not available in demo mode')}
                className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-[#FAF7F0] transition-colors"
              >
                <FileText size={14} className="text-[#1E2D4D]/30 shrink-0" />
                <span className="text-sm text-[#1E2D4D]/80 flex-1">{att.name}</span>
                <span className="text-xs text-[#1E2D4D]/30 uppercase">{att.type.split('/').pop()}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Audit Trail */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
        <div className="flex items-center gap-2 mb-3">
          <History size={16} style={{ color: NAVY }} />
          <h3 className="text-sm font-semibold text-[#1E2D4D]/80">Audit Trail</h3>
          <span className="text-xs text-[#1E2D4D]/30">({item.history.length})</span>
        </div>

        {item.history.length === 0 ? (
          <p className="text-xs text-[#1E2D4D]/30">No history recorded.</p>
        ) : (
          <div className="space-y-2">
            {[...item.history].reverse().map((entry, idx) => {
              const actionText = entry.action === 'status_changed'
                ? entry.from
                  ? `Status changed from ${CA_STATUS_MAP[entry.from as CAStatus]?.label || entry.from} to ${CA_STATUS_MAP[entry.to as CAStatus]?.label || entry.to}`
                  : `Status set to ${CA_STATUS_MAP[entry.to as CAStatus]?.label || entry.to}`
                : entry.action === 'reassigned'
                  ? `Reassigned from ${entry.from} to ${entry.to}`
                  : entry.action === 'note_added'
                    ? 'Note added'
                    : entry.action;

              return (
                <div key={idx} className="flex items-start gap-3 py-2 border-b border-[#1E2D4D]/3 last:border-0">
                  <div className="w-5 h-5 rounded-full bg-[#1E2D4D]/5 flex items-center justify-center shrink-0 mt-0.5">
                    {entry.action === 'status_changed' && <ArrowRight size={10} className="text-[#1E2D4D]/50" />}
                    {entry.action === 'reassigned' && <User size={10} className="text-[#1E2D4D]/50" />}
                    {entry.action === 'note_added' && <MessageSquare size={10} className="text-[#1E2D4D]/50" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#1E2D4D]/80">{actionText}</p>
                    {entry.detail && (
                      <p className="text-xs text-[#1E2D4D]/50 mt-0.5">{entry.detail}</p>
                    )}
                    <p className="text-xs text-[#1E2D4D]/30 mt-0.5">{entry.by} &middot; {formatTimestamp(entry.timestamp)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lifecycle Action Buttons */}
      {lifecycle && canAdvance && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleAdvanceStatus(lifecycle.next)}
            disabled={advanceBlocked}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
            style={{ backgroundColor: NAVY }}
          >
            <ArrowRight size={14} />
            {lifecycle.label}
          </button>
          {advanceBlocked && lifecycle.next === 'resolved' && (
            <span className="text-xs text-[#1E2D4D]/30">Resolution note required</span>
          )}
          {advanceBlocked && lifecycle.next === 'verified' && (
            <span className="text-xs text-[#1E2D4D]/30">Verification note required</span>
          )}
        </div>
      )}
      {lifecycle && !canAdvance && (
        <div className="text-xs text-[#1E2D4D]/30">
          Only authorized roles can advance this status.
        </div>
      )}

      {/* Demo upgrade prompt */}
      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          feature={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}

      {/* Milestone modal */}
      <MilestoneCelebrationModal milestone={pendingMilestone} onDismiss={dismissMilestone} />
    </div>
  );
}

// ── Detail field helper ──────────────────────────────────────

function DetailField({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-1 sm:col-span-2' : ''}>
      <p className="text-xs font-medium text-[#1E2D4D]/30 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-[#1E2D4D]/80">{value}</p>
    </div>
  );
}
