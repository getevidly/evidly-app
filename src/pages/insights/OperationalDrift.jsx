/**
 * OperationalDrift — Operational Intelligence detail page
 *
 * Predict → Reduce → Prove, applied PER PILLAR.
 * Food Safety and Fire Safety are NEVER blended — two separate tracks,
 * two separate counts, two separate sections, two separate advisors.
 * Drift = trajectory. No score language. §1731 verbs.
 */

import { useState } from 'react';
import { useOpenDrift } from '../../hooks/useOpenDrift';
import { useDashboardLocation } from '../../contexts/DashboardLocationContext';
import { getDriftLabel, getSourceTableLabel } from '../../constants/driftTypeLabels';

/* ── Constants ─────────────────────────────────────────── */

const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

const SEVERITY_CHIP = {
  critical: { label: 'Needs you', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  high:     { label: 'Needs you', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  medium:   { label: 'Drifting',  bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  low:      { label: 'Watch',     bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
};

const YARDSTICK_BADGE = {
  jurisdiction: { label: 'County',  bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  policy:       { label: 'Policy',  bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe' },
};

function getConsequenceText(requirementSource) {
  if (requirementSource === 'jurisdiction')
    return 'Under county jurisdiction, this is a citable deficiency during inspection.';
  if (requirementSource === 'policy')
    return 'Under your policy framework, this is a documented condition gap.';
  return 'This operational drift is trajectory toward a citable finding.';
}

function daysSince(dateStr) {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000));
}

function getUrgencyPhrase(item) {
  const days = daysSince(item.detected_at);
  const dayLabel = days === 1 ? '1 day' : `${days} days`;
  if (item.severity === 'critical') return `it needs immediate attention (${dayLabel} open)`;
  if (item.severity === 'high') return `it has the most urgency (${dayLabel} open)`;
  if (item.severity === 'medium') return `it's been drifting ${dayLabel}`;
  return `it's been ${dayLabel}`;
}

function prioritize(items) {
  return [...items].sort((a, b) => {
    const rankDiff = (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0);
    if (rankDiff !== 0) return rankDiff;
    return new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime();
  });
}

/* ── Sub-components ────────────────────────────────────── */

function SeverityChip({ severity }) {
  const chip = SEVERITY_CHIP[severity] || SEVERITY_CHIP.low;
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 4, background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`,
    }}>
      {chip.label}
    </span>
  );
}

function YardstickBadge({ source }) {
  const badge = YARDSTICK_BADGE[source];
  if (!badge) return null;
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 6px',
      borderRadius: 4, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
      marginLeft: 6,
    }}>
      {badge.label}
    </span>
  );
}

function AdvisorBlock({ items, pillarLabel }) {
  if (items.length === 0) return null;
  const sorted = prioritize(items);
  const top = sorted[0];
  const topLabel = getDriftLabel(top.drift_type, { form: 'noun' });

  let text;
  if (sorted.length === 1) {
    text = `Address ${topLabel} — ${getUrgencyPhrase(top)}.`;
  } else {
    const secondLabel = getDriftLabel(sorted[1].drift_type, { form: 'noun' });
    text = sorted.length === 2
      ? `Start with ${topLabel} — ${getUrgencyPhrase(top)}. ${secondLabel} can wait.`
      : `Start with ${topLabel} — ${getUrgencyPhrase(top)}. Then ${secondLabel}. The rest can follow.`;
  }

  return (
    <div style={{
      background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8,
      padding: '12px 16px', marginBottom: 16, fontSize: 14, lineHeight: 1.5,
    }}>
      <span style={{ fontWeight: 700, color: '#92400e' }}>{pillarLabel} Advisor</span>
      <span style={{ margin: '0 8px', color: '#d97706' }}>·</span>
      <span style={{ color: '#78350f' }}>{text}</span>
    </div>
  );
}

function DriftItem({ item }) {
  const [showWhy, setShowWhy] = useState(false);
  const label = getDriftLabel(item.drift_type, { form: 'noun' });
  const days = daysSince(item.detected_at);
  const dayLabel = days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;
  const sourceLabel = getSourceTableLabel(item.source_table);

  return (
    <div style={{
      border: '1px solid var(--border, #e2e8f0)', borderRadius: 8,
      padding: '16px', marginBottom: 12, background: '#fff',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ flex: '1 1 0', minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{label}</span>
            <SeverityChip severity={item.severity} />
            <YardstickBadge source={item.requirement_source} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted, #64748b)' }}>
            {item.location_name && <span>{item.location_name} · </span>}
            <span>Identified {dayLabel}</span>
            {item.dimension && <span> · {item.dimension}</span>}
          </div>
        </div>

        {/* Action button — disabled pending Commit 3 Prove mechanism */}
        <button
          disabled
          style={{
            padding: '6px 16px', fontSize: 13, fontWeight: 600,
            border: '1px solid #cbd5e1', borderRadius: 6, background: '#f8fafc',
            color: '#94a3b8', cursor: 'not-allowed', whiteSpace: 'nowrap',
          }}
        >
          Mark handled
        </button>
      </div>

      {/* Trend line */}
      {(item.expected_value || item.actual_value) && (
        <div style={{ fontSize: 13, color: '#475569', marginTop: 8 }}>
          {item.expected_value && <span>Expected: {item.expected_value}</span>}
          {item.expected_value && item.actual_value && <span> · </span>}
          {item.actual_value && <span>Actual: {item.actual_value}</span>}
        </div>
      )}

      {/* See why toggle */}
      <button
        onClick={() => setShowWhy(!showWhy)}
        style={{
          background: 'none', border: 'none', padding: '4px 0', marginTop: 8,
          fontSize: 12, color: '#2563eb', cursor: 'pointer', fontWeight: 500,
        }}
      >
        {showWhy ? 'hide' : 'see why'}
      </button>

      {showWhy && (
        <div style={{
          marginTop: 8, padding: '12px', background: '#f8fafc',
          borderRadius: 6, fontSize: 13, lineHeight: 1.6, color: '#334155',
        }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>Source:</span> {sourceLabel}
          </div>
          <div>{getConsequenceText(item.requirement_source)}</div>
        </div>
      )}
    </div>
  );
}

function PillarSection({ title, items, pillarLabel, accentColor }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: accentColor }}>{title}</h2>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted, #64748b)' }}>
          {items.length === 0 ? 'Clear' : `${items.length} open`}
        </span>
      </div>

      {items.length === 0 ? (
        <div style={{
          border: '1px solid var(--border, #e2e8f0)', borderRadius: 8,
          padding: '24px 16px', textAlign: 'center', color: 'var(--muted, #64748b)',
          fontSize: 14, background: '#fafafa',
        }}>
          No open {title.toLowerCase()} drift — this pillar is clear.
        </div>
      ) : (
        <>
          <AdvisorBlock items={items} pillarLabel={pillarLabel} />
          {prioritize(items).map(item => (
            <DriftItem key={item.id} item={item} />
          ))}
        </>
      )}
    </section>
  );
}

/* ── Main page ─────────────────────────────────────────── */

export function OperationalDrift() {
  const { selectedLocationId } = useDashboardLocation();
  const { foodItems, fireItems, loading } = useOpenDrift(selectedLocationId);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px', fontFamily: "'Montserrat', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>
        Operational Intelligence
      </h1>
      <p style={{ color: 'var(--muted, #64748b)', fontSize: 14, marginBottom: 24 }}>
        Open drift across your operations — Food Safety and Fire Safety tracked separately.
      </p>

      {loading ? (
        <p style={{ color: 'var(--muted, #64748b)' }}>Loading drift data…</p>
      ) : (
        <>
          {/* ── Pillar tallies — TWO SEPARATE counts, NEVER summed ── */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
            <div style={{
              flex: '1 1 200px', padding: '14px 20px', borderRadius: 8,
              background: foodItems.length > 0 ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${foodItems.length > 0 ? '#fecaca' : '#bbf7d0'}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>Food Safety</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: foodItems.length > 0 ? '#dc2626' : '#16a34a' }}>
                {foodItems.length === 0 ? 'Clear' : foodItems.length}
              </div>
            </div>
            <div style={{
              flex: '1 1 200px', padding: '14px 20px', borderRadius: 8,
              background: fireItems.length > 0 ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${fireItems.length > 0 ? '#fecaca' : '#bbf7d0'}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>Fire Safety</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: fireItems.length > 0 ? '#dc2626' : '#16a34a' }}>
                {fireItems.length === 0 ? 'Clear' : fireItems.length}
              </div>
            </div>
          </div>

          {/* ── Food Safety section — fully self-contained ── */}
          <PillarSection
            title="Food Safety"
            items={foodItems}
            pillarLabel="Food Safety"
            accentColor="#16a34a"
          />

          {/* ── Fire Safety section — fully self-contained ── */}
          <PillarSection
            title="Fire Safety"
            items={fireItems}
            pillarLabel="Fire Safety"
            accentColor="#dc2626"
          />
        </>
      )}
    </div>
  );
}
