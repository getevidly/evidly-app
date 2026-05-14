import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useVendorPerformance } from '../../../hooks/useVendorPerformance';

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
        className="bg-white rounded-lg px-4 py-4"
        style={{ border: '1px solid #E2DDD4', borderRadius: '8px' }}
      >
        <p style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
          Performance signals build as your vendors complete service visits
          over time. On-time rate, response time, and document health appear
          once each vendor has logged at least three service records.
        </p>
        <p style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6', marginTop: '14px' }}>
          Until then, this view stays quiet on purpose — EvidLY doesn't
          fabricate metrics. As records accumulate, vendors begin appearing
          here ranked by reliability.
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
