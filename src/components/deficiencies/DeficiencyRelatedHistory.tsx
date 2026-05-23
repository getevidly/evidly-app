import type { DeficiencyItem } from '../../data/deficienciesDemoData';

const NAVY = '#1E2D4D';
const MS_90_DAYS = 90 * 24 * 60 * 60 * 1000;

function formatDate(iso: string): string {
  return new Date(iso.includes('T') ? iso : iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface DeficiencyRelatedHistoryProps {
  currentId: string;
  code: string;
  allDeficiencies: DeficiencyItem[];
}

export function DeficiencyRelatedHistory({
  currentId,
  code,
  allDeficiencies,
}: DeficiencyRelatedHistoryProps) {
  const now = Date.now();
  const cutoff = now - MS_90_DAYS;

  const related = allDeficiencies.filter(
    (d) =>
      d.id !== currentId &&
      d.code === code &&
      new Date(d.foundDate).getTime() >= cutoff
  );

  if (related.length === 0) return null;

  const resolvedDates = related
    .filter((d) => d.resolvedAt)
    .map((d) => formatDate(d.resolvedAt!));

  const totalOccurrences = related.length + 1; // +1 for current

  return (
    <div className="bg-white rounded-xl border border-[#E2DDD4] p-5">
      <h3 className="text-sm font-bold mb-3" style={{ color: NAVY }}>
        Related history
      </h3>
      <p className="text-[12px] text-[#6B7F96] leading-relaxed">
        <span className="font-mono font-medium" style={{ color: NAVY }}>{code}</span> cited{' '}
        {totalOccurrences} time{totalOccurrences !== 1 ? 's' : ''} in the last 90 days.
        {resolvedDates.length > 0 && (
          <> Resolved {resolvedDates.join(' and ')}.</>
        )}
        {' '}{totalOccurrences}{totalOccurrences === 2 ? 'nd' : totalOccurrences === 3 ? 'rd' : 'th'} occurrence.
      </p>
    </div>
  );
}
