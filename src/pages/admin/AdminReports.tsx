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
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { KpiTile } from '../../components/admin/KpiTile';
import Button from '../../components/ui/Button';

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

export default function AdminReports() {
  useDemoGuard();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('internal');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('internal_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (fetchError) {
      setError(fetchError.message || 'Failed to load data');
    } else if (data) {
      setReports(data);
    }
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
    // Report generated — UI refreshes via loadReports() above
  };

  const createShareLink = async (reportId: string) => {
    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const expires = new Date(Date.now() + 7 * 86400000).toISOString();
    await supabase.from('internal_reports')
      .update({ share_token: token, share_expires: expires, status: 'published' })
      .eq('id', reportId);
    await loadReports();
    const shareUrl = `${window.location.origin}/report/${token}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
  };

  const archiveReport = async (reportId: string) => {
    await supabase.from('internal_reports')
      .update({ status: 'archived' })
      .eq('id', reportId);
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'archived' } : r));
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">Failed to load data</p>
        <Button variant="primary" onClick={() => window.location.reload()} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Reports</h1>
          <p className="mt-1 text-sm text-gray-400">
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
      <div className="flex border-b-2 border-border_ui">
        {([
          { key: 'internal' as Tab, label: 'Internal' },
          { key: 'client' as Tab, label: 'Client Reports' },
          { key: 'partner' as Tab, label: 'Partner Reports' },
          { key: 'investor' as Tab, label: 'Investor Reports' },
        ]).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`py-2.5 px-5 text-[13px] cursor-pointer bg-transparent border-none border-b-2 -mb-[2px] transition-all duration-150 ${
              activeTab === t.key
                ? 'text-gold border-gold font-semibold'
                : 'text-gray-400 border-transparent font-normal'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Report type cards (generate) */}
      <div className="grid grid-cols-3 gap-3">
        {REPORT_TYPES[activeTab].map(rt => (
          <div key={rt.key} className="bg-white border border-border_ui rounded-[10px] py-4 px-[18px] flex flex-col">
            <div className="text-[13px] font-bold text-navy mb-1">{rt.label}</div>
            <div className="text-[11px] text-slate_ui leading-relaxed flex-1 mb-3">{rt.description}</div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => generateReport(rt.key)}
              disabled={generating === rt.key}
              className="text-[11px] font-bold"
            >
              {generating === rt.key ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        ))}
      </div>

      {/* Generated reports table */}
      <div>
        <div className="text-[13px] font-bold text-navy mb-3">
          Generated Reports
          <span className="font-normal text-gray-400 ml-2">({tabReports.length})</span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-md animate-pulse" />
            ))}
          </div>
        ) : tabReports.length === 0 ? (
          <div className="text-center py-10 px-5 bg-[#FAFAF8] border-[1.5px] border-dashed border-border_ui rounded-[10px]">
            <div className="text-[32px] mb-2.5">{'📋'}</div>
            <div className="text-[13px] font-semibold text-navy">No reports generated yet</div>
            <div className="text-xs text-slate_ui mt-1">Use the cards above to generate your first report.</div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border_ui overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border_ui">
                  {['Report', 'Period', 'Generated By', 'Status', 'Shared', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3.5 text-slate_ui font-semibold text-[11px] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabReports.map(r => {
                  const sc = STATUS_COLORS[r.status] || STATUS_COLORS.draft;
                  return (
                    <tr key={r.id} className="border-b border-border_ui transition-colors hover:bg-gray-50">
                      <td className="py-2.5 px-3.5 text-xs font-medium text-navy">{r.title}</td>
                      <td className="py-2.5 px-3.5 text-[11px] font-['DM_Mono',monospace] text-slate_ui">
                        {r.period_start && r.period_end
                          ? `${new Date(r.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(r.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3.5 text-[11px] text-slate_ui">{r.generated_by || '—'}</td>
                      <td className="py-2.5 px-3.5 text-xs">
                        <span className="text-[10px] font-bold py-0.5 px-2 rounded-[10px]" style={{ background: sc.bg, color: sc.text }}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-[11px]">
                        {r.share_token
                          ? <span className="text-emerald-600">{'✓'} Shared</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3.5 text-xs">
                        <div className="flex gap-1.5">
                          {!r.share_token && r.status !== 'archived' && (
                            <Button variant="outline" size="sm" onClick={() => createShareLink(r.id)}
                              className="text-[10px] font-semibold py-[3px] px-2 rounded-[5px]">
                              Share
                            </Button>
                          )}
                          {r.status !== 'archived' && (
                            <Button variant="secondary" size="sm" onClick={() => archiveReport(r.id)}
                              className="text-[10px] font-semibold py-[3px] px-2 rounded-[5px] text-gray-400">
                              Archive
                            </Button>
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
