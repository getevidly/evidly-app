/**
 * ExtractionDetail — Admin review & release screen for a single Policy Lens intake.
 * Route: /admin/policy-lens/:intakeId
 * Design of record: docs/policy-lens/review-release-design.html (4ebc82e2)
 *
 * Three zones:
 *   LEFT   — Policy source (read-only, source_refs[].requirement_text)
 *   MIDDLE — Findings picker (compact list with state badges)
 *   RIGHT  — Selected reading card + release dock
 *
 * Field mapping (locked — admin reviews prospect branch, kitchen voice):
 *   "What your policy expects"   ← correlation.expects.kitchen
 *   "What you can show"          ← correlation.shows.prospect.kitchen
 *   "What happens if you can't"  ← correlation.gap.prospect.kitchen
 *   Citation chip                ← source_refs[].form_or_section_ref + named_standard
 *   Citation status              ← citation_status (verified → Verified, else → Citation pending)
 *   State badge                  ← applicability_state → Met | Gap | Not required | Unknown
 *   Insured-facing block         ← kitchen_payload.title + body
 *
 * Edits are wording-only, reason-required, append-only (reviewer_corrected).
 * Release posts to two destinations: client EvidLY account + selected broker.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';

/* ── Brand palette ─────────────────────────────────────────────── */
const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const CREAM = '#FAF7F0';
const TEAL = '#0F766E';
const CORAL = '#C2553A';
const AMBER = '#B7791F';
const MUTE = '#6B7280';
const SLATE = '#475569';
const LINE = '#E5E0D5';
const LOCK_BG = '#F3F1EA';

/* ── Flag severity ─────────────────────────────────────────────── */
const FLAG_COLORS = {
  high:      { bg: '#FBEAE5', fg: CORAL },
  elevated:  { bg: '#FBF3E0', fg: AMBER },
  low:       { bg: '#EEF1F6', fg: NAVY },
  satisfied: { bg: '#E8F2F1', fg: TEAL },
};
const FLAG_ORDER = { high: 0, elevated: 1, low: 2, satisfied: 3 };

/* ── Part metadata ─────────────────────────────────────────────── */
const PART_META = {
  fire:    { color: CORAL, label: 'Fire Safety — AHJ' },
  food:    { color: TEAL,  label: 'Food Safety — EHD' },
  general: { color: NAVY,  label: 'Policy-Wide Conditions' },
};

/* ── Review state → badge ──────────────────────────────────────── */
const REVIEW_META = {
  pending:   { label: 'Not reviewed', bg: '#EFece3', fg: MUTE },
  accepted:  { label: 'Reviewed',     bg: '#E6F2F0', fg: TEAL },
  corrected: { label: 'Edited',       bg: '#E9EDF5', fg: NAVY },
  flagged:   { label: 'Flagged',      bg: '#FBEAE5', fg: CORAL },
};

/* ── Applicability state → design badge ────────────────────────── */
const APPLICABILITY_META = {
  applicable_evidenced:   { label: 'Met',          bg: '#E8F2F1', fg: TEAL },
  applicable_unevidenced: { label: 'Gap',          bg: '#FBEAE5', fg: CORAL },
  not_applicable:         { label: 'Not required', bg: '#F3F4F6', fg: MUTE },
  unknown:                { label: 'Unknown',      bg: '#FBF3E0', fg: AMBER },
};

/* ── Stage pipeline ────────────────────────────────────────────── */
const STAGES = [
  { key: 'reading',        label: 'Reading' },
  { key: 'reconciling',    label: 'Reconciling' },
  { key: 'findings_ready', label: 'Findings ready' },
  { key: 'in_review',      label: 'Your review' },
  { key: 'released',       label: 'Released' },
];

function deriveStage(run) {
  if (!run) return 'reading';
  if (run.release_status === 'released') return 'released';
  if (run.release_status === 'in_review') return 'in_review';
  if (run.status === 'reconciled') return 'findings_ready';
  if (run.status === 'passes_complete') return 'reconciling';
  return 'reading';
}

/* ── Helpers ────────────────────────────────────────────────────── */

/** Strip the "What …policy expects — " prefix from correlation values. */
function stripPrefix(text) {
  if (!text) return '';
  for (const sep of [' \u2014 ', ' \u2013 ', ' - ']) {
    const idx = text.indexOf(sep);
    if (idx >= 0 && idx < 60) return text.slice(idx + sep.length);
  }
  return text;
}

/** Format a source_ref for display: form/section ref + named standard. */
function fmtRef(ref) {
  const parts = [];
  if (ref.form_or_section_ref) parts.push(ref.form_or_section_ref);
  if (ref.named_standard) parts.push(ref.named_standard);
  return parts.join(' \u00b7 ') || 'Source reference';
}

