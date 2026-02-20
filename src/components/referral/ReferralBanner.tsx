import React, { useState } from 'react';

interface ReferralBannerProps {
  referralCode: string;
  referralUrl: string;
  mealsGenerated: number;
  headline?: string;
  subtext?: string;
}

export const ReferralBanner: React.FC<ReferralBannerProps> = ({
  referralCode,
  referralUrl,
  mealsGenerated,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1E2D4D 0%, #2A3F6B 50%, #1E2D4D 100%)',
      border: '1px solid #A08C5A',
      borderRadius: '12px',
      padding: '20px 24px',
      marginBottom: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Gold accent bar top */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '3px',
        background: 'linear-gradient(90deg, #A08C5A, #C4AE7A, #A08C5A)',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        {/* Left: Impact story */}
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '20px' }}>🍽️</span>
            <span style={{
              fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
              fontSize: '16px',
              fontWeight: 700,
              color: '#A08C5A',
            }}>
              Kitchen to Community
            </span>
          </div>
          <p style={{
            fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            fontSize: '13px',
            color: '#ffffff',
            margin: '0 0 4px',
            fontWeight: 500,
          }}>
            Every kitchen you refer = <strong style={{ color: '#A08C5A' }}>12 meals donated</strong> to No Kid Hungry.
          </p>
          <p style={{
            fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            fontSize: '12px',
            color: '#94a3b8',
            margin: 0,
          }}>
            You've generated <strong style={{ color: '#C4AE7A' }}>{mealsGenerated} meals</strong> so far.
            Plus earn <strong style={{ color: '#C4AE7A' }}>1 month free</strong> for every converted referral.
          </p>
        </div>

        {/* Right: Referral code + CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          {/* Code display */}
          <div style={{
            background: 'rgba(160, 140, 90, 0.15)',
            border: '1px solid #A08C5A',
            borderRadius: '6px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#A08C5A',
              fontWeight: 700,
              letterSpacing: '1px',
            }}>
              {referralCode}
            </span>
          </div>
          {/* Copy button */}
          <button
            onClick={handleCopy}
            style={{
              backgroundColor: copied ? '#166534' : '#A08C5A',
              color: '#ffffff',
              fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? '✓ Copied!' : 'Copy Referral Link'}
          </button>
        </div>
      </div>
    </div>
  );
};
