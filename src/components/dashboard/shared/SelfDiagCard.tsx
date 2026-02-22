/**
 * Self-Diagnosis Quick-Action Card
 *
 * "Kitchen Problem?" card — visible to:
 * Owner, Facilities, Chef, Manager, Staff
 * NOT visible to: Executive, Compliance Officer
 */

import { useNavigate } from 'react-router-dom';

export function SelfDiagCard() {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate('/self-diagnosis')}
      style={{
        background: 'linear-gradient(135deg, #FEFDF8, #FEFCF4)',
        border: '1px solid rgba(160,140,90,.35)',
        borderLeft: '4px solid var(--gold)',
        borderRadius: '12px',
        padding: '18px 20px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        transition: 'border-color 0.15s',
        boxShadow: '0 1px 3px rgba(160,140,90,.1)',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#C4A96E')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(160,140,90,.35)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '28px' }}>{'\uD83D\uDD27'}</span>
        <div>
          <p style={{
            color: 'var(--text-primary)', fontSize: '15px', fontWeight: 800,
            margin: 0, fontFamily: 'system-ui',
          }}>
            Kitchen Problem?
          </p>
          <p style={{
            color: 'var(--text-secondary)', fontSize: '12px', margin: '3px 0 0',
            fontFamily: 'system-ui',
          }}>
            Troubleshoot equipment {'\u00b7'} Notify your vendor {'\u00b7'} Attach photos & video {'\u2014'} in under 2 minutes
          </p>
        </div>
      </div>
      <div style={{
        background: '#A08C5A',
        borderRadius: '8px',
        padding: '8px 16px',
        whiteSpace: 'nowrap' as const,
        flexShrink: 0,
      }}>
        <span style={{
          color: '#ffffff', fontSize: '12px',
          fontWeight: 700, fontFamily: 'system-ui',
        }}>
          Start Diagnosis {'\u2192'}
        </span>
      </div>
    </div>
  );
}
