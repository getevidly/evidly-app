import { useState } from 'react';
import { Plus, Search, Mail } from 'lucide-react';
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
    <div
      className="bg-white rounded-lg px-4 py-4"
      style={{ border: '1px solid #E2DDD4' }}
    >
      <p style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
        Your Roster is every vendor who actively touches your operation
        — hood cleaners, pest control, grease collection, linen, anyone
        whose work shows up in your kitchens. Each entry surfaces their
        state, the services they cover, their locations, and what's
        coming due.
      </p>
      <p className="mt-3.5" style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
        Add a vendor manually if you already work with them. Invite a
        vendor to self-fill if you'd rather they confirm their own
        details and upload current docs. Browse Vendor Network when
        you're hiring someone new and want a pre-vetted starting point.
      </p>
      <p className="mt-3.5" style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
        Performance signals and document review become available once
        the first vendor is in the roster.
      </p>
      <div className="flex items-center gap-2.5 mt-4">
        <button
          type="button"
          className="px-4 py-2 rounded-md flex items-center gap-1.5"
          style={{ fontSize: '12px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
        >
          <Plus size={14} />
          Add vendor
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-md flex items-center gap-1.5"
          style={{ fontSize: '12px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #1E2D4D' }}
        >
          <Mail size={14} />
          Invite vendor
        </button>
      </div>
    </div>
  );
}
