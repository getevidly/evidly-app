/**
 * FoodOverviewBody — Food Safety Overview body layout (Phase 4, Rev 2).
 *
 * Pure presentation component. Accepts all data as props — no Supabase
 * queries, no hooks, no side effects. Parent page is responsible for
 * data fetching and passing props.
 *
 * Mobile-first: 375x812 baseline.
 *
 * Section order (top to bottom):
 *   1. Identity Card (food pillar) — agency contact intel
 *   2. Open CAs summary strip — compact one-line aggregate
 *   3. PRP Outlook — Predict / Reduce / Prove status cards
 *   4. Needs Attention Right Now — top 5 high-priority open CAs
 *   5. Drifts EvidLY Identifies — grouped by category
 *   6. Last Inspection card — exactly as jurisdiction produces it
 *   7. Go-deeper row — Analysis + Trajectory stubs
 *
 * Excluded per C19 plan:
 *   - "Today's Activity" (lives on Dashboard)
 *   - PSE grid (Fire pillar only)
 *   - Any EvidLY-aggregate scoring
 *
 * @param {object} props
 * @param {object|null} props.jurisdiction — Jurisdiction row from Supabase.
 * @param {object|null} props.openCAsSummary — Pre-aggregated CA counts.
 *   { total: number, critical: number, high: number, medium: number,
 *     analysisUrl: string }
 *   NULL hides the section entirely.
 * @param {object|null} props.prpOutlook — { predict, reduce, prove } status objects.
 *   Each: { status: 'on_track'|'potential_gap'|'no_data', summary: string }
 * @param {Array} props.needsAttention — Pre-sorted (severity desc, due_date asc),
 *   pre-sliced top 5 high-priority open CAs.
 *   Each: { id, title, severity, due_date, action_url }
 * @param {Array} props.drifts — Array of drift objects grouped by category.
 *   Each: { id, name, category, last_seen, corrective_action_status }
 *   Parent page MUST filter to category='food_safety' before passing.
 *   Fire pillar and facility_services drifts are out of scope for Food Overview.
 * @param {object|null} props.lastInspection — Most recent inspection result.
 *   { inspection_date, raw_result, raw_result_type, inspector_name,
 *     violations_count, source_document_url }
 * @param {function} props.onNavigate — Navigation callback (path: string) => void.
 */

import React from 'react';
import { colors } from '../../lib/designSystem';
import JurisdictionIdentityCard from '../jurisdiction/JurisdictionIdentityCard';

// ── Shared styles ─────────────────────────────────────────────

const CARD_STYLE = {
  backgroundColor: colors.white,
  borderRadius: '14px',
  border: `1px solid ${colors.borderLight}`,
  overflow: 'hidden',
};

const SECTION_LABEL = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: colors.textSecondary,
};

const SEVERITY_COLORS = {
  critical: colors.danger,
  high: colors.warning,
  medium: colors.textSecondary,
};

// ── Helpers ────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function fmtRelative(iso) {
  if (!iso) return null;
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    return fmtDate(iso);
  } catch {
    return iso;
  }
}

// ── Section 2: Open CAs Strip ──────────────────────────────────

function SeverityCount({ label, count, color }) {
  if (!count) return null;
  return (
    <span style={{ fontSize: '12px', color }}>
      <span style={{ fontWeight: 600 }}>{count}</span> {label}
    </span>
  );
}

