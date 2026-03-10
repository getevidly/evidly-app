interface KpiTileProps {
  label: string;
  value: string | number;
  valueColor?: string;
}

const VALUE_COLORS: Record<string, string> = {
  default: '#1E2D4D',
  navy: '#1E2D4D',
  gold: '#A08C5A',
  green: '#166534',
  warning: '#C2410C',
  red: '#991B1B',
};

export function KpiTile({ label, value, valueColor = 'default' }: KpiTileProps) {
  const color = VALUE_COLORS[valueColor] || valueColor;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E5E7EB',
      borderRadius: 8,
      padding: '16px 20px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <p style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#6B7280',
        marginBottom: 8,
        marginTop: 0,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 28,
        fontWeight: 800,
        lineHeight: 1,
        color,
        margin: 0,
      }}>
        {value}
      </p>
    </div>
  );
}
