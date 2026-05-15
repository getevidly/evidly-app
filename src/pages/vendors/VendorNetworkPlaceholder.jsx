import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, X as XIcon, ChevronDown, Check,
  Wind, Fan, Filter, ShieldCheck, FlameKindling, Bell, Droplets, FireExtinguisher,
  Droplet, Bug, ArrowDownUp, Thermometer, Wrench, Zap, Snowflake, Sparkles,
  Waves, Lock, Home, Settings, Trash2, Shirt, Maximize, TreePine, Flame,
  UtensilsCrossed,
} from 'lucide-react';
import { useVendorNetwork } from '../../hooks/useVendorNetwork';
import { VendorNetworkCard } from '../../components/vendors/VendorNetworkCard';
import { VendorContactModal } from '../../components/vendors/modals/VendorContactModal';
import { CA_COUNTIES_BY_REGION } from '../../data/californiaCounties';

// ── Service code → icon map ─────────────────────────────────────────────────

const SERVICE_ICON_MAP = {
  KEC: Wind, FPM: Fan, GFX: Filter, RGC: ShieldCheck,
  FS: FlameKindling, FA: Bell, SP: Droplets, FE: FireExtinguisher,
  GT: Droplet, PC: Bug, BFT: ArrowDownUp,
  HVAC: Thermometer, PLMB: Wrench, ELEC: Zap, REFR: Snowflake,
  JANI: Sparkles, PRES: Waves, LOCK: Lock, ROOF: Home,
  EQRP: Settings, WDSP: Trash2, LINN: Shirt, WINC: Maximize, LAND: TreePine,
};

// ── Tier pill color palettes ────────────────────────────────────────────────

const TIER_PILL_STYLES = {
  gold:   { bg: '#FAEEDA', text: '#633806', border: '#F0D9A8', activeBg: '#A08C5A', activeBorder: '#A08C5A', hoverBg: '#F5DFBF' },
  silver: { bg: '#F1EFE8', text: '#2C2C2A', border: '#D3D1C7', activeBg: '#5F5E5A', activeBorder: '#5F5E5A', hoverBg: '#E5E3DB' },
  bronze: { bg: '#FAECE7', text: '#4A1B0C', border: '#F0C4B3', activeBg: '#993C1D', activeBorder: '#993C1D', hoverBg: '#F5DDD5' },
};

// ── Service taxonomy (category → top-level pills, KEC children for drilldown) ─

const FIRE_SAFETY_TYPES = [
  { code: 'KEC', label: 'Hood Cleaning' },
  { code: 'FS', label: 'Fire Suppression' },
  { code: 'FA', label: 'Fire Alarm' },
  { code: 'SP', label: 'Fire Sprinkler' },
  { code: 'FE', label: 'Fire Extinguisher' },
];

const KEC_CHILDREN = [
  { code: 'FPM', label: 'Fan Performance' },
  { code: 'GFX', label: 'Filter Exchange' },
  { code: 'RGC', label: 'Rooftop Containment' },
];

const FOOD_SAFETY_TYPES = [
  { code: 'GT', label: 'Grease Trap' },
  { code: 'PC', label: 'Pest Control' },
  { code: 'BFT', label: 'Backflow Testing' },
];

const FACILITY_SERVICES_TYPES = [
  { code: 'HVAC', label: 'HVAC' },
  { code: 'PLMB', label: 'Plumbing' },
  { code: 'ELEC', label: 'Electrical' },
  { code: 'REFR', label: 'Refrigeration' },
  { code: 'JANI', label: 'Janitorial' },
  { code: 'PRES', label: 'Pressure Washing' },
  { code: 'LOCK', label: 'Locksmith' },
  { code: 'ROOF', label: 'Roofing' },
  { code: 'EQRP', label: 'Equipment Repair' },
  { code: 'WDSP', label: 'Waste Disposal' },
  { code: 'LINN', label: 'Linen' },
  { code: 'WINC', label: 'Window Cleaning' },
  { code: 'LAND', label: 'Landscaping' },
];

const TIER_OPTIONS = ['gold', 'silver', 'bronze'];

const SORT_OPTIONS = [
  { key: 'tier_gold_first', label: 'Tier' },
  { key: 'rating', label: 'Rating' },
  { key: 'newest', label: 'Newest' },
];

