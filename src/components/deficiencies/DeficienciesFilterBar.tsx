import { Filter, ArrowDown } from 'lucide-react';
import type { DefCategory, DefSeverity, DefStatus } from '../../data/deficienciesDemoData';

interface FilterBarProps {
  statusFilter: 'all' | DefStatus;
  severityFilter: 'all' | DefSeverity;
  categoryFilter: 'all' | DefCategory;
  locationFilter: string;
  inspectorFilter: string;
  sortBy: string;
  locations: { id: string; name: string }[];
  inspectors: string[];
  hasAnyFilters: boolean;
  onStatusChange: (v: 'all' | DefStatus) => void;
  onSeverityChange: (v: 'all' | DefSeverity) => void;
  onCategoryChange: (v: 'all' | DefCategory) => void;
  onLocationChange: (v: string) => void;
  onInspectorChange: (v: string) => void;
  onSortChange: (v: string) => void;
  onClearFilters: () => void;
}

export function DeficienciesFilterBar({
  statusFilter,
  severityFilter,
  categoryFilter,
  locationFilter,
  inspectorFilter,
  sortBy,
  locations,
  inspectors,
  hasAnyFilters,
  onStatusChange,
  onSeverityChange,
  onCategoryChange,
  onLocationChange,
  onInspectorChange,
  onSortChange,
  onClearFilters,
}: FilterBarProps) {
  return (
    <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-3 flex flex-wrap items-center gap-3">
      <Filter size={16} className="text-[#1E2D4D]/30" />
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as 'all' | DefStatus)}
        className="text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2.5 text-[#1E2D4D]/80"
        style={{ fontSize: 16 }}
      >
        <option value="all">All Statuses</option>
        <option value="open">Open</option>
        <option value="acknowledged">Acknowledged</option>
        <option value="in_progress">In Progress</option>
        <option value="resolved">Corrected</option>
        <option value="deferred">Deferred</option>
      </select>
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value as 'all' | DefCategory)}
        className="text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2.5 text-[#1E2D4D]/80"
        style={{ fontSize: 16 }}
      >
        <option value="all">All Categories</option>
        <option value="food_safety">Food Safety</option>
        <option value="fire_safety">Fire Safety</option>
        <option value="facility_services">Facility Services</option>
      </select>
      <select
        value={severityFilter}
        onChange={(e) => onSeverityChange(e.target.value as 'all' | DefSeverity)}
        className="text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2.5 text-[#1E2D4D]/80"
        style={{ fontSize: 16 }}
      >
        <option value="all">All Severities</option>
        <option value="critical">Critical</option>
        <option value="major">Major</option>
        <option value="minor">Minor</option>
        <option value="advisory">Advisory</option>
      </select>
      <select
        value={locationFilter}
        onChange={(e) => onLocationChange(e.target.value)}
        className="text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2.5 text-[#1E2D4D]/80"
        style={{ fontSize: 16 }}
      >
        <option value="all">All Locations</option>
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>{loc.name}</option>
        ))}
      </select>
      {inspectors.length > 0 && (
        <select
          value={inspectorFilter}
          onChange={(e) => onInspectorChange(e.target.value)}
          className="text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2.5 text-[#1E2D4D]/80"
          style={{ fontSize: 16 }}
        >
          <option value="all">All Inspectors</option>
          {inspectors.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-1.5 ml-auto">
        <ArrowDown size={12} className="text-[#1E2D4D]/30" />
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="text-sm border border-[#1E2D4D]/10 rounded-xl px-3 py-2.5 text-[#1E2D4D]/80"
          style={{ fontSize: 16 }}
        >
          <option value="deadline">Sort: Correction Deadline</option>
          <option value="severity">Sort: Severity</option>
          <option value="foundDate">Sort: Date Found</option>
        </select>
      </div>
      {hasAnyFilters && (
        <button
          onClick={onClearFilters}
          className="text-xs text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
