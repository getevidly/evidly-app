/**
 * VerificationPanel — Gate-by-gate verification UI for any content record.
 *
 * Loads gate definitions from `verification_gate_definitions`,
 * current gate states from `content_verification_status`,
 * and full history from `content_verification_log`.
 *
 * Renders inline in admin edit surfaces.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E5E0D8';

interface VerificationPanelProps {
  contentTable: string;
  contentId: string;
  contentType: string;
  contentTitle: string;
  onVerificationChange?: () => void;
}

interface GateDefinition {
  id: string;
  gate_key: string;
  gate_number: number;
  gate_label: string;
  gate_description: string;
  gate_pass_criteria: string;
  is_required: boolean;
  review_cycle_days: number | null;
}

interface VerificationStatus {
  gates_required: number;
  gates_passed: number;
  gates_failed: number;
  gates_pending: number;
  gate_states: Record<string, string>;
  verification_status: string;
  publish_blocked: boolean;
  last_verified_at: string | null;
  last_verified_by: string | null;
  next_review_due: string | null;
}

interface LogEntry {
  id: string;
  gate_key: string;
  gate_label: string;
  gate_result: string;
  verified_by_name: string | null;
  verification_method: string;
  source_urls: { url: string; resolved?: boolean }[];
  reviewer_notes: string | null;
  content_was_corrected: boolean;
  created_at: string;
}

const RESULT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  passed:       { bg: '#ECFDF5', text: '#059669', label: 'PASS' },
  failed:       { bg: '#FEF2F2', text: '#DC2626', label: 'FAIL' },
  needs_update:  { bg: '#FFFBEB', text: '#D97706', label: 'UPDATE' },
  pending:      { bg: '#F9FAFB', text: '#9CA3AF', label: 'PENDING' },
};

const STATUS_BANNERS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  verified:    { bg: '#ECFDF5', border: '#059669', text: '#065F46', label: 'Verified — Ready to Publish' },
  rejected:    { bg: '#FEF2F2', border: '#DC2626', text: '#991B1B', label: 'Rejected — Gate(s) Failed' },
  in_review:   { bg: '#EFF6FF', border: '#2563EB', text: '#1E40AF', label: 'In Review — Not All Gates Passed' },
  unverified:  { bg: '#F9FAFB', border: '#D1D5DB', text: '#6B7280', label: 'Unverified — No Gates Checked Yet' },
  needs_update: { bg: '#FFFBEB', border: '#D97706', text: '#92400E', label: 'Needs Update — Re-review Required' },
  overdue:     { bg: '#FEF2F2', border: '#DC2626', text: '#991B1B', label: 'Overdue — Past Review Deadline' },
};

const METHOD_OPTIONS = [
  'manual_url_check',
  'primary_source_read',
  'cross_reference',
  'phone_call',
  'email_confirmation',
  'expert_review',
  'automated_crawl',
];

export default function VerificationPanel({
  contentTable, contentId, contentType, contentTitle, onVerificationChange,
}: VerificationPanelProps) {
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const [gates, setGates] = useState<GateDefinition[]>([]);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [history, setHistory] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // Per-gate form state
  const [activeGate, setActiveGate] = useState<string | null>(null);
  const [gateForm, setGateForm] = useState({
    result: 'passed' as string,
    method: 'manual_url_check',
    sourceUrl: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [gatesRes, statusRes, historyRes] = await Promise.all([
      supabase
        .from('verification_gate_definitions')
        .select('*')
        .eq('content_type', contentType)
        .order('gate_number'),
      supabase
        .from('content_verification_status')
        .select('*')
        .eq('content_table', contentTable)
        .eq('content_id', contentId)
        .maybeSingle(),
      supabase
        .from('content_verification_log')
        .select('*')
        .eq('content_table', contentTable)
        .eq('content_id', contentId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    if (gatesRes.data) setGates(gatesRes.data);
    if (statusRes.data) setStatus(statusRes.data);
    if (historyRes.data) setHistory(historyRes.data);
    setLoading(false);
  }, [contentTable, contentId, contentType]);

  useEffect(() => { load(); }, [load]);

  const submitGateVerification = async (gateKey: string, gateLabel: string) => {
    if (isDemoMode) {
      console.error('Demo mode: verification log writes blocked');
      return;
    }
    if (gateForm.notes.length < 10) return;
    if (gateKey.includes('gate_1') && gateForm.result === 'passed' && !gateForm.sourceUrl) return;

    setSubmitting(true);
    const { error } = await supabase.from('content_verification_log').insert({
      content_table: contentTable,
      content_id: contentId,
      content_title: contentTitle,
      content_type: contentType,
      gate_key: gateKey,
      gate_label: gateLabel,
      gate_result: gateForm.result,
      verified_by_user_id: user?.id || null,
      verified_by_name: user?.email || 'Admin',
      verified_by_role: 'platform_admin',
      verification_method: gateForm.method,
      source_urls: gateForm.sourceUrl
        ? [{ url: gateForm.sourceUrl, resolved: true, accessed_at: new Date().toISOString() }]
        : [],
      reviewer_notes: gateForm.notes,
    });
    if (error) {
      console.error('Failed to log verification:', error.message);
    } else {
      setActiveGate(null);
      setGateForm({ result: 'passed', method: 'manual_url_check', sourceUrl: '', notes: '' });
      await load();
      onVerificationChange?.();
    }
    setSubmitting(false);
  };

  const getGateState = (gateKey: string): string => {
    return status?.gate_states?.[gateKey] || 'pending';
  };

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: 28, background: '#E5E7EB', borderRadius: 6, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  if (gates.length === 0) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: TEXT_MUTED, fontStyle: 'italic' }}>
        No verification gates defined for content type "{contentType}".
      </div>
    );
  }

  const banner = STATUS_BANNERS[status?.verification_status || 'unverified'] || STATUS_BANNERS.unverified;
  const progressPct = gates.length > 0 ? Math.round(((status?.gates_passed || 0) / gates.length) * 100) : 0;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 10px', fontSize: 12, border: `1px solid ${BORDER}`,
    borderRadius: 6, background: '#F9FAFB', color: NAVY,
  };

  return (
    <div style={{
      border: `1px solid ${banner.border}`,
      borderRadius: 10,
      background: '#fff',
      overflow: 'hidden',
    }}>
      {/* Status banner */}
      <div style={{
        background: banner.bg,
        padding: '10px 16px',
        borderBottom: `1px solid ${banner.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: banner.text }}>
          {banner.label}
        </div>
        <div style={{ fontSize: 11, color: banner.text }}>
          {status?.gates_passed || 0} of {gates.length} gates passed
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#E5E7EB' }}>
        <div style={{
          height: '100%',
          width: `${progressPct}%`,
          background: status?.verification_status === 'verified' ? '#059669'
            : status?.verification_status === 'rejected' ? '#DC2626'
            : '#2563EB',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Gates list */}
      <div style={{ padding: '12px 16px' }}>
        {gates.map(gate => {
          const state = getGateState(gate.gate_key);
          const rc = RESULT_COLORS[state] || RESULT_COLORS.pending;
          const isActive = activeGate === gate.gate_key;

          return (
            <div key={gate.gate_key} style={{ marginBottom: 10, borderBottom: `1px solid #F3F4F6`, paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => setActiveGate(isActive ? null : gate.gate_key)}>
                {/* Gate number badge */}
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: state === 'passed' ? '#059669' : state === 'failed' ? '#DC2626' : NAVY,
                  color: '#fff', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {state === 'passed' ? '✓' : state === 'failed' ? '✗' : gate.gate_number}
                </div>

                {/* Gate label + status */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{gate.gate_label}</div>
                </div>

                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: rc.bg, color: rc.text,
                }}>
                  {rc.label}
                </span>
              </div>

              {/* Expanded: description + form */}
              {isActive && (
                <div style={{ marginTop: 10, marginLeft: 34 }}>
                  <div style={{ fontSize: 11, color: TEXT_SEC, marginBottom: 6, lineHeight: 1.5 }}>
                    {gate.gate_description}
                  </div>
                  <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 10, lineHeight: 1.5, fontStyle: 'italic' }}>
                    Pass criteria: {gate.gate_pass_criteria}
                  </div>

                  {/* Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Result selector */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['passed', 'failed', 'needs_update'].map(r => {
                        const c = RESULT_COLORS[r];
                        return (
                          <button key={r} onClick={() => setGateForm(f => ({ ...f, result: r }))}
                            style={{
                              padding: '4px 12px', borderRadius: 14, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                              background: gateForm.result === r ? c.text : 'transparent',
                              color: gateForm.result === r ? '#fff' : c.text,
                              border: `1px solid ${gateForm.result === r ? c.text : BORDER}`,
                            }}>
                            {c.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Method selector */}
                    <select value={gateForm.method}
                      onChange={e => setGateForm(f => ({ ...f, method: e.target.value }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}>
                      {METHOD_OPTIONS.map(m => (
                        <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                      ))}
                    </select>

                    {/* Source URL (required for Gate 1) */}
                    <input
                      placeholder={gate.gate_key.includes('gate_1') ? 'Source URL (required for Gate 1)' : 'Source URL (optional)'}
                      value={gateForm.sourceUrl}
                      onChange={e => setGateForm(f => ({ ...f, sourceUrl: e.target.value }))}
                      style={inputStyle}
                    />

                    {/* Notes (min 10 chars) */}
                    <textarea
                      placeholder="Reviewer notes (min 10 characters)..."
                      value={gateForm.notes}
                      onChange={e => setGateForm(f => ({ ...f, notes: e.target.value }))}
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />

                    {/* Validation warnings */}
                    {gateForm.notes.length > 0 && gateForm.notes.length < 10 && (
                      <div style={{ fontSize: 10, color: '#D97706' }}>
                        Notes must be at least 10 characters.
                      </div>
                    )}
                    {gate.gate_key.includes('gate_1') && gateForm.result === 'passed' && !gateForm.sourceUrl && (
                      <div style={{ fontSize: 10, color: '#DC2626' }}>
                        Source URL is required to pass Gate 1.
                      </div>
                    )}

                    <button
                      onClick={() => submitGateVerification(gate.gate_key, gate.gate_label)}
                      disabled={submitting || gateForm.notes.length < 10 || (gate.gate_key.includes('gate_1') && gateForm.result === 'passed' && !gateForm.sourceUrl)}
                      style={{
                        padding: '6px 16px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        background: GOLD, color: '#fff', border: 'none',
                        opacity: submitting || gateForm.notes.length < 10 ? 0.5 : 1,
                        alignSelf: 'flex-start',
                      }}>
                      {submitting ? 'Logging...' : 'Log Verification'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* History toggle */}
      <div style={{
        padding: '10px 16px',
        borderTop: `1px solid #F3F4F6`,
      }}>
        <button onClick={() => setShowHistory(!showHistory)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 600, color: TEXT_SEC,
          }}>
          {showHistory ? 'Hide' : 'Show'} Verification History ({history.length} entries)
        </button>

        {showHistory && history.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(entry => {
              const rc = RESULT_COLORS[entry.gate_result] || RESULT_COLORS.pending;
              return (
                <div key={entry.id} style={{
                  padding: '8px 12px', background: '#FAFAF8', borderRadius: 6,
                  border: `1px solid #F3F4F6`, fontSize: 11,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                      background: rc.bg, color: rc.text,
                    }}>{rc.label}</span>
                    <span style={{ fontWeight: 600, color: NAVY }}>{entry.gate_label}</span>
                    <span style={{ color: TEXT_MUTED, marginLeft: 'auto' }}>
                      {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ color: TEXT_SEC, fontSize: 10, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600 }}>{entry.verified_by_name || 'Admin'}</span>
                    {' via '}
                    <span style={{ fontStyle: 'italic' }}>{entry.verification_method?.replace(/_/g, ' ')}</span>
                    {entry.content_was_corrected && (
                      <span style={{ color: '#D97706', fontWeight: 600 }}> (content corrected)</span>
                    )}
                  </div>
                  {entry.source_urls?.length > 0 && (
                    <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>
                      Sources: {entry.source_urls.map((s: { url: string }) => s.url).join(', ')}
                    </div>
                  )}
                  {entry.reviewer_notes && (
                    <div style={{ fontSize: 10, color: TEXT_SEC, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                      {entry.reviewer_notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {showHistory && history.length === 0 && (
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8, fontStyle: 'italic' }}>
            No verification history recorded yet.
          </div>
        )}
      </div>

      {/* Last verified info */}
      {status?.last_verified_at && (
        <div style={{
          padding: '8px 16px', borderTop: `1px solid #F3F4F6`,
          fontSize: 10, color: TEXT_MUTED,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Last verified: {new Date(status.last_verified_at).toLocaleDateString()} by {status.last_verified_by || 'Admin'}</span>
          {status.next_review_due && (
            <span>Next review: {new Date(status.next_review_due).toLocaleDateString()}</span>
          )}
        </div>
      )}
    </div>
  );
}
