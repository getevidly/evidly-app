import type { ReactNode } from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  valueColor?: 'default' | 'gold' | 'green' | 'red' | 'navy';
  subtext?: string;
  icon?: ReactNode;
}

const VALUE_COLORS: Record<string, string> = {
  default: '#1E2D4D',
  navy: '#1E2D4D',
  gold: '#A08C5A',
  green: '#16A34A',
  red: '#DC2626',
};

export function StatCard({ label, value, valueColor = 'default', subtext }: StatCardProps) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: 8,
      padding: 24,
      minHeight: 110,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    }}>
      <p style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        margin: '0 0 8px',
        fontFamily: 'Inter, sans-serif',
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 32,
        fontWeight: 700,
        color: VALUE_COLORS[valueColor] || VALUE_COLORS.default,
        margin: 0,
        lineHeight: 1.1,
        fontFamily: 'Outfit, sans-serif',
      }}>
        {value}
      </p>
      {subtext && (
        <p style={{
          fontSize: 12,
          color: '#9CA3AF',
          margin: '6px 0 0',
          fontFamily: 'Inter, sans-serif',
        }}>
          {subtext}
        </p>
      )}
    </div>
  );
}
