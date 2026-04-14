/**
 * StandingCard — AMBASSADOR-SCRIPT-01
 *
 * Visual shareable card showing EvidLY-monitored status.
 * Uses all inline styles for html2canvas fidelity.
 * NO compliance scores — advisory language only.
 */
import { forwardRef } from 'react';
import type { StandingCardData } from '../../lib/ambassadorSystem';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const CREAM = '#FAF7F0';

interface StandingCardProps {
  data: StandingCardData;
}

export const StandingCard = forwardRef<HTMLDivElement, StandingCardProps>(
  function StandingCard({ data }, ref) {
    const stats = [
      { label: 'Days active', value: String(data.daysActive) },
      { label: 'Temperature logs', value: String(data.tempLogs) },
      { label: 'Checklists completed', value: String(data.checklistsCompleted) },
      { label: 'KEC service', value: data.kecStatus },
      { label: 'Documents on file', value: String(data.documentsOnFile) },
      { label: 'Referral code', value: data.referralCode },
    ];

    return (
      <div
        ref={ref}
        style={{
          background: NAVY,
          color: CREAM,
          padding: 32,
          borderRadius: 12,
          width: 480,
          fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ color: GOLD, fontWeight: 800, fontSize: 20 }}>
              E<span style={{ color: CREAM }}>vid</span>LY
            </span>
            <span style={{ fontSize: 10, color: GOLD, marginLeft: 8, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
              Know Before They Do
            </span>
          </div>
          {data.isAmbassador && (
            <div
              style={{
                background: GOLD,
                color: CREAM,
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              ★ AMBASSADOR
            </div>
          )}
        </div>

        {/* Org name + city */}
        <p style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', color: CREAM }}>
          {data.orgName}
        </p>
        <p style={{ fontSize: 13, color: GOLD, margin: '0 0 24px' }}>
          {data.city}
        </p>

        {/* EvidLY-monitored badge */}
        <div
          style={{
            background: 'rgba(160, 140, 90, 0.15)',
            border: `1px solid ${GOLD}`,
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', color: GOLD }}>
            Our kitchen is EvidLY-monitored
          </p>
          <p style={{ fontSize: 12, color: CREAM, margin: 0 }}>
            {data.daysActive} days of active compliance monitoring
          </p>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            marginBottom: 24,
          }}
        >
          {stats.map(item => (
            <div
              key={item.label}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 6,
                padding: '10px 12px',
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  color: GOLD,
                  margin: '0 0 3px',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                }}
              >
                {item.label}
              </p>
              <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: CREAM }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p
          style={{
            fontSize: 8,
            color: 'rgba(250, 247, 240, 0.45)',
            margin: '0 0 12px',
            lineHeight: 1.5,
          }}
        >
          EvidLY is an operational intelligence platform for commercial kitchens. This card reflects
          operational activity tracked in EvidLY and does not constitute an
          official inspection result, compliance determination, or regulatory
          certification.
        </p>

        {/* Footer */}
        <p style={{ fontSize: 11, color: GOLD, margin: 0 }}>getevidly.com</p>
      </div>
    );
  },
);
