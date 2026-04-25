/**
 * StandingCardModal — AMBASSADOR-SCRIPT-01
 *
 * Modal wrapper for StandingCard with download/share/social buttons.
 * Follows WelcomeModal pattern: fixed inset-0 z-50 backdrop.
 */
import { useRef, useState } from 'react';
import { Download, Share2, Copy, Check, X, Linkedin, Mail, MessageSquare } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { toast } from 'sonner';
import { StandingCard } from './StandingCard';
import {
  getStandingVerifyUrl,
  generateLinkedInShareUrl,
  generateEmailShareHref,
  generateSmsShareHref,
  type StandingCardData,
} from '../../lib/ambassadorSystem';
import { SHARE_MESSAGES } from '../../data/ambassadorDemoData';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

interface StandingCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StandingCardData;
}

export function StandingCardModal({ isOpen, onClose, data }: StandingCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const verifyUrl = getStandingVerifyUrl(data.referralCode);

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#1E2D4D',
      });
      const link = document.createElement('a');
      link.download = `${data.orgName.replace(/\s+/g, '-')}-EvidLY-Standing.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Standing card downloaded');
    } catch {
      toast.error('Download failed — try again');
    }
    setDownloading(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${data.orgName} — EvidLY Monitored Kitchen`,
          text: `We use EvidLY to track our California kitchen compliance. ${verifyUrl}`,
          url: verifyUrl,
        });
      } catch {
        // User cancelled — ignore
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl).then(() => {
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div style={{ padding: 24, position: 'relative' }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9CA3AF',
            padding: 4,
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: NAVY,
            margin: '0 0 4px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Share My Standing
        </h3>
        <p
          style={{
            fontSize: 12,
            color: '#6B7F96',
            margin: '0 0 16px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Download or share your EvidLY compliance card
        </p>

        {/* Card preview */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
            <StandingCard ref={cardRef} data={data} />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px 0',
              borderRadius: 8,
              border: 'none',
              background: NAVY,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: downloading ? 'not-allowed' : 'pointer',
              opacity: downloading ? 0.6 : 1,
            }}
          >
            <Download size={14} />
            {downloading ? 'Downloading...' : 'Download PNG'}
          </button>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px 0',
              borderRadius: 8,
              border: 'none',
              background: GOLD,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Share2 size={14} /> Share
          </button>
          <button
            onClick={handleCopyLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #D1D9E6',
              background: '#fff',
              color: NAVY,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Social sharing */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#6B7F96',
            margin: '0 0 8px',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
          }}
        >
          Share with
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={generateLinkedInShareUrl(data.referralCode, SHARE_MESSAGES.linkedin)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 0',
              borderRadius: 8,
              border: '1px solid #D1D9E6',
              background: '#fff',
              color: NAVY,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <Linkedin size={14} /> LinkedIn
          </a>
          <a
            href={generateEmailShareHref(data.orgName, data.referralCode, SHARE_MESSAGES.email_body)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 0',
              borderRadius: 8,
              border: '1px solid #D1D9E6',
              background: '#fff',
              color: NAVY,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <Mail size={14} /> Email
          </a>
          <a
            href={generateSmsShareHref(data.orgName, data.referralCode, SHARE_MESSAGES.sms)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 0',
              borderRadius: 8,
              border: '1px solid #D1D9E6',
              background: '#fff',
              color: NAVY,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <MessageSquare size={14} /> Text
          </a>
        </div>
      </div>
    </Modal>
  );
}
