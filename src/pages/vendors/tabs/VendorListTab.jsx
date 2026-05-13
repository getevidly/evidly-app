import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { VendorRow } from '../../../components/vendors/VendorRow';

/**
 * VendorListTab — Surface 1 (populated) + Surface 13 (day-one zero vendors).
 */
export function VendorListTab() {
  const [filter, setFilter] = useState('all');
  const vendors = [];
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
      <AISynthesisStrip message={null} />
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
    <div className="text-center py-10">
      <p style={{ fontSize: '14px', fontWeight: 500, color: '#1E2D4D' }}>
        No vendors yet
      </p>
      <p className="mt-1" style={{ fontSize: '12px', color: '#5A6478' }}>
        Add your first vendor to start tracking compliance documents and service schedules.
      </p>

      <div className="mt-4">
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
