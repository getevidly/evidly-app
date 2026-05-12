import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { AI_MESSAGES, MOCK_VENDORS } from '../../../lib/mock/vendorsMockData';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * PerformanceTab — Surface 3.
 * Performance scorecard for all vendors with KPI comparison.
 */
export function PerformanceTab() {
  const vendors = MOCK_VENDORS;

  /* Aggregate metrics */
  const avgOnTime = vendors.reduce((sum, v) => sum + parseFloat(v.kpi.onTime), 0) / vendors.length;
  const avgResponse = vendors.reduce((sum, v) => sum + parseFloat(v.kpi.response), 0) / vendors.length;
  const fullDocs = vendors.filter(v => v.kpi.docsStatus.startsWith(v.kpi.docsStatus.split(' of ')[1]?.trim() || '0')).length;

  const metricCards = [
    { label: 'Avg on-time', value: `${Math.round(avgOnTime)}%`, valueColor: avgOnTime >= 90 ? 'current' : avgOnTime >= 70 ? 'attention' : 'action' },
    { label: 'Avg response', value: `${avgResponse.toFixed(1)}d`, valueColor: 'navy' },
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
      <AISynthesisStrip message={AI_MESSAGES.performance} />
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
          const onTimePct = parseFloat(vendor.kpi.onTime);
          const onTimeColor = onTimePct >= 90 ? '#2E7D32' : onTimePct >= 70 ? '#B45309' : '#B91C1C';

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
