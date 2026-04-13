/**
 * SIGNAL-RENDER-01 — Type-aware signal card renderer
 *
 * Branches rendering on signal.signal_type (via getSignalRenderType).
 * Gracefully handles missing optional fields — never crashes on null.
 */

import { Link } from 'react-router-dom';
import type { BISignal } from '../insights/business-intelligence/types';
import {
  SIGNAL_TYPES,
  SIGNAL_TYPE_LABELS,
  SIGNAL_TYPE_COLORS,
  getSignalRenderType,
} from '../../constants/signalTypes';
import { SevBadge } from '../insights/business-intelligence/SevBadge';
import { NAVY, CARD_BORDER, TEXT_TERTIARY } from '../dashboard/shared/constants';

interface SignalCardProps {
  signal: BISignal;
  /** Operator's county for "affects your location" badge */
  operatorCounty?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function TypePill({ type }: { type: string }) {
  const label = SIGNAL_TYPE_LABELS[type] || 'Intelligence';
  const color = SIGNAL_TYPE_COLORS[type] || SIGNAL_TYPE_COLORS.intelligence;
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 10,
      background: `${color}14`,
      color,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function CategoryPill({ category }: { category: string }) {
  const label = category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 10,
      background: '#F3F4F6',
      color: TEXT_TERTIARY,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ── Default / Intelligence Card ───────────────────────────────────
function IntelligenceCard({ signal }: { signal: BISignal }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <TypePill type="intelligence" />
        <CategoryPill category={signal.category} />
        <span style={{ fontSize: 11, color: TEXT_TERTIARY, marginLeft: 'auto' }}>
          {formatDate(signal.published_at)}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0B1628', marginBottom: 6 }}>
        {signal.title}
      </div>
      <div style={{ fontSize: 12, color: '#3D5068', lineHeight: 1.6, marginBottom: 8 }}>
        {signal.summary}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SevBadge level={signal.priority} />
        {signal.county && (
          <span style={{ fontSize: 11, color: TEXT_TERTIARY }}>{signal.county}</span>
        )}
      </div>
    </>
  );
}

// ── Game Plan Card ────────────────────────────────────────────────
function GamePlanCard({ signal }: { signal: BISignal }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <TypePill type="game_plan" />
        <CategoryPill category={signal.category} />
        <span style={{ fontSize: 11, color: TEXT_TERTIARY, marginLeft: 'auto' }}>
          {formatDate(signal.published_at)}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0B1628', marginBottom: 6 }}>
        {signal.title}
      </div>
      <div style={{ fontSize: 12, color: '#3D5068', lineHeight: 1.6, marginBottom: 8 }}>
        {signal.summary}
      </div>
      {signal.game_plan_steps && signal.game_plan_steps.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase',
            letterSpacing: 0.5, marginBottom: 8, paddingBottom: 4,
            borderBottom: `1px solid ${CARD_BORDER}`,
          }}>
            Recommended Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {signal.game_plan_steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: SIGNAL_TYPE_COLORS.game_plan, minWidth: 18 }}>
                  {i + 1}.
                </span>
                <span style={{ color: '#3D5068', flex: 1 }}>{step.action}</span>
                {step.owner && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                    background: '#F0FDF4', color: '#166534', whiteSpace: 'nowrap',
                  }}>
                    {step.owner}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── Outbreak Card ─────────────────────────────────────────────────
