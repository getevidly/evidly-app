/**
 * ExtractionDetail — Admin 3-column review & release screen for Policy Lens.
 * Route: /admin/policy-lens/:intakeId
 *
 * Three columns:
 *   LEFT   (~205 px) — Review progress, filter chips, release card
 *   MIDDLE (~215 px) — Findings list with part badge + flag badge + state pill
 *   RIGHT  (flex)    — Selected finding detail card + action bar
 *
 * Actions wired to pl-review-finding v2 contract:
 *   Accept:  { finding_id, action:'accept' }
 *   Correct: { finding_id, action:'correct', corrected:{body,risk}, reason, notes }
 *   Flag:    { finding_id, action:'flag', reason, notes }
 *
 * Release gate: all findings reviewed (no pending, no flagged) + broker selected.
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
  fire:    { color: CORAL, label: 'Fire' },
  food:    { color: TEAL,  label: 'Food' },
  general: { color: NAVY,  label: 'General' },
};

/* ── Review state → pill ─────────────────────────────────────── */
const REVIEW_META = {
  pending:  { label: 'Pending',  bg: '#EFece3', fg: MUTE },
  accepted: { label: 'Reviewed', bg: '#E6F2F0', fg: TEAL, check: true },
  flagged:  { label: 'Flagged',  bg: '#FBF3E0', fg: AMBER },
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

/* ── Reason codes ──────────────────────────────────────────────── */
const CORRECT_REASONS = [
  { code: 'wrong_standard_cited',     label: 'Wrong standard cited' },
  { code: 'wrong_section',            label: 'Wrong section' },
  { code: 'inaccurate_requirement',   label: 'Inaccurate requirement' },
  { code: 'outdated_edition',         label: 'Outdated edition' },
  { code: 'imprecise_plain_language', label: 'Imprecise plain language' },
  { code: 'scope_correction',         label: 'Scope correction' },
  { code: 'other',                    label: 'Other' },
];

const FLAG_REASONS = [
  { code: 'citation_unclear',            label: 'Citation unclear' },
  { code: 'policy_language_ambiguous',   label: 'Policy language ambiguous' },
  { code: 'conflicting_provisions',      label: 'Conflicting provisions' },
  { code: 'needs_carrier_confirmation',  label: 'Needs carrier confirmation' },
  { code: 'coverage_scope_uncertain',    label: 'Coverage scope uncertain' },
  { code: 'extraction_may_be_incorrect', label: 'Extraction may be incorrect' },
  { code: 'other',                       label: 'Other' },
];

/* ── Helpers ────────────────────────────────────────────────────── */

function extractTitle(f) {
  if (f.agent_payload?.title) return f.agent_payload.title;
  if (f.agent_payload?.heading) return f.agent_payload.heading;
  return (f.finding_key || '').replace(/_/g, ' ').replace(/^./, s => s.toUpperCase());
}

function fmtRef(ref) {
  const parts = [];
  if (ref.form_or_section_ref) parts.push(ref.form_or_section_ref);
  if (ref.named_standard) parts.push(ref.named_standard);
  return parts.join(' \u00b7 ') || 'Source reference';
}

/* ── Mini-components ───────────────────────────────────────────── */

function PartTag({ part }) {
  const m = PART_META[part] || { color: NAVY, label: part };
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: m.color, border: `1px solid ${m.color}`,
      borderRadius: 3, padding: '2px 6px',
    }}>
      {m.label}
    </span>
  );
}

function FlagBadge({ flag }) {
  if (flag !== 'high' && flag !== 'elevated') return null;
  const c = FLAG_COLORS[flag];
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.1em', background: c.bg, color: c.fg,
      borderRadius: 3, padding: '2px 6px', whiteSpace: 'nowrap',
    }}>
      {flag}
    </span>
  );
}

