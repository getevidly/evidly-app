/**
 * Suspended — AUDIT-FIX-05 / A-1
 *
 * Shown when a user's account has been suspended.
 * No nav, no sidebar — standalone page accessible without auth.
 */
import { supabase } from '../lib/supabase';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

export function Suspended() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: NAVY,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 440,
        width: '100%',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          fontSize: 28,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.02em',
          marginBottom: 8,
        }}>
          Evid<span style={{ color: GOLD }}>LY</span>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          padding: '40px 32px',
          marginTop: 24,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(220,38,38,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 24,
          }}>
            &#x26D4;
          </div>

          <h1 style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 8px',
          }}>
            Account Suspended
          </h1>

          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.6,
            margin: '0 0 24px',
          }}>
            Your account has been suspended. If you believe this is an error,
            please contact us for assistance.
          </p>

          <a
            href="mailto:founders@getevidly.com"
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: NAVY,
              background: GOLD,
              textDecoration: 'none',
              marginBottom: 12,
            }}
          >
            Contact founders@getevidly.com
          </a>

          <div>
            <button
              onClick={handleSignOut}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.25)',
                color: 'rgba(255,255,255,0.7)',
                padding: '8px 20px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        <p style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.3)',
          marginTop: 20,
        }}>
          &copy; 2026 EvidLY LLC
        </p>
      </div>
    </div>
  );
}
