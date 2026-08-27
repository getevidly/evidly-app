/**
 * severityEngine — the single severity source for EvidLY.
 *
 * Everything that needs to say how bad something is asks this module, so a
 * temperature drift, an overdue hood cleaning and an expired COI are all rated
 * on one scale instead of each surface inventing its own.
 *
 * The config tables are exported deliberately: the dashboard build extends the
 * service and document tables later, and adding a row there must not require
 * touching classify().
 *
 * Pure module — no React, no fetches, no clock reads except the injectable
 * `now`, so the same input always yields the same output.
 */

// ── Levels ─────────────────────────────────────────────────────────────

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

/** Ascending, so escalation is `SEVERITY_ASC[rank + 1]`. */
export const SEVERITY_ASC: readonly Severity[] = ['Low', 'Medium', 'High', 'Critical'] as const;

/** Rank of each level. Higher is worse. */
export const SEVERITY_RANK: Record<Severity, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
  Critical: 3,
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  Critical: '#B3261E',
  High: '#B98A2E',
  Medium: '#3E6B8A',
  Low: '#6B7F96',
};

/** Days added to today when a severity suggests a due date. */
export const DUE_DAYS_BY_SEVERITY: Record<Severity, number> = {
  Critical: 1,
  High: 3,
  Medium: 7,
  Low: 14,
};

/** The lowercase form the corrective_actions.severity CHECK accepts. */
export function toStoredSeverity(severity: Severity): 'critical' | 'high' | 'medium' | 'low' {
  return severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
}

/** Parse a stored lowercase severity back to a level. Unknown values read Medium. */
export function fromStoredSeverity(stored: string | null | undefined): Severity {
  switch ((stored || '').toLowerCase()) {
    case 'critical': return 'Critical';
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return 'Medium';
  }
}

function escalate(base: Severity, steps: number): Severity {
  const rank = Math.min(SEVERITY_RANK.Critical, SEVERITY_RANK[base] + Math.max(0, steps));
  return SEVERITY_ASC[rank];
}

// ── Config tables (extended by the dashboard build) ────────────────────

/**
 * drift_catches.severity is low|medium|high|critical. The mock also names
 * `urgent`, so both spellings of the top level map to Critical.
 */
