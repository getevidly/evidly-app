/**
 * TeamEmptyState — C17.5
 *
 * Replaces "No team members yet. Invite via Settings." when
 * user count = 1 (owner only). Single variant — no Day 1 / Day 90 split.
 * Ghost-preview grid of 3 placeholder team rows + invite CTA.
 */

import { Link } from 'react-router-dom';
import { useSubscription } from '../../../hooks/useSubscription';

interface TeamEmptyStateProps {
  /** When provided, CTA opens modal directly instead of navigating to /team */
  onInviteClick?: () => void;
}

/* ── Tier → display name ───────────────────────────────────────── */

const TIER_DISPLAY: Record<string, string> = {
  trial: 'Trial',
  essentials: 'Essentials',
  founder: 'Founder',
  standard: 'Standard',
  enterprise: 'Enterprise',
};

/* ── Ghost roles ────────────────────────────────────────────────── */

const GHOST_ROWS: { initials: string; role: string; opacity: number }[] = [
  { initials: 'KM', role: 'Kitchen Manager', opacity: 0.7 },
  { initials: 'SL', role: 'Shift Lead', opacity: 0.6 },
  { initials: 'PC', role: 'Prep Cook', opacity: 0.5 },
];

/* ── Styles ─────────────────────────────────────────────────────── */

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '0.5px solid var(--line, #E5E2DA)',
  borderRadius: 12,
  overflow: 'hidden',
  padding: '20px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 14,
};

const bodyText: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.6,
  color: 'var(--muted, #6B6960)',
  margin: '0 0 18px',
};

const ghostRow: (opacity: number) => React.CSSProperties = (opacity) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px dashed var(--line, #E5E2DA)',
  opacity,
  marginBottom: 6,
});

const ghostAvatar: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: 'var(--bg-panel, #EEF1F7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--muted, #6B6960)',
  flexShrink: 0,
};

const ctaButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 20px',
  background: 'var(--navy, #1E2D4D)',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  textDecoration: 'none',
};

const subText: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--muted, #6B6960)',
  marginTop: 8,
};

/* ── Component ──────────────────────────────────────────────────── */

export function TeamEmptyState({ onInviteClick }: TeamEmptyStateProps = {}) {
  const { currentTier } = useSubscription();
  const planDisplayName = TIER_DISPLAY[currentTier] || 'current';

  return (
    <div style={cardStyle}>
      {/* Header icon + title */}
      <div style={headerStyle}>
        <span style={{ fontSize: 16 }}>👥</span>
        <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--navy, #1E2D4D)' }}>
          Right now, it's just you.
        </span>
      </div>

      <p style={bodyText}>
        EvidLY works fine that way. When you're ready to delegate logging,
        drift acknowledgment, or document upload, your team will land here.
      </p>

      {/* Ghost preview rows */}
      <div style={{ marginBottom: 18 }}>
        {GHOST_ROWS.map(row => (
          <div key={row.initials} style={ghostRow(row.opacity)}>
            <span style={ghostAvatar}>{row.initials}</span>
            <span style={{ fontSize: 12, color: 'var(--navy, #1E2D4D)' }}>{row.role}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {onInviteClick ? (
        <button type="button" onClick={onInviteClick} style={ctaButton}>
          Invite first team member
        </button>
      ) : (
        <Link to="/team" style={ctaButton}>
          Invite first team member
        </Link>
      )}
      <p style={subText}>4 seats included on your {planDisplayName} plan</p>
    </div>
  );
}
