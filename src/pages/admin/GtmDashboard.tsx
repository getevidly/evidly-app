import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { StatCardRow } from '../../components/admin/StatCardRow';

const NAVY = '#1E2D4D';

interface ChannelRow {
  channel: string;
  leads: number;
  demos: number;
  conversions: number;
}

const EMPTY_CHANNELS: ChannelRow[] = [
  { channel: 'Kitchen Checkup', leads: 0, demos: 0, conversions: 0 },
  { channel: 'Inbound (Website)', leads: 0, demos: 0, conversions: 0 },
  { channel: 'Outbound (Sales)', leads: 0, demos: 0, conversions: 0 },
  { channel: 'Referral (K2C)', leads: 0, demos: 0, conversions: 0 },
  { channel: 'RFP Intelligence', leads: 0, demos: 0, conversions: 0 },
];

const SOURCE_CHANNEL: Record<string, string> = {
  checkup: 'Kitchen Checkup',
  kitchen_checkup: 'Kitchen Checkup',
  website: 'Inbound (Website)',
  inbound: 'Inbound (Website)',
  outbound: 'Outbound (Sales)',
  sales: 'Outbound (Sales)',
  referral: 'Referral (K2C)',
  k2c: 'Referral (K2C)',
  rfp: 'RFP Intelligence',
  rfp_intelligence: 'RFP Intelligence',
};

export default function GtmDashboard() {
  useDemoGuard();
  const { isDemoMode } = useDemo();

  const [activeDemos, setActiveDemos] = useState<number>(0);
  const [pipelineValue, setPipelineValue] = useState<number>(0);
  const [leadsThisMonth, setLeadsThisMonth] = useState<number>(0);
  const [conversionRate, setConversionRate] = useState<number>(0);
  const [channels, setChannels] = useState<ChannelRow[]>(EMPTY_CHANNELS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      if (isDemoMode) {
        if (!cancelled) {
          setActiveDemos(0);
          setPipelineValue(0);
          setLeadsThisMonth(0);
          setConversionRate(0);
          setChannels(EMPTY_CHANNELS);
          setLoading(false);
        }
        return;
      }

      try {
        const { count: demoCount } = await supabase
          .from('demo_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        const { data: deals } = await supabase
          .from('sales_pipeline_deals')
          .select('amount')
          .in('stage', ['discovery', 'proposal', 'negotiation', 'demo']);
        const totalPipeline = (deals || []).reduce((sum, d) => sum + (d.amount || 0), 0);

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const { count: leadCount } = await supabase
          .from('assessment_leads')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthStart.toISOString());

        const { count: completedDemos } = await supabase
          .from('demo_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');
        const { count: wonDeals } = await supabase
          .from('sales_pipeline_deals')
          .select('*', { count: 'exact', head: true })
          .eq('stage', 'won');
        const demoTotal = completedDemos ?? 0;
        const wonTotal = wonDeals ?? 0;

        const { data: leadRows } = await supabase
          .from('assessment_leads')
          .select('source');
        const channelMap: Record<string, { leads: number; demos: number; conversions: number }> = {
          'Kitchen Checkup': { leads: 0, demos: 0, conversions: 0 },
          'Inbound (Website)': { leads: 0, demos: 0, conversions: 0 },
          'Outbound (Sales)': { leads: 0, demos: 0, conversions: 0 },
          'Referral (K2C)': { leads: 0, demos: 0, conversions: 0 },
          'RFP Intelligence': { leads: 0, demos: 0, conversions: 0 },
        };
        for (const row of leadRows || []) {
          const ch = SOURCE_CHANNEL[(row.source || '').toLowerCase()] || 'Inbound (Website)';
          if (channelMap[ch]) channelMap[ch].leads++;
        }

        if (!cancelled) {
          setActiveDemos(demoCount ?? 0);
          setPipelineValue(totalPipeline);
          setLeadsThisMonth(leadCount ?? 0);
          setConversionRate(demoTotal > 0 ? Math.round((wonTotal / demoTotal) * 100) : 0);
          setChannels(Object.entries(channelMap).map(([channel, data]) => ({ channel, ...data })));
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load data');
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [isDemoMode]);

  const fmt = (n: number | null) => n === null ? '—' : String(n);
  const fmtDollar = (n: number | null) => {
    if (n === null) return '—';
    if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    return `$${n.toLocaleString()}`;
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">Failed to load data</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-[#1E2D4D] text-white rounded text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <AdminBreadcrumb crumbs={[{ label: 'GTM Dashboard' }]} />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E2D4D', margin: 0, fontFamily: 'Outfit, sans-serif' }}>GTM Dashboard</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0 0', fontFamily: 'Inter, sans-serif' }}>Go-to-market metrics — pipeline velocity, conversion rates, channel performance.</p>
      </div>

      {/* Metric cards */}
      <div style={{ marginBottom: 32 }}>
        <StatCardRow cards={[
          { label: 'ACTIVE DEMOS', value: loading ? '…' : fmt(activeDemos) },
          { label: 'PIPELINE VALUE', value: loading ? '…' : fmtDollar(pipelineValue), valueColor: 'gold' },
          { label: 'LEADS THIS MONTH', value: loading ? '…' : fmt(leadsThisMonth) },
          { label: 'CONVERSION RATE', value: loading ? '…' : `${fmt(conversionRate)}%` },
        ]} />
      </div>

      {/* Channel performance table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Channel Performance</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Channel</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Leads</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Demos</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversions</th>
            </tr>
          </thead>
          <tbody>
            {channels.map(row => (
              <tr key={row.channel} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3 font-medium" style={{ color: NAVY }}>{row.channel}</td>
                <td className="px-5 py-3 text-right text-gray-500">{row.leads}</td>
                <td className="px-5 py-3 text-right text-gray-500">{row.demos}</td>
                <td className="px-5 py-3 text-right text-gray-500">{row.conversions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status banner */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
        <p className="text-sm font-medium text-gray-500">Metrics populate automatically as demos are launched and prospects convert.</p>
        <p className="text-xs text-gray-400 mt-1">Connect data sources in Settings to enable live tracking.</p>
      </div>
    </div>
  );
}
