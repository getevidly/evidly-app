/**
 * IntelligenceSlot — C13b
 *
 * Static reserved slot for predictive analysis.
 * No data source. Same content for all roles that receive this section.
 * Gated by 'evidly-intelligence' feature flag (default: off).
 */

import { isFeatureEnabled } from '../../../lib/featureGating';

export function IntelligenceSlot() {
  if (!isFeatureEnabled('evidly-intelligence')) return null;
  return (
    <div className="intel">
      <div className="il">
        <div className="imk">
          <i className="ti ti-sparkles" />
        </div>
        <div>
          <p className="it">EvidLY Intelligence</p>
          <p className="is">Predictive analysis returning soon under this name.</p>
        </div>
      </div>
      <span className="itg">Reserved slot</span>
    </div>
  );
}
