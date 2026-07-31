/**
 * SurveyTab — Kitchen Safety Study analytics for the Marketing console.
 *
 * Reads from market_research_responses / answers / contacts via useSurveyData.
 * All numbers are REAL — no fabricated data. Empty until there are rows.
 * Reporting threshold: segments below 10 show a dash and their n.
 */
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Copy, Download, ExternalLink } from 'lucide-react';
import {
  useSurveyData,
  MIN_N,
  RECORD_NAMES,
  VALUE_LABELS,
  SOURCE_LABELS,
  CA_REGIONS,
  COUNTY_TO_REGION,
  type ResponseRow,
  type RecordBand,
  type SegmentCount,
  type FilterState,
} from '../../../lib/marketing/useSurveyData';
import { KpiMini, BarRow } from './marketingPrimitives';
import {
  EV_NAVY, EV_EMBER, EV_SLATE, EV_SUCCESS, EV_MUTED, EV_FAINT,
  EV_LINE, EV_LIGHT, EV_PAPER, EV_DANGER, EV_WARN, EV_CREAM,
  DISPLAY, BODY,
} from './marketingTokens';
import { toast } from 'sonner';

// ── Tagged links for copy ────────────────────────────────────────

const TAGGED_LINKS = [
  { label: 'Outbound call',  url: 'https://getevidly.com/study?from=call' },
  { label: 'Show floor QR',  url: 'https://getevidly.com/study?from=show' },
  { label: 'EvidLY email',   url: 'https://getevidly.com/study?from=email' },
  { label: 'LinkedIn',       url: 'https://getevidly.com/study?from=linkedin' },
  { label: 'Facebook',       url: 'https://getevidly.com/study?from=facebook' },
  { label: 'Instagram',      url: 'https://getevidly.com/study?from=instagram' },
  { label: 'YouTube',        url: 'https://getevidly.com/study?from=youtube' },
  { label: 'Website',        url: 'https://getevidly.com/study?from=page' },
  { label: 'CRA email',      url: 'https://getevidly.com/study?from=cra' },
  { label: 'Referral',       url: 'https://getevidly.com/study?from=referral' },
];

// ── Helpers ──────────────────────────────────────────────────────

function pct(n: number, total: number): string {
  return total >= MIN_N ? `${Math.round(n / total * 100)}%` : '\u2014';
}

function safeVal(count: number, n: number): string {
  return n >= MIN_N ? String(count) : '\u2014';
}

