/**
 * CPP-VENDOR-CONNECT-01 — Admin Vendor Connect Management
 * Route: /admin/vendor-connect (inside RequireAdmin)
 *
 * 5 tabs: Applications, Partners, Spots, Leads, Performance.
 */
import { useState, useEffect } from 'react';
import {
  FileText, Users, MapPin, MessageSquare, TrendingUp,
  CheckCircle, XCircle, Clock, Eye, ChevronDown, ChevronRight, AlertCircle,
  Edit3, Loader2,
} from 'lucide-react';
import { PartnerBadge } from '../../components/vendor/PartnerBadge';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';

const TABS = [
  { id: 'applications', label: 'Applications', icon: FileText },
  { id: 'partners', label: 'Partners', icon: Users },
  { id: 'spots', label: 'Spots', icon: MapPin },
  { id: 'leads', label: 'Leads', icon: MessageSquare },
  { id: 'performance', label: 'Performance', icon: TrendingUp },
];

const APP_STATUS_COLORS = {
  pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
  approved: { bg: '#dcfce7', text: '#166534', label: 'Approved' },
  rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
  waitlisted: { bg: '#e0e7ff', text: '#3730a3', label: 'Waitlisted' },
};

const LEAD_STATUS_COLORS = {
  new: { bg: '#dbeafe', text: '#1d4ed8', label: 'New' },
  contacted: { bg: '#fef3c7', text: '#92400e', label: 'Contacted' },
  quoted: { bg: '#e0e7ff', text: '#3730a3', label: 'Quoted' },
  won: { bg: '#dcfce7', text: '#166534', label: 'Won' },
  lost: { bg: '#fee2e2', text: '#991b1b', label: 'Lost' },
};

