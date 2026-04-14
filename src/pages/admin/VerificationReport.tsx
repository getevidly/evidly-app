/**
 * VerificationReport — Platform-wide verification coverage, audit log, and source health.
 * Route: /admin/verification
 * Access: platform_admin only
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import VerificationPanel from '../../components/admin/VerificationPanel';
import { useDemoGuard } from '../../hooks/useDemoGuard';

interface StatusRow {
  id: string;
  content_table: string;
  content_id: string;
  content_title: string | null;
  content_type: string | null;
  gates_required: number;
  gates_passed: number;
  gates_failed: number;
  gates_pending: number;
  verification_status: string;
  publish_blocked: boolean;
  last_verified_at: string | null;
  last_verified_by: string | null;
  next_review_due: string | null;
  source_count: number;
}

interface LogRow {
  id: string;
  content_table: string;
  content_id: string;
  content_title: string | null;
  content_type: string | null;
  gate_key: string;
  gate_label: string;
  gate_result: string;
  verified_by_name: string | null;
  verification_method: string;
  source_urls: { url: string }[];
  reviewer_notes: string | null;
  content_was_corrected: boolean;
  created_at: string;
}

type Section = 'coverage' | 'content' | 'log' | 'sources';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  verified:     { bg: '#ECFDF5', text: '#059669' },
  in_review:    { bg: '#EFF6FF', text: '#2563EB' },
  unverified:   { bg: '#F9FAFB', text: '#9CA3AF' },
  rejected:     { bg: '#FEF2F2', text: '#DC2626' },
  needs_update: { bg: '#FFFBEB', text: '#D97706' },
  overdue:      { bg: '#FEF2F2', text: '#DC2626' },
};

const TABLE_LABELS: Record<string, string> = {
  intelligence_signals:       'Signals',
  regulatory_changes:         'Regulatory',
  jurisdictions:              'Jurisdictions',
  jurisdiction_intel_updates: 'JIE Updates',
  intelligence_sources:       'Crawl Sources',
  entity_correlations:        'Correlations',
};

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div className="bg-gray-200 rounded-md animate-pulse" style={{ width: w, height: h }} />
);

export default function VerificationReport() {
  useDemoGuard();
  const [searchParams] = useSearchParams();
  const signalId = searchParams.get('signal');

  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesExist, setTablesExist] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>(signalId ? 'content' : 'coverage');

  // Filters
  const [tableFilter, setTableFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Log filters
  const [logVerifier, setLogVerifier] = useState('');
  const [logResult, setLogResult] = useState('');

  // Expanded panel
  const [expandedRow, setExpandedRow] = useState<StatusRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [statusRes, logRes] = await Promise.all([
      supabase
        .from('content_verification_status')
        .select('*')
        .order('verification_status')
        .order('content_table'),
      supabase
        .from('content_verification_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    // Detect missing tables (migration not applied)
    if (statusRes.error?.code === '42P01' || logRes.error?.code === '42P01') {
      setTablesExist(false);
      setLoading(false);
      return;
    }
    if (statusRes.data) {
      setStatuses(statusRes.data);
      // Auto-expand signal from URL param
      if (signalId) {
        const match = statusRes.data.find((s: StatusRow) => s.content_id === signalId);
        if (match) setExpandedRow(match);
      }
    }
    if (logRes.data) setLogs(logRes.data);
    setLoading(false);
  }, [signalId]);

  useEffect(() => { load(); }, [load]);

  // KPIs
  const total = statuses.length;
  const verified = statuses.filter(s => s.verification_status === 'verified').length;
  const inReview = statuses.filter(s => s.verification_status === 'in_review').length;
  const unverified = statuses.filter(s => s.verification_status === 'unverified').length;
  const rejected = statuses.filter(s => s.verification_status === 'rejected').length;
  const overdue = statuses.filter(s => s.verification_status === 'overdue').length;
  const needsUpdate = statuses.filter(s => s.verification_status === 'needs_update').length;
  const coveragePct = total > 0 ? Math.round((verified / total) * 100) : 0;

  // Per-table breakdown
  const tables = ['intelligence_signals', 'regulatory_changes', 'jurisdictions', 'intelligence_sources', 'jurisdiction_intel_updates', 'entity_correlations'];
  const perTable = tables.map(t => {
    const rows = statuses.filter(s => s.content_table === t);
    return {
      table: t,
      label: TABLE_LABELS[t] || t,
      total: rows.length,
      verified: rows.filter(r => r.verification_status === 'verified').length,
      pct: rows.length > 0 ? Math.round((rows.filter(r => r.verification_status === 'verified').length / rows.length) * 100) : 0,
    };
  }).filter(t => t.total > 0);

  // Filtered content
  const filteredStatuses = statuses.filter(s => {
    if (tableFilter && s.content_table !== tableFilter) return false;
    if (statusFilter && s.verification_status !== statusFilter) return false;
    if (overdueOnly && s.verification_status !== 'overdue') return false;
    return true;
  });

  // Filtered logs
  const filteredLogs = logs.filter(l => {
    if (logVerifier && !l.verified_by_name?.toLowerCase().includes(logVerifier.toLowerCase())) return false;
    if (logResult && l.gate_result !== logResult) return false;
    if (tableFilter && l.content_table !== tableFilter) return false;
    return true;
  });

  // CSV export
  const exportCsv = () => {
    const headers = ['Timestamp', 'Content Table', 'Content ID', 'Content Title', 'Content Type', 'Gate Key', 'Gate Label', 'Result', 'Verifier', 'Method', 'Sources', 'Notes', 'Corrected'];
    const rows = filteredLogs.map(l => [
      l.created_at,
      l.content_table,
      l.content_id,
      l.content_title || '',
      l.content_type || '',
      l.gate_key,
      l.gate_label,
      l.gate_result,
      l.verified_by_name || '',
      l.verification_method,
      (l.source_urls || []).map(s => s.url).join('; '),
      (l.reviewer_notes || '').replace(/"/g, '""'),
      l.content_was_corrected ? 'Yes' : 'No',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidly-verification-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Source health — unique URLs from logs
  const allSourceUrls = new Map<string, { url: string; lastVerified: string; usageCount: number }>();
  logs.forEach(l => {
    (l.source_urls || []).forEach((s: { url: string }) => {
      if (!s.url) return;
      const existing = allSourceUrls.get(s.url);
      if (existing) {
        existing.usageCount++;
        if (l.created_at > existing.lastVerified) existing.lastVerified = l.created_at;
      } else {
        allSourceUrls.set(s.url, { url: s.url, lastVerified: l.created_at, usageCount: 1 });
      }
    });
  });
  const sourceHealthRows = Array.from(allSourceUrls.values()).sort((a, b) => b.usageCount - a.usageCount);

  const sectionTabs: { key: Section; label: string }[] = [
    { key: 'coverage', label: 'Coverage' },
    { key: 'content', label: 'Content' },
    { key: 'log', label: 'Audit Log' },
    { key: 'sources', label: 'Source Health' },
  ];

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Verification Report' }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Verification Report</h1>
        <p className="text-[13px] text-[#6B7F96] mt-1">
          Platform-wide verification coverage, audit trail, and source health.
        </p>
      </div>

      {/* Tables-not-initialized guard */}
      {!tablesExist && (
        <div className="text-center py-[60px] px-5 bg-[#FAF7F2] border-2 border-dashed border-[#E2D9C8] rounded-xl">
          <div className="text-[40px] mb-4">{'🔒'}</div>
          <div className="text-base font-bold text-navy mb-2">Verification system tables not yet initialized</div>
          <div className="text-[13px] text-[#6B7F96] max-w-[480px] mx-auto leading-relaxed">
            Run the verification schema migration (<code>20260507100000_platform_verification_architecture.sql</code>) to enable this feature.
          </div>
        </div>
      )}

      {tablesExist && <>
      {/* Section tabs */}
      <div className="flex gap-1.5 border-b border-[#E5E0D8] pb-0">
        {sectionTabs.map(t => (
          <button key={t.key} onClick={() => setActiveSection(t.key)}
            className={`px-[18px] py-2 text-xs font-semibold cursor-pointer bg-transparent border-none ${
              activeSection === t.key
                ? 'text-navy border-b-2 border-gold'
                : 'text-gray-400 border-b-2 border-transparent'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={60} />)}
        </div>
      ) : (
        <>
          {/* -- SECTION 1: COVERAGE KPIs -- */}
          {activeSection === 'coverage' && (
            <div className="space-y-6">
              {/* Top KPIs */}
              <div className="grid grid-cols-8 gap-3 items-stretch">
                {[
                  { label: 'Total Records', value: total, color: 'text-navy' },
                  { label: 'Verified', value: verified, color: 'text-[#166534]' },
                  { label: 'In Review', value: inReview, color: 'text-[#C2410C]' },
                  { label: 'Unverified', value: unverified, color: 'text-navy' },
                  { label: 'Rejected', value: rejected, color: 'text-[#991B1B]' },
                  { label: 'Overdue', value: overdue, color: 'text-[#991B1B]' },
                  { label: 'Needs Update', value: needsUpdate, color: 'text-[#C2410C]' },
                  { label: 'Coverage %', value: `${coveragePct}%`, color: coveragePct === 0 ? 'text-[#991B1B]' : coveragePct === 100 ? 'text-[#166534]' : 'text-[#C2410C]' },
                ].map(k => (
                  <div key={k.label} className="bg-white border border-gray-200 rounded-lg px-5 py-4 text-center flex flex-col items-center justify-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                      {k.label}
                    </div>
                    <div className={`text-[28px] font-extrabold leading-none ${k.color}`}>{k.value}</div>
                  </div>
                ))}
              </div>

              {/* Per-table breakdown */}
              <div className="bg-white border border-[#E5E0D8] rounded-[10px] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E5E0D8]">
                  <div className="text-sm font-bold text-navy">Coverage by Content Table</div>
                </div>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E0D8]">
                      {['Table', 'Total', 'Verified', 'Coverage'].map(h => (
                        <th key={h} className="text-left px-[14px] py-2 text-[#6B7F96] font-semibold text-[10px] uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {perTable.map(t => (
                      <tr key={t.table} className="border-b border-gray-100">
                        <td className="px-[14px] py-2 font-semibold text-navy">{t.label}</td>
                        <td className="px-[14px] py-2 text-[#6B7F96]">{t.total}</td>
                        <td className="px-[14px] py-2 text-[#059669] font-semibold">{t.verified}</td>
                        <td className="px-[14px] py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-[60px] h-1.5 bg-gray-200 rounded-sm">
                              <div className="h-full rounded-sm" style={{
                                width: `${t.pct}%`,
                                background: t.pct >= 80 ? '#059669' : t.pct >= 50 ? '#D97706' : '#DC2626',
                              }} />
                            </div>
                            <span className="text-[11px] text-[#6B7F96] font-semibold">{t.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* -- SECTION 2: CONTENT VERIFICATION TABLE -- */}
          {activeSection === 'content' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-2.5 flex-wrap">
                <select value={tableFilter} onChange={e => setTableFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer">
                  <option value="">All Tables</option>
                  {tables.map(t => <option key={t} value={t}>{TABLE_LABELS[t] || t}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer">
                  <option value="">All Statuses</option>
                  {['verified', 'in_review', 'unverified', 'rejected', 'needs_update', 'overdue'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-[#6B7F96] cursor-pointer">
                  <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} />
                  Overdue only
                </label>
              </div>

              <div className="bg-white border border-[#E5E0D8] rounded-[10px] overflow-hidden">
                {filteredStatuses.length === 0 ? (
                  <div className="text-center py-12 px-5 text-gray-400 text-[13px]">
                    No records match the current filters.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E0D8]">
                        {['Type', 'Title', 'Status', 'Gates', 'Last Verified', 'Verifier', 'Next Review', 'Sources'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-[#6B7F96] font-semibold text-[10px] uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStatuses.slice(0, 100).map(row => {
                        const sc = STATUS_COLORS[row.verification_status] || STATUS_COLORS.unverified;
                        const isExpanded = expandedRow?.id === row.id;
                        return (
                          <tr key={row.id}
                            className={`border-b border-gray-100 cursor-pointer ${isExpanded ? 'bg-[#FAFAF8]' : 'bg-transparent'}`}
                            onClick={() => setExpandedRow(isExpanded ? null : row)}>
                            <td className="px-3 py-2">
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-lg bg-gray-100 text-[#6B7F96]">
                                {TABLE_LABELS[row.content_table] || row.content_table}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-semibold text-navy max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                              {row.content_title || row.content_id.slice(0, 8)}
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-[10px]" style={{ background: sc.bg, color: sc.text }}>
                                {row.verification_status.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[#6B7F96] text-[11px]">
                              {row.gates_passed}/{row.gates_required}
                            </td>
                            <td className="px-3 py-2 text-gray-400 text-[11px]">
                              {row.last_verified_at ? new Date(row.last_verified_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-3 py-2 text-[#6B7F96] text-[11px]">
                              {row.last_verified_by || '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-400 text-[11px]">
                              {row.next_review_due ? new Date(row.next_review_due).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-3 py-2 text-[#6B7F96] text-[11px]">
                              {row.source_count}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Expanded panel */}
              {expandedRow && (
                <div className="mt-3">
                  <VerificationPanel
                    contentTable={expandedRow.content_table}
                    contentId={expandedRow.content_id}
                    contentType={expandedRow.content_type || ''}
                    contentTitle={expandedRow.content_title || ''}
                    onVerificationChange={load}
                  />
                </div>
              )}
            </div>
          )}

          {/* -- SECTION 3: VERIFICATION AUDIT LOG -- */}
          {activeSection === 'log' && (
            <div className="space-y-4">
              {/* Filters + Export */}
              <div className="flex gap-2.5 flex-wrap items-center">
                <input placeholder="Filter by verifier..." value={logVerifier}
                  onChange={e => setLogVerifier(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs min-w-[160px]" />
                <select value={logResult} onChange={e => setLogResult(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer">
                  <option value="">All Results</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="needs_update">Needs Update</option>
                </select>
                <select value={tableFilter} onChange={e => setTableFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer">
                  <option value="">All Tables</option>
                  {tables.map(t => <option key={t} value={t}>{TABLE_LABELS[t] || t}</option>)}
                </select>
                <button onClick={exportCsv}
                  className="px-4 py-1.5 rounded-md text-[11px] font-bold cursor-pointer bg-gold text-white border-none ml-auto">
                  Export CSV
                </button>
              </div>

              <div className="bg-white border border-[#E5E0D8] rounded-[10px] overflow-hidden">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-12 px-5 text-gray-400 text-[13px]">
                    No audit log entries match the current filters.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E0D8]">
                        {['Timestamp', 'Content', 'Gate', 'Result', 'Verifier', 'Method', 'Sources', 'Notes', 'Changed'].map(h => (
                          <th key={h} className="text-left px-2.5 py-2 text-[#6B7F96] font-semibold text-[10px] uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.slice(0, 100).map(l => {
                        const rc = STATUS_COLORS[l.gate_result === 'passed' ? 'verified' : l.gate_result === 'failed' ? 'rejected' : 'needs_update'] || STATUS_COLORS.unverified;
                        return (
                          <tr key={l.id} className="border-b border-gray-100">
                            <td className="px-2.5 py-1.5 text-gray-400 text-[10px] whitespace-nowrap">
                              {new Date(l.created_at).toLocaleString()}
                            </td>
                            <td className="px-2.5 py-1.5 text-navy text-[11px] max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                              {l.content_title || l.content_id.slice(0, 8)}
                            </td>
                            <td className="px-2.5 py-1.5 text-[#6B7F96] text-[10px]">{l.gate_label}</td>
                            <td className="px-2.5 py-1.5">
                              <span className="text-[9px] font-bold px-1.5 py-[1px] rounded-lg" style={{ background: rc.bg, color: rc.text }}>
                                {l.gate_result.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-2.5 py-1.5 text-[#6B7F96] text-[10px]">{l.verified_by_name || '—'}</td>
                            <td className="px-2.5 py-1.5 text-gray-400 text-[10px]">{l.verification_method?.replace(/_/g, ' ')}</td>
                            <td className="px-2.5 py-1.5 text-gray-400 text-[10px] max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">
                              {(l.source_urls || []).map((s: { url: string }) => s.url).join(', ') || '—'}
                            </td>
                            <td className="px-2.5 py-1.5 text-[#6B7F96] text-[10px] max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                              {l.reviewer_notes || '—'}
                            </td>
                            <td className={`px-2.5 py-1.5 text-[10px] ${l.content_was_corrected ? 'text-[#D97706] font-semibold' : 'text-gray-400 font-normal'}`}>
                              {l.content_was_corrected ? 'Yes' : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* -- SECTION 4: SOURCE HEALTH -- */}
          {activeSection === 'sources' && (
            <div>
              <div className="bg-white border border-[#E5E0D8] rounded-[10px] overflow-hidden">
                {sourceHealthRows.length === 0 ? (
                  <div className="text-center py-12 px-5 text-gray-400 text-[13px]">
                    No source URLs have been logged yet. Source health data will appear after verification activity.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E0D8]">
                        {['URL', 'Last Verified', 'Times Used'].map(h => (
                          <th key={h} className="text-left px-[14px] py-2 text-[#6B7F96] font-semibold text-[10px] uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sourceHealthRows.slice(0, 50).map(s => (
                        <tr key={s.url} className="border-b border-gray-100">
                          <td className="px-[14px] py-2">
                            <a href={s.url} target="_blank" rel="noopener noreferrer"
                              className="text-[#2563EB] text-[11px] underline break-all">
                              {s.url.length > 80 ? s.url.slice(0, 80) + '...' : s.url}
                            </a>
                          </td>
                          <td className="px-[14px] py-2 text-gray-400 text-[11px]">
                            {new Date(s.lastVerified).toLocaleDateString()}
                          </td>
                          <td className="px-[14px] py-2 text-[#6B7F96] text-[11px] font-semibold">
                            {s.usageCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}
      </>}
    </div>
  );
}
