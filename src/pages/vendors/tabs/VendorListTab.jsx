import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { VendorRow } from '../../../components/vendors/VendorRow';
import {
  MOCK_VENDORS,
  AI_MESSAGES,
  STARTER_CATEGORIES,
} from '../../../lib/mock/vendorsMockData';

/**
 * VendorListTab — Surface 1 (populated) + Surface 13 (day-one zero vendors).
 */
export function VendorListTab() {
  const [filter, setFilter] = useState('all');
  const vendors = MOCK_VENDORS;
  const isPopulated = vendors.length > 0;

  /* Metrics for populated state */
  const actionCount = vendors.filter(v => v.state === 'action').length;
  const attentionCount = vendors.filter(v => v.state === 'attention').length;
  const currentCount = vendors.filter(v => v.state === 'current').length;

  const metricCards = [
    { label: 'Total vendors', value: vendors.length, valueColor: 'navy' },
    { label: 'Action required', value: actionCount, valueColor: 'action' },
    { label: 'Attention', value: attentionCount, valueColor: 'attention' },
    { label: 'Current', value: currentCount, valueColor: 'current' },
  ];

  /* Filter logic */
  const filteredVendors = filter === 'all'
    ? vendors
    : vendors.filter(v => v.state === filter);

  if (!isPopulated) {
    return <DayOneVendorList />;
  }

  return (
    <div>
      {/* AI synthesis */}
      <AISynthesisStrip message={AI_MESSAGES.vendorList} />

      {/* Metrics */}
      <MetricsStrip cards={metricCards} />

      {/* Filter row */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto">
        {['all', 'action', 'attention', 'current'].map(f => (
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
            {f === 'all' ? `All (${vendors.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${vendors.filter(v => v.state === f).length})`}
          </button>
        ))}
      </div>

      {/* Vendor cards */}
      <div className="flex flex-col gap-2.5">
        {filteredVendors.map(vendor => (
          <VendorRow key={vendor.id} vendor={vendor} />
        ))}
      </div>
    </div>
  );
}

/* ─── Day-one state (Surface 13) ─────────────────────────────────── */

function DayOneVendorList() {
  return (
    <div>
      {/* AI synthesis — day-one message */}
      <AISynthesisStrip message={AI_MESSAGES.dayOneVendorList} />

      {/* Starter categories */}
      <p
        className="uppercase tracking-wider mb-2"
        style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#5A6478' }}
      >
        Suggested categories
      </p>

      <div className="flex flex-col gap-2.5">
        {STARTER_CATEGORIES.map(cat => (
          <div
            key={cat.name}
            className="bg-white rounded-lg px-4 py-3.5"
            style={{ border: '1px solid #E2DDD4' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1E2D4D' }}>
                  {cat.name}
                </p>
                <p className="mt-0.5" style={{ fontSize: '11px', color: '#5A6478' }}>
                  {cat.category} · {cat.cadence}
                </p>
                <p className="mt-1.5" style={{ fontSize: '12px', color: '#1E2D4D', lineHeight: '1.4' }}>
                  {cat.whyRequired}
                </p>
                <p className="mt-1.5" style={{ fontSize: '11px', color: '#5A6478' }}>
                  {cat.suggestedVendors.join(', ')} + {cat.moreCount} more in your area
                </p>
              </div>
              <button
                type="button"
                className="flex-shrink-0 px-2.5 py-1 rounded-md mt-1"
                style={{ fontSize: '11px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
              >
                Add vendor
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Browse directory CTA */}
      <div className="mt-4 text-center">
        <button
          type="button"
          className="px-4 py-2 rounded-md"
          style={{ fontSize: '12px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #1E2D4D' }}
        >
          Browse vendor directory
        </button>
      </div>
    </div>
  );
}
