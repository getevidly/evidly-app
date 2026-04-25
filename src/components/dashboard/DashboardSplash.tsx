/**
 * DashboardSplash — Branded loading splash for initial dashboard mount.
 * Shows EvidLY wordmark with gold pulse animation.
 */

const GOLD = '#A08C5A';
const NAVY = '#1E2D4D';
const CREAM = '#FAF7F0';

export function DashboardSplash() {
  return (
    <div
      style={{
        backgroundColor: CREAM,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        padding: '80px 24px',
      }}
    >
      <style>{`
        @keyframes evidly-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes evidly-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Gold pulse glow behind wordmark */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${GOLD}30 0%, transparent 70%)`,
            animation: 'evidly-pulse 2s ease-in-out infinite',
          }}
        />
        <span
          style={{
            position: 'relative',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 800,
            fontSize: 32,
            letterSpacing: '-0.02em',
            userSelect: 'none',
          }}
        >
          <span style={{ color: GOLD }}>E</span>
          <span style={{ color: NAVY }}>vid</span>
          <span style={{ color: GOLD }}>LY</span>
        </span>
      </div>

      {/* Subtitle — fades in after 300ms */}
      <p
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 300,
          fontSize: 14,
          color: `${NAVY}80`,
          marginTop: 16,
          animation: 'evidly-fade-in 0.5s ease-out 0.3s both',
        }}
      >
        Loading your kitchen...
      </p>
    </div>
  );
}