export function AdminVendorConnect() {
  const { isDemoMode } = useDemo();
  const [activeTab, setActiveTab] = useState('applications');
  const [applications, setApplications] = useState([]);
  const [partners, setPartners] = useState([]);
  const [spots, setSpots] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(!isDemoMode);
  const [expandedApp, setExpandedApp] = useState(null);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    if (isDemoMode) return;
    fetchAll();
  }, [isDemoMode]);

  async function fetchAll() {
    setLoading(true);
    const [appsRes, partnersRes, spotsRes, leadsRes] = await Promise.all([
      supabase.from('vendor_connect_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('vendor_connect_profiles').select('*').order('performance_score', { ascending: false }),
      supabase.from('vendor_connect_spots').select('*').order('county'),
      supabase.from('vendor_connect_leads').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setApplications(appsRes.data || []);
    setPartners(partnersRes.data || []);
    setSpots(spotsRes.data || []);
    setLeads(leadsRes.data || []);
    setLoading(false);
  }

  async function updateApplicationStatus(appId, newStatus) {
    if (isDemoMode) {
      alert(`Application ${newStatus} (demo mode)`);
      return;
    }
    setProcessing(appId);
    await supabase
      .from('vendor_connect_applications')
      .update({ status: newStatus, reviewed_at: new Date().toISOString() })
      .eq('id', appId);
    await fetchAll();
    setProcessing(null);
  }

  async function updateSpotCount(spotId, field, value) {
    if (isDemoMode) return;
    await supabase
      .from('vendor_connect_spots')
      .update({ [field]: value })
      .eq('id', spotId);
    fetchAll();
  }

  // Filter state
  const [appFilter, setAppFilter] = useState('all');
  const filteredApps = appFilter === 'all'
    ? applications
    : applications.filter(a => a.status === appFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2D4D]">Vendor Connect Management</h1>
        <p className="text-sm text-gray-500 mt-1">Review applications, manage partners, track spots and leads.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = tab.id === 'applications' ? applications.filter(a => a.status === 'pending').length
            : tab.id === 'leads' ? leads.filter(l => l.status === 'new').length
            : 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive ? 'border-[#1E2D4D] text-[#1E2D4D]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-semibold">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
      ) : (
        <>
          {/* ── APPLICATIONS TAB ─────────────────────────── */}
          {activeTab === 'applications' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {['all', 'pending', 'approved', 'rejected', 'waitlisted'].map(f => (
                  <button
                    key={f}
                    onClick={() => setAppFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      appFilter === f ? 'bg-[#1E2D4D] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                    {f === 'pending' && applications.filter(a => a.status === 'pending').length > 0 && (
                      <span className="ml-1">({applications.filter(a => a.status === 'pending').length})</span>
                    )}
                  </button>
                ))}
              </div>

              {filteredApps.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No applications{appFilter !== 'all' ? ` with status "${appFilter}"` : ''}.</div>
              ) : (
                filteredApps.map(app => {
                  const status = APP_STATUS_COLORS[app.status] || APP_STATUS_COLORS.pending;
                  const isExpanded = expandedApp === app.id;
                  return (
                    <div key={app.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: '#1E2D4D' }}>
                            {(app.company_name || '?')[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#1E2D4D]">{app.company_name}</p>
                            <p className="text-xs text-gray-500">{app.contact_name} · {app.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: status.bg, color: status.text }}
                          >
                            {status.label}
                          </span>
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                          <div className="grid md:grid-cols-2 gap-3 text-xs">
                            <div><span className="text-gray-500">Services:</span> <span className="text-gray-900 font-medium">{(app.service_types || []).join(', ') || '—'}</span></div>
                            <div><span className="text-gray-500">Counties:</span> <span className="text-gray-900 font-medium">{(app.service_areas || []).join(', ') || '—'}</span></div>
                            <div><span className="text-gray-500">Years:</span> <span className="text-gray-900 font-medium">{app.years_in_business || '—'}</span></div>
                            <div><span className="text-gray-500">IKECA:</span> <span className="text-gray-900 font-medium">{app.ikeca_certified ? 'Yes' : 'No'}</span></div>
                            {app.phone && <div><span className="text-gray-500">Phone:</span> <span className="text-gray-900 font-medium">{app.phone}</span></div>}
                            {app.referred_by && <div><span className="text-gray-500">Referred by:</span> <span className="text-gray-900 font-medium">{app.referred_by}</span></div>}
                          </div>
                          {app.why_apply && (
                            <div className="bg-[#FAF7F0] rounded-lg p-3">
                              <p className="text-xs text-gray-500 font-medium mb-1">Why they want to join:</p>
                              <p className="text-xs text-gray-700">{app.why_apply}</p>
                            </div>
                          )}
                          {app.status === 'pending' && (
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={() => updateApplicationStatus(app.id, 'approved')}
                                disabled={processing === app.id}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                              >
                                {processing === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                Approve
                              </button>
                              <button
                                onClick={() => updateApplicationStatus(app.id, 'rejected')}
                                disabled={processing === app.id}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                              <button
                                onClick={() => updateApplicationStatus(app.id, 'waitlisted')}
                                disabled={processing === app.id}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <Clock className="w-3 h-3" /> Waitlist
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── PARTNERS TAB ─────────────────────────────── */}
          {activeTab === 'partners' && (
            <div className="space-y-4">
              {partners.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No Vendor Connect partners yet.</div>
              ) : (
                partners.map(p => (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: '#1E2D4D' }}>
                        {(p.company_name || '?')[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#1E2D4D]">{p.company_name}</p>
                          <PartnerBadge tier={p.partner_tier} size="sm" />
                        </div>
                        <p className="text-xs text-gray-500">
                          {p.primary_county ? `${p.primary_county} County · ` : ''}
                          {(p.service_types || []).join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-sm font-bold" style={{ color: '#1E2D4D' }}>{p.performance_score || 0}</div>
                        <div className="text-xs text-gray-400">Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold" style={{ color: '#1E2D4D' }}>{p.total_jobs_completed || 0}</div>
                        <div className="text-xs text-gray-400">Jobs</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {p.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── SPOTS TAB ────────────────────────────────── */}
          {activeTab === 'spots' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">County</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Service Type</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Max</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Filled</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Remaining</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Waitlist</th>
                  </tr>
                </thead>
                <tbody>
                  {spots.map(spot => {
                    const remaining = spot.max_spots - spot.filled_spots;
                    return (
                      <tr key={spot.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-medium">{spot.county}</td>
                        <td className="px-4 py-3 text-gray-600">{spot.service_type.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-center text-gray-900">{spot.max_spots}</td>
                        <td className="px-4 py-3 text-center text-gray-900">{spot.filled_spots}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${remaining > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {remaining}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">{spot.waitlist_count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {spots.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">No spot data available.</div>
              )}
            </div>
          )}

          {/* ── LEADS TAB ────────────────────────────────── */}
          {activeTab === 'leads' && (
            <div className="space-y-4">
              {leads.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No leads routed yet.</div>
              ) : (
                leads.map(lead => {
                  const status = LEAD_STATUS_COLORS[lead.status] || LEAD_STATUS_COLORS.new;
                  return (
                    <div key={lead.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{lead.operator_name || 'Operator'}</p>
                        <p className="text-xs text-gray-500">
                          {lead.service_type?.replace(/_/g, ' ')} · {lead.location_address || '—'}
                        </p>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: status.bg, color: status.text }}
                      >
                        {status.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── PERFORMANCE TAB ──────────────────────────── */}
          {activeTab === 'performance' && (
            <div className="space-y-4">
              {partners.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No partners to rank.</div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Partner</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">County</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Score</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Jobs</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">On-time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partners.map((p, i) => (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
                          <td className="px-4 py-3 text-gray-900 font-medium">{p.company_name}</td>
                          <td className="px-4 py-3 text-gray-600">{p.primary_county || '—'}</td>
                          <td className="px-4 py-3 text-center font-bold" style={{ color: p.performance_score >= 90 ? '#16a34a' : '#d97706' }}>
                            {p.performance_score || 0}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-900">{p.total_jobs_completed || 0}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{p.on_time_rate ? `${Math.round(p.on_time_rate)}%` : '—'}</td>
                          <td className="px-4 py-3"><PartnerBadge tier={p.partner_tier} size="sm" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
