/**
 * ExtractionDetail — Admin detail view for a single Policy Lens intake.
 * Route: /admin/policy-lens/:intakeId
 * READ-ONLY render. Accept / Correct / Flag buttons rendered but INERT.
 */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Pencil, Flag, FileText } from 'lucide-react';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';

// ── Brand palette (shared with PolicyLensQueue / PolicyLensReport) ───
const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const CREAM = '#FAF7F0';
const TEAL = '#0F766E';
const CORAL = '#C2553A';
const AMBER = '#9A7B2D';
const MUTE = '#6B7280';
const LINE_CLR = '#E5E0D5';

// ── Flag severity ────────────────────────────────────────────────────
const FLAG_COLORS = {
  high:      { bg: '#FBEAE5', fg: CORAL },
  elevated:  { bg: '#FBF3E0', fg: AMBER },
  low:       { bg: '#EEF1F6', fg: NAVY },
  satisfied: { bg: '#E8F2F1', fg: TEAL },
};
const FLAG_ORDER = { high: 0, elevated: 1, low: 2, satisfied: 3 };

// ── Part metadata ────────────────────────────────────────────────────
const PART_META = {
  fire:    { color: CORAL, label: 'Fire Safety — AHJ' },
  food:    { color: TEAL,  label: 'Food Safety — EHD' },
  general: { color: NAVY,  label: 'Policy-Wide Conditions' },
};

// ── Review state badge meta ──────────────────────────────────────────
const REVIEW_META = {
  pending:   { label: 'Pending',   bg: '#F3F4F6', fg: MUTE },
  accepted:  { label: 'Accepted',  bg: '#E8F2F1', fg: TEAL },
  corrected: { label: 'Corrected', bg: '#FBF3E0', fg: AMBER },
  flagged:   { label: 'Flagged',   bg: '#FBEAE5', fg: CORAL },
};

// ── Shared mini-components ───────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────
function extractTitle(f) {
  if (f.agent_payload?.title) return f.agent_payload.title;
  if (f.agent_payload?.heading) return f.agent_payload.heading;
  return (f.finding_key || '').replace(/_/g, ' ').replace(/^./, s => s.toUpperCase());
}

function extractBody(f) {
  if (f.agent_payload?.body) return f.agent_payload.body;
  if (f.agent_payload?.summary) return f.agent_payload.summary;
  if (typeof f.agent_payload === 'string') return f.agent_payload;
  return JSON.stringify(f.agent_payload, null, 2);
}

function fmtRef(ref) {
  const parts = [];
  if (ref.page) parts.push(`Page ${ref.page}`);
  if (ref.section) parts.push(`§${ref.section}`);
  if (ref.clause) parts.push(ref.clause);
  return parts.join(' · ') || JSON.stringify(ref);
}

