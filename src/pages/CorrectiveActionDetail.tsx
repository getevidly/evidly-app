import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
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
  type CAStatus,
} from '../constants/correctiveActionStatus';
import { useOrgMembers } from '../hooks/useOrgMembers';
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
  const location = useLocation();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const { isDemoMode } = useDemo();
  const { user, profile } = useAuth();
  const { userRole } = useRole();
  const { members: orgMembers } = useOrgMembers();
  const { triggerConfetti } = useConfetti();
  const { pendingMilestone, checkMilestone, dismissMilestone } = useMilestoneCheck();

  // Local state — populated from location state (instant) or DB fetch (live mode)
  const [localAction, setLocalAction] = useState<CorrectiveActionItem | null>(() => {
    // If navigated from list page with state, use that for instant render
    const stateItem = (location.state as any)?.caItem as CorrectiveActionItem | undefined;
    return stateItem ?? null;
  });
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // Fetch from DB if we don't have local data (direct URL visit, page refresh)
  useEffect(() => {
    if (!actionId || localAction || isDemoMode || !profile?.organization_id || fetchAttempted) return;
    setFetchAttempted(true);

    (async () => {
      const { data: row, error } = await supabase
        .from('corrective_actions')
        .select('id, title, description, category, severity, status, source, source_type, source_id, assignee_id, assignee_name, due_date, root_cause, regulation_reference, template_id, created_at, resolved_at, resolved_by, verified_at, verified_by, resolution_note, verification_note, ai_draft, location_id, notes, attachments, history, corrective_steps, preventive_measures, assigned_at, assigned_by_user_id')
        .eq('id', actionId)
        .eq('organization_id', profile.organization_id)
        .single();

      if (error || !row) {
        console.error('[CADetail] Fetch failed:', error);
        return;
      }

      // Resolve location name
      let locationName = '';
      if (row.location_id) {
        const { data: loc } = await supabase
          .from('locations')
          .select('name')
          .eq('id', row.location_id)
          .single();
        locationName = loc?.name || '';
      }

      // Resolve assignee name from org members if not stored
      const assigneeName = row.assignee_name
        || orgMembers.find(m => m.id === row.assignee_id)?.full_name
        || '';

      // Resolve assigned_by name
      const assignedByName = row.assigned_by_user_id
        ? (orgMembers.find(m => m.id === row.assigned_by_user_id)?.full_name || '')
        : '';

      const mapped: CorrectiveActionItem = {
        id: row.id,
        title: row.title || '',
        description: row.description || '',
        location: locationName,
        locationId: row.location_id || '',
        category: (row.category || 'food_safety') as any,
        severity: (row.severity || 'medium') as any,
        status: (row.status || 'reported') as any,
        source: row.source || '',
        source_type: row.source_type || 'manual',
        source_id: row.source_id || null,
        assignee: assigneeName,
        assigned_by: assignedByName,
        assignedAt: row.assigned_at?.slice(0, 10) || null,
        createdAt: row.created_at?.slice(0, 10) || '',
        dueDate: row.due_date || '',
        resolvedAt: row.resolved_at?.slice(0, 10) || null,
        resolved_by: row.resolved_by || null,
        resolution_note: row.resolution_note || null,
        verifiedAt: row.verified_at?.slice(0, 10) || null,
        verified_by: row.verified_by || null,
        verification_note: row.verification_note || null,
        rootCause: row.root_cause || '',
        correctiveSteps: row.corrective_steps || '',
        preventiveMeasures: row.preventive_measures || '',
        regulationReference: row.regulation_reference || '',
        templateId: row.template_id || null,
        ai_draft: row.ai_draft || null,
        notes: Array.isArray(row.notes) ? row.notes : [],
        attachments: Array.isArray(row.attachments) ? row.attachments : [],
        history: Array.isArray(row.history) ? row.history : [],
      };

      setLocalAction(mapped);
    })();
  }, [actionId, localAction, isDemoMode, profile?.organization_id, fetchAttempted, orgMembers]);

  const [newNote, setNewNote] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [verificationNote, setVerificationNote] = useState('');

  const item = localAction;

  // ── Handlers ─────────────────────────────────────────────

  const handleAdvanceStatus = useCallback((nextStatus: CAStatus) => {
    guardAction('update', 'Corrective Actions', async () => {
      const prev = localAction;
      if (!prev) return;

      if (nextStatus === 'assigned' && !prev.assignee) return;
      if ((nextStatus === 'resolved' || nextStatus === 'verified') && !prev.assignee) return;

      const now = new Date();
      const nowIso = now.toISOString();
      const actorName = profile?.full_name || user?.email || 'Unknown';

      const historyEntry = {
        action: 'status_changed' as const,
        from: prev.status,
        to: nextStatus,
        by: actorName,
        timestamp: nowIso,
        detail: '',
      };

      const dbUpdates: Record<string, any> = { status: nextStatus };

      if (nextStatus === 'resolved') {
        dbUpdates.resolved_at = nowIso;
        dbUpdates.resolved_by = user?.id || null;
        dbUpdates.resolution_note = resolutionNote;
        historyEntry.detail = resolutionNote;
      }
      if (nextStatus === 'verified') {
        dbUpdates.verified_at = nowIso;
        dbUpdates.verified_by = user?.id || null;
        dbUpdates.verification_note = verificationNote;
        historyEntry.detail = verificationNote;
      }

      dbUpdates.history = [...prev.history, historyEntry];

      // Persist to DB in live mode
      if (!isDemoMode && actionId) {
        const { error } = await supabase
          .from('corrective_actions')
          .update(dbUpdates)
          .eq('id', actionId);

        if (error) {
          toast.error('Failed to update status');
          console.error('[CADetail] Status update failed:', error);
          return;
        }

        // Audit trail row
        await supabase.from('corrective_action_history').insert({
          corrective_action_id: actionId,
          action: 'status_changed',
          from_value: prev.status,
          to_value: nextStatus,
          performed_by: user?.id || null,
          performed_by_name: actorName,
          detail: historyEntry.detail || `Status changed to ${nextStatus}`,
        });
      }

      // Update local state
      const localUpdates: Partial<CorrectiveActionItem> = { status: nextStatus };
      if (nextStatus === 'resolved') {
        localUpdates.resolvedAt = nowIso.slice(0, 10);
        localUpdates.resolved_by = actorName;
        localUpdates.resolution_note = resolutionNote;
      }
      if (nextStatus === 'verified') {
        localUpdates.verifiedAt = nowIso.slice(0, 10);
        localUpdates.verified_by = actorName;
        localUpdates.verification_note = verificationNote;
      }

      setLocalAction(prev => prev ? {
        ...prev,
        ...localUpdates,
        history: [...prev.history, historyEntry],
      } : prev);

      toast.success(`Status updated to ${CA_STATUS_MAP[nextStatus].label}`);

      if (nextStatus === 'verified') {
        triggerConfetti();
        navigator.vibrate?.([30, 20, 30]);
        checkMilestone('zero_open_cas');
      }
    });
  }, [guardAction, localAction, actionId, user, profile, isDemoMode, resolutionNote, verificationNote, triggerConfetti, checkMilestone]);

  const handleReassign = useCallback((memberId: string, memberName: string) => {
    guardAction('update', 'Corrective Actions', async () => {
      const prev = localAction;
      if (!prev) return;

      const now = new Date();
      const nowIso = now.toISOString();
      const actorName = profile?.full_name || user?.email || 'Unknown';

      const historyEntry = {
        action: 'reassigned',
        from: prev.assignee || 'Unassigned',
        to: memberName,
        by: actorName,
        timestamp: nowIso,
        detail: `Reassigned to ${memberName}`,
      };

      // Persist to DB in live mode
      if (!isDemoMode && actionId) {
        const { error } = await supabase
          .from('corrective_actions')
          .update({
            assignee_id: memberId,
            assignee_name: memberName,
            assigned_at: nowIso,
            assigned_by_user_id: user?.id || null,
            history: [...prev.history, historyEntry],
          })
          .eq('id', actionId);

        if (error) {
          toast.error('Failed to reassign');
          console.error('[CADetail] Reassign failed:', error);
          return;
        }

        await supabase.from('corrective_action_history').insert({
          corrective_action_id: actionId,
          action: 'reassigned',
          from_value: prev.assignee || 'Unassigned',
          to_value: memberName,
          performed_by: user?.id || null,
          performed_by_name: actorName,
          detail: `Reassigned to ${memberName}`,
        });
      }

      setLocalAction(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          assignee: memberName,
          assigned_by: actorName,
          assignedAt: nowIso.slice(0, 10),
          history: [...prev.history, historyEntry],
        };
      });
      toast.success(`Reassigned to ${memberName}`);
    });
  }, [guardAction, localAction, actionId, user, profile, isDemoMode]);

  const handleAddNote = useCallback(() => {
    if (!newNote.trim()) return;
    guardAction('update', 'Corrective Actions', async () => {
      const prev = localAction;
      if (!prev) return;

      const actorName = profile?.full_name || user?.email || 'Unknown';
      const nowIso = new Date().toISOString();

      const note: CANote = {
        text: newNote.trim(),
        author: actorName,
        timestamp: nowIso,
      };

      const historyEntry = {
        action: 'note_added',
        by: actorName,
        timestamp: nowIso,
        detail: newNote.trim().length > 60 ? newNote.trim().substring(0, 60) + '\u2026' : newNote.trim(),
      };

      // Persist to DB in live mode
      if (!isDemoMode && actionId) {
        const { error } = await supabase
          .from('corrective_actions')
          .update({
            notes: [...prev.notes, note],
            history: [...prev.history, historyEntry],
          })
          .eq('id', actionId);

        if (error) {
          toast.error('Failed to add note');
          console.error('[CADetail] Add note failed:', error);
          return;
        }

        await supabase.from('corrective_action_history').insert({
          corrective_action_id: actionId,
          action: 'note_added',
          performed_by: user?.id || null,
          performed_by_name: actorName,
          detail: newNote.trim().length > 60 ? newNote.trim().substring(0, 60) + '\u2026' : newNote.trim(),
        });
      }

      setLocalAction(prev =>
        prev ? {
          ...prev,
          notes: [...prev.notes, note],
          history: [...prev.history, historyEntry],
        } : prev
      );
      setNewNote('');
      toast.success('Note added');
    });
  }, [newNote, guardAction, localAction, actionId, user, profile, isDemoMode]);

  const handleApplyAiDraft = useCallback(() => {
    if (!item?.ai_draft) return;
    setResolutionNote(item.ai_draft);
    toast.success('AI draft applied to resolution note');
  }, [item?.ai_draft]);

  // ── Loading / Not found ─────────────────────────────────

  if (!item) {
    // Still fetching — show loading if we haven't attempted yet
    const isLoading = !isDemoMode && profile?.organization_id && !fetchAttempted;
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => navigate('/corrective-actions')} className="flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: NAVY }}>
          <ArrowLeft size={16} /> Back to Corrective Actions
        </button>
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8 text-center">
          {isLoading ? (
            <>
              <Clock className="w-10 h-10 text-[#1E2D4D]/30 mx-auto mb-3 animate-pulse" />
              <p className="text-sm font-medium text-[#1E2D4D]/80">Loading corrective action...</p>
            </>
          ) : (
            <>
              <AlertTriangle className="w-10 h-10 text-[#1E2D4D]/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-[#1E2D4D]/80">Corrective action not found</p>
              <p className="text-xs text-[#1E2D4D]/50 mt-1">The requested corrective action does not exist.</p>
            </>
          )}
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

  // Gate: resolved/verified requires assignee + resolution/verification note
  const noAssignee = !item.assignee;
  const advanceBlocked = (() => {
    if (!lifecycle) return true;
    if ((lifecycle.next === 'resolved' || lifecycle.next === 'verified') && noAssignee) return true;
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
              onChange={e => {
                const mid = e.target.value;
                if (!mid) return;
                const member = orgMembers.find(m => m.id === mid);
                if (member) handleReassign(mid, member.full_name || member.email || 'Unknown');
              }}
              className="text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-1.5 text-[#1E2D4D]/80 w-full sm:w-auto"
            >
              <option value="">Select team member...</option>
              {orgMembers.filter(m => (m.full_name || m.email) !== item.assignee).map(m => (
                <option key={m.id} value={m.id}>{m.full_name || m.email || 'Unknown'}</option>
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
          {item.source === 'incident' && item.source_id && (
            <div className="col-span-1">
              <p className="text-xs font-medium text-[#1E2D4D]/50 mb-1">Linked Incident</p>
              <button
                onClick={() => navigate('/incidents')}
                className="flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:underline"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                View originating incident
              </button>
            </div>
          )}
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
          {advanceBlocked && noAssignee && (lifecycle.next === 'resolved' || lifecycle.next === 'verified') && (
            <span className="text-xs text-red-500/70">Assign someone to this corrective action before it can be resolved</span>
          )}
          {advanceBlocked && !noAssignee && lifecycle.next === 'resolved' && (
            <span className="text-xs text-[#1E2D4D]/30">Resolution note required</span>
          )}
          {advanceBlocked && !noAssignee && lifecycle.next === 'verified' && (
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
