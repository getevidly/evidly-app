import { AlertTriangle } from 'lucide-react';
import { ANOMALY_LABELS, type AnomalyType } from '../../data/timecardsDemoData';

interface AnomalyBadgeProps {
  anomalies: AnomalyType[];
}

export function AnomalyBadge({ anomalies }: AnomalyBadgeProps) {
  if (anomalies.length === 0) return null;

  return (
    <span
      title={anomalies.map(a => ANOMALY_LABELS[a]).join('\n')}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold cursor-help"
      style={{ color: '#dc2626', backgroundColor: '#fef2f2' }}
    >
      <AlertTriangle className="w-3 h-3" />
      {anomalies.length === 1 ? ANOMALY_LABELS[anomalies[0]] : `${anomalies.length} flags`}
    </span>
  );
}
