import { Search, Upload } from 'lucide-react';
import type { DocumentTabId } from './DocumentsTabs';

interface DocumentsToolbarProps {
  activeTab: DocumentTabId;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  locationFilter: string;
  onLocationFilterChange: (val: string) => void;
  vendorFilter: string;
  onVendorFilterChange: (val: string) => void;
  locations: string[];
  vendors: string[];
  onUpload: () => void;
}

const selectClass =
  'px-3 py-2.5 border border-[#E2DDD4] bg-white rounded-md text-[13px] text-[#1E2D4D] cursor-pointer';

export function DocumentsToolbar({
  activeTab,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  locationFilter,
  onLocationFilterChange,
  vendorFilter,
  onVendorFilterChange,
  locations,
  vendors,
  onUpload,
}: DocumentsToolbarProps) {
  const showVendor = activeTab === 'service' || activeTab === 'business';

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A93A6]" />
        <input
          type="text"
          placeholder="Search documents\u2026"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8 pr-3 py-2.5 border border-[#E2DDD4] bg-white rounded-md text-[13px] text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30"
        />
      </div>

      <select
        value={locationFilter}
        onChange={(e) => onLocationFilterChange(e.target.value)}
        className={selectClass}
      >
        <option value="all">All locations</option>
        {locations.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>

      {showVendor && (
        <select
          value={vendorFilter}
          onChange={(e) => onVendorFilterChange(e.target.value)}
          className={selectClass}
        >
          <option value="all">All vendors</option>
          {vendors.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      )}

      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className={selectClass}
      >
        <option value="all">All statuses</option>
        <option value="current">Current</option>
        <option value="expiring">Expiring Soon</option>
        <option value="expired">Expired</option>
        <option value="pending_review">Pending Review</option>
        <option value="requested">Requested</option>
        <option value="overdue">Overdue</option>
      </select>

      <button
        type="button"
        onClick={onUpload}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[13px] font-bold transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
      >
        <Upload size={14} />
        Upload Document
      </button>
    </div>
  );
}
