import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  Camera, Search, Filter, MapPin, Clock, Calendar, ChevronDown,
  X, ChevronLeft, ChevronRight, Download, Image, CheckCircle,
  Thermometer, ClipboardCheck, AlertTriangle, Truck, Wrench, Shield,
  FileText, Eye,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import type { PhotoRecord } from '../components/PhotoEvidence';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RecordType =
  | 'Temperature Log'
  | 'Checklist'
  | 'Incident'
  | 'Vendor Delivery'
  | 'Equipment'
  | 'Self Audit'
  | 'General';

type LocationName =
  | 'Downtown Kitchen'
  | 'Airport Terminal'
  | 'University Dining';

type DateRange = '7' | '30' | '90' | 'all';

interface GalleryPhoto extends PhotoRecord {
  recordType: RecordType;
  location: LocationName;
  verified: boolean;
  description: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOCATIONS: LocationName[] = ['Downtown Kitchen', 'Airport Terminal', 'University Dining'];

const RECORD_TYPES: RecordType[] = [
  'Temperature Log', 'Checklist', 'Incident', 'Vendor Delivery',
  'Equipment', 'Self Audit', 'General',
];

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 90 Days', value: '90' },
  { label: 'All Time', value: 'all' },
];

const RECORD_TYPE_COLORS: Record<RecordType, { bg: string; text: string }> = {
  'Temperature Log': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Checklist':       { bg: 'bg-green-100', text: 'text-green-700' },
  'Incident':        { bg: 'bg-red-100', text: 'text-red-700' },
  'Vendor Delivery': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'Equipment':       { bg: 'bg-orange-100', text: 'text-orange-700' },
  'Self Audit':      { bg: 'bg-amber-100', text: 'text-amber-700' },
  'General':         { bg: 'bg-gray-100', text: 'text-gray-700' },
};

const RECORD_TYPE_ICONS: Record<RecordType, React.ReactNode> = {
  'Temperature Log': <Thermometer className="h-3 w-3" />,
  'Checklist':       <ClipboardCheck className="h-3 w-3" />,
  'Incident':        <AlertTriangle className="h-3 w-3" />,
  'Vendor Delivery': <Truck className="h-3 w-3" />,
  'Equipment':       <Wrench className="h-3 w-3" />,
  'Self Audit':      <Shield className="h-3 w-3" />,
  'General':         <FileText className="h-3 w-3" />,
};

const LOCATION_COLORS: Record<LocationName, string> = {
  'Downtown Kitchen': 'bg-[#eef4f8] text-[#1e4d6b]',
  'Airport Terminal':  'bg-amber-50 text-amber-700',
  'University Dining': 'bg-emerald-50 text-emerald-700',
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 10) + 7, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// Generate a placeholder image using canvas with a color and text label
function generatePlaceholderImage(
  color: string, label: string, sublabel: string, w = 320, h = 320,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, color);
  grad.addColorStop(1, adjustBrightness(color, -30));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle grid overlay
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 20) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
  }
  for (let i = 0; i < h; i += 20) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
  }

  // Icon circle
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 - 20, 48, 0, Math.PI * 2);
  ctx.fill();

  // Camera icon placeholder (simple)
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(w / 2 - 20, h / 2 - 34, 40, 28);
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 - 20, 10, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();

  // Label text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "DM Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, w / 2, h / 2 + 30);

  // Sublabel
  ctx.font = '12px "DM Sans", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(sublabel, w / 2, h / 2 + 52);

  // Timestamp bar at bottom
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, h - 28, w, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px "DM Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Photo Evidence', 8, h - 10);

  return canvas.toDataURL('image/jpeg', 0.85);
}

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ---------------------------------------------------------------------------
// Demo Photo Data Generator
// ---------------------------------------------------------------------------

