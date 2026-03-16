/**
 * MilestoneCelebrationModal — AMBASSADOR-SCRIPT-01
 *
 * Emotional reward modal that fires when operators hit key milestones.
 * Advisory language only. "Share This" opens Web Share API or clipboard.
 */
import { toast } from 'sonner';
import type { MilestoneConfig } from '../../lib/ambassadorSystem';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

interface MilestoneCelebrationModalProps {
  milestone: MilestoneConfig | null;
  onDismiss: () => void;
}

export function MilestoneCelebrationModal({
  milestone,
  onDismiss,
}: MilestoneCelebrationModalProps) {
  if (!milestone) return null;

  const handleShare = async () => {
    const text = `${milestone.title} — ${milestone.message} #EvidLY #FoodSafety`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: milestone.title,
          text,
          url: 'https://www.getevidly.com',
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    }
    onDismiss();
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
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div
        style={{
          background: NAVY,
          color: '#FAF7F0',
          borderRadius: 16,
          padding: 32,
          textAlign: 'center',
          maxWidth: 400,
          width: '100%',
          fontFamily: "'DM Sans', 'Inter', sans-serif",
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Emoji */}
        <p style={{ fontSize: 52, margin: '0 0 16px', lineHeight: 1 }}>
          {milestone.emoji}
        </p>

        {/* Title */}
        <p
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: GOLD,
            margin: '0 0 8px',
          }}
        >
          {milestone.title}
        </p>

        {/* Message */}
        <p
          style={{
            fontSize: 14,
            color: '#FAF7F0',
            margin: '0 0 28px',
            lineHeight: 1.6,
            opacity: 0.9,
          }}
        >
          {milestone.message}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {milestone.shareable && (
            <button
              onClick={handleShare}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: GOLD,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Share this →
            </button>
          )}
          <button
            onClick={onDismiss}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid rgba(250, 247, 240, 0.3)',
              background: 'transparent',
              color: '#FAF7F0',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Keep going
          </button>
        </div>
      </div>
    </div>
  );
}