function safePct(count: number, n: number): string {
  return n >= MIN_N ? `${Math.round(count / n * 100)}%` : '\u2014';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

// ── Component ────────────────────────────────────────────────────

export default function SurveyTab() {
  const {
    responses, stats, loading, error,
    filters, setFilters, contactMap, exportCSV, allResponses,
  } = useSurveyData();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const completed = useMemo(() => responses.filter(r => r.status === 'completed'), [responses]);
  const hasData = allResponses.length > 0;
  const belowThreshold = completed.length < MIN_N && completed.length > 0;

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: EV_MUTED, fontFamily: BODY }}>
        Loading study data\u2026
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">
        {error}
      </div>
    );
  }

  // Empty state
  if (!hasData) {
    return (
      <div style={{ fontFamily: BODY }}>
        <div className="border rounded-lg p-8 text-center" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <h3 className="text-lg font-bold mb-2" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
            California Kitchen Safety Study
          </h3>
          <p className="text-[13px] mb-6" style={{ color: EV_MUTED }}>
            No responses yet. Share the tagged links to start collecting data.
          </p>

          {/* Tagged links */}
          <div className="max-w-md mx-auto text-left">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: EV_MUTED }}>
              Tagged Links
            </div>
            {TAGGED_LINKS.map(link => (
              <div key={link.label} className="flex items-center justify-between py-2"
                style={{ borderBottom: `1px solid ${EV_LINE}` }}>
                <div>
                  <span className="text-[12px] font-semibold" style={{ color: EV_NAVY }}>{link.label}</span>
                  <span className="text-[11px] ml-2 font-mono" style={{ color: EV_FAINT }}>{link.url}</span>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(link.url); toast.success('Copied'); }}
                  className="p-1.5 rounded cursor-pointer bg-transparent border-none"
                  title="Copy link">
                  <Copy size={13} style={{ color: EV_MUTED }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: BODY }}>
      {/* Threshold warning */}
      {belowThreshold && (
        <div className="text-[12px] px-4 py-2.5 rounded-md mb-4"
          style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #F6DFA1' }}>
          The filtered set has {completed.length} completed response{completed.length !== 1 ? 's' : ''} — below the reporting threshold of {MIN_N}. Figures are hidden to protect respondent privacy.
        </div>
      )}

      {/* ── Filter bar ─────────────────────────────────────────── */}
      <FilterBar filters={filters} setFilters={setFilters} responses={allResponses} />

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 mt-4">
        <KpiMini l="Responses" v={stats.total} accent={EV_NAVY} />
        <KpiMini l="Completed" v={stats.completed} sub={`${stats.completionRate}% rate`} accent={EV_EMBER} />
        <KpiMini l="In Progress" v={stats.inProgress} accent={EV_SLATE} />
        <KpiMini l="Median Time" v={stats.medianSeconds > 0 ? fmtDuration(stats.medianSeconds) : '\u2014'} />
        <KpiMini l="Meeting Queue" v={stats.meetingQueue.length} accent={EV_SUCCESS} />
      </div>

      {/* ── Scope distribution ─────────────────────────────────── */}
      <Panel title="Which half they hold" note="Scope distribution">
        {stats.scopeCounts.length > 0 ? (
          stats.scopeCounts.map(s => (
            <BarRow key={s.label} label={s.label === 'food' ? 'Food safety' : s.label === 'fire' ? 'Facility safety' : 'Both'}
              pct={s.count / (stats.completed || 1) * 100}
              color={EV_EMBER} right={`${s.count} (${safePct(s.count, stats.completed)})`} />
          ))
        ) : <EmptyNote />}
      </Panel>

      {/* ── Record bands (worst-first) ─────────────────────────── */}
      <Panel title="Record readiness" note="Bands per record, worst first">
        {stats.recordBands.filter(b => b.n > 0).length > 0 ? (
          <div className="space-y-1">
            <div className="grid px-0 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ gridTemplateColumns: '1.4fr repeat(5,1fr)', color: EV_MUTED }}>
              <div>Record</div>
              <div className="text-right">Ready</div>
              <div className="text-right">Find it</div>
              <div className="text-right">Not mine</div>
              <div className="text-right">Not on file</div>
              <div className="text-right">n</div>
            </div>
            {stats.recordBands.filter(b => b.n > 0).map(b => (
              <RecordBandRow key={b.question_id} band={b} />
            ))}
          </div>
        ) : <EmptyNote />}
      </Panel>

      {/* ── Facility readiness by system (the cross-tab) ─────── */}
      <Panel title="Facility readiness by what they keep it in" note="The cross-tab the study exists to produce">
        {Object.keys(stats.crossTabSystemByRecord).length > 0 ? (
          Object.entries(stats.crossTabSystemByRecord).map(([sys, { respondents, bands }]) => {
            const validBands = bands.filter(b => b.n > 0);
            if (!validBands.length) return null;
            const totalGap = validBands.reduce((s, b) => s + b.untracked + b.gap + b.no, 0);
            const totalPool = validBands.reduce((s, b) => s + b.n, 0);
            return (
              <div key={sys} className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[13px] font-semibold" style={{ color: EV_NAVY }}>{sys}</span>
                  <span className="text-[11px] font-mono" style={{ color: EV_FAINT }}>
                    n={respondents} · {respondents >= MIN_N ? `${Math.round(totalGap / totalPool * 100)}% gap` : '\u2014'}
                  </span>
                </div>
                {validBands.map(b => (
                  <BarRow key={b.question_id} label={b.name}
                    pct={b.n >= MIN_N ? b.gapPct : 0}
                    color={EV_EMBER}
                    right={b.n >= MIN_N ? `${b.gapPct}% gap (n=${b.n})` : `\u2014 (n=${b.n})`} />
                ))}
              </div>
            );
          })
        ) : <EmptyNote />}
      </Panel>

      {/* ── PSE / signed records ──────────────────────────────── */}
      <Panel title="Protective Safeguards" note="PSE awareness and signed records">
        {stats.knowBands.length > 0 ? (
          stats.knowBands.map(b => (
            <div key={b.question_id} className="mb-3">
              <div className="text-[13px] font-semibold mb-1" style={{ color: EV_NAVY }}>{b.name}</div>
              {b.n > 0 ? (
                <div className="text-[12px] font-mono" style={{ color: EV_MUTED }}>
                  Yes: {safePct(b.tracked, b.n)} · No: {safePct(b.no, b.n)} · Unsure: {safePct(b.gap, b.n)} · n={b.n}
                  {b.na > 0 && ` · N/A: ${b.na}`}
                </div>
              ) : (
                <div className="text-[12px] font-mono" style={{ color: EV_FAINT }}>n=0</div>
              )}
            </div>
          ))
        ) : <EmptyNote />}
      </Panel>

      {/* ── What they keep it in ──────────────────────────────── */}
      <SegmentPanel title="What they keep it in" note="Record-keeping system"
        counts={stats.systemCounts} total={stats.completed} />

      {/* ── Who is responsible ────────────────────────────────── */}
      <SegmentPanel title="Who is responsible" note="Record owner"
        counts={stats.ownerCounts} total={stats.completed} />

      {/* ── Time to send ──────────────────────────────────────── */}
      <SegmentPanel title="Time to send" note="Speed to produce proof"
        counts={stats.speedCounts} total={stats.completed} />

      {/* ── Who has asked ─────────────────────────────────────── */}
      <SegmentPanel title="Who has asked" note="Multi-select — respondents may choose more than one"
        counts={stats.askerCounts} total={stats.completed} />

      {/* ── Channel ───────────────────────────────────────────── */}
      <Panel title="Channel" note="With platform sub-rows for social">
        {stats.channelCounts.length > 0 ? (
          <>
            {stats.channelCounts.map(s => (
              <div key={s.label}>
                <BarRow label={SOURCE_LABELS[s.label] || s.label}
                  pct={s.count / (stats.completed || 1) * 100}
                  color={EV_SLATE}
                  right={`${s.count} (${safePct(s.count, stats.completed)})`} />
                {s.label === 'social' && stats.platformCounts.length > 0 && (
                  <div className="ml-6 mb-2">
                    {stats.platformCounts.map(p => (
                      <div key={p.label} className="text-[11px] flex justify-between py-0.5" style={{ color: EV_MUTED }}>
                        <span>{p.label}</span>
                        <span className="font-mono">{p.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        ) : <EmptyNote />}
      </Panel>

      {/* ── By kitchen type ───────────────────────────────────── */}
      <SegmentPanel title="By kitchen type" counts={stats.kitchenTypeCounts} total={stats.completed} />

      {/* ── By region ─────────────────────────────────────────── */}
      <Panel title="By region" note="Census 2020 grouping · 58 counties in 10 regions">
        {stats.regionCounts.length > 0 ? (
          stats.regionCounts.map(s => (
            <BarRow key={s.label} label={s.label}
              pct={s.count / (stats.completed || 1) * 100}
              color={EV_SLATE}
              right={`${s.count} (${safePct(s.count, stats.completed)})`} />
          ))
        ) : <EmptyNote />}
      </Panel>

      {/* ── By county ─────────────────────────────────────────── */}
      <Panel title="By county" note="With roll-up line">
        {stats.countyCounts.length > 0 ? (
          <>
            <div className="text-[11px] font-mono mb-3" style={{ color: EV_FAINT }}>
              {stats.countyCounts.length} counties represented · {stats.completed} completed
            </div>
            {stats.countyCounts.map(s => (
              <BarRow key={s.label} label={s.label}
                pct={s.count / (stats.completed || 1) * 100}
                color={EV_SLATE}
                right={s.count >= MIN_N ? `${s.count} (${s.pct}%)` : `\u2014 (n=${s.count})`} />
            ))}
          </>
        ) : <EmptyNote />}
      </Panel>

      {/* ── Meeting queue ─────────────────────────────────────── */}
      <Panel title="Meeting queue" note="Respondents who consented to a meeting">
        {stats.meetingQueue.length > 0 ? (
          <div>
            {stats.meetingQueue.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-2"
                style={{ borderBottom: i < stats.meetingQueue.length - 1 ? `1px solid ${EV_LINE}` : 'none' }}>
                <span className="text-[13px] font-semibold" style={{ color: EV_NAVY }}>{m.email}</span>
                <span className="text-[11px] font-mono" style={{ color: EV_FAINT }}>{fmtDate(m.created_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: EV_MUTED }}>No meetings booked yet.</p>
        )}
      </Panel>

      {/* ── Responses table ───────────────────────────────────── */}
      <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: EV_LINE }}>
          <div>
            <h4 className="text-sm font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
              Responses
            </h4>
            <div className="text-[11px] mt-0.5" style={{ color: EV_MUTED }}>
              {completed.length} completed · click to expand
            </div>
          </div>
          <button onClick={exportCSV}
            className="inline-flex items-center gap-1.5 py-1.5 px-3 text-[11px] font-semibold rounded cursor-pointer border"
            style={{ color: EV_NAVY, borderColor: EV_LINE, background: 'transparent' }}>
            <Download size={12} /> CSV Export
          </button>
        </div>

        {completed.length === 0 ? (
          <div className="p-8 text-center text-[13px]" style={{ color: EV_MUTED }}>
            No completed responses yet.
          </div>
        ) : (
          <div>
            <div className="grid px-5 py-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ gridTemplateColumns: '24px 1fr 1fr 1fr 1fr 1fr', color: EV_MUTED, borderBottom: `1px solid ${EV_LINE}` }}>
              <div />
              <div>Scope</div>
              <div>County</div>
              <div>Kitchen Type</div>
              <div>Identity</div>
              <div className="text-right">Completed</div>
            </div>
            {completed.slice(0, 50).map(r => {
              const isOpen = expandedId === r.id;
              const contact = contactMap[r.id];
              const identity = contact?.wants_meeting ? 'Named \u2014 consented' : 'Anonymous';
              return (
                <div key={r.id}>
                  <button onClick={() => setExpandedId(isOpen ? null : r.id)}
                    className="w-full grid px-5 py-2.5 items-center text-left cursor-pointer bg-transparent border-x-0 border-t-0"
                    style={{
                      gridTemplateColumns: '24px 1fr 1fr 1fr 1fr 1fr',
                      borderBottom: isOpen ? 'none' : `1px solid ${EV_LINE}`,
                    }}>
                    {isOpen
                      ? <ChevronDown size={14} style={{ color: EV_EMBER }} />
                      : <ChevronRight size={14} style={{ color: EV_FAINT }} />}
                    <span className="text-[12px]" style={{ color: EV_NAVY }}>
                      {r.scope === 'food' ? 'Food' : r.scope === 'fire' ? 'Facility' : r.scope === 'both' ? 'Both' : '\u2014'}
                    </span>
                    <span className="text-[12px]" style={{ color: EV_MUTED }}>{r.county || '\u2014'}</span>
                    <span className="text-[12px] truncate" style={{ color: EV_MUTED }}>{r.kitchen_type || '\u2014'}</span>
                    <span className="text-[11px]" style={{ color: contact?.wants_meeting ? EV_EMBER : EV_FAINT }}>
                      {identity}
                    </span>
                    <span className="text-[12px] text-right font-mono" style={{ color: EV_MUTED }}>
                      {r.completed_at ? fmtDate(r.completed_at) : '\u2014'}
                    </span>
                  </button>
                  {isOpen && <ResponseDetail row={r} contact={contact} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-5 mb-4" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
      <h4 className="text-sm font-bold mb-1" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>{title}</h4>
      {note && <div className="text-[10px] mb-3" style={{ color: EV_FAINT }}>{note}</div>}
      {children}
    </div>
  );
}

function EmptyNote() {
  return <p className="text-[12px]" style={{ color: EV_MUTED }}>No completed responses yet.</p>;
}

function SegmentPanel({ title, note, counts, total }: {
  title: string; note?: string; counts: SegmentCount[]; total: number;
}) {
  return (
    <Panel title={title} note={note}>
      {counts.length > 0 ? (
        counts.map(s => (
          <BarRow key={s.label} label={s.label}
            pct={s.count / (total || 1) * 100}
            color={EV_EMBER}
            right={total >= MIN_N ? `${s.count} (${s.pct}%)` : `\u2014 (n=${s.count})`} />
        ))
      ) : <EmptyNote />}
    </Panel>
  );
}

function RecordBandRow({ band }: { band: RecordBand }) {
  const safe = band.n >= MIN_N;
  return (
    <div className="grid py-2 items-center"
      style={{ gridTemplateColumns: '1.4fr repeat(5,1fr)', borderTop: `1px solid ${EV_LINE}` }}>
      <div className="text-[12px] font-semibold" style={{ color: EV_NAVY }}>
        {band.name}
      </div>
      <div className="text-[12px] text-right font-mono" style={{ color: safe ? EV_SUCCESS : EV_FAINT }}>
        {safe ? band.tracked : '\u2014'}
      </div>
      <div className="text-[12px] text-right font-mono" style={{ color: safe ? EV_WARN : EV_FAINT }}>
        {safe ? band.untracked : '\u2014'}
      </div>
      <div className="text-[12px] text-right font-mono" style={{ color: safe ? EV_EMBER : EV_FAINT }}>
        {safe ? band.gap : '\u2014'}
      </div>
      <div className="text-[12px] text-right font-mono" style={{ color: safe ? EV_DANGER : EV_FAINT }}>
        {safe ? band.no : '\u2014'}
      </div>
      <div className="text-[12px] text-right font-mono" style={{ color: EV_MUTED }}>
        {band.n}{band.na > 0 ? ` (+${band.na} N/A)` : ''}
      </div>
    </div>
  );
}

function FilterBar({ filters, setFilters, responses }: {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  responses: ResponseRow[];
}) {
  const counties = useMemo(() =>
    [...new Set(responses.map(r => r.county).filter(Boolean) as string[])].sort(),
  [responses]);
  const types = useMemo(() =>
    [...new Set(responses.map(r => r.kitchen_type).filter(Boolean) as string[])].sort(),
  [responses]);
  const channels = useMemo(() =>
    [...new Set(responses.map(r => r.source).filter(Boolean) as string[])].sort(),
  [responses]);
  const regions = Object.keys(CA_REGIONS).sort();

  const sel = 'py-1.5 px-2.5 text-[12px] border rounded-md bg-white';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={filters.region || ''} onChange={e => setFilters({ ...filters, region: e.target.value || null, county: null })}
        className={sel} style={{ borderColor: EV_LINE, color: EV_NAVY }}>
        <option value="">All regions</option>
        {regions.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <select value={filters.county || ''} onChange={e => setFilters({ ...filters, county: e.target.value || null })}
        className={sel} style={{ borderColor: EV_LINE, color: EV_NAVY }}>
        <option value="">All counties</option>
        {counties.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={filters.kitchenType || ''} onChange={e => setFilters({ ...filters, kitchenType: e.target.value || null })}
        className={sel} style={{ borderColor: EV_LINE, color: EV_NAVY }}>
        <option value="">All kitchen types</option>
        {types.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <select value={filters.channel || ''} onChange={e => setFilters({ ...filters, channel: e.target.value || null })}
        className={sel} style={{ borderColor: EV_LINE, color: EV_NAVY }}>
        <option value="">All channels</option>
        {channels.map(c => <option key={c} value={c}>{SOURCE_LABELS[c] || c}</option>)}
      </select>
      <select value={filters.scope || ''} onChange={e => setFilters({ ...filters, scope: e.target.value || null })}
        className={sel} style={{ borderColor: EV_LINE, color: EV_NAVY }}>
        <option value="">All scopes</option>
        <option value="food">Food safety</option>
        <option value="fire">Facility safety</option>
        <option value="both">Both</option>
      </select>
      {(filters.region || filters.county || filters.kitchenType || filters.channel || filters.scope) && (
        <button onClick={() => setFilters({ region: null, county: null, kitchenType: null, channel: null, scope: null })}
          className="py-1 px-2.5 text-[11px] font-semibold rounded cursor-pointer border-none"
          style={{ background: EV_LIGHT, color: EV_MUTED }}>
          Clear filters
        </button>
      )}
    </div>
  );
}

function ResponseDetail({ row, contact }: { row: ResponseRow; contact?: { email?: string | null; wants_meeting?: boolean; wants_findings?: boolean; wants_county_report?: boolean; wants_referral_link?: boolean } | null }) {
  const fields = [
    { label: 'Source', value: row.source ? (SOURCE_LABELS[row.source] || row.source) : '\u2014' },
    { label: 'Source method', value: row.source_method || '\u2014' },
    { label: 'Kitchen count', value: row.kitchen_count || '\u2014' },
    { label: 'System', value: row.system || '\u2014' },
    { label: 'Record owner', value: row.record_owner || '\u2014' },
    { label: 'Speed', value: row.speed || '\u2014' },
    { label: 'Askers', value: (row.askers || []).join(', ') || '\u2014' },
    { label: 'Duration', value: row.duration_seconds ? fmtDuration(row.duration_seconds) : '\u2014' },
  ];
  if (contact?.wants_meeting) {
    fields.push({ label: 'Contact email', value: contact.email || '\u2014' });
  }

  return (
    <div className="px-5 pb-4 pt-1 ml-6" style={{ borderBottom: `1px solid ${EV_LINE}` }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
        {fields.map(f => (
          <div key={f.label}>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: EV_FAINT }}>{f.label}</div>
            <div className="text-[12px] mt-0.5" style={{ color: EV_NAVY }}>{f.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
