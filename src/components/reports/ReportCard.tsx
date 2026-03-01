import { ChevronRight } from 'lucide-react';
import type { ReportTypeConfig } from '../../config/reportConfig';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED } from '../dashboard/shared/constants';

const NAVY = '#1e4d6b';

interface ReportCardProps {
  config: ReportTypeConfig;
  onClick: () => void;
  hasData?: boolean;
}

export function ReportCard({ config, onClick, hasData = true }: ReportCardProps) {
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        boxShadow: CARD_SHADOW,
        opacity: hasData ? 1 : 0.55,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: '#eef4f8' }}
        >
          <Icon size={20} style={{ color: NAVY }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold truncate" style={{ color: BODY_TEXT }}>
              {config.title}
            </h3>
            <ChevronRight size={16} className="shrink-0" style={{ color: MUTED }} />
          </div>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: MUTED }}>
            {config.subtitle}
          </p>
          {hasData ? (
            <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: NAVY }}>
              View Report <span aria-hidden="true">&rarr;</span>
            </span>
          ) : (
            <span
              className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded"
              style={{ backgroundColor: '#f3f4f6', color: '#9ca3af' }}
            >
              No data yet
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
