// ComplianceTrendWidget — placeholder (manufactured score trends removed)

import { CARD_BG, CARD_BORDER, BODY_TEXT } from '../constants';

interface Props {
  trendData: unknown[];
}

export function ComplianceTrendWidget({ trendData }: Props) {
  if (!trendData || trendData.length === 0) {
    return (
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
      >
        <div className="px-4 py-6 text-center">
          <h3 className="text-sm font-semibold mb-1" style={{ color: BODY_TEXT }}>
            Compliance Pulse
          </h3>
          <p className="text-xs" style={{ color: '#6B7F96' }}>
            Compliance trends are being updated to show operational metrics.
          </p>
        </div>
      </div>
    );
  }

  // Future: render operational metric summary here
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div className="px-4 py-6 text-center">
        <h3 className="text-sm font-semibold mb-1" style={{ color: BODY_TEXT }}>
          Compliance Pulse
        </h3>
        <p className="text-xs" style={{ color: '#6B7F96' }}>
          Compliance trends are being updated to show operational metrics.
        </p>
      </div>
    </div>
  );
}