function OpenCAsStrip({ summary, onNavigate }) {
  if (!summary || !summary.total) return null;

  const parts = [
    summary.critical > 0 && { label: 'critical', count: summary.critical, color: SEVERITY_COLORS.critical },
    summary.high > 0 && { label: 'high', count: summary.high, color: SEVERITY_COLORS.high },
    summary.medium > 0 && { label: 'medium', count: summary.medium, color: SEVERITY_COLORS.medium },
  ].filter(Boolean);

  return (
    <button
      onClick={() => onNavigate?.(summary.analysisUrl || '/food-safety/analysis?status=open')}
      style={{
        ...CARD_STYLE,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        border: `1px solid ${colors.borderLight}`,
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 700, color: colors.navy }}>
        {summary.total}
      </span>
      <span style={{ fontSize: '12px', color: colors.textSecondary }}>
        open corrective actions
      </span>
      {parts.length > 0 && (
        <>
          <span style={{ fontSize: '12px', color: colors.borderLight }}>|</span>
          {parts.map((p, i) => (
            <React.Fragment key={p.label}>
              {i > 0 && <span style={{ fontSize: '12px', color: colors.borderLight }}>|</span>}
              <SeverityCount label={p.label} count={p.count} color={p.color} />
            </React.Fragment>
          ))}
        </>
      )}
      <span style={{ marginLeft: 'auto', fontSize: '14px', color: colors.textMuted, flexShrink: 0 }}>
        &#8250;
      </span>
    </button>
  );
}

// ── Section 3: PRP Outlook ─────────────────────────────────────

const PRP_CONFIG = {
  predict: { label: 'Predict', description: 'Anticipate risks before they surface' },
  reduce: { label: 'Reduce', description: 'Minimize active compliance gaps' },
  prove: { label: 'Prove', description: 'Document readiness for inspection' },
};

const STATUS_STYLES = {
  on_track: { bg: colors.successSoft, text: colors.success, label: 'On Track' },
  potential_gap: { bg: colors.warningSoft, text: colors.warning, label: 'Potential Gap' },
  no_data: { bg: '#F1F5F9', text: colors.textMuted, label: 'No Data' },
};

/**
 * Single PRP status card.
 * DATA-DRIVEN: status and summary come from the parent page.
 * PLACEHOLDER: Until all three PRP engines are wired, parent may
 * pass status='no_data' with summary='Engine not connected'.
 */
function PRPCard({ pillarKey, status }) {
  const config = PRP_CONFIG[pillarKey];
  const style = STATUS_STYLES[status?.status] || STATUS_STYLES.no_data;
  const summary = status?.summary || 'Not yet available';

  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: '100px',
        backgroundColor: colors.white,
        borderRadius: '12px',
        border: `1px solid ${colors.borderLight}`,
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ ...SECTION_LABEL, fontSize: '10px' }}>
        {config.label}
      </div>
      <span
        style={{
          display: 'inline-block',
          alignSelf: 'flex-start',
          fontSize: '10px',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '9999px',
          backgroundColor: style.bg,
          color: style.text,
        }}
      >
        {style.label}
      </span>
      <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: 1.4 }}>
        {summary}
      </div>
    </div>
  );
}

// ── Section 4: Needs Attention Right Now ────────────────────────

const MAX_NEEDS_ATTENTION = 5;

