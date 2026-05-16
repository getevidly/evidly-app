import { X, Shield } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { useVendorContact } from '../../../hooks/useVendorContact';
import { useAuth } from '../../../contexts/AuthContext';
import { ThreadedConversation } from '../../messaging/ThreadedConversation';

const TIER_STYLES = {
  gold: { bg: '#FAEEDA', text: '#633806' },
  silver: { bg: '#F1EFE8', text: '#2C2C2A' },
  bronze: { bg: '#FAECE7', text: '#4A1B0C' },
};

export function VendorContactModal({ isOpen, onClose, vendorId }) {
  const { profile } = useAuth();
  const { vendor, loading } = useVendorContact(isOpen ? vendorId : null);
  const orgId = profile?.organization_id || null;

  if (!isOpen) return null;

  const tierStyle = vendor ? TIER_STYLES[vendor.tier] || TIER_STYLES.bronze : TIER_STYLES.bronze;
  const initials = vendor ? vendor.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="px-5 pt-5 pb-5 max-h-[calc(100vh-4rem)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: '32px', height: '32px', backgroundColor: '#F4F1EA', fontSize: '11px', fontWeight: 600, color: '#1E2D4D' }}
            >
              {initials}
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#1E2D4D' }}>
                {vendor?.name || 'Loading...'}
              </h2>
            </div>
            {vendor && (
              <span
                className="px-1.5 py-0.5 rounded"
                style={{ fontSize: '9px', fontWeight: 600, backgroundColor: tierStyle.bg, color: tierStyle.text, textTransform: 'capitalize' }}
              >
                {vendor.tier}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-[#F4F1EA]">
            <X size={18} style={{ color: '#5A6478' }} />
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#1E2D4D] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && vendor && (
          <>
            {/* Contact grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-4">
              <div>
                <p style={{ fontSize: '10px', color: '#5A6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contact</p>
                <p style={{ fontSize: '12px', color: '#1E2D4D', fontWeight: 500 }}>{vendor.contact_name || '\u2014'}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#5A6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Phone</p>
                <p style={{ fontSize: '12px', color: '#1E2D4D', fontWeight: 500 }}>{vendor.phone || '\u2014'}</p>
              </div>
              <div className="col-span-2">
                <p style={{ fontSize: '10px', color: '#5A6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</p>
                <p style={{ fontSize: '12px', color: '#1E2D4D', fontWeight: 500 }}>{vendor.email}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#5A6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Primary county</p>
                <p style={{ fontSize: '12px', color: '#1E2D4D', fontWeight: 500 }}>{vendor.county_primary}</p>
              </div>
              <div className="col-span-2">
                <p style={{ fontSize: '10px', color: '#5A6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Service area</p>
                <p style={{ fontSize: '12px', color: '#1E2D4D', fontWeight: 500 }}>{vendor.service_area_counties.join(', ') || vendor.county_primary}</p>
              </div>
              <div className="col-span-2">
                <p style={{ fontSize: '10px', color: '#5A6478', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Credentials</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {vendor.credentials.ikeca && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ fontSize: '9px', fontWeight: 500, backgroundColor: '#E1F5EE', color: '#04342C' }}>
                      <Shield size={8} /> IKECA
                    </span>
                  )}
                  {vendor.credentials.nfpa && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ fontSize: '9px', fontWeight: 500, backgroundColor: '#E1F5EE', color: '#04342C' }}>
                      <Shield size={8} /> NFPA
                    </span>
                  )}
                  {vendor.credentials.insured && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ fontSize: '9px', fontWeight: 500, backgroundColor: '#E1F5EE', color: '#04342C' }}>
                      <Shield size={8} /> Insured
                    </span>
                  )}
                  {!vendor.credentials.ikeca && !vendor.credentials.nfpa && !vendor.credentials.insured && (
                    <span style={{ fontSize: '11px', color: '#5A6478' }}>None listed</span>
                  )}
                </div>
              </div>
            </div>

            {/* Threaded Conversation */}
            <ThreadedConversation
              entityType="vendor_network_contact"
              entityId={vendorId}
              organizationId={orgId}
              sendVia="vendor-network-send-message"
              vendorEmail={vendor.email}
              vendorName={vendor.name}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
