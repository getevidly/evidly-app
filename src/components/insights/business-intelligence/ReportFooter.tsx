import { NAVY } from '../../dashboard/shared/constants';

export function ReportFooter() {
  return (
    <div style={{
      background: NAVY,
      color: 'rgba(255,255,255,0.7)',
      padding: '12px 24px',
      borderRadius: '0 0 10px 10px',
      fontSize: 10,
      lineHeight: 1.6,
    }}>
      <div style={{ marginBottom: 4 }}>
        EvidLY LLC is a compliance technology and data platform. EvidLY does not provide legal, insurance, or regulatory advice.
        Risk signals and compliance data are informational only and do not constitute professional recommendations.
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
        <span>&copy; 2026 EvidLY LLC. All rights reserved.</span>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>
          Powered by EvidLY Intelligence
        </span>
      </div>
    </div>
  );
}