export const DRIFT_PRIORITY_MAP: Record<string, Severity> = {
  urgent: 'Critical',
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Hood / exhaust cleaning: the base level is set by how often it is required. */
export const HOOD_INTERVAL_BANDS: readonly { maxDays: number; base: Severity; solidFuelBase?: Severity }[] = [
  { maxDays: 30, base: 'High', solidFuelBase: 'Critical' },
  { maxDays: 60, base: 'High' },
  { maxDays: 90, base: 'Medium' },
] as const;

/** Base level for non-hood services, matched against the service label. */
export const SERVICE_BASE_BY_LABEL: readonly { match: RegExp; base: Severity }[] = [
  { match: /suppression|sprinkler|alarm/i, base: 'High' },
  { match: /extinguisher/i, base: 'High' },
] as const;

/** Documents whose lapse is citable on sight start a level higher. */
export const DOCUMENT_HIGH_BASE = /\bcoi\b|insurance|licen[cs]e|permit/i;

/**
 * Keyword -> pillar, for sources that carry no pillar column of their own:
 * overdue task_instances and expiring documents. Neither table stores a
 * pillar, and their own taxonomies (task_type, documents.category) classify a
 * different axis, so the label is the only signal available.
 *
 * Food entries are scanned before fire; the first term found wins.
 */
export const PILLAR_BY_LABEL: readonly { pillar: 'food_safety' | 'fire_safety'; terms: readonly string[] }[] = [
  {
    pillar: 'food_safety',
    terms: [
      'temperature', 'temp', 'hot well', 'cold hold', 'cooler', 'freezer',
      'warewash', 'sanitizer', 'handler', 'cfpm', 'food manager', 'haccp',
      'tphc', 'allergen', 'consumer advisory', 'pest', 'grease trap',
      'interceptor', 'backflow', 'health permit',
    ],
  },
  {
    pillar: 'fire_safety',
    terms: [
      'hood', 'exhaust', 'suppression', 'extinguisher', 'sprinkler', 'alarm',
      'fire door', 'class k', 'emergency light',
    ],
  },
] as const;

/**
 * Best-effort pillar for a free-text label. Case-insensitive substring match.
 * Null when nothing matches — the caller owns the fallback, so this never
 * guesses facility_services on the engine's behalf.
 */
export function inferPillar(label: string | null | undefined): 'food_safety' | 'fire_safety' | null {
  if (!label) return null;
  const haystack = label.toLowerCase();
  for (const row of PILLAR_BY_LABEL) {
    for (const term of row.terms) {
      if (haystack.includes(term)) return row.pillar;
    }
  }
  return null;
}

const HOOD_LABEL = /hood|exhaust/i;
const SOLID_FUEL = /solid[\s-]?fuel/i;

// ── Input / output ─────────────────────────────────────────────────────

export type SeverityInput =
  | { kind: 'drift'; priority: string | null | undefined; title?: string }
  | {
      kind: 'service';
      intervalDays: number;
      daysOverdue: number;
      label: string;
      isCodeRequired?: boolean;
    }
  | { kind: 'document'; docLabel: string; daysOverdue: number; intervalDays?: number }
  | { kind: 'task'; daysOverdue: number; label?: string }
  | { kind: 'corrective_action'; storedSeverity: string | null | undefined; label?: string };

export interface SeverityResult {
  severity: Severity;
  reason: string;
  /** ISO date, "YYYY-MM-DD". */
  dueSuggestion: string;
}

// ── Reason lines ───────────────────────────────────────────────────────

function plural(n: number): string {
  return n === 1 ? 'day' : 'days';
}

/**
 * Code-required lapses are described against the requirement; preference items
 * against the operator's own schedule. Saying "required" for something no code
 * requires would misrepresent the obligation, which is why the two differ.
 */
function lapseReason(label: string, daysOverdue: number, isCodeRequired: boolean): string {
  if (daysOverdue < 0) {
    const inDays = Math.abs(daysOverdue);
    return `${label} — due in ${inDays} ${plural(inDays)}`;
  }
  if (daysOverdue === 0) {
    return `${label} — due today`;
  }
  return isCodeRequired
    ? `${label} — ${daysOverdue} ${plural(daysOverdue)} past required frequency`
    : `${label} — ${daysOverdue} ${plural(daysOverdue)} past your schedule`;
}

/** Overdue beyond this many days escalates two levels instead of one. */
function lateThreshold(intervalDays: number | undefined, fallback: number): number {
  if (!intervalDays || intervalDays <= 0) return fallback;
  return Math.max(7, Math.round(intervalDays / 4));
}

function latenessSteps(daysOverdue: number, threshold: number): number {
  if (daysOverdue <= 0) return 0;
  return daysOverdue >= threshold ? 2 : 1;
}

// ── Due date ───────────────────────────────────────────────────────────

export function suggestDueDate(severity: Severity, now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + DUE_DAYS_BY_SEVERITY[severity]);
  return d.toISOString().slice(0, 10);
}

// ── classify ───────────────────────────────────────────────────────────

export function classify(input: SeverityInput, now: Date = new Date()): SeverityResult {
  let severity: Severity;
  let reason: string;

  switch (input.kind) {
    case 'drift': {
      severity = DRIFT_PRIORITY_MAP[(input.priority || '').toLowerCase()] ?? 'Medium';
      reason = input.title || 'Drift caught';
      break;
    }

    case 'service': {
      const codeRequired = input.isCodeRequired !== false;
      let base: Severity;

      if (HOOD_LABEL.test(input.label)) {
        const band = HOOD_INTERVAL_BANDS.find(b => input.intervalDays <= b.maxDays);
        if (!band) {
          base = 'Medium'; // beyond 90 days
        } else if (band.solidFuelBase && SOLID_FUEL.test(input.label)) {
          base = band.solidFuelBase;
        } else {
          base = band.base;
        }
      } else {
        base = SERVICE_BASE_BY_LABEL.find(r => r.match.test(input.label))?.base ?? 'Medium';
      }

      severity = escalate(base, latenessSteps(input.daysOverdue, lateThreshold(input.intervalDays, 7)));
      reason = lapseReason(input.label, input.daysOverdue, codeRequired);
      break;
    }

    case 'document': {
      const base: Severity = DOCUMENT_HIGH_BASE.test(input.docLabel) ? 'High' : 'Medium';
      // An expiry cadence gives a real threshold; without one, 30 days stands in.
      severity = escalate(base, latenessSteps(input.daysOverdue, lateThreshold(input.intervalDays, 30)));
      reason = lapseReason(input.docLabel, input.daysOverdue, true);
      break;
    }

    case 'task': {
      severity = escalate('Medium', input.daysOverdue > 7 ? 1 : 0);
      reason = lapseReason(input.label || 'Task', input.daysOverdue, false);
      break;
    }

    case 'corrective_action': {
      severity = fromStoredSeverity(input.storedSeverity);
      reason = input.label || 'Corrective action';
      break;
    }
  }

  return { severity, reason, dueSuggestion: suggestDueDate(severity, now) };
}
