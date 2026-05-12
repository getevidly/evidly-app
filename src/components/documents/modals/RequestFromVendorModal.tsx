import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Send, ChevronRight, User } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useCreateVendor } from '../../../hooks/useCreateVendor';
import { VendorCaptureForm, type VendorCaptureData } from '../../vendor/VendorCaptureForm';

interface RequestFromVendorModalProps {
  onClose: () => void;
  onComplete: () => void;
  sourceTab: 'service' | 'business';
  preSelectedVendor?: { id: string; name: string; email: string } | null;
}

interface LinkedVendor {
  vendor_id: string;
  vendor_name: string;
  service_type_code: string;
  last_service_date: string | null;
  email?: string;
}

interface RecentVendor {
  recipient_name: string;
  recipient_email: string;
  vendor_id: string | null;
}

const SERVICE_DOC_TYPES = [
  'Hood Cleaning Report',
  'Suppression Test Cert',
  'Pest Control Service Log',
  'Grease Trap Manifest',
  'Fire Alarm Inspection Report',
  'Sprinkler Inspection Report',
  'Fire Extinguisher Service Tag',
  'Fan Performance Report',
];

const BUSINESS_DOC_TYPES = [
  'COI - General Liability',
  'COI - Auto Liability',
  'W-9',
  'Business License',
  'Workers Comp Certificate',
  'IKECA Certification',
  'Master Service Agreement',
  'Other',
];

const STEP_LABELS = ['Vendor', 'Document Type', 'Message', 'Confirm'];

