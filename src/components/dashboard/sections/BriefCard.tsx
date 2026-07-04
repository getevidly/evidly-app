import { Link } from 'react-router-dom';
import { ShieldCheck, Flame } from 'lucide-react';
import type { AdvisorBriefing } from '../../../hooks/useAdvisorBriefings';
import { daysSince } from '../../../lib/daysSince';

type AdvisorType = 'compliance_officer' | 'food_safety' | 'fire_safety';

interface BriefCardProps {
  variant: AdvisorType;
  briefing: AdvisorBriefing | null;
  timezone?: string;
  showItems?: boolean;
  showConsult?: boolean;
  isStale?: boolean;
  countyDepartment?: string;
  locationNames?: Record<string, string>;
  regenFailed?: boolean;
}

const EYEBROW: Record<AdvisorType, { label: string; authority: string }> = {
  compliance_officer: { label: 'COMPLIANCE', authority: '' },
  food_safety: { label: 'FOOD SAFETY', authority: 'Current with FDA Food Code, CalCode' },
  fire_safety: { label: 'FIRE SAFETY', authority: 'Current with NFPA 10, 17A, 25, 72, 96, CA Fire Code' },
};

const CONSULT_LABEL: Record<AdvisorType, string> = {
  compliance_officer: 'Open compliance',
  food_safety: 'Open food safety',
  fire_safety: 'Open fire safety',
};

const CONSULT_ROUTE: Record<AdvisorType, string> = {
  compliance_officer: '/dashboard',
  food_safety: '/temp-logs',
  fire_safety: '/fire-safety/kec',
};

const CLEAR_BODY: Record<AdvisorType, string> = {
  compliance_officer: 'Nothing open. Everything current.',
  food_safety: 'All food-safety controls current. Nothing missing this period.',
  fire_safety: 'Hood cleaning, suppression, sprinkler, alarm, and extinguisher service all current. Nothing missing this period.',
};

const TINT = {
  clear:     { bg: '#F8FCFA', border: '#CFE9DE', pill: '#E1F5EE', pillText: '#0F6E56' },
  attention: { bg: '#FFFDF8', border: '#EBD9B6', pill: '#FAEEDA', pillText: '#8A5A0B' },
} as const;

function ageLabel(days: number): string {
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} unaddressed`;
  return 'flagged today';
}

export function BriefCard({ variant, briefing, showItems = true, showConsult = false, isStale = false, countyDepartment, locationNames, regenFailed }: BriefCardProps) {
  const eyebrow = EYEBROW[variant];
  const Icon = variant === 'fire_safety' ? Flame : ShieldCheck;
  const authorityLine = countyDepartment
    ? `${eyebrow.authority} \u00B7 ${countyDepartment}`
    : eyebrow.authority;

  if (!briefing && regenFailed) {
    return (
      <div className="brief-lite" style={{ background: '#FFF', border: '1px solid #E7E1D5', borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', color: '#A08C5A', margin: 0 }}>{eyebrow.label}</p>
        <p style={{ fontSize: 13, color: '#8A93A6', margin: '10px 0 0' }}>Couldn't load — try refreshing.</p>
      </div>
    );
  }
  if (!briefing) {
    return (
      <div className="brief-lite" style={{ background: '#FFF', border: '1px solid #E7E1D5', borderRadius: 12, padding: 16, minHeight: 120 }}>
        <div style={{ height: 10, width: '55%', background: '#EFEBE0', borderRadius: 4, marginBottom: 12 }} />
        <div style={{ height: 12, width: '40%', background: '#EFEBE0', borderRadius: 4, marginBottom: 10 }} />
        <div style={{ height: 10, width: '90%', background: '#EFEBE0', borderRadius: 4 }} />
      </div>
    );
  }

  const items = briefing.open_items || [];
  const isClear = briefing.posture === 'solid' || items.length === 0;
  const t = isClear ? TINT.clear : TINT.attention;
  const badge = isClear ? 'Clear' : (briefing.posture === 'alarm' ? 'Action' : 'Attention');
  const oldest = items.reduce((mx, i) => Math.max(mx, daysSince(i.detected_at)), 0);
  const headline = isClear ? 'All in good standing' : `${items.length} open, ${ageLabel(oldest)}`;

  return (
    <div className="brief-lite" style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', color: '#A08C5A', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={12} /> {eyebrow.label}
      </p>
      {authorityLine && <p style={{ fontSize: 10.5, color: '#8A93A6', lineHeight: 1.45, margin: '3px 0 0' }}>{authorityLine}</p>}

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 9px', background: t.pill, color: t.pillText }}>{badge}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1E2D4D' }}>{headline}</span>
        {isStale && <span style={{ fontSize: 10, color: '#B0A99A' }}>&middot; refreshing soon</span>}
      </div>

      {isClear ? (
        <div style={{ fontSize: 12, color: '#5C6473', lineHeight: 1.5, marginTop: 8 }}>{CLEAR_BODY[variant]}</div>
      ) : (
        showItems && items.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {items.map((item) => {
              const d = daysSince(item.detected_at);
              const loc = item.location_id && locationNames ? locationNames[item.location_id] : '';
              return (
                <div key={`${item.source}-${item.source_id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #EDE8DD' }}>
                  <span style={{ fontSize: 12.5, color: '#1E2D4D' }}>
                    {item.title}{loc && <span style={{ color: '#8A93A6' }}> &middot; {loc}</span>}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 9px', background: '#FBE4DB', color: '#B4462A', whiteSpace: 'nowrap' }}>{d}d</span>
                </div>
              );
            })}
          </div>
        )
      )}

      {showConsult && (
        <Link to={CONSULT_ROUTE[variant]} style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#1E2D4D', background: 'transparent', border: '1px solid #D9D3C6', borderRadius: 7, padding: '7px 13px', textDecoration: 'none' }}>
          <i className="ti ti-external-link" /> {CONSULT_LABEL[variant]}
        </Link>
      )}
    </div>
  );
}
