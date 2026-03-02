import { useState } from 'react';
import { X, Copy, Mail, MessageSquare, Link2, Check } from 'lucide-react';
import { toast } from 'sonner';

const NAVY = '#1e4d6b';

interface ShareInviteLinkPanelProps {
  isOpen: boolean;
  onClose: () => void;
  providerName: string;
  inviteCode: string; // e.g., "cleaning-pros-plus-llc"
}

export function ShareInviteLinkPanel({ isOpen, onClose, providerName, inviteCode }: ShareInviteLinkPanelProps) {
  const [justCopied, setJustCopied] = useState(false);

  if (!isOpen) return null;

  const inviteLink = `https://app.evidly.com/vendor/invite/${inviteCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Link copied!');
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const emailSubject = encodeURIComponent(`Join us on EvidLY — Invitation from ${providerName}`);
  const emailBody = encodeURIComponent(
    `You've been invited to connect with ${providerName} on EvidLY.\n\nSign up using this link and ${providerName} will be automatically linked as your vendor:\n\n${inviteLink}`
  );

  const smsBody = encodeURIComponent(
    `Join ${providerName} on EvidLY! Sign up here and we'll be auto-linked as your vendor: ${inviteLink}`
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Navy Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ backgroundColor: NAVY }}
        >
          <h3 className="text-base font-semibold text-white">Share Your Invite Link</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={18} color="#FFFFFF" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Description */}
          <p className="text-sm" style={{ color: '#3D5068' }}>
            Share this link with clients. When they sign up,{' '}
            <strong style={{ color: '#0B1628' }}>{providerName}</strong> is auto-linked as their vendor.
          </p>

          {/* Invite Link Box */}
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2.5"
            style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
          >
            <Link2 size={16} style={{ color: NAVY, flexShrink: 0 }} />
            <span
              className="flex-1 text-sm truncate"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', color: '#0B1628' }}
              title={inviteLink}
            >
              {inviteLink}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex-shrink-0 p-1.5 rounded-md transition-colors"
              style={{
                backgroundColor: justCopied ? '#F0FDF4' : 'transparent',
                color: justCopied ? '#16A34A' : NAVY,
              }}
              aria-label="Copy link"
            >
              {justCopied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>

          {/* Share Via Section */}
          <div>
            <p className="text-xs font-medium mb-3" style={{ color: '#6B7F96', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Share via
            </p>
            <div className="flex gap-3">
              {/* Email */}
              <a
                href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-opacity-10"
                style={{
                  border: `1.5px solid ${NAVY}`,
                  color: NAVY,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#1e4d6b12'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'; }}
              >
                <Mail size={16} />
                Email
              </a>

              {/* Text / SMS */}
              <a
                href={`sms:?body=${smsBody}`}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  border: `1.5px solid ${NAVY}`,
                  color: NAVY,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#1e4d6b12'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'; }}
              >
                <MessageSquare size={16} />
                Text
              </a>

              {/* Copy Link */}
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  border: `1.5px solid ${NAVY}`,
                  color: NAVY,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1e4d6b12'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
              >
                {justCopied ? <Check size={16} /> : <Copy size={16} />}
                {justCopied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Close */}
        <div className="px-6 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-black/5"
            style={{ color: '#6B7F96' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
