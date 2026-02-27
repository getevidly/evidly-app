import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Camera, Search, Filter, MapPin, Clock, Calendar, ChevronDown,
  X, ChevronLeft, ChevronRight, Download, Image, CheckCircle, Printer,
  Thermometer, ClipboardCheck, AlertTriangle, Truck, Wrench,
  FileText, LayoutGrid, List as ListIcon,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RecordType =
  | 'Temperature Log'
  | 'Checklist'
  | 'Incident'
  | 'Vendor Delivery'
  | 'Equipment'
  | 'Self-Inspection'
  | 'General';

type LocationName =
  | 'Downtown Kitchen'
  | 'Airport Cafe'
  | 'University Dining';

type DateRange = '7' | '30' | '90' | 'all';
type ViewMode = 'list' | 'grid';

interface GalleryPhoto {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  displayTime: string;
  lat: number;
  lng: number;
  address: string;
  recordType: RecordType;
  location: LocationName;
  verified: boolean;
  description: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOCATIONS: LocationName[] = ['Downtown Kitchen', 'Airport Cafe', 'University Dining'];

const RECORD_TYPES: RecordType[] = [
  'Temperature Log', 'Checklist', 'Incident', 'Vendor Delivery',
  'Equipment', 'Self-Inspection', 'General',
];

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 90 Days', value: '90' },
  { label: 'All Time', value: 'all' },
];

// Professional muted badge colors
const RECORD_TYPE_STYLES: Record<RecordType, { badgeBg: string; badgeText: string; thumbBg: string }> = {
  'Temperature Log': { badgeBg: '#dbeafe', badgeText: '#1e40af', thumbBg: '#3b82f6' },
  'Checklist':       { badgeBg: '#dcfce7', badgeText: '#166534', thumbBg: '#22c55e' },
  'Incident':        { badgeBg: '#fef2f2', badgeText: '#991b1b', thumbBg: '#ef4444' },
  'Vendor Delivery': { badgeBg: '#fef3c7', badgeText: '#92400e', thumbBg: '#f59e0b' },
  'Equipment':       { badgeBg: '#f3f4f6', badgeText: '#374151', thumbBg: '#6b7280' },
  'Self-Inspection':      { badgeBg: '#fffbeb', badgeText: '#92400e', thumbBg: '#d97706' },
  'General':         { badgeBg: '#f3f4f6', badgeText: '#374151', thumbBg: '#9ca3af' },
};

const RECORD_TYPE_ICONS: Record<RecordType, typeof Thermometer> = {
  'Temperature Log': Thermometer,
  'Checklist':       ClipboardCheck,
  'Incident':        AlertTriangle,
  'Vendor Delivery': Truck,
  'Equipment':       Wrench,
  'Self-Inspection':      EvidlyIcon,
  'General':         FileText,
};

