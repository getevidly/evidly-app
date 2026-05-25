import { colors } from '../../lib/designSystem';
import type { MasterChecklistDefinition } from '../../hooks/checklists';

const CADENCE_SHORT: Record<string, string> = {
  per_shift: 'Per Shift',
  multiple_daily: 'Multiple Daily',
  once_daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  on_demand: 'On Demand',
};

interface ChecklistsLibraryPreviewProps {
  definitions: MasterChecklistDefinition[];
  onViewAll: () => void;
}

export function ChecklistsLibraryPreview({ definitions, onViewAll }: ChecklistsLibraryPreviewProps) {
  if (definitions.length === 0) return null;

  const sorted = [...definitions].sort((a, b) => a.name.localeCompare(b.name));
  const preview = sorted.slice(0, 8);
  const totalCount = definitions.length;

  return (
    <div
      className="rounded-[10px] border mt-8"
      style={{ backgroundColor: colors.cream, borderColor: colors.border, padding: '18px 22px' }}
    >
      {/* Header */}
      <h3
        className="text-sm font-bold"
        style={{ color: colors.navy, fontFamily: "'Montserrat', sans-serif" }}
      >
        {totalCount} Pre-Built Checklists from the Library
      </h3>
      <p className="text-xs mt-1 mb-4" style={{ color: colors.textSecondary }}>
        Every checklist is primary-source verified. CalCode, FDA, and NFPA citations on every item.
      </p>

      {/* Preview grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {preview.map(def => (
          <div
            key={def.id}
            className="rounded-md border"
            style={{
              backgroundColor: colors.white,
              borderColor: colors.border,
              padding: '10px 12px',
            }}
          >
            <div
              className="font-bold leading-tight mb-1"
              style={{ color: colors.navy, fontSize: '12px' }}
            >
              {def.name}
            </div>
            <div style={{ color: colors.textMuted, fontSize: '10.5px' }}>
              {CADENCE_SHORT[def.cadence] ?? def.cadence}
            </div>
            <div className="mt-1.5">
              <span
                className="inline-block font-bold rounded"
                style={{
                  backgroundColor: colors.warningSoft,
                  color: colors.warning,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 5px',
                  borderRadius: '3px',
                }}
              >
                Primary-source verified
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex justify-end mt-3">
        <button
          type="button"
          onClick={onViewAll}
          className="font-bold"
          style={{
            color: colors.navy,
            fontSize: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          View all {totalCount} &rarr;
        </button>
      </div>
    </div>
  );
}
