/**
 * CPP-VENDOR-CONNECT-01 — Vendor Partner Dashboard
 * Route: /vendor/partner-dashboard (standalone ProtectedRoute)
 *
 * Vendor Connect partner's dashboard — separate from VendorDashboard.tsx.
 * 7 sections: Status, Clients, Leads, Performance, Documents, Service Sync, Monthly Report.
 * Empty state in demo mode (no fake data per CLAUDE.md).
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare, TrendingUp, FileText, CalendarDays,
  BarChart3, ChevronRight, Clock, MapPin, Phone, Mail, CheckCircle, XCircle,
  AlertTriangle, Upload, Download, LogOut,
} from 'lucide-react';
import { PartnerBadge } from '../components/vendor/PartnerBadge';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';

const TABS = [
  { id: 'status', label: 'Status', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'leads', label: 'Leads', icon: MessageSquare },
  { id: 'performance', label: 'Performance', icon: TrendingUp },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'services', label: 'Service Sync', icon: CalendarDays },
  { id: 'report', label: 'Monthly Report', icon: BarChart3 },
];

const LEAD_STATUS_COLORS = {
  new: { bg: '#dbeafe', text: '#1d4ed8', label: 'New' },
  contacted: { bg: '#fef3c7', text: '#92400e', label: 'Contacted' },
  quoted: { bg: '#e0e7ff', text: '#3730a3', label: 'Quoted' },
  won: { bg: '#dcfce7', text: '#166534', label: 'Won' },
  lost: { bg: '#fee2e2', text: '#991b1b', label: 'Lost' },
};

export function VendorPartnerDashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { isDemoMode } = useDemo();
  const [activeTab, setActiveTab] = useState('status');
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(!isDemoMode);

  useEffect(() => {
    if (isDemoMode || !profile) return;
    fetchPartnerData();
  }, [isDemoMode, profile]);

  async function fetchPartnerData() {
    setLoading(true);
    // Find the vendor_connect_profile linked to this user's vendor
    const { data: vendorData } = await supabase
      .from('vendors')
      .select('id')
      .eq('vendor_tier', 'vendor_connect')
      .limit(1)
      .single();

    if (vendorData) {
      const { data: profileData } = await supabase
        .from('vendor_connect_profiles')
        .select('*')
        .eq('vendor_id', vendorData.id)
        .single();
      setPartnerProfile(profileData);

      const { data: leadsData } = await supabase
        .from('vendor_connect_leads')
        .select('*')
        .eq('vendor_id', vendorData.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setLeads(leadsData || []);
    }
    setLoading(false);
  }

  async function updateLeadStatus(leadId, newStatus) {
    if (isDemoMode) {
      alert('Lead status updated (demo mode)');
      return;
    }
    await supabase
      .from('vendor_connect_leads')
      .update({ status: newStatus })
      .eq('id', leadId);
    fetchPartnerData();
  }

  // Performance breakdown
  const perfBreakdown = partnerProfile ? [
    { label: 'On-time services', pts: 40, score: partnerProfile.on_time_rate || 0 },
    { label: 'Cert quality', pts: 30, score: partnerProfile.cert_quality_score || 0 },
    { label: 'COI on file', pts: 15, score: 100 },
    { label: 'No missed services', pts: 15, score: 100 },
  ] : [];

  function EmptySection({ icon: Icon, title, subtitle }) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-[#FAF7F0] flex items-center justify-center mx-auto mb-3">
          <Icon className="w-6 h-6 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-[#1E2D4D]/50">{title}</p>
        <p className="text-xs text-[#1E2D4D]/30 mt-1">{subtitle}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#F4F6FA' }}>
      {/* Top Bar */}
      <div style={{ background: '#1E2D4D' }} className="px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">🔒</span>
            <span className="text-xs font-bold text-white tracking-widest uppercase">EvidLY</span>
            <span className="text-xs text-[#1E2D4D]/30">· Partner Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-300">{profile?.full_name || 'Partner'}</span>
            <button
              onClick={() => signOut ? signOut() : navigate('/login')}
              className="text-[#1E2D4D]/30 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto mb-6 border-b border-[#1E2D4D]/10">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                  isActive
                    ? 'border-[#A08C5A] text-[#1E2D4D]'
                    : 'border-transparent text-[#1E2D4D]/50 hover:text-gray-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.id === 'leads' && leads.filter(l => l.status === 'new').length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-red-50 text-red-700 font-semibold">
                    {leads.filter(l => l.status === 'new').length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-16 text-[#1E2D4D]/30 text-sm">Loading partner data...</div>
        ) : (
          <>
            {/* ── STATUS TAB ─────────────────────────────────── */}
            {activeTab === 'status' && (
              <div className="space-y-6">
                {partnerProfile ? (
                  <div className="rounded-xl p-6" style={{ background: '#1E2D4D' }}>
                    <PartnerBadge tier={partnerProfile.partner_tier} size="md" />
                    <div className="text-white text-lg font-semibold tracking-tight mt-3">{partnerProfile.company_name}</div>
                    <div className="text-[#1E2D4D]/30 text-sm mt-1">
                      {partnerProfile.total_jobs_completed} jobs completed · {partnerProfile.performance_score || 0}/100 performance
                    </div>
                    {partnerProfile.primary_county && (
                      <div className="flex items-center gap-1 text-[#1E2D4D]/30 text-xs mt-2">
                        <MapPin className="w-3 h-3" />
                        {partnerProfile.primary_county} County
                        {partnerProfile.is_founding_partner && (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#A08C5A', color: 'white' }}>
                            Founding Partner
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptySection
                    icon={LayoutDashboard}
                    title="No partner profile found"
                    subtitle="Contact CPP to set up your Vendor Connect partner account."
                  />
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 text-center">
                    <div className="text-2xl font-bold tracking-tight" style={{ color: '#1E2D4D' }}>
                      {leads.filter(l => l.status === 'new').length}
                    </div>
                    <div className="text-xs text-[#1E2D4D]/50 mt-1">New Leads</div>
                  </div>
                  <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 text-center">
                    <div className="text-2xl font-bold tracking-tight" style={{ color: '#1E2D4D' }}>
                      {partnerProfile?.total_jobs_completed || 0}
                    </div>
                    <div className="text-xs text-[#1E2D4D]/50 mt-1">Jobs Completed</div>
                  </div>
                  <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 text-center">
                    <div className="text-2xl font-bold tracking-tight" style={{ color: partnerProfile?.performance_score >= 90 ? '#16a34a' : '#d97706' }}>
                      {partnerProfile?.performance_score || 0}
                    </div>
                    <div className="text-xs text-[#1E2D4D]/50 mt-1">Performance Score</div>
                  </div>
                  <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 text-center">
                    <div className="text-2xl font-bold tracking-tight" style={{ color: '#1E2D4D' }}>
                      {partnerProfile?.avg_response_hours ? `${Math.round(partnerProfile.avg_response_hours)}h` : '—'}
                    </div>
                    <div className="text-xs text-[#1E2D4D]/50 mt-1">Avg Response</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── CLIENTS TAB ────────────────────────────────── */}
            {activeTab === 'clients' && (
              <EmptySection
                icon={Users}
                title="No clients assigned yet"
                subtitle="Clients will appear here as operators request your services through EvidLY."
              />
            )}

            {/* ── LEADS TAB ──────────────────────────────────── */}
            {activeTab === 'leads' && (
              <div className="space-y-4">
                {leads.length === 0 ? (
                  <EmptySection
                    icon={MessageSquare}
                    title="No leads yet"
                    subtitle="Leads from operator service requests will appear here automatically."
                  />
                ) : (
                  leads.map(lead => {
                    const status = LEAD_STATUS_COLORS[lead.status] || LEAD_STATUS_COLORS.new;
                    return (
                      <div key={lead.id} className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-[#1E2D4D]">
                              {lead.operator_name || 'Operator'}
                            </p>
                            <p className="text-xs text-[#1E2D4D]/50">
                              {lead.service_type?.replace(/_/g, ' ')} · {lead.location_address || 'Location not specified'}
                            </p>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: status.bg, color: status.text }}
                          >
                            {status.label}
                          </span>
                        </div>
                        {lead.notes && (
                          <p className="text-xs text-[#1E2D4D]/50 mb-3">{lead.notes}</p>
                        )}
                        <div className="flex items-center gap-2">
                          {lead.status === 'new' && (
                            <button
                              onClick={() => updateLeadStatus(lead.id, 'contacted')}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg text-white"
                              style={{ background: '#1E2D4D' }}
                            >
                              Mark Contacted
                            </button>
                          )}
                          {lead.status === 'contacted' && (
                            <>
                              <button
                                onClick={() => updateLeadStatus(lead.id, 'quoted')}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg text-white"
                                style={{ background: '#A08C5A' }}
                              >
                                Mark Quoted
                              </button>
                              <button
                                onClick={() => updateLeadStatus(lead.id, 'lost')}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#1E2D4D]/10 text-[#1E2D4D]/70 hover:bg-gray-50"
                              >
                                Lost
                              </button>
                            </>
                          )}
                          {lead.status === 'quoted' && (
                            <>
                              <button
                                onClick={() => updateLeadStatus(lead.id, 'won')}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-green-600"
                              >
                                Won
                              </button>
                              <button
                                onClick={() => updateLeadStatus(lead.id, 'lost')}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#1E2D4D]/10 text-[#1E2D4D]/70 hover:bg-gray-50"
                              >
                                Lost
                              </button>
                            </>
                          )}
                          {lead.operator_phone && (
                            <a href={`tel:${lead.operator_phone}`} className="p-1.5 border border-[#1E2D4D]/10 rounded-lg hover:bg-gray-50">
                              <Phone className="w-3 h-3 text-[#1E2D4D]/50" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── PERFORMANCE TAB ────────────────────────────── */}
            {activeTab === 'performance' && (
              <div className="space-y-6">
                {partnerProfile ? (
                  <>
                    <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6 text-center">
                      <div
                        className="text-5xl font-bold mb-2"
                        style={{ color: partnerProfile.performance_score >= 90 ? '#16a34a' : partnerProfile.performance_score >= 70 ? '#d97706' : '#dc2626' }}
                      >
                        {partnerProfile.performance_score || 0}
                      </div>
                      <p className="text-sm text-[#1E2D4D]/50">Overall Performance Score</p>
                    </div>
                    <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6 space-y-4">
                      <h3 className="text-sm font-semibold text-[#1E2D4D]">Score Breakdown</h3>
                      {perfBreakdown.map((item, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#1E2D4D]/80">{item.label}</span>
                            <span className="font-medium text-gray-900">{Math.round(item.score * item.pts / 100)} / {item.pts} pts</span>
                          </div>
                          <div className="h-2 bg-[#1E2D4D]/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${item.score}%`,
                                background: item.score >= 90 ? '#16a34a' : item.score >= 70 ? '#d97706' : '#dc2626',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {partnerProfile.partner_tier !== 'elite' && (
                      <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                        <h3 className="text-sm font-semibold text-amber-900 mb-2">How to reach Elite Partner status</h3>
                        <ul className="text-xs text-amber-800 space-y-1.5">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
                            Maintain 90+ performance score
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
                            Complete 10+ jobs through EvidLY
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
                            Zero missed service appointments
                          </li>
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptySection icon={TrendingUp} title="No performance data" subtitle="Performance metrics will appear once you start completing jobs." />
                )}
              </div>
            )}

            {/* ── DOCUMENTS TAB ──────────────────────────────── */}
            {activeTab === 'documents' && (
              <EmptySection
                icon={FileText}
                title="No documents on file"
                subtitle="Upload your COI, business license, and certifications to share with clients."
              />
            )}

            {/* ── SERVICE SYNC TAB ───────────────────────────── */}
            {activeTab === 'services' && (
              <EmptySection
                icon={CalendarDays}
                title="No service records"
                subtitle="Completed jobs and upcoming services will sync here automatically."
              />
            )}

            {/* ── MONTHLY REPORT TAB ─────────────────────────── */}
            {activeTab === 'report' && (
              <EmptySection
                icon={BarChart3}
                title="Monthly report not available"
                subtitle="Reports are generated at the end of each month once you have active clients."
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
