/**
 * PolicyLensQueue — Admin queue for Policy Lens intakes/extractions.
 * Route: /admin/policy-lens
 * READ-ONLY render. No mutations.
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, ChevronRight } from 'lucide-react';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';
import { EmptyState } from '../../components/EmptyState';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';

// ── Flag severity (PolicyLensReport ExposureChip palette) ──────
const FLAG_COLORS = {
  high:      { bg: '#FBEAE5', fg: '#C2553A' },
  elevated:  { bg: '#FBF3E0', fg: '#9A7B2D' },
  low:       { bg: '#EEF1F6', fg: '#1E2D4D' },
  satisfied: { bg: '#E8F2F1', fg: '#0F766E' },
};
const FLAG_ORDER = { high: 0, elevated: 1, low: 2, satisfied: 3 };

// ── Pipeline stages ────────────────────────────────────────────
const STAGES = [
  { key: 'reading',        label: 'Reading' },
  { key: 'reconciling',    label: 'Reconciling' },
  { key: 'findings_ready', label: 'Findings ready' },
  { key: 'your_review',    label: 'Your review' },
  { key: 'released',       label: 'Released to agent' },
  { key: 'failed',         label: 'Failed' },
];

function deriveStage(run) {
  if (!run) return 'reading';
  if (run.status === 'failed') return 'failed';
  if (run.release_status === 'released' || run.release_status === 'revoked') return 'released';
  if (run.release_status === 'in_review') return 'your_review';
  if (run.status === 'reconciled') return 'findings_ready';
  if (run.status === 'passes_complete') return 'reconciling';
  return 'reading';
}

function worstFlag(list) {
  if (!list?.length) return null;
  return list.reduce(
    (w, f) => (FLAG_ORDER[f.flag] ?? 99) < (FLAG_ORDER[w] ?? 99) ? f.flag : w,
    'satisfied',
  );
}

function partCounts(list) {
  const c = { fire: 0, food: 0, general: 0 };
  for (const f of list || []) c[f.part] = (c[f.part] || 0) + 1;
  return c;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Component ──────────────────────────────────────────────────
export default function PolicyLensQueue() {
  usePageTitle('Admin | Policy Lens');
  const navigate = useNavigate();

  const [intakes, setIntakes] = useState([]);
  const [runs, setRuns] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('all');
  const [flagFilter, setFlagFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [iRes, rRes, fRes] = await Promise.all([
      supabase
        .from('policy_lens_intakes')
        .select('id, created_at, source, status, business_name, contact_name, carrier, policy_type, agent_name, agency_name')
        .order('created_at', { ascending: false }),
      supabase
        .from('pl_extraction_runs')
        .select('id, intake_id, status, release_status, review_required, integrity_flags, released_at, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('pl_findings')
        .select('id, run_id, part, flag, review_state'),
    ]);
    if (iRes.data) setIntakes(iRes.data);
    if (rRes.data) setRuns(rRes.data);
    if (fRes.data) setFindings(fRes.data);
    setLoading(false);
  }

  // ── Enriched rows ────────────────────────────────────────────
  const rows = useMemo(() => {
    const runMap = {};
    for (const r of runs) {
      if (!runMap[r.intake_id]) runMap[r.intake_id] = r;
    }
    const findingsMap = {};
    for (const f of findings) {
      (findingsMap[f.run_id] ||= []).push(f);
    }
    return intakes.map(i => {
      const run = runMap[i.id] || null;
      const rf = run ? (findingsMap[run.id] || []) : [];
      const stage = deriveStage(run);
      const worst = worstFlag(rf);
      const counts = partCounts(rf);
      const hasIntegrity = run?.integrity_flags && Array.isArray(run.integrity_flags) && run.integrity_flags.length > 0;
      return { ...i, run, findings: rf, stage, worst, counts, hasIntegrity };
    });
  }, [intakes, runs, findings]);

  // ── Filter + sort (worst-first) ──────────────────────────────
  const filtered = useMemo(() => {
    let list = rows;
    // released runs leave the queue (live in Released Reports) unless explicitly viewed
    if (stageFilter !== 'released') list = list.filter(r => r.stage !== 'released');
    if (stageFilter !== 'all') list = list.filter(r => r.stage === stageFilter);
    if (flagFilter !== 'all') list = list.filter(r => r.worst === flagFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.carrier || '').toLowerCase().includes(q) ||
        (r.policy_type || '').toLowerCase().includes(q) ||
        (r.business_name || '').toLowerCase().includes(q) ||
        (r.agent_name || '').toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const fa = FLAG_ORDER[a.worst] ?? 99;
      const fb = FLAG_ORDER[b.worst] ?? 99;
      if (fa !== fb) return fa - fb;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [rows, stageFilter, flagFilter, search]);

  // ── Stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    return {
      inQueue: rows.filter(r => ['reading', 'reconciling'].includes(r.stage)).length,
      needReview: rows.filter(r => r.run && (r.run.release_status === 'in_review' || r.run.review_required)).length,
      flagged: rows.filter(r => r.worst === 'high' || r.hasIntegrity).length,
      releasedMonth: rows.filter(r =>
        r.run?.release_status === 'released' && r.run.released_at && new Date(r.run.released_at) >= monthStart,
      ).length,
    };
  }, [rows]);

  // ── Stage counts ─────────────────────────────────────────────
  const stageCounts = useMemo(() => {
    const c = {};
    for (const s of STAGES) c[s.key] = 0;
    for (const r of rows) c[r.stage] = (c[r.stage] || 0) + 1;
    return c;
  }, [rows]);

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A08C5A]" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="font-['DM_Sans','Inter',sans-serif]">
      <AdminBreadcrumb crumbs={[{ label: 'Policy Lens' }]} />

      <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-1">
        Policy Lens — Queue
      </h1>
      <p className="text-sm text-[#1E2D4D]/60 mb-6">
        EvidLY reads each uploaded policy, identifies its requirements, and flags what needs review before findings are released.
      </p>

      {/* ── Stage pipeline ──────────────────────────────────── */}
      <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-1">
        {STAGES.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <button
              onClick={() => setStageFilter(stageFilter === s.key ? 'all' : s.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
              style={{
                background: stageFilter === s.key ? '#1E2D4D' : '#F3F4F6',
                color: stageFilter === s.key ? '#FFFFFF' : '#1E2D4D',
              }}
            >
              {s.label}
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: stageFilter === s.key ? 'rgba(255,255,255,0.2)' : '#E5E7EB',
                  color: stageFilter === s.key ? '#FFFFFF' : '#6B7280',
                }}
              >
                {stageCounts[s.key]}
              </span>
            </button>
            {i < STAGES.length - 1 && (
              <ChevronRight size={14} className="mx-1 text-[#1E2D4D]/20 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <KpiTile label="In queue" value={stats.inQueue} valueColor="navy" />
        <KpiTile label="Need review" value={stats.needReview} valueColor="gold" />
        <KpiTile label="Flagged — escalation" value={stats.flagged} valueColor="red" />
        <KpiTile label="Released this month" value={stats.releasedMonth} valueColor="green" />
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1E2D4D]/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search carrier, policy, business…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#1E2D4D]/10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]"
          />
        </div>
        <select
          value={flagFilter}
          onChange={e => setFlagFilter(e.target.value)}
          className="text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]"
        >
          <option value="all">All severities</option>
          <option value="high">High</option>
          <option value="elevated">Elevated</option>
          <option value="low">Low</option>
          <option value="satisfied">Satisfied</option>
        </select>
        {(stageFilter !== 'all' || flagFilter !== 'all' || search) && (
          <button
            onClick={() => { setStageFilter('all'); setFlagFilter('all'); setSearch(''); }}
            className="text-xs text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No intakes"
          description="No policy intakes match your current filters."
        />
      ) : (
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAF7F0] border-b border-[#1E2D4D]/10">
                <th className="text-left px-4 py-3 font-semibold text-[#1E2D4D]/80">Policy / Carrier</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1E2D4D]/80">Uploaded by</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1E2D4D]/80">Stage</th>
                <th className="text-center px-4 py-3 font-semibold text-[#1E2D4D]/80">Severity</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1E2D4D]/80">Findings</th>
                <th className="text-right px-4 py-3 font-semibold text-[#1E2D4D]/80">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const canReview = row.run
                  && !['pending', 'passes_complete'].includes(row.run.status)
                  && row.findings.length > 0;
                const isReleased = row.run?.release_status === 'released';
                const uploadedBy = row.source === 'agent'
                  ? [row.agent_name, row.agency_name].filter(Boolean).join(' · ') || '—'
                  : [row.contact_name, row.business_name].filter(Boolean).join(' · ') || '—';
                const stageObj = STAGES.find(s => s.key === row.stage);

                return (
                  <tr key={row.id} className="border-b border-[#1E2D4D]/5 hover:bg-[#FAF7F0]/50 transition-colors">
                    {/* Policy / Carrier */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1E2D4D]">{row.carrier || 'No carrier'}</div>
                      <div className="text-xs text-[#1E2D4D]/40 mt-0.5">
                        {row.policy_type || '—'} · Received {fmtDate(row.created_at)}
                      </div>
                    </td>
                    {/* Uploaded by */}
                    <td className="px-4 py-3">
                      <div className="text-[#1E2D4D]/80">{uploadedBy}</div>
                      <div className="text-xs text-[#1E2D4D]/40 capitalize">
                        {row.source === 'in_app' ? 'In-app' : row.source}
                      </div>
                    </td>
                    {/* Stage */}
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: row.stage === 'failed' ? '#FBEAE5'
                            : row.stage === 'released' ? '#E8F2F1'
                            : row.stage === 'your_review' ? '#FBF3E0' : '#EEF1F6',
                          color: row.stage === 'failed' ? '#C2553A'
                            : row.stage === 'released' ? '#0F766E'
                            : row.stage === 'your_review' ? '#9A7B2D' : '#1E2D4D',
                        }}
                      >
                        {stageObj?.label || row.stage}
                      </span>
                    </td>
                    {/* Severity */}
                    <td className="px-4 py-3 text-center">
                      {row.worst ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                          style={{ background: FLAG_COLORS[row.worst]?.bg, color: FLAG_COLORS[row.worst]?.fg }}
                        >
                          {row.worst}
                        </span>
                      ) : (
                        <span className="text-[#1E2D4D]/20">—</span>
                      )}
                    </td>
                    {/* Findings counts */}
                    <td className="px-4 py-3 text-xs text-[#1E2D4D]/70">
                      {row.findings.length > 0 ? (
                        [
                          row.counts.fire > 0 && `${row.counts.fire} Fire`,
                          row.counts.food > 0 && `${row.counts.food} Food`,
                          row.counts.general > 0 && `${row.counts.general} Gen`,
                        ].filter(Boolean).join(' · ')
                      ) : (
                        <span className="text-[#1E2D4D]/20">—</span>
                      )}
                    </td>
                    {/* Action */}
                    <td className="px-4 py-3 text-right">
                      {isReleased ? (
                        <button
                          onClick={() => navigate(`/admin/policy-lens/${row.id}`)}
                          className="px-3 py-1.5 text-xs font-medium border border-[#0F766E]/30 rounded-xl text-[#0F766E] hover:bg-[#E8F2F1]"
                        >
                          View report
                        </button>
                      ) : (
                        <button
                          onClick={() => canReview && navigate(`/admin/policy-lens/${row.id}`)}
                          disabled={!canReview}
                          className="px-3 py-1.5 text-xs font-medium border border-[#1E2D4D]/10 rounded-xl hover:bg-[#FAF7F0] text-[#1E2D4D]/70 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
