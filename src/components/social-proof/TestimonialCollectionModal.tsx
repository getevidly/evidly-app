/**
 * TestimonialCollectionModal — SOCIAL-PROOF-01
 *
 * Post-inspection testimonial prompt. Fires after first_inspection_passed
 * milestone celebration. Collects a short quote from the operator.
 * SessionStorage dedup prevents re-prompting in same session.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { submitTestimonial } from '../../lib/testimonialSystem';
import { useDemo } from '../../contexts/DemoContext';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const SESSION_KEY = 'evidly_testimonial_prompted';

interface TestimonialCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  orgId: string;
  authorName: string;
  roleTitle: string;
  orgName: string;
  county: string;
  city: string;
}

export function TestimonialCollectionModal({
  isOpen,
  onClose,
  userId,
  orgId,
  authorName,
  roleTitle,
  orgName,
  county,
  city,
}: TestimonialCollectionModalProps) {
  const [quote, setQuote] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { isDemoMode } = useDemo();

  if (!isOpen) return null;

  // Already prompted this session
  if (sessionStorage.getItem(SESSION_KEY)) return null;

  const canSubmit = quote.trim().length >= 10 && agreed && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    if (isDemoMode) {
      // Demo mode: just show success, no DB write
      toast.success('Thank you! Your testimonial has been submitted for review.');
      sessionStorage.setItem(SESSION_KEY, '1');
      onClose();
      setSubmitting(false);
      return;
    }

    const result = await submitTestimonial(
      userId,
      orgId,
      quote.trim(),
      authorName,
      roleTitle,
      orgName,
      county,
      city,
    );

    if (result.success) {
      toast.success('Thank you! Your testimonial has been submitted for review.');
      sessionStorage.setItem(SESSION_KEY, '1');
      onClose();
    } else {
      toast.error('Failed to submit — try again.');
    }
    setSubmitting(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        padding: 16,
      }}
      onClick={e => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div
        style={{
          background: NAVY,
          color: '#FAF7F0',
          borderRadius: 16,
          padding: 32,
          textAlign: 'center',
          maxWidth: 440,
          width: '100%',
          fontFamily: "'DM Sans', 'Inter', sans-serif",
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        }}
      >
        <p style={{ fontSize: 42, margin: '0 0 12px', lineHeight: 1 }}>💬</p>

        <p
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: GOLD,
            margin: '0 0 6px',
          }}
        >
          Share your experience
        </p>

        <p
          style={{
            fontSize: 13,
            color: '#FAF7F0',
            margin: '0 0 20px',
            lineHeight: 1.6,
            opacity: 0.8,
          }}
        >
          Other operators want to know what it's like to go into an
          inspection with EvidLY. A few words from you can make the difference.
        </p>

        {/* Quote input */}
        <textarea
          value={quote}
          onChange={e => setQuote(e.target.value)}
          placeholder="We felt more prepared for our inspection than we ever have..."
          rows={3}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid rgba(250, 247, 240, 0.2)',
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#FAF7F0',
            fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
            resize: 'vertical',
            boxSizing: 'border-box',
            outline: 'none',
            marginBottom: 12,
          }}
        />

        {/* Permission checkbox */}
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            textAlign: 'left',
            marginBottom: 20,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ marginTop: 3, accentColor: GOLD }}
          />
          <span style={{ fontSize: 11, color: 'rgba(250, 247, 240, 0.6)', lineHeight: 1.5 }}>
            I agree that EvidLY may use this quote on its website. My name
            and business will be displayed alongside the quote.
          </span>
        </label>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              border: 'none',
              background: GOLD,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
          <button
            onClick={handleDismiss}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              border: '1px solid rgba(250, 247, 240, 0.3)',
              background: 'transparent',
              color: '#FAF7F0',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
