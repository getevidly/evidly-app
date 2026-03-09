import { NAVY, GOLD } from '../../dashboard/shared/constants';

interface Props {
  orgName: string;
  jurisdiction?: string;
  date?: string;
  confidential?: boolean;
}

export function ReportHeader({ orgName, jurisdiction, date, confidential }: Props) {
  const d = date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div style={{
      background: NAVY,
      color: '#fff',
      padding: '16px 24px',
      borderRadius: '10px 10px 0 0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>
            <span style={{ color: GOLD }}>E</span>vid<span style={{ color: GOLD }}>LY</span>
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.9 }}>Business Intelligence</span>
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
          {orgName}{jurisdiction ? ` · ${jurisdiction}` : ''} · {d}
        </div>
      </div>
      {confidential && (
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          padding: '4px 12px', borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.3)',
          color: 'rgba(255,255,255,0.8)',
        }}>
          CONFIDENTIAL
        </span>
      )}
    </div>
  );
}
