import { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../../ui/Modal';
import { useVendorContact } from '../../../hooks/useVendorContact';
import { useAuth } from '../../../contexts/AuthContext';

const TIER_STYLES = {
  gold: { bg: '#FAEEDA', text: '#633806' },
  silver: { bg: '#F1EFE8', text: '#2C2C2A' },
  bronze: { bg: '#FAECE7', text: '#4A1B0C' },
};

export function VendorContactModal({ isOpen, onClose, vendorId }) {
  const { profile } = useAuth();
  const { vendor, messages, loading, sendMessage } = useVendorContact(isOpen ? vendorId : null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (vendor && profile) {
      setSubject(`Inquiry from ${profile.organization_name || 'our organization'}`);
      setBody(`Hi ${vendor.contact_name || vendor.name},\n\nWe're looking for service at our location and would like to discuss availability and pricing.\n\nThanks.`);
    }
  }, [vendor?.id, profile?.organization_name]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const success = await sendMessage(subject.trim(), body.trim());
      if (success) {
        toast.success('Message sent');
        setBody('');
      } else {
        toast.error('Failed to send message');
      }
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSubject('');
    setBody('');
    onClose();
  };

  if (!isOpen) return null;

  const tierStyle = vendor ? TIER_STYLES[vendor.tier] || TIER_STYLES.bronze : TIER_STYLES.bronze;
  const initials = vendor ? vendor.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
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
          <button type="button" onClick={handleClose} className="p-1 rounded-md hover:bg-[#F4F1EA]">
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

            {/* Composer */}
            <div className="mb-4">
              <p
                className="uppercase tracking-wider mb-2"
                style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#5A6478' }}
              >
                Contact this vendor
              </p>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full px-3 py-2 rounded-md mb-2"
                style={{ fontSize: '12px', color: '#1E2D4D', border: '1px solid #E2DDD4', outline: 'none' }}
                onFocus={(e) => { e.target.style.borderColor = '#1E2D4D'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E2DDD4'; }}
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                rows={5}
                className="w-full px-3 py-2 rounded-md mb-2 resize-none"
                style={{ fontSize: '12px', color: '#1E2D4D', border: '1px solid #E2DDD4', outline: 'none', lineHeight: '1.5' }}
                onFocus={(e) => { e.target.style.borderColor = '#1E2D4D'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E2DDD4'; }}
              />
              <div className="flex items-center justify-between">
                <p style={{ fontSize: '10px', color: '#5A6478' }}>
                  Sends through EvidLY. Replies tracked here.
                </p>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!subject.trim() || !body.trim() || sending}
                  className="px-4 py-2 rounded-md transition-opacity"
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: '#1E2D4D',
                    color: '#FAF7F0',
                    opacity: subject.trim() && body.trim() && !sending ? 1 : 0.4,
                  }}
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>

            {/* Message history */}
            <div>
              <p
                className="uppercase tracking-wider mb-2"
                style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#5A6478' }}
              >
                Message history
              </p>
              {messages.length === 0 ? (
                <div
                  className="rounded-md px-3 py-3"
                  style={{ backgroundColor: '#FCFBF8', border: '1px solid #E2DDD4' }}
                >
                  <p style={{ fontSize: '11px', color: '#5A6478' }}>
                    No messages yet. Send the first message above.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`rounded-md px-3 py-2 ${msg.direction === 'outbound' ? 'ml-6' : 'mr-6'}`}
                      style={{
                        backgroundColor: msg.direction === 'outbound' ? '#1E2D4D' : '#F4F1EA',
                        color: msg.direction === 'outbound' ? '#FAF7F0' : '#1E2D4D',
                      }}
                    >
                      {msg.subject && (
                        <p style={{ fontSize: '11px', fontWeight: 500, marginBottom: '2px' }}>
                          {msg.subject}
                        </p>
                      )}
                      <p style={{ fontSize: '11px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {msg.body_text || '(no text content)'}
                      </p>
                      <p style={{ fontSize: '9px', opacity: 0.7, marginTop: '4px' }}>
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
