import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Clock, Send, Wrench, Building2, ChevronRight, Plus } from 'lucide-react';
import { relativeTime, expiryLabel } from '../../lib/relativeTime';
import { StatusPill } from './StatusPill';
import { Modal } from '../ui/Modal';
import { VendorCaptureForm, type VendorCaptureData } from '../vendor/VendorCaptureForm';
import { useCreateVendor } from '../../hooks/useCreateVendor';
import { useAuth } from '../../contexts/AuthContext';
import type { VendorServiceIntelligence, VendorServiceRow } from '../../hooks/documents/useVendorServiceIntelligence';

interface Props {
  intel: VendorServiceIntelligence;
  onSendRequest: () => void;
  onVendorAdded?: () => void;
}

export function VendorServiceIntelligenceState({ intel, onSendRequest, onVendorAdded }: Props) {
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

  // State: no vendors — inline "Add your first vendor" CTA
  if (intel.state === 'empty') {
    return (
      <>
        <div className="border-2 border-dashed border-[#E2DDD4] rounded-lg py-16 px-6 flex flex-col items-center text-center">
          <Building2 size={32} className="text-[#B0B8C8] mb-3" />
          <p className="text-[13px] text-[#8A93A6] mb-2">
            EvidLY sees {'\u00B7'} No vendors linked to your kitchen yet
          </p>
          <p className="text-[11px] text-[#8A93A6] mb-4 max-w-md">
            Add a vendor {'\u2014'} for hood cleaning, fire suppression, pest control, or any service {'\u2014'} and EvidLY will start tracking service records automatically.
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
              EvidLY will begin tracking their service records once linked.
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

  // State: vendors exist but no service docs
  if (intel.state === 'no_docs') {
    return (
      <div className="border-2 border-dashed border-[#E2DDD4] rounded-lg py-16 px-6 flex flex-col items-center text-center">
        <Wrench size={32} className="text-[#B0B8C8] mb-3" />
        <p className="text-[13px] text-[#8A93A6] mb-2">Track your vendors' service work</p>
        <p className="text-[11px] text-[#8A93A6] mb-4 max-w-md">
          EvidLY watches for hood cleaning reports, suppression tests, pest control logs, fire alarm inspections {'\u2014'} and tells you what's missing.
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

  // State: populated
  return (
    <div className="space-y-4">
      {intel.urgentCount > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[#FEF3C7] border border-[#FDE68A]">
          <AlertTriangle size={16} className="text-[#D97706] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-[#92400E]">
              {intel.urgentCount} service record{intel.urgentCount !== 1 ? 's' : ''} need attention
            </p>
            <p className="text-[11px] text-[#B45309] mt-0.5">
              Expiring or expired service certifications across your vendor network.
            </p>
          </div>
        </div>
      )}

      {intel.vendors.map((v) => (
        <VendorServiceCard key={v.vendor_id} vendor={v} onSendRequest={onSendRequest} />
      ))}
    </div>
  );
}

function VendorServiceCard({ vendor, onSendRequest }: { vendor: VendorServiceRow; onSendRequest: () => void }) {
  const navigate = useNavigate();
  const hasUrgent = vendor.expiring_count > 0 || vendor.expired_count > 0;

  return (
    <div className="bg-white border border-[#E2DDD4] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => navigate(`/vendors/${vendor.vendor_id}`)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F7F5EE] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Wrench size={14} className="text-[#8A93A6]" />
          <span className="text-[13px] font-bold text-[#1E2D4D]">{vendor.vendor_name}</span>
          {hasUrgent && (
            <span className="inline-flex items-center justify-center w-[18px] h-[18px] text-[10px] font-bold text-white bg-[#B91C1C] rounded-full">
              {vendor.expiring_count + vendor.expired_count}
            </span>
          )}
        </div>
        <ChevronRight size={14} className="text-[#8A93A6]" />
      </button>

      <div className="border-t border-[#E2DDD4]">
        {vendor.docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-4 py-2 border-b border-[#F3F0E8] last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-[#1E2D4D] truncate">{d.name}</p>
              <p className="text-[10px] text-[#8A93A6]">
                {d.type || 'Service record'} {'\u00B7'} {relativeTime(d.created_at)}
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

      {hasUrgent && !vendor.request_in_flight && (
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
