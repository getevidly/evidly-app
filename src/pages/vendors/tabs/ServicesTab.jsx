import { useState } from 'react';
import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { ServiceRow } from '../../../components/vendors/ServiceRow';

/**
 * ServicesTab — Surface 2 (populated) + Surface 14 (day-one zero services).
 */
export function ServicesTab() {
  const [filter, setFilter] = useState('all');
  const services = [];
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
    <div className="text-center py-10">
      <p style={{ fontSize: '14px', fontWeight: 500, color: '#1E2D4D' }}>
        No services tracked yet
      </p>
      <p className="mt-1" style={{ fontSize: '12px', color: '#5A6478' }}>
        Add a vendor to begin tracking service schedules, compliance cadences, and documentation.
      </p>
    </div>
  );
}
