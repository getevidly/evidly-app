/**
 * Portfolio — Multi-location portfolio view
 *
 * Accessible at /portfolio for owner_operator, executive, compliance_manager.
 * Single-location orgs redirect to /dashboard.
 * All data from usePortfolioData (real org-scoped queries, no fabricated data).
 */

import { useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePortfolioData } from '../hooks/usePortfolioData';
import { getDriftLabel } from '../constants/driftTypeLabels';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Shield,
  TrendingUp,
  FileText,
  ExternalLink,
} from 'lucide-react';

const NAVY = '#1E2D4D';
const CREAM = '#F7F4ED';
const TEAL = '#0F766E';
const CORAL = '#C2553A';
const WARN = '#B7791F';
const GOLD = '#A08C5A';
const MUTED = '#6B7280';

const STATUS_CONFIG = {
  alarm: { label: 'Needs action', color: CORAL, bg: '#FEF2F2' },
  watch: { label: 'At risk', color: WARN, bg: '#FFFBEB' },
  solid: { label: 'Clear', color: TEAL, bg: '#F0FDF4' },
};

const PILLAR_LABELS = {
  food_safety: 'Food Safety',
  fire_safety: 'Fire Safety',
};

function StatusChip({ status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        color: cfg.color,
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.color}20`,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function ExpandRow({ label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          fontSize: 13,
          fontWeight: 600,
          color: NAVY,
        }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {label}
      </button>
      {open && <div style={{ paddingLeft: 20, paddingTop: 4 }}>{children}</div>}
    </div>
  );
}

function PillarTriageRow({ pillar, alarmCount, watchCount, solidCount, alarmLocs, watchLocs, solidLocs }) {
  const total = alarmCount + watchCount + solidCount;
  if (total === 0) return null;
  const label = PILLAR_LABELS[pillar] || pillar;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>{label}</span>
        <span style={{ fontSize: 11, color: MUTED }}>{total} kitchen{total !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {alarmCount > 0 && (
          <ExpandRow label={<><span style={{ color: CORAL }}>{alarmCount}</span> needs action</>}>
            {alarmLocs.map(l => (
              <div key={l.id} style={{ fontSize: 12, color: NAVY, padding: '2px 0' }}>{l.name}</div>
            ))}
          </ExpandRow>
        )}
        {watchCount > 0 && (
          <ExpandRow label={<><span style={{ color: WARN }}>{watchCount}</span> at risk</>}>
            {watchLocs.map(l => (
              <div key={l.id} style={{ fontSize: 12, color: NAVY, padding: '2px 0' }}>{l.name}</div>
            ))}
          </ExpandRow>
        )}
        {solidCount > 0 && (
          <ExpandRow label={<><span style={{ color: TEAL }}>{solidCount}</span> clear</>}>
            {solidLocs.map(l => (
              <div key={l.id} style={{ fontSize: 12, color: NAVY, padding: '2px 0' }}>{l.name}</div>
            ))}
          </ExpandRow>
        )}
      </div>
    </div>
  );
}

const rMoney = (n) => {
  const v = Math.round(n);
  if (v >= 1000000) return '$' + (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return '$' + v.toLocaleString();
};
const rRange = (lo, hi) => (hi <= 0 ? 'Clear' : rMoney(lo) + '–' + rMoney(hi));

function KpiTile({ icon, title, value, subtitle }) {
  return (
    <div
      style={{
        flex: '1 1 200px',
        background: '#fff',
        borderRadius: 10,
        padding: '16px 18px',
        border: '1px solid #E5E7EB',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: NAVY, lineHeight: 1.1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

function KitchenRow({ location, onNavigate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        onClick={() => setExpanded(v => !v)}
        style={{ cursor: 'pointer', borderBottom: '1px solid #F3F4F6' }}
      >
        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: NAVY }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {location.name}
          </div>
        </td>
        <td style={{ padding: '10px 12px' }}><StatusChip status={location.foodStatus} /></td>
        <td style={{ padding: '10px 12px' }}><StatusChip status={location.fireStatus} /></td>
        <td style={{ padding: '10px 12px', fontSize: 13, color: NAVY, textAlign: 'center' }}>
          {location.openCount}
        </td>
        <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', color: (location.openCount > 0 ? '#B4472E' : '#3E9E7A'), fontWeight: 600 }}>
          {location.benchmarkPlaceholder
            ? (location.openCount > 0 ? `${location.openCount} open` : 'Clear')
            : rRange(location.atRiskLow || 0, location.atRiskHigh || 0)}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} style={{ padding: '8px 12px 16px 32px', background: '#FAFAF8' }}>
            {location.openItems.length === 0 ? (
              <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>No open items at this location.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {location.openItems.map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      color: NAVY,
                    }}
                  >
                    <StatusChip status={item.days_open > 14 ? 'alarm' : 'watch'} />
                    <span>{getDriftLabel(item.drift_type, { form: 'noun' })}</span>
                    <span style={{ color: MUTED }}>{item.days_open}d</span>
                    <span style={{ color: MUTED }}>{PILLAR_LABELS[item.pillar]}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onNavigate(location.id); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 10,
                padding: '5px 12px',
                fontSize: 11,
                fontWeight: 600,
                color: NAVY,
                background: '#fff',
                border: `1px solid ${GOLD}`,
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Open this kitchen <ExternalLink size={11} />
            </button>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Portfolio() {
  const { profile } = useAuth();
  const { locations, summary, loading, error } = usePortfolioData();
  const navigate = useNavigate();

  const [sortKey, setSortKey] = useState('priority');
  const [sortDir, setSortDir] = useState('asc');
  const [filter, setFilter] = useState('all');

  // Single-location orgs: redirect to dashboard
  if (!loading && summary.totalLocations <= 1) {
    return <Navigate to="/dashboard" replace />;
  }

  const filtered = useMemo(() => {
    let locs = [...locations];

    if (filter === 'alarm') locs = locs.filter(l => l.foodStatus === 'alarm' || l.fireStatus === 'alarm');
    else if (filter === 'watch') locs = locs.filter(l => (l.foodStatus === 'watch' || l.fireStatus === 'watch') && l.foodStatus !== 'alarm' && l.fireStatus !== 'alarm');
    else if (filter === 'solid') locs = locs.filter(l => l.foodStatus === 'solid' && l.fireStatus === 'solid');

    const dir = sortDir === 'asc' ? 1 : -1;
    locs.sort((a, b) => {
      const _sev = { alarm: 3, watch: 2, solid: 1 };
      const _worst = (l) => Math.max(_sev[l.foodStatus] || 0, _sev[l.fireStatus] || 0);
      if (sortKey === 'priority') {
        const w = _worst(b) - _worst(a);
        if (w !== 0) return w;
        const o = b.openCount - a.openCount;
        if (o !== 0) return o;
        return a.name.localeCompare(b.name);
      }
      if (sortKey === 'name') return dir * a.name.localeCompare(b.name);
      if (sortKey === 'food') return dir * (statusOrd(a.foodStatus) - statusOrd(b.foodStatus));
      if (sortKey === 'fire') return dir * (statusOrd(a.fireStatus) - statusOrd(b.fireStatus));
      if (sortKey === 'open') return dir * (a.openCount - b.openCount);
      if (sortKey === 'atrisk') return dir * ((a.atRiskHigh || 0) - (b.atRiskHigh || 0));
      return 0;
    });

    return locs;
  }, [locations, filter, sortKey, sortDir]);

  const foodAlarmLocs = locations.filter(l => l.foodStatus === 'alarm');
  const _sevNA = { alarm: 3, watch: 2, solid: 1 };
  const _worstNA = (l) => Math.max(_sevNA[l.foodStatus] || 0, _sevNA[l.fireStatus] || 0);
  const needsActionLocs = locations
    .filter(l => l.foodStatus === 'alarm' || l.fireStatus === 'alarm' || l.foodStatus === 'watch' || l.fireStatus === 'watch')
    .sort((a, b) => {
      const w = _worstNA(b) - _worstNA(a);
      if (w !== 0) return w;
      const o = b.openCount - a.openCount;
      if (o !== 0) return o;
      return a.name.localeCompare(b.name);
    });
  const naReason = (l) => {
    const parts = [];
    if (l.foodStatus === 'alarm') parts.push('Food: alarm · ' + l.foodOpenCount + ' open');
    else if (l.foodStatus === 'watch') parts.push('Food: watch · ' + l.foodOpenCount + ' open');
    if (l.fireStatus === 'alarm') parts.push('Fire: alarm · ' + l.fireOpenCount + ' open');
    else if (l.fireStatus === 'watch') parts.push('Fire: watch · ' + l.fireOpenCount + ' open');
    return parts.join(' · ');
  };
  const foodWatchLocs = locations.filter(l => l.foodStatus === 'watch');
  const foodSolidLocs = locations.filter(l => l.foodStatus === 'solid');
  const fireAlarmLocs = locations.filter(l => l.fireStatus === 'alarm');
  const fireWatchLocs = locations.filter(l => l.fireStatus === 'watch');
  const fireSolidLocs = locations.filter(l => l.fireStatus === 'solid');

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleNavigateToKitchen = (locationId) => {
    try { sessionStorage.setItem('evidly_dashboard_location', locationId); } catch {}
    navigate('/dashboard');
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const greeting = getGreeting();
  const firstName = profile?.full_name?.split(' ')[0] || '';

  if (loading) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
        <div className="skeleton" style={{ width: 300, height: 28, borderRadius: 8, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: '100%', height: 120, borderRadius: 10, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 10 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
        <p style={{ color: CORAL, fontSize: 14 }}>Unable to load portfolio data. Try refreshing.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>
          {greeting}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p style={{ fontSize: 13, color: MUTED, margin: '4px 0 0' }}>{today}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEAL, fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: TEAL, animation: 'pulse 2s infinite' }} />
            Across {summary.totalLocations} kitchen{summary.totalLocations !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            disabled
            style={{
              padding: '5px 14px',
              fontSize: 11,
              fontWeight: 600,
              color: MUTED,
              background: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: 6,
              cursor: 'not-allowed',
              opacity: 0.6,
            }}
          >
            Export portfolio report
          </button>
        </div>
      </div>

      {/* Scope pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <span
          style={{
            padding: '5px 14px',
            fontSize: 12,
            fontWeight: 600,
            color: NAVY,
            background: `${GOLD}18`,
            border: `1px solid ${GOLD}40`,
            borderRadius: 999,
          }}
        >
          All kitchens
        </span>
      </div>

      {needsActionLocs.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #F0D9D2', borderRadius: 12, padding: 18, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#B4472E' }}>Needs action first</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{needsActionLocs.length} of {locations.length} kitchens</span>
            </div>
            {needsActionLocs.map((l, i) => (
              <div key={l.id} onClick={() => handleNavigateToKitchen(l.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid #F1EEE7' : 'none', cursor: 'pointer' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#1E2D4D', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1E2D4D' }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: '#8A6A5C', marginTop: 1 }}>{naReason(l)}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', padding: '2px 8px', borderRadius: 10, background: (_worstNA(l) === 3 ? '#FCF0EC' : '#FBF3E3'), color: (_worstNA(l) === 3 ? '#B4472E' : '#8A5A0B') }}>{_worstNA(l) === 3 ? 'Needs action' : 'At risk'}</span>
              </div>
            ))}
          </div>
        )}
        {/* Triage card */}
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          border: '1px solid #E5E7EB',
          padding: '18px 20px',
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: '0 0 14px' }}>Triage</h2>
        <PillarTriageRow
          pillar="food_safety"
          alarmCount={summary.foodAlarm}
          watchCount={summary.foodWatch}
          solidCount={summary.foodSolid}
          alarmLocs={foodAlarmLocs}
          watchLocs={foodWatchLocs}
          solidLocs={foodSolidLocs}
        />
        <PillarTriageRow
          pillar="fire_safety"
          alarmCount={summary.fireAlarm}
          watchCount={summary.fireWatch}
          solidCount={summary.fireSolid}
          alarmLocs={fireAlarmLocs}
          watchLocs={fireWatchLocs}
          solidLocs={fireSolidLocs}
        />
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiTile
          icon={<Shield size={16} color={TEAL} />}
          title="What's handled"
          value={summary.totalHandled}
          subtitle="Resolved in the last 90 days"
        />
        <KpiTile
          icon={<AlertTriangle size={16} color={CORAL} />}
          title="What's coming"
          value={summary.totalOpenItems}
          subtitle={summary.totalAtRiskCents > 0 ? `$${(summary.totalAtRiskCents / 100).toLocaleString()} at risk` : 'Open across all kitchens'}
        />
        <KpiTile
          icon={<FileText size={16} color={NAVY} />}
          title="What you can prove"
          value={summary.totalHandled + summary.totalOpenItems}
          subtitle="Total items documented (90 days)"
        />
        <KpiTile
          icon={<AlertTriangle size={16} color={CORAL} />}
          title="At risk"
          value={summary.benchmarkPlaceholder ? `${summary.totalOpenItems} open` : rRange(summary.atRiskLow || 0, summary.atRiskHigh || 0)}
          subtitle={summary.benchmarkPlaceholder ? 'Dollar exposure — coming' : 'Across all kitchens'}
        />
      </div>

      {/* Kitchens table */}
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: 0 }}>Kitchens</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'alarm', 'watch', 'solid'].map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                style={{
                  padding: '3px 10px',
                  fontSize: 11,
                  fontWeight: filter === f ? 700 : 500,
                  color: filter === f ? NAVY : MUTED,
                  background: filter === f ? `${GOLD}18` : 'transparent',
                  border: filter === f ? `1px solid ${GOLD}40` : '1px solid transparent',
                  borderRadius: 999,
                  cursor: 'pointer',
                }}
              >
                {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label || f}
              </button>
            ))}
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
              {[
                { key: 'name', label: 'Kitchen' },
                { key: 'food', label: 'Food Safety' },
                { key: 'fire', label: 'Fire Safety' },
                { key: 'open', label: 'Open' },
                { key: 'atrisk', label: 'At Risk' },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: MUTED,
                    textAlign: (col.key === 'open') ? 'center' : (col.key === 'atrisk') ? 'right' : 'left',
                    cursor: 'pointer',
                    userSelect: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '20px 12px', fontSize: 13, color: MUTED, textAlign: 'center' }}>
                  No kitchens match this filter.
                </td>
              </tr>
            ) : (
              filtered.map(loc => (
                <KitchenRow key={loc.id} location={loc} onNavigate={handleNavigateToKitchen} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function statusOrd(s) {
  if (s === 'alarm') return 0;
  if (s === 'watch') return 1;
  return 2;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
