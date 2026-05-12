import { useState, useEffect } from 'react';
import { Upload, Send, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface AddVendorDocumentModalProps {
  onClose: () => void;
  onUploadSelf: () => void;
  onSendToVendor: () => void;
}

interface LinkedVendor {
  vendor_id: string;
  vendor_name: string;
  service_type_code: string;
  last_service_date: string | null;
}

export function AddVendorDocumentModal({ onClose, onUploadSelf, onSendToVendor }: AddVendorDocumentModalProps) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [linkedVendors, setLinkedVendors] = useState<LinkedVendor[]>([]);
  const [expandedC, setExpandedC] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoadingVendors(false); return; }

    supabase
      .from('location_service_schedules')
      .select('vendor_id, vendor_name, service_type_code, last_service_date')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .not('vendor_id', 'is', null)
      .order('vendor_name')
      .limit(20)
      .then(({ data }) => {
        if (data) {
          // Deduplicate by vendor_id — keep the first (most recent by order)
          const seen = new Set<string>();
          const unique: LinkedVendor[] = [];
          for (const row of data as LinkedVendor[]) {
            if (!row.vendor_id || seen.has(row.vendor_id)) continue;
            seen.add(row.vendor_id);
            unique.push(row);
            if (unique.length >= 5) break;
          }
          setLinkedVendors(unique);
        }
        setLoadingVendors(false);
      });
  }, [orgId]);

  function fmtDate(iso: string | null): string {
    if (!iso) return 'No service logged';
    return `Last: ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  return (
    <Modal isOpen onClose={onClose} size="md">
      <div className="px-5 py-4 border-b border-[#E2DDD4]">
        <h2 className="text-[16px] font-bold text-[#1E2D4D]">How should this document arrive?</h2>
      </div>

      <div className="px-5 py-4 space-y-2.5">
        {/* Option A — I have it */}
        <button
          type="button"
          onClick={() => { onClose(); onUploadSelf(); }}
          className="w-full flex items-start gap-3 text-left px-4 py-3.5 border border-[#E2DDD4] rounded-lg hover:border-[#A08C5A] hover:bg-[#FAF7F0]/50 transition-colors"
        >
          <Upload size={18} className="text-[#1E2D4D] mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-[13px] font-bold text-[#1E2D4D]">I have it {'\u2014'} let me upload</div>
            <div className="text-[11px] text-[#8A93A6] mt-0.5">You already have the document file</div>
          </div>
        </button>

        {/* Option B — Send secure link */}
        <button
          type="button"
          onClick={() => { onClose(); onSendToVendor(); }}
          className="w-full flex items-start gap-3 text-left px-4 py-3.5 border border-[#E2DDD4] rounded-lg hover:border-[#A08C5A] hover:bg-[#FAF7F0]/50 transition-colors"
        >
          <Send size={18} className="text-[#1E2D4D] mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-[13px] font-bold text-[#1E2D4D]">Send a secure link to the vendor</div>
            <div className="text-[11px] text-[#8A93A6] mt-0.5">Vendor uploads directly {'\u00B7'} no account needed {'\u00B7'} 14-day token</div>
          </div>
        </button>

        {/* Option C — Pick existing vendor (conditional) */}
        {!loadingVendors && linkedVendors.length > 0 && (
          <div className="border border-[#E2DDD4] rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedC(!expandedC)}
              className="w-full flex items-start gap-3 text-left px-4 py-3.5 hover:border-[#A08C5A] hover:bg-[#FAF7F0]/50 transition-colors"
            >
              <Users size={18} className="text-[#1E2D4D] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-[13px] font-bold text-[#1E2D4D]">Pick an existing vendor</div>
                <div className="text-[11px] text-[#8A93A6] mt-0.5">Send the request to a vendor already linked to this kitchen</div>
              </div>
              {expandedC ? <ChevronUp size={16} className="text-[#8A93A6] mt-1" /> : <ChevronDown size={16} className="text-[#8A93A6] mt-1" />}
            </button>

            {expandedC && (
              <div className="border-t border-[#E2DDD4] px-4 py-2 space-y-1.5">
                {linkedVendors.map((v) => (
                  <div key={v.vendor_id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-[#F7F8FA]">
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-[#1E2D4D] truncate">{v.vendor_name}</div>
                      <div className="text-[10px] text-[#8A93A6]">
                        {v.service_type_code} {'\u00B7'} {fmtDate(v.last_service_date)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { onClose(); onSendToVendor(); }}
                      className="flex-shrink-0 ml-3 px-3 py-1.5 text-[11px] font-bold rounded-md transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
                    >
                      Send to {v.vendor_name.split(' ')[0]}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-[#E2DDD4] bg-[#FAFBFD] rounded-b-xl">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
