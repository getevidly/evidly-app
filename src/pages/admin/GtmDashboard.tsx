import { BarChart3, TrendingUp, Users, Target, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

const METRIC_CARDS = [
  { label: 'Active Demos', value: '—', sub: 'Launch demos from Demo Launcher', icon: Target, route: '/admin/demo-launcher' },
  { label: 'Pipeline Value', value: '—', sub: 'Track in Sales Pipeline', icon: TrendingUp, route: '/admin/sales' },
  { label: 'Leads This Month', value: '—', sub: 'View in Leads', icon: Users, route: '/admin/leads' },
  { label: 'Conversion Rate', value: '—', sub: 'Demos → Paid accounts', icon: BarChart3, route: '/admin/demos' },
];

const CHANNEL_ROWS = [
  { channel: 'Kitchen Checkup', leads: '—', demos: '—', conversions: '—' },
  { channel: 'Inbound (Website)', leads: '—', demos: '—', conversions: '—' },
  { channel: 'Outbound (Sales)', leads: '—', demos: '—', conversions: '—' },
  { channel: 'Referral (K2C)', leads: '—', demos: '—', conversions: '—' },
  { channel: 'RFP Intelligence', leads: '—', demos: '—', conversions: '—' },
];

export default function GtmDashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-5xl" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <AdminBreadcrumb crumbs={[{ label: 'GTM Dashboard' }]} />

      <h1 className="text-2xl font-bold mb-1 mt-4" style={{ color: NAVY }}>GTM Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">
        Go-to-market metrics — pipeline velocity, conversion rates, channel performance.
      </p>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {METRIC_CARDS.map(card => (
          <button key={card.label} type="button" onClick={() => navigate(card.route)} className="text-left">
            <KpiTile label={card.label} value={card.value} sub={card.sub} />
          </button>
        ))}
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
            {CHANNEL_ROWS.map(row => (
              <tr key={row.channel} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3 font-medium" style={{ color: NAVY }}>{row.channel}</td>
                <td className="px-5 py-3 text-right text-gray-400">{row.leads}</td>
                <td className="px-5 py-3 text-right text-gray-400">{row.demos}</td>
                <td className="px-5 py-3 text-right text-gray-400">{row.conversions}</td>
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
