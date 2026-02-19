/**
 * STAGING-ENV-1 — Environment Badge
 *
 * Shows a fixed "STAGING" badge in the bottom-right corner
 * when the app is NOT running in production. Hidden in production.
 */

const env = import.meta.env.VITE_APP_ENV || 'development';

export function EnvBadge() {
  if (env === 'production') return null;

  const label = env === 'staging' ? 'STAGING' : env.toUpperCase();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        backgroundColor: '#b45309',
        color: '#ffffff',
        fontSize: 11,
        fontWeight: 600,
        padding: '4px 10px',
        borderRadius: 4,
        zIndex: 9999,
        pointerEvents: 'none',
        letterSpacing: '0.05em',
        fontFamily: "'DM Sans', 'Inter', sans-serif",
      }}
    >
      {label}
    </div>
  );
}
