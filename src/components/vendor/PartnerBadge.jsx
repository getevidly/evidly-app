/**
 * CPP-VENDOR-CONNECT-01 — Vendor Connect partner tier badge.
 * 3 tiers: Preferred (gold outline), Elite (gold filled), Founding (navy + gold).
 * Separate from TierBadge in VendorDashboard (marketplace tiers).
 */

const TIERS = {
  founding: {
    label: 'Founding Partner',
    icon: '🛡',
    bg: '#1E2D4D',
    color: '#A08C5A',
    border: '#A08C5A',
  },
  elite: {
    label: 'Elite Partner',
    icon: '👑',
    bg: '#A08C5A',
    color: 'white',
    border: '#A08C5A',
  },
  preferred: {
    label: 'Preferred Partner',
    icon: '★',
    bg: 'white',
    color: '#A08C5A',
    border: '#A08C5A',
  },
};

export function PartnerBadge({ tier = 'preferred', size = 'sm' }) {
  const t = TIERS[tier] ?? TIERS.preferred;
  const padding = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${padding}`}
      style={{ background: t.bg, color: t.color, borderColor: t.border }}
    >
      <span style={{ fontSize: size === 'sm' ? 10 : 13 }}>{t.icon}</span>
      {t.label}
    </span>
  );
}
