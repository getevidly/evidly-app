/**
 * AdminReports — Internal Reporting System
 *
 * Route: /admin/reports
 * Access: platform_admin only (AdminShell)
 *
 * 4 tabs: Internal, Client, Partner, Investor
 * Generate, manage, and share reports with secure token links.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { KpiTile } from '../../components/admin/KpiTile';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E5E0D8';

type Tab = 'internal' | 'client' | 'partner' | 'investor';

interface Report {
  id: string;
  report_type: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  org_id: string | null;
  generated_by: string | null;
  status: string;
  share_token: string | null;
  share_expires: string | null;
  created_at: string;
}

const REPORT_TYPES: Record<Tab, { key: string; label: string; description: string }[]> = {
  internal: [
    { key: 'internal_weekly', label: 'Weekly Operations', description: 'Platform health, crawl status, signal digest, and action items for the week.' },
    { key: 'internal_monthly', label: 'Monthly Review', description: 'MRR, client growth, feature adoption, and intelligence insights for the month.' },
    { key: 'internal_quarterly', label: 'Quarterly Business Review', description: 'Full business review — revenue, growth metrics, product roadmap progress.' },
  ],
  client: [
    { key: 'client_compliance', label: 'Compliance Summary', description: 'Overall compliance scores, inspection readiness, and action items by location.' },
    { key: 'client_executive', label: 'Executive Brief', description: 'High-level compliance overview for executive stakeholders.' },
    { key: 'client_insurance', label: 'Insurance Report', description: 'Risk scores, protective safeguard compliance, and premium impact analysis.' },
    { key: 'client_vendor', label: 'Vendor Performance', description: 'Vendor service history, response times, and compliance impact.' },
    { key: 'client_regulatory', label: 'Regulatory Update', description: 'Jurisdiction changes, new requirements, and compliance deadline reminders.' },
    { key: 'client_training', label: 'Training Report', description: 'Employee certification status, training completion, and compliance gaps.' },
  ],
  partner: [
    { key: 'partner_portfolio', label: 'Portfolio Overview', description: 'All clients under management with compliance status and risk flags.' },
    { key: 'partner_risk', label: 'Risk Assessment', description: 'Aggregated risk analysis across the partner portfolio.' },
    { key: 'partner_performance', label: 'Performance Metrics', description: 'Key performance indicators for the partner program.' },
  ],
  investor: [
    { key: 'investor_mrr', label: 'MRR Report', description: 'Monthly recurring revenue breakdown, churn, and expansion metrics.' },
    { key: 'investor_growth', label: 'Growth Metrics', description: 'User growth, client acquisition, market expansion, and cohort analysis.' },
    { key: 'investor_product', label: 'Product Update', description: 'Feature launches, roadmap progress, and technical infrastructure status.' },
  ],
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:      { bg: '#F9FAFB', text: '#6B7280' },
  generating: { bg: '#FFFBEB', text: '#D97706' },
  ready:      { bg: '#ECFDF5', text: '#059669' },
  published:  { bg: '#EFF6FF', text: '#2563EB' },
  archived:   { bg: '#F3F4F6', text: '#9CA3AF' },
};

const inputStyle: React.CSSProperties = {
  padding: '6px 12px', background: '#F9FAFB', border: '1px solid #D1D5DB',
  borderRadius: 6, color: NAVY, fontSize: 12,
};

export default function AdminReports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('internal');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('internal_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setReports(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const tabReports = reports.filter(r => {
    const types = REPORT_TYPES[activeTab].map(t => t.key);
    return types.includes(r.report_type);
  });

  const generateReport = async (reportType: string) => {
    setGenerating(reportType);
    const title = REPORT_TYPES[activeTab].find(t => t.key === reportType)?.label || reportType;
    const now = new Date();
    const periodEnd = now.toISOString().split('T')[0];
    const periodStart = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];

    await supabase.from('internal_reports').insert({
      report_type: reportType,
      title: `${title} — ${now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
      period_start: periodStart,
      period_end: periodEnd,
      generated_by: user?.email,
      status: 'ready',
      content_json: { generated: true, demo: true },
    });
    await loadReports();
    setGenerating(null);
    alert(`[Demo] ${title} report generated. In production, this triggers the generate-report edge function.`);
  };

  const createShareLink = async (reportId: string) => {
    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const expires = new Date(Date.now() + 7 * 86400000).toISOString();
    await supabase.from('internal_reports')
      .update({ share_token: token, share_expires: expires, status: 'published' })
      .eq('id', reportId);
    await loadReports();
    const shareUrl = `${window.location.origin}/report/${token}`;
    alert(`Share link created (expires in 7 days):\n${shareUrl}`);
  };

  const archiveReport = async (reportId: string) => {
    await supabase.from('internal_reports')
      .update({ status: 'archived' })
      .eq('id', reportId);
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'archived' } : r));
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '10px 14px', color: TEXT_SEC,
    fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
  };
  const tdStyle: React.CSSProperties = { padding: '10px 14px', fontSize: 12 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Reports</h1>
          <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>
            Generate and share internal, client, partner, and investor reports.
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile label="Total Reports" value={loading ? '—' : reports.length} />
        <KpiTile label="Published" value={loading ? '—' : reports.filter(r => r.status === 'published').length} valueColor="blue" />
        <KpiTile label="Shared Links" value={loading ? '—' : reports.filter(r => r.share_token).length} valueColor="gold" />
        <KpiTile label="This Month" value={loading ? '—' : reports.filter(r => {
          const d = new Date(r.created_at);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length} valueColor="green" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${BORDER}` }}>
        {([
          { key: 'internal' as Tab, label: 'Internal' },
          { key: 'client' as Tab, label: 'Client Reports' },
          { key: 'partner' as Tab, label: 'Partner Reports' },
          { key: 'investor' as Tab, label: 'Investor Reports' },
        ]).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '10px 20px', fontSize: 13, cursor: 'pointer', background: 'none', border: 'none',
            color: activeTab === t.key ? GOLD : TEXT_MUTED,
            borderBottom: `2px solid ${activeTab === t.key ? GOLD : 'transparent'}`,
            marginBottom: -2, fontWeight: activeTab === t.key ? 600 : 400, transition: 'all 0.12s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Report type cards (generate) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {REPORT_TYPES[activeTab].map(rt => (
          <div key={rt.key} style={{
            background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10,
            padding: '16px 18px', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>{rt.label}</div>
            <div style={{ fontSize: 11, color: TEXT_SEC, lineHeight: 1.6, flex: 1, marginBottom: 12 }}>{rt.description}</div>
            <button
              onClick={() => generateReport(rt.key)}
              disabled={generating === rt.key}
              style={{
                padding: '6px 14px', background: generating === rt.key ? '#E5E7EB' : NAVY,
                border: 'none', borderRadius: 6, color: '#fff', fontSize: 11,
                fontWeight: 700, cursor: generating === rt.key ? 'not-allowed' : 'pointer',
              }}
            >
              {generating === rt.key ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        ))}
      </div>

      {/* Generated reports table */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 12 }}>
          Generated Reports
          <span style={{ fontWeight: 400, color: TEXT_MUTED, marginLeft: 8 }}>({tabReports.length})</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 40, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : tabReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FAFAF8', border: '1.5px dashed #E5E0D8', borderRadius: 10 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{'\uD83D\uDCCB'}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>No reports generated yet</div>
            <div style={{ fontSize: 12, color: TEXT_SEC, marginTop: 4 }}>Use the cards above to generate your first report.</div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Report', 'Period', 'Generated By', 'Status', 'Shared', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabReports.map(r => {
                  const sc = STATUS_COLORS[r.status] || STATUS_COLORS.draft;
                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...tdStyle, fontWeight: 500, color: NAVY }}>{r.title}</td>
                      <td style={{ ...tdStyle, fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT_SEC }}>
                        {r.period_start && r.period_end
                          ? `${new Date(r.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} \u2013 ${new Date(r.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : '\u2014'}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 11, color: TEXT_SEC }}>{r.generated_by || '\u2014'}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.text }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: 11 }}>
                        {r.share_token
                          ? <span style={{ color: '#059669' }}>{'\u2713'} Shared</span>
                          : <span style={{ color: TEXT_MUTED }}>\u2014</span>}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {!r.share_token && r.status !== 'archived' && (
                            <button onClick={() => createShareLink(r.id)}
                              style={{
                                fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
                                background: 'none', border: `1px solid ${GOLD}`, color: GOLD, cursor: 'pointer',
                              }}>
                              Share
                            </button>
                          )}
                          {r.status !== 'archived' && (
                            <button onClick={() => archiveReport(r.id)}
                              style={{
                                fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
                                background: 'none', border: `1px solid ${BORDER}`, color: TEXT_MUTED, cursor: 'pointer',
                              }}>
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
