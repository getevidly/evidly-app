/**
 * CountyReadinessCard — C13a
 *
 * Single county readiness card with status badge,
 * tier label, gap summary, and agency attribution.
 */

import type { CountyReadiness } from '../../../hooks/useCountyReadiness';

interface CountyReadinessCardProps {
  county: CountyReadiness;
}

const STATUS_LABEL: Record<string, string> = {
  ready: 'READY',
  watch: 'WATCH',
  alarm: 'ALARM',
};

function tierLabel(tier: number | null): string {
  if (tier === null || tier === undefined) return 'Tier unknown';
  return `Tier ${tier}`;
}

export function CountyReadinessCard({ county }: CountyReadinessCardProps) {
  return (
    <div className="cnty">
      <div className="cnty-head">
        <span className="cnty-name">{county.county}, {county.state}</span>
        <span className="cnty-tier">{tierLabel(county.data_source_tier)}</span>
        <span className={`cnty-status ${county.status}`}>{STATUS_LABEL[county.status]}</span>
      </div>
      <div className="cnty-stat">
        <div className="cnty-cell">
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>Last visit</span>
          <strong>TBD</strong>
        </div>
        <div className="cnty-cell">
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>Window opens</span>
          <strong>TBD</strong>
        </div>
        <div className="cnty-cell">
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>Locations</span>
          <strong>{county.location_count}</strong>
        </div>
        <div className="cnty-cell">
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>Open gaps</span>
          <strong>{county.open_gap_count}</strong>
        </div>
      </div>
      {county.gap_summary && (
        <p className="cnty-gaps">
          <i className="ti ti-alert-circle" />
          {county.gap_summary}
        </p>
      )}
      <p className="cnty-attribution">Issued by {county.agency_name}</p>
    </div>
  );
}
