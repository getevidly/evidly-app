export interface FireStatusBarsProps {
  permitStatus: 'current' | 'expiring' | 'expired';
  hoodStatus: 'current' | 'due_soon' | 'overdue';
  extinguisherStatus: 'current' | 'due_soon' | 'expired';
  ansulStatus: 'current' | 'due_soon' | 'overdue';
  compact?: boolean;
}

type AnyStatus = 'current' | 'expiring' | 'expired' | 'due_soon' | 'overdue';

function statusColor(status: AnyStatus): string {
  if (status === 'current') return '#16a34a';
  if (status === 'due_soon' || status === 'expiring') return '#d97706';
  return '#dc2626'; // overdue, expired
}

function statusLabel(status: AnyStatus): string {
  if (status === 'current') return 'Current';
  if (status === 'due_soon' || status === 'expiring') return 'Due Soon';
  return 'Overdue';
}

export function FireStatusBars({
  permitStatus,
  hoodStatus,
  extinguisherStatus,
  ansulStatus,
  compact = false,
}: FireStatusBarsProps) {
  const items = [
    { label: 'Permit', status: permitStatus as AnyStatus },
    { label: 'Hood', status: hoodStatus as AnyStatus },
    { label: 'Ext', status: extinguisherStatus as AnyStatus },
    { label: 'Ansul', status: ansulStatus as AnyStatus },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
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
    <div className="grid grid-cols-4 gap-2">
      {items.map(item => {
        const barColor = statusColor(item.status);
        const label = statusLabel(item.status);
        return (
          <div key={item.label} className="text-center p-2 rounded-lg bg-gray-50">
            <div
              className="h-2 rounded-full mb-1.5 mx-auto"
              style={{ backgroundColor: barColor, width: '80%' }}
            />
            <p className="text-[11px] font-medium text-gray-700">{item.label}</p>
            <p className="text-[10px] text-gray-400">{label}</p>
          </div>
        );
      })}
    </div>
  );
}
