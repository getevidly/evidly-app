import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, Clock, MapPin, Shield, ShieldCheck, Award,
  Phone, Mail, Globe, CheckCircle, XCircle, Calendar, MessageSquare,
  Users, TrendingUp, Building2, Send, ChevronDown,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  marketplaceVendors, marketplaceReviews, locations,
  type MarketplaceVendor, type MarketplaceReview, type MarketplaceTier,
} from '../data/demoData';

// ── Helper: Tier Badge ──────────────────────────────────────────
function TierBadge({ tier }: { tier: MarketplaceTier }) {
  const config: Record<MarketplaceTier, { bg: string; text: string; border: string; icon: typeof Shield; label: string }> = {
    verified:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  icon: ShieldCheck, label: 'Verified'  },
    certified: { bg: 'bg-gray-100',  text: 'text-gray-700',   border: 'border-gray-200',   icon: Shield,      label: 'Certified' },
    preferred: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: Award,       label: 'Preferred' },
  };
  const c = config[tier];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

// ── Helper: Star Rating ─────────────────────────────────────────
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const starSize = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  const textSize = size === 'lg' ? 'text-xl' : 'text-sm';
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      <span className={`font-bold ${textSize}`} style={{ color: '#1e4d6b' }}>{rating.toFixed(1)}</span>
      <div className="flex items-center">
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`f-${i}`} className={starSize} fill="#d4af37" stroke="#d4af37" />
        ))}
        {hasHalf && (
          <Star key="half" className={`${starSize} text-gray-300`} fill="#d4af37" stroke="#d4af37" style={{ clipPath: 'inset(0 50% 0 0)' }} />
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star key={`e-${i}`} className={`${starSize} text-gray-300`} />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────
export function VendorProfile() {
  const { vendorSlug } = useParams<{ vendorSlug: string }>();
  const navigate = useNavigate();

  const vendor = marketplaceVendors.find(v => v.slug === vendorSlug);
  const vendorReviews = useMemo(
    () => marketplaceReviews.filter(r => r.vendorSlug === vendorSlug),
    [vendorSlug],
  );

  const [activeTab, setActiveTab] = useState<'about' | 'credentials' | 'reviews' | 'services'>('about');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    serviceType: '',
    location: '',
    preferredDates: '',
    description: '',
    urgency: 'Normal',
  });

  // ── Not found ───────────────────────────────────────────────
  if (!vendor) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Vendor not found</h2>
        <p className="text-gray-600 mb-4">The vendor you are looking for does not exist or has been removed.</p>
        <button
          onClick={() => navigate('/marketplace')}
          className="inline-flex items-center gap-1 text-sm font-medium px-4 py-2 rounded-lg"
          style={{ color: '#1e4d6b' }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </button>
      </div>
    );
  }

  // ── Tab definitions ─────────────────────────────────────────
  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'about', label: 'About' },
    { id: 'credentials', label: 'Credentials' },
    { id: 'reviews', label: `Reviews (${vendorReviews.length})` },
    { id: 'services', label: 'Services' },
  ];

  // ── Helpers ─────────────────────────────────────────────────
  const serviceAreaDisplay = vendor.serviceArea.length > 3
    ? [...vendor.serviceArea.slice(0, 3), '...'].join(', ')
    : vendor.serviceArea.join(', ');

  function rateColor(value: number) {
    if (value >= 90) return 'bg-green-500';
    if (value >= 80) return 'bg-amber-500';
    return 'bg-red-500';
  }

  function isExpired(dateStr: string) {
    return new Date(dateStr) < new Date();
  }

  // Star‐breakdown for Reviews tab
  const starBreakdown = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    vendorReviews.forEach(r => {
      const rounded = Math.round(r.rating);
      if (counts[rounded] !== undefined) counts[rounded]++;
    });
    return counts;
  }, [vendorReviews]);

  // ── Modal submit ────────────────────────────────────────────
  function handleSubmitRequest() {
    alert(
      'Service request submitted to ' + vendor!.companyName +
      '. They typically respond within ' + vendor!.responseTimeHours + ' hours.',
    );
    setShowRequestModal(false);
    setRequestForm({ serviceType: '', location: '', preferredDates: '', description: '', urgency: 'Normal' });
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Marketplace', href: '/marketplace' },
        { label: vendor.companyName },
      ]} />

      <div className="p-6 max-w-5xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => navigate('/marketplace')}
          className="flex items-center gap-1 text-sm hover:underline mb-4"
          style={{ color: '#1e4d6b' }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </button>

        {/* ─── Profile Header ──────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          {/* Top row */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            {/* Left */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
                <Building2 className="h-8 w-8" style={{ color: '#1e4d6b' }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{vendor.companyName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <TierBadge tier={vendor.tier} />
                </div>
                <div className="mt-1">
                  <StarRating rating={vendor.rating} size="lg" />
                  <span className="text-sm text-gray-500 ml-1">({vendor.reviewCount} reviews)</span>
                </div>
              </div>
            </div>

            {/* Right — CTA buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRequestModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
                style={{ backgroundColor: '#1e4d6b' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#163a52')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
              >
                <Send className="h-4 w-4" /> Request Quote
              </button>
              <button
                onClick={() => alert('Messaging feature coming soon.')}
                className="flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="h-4 w-4" /> Message Vendor
              </button>
            </div>
          </div>

          {/* Info row */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
            <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{vendor.yearsInBusiness} years in business</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Responds in ~{vendor.responseTimeHours} hours</span>
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{serviceAreaDisplay}</span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" />{vendor.kitchensServed} kitchens served</span>
          </div>

          {/* Contact row */}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
            <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{vendor.phone}</span>
            {vendor.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{vendor.email}</span>}
            {vendor.website && <span className="flex items-center gap-1"><Globe className="h-4 w-4" />{vendor.website}</span>}
          </div>
        </div>

        {/* ─── Tab Navigation ──────────────────────────────── */}
        <div className="flex border-b border-gray-200 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === tab.id ? { borderColor: '#d4af37', color: '#1e4d6b' } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* ABOUT TAB                                          */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === 'about' && (
          <div>
            {/* Description */}
            <p className="text-gray-700 leading-relaxed">{vendor.description}</p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {/* Total Services */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <TrendingUp className="h-5 w-5 mx-auto mb-1" style={{ color: '#1e4d6b' }} />
                <div className="text-2xl font-bold text-gray-900">{vendor.totalServices}</div>
                <div className="text-xs text-gray-500">Total Services</div>
              </div>

              {/* On-Time Rate */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{vendor.onTimeRate}%</div>
                <div className="text-xs text-gray-500 mb-2">On-Time Rate</div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${rateColor(vendor.onTimeRate)}`} style={{ width: `${vendor.onTimeRate}%` }} />
                </div>
              </div>

              {/* Doc Upload Rate */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{vendor.docUploadRate}%</div>
                <div className="text-xs text-gray-500 mb-2">Doc Upload Rate</div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${rateColor(vendor.docUploadRate)}`} style={{ width: `${vendor.docUploadRate}%` }} />
                </div>
              </div>

              {/* Avg Rating */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{vendor.rating.toFixed(1)}</div>
                <div className="text-xs text-gray-500 mb-1">Avg Rating</div>
                <div className="flex justify-center">
                  <StarRating rating={vendor.rating} />
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {vendor.categories.map(cat => (
                  <span key={cat} className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>
                    {cat}
                  </span>
                ))}
                {vendor.subcategories.map(sub => (
                  <span key={sub} className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>
                    {sub}
                  </span>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {vendor.languages.map(lang => (
                  <span key={lang} className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {/* Service Area */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <MapPin className="h-4 w-4" /> Service Area
              </h3>
              <div className="flex flex-wrap gap-2">
                {vendor.serviceArea.map(city => (
                  <span key={city} className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>
                    {city}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* CREDENTIALS TAB                                    */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === 'credentials' && (
          <div>
            {/* Verified banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <Award className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">All credentials have been independently verified by EvidLY</p>
            </div>

            {/* Insurance Coverage */}
            <h3 className="text-base font-semibold text-gray-900 mb-3">Insurance Coverage</h3>
            <div className="space-y-3 mb-6">
              {vendor.insurance.map((ins, idx) => {
                const expired = isExpired(ins.expirationDate);
                return (
                  <div key={idx} className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4">
                    {ins.verified
                      ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{ins.type}</div>
                      <div className="text-xs text-gray-500">Expires {ins.expirationDate}</div>
                    </div>
                    {expired ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">Expired</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Current</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Certifications & Licenses */}
            <h3 className="text-base font-semibold text-gray-900 mb-3">Certifications &amp; Licenses</h3>
            <div className="space-y-3">
              {vendor.certifications.map((cert, idx) => {
                const expired = cert.expirationDate ? isExpired(cert.expirationDate) : false;
                return (
                  <div key={idx} className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4">
                    {cert.verified
                      ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{cert.name}</div>
                      {cert.expirationDate && (
                        <div className="text-xs text-gray-500">Expires {cert.expirationDate}</div>
                      )}
                    </div>
                    {cert.expirationDate ? (
                      expired ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">Expired</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Current</span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Current</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* REVIEWS TAB                                        */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === 'reviews' && (
          <div>
            {/* Rating Summary */}
            <div className="flex items-center gap-8 mb-6 flex-wrap">
              {/* Left — overall */}
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900">{vendor.rating.toFixed(1)}</div>
                <StarRating rating={vendor.rating} size="lg" />
                <p className="text-sm text-gray-500 mt-1">based on {vendorReviews.length} reviews</p>
              </div>

              {/* Right — star breakdown bars */}
              <div className="flex-1 min-w-[200px] space-y-1">
                {[5, 4, 3, 2, 1].map(starLevel => {
                  const count = starBreakdown[starLevel] || 0;
                  const pct = vendorReviews.length > 0 ? (count / vendorReviews.length) * 100 : 0;
                  return (
                    <div key={starLevel} className="flex items-center gap-2 text-sm">
                      <span className="w-3 text-gray-600 text-right">{starLevel}</span>
                      <Star className="h-3.5 w-3.5" fill="#d4af37" stroke="#d4af37" />
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#d4af37' }} />
                      </div>
                      <span className="w-5 text-gray-500 text-xs">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Write a Review button */}
            <div className="mb-6">
              <button
                onClick={() => alert('Reviews can only be submitted after a completed service.')}
                className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="h-4 w-4" /> Write a Review
              </button>
            </div>

            {/* Review cards */}
            <div className="space-y-4">
              {vendorReviews.map(review => (
                <div key={review.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-900">{review.reviewerName}</span>
                      <span className="text-gray-500 text-sm ml-2">{review.reviewerOrg}</span>
                    </div>
                    <span className="text-xs text-gray-400">{review.date}</span>
                  </div>

                  {/* Stars + service type */}
                  <div className="flex items-center gap-3 mt-1">
                    <StarRating rating={review.rating} />
                    <span className="bg-gray-100 rounded-full px-2 py-0.5 text-xs text-gray-600">{review.serviceType}</span>
                  </div>

                  {/* Text */}
                  <p className="text-sm text-gray-700 mt-2">{review.text}</p>

                  {/* Vendor response */}
                  {review.vendorResponse && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <span className="text-xs font-semibold text-gray-500">Vendor Response</span>
                      <p className="text-sm text-gray-600 mt-1">{review.vendorResponse}</p>
                    </div>
                  )}
                </div>
              ))}

              {vendorReviews.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">No reviews yet for this vendor.</p>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* SERVICES TAB                                       */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            {vendor.serviceOfferings.map((offering, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900">{offering.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{offering.description}</p>

                {/* Frequency tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {offering.frequencyOptions.map(freq => (
                    <span key={freq} className="rounded-full px-3 py-1 text-xs" style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>
                      {freq}
                    </span>
                  ))}
                </div>

                {/* Pricing */}
                <div className="mt-2">
                  {offering.pricingDisplay === 'Request Quote' ? (
                    <span className="text-sm font-semibold" style={{ color: '#1e4d6b' }}>{offering.pricingDisplay}</span>
                  ) : (
                    <span className="text-sm font-semibold text-gray-900">{offering.pricingDisplay}</span>
                  )}
                </div>

                {/* Request Quote button */}
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#1e4d6b' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#163a52')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
                >
                  <Send className="h-3.5 w-3.5" /> Request Quote
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SERVICE REQUEST MODAL                                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Request Quote from {vendor.companyName}
            </h2>

            {/* Service Type */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
            <select
              value={requestForm.serviceType}
              onChange={e => setRequestForm(prev => ({ ...prev, serviceType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] mb-4"
            >
              <option value="">Select a service...</option>
              {vendor.serviceOfferings.map(s => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>

            {/* Location */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              value={requestForm.location}
              onChange={e => setRequestForm(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] mb-4"
            >
              <option value="">Select a location...</option>
              {locations.map(l => (
                <option key={l.id} value={l.name}>{l.name}</option>
              ))}
            </select>

            {/* Preferred Dates */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Dates</label>
            <input
              type="text"
              value={requestForm.preferredDates}
              onChange={e => setRequestForm(prev => ({ ...prev, preferredDates: e.target.value }))}
              placeholder="e.g., Next week, March 1-5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] mb-4"
            />

            {/* Description */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={requestForm.description}
              onChange={e => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your needs..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] mb-4"
            />

            {/* Urgency */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
            <select
              value={requestForm.urgency}
              onChange={e => setRequestForm(prev => ({ ...prev, urgency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] mb-6"
            >
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Emergency">Emergency</option>
            </select>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRequest}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#1e4d6b' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#163a52')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
