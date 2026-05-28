import { useState, useEffect } from 'react';
import { Plus, Building2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useDemo } from '../../../contexts/DemoContext';
import { useVendors } from '../../../hooks/useVendors';
import { useLocations } from '../../../hooks/api/useLocations';
import { supabase } from '../../../lib/supabase';
import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { VendorRow } from '../../../components/vendors/VendorRow';
import { AddVendorModal } from '../../../components/vendor/AddVendorModal';
import { RecommendVendorModal } from '../../../components/vendors/RecommendVendorModal';
import { prp } from '../../../lib/designSystem';

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
  const [recommendVendor, setRecommendVendor] = useState(null);
  const [recommendedIds, setRecommendedIds] = useState(new Set());

  // Fetch existing active recommendations for this org's vendors
  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from('vendor_recommendations')
      .select('source_roster_vendor_id')
      .eq('organization_id', organizationId)
      .in('status', ['pending_review', 'under_review', 'approved'])
      .not('source_roster_vendor_id', 'is', null)
      .then(({ data }) => {
        if (data) setRecommendedIds(new Set(data.map(r => r.source_roster_vendor_id)));
      });
  }, [organizationId]);

  const handleRecommended = (vendorId) => {
    if (vendorId) setRecommendedIds(prev => new Set(prev).add(vendorId));
  };

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
      // Raw fields for recommend modal prefill
      contactName: row.primary_contact_name || '',
      email: row.primary_contact_email || row.email || '',
      phone: row.phone || '',
      serviceType: row.service_type || '',
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
          <VendorRow
            key={vendor.id}
            vendor={vendor}
            isRecommended={recommendedIds.has(vendor.id)}
            onRecommend={(v) => setRecommendVendor(v)}
          />
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

      <RecommendVendorModal
        isOpen={!!recommendVendor}
        onClose={() => setRecommendVendor(null)}
        prefilledVendor={recommendVendor}
        onRecommended={handleRecommended}
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
      className="rounded-xl flex flex-col items-center text-center py-14 px-6"
      style={{ backgroundColor: '#FAF7F0', border: '2px dashed #E5E0D8' }}
    >
      <div
        className="w-[54px] h-[54px] rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: '#DBEAFE' }}
      >
        <Building2 className="h-[38px] w-[38px]" style={{ color: '#1E2D4D' }} />
      </div>

      <h3
        className="text-[22px] font-bold tracking-tight mb-3"
        style={{ color: '#1E2D4D', fontFamily: "'Montserrat', sans-serif" }}
      >
        No vendors in your roster yet
      </h3>

      <p
        className="text-sm mb-6"
        style={{ color: '#94A3B8', maxWidth: 520, lineHeight: 1.55 }}
      >
        Your Roster is every vendor who actively touches your operation — hood
        cleaners, pest control, grease collection, linen. Add a vendor manually
        or invite them to self-fill their details and upload current docs.
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
            Identifies vendors approaching service expiration, missing coverage, or incomplete documentation before gaps affect your operation.
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
            Each vendor entry captures service scope, location coverage, and document status — reducing the chance of missed renewals or expired credentials.
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
            Every vendor interaction, document submission, and service update carries a timestamp and author trail.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-lg font-bold"
        style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0', padding: '12px 22px', fontSize: 14, minHeight: 44 }}
      >
        <Plus size={14} />
        Add your first vendor
      </button>
    </div>
  );
}
