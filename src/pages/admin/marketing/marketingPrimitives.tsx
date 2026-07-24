/**
 * marketingPrimitives — shared presentational components for the Marketing console.
 *
 * Ported from the approved design mock (EvidLY_Marketing_Dashboard.jsx).
 * These render shape only — no Supabase calls, no sample data.
 * Data wiring comes in later phases.
 */
import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Link2, LayoutDashboard } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  EV_NAVY, EV_EMBER, EV_EMBER_HOT, EV_MUTED,
  EV_LIGHT, EV_LINE, EV_PAPER, EV_SUCCESS, EV_DANGER,
  DISPLAY, BODY,
} from './marketingTokens';

/* ── Delta ─────────────────────────────────────────────────────── */
export function Delta({ value, suffix = '' }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: positive ? EV_SUCCESS : EV_DANGER }}>
      <Icon size={11} />{positive ? '+' : ''}{value}{suffix}
    </span>
  );
}

/* ── BandPill ──────────────────────────────────────────────────── */
const BAND_COLORS: Record<string, { bg: string; fg: string }> = {
  PREDICT: { bg: '#F6E9E3', fg: EV_EMBER_HOT },
  REDUCE:  { bg: '#E2ECF2', fg: '#2C5570' },
  PROVE:   { bg: '#E7EDE7', fg: '#2F5A3F' },
};

export function BandPill({ band }: { band: string }) {
  const c = BAND_COLORS[band] ?? { bg: EV_LIGHT, fg: EV_MUTED };
  return (
    <span
      className="inline-flex items-center font-bold uppercase text-[10px] px-2 py-0.5 rounded"
      style={{ backgroundColor: c.bg, color: c.fg, letterSpacing: '0.12em', fontFamily: BODY }}
    >
      {band}
    </span>
  );
}

/* ── KpiMini ───────────────────────────────────────────────────── */
export function KpiMini({ l, v, sub, accent }: { l: string; v: string | number; sub?: string; accent?: string }) {
  return (
    <div className="border p-4 rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
      <div className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: EV_MUTED }}>{l}</div>
      <div className="text-2xl font-bold mt-1" style={{ color: accent ?? EV_NAVY, fontFamily: DISPLAY }}>{v}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: EV_MUTED }}>{sub}</div>}
    </div>
  );
}

/* ── BarRow ─────────────────────────────────────────────────────── */
export function BarRow({ label, pct, color, right }: { label: string; pct: number; color: string; right?: string }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[12px] mb-1">
        <span style={{ color: EV_NAVY, fontWeight: 600 }}>{label}</span>
        <span style={{ color: EV_MUTED, fontWeight: 700 }}>{right ?? `${pct}%`}</span>
      </div>
      <div className="h-2 rounded" style={{ backgroundColor: EV_LIGHT }}>
        <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/* ── TableCard ─────────────────────────────────────────────────── */
export function TableCard({ title, cols, rows, note }: {
  title: string;
  cols: string[];
  rows: (string | number)[][];
  note?: string;
}) {
  const grid = `2fr repeat(${cols.length - 1}, 1fr)`;
  return (
    <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: EV_LINE }}>
        <h4 className="text-sm font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>{title}</h4>
        {note && <div className="text-[11px] mt-0.5" style={{ color: EV_MUTED }}>{note}</div>}
      </div>
      <div className="grid px-4 py-2" style={{ gridTemplateColumns: grid, borderBottom: `1px solid ${EV_LINE}` }}>
        {cols.map((c, i) => (
          <div key={i} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: EV_MUTED, textAlign: i === 0 ? 'left' : 'right' }}>{c}</div>
        ))}
      </div>
      {rows.map((r, ri) => (
        <div key={ri} className="grid px-4 py-2.5 items-center" style={{ gridTemplateColumns: grid, borderTop: ri > 0 ? `1px solid ${EV_LINE}` : 'none' }}>
          {r.map((cell, ci) => (
            <div
              key={ci}
              className={ci === 0 ? 'truncate' : ''}
              style={{
                fontSize: 12.5,
                fontWeight: ci === 0 ? 600 : 400,
                color: ci === 0 ? EV_NAVY : EV_MUTED,
                textAlign: ci === 0 ? 'left' : 'right',
                fontFamily: ci === 0 ? BODY : 'ui-monospace, monospace',
                minWidth: ci === 0 ? 0 : 'auto',
              }}
            >
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── ConnectBanner ─────────────────────────────────────────────── */
export function ConnectBanner({ Icon, name, blurb }: { Icon: LucideIcon; name: string; blurb: string }) {
  return (
    <div className="border p-5 flex items-start gap-4 rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER, borderLeftWidth: 3, borderLeftColor: EV_EMBER }}>
      <div className="w-11 h-11 flex items-center justify-center flex-shrink-0 rounded" style={{ backgroundColor: EV_LIGHT }}>
        <Icon size={20} style={{ color: EV_NAVY }} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>{name}</h3>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ backgroundColor: '#F6E9E3', color: EV_EMBER_HOT, letterSpacing: '0.1em' }}>
            <span className="rounded-full" style={{ width: 6, height: 6, backgroundColor: EV_EMBER_HOT }} /> Not connected
          </span>
        </div>
        <p className="text-[13px] mt-1.5" style={{ color: EV_MUTED, lineHeight: 1.55, maxWidth: '64ch' }}>{blurb}</p>
        <button className="inline-flex items-center gap-2 px-4 py-2 font-bold mt-3 rounded" style={{ backgroundColor: EV_NAVY, color: '#fff', fontSize: 13, fontFamily: BODY }}>
          <Link2 size={15} /> Connect account
        </button>
      </div>
    </div>
  );
}

/* ── PreviewGate ───────────────────────────────────────────────── */
export function PreviewGate({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="mb-3">
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ backgroundColor: EV_LIGHT, color: EV_MUTED, letterSpacing: '0.12em' }}>
          Sample preview · fills in once connected
        </span>
      </div>
      <div style={{ opacity: 0.55, pointerEvents: 'none' }}>{children}</div>
    </div>
  );
}

/* ── PlaceholderTab ─────────────────────────────────────────────── */
export function PlaceholderTab({ title, note, Icon = LayoutDashboard }: { title: string; note: string; Icon?: LucideIcon }) {
  return (
    <div className="border p-12 text-center rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
      <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded" style={{ backgroundColor: EV_LIGHT }}>
        <Icon size={20} style={{ color: EV_EMBER }} />
      </div>
      <h3 className="text-lg font-bold mb-2" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>{title}</h3>
      <p className="text-sm max-w-md mx-auto font-medium" style={{ color: EV_MUTED }}>{note}</p>
    </div>
  );
}
