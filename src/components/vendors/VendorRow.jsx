import { useNavigate } from 'react-router-dom';
import { ChevronRight, Star } from 'lucide-react';
import { StateDot } from './StateDot';

/**
 * VendorRow — card for a single vendor in the vendor list tab.
 *
 * Props:
 *   vendor: MockVendor
 *   isRecommended: boolean — whether an active recommendation exists
 *   onRecommend: (vendor) => void — open recommend modal
 */
export function VendorRow({ vendor, isRecommended, onRecommend }) {
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
          {/* Name + star */}
          <div className="flex items-center gap-2">
            <p className="truncate" style={{ fontSize: '14px', fontWeight: 500, color: '#1E2D4D' }}>
              {vendor.name}
            </p>
            {isRecommended ? (
              <span title="Recommendation sent to Partner Recruitment">
                <Star size={14} fill="#A08C5A" style={{ color: '#A08C5A', flexShrink: 0 }} />
              </span>
            ) : (
              <span
                role="button"
                tabIndex={0}
                title="Recommend to Vendor Network"
                onClick={(e) => { e.stopPropagation(); onRecommend?.(vendor); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onRecommend?.(vendor); } }}
                className="hover:opacity-70 transition-opacity"
              >
                <Star size={14} style={{ color: '#A08C5A', flexShrink: 0 }} />
              </span>
            )}
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
