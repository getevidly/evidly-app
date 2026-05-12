import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Send, ShieldAlert, Building2, ChevronRight } from 'lucide-react';
import { relativeTime, expiryLabel } from '../../lib/relativeTime';
import { StatusPill } from './StatusPill';
import type { VendorBusinessIntelligence, VendorBusinessRow } from '../../hooks/documents/useVendorBusinessIntelligence';

interface Props {
  intel: VendorBusinessIntelligence;
  onSendRequest: () => void;
}

export function VendorBusinessIntelligenceState({ intel, onSendRequest }: Props) {
  const navigate = useNavigate();

  if (intel.loading) {
    return (
      <div className="text-center py-12 text-[13px] text-[#8A93A6]">Loading intelligence\u2026</div>
    );
  }

  // State: no vendors at all
  if (intel.state === 'empty') {
    return (
      <div className="border-2 border-dashed border-[#E2DDD4] rounded-lg py-16 px-6 flex flex-col items-center text-center">
        <Building2 size={32} className="text-[#B0B8C8] mb-3" />
        <p className="text-[13px] text-[#8A93A6] mb-2">No vendors linked to your account yet</p>
        <p className="text-[11px] text-[#8A93A6] mb-4 max-w-md">
          Add a vendor during onboarding or from the Vendors page, then come back here to track their business compliance documents.
        </p>
        <button
          type="button"
          onClick={() => navigate('/vendors')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[13px] font-bold transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
        >
          <Building2 size={14} />
          Go to Vendors
        </button>
      </div>
    );
  }

  // State: vendors exist but no business docs
  if (intel.state === 'no_docs') {
    return (
      <div className="border-2 border-dashed border-[#E2DDD4] rounded-lg py-16 px-6 flex flex-col items-center text-center">
        <ShieldAlert size={32} className="text-[#B0B8C8] mb-3" />
        <p className="text-[13px] text-[#8A93A6] mb-2">Track your vendors' business compliance</p>
        <p className="text-[11px] text-[#8A93A6] mb-4 max-w-md">
          EvidLY tracks COI expirations, surfaces vendors missing required documents, and alerts you before coverage gaps.
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
            Request in progress \u2014 waiting on vendor
          </p>
        </div>
      )}
    </div>
  );
}
