import { useState } from 'react';
import { useLocationServiceSchedules } from '../../../hooks/useLocationServiceSchedules';
import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { ServiceRow } from '../../../components/vendors/ServiceRow';

/**
 * ServicesTab — Surface 2 (populated) + Surface 14 (day-one zero services).
 */
export function ServicesTab() {
  const { services, loading, error } = useLocationServiceSchedules();
  const [filter, setFilter] = useState('all');
  const isPopulated = services.length > 0;

  /* Metrics for populated state */
  const actionCount = services.filter(s => s.state === 'action').length;
  const attentionCount = services.filter(s => s.state === 'attention').length;
  const currentCount = services.filter(s => s.state === 'current').length;

  const metricCards = [
    { label: 'Total services', value: services.length, valueColor: 'navy' },
    { label: 'Action required', value: actionCount, valueColor: 'action' },
    { label: 'Attention', value: attentionCount, valueColor: 'attention' },
    { label: 'Current', value: currentCount, valueColor: 'current' },
  ];

  /* Filter logic */
  const filteredServices = filter === 'all'
    ? services
    : services.filter(s => s.state === filter);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#1E2D4D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-white rounded-lg px-4 py-4"
        style={{ border: '1px solid #E2DDD4' }}
      >
        <p style={{ fontSize: '14px', color: '#B91C1C' }}>
          Unable to load service schedules. Please try again.
        </p>
      </div>
    );
  }

  if (!isPopulated) {
    return <DayOneServices />;
  }

  return (
    <div>
      <AISynthesisStrip message={null} />
      <MetricsStrip cards={metricCards} />

      {/* Filter row */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto">
        {['all', 'action', 'attention', 'current', 'not_contracted'].map(f => {
          const count = f === 'all' ? services.length : services.filter(s => s.state === f).length;
          const label = f === 'all' ? 'All' : f === 'not_contracted' ? 'Not contracted' : f.charAt(0).toUpperCase() + f.slice(1);
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full whitespace-nowrap transition-colors"
              style={{
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: filter === f ? '#1E2D4D' : '#FFFFFF',
                color: filter === f ? '#FAF7F0' : '#1E2D4D',
                border: filter === f ? 'none' : '1px solid #E2DDD4',
              }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Service cards */}
      <div className="flex flex-col gap-2.5">
        {filteredServices.map(service => (
          <ServiceRow key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}

/* ─── Day-one state (Surface 14) ─────────────────────────────────── */

function DayOneServices() {
  return (
    <div
      className="bg-white rounded-lg px-4 py-4"
      style={{ border: '1px solid #E2DDD4' }}
    >
      <p style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
        Every recurring service across every location, tracked at the
        service level — hood cleaning quarterly, pest control monthly,
        grease collection on cadence, linen weekly. The view shows
        what's on schedule, what's overdue, and where your network has
        coverage gaps before they become audit findings.
      </p>
      <p className="mt-3.5" style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
        Services populate automatically once vendors are in your Roster
        and start logging visits. No vendors yet, no services yet.
      </p>
    </div>
  );
}
