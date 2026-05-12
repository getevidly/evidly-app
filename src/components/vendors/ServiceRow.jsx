import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { StateDot } from './StateDot';
import { StatePill } from './StatePill';

/**
 * ServiceRow — card for a single service in the services tab.
 *
 * Props:
 *   service: MockService
 */
export function ServiceRow({ service }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/vendors/services/${service.id}`)}
      className="w-full text-left bg-white rounded-lg px-4 py-3.5 transition-colors hover:bg-[#FDFCF9]"
      style={{ border: '1px solid #E2DDD4' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Name + category + cadence */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="truncate" style={{ fontSize: '14px', fontWeight: 500, color: '#1E2D4D' }}>
              {service.name}
            </p>
            <StatePill state={service.state} />
          </div>
          <p className="mt-0.5" style={{ fontSize: '11px', color: '#5A6478' }}>
            {service.category} · {service.cadence}
            {service.vendorName && ` · ${service.vendorName}`}
            {service.citation && (
              <span style={{ color: '#A08C5A' }}> · {service.citation}</span>
            )}
          </p>

          {/* AI answer line */}
          <p className="mt-1.5" style={{ fontSize: '12px', color: '#1E2D4D', lineHeight: '1.4' }}>
            {service.answerLine}
          </p>

          {/* Location dots */}
          <div className="flex items-center gap-1.5 mt-2">
            {service.locations.map(loc => (
              <StateDot key={loc.locationId} state={loc.state} locationName={loc.locationName} />
            ))}
            <span style={{ fontSize: '10px', color: '#5A6478', marginLeft: '4px' }}>
              {service.locations.filter(l => l.state === 'current').length} of {service.locations.length} current
            </span>
          </div>
        </div>

        {/* CTA + chevron */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {service.cta.variant === 'primary' ? (
            <span
              className="px-2.5 py-1 rounded-md"
              style={{ fontSize: '11px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
            >
              {service.cta.label}
            </span>
          ) : (
            <span
              className="px-2.5 py-1 rounded-md"
              style={{ fontSize: '11px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #1E2D4D' }}
            >
              {service.cta.label}
            </span>
          )}
          <ChevronRight size={16} style={{ color: '#5A6478' }} />
        </div>
      </div>
    </button>
  );
}
