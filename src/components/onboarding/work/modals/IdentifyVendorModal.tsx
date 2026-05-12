import { useState, useEffect, useCallback } from 'react';
import Modal from '../../../ui/Modal';
import { supabase } from '../../../../lib/supabase';
import { useCreateVendor } from '../../../../hooks/useCreateVendor';
import { toast } from 'sonner';
import { Building2, Search, AlertTriangle, ChevronRight } from 'lucide-react';
import { REQUIREMENT_TO_SERVICE_CODE, REQUIREMENT_TO_VENDOR_SERVICE } from '../workConstants';
import { evaluateOnboardingComplete } from '../../../../lib/onboarding/completionDetection';
import { VendorCaptureForm, type VendorCaptureData } from '../../../vendor/VendorCaptureForm';
import type { PillarRequirement } from '../../../../hooks/onboarding/usePillarRequirements';

interface IdentifyVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: PillarRequirement;
  organizationId: string;
  onComplete: () => void;
  onRequestCOI?: (vendorId: string, vendorEmail: string, vendorName: string) => void;
}

type SelectedPath = null | 'a' | 'b' | 'c';

interface ExistingVendor {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
}

export function IdentifyVendorModal({
  isOpen,
  onClose,
  requirement,
  organizationId,
  onComplete,
  onRequestCOI,
}: IdentifyVendorModalProps) {
  const [selectedPath, setSelectedPath] = useState<SelectedPath>(null);

  const resetState = useCallback(() => {
    setSelectedPath(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-[#1E2D4D] mb-1">
          {requirement.label} &middot; who handles this?
        </h2>
        <p className="text-xs text-[#8A93A6] mb-4">
          {requirement.citation && <span className="font-mono">{requirement.citation}</span>}
          {requirement.description && ` — ${requirement.description}`}
        </p>

        <div className="space-y-2">
          <OptionCard
            icon={<Building2 size={18} />}
            title="I have one — let me enter their info"
            isSelected={selectedPath === 'a'}
            onClick={() => setSelectedPath(selectedPath === 'a' ? null : 'a')}
          />
          {selectedPath === 'a' && (
            <PathAForm
              requirement={requirement}
              organizationId={organizationId}
              onComplete={onComplete}
              onClose={handleClose}
              onRequestCOI={onRequestCOI}
            />
          )}

          <OptionCard
            icon={<Search size={18} />}
            title="Pick from existing vendors"
            isSelected={selectedPath === 'b'}
            onClick={() => setSelectedPath(selectedPath === 'b' ? null : 'b')}
          />
          {selectedPath === 'b' && (
            <PathBList
              requirement={requirement}
              organizationId={organizationId}
              onComplete={onComplete}
              onClose={handleClose}
            />
          )}

          <OptionCard
            icon={<AlertTriangle size={18} />}
            title="We don't have one yet — flag the gap"
            isSelected={selectedPath === 'c'}
            onClick={() => setSelectedPath(selectedPath === 'c' ? null : 'c')}
          />
          {selectedPath === 'c' && (
            <PathCConfirm
              requirement={requirement}
              organizationId={organizationId}
              onComplete={onComplete}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

function OptionCard({ icon, title, isSelected, onClick }: {
  icon: React.ReactNode;
  title: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center gap-3 ${
        isSelected
          ? 'border-[#1E2D4D] bg-[#1E2D4D]/5'
          : 'border-[#E2DDD4] bg-white hover:border-[#1E2D4D]/30'
      }`}
    >
      <span className={isSelected ? 'text-[#1E2D4D]' : 'text-[#8A93A6]'}>{icon}</span>
      <span className="text-sm font-medium text-[#1E2D4D] flex-1">{title}</span>
      <ChevronRight size={14} className={`text-[#8A93A6] transition-transform ${isSelected ? 'rotate-90' : ''}`} />
    </button>
  );
}

/** Path A — enter vendor info via shared capture form */
function PathAForm({ requirement, organizationId, onComplete, onClose, onRequestCOI }: {
  requirement: PillarRequirement;
  organizationId: string;
  onComplete: () => void;
  onClose: () => void;
  onRequestCOI?: (vendorId: string, vendorEmail: string, vendorName: string) => void;
}) {
  const { createVendor, isLoading } = useCreateVendor();

  const handleSubmit = useCallback(async (data: VendorCaptureData) => {
    const serviceTerms = REQUIREMENT_TO_VENDOR_SERVICE[requirement.requirement_code];
    const serviceType = data.serviceTypeCodes[0] || serviceTerms?.[0] || requirement.label;

    const vendorId = await createVendor({
      company_name: data.companyName,
      contact_name: data.primaryContactName,
      email: data.primaryContactEmail,
      phone: data.phone || null,
      contact_phone: null,
      service_type: serviceType,
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
    }, organizationId);

    if (!vendorId) {
      toast.error('Failed to create vendor');
      return;
    }

    // Get org's first location for schedule
    const { data: locData } = await supabase
      .from('locations')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1)
      .maybeSingle();

    const serviceCode = REQUIREMENT_TO_SERVICE_CODE[requirement.requirement_code];

    if (locData?.id && serviceCode) {
      await supabase.from('location_service_schedules').upsert({
        organization_id: organizationId,
        location_id: locData.id,
        vendor_id: vendorId,
        service_type_code: serviceCode,
        frequency: 'quarterly',
        is_active: true,
      }, { onConflict: 'organization_id,location_id,service_type_code' });
    } else if (!locData?.id) {
      toast.warning('Vendor saved. Service schedule will be created once a location is set up.');
    }

    // COI request
    if (onRequestCOI) {
      onRequestCOI(vendorId, data.primaryContactEmail, data.companyName);
    }

    toast.success(`${data.companyName} added as your vendor`);
    evaluateOnboardingComplete(organizationId);
    onComplete();
    onClose();
  }, [requirement, organizationId, createVendor, onComplete, onClose, onRequestCOI]);

  return (
    <div className="ml-4 pl-4 border-l-2 border-[#E2DDD4] py-2">
      <VendorCaptureForm
        onSubmit={handleSubmit}
        onCancel={onClose}
        compactMode
        orgId={organizationId}
        submitLabel="Save vendor"
        isLoading={isLoading}
      />
    </div>
  );
}

/** Path B — pick from existing org vendors */
function PathBList({ requirement, organizationId, onComplete, onClose }: {
  requirement: PillarRequirement;
  organizationId: string;
  onComplete: () => void;
  onClose: () => void;
}) {
  const [vendors, setVendors] = useState<ExistingVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVendors() {
      setLoading(true);
      const searchTerms = REQUIREMENT_TO_VENDOR_SERVICE[requirement.requirement_code] || [];

      const { data } = await supabase
        .from('vendors')
        .select('id, company_name, contact_name, email, phone, service_type')
        .in('id', (
          await supabase
            .from('vendor_client_relationships')
            .select('vendor_id')
            .eq('organization_id', organizationId)
            .eq('status', 'active')
        ).data?.map((r: { vendor_id: string }) => r.vendor_id) || []);

      const filtered = (data || []).filter(v => {
        if (searchTerms.length === 0) return true;
        return searchTerms.some(term =>
          (v.service_type || '').toLowerCase().includes(term.toLowerCase())
        );
      });

      setVendors(filtered);
      setLoading(false);
    }
    fetchVendors();
  }, [organizationId, requirement.requirement_code]);

  const handleSelect = useCallback(async (vendorId: string) => {
    setSelecting(vendorId);
    const serviceCode = REQUIREMENT_TO_SERVICE_CODE[requirement.requirement_code];

    const { data: locData } = await supabase
      .from('locations')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1)
      .maybeSingle();

    if (locData?.id && serviceCode) {
      await supabase.from('location_service_schedules').upsert({
        organization_id: organizationId,
        location_id: locData.id,
        vendor_id: vendorId,
        service_type_code: serviceCode,
        frequency: 'quarterly',
        is_active: true,
      }, { onConflict: 'organization_id,location_id,service_type_code' });
    }

    const vendor = vendors.find(v => v.id === vendorId);
    toast.success(`${vendor?.company_name || 'Vendor'} selected`);
    evaluateOnboardingComplete(organizationId);
    setSelecting(null);
    onComplete();
    onClose();
  }, [organizationId, requirement.requirement_code, vendors, onComplete, onClose]);

  if (loading) {
    return (
      <div className="ml-4 pl-4 border-l-2 border-[#E2DDD4] py-4 flex justify-center">
        <div className="w-5 h-5 border-2 border-[#1E2D4D]/30 border-t-[#1E2D4D] rounded-full animate-spin" />
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="ml-4 pl-4 border-l-2 border-[#E2DDD4] py-3">
        <p className="text-xs text-[#8A93A6]">No vendors on file for this service. Use Option A to add one.</p>
      </div>
    );
  }

  return (
    <div className="ml-4 pl-4 border-l-2 border-[#E2DDD4] py-2 space-y-1">
      {vendors.map(v => (
        <div key={v.id} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#F7F5EE] transition-colors">
          <div>
            <p className="text-sm font-medium text-[#1E2D4D]">{v.company_name}</p>
            {v.contact_name && <p className="text-[10px] text-[#8A93A6]">{v.contact_name}</p>}
          </div>
          <button type="button" onClick={() => handleSelect(v.id)}
            disabled={selecting === v.id}
            className="px-3 py-1 text-xs font-medium border border-[#1E2D4D] text-[#1E2D4D] rounded-full hover:bg-[#1E2D4D] hover:text-[#FAF7F0] transition-all disabled:opacity-50">
            {selecting === v.id ? '...' : 'Select'}
          </button>
        </div>
      ))}
    </div>
  );
}

/** Path C — flag the gap */
function PathCConfirm({ requirement, organizationId, onComplete, onClose }: {
  requirement: PillarRequirement;
  organizationId: string;
  onComplete: () => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = useCallback(async () => {
    setConfirming(true);

    // Add to skipped items
    const { data: orgData } = await supabase
      .from('organizations')
      .select('onboarding_skipped_items')
      .eq('id', organizationId)
      .maybeSingle();

    const current: string[] = (orgData?.onboarding_skipped_items as string[]) || [];
    if (!current.includes(requirement.requirement_code)) {
      await supabase
        .from('organizations')
        .update({ onboarding_skipped_items: [...current, requirement.requirement_code] })
        .eq('id', organizationId);
    }

    toast.success('Flagged as a gap. You can resume anytime.');
    setConfirming(false);
    onComplete();
    onClose();
  }, [organizationId, requirement.requirement_code, onComplete, onClose]);

  return (
    <div className="ml-4 pl-4 border-l-2 border-[#E2DDD4] py-3 space-y-3">
      <p className="text-xs text-[#8A93A6]">
        We'll flag this as a gap. EvidLY can suggest Vendor Network options later on the Vendor Services surface.
      </p>
      <button type="button" onClick={handleConfirm} disabled={confirming}
        className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50">
        {confirming ? 'Flagging...' : 'Flag as gap'}
      </button>
    </div>
  );
}
