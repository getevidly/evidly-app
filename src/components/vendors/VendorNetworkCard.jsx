import { Mail, MessageCircle } from 'lucide-react';

const TIER_STYLES = {
  gold: { bg: '#FAEEDA', text: '#633806' },
  silver: { bg: '#F1EFE8', text: '#2C2C2A' },
  bronze: { bg: '#FAECE7', text: '#4A1B0C' },
};

export function VendorNetworkCard({ vendor, onView }) {
  const tierStyle = TIER_STYLES[vendor.tier] || TIER_STYLES.bronze;
  const initials = vendor.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className="bg-white rounded-lg px-4 py-3"
      style={{ border: '1px solid #E2DDD4' }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full"
          style={{ width: '36px', height: '36px', backgroundColor: '#F4F1EA', fontSize: '12px', fontWeight: 600, color: '#1E2D4D' }}
        >
          {initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#1E2D4D' }}>
              {vendor.name}
            </p>
            {/* Tier pill */}
            <span
              className="px-1.5 py-0.5 rounded"
              style={{ fontSize: '9px', fontWeight: 600, backgroundColor: tierStyle.bg, color: tierStyle.text, textTransform: 'capitalize' }}
            >
              {vendor.tier}
            </span>
            {/* Availability pill */}
            <span
              className="px-1.5 py-0.5 rounded"
              style={{
                fontSize: '9px',
                fontWeight: 500,
                backgroundColor: vendor.availability === 'available' ? '#E1F5EE' : '#FFF8E1',
                color: vendor.availability === 'available' ? '#04342C' : '#633806',
              }}
            >
              {vendor.availability === 'available' ? 'Available' : 'Wait list'}
            </span>
            {/* Contact badge */}
            {vendor.contactState === 'contacted' && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                style={{ fontSize: '9px', fontWeight: 500, backgroundColor: '#FAF7F0', color: '#5A6478', border: '1px solid #E2DDD4' }}
              >
                <Mail size={9} />
                Contacted {vendor.contactDate ? new Date(vendor.contactDate).toLocaleDateString() : ''}
              </span>
            )}
            {vendor.contactState === 'replied' && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                style={{ fontSize: '9px', fontWeight: 600, backgroundColor: '#E1F5EE', color: '#04342C' }}
              >
                <MessageCircle size={9} />
                Replied {vendor.contactDate ? new Date(vendor.contactDate).toLocaleDateString() : ''}
              </span>
            )}
          </div>

          {/* Subtitle */}
          <p className="mt-0.5" style={{ fontSize: '11px', color: '#5A6478' }}>
            {vendor.service_types.join(', ')} · {vendor.county_primary}
            {vendor.service_area_counties.length > 1 && ` + ${vendor.service_area_counties.length - 1} counties`}
          </p>
        </div>

        {/* View button */}
        <button
          type="button"
          onClick={() => onView(vendor)}
          className="flex-shrink-0 px-3 py-1.5 rounded-md"
          style={{
            fontSize: '11px',
            fontWeight: 500,
            backgroundColor: vendor.tier === 'gold' ? '#1E2D4D' : 'transparent',
            color: vendor.tier === 'gold' ? '#FAF7F0' : '#1E2D4D',
            border: vendor.tier === 'gold' ? 'none' : '1px solid #1E2D4D',
          }}
        >
          View
        </button>
      </div>
    </div>
  );
}
