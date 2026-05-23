import { TrendingUp } from 'lucide-react';
import type { DriftingUnit } from '../../hooks/temperatures/useTemperatureDriftDetection';

interface TemperatureDriftCalloutProps {
  driftingUnits: DriftingUnit[];
}

export function TemperatureDriftCallout({ driftingUnits }: TemperatureDriftCalloutProps) {
  if (driftingUnits.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        border: '1px solid #c2731a',
        background: 'linear-gradient(135deg, #fdf8f0 0%, #fef6e8 100%)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(194, 115, 26, 0.12)' }}
        >
          <TrendingUp className="w-4 h-4" style={{ color: '#c2731a' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold" style={{ color: '#1E2D4D' }}>
            Temperature drift detected
          </h4>
          <p className="text-xs mt-1" style={{ color: '#6B7F96' }}>
            {driftingUnits.length} unit{driftingUnits.length !== 1 ? 's' : ''} trending
            toward range boundary based on last 3 readings.
          </p>
          <div className="mt-3 space-y-2">
            {driftingUnits.slice(0, 3).map(unit => {
              const direction = unit.variant === 'hot' ? 'cooling' : 'warming';
              const slopeAbs = Math.abs(unit.slope).toFixed(1);
              return (
                <div
                  key={unit.equipment_id}
                  className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.7)', border: '0.5px solid #E2DDD4' }}
                >
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: unit.variant === 'hot' ? '#EA580C' : '#2563EB' }}
                  />
                  <span className="font-medium truncate" style={{ color: '#1E2D4D' }}>
                    {unit.equipment_name}
                  </span>
                  <span className="ml-auto whitespace-nowrap" style={{ color: '#c2731a' }}>
                    {unit.current_temp}°F · {direction} {slopeAbs}°/reading
                  </span>
                </div>
              );
            })}
          </div>
          {driftingUnits.length > 3 && (
            <p className="text-[10px] mt-2" style={{ color: '#6B7F96' }}>
              +{driftingUnits.length - 3} more unit{driftingUnits.length - 3 !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
