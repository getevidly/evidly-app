import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { StateDot } from './StateDot';

/**
 * VendorRow — card for a single vendor in the vendor list tab.
 *
 * Props:
 *   vendor: MockVendor
 */
export function VendorRow({ vendor }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/vendors/${vendor.id}`)}
      className="w-full text-left bg-white rounded-lg px-4 py-3.5 transition-colors hover:bg-[#FDFCF9]"
      style={{ border: '1px solid #E2DDD4' }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar circle */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#F4EFE0', color: '#1E2D4D', fontSize: '12px', fontWeight: 500 }}
        >
          {vendor.initials}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + services */}
          <div className="flex items-center gap-2">
            <p className="truncate" style={{ fontSize: '14px', fontWeight: 500, color: '#1E2D4D' }}>
              {vendor.name}
            </p>
          </div>
          <p className="mt-0.5 truncate" style={{ fontSize: '11px', color: '#5A6478' }}>
            {[...(vendor.services || []), vendor.coverageLine].filter(Boolean).join(' · ')}
          </p>

          {/* AI answer line */}
          {vendor.answerLine ? (
            <p className="mt-1.5" style={{ fontSize: '12px', color: '#1E2D4D', lineHeight: '1.4' }}>
              {vendor.answerLine}
            </p>
          ) : null}

          {/* Location dots */}
          {vendor.locationCoverage?.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              {vendor.locationCoverage.map(loc => (
                <StateDot key={loc.locationId} state={loc.state} locationName={loc.locationName} />
              ))}
              <span style={{ fontSize: '10px', color: '#5A6478', marginLeft: '4px' }}>
                {vendor.locationCoverage.filter(l => l.state !== 'not_contracted').length} of {vendor.locationCoverage.length} locations
              </span>
            </div>
          )}
        </div>

        {/* CTA + chevron */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {vendor.cta.variant === 'primary' ? (
            <span
              className="px-2.5 py-1 rounded-md"
              style={{ fontSize: '11px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
            >
              {vendor.cta.label}
            </span>
          ) : (
            <span
              className="px-2.5 py-1 rounded-md"
              style={{ fontSize: '11px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #1E2D4D' }}
            >
              {vendor.cta.label}
            </span>
          )}
          <ChevronRight size={16} style={{ color: '#5A6478' }} />
        </div>
      </div>
    </button>
  );
}
