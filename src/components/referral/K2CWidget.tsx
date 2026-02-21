import React from 'react';

interface K2CWidgetProps {
  mealsGenerated: number;
  referralsCount: number;
  monthsFree: number;
  onShareClick: () => void;
}

export const K2CWidget: React.FC<K2CWidgetProps> = ({
  mealsGenerated,
  referralsCount,
  monthsFree,
  onShareClick,
}) => (
  <div style={{
    background: '#FFFFFF',
    border: '1px solid #D1D9E6',
    borderLeft: '3px solid #A08C5A',
    borderRadius: '10px',
    padding: '14px 16px',
    boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
      <span style={{ fontSize: '16px' }}>🍽️</span>
      <span style={{
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: '12px',
        fontWeight: 700,
        color: '#A08C5A',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
      }}>
        Kitchen to Community
      </span>
    </div>
    <p style={{
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      fontSize: '22px',
      fontWeight: 800,
      color: 'var(--text-primary, #0B1628)',
      margin: '0 0 2px',
    }}>
      {mealsGenerated} meals
    </p>
    <p style={{
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      fontSize: '11px',
      color: 'var(--text-secondary, #3D5068)',
      margin: '0 0 10px',
    }}>
      {referralsCount} referrals · {monthsFree} months free earned
    </p>
    <button
      onClick={onShareClick}
      style={{
        width: '100%',
        backgroundColor: 'transparent',
        border: '1px solid #A08C5A',
        color: '#A08C5A',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: '12px',
        fontWeight: 600,
        padding: '6px 0',
        borderRadius: '6px',
        cursor: 'pointer',
      }}
    >
      Share the Mission →
    </button>
  </div>
);
