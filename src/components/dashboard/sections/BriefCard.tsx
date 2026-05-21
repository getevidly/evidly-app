import { Link } from 'react-router-dom';
import type { AdvisorBriefing, OpenItem } from '../../../hooks/useAdvisorBriefings';

type AdvisorType = 'compliance_officer' | 'food_safety' | 'fire_safety';

interface BriefCardProps {
  variant: AdvisorType;
  briefing: AdvisorBriefing | null;
  timezone: string;
  showItems?: boolean;
  showConsult?: boolean;
  isStale?: boolean;
}

const CSS_CLASS: Record<AdvisorType, string> = {
  compliance_officer: 'compliance',
  food_safety: 'food',
  fire_safety: 'fire',
};

const EYEBROW: Record<AdvisorType, { icon: string; label: string; showDate: boolean }> = {
  compliance_officer: { icon: 'ti-shield-half', label: 'Compliance read', showDate: true },
  food_safety: { icon: 'ti-chef-hat', label: 'Food Safety Advisor', showDate: false },
  fire_safety: { icon: 'ti-flame', label: 'Fire Safety Advisor', showDate: false },
};

const CONSULT_LABEL: Record<AdvisorType, string> = {
  compliance_officer: 'Open compliance',
  food_safety: 'Open food safety',
  fire_safety: 'Open fire safety',
};

const CONSULT_ROUTE: Record<AdvisorType, string> = {
  compliance_officer: '/dashboard',
  food_safety: '/food-safety/overview',
  fire_safety: '/fire-safety/overview',
};

const ITEMS_LABEL: Record<AdvisorType, string> = {
  compliance_officer: 'Open in compliance',
  food_safety: 'Open in food safety',
  fire_safety: 'Open in fire safety',
};

const URGENCY_DOT: Record<string, string> = {
  urgent: 'urgent',
  pulling: 'soon',
  review: 'review',
};

/* ── Text parsing ──────────────────────────────────────────────── */

function parseBriefing(text: string): { body: string; credentials: string } {
  // Watch/alarm templates separate body and credentials with \n
  const lines = text.split('\n');
  if (lines.length >= 2) {
    const last = lines[lines.length - 1].trim();
    if (last.startsWith('Current with')) {
      return { body: lines.slice(0, -1).join('\n').trim(), credentials: last };
    }
  }
  // Solid templates embed credentials inline: "Posture: solid — Current with..."
  const idx = text.lastIndexOf('Current with');
  if (idx > 0) {
    const body = text.substring(0, idx).replace(/\s*—\s*$/, '').trim();
    const credentials = text.substring(idx).replace(/\.?\s*$/, '').trim();
    return { body, credentials };
  }
  return { body: text, credentials: '' };
}

function extractPostureLine(body: string): { postureLine: string; bodyText: string } {
  const regex = /\s*Posture:\s*\w+(?:\s*—\s*(.+?))?\.?\s*$/;
  const match = body.match(regex);
  if (match) {
    return {
      postureLine: (match[1] || '').trim().replace(/\.$/, ''),
      bodyText: body.substring(0, match.index!).trim(),
    };
  }
  return { postureLine: '', bodyText: body };
}

function defaultPostureLine(posture: string, items: OpenItem[]): string {
  if (posture === 'solid') return 'All clear.';
  const urgentN = items.filter(i => i.urgency === 'urgent').length;
  const pullingN = items.filter(i => i.urgency === 'pulling').length;
  if (urgentN > 0) return `${urgentN} urgent item${urgentN === 1 ? '' : 's'}.`;
  if (pullingN > 0) return `${pullingN} pulling item${pullingN === 1 ? '' : 's'}.`;
  return `${items.length} open item${items.length === 1 ? '' : 's'}.`;
}

/* ── Date formatting ───────────────────────────────────────────── */

function formatBriefingDate(generatedAt: string, tz: string): string {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    if (fmt.format(now) === fmt.format(new Date(generatedAt))) return 'Today';
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: 'numeric' }).format(new Date(generatedAt));
  } catch { return ''; }
}

function formatItemTag(detectedAt: string, tz: string): string {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    const todayStr = fmt.format(now);
    const itemStr = fmt.format(new Date(detectedAt));
    const todayMs = new Date(todayStr + 'T00:00:00').getTime();
    const itemMs = new Date(itemStr + 'T00:00:00').getTime();
    const diffDays = Math.round((todayMs - itemMs) / 86_400_000);
    if (diffDays === 0) return 'Today';
    if (diffDays === -1) return 'Tomorrow';
    if (diffDays > 0 && diffDays < 30) return `${diffDays}d late`;
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: 'numeric' }).format(new Date(detectedAt));
  } catch { return ''; }
}

/* ── Skeleton ──────────────────────────────────────────────────── */

function BriefCardSkeleton({ variant }: { variant: AdvisorType }) {
  return (
    <div className={`brief ${CSS_CLASS[variant]} brief-skeleton`}>
      <div className="brief-skel-bar" style={{ width: '60%', height: 10, marginBottom: 10 }} />
      <div className="brief-skel-bar" style={{ width: '40%', height: 14, marginBottom: 12 }} />
      <div className="brief-skel-bar" style={{ width: '100%', height: 10, marginBottom: 6 }} />
      <div className="brief-skel-bar" style={{ width: '85%', height: 10 }} />
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────── */

export function BriefCard({ variant, briefing, timezone, showItems = true, showConsult = false, isStale = false }: BriefCardProps) {
  if (!briefing) return <BriefCardSkeleton variant={variant} />;

  const cls = CSS_CLASS[variant];
  const eyebrow = EYEBROW[variant];
  const { body, credentials } = parseBriefing(briefing.briefing_text);
  const { postureLine, bodyText } = extractPostureLine(body);
  const summary = postureLine || defaultPostureLine(briefing.posture, briefing.open_items);
  const dateLabel = eyebrow.showDate ? ` \u00B7 ${formatBriefingDate(briefing.generated_at, timezone)}` : '';

  return (
    <div className={`brief ${cls}`}>
      <p className="brief-eyebrow">
        <i className={`ti ${eyebrow.icon}`} />
        {eyebrow.label}{dateLabel}
        {credentials && <span className="brief-credentials">{credentials}</span>}
        {isStale && <span style={{fontSize: '10px', color: 'rgba(250,247,240,0.45)', marginLeft: '8px'}}>&middot; refreshing soon</span>}
      </p>
      <p className="brief-posture">
        <span className={`badge ${briefing.posture}`}>
          {briefing.posture.charAt(0).toUpperCase() + briefing.posture.slice(1)}
        </span>
        {summary}
      </p>
      {bodyText && <p className="brief-body">{bodyText}</p>}
      {showItems && briefing.open_items.length > 0 && (
        <div className="brief-items">
          <p className="brief-items-h">{ITEMS_LABEL[variant]}</p>
          {briefing.open_items.map((item) => (
            <div className="brief-item" key={`${item.source}-${item.source_id}`}>
              <span className={`ds ${URGENCY_DOT[item.urgency] || 'review'}`} />
              <span>{item.title}</span>
              <span className="tag">{formatItemTag(item.detected_at, timezone)}</span>
            </div>
          ))}
        </div>
      )}
      {showConsult && (
        <Link to={CONSULT_ROUTE[variant]} className="brief-consult">
          <i className="ti ti-external-link" />
          {CONSULT_LABEL[variant]}
        </Link>
      )}
    </div>
  );
}