// ── Pill subcomponent ────────────────────────────────────────────────────────

function FilterPill({ label, active, onClick, icon: Icon, tierVariant, dotColor }) {
  const tier = tierVariant ? TIER_PILL_STYLES[tierVariant] : null;

  const baseBg = tier ? tier.bg : '#FFFFFF';
  const baseText = tier ? tier.text : '#1E2D4D';
  const baseBorder = tier ? `1px solid ${tier.border}` : '1px solid #E2DDD4';
  const activeBg = tier ? tier.activeBg : '#1E2D4D';
  const activeText = '#FAF7F0';
  const activeBorder = tier ? `1px solid ${tier.activeBorder}` : 'none';
  const hoverBg = tier ? tier.hoverBg : '#F4F1EA';

  const bg = active ? activeBg : baseBg;
  const color = active ? activeText : baseText;
  const border = active ? activeBorder : baseBorder;

  const handleMouseEnter = useCallback((e) => {
    if (active) {
      e.currentTarget.style.opacity = '0.92';
    } else {
      e.currentTarget.style.backgroundColor = hoverBg;
    }
  }, [active, hoverBg]);

  const handleMouseLeave = useCallback((e) => {
    e.currentTarget.style.opacity = '1';
    e.currentTarget.style.backgroundColor = bg;
  }, [bg]);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap"
      style={{
        fontSize: '11px',
        fontWeight: 500,
        backgroundColor: bg,
        color,
        border,
        transition: 'background-color 120ms ease, opacity 120ms ease',
      }}
    >
      {dotColor && (
        <span
          className="flex-shrink-0 rounded-full"
          style={{ width: 8, height: 8, backgroundColor: dotColor }}
        />
      )}
      {Icon && <Icon size={12} />}
      {label}
    </button>
  );
}

// ── Category section label ────────────────────────────────────────────────────

