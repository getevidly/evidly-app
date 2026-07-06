import { Link } from 'react-router-dom';
import { useDashboardLocation } from '../../contexts/DashboardLocationContext';
import { useWhatsAtRisk, PillarRisk } from '../../hooks/useWhatsAtRisk';

const money = (n: number) => {
  const v = Math.round(n);
  if (v >= 1000000) return '$' + (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return '$' + v.toLocaleString();
};
const range = (lo: number, hi: number) => money(lo) + '\u2013' + money(hi);

const FOOD_LINES = [
  { key: 'foodborne_illness', label: 'Foodborne illness', ctx: 'logs, HACCP' },
  { key: 'shutdown_reinspection', label: 'Shutdown & reinspection', ctx: 'health dept' },
  { key: 'reputation', label: 'Reputation recovery', ctx: '' },
];
const FIRE_LINES = [
  { key: 'fire_damage_equipment', label: 'Fire damage & equipment', ctx: 'NFPA 96, 17A, 25, 72' },
  { key: 'shutdown_rebuild', label: 'Shutdown & rebuild', ctx: '' },
  { key: 'reputation', label: 'Reputation recovery', ctx: '' },
];

function PillarCard({ title, pr, worst, lines, worstDesc, covers, benchLines }: {
  title: string; pr: PillarRisk; worst: { low: number; high: number };
  lines: { key: string; label: string; ctx: string }[]; worstDesc: string; covers: string;
  benchLines: Record<string, { low: number; high: number }>;
}) {
  const stillLo = pr.pending.low + pr.live.low, stillHi = pr.pending.high + pr.live.high;
  const clear = pr.counts.total > 0 && stillHi === 0;
  return (
    <div style={{ border: '1px solid #EDE8DD', borderRadius: 10, padding: '16px 18px', marginTop: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#A39DAB' }}>{title}</span>
      <div style={{ fontSize: 22, fontWeight: 700, color: clear ? '#3E9E7A' : '#1E2D4D', lineHeight: 1, marginTop: 6 }}>
        {clear ? 'Clear' : range(stillLo, stillHi)}
        <span style={{ fontSize: 11, fontWeight: 400, color: '#8A93A6' }}> {clear ? 'nothing at risk' : '/yr still at risk'}</span>
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
        {pr.reduced.high > 0 && <span style={{ fontSize: 11, color: '#3E9E7A' }}>&darr; <b>{range(pr.reduced.low, pr.reduced.high)}</b> reduced</span>}
        {pr.pending.high > 0 && <span style={{ fontSize: 11, color: '#9A93A6' }}><b>{range(pr.pending.low, pr.pending.high)}</b> pending</span>}
      </div>
      {pr.live.high > 0 && (
        <div style={{ background: '#FCF3F0', border: '1px solid #F0D9D2', borderRadius: 8, padding: '9px 12px', marginTop: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#B4472E' }}>Live exposure</span>{' '}
          <span style={{ fontSize: 13, fontWeight: 700, color: '#B4472E' }}>{range(pr.live.low, pr.live.high)}</span>{' '}
          <span style={{ fontSize: 11, color: '#9A6A5C' }}>&middot; {pr.counts.live} overdue &mdash; realized until resolved</span>
        </div>
      )}
      <p style={{ fontSize: 11, color: '#8A93A6', margin: '8px 0 0' }}>of {range(pr.baseline.low, pr.baseline.high)} if nothing done. Components:</p>
      <div style={{ marginTop: 4 }}>
        {lines.map((l) => {
          const b = benchLines[l.key];
          return (
            <div key={l.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderTop: '1px solid #F4F2EC', color: '#5C6473' }}>
              <span>{l.label}{l.ctx ? <span style={{ fontSize: 10, color: '#B0A99A' }}> {l.ctx}</span> : null}</span>
              <span>{b ? range(b.low, b.high) : '\u2014'}</span>
            </div>
          );
        })}
      </div>
      <div style={{ background: '#FBFAF6', border: '1px solid #EDE8DD', borderRadius: 8, padding: '10px 12px', marginTop: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#8A5A0B' }}>Worst case</span>{' '}
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1E2D4D' }}>{money(worst.low)}&ndash;{money(worst.high)}+</span>{' '}
        <span style={{ fontSize: 11, color: '#8A93A6' }}>&middot; {worstDesc}</span>
      </div>
      <p style={{ fontSize: 11, color: '#8A93A6', margin: '8px 0 0' }}>Covers: {covers}</p>
    </div>
  );
}

export function WhatsAtRisk() {
  const { selectedLocationId } = useDashboardLocation();
  const risk = useWhatsAtRisk(selectedLocationId);

  if (risk.loading) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#8A93A6' }}>Loading&hellip;</div>;
  }

  const tStill = (lo: number, hi: number) => range(lo, hi);
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 60px' }}>
      <Link to="/dashboard" style={{ fontSize: 12, color: '#A08C5A', textDecoration: 'none' }}>&lsaquo; Dashboard</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1E2D4D', margin: 0 }}>What's at Risk</h1>
          <p style={{ fontSize: 13, color: '#8A93A6', margin: '3px 0 0' }}>What's on the line behind the required work</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#8A8594', background: '#F4F2EC', borderRadius: 20, padding: '4px 11px' }}>Casual dining</span>
          <p style={{ fontSize: 10, color: '#9A93A6', margin: '4px 0 0' }}>Based on your restaurant type</p>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#8A5A0B', background: '#FBF0DC', borderRadius: 7, padding: '9px 12px', marginTop: 12, lineHeight: 1.45 }}>
        {risk.isPlaceholder
          ? 'Illustrative figures, conservative basis. \u201CWorst case\u201D is a one-time ceiling if things go wrong \u2014 not a yearly cost.'
          : 'Conservative estimates. \u201CWorst case\u201D is a one-time ceiling if things go wrong \u2014 not a yearly cost.'}
      </div>
      <PillarCard title="Food safety" pr={risk.food} worst={risk.worst.food} lines={FOOD_LINES} benchLines={risk.lines.food}
        worstDesc="A severe outbreak, with a lawsuit." covers="receiving, holding & cooling logs \u00B7 checklists \u00B7 HACCP." />
      <PillarCard title="Fire safety" pr={risk.fire} worst={risk.worst.fire} lines={FIRE_LINES} benchLines={risk.lines.fire}
        worstDesc="A fire your insurance won't cover." covers="hood cleaning \u00B7 suppression, alarm & sprinkler checks." />
      <div style={{ background: '#FBFAF6', border: '1px solid #EDE8DD', borderRadius: 10, padding: '16px 18px', marginTop: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#1E2D4D' }}>Total at risk</span>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1E2D4D', lineHeight: 1, marginTop: 6 }}>
          {tStill(risk.total.pending.low + risk.total.live.low, risk.total.pending.high + risk.total.live.high)}
          <span style={{ fontSize: 11, fontWeight: 400, color: '#8A93A6' }}> /yr still at risk</span>
        </div>
        <p style={{ fontSize: 11, color: '#8A93A6', margin: '4px 0 0' }}>
          Food safety ({tStill(risk.food.pending.low + risk.food.live.low, risk.food.pending.high + risk.food.live.high)}) + fire safety ({tStill(risk.fire.pending.low + risk.fire.live.low, risk.fire.pending.high + risk.fire.live.high)})
        </p>
        <p style={{ fontSize: 11, color: '#7A8290', margin: '8px 0 0', lineHeight: 1.5 }}>
          This is money at risk, added up. It's not a verdict on your kitchen, and it doesn't replace your county's inspection. Worst-case figures are shown separately for each area and aren't added together.
        </p>
      </div>
      <p style={{ fontSize: 10, color: '#B0A99A', marginTop: 14, lineHeight: 1.5 }}>
        Basis: USDA ERS &middot; CDC NORS &middot; Bartsch et al. (food) &middot; NFPA / Campbell &middot; ISO CP 04 11 (fire). Figures shown at the conservative end.
      </p>
    </div>
  );
}
