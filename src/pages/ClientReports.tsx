/**
 * ClientReports — Tenant-facing report library
 *
 * Route: /insights/reports
 * Access: owner_operator, executive, compliance_manager, platform_admin
 *
 * 6 report types: Compliance Summary, Executive Brief, Insurance,
 * Vendor Performance, Regulatory Update, Training
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#D1D9E6';

interface ClientReport {
  id: string;
  report_type: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  share_token: string | null;
  created_at: string;
}

const REPORT_CARDS = [
  {
    type: 'client_compliance',
    title: 'Compliance Summary',
    description: 'Overall compliance scores, inspection readiness, corrective action status, and location comparison.',
    icon: '📊',
    color: '#059669',
  },
  {
    type: 'client_executive',
    title: 'Executive Brief',
    description: 'High-level overview for executives — key metrics, risk flags, and strategic recommendations.',
    icon: '📋',
    color: '#2563EB',
  },
  {
    type: 'client_insurance',
    title: 'Insurance Report',
    description: 'Risk scores, protective safeguard compliance, carrier-ready documentation, and premium impact.',
    icon: '🛡️',
    color: '#7C3AED',
  },
  {
    type: 'client_vendor',
    title: 'Vendor Performance',
    description: 'Vendor service history, response times, SLA compliance, and cost analysis.',
    icon: '🤝',
    color: '#D97706',
  },
  {
    type: 'client_regulatory',
    title: 'Regulatory Update',
    description: 'Recent jurisdiction changes, new requirements, and upcoming compliance deadlines.',
    icon: '⚖️',
    color: '#DC2626',
  },
  {
    type: 'client_training',
    title: 'Training Report',
    description: 'Employee certification status, training completion rates, and compliance gap analysis.',
    icon: '🎓',
    color: '#0891B2',
  },
];

// Demo reports for demo mode
const DEMO_REPORTS: ClientReport[] = [
  {
    id: 'demo-cr-1',
    report_type: 'client_compliance',
    title: 'Compliance Summary — March 2026',
    period_start: '2026-03-01',
    period_end: '2026-03-31',
    status: 'ready',
    share_token: null,
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'demo-cr-2',
    report_type: 'client_executive',
    title: 'Executive Brief — Q1 2026',
    period_start: '2026-01-01',
    period_end: '2026-03-31',
    status: 'ready',
    share_token: null,
    created_at: '2026-02-28T14:00:00Z',
  },
  {
    id: 'demo-cr-3',
    report_type: 'client_insurance',
    title: 'Insurance Report — Feb 2026',
    period_start: '2026-02-01',
    period_end: '2026-02-28',
    status: 'published',
    share_token: 'demo12345678',
    created_at: '2026-02-15T09:00:00Z',
  },
];

export function ClientReports() {
  useDemoGuard();
  const { isDemoMode } = useDemo();
  const [reports, setReports] = useState<ClientReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    if (isDemoMode) {
      setReports(DEMO_REPORTS);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('internal_reports')
      .select('id, report_type, title, period_start, period_end, status, share_token, created_at')
      .in('report_type', REPORT_CARDS.map(c => c.type))
      .in('status', ['ready', 'published'])
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setReports(data);
    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const filteredReports = selectedType
    ? reports.filter(r => r.report_type === selectedType)
    : reports;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Reports</h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_SEC }}>
          Compliance, insurance, and operational reports generated for your organization.
        </p>
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {REPORT_CARDS.map(card => {
          const count = reports.filter(r => r.report_type === card.type).length;
          const isSelected = selectedType === card.type;
          return (
            <button
              key={card.type}
              onClick={() => setSelectedType(isSelected ? '' : card.type)}
              className="text-left p-4 rounded-xl border bg-white transition-all"
              style={{
                borderColor: isSelected ? card.color : BORDER,
                boxShadow: isSelected ? `0 0 0 1px ${card.color}` : undefined,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{card.icon}</span>
                <span className="text-[13px] font-bold" style={{ color: NAVY }}>{card.title}</span>
              </div>
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: TEXT_SEC, lineHeight: 1.5 }}>
                {card.description}
              </p>
              <span className="text-[11px] font-semibold" style={{ color: count > 0 ? card.color : TEXT_MUTED }}>
                {count} report{count !== 1 ? 's' : ''} available
              </span>
            </button>
          );
        })}
      </div>

      {/* Reports list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold" style={{ color: NAVY }}>
            {selectedType
              ? `${REPORT_CARDS.find(c => c.type === selectedType)?.title || 'Reports'}`
              : 'All Reports'}
            <span className="font-normal ml-2" style={{ color: TEXT_MUTED }}>({filteredReports.length})</span>
          </div>
          {selectedType && (
            <button
              onClick={() => setSelectedType('')}
              className="text-xs font-medium underline"
              style={{ color: TEXT_SEC }}
            >
              Show all
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl border bg-white animate-pulse" style={{ borderColor: BORDER }} />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border" style={{ borderColor: BORDER }}>
            <div className="text-4xl mb-3">{'📋'}</div>
            <div className="text-sm font-semibold" style={{ color: NAVY }}>No reports available yet</div>
            <div className="text-xs mt-1" style={{ color: TEXT_SEC }}>
              Reports will appear here once generated by your EvidLY team.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map(report => {
              const card = REPORT_CARDS.find(c => c.type === report.report_type);
              return (
                <div
                  key={report.id}
                  className="flex items-center gap-4 p-4 rounded-xl border bg-white"
                  style={{ borderColor: BORDER }}
                >
                  <span className="text-xl">{card?.icon || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold" style={{ color: NAVY }}>{report.title}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: TEXT_MUTED }}>
                      {report.period_start && report.period_end
                        ? `${new Date(report.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(report.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: report.status === 'published' ? '#EFF6FF' : '#ECFDF5',
                        color: report.status === 'published' ? '#2563EB' : '#059669',
                      }}
                    >
                      {report.status === 'published' ? 'Published' : 'Ready'}
                    </span>
                    <button
                      onClick={() => {
                        if (report.share_token) {
                          window.open(`/shared/report/${report.share_token}`, '_blank');
                        }
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: NAVY, color: '#fff' }}
                    >
                      View Report
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