/** Extract the best title from a finding. */
function extractTitle(f) {
  if (f.agent_payload?.title) return f.agent_payload.title;
  if (f.agent_payload?.heading) return f.agent_payload.heading;
  return (f.finding_key || '').replace(/_/g, ' ').replace(/^./, s => s.toUpperCase());
}

/* ── Mini-components ───────────────────────────────────────────── */

function PartTag({ part }) {
  const m = PART_META[part] || { color: NAVY, label: part };
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: m.color, border: `1px solid ${m.color}`,
      borderRadius: 3, padding: '2px 8px',
    }}>
      {m.label}
    </span>
  );
}

function FlagBadge({ flag }) {
  const c = FLAG_COLORS[flag];
  if (!c) return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.1em', background: c.bg, color: c.fg,
      borderRadius: 3, padding: '3px 8px', whiteSpace: 'nowrap',
    }}>
      {flag}
    </span>
  );
}

function ApplicabilityBadge({ state }) {
  const m = APPLICABILITY_META[state];
  if (!m) return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      letterSpacing: '0.1em', background: m.bg, color: m.fg,
      borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap',
    }}>
      {m.label}
    </span>
  );
}

function CitationChip({ sourceRefs, citationStatus }) {
  const parts = (sourceRefs || []).map(r => {
    const segs = [];
    if (r.form_or_section_ref) segs.push(r.form_or_section_ref);
    if (r.named_standard) segs.push(r.named_standard);
    return segs.join(' \u00b7 ');
  }).filter(Boolean);
  const text = parts.join(' ; ') || 'No citation';
  const verified = citationStatus === 'verified';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      fontSize: 12, background: LOCK_BG, border: `1px solid ${LINE}`,
      borderRadius: 7, padding: '6px 10px',
    }}>
      <Lock size={12} style={{ color: SLATE, flexShrink: 0 }} />
      <span>{text}</span>
      <span style={{ fontWeight: 700, color: verified ? TEAL : AMBER }}>
        {verified ? 'Verified' : 'Citation pending'}
      </span>
    </div>
  );
}

function StageProgress({ currentStage }) {
  const idx = STAGES.findIndex(s => s.key === currentStage);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {STAGES.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center' }}>
            {i > 0 && <span style={{ color: '#CFC9BC', fontSize: 12, margin: '0 4px' }}>{'\u2192'}</span>}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: active ? 600 : 400,
              color: done ? SLATE : active ? NAVY : MUTE,
            }}>
              <span style={{
                width: 9, height: 9, borderRadius: '50%',
                background: done ? TEAL : active ? NAVY : '#CFC9BC',
                boxShadow: active ? '0 0 0 3px #1E2D4D22' : 'none',
                display: 'inline-block',
              }} />
              {s.label}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────────── */

