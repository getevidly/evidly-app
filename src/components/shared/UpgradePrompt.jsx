/**
 * CPP-VENDOR-CONNECT-01 — Upgrade prompt for CPP Free Tier users.
 * Shows when a CPP Free user hits a paid-only feature wall.
 * Distinct from DemoUpgradePrompt (demo-mode specific).
 */
import { Link } from 'react-router-dom';

export function UpgradePrompt({ heading, subtext, cta }) {
  return (
    <div
      className="border rounded-xl p-6 text-center"
      style={{ borderColor: 'rgba(160,140,90,0.2)', background: '#FAF7F0' }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-lg"
        style={{ background: 'rgba(160,140,90,0.1)' }}
      >
        🔒
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: '#1E2D4D' }}>
        {heading || 'Upgrade to unlock this feature'}
      </h3>
      <p className="text-xs text-[#1E2D4D]/50 mb-4 max-w-xs mx-auto">
        {subtext || 'This feature requires an EvidLY subscription. Upgrade to get full platform access.'}
      </p>
      <Link
        to="/upgrade"
        className="inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
        style={{ background: '#A08C5A' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#9A8450')}
        onMouseLeave={e => (e.currentTarget.style.background = '#A08C5A')}
      >
        {cta || 'Upgrade Now'} →
      </Link>
      <p className="text-xs text-[#1E2D4D]/30 mt-3">
        $99/mo · Founder pricing · Locked through July 4, 2026
      </p>
    </div>
  );
}