function CitationChip({ sourceRefs }) {
  const parts = (sourceRefs || []).map(r => {
    const segs = [];
    if (r.form_or_section_ref) segs.push(r.form_or_section_ref);
    if (r.named_standard) segs.push(r.named_standard);
    return segs.join(' \u00b7 ');
  }).filter(Boolean);
  const text = parts.join(' ; ') || 'No citation';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      fontSize: 12, background: LOCK_BG, border: `1px solid ${LINE}`,
      borderRadius: 7, padding: '6px 10px',
    }}>
      <Lock size={12} style={{ color: SLATE, flexShrink: 0 }} />
      <span>{text}</span>
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

  // Verdict panels
  const [reviewBusy, setReviewBusy] = useState(false);
  const [showCorrectPanel, setShowCorrectPanel] = useState(false);
  const [showFlagPanel, setShowFlagPanel] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [editRisk, setEditRisk] = useState('');
  const [correctReason, setCorrectReason] = useState('');
  const [correctNotes, setCorrectNotes] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [flagNotes, setFlagNotes] = useState('');

  // Release
  const [releasing, setReleasing] = useState(false);
  const [releaseToken, setReleaseToken] = useState(null);

  // Broker
  const [brokers, setBrokers] = useState([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState('');
  const [showAddBroker, setShowAddBroker] = useState(false);
  const [newBrokerName, setNewBrokerName] = useState('');

  // Filter
  const [filter, setFilter] = useState('all');

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
            .select('id, run_id, intake_id, finding_key, part, flag, agent_payload, kitchen_payload, correlation, source_refs, citation_status, applicability_state, review_required, review_state, reviewed_by, reviewed_at, reviewer_corrected, flag_detail')
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

      // Broker / agent parties
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
  const flaggedCount = useMemo(() => findings.filter(f => f.review_state === 'flagged').length, [findings]);
  const stage = useMemo(() => deriveStage(run), [run]);
  const canRelease = findings.length > 0
    && findings.every(f => f.review_state !== 'pending' && f.review_state !== 'flagged')
    && !!selectedBrokerId;
  const selectedBroker = brokers.find(b => b.id === selectedBrokerId);
  const brokerLabel = (b) => b.display_name || b.legal_name;

  // Filter counts
  const fireCt = useMemo(() => findings.filter(f => f.part === 'fire').length, [findings]);
  const foodCt = useMemo(() => findings.filter(f => f.part === 'food').length, [findings]);
  const genCt  = useMemo(() => findings.filter(f => f.part === 'general').length, [findings]);

  // Filtered list
  const filteredFindings = useMemo(() => {
    if (filter === 'flagged') return findings.filter(f => f.review_state === 'flagged');
    if (filter && filter !== 'all') return findings.filter(f => f.part === filter);
    return findings;
  }, [findings, filter]);

  // Matched standards for the selected finding
  const matchedStandards = useMemo(() => {
    if (!selected || !standards.length) return [];
    const refs = (selected.source_refs || []).map(r => r.named_standard).filter(Boolean);
    if (!refs.length) return [];
    return standards.filter(s =>
      refs.some(r => (s.standard && r.includes(s.standard)) || (s.citation && r.includes(s.citation)))
    );
  }, [selected, standards]);

  /* ── Submit verdict ────────────────────────────────────────── */
  const submitVerdict = useCallback(async (action, payload) => {
    if (!selected || reviewBusy) return;
    setReviewBusy(true);
    try {
      const reqBody = { finding_id: selected.id, action };
      if (action === 'correct') {
        reqBody.corrected = { body: payload.body, risk: payload.risk };
        reqBody.reason = payload.reason;
        if (payload.notes) reqBody.notes = payload.notes;
      }
      if (action === 'flag') {
        reqBody.reason = payload.reason;
        if (payload.notes) reqBody.notes = payload.notes;
      }
      const { data, error } = await supabase.functions.invoke('pl-review-finding', { body: reqBody });
      if (error) throw error;
      if (!data?.ok || !data?.finding) throw new Error(data?.error || 'Write not confirmed');
      const updated = data.finding;
      setFindings(prev => prev.map(f =>
        f.id === updated.id
          ? { ...f, review_state: updated.review_state, reviewed_by: updated.reviewed_by,
              reviewed_at: updated.reviewed_at, reviewer_corrected: updated.reviewer_corrected,
              flag_detail: updated.flag_detail }
          : f,
      ));
      setShowCorrectPanel(false);
      setShowFlagPanel(false);
      setEditBody(''); setEditRisk(''); setCorrectReason(''); setCorrectNotes('');
      setFlagReason(''); setFlagNotes('');
      toast.success(`Finding ${action === 'accept' ? 'accepted' : action === 'correct' ? 'corrected' : 'flagged'}`);
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

  /* ── Panel helpers ──────────────────────────────────────────── */
  const openCorrect = () => {
    const rc = selected?.reviewer_corrected || null;
    setEditBody(rc?.body || selected?.agent_payload?.body || '');
    setEditRisk(rc?.risk || '');
    setCorrectReason('');
    setCorrectNotes('');
    setShowCorrectPanel(true);
    setShowFlagPanel(false);
  };

  const openFlag = () => {
    setFlagReason('');
    setFlagNotes('');
    setShowFlagPanel(true);
    setShowCorrectPanel(false);
  };

  const closePanels = useCallback(() => {
    setShowCorrectPanel(false);
    setShowFlagPanel(false);
    setEditBody(''); setEditRisk(''); setCorrectReason(''); setCorrectNotes('');
    setFlagReason(''); setFlagNotes('');
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
  const pct = findings.length > 0 ? Math.round((reviewedCount / findings.length) * 100) : 0;

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
          display: 'grid', gridTemplateColumns: '205px 215px 1fr',
          gap: 16, alignItems: 'start',
        }}>

          {/* ─── LEFT RAIL ──────────────────────────────────── */}
          <div style={{ position: 'sticky', top: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Review progress */}
            <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, padding: '14px 15px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: NAVY, marginBottom: 8 }}>
                {reviewedCount} / {findings.length} reviewed
              </div>
              <div style={{ height: 6, background: '#EFece3', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 3,
                  background: pct === 100 ? TEAL : GOLD,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>

            {/* Filter chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { key: 'all',     label: 'All',     count: findings.length },
                { key: 'fire',    label: 'Fire',    count: fireCt },
                { key: 'food',    label: 'Food',    count: foodCt },
                { key: 'general', label: 'General', count: genCt },
                { key: 'flagged', label: 'Flagged', count: flaggedCount },
              ].map(ch => (
                <button
                  key={ch.key}
                  onClick={() => setFilter(ch.key)}
                  style={{
                    fontSize: 11, fontWeight: 600, borderRadius: 20,
                    padding: '4px 10px', border: `1px solid ${LINE}`,
                    background: filter === ch.key
                      ? (ch.key === 'flagged' && ch.count > 0 ? '#FBF3E0' : `${GOLD}15`)
                      : '#fff',
                    color: filter === ch.key
                      ? (ch.key === 'flagged' && ch.count > 0 ? AMBER : NAVY)
                      : MUTE,
                    cursor: 'pointer',
                  }}
                >
                  {ch.label} ({ch.count})
                </button>
              ))}
            </div>

            {/* Release card */}
            <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{
                padding: '12px 15px', borderBottom: `1px solid ${LINE}`,
                fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, color: NAVY,
              }}>
                Release
              </div>
              <div style={{ padding: 14 }}>

                {(stage === 'reading' || stage === 'reconciling') && (
                  <p style={{ margin: 0, color: MUTE, fontSize: 12 }}>
                    {stage === 'reading' ? 'Policy is being read.' : 'Readings are being reconciled.'}
                  </p>
                )}

                {stage === 'findings_ready' && (
                  <>
                    <p style={{ margin: '0 0 12px', color: MUTE, fontSize: 12 }}>
                      Findings built. Begin review to start.
                    </p>
                    <button
                      onClick={handleBeginReview}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12.5,
                        border: `1px solid ${NAVY}`, background: NAVY, color: '#fff', cursor: 'pointer',
                      }}
                    >
                      Begin review
                    </button>
                  </>
                )}

                {(stage === 'in_review' || stage === 'released') && (
                  <>
                    {flaggedCount > 0 && stage !== 'released' && (
                      <div style={{
                        padding: '10px 12px', background: '#FBF3E0', border: `1px solid ${AMBER}30`,
                        borderRadius: 8, marginBottom: 12, fontSize: 12, color: AMBER, fontWeight: 600,
                      }}>
                        BLOCKED {'\u2014'} {flaggedCount} flagged finding{flaggedCount !== 1 ? 's' : ''} must be resolved.
                      </div>
                    )}

                    <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: SLATE, marginBottom: 5, display: 'block' }}>
                      Share with broker
                    </label>
                    <select
                      value={selectedBrokerId}
                      onChange={e => setSelectedBrokerId(e.target.value)}
                      disabled={stage === 'released'}
                      style={{
                        width: '100%', padding: '8px 9px', border: `1px solid ${LINE}`,
                        borderRadius: 7, fontFamily: 'inherit', fontSize: 12.5, color: '#1F2430', background: '#fff',
                      }}
                    >
                      <option value="">Choose broker{'\u2026'}</option>
                      {brokers.map(b => (
                        <option key={b.id} value={b.id}>{brokerLabel(b)}</option>
                      ))}
                    </select>

                    {stage !== 'released' && (
                      <>
                        <button
                          onClick={() => setShowAddBroker(!showAddBroker)}
                          style={{
                            marginTop: 6, fontSize: 11.5, fontWeight: 600, color: NAVY,
                            cursor: 'pointer', background: 'none', border: 'none', padding: 0,
                          }}
                        >
                          + Add broker
                        </button>
                        {showAddBroker && (
                          <div style={{
                            marginTop: 8, padding: 10, border: `1px dashed ${LINE}`,
                            borderRadius: 7, background: '#FBFAF6',
                            display: 'flex', flexDirection: 'column', gap: 6,
                          }}>
                            <input
                              value={newBrokerName}
                              onChange={e => setNewBrokerName(e.target.value)}
                              placeholder="Broker name"
                              style={{
                                width: '100%', border: `1px solid ${LINE}`, borderRadius: 7,
                                fontFamily: 'inherit', fontSize: 12, padding: '7px 8px',
                              }}
                            />
                            <button
                              onClick={handleAddBroker}
                              style={{
                                width: '100%', padding: '8px 10px', borderRadius: 7,
                                fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12,
                                border: `1px solid ${NAVY}`, background: '#fff', color: NAVY, cursor: 'pointer',
                              }}
                            >
                              Add &amp; select
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {stage === 'released' ? (
                      <button
                        disabled
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8, marginTop: 12,
                          fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12.5,
                          border: `1px solid ${TEAL}`, background: '#E8F2F1', color: TEAL, cursor: 'default',
                        }}
                      >
                        Released {'\u2713'}
                      </button>
                    ) : (
                      <button
                        disabled={!canRelease || releasing}
                        onClick={handleRelease}
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8, marginTop: 12,
                          fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12.5,
                          border: `1px solid ${canRelease ? NAVY : LINE}`,
                          background: canRelease ? NAVY : '#E7E3D8',
                          color: canRelease ? '#fff' : '#9AA1AC',
                          cursor: canRelease && !releasing ? 'pointer' : 'not-allowed',
                          opacity: releasing ? 0.6 : 1,
                        }}
                      >
                        {releasing ? 'Releasing\u2026' : 'Release report'}
                      </button>
                    )}

                    {!canRelease && stage !== 'released' && (
                      <div style={{ marginTop: 6, fontSize: 10.5, color: MUTE, textAlign: 'center' }}>
                        {findings.some(f => f.review_state === 'pending')
                          ? `${findings.filter(f => f.review_state === 'pending').length} reading${findings.filter(f => f.review_state === 'pending').length !== 1 ? 's' : ''} need review.`
                          : flaggedCount > 0
                            ? 'Resolve flagged findings first.'
                            : 'Choose a broker to release.'}
                      </div>
                    )}

                    {releaseToken && (
                      <div style={{ marginTop: 10, padding: 10, background: '#E8F2F1', borderRadius: 7, border: `1px solid ${TEAL}30` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                          Agent report link
                        </div>
                        <div style={{
                          fontSize: 11, color: NAVY, wordBreak: 'break-all', fontFamily: 'monospace',
                          background: '#fff', padding: 6, borderRadius: 4,
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

          {/* ─── MIDDLE: Findings list ─────────────────────── */}
          <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 15px', borderBottom: `1px solid ${LINE}`,
              fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12.5, color: NAVY,
            }}>
              Readings {'\u00b7'} {filteredFindings.length}
            </div>
            <div style={{ maxHeight: 640, overflowY: 'auto' }}>
              {filteredFindings.map(f => {
                const isSel = f.id === selectedId;
                const rm = REVIEW_META[f.review_state] || REVIEW_META.pending;
                return (
                  <button
                    key={f.id}
                    onClick={() => { setSelectedId(f.id); closePanels(); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 14px',
                      background: isSel ? `${GOLD}10` : 'transparent',
                      borderLeft: isSel ? `3px solid ${GOLD}` : '3px solid transparent',
                      borderBottom: `1px solid ${NAVY}06`,
                      borderTop: 'none', borderRight: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <PartTag part={f.part} />
                      <FlagBadge flag={f.flag} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 4 }}>
                      {extractTitle(f)}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, background: rm.bg, color: rm.fg,
                      borderRadius: 20, padding: '2px 8px',
                    }}>
                      {rm.label}{rm.check ? ' \u2713' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── RIGHT: Detail card ────────────────────────── */}
          <div>
            {selected ? (
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{
                  padding: '12px 14px', background: '#FBFAF6', borderBottom: `1px solid ${LINE}`,
                  display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap',
                }}>
                  <span style={{ fontWeight: 700, color: NAVY, fontSize: 14, flex: 1 }}>
                    {extractTitle(selected)}
                  </span>
                  {(() => {
                    const rm = REVIEW_META[selected.review_state] || REVIEW_META.pending;
                    return (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, padding: '3px 9px',
                        borderRadius: 20, color: rm.fg, background: rm.bg,
                      }}>
                        {rm.label}{rm.check ? ' \u2713' : ''}
                      </span>
                    );
                  })()}
                </div>

                <div style={{ padding: 14 }}>
                  {/* ── WHAT EVIDLY READ ──────────────────────── */}
                  {(selected.reviewer_corrected?.body || selected.agent_payload?.body) && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 4 }}>
                        WHAT EVIDLY READ
                        {selected.reviewer_corrected?.body && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, color: NAVY, background: '#E9EDF5',
                            borderRadius: 20, padding: '2px 7px', marginLeft: 8, verticalAlign: 'middle',
                          }}>
                            Corrected
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 13.5, color: '#1F2430', marginBottom: 16, lineHeight: 1.65,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {selected.reviewer_corrected?.body || selected.agent_payload.body}
                      </div>
                    </>
                  )}

                  {/* ── Coverage at stake ─────────────────────── */}
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 4 }}>
                    Coverage at stake
                  </div>
                  <table style={{ width: '100%', fontSize: 12.5, marginBottom: 16, borderCollapse: 'collapse' }}>
                    <tbody>
                      {['Building', 'BPP', 'Business Income'].map(row => (
                        <tr key={row} style={{ borderBottom: `1px solid ${LINE}` }}>
                          <td style={{ padding: '6px 0', color: NAVY, fontWeight: 600 }}>{row}</td>
                          <td style={{ padding: '6px 0', color: MUTE, textAlign: 'right' }}>Limits pending</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* ── Safeguards ─────────────────────────────── */}
                  {matchedStandards.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 4 }}>
                        Safeguards relevant to the kitchen
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        {matchedStandards.map((s, i) => (
                          <div key={i} style={{
                            fontSize: 12.5, color: '#3a4254', lineHeight: 1.6,
                            padding: '4px 0',
                            borderBottom: i < matchedStandards.length - 1 ? `1px solid ${LINE}` : 'none',
                          }}>
                            <span style={{ fontWeight: 600, color: NAVY }}>{s.topic || s.standard}</span>
                            {s.requirement && <span> {'\u2014'} {s.requirement}</span>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* ── What the insured sees ─────────────────── */}
                  {selected.kitchen_payload?.body && (
                    <div style={{
                      marginBottom: 16, padding: 12, background: CREAM,
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
                      <div style={{ fontSize: 12.5, color: '#3a4254', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {selected.kitchen_payload.body}
                      </div>
                    </div>
                  )}

                  {/* ── Citation chip ─────────────────────────── */}
                  <div style={{ marginBottom: 16 }}>
                    <CitationChip sourceRefs={selected.source_refs} />
                  </div>

                  {/* ── ACTION BAR ─────────────────────────────── */}
                  {run?.release_status !== 'released' && (
                    <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                      <button
                        onClick={() => submitVerdict('accept')}
                        disabled={reviewBusy}
                        style={{
                          fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8,
                          border: 'none',
                          background: selected.review_state === 'accepted' ? '#E6F2F0' : TEAL,
                          color: selected.review_state === 'accepted' ? TEAL : '#fff',
                          cursor: reviewBusy ? 'not-allowed' : 'pointer',
                          opacity: reviewBusy ? 0.6 : 1,
                        }}
                      >
                        {reviewBusy ? 'Saving\u2026' : selected.review_state === 'accepted' ? 'Accepted \u2713' : 'Accept'}
                      </button>
                      <button
                        onClick={openCorrect}
                        disabled={reviewBusy}
                        style={{
                          fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8,
                          border: `1px solid ${NAVY}`,
                          background: showCorrectPanel ? `${NAVY}10` : '#fff',
                          color: NAVY,
                          cursor: reviewBusy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Correct
                      </button>
                      <button
                        onClick={openFlag}
                        disabled={reviewBusy}
                        style={{
                          fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8,
                          border: `1px solid ${AMBER}`,
                          background: selected.review_state === 'flagged' ? '#FBF3E0' : '#fff',
                          color: AMBER,
                          cursor: reviewBusy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {selected.review_state === 'flagged' ? 'Flagged' : 'Flag'}
                      </button>
                    </div>
                  )}

                  {/* ── Correct panel ──────────────────────────── */}
                  {showCorrectPanel && (
                    <div style={{ borderTop: `1px dashed ${LINE}`, marginTop: 14, paddingTop: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: NAVY, marginBottom: 10 }}>
                        Correct the reading
                      </div>

                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 3 }}>
                        Body
                      </div>
                      <textarea
                        value={editBody}
                        onChange={e => setEditBody(e.target.value)}
                        rows={3}
                        style={{
                          width: '100%', border: `1px solid ${LINE}`, borderRadius: 8,
                          fontFamily: 'inherit', fontSize: 13, color: '#1F2430',
                          padding: '9px 10px', resize: 'vertical', marginBottom: 10,
                        }}
                      />

                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 3 }}>
                        Risk
                      </div>
                      <input
                        value={editRisk}
                        onChange={e => setEditRisk(e.target.value)}
                        style={{
                          width: '100%', border: `1px solid ${LINE}`, borderRadius: 8,
                          fontFamily: 'inherit', fontSize: 13, color: '#1F2430',
                          padding: '9px 10px', marginBottom: 10,
                        }}
                      />

                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 3 }}>
                        Reason (required)
                      </div>
                      <select
                        value={correctReason}
                        onChange={e => setCorrectReason(e.target.value)}
                        style={{
                          width: '100%', border: `1px solid ${LINE}`, borderRadius: 8,
                          fontFamily: 'inherit', fontSize: 13, color: '#1F2430',
                          padding: '9px 10px', background: '#fff', marginBottom: 10,
                        }}
                      >
                        <option value="">Select reason{'\u2026'}</option>
                        {CORRECT_REASONS.map(r => (
                          <option key={r.code} value={r.code}>{r.label}</option>
                        ))}
                      </select>

                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 3 }}>
                        Notes (optional)
                      </div>
                      <textarea
                        value={correctNotes}
                        onChange={e => setCorrectNotes(e.target.value)}
                        rows={2}
                        placeholder="Additional context\u2026"
                        style={{
                          width: '100%', border: `1px solid ${LINE}`, borderRadius: 8,
                          fontFamily: 'inherit', fontSize: 13, color: '#1F2430',
                          padding: '9px 10px', resize: 'vertical', marginBottom: 10,
                        }}
                      />

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          disabled={!correctReason || reviewBusy}
                          onClick={() => submitVerdict('correct', {
                            body: editBody.trim(),
                            risk: editRisk.trim(),
                            reason: correctReason,
                            notes: correctNotes.trim(),
                          })}
                          style={{
                            padding: '9px 16px', borderRadius: 8,
                            fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13,
                            border: 'none',
                            background: correctReason ? NAVY : '#E7E3D8',
                            color: correctReason ? '#fff' : '#9AA1AC',
                            cursor: correctReason && !reviewBusy ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {reviewBusy ? 'Saving\u2026' : 'Save correction'}
                        </button>
                        <button
                          onClick={closePanels}
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

                  {/* ── Flag panel ─────────────────────────────── */}
                  {showFlagPanel && (
                    <div style={{ borderTop: `1px dashed ${LINE}`, marginTop: 14, paddingTop: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: AMBER, marginBottom: 10 }}>
                        Flag this finding
                      </div>

                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 3 }}>
                        Reason (required)
                      </div>
                      <select
                        value={flagReason}
                        onChange={e => setFlagReason(e.target.value)}
                        style={{
                          width: '100%', border: `1px solid ${LINE}`, borderRadius: 8,
                          fontFamily: 'inherit', fontSize: 13, color: '#1F2430',
                          padding: '9px 10px', background: '#fff', marginBottom: 10,
                        }}
                      >
                        <option value="">Select reason{'\u2026'}</option>
                        {FLAG_REASONS.map(r => (
                          <option key={r.code} value={r.code}>{r.label}</option>
                        ))}
                      </select>

                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: SLATE, marginBottom: 3 }}>
                        Notes (optional)
                      </div>
                      <textarea
                        value={flagNotes}
                        onChange={e => setFlagNotes(e.target.value)}
                        rows={2}
                        placeholder="Additional context\u2026"
                        style={{
                          width: '100%', border: `1px solid ${LINE}`, borderRadius: 8,
                          fontFamily: 'inherit', fontSize: 13, color: '#1F2430',
                          padding: '9px 10px', resize: 'vertical', marginBottom: 10,
                        }}
                      />

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          disabled={!flagReason || reviewBusy}
                          onClick={() => submitVerdict('flag', {
                            reason: flagReason,
                            notes: flagNotes.trim(),
                          })}
                          style={{
                            padding: '9px 16px', borderRadius: 8,
                            fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13,
                            border: 'none',
                            background: flagReason ? AMBER : '#E7E3D8',
                            color: flagReason ? '#fff' : '#9AA1AC',
                            cursor: flagReason && !reviewBusy ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {reviewBusy ? 'Saving\u2026' : 'Flag finding'}
                        </button>
                        <button
                          onClick={closePanels}
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

                  {/* ── Edit history ──────────────────────────── */}
                  {selected.reviewer_corrected?.reason_code && !showCorrectPanel && !showFlagPanel && (
                    <div style={{
                      marginTop: 14, padding: '8px 10px', background: '#F7F5EE',
                      borderRadius: 7, fontSize: 11.5, color: SLATE, lineHeight: 1.5,
                    }}>
                      <b>Correction reason:</b> {
                        CORRECT_REASONS.find(r => r.code === selected.reviewer_corrected.reason_code)?.label
                        || selected.reviewer_corrected.reason_code
                      }
                      {selected.reviewer_corrected.notes && (
                        <span> {'\u2014'} {selected.reviewer_corrected.notes}</span>
                      )}
                    </div>
                  )}

                  {/* ── Flag detail ───────────────────────────── */}
                  {selected.flag_detail?.reason_code && !showCorrectPanel && !showFlagPanel && (
                    <div style={{
                      marginTop: 10, padding: '8px 10px', background: '#FBF3E0',
                      borderRadius: 7, fontSize: 11.5, color: AMBER, lineHeight: 1.5,
                    }}>
                      <b>Flag reason:</b> {
                        FLAG_REASONS.find(r => r.code === selected.flag_detail.reason_code)?.label
                        || selected.flag_detail.reason_code
                      }
                      {selected.flag_detail.notes && (
                        <span style={{ color: SLATE }}> {'\u2014'} {selected.flag_detail.notes}</span>
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
          </div>

        </div>
      )}
    </div>
  );
}
