import { useState } from 'react';
import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { ServiceRow } from '../../../components/vendors/ServiceRow';
import {
  MOCK_SERVICES,
  AI_MESSAGES,
  DAY_ONE_SERVICES,
} from '../../../lib/mock/vendorsMockData';

/**
 * ServicesTab — Surface 2 (populated) + Surface 14 (day-one zero services).
 */
export function ServicesTab() {
  const [filter, setFilter] = useState('all');
  const services = MOCK_SERVICES;
  const isPopulated = services.length > 0;

  /* Metrics for populated state */
  const actionCount = services.filter(s => s.state === 'action').length;
  const attentionCount = services.filter(s => s.state === 'attention').length;
  const currentCount = services.filter(s => s.state === 'current').length;
  const notContractedCount = services.filter(s => s.state === 'not_contracted').length;

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
      {/* AI synthesis */}
      <AISynthesisStrip message={AI_MESSAGES.services} />

      {/* Metrics */}
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
    <div>
      {/* AI synthesis — day-one message */}
      <AISynthesisStrip message={AI_MESSAGES.dayOneServices} />

      {/* Service requirements list */}
      <p
        className="uppercase tracking-wider mb-2"
        style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#5A6478' }}
      >
        Required and recommended services
      </p>

      <div className="flex flex-col gap-2.5">
        {DAY_ONE_SERVICES.map(svc => (
          <div
            key={svc.name}
            className="bg-white rounded-lg px-4 py-3.5"
            style={{ border: '1px solid #E2DDD4' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#1E2D4D' }}>
                    {svc.name}
                  </p>
                  {svc.required && (
                    <span
                      className="px-1.5 py-0.5 rounded"
                      style={{ fontSize: '9px', fontWeight: 500, backgroundColor: '#FCE8E4', color: '#B91C1C' }}
                    >
                      Required
                    </span>
                  )}
                </div>
                <p className="mt-0.5" style={{ fontSize: '11px', color: '#5A6478' }}>
                  {svc.category} · {svc.cadence}
                  {svc.citation && (
                    <span style={{ color: '#A08C5A' }}> · {svc.citation}</span>
                  )}
                </p>
                <p className="mt-1.5" style={{ fontSize: '11px', color: '#5A6478' }}>
                  Suggested: {svc.suggestedVendors.join(', ')}
                </p>
              </div>
              <button
                type="button"
                className="flex-shrink-0 px-2.5 py-1 rounded-md mt-1"
                style={{ fontSize: '11px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #1E2D4D' }}
              >
                Assign vendor
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
