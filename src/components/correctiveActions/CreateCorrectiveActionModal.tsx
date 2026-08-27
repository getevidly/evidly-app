/**
 * CreateCorrectiveActionModal — spawn a corrective action from a detection.
 *
 * Opened from a drift catch card or an overdue row. The source is fixed by
 * whatever opened it (locked chip, locked category); everything else is a
 * suggestion the operator can override before it is written.
 *
 * Severity and the due date arrive pre-filled from severityEngine so the
 * default is the rated one, not whatever the operator picks first.
 */

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrgMembers } from '../../hooks/useOrgMembers';
import {
  SEVERITY_ASC,
  SEVERITY_COLORS,
  toStoredSeverity,
  type Severity,
} from '../../lib/severityEngine';

const NAVY = '#1E2D4D';
const MUTED = '#6B7F96';
const LINE = 'rgba(30,45,77,0.12)';
const CREAM = '#FAF7F0';

/** corrective_actions.category CHECK: food_safety | fire_safety | facility_services */
export type CACategory = 'food_safety' | 'fire_safety' | 'facility_services';

export interface SpawnSource {
  /** Which detection this came from — sets source_type on the row. */
  sourceType: 'drift' | 'record_expiry';
  /** The flag's own id — drift_catches.id, or the task/document id. */
  sourceId: string;
  /** Human label for the locked Source chip. */
  sourceLabel: string;
  category: CACategory;
  locationId?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  source: SpawnSource;
  /** Prefilled, editable. */
  initialTitle: string;
  /** From severityEngine.classify(). */
  suggestedSeverity: Severity;
  /** From severityEngine, "YYYY-MM-DD". */
  suggestedDueDate: string;
  /** Fired after a successful insert so the caller can refresh its own state. */
  onCreated?: (correctiveActionId: string) => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: MUTED,
  display: 'block',
  marginBottom: 4,
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 14,
  color: NAVY,
  border: `1px solid ${LINE}`,
  borderRadius: 10,
  padding: '9px 11px',
  minHeight: 40,
  background: '#FFFFFF',
};

const CATEGORY_LABELS: Record<CACategory, string> = {
  food_safety: 'Food Safety',
  fire_safety: 'Fire Safety',
  facility_services: 'Facility Services',
};

export function CreateCorrectiveActionModal({
  open,
  onClose,
  source,
  initialTitle,
  suggestedSeverity,
  suggestedDueDate,
  onCreated,
}: Props) {
  const { user, profile } = useAuth();
  const { members } = useOrgMembers();

  const [title, setTitle] = useState(initialTitle);
  const [severity, setSeverity] = useState<Severity>(suggestedSeverity);
  const [dueDate, setDueDate] = useState(suggestedDueDate);
  const [assignee, setAssignee] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const canCreate = !!title.trim() && !!assignee && !saving;

  const handleCreate = async () => {
    if (!profile?.organization_id) {
      toast.error('No organization on your profile — cannot create a corrective action.');
      return;
    }
    if (!assignee) {
      toast.error('Choose an assignee.');
      return;
    }

    setSaving(true);
    try {
      const member = members.find(m => m.id === assignee);
      const assigneeName = member?.full_name || member?.email || null;

      // facility_services has no pillar — the CHECK only allows the two pillars.
      const pillar = source.category === 'facility_services' ? null : source.category;

      const { data, error } = await supabase
        .from('corrective_actions')
        .insert({
          organization_id: profile.organization_id,
          location_id: source.locationId || null,
          title: title.trim(),
          category: source.category,
          pillar,
          severity: toStoredSeverity(severity),
          status: 'reported',
          source: source.sourceLabel,
          source_type: source.sourceType,
          source_id: source.sourceId,
          assignee_id: assignee,
          assignee_name: assigneeName,
          assigned_at: new Date().toISOString(),
          due_date: dueDate || null,
          created_by: user?.id ?? null,
        })
        .select('id')
        .single();

      if (error || !data?.id) {
        console.error('[CreateCorrectiveActionModal] insert failed:', error);
        toast.error('Could not create the corrective action.');
        return;
      }

      toast.success(
        <span>
          Corrective action created.{' '}
          <Link to={`/corrective-actions/${data.id}`} style={{ textDecoration: 'underline', fontWeight: 600 }}>
            Open it
          </Link>
        </span>,
      );
      onCreated?.(data.id);
      onClose();
    } catch (err) {
      console.error('[CreateCorrectiveActionModal] insert threw:', err);
      toast.error('Could not create the corrective action.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Create corrective action"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div
        className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl"
        style={{ maxHeight: '90vh', boxShadow: '0 -8px 32px rgba(11,22,40,0.18)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${LINE}` }}>
          <h2 className="text-[15px] font-semibold" style={{ color: NAVY }}>Create corrective action</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 flex items-center justify-center rounded-full"
          >
            <X className="h-5 w-5" style={{ color: MUTED }} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: 'calc(90vh - 132px)' }}>
          <div>
            <label style={labelStyle} htmlFor="ca-title">Title</label>
            <input
              id="ca-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={fieldStyle}
            />
          </div>

          {/* Source and category are set by whatever opened this — not editable here. */}
          <div>
            <span style={labelStyle}>Source</span>
            <span
              className="inline-flex items-center rounded-full text-[12.5px]"
              style={{ background: CREAM, border: `1px solid ${LINE}`, color: NAVY, padding: '5px 11px' }}
            >
              {source.sourceLabel}
            </span>
          </div>

          <div>
            <span style={labelStyle}>Category</span>
            <span
              className="inline-flex items-center rounded-full text-[12.5px]"
              style={{ background: CREAM, border: `1px solid ${LINE}`, color: NAVY, padding: '5px 11px' }}
            >
              {CATEGORY_LABELS[source.category]}
            </span>
          </div>

          <div>
            <label style={labelStyle} htmlFor="ca-severity">Severity</label>
            <select
              id="ca-severity"
              value={severity}
              onChange={e => setSeverity(e.target.value as Severity)}
              style={{ ...fieldStyle, color: SEVERITY_COLORS[severity], fontWeight: 600 }}
            >
              {[...SEVERITY_ASC].reverse().map(s => (
                <option key={s} value={s} style={{ color: NAVY, fontWeight: 400 }}>{s}</option>
              ))}
            </select>
            {severity !== suggestedSeverity && (
              <p className="text-[11px] mt-1" style={{ color: MUTED }}>
                Suggested: {suggestedSeverity}
              </p>
            )}
          </div>

          <div>
            <label style={labelStyle} htmlFor="ca-due">Due date</label>
            <input
              id="ca-due"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              style={fieldStyle}
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="ca-assignee">Assignee <span style={{ color: '#B3261E' }}>*</span></label>
            <select
              id="ca-assignee"
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              style={fieldStyle}
            >
              <option value="">Choose someone…</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name || m.email || m.id}</option>
              ))}
            </select>
            {members.length === 0 && (
              <p className="text-[11px] mt-1" style={{ color: MUTED }}>
                No team members available to assign.
              </p>
            )}
          </div>
        </div>

        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ borderTop: `1px solid ${LINE}`, paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <button
            onClick={onClose}
            className="rounded-xl text-[13px] font-medium px-4"
            style={{ minHeight: 44, border: `1px solid ${LINE}`, color: MUTED }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="flex-1 rounded-xl text-white text-[14px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ minHeight: 44, backgroundColor: NAVY }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
