/**
 * CPP-VENDOR-CONNECT-01 — Vendor Connect Marketplace
 * Route: /vendor-connect (inside ProtectedLayout)
 *
 * Shows CPP-vetted Vendor Connect partners.
 * Filters: service type + county.
 * Empty state in demo mode (no fake data per CLAUDE.md).
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, Award, ExternalLink, Phone, Mail, Filter } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { PartnerBadge } from '../components/vendor/PartnerBadge';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';

const SERVICE_FILTERS = [
  { value: 'all', label: 'All Services' },
  { value: 'hood_cleaning', label: 'Hood Cleaning' },
  { value: 'fire_suppression', label: 'Fire Suppression' },
  { value: 'grease_management', label: 'Grease Management' },
  { value: 'pest_control', label: 'Pest Control' },
];

export function VendorConnect() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [partners, setPartners] = useState([]);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(!isDemoMode);
  const [serviceFilter, setServiceFilter] = useState('all');
  const [countyFilter, setCountyFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isDemoMode) return;
    fetchPartners();
    fetchSpots();
  }, [isDemoMode]);

  async function fetchPartners() {
    setLoading(true);
    const { data } = await supabase
      .from('vendor_connect_profiles')
      .select('*')
      .eq('is_active', true)
      .eq('application_status', 'approved')
      .order('performance_score', { ascending: false });
    setPartners(data || []);
    setLoading(false);
  }

  async function fetchSpots() {
    const { data } = await supabase
      .from('vendor_connect_spots')
      .select('*')
      .order('county');
    setSpots(data || []);
  }

  // Filter partners
  const filtered = partners.filter(p => {
    if (serviceFilter !== 'all' && !(p.service_types || []).includes(serviceFilter)) return false;
    if (countyFilter !== 'all' && p.primary_county !== countyFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (p.company_name || '').toLowerCase().includes(q)
        || (p.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Unique counties from spots
  const counties = [...new Set(spots.map(s => s.county))].sort();

  function getSpotInfo(county, serviceType) {
    const spot = spots.find(s => s.county === county && s.service_type === serviceType);
    if (!spot) return null;
    return { remaining: spot.max_spots - spot.filled_spots, max: spot.max_spots };
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Vendor Connect' }]} />

      <div className="space-y-6">
        {/* Hero */}
        <div className="rounded-xl p-6" style={{ background: '#1E2D4D' }}>
          <div
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: '#A08C5A' }}
          >
            VENDOR CONNECT — BY INVITATION ONLY
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            CPP-Verified service providers for your kitchen
          </h1>
          <p className="text-gray-400 text-sm max-w-xl">
            Every vendor here has been vetted by Cleaning Pros Plus.
            Their certs are current. Their work is tracked. You can trust them.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search partners..."
              className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-[#A08C5A] focus:border-transparent"
            />
          </div>
          <select
            value={serviceFilter}
            onChange={e => setServiceFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#A08C5A]"
          >
            {SERVICE_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            value={countyFilter}
            onChange={e => setCountyFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#A08C5A]"
          >
            <option value="all">All Counties</option>
            {counties.map(c => (
              <option key={c} value={c}>{c} County</option>
            ))}
          </select>
        </div>

        {/* Partner Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading partners...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-gray-200 rounded-xl">
            <div className="w-14 h-14 rounded-full bg-[#FAF7F0] flex items-center justify-center mx-auto mb-4 text-2xl">
              🤝
            </div>
            <h3 className="text-sm font-semibold text-[#1E2D4D] mb-2">No Vendor Connect partners yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
              {isDemoMode
                ? 'Vendor Connect partners appear here when CPP-vetted vendors join the program.'
                : 'CPP-vetted service providers will appear here as they join the program.'}
            </p>
            <p className="text-xs text-gray-400">
              Are you a service provider?{' '}
              <button
                onClick={() => navigate('/vendor-connect/apply')}
                className="font-semibold underline"
                style={{ color: '#A08C5A' }}
              >
                Apply to join
              </button>
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map(partner => {
              const spotInfo = partner.primary_county
                ? getSpotInfo(partner.primary_county, (partner.service_types || [])[0])
                : null;

              return (
                <div
                  key={partner.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      {partner.logo_url ? (
                        <img
                          src={partner.logo_url}
                          alt={partner.company_name}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-100"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold"
                          style={{ background: '#1E2D4D' }}
                        >
                          {(partner.company_name || '?')[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-[#1E2D4D] truncate">{partner.company_name}</h3>
                        <PartnerBadge tier={partner.partner_tier} size="sm" />
                      </div>
                      {partner.performance_score != null && (
                        <div className="text-center flex-shrink-0">
                          <div
                            className="text-lg font-bold"
                            style={{ color: partner.performance_score >= 90 ? '#16a34a' : partner.performance_score >= 70 ? '#d97706' : '#dc2626' }}
                          >
                            {Math.round(partner.performance_score)}
                          </div>
                          <div className="text-xs text-gray-400 uppercase">Score</div>
                        </div>
                      )}
                    </div>

                    {partner.tagline && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{partner.tagline}</p>
                    )}

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(partner.service_types || []).map(st => (
                        <span
                          key={st}
                          className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700"
                        >
                          {st.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {partner.ikeca_certified && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">
                          IKECA
                        </span>
                      )}
                    </div>

                    {partner.primary_county && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                        <MapPin className="w-3 h-3" />
                        <span>{partner.primary_county} County</span>
                        {spotInfo && (
                          <span className="ml-2 text-xs font-medium" style={{ color: '#A08C5A' }}>
                            {spotInfo.remaining} of {spotInfo.max} spots remaining
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => navigate(`/vendors?tab=requests&action=new`)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-white text-xs font-semibold rounded-lg transition-colors"
                        style={{ background: '#1E2D4D' }}
                      >
                        Request Service
                      </button>
                      {partner.phone && (
                        <a
                          href={`tel:${partner.phone}`}
                          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <Phone className="w-3.5 h-3.5 text-gray-500" />
                        </a>
                      )}
                      {partner.email && (
                        <a
                          href={`mailto:${partner.email}`}
                          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <Mail className="w-3.5 h-3.5 text-gray-500" />
                        </a>
                      )}
                      {partner.website && (
                        <a
                          href={partner.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