function NeedsAttentionSection({ items, onNavigate }) {
  const visible = (items || []).slice(0, MAX_NEEDS_ATTENTION);
  const hasMore = (items || []).length > MAX_NEEDS_ATTENTION;

  return (
    <div style={CARD_STYLE}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.borderLight}` }}>
        <div style={{ ...SECTION_LABEL }}>Needs Attention Right Now</div>
      </div>
      {visible.length === 0 ? (
        <div
          style={{
            padding: '24px 20px',
            textAlign: 'center',
            color: colors.textMuted,
            fontSize: '13px',
          }}
        >
          Nothing urgent right now.
        </div>
      ) : (
        <>
          {visible.map((ca, i) => {
            const sevColor = SEVERITY_COLORS[ca.severity] || colors.textMuted;
            return (
              <button
                key={ca.id}
                onClick={() => onNavigate?.(ca.action_url)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 20px',
                  width: '100%',
                  textAlign: 'left',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: i < visible.length - 1 ? `1px solid ${colors.borderLight}` : 'none',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: sevColor + '18',
                    color: sevColor,
                    flexShrink: 0,
                  }}
                >
                  {ca.severity}
                </span>
                <span style={{ flex: 1, fontSize: '13px', color: colors.navy, fontWeight: 500, minWidth: 0 }}>
                  {ca.title || 'Untitled'}
                </span>
                {ca.due_date && (
                  <span style={{ fontSize: '11px', color: colors.textMuted, flexShrink: 0 }}>
                    {fmtRelative(ca.due_date)}
                  </span>
                )}
              </button>
            );
          })}
          {hasMore && (
            <button
              onClick={() => onNavigate?.(items[items.length - 1]?.action_url || '/food-safety/analysis?status=open')}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 20px',
                fontSize: '12px',
                fontWeight: 600,
                color: colors.navy,
                backgroundColor: 'transparent',
                border: 'none',
                borderTop: `1px solid ${colors.borderLight}`,
                cursor: 'pointer',
                textAlign: 'right',
              }}
            >
              View all &#8250;
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Section 5: Drifts ──────────────────────────────────────────

// Human-readable labels for category enum values.
// Renders the mapped label; falls back to raw enum if unmapped.
const CATEGORY_LABELS = {
  food_safety: 'Food Safety',
  fire_safety: 'Fire Safety',
  facility_services: 'Facility Services',
};

const CA_STATUS_STYLES = {
  open: { color: colors.danger, label: 'Open' },
  in_progress: { color: colors.warning, label: 'In Progress' },
  resolved: { color: colors.success, label: 'Resolved' },
};

function DriftRow({ drift }) {
  const caStyle = CA_STATUS_STYLES[drift.corrective_action_status] || CA_STATUS_STYLES.open;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 20px',
        borderBottom: `1px solid ${colors.borderLight}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: colors.navy }}>
          {drift.name}
        </div>
        {drift.last_seen && (
          <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>
            Last seen {fmtRelative(drift.last_seen)}
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: '10px',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: caStyle.color + '18',
          color: caStyle.color,
          flexShrink: 0,
        }}
      >
        {caStyle.label}
      </span>
    </div>
  );
}

function DriftCategory({ category, drifts }) {
  return (
    <div>
      <div
        style={{
          padding: '8px 20px',
          backgroundColor: colors.cream,
          fontSize: '11px',
          fontWeight: 600,
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {CATEGORY_LABELS[category] || category}
      </div>
      {drifts.map((drift) => (
        <DriftRow key={drift.id} drift={drift} />
      ))}
    </div>
  );
}

// ── Section 7: Go Deeper ───────────────────────────────────────

function GoDeepLink({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: '1 1 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '12px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 600,
        color: colors.navy,
      }}
    >
      {label}
      <span style={{ fontSize: '16px', color: colors.textMuted }}>&#8250;</span>
    </button>
  );
}

// ── Main Layout ────────────────────────────────────────────────

