/**
 * InspectionBadge — SOCIAL-PROOF-01
 *
 * Shareable green badge card celebrating a completed inspection.
 * Uses all inline styles for html2canvas fidelity.
 * NO compliance scores — advisory language only.
 */
import { forwardRef } from 'react';

const GREEN = '#16a34a';
const GREEN_DARK = '#15803d';
const WHITE = '#FFFFFF';
const CREAM = '#f0fdf4';

export interface InspectionBadgeData {
  orgName: string;
  city: string;
  inspectionDate: string; // formatted date string
  referralCode: string;
}

interface InspectionBadgeProps {
  data: InspectionBadgeData;
}

export const InspectionBadge = forwardRef<HTMLDivElement, InspectionBadgeProps>(
  function InspectionBadge({ data }, ref) {
    return (
      <div
        ref={ref}
        style={{
          background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})`,
          color: WHITE,
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
          <span style={{ color: WHITE, fontWeight: 800, fontSize: 20 }}>
            E<span style={{ opacity: 0.7 }}>vid</span>LY
          </span>
          <span style={{ fontSize: 10, color: CREAM, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
            Know Before They Do
          </span>
        </div>

        {/* Shield icon + title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 52, margin: '0 0 12px', lineHeight: 1 }}>🛡️</p>
          <p style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: WHITE }}>
            Inspected with EvidLY
          </p>
          <p style={{ fontSize: 13, color: CREAM, margin: 0, opacity: 0.85 }}>
            This kitchen prepared for their inspection with EvidLY
          </p>
        </div>

        {/* Org info badge */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', color: WHITE }}>
            {data.orgName}
          </p>
          <p style={{ fontSize: 13, color: CREAM, margin: '0 0 8px', opacity: 0.85 }}>
            {data.city}
          </p>
          <p style={{ fontSize: 12, color: CREAM, margin: 0, opacity: 0.7 }}>
            Inspection date: {data.inspectionDate}
          </p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 24,
          }}
        >
          {[
            { label: 'Preparation', value: 'EvidLY-monitored' },
            { label: 'Status', value: 'Inspection complete' },
          ].map(item => (
            <div
              key={item.label}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 6,
                padding: '10px 12px',
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  color: CREAM,
                  margin: '0 0 3px',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                  opacity: 0.7,
                }}
              >
                {item.label}
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: WHITE }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p
          style={{
            fontSize: 8,
            color: 'rgba(255, 255, 255, 0.45)',
            margin: '0 0 12px',
            lineHeight: 1.5,
          }}
        >
          EvidLY is an operational intelligence platform for commercial kitchens. This badge reflects
          that the operator used EvidLY to prepare for an inspection and does
          not constitute an official inspection result, compliance
          determination, or regulatory certification.
        </p>

        {/* Footer */}
        <p style={{ fontSize: 11, color: CREAM, margin: 0, opacity: 0.7 }}>
          getevidly.com
        </p>
      </div>
    );
  },
);
