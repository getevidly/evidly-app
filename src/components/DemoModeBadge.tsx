import { useDemo } from '../contexts/DemoContext';

/**
 * Persistent badge in the TopBar for authenticated demo users.
 * Shows "DEMO — X days left". Disappears on conversion.
 */
export function DemoModeBadge() {
  const { isAuthenticatedDemo, demoExpiresAt, isDemoExpired } = useDemo();

  if (!isAuthenticatedDemo) return null;

  const daysLeft = demoExpiresAt
    ? Math.max(0, Math.ceil((demoExpiresAt.getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide"
      style={{
        backgroundColor: isDemoExpired ? '#fef2f2' : '#fef3c7',
        color: isDemoExpired ? '#991b1b' : '#92400e',
        border: `1px solid ${isDemoExpired ? '#fecaca' : '#fde68a'}`,
      }}
    >
      <span>DEMO</span>
      {daysLeft !== null && !isDemoExpired && (
        <span className="font-medium">
          — {daysLeft}d left
        </span>
      )}
      {isDemoExpired && (
        <span className="font-medium">— Expired</span>
      )}
    </div>
  );
}
