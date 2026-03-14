/**
 * Service Requests — incoming requests from EvidLY, AI estimates, and other sources.
 * Route: /service-requests
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Clock, TrendingUp, Calendar, Eye, Bot, Globe, Phone, Mail, Users } from 'lucide-react';
import { useServiceRequests, useServiceRequestStats, type ServiceRequest } from '../../hooks/api/useServiceRequests';

const SOURCE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'ai_estimate', label: 'AI Estimate' },
  { key: 'evidly', label: 'EvidLY' },
  { key: 'website', label: 'Website' },
  { key: 'phone', label: 'Phone' },
  { key: 'referral', label: 'Referral' },
];

function SourceBadge({ source }: { source: string }) {
  const styles: Record<string, { bg: string; text: string; icon: typeof Bot }> = {
    ai_estimate: { bg: 'bg-purple-50', text: 'text-purple-700', icon: Bot },
    evidly: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Globe },
    website: { bg: 'bg-green-50', text: 'text-green-700', icon: Globe },
    phone: { bg: 'bg-orange-50', text: 'text-orange-700', icon: Phone },
    email: { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: Mail },
    referral: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Users },
  };
  const s = styles[source] || styles.website;
  const Icon = s.icon;
  const label = source === 'ai_estimate' ? 'AI Estimate' : source.charAt(0).toUpperCase() + source.slice(1);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const styles: Record<string, string> = {
    normal: 'bg-gray-100 text-gray-600',
    soon: 'bg-blue-50 text-blue-700',
    urgent: 'bg-orange-50 text-orange-700',
    emergency: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[urgency] || styles.normal}`}>
      {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700',
    reviewing: 'bg-amber-50 text-amber-700',
    quoted: 'bg-purple-50 text-purple-700',
    scheduled: 'bg-green-50 text-green-700',
    declined: 'bg-red-50 text-red-600',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.new}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function ServiceRequestsPage() {
  const navigate = useNavigate();
  const [activeSource, setActiveSource] = useState('all');
  const { data: stats } = useServiceRequestStats();
  const { data: requests, isLoading } = useServiceRequests(
    activeSource !== 'all' ? { source: activeSource } : undefined
  );

  const statCards = [
    { label: 'New Requests', value: stats?.newRequests ?? 0, icon: Inbox, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Avg Response', value: stats?.avgResponseTimeMinutes ? `${stats.avgResponseTimeMinutes}m` : '—', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Conversion Rate', value: stats ? `${stats.conversionRate}%` : '0%', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'This Week', value: stats?.thisWeek ?? 0, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Incoming requests from EvidLY, AI estimates, and other sources</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Source filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {SOURCE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveSource(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeSource === f.key
                ? 'bg-[#1e4d6b] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b] mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Loading requests...</p>
        </div>
      ) : !requests || requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No pending service requests</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Service requests from EvidLY, AI estimates, and your website will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Received</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Services</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">AI Est.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Urgency</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r: ServiceRequest) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/service-requests/${r.id}`)}>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(r.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3"><SourceBadge source={r.source} /></td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{r.contact_name || r.business_name || '—'}</p>
                      {r.business_name && r.contact_name && <p className="text-xs text-gray-500">{r.business_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{(r.service_types || []).join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.ai_estimated_price_low && r.ai_estimated_price_high
                        ? `$${r.ai_estimated_price_low}-$${r.ai_estimated_price_high}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3"><UrgencyBadge urgency={r.urgency} /></td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 text-gray-400 hover:text-[#1e4d6b] rounded-lg hover:bg-gray-100">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
