import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { useLocationServiceSchedules } from '../../../hooks/useLocationServiceSchedules';
import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { ServiceRow } from '../../../components/vendors/ServiceRow';
import { prp } from '../../../lib/designSystem';

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
      className="rounded-xl flex flex-col items-center text-center py-14 px-6"
      style={{ backgroundColor: '#FAF7F0', border: '2px dashed #E5E0D8' }}
    >
      <div
        className="w-[54px] h-[54px] rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: '#FEF3C7' }}
      >
        <Wrench className="h-[38px] w-[38px]" style={{ color: prp.predict.accent }} />
      </div>

      <h3
        className="text-[22px] font-bold tracking-tight mb-3"
        style={{ color: '#1E2D4D', fontFamily: "'Montserrat', sans-serif" }}
      >
        No services recorded yet
      </h3>

      <p
        className="text-sm mb-6"
        style={{ color: '#94A3B8', maxWidth: 520, lineHeight: 1.55 }}
      >
        Every recurring service across every location — hood cleaning quarterly,
        pest control monthly, grease collection on cadence, linen weekly. Services
        populate automatically once vendors are in your Roster and start logging visits.
      </p>

      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-5"
        style={{ maxWidth: 720 }}
      >
        <div
          className="rounded-lg border text-left p-3.5"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8', borderTopWidth: 3, borderTopColor: prp.predict.accent }}
        >
          <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: prp.predict.accent, letterSpacing: '0.12em' }}>
            PREDICT
          </p>
          <p className="text-xs" style={{ color: '#94A3B8', lineHeight: 1.45 }}>
            Identifies services approaching expiration or cadence gaps before they become inspection findings.
          </p>
        </div>
        <div
          className="rounded-lg border text-left p-3.5"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8', borderTopWidth: 3, borderTopColor: prp.reduce.accent }}
        >
          <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: prp.reduce.accent, letterSpacing: '0.12em' }}>
            REDUCE
          </p>
          <p className="text-xs" style={{ color: '#94A3B8', lineHeight: 1.45 }}>
            Each service carries its own cadence, coverage area, and compliance requirements — reducing missed renewals.
          </p>
        </div>
        <div
          className="rounded-lg border text-left p-3.5"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8', borderTopWidth: 3, borderTopColor: prp.prove.accent }}
        >
          <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: prp.prove.accent, letterSpacing: '0.12em' }}>
            PROVE
          </p>
          <p className="text-xs" style={{ color: '#94A3B8', lineHeight: 1.45 }}>
            Every service visit, schedule change, and coverage gap is logged with date and vendor attribution.
          </p>
        </div>
      </div>

      <p className="text-xs" style={{ color: '#94A3B8' }}>
        Add vendors to your Roster to begin recording services.
      </p>
    </div>
  );
}
