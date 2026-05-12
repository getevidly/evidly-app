export type FilterId = 'all' | 'done' | 'assigned' | 'skipped' | 'pending';

interface SummaryFilterBarProps {
  activeFilter: FilterId;
  onFilterChange: (id: FilterId) => void;
  counts: Record<FilterId, number>;
}

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'done', label: 'Done' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'skipped', label: 'Skipped' },
  { id: 'pending', label: 'Pending' },
];

export function SummaryFilterBar({ activeFilter, onFilterChange, counts }: SummaryFilterBarProps) {
  return (
    <div className="px-4 py-2 flex flex-wrap gap-1.5">
      {FILTERS.map(f => {
        const isActive = activeFilter === f.id;
        const count = counts[f.id];
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange(f.id)}
            className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
              isActive
                ? 'bg-[#1E2D4D] text-[#FAF7F0]'
                : 'border border-[#E2DDD4] text-[#1E2D4D] hover:bg-[#1E2D4D]/5'
            }`}
          >
            {f.label} ({count})
          </button>
        );
      })}
    </div>
  );
}
