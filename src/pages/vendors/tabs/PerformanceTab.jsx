import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { useVendorPerformance } from '../../../hooks/useVendorPerformance';
import { prp } from '../../../lib/designSystem';

/**
 * PerformanceTab — Surface 3.
 * Performance scorecard for all vendors with KPI comparison.
 */
export function PerformanceTab() {
  const { vendors, loading } = useVendorPerformance();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#1E2D4D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div
        className="rounded-xl flex flex-col items-center text-center py-14 px-6"
        style={{ backgroundColor: '#FAF7F0', border: '2px dashed #E5E0D8' }}
      >
        <div
          className="w-[54px] h-[54px] rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: '#FEF3C7' }}
        >
          <BarChart3 className="h-[38px] w-[38px]" style={{ color: '#2f7a4d' }} />
        </div>

        <h3
          className="text-[22px] font-bold tracking-tight mb-3"
          style={{ color: '#1E2D4D', fontFamily: "'Montserrat', sans-serif" }}
        >
          No performance data yet
        </h3>

        <p
          className="text-sm mb-6"
          style={{ color: '#94A3B8', maxWidth: 520, lineHeight: 1.55 }}
        >
          Performance signals build as your vendors complete service visits over
          time. On-time rate, response time, and document health appear once each
          vendor has logged at least three service records. EvidLY doesn't
          fabricate metrics — as records accumulate, vendors appear here ranked
          by reliability.
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
              Identifies vendors trending toward late service or declining response times before patterns become problems.
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
              Performance baselines help you address service issues with data, reducing guesswork in vendor conversations.
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
              On-time rates, response times, and document health are calculated from real service records — never fabricated.
            </p>
          </div>
        </div>

        <p className="text-xs" style={{ color: '#94A3B8' }}>
          Vendor performance appears once service records begin accumulating.
        </p>
      </div>
    );
  }

  /* Aggregate metrics */
  const onTimeVendors = vendors.filter(v => v.kpi.onTime.endsWith('%'));
  const avgOnTime = onTimeVendors.length > 0
    ? onTimeVendors.reduce((sum, v) => sum + parseFloat(v.kpi.onTime), 0) / onTimeVendors.length
    : 0;
  const responseVendors = vendors.filter(v => v.kpi.response !== '—');
  const avgResponse = responseVendors.length > 0
    ? responseVendors.reduce((sum, v) => sum + parseFloat(v.kpi.response), 0) / responseVendors.length
    : 0;
  const fullDocs = vendors.filter(v => {
    const parts = v.kpi.docsStatus.split(' of ');
    return parts.length === 2 && parts[0].trim() === parts[1].trim() && parts[0].trim() !== '0';
  }).length;

  const metricCards = [
    { label: 'Avg on-time', value: onTimeVendors.length > 0 ? `${Math.round(avgOnTime)}%` : '—', valueColor: avgOnTime >= 90 ? 'current' : avgOnTime >= 70 ? 'attention' : 'action' },
    { label: 'Avg response', value: responseVendors.length > 0 ? `${avgResponse.toFixed(1)}d` : '—', valueColor: 'navy' },
    { label: 'Full docs', value: `${fullDocs} of ${vendors.length}`, valueColor: 'navy' },
    { label: 'Total vendors', value: vendors.length, valueColor: 'navy' },
  ];

  const TrendIcon = ({ trend }) => {
    if (trend === 'up') return <TrendingUp size={12} style={{ color: '#2E7D32' }} />;
    if (trend === 'down') return <TrendingDown size={12} style={{ color: '#B91C1C' }} />;
    return <Minus size={12} style={{ color: '#5A6478' }} />;
  };

  return (
    <div>
      <AISynthesisStrip message={null} />
      <MetricsStrip cards={metricCards} />

      {/* Performance table */}
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #E2DDD4' }}>
        {/* Header */}
        <div
          className="grid grid-cols-5 px-4 py-2"
          style={{ borderBottom: '1px solid #E2DDD4', backgroundColor: '#FDFCF9' }}
        >
          <p className="col-span-2" style={{ fontSize: '10px', fontWeight: 500, color: '#5A6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Vendor
          </p>
          <p style={{ fontSize: '10px', fontWeight: 500, color: '#5A6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Response
          </p>
          <p style={{ fontSize: '10px', fontWeight: 500, color: '#5A6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            On-time
          </p>
          <p style={{ fontSize: '10px', fontWeight: 500, color: '#5A6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Docs
          </p>
        </div>

        {/* Rows */}
        {vendors.map((vendor, i) => {
          const onTimePct = vendor.kpi.onTime.endsWith('%') ? parseFloat(vendor.kpi.onTime) : NaN;
          const onTimeColor = isNaN(onTimePct) ? '#5A6478' : onTimePct >= 90 ? '#2E7D32' : onTimePct >= 70 ? '#B45309' : '#B91C1C';

          return (
            <div
              key={vendor.id}
              className="grid grid-cols-5 px-4 py-3 items-center"
              style={{ borderBottom: i < vendors.length - 1 ? '1px solid #E2DDD4' : 'none' }}
            >
              <div className="col-span-2 flex items-center gap-2 min-w-0">
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#F4EFE0', color: '#1E2D4D', fontSize: '10px', fontWeight: 500 }}
                >
                  {vendor.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate" style={{ fontSize: '12px', fontWeight: 500, color: '#1E2D4D' }}>
                    {vendor.name}
                  </p>
                  <p className="truncate" style={{ fontSize: '10px', color: '#5A6478' }}>
                    {vendor.services.join(', ')}
                  </p>
                </div>
              </div>
              <p className="flex items-center gap-1" style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D' }}>
                {vendor.kpi.response}
              </p>
              <p className="flex items-center gap-1" style={{ fontSize: '13px', fontWeight: 500, color: onTimeColor }}>
                {vendor.kpi.onTime}
                <TrendIcon trend={vendor.kpi.trend} />
              </p>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D' }}>
                {vendor.kpi.docsStatus}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
