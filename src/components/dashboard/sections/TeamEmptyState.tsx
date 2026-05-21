/**
 * TeamEmptyState — C17.5
 *
 * Replaces "No team members yet. Invite via Settings." when
 * user count = 1 (owner only). Single variant — no Day 1 / Day 90 split.
 * Ghost-preview grid of 3 placeholder team rows + invite CTA.
 */

import { Link } from 'react-router-dom';

/* ── Ghost roles ────────────────────────────────────────────────── */

const GHOST_ROWS: { initials: string; role: string; opacity: number }[] = [
  { initials: 'KM', role: 'Kitchen Manager', opacity: 0.5 },
  { initials: 'SL', role: 'Shift Lead', opacity: 0.38 },
  { initials: 'PC', role: 'Prep Cook', opacity: 0.26 },
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
  gap: 10,
  marginBottom: 14,
};

const iconCircle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: '1.5px solid var(--gold, #A08C5A)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--gold, #A08C5A)',
  fontSize: 16,
  flexShrink: 0,
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

export function TeamEmptyState() {
  return (
    <div style={cardStyle}>
      {/* Header icon + title */}
      <div style={headerStyle}>
        <span style={iconCircle}>
          <i className="ti ti-users" />
        </span>
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
      <Link to="/team" style={ctaButton}>
        Invite your first manager
      </Link>
      <p style={subText}>4 seats included on your Founder plan</p>
    </div>
  );
}
