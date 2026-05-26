import { useFounderCount, FOUNDER_CAP } from '../hooks/useFounderCount';

export function FounderCounter() {
  const { spotsRemaining, loading } = useFounderCount();

  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(160,140,90,0.1), rgba(160,140,90,0.05))',
        border: '1px solid rgba(160,140,90,0.3)',
        borderRadius: 12,
        padding: '12px 16px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 180,
          height: 16,
          background: 'rgba(160,140,90,0.15)',
          borderRadius: 8,
          margin: '0 auto',
        }} />
      </div>
    );
  }

  if (spotsRemaining <= 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(160,140,90,0.1), rgba(160,140,90,0.05))',
        border: '1px solid rgba(160,140,90,0.3)',
        borderRadius: 12,
        padding: '12px 16px',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1E2D4D' }}>
          All {FOUNDER_CAP} Founder spots have been claimed.
        </span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(160,140,90,0.1), rgba(160,140,90,0.05))',
      border: '1px solid rgba(160,140,90,0.3)',
      borderRadius: 12,
      padding: '12px 16px',
      textAlign: 'center',
    }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#1E2D4D' }}>
        {spotsRemaining} of {FOUNDER_CAP} Founder spots remaining
      </span>
      <span style={{ display: 'block', fontSize: 12, color: '#1E2D4D', opacity: 0.5, marginTop: 4 }}>
        $99/mo — locked for 36 months
      </span>
    </div>
  );
}
