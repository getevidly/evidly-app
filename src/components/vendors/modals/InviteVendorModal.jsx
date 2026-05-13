import { useState } from 'react';
import { X, Send, Copy, Check } from 'lucide-react';
import { Modal } from '../../ui/Modal';

const inputClass =
  'w-full px-3 py-2 border border-[#E2DDD4] rounded-md text-[13px] text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30';
const labelClass = 'text-[10px] uppercase tracking-wider text-[#8A93A6] font-medium';

/**
 * InviteVendorModal — Surface 11.
 * Send an email invite to a vendor to self-register on EvidLY.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   onSend: (data) => void
 */
export function InviteVendorModal({ isOpen, onClose, onSend }) {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [message, setMessage] = useState(
    'We use EvidLY to manage compliance documents. Please register using this invite link so we can exchange documents securely.'
  );
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteLink = 'https://app.getevidly.com/vendor-register?invite=';

  const handleSend = () => {
    onSend?.({ email, companyName, message });
    setSent(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setEmail('');
    setCompanyName('');
    setMessage('We use EvidLY to manage compliance documents. Please register using this invite link so we can exchange documents securely.');
    setSent(false);
    setCopied(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <div className="px-5 pt-5 pb-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#1E2D4D' }}>
            Invite vendor
          </h2>
          <button type="button" onClick={handleClose} className="p-1 rounded-md hover:bg-[#F4F1EA]">
            <X size={18} style={{ color: '#5A6478' }} />
          </button>
        </div>

        {!sent ? (
          <>
            <p className="mb-4" style={{ fontSize: '12px', color: '#5A6478', lineHeight: '1.5' }}>
              Send an invite to a vendor so they can create an EvidLY account and upload documents directly.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClass}>Vendor company name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Pacific Pest Control"
                />
              </div>
              <div>
                <label className={labelClass}>Vendor email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="vendor@example.com"
                />
              </div>
              <div>
                <label className={labelClass}>Custom message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className={inputClass}
                  rows={3}
                  style={{ resize: 'none' }}
                />
              </div>
            </div>

            {/* Or copy link */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px dashed #E2DDD4' }}>
              <p className="mb-2" style={{ fontSize: '11px', color: '#5A6478' }}>
                Or copy the invite link to share manually
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className={inputClass}
                  style={{ backgroundColor: '#FCFBF8' }}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-shrink-0 px-3 py-2 rounded-md"
                  style={{ fontSize: '11px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #E2DDD4' }}
                >
                  {copied ? <Check size={14} style={{ color: '#2E7D32' }} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-md"
                style={{ fontSize: '12px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #E2DDD4' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!email.trim()}
                className="px-4 py-2 rounded-md flex items-center gap-1.5 transition-opacity"
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: '#1E2D4D',
                  color: '#FAF7F0',
                  opacity: email.trim() ? 1 : 0.4,
                }}
              >
                <Send size={13} />
                Send invite
              </button>
            </div>
          </>
        ) : (
          /* Sent confirmation */
          <div className="text-center py-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: '#E8F2E5' }}
            >
              <Check size={22} style={{ color: '#2E7D32' }} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#1E2D4D' }}>
              Invite sent
            </p>
            <p className="mt-1" style={{ fontSize: '12px', color: '#5A6478' }}>
              {companyName || 'The vendor'} will receive an email at {email} with a link to register.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-4 px-4 py-2 rounded-md"
              style={{ fontSize: '12px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
