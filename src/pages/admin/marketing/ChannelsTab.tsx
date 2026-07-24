/**
 * ChannelsTab — Channel performance cards across 16 channels and 7 categories.
 *
 * KPI strip wired to real Founder seat count, editable demos/spend
 * inputs that upsert to current month via useChannelsData.
 */
import { useState, useMemo } from 'react';
import {
  Search, Mail, Users, Megaphone, Phone, Handshake, Newspaper,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useFounderCount, FOUNDER_CAP } from '../../../hooks/useFounderCount';
import { useChannelsData, type ChannelRow, type ChannelActualRow } from '../../../lib/marketing/useChannelsData';
import { KpiMini, BarRow, BandPill } from './marketingPrimitives';
import {
  EV_NAVY, EV_EMBER, EV_MUTED, EV_LINE, EV_LIGHT, EV_PAPER,
  DISPLAY, BODY,
} from './marketingTokens';

// ── Category metadata ────────────────────────────────────────────

interface CatMeta { color: string; Icon: LucideIcon }

const CAT_META: Record<string, CatMeta> = {
  'Inbound / SEO':      { color: '#5B8C6F', Icon: Search },
  'Owned / Nurture':    { color: '#4A7B94', Icon: Mail },
  'Social':             { color: '#7B6BA4', Icon: Users },
  'Paid':               { color: EV_EMBER,  Icon: Megaphone },
  'Outbound':           { color: '#8A6412', Icon: Phone },
  'Partner / Referral': { color: '#2C5570', Icon: Handshake },
  'PR / Earned':        { color: '#6B7280', Icon: Newspaper },
};

const CAT_ORDER = Object.keys(CAT_META);

// ── Helpers ──────────────────────────────────────────────────────

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function costPerDemo(spendCents: number, demos: number): string {
  if (demos === 0) return '—';
  return money(Math.round(spendCents / demos));
}

// ── Editable number input ────────────────────────────────────────

