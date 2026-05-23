import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { COMMON_SERVICE_CADENCES } from '../../data/commonServiceCadences';

export function CalendarEmptyState() {
  const navigate = useNavigate();

  return (
    <div className="py-8 flex flex-col items-center text-center">
      {/* Eyebrow */}
      <div
        className="uppercase mb-2"
        style={{
          color: '#B45309', fontSize: '11px', fontWeight: 700,
          letterSpacing: '0.12em',
        }}
      >
        REQUIRED SERVICES &middot; BUILD YOUR CADENCE
      </div>

      {/* Heading */}
      <h3
        className="mb-2"
        style={{
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          fontSize: '20px', color: '#1E2D4D',
        }}
      >
        Commercial kitchens commonly schedule these services
      </h3>

      {/* Subhead */}
      <p
        className="mb-6"
        style={{ color: '#8A93A6', fontSize: '13px', maxWidth: '520px' }}
      >
        Here&rsquo;s the cadence checklist for a typical commercial kitchen.
        Schedule what you need. EvidLY identifies when each one comes due.
      </p>

      {/* 6-card grid: 5 cadences + 1 custom */}
      <div
        className="grid gap-3 w-full mb-6"
        style={{
          maxWidth: '900px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        }}
      >
        {COMMON_SERVICE_CADENCES.map((svc) => (
          <button
            key={svc.id}
            type="button"
            onClick={() => navigate('/vendors')}
            className="bg-white text-left p-4 transition-all cursor-pointer"
            style={{ borderRadius: '8px', border: '1px solid #E2DDD4' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#1E2D4D';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(30,45,77,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E2DDD4';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              className="uppercase mb-1.5"
              style={{
                color: '#B45309', fontSize: '10px',
                fontWeight: 700, letterSpacing: '0.04em',
              }}
            >
              {svc.regulatory_basis}
            </div>
            <div
              className="mb-1"
              style={{ color: '#1E2D4D', fontWeight: 700, fontSize: '14px' }}
            >
              {svc.display_name}
            </div>
            <p className="mb-3" style={{ color: '#8A93A6', fontSize: '12px' }}>
              {svc.cadence_label}
            </p>
            <span style={{ color: '#1E2D4D', fontWeight: 600, fontSize: '12px' }}>
              + Schedule first service {'\u2192'}
            </span>
          </button>
        ))}

        {/* Custom service card */}
        <button
          type="button"
          onClick={() => navigate('/vendors')}
          className="text-left p-4 transition-all cursor-pointer"
          style={{
            borderRadius: '8px', border: '2px dashed #E2DDD4',
            backgroundColor: '#FAFAF8',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8A93A6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2DDD4'; }}
        >
          <div
            className="mb-1"
            style={{ color: '#8A93A6', fontWeight: 700, fontSize: '14px' }}
          >
            Add a custom service
          </div>
          <p className="mb-3" style={{ color: '#8A93A6', fontSize: '12px' }}>
            Any recurring service not listed above.
          </p>
          <span style={{ color: '#8A93A6', fontWeight: 600, fontSize: '12px' }}>
            + Add service {'\u2192'}
          </span>
        </button>
      </div>

      {/* Primary button */}
      <button
        type="button"
        onClick={() => navigate('/vendors')}
        className="flex items-center gap-1.5 px-5 py-2.5 rounded-md text-[13px] font-bold transition-opacity hover:opacity-90 mb-5"
        style={{ backgroundColor: '#3B6D11', color: 'white' }}
      >
        <Plus size={14} />
        + Schedule a service
      </button>

      {/* Disclaimer */}
      <p
        className="mb-4"
        style={{
          maxWidth: '720px', color: '#8A93A6',
          fontSize: '11px', lineHeight: 1.5,
        }}
      >
        Common service cadences for commercial kitchens. Specific frequencies
        vary by jurisdiction and cooking volume &mdash; confirm with your local
        authority and vendor.
      </p>

      {/* Why line */}
      <p
        className="italic"
        style={{
          maxWidth: '560px', color: '#8A93A6', fontSize: '12px',
          borderTop: '1px solid #E2DDD4', paddingTop: '20px', marginTop: '16px',
        }}
      >
        A scheduled service is a service that gets done. A documented service
        is a service you can prove.
      </p>
    </div>
  );
}
