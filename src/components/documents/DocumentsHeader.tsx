import type { DocumentsStats } from '../../hooks/documents/useDocumentsStats';
import type { PRPStats } from '../../hooks/documents/usePRPStats';
import { PRPBand } from './PRPBand';

interface DocumentsHeaderProps {
  stats: DocumentsStats;
  onSendToThirdParty: () => void;
  prpEnabled?: boolean;
  prpStats?: PRPStats;
  onPredictClick?: () => void;
}

const STAT_CARDS: { key: keyof DocumentsStats; label: string; accent: string }[] = [
  { key: 'total',    label: 'Total',         accent: '#1E2D4D' },
  { key: 'current',  label: 'Current',       accent: '#2E7D32' },
  { key: 'expiring', label: 'Expiring Soon', accent: '#B45309' },
  { key: 'expired',  label: 'Expired',       accent: '#B91C1C' },
];

export function DocumentsHeader({ stats, onSendToThirdParty, prpEnabled, prpStats, onPredictClick }: DocumentsHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-[#1E2D4D] tracking-tight">Documents</h1>
          {prpEnabled ? (
            <p className="text-xs text-[#8A93A6] mt-1">
              <span className="font-semibold text-[#1E2D4D]">Predict</span> what's about to expire.{' '}
              <span className="font-semibold text-[#1E2D4D]">Reduce</span> citation and re-inspection cost.{' '}
              <span className="font-semibold text-[#1E2D4D]">Prove</span> every record on demand.
            </p>
          ) : (
            <p className="text-xs text-[#8A93A6] mt-1">
              One home for everything you need to prove how your kitchen runs.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onSendToThirdParty}
          className="px-4 py-2.5 rounded-md text-[13px] font-bold transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
        >
          Send to Third Party {'\u2192'}
        </button>
      </div>

      {prpEnabled && prpStats ? (
        <PRPBand
          stats={prpStats}
          onPredictClick={onPredictClick || (() => {})}
          onSendToThirdParty={onSendToThirdParty}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_CARDS.map(({ key, label, accent }) => (
            <div
              key={key}
              className="bg-white border border-[#E2DDD4] rounded-lg p-3"
            >
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#8A93A6]">
                {label}
              </div>
              <div className="text-2xl font-bold mt-1" style={{ color: accent }}>
                {stats[key]}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