function OutbreakCard({ signal }: { signal: BISignal }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 16 }}>🚨</span>
        <TypePill type="outbreak" />
        <span style={{ fontSize: 11, color: TEXT_TERTIARY, marginLeft: 'auto' }}>
          {formatDate(signal.published_at)}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0B1628', marginBottom: 6 }}>
        {signal.title}
      </div>
      <div style={{ fontSize: 12, color: '#3D5068', lineHeight: 1.6, marginBottom: 8 }}>
        {signal.summary}
      </div>
      {(signal.affected_ingredient || signal.affected_supplier) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          {signal.affected_ingredient && (
            <span style={{ fontSize: 12, color: '#991B1B' }}>
              <strong>Affected:</strong> {signal.affected_ingredient}
            </span>
          )}
          {signal.affected_supplier && (
            <span style={{ fontSize: 12, color: '#991B1B' }}>
              <strong>Supplier:</strong> {signal.affected_supplier}
            </span>
          )}
        </div>
      )}
      {signal.outbreak_source_url && (
        <div style={{ fontSize: 12 }}>
          <strong style={{ color: '#3D5068' }}>Source: </strong>
          <a
            href={signal.outbreak_source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#991B1B', textDecoration: 'underline' }}
          >
            {signal.outbreak_source_url.replace(/^https?:\/\//, '').split('/')[0]}
          </a>
        </div>
      )}
      {signal.county && (
        <div style={{ fontSize: 11, color: TEXT_TERTIARY, marginTop: 4 }}>
          {signal.county}
        </div>
      )}
    </>
  );
}

// ── Regulatory Change Card ────────────────────────────────────────
function RegulatoryChangeCard({ signal, operatorCounty }: { signal: BISignal; operatorCounty?: string }) {
  const jurisdictions = signal.affected_jurisdictions;
  const affectsOperator = operatorCounty && jurisdictions?.some(
    j => j.toLowerCase().includes(operatorCounty.toLowerCase())
  );

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <TypePill type="regulatory_change" />
        <CategoryPill category={signal.category} />
        <span style={{ fontSize: 11, color: TEXT_TERTIARY, marginLeft: 'auto' }}>
          {formatDate(signal.published_at)}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0B1628', marginBottom: 6 }}>
        {signal.title}
      </div>
      {signal.plain_english_impact && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 4 }}>
            What this means for your kitchen:
          </div>
          <div style={{ fontSize: 12, color: '#3D5068', lineHeight: 1.6 }}>
            {signal.plain_english_impact}
          </div>
        </div>
      )}
      {!signal.plain_english_impact && (
        <div style={{ fontSize: 12, color: '#3D5068', lineHeight: 1.6, marginBottom: 8 }}>
          {signal.summary}
        </div>
      )}
      {jurisdictions && jurisdictions.length > 0 && (
        <div style={{ fontSize: 12, color: '#3D5068', marginBottom: 4 }}>
          <strong>Affected counties:</strong> {jurisdictions.join(', ')}
        </div>
      )}
      {affectsOperator && (
        <span style={{
          display: 'inline-block', fontSize: 10, fontWeight: 700,
          padding: '3px 10px', borderRadius: 10,
          background: '#FEF2F2', color: '#991B1B',
          marginTop: 4,
        }}>
          This affects your location
        </span>
      )}
    </>
  );
}

// ── Vendor Intelligence Card ──────────────────────────────────────
function VendorIntelligenceCard({ signal }: { signal: BISignal }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <TypePill type="vendor_intelligence" />
        {signal.vendor_category && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
            background: '#F5F3FF', color: '#6B21A8', whiteSpace: 'nowrap',
          }}>
            {signal.vendor_category}
          </span>
        )}
        <span style={{ fontSize: 11, color: TEXT_TERTIARY, marginLeft: 'auto' }}>
          {formatDate(signal.published_at)}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0B1628', marginBottom: 6 }}>
        {signal.title}
      </div>
      <div style={{ fontSize: 12, color: '#3D5068', lineHeight: 1.6, marginBottom: 8 }}>
        {signal.summary}
      </div>
      <Link
        to="/vendors"
        style={{
          fontSize: 12, fontWeight: 700, color: '#6B21A8',
          textDecoration: 'none',
        }}
      >
        View in Vendors →
      </Link>
    </>
  );
}

// ── Main SignalCard ───────────────────────────────────────────────
export function SignalCard({ signal, operatorCounty }: SignalCardProps) {
  const renderType = getSignalRenderType(signal.signal_type);
  const isOutbreak = renderType === SIGNAL_TYPES.OUTBREAK;

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${CARD_BORDER}`,
      borderLeft: isOutbreak ? '4px solid #991B1B' : `1px solid ${CARD_BORDER}`,
      borderRadius: 10,
      padding: '16px 20px',
    }}>
      {renderType === SIGNAL_TYPES.GAME_PLAN && <GamePlanCard signal={signal} />}
      {renderType === SIGNAL_TYPES.OUTBREAK && <OutbreakCard signal={signal} />}
      {renderType === SIGNAL_TYPES.REGULATORY_CHANGE && (
        <RegulatoryChangeCard signal={signal} operatorCounty={operatorCounty} />
      )}
      {renderType === SIGNAL_TYPES.VENDOR_INTELLIGENCE && <VendorIntelligenceCard signal={signal} />}
      {renderType === SIGNAL_TYPES.INTELLIGENCE && <IntelligenceCard signal={signal} />}
    </div>
  );
}
