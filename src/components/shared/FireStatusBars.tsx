import { ChevronRight } from 'lucide-react';

export type AnyStatus = 'current' | 'expiring' | 'expired' | 'due_soon' | 'overdue' | 'no_status';

export interface StatusItem {
  key?: string;
  label: string;
  status: AnyStatus;
}

export interface FireStatusBarsProps {
  /** Array-based approach — pass all categories at once (preferred for 5+ cards) */
  items?: StatusItem[];

  /** Legacy individual props (still supported for backward compatibility) */
  permitStatus?: 'current' | 'expiring' | 'expired' | 'no_status';
  hoodStatus?: 'current' | 'due_soon' | 'overdue' | 'no_status';
  extinguisherStatus?: 'current' | 'due_soon' | 'expired' | 'no_status';
  ansulStatus?: 'current' | 'due_soon' | 'overdue' | 'no_status';

  compact?: boolean;
  onCardClick?: (card: string) => void;
}

export function statusColor(status: AnyStatus): string {
  if (status === 'no_status') return '#D1D5DB';
  if (status === 'current') return '#22C55E';
  if (status === 'due_soon' || status === 'expiring') return '#EAB308';
  return '#EF4444'; // overdue, expired
}

export function statusLabel(status: AnyStatus): string {
  if (status === 'no_status') return 'No Status';
  if (status === 'current') return 'Current';
  if (status === 'due_soon' || status === 'expiring') return 'Due Soon';
  return 'Overdue';
}

export function FireStatusBars({
  items: itemsProp,
  permitStatus,
  hoodStatus,
  extinguisherStatus,
  ansulStatus,
  compact = false,
  onCardClick,
}: FireStatusBarsProps) {
  const items: StatusItem[] = itemsProp ?? [
    { key: 'permit', label: 'Permit', status: (permitStatus ?? 'no_status') as AnyStatus },
    { key: 'hood', label: 'Hood', status: (hoodStatus ?? 'no_status') as AnyStatus },
    { key: 'extinguisher', label: 'Extinguisher', status: (extinguisherStatus ?? 'no_status') as AnyStatus },
    { key: 'ansul', label: 'Ansul', status: (ansulStatus ?? 'no_status') as AnyStatus },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {items.map(item => (
          <div
            key={item.key || item.label}
            className={`flex items-center gap-1.5${onCardClick ? ' cursor-pointer hover:opacity-80' : ''}`}
            onClick={() => onCardClick?.(item.key || item.label)}
            title={onCardClick ? `Click to view ${item.label} details` : undefined}
          >
            <div
              className="h-1.5 rounded-full"
              style={{ width: 28, backgroundColor: statusColor(item.status) }}
            />
            <span className="text-[10px] text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map(item => {
        const barColor = statusColor(item.status);
        const label = statusLabel(item.status);
        const clickable = !!onCardClick;
        return (
          <div
            key={item.key || item.label}
            className={`relative text-center p-2 rounded-lg bg-gray-50 transition-all${clickable ? ' cursor-pointer hover:bg-gray-100 hover:shadow-sm' : ''}`}
            onClick={() => onCardClick?.(item.key || item.label)}
            title={clickable ? `Click to view ${item.label} details` : undefined}
          >
            <div
              className="h-2 rounded-full mb-1.5 mx-auto"
              style={{ backgroundColor: barColor, width: '80%' }}
            />
            <p className="text-[11px] font-medium text-gray-700">{item.label}</p>
            <p className="text-[10px] text-gray-400">{label}</p>
            {clickable && (
              <ChevronRight size={10} className="absolute bottom-1.5 right-1.5 text-gray-300" />
            )}
          </div>
        );
      })}
    </div>
  );
}