export function RequestFromVendorModal({
  onClose,
  onComplete,
  sourceTab,
  preSelectedVendor,
}: RequestFromVendorModalProps) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [step, setStep] = useState(preSelectedVendor ? 2 : 1);

  // Vendor state
  const [vendorId, setVendorId] = useState(preSelectedVendor?.id || '');
  const [vendorName, setVendorName] = useState(preSelectedVendor?.name || '');
  const [vendorEmail, setVendorEmail] = useState(preSelectedVendor?.email || '');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const { createVendor, isLoading: creatingVendor } = useCreateVendor();

  // Data
  const [linkedVendors, setLinkedVendors] = useState<LinkedVendor[]>([]);
  const [recentVendors, setRecentVendors] = useState<RecentVendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);

  // Document type
  const [docType, setDocType] = useState('');

  // Cover message
  const [coverMsg, setCoverMsg] = useState('');

  // Sending
  const [sending, setSending] = useState(false);

  // Fetch linked vendors + recent requests
  useEffect(() => {
    if (!orgId) { setLoadingVendors(false); return; }

    Promise.all([
      supabase
        .from('location_service_schedules')
        .select('vendor_id, vendor_name, service_type_code, last_service_date')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .not('vendor_id', 'is', null)
        .order('vendor_name')
        .limit(20),
      supabase
        .from('compliance_document_requests')
        .select('recipient_name, recipient_email, vendor_id')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]).then(async ([vendorRes, recentRes]) => {
      let unique: LinkedVendor[] = [];
      if (vendorRes.data) {
        const seen = new Set<string>();
        for (const row of vendorRes.data as LinkedVendor[]) {
          if (!row.vendor_id || seen.has(row.vendor_id)) continue;
          seen.add(row.vendor_id);
          unique.push(row);
          if (unique.length >= 5) break;
        }

        // Fetch emails from vendors table
        if (unique.length > 0) {
          const ids = unique.map((v) => v.vendor_id);
          const { data: vendorData } = await supabase
            .from('vendors')
            .select('id, email')
            .in('id', ids);
          if (vendorData) {
            const emailMap = new Map(
              vendorData.map((v: { id: string; email: string | null }) => [v.id, v.email || ''])
            );
            unique = unique.map((v) => ({ ...v, email: emailMap.get(v.vendor_id) || '' }));
          }
        }
        setLinkedVendors(unique);
      }

      if (recentRes.data) {
        const seen = new Set<string>();
        const recentUnique: RecentVendor[] = [];
        for (const row of recentRes.data as RecentVendor[]) {
          if (!row.recipient_name || seen.has(row.recipient_name)) continue;
          seen.add(row.recipient_name);
          recentUnique.push(row);
          if (recentUnique.length >= 3) break;
        }
        setRecentVendors(recentUnique);
      }
      setLoadingVendors(false);
    });
  }, [orgId]);

  // Auto-draft cover message when vendor + docType are set
  useEffect(() => {
    if (vendorName && docType) {
      const orgName = profile?.organization_name || 'our organization';
      const userName = profile?.full_name || 'Team';
      setCoverMsg(
        `Hi ${vendorName},\n\nWe need a current ${docType} for our records at ${orgName}. Please upload using the secure link below. The link expires in 14 days.\n\nThanks!\n${userName}`
      );
    }
  }, [vendorName, docType, profile]);

  const selectVendor = (id: string, name: string, email: string) => {
    setVendorId(id);
    setVendorName(name);
    setVendorEmail(email);
    setStep(2);
  };

  const handleVendorCapture = useCallback(async (data: VendorCaptureData) => {
    if (!orgId) return;
    const newId = await createVendor({
      company_name: data.companyName,
      contact_name: data.primaryContactName,
      email: data.primaryContactEmail,
      phone: data.phone,
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

    if (newId) {
      setVendorId(newId);
      setVendorName(data.companyName);
      setVendorEmail(data.primaryContactEmail);
      setStep(2);
    } else {
      toast.error('Failed to create vendor');
    }
  }, [orgId, createVendor]);

  const docTypes = sourceTab === 'service' ? SERVICE_DOC_TYPES : BUSINESS_DOC_TYPES;

  const handleSend = useCallback(async () => {
    if (!orgId || !vendorEmail.trim()) return;
    setSending(true);

    try {
      const secureToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Create placeholder compliance_document
      const { data: doc, error: docErr } = await supabase
        .from('compliance_documents')
        .insert({
          organization_id: orgId,
          category: sourceTab,
          type: docType || null,
          name: `${docType || 'Document'} \u2014 Requested from ${vendorName}`,
          status: 'requested',
          vendor_id: vendorId || null,
        })
        .select('id')
        .single();

      if (docErr || !doc) {
        toast.error('Failed to create document request');
        setSending(false);
        return;
      }

      // 2. Create compliance_document_request
      const { error: reqErr } = await supabase
        .from('compliance_document_requests')
        .insert({
          organization_id: orgId,
          document_id: doc.id,
          vendor_id: vendorId || null,
          secure_token: secureToken,
          secure_token_expires_at: expiresAt,
          recipient_email: vendorEmail.trim(),
          recipient_name: vendorName,
          note_to_recipient: coverMsg,
        });

      if (reqErr) {
        toast.error('Failed to create request');
        setSending(false);
        return;
      }

      // 3. Send email via edge function
      const uploadUrl = `${window.location.origin}/vendor/upload/${secureToken}`;
      await supabase.functions.invoke('send-document-request', {
        body: {
          vendorEmail: vendorEmail.trim(),
          vendorName,
          documentType: docType,
          uploadUrl,
          coverMessage: coverMsg,
          orgName: profile?.organization_name || '',
        },
      });

      toast.success(`Request sent to ${vendorName}`);
      onComplete();
      onClose();
    } catch {
      toast.error('Failed to send request');
    } finally {
      setSending(false);
    }
  }, [orgId, vendorId, vendorName, vendorEmail, docType, coverMsg, sourceTab, profile, onComplete, onClose]);

  const canNext =
    (step === 2 && !!docType) ||
    step === 3 ||
    step === 4;

  return (
    <Modal isOpen onClose={onClose} size="lg">
      {/* Header */}
      <div className="px-5 py-4 rounded-t-xl" style={{ backgroundColor: '#1E2D4D', color: '#FFF' }}>
        <div className="text-[11px] font-semibold tracking-wider" style={{ color: '#C9B97A' }}>
          REQUEST FROM VENDOR
        </div>
        <div className="text-[17px] font-bold mt-1">
          Step {step} of 4 {'\u2014'} {STEP_LABELS[step - 1]}
        </div>
        <div className="flex gap-1 mt-2.5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="flex-1 h-[3px] rounded-sm"
              style={{ backgroundColor: n <= step ? '#A08C5A' : 'rgba(255,255,255,0.2)' }}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {step === 1 && (
          <>
            {/* Recent vendors (AI memory) */}
            {recentVendors.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2">
                  Recently requested from
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentVendors.map((rv) => (
                    <button
                      key={rv.recipient_name}
                      type="button"
                      onClick={() => selectVendor(rv.vendor_id || '', rv.recipient_name, rv.recipient_email)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#1E2D4D] border border-[#E2DDD4] hover:border-[#A08C5A] hover:bg-[#FAF7F0]/50 transition-colors"
                    >
                      {rv.recipient_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Linked vendors */}
            {!loadingVendors && linkedVendors.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2">
                  Linked vendors
                </div>
                <div className="grid gap-2">
                  {linkedVendors.map((v) => (
                    <button
                      key={v.vendor_id}
                      type="button"
                      onClick={() => selectVendor(v.vendor_id, v.vendor_name, v.email || '')}
                      className="text-left flex items-center justify-between px-3.5 py-3 rounded-md border border-[#E2DDD4] hover:border-[#A08C5A] hover:bg-[#FAF7F0]/50 transition-colors"
                    >
                      <div>
                        <div className="text-[13px] font-semibold text-[#1E2D4D]">{v.vendor_name}</div>
                        <div className="text-[11px] text-[#8A93A6]">{v.service_type_code}</div>
                      </div>
                      <ChevronRight size={14} className="text-[#8A93A6]" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingVendors && (
              <div className="text-center py-6 text-[13px] text-[#8A93A6]">Loading vendors\u2026</div>
            )}

            {/* Custom vendor — full capture form */}
            {!showCustomForm ? (
              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                className="w-full text-left px-3.5 py-3 rounded-md border-2 border-dashed border-[#E2DDD4] text-[13px] font-semibold text-[#1E2D4D] hover:border-[#A08C5A] transition-colors"
              >
                <User size={14} className="inline mr-2" />
                Add a new vendor
              </button>
            ) : (
              <div className="border border-[#E2DDD4] rounded-md p-3.5">
                <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2.5">New vendor</div>
                <VendorCaptureForm
                  onSubmit={handleVendorCapture}
                  onCancel={() => setShowCustomForm(false)}
                  compactMode
                  orgId={orgId}
                  submitLabel="Save & continue"
                  isLoading={creatingVendor}
                />
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2.5">
              What are you requesting?
            </div>
            <div className="grid gap-2 max-h-[340px] overflow-y-auto">
              {docTypes.map((dt) => (
                <button
                  key={dt}
                  type="button"
                  onClick={() => setDocType(dt)}
                  className="text-left px-3.5 py-3 rounded-md text-[13px] font-semibold text-[#1E2D4D] cursor-pointer"
                  style={{
                    background: docType === dt ? '#FAF7F0' : '#FFF',
                    border: `2px solid ${docType === dt ? '#A08C5A' : '#E2DDD4'}`,
                  }}
                >
                  {dt}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2.5">
              Cover message
            </div>
            <textarea
              value={coverMsg}
              onChange={(e) => setCoverMsg(e.target.value)}
              rows={6}
              className="w-full px-3 py-3 border border-[#E2DDD4] rounded-md text-[13px] text-[#1E2D4D] resize-y font-[inherit] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30"
            />
            <div
              className="mt-3.5 p-3 rounded-md text-[12px] text-[#1E2D4D]"
              style={{ backgroundColor: '#FAF7F0', border: '1px solid #E2DDD4' }}
            >
              <div className="font-bold text-[#1E2D4D] mb-1">How this works</div>
              Vendor gets an EvidLY-branded email with a secure upload link. Link valid 14 days, tracked.
              They upload directly {'\u2014'} no account needed.
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2.5">
              Confirm & send
            </div>
            <div className="border border-[#E2DDD4] rounded-md p-4 space-y-2.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#8A93A6]">Requesting</span>
                <span className="font-semibold text-[#1E2D4D]">{docType}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#8A93A6]">From</span>
                <span className="font-semibold text-[#1E2D4D]">{vendorName}</span>
              </div>
              <div className="text-[13px]">
                <span className="text-[#8A93A6] block mb-1">Vendor email</span>
                <input
                  type="email"
                  value={vendorEmail}
                  onChange={(e) => setVendorEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2DDD4] rounded-md text-[13px] text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30"
                  placeholder="vendor@example.com"
                />
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#8A93A6]">Token</span>
                <span className="font-semibold text-[#1E2D4D]">14-day secure link</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#E2DDD4] flex justify-between bg-[#FAFBFD] rounded-b-xl">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50"
        >
          Cancel
        </button>
        <div className="flex gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50"
            >
              Back
            </button>
          )}
          {step >= 2 && step < 4 && (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="px-4 py-2 bg-[#1E2D4D] text-white text-[12px] font-bold rounded-md hover:opacity-90 disabled:opacity-40"
            >
              Next {'\u2192'}
            </button>
          )}
          {step === 4 && (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !vendorEmail.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-bold hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
            >
              <Send size={14} />
              {sending ? 'Sending\u2026' : 'Send Request'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
