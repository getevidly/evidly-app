import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { Breadcrumb } from '../components/Breadcrumb';
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
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function VendorMarketplace() {
  const navigate = useNavigate();

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
