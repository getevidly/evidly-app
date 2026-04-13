import { AlertTriangle, AlertCircle, Info, AlertOctagon } from 'lucide-react';
import { SEVERITY_CONFIG, STATUS_CONFIG, type DeficiencyItem } from '../../data/deficienciesDemoData';

const SEVERITY_ICONS = {
  critical: AlertOctagon,
  major: AlertTriangle,
  minor: AlertCircle,
  advisory: Info,
};

interface DeficiencyCardProps {
  deficiency: DeficiencyItem;
  onClick?: () => void;
}

export function DeficiencyCard({ deficiency, onClick }: DeficiencyCardProps) {
  const sev = SEVERITY_CONFIG[deficiency.severity];
  const stat = STATUS_CONFIG[deficiency.status];
  const Icon = SEVERITY_ICONS[deficiency.severity];

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-3 transition-colors ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}
    >
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: sev.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium" style={{ color: sev.color }}>{deficiency.code}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ color: stat.color, backgroundColor: stat.bg }}
            >
              {stat.label}
            </span>
          </div>
          <p className="text-sm font-medium truncate" style={{ color: '#0B1628' }}>{deficiency.title}</p>
        </div>
      </div>
    </div>
  );
}