// ── Component ────────────────────────────────────────────────────────
export default function ExtractionDetail() {
  const { intakeId } = useParams();
  const navigate = useNavigate();
  usePageTitle('Admin | Extraction Detail');

  const [intake, setIntake] = useState(null);
  const [run, setRun] = useState(null);
  const [findings, setFindings] = useState([]);
  const [standards, setStandards] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Load ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!intakeId) return;
    (async () => {
      setLoading(true);
      const [iRes, rRes] = await Promise.all([
        supabase.from('policy_lens_intakes')
          .select('id, carrier, policy_type, business_name, agent_name, agency_name, source, created_at')
          .eq('id', intakeId)
          .single(),
        supabase.from('pl_extraction_runs')
          .select('id, intake_id, status, release_status, integrity_flags, created_at')
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
            .select('id, run_id, intake_id, finding_key, part, flag, agent_payload, kitchen_payload, correlation, source_refs, citation_status, review_required, review_state, reviewed_by, reviewed_at, reviewer_corrected')
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
      setLoading(false);
    })();
  }, [intakeId]);

  // ── Derived ────────────────────────────────────────────────────────
  const selected = useMemo(() => findings.find(f => f.id === selectedId) || null, [findings, selectedId]);
  const reviewedCount = useMemo(() => findings.filter(f => f.review_state !== 'pending').length, [findings]);
  const sourceRefs = selected?.source_refs || [];

  const matchedStandard = useMemo(() => {
    if (!selected) return null;
    return standards.find(s =>
      s.topic === selected.finding_key ||
      s.topic === selected.part + '_' + selected.finding_key,
    ) || null;
  }, [selected, standards]);

  // ── Loading ────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="font-['DM_Sans','Inter',sans-serif]">
      <AdminBreadcrumb crumbs={[
        { label: 'Policy Lens', path: '/admin/policy-lens' },
        { label: intake.carrier || 'Detail' },
      ]} />

      {/* ── Top bar ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, paddingBottom: 16,
        borderBottom: `1px solid ${LINE_CLR}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate('/admin/policy-lens')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: NAVY, fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} /> Queue
          </button>
          <div style={{ width: 1, height: 24, background: LINE_CLR }} />
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>
              {intake.carrier || 'Unknown carrier'}
            </span>
            {intake.policy_type && (
              <span style={{ fontSize: 13, color: `${NAVY}99`, marginLeft: 8 }}>
                {intake.policy_type}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: MUTE }}>
            {reviewedCount} of {findings.length} reviewed
          </span>
          <button
            disabled
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 600,
              borderRadius: 10, border: `1px solid ${NAVY}20`,
              background: '#F3F4F6', color: `${NAVY}40`,
              cursor: 'not-allowed',
            }}
          >
            Release to agent
          </button>
        </div>
      </div>

      {/* ── Three-column layout ───────────────────────────────── */}
      {findings.length === 0 ? (
        <div className="py-12 text-center">
          <FileText size={32} className="mx-auto mb-3 text-[#1E2D4D]/20" />
          <p className="text-sm text-[#1E2D4D]/50">No findings for this extraction.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'start' }}>

          {/* ─── LEFT: Source policy ────────────────────────────── */}
          <div style={{
            background: '#FFFFFF', borderRadius: 12,
            border: `1px solid ${NAVY}10`, overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 16px', borderBottom: `1px solid ${NAVY}08`,
              fontSize: 13, fontWeight: 700, color: NAVY,
            }}>
              Source policy
            </div>
            <div style={{ padding: 16, minHeight: 300 }}>
              {selected && sourceRefs.length > 0 ? (
                sourceRefs.map((ref, i) => (
                  <div key={i} style={{
                    marginBottom: 12, padding: 12,
                    background: CREAM, borderRadius: 8,
                    borderLeft: `3px solid ${GOLD}`,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: MUTE, marginBottom: 6 }}>
                      {fmtRef(ref)}
                    </div>
                    {ref.text && (
                      <p style={{
                        fontSize: 13, color: NAVY, lineHeight: 1.6,
                        margin: 0, fontStyle: 'italic',
                        background: '#FFF9E6', padding: '4px 6px',
                        borderRadius: 4,
                      }}>
                        &ldquo;{ref.text}&rdquo;
                      </p>
                    )}
                    {ref.clause && !ref.text && (
                      <p style={{ fontSize: 13, color: NAVY, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                        {ref.clause}
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
            <div style={{
              padding: '12px 16px', borderTop: `1px solid ${NAVY}08`,
              fontSize: 11, color: MUTE, lineHeight: 1.5,
            }}>
              Highlighted text is the exact clause this finding was read from. Nothing is asserted without a source you can check.
            </div>
          </div>

          {/* ─── MIDDLE: What EvidLY read ──────────────────────── */}
          <div style={{
            background: '#FFFFFF', borderRadius: 12,
            border: `1px solid ${NAVY}10`, overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 16px', borderBottom: `1px solid ${NAVY}08`,
              fontSize: 13, fontWeight: 700, color: NAVY,
            }}>
              What EvidLY read
              <span style={{ fontWeight: 400, color: MUTE, marginLeft: 8 }}>
                {findings.length} finding{findings.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {findings.map(f => {
                const isSel = f.id === selectedId;
                const rm = REVIEW_META[f.review_state] || REVIEW_META.pending;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '12px 16px',
                      background: isSel ? `${GOLD}10` : 'transparent',
                      borderLeft: isSel ? `3px solid ${GOLD}` : '3px solid transparent',
                      borderBottom: `1px solid ${NAVY}06`,
                      borderTop: 'none', borderRight: 'none',
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <PartTag part={f.part} />
                      <FlagBadge flag={f.flag} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 4 }}>
                      {extractTitle(f)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                      {f.source_refs?.length > 0 && (
                        <span style={{ color: MUTE }}>{fmtRef(f.source_refs[0])}</span>
                      )}
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        background: rm.bg, color: rm.fg,
                        borderRadius: 3, padding: '2px 6px',
                      }}>
                        {rm.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── RIGHT: Your review ────────────────────────────── */}
          <div style={{
            background: '#FFFFFF', borderRadius: 12,
            border: `1px solid ${NAVY}10`, overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 16px', borderBottom: `1px solid ${NAVY}08`,
              fontSize: 13, fontWeight: 700, color: NAVY,
            }}>
              Your review
            </div>
            {selected ? (
              <div style={{ padding: 16 }}>
                {/* Part + Flag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <PartTag part={selected.part} />
                  <FlagBadge flag={selected.flag} />
                </div>

                {/* Requirement title */}
                <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: '0 0 12px' }}>
                  {extractTitle(selected)}
                </h3>

                {/* What EvidLY read */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: MUTE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    What EvidLY read
                  </div>
                  <div style={{
                    fontSize: 13, color: NAVY, lineHeight: 1.6,
                    background: CREAM, padding: 12, borderRadius: 8,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {extractBody(selected)}
                  </div>
                </div>

                {/* Why this flag */}
                {selected.correlation && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Why this flag
                    </div>
                    <div style={{
                      fontSize: 13, color: NAVY, lineHeight: 1.6,
                      background: '#FDF6EC', padding: 12, borderRadius: 8,
                      borderLeft: `3px solid ${AMBER}`,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {selected.correlation?.note || selected.correlation?.reason ||
                        (typeof selected.correlation === 'string'
                          ? selected.correlation
                          : JSON.stringify(selected.correlation, null, 2))}
                      {run?.integrity_flags?.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 12, color: CORAL }}>
                          Integrity flags: {run.integrity_flags.map(fl =>
                            typeof fl === 'string' ? fl : fl.type || JSON.stringify(fl),
                          ).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Maps to */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: MUTE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Maps to
                  </div>
                  {matchedStandard ? (
                    <div style={{
                      fontSize: 13, color: NAVY, lineHeight: 1.6,
                      background: '#F0F4FA', padding: 12, borderRadius: 8,
                    }}>
                      <div style={{ fontWeight: 600 }}>{matchedStandard.standard}</div>
                      <div style={{ fontSize: 12, color: MUTE, marginTop: 4 }}>
                        {matchedStandard.citation}
                        {matchedStandard.edition && ` (${matchedStandard.edition})`}
                      </div>
                      {matchedStandard.enforced_by && (
                        <div style={{ fontSize: 11, color: MUTE, marginTop: 2 }}>
                          Enforced by: {matchedStandard.enforced_by}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      fontSize: 13, color: MUTE, lineHeight: 1.6,
                      background: '#F3F4F6', padding: 12, borderRadius: 8,
                    }}>
                      {selected.agent_payload?.maps_to || selected.agent_payload?.standard || selected.finding_key}
                    </div>
                  )}
                </div>

                {/* Source ref */}
                {sourceRefs.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Source reference
                    </div>
                    <div style={{ fontSize: 12, color: NAVY }}>
                      {sourceRefs.map((r, i) => (
                        <span key={i}>{i > 0 && ' · '}{fmtRef(r)}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons — RENDERED BUT INERT */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: `1px solid ${NAVY}08` }}>
                  <button
                    disabled
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 6, padding: '10px 12px', fontSize: 13, fontWeight: 600,
                      borderRadius: 10, border: `1px solid ${TEAL}30`,
                      background: '#FFFFFF', color: TEAL,
                      cursor: 'not-allowed', opacity: 0.5,
                    }}
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button
                    disabled
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 6, padding: '10px 12px', fontSize: 13, fontWeight: 600,
                      borderRadius: 10, border: `1px solid ${AMBER}30`,
                      background: '#FFFFFF', color: AMBER,
                      cursor: 'not-allowed', opacity: 0.5,
                    }}
                  >
                    <Pencil size={14} /> Correct
                  </button>
                  <button
                    disabled
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 6, padding: '10px 12px', fontSize: 13, fontWeight: 600,
                      borderRadius: 10, border: `1px solid ${CORAL}30`,
                      background: '#FFFFFF', color: CORAL,
                      cursor: 'not-allowed', opacity: 0.5,
                    }}
                  >
                    <Flag size={14} /> Flag
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                padding: 16, textAlign: 'center', color: `${NAVY}30`,
                fontSize: 13, paddingTop: 40,
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