export default function FoodOverviewBody({
  jurisdiction,
  openCAsSummary,
  prpOutlook,
  needsAttention,
  drifts,
  lastInspection,
  onNavigate,
}) {
  // Group drifts by category
  const driftsByCategory = {};
  (drifts || []).forEach((d) => {
    const cat = d.category || 'Uncategorized';
    if (!driftsByCategory[cat]) driftsByCategory[cat] = [];
    driftsByCategory[cat].push(d);
  });
  const driftCategories = Object.keys(driftsByCategory).sort();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>

      {/* ── 1. Identity Card (food pillar) ─────────────────────── */}
      <JurisdictionIdentityCard
        pillar="food"
        agencyName={jurisdiction?.agency_name}
        pocName={jurisdiction?.poc_name}
        pocTitle={jurisdiction?.poc_title}
        email={jurisdiction?.agency_email}
        phone={jurisdiction?.agency_phone}
        fax={jurisdiction?.agency_fax}
        address={jurisdiction?.agency_address}
        website={jurisdiction?.agency_website}
        dataSource={jurisdiction?.contact_data_source}
      />

      {/* ── 2. Open CAs Strip ──────────────────────────────────── */}
      {/* NULL hides entirely. Non-zero total renders clickable strip. */}
      <OpenCAsStrip summary={openCAsSummary} onNavigate={onNavigate} />

      {/* ── 3. PRP Outlook ─────────────────────────────────────── */}
      {/* DATA-DRIVEN: predict/reduce/prove status objects from parent.
          PLACEHOLDER: Until all engines wired, parent passes status='no_data'. */}
      <div>
        <div style={{ ...SECTION_LABEL, marginBottom: '10px', paddingLeft: '2px' }}>
          PRP Outlook
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <PRPCard pillarKey="predict" status={prpOutlook?.predict} />
          <PRPCard pillarKey="reduce" status={prpOutlook?.reduce} />
          <PRPCard pillarKey="prove" status={prpOutlook?.prove} />
        </div>
      </div>

      {/* ── 4. Needs Attention Right Now ────────────────────────── */}
      {/* Pre-sorted by severity desc, due_date asc. Max 5 visible. */}
      <NeedsAttentionSection items={needsAttention} onNavigate={onNavigate} />

      {/* ── 5. Drifts EvidLY Identifies ────────────────────────── */}
      {/* DATA-DRIVEN: drift list from corrective_actions / drift detection
          engine. Parent filters to category='food_safety' before passing. */}
      <div style={CARD_STYLE}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.borderLight}` }}>
          <div style={{ ...SECTION_LABEL }}>Drifts EvidLY Identifies</div>
        </div>
        {driftCategories.length === 0 ? (
          <div
            style={{
              padding: '32px 20px',
              textAlign: 'center',
              color: colors.textMuted,
              fontSize: '13px',
            }}
          >
            No drifts identified.
          </div>
        ) : (
          driftCategories.map((cat) => (
            <DriftCategory key={cat} category={cat} drifts={driftsByCategory[cat]} />
          ))
        )}
      </div>

      {/* ── 6. Last Inspection ─────────────────────────────────── */}
      {/* DATA-DRIVEN: most recent inspection_reports row for food_safety pillar.
          Displays exactly as jurisdiction produces — no EvidLY-derived score. */}
      <div style={CARD_STYLE}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.borderLight}` }}>
          <div style={{ ...SECTION_LABEL }}>Last Inspection</div>
        </div>
        {lastInspection ? (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: colors.navy }}>
                {lastInspection.raw_result}
              </span>
              {/* raw_result_type is the jurisdiction's own terminology
                  (e.g., "score", "grade", "pass/fail"). EvidLY never
                  substitutes its own label — the jurisdiction's published
                  language supersedes all EvidLY brand language. */}
              <span style={{ fontSize: '12px', color: colors.textSecondary }}>
                {lastInspection.raw_result_type}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: colors.textSecondary }}>
              {fmtDate(lastInspection.inspection_date)}
            </div>
            {lastInspection.inspector_name && (
              <div style={{ fontSize: '12px', color: colors.textMuted }}>
                Inspector: {lastInspection.inspector_name}
              </div>
            )}
            {lastInspection.violations_count != null && (
              <div style={{ fontSize: '12px', color: colors.textMuted }}>
                Violations: {lastInspection.violations_count}
              </div>
            )}
            {lastInspection.source_document_url && (
              <a
                href={lastInspection.source_document_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: colors.navy,
                  textDecoration: 'underline',
                }}
              >
                View source document
              </a>
            )}
            <div style={{ fontSize: '11px', color: colors.textMuted, fontStyle: 'italic' }}>
              Result published by jurisdiction — displayed as-is.
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '32px 20px',
              textAlign: 'center',
              color: colors.textMuted,
              fontSize: '13px',
            }}
          >
            No inspection on file.
          </div>
        )}
      </div>

      {/* ── 7. Go Deeper ───────────────────────────────────────── */}
      {/* STUBS: Analysis and Trajectory links. Wiring deferred. */}
      <div
        style={{
          ...CARD_STYLE,
          display: 'flex',
          borderColor: colors.borderLight,
          backgroundColor: '#F8F9FA',
        }}
      >
        <GoDeepLink label="Analysis" onClick={() => onNavigate?.('/food-safety/analysis')} />
        <div style={{ width: '1px', backgroundColor: colors.borderLight }} />
        <GoDeepLink label="Trajectory" onClick={() => onNavigate?.('/food-safety/trajectory')} />
      </div>
    </div>
  );
}