function Num({
  value,
  onChange,
  prefix,
  width = 80,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  width?: number;
}) {
  const [local, setLocal] = useState(String(value));
  const [focused, setFocused] = useState(false);

  const commit = () => {
    const parsed = parseInt(local, 10);
    if (!isNaN(parsed) && parsed !== value) {
      onChange(parsed);
    } else {
      setLocal(String(value));
    }
  };

  // Sync from prop when not editing
  if (!focused && String(value) !== local) {
    // Will be picked up next render
  }

  return (
    <span className="inline-flex items-center gap-1">
      {prefix && <span style={{ color: EV_MUTED, fontSize: 12 }}>{prefix}</span>}
      <input
        type="number"
        value={focused ? local : String(value)}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => { setFocused(true); setLocal(String(value)); }}
        onBlur={() => { setFocused(false); commit(); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
        style={{
          width,
          padding: '4px 8px',
          border: `1px solid ${EV_LINE}`,
          borderRadius: 6,
          fontSize: 13,
          fontFamily: 'ui-monospace, monospace',
          color: EV_NAVY,
          backgroundColor: EV_PAPER,
          outline: 'none',
          textAlign: 'right',
        }}
      />
    </span>
  );
}

// ── Component ────────────────────────────────────────────────────

export default function ChannelsTab() {
  const { founderCount, loading: fcLoading } = useFounderCount();
  const { channels, actuals, loading: chLoading, upsertActual } = useChannelsData();

  const loading = fcLoading || chLoading;

  // Map channel_id → actual row for fast lookup
  const actualMap = useMemo(() => {
    const m = new Map<string, ChannelActualRow>();
    for (const a of actuals) m.set(a.channel_id, a);
    return m;
  }, [actuals]);

  // Aggregate KPIs
  const totalDemos = useMemo(() => actuals.reduce((s, a) => s + (a.demos || 0), 0), [actuals]);
  const totalSpend = useMemo(() => actuals.reduce((s, a) => s + (a.spend_cents || 0), 0), [actuals]);

  // Bar-mix data: channels with demos or spend, sorted desc
  const demoMix = useMemo(() => {
    if (channels.length === 0) return [];
    const items = channels
      .map((ch) => ({ ch, demos: actualMap.get(ch.id)?.demos || 0 }))
      .filter((x) => x.demos > 0)
      .sort((a, b) => b.demos - a.demos);
    const max = items[0]?.demos || 1;
    return items.map((x) => ({
      label: x.ch.label,
      pct: Math.round((x.demos / max) * 100),
      color: CAT_META[x.ch.category]?.color || EV_MUTED,
      right: String(x.demos),
    }));
  }, [channels, actualMap]);

  const spendMix = useMemo(() => {
    if (channels.length === 0) return [];
    const items = channels
      .map((ch) => ({ ch, spend: actualMap.get(ch.id)?.spend_cents || 0 }))
      .filter((x) => x.spend > 0)
      .sort((a, b) => b.spend - a.spend);
    const max = items[0]?.spend || 1;
    return items.map((x) => ({
      label: x.ch.label,
      pct: Math.round((x.spend / max) * 100),
      color: CAT_META[x.ch.category]?.color || EV_MUTED,
      right: money(x.spend),
    }));
  }, [channels, actualMap]);

  // Group channels by category
  const grouped = useMemo(() => {
    const m = new Map<string, ChannelRow[]>();
    for (const cat of CAT_ORDER) m.set(cat, []);
    for (const ch of channels) {
      const arr = m.get(ch.category);
      if (arr) arr.push(ch);
      else m.set(ch.category, [ch]);
    }
    return m;
  }, [channels]);

  // Handle upsert
  const handleChange = (channelId: string, field: 'demos' | 'spend_cents', value: number) => {
    upsertActual(channelId, field, value);
  };

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: EV_MUTED, fontFamily: BODY }}>
        Loading channels…
      </div>
    );
  }

  return (
    <div style={{ fontFamily: BODY }}>
      {/* ── KPI Strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiMini
          l="Founder Seats"
          v={`${founderCount} of ${FOUNDER_CAP}`}
          sub={`${FOUNDER_CAP - founderCount} remaining`}
          accent={EV_EMBER}
        />
        <KpiMini
          l="Demos This Month"
          v={totalDemos}
          sub="across all channels"
        />
        <KpiMini
          l="Total Spend"
          v={money(totalSpend)}
          sub="this month"
        />
        <KpiMini
          l="Blended Cost / Demo"
          v={costPerDemo(totalSpend, totalDemos)}
          sub={totalDemos > 0 ? `${totalDemos} demos` : 'no demos yet'}
        />
      </div>

      {/* ── Bar Mixes ───────────────────────────────────────────── */}
      {(demoMix.length > 0 || spendMix.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {demoMix.length > 0 && (
            <div className="border rounded-lg p-5" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
              <h4 className="text-sm font-bold mb-4" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
                Demos by Channel
              </h4>
              {demoMix.map((b) => (
                <BarRow key={b.label} label={b.label} pct={b.pct} color={b.color} right={b.right} />
              ))}
            </div>
          )}
          {spendMix.length > 0 && (
            <div className="border rounded-lg p-5" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
              <h4 className="text-sm font-bold mb-4" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
                Spend by Channel
              </h4>
              {spendMix.map((b) => (
                <BarRow key={b.label} label={b.label} pct={b.pct} color={b.color} right={b.right} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Channel Cards by Category ───────────────────────────── */}
      {channels.length === 0 ? (
        <div className="border rounded-lg p-12 text-center" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <p className="text-sm font-medium" style={{ color: EV_MUTED }}>
            No channels loaded. Run the migration to seed channel definitions.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {CAT_ORDER.map((cat) => {
            const chs = grouped.get(cat);
            if (!chs || chs.length === 0) return null;
            const meta = CAT_META[cat];
            const CatIcon = meta?.Icon || Search;
            const catColor = meta?.color || EV_MUTED;

            return (
              <div key={cat}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-7 h-7 flex items-center justify-center rounded"
                    style={{ backgroundColor: `${catColor}18` }}
                  >
                    <CatIcon size={14} style={{ color: catColor }} />
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
                    {cat}
                  </h3>
                </div>

                {/* Channel cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {chs.map((ch) => {
                    const act = actualMap.get(ch.id);
                    const demos = act?.demos || 0;
                    const spend = act?.spend_cents || 0;

                    return (
                      <div
                        key={ch.id}
                        className="border rounded-lg p-4"
                        style={{
                          borderColor: EV_LINE,
                          backgroundColor: EV_PAPER,
                          borderLeftWidth: 3,
                          borderLeftColor: catColor,
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[13px] font-semibold" style={{ color: EV_NAVY }}>
                            {ch.label}
                          </span>
                          <BandPill band={ch.prp_band} />
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: EV_MUTED }}>
                              Demos
                            </div>
                            <Num
                              value={demos}
                              onChange={(v) => handleChange(ch.id, 'demos', v)}
                              width={70}
                            />
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: EV_MUTED }}>
                              Spend
                            </div>
                            <Num
                              value={Math.round(spend / 100)}
                              onChange={(v) => handleChange(ch.id, 'spend_cents', v * 100)}
                              prefix="$"
                              width={90}
                            />
                          </div>
                          <div className="ml-auto text-right">
                            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: EV_MUTED }}>
                              CPD
                            </div>
                            <span className="text-[13px] font-mono font-semibold" style={{ color: EV_NAVY }}>
                              {costPerDemo(spend, demos)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
