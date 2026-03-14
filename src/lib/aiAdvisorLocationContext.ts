// ══════════════════════════════════════════════════════════════
// AI Advisor — Location Context Payload Builder
// Builds structured data context from demo data for each location.
// Used by aiAdvisor.ts to inject real data into AI system prompts.
// ══════════════════════════════════════════════════════════════

import {
  locations,
  locationScores,
  locationScoresThirtyDaysAgo,
  LOCATION_JURISDICTION_STATUS,
} from '../data/demoData';

import { generateTempDemoHistory } from '../data/tempDemoHistory';
import { DEMO_SCENARIOS } from '../data/inspectorViewDemoData';
import { SCORE_TRENDS, CHECKLIST_COMPLETION, TEMP_COMPLIANCE } from '../data/reportsDemoData';
import { getJurisdictionForLocation } from '../data/jurisdictionChecklistData';

// ── Interfaces ───────────────────────────────────────────────

export interface LocationContextPayload {
  locationId: string;
  locationName: string;
  county: string;
  currentScores: { foodSafety: number; facilitySafety: number };
  priorScores: { foodSafety: number; facilitySafety: number };
  scoreDelta: { foodSafety: number; facilitySafety: number };
  jurisdictionStatus: {
    foodSafety: { status: string; gradeDisplay: string; authority: string; scoring_type: string };
    facilitySafety: { status: string; gradeDisplay: string; authority: string };
  };
  lastInspection: {
    date: string;
    score: number;
    inspector: string;
    agency: string;
    topViolations: string[];
  } | null;
  openCorrectiveActions: {
    count: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    items: { title: string; severity: string; status: string; category: string }[];
  };
  temperatureCompliance: {
    currentWeekRate: number;
    trendDirection: 'improving' | 'declining' | 'stable';
    weeklyRates: { week: string; compliance: number }[];
  };
  checklistCompletion: {
    averageRate: number;
    templates: { template: string; rate: number; completed: number; missed: number }[];
  };
  scoreTrend: {
    direction: 'improving' | 'declining' | 'stable';
    recentWeeks: { week: string; foodSafety: number; facilitySafety: number }[];
  };
  jurisdictionEnforcement: {
    ehdName: string;
    ahjName: string;
    foodCodeVersion: string;
    enforcementFocus: { codeSection: string; description: string; priority: string }[];
    aiContextNote: string;
  } | null;
  dataDateRange: { from: string; to: string };
}

// ── Scenario map: locationId → inspector scenario key ────────

const LOCATION_SCENARIO_MAP: Record<string, string> = {
  downtown: 'A',
  airport: 'B',
  university: 'C',
};

// ── County map ───────────────────────────────────────────────

const LOCATION_COUNTY_MAP: Record<string, string> = {
  downtown: 'Fresno County',
  airport: 'Merced County',
  university: 'Stanislaus County',
};

// ── Date helpers ─────────────────────────────────────────────

export function getDataDateRange(): { from: string; to: string } {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return { from: fmt(thirtyDaysAgo), to: fmt(now) };
}

// ── Build payload for a single location ──────────────────────

