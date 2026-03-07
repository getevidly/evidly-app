/**
 * VerificationReport — Platform-wide verification coverage, audit log, and source health.
 * Route: /admin/verification
 * Access: platform_admin only
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import VerificationPanel from '../../components/admin/VerificationPanel';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E5E0D8';

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
  <div style={{ width: w, height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

export default function VerificationReport() {
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>('coverage');

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
    if (statusRes.data) setStatuses(statusRes.data);
    if (logRes.data) setLogs(logRes.data);
    setLoading(false);
  }, []);

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

  const inputStyle: React.CSSProperties = {
    padding: '6px 12px', background: '#F9FAFB', border: `1px solid #D1D5DB`, borderRadius: 6, color: NAVY, fontSize: 12,
  };

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
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Verification Report</h1>
        <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
          Platform-wide verification coverage, audit trail, and source health.
        </p>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${BORDER}`, paddingBottom: 0 }}>
        {sectionTabs.map(t => (
          <button key={t.key} onClick={() => setActiveSection(t.key)}
            style={{
              padding: '8px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', border: 'none',
              color: activeSection === t.key ? NAVY : TEXT_MUTED,
              borderBottom: activeSection === t.key ? `2px solid ${GOLD}` : '2px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={60} />)}
        </div>
      ) : (
        <>
          {/* ── SECTION 1: COVERAGE KPIs ── */}
          {activeSection === 'coverage' && (
            <div className="space-y-6">
              {/* Top KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                {[
                  { label: 'Total Records', value: total, color: NAVY },
                  { label: 'Verified', value: verified, color: '#059669' },
                  { label: 'In Review', value: inReview, color: '#2563EB' },
                  { label: 'Unverified', value: unverified, color: '#9CA3AF' },
                  { label: 'Rejected', value: rejected, color: '#DC2626' },
                  { label: 'Overdue', value: overdue, color: '#DC2626' },
                  { label: 'Needs Update', value: needsUpdate, color: '#D97706' },
                  { label: 'Coverage %', value: `${coveragePct}%`, color: coveragePct >= 80 ? '#059669' : coveragePct >= 50 ? '#D97706' : '#DC2626' },
                ].map(k => (
                  <div key={k.label} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                      {k.label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>

              {/* Per-table breakdown */}
              <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Coverage by Content Table</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {['Table', 'Total', 'Verified', 'Coverage'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: TEXT_SEC, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {perTable.map(t => (
                      <tr key={t.table} style={{ borderBottom: `1px solid #F3F4F6` }}>
                        <td style={{ padding: '8px 14px', fontWeight: 600, color: NAVY }}>{t.label}</td>
                        <td style={{ padding: '8px 14px', color: TEXT_SEC }}>{t.total}</td>
                        <td style={{ padding: '8px 14px', color: '#059669', fontWeight: 600 }}>{t.verified}</td>
                        <td style={{ padding: '8px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 60, height: 6, background: '#E5E7EB', borderRadius: 3 }}>
                              <div style={{
                                height: '100%', borderRadius: 3, width: `${t.pct}%`,
                                background: t.pct >= 80 ? '#059669' : t.pct >= 50 ? '#D97706' : '#DC2626',
                              }} />
                            </div>
                            <span style={{ fontSize: 11, color: TEXT_SEC, fontWeight: 600 }}>{t.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SECTION 2: CONTENT VERIFICATION TABLE ── */}
          {activeSection === 'content' && (
            <div className="space-y-4">
              {/* Filters */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select value={tableFilter} onChange={e => setTableFilter(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">All Tables</option>
                  {tables.map(t => <option key={t} value={t}>{TABLE_LABELS[t] || t}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">All Statuses</option>
                  {['verified', 'in_review', 'unverified', 'rejected', 'needs_update', 'overdue'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT_SEC, cursor: 'pointer' }}>
                  <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} />
                  Overdue only
                </label>
              </div>

              <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                {filteredStatuses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: TEXT_MUTED, fontSize: 13 }}>
                    No records match the current filters.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                        {['Type', 'Title', 'Status', 'Gates', 'Last Verified', 'Verifier', 'Next Review', 'Sources'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: TEXT_SEC, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStatuses.slice(0, 100).map(row => {
                        const sc = STATUS_COLORS[row.verification_status] || STATUS_COLORS.unverified;
                        const isExpanded = expandedRow?.id === row.id;
                        return (
                          <tr key={row.id} style={{ borderBottom: `1px solid #F3F4F6`, cursor: 'pointer', background: isExpanded ? '#FAFAF8' : 'transparent' }}
                            onClick={() => setExpandedRow(isExpanded ? null : row)}>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 8, background: '#F3F4F6', color: TEXT_SEC }}>
                                {TABLE_LABELS[row.content_table] || row.content_table}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: NAVY, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.content_title || row.content_id.slice(0, 8)}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.text }}>
                                {row.verification_status.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', color: TEXT_SEC, fontSize: 11 }}>
                              {row.gates_passed}/{row.gates_required}
                            </td>
                            <td style={{ padding: '8px 12px', color: TEXT_MUTED, fontSize: 11 }}>
                              {row.last_verified_at ? new Date(row.last_verified_at).toLocaleDateString() : '—'}
                            </td>
                            <td style={{ padding: '8px 12px', color: TEXT_SEC, fontSize: 11 }}>
                              {row.last_verified_by || '—'}
                            </td>
                            <td style={{ padding: '8px 12px', color: TEXT_MUTED, fontSize: 11 }}>
                              {row.next_review_due ? new Date(row.next_review_due).toLocaleDateString() : '—'}
                            </td>
                            <td style={{ padding: '8px 12px', color: TEXT_SEC, fontSize: 11 }}>
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
                <div style={{ marginTop: 12 }}>
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

          {/* ── SECTION 3: VERIFICATION AUDIT LOG ── */}
          {activeSection === 'log' && (
            <div className="space-y-4">
              {/* Filters + Export */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input placeholder="Filter by verifier..." value={logVerifier}
                  onChange={e => setLogVerifier(e.target.value)} style={{ ...inputStyle, minWidth: 160 }} />
                <select value={logResult} onChange={e => setLogResult(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">All Results</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="needs_update">Needs Update</option>
                </select>
                <select value={tableFilter} onChange={e => setTableFilter(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">All Tables</option>
                  {tables.map(t => <option key={t} value={t}>{TABLE_LABELS[t] || t}</option>)}
                </select>
                <button onClick={exportCsv}
                  style={{
                    padding: '6px 16px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', background: GOLD, color: '#fff', border: 'none',
                    marginLeft: 'auto',
                  }}>
                  Export CSV
                </button>
              </div>

              <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                {filteredLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: TEXT_MUTED, fontSize: 13 }}>
                    No audit log entries match the current filters.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                        {['Timestamp', 'Content', 'Gate', 'Result', 'Verifier', 'Method', 'Sources', 'Notes', 'Changed'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: TEXT_SEC, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.slice(0, 100).map(l => {
                        const rc = STATUS_COLORS[l.gate_result === 'passed' ? 'verified' : l.gate_result === 'failed' ? 'rejected' : 'needs_update'] || STATUS_COLORS.unverified;
                        return (
                          <tr key={l.id} style={{ borderBottom: `1px solid #F3F4F6` }}>
                            <td style={{ padding: '6px 10px', color: TEXT_MUTED, fontSize: 10, whiteSpace: 'nowrap' }}>
                              {new Date(l.created_at).toLocaleString()}
                            </td>
                            <td style={{ padding: '6px 10px', color: NAVY, fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {l.content_title || l.content_id.slice(0, 8)}
                            </td>
                            <td style={{ padding: '6px 10px', color: TEXT_SEC, fontSize: 10 }}>{l.gate_label}</td>
                            <td style={{ padding: '6px 10px' }}>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: rc.bg, color: rc.text }}>
                                {l.gate_result.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '6px 10px', color: TEXT_SEC, fontSize: 10 }}>{l.verified_by_name || '—'}</td>
                            <td style={{ padding: '6px 10px', color: TEXT_MUTED, fontSize: 10 }}>{l.verification_method?.replace(/_/g, ' ')}</td>
                            <td style={{ padding: '6px 10px', color: TEXT_MUTED, fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {(l.source_urls || []).map((s: { url: string }) => s.url).join(', ') || '—'}
                            </td>
                            <td style={{ padding: '6px 10px', color: TEXT_SEC, fontSize: 10, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {l.reviewer_notes || '—'}
                            </td>
                            <td style={{ padding: '6px 10px', color: l.content_was_corrected ? '#D97706' : TEXT_MUTED, fontSize: 10, fontWeight: l.content_was_corrected ? 600 : 400 }}>
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

          {/* ── SECTION 4: SOURCE HEALTH ── */}
          {activeSection === 'sources' && (
            <div>
              <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                {sourceHealthRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: TEXT_MUTED, fontSize: 13 }}>
                    No source URLs have been logged yet. Source health data will appear after verification activity.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                        {['URL', 'Last Verified', 'Times Used'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: TEXT_SEC, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sourceHealthRows.slice(0, 50).map(s => (
                        <tr key={s.url} style={{ borderBottom: `1px solid #F3F4F6` }}>
                          <td style={{ padding: '8px 14px' }}>
                            <a href={s.url} target="_blank" rel="noopener noreferrer"
                              style={{ color: '#2563EB', fontSize: 11, textDecoration: 'underline', wordBreak: 'break-all' }}>
                              {s.url.length > 80 ? s.url.slice(0, 80) + '...' : s.url}
                            </a>
                          </td>
                          <td style={{ padding: '8px 14px', color: TEXT_MUTED, fontSize: 11 }}>
                            {new Date(s.lastVerified).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '8px 14px', color: TEXT_SEC, fontSize: 11, fontWeight: 600 }}>
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
    </div>
  );
}
