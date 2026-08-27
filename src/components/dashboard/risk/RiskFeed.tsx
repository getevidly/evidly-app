/**
 * RiskFeed — one severity-ordered list of everything open.
 *
 * Band headers, then rows in the order useRiskFeed sorted them. The bands are
 * the only grouping: what raised an item matters less than how bad it is, so a
 * drift catch and an expired permit sit together under Critical.
 */

import { SEVERITY_ASC, SEVERITY_COLORS, type Severity } from '../../../lib/severityEngine';
import { RiskFeedRow } from './RiskFeedRow';
import type { RiskFeedItem } from '../../../hooks/useRiskFeed';

const NAVY = '#1E2D4D';
const MUTED = '#6B7F96';
const LINE = 'rgba(30,45,77,0.10)';
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

interface Props {
  items: RiskFeedItem[];
  loading?: boolean;
  /** Heading changes when the page is scoped to one kitchen. */
  scopeLabel?: string | null;
  onCreated?: () => void;
  /** Passed through to drift rows — the acknowledge path AlertsSection held. */
  onAcknowledge?: (id: string) => void;
  roleLabel?: string;
  /**
   * A source query failed. The feed may still hold items from the sources that
   * succeeded, so this is a caveat on the list rather than a replacement for
   * it — but it must suppress the all-clear copy, which would otherwise report
   * a failed load as a clean kitchen.
   */
  loadFailed?: boolean;
}

export function RiskFeed({ items, loading, scopeLabel, onCreated, onAcknowledge, roleLabel, loadFailed }: Props) {
  const bands = [...SEVERITY_ASC].reverse();
  const failureLine = "Some items couldn't load — refresh to retry.";

  if (loading) {
    return (
      <div>
        <p className="text-[14px] font-semibold mb-3" style={{ color: NAVY }}>What needs attention</p>
        <div className="skeleton" style={{ width: '100%', height: 72, borderRadius: 8 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[14px] font-semibold" style={{ color: NAVY }}>What needs attention</span>
        {scopeLabel && <span className="text-[11px]" style={{ color: MUTED }}>{scopeLabel}</span>}
      </div>

      {items.length === 0 ? (
        <div className="bg-white border rounded-xl p-5 text-center" style={{ borderColor: LINE }}>
          {loadFailed ? (
            <p className="text-[13px]" style={{ color: MUTED }}>{failureLine}</p>
          ) : (
            <>
              <p className="text-[13px]" style={{ color: NAVY }}>Nothing open.</p>
              <p className="text-[12px] mt-1" style={{ color: MUTED }}>
                Records current — EvidLY is watching the schedule.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {bands.map(band => {
            const inBand = items.filter(i => i.severity === band);
            if (inBand.length === 0) return null;
            return (
              <div key={band}>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: SEVERITY_COLORS[band as Severity] }}>
                  {band} · <span style={{ fontFamily: MONO }}>{inBand.length}</span>
                </p>
                <div className="space-y-2">
                  {inBand.map(item => (
                    <RiskFeedRow
                      key={`${item.kind}-${item.id}`}
                      item={item}
                      onCreated={onCreated}
                      onAcknowledge={onAcknowledge}
                      roleLabel={roleLabel}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {loadFailed && (
            <p className="text-[12px]" style={{ color: MUTED }}>{failureLine}</p>
          )}
        </div>
      )}
    </div>
  );
}