export function buildLocationContextPayload(locationId: string): LocationContextPayload | null {
  const loc = locations.find(l => l.urlId === locationId);
  if (!loc) return null;

  const current = locationScores[locationId];
  const prior = locationScoresThirtyDaysAgo[locationId];
  const jStatus = LOCATION_JURISDICTION_STATUS[locationId];

  if (!current || !prior || !jStatus) return null;

  // Score delta
  const scoreDelta = {
    foodSafety: current.foodSafety - prior.foodSafety,
    facilitySafety: current.facilitySafety - prior.facilitySafety,
  };

  // Inspector scenario data
  const scenarioKey = LOCATION_SCENARIO_MAP[locationId];
  const scenario = scenarioKey ? DEMO_SCENARIOS[scenarioKey] : null;

  const lastInspection = scenario?.lastInspection
    ? {
        date: scenario.lastInspection.date,
        score: scenario.lastInspection.score,
        inspector: scenario.lastInspection.inspectorName,
        agency: scenario.lastInspection.agency,
        topViolations: scenario.lastInspection.topViolations,
      }
    : null;

  // Corrective actions — no seeded data, empty in demo mode
  const openCorrectiveActions = {
    count: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    items: [] as { title: string; severity: string; status: string; category: string }[],
  };

  // Temperature compliance from reportsDemoData
  const tempData = TEMP_COMPLIANCE[locationId] || [];
  const lastWeekTemp = tempData.length > 0 ? tempData[tempData.length - 1].compliance : 0;
  const prevWeekTemp = tempData.length > 1 ? tempData[tempData.length - 2].compliance : lastWeekTemp;
  const tempTrend: 'improving' | 'declining' | 'stable' =
    lastWeekTemp > prevWeekTemp ? 'improving' : lastWeekTemp < prevWeekTemp ? 'declining' : 'stable';

  const temperatureCompliance = {
    currentWeekRate: lastWeekTemp,
    trendDirection: tempTrend,
    weeklyRates: tempData,
  };

  // Checklist completion
  const checklists = CHECKLIST_COMPLETION[locationId] || [];
  const avgRate = checklists.length > 0
    ? Math.round(checklists.reduce((sum, c) => sum + c.rate, 0) / checklists.length)
    : 0;

  const checklistCompletion = {
    averageRate: avgRate,
    templates: checklists,
  };

  // Score trend from reportsDemoData
  const trends = SCORE_TRENDS[locationId] || [];
  const last4 = trends.slice(-4);
  const firstFood = last4.length > 0 ? last4[0].foodSafety : 0;
  const lastFood = last4.length > 0 ? last4[last4.length - 1].foodSafety : 0;
  const trendDir: 'improving' | 'declining' | 'stable' =
    lastFood > firstFood ? 'improving' : lastFood < firstFood ? 'declining' : 'stable';

  // Jurisdiction enforcement emphasis (demo-only — this module only processes demo location IDs)
  const jEnf = getJurisdictionForLocation(locationId);
  const jurisdictionEnforcement = jEnf
    ? {
        ehdName: jEnf.ehdName,
        ahjName: jEnf.ahjName,
        foodCodeVersion: jEnf.foodCodeVersion,
        enforcementFocus: jEnf.enforcementFocus,
        aiContextNote: jEnf.aiContextNote,
      }
    : null;

  return {
    locationId,
    locationName: loc.name,
    county: LOCATION_COUNTY_MAP[locationId] || '',
    currentScores: { foodSafety: current.foodSafety, facilitySafety: current.facilitySafety },
    priorScores: { foodSafety: prior.foodSafety, facilitySafety: prior.facilitySafety },
    scoreDelta,
    jurisdictionStatus: {
      foodSafety: {
        status: jStatus.foodSafety.status,
        gradeDisplay: jStatus.foodSafety.gradeDisplay,
        authority: jStatus.foodSafety.authority,
        scoring_type: jStatus.foodSafety.scoring_type,
      },
      facilitySafety: {
        status: jStatus.facilitySafety.status,
        gradeDisplay: jStatus.facilitySafety.gradeDisplay,
        authority: jStatus.facilitySafety.authority,
      },
    },
    lastInspection,
    openCorrectiveActions,
    temperatureCompliance,
    checklistCompletion,
    scoreTrend: {
      direction: trendDir,
      recentWeeks: last4,
    },
    jurisdictionEnforcement,
    dataDateRange: getDataDateRange(),
  };
}

// ── Build payloads for all locations ─────────────────────────

export function buildAllLocationPayloads(): LocationContextPayload[] {
  return locations
    .map(loc => buildLocationContextPayload(loc.urlId))
    .filter((p): p is LocationContextPayload => p !== null);
}

// ── Detect location from user question ───────────────────────

export function detectLocationFromQuestion(question: string): string | null {
  const q = question.toLowerCase();

  // Exact location references
  if (/\blocation\s*1\b/.test(q) || /\bdowntown\b/.test(q) || /\bloc\s*1\b/.test(q)) return 'downtown';
  if (/\blocation\s*2\b/.test(q) || /\bairport\b/.test(q) || /\bloc\s*2\b/.test(q)) return 'airport';
  if (/\blocation\s*3\b/.test(q) || /\buniversity\b/.test(q) || /\bloc\s*3\b/.test(q)) return 'university';

  // County references
  if (/\bfresno\b/.test(q)) return 'downtown';
  if (/\bmerced\b/.test(q)) return 'airport';
  if (/\bstanislaus\b/.test(q)) return 'university';

  // Address fragments
  if (/\bmain\s*st\b/.test(q)) return 'downtown';
  if (/\bclinton\b/.test(q)) return 'airport';
  if (/\bmaple\b/.test(q)) return 'university';

  return null;
}

// ── Format payload as plain text for system prompt injection ─

