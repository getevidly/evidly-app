import { UtensilsCrossed } from 'lucide-react';

export interface FoodSafetyWidgetProps {
  gradeDisplay: string;
  summary?: string;
  status: 'passing' | 'failing' | 'at_risk' | 'unknown';
  gradingTypeLabel?: string;
  agencyName?: string;
  agencyPhone?: string;
  agencyWebsite?: string;
  compact?: boolean;
}

function statusColor(status: FoodSafetyWidgetProps['status']): string {
  switch (status) {
    case 'passing': return '#16a34a';
    case 'failing': return '#dc2626';
    case 'at_risk': return '#d97706';
    default: return '#6B7F96';
  }
}

export function FoodSafetyWidget({
  gradeDisplay,
  summary,
  status,
  gradingTypeLabel,
  agencyName,
  agencyPhone,
  agencyWebsite,
  compact = false,
}: FoodSafetyWidgetProps) {
  const color = statusColor(status);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <UtensilsCrossed size={14} style={{ color, flexShrink: 0 }} />
        <span className="text-[13px] font-semibold" style={{ color: '#1e3a5f' }}>{gradeDisplay}</span>
      </div>
    );
  }

  return (
    <div
      className="p-3 rounded-lg"
      style={{ borderLeft: `3px solid ${color}`, backgroundColor: '#fafafa' }}
    >
      <div className="flex items-start gap-2">
        <UtensilsCrossed size={14} style={{ color, marginTop: 2, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold" style={{ color: '#1e3a5f' }}>{gradeDisplay}</p>
          {summary && (
            <p className="text-[11px] text-gray-500 mt-0.5">{summary}</p>
          )}
          {gradingTypeLabel && (
            <p className="text-[10px] mt-1" style={{ color: '#6B7F96' }}>{gradingTypeLabel}</p>
          )}
          {agencyName && (
            <p className="text-[11px] text-gray-500 mt-1">{agencyName}</p>
          )}
          {agencyPhone && (
            <a href={`tel:${agencyPhone}`} className="text-[11px] mt-0.5 block" style={{ color: '#1e4d6b' }}>
              {agencyPhone}
            </a>
          )}
          {agencyWebsite && (
            <a
              href={agencyWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] mt-0.5 block hover:underline"
              style={{ color: '#1e4d6b' }}
            >
              Agency Website &rarr;
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
