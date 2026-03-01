import { useState } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { locations as demoLocations } from '../../data/demoData';
import { useDemo } from '../../contexts/DemoContext';
import { CARD_BG, CARD_BORDER, BODY_TEXT, MUTED } from '../dashboard/shared/constants';

export type DateRange = '7d' | '30d' | '90d' | 'custom';

interface ReportFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  children?: React.ReactNode;
}

const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export function ReportFilters({
  dateRange,
  onDateRangeChange,
  selectedLocation,
  onLocationChange,
  children,
}: ReportFiltersProps) {
  const { showAllLocationsOption } = useRole();
  const { isDemoMode } = useDemo();
  const locs = isDemoMode ? demoLocations : [];

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-lg px-4 py-3"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      {/* Date range */}
      <div className="flex items-center gap-2">
        <Calendar size={14} style={{ color: MUTED }} />
        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value as DateRange)}
          className="text-sm rounded-md border px-2 py-1.5 outline-none"
          style={{ color: BODY_TEXT, borderColor: CARD_BORDER, backgroundColor: '#f8f9fc' }}
        >
          {DATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2">
        <MapPin size={14} style={{ color: MUTED }} />
        <select
          value={selectedLocation}
          onChange={(e) => onLocationChange(e.target.value)}
          className="text-sm rounded-md border px-2 py-1.5 outline-none"
          style={{ color: BODY_TEXT, borderColor: CARD_BORDER, backgroundColor: '#f8f9fc' }}
        >
          {showAllLocationsOption() && <option value="all">All Locations</option>}
          {locs.map((l) => (
            <option key={l.urlId} value={l.urlId}>{l.name}</option>
          ))}
        </select>
      </div>

      {/* Extra actions (PDF button, etc.) */}
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}