function CategoryLabel({ children, icon: Icon, iconColor }) {
  return (
    <span
      className="flex-shrink-0 inline-flex items-center gap-1.5"
      style={{
        fontSize: '10px',
        fontWeight: 500,
        color: '#5A6478',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      {Icon && <Icon size={14} style={{ color: iconColor || '#5A6478' }} />}
      {children}
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function VendorNetworkPlaceholder() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Modal state from URL params (for deep linking from notifications)
  const urlVendor = searchParams.get('vendor');
  const urlModal = searchParams.get('modal');

  const [search, setSearch] = useState('');
  const [county, setCounty] = useState('');
  const [serviceCodes, setServiceCodes] = useState([]);
  const [tierFilter, setTierFilter] = useState([]);
  const [credentials, setCredentials] = useState({ ikeca: false, nfpa: false, insured: false });
  const [availability, setAvailability] = useState('');
  const [sort, setSort] = useState({ key: 'tier_gold_first' });
  const [selectedVendorId, setSelectedVendorId] = useState(urlModal === 'contact' ? urlVendor : null);

  const filters = useMemo(() => ({
    search,
    county,
    serviceCodes,
    tier: tierFilter,
    credentials,
    availability,
  }), [search, county, serviceCodes, tierFilter, credentials, availability]);

  const { vendors, loading, error } = useVendorNetwork(filters, sort);

  const hasActiveFilters = search || county || serviceCodes.length > 0 || tierFilter.length > 0 ||
    credentials.ikeca || credentials.nfpa || credentials.insured || availability;

  const clearFilters = () => {
    setSearch('');
    setCounty('');
    setServiceCodes([]);
    setTierFilter([]);
    setCredentials({ ikeca: false, nfpa: false, insured: false });
    setAvailability('');
  };

  const handleViewVendor = (vendor) => {
    setSelectedVendorId(vendor.id);
  };

  const handleCloseModal = () => {
    setSelectedVendorId(null);
    // Clear URL params if they were set
    if (urlVendor || urlModal) {
      setSearchParams({});
    }
  };

  const toggleServiceCode = (code) => {
    setServiceCodes(prev => {
      if (prev.includes(code)) {
        // Deselecting — also remove any KEC children if deselecting KEC
        let next = prev.filter(c => c !== code);
        if (code === 'KEC') {
          next = next.filter(c => !['FPM', 'GFX', 'RGC'].includes(c));
        }
        return next;
      }
      return [...prev, code];
    });
  };

  const toggleKecChild = (code) => {
    setServiceCodes(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code);
      }
      return [...prev, code];
    });
  };

  const kecActive = serviceCodes.includes('KEC');
  const hasKecChild = serviceCodes.some(c => ['FPM', 'GFX', 'RGC'].includes(c));

  const toggleTier = (tier) => {
    setTierFilter(prev =>
      prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier]
    );
  };

  const toggleCredential = (key) => {
    setCredentials(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const showEmptyState = !loading && vendors.length === 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F1EA' }}>
      {/* Page header */}
      <div className="px-4 pt-5 pb-3">
        <p
          className="uppercase tracking-wider mb-1"
          style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#A08C5A' }}
        >
          Vendor network
        </p>
        <h1
          className="leading-tight"
          style={{ fontSize: '22px', fontWeight: 500, color: '#1E2D4D' }}
        >
          Vendor Network
        </h1>
      </div>

      {/* Filter bar */}
      <div className="px-4 pb-3">
        {/* Row 1: Search + Sort */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: '#5A6478' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors..."
              className="w-full pl-8 pr-3 py-2 rounded-md"
              style={{ fontSize: '12px', color: '#1E2D4D', border: '1px solid #E2DDD4', backgroundColor: '#FFFFFF', outline: 'none' }}
              onFocus={(e) => { e.target.style.borderColor = '#1E2D4D'; }}
              onBlur={(e) => { e.target.style.borderColor = '#E2DDD4'; }}
            />
          </div>
          <div className="relative">
            <select
              value={sort.key}
              onChange={(e) => setSort({ key: e.target.value })}
              className="appearance-none pl-3 pr-7 py-2 rounded-md"
              style={{ fontSize: '11px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #E2DDD4', backgroundColor: '#FFFFFF', outline: 'none' }}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#5A6478' }} />
          </div>
        </div>

        {/* Row 2: County dropdown */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-shrink-0">
            <select
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-full"
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: county ? '#FAF7F0' : '#1E2D4D',
                backgroundColor: county ? '#1E2D4D' : '#FFFFFF',
                border: county ? 'none' : '1px solid #E2DDD4',
              }}
            >
              <option value="">All counties</option>
              {Object.entries(CA_COUNTIES_BY_REGION).map(([region, counties]) => (
                <optgroup key={region} label={region}>
                  {counties.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: county ? '#FAF7F0' : '#5A6478' }} />
          </div>
        </div>

        {/* Row 3: Fire Safety category */}
        <div className="flex items-center gap-2 mb-2 overflow-x-auto">
          <CategoryLabel icon={Flame} iconColor="#A32D2D">Fire safety</CategoryLabel>
          {FIRE_SAFETY_TYPES.map(opt => (
            <FilterPill
              key={opt.code}
              label={opt.label}
              icon={SERVICE_ICON_MAP[opt.code]}
              active={serviceCodes.includes(opt.code)}
              onClick={() => toggleServiceCode(opt.code)}
            />
          ))}
        </div>

        {/* Hood Cleaning drilldown (only when KEC is active) */}
        {kecActive && (
          <div className="flex items-center gap-2 mb-2 overflow-x-auto pl-4">
            <span
              className="flex-shrink-0"
              style={{ fontSize: '10px', fontWeight: 500, color: '#5A6478' }}
            >
              Hood cleaning detail:
            </span>
            <FilterPill
              label="All hood cleaning"
              active={!hasKecChild}
              onClick={() => {
                // Deselect all children to go back to broad KEC match
                setServiceCodes(prev => prev.filter(c => !['FPM', 'GFX', 'RGC'].includes(c)));
              }}
            />
            {KEC_CHILDREN.map(opt => (
              <FilterPill
                key={opt.code}
                label={opt.label}
                icon={SERVICE_ICON_MAP[opt.code]}
                active={serviceCodes.includes(opt.code)}
                onClick={() => toggleKecChild(opt.code)}
              />
            ))}
          </div>
        )}

        {/* Row 4: Food Safety category */}
        <div className="flex items-center gap-2 mb-2 overflow-x-auto">
          <CategoryLabel icon={UtensilsCrossed} iconColor="#0F6E56">Food safety</CategoryLabel>
          {FOOD_SAFETY_TYPES.map(opt => (
            <FilterPill
              key={opt.code}
              label={opt.label}
              icon={SERVICE_ICON_MAP[opt.code]}
              active={serviceCodes.includes(opt.code)}
              onClick={() => toggleServiceCode(opt.code)}
            />
          ))}
        </div>

        {/* Row 5: Facility Services category */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto flex-wrap">
          <CategoryLabel icon={Wrench} iconColor="#5A6478">Facility</CategoryLabel>
          {FACILITY_SERVICES_TYPES.map(opt => (
            <FilterPill
              key={opt.code}
              label={opt.label}
              icon={SERVICE_ICON_MAP[opt.code]}
              active={serviceCodes.includes(opt.code)}
              onClick={() => toggleServiceCode(opt.code)}
            />
          ))}
        </div>

        {/* Row 6: Tier pills + Credentials checkboxes + Availability pills */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto">
          {TIER_OPTIONS.map(tier => (
            <FilterPill
              key={tier}
              label={tier.charAt(0).toUpperCase() + tier.slice(1)}
              active={tierFilter.includes(tier)}
              onClick={() => toggleTier(tier)}
              tierVariant={tier}
            />
          ))}
          <span style={{ fontSize: '10px', color: '#5A6478', margin: '0 4px' }}>|</span>
          {['ikeca', 'nfpa', 'insured'].map(key => (
            <FilterPill
              key={key}
              label={key.toUpperCase()}
              icon={Check}
              active={credentials[key]}
              onClick={() => toggleCredential(key)}
            />
          ))}
          <span style={{ fontSize: '10px', color: '#5A6478', margin: '0 4px' }}>|</span>
          <FilterPill
            label="Available"
            active={availability === 'available'}
            onClick={() => setAvailability(availability === 'available' ? '' : 'available')}
            dotColor="#2E7D32"
          />
          <FilterPill
            label="Wait list"
            active={availability === 'wait_list'}
            onClick={() => setAvailability(availability === 'wait_list' ? '' : 'wait_list')}
            dotColor="#B45309"
          />
        </div>

        {/* Result count + Clear */}
        {!loading && !showEmptyState && (
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: '11px', color: '#5A6478' }}>
              Showing {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-2 py-1 rounded"
                style={{ fontSize: '10px', color: '#5A6478' }}
              >
                <XIcon size={10} /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-24">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-[#1E2D4D] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div
            className="bg-white rounded-lg px-4 py-3"
            style={{ border: '1px solid #E2DDD4' }}
          >
            <p style={{ fontSize: '12px', color: '#dc2626' }}>{error}</p>
          </div>
        )}

        {/* Vendor cards */}
        {!loading && !error && vendors.length > 0 && (
          <div className="flex flex-col gap-2">
            {vendors.map(vendor => (
              <VendorNetworkCard
                key={vendor.id}
                vendor={vendor}
                onView={handleViewVendor}
              />
            ))}
          </div>
        )}

        {/* Empty state = explainer card */}
        {showEmptyState && !error && (
          <div
            className="bg-white rounded-lg px-4 py-4"
            style={{ border: '1px solid #E2DDD4' }}
          >
            <p style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
              Vendor Network is the directory of pre-vetted commercial kitchen
              service vendors that kitchen leaders can hire from with confidence.
            </p>
            <p className="mt-3.5" style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
              Every vendor in the directory has been screened — insurance current,
              IKECA and NFPA certifications verified, county-specific
              credentials confirmed, references checked. When you need a hood
              cleaner in Fresno, a pest control partner in Stockton, or a grease
              collection vendor anywhere in California, this is where you'll find
              them. No cold-calling. No license verification. No wondering whether
              they'll show up.
            </p>
            <p className="mt-3.5" style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
              We're opening the directory in waves. Founder customers get early
              access — we'll notify you when the first wave is live in your region.
            </p>
          </div>
        )}
      </div>

      {/* Contact modal */}
      <VendorContactModal
        isOpen={!!selectedVendorId}
        onClose={handleCloseModal}
        vendorId={selectedVendorId}
      />
    </div>
  );
}
