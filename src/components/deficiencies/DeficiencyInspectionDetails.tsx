import type { DeficiencyItem } from '../../data/deficienciesDemoData';
import { TIMELINE_REQUIREMENT_LABELS } from '../../data/deficienciesDemoData';

const NAVY = '#1E2D4D';

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface DeficiencyInspectionDetailsProps {
  item: DeficiencyItem;
}

export function DeficiencyInspectionDetails({ item }: DeficiencyInspectionDetailsProps) {
  const rows: { label: string; value: string | null }[] = [
    { label: 'Inspector', value: item.foundBy || null },
    { label: 'Found date', value: item.foundDate ? formatDate(item.foundDate) : null },
    { label: 'Location', value: item.locationName || null },
    { label: 'Area', value: item.locationDescription || null },
    { label: 'Equipment', value: item.equipmentName || null },
    { label: 'Required action', value: item.requiredAction || null },
    {
      label: 'Correction timeline',
      value: item.timelineRequirement
        ? TIMELINE_REQUIREMENT_LABELS[item.timelineRequirement] || item.timelineRequirement
        : null,
    },
    { label: 'Estimated cost', value: item.estimatedCost ? `$${item.estimatedCost.toLocaleString()}` : null },
  ];

  const visibleRows = rows.filter((r) => r.value !== null);

  return (
    <div className="bg-white rounded-xl border border-[#E2DDD4] p-5">
      <h3 className="text-sm font-bold mb-3" style={{ color: NAVY }}>
        Inspection details
      </h3>
      <div className="divide-y divide-[#E2DDD4]">
        {visibleRows.map((row) => (
          <div key={row.label} className="flex justify-between py-2.5">
            <span className="text-[12px] text-[#8A93A6]">{row.label}</span>
            <span className="text-[12px] font-medium text-right max-w-[60%]" style={{ color: NAVY }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