const LOCATION_BADGE: Record<LocationName, { bg: string; text: string }> = {
  'Downtown Kitchen':  { bg: '#eef4f8', text: '#1e4d6b' },
  'Airport Cafe':  { bg: '#fef3c7', text: '#92400e' },
  'University Dining': { bg: '#dcfce7', text: '#166534' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function getDateGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const photoDate = new Date(date);
  photoDate.setHours(0, 0, 0, 0);

  if (photoDate.getTime() === today.getTime()) return 'Today';
  if (photoDate.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Icon Thumbnail
// ---------------------------------------------------------------------------

function IconThumbnail({ recordType, size = 64 }: { recordType: RecordType; size?: number }) {
  const Icon = RECORD_TYPE_ICONS[recordType];
  const style = RECORD_TYPE_STYLES[recordType];
  const iconSize = Math.round(size * 0.4);
  return (
    <div
      className="rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: style.thumbBg }}
    >
      <Icon className="text-white" style={{ width: iconSize, height: iconSize }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category Badge
// ---------------------------------------------------------------------------

function CategoryBadge({ recordType, small = false }: { recordType: RecordType; small?: boolean }) {
  const Icon = RECORD_TYPE_ICONS[recordType];
  const style = RECORD_TYPE_STYLES[recordType];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}
      style={{ backgroundColor: style.badgeBg, color: style.badgeText }}
    >
      <Icon className={small ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {recordType}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Demo Photo Data
// ---------------------------------------------------------------------------

function createDemoPhotos(): GalleryPhoto[] {
  const coords = [
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
    { lat: 37.8019, lng: -122.4184, address: "Fisherman's Wharf, San Francisco" },
  ];

  const defs: {
    title: string; subtitle: string;
    recordType: RecordType; location: LocationName;
    daysBack: number; hour: number; minute: number;
    description: string; verified: boolean;
  }[] = [
    { title: 'Walk-in Cooler', subtitle: '38°F Reading',
      recordType: 'Temperature Log', location: 'Downtown Kitchen',
      daysBack: 0, hour: 8, minute: 30,
      description: 'Walk-in cooler temperature reading at 38°F — within safe range', verified: true },
    { title: 'Prep Table', subtitle: '41°F Surface Temp',
      recordType: 'Temperature Log', location: 'Airport Cafe',
      daysBack: 1, hour: 9, minute: 15,
      description: 'Prep table surface temperature check during morning shift', verified: true },
    { title: 'Hot Hold Station', subtitle: '157°F Verified',
      recordType: 'Temperature Log', location: 'University Dining',
      daysBack: 3, hour: 11, minute: 45,
      description: 'Hot holding station temperature verification — chicken entree', verified: true },
    { title: 'Cleaning Completed', subtitle: 'End of Shift',
      recordType: 'Checklist', location: 'Downtown Kitchen',
      daysBack: 0, hour: 16, minute: 0,
      description: 'End-of-shift deep cleaning — all surfaces sanitized and documented', verified: true },
    { title: 'Hand Wash Station', subtitle: 'Soap & Towels Stocked',
      recordType: 'Checklist', location: 'Airport Cafe',
      daysBack: 1, hour: 7, minute: 45,
      description: 'Hand wash station fully stocked — soap, paper towels, signage visible', verified: false },
    { title: 'Floor Drain', subtitle: 'Cleaned & Inspected',
      recordType: 'Checklist', location: 'University Dining',
      daysBack: 5, hour: 14, minute: 30,
      description: 'Floor drain cleaning and inspection — no blockages found', verified: true },
    { title: 'Grease Spill', subtitle: 'Kitchen Line Area',
      recordType: 'Incident', location: 'Downtown Kitchen',
      daysBack: 2, hour: 12, minute: 10,
      description: 'Grease spill near fryer station — cleaned and area cordoned off within 5 mins', verified: true },
    { title: 'Broken Tile', subtitle: 'Walk-in Entrance',
      recordType: 'Incident', location: 'Airport Cafe',
      daysBack: 8, hour: 10, minute: 0,
      description: 'Cracked floor tile at walk-in cooler entrance — maintenance ticket filed', verified: false },
    { title: 'Receiving Inspection', subtitle: 'Produce Delivery',
      recordType: 'Vendor Delivery', location: 'Downtown Kitchen',
      daysBack: 1, hour: 6, minute: 30,
      description: 'Fresh produce delivery from Bay Area Farms — temp verified at 39°F', verified: true },
    { title: 'Receiving Inspection', subtitle: 'Meat & Poultry',
      recordType: 'Vendor Delivery', location: 'University Dining',
      daysBack: 6, hour: 7, minute: 0,
      description: 'Meat delivery from Pacific Provisions — internal temp 34°F, packaging intact', verified: true },
    { title: 'Walk-in Cooler', subtitle: 'Door Seal Check',
      recordType: 'Equipment', location: 'Downtown Kitchen',
      daysBack: 4, hour: 15, minute: 20,
      description: 'Walk-in cooler door gasket inspection — seal intact, no condensation', verified: true },
    { title: 'Fire Extinguisher', subtitle: 'Monthly Check',
      recordType: 'Equipment', location: 'Airport Cafe',
      daysBack: 10, hour: 9, minute: 0,
      description: 'Fire extinguisher monthly inspection — pressure gauge green, tag current', verified: true },
  ];

  return defs.map((def, idx) => {
    const ts = daysAgo(def.daysBack, def.hour, def.minute);
    const coord = coords[idx % coords.length];
    return {
      id: `demo-photo-${idx + 1}`,
      title: def.title,
      subtitle: def.subtitle,
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

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list');

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
      setPhotos(createDemoPhotos());
    }
  }, [isDemoMode]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    let result = [...photos];

    if (locationFilter !== 'all') {
      result = result.filter(p => p.location === locationFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter(p => p.recordType === typeFilter);
    }
    if (dateRange !== 'all') {
      const days = parseInt(dateRange, 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter(p => new Date(p.timestamp) >= cutoff);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.description.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.recordType.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return result;
  }, [photos, locationFilter, typeFilter, dateRange, searchQuery]);

  // Group photos by date
  const groupedPhotos = useMemo(() => {
    const groups: { label: string; photos: GalleryPhoto[] }[] = [];
    const seen = new Map<string, GalleryPhoto[]>();

    for (const photo of filteredPhotos) {
      const label = getDateGroupLabel(photo.timestamp);
      if (!seen.has(label)) {
        const arr: GalleryPhoto[] = [];
        seen.set(label, arr);
        groups.push({ label, photos: arr });
      }
      seen.get(label)!.push(photo);
    }
    return groups;
  }, [filteredPhotos]);

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
      toast.success('Photo downloaded');
    });
  };

  const handlePrint = (photo: GalleryPhoto) => {
    guardAction('print', 'photo evidence', () => {
      window.print();
    });
  };

  // Find flat index for a photo (for lightbox)
  const getFlatIndex = (photo: GalleryPhoto): number => {
    return filteredPhotos.findIndex(p => p.id === photo.id);
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
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-[#1e4d6b]' : 'text-gray-400 hover:text-gray-600'
                }`}
                title="List view"
              >
                <ListIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm text-[#1e4d6b]' : 'text-gray-400 hover:text-gray-600'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            {/* Search */}
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Image className="h-4 w-4 text-[#1e4d6b]" />
              <span className="text-xs font-medium text-gray-500">Total Photos</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-[#1e4d6b]" />
              <span className="text-xs font-medium text-gray-500">Geotagged</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.geoPercent}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-[#1e4d6b]" />
              <span className="text-xs font-medium text-gray-500">This Week</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-gray-500">Verified</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.verified}</p>
          </div>
        </div>

        {/* Photo Gallery */}
        {filteredPhotos.length > 0 ? (
          <div className="space-y-6">
            {/* Results header */}
            <div className="flex items-center justify-between">
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

            {/* Date-grouped photos */}
            {groupedPhotos.map((group) => (
              <div key={group.label}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {group.label}
                  </span>
                  <div className="flex-1 border-t border-gray-100" />
                  <span className="text-[10px] text-gray-400">{group.photos.length}</span>
                </div>

                {/* List view */}
                {viewMode === 'list' ? (
                  <div className="space-y-2">
                    {group.photos.map((photo) => {
                      const locBadge = LOCATION_BADGE[photo.location];
                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setSelectedIndex(getFlatIndex(photo))}
                          className="w-full flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all text-left"
                        >
                          <IconThumbnail recordType={photo.recordType} size={64} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{photo.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{photo.subtitle}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <CategoryBadge recordType={photo.recordType} small />
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                                style={{ backgroundColor: locBadge.bg, color: locBadge.text }}
                              >
                                {photo.location}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-[10px] text-gray-400">{photo.displayTime}</span>
                            {photo.verified && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Verified
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Grid view */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {group.photos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setSelectedIndex(getFlatIndex(photo))}
                        className="bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all overflow-hidden text-left"
                      >
                        <div
                          className="aspect-square flex items-center justify-center"
                          style={{ backgroundColor: RECORD_TYPE_STYLES[photo.recordType].thumbBg }}
                        >
                          {(() => {
                            const Icon = RECORD_TYPE_ICONS[photo.recordType];
                            return <Icon className="text-white/90 h-10 w-10" />;
                          })()}
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-semibold text-gray-900 truncate">{photo.title}</p>
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">{photo.subtitle}</p>
                          <div className="flex items-center gap-1 mt-2">
                            <CategoryBadge recordType={photo.recordType} small />
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-gray-400 truncate">{photo.displayTime}</span>
                            {photo.verified && <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
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

      {/* Detail Modal / Lightbox */}
      {selected && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80"
          onClick={() => setSelectedIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="relative w-full max-w-lg mx-4"
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
                className="absolute left-[-48px] top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors hidden sm:flex"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {/* Next arrow */}
            {selectedIndex < filteredPhotos.length - 1 && (
              <button
                onClick={goNext}
                className="absolute right-[-48px] top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors hidden sm:flex"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            {/* Modal content */}
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
              {/* Icon thumbnail hero */}
              <div
                className="flex items-center justify-center py-12"
                style={{ backgroundColor: RECORD_TYPE_STYLES[selected.recordType].thumbBg }}
              >
                {(() => {
                  const Icon = RECORD_TYPE_ICONS[selected.recordType];
                  return <Icon className="text-white/90 h-20 w-20" />;
                })()}
              </div>

              {/* Details */}
              <div className="p-5 space-y-4">
                {/* Title */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selected.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{selected.subtitle}</p>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selected.description}
                </p>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge recordType={selected.recordType} />
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{
                      backgroundColor: LOCATION_BADGE[selected.location].bg,
                      color: LOCATION_BADGE[selected.location].text,
                    }}
                  >
                    {selected.location}
                  </span>
                  {selected.verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#1e4d6b]" />
                    {selected.displayTime}
                  </div>
                  {selected.lat !== null && selected.lng !== null && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#1e4d6b]" />
                      {selected.address}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleDownload(selected)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1e4d6b] bg-[#eef4f8] hover:bg-[#dce9f1] rounded-lg transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                  <button
                    onClick={() => handlePrint(selected)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </button>
                  <span className="ml-auto text-[11px] text-gray-400">
                    {selectedIndex + 1} / {filteredPhotos.length}
                  </span>
                </div>
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
