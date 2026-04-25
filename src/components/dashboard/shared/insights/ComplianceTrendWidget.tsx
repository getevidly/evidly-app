import { Lock } from 'lucide-react';
import { CARD_BG, CARD_BORDER, BODY_TEXT } from '../constants';

interface Props {
  trendData: unknown[];
}

export function ComplianceTrendWidget({ trendData: _trendData }: Props) {
  return (
    <div
      className="rounded-lg overflow-hidden relative group"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, opacity: 0.55 }}
      title="Unlocks as your kitchen builds history."
    >
      {/* Lock overlay */}
      <div className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#A08C5A20' }}>
        <Lock size={14} style={{ color: '#A08C5A' }} />
      </div>

      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Compliance Pulse</h3>
          </div>
          {/* Period tabs — visible but disabled */}
          <div className="flex gap-1" style={{ pointerEvents: 'none' }}>
            {['30d', '60d', '90d'].map(p => (
              <span
                key={p}
                className="text-[10px] font-medium px-2 py-0.5 rounded"
                style={{
                  backgroundColor: p === '90d' ? '#E8EDF5' : 'transparent',
                  color: '#9CA3AF',
                }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Empty chart placeholder */}
      <div className="px-4 py-8 flex items-center justify-center">
        <div className="w-full h-24 rounded-lg" style={{ backgroundColor: '#F4F6FA' }} />
      </div>

      {/* Locked stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ borderTop: `1px solid ${CARD_BORDER}`, backgroundColor: CARD_BORDER }}>
        {['Current', 'Average', 'Range'].map(label => (
          <div key={label} className="px-3 py-2.5 text-center" style={{ backgroundColor: CARD_BG }}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9CA3AF' }}>{label}</p>
            <p className="text-sm font-bold" style={{ color: '#D1D9E6' }}>&mdash;</p>
          </div>
        ))}
      </div>
    </div>
  );
}
