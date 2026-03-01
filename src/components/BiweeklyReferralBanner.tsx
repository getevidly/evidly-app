/**
 * Biweekly Referral Banner — shown every 14 days to decision-makers
 *
 * Target roles: owner_operator, executive (they make referral decisions)
 * Suppressed: after referral submitted, permanent dismiss, or account < 7 days old
 * State: localStorage in demo mode (production would use user_settings table)
 * Coordinates with ReferralTouchpoint — prevents both from showing simultaneously
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { markTouchpointShown } from '../lib/referralSystem';

const BANNER_INTERVAL_DAYS = 14;
const STORAGE_KEY = 'evidly_referral_banner_state';
const TARGET_ROLES = new Set(['owner_operator', 'executive']);

interface BannerState {
  lastShownAt: string | null;
  permanentlyDismissed: boolean;
}

function loadBannerState(): BannerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return { lastShownAt: null, permanentlyDismissed: false };
}

function saveBannerState(state: BannerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* noop */ }
}

function daysSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
}

export function BiweeklyReferralBanner() {
  const { userRole } = useRole();
  const { isDemoMode, presenterMode } = useDemo();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isDemoMode || presenterMode) return;
    if (!TARGET_ROLES.has(userRole)) return;

    const state = loadBannerState();
    if (state.permanentlyDismissed) return;

    const daysSinceLastShown = state.lastShownAt
      ? daysSince(state.lastShownAt)
      : Infinity;

    if (daysSinceLastShown >= BANNER_INTERVAL_DAYS) {
      // Show after short delay to not compete with initial page load
      const timer = setTimeout(() => {
        setVisible(true);
        // Record that we showed it
        saveBannerState({ ...state, lastShownAt: new Date().toISOString() });
        // Prevent ReferralTouchpoint from also appearing this session
        markTouchpointShown();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isDemoMode, presenterMode, userRole]);

  if (!visible) return null;

  const handleRemindLater = () => setVisible(false);

  const handleDismissPermanently = () => {
    setVisible(false);
    const state = loadBannerState();
    saveBannerState({ ...state, permanentlyDismissed: true });
  };

  const handleReferralClick = () => {
    setVisible(false);
    navigate('/referrals');
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '360px',
        maxWidth: 'calc(100vw - 48px)',
        background: 'linear-gradient(135deg, #0f2040, #162a48)',
        border: '1px solid rgba(160,140,90,0.4)',
        borderLeft: '3px solid #A08C5A',
        borderRadius: '14px',
        padding: '18px 20px',
        zIndex: 50,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        animation: 'slideInUp 0.3s ease-out',
      }}
      role="banner"
      aria-label="Referral program invitation"
    >
      {/* Close button */}
      <button
        onClick={handleRemindLater}
        style={{
          position: 'absolute', top: '12px', right: '14px',
          background: 'none', border: 'none', color: '#56687A',
          cursor: 'pointer', fontSize: '16px', lineHeight: 1,
          padding: '4px',
        }}
        aria-label="Remind me later"
      >
        &times;
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '22px' }}>&#x1F381;</span>
        <div>
          <div style={{
            fontFamily: 'system-ui, sans-serif', fontSize: '14px',
            fontWeight: 800, color: '#F0F4FF',
          }}>
            Get a free month of EvidLY
          </div>
          <div style={{
            fontSize: '10px', color: '#A08C5A', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '2px',
          }}>
            Referral Program
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{
        fontSize: '12px', color: '#94A3B8',
        lineHeight: 1.7, marginBottom: '14px',
        fontFamily: 'system-ui, sans-serif',
      }}>
        Know another kitchen operator struggling with compliance? Refer them to EvidLY and you both get{' '}
        <strong style={{ color: '#F0F4FF' }}>one month free</strong> when they activate.
      </div>

      {/* CTA */}
      <button
        onClick={handleReferralClick}
        style={{
          width: '100%',
          background: '#A08C5A',
          border: 'none',
          borderRadius: '8px',
          padding: '10px',
          color: '#F0F4FF',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          marginBottom: '8px',
        }}
      >
        Send a Referral &rarr;
      </button>

      {/* Permanent dismiss */}
      <button
        onClick={handleDismissPermanently}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          color: '#56687A',
          fontSize: '10px',
          cursor: 'pointer',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '4px',
        }}
      >
        Don&apos;t show this again
      </button>
    </div>
  );
}
