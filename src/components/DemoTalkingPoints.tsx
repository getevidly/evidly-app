/**
 * DemoTalkingPoints — DEMO-SCRIPT-01
 *
 * Fixed-position overlay showing route-specific talking point hints for
 * Arthur during live sales demos. Only renders for platform_admin in demo mode.
 * Dismissable per session.
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { X, MessageSquare } from 'lucide-react';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

interface TalkingPoint {
  hint: string;
  detail?: string;
}

const ROUTE_HINTS: Record<string, TalkingPoint[]> = {
  '/dashboard': [
    { hint: 'Portfolio Health shows all locations at a glance', detail: 'Mention: "You manage 3 kitchens — imagine seeing all of them here."' },
    { hint: 'Intelligence Feed updates in real time', detail: 'If you fired a signal from Demo Launcher, point to the bell icon.' },
  ],
  '/reports': [
    { hint: '"Export Compliance Package" is the money button', detail: 'Click it live — the branded PDF downloads instantly. Say: "This is what you hand your insurance auditor."' },
    { hint: 'Reports are role-filtered', detail: 'Kitchen staff see nothing. Owners see everything.' },
  ],
  '/documents': [
    { hint: 'Every document has an expiry tracker', detail: 'Say: "EvidLY tells you 90 days before anything expires — no more surprises."' },
  ],
  '/insights/intelligence': [
    { hint: 'This is the live intelligence feed', detail: 'If you fired a demo signal, it should appear here. Say: "This just came in — your team gets notified automatically."' },
  ],
  '/temp-logs': [
    { hint: 'Temperature compliance is the #1 health dept violation', detail: 'Say: "Most kitchens fail here. EvidLY catches it before the inspector does."' },
  ],
  '/vendors': [
    { hint: 'Vendor documents roll up into compliance scoring', detail: 'Say: "If your hood cleaner\'s COI expires, you\'ll know before they do."' },
  ],
  '/checklists': [
    { hint: 'Opening/closing checklists build your compliance record', detail: 'Say: "Every check your staff completes is timestamped evidence."' },
  ],
  '/mock-inspection': [
    { hint: 'Mock inspection simulates the real thing', detail: 'Say: "Run this monthly — your team will be ready when the inspector walks in."' },
  ],
  '/self-audit': [
    { hint: 'CalCode self-audit covers 41+ items', detail: 'Say: "This is the same checklist your inspector uses."' },
  ],
  '/facility-safety': [
    { hint: 'Fire Safety tracks fire suppression, hood cleaning, extinguishers', detail: 'Say: "Your fire marshal checks the same things — now you have proof."' },
  ],
};

// Match routes with params (e.g., /admin/jurisdiction-intelligence)
function getHintsForPath(pathname: string): TalkingPoint[] {
  // Direct match first
  if (ROUTE_HINTS[pathname]) return ROUTE_HINTS[pathname];
  // Prefix match for admin routes
  for (const [route, hints] of Object.entries(ROUTE_HINTS)) {
    if (pathname.startsWith(route) && route !== '/') return hints;
  }
  return [];
}

export function DemoTalkingPoints() {
  const { userRole } = useRole();
  const { isDemoMode } = useDemo();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Reset expanded state on route change
  useEffect(() => {
    setExpanded(false);
  }, [location.pathname]);

  // Only show for platform_admin in demo mode
  if (userRole !== 'platform_admin' || !isDemoMode) return null;

  // Check session dismissal
  if (dismissed) return null;

  const hints = getHintsForPath(location.pathname);
  if (hints.length === 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('demo_talking_points_dismissed', 'true');
  };

  // Restore dismissal state from session
  if (sessionStorage.getItem('demo_talking_points_dismissed') === 'true' && !dismissed) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        zIndex: 9999,
        maxWidth: 320,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {expanded ? (
        <div
          style={{
            background: NAVY,
            color: '#fff',
            borderRadius: 12,
            padding: '14px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            border: `1px solid ${GOLD}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Talking Points
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setExpanded(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 2 }}
                title="Minimize"
              >
                <MessageSquare size={14} />
              </button>
              <button
                onClick={handleDismiss}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 2 }}
                title="Dismiss for this session"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hints.map((h, i) => (
              <div key={i}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
                  {h.hint}
                </p>
                {h.detail && (
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0', lineHeight: 1.4 }}>
                    {h.detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          style={{
            background: NAVY,
            color: GOLD,
            border: `1px solid ${GOLD}`,
            borderRadius: 50,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}
          title="Talking Points"
        >
          <MessageSquare size={18} />
        </button>
      )}
    </div>
  );
}

export default DemoTalkingPoints;
