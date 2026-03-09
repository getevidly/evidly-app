/**
 * RiskLevelTooltip — CSS-only hover tooltip explaining risk level per dimension.
 * Wraps any badge/pill element. No external libraries.
 */
import { type ReactNode } from 'react';

type Dimension = 'revenue' | 'liability' | 'cost' | 'operational' | 'workforce';
type Level = 'critical' | 'high' | 'medium' | 'moderate' | 'low' | 'none';

interface Props {
  dimension: Dimension;
  level: Level | string | null | undefined;
  children: ReactNode;
}

const CONTENT: Record<Dimension, Record<string, { means: string; action?: string }>> = {
  revenue: {
    critical: {
      means: 'Immediate, direct threat to revenue \u2014 this signal, if unaddressed, can shut your doors or trigger a closure order.',
      action: 'Act today. Pull affected product, verify compliance, or contact your health department proactively. Document every action taken.',
    },
    high: {
      means: 'Material revenue impact is likely if this signal is ignored \u2014 inspector citations, stop-use orders, or customer loss.',
      action: 'Address within 48 hours. Assign a team member to own the corrective action and set a deadline.',
    },
    medium: {
      means: 'Revenue impact is possible but not immediate. This signal is a leading indicator \u2014 act now to prevent it from escalating.',
      action: 'Schedule a corrective action within 1\u20132 weeks. Add to your next compliance review agenda.',
    },
    low: {
      means: 'Minimal direct revenue impact. Awareness only \u2014 monitor for changes.',
      action: 'Log it and revisit in 30 days. No immediate action required.',
    },
    none: {
      means: 'No revenue dimension identified for this signal.',
    },
  },
  liability: {
    critical: {
      means: 'Direct legal exposure \u2014 this signal involves conditions that could result in a lawsuit, regulatory enforcement, or criminal liability.',
      action: 'Consult legal counsel or your insurance carrier immediately. Do not serve or distribute the affected product. Document everything.',
    },
    high: {
      means: 'Significant legal exposure if this signal is not addressed. The risk is real and documented \u2014 your insurer would want to know.',
      action: 'Address within 24\u201348 hours. Notify your food safety manager. Verify your general liability coverage is current.',
    },
    medium: {
      means: 'Legal exposure exists but is contingent on other failures. This signal elevates risk \u2014 it doesn\u2019t create it alone.',
      action: 'Review your current controls for this area. Close any gaps before your next inspection.',
    },
    low: {
      means: 'Minimal legal exposure. Standard compliance applies.',
      action: 'Confirm your existing controls cover this area and move on.',
    },
    none: {
      means: 'No liability dimension identified for this signal.',
    },
  },
  cost: {
    critical: {
      means: 'Significant direct financial cost \u2014 fines, disposal, equipment replacement, or remediation likely if unaddressed.',
      action: 'Quantify your exposure now. Build it into your budget. Remediation is almost always cheaper than the fine.',
    },
    high: {
      means: 'Material cost impact is likely. This is not a budgeting footnote \u2014 it\u2019s a real line item if you don\u2019t act.',
      action: 'Get a cost estimate from your vendor or supplier within 48 hours. Explore whether insurance covers any portion.',
    },
    medium: {
      means: 'Cost impact is manageable but real. Proactive action is significantly cheaper than reactive repair.',
      action: 'Plan for it in the next budget cycle. Get a quote now so you\u2019re not surprised.',
    },
    low: {
      means: 'Minor financial exposure. Routine operational cost.',
      action: 'Absorb it in normal operations. No special budget action needed.',
    },
    none: {
      means: 'No direct cost dimension identified for this signal.',
    },
  },
  operational: {
    critical: {
      means: 'This signal disrupts your ability to run your kitchen \u2014 menu changes, staffing gaps, process shutdowns, or emergency procedures required.',
      action: 'Brief your kitchen manager and front-of-house lead today. Prepare menu substitutions or operational contingencies before service.',
    },
    high: {
      means: 'Significant operational disruption likely if unaddressed. This will affect your service within days, not weeks.',
      action: 'Communicate to your team within 24 hours. Identify your backup plan and assign ownership.',
    },
    medium: {
      means: 'Operational impact is real but manageable with planning. Ignoring it increases the risk of last-minute disruption.',
      action: 'Include in your next pre-shift briefing. Build a contingency into your next week\u2019s planning.',
    },
    low: {
      means: 'Minor operational impact. Standard adjustment required.',
      action: 'Notify relevant staff at next available opportunity. No immediate operational change needed.',
    },
    none: {
      means: 'No operational dimension identified for this signal.',
    },
  },
  workforce: {
    critical: {
      means: 'A legal disqualification or certification failure \u2014 this signal means a required credential, role eligibility, or staffing requirement is not being met under California law. Operating as-is creates direct legal and liability exposure.',
      action: 'Stop the non-compliant activity immediately. Verify certification status for all affected roles. Contact your food safety manager and legal counsel. Document corrective action taken today.',
    },
    high: {
      means: 'Significant workforce compliance gap \u2014 a regulatory change or requirement is imminent that will affect who can legally hold a role or perform a function in your kitchen.',
      action: 'Audit affected staff credentials within 48 hours. Schedule required training or recertification before the effective date.',
    },
    medium: {
      means: 'A workforce-related regulation or standard is changing. Your current staff may need updated training or certification before compliance is required.',
      action: 'Review certification requirements against your current team. Build training into the next 30 days. Don\u2019t wait until the deadline.',
    },
    low: {
      means: 'Minor workforce compliance notice. Your current practices likely meet the requirement \u2014 verify and confirm.',
      action: 'Confirm with your food safety manager that certifications are current. Log it and revisit in 30 days.',
    },
    none: {
      means: 'No workforce dimension identified for this signal.',
    },
  },
};