export default function ExtractionDetail() {
  const { intakeId } = useParams();
  const navigate = useNavigate();
  usePageTitle('Admin | Policy Lens Review');

  const [intake, setIntake] = useState(null);
  const [run, setRun] = useState(null);
  const [findings, setFindings] = useState([]);
  const [standards, setStandards] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verdict / edit
  const [reviewBusy, setReviewBusy] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editExpects, setEditExpects] = useState('');
  const [editGap, setEditGap] = useState('');
  const [editReason, setEditReason] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [releaseToken, setReleaseToken] = useState(null);

  // Broker
  const [brokers, setBrokers] = useState([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState('');
  const [showAddBroker, setShowAddBroker] = useState(false);
  const [newBrokerName, setNewBrokerName] = useState('');

  /* ── Load ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!intakeId) return;
    (async () => {
      setLoading(true);
      const [iRes, rRes] = await Promise.all([
        supabase.from('policy_lens_intakes')
          .select('id, carrier, policy_type, business_name, agent_name, agency_name, source, created_at, broker_party_id, organization_id')
          .eq('id', intakeId)
          .single(),
        supabase.from('pl_extraction_runs')
          .select('id, intake_id, status, release_status, integrity_flags, created_at, released_at, released_by')
          .eq('intake_id', intakeId)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const intakeData = iRes.data;
      const runData = rRes.data?.[0] || null;
      setIntake(intakeData);
      setRun(runData);

      if (runData) {
        const [fRes, sRes] = await Promise.all([
          supabase.from('pl_findings')
            .select('id, run_id, intake_id, finding_key, part, flag, agent_payload, kitchen_payload, correlation, source_refs, citation_status, applicability_state, review_required, review_state, reviewed_by, reviewed_at, reviewer_corrected')
            .eq('run_id', runData.id)
            .order('created_at', { ascending: true }),
          supabase.from('pl_standards_registry')
            .select('topic, standard, edition, citation, enforced_by, chapter, requirement, citation_detail'),
        ]);
        const list = fRes.data || [];
        list.sort((a, b) => (FLAG_ORDER[a.flag] ?? 99) - (FLAG_ORDER[b.flag] ?? 99));
        setFindings(list);
        setStandards(sRes.data || []);
        if (list.length > 0) setSelectedId(list[0].id);
      }

      // Broker / agent parties for the selector
      const { data: partyData } = await supabase
        .from('external_parties')
        .select('id, legal_name, display_name, party_type')
        .in('party_type', ['broker', 'pm'])
        .order('legal_name', { ascending: true });
      setBrokers(partyData || []);
      if (intakeData?.broker_party_id) setSelectedBrokerId(intakeData.broker_party_id);

      setLoading(false);
    })();
  }, [intakeId]);

  /* ── Derived ───────────────────────────────────────────────── */
  const selected = useMemo(() => findings.find(f => f.id === selectedId) || null, [findings, selectedId]);
  const reviewedCount = useMemo(() => findings.filter(f => f.review_state !== 'pending').length, [findings]);
  const stage = useMemo(() => deriveStage(run), [run]);
  const allReviewed = useMemo(
    () => findings.length > 0 && findings.every(f => f.review_state !== 'pending'),
    [findings],
  );
  const canRelease = allReviewed && !!selectedBrokerId;
  const selectedBroker = brokers.find(b => b.id === selectedBrokerId);
  const brokerLabel = (b) => b.display_name || b.legal_name;

  // Correlation paths (prospect branch, kitchen voice)
  const corExpects = selected?.correlation?.expects?.kitchen || '';
  const corShows   = selected?.correlation?.shows?.prospect?.kitchen || '';
  const corGap     = selected?.correlation?.gap?.prospect?.kitchen || '';

  // Prefer reviewer_corrected when present
  const hasCorrection = !!selected?.reviewer_corrected;
  const dispExpects = hasCorrection && selected.reviewer_corrected.body ? selected.reviewer_corrected.body : stripPrefix(corExpects);
  const dispGap     = hasCorrection && selected.reviewer_corrected.risk ? selected.reviewer_corrected.risk : stripPrefix(corGap);

  /* ── Submit verdict ────────────────────────────────────────── */
  const submitVerdict = useCallback(async (action, corrected) => {
    if (!selected || reviewBusy) return;
    setReviewBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('pl-review-finding', {
        body: { finding_id: selected.id, action, ...(corrected ? { corrected } : {}) },
      });
      if (error) throw error;
      if (!data?.ok || !data?.finding) throw new Error(data?.error || 'Write not confirmed');
      const updated = data.finding;
      setFindings(prev => prev.map(f =>
        f.id === updated.id
          ? { ...f, review_state: updated.review_state, reviewed_by: updated.reviewed_by,
              reviewed_at: updated.reviewed_at, reviewer_corrected: updated.reviewer_corrected }
          : f,
      ));
      setEditMode(false);
      setEditExpects('');
      setEditGap('');
      setEditReason('');
      toast.success(`Finding ${action === 'accept' ? 'accepted' : action === 'correct' ? 'edited' : 'flagged'}`);
    } catch (err) {
      toast.error(`Verdict failed: ${err.message || 'unknown error'}`);
    } finally {
      setReviewBusy(false);
    }
  }, [selected, reviewBusy]);

  /* ── Begin review ──────────────────────────────────────────── */
  const handleBeginReview = useCallback(async () => {
    if (!run) return;
    try {
      const { error } = await supabase
        .from('pl_extraction_runs')
        .update({ release_status: 'in_review' })
        .eq('id', run.id);
      if (error) throw error;
      setRun(prev => ({ ...prev, release_status: 'in_review' }));
      toast.success('Review started');
    } catch (err) {
      toast.error(`Failed to begin review: ${err.message}`);
    }
  }, [run]);

  /* ── Release ───────────────────────────────────────────────── */
  const handleRelease = useCallback(async () => {
    if (!run || releasing || !canRelease) return;
    setReleasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('pl-release-report', {
        body: { run_id: run.id, intake_id: intakeId, recipient_party_id: selectedBrokerId },
      });
      if (error) throw error;
      if (!data?.ok || !data?.run) throw new Error(data?.error || 'Release not confirmed');
      setRun(prev => ({ ...prev, release_status: 'released', released_at: data.run.released_at }));
      setReleaseToken(data.raw_token);
      toast.success('Report released');
    } catch (err) {
      toast.error(`Release failed: ${err.message}`);
    } finally {
      setReleasing(false);
    }
  }, [run, releasing, canRelease, intakeId, selectedBrokerId]);

  /* ── Add broker ────────────────────────────────────────────── */
  const handleAddBroker = useCallback(async () => {
    const name = newBrokerName.trim();
    if (!name) return;
    try {
      const { data, error } = await supabase
        .from('external_parties')
        .insert({ legal_name: name, normalized_name: name.toLowerCase(), party_type: 'broker' })
        .select('id, legal_name, display_name, party_type')
        .single();
      if (error) throw error;
      setBrokers(prev => [...prev, data]);
      setSelectedBrokerId(data.id);
      setShowAddBroker(false);
      setNewBrokerName('');
      toast.success('Broker added');
    } catch (err) {
      toast.error(`Failed to add broker: ${err.message}`);
    }
  }, [newBrokerName]);

  /* ── Open edit mode ────────────────────────────────────────── */
  const openEdit = () => {
    const corr = selected?.correlation || {};
    const expectsRaw = corr?.expects?.kitchen || '';
    const gapRaw = corr?.gap?.prospect?.kitchen || '';
    const rc = selected?.reviewer_corrected || null;
    setEditExpects(rc?.body ? rc.body : stripPrefix(expectsRaw));
    setEditGap(rc?.risk ? rc.risk : stripPrefix(gapRaw));
    setEditReason('');
    setEditMode(true);
  };

  const closeEdit = useCallback(() => {
    setEditMode(false);
    setEditExpects('');
    setEditGap('');
    setEditReason('');
  }, []);

  /* ── Loading / empty ───────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A08C5A]" />
      </div>
    );
  }
  if (!intake) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[#1E2D4D]/50">Intake not found.</p>
        <button onClick={() => navigate('/admin/policy-lens')} className="mt-4 text-sm text-[#A08C5A] underline">
          Back to Queue
        </button>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif", fontSize: 14, color: '#1F2430' }}>
      <AdminBreadcrumb crumbs={[
        { label: 'Policy Lens', path: '/admin/policy-lens' },
        { label: intake.carrier || 'Detail' },
      ]} />

      {/* ── Subhead ────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${LINE}`, padding: '16px 22px' }}>
        <div style={{ fontFamily: 'Montserrat, Arial, sans-serif', fontWeight: 700, fontSize: 18, color: NAVY }}>
          {intake.business_name || intake.carrier || 'Unknown'}
        </div>
        <div style={{ color: MUTE, fontSize: 12.5, marginTop: 2 }}>
          {intake.agent_name ? `Uploaded by ${intake.agent_name}` : ''}
          {intake.agency_name ? ` \u00b7 ${intake.agency_name}` : ''}
          {intake.created_at ? ` \u00b7 received ${new Date(intake.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
          {run?.status ? ` \u00b7 ${run.status}` : ''}
        </div>
        <div style={{ marginTop: 14 }}>
          <StageProgress currentStage={stage} />
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      {findings.length === 0 ? (
        <div className="py-12 text-center">
          <FileText size={32} className="mx-auto mb-3 text-[#1E2D4D]/20" />
          <p className="text-sm text-[#1E2D4D]/50">No findings for this extraction.</p>
        </div>
      ) : (
        <div style={{
          maxWidth: 1320, margin: '18px auto', padding: '0 22px',
          display: 'grid', gridTemplateColumns: '240px 260px 1fr',
          gap: 16, alignItems: 'start',
        }}>

          {/* ─── LEFT: Policy source ─────────────────────────── */}
          <div style={{ position: 'sticky', top: 18 }}>
            <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{
                padding: '12px 15px', borderBottom: `1px solid ${LINE}`,
                fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12.5, color: NAVY,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                Policy source
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase',
                  color: SLATE, background: LOCK_BG, border: `1px solid ${LINE}`,
                  borderRadius: 5, padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <Lock size={10} /> Read-only
                </span>
              </div>
              <div style={{ padding: '14px 15px', fontSize: 12, color: '#3a4254', maxHeight: 560, overflow: 'auto', lineHeight: 1.65 }}>
                {selected && (selected.source_refs || []).length > 0 ? (
                  (selected.source_refs || []).map((ref, i) => (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={{ fontFamily: 'Montserrat', fontSize: 11.5, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
                        {fmtRef(ref)}
                      </div>
                      {ref.requirement_text && (
                        <p style={{
                          fontSize: 12.5, color: NAVY, lineHeight: 1.65,
                          margin: '0 0 6px', fontStyle: 'italic',
                          background: '#FFF9E6', padding: '6px 8px', borderRadius: 4,
                        }}>
                          {'\u201c'}{ref.requirement_text}{'\u201d'}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ color: `${NAVY}30`, fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
                    {selected ? 'No source references for this finding.' : 'Select a finding to view source.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── MIDDLE: Findings picker ─────────────────────── */}
          <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 15px', borderBottom: `1px solid ${LINE}`,
              fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12.5, color: NAVY,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>Readings</span>
              <span style={{ color: MUTE, fontWeight: 400, fontSize: 12 }}>
                {findings.length} {'\u00b7'} {reviewedCount} reviewed
              </span>
            </div>
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {findings.map(f => {
                const isSel = f.id === selectedId;
                const rm = REVIEW_META[f.review_state] || REVIEW_META.pending;
                return (
                  <button
                    key={f.id}
                    onClick={() => { setSelectedId(f.id); setEditMode(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 15px',
                      background: isSel ? `${GOLD}10` : 'transparent',
                      borderLeft: isSel ? `3px solid ${GOLD}` : '3px solid transparent',
                      borderBottom: `1px solid ${NAVY}06`,
                      borderTop: 'none', borderRight: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, flexWrap: 'wrap' }}>
                      <PartTag part={f.part} />
                      <FlagBadge flag={f.flag} />
                      <ApplicabilityBadge state={f.applicability_state} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 4 }}>
                      {extractTitle(f)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, flexWrap: 'wrap' }}>
                      {(f.source_refs || []).length > 0 && (
                        <span style={{ color: MUTE }}>{fmtRef(f.source_refs[0])}</span>
                      )}
                      <span style={{
                        fontSize: 10, fontWeight: 600, background: rm.bg, color: rm.fg,
                        borderRadius: 20, padding: '2px 8px',
                      }}>
                        {rm.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── RIGHT: Reading card + Release dock ──────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Reading card */}
            {selected ? (
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{
                  padding: '11px 13px', background: '#FBFAF6', borderBottom: `1px solid ${LINE}`,
                  display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap',
                }}>
                  <span style={{ fontWeight: 700, color: NAVY, fontSize: 13.5, flex: 1 }}>
                    {extractTitle(selected)}
                  </span>
                  <ApplicabilityBadge state={selected.applicability_state} />
                  {(() => {
                    const rm = REVIEW_META[selected.review_state] || REVIEW_META.pending;
                    return (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, padding: '3px 8px',
                        borderRadius: 20, color: rm.fg, background: rm.bg,
                      }}>
                        {rm.label}
                      </span>
                    );
                  })()}
                </div>

                <div style={{ padding: 13 }}>
                  {/* ── Three whats ───────────────────────────── */}
                  {corExpects && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 3 }}>
                        What your policy expects
                      </div>
                      <div style={{ fontSize: 13.5, color: '#1F2430', marginBottom: 12, lineHeight: 1.6 }}>
                        {dispExpects}
                        {hasCorrection && selected.reviewer_corrected?.body && (
                          <span style={{
                            display: 'inline-block', fontSize: 10, fontWeight: 700,
                            color: NAVY, background: '#E9EDF5',
                            borderRadius: 20, padding: '2px 8px', marginLeft: 8, verticalAlign: 'middle',
                          }}>
                            Edited
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {corShows && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 3 }}>
                        What you can show
                      </div>
                      <div style={{ fontSize: 13.5, color: '#1F2430', marginBottom: 12, lineHeight: 1.6 }}>
                        {stripPrefix(corShows)}
                      </div>
                    </>
                  )}

                  {corGap && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 3 }}>
                        What happens if you can{'\u2019'}t
                      </div>
                      <div style={{ fontSize: 13.5, color: '#7a2e1d', marginBottom: 12, lineHeight: 1.6 }}>
                        {dispGap}
                        {hasCorrection && selected.reviewer_corrected?.risk && (
                          <span style={{
                            display: 'inline-block', fontSize: 10, fontWeight: 700,
                            color: NAVY, background: '#E9EDF5',
                            borderRadius: 20, padding: '2px 8px', marginLeft: 8, verticalAlign: 'middle',
                          }}>
                            Edited
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {/* Fallback when no correlation exists */}
                  {!corExpects && !corShows && !corGap && selected.agent_payload?.body && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 3 }}>
                        What EvidLY read
                      </div>
                      <div style={{ fontSize: 13.5, color: '#1F2430', marginBottom: 12, lineHeight: 1.6 }}>
                        {selected.agent_payload.body}
                      </div>
                    </>
                  )}

                  {/* ── Citation chip ────────────────────────── */}
                  <CitationChip sourceRefs={selected.source_refs} citationStatus={selected.citation_status} />

                  {/* ── Insured-facing block ──────────────────── */}
                  {selected.kitchen_payload && (selected.kitchen_payload.title || selected.kitchen_payload.body) && (
                    <div style={{
                      marginTop: 16, padding: 12, background: CREAM,
                      borderRadius: 8, border: `1px solid ${LINE}`,
                    }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase',
                        color: SLATE, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <Lock size={10} /> What the insured sees
                      </div>
                      {selected.kitchen_payload.title && (
                        <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 4 }}>
                          {selected.kitchen_payload.title}
                        </div>
                      )}
                      {selected.kitchen_payload.body && (
                        <div style={{ fontSize: 12.5, color: '#3a4254', lineHeight: 1.6 }}>
                          {selected.kitchen_payload.body}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Action buttons ────────────────────────── */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
                    <button
                      onClick={openEdit}
                      disabled={run?.release_status === 'released'}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 7,
                        border: `1px solid ${NAVY}`, background: '#fff', color: NAVY,
                        cursor: run?.release_status === 'released' ? 'not-allowed' : 'pointer',
                        opacity: run?.release_status === 'released' ? 0.5 : 1,
                      }}
                    >
                      Edit reading
                    </button>
                    <button
                      onClick={() => submitVerdict('accept')}
                      disabled={reviewBusy || run?.release_status === 'released'}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 7,
                        border: `1px solid ${LINE}`,
                        background: selected?.review_state === 'accepted' ? '#E6F2F0' : '#fff',
                        color: TEAL,
                        cursor: reviewBusy || run?.release_status === 'released' ? 'not-allowed' : 'pointer',
                        opacity: reviewBusy ? 0.6 : 1,
                      }}
                    >
                      {reviewBusy ? 'Saving\u2026' : 'Mark reviewed'}
                    </button>
                    <button
                      onClick={() => submitVerdict('flag')}
                      disabled={reviewBusy || run?.release_status === 'released'}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 7,
                        border: `1px solid ${LINE}`,
                        background: selected?.review_state === 'flagged' ? '#FBEAE5' : '#fff',
                        color: CORAL,
                        cursor: reviewBusy || run?.release_status === 'released' ? 'not-allowed' : 'pointer',
                        opacity: reviewBusy ? 0.6 : 1,
                      }}
                    >
                      Flag
                    </button>
                  </div>

                  {/* ── Edit panel ────────────────────────────── */}
                  {editMode && (
                    <div style={{ borderTop: `1px dashed ${LINE}`, marginTop: 13, paddingTop: 13 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: NAVY, marginBottom: 8 }}>
                        Edit the reading {'\u2014'} wording only
                      </div>

                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 3 }}>
                        What your policy expects
                      </div>
                      <textarea
                        value={editExpects}
                        onChange={e => setEditExpects(e.target.value)}
                        rows={2}
                        style={{
                          width: '100%', border: `1px solid ${LINE}`, borderRadius: 8,
                          fontFamily: 'inherit', fontSize: 13, color: '#1F2430',
                          padding: '9px 10px', resize: 'vertical', marginBottom: 10,
                        }}
                      />

                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 3 }}>
                        What happens if you can{'\u2019'}t
                      </div>
                      <textarea
                        value={editGap}
                        onChange={e => setEditGap(e.target.value)}
                        rows={2}
                        style={{
                          width: '100%', border: `1px solid ${LINE}`, borderRadius: 8,
                          fontFamily: 'inherit', fontSize: 13, color: '#1F2430',
                          padding: '9px 10px', resize: 'vertical',
                        }}
                      />

                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: CORAL, margin: '12px 0 5px' }}>
                        Reason for this edit (required)
                      </label>
                      <input
                        value={editReason}
                        onChange={e => setEditReason(e.target.value)}
                        placeholder="Why are you changing the wording?"
                        style={{
                          width: '100%', border: `1px solid ${LINE}`, borderRadius: 8,
                          fontFamily: 'inherit', fontSize: 13, color: '#1F2430',
                          padding: '9px 10px',
                        }}
                      />

                      <div style={{ fontSize: 11.5, color: MUTE, marginTop: 10, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <Lock size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>Original is preserved (append-only). Wording only {'\u2014'} citation/verified status, coverage line, and policy source can{'\u2019'}t be changed.</span>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                          disabled={!editReason.trim() || reviewBusy}
                          onClick={() => submitVerdict('correct', {
                            body: editExpects.trim(),
                            risk: editGap.trim(),
                            reason: editReason.trim(),
                          })}
                          style={{
                            padding: '9px 16px', borderRadius: 9,
                            fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13,
                            border: `1px solid ${editReason.trim() ? NAVY : LINE}`,
                            background: editReason.trim() ? NAVY : '#E7E3D8',
                            color: editReason.trim() ? '#fff' : '#9AA1AC',
                            cursor: editReason.trim() && !reviewBusy ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {reviewBusy ? 'Saving\u2026' : 'Save edit'}
                        </button>
                        <button
                          onClick={closeEdit}
                          style={{
                            fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 7,
                            border: `1px solid ${LINE}`, background: '#fff', color: SLATE, cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Edit history ─────────────────────────── */}
                  {hasCorrection && selected.reviewer_corrected?.reason && !editMode && (
                    <div style={{
                      marginTop: 13, padding: '8px 10px', background: '#F7F5EE',
                      borderRadius: 7, fontSize: 11.5, color: SLATE, lineHeight: 1.5,
                    }}>
                      <b>Edit reason:</b> {selected.reviewer_corrected.reason}
                      {selected.reviewed_by && (
                        <span style={{ color: MUTE }}> {'\u2014'} {selected.reviewed_by}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10,
                padding: 16, textAlign: 'center', color: `${NAVY}30`, fontSize: 13, paddingTop: 40,
              }}>
                Select a finding to review.
              </div>
            )}

            {/* Coverage routing locked line */}
            <div style={{
              padding: '11px 13px', background: LOCK_BG, border: `1px solid ${LINE}`,
              borderRadius: 9, fontSize: 12.5, color: SLATE,
              display: 'flex', gap: 9, alignItems: 'flex-start',
            }}>
              <Lock size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                <b style={{ color: NAVY }}>Coverage routing (locked):</b>{' '}
                Policy Lens reads the policy and identifies these requirements.
                Your agent evaluates the coverage.{' '}
                <span style={{ color: MUTE }}>Non-editable boilerplate {'\u2014'} {'\u00a7'}1731.</span>
              </span>
            </div>

            {/* ── Release dock ────────────────────────────────── */}
            <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{
                padding: '12px 15px', borderBottom: `1px solid ${LINE}`,
                fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12.5, color: NAVY,
              }}>
                Release report
              </div>
              <div style={{ padding: 15 }}>

                {/* Pre-review: reading / reconciling */}
                {(stage === 'reading' || stage === 'reconciling') && (
                  <p style={{ margin: 0, color: MUTE, fontSize: 13 }}>
                    {stage === 'reading'
                      ? 'Policy is being read. Findings will appear when the dual-pass extraction completes.'
                      : 'Dual-pass readings are being reconciled. Findings will be built next.'}
                  </p>
                )}

                {/* Begin review gate */}
                {stage === 'findings_ready' && (
                  <>
                    <p style={{ margin: '0 0 14px', color: MUTE, fontSize: 13 }}>
                      Findings are built and waiting. Begin review to work each reading, choose the broker, and release.
                    </p>
                    <button
                      onClick={handleBeginReview}
                      style={{
                        width: '100%', padding: '11px 14px', borderRadius: 9,
                        fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13.5,
                        border: `1px solid ${NAVY}`, background: NAVY, color: '#fff', cursor: 'pointer',
                      }}
                    >
                      Begin review
                    </button>
                    <div style={{ marginTop: 8, fontSize: 11.5, color: MUTE, textAlign: 'center' }}>
                      Writes <code style={{ fontSize: 11 }}>in_review</code> and opens the review gate.
                    </div>
                  </>
                )}

                {/* Active review / released */}
                {(stage === 'in_review' || stage === 'released') && (
                  <>
                    {/* Progress bar */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontSize: 12.5, padding: '9px 11px', background: '#F7F5EE',
                      border: `1px solid ${LINE}`, borderRadius: 8, marginBottom: 14,
                    }}>
                      <span><b style={{ color: NAVY }}>{reviewedCount}</b> of {findings.length} reviewed</span>
                      <span style={{ color: selectedBrokerId ? NAVY : MUTE, fontWeight: selectedBrokerId ? 600 : 400 }}>
                        {selectedBrokerId ? `Broker: ${brokerLabel(selectedBroker || {})}` : 'Broker not selected'}
                      </span>
                    </div>

                    {/* Broker selector */}
                    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: SLATE, marginBottom: 6, display: 'block' }}>
                      Share with broker
                    </label>
                    <select
                      value={selectedBrokerId}
                      onChange={e => setSelectedBrokerId(e.target.value)}
                      disabled={stage === 'released'}
                      style={{
                        width: '100%', padding: '9px 10px', border: `1px solid ${LINE}`,
                        borderRadius: 8, fontFamily: 'inherit', fontSize: 13.5, color: '#1F2430', background: '#fff',
                      }}
                    >
                      <option value="">Choose a broker / agent{'\u2026'}</option>
                      {brokers.map(b => (
                        <option key={b.id} value={b.id}>{brokerLabel(b)}</option>
                      ))}
                    </select>

                    {stage !== 'released' && (
                      <>
                        <button
                          onClick={() => setShowAddBroker(!showAddBroker)}
                          style={{
                            marginTop: 8, fontSize: 12.5, fontWeight: 600, color: NAVY,
                            cursor: 'pointer', background: 'none', border: 'none', padding: 0,
                          }}
                        >
                          + Add broker
                        </button>
                        {showAddBroker && (
                          <div style={{
                            marginTop: 10, padding: 11, border: `1px dashed ${LINE}`,
                            borderRadius: 8, background: '#FBFAF6',
                            display: 'flex', flexDirection: 'column', gap: 8,
                          }}>
                            <input
                              value={newBrokerName}
                              onChange={e => setNewBrokerName(e.target.value)}
                              placeholder="Broker name"
                              style={{
                                width: '100%', border: `1px solid ${LINE}`, borderRadius: 8,
                                fontFamily: 'inherit', fontSize: 13, padding: '9px 10px',
                              }}
                            />
                            <button
                              onClick={handleAddBroker}
                              style={{
                                width: '100%', padding: '11px 14px', borderRadius: 9,
                                fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13.5,
                                border: `1px solid ${NAVY}`, background: '#fff', color: NAVY,
                                cursor: 'pointer', marginTop: 2,
                              }}
                            >
                              Add &amp; select
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Dual destination */}
                    <div style={{ marginTop: 15, border: `1px solid ${LINE}`, borderRadius: 9, overflow: 'hidden' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 10, padding: '10px 12px', fontSize: 12.5, background: '#FBFAF6',
                      }}>
                        <span style={{ color: SLATE, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          Client account
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase',
                            color: SLATE, background: LOCK_BG, border: `1px solid ${LINE}`,
                            borderRadius: 5, padding: '2px 7px',
                          }}>
                            always
                          </span>
                        </span>
                        <span style={{ color: NAVY, fontWeight: 600, textAlign: 'right', fontSize: 12 }}>
                          {intake.business_name || 'Client'}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 10, padding: '10px 12px', fontSize: 12.5, borderTop: `1px solid ${LINE}`,
                      }}>
                        <span style={{ color: SLATE, fontWeight: 600 }}>Broker</span>
                        <span style={{
                          color: selectedBrokerId ? NAVY : MUTE,
                          fontWeight: selectedBrokerId ? 600 : 400, textAlign: 'right', fontSize: 12,
                        }}>
                          {selectedBroker ? brokerLabel(selectedBroker) : 'Not selected'}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: MUTE, marginTop: 8, lineHeight: 1.5 }}>
                      On release, the report posts to the client{'\u2019'}s EvidLY account (insured {'\u2014'} always) and a shared grant goes to the selected broker. Both resolve by intake, not document.
                    </div>

                    {/* Release button */}
                    {stage === 'released' ? (
                      <>
                        <button
                          disabled
                          style={{
                            width: '100%', padding: '11px 14px', borderRadius: 9, marginTop: 13,
                            fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13.5,
                            border: `1px solid ${TEAL}`, background: '#E8F2F1', color: TEAL, cursor: 'default',
                          }}
                        >
                          Released {'\u2713'}
                        </button>
                        <div style={{ marginTop: 8, fontSize: 11.5, color: MUTE, textAlign: 'center' }}>
                          Posted to the client account and shared with the broker.
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          disabled={!canRelease || releasing}
                          onClick={handleRelease}
                          style={{
                            width: '100%', padding: '11px 14px', borderRadius: 9, marginTop: 13,
                            fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13.5,
                            border: `1px solid ${canRelease ? NAVY : LINE}`,
                            background: canRelease ? NAVY : '#E7E3D8',
                            color: canRelease ? '#fff' : '#9AA1AC',
                            cursor: canRelease && !releasing ? 'pointer' : 'not-allowed',
                            opacity: releasing ? 0.6 : 1,
                          }}
                        >
                          {releasing ? 'Releasing\u2026' : 'Release report'}
                        </button>
                        <div style={{ marginTop: 8, fontSize: 11.5, color: MUTE, textAlign: 'center' }}>
                          {!allReviewed
                            ? `${findings.length - reviewedCount} reading${findings.length - reviewedCount !== 1 ? 's' : ''} still need${findings.length - reviewedCount === 1 ? 's' : ''} review.`
                            : !selectedBrokerId
                              ? 'Choose a broker to release.'
                              : 'Posts to the client account and shares with the broker.'}
                        </div>
                      </>
                    )}

                    {/* Release token */}
                    {releaseToken && (
                      <div style={{ marginTop: 12, padding: 12, background: '#E8F2F1', borderRadius: 8, border: `1px solid ${TEAL}30` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Agent report link
                        </div>
                        <div style={{
                          fontSize: 12, color: NAVY, wordBreak: 'break-all', fontFamily: 'monospace',
                          background: '#fff', padding: 8, borderRadius: 4,
                        }}>
                          {`${window.location.origin}/report/${releaseToken}`}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
