import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, CalendarDays, FileText, Star, BarChart3,
  Shield, ShieldCheck, Award, Eye, TrendingUp, Clock, MapPin, Users,
  CheckCircle, XCircle, AlertTriangle, Upload, Send, ChevronRight,
  Zap, Lock, ArrowUpRight, Camera, ClipboardCheck, LogOut, Bell,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  vendorDashboardStats, vendorLeads, vendorScheduledServices, vendorCredentials,
  vendorAnalyticsData, vendorSubscriptionPlans, vendorCurrentSubscription,
  vendorMessages, marketplaceReviews,
  type VendorLead, type MarketplaceTier, type VendorCredentialItem,
} from '../data/demoData';

// ── Types ────────────────────────────────────────────────────
type VendorTab = 'overview' | 'leads' | 'services' | 'documents' | 'reviews' | 'analytics';
type LeadFilter = 'all' | 'new' | 'quoted' | 'accepted' | 'scheduled' | 'in_progress' | 'completed' | 'declined';

const TABS: { id: VendorTab; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: MessageSquare, badge: vendorLeads.filter(l => l.status === 'new').length },
  { id: 'services', label: 'Services', icon: CalendarDays },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

// ── Helpers ──────────────────────────────────────────────────
function TierBadge({ tier, size = 'sm' }: { tier: MarketplaceTier; size?: 'sm' | 'lg' }) {
  const cfg: Record<MarketplaceTier, { bg: string; text: string; border: string; icon: typeof Shield; label: string }> = {
    verified:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  icon: ShieldCheck, label: 'Verified'  },
    certified: { bg: 'bg-gray-100',  text: 'text-gray-700',   border: 'border-gray-200',   icon: Shield,      label: 'Certified' },
    preferred: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: Award,       label: 'Preferred' },
  };
  const c = cfg[tier];
  const Icon = c.icon;
  const px = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 ${px} rounded-full font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <Icon className={size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} />
      {c.label}
    </span>
  );
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sz = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={sz} fill={i <= Math.round(rating) ? '#d4af37' : 'none'} stroke={i <= Math.round(rating) ? '#d4af37' : '#d1d5db'} />
      ))}
      <span className={`ml-1 font-semibold ${size === 'lg' ? 'text-lg' : 'text-sm'} text-gray-700`}>{rating.toFixed(1)}</span>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: VendorLead['urgency'] }) {
  const map = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-50 text-blue-700',
    high: 'bg-amber-50 text-amber-700',
    emergency: 'bg-red-50 text-red-700',
  };
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${map[urgency]}`}>{urgency.charAt(0).toUpperCase() + urgency.slice(1)}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    quoted: 'bg-purple-50 text-purple-700 border-purple-200',
    accepted: 'bg-green-50 text-green-700 border-green-200',
    scheduled: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    declined: 'bg-gray-100 text-gray-500 border-gray-200',
    confirmed: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    verified: 'bg-green-50 text-green-700 border-green-200',
    expiring: 'bg-amber-50 text-amber-700 border-amber-200',
    expired: 'bg-red-50 text-red-700 border-red-200',
  };
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${map[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{label}</span>;
}

function ProgressBar({ value, color }: { value: number; color?: string }) {
  const c = color || (value >= 95 ? '#22c55e' : value >= 80 ? '#d4af37' : '#f59e0b');
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: c }} />
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Main Component ───────────────────────────────────────────
export function VendorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<VendorTab>('overview');
  const [leadFilter, setLeadFilter] = useState<LeadFilter>('all');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/vendor/login');
  };

  // Filter reviews for ABC Fire Protection (the demo vendor)
  const vendorReviews = useMemo(() =>
    marketplaceReviews.filter(r => r.vendorSlug === 'abc-fire-protection'),
    []
  );

  const filteredLeads = useMemo(() =>
    leadFilter === 'all' ? vendorLeads : vendorLeads.filter(l => l.status === leadFilter),
    [leadFilter]
  );

  const expiringCredentials = vendorCredentials.filter(c => c.status === 'expiring' || c.status === 'expired');
  const unreadMessages = vendorMessages.filter(m => !m.read && m.senderType !== 'vendor').length;

  // ── Render Tabs ──────────────────────────────────────────
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Active Leads', value: vendorDashboardStats.activeLeads, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Upcoming Services', value: vendorDashboardStats.upcomingServices, icon: CalendarDays, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Recent Reviews', value: vendorDashboardStats.recentReviews, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Profile Views', value: vendorDashboardStats.profileViewsMonth, icon: Eye, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Conversion Rate', value: `${vendorDashboardStats.leadConversionRate}%`, icon: TrendingUp, color: 'text-cyan-600', bg: 'bg-cyan-50' },
          { label: 'Avg Response', value: `${vendorDashboardStats.avgResponseTime}h`, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Certification Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">EvidLY Certification</h3>
            <TierBadge tier={vendorDashboardStats.currentTier} />
          </div>
          <div className="space-y-3">
            {[
              { label: 'Response Time', current: '< 4 hrs', target: '< 2 hrs', pct: 65 },
              { label: 'On-Time Rate', current: '94%', target: '97%', pct: 94 },
              { label: 'Avg Rating', current: '4.6', target: '4.8', pct: 92 },
              { label: 'Doc Upload Rate', current: '91%', target: '95%', pct: 91 },
              { label: 'Review Count', current: '23', target: '30', pct: 77 },
            ].map(r => (
              <div key={r.label}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-600">{r.label}</span>
                  <span className="text-gray-400">{r.current} / {r.target}</span>
                </div>
                <ProgressBar value={r.pct} />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Meet all targets for 3+ months to reach Preferred tier</p>
        </div>

        {/* Subscription Plan */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Plan</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Free — EvidLY Listed</div>
              <div className="text-xs text-gray-500">5 leads/month, basic listing</div>
            </div>
          </div>
          <div className="space-y-2 text-xs text-gray-600 mb-4">
            <div className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Basic marketplace listing</div>
            <div className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Credential verification</div>
            <div className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-gray-300" /> Analytics dashboard</div>
            <div className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-gray-300" /> Priority placement</div>
          </div>
          <button
            onClick={() => setShowSubscriptionModal(true)}
            className="w-full py-2 bg-[#1e4d6b] text-white text-sm font-medium rounded-lg hover:bg-[#163a52] transition-colors"
          >
            Upgrade Plan
          </button>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Respond to New Leads', count: vendorLeads.filter(l => l.status === 'new').length, action: () => setActiveTab('leads'), icon: Send, color: 'text-blue-600' },
              { label: 'View Messages', count: unreadMessages, action: () => alert('Messages panel coming soon!'), icon: MessageSquare, color: 'text-purple-600' },
              { label: 'Upload Credential', count: expiringCredentials.length, action: () => setActiveTab('documents'), icon: Upload, color: 'text-amber-600' },
              { label: 'Respond to Reviews', count: vendorReviews.filter(r => !r.vendorResponse).length, action: () => setActiveTab('reviews'), icon: Star, color: 'text-yellow-600' },
            ].map(a => (
              <button key={a.label} onClick={a.action} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <a.icon className={`h-4 w-4 ${a.color}`} />
                  <span className="text-sm text-gray-700">{a.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {a.count > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">{a.count}</span>
                  )}
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Leads + Upcoming Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Recent Leads</h3>
            <button onClick={() => setActiveTab('leads')} className="text-xs text-[#1e4d6b] font-medium hover:underline">View All</button>
          </div>
          <div className="divide-y divide-gray-100">
            {vendorLeads.slice(0, 4).map(lead => (
              <div key={lead.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{lead.operatorOrg}</div>
                  <div className="text-xs text-gray-500">{lead.serviceType} &middot; {timeAgo(lead.receivedAt)}</div>
                </div>
                <StatusBadge status={lead.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Upcoming Services</h3>
            <button onClick={() => setActiveTab('services')} className="text-xs text-[#1e4d6b] font-medium hover:underline">View All</button>
          </div>
          <div className="divide-y divide-gray-100">
            {vendorScheduledServices.slice(0, 4).map(svc => (
              <div key={svc.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{svc.clientOrg}</div>
                  <div className="text-xs text-gray-500">{svc.serviceType} &middot; {formatDate(svc.scheduledDate)} at {svc.scheduledTime}</div>
                </div>
                <StatusBadge status={svc.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLeads = () => {
    const filterCounts: Record<LeadFilter, number> = {
      all: vendorLeads.length,
      new: vendorLeads.filter(l => l.status === 'new').length,
      quoted: vendorLeads.filter(l => l.status === 'quoted').length,
      accepted: vendorLeads.filter(l => l.status === 'accepted').length,
      scheduled: vendorLeads.filter(l => l.status === 'scheduled').length,
      in_progress: vendorLeads.filter(l => l.status === 'in_progress').length,
      completed: vendorLeads.filter(l => l.status === 'completed').length,
      declined: vendorLeads.filter(l => l.status === 'declined').length,
    };

    return (
      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(filterCounts) as LeadFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setLeadFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                leadFilter === f
                  ? 'bg-[#1e4d6b] text-white border-[#1e4d6b]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} ({filterCounts[f]})
            </button>
          ))}
        </div>

        {/* Lead Cards */}
        <div className="space-y-3">
          {filteredLeads.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">No leads matching this filter.</div>
          ) : filteredLeads.map(lead => (
            <div key={lead.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{lead.operatorOrg}</span>
                    <UrgencyBadge urgency={lead.urgency} />
                    <StatusBadge status={lead.status} />
                  </div>
                  <div className="text-sm text-gray-600">{lead.operatorName} &middot; {lead.serviceType}</div>
                </div>
                <div className="text-xs text-gray-400">{timeAgo(lead.receivedAt)}</div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {lead.locationDetails}</span>
                {lead.quoteAmount && <span className="font-medium text-gray-700">${lead.quoteAmount.toLocaleString()}</span>}
                {lead.scheduledDate && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatDate(lead.scheduledDate)}</span>}
              </div>
              <p className="text-sm text-gray-600 mb-4">{lead.description}</p>
              {lead.respondedAt && (
                <div className="text-xs text-gray-400 mb-3">
                  Responded in {Math.round((new Date(lead.respondedAt).getTime() - new Date(lead.receivedAt).getTime()) / 3600000)}h
                </div>
              )}
              <div className="flex gap-2">
                {lead.status === 'new' && (
                  <>
                    <button onClick={() => alert(`Quote form for ${lead.operatorOrg} coming soon! In production, you'd enter your price, availability, and any notes.`)} className="px-4 py-2 bg-[#1e4d6b] text-white text-sm font-medium rounded-lg hover:bg-[#163a52]">
                      <Send className="h-3.5 w-3.5 inline mr-1.5" />Send Quote
                    </button>
                    <button onClick={() => alert('Lead declined. In production, you could provide a reason and optionally refer to a partner vendor.')} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">
                      Decline
                    </button>
                  </>
                )}
                {lead.status === 'quoted' && (
                  <span className="text-sm text-purple-600 font-medium flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Awaiting operator response</span>
                )}
                {lead.status === 'accepted' && (
                  <button onClick={() => alert(`Schedule service for ${lead.operatorOrg}. In production, you'd pick a date, time, and assign a crew.`)} className="px-4 py-2 bg-[#1e4d6b] text-white text-sm font-medium rounded-lg hover:bg-[#163a52]">
                    <CalendarDays className="h-3.5 w-3.5 inline mr-1.5" />Schedule Service
                  </button>
                )}
                {lead.status === 'completed' && (
                  <button onClick={() => alert('Service completion report with photos, certificates, and compliance updates. Available in production.')} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">
                    View Completion Report
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderServices = () => (
    <div className="space-y-6">
      {/* Upcoming Services */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Upcoming Services (Next 14 Days)</h3>
        <div className="space-y-3">
          {vendorScheduledServices.map(svc => (
            <div key={svc.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{svc.clientOrg}</span>
                    <StatusBadge status={svc.status} />
                  </div>
                  <div className="text-sm text-gray-600">{svc.serviceType}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{formatDate(svc.scheduledDate)}</div>
                  <div className="text-xs text-gray-500">{svc.scheduledTime}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {svc.location}</span>
              </div>
              {svc.notes && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-4">{svc.notes}</p>}

              {/* Service Completion Workflow */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => alert(`Service marked as started for ${svc.clientOrg}. Your crew is now on-site. Timer started for response tracking.`)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Mark Started
                </button>
                <button onClick={() => alert('Camera opens for before/after photos. In production, photos are geotagged and timestamped for compliance verification.')} className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5" /> Upload Photos
                </button>
                <button onClick={() => alert('Upload service report/certificate. Supported formats: PDF, JPG, PNG. Document will be auto-linked to operator\'s compliance records.')} className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  <Upload className="h-3.5 w-3.5" /> Upload Report
                </button>
                <button onClick={() => alert(`Service completed for ${svc.clientOrg}! In production: operator notified, compliance records updated, insurance risk score recalculated.`)} className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  <ClipboardCheck className="h-3.5 w-3.5" /> Mark Completed
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Completions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Completions</h3>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {vendorLeads.filter(l => l.status === 'completed').map(lead => (
            <div key={lead.id} className="px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">{lead.operatorOrg}</div>
                <div className="text-xs text-gray-500">{lead.serviceType} &middot; {lead.scheduledDate && formatDate(lead.scheduledDate)}</div>
              </div>
              <div className="flex items-center gap-3">
                {lead.quoteAmount && <span className="text-sm font-medium text-gray-700">${lead.quoteAmount}</span>}
                <StatusBadge status="completed" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-4">
      {/* Expiration Alert */}
      {expiringCredentials.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-amber-800">{expiringCredentials.length} credential{expiringCredentials.length > 1 ? 's' : ''} expiring soon</div>
            <div className="text-xs text-amber-700 mt-1">
              {expiringCredentials.map(c => c.name).join(', ')} — Update before expiration to maintain your EvidLY Certified status.
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={() => alert('Upload new credential. Supported: PDF, JPG, PNG (max 10MB). Your credential will be verified by EvidLY within 24 hours.')} className="px-4 py-2 bg-[#1e4d6b] text-white text-sm font-medium rounded-lg hover:bg-[#163a52] flex items-center gap-1.5">
          <Upload className="h-4 w-4" /> Upload Credential
        </button>
        <button onClick={() => alert('Share credentials with all connected operators. They will receive a notification with your updated documents.')} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
          <Send className="h-4 w-4" /> Share with Operators
        </button>
      </div>

      {/* Credentials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vendorCredentials.map(cred => (
          <div key={cred.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {cred.verifiedByEvidly ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-gray-900">{cred.name}</span>
              </div>
              <StatusBadge status={cred.status} />
            </div>
            <div className="ml-7 space-y-1 text-xs text-gray-500">
              <div>Type: {cred.type.charAt(0).toUpperCase() + cred.type.slice(1)}</div>
              {cred.issuedDate && <div>Issued: {formatDate(cred.issuedDate)}</div>}
              {cred.expirationDate && (
                <div className={cred.status === 'expiring' || cred.status === 'expired' ? 'text-amber-600 font-medium' : ''}>
                  Expires: {formatDate(cred.expirationDate)}
                </div>
              )}
              {cred.verifiedByEvidly && <div className="text-green-600 font-medium">Verified by EvidLY</div>}
            </div>
            <div className="ml-7 mt-3">
              <button onClick={() => alert(`Update ${cred.name}. Upload a new document to replace the current one.`)} className="text-xs text-[#1e4d6b] font-medium hover:underline">
                Update Document
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReviews = () => {
    const starBreakdown = [0, 0, 0, 0, 0];
    vendorReviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) starBreakdown[r.rating - 1]++; });

    return (
      <div className="space-y-6">
        {/* Rating Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{vendorDashboardStats.avgRating.toFixed(1)}</div>
              <StarRating rating={vendorDashboardStats.avgRating} size="lg" />
              <p className="text-xs text-gray-500 mt-1">Based on {vendorReviews.length} reviews</p>
            </div>
            <div className="flex-1 space-y-1.5 w-full">
              {[5, 4, 3, 2, 1].map(star => {
                const count = starBreakdown[star - 1];
                const pct = vendorReviews.length > 0 ? (count / vendorReviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <span className="w-3 text-gray-600">{star}</span>
                    <Star className="h-3.5 w-3.5" fill="#d4af37" stroke="#d4af37" />
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#d4af37' }} />
                    </div>
                    <span className="w-5 text-xs text-gray-500 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Review List */}
        <div className="space-y-3">
          {vendorReviews.map(review => (
            <div key={review.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{review.reviewerName}</span>
                    <span className="text-xs text-gray-500">{review.reviewerOrg}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={review.rating} />
                    <span className="text-xs text-gray-400">&middot;</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{review.serviceType}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{formatDate(review.date)}</span>
              </div>
              <p className="text-sm text-gray-700 mt-2">{review.text}</p>
              {review.vendorResponse ? (
                <div className="mt-3 bg-gray-50 rounded-lg p-3 border-l-2 border-[#1e4d6b]">
                  <div className="text-xs font-medium text-gray-500 mb-1">Your Response</div>
                  <p className="text-sm text-gray-700">{review.vendorResponse}</p>
                </div>
              ) : (
                <button
                  onClick={() => alert('Write your response to this review. In production, your response will be visible on your marketplace profile.')}
                  className="mt-3 text-sm text-[#1e4d6b] font-medium hover:underline"
                >
                  Respond to this review
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="bg-[#eef4f8] border border-[#b8d4e8] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#1e4d6b] mb-3">Tips to Improve Your Rating</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2"><Zap className="h-4 w-4 text-[#d4af37] flex-shrink-0 mt-0.5" /> Respond to all reviews within 48 hours — operators notice and appreciate it</li>
            <li className="flex items-start gap-2"><Zap className="h-4 w-4 text-[#d4af37] flex-shrink-0 mt-0.5" /> Upload service documentation within 24 hours of completing a job</li>
            <li className="flex items-start gap-2"><Zap className="h-4 w-4 text-[#d4af37] flex-shrink-0 mt-0.5" /> Include before/after photos — they show quality and build trust</li>
            <li className="flex items-start gap-2"><Zap className="h-4 w-4 text-[#d4af37] flex-shrink-0 mt-0.5" /> Ask satisfied clients to leave a review on your EvidLY profile</li>
          </ul>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    const maxViews = Math.max(...vendorAnalyticsData.map(d => d.profileViews));
    const totalRevenue = vendorAnalyticsData.reduce((s, d) => s + d.revenue, 0);
    const totalQuotes = vendorAnalyticsData.reduce((s, d) => s + d.quotesSent, 0);
    const totalAccepted = vendorAnalyticsData.reduce((s, d) => s + d.quotesAccepted, 0);
    const conversionRate = totalQuotes > 0 ? Math.round((totalAccepted / totalQuotes) * 100) : 0;

    return (
      <div className="space-y-6">
        {/* Premium Upsell Banner */}
        {vendorCurrentSubscription.plan === 'free' && (
          <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-xl p-5 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="h-5 w-5 text-[#d4af37]" />
              <span className="font-semibold">Premium Analytics</span>
            </div>
            <p className="text-white/80 text-sm mb-3">Upgrade to Standard ($49/mo) to unlock full analytics including revenue tracking, conversion funnels, and category benchmarks.</p>
            <button onClick={() => setShowSubscriptionModal(true)} className="px-4 py-2 bg-[#d4af37] text-[#1e4d6b] text-sm font-semibold rounded-lg hover:bg-[#c9a227]">
              Upgrade Now
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue (12mo)', value: `$${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600' },
            { label: 'Quote Conversion', value: `${conversionRate}%`, icon: ArrowUpRight, color: 'text-blue-600' },
            { label: 'Services Completed', value: vendorAnalyticsData.reduce((s, d) => s + d.servicesCompleted, 0), icon: CheckCircle, color: 'text-emerald-600' },
            { label: 'Avg Monthly Views', value: Math.round(vendorAnalyticsData.reduce((s, d) => s + d.profileViews, 0) / 12), icon: Eye, color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Profile Views Chart (div-based bars) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Profile Views (12 Months)</h3>
          <div className="flex items-end gap-1.5 h-40">
            {vendorAnalyticsData.map(d => (
              <div key={d.month} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full rounded-t-sm transition-all hover:opacity-80"
                  style={{ height: `${(d.profileViews / maxViews) * 100}%`, backgroundColor: '#1e4d6b', minHeight: '4px' }}
                  title={`${d.month}: ${d.profileViews} views`}
                />
                <span className="text-[9px] text-gray-400 mt-1.5 truncate w-full text-center">{d.month.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Data Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Monthly Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2 text-xs font-medium text-gray-500">Month</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 text-right">Views</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 text-right">Requests</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 text-right">Quoted</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 text-right">Accepted</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 text-right">Completed</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...vendorAnalyticsData].reverse().map(d => (
                  <tr key={d.month} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{d.month}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{d.profileViews}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{d.quoteRequests}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{d.quotesSent}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{d.quotesAccepted}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{d.servicesCompleted}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">${d.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Comparison */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">How You Compare (Hood Cleaning Category)</h3>
          <div className="space-y-3">
            {[
              { label: 'Average Rating', you: '4.6', avg: '4.2', pctYou: 92, pctAvg: 84 },
              { label: 'Response Time', you: '3.8h', avg: '8.2h', pctYou: 85, pctAvg: 55 },
              { label: 'On-Time Rate', you: '94%', avg: '87%', pctYou: 94, pctAvg: 87 },
              { label: 'Doc Upload Rate', you: '91%', avg: '72%', pctYou: 91, pctAvg: 72 },
            ].map(c => (
              <div key={c.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{c.label}</span>
                  <span className="text-gray-500">You: <span className="font-medium text-[#1e4d6b]">{c.you}</span> &middot; Avg: {c.avg}</span>
                </div>
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="absolute h-full rounded-full bg-gray-400/40" style={{ width: `${c.pctAvg}%` }} />
                  <div className="absolute h-full rounded-full bg-[#1e4d6b]" style={{ width: `${c.pctYou}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Subscription Modal ──────────────────────────────────
  const renderSubscriptionModal = () => {
    if (!showSubscriptionModal) return null;
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSubscriptionModal(false)}>
        <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Choose Your Plan</h2>
            <button onClick={() => setShowSubscriptionModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
              <XCircle className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {vendorSubscriptionPlans.map(plan => {
              const isCurrent = vendorCurrentSubscription.plan === plan.id.replace('plan-', '');
              return (
                <div key={plan.id} className={`rounded-xl border-2 p-5 ${plan.highlighted ? 'border-[#d4af37] shadow-lg' : isCurrent ? 'border-[#1e4d6b]' : 'border-gray-200'}`}>
                  {plan.highlighted && (
                    <div className="text-xs font-bold text-[#d4af37] uppercase mb-2">Most Popular</div>
                  )}
                  <h3 className="font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2 mb-4">
                    {plan.price === 0 ? (
                      <span className="text-2xl font-bold text-gray-900">Free</span>
                    ) : plan.interval === 'per_lead' ? (
                      <span className="text-2xl font-bold text-gray-900">${plan.price}<span className="text-sm font-normal text-gray-500">/lead</span></span>
                    ) : (
                      <span className="text-2xl font-bold text-gray-900">${plan.price}<span className="text-sm font-normal text-gray-500">/mo</span></span>
                    )}
                  </div>
                  {plan.badge && (
                    <div className="mb-3">
                      <span className="px-2 py-0.5 bg-[#eef4f8] text-[#1e4d6b] text-xs font-medium rounded-full">{plan.badge}</span>
                    </div>
                  )}
                  <ul className="space-y-2 mb-4">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      if (isCurrent) return;
                      alert(`Upgrade to ${plan.name} coming soon! Contact sales@evidly.com for early access pricing.`);
                    }}
                    className={`w-full py-2 text-sm font-medium rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-gray-100 text-gray-500 cursor-default'
                        : 'bg-[#1e4d6b] text-white hover:bg-[#163a52]'
                    }`}
                  >
                    {isCurrent ? 'Current Plan' : 'Upgrade'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Main Render ──────────────────────────────────────────
  const tabContent: Record<VendorTab, () => JSX.Element> = {
    overview: renderOverview,
    leads: renderLeads,
    services: renderServices,
    documents: renderDocuments,
    reviews: renderReviews,
    analytics: renderAnalytics,
  };

  return (
    <div className="min-h-screen bg-[#faf8f3]">
      {/* Portal Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-12">
                <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#d4af37"/>
                  <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill="#1e4d6b"/>
                  <path d="M22 32L26 36L34 26" stroke="#d4af37" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="ml-3 text-2xl font-bold">
                <span className="text-[#1e4d6b]">Evid</span>
                <span className="text-[#d4af37]">LY</span>
                <span className="ml-2 text-sm text-gray-600">Vendor Portal</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => alert('Notifications: 2 new leads, 1 credential expiring. Full notification center coming soon!')} className="relative p-2 text-gray-500 hover:text-gray-700">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button onClick={handleSignOut} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1.5">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto -mb-px">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#1e4d6b] text-[#1e4d6b]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tabContent[activeTab]()}
      </div>

      {/* Subscription Modal */}
      {renderSubscriptionModal()}
    </div>
  );
}
