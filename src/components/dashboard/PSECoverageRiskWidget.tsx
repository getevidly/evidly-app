import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle } from 'lucide-react';
import { SAMPLE_PSE_SAFEGUARDS } from '../../data/workforceRiskDemoData';

const NAVY = '#1e4d6b';
const GOLD = '#d4af37';
const TEXT_SEC = '#6B7F96';
const BORDER = '#D1D9E6';

export function PSECoverageRiskWidget({ locationId }: { locationId?: string }) {
  const navigate = useNavigate();

  const safeguards = SAMPLE_PSE_SAFEGUARDS;
  const overdue = safeguards.filter((s) => s.status === 'overdue');

  if (overdue.length === 0) return null;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1px solid ${BORDER}`,
        borderLeft: '4px solid #DC2626',
        borderRadius: 12,
        padding: '20px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Shield size={18} color={NAVY} />
        <span style={{ fontWeight: 700, color: NAVY, fontSize: 15 }}>
          Coverage Risk — Protective Safeguards
        </span>
      </div>

      <p style={{ fontSize: 13, color: TEXT_SEC, lineHeight: 1.55, margin: '0 0 16px' }}>
        One or more protective safeguards on your commercial property policy may be
        overdue. Consult your carrier or broker to confirm your Protective Safeguards
        Endorsement requirements.
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        {overdue.map((s) => (
          <span
            key={s.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#DC2626',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 6,
              padding: '4px 10px',
            }}
          >
            <AlertTriangle size={13} />
            {s.label} — OVERDUE
          </span>
        ))}
      </div>

      <button
        onClick={() => navigate('/facility-safety')}
        style={{
          background: NAVY,
          color: '#FFFFFF',
          fontSize: 13,
          fontWeight: 600,
          border: 'none',
          borderRadius: 8,
          padding: '8px 20px',
          cursor: 'pointer',
        }}
      >
        View Service Records
      </button>
    </div>
  );
}
