import { CARD_BG, CARD_BORDER, BODY_TEXT } from '../constants';

export interface InspectionEstimate {
  name: string;
  lastInspectionDate: string;
  frequencyDays: number;
  jurisdictionName: string;
}

interface Props {
  locations: InspectionEstimate[];
}

export function InspectionProbabilityWidget({ locations }: Props) {
  const withProbability = locations.map(loc => {
    const daysSince = Math.floor(
      (Date.now() - new Date(loc.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    const probability = Math.min(100, Math.round((daysSince / loc.frequencyDays) * 100));
    return { ...loc, daysSince, probability };
  });

  const getBarColor = (p: number) => {
    if (p < 50) return '#16a34a';
    if (p < 75) return '#d97706';
    return '#dc2626';
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Inspection Probability</h3>
        <p className="text-xs text-[#1E2D4D]/50 mt-0.5">Estimated likelihood of next inspection window</p>
      </div>
      <div className="divide-y divide-[#1E2D4D]/5">
        {withProbability.map(loc => (
          <div key={loc.name} className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <p className="text-sm font-semibold text-gray-800">{loc.name}</p>
                <p className="text-xs text-[#1E2D4D]/50">{loc.jurisdictionName}</p>
              </div>
              <span
                className="text-sm font-bold"
                style={{ color: getBarColor(loc.probability) }}
              >
                {loc.probability}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#1E2D4D]/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${loc.probability}%`,
                  backgroundColor: getBarColor(loc.probability),
                }}
              />
            </div>
            <p className="text-xs text-[#1E2D4D]/30 mt-1">
              Last inspected {loc.daysSince} days ago &middot; {loc.frequencyDays}-day cycle
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