function generateDemoPhotos(): GalleryPhoto[] {
  const sfCoords: { lat: number; lng: number; address: string }[] = [
    { lat: 37.7749, lng: -122.4194, address: 'Market St, San Francisco' },
    { lat: 37.7849, lng: -122.4094, address: 'Union Square, San Francisco' },
    { lat: 37.7649, lng: -122.4294, address: 'Castro St, San Francisco' },
    { lat: 37.7949, lng: -122.3934, address: 'Embarcadero, San Francisco' },
    { lat: 37.7549, lng: -122.4494, address: 'Sunset District, San Francisco' },
    { lat: 37.7699, lng: -122.4134, address: 'SoMa, San Francisco' },
    { lat: 37.8049, lng: -122.4094, address: 'North Beach, San Francisco' },
    { lat: 37.7599, lng: -122.4334, address: 'Noe Valley, San Francisco' },
    { lat: 37.7899, lng: -122.4014, address: 'Financial District, San Francisco' },
    { lat: 37.7449, lng: -122.4194, address: 'Glen Park, San Francisco' },
    { lat: 37.7799, lng: -122.3894, address: 'Mission Bay, San Francisco' },
    { lat: 37.8019, lng: -122.4184, address: 'Fisherman\'s Wharf, San Francisco' },
  ];

  const definitions: {
    label: string; sublabel: string; color: string;
    recordType: RecordType; location: LocationName; daysBack: number;
    description: string; verified: boolean;
  }[] = [
    // 3 Temperature Logs
    { label: 'Walk-in Cooler', sublabel: '38°F Reading', color: '#2563eb',
      recordType: 'Temperature Log', location: 'Downtown Kitchen', daysBack: 1,
      description: 'Walk-in cooler temperature reading at 38°F — within safe range',
      verified: true },
    { label: 'Prep Table', sublabel: '41°F Surface Temp', color: '#3b82f6',
      recordType: 'Temperature Log', location: 'Airport Terminal', daysBack: 3,
      description: 'Prep table surface temperature check during morning shift',
      verified: true },
    { label: 'Hot Hold Station', sublabel: '157°F Verified', color: '#1d4ed8',
      recordType: 'Temperature Log', location: 'University Dining', daysBack: 5,
      description: 'Hot holding station temperature verification — chicken entree',
      verified: true },
    // 3 Checklists
    { label: 'Cleaning Completed', sublabel: 'End of Shift', color: '#16a34a',
      recordType: 'Checklist', location: 'Downtown Kitchen', daysBack: 2,
      description: 'End-of-shift deep cleaning — all surfaces sanitized and documented',
      verified: true },
    { label: 'Hand Wash Station', sublabel: 'Soap & Towels Stocked', color: '#22c55e',
      recordType: 'Checklist', location: 'Airport Terminal', daysBack: 4,
      description: 'Hand wash station fully stocked — soap, paper towels, signage visible',
      verified: false },
    { label: 'Floor Drain', sublabel: 'Cleaned & Inspected', color: '#15803d',
      recordType: 'Checklist', location: 'University Dining', daysBack: 7,
      description: 'Floor drain cleaning and inspection — no blockages found',
      verified: true },
    // 2 Incidents
    { label: 'Grease Spill', sublabel: 'Kitchen Line Area', color: '#dc2626',
      recordType: 'Incident', location: 'Downtown Kitchen', daysBack: 6,
      description: 'Grease spill near fryer station — cleaned and area cordoned off within 5 mins',
      verified: true },
    { label: 'Broken Tile', sublabel: 'Walk-in Entrance', color: '#ef4444',
      recordType: 'Incident', location: 'Airport Terminal', daysBack: 12,
      description: 'Cracked floor tile at walk-in cooler entrance — maintenance ticket filed',
      verified: false },
    // 2 Vendor Deliveries
    { label: 'Receiving Inspection', sublabel: 'Produce Delivery', color: '#7c3aed',
      recordType: 'Vendor Delivery', location: 'Downtown Kitchen', daysBack: 2,
      description: 'Fresh produce delivery from Bay Area Farms — temp verified at 39°F',
      verified: true },
    { label: 'Receiving Inspection', sublabel: 'Meat & Poultry', color: '#8b5cf6',
      recordType: 'Vendor Delivery', location: 'University Dining', daysBack: 8,
      description: 'Meat delivery from Pacific Provisions — internal temp 34°F, packaging intact',
      verified: true },
    // 1 Equipment
    { label: 'Walk-in Cooler', sublabel: 'Door Seal Check', color: '#ea580c',
      recordType: 'Equipment', location: 'Downtown Kitchen', daysBack: 10,
      description: 'Walk-in cooler door gasket inspection — seal intact, no condensation',
      verified: true },
    // 1 Self Audit
    { label: 'Fire Extinguisher', sublabel: 'Monthly Check', color: '#d97706',
      recordType: 'Self Audit', location: 'Airport Terminal', daysBack: 14,
      description: 'Fire extinguisher monthly inspection — pressure gauge green, tag current',
      verified: true },
  ];

  return definitions.map((def, idx) => {
    const ts = daysAgo(def.daysBack);
    const coord = sfCoords[idx % sfCoords.length];
    return {
      id: `demo-photo-${idx + 1}`,
      dataUrl: generatePlaceholderImage(def.color, def.label, def.sublabel),
      timestamp: ts.toISOString(),
      displayTime: formatTimestamp(ts),
      lat: coord.lat,
      lng: coord.lng,
      address: coord.address,
      recordType: def.recordType,
      location: def.location,
      verified: def.verified,
      description: def.description,
    };
  });
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PhotoEvidencePage() {
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  // Filters
  const [locationFilter, setLocationFilter] = useState<LocationName | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<RecordType | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [searchQuery, setSearchQuery] = useState('');

  // Lightbox
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Touch swipe
  const touchStartX = useRef<number | null>(null);

  // Photo data
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);

  useEffect(() => {
    if (isDemoMode) {
      setPhotos(generateDemoPhotos());
    }
    // TODO: Production — fetch from Supabase compliance_photos table
  }, [isDemoMode]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    let result = [...photos];

    // Location filter
    if (locationFilter !== 'all') {
      result = result.filter(p => p.location === locationFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(p => p.recordType === typeFilter);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const days = parseInt(dateRange, 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter(p => new Date(p.timestamp) >= cutoff);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.description.toLowerCase().includes(q) ||
        p.recordType.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
      );
    }

    // Sort by most recent first
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return result;
  }, [photos, locationFilter, typeFilter, dateRange, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredPhotos.length;
    const geotagged = filteredPhotos.filter(p => p.lat !== null && p.lng !== null).length;
    const geoPercent = total > 0 ? Math.round((geotagged / total) * 100) : 0;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = filteredPhotos.filter(p => new Date(p.timestamp) >= weekAgo).length;

    const verified = filteredPhotos.filter(p => p.verified).length;

    return { total, geoPercent, thisWeek, verified };
  }, [filteredPhotos]);

  // Lightbox navigation
  const selected = selectedIndex !== null ? filteredPhotos[selectedIndex] : null;

  const goNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < filteredPhotos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  }, [selectedIndex, filteredPhotos.length]);

  const goPrev = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  }, [selectedIndex]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') setSelectedIndex(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedIndex, goNext, goPrev]);

  // Touch swipe for lightbox
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  const handleDownload = (photo: GalleryPhoto) => {
    guardAction('download', 'photo evidence', () => {
      const link = document.createElement('a');
      link.href = photo.dataUrl;
      link.download = `evidence-${photo.recordType.toLowerCase().replace(/ /g, '-')}-${photo.timestamp}.jpg`;
      link.click();
      toast.success('Photo downloaded');
    });
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Photo Evidence' },
      ]} />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#1e4d6b] flex items-center justify-center">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Photo Evidence</h1>
              <p className="text-sm text-gray-500">
                {stats.total} photo{stats.total !== 1 ? 's' : ''} across all locations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search photos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b] w-full sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-[#1e4d6b]" />
            <span className="text-sm font-semibold text-gray-700">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Location */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value as LocationName | 'all')}
                  className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b]"
                >
                  <option value="all">All Locations</option>
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Record Type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Record Type</label>
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as RecordType | 'all')}
                  className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b]"
                >
                  <option value="all">All Types</option>
                  {RECORD_TYPES.map(rt => (
                    <option key={rt} value={rt}>{rt}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date Range</label>
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRange)}
                  className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b]"
                >
                  {DATE_RANGES.map(dr => (
                    <option key={dr.value} value={dr.value}>{dr.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <Image className="h-4 w-4 text-[#1e4d6b]" />
              <span className="text-xs font-medium text-gray-500">Total Photos</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-[#1e4d6b]" />
              <span className="text-xs font-medium text-gray-500">Geotagged</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.geoPercent}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-[#1e4d6b]" />
              <span className="text-xs font-medium text-gray-500">This Week</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-gray-500">Verified</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.verified}</p>
          </div>
        </div>

        {/* Photo Grid */}
        {filteredPhotos.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-700">
                Showing {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
              </span>
              {(locationFilter !== 'all' || typeFilter !== 'all' || dateRange !== '30' || searchQuery) && (
                <button
                  onClick={() => {
                    setLocationFilter('all');
                    setTypeFilter('all');
                    setDateRange('30');
                    setSearchQuery('');
                  }}
                  className="text-xs text-[#1e4d6b] hover:underline font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedIndex(idx)}
                  className="group relative rounded-lg overflow-hidden border-2 border-gray-100 hover:border-[#1e4d6b]/40 cursor-pointer transition-all hover:shadow-md"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.description}
                    className="w-full h-full object-cover"
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>

                  {/* Timestamp overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pt-6 pb-2 px-2">
                    <div className="flex items-center gap-1 text-white">
                      <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="text-[10px] leading-tight truncate">{photo.displayTime}</span>
                    </div>
                  </div>

                  {/* Record type badge at top-left */}
                  <div className="absolute top-1.5 left-1.5">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold ${RECORD_TYPE_COLORS[photo.recordType].bg} ${RECORD_TYPE_COLORS[photo.recordType].text}`}>
                      {RECORD_TYPE_ICONS[photo.recordType]}
                      {photo.recordType}
                    </span>
                  </div>

                  {/* Location badge at top-right */}
                  <div className="absolute top-1.5 right-1.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${LOCATION_COLORS[photo.location]}`}>
                      {photo.location.split(' ')[0]}
                    </span>
                  </div>

                  {/* Verified indicator */}
                  {photo.verified && (
                    <div className="absolute bottom-8 right-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400 drop-shadow" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-[#eef4f8] flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-[#1e4d6b]/40" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No photos found</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              {searchQuery
                ? `No photos match "${searchQuery}". Try adjusting your search or filters.`
                : 'No photo evidence matches the current filters. Try broadening your date range or clearing filters.'
              }
            </p>
            <button
              onClick={() => {
                setLocationFilter('all');
                setTypeFilter('all');
                setDateRange('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 text-sm font-medium text-[#1e4d6b] bg-[#eef4f8] hover:bg-[#dce9f1] rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selected && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85"
          onClick={() => setSelectedIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Previous arrow */}
            {selectedIndex > 0 && (
              <button
                onClick={goPrev}
                className="absolute left-[-48px] top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {/* Next arrow */}
            {selectedIndex < filteredPhotos.length - 1 && (
              <button
                onClick={goNext}
                className="absolute right-[-48px] top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            {/* Image */}
            <img
              src={selected.dataUrl}
              alt={selected.description}
              className="max-w-full max-h-[70vh] rounded-lg object-contain"
            />

            {/* Info panel below image */}
            <div className="mt-4 w-full max-w-lg bg-white/10 backdrop-blur-sm rounded-lg px-5 py-4 space-y-3">
              {/* Description */}
              <p className="text-white text-sm font-medium leading-relaxed">
                {selected.description}
              </p>

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${RECORD_TYPE_COLORS[selected.recordType].bg} ${RECORD_TYPE_COLORS[selected.recordType].text}`}>
                  {RECORD_TYPE_ICONS[selected.recordType]}
                  {selected.recordType}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${LOCATION_COLORS[selected.location]}`}>
                  {selected.location}
                </span>
                {selected.verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-white/80">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#d4af37]" />
                  {selected.displayTime}
                </div>
                {selected.lat !== null && selected.lng !== null && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#d4af37]" />
                    {selected.address}
                  </div>
                )}
                <span className="text-white/50">
                  {selectedIndex + 1} / {filteredPhotos.length}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleDownload(selected)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-white/15 hover:bg-white/25 rounded-lg transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>

            {/* Navigation hint */}
            <p className="mt-3 text-[11px] text-white/40 text-center">
              Swipe or use arrow keys to navigate
            </p>
          </div>
        </div>
      )}

      {/* Demo Upgrade Prompt */}
      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
}