export function formatPayloadForPrompt(payload: LocationContextPayload): string {
  const lines: string[] = [];

  lines.push(`── ${payload.locationName} (${payload.county}) ──`);
  lines.push('');

  // Scores
  lines.push('CURRENT SCORES:');
  lines.push(`  Food Safety: ${payload.currentScores.foodSafety} (30d ago: ${payload.priorScores.foodSafety}, delta: ${payload.scoreDelta.foodSafety >= 0 ? '+' : ''}${payload.scoreDelta.foodSafety})`);
  lines.push(`  Facility Safety: ${payload.currentScores.facilitySafety} (30d ago: ${payload.priorScores.facilitySafety}, delta: ${payload.scoreDelta.facilitySafety >= 0 ? '+' : ''}${payload.scoreDelta.facilitySafety})`);
  lines.push(`  Score trend: ${payload.scoreTrend.direction}`);
  lines.push('');

  // Jurisdiction
  lines.push('JURISDICTION STATUS:');
  lines.push(`  Food Safety: ${payload.jurisdictionStatus.foodSafety.gradeDisplay} (${payload.jurisdictionStatus.foodSafety.status}) — ${payload.jurisdictionStatus.foodSafety.authority}, ${payload.jurisdictionStatus.foodSafety.scoring_type}`);
  lines.push(`  Facility Safety: ${payload.jurisdictionStatus.facilitySafety.gradeDisplay} (${payload.jurisdictionStatus.facilitySafety.status}) — ${payload.jurisdictionStatus.facilitySafety.authority}`);
  lines.push('');

  // Last inspection
  if (payload.lastInspection) {
    lines.push('LAST INSPECTION:');
    lines.push(`  Date: ${payload.lastInspection.date}`);
    lines.push(`  Score: ${payload.lastInspection.score}`);
    lines.push(`  Inspector: ${payload.lastInspection.inspector} (${payload.lastInspection.agency})`);
    if (payload.lastInspection.topViolations.length > 0) {
      lines.push('  Top violations:');
      payload.lastInspection.topViolations.forEach(v => lines.push(`    - ${v}`));
    } else {
      lines.push('  No violations found');
    }
  } else {
    lines.push('LAST INSPECTION: None — new location, no prior inspection history');
  }
  lines.push('');

  // Corrective actions
  lines.push(`OPEN CORRECTIVE ACTIONS: ${payload.openCorrectiveActions.count}`);
  if (payload.openCorrectiveActions.count > 0) {
    lines.push(`  Critical: ${payload.openCorrectiveActions.critical}, High: ${payload.openCorrectiveActions.high}, Medium: ${payload.openCorrectiveActions.medium}, Low: ${payload.openCorrectiveActions.low}`);
    payload.openCorrectiveActions.items.forEach(ca => {
      lines.push(`  - [${ca.severity.toUpperCase()}] ${ca.title} (${ca.status})`);
    });
  }
  lines.push('');

  // Temperature
  lines.push(`TEMPERATURE COMPLIANCE: ${payload.temperatureCompliance.currentWeekRate}% (${payload.temperatureCompliance.trendDirection})`);
  lines.push('');

  // Checklists
  lines.push(`CHECKLIST COMPLETION: ${payload.checklistCompletion.averageRate}% average`);
  payload.checklistCompletion.templates.forEach(t => {
    lines.push(`  - ${t.template}: ${t.rate}% (${t.completed} done, ${t.missed} missed)`);
  });
  lines.push('');

  // Jurisdiction enforcement focus
  if (payload.jurisdictionEnforcement) {
    const je = payload.jurisdictionEnforcement;
    lines.push(`JURISDICTION ENFORCEMENT FOCUS (${je.ehdName}):`);
    lines.push(`  Food Code: ${je.foodCodeVersion}`);
    lines.push(`  AHJ (facility safety): ${je.ahjName}`);
    je.enforcementFocus.forEach(f => {
      lines.push(`  - [${f.priority.toUpperCase()}] ${f.description} (${f.codeSection})`);
    });
    lines.push(`  Context: ${je.aiContextNote}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ── Format org-wide summary for all locations ────────────────

export function formatOrgSummaryForPrompt(payloads: LocationContextPayload[]): string {
  const lines: string[] = [];
  lines.push('═══ ORG-WIDE LOCATION DATA ═══');
  lines.push(`Data range: ${getDataDateRange().from} to ${getDataDateRange().to}`);
  lines.push('');

  for (const p of payloads) {
    lines.push(formatPayloadForPrompt(p));
  }

  return lines.join('\n');
}