const DIM_LABELS: Record<Dimension, string> = {
  revenue: 'Revenue Risk',
  liability: 'Liability Risk',
  cost: 'Cost Risk',
  operational: 'Operational Risk',
  workforce: 'Workforce Risk',
};

export function RiskLevelTooltip({ dimension, level, children }: Props) {
  const normalised = (level === 'moderate' ? 'medium' : level) || 'none';
  const entry = CONTENT[dimension]?.[normalised] ?? CONTENT[dimension]?.none;
  if (!entry) return <>{children}</>;

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', cursor: 'help' }}
      className="risk-tt-wrap"
    >
      {children}
      <span className="risk-tt-bubble" role="tooltip">
        <strong style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
          {DIM_LABELS[dimension]} — {normalised === 'none' ? 'None' : normalised.charAt(0).toUpperCase() + normalised.slice(1)}
        </strong>
        <span style={{ display: 'block', marginBottom: entry.action ? 6 : 0 }}>
          <strong>What this means: </strong>{entry.means}
        </span>
        {entry.action && (
          <span style={{ display: 'block' }}>
            <strong>What to do: </strong>{entry.action}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * Inject the tooltip CSS once. Call this at module level or in a top-level component.
 * Safe to call multiple times — it checks for existing style tag.
 */
let injected = false;
export function injectRiskTooltipStyles() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const style = document.createElement('style');
  style.textContent = `
.risk-tt-wrap .risk-tt-bubble {
  visibility: hidden;
  opacity: 0;
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  padding: 10px 12px;
  background: #1E2D4D;
  color: #fff;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.45;
  border-radius: 6px;
  z-index: 9999;
  pointer-events: none;
  transition: opacity 0.15s ease, visibility 0.15s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.18);
}
.risk-tt-wrap .risk-tt-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #1E2D4D;
}
.risk-tt-wrap:hover .risk-tt-bubble {
  visibility: visible;
  opacity: 1;
}
`;
  document.head.appendChild(style);
}

// Auto-inject on module load
injectRiskTooltipStyles();
