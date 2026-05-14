import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useDemo } from '../../../contexts/DemoContext';
import { useVendors } from '../../../hooks/useVendors';
import { useLocations } from '../../../hooks/api/useLocations';
import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { VendorRow } from '../../../components/vendors/VendorRow';
import { AddVendorModal } from '../../../components/vendor/AddVendorModal';

/**
 * VendorListTab — Surface 1 (populated) + Surface 13 (day-one zero vendors).
 */
export function VendorListTab() {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { data: vendorRows, isLoading, refetch } = useVendors();
  const { data: locations } = useLocations();
  const organizationId = profile?.organization_id ?? null;

  const [filter, setFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);

  // Map DB rows → VendorRow shape
  const vendors = (vendorRows ?? []).map(row => {
    const state = deriveState(row.status, row.invite_status);
    return {
      id: row.id,
      name: row.company_name,
      initials: getInitials(row.company_name),
      services: row.service_type ? [row.service_type] : [],
      coverageLine: '',
      answerLine: null,
      locationCoverage: [],
      state,
      cta: deriveCta(state),
    };
  });

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

  // Existing emails for duplicate prevention in AddVendorModal
  const existingEmails = (vendorRows ?? [])
    .flatMap(r => [r.email, r.primary_contact_email])
    .filter(Boolean);

  const accessibleLocations = (locations ?? []).map(l => ({
    locationId: l.id,
    locationName: l.name,
  }));

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#1E2D4D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isPopulated) {
    return (
      <>
        <DayOneVendorList onAdd={() => setAddOpen(true)} />
        <AddVendorModal
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          onVendorAdded={() => refetch()}
          isDemoMode={isDemoMode}
          organizationId={organizationId}
          accessibleLocations={accessibleLocations}
          existingEmails={existingEmails}
        />
      </>
    );
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

      {/* Add action */}
      <div className="flex items-center gap-2.5 mb-3">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 rounded-md flex items-center gap-1.5"
          style={{ fontSize: '12px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
        >
          <Plus size={14} />
          Add vendor
        </button>
      </div>

      {/* Vendor cards */}
      <div className="flex flex-col gap-2.5">
        {filteredVendors.map(vendor => (
          <VendorRow key={vendor.id} vendor={vendor} />
        ))}
      </div>

      <AddVendorModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onVendorAdded={() => refetch()}
        isDemoMode={isDemoMode}
        organizationId={organizationId}
        accessibleLocations={accessibleLocations}
        existingEmails={existingEmails}
      />
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function deriveState(status, inviteStatus) {
  if (inviteStatus === 'invited') return 'attention';
  return 'current';
}

function deriveCta(state) {
  if (state === 'attention') return { variant: 'secondary', label: 'Pending' };
  return { variant: 'secondary', label: 'View' };
}

function getInitials(name) {
  const parts = (name || '').split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return '??';
}

/* ─── Day-one state (Surface 13) ─────────────────────────────────── */

function DayOneVendorList({ onAdd }) {
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
          onClick={onAdd}
          className="px-4 py-2 rounded-md flex items-center gap-1.5"
          style={{ fontSize: '12px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
        >
          <Plus size={14} />
          Add vendor
        </button>
      </div>
    </div>
  );
}
