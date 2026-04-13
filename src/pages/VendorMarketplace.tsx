import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search,
  Star,
  Clock,
  MapPin,
  Award,
  ChevronRight,
  Flame,
  Cog,
  ClipboardCheck,
  Zap,
  SlidersHorizontal,
  ArrowRight,
  Building2,
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  Shield,
  UserPlus,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { useRole } from '../contexts/RoleContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  marketplaceVendors,
  marketplaceCategories,
  vendors as existingVendors,
  getSmartRecommendations,
  type MarketplaceVendor,
  type MarketplaceTier,
} from '../data/demoData';

/* ------------------------------------------------------------------ */
/*  Helper: Tier Badge                                                 */
/* ------------------------------------------------------------------ */
function TierBadge({ tier }: { tier: MarketplaceTier }) {
  const config: Record<
    MarketplaceTier,
    { bg: string; icon: React.ReactNode; label: string }
  > = {
    verified: {
      bg: 'bg-green-50 text-green-700 border border-green-200',
      icon: <EvidlyIcon size={12} />,
      label: 'Verified',
    },
    certified: {
      bg: 'bg-gray-100 text-gray-700 border border-gray-200',
      icon: <EvidlyIcon size={12} />,
      label: 'Certified',
    },
    preferred: {
      bg: 'bg-amber-50 text-amber-700 border border-amber-200',
      icon: <Award className="h-3 w-3" />,
      label: 'Preferred',
    },
  };

  const { bg, icon, label } = config[tier];

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${bg}`}
    >
      {icon}
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: Star Rating                                                */
/* ------------------------------------------------------------------ */
function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5"
          fill={i <= Math.round(rating) ? '#d4af37' : 'none'}
          stroke={i <= Math.round(rating) ? '#d4af37' : 'currentColor'}
          strokeWidth={i <= Math.round(rating) ? undefined : 1.5}
          style={i > Math.round(rating) ? { color: '#d1d5db' } : undefined}
        />
      ))}
      <span className="text-sm font-medium text-gray-700 ml-1">
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className="text-xs text-gray-500 ml-1">({count})</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Icon map for categories                                            */
/* ------------------------------------------------------------------ */
const iconMap: Record<string, React.ElementType> = {
  Flame,
  ShieldCheck: EvidlyIcon,
  Cog,
  ClipboardCheck,
};

const categoryBgColors: Record<string, string> = {
  Flame: 'bg-red-100 text-red-600',
  ShieldCheck: 'bg-blue-100 text-blue-600',
  Cog: 'bg-purple-100 text-purple-600',
  ClipboardCheck: 'bg-emerald-100 text-emerald-600',
};

/* ------------------------------------------------------------------ */
/*  Tier border accent colors                                          */
/* ------------------------------------------------------------------ */
const tierBorderColor: Record<MarketplaceTier, string> = {
  verified: '#22c55e',
  certified: '#3D5068',
  preferred: '#d4af37',
};

/* ------------------------------------------------------------------ */
/*  Production: DB-backed vendor type                                  */
/* ------------------------------------------------------------------ */
interface DbVendor {
  id: string;
  slug: string;
  company_name: string;
  description: string | null;
  tier: MarketplaceTier;
  status: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  years_in_business: number;
  service_area: string[];
  response_time_hours: number;
  certifications: { name: string; verified: boolean; expirationDate?: string }[];
  is_active: boolean;
  created_at: string;
  invited_by_user_id: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
}

/* ------------------------------------------------------------------ */
/*  Production Marketplace Component                                   */
/* ------------------------------------------------------------------ */
function ProductionMarketplace() {
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { user } = useAuth();

  const isAdmin = userRole === 'platform_admin' || userRole === 'owner_operator' || userRole === 'executive';

  /* ---- state ---- */
  const [activeSection, setActiveSection] = useState<'browse' | 'invite' | 'queue'>('browse');
  const [vendors, setVendors] = useState<DbVendor[]>([]);
  const [pendingVendors, setPendingVendors] = useState<DbVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ---- invite form ---- */
  const [inviteForm, setInviteForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    description: '',
    serviceCategory: '',
  });

  /* ---- fetch vendors ---- */
  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const { data: approved } = await supabase
        .from('marketplace_vendors')
        .select('*')
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setVendors((approved as DbVendor[]) || []);

      if (isAdmin) {
        const { data: pending } = await supabase
          .from('marketplace_vendors')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        setPendingVendors((pending as DbVendor[]) || []);
      }
    } catch {
      // silent fail — empty state will show
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  /* ---- filtered vendors ---- */
  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;
    const q = searchQuery.toLowerCase();
    return vendors.filter(
      v =>
        v.company_name.toLowerCase().includes(q) ||
        (v.description || '').toLowerCase().includes(q) ||
        (v.contact_name || '').toLowerCase().includes(q),
    );
  }, [vendors, searchQuery]);

  /* ---- invite submit ---- */
  const handleInvite = async () => {
    if (!inviteForm.companyName.trim() || !inviteForm.email.trim()) {
      toast.warning('Company name and email are required');
      return;
    }
    setSubmitting(true);
    try {
      const slug = inviteForm.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

      const { error } = await supabase.from('marketplace_vendors').insert({
        slug,
        company_name: inviteForm.companyName,
        contact_name: inviteForm.contactName || null,
        email: inviteForm.email,
        phone: inviteForm.phone || null,
        website: inviteForm.website || null,
        description: inviteForm.description || null,
        status: 'pending',
        is_active: false,
        invited_by_user_id: user?.id || null,
      });

      if (error) throw error;

      toast.success(`Invitation sent to ${inviteForm.companyName}`);
      setInviteForm({ companyName: '', contactName: '', email: '', phone: '', website: '', description: '', serviceCategory: '' });
      fetchVendors();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- approve/reject ---- */
  const handleApprove = async (vendorId: string) => {
    try {
      const { error } = await supabase
        .from('marketplace_vendors')
        .update({
          status: 'approved',
          is_active: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', vendorId);

      if (error) throw error;
      toast.success('Vendor approved');
      fetchVendors();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve vendor');
    }
  };

  const handleReject = async (vendorId: string) => {
    try {
      const { error } = await supabase
        .from('marketplace_vendors')
        .update({ status: 'rejected', rejection_reason: 'Does not meet requirements' })
        .eq('id', vendorId);

      if (error) throw error;
      toast.success('Vendor rejected');
      fetchVendors();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject vendor');
    }
  };

  /* ---- section tabs ---- */
  const sections: { id: typeof activeSection; label: string; icon: React.ElementType; show: boolean }[] = [
    { id: 'browse', label: 'Browse Vendors', icon: Search, show: true },
    { id: 'invite', label: 'Invite a Vendor', icon: UserPlus, show: true },
    { id: 'queue', label: `Approval Queue${pendingVendors.length > 0 ? ` (${pendingVendors.length})` : ''}`, icon: Shield, show: isAdmin },
  ];

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Vendor Marketplace' }]} />

      <div className="p-4 sm:p-6">
        {/* Hero */}
        <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-2xl p-6 sm:p-8 mb-6">
          <h1 className="text-2xl font-bold text-white">Vendor Marketplace</h1>
          <p className="text-sm text-white/80 mt-1">
            Find verified commercial kitchen service providers, invite new vendors, and manage approvals.
          </p>
          <div className="flex gap-6 mt-4">
            <span className="text-sm text-white/70"><span className="font-semibold text-white">{vendors.length}</span> Approved Vendors</span>
            {isAdmin && pendingVendors.length > 0 && (
              <span className="text-sm text-white/70"><span className="font-semibold text-amber-300">{pendingVendors.length}</span> Pending Approval</span>
            )}
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
          {sections.filter(s => s.show).map(sec => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm cursor-pointer transition-colors whitespace-nowrap min-h-[44px] ${
                  activeSection === sec.id ? 'border-b-2 font-semibold' : 'text-gray-500 hover:text-gray-700'
                }`}
                style={activeSection === sec.id ? { borderColor: '#d4af37', color: '#1e4d6b' } : undefined}
              >
                <Icon className="h-4 w-4" />
                {sec.label}
              </button>
            );
          })}
        </div>

        {/* ── Browse Vendors Section ── */}
        {activeSection === 'browse' && (
          <div>
            {/* Search */}
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white rounded-lg pl-10 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading vendors...</span>
              </div>
            ) : filteredVendors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredVendors.map(vendor => (
                  <div
                    key={vendor.id}
                    onClick={() => navigate(`/marketplace/vendor/${vendor.id}`)}
                    className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer overflow-hidden border-l-4"
                    style={{ borderLeftColor: tierBorderColor[vendor.tier] || '#3D5068' }}
                  >
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{vendor.company_name}</span>
                        <TierBadge tier={vendor.tier} />
                      </div>
                      {vendor.description && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{vendor.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {vendor.response_time_hours}h response
                        </span>
                        {vendor.service_area?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {vendor.service_area.slice(0, 2).join(', ')}
                            {vendor.service_area.length > 2 && ` +${vendor.service_area.length - 2}`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-sm font-medium" style={{ color: '#1e4d6b' }}>
                        View Profile <ChevronRight className="h-4 w-4 ml-0.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No approved vendors yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Invite vendors to get started with the marketplace.
                </p>
                <button
                  onClick={() => setActiveSection('invite')}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: '#1e4d6b' }}
                >
                  <UserPlus className="h-4 w-4" /> Invite a Vendor
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Invite a Vendor Section ── */}
        {activeSection === 'invite' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="h-5 w-5" style={{ color: '#1e4d6b' }} />
                <h2 className="text-lg font-bold text-gray-900">Invite a Vendor</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Invite a new service provider to join the EvidLY Marketplace. They will appear in the approval queue for review.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={inviteForm.companyName}
                    onChange={e => setInviteForm(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="e.g., Hood Cleaning Vendor"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={inviteForm.contactName}
                    onChange={e => setInviteForm(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="Primary contact"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={e => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="vendor@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={inviteForm.phone}
                      onChange={e => setInviteForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={inviteForm.website}
                      onChange={e => setInviteForm(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Category</label>
                  <select
                    value={inviteForm.serviceCategory}
                    onChange={e => setInviteForm(prev => ({ ...prev, serviceCategory: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20"
                  >
                    <option value="">Select category...</option>
                    <option value="Facility Safety">Facility Safety</option>
                    <option value="Food Safety">Food Safety</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Compliance">Compliance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={inviteForm.description}
                    onChange={e => setInviteForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of services offered..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setActiveSection('browse')}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium transition-colors min-h-[44px] disabled:opacity-50"
                  style={{ backgroundColor: '#1e4d6b' }}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Admin Approval Queue Section ── */}
        {activeSection === 'queue' && isAdmin && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5" style={{ color: '#1e4d6b' }} />
              <h2 className="text-lg font-bold text-gray-900">Approval Queue</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : pendingVendors.length > 0 ? (
              <div className="space-y-4">
                {pendingVendors.map(vendor => (
                  <div key={vendor.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{vendor.company_name}</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Pending
                          </span>
                        </div>
                        {vendor.contact_name && <p className="text-sm text-gray-600">Contact: {vendor.contact_name}</p>}
                        {vendor.email && <p className="text-sm text-gray-500">{vendor.email}</p>}
                        {vendor.phone && <p className="text-sm text-gray-500">{vendor.phone}</p>}
                        {vendor.description && <p className="text-sm text-gray-500 mt-2">{vendor.description}</p>}
                        <p className="text-xs text-gray-400 mt-2">
                          Submitted {new Date(vendor.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(vendor.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors min-h-[44px]"
                          style={{ backgroundColor: '#22c55e' }}
                        >
                          <CheckCircle className="h-4 w-4" /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(vendor.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors min-h-[44px]"
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <CheckCircle className="h-10 w-10 text-green-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No pending approvals</p>
                <p className="text-sm text-gray-500 mt-1">All vendor invitations have been reviewed.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function VendorMarketplace() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();

  /* ---- state ---- */
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<
    string | null
  >(null);
  const [tierFilter, setTierFilter] = useState<MarketplaceTier | 'all'>('all');
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'rating' | 'response-time' | 'reviews'>(
    'rating',
  );
  const [locationFilter, setLocationFilter] = useState<string>('');

  /* ---- smart recommendations ---- */
  const recommendations = getSmartRecommendations(existingVendors);

  /* ---- subcategories for the selected category ---- */
  const availableSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const cat = marketplaceCategories.find((c) => c.name === selectedCategory);
    return cat ? cat.subcategories : [];
  }, [selectedCategory]);

  /* ---- filtering & sorting ---- */
  const filteredVendors = useMemo(() => {
    let result: MarketplaceVendor[] = [...marketplaceVendors];

    // search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.companyName.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.subcategories.some((s) => s.toLowerCase().includes(q)),
      );
    }

    // category
    if (selectedCategory) {
      result = result.filter((v) => v.categories.includes(selectedCategory));
    }

    // subcategory
    if (selectedSubcategory) {
      result = result.filter((v) =>
        v.subcategories.includes(selectedSubcategory),
      );
    }

    // tier
    if (tierFilter !== 'all') {
      result = result.filter((v) => v.tier === tierFilter);
    }

    // rating
    if (ratingFilter > 0) {
      result = result.filter((v) => v.rating >= ratingFilter);
    }

    // location
    if (locationFilter) {
      const loc = locationFilter.toLowerCase();
      result = result.filter((v) =>
        v.serviceArea.some((area) => area.toLowerCase().includes(loc)),
      );
    }

    // sort
    if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'response-time') {
      result.sort((a, b) => a.responseTimeHours - b.responseTimeHours);
    } else if (sortBy === 'reviews') {
      result.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    return result;
  }, [
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    tierFilter,
    ratingFilter,
    sortBy,
  ]);

  if (!isDemoMode) {
    return <ProductionMarketplace />;
  }

  /* ---- whether any filter is active ---- */
  const hasActiveFilters =
    selectedSubcategory !== null ||
    tierFilter !== 'all' ||
    ratingFilter > 0 ||
    locationFilter !== '' ||
    sortBy !== 'rating';

  /* ---- clear filters ---- */
  const clearFilters = () => {
    setSelectedSubcategory(null);
    setTierFilter('all');
    setRatingFilter(0);
    setLocationFilter('');
    setSortBy('rating');
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Vendor Marketplace' },
        ]}
      />

      <div className="p-6">
        {/* -------------------------------------------------------- */}
        {/*  Hero Section                                             */}
        {/* -------------------------------------------------------- */}
        <div
          className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-2xl p-8 mb-6"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <h1 className="text-2xl font-bold text-white">Vendor Marketplace</h1>
          <p className="text-sm text-white/80 mt-1 mb-5">
            Find verified commercial kitchen service providers
          </p>

          {/* Search input */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors, services, or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white rounded-lg pl-10 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>

          {/* Stats row */}
          <div className="flex gap-6 mt-5">
            <span className="text-sm text-white/70">
              <span className="font-semibold text-white">15</span> Verified
              Providers
            </span>
            <span className="text-sm text-white/70">
              <span className="font-semibold text-white">4</span> Service
              Categories
            </span>
            <span className="text-sm text-white/70">
              <span className="font-semibold text-white">4.5</span> Avg Rating
            </span>
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Smart Recommendations                                    */}
        {/* -------------------------------------------------------- */}
        {recommendations.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-gray-900">
                Recommended for You
              </span>
            </div>
            <p className="text-sm text-amber-700 mb-4">
              Based on your upcoming and overdue vendor services
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recommendations.map(({ vendor, reason }) => (
                <div
                  key={vendor.slug}
                  className="bg-white rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/marketplace/${vendor.slug}`)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">
                      {vendor.companyName}
                    </span>
                    <TierBadge tier={vendor.tier} />
                  </div>
                  <p className="text-xs text-amber-700 mb-2">{reason}</p>
                  <StarRating rating={vendor.rating} count={vendor.reviewCount} />
                  <span
                    className="text-xs font-medium text-[#1e4d6b] mt-2 inline-block hover:underline"
                  >
                    View Profile &rarr;
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/*  Category Cards                                           */}
        {/* -------------------------------------------------------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {marketplaceCategories.map((cat) => {
            const isActive = selectedCategory === cat.name;
            const IconComponent = iconMap[cat.icon] || EvidlyIcon;
            const bgColor = categoryBgColors[cat.icon] || 'bg-gray-100 text-gray-600';

            return (
              <div
                key={cat.id}
                onClick={() => {
                  if (isActive) {
                    setSelectedCategory(null);
                    setSelectedSubcategory(null);
                  } else {
                    setSelectedCategory(cat.name);
                    setSelectedSubcategory(null);
                  }
                }}
                className={`bg-white rounded-xl p-5 cursor-pointer hover:shadow-md transition ${
                  isActive
                    ? 'border-2 border-[#d4af37] shadow-sm'
                    : 'border border-gray-200'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor} mb-3`}
                >
                  <IconComponent className="h-5 w-5" />
                </div>
                <p className="font-semibold text-gray-900">{cat.name}</p>
                <p className="text-xs text-gray-500">
                  {cat.subcategories.length} subcategories
                </p>
              </div>
            );
          })}
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Filter Bar                                               */}
        {/* -------------------------------------------------------- */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
            </div>

            {/* Subcategory dropdown */}
            <select
              value={selectedSubcategory || ''}
              onChange={(e) =>
                setSelectedSubcategory(e.target.value || null)
              }
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20"
            >
              <option value="">All Subcategories</option>
              {availableSubcategories.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>

            {/* Tier dropdown */}
            <select
              value={tierFilter}
              onChange={(e) =>
                setTierFilter(e.target.value as MarketplaceTier | 'all')
              }
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20"
            >
              <option value="all">All Tiers</option>
              <option value="verified">Verified</option>
              <option value="certified">Certified</option>
              <option value="preferred">Preferred</option>
            </select>

            {/* Rating dropdown */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(Number(e.target.value))}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20"
            >
              <option value={0}>Any Rating</option>
              <option value={4}>4+ Stars</option>
              <option value={4.5}>4.5+ Stars</option>
            </select>

            {/* Location filter */}
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="City or area..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="rounded-xl border border-gray-200 pl-8 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 w-36"
              />
            </div>

            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as 'rating' | 'response-time' | 'reviews',
                )
              }
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20"
            >
              <option value="rating">Highest Rated</option>
              <option value="response-time">Fastest Response</option>
              <option value="reviews">Most Reviews</option>
            </select>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-[#1e4d6b] hover:underline ml-auto"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Results Count                                            */}
        {/* -------------------------------------------------------- */}
        <p className="text-sm text-gray-600 mb-4">
          Showing {filteredVendors.length} provider
          {filteredVendors.length !== 1 ? 's' : ''}
          {selectedCategory ? ` in ${selectedCategory}` : ''}
        </p>

        {/* -------------------------------------------------------- */}
        {/*  Vendor Cards Grid                                        */}
        {/* -------------------------------------------------------- */}
        {filteredVendors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                onClick={() => navigate(`/marketplace/${vendor.slug}`)}
                className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer overflow-hidden border-l-4"
                style={{ borderLeftColor: tierBorderColor[vendor.tier] }}
              >
                <div className="p-5">
                  {/* Company name + tier */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">
                      {vendor.companyName}
                    </span>
                    <TierBadge tier={vendor.tier} />
                  </div>

                  {/* Star rating + reviews */}
                  <div className="mb-3">
                    <StarRating
                      rating={vendor.rating}
                      count={vendor.reviewCount}
                    />
                  </div>

                  {/* Category tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {vendor.subcategories.slice(0, 3).map((sub) => (
                      <span
                        key={sub}
                        className="bg-gray-100 rounded-full px-2 py-0.5 text-xs text-gray-600"
                      >
                        {sub}
                      </span>
                    ))}
                    {vendor.subcategories.length > 3 && (
                      <span className="bg-gray-100 rounded-full px-2 py-0.5 text-xs text-gray-600">
                        +{vendor.subcategories.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Response time + Service area */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {vendor.responseTimeHours}h response
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {vendor.serviceArea.slice(0, 2).join(', ')}
                      {vendor.serviceArea.length > 2 &&
                        ` +${vendor.serviceArea.length - 2}`}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                    {vendor.description}
                  </p>

                  {/* View Profile link */}
                  <div className="flex items-center text-sm font-medium text-[#1e4d6b] hover:text-[#163a52]">
                    View Profile
                    <ChevronRight className="h-4 w-4 ml-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* -------------------------------------------------------- */
          /*  Empty State                                              */
          /* -------------------------------------------------------- */
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">
              No vendors match your search criteria.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Try adjusting your filters or search terms.
            </p>
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/*  Vendor Claim CTA                                        */}
        {/* -------------------------------------------------------- */}
        <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-2xl p-6 sm:p-8 mt-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-[#d4af37]" />
                <h3 className="text-lg font-bold text-white">Are you a service provider?</h3>
              </div>
              <p className="text-sm text-white/80 max-w-lg">
                List your business on EvidLY Marketplace. Reach commercial kitchens looking for hood cleaning, facility safety, pest control, and more. Free listing available — upgrade anytime.
              </p>
            </div>
            <button
              onClick={() => navigate('/vendor/register')}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#d4af37] text-white rounded-lg text-sm font-semibold hover:bg-[#b8962f] transition-colors whitespace-nowrap"
            >
              Claim Your Listing <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
