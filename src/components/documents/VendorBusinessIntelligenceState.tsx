import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Clock, Send, ShieldAlert, Building2, ChevronRight, Plus } from 'lucide-react';
import { relativeTime, expiryLabel } from '../../lib/relativeTime';
import { StatusPill } from './StatusPill';
import { Modal } from '../ui/Modal';
import { VendorCaptureForm, type VendorCaptureData } from '../vendor/VendorCaptureForm';
import { useCreateVendor } from '../../hooks/useCreateVendor';
import { useAuth } from '../../contexts/AuthContext';
import type { VendorBusinessIntelligence, VendorBusinessRow } from '../../hooks/documents/useVendorBusinessIntelligence';

interface Props {
  intel: VendorBusinessIntelligence;
  onSendRequest: () => void;
  onVendorAdded?: () => void;
}

export function VendorBusinessIntelligenceState({ intel, onSendRequest, onVendorAdded }: Props) {
  const [showAddVendor, setShowAddVendor] = useState(false);
  const { createVendor, isLoading: creatingVendor } = useCreateVendor();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const handleVendorSubmit = useCallback(async (data: VendorCaptureData) => {
    if (!orgId) return;
    const vendorId = await createVendor({
      company_name: data.companyName,
      contact_name: data.primaryContactName,
      email: data.primaryContactEmail,
      phone: data.phone || null,
      contact_phone: null,
      service_type: data.serviceTypeCodes[0] || '',
      status: 'active',
      invite_status: 'added',
      license_cert_number: null,
      has_insurance_coi: false,
      notes: data.notes || null,
      location_ids: null,
      primary_contact_name: data.primaryContactName,
      primary_contact_email: data.primaryContactEmail,
      address: data.address || null,
      service_area: data.serviceArea || null,
      service_type_codes: data.serviceTypeCodes,
    }, orgId);

    if (vendorId) {
      toast.success(`${data.companyName} added as your vendor`);
      setShowAddVendor(false);
      onVendorAdded?.();
    } else {
      toast.error('Failed to create vendor');
    }
  }, [orgId, createVendor, onVendorAdded]);

  if (intel.loading) {
    return (
      <div className="text-center py-12 text-[13px] text-[#8A93A6]">Loading intelligence{'\u2026'}</div>
    );
  }

  // State: no vendors at all — inline "Add your first vendor" CTA
  if (intel.state === 'empty') {
    return (
      <>
        <div className="border-2 border-dashed border-[#E2DDD4] rounded-lg py-16 px-6 flex flex-col items-center text-center">
          <Building2 size={32} className="text-[#B0B8C8] mb-3" />
          <p className="text-[13px] text-[#8A93A6] mb-2">
            EvidLY sees {'\u00B7'} No vendors linked to your kitchen yet
          </p>
          <p className="text-[11px] text-[#8A93A6] mb-4 max-w-md">
            Add a vendor {'\u2014'} EvidLY will automatically identify their COI, W-9, and license expirations once linked.
          </p>
          <button
            type="button"
            onClick={() => setShowAddVendor(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[13px] font-bold transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
          >
            <Plus size={14} />
            Add your first vendor
          </button>
        </div>

        <Modal isOpen={showAddVendor} onClose={() => setShowAddVendor(false)} size="md">
          <div className="px-5 py-4 border-b border-[#E2DDD4]">
            <h2 className="text-[16px] font-bold text-[#1E2D4D]">Add your first vendor</h2>
            <p className="text-[11px] text-[#8A93A6] mt-1">
              EvidLY will begin identifying their business compliance documents once linked.
            </p>
          </div>
          <div className="px-5 py-4">
            <VendorCaptureForm
              onSubmit={handleVendorSubmit}
              onCancel={() => setShowAddVendor(false)}
              orgId={orgId}
              submitLabel="Add vendor"
              isLoading={creatingVendor}
            />
          </div>
        </Modal>
      </>
    );
  }

  // State: vendors exist but no business docs
  if (intel.state === 'no_docs') {
    return (
      <div className="border-2 border-dashed border-[#E2DDD4] rounded-lg py-16 px-6 flex flex-col items-center text-center">
        <ShieldAlert size={32} className="text-[#B0B8C8] mb-3" />
        <p className="text-[13px] text-[#8A93A6] mb-2">Review your vendors' business compliance</p>
        <p className="text-[11px] text-[#8A93A6] mb-4 max-w-md">
          EvidLY identifies COI expirations, flags vendors missing required documents, and alerts you before coverage gaps.
        </p>
        <button
          type="button"
          onClick={onSendRequest}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[13px] font-bold transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
        >
          <Send size={14} />
          Send Request
        </button>
      </div>
    );
  }

  // State: populated — intelligence banner + per-vendor cards
  return (
    <div className="space-y-4">
      {/* Urgent signals banner */}
      {intel.urgentCount > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[#FEF3C7] border border-[#FDE68A]">
          <AlertTriangle size={16} className="text-[#D97706] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-[#92400E]">
              {intel.urgentCount} business document{intel.urgentCount !== 1 ? 's' : ''} need attention
            </p>
            <p className="text-[11px] text-[#B45309] mt-0.5">
              Expiring or expired COIs, licenses, or W-9s across your vendor network.
            </p>
          </div>
        </div>
      )}

      {/* Per-vendor cards */}
      {intel.vendors.map((v) => (
        <VendorBusinessCard key={v.vendor_id} vendor={v} onSendRequest={onSendRequest} />
      ))}
    </div>
  );
}

function VendorBusinessCard({ vendor, onSendRequest }: { vendor: VendorBusinessRow; onSendRequest: () => void }) {
  const navigate = useNavigate();
  const hasUrgent = vendor.expiring_count > 0 || vendor.expired_count > 0;

  return (
    <div className="bg-white border border-[#E2DDD4] rounded-lg overflow-hidden">
      {/* Vendor header */}
      <button
        type="button"
        onClick={() => navigate(`/vendors/${vendor.vendor_id}`)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F7F5EE] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-[#8A93A6]" />
          <span className="text-[13px] font-bold text-[#1E2D4D]">{vendor.vendor_name}</span>
          {hasUrgent && (
            <span className="inline-flex items-center justify-center w-[18px] h-[18px] text-[10px] font-bold text-white bg-[#B91C1C] rounded-full">
              {vendor.expiring_count + vendor.expired_count}
            </span>
          )}
          {vendor.missing_coi && (
            <span className="text-[10px] font-semibold text-[#B91C1C] bg-[#FEE2E2] px-1.5 py-0.5 rounded">No COI</span>
          )}
        </div>
        <ChevronRight size={14} className="text-[#8A93A6]" />
      </button>

      {/* Doc rows */}
      <div className="border-t border-[#E2DDD4]">
        {vendor.docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-4 py-2 border-b border-[#F3F0E8] last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-[#1E2D4D] truncate">{d.name}</p>
              <p className="text-[10px] text-[#8A93A6]">
                {d.type || 'Document'} {'\u00B7'} {relativeTime(d.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3">
              {d.expiry_date && (d.status === 'expiring' || d.status === 'expired') && (
                <span className="text-[10px] text-[#B45309] flex items-center gap-1">
                  <Clock size={10} />
                  {expiryLabel(d.expiry_date)}
                </span>
              )}
              <StatusPill status={d.status} />
            </div>
          </div>
        ))}
      </div>

      {/* Action row */}
      {(vendor.missing_coi || hasUrgent) && !vendor.request_in_flight && (
        <div className="border-t border-[#E2DDD4] px-4 py-2 bg-[#FAFBFD]">
          <button
            type="button"
            onClick={onSendRequest}
            className="flex items-center gap-1.5 text-[11px] font-bold text-[#1E2D4D] hover:opacity-80"
          >
            <Send size={11} />
            Send Request
          </button>
        </div>
      )}
      {vendor.request_in_flight && (
        <div className="border-t border-[#E2DDD4] px-4 py-2 bg-[#EEF2FF]">
          <p className="text-[11px] font-semibold text-[#4338CA]">
            Request in progress {'\u2014'} waiting on vendor
          </p>
        </div>
      )}
    </div>
  );
}
