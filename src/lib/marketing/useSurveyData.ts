/**
 * useSurveyData — Supabase reads for the Kitchen Safety Study admin tab.
 *
 * Reads:  market_research_responses + market_research_answers + market_research_contacts
 * Writes: none (read-only dashboard)
 *
 * Every metric respects the reporting threshold (MIN_N = 10).
 * Base sizes differ per record because the survey branches.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';

// ── Constants ────────────────────────────────────────────────────

export const MIN_N = 10;

// Record question IDs
const FIRE_IDS = ['hood', 'supp', 'ext', 'sprink'];
const FOOD_IDS = ['cool', 'hold', 'sanit', 'handler'];
const VBIZ_IDS = ['vins'];
const KNOW_IDS = ['pse', 'recs'];
// Ladder records — four-band readiness (tracked/untracked/gap/no). Used for band table + cross-tab.
const LADDER_IDS = [...FIRE_IDS, ...FOOD_IDS, ...VBIZ_IDS];
// All question IDs — ladder + KNOW questions. Used for PSE panel + CSV export.
const ALL_RECORD_IDS = [...LADDER_IDS, ...KNOW_IDS];

// Human-readable record names
export const RECORD_NAMES: Record<string, string> = {
  hood:    'Exhaust & hood cleaning',
  supp:    'Hood suppression',
  ext:     'Fire extinguishers',
  sprink:  'Fire sprinklers',
  pse:     'Protective Safeguards Endorsement',
  recs:    'Signed service records',
  cool:    'Cooling records',
  hold:    'Holding temperatures',
  sanit:   'Sanitization records',
  handler: 'Food handler cards',
  vins:    'Vendor insurance certificates',
};

// Answer value labels
export const VALUE_LABELS: Record<string, string> = {
  tracked:   'Ready to send',
  untracked: 'Have to find it',
  gap:       'Not in my hands',
  no:        'Not on file',
  na:        'Not my area',
  yes:       'Yes',
  unsure:    'Not sure',
};

// Census 2020 California regions — all 58 counties in exactly one of 10 regions
// Source: https://census.ca.gov/2020regions/
export const CA_REGIONS: Record<string, string[]> = {
  'Superior California':          ['Butte', 'Colusa', 'El Dorado', 'Glenn', 'Lassen', 'Modoc', 'Nevada', 'Placer', 'Plumas', 'Sacramento', 'Shasta', 'Sierra', 'Siskiyou', 'Sutter', 'Tehama', 'Yolo', 'Yuba'],
  'North Coast':                  ['Del Norte', 'Humboldt', 'Lake', 'Mendocino', 'Napa', 'Sonoma', 'Trinity'],
  'San Francisco Bay Area':       ['Alameda', 'Contra Costa', 'Marin', 'San Francisco', 'San Mateo', 'Santa Clara', 'Solano'],
  'Northern San Joaquin Valley':  ['Alpine', 'Amador', 'Calaveras', 'Madera', 'Mariposa', 'Merced', 'Mono', 'San Joaquin', 'Stanislaus', 'Tuolumne'],
  'Central Coast':                ['Monterey', 'San Benito', 'San Luis Obispo', 'Santa Barbara', 'Santa Cruz', 'Ventura'],
  'Southern San Joaquin Valley':  ['Fresno', 'Inyo', 'Kern', 'Kings', 'Tulare'],
  'Inland Empire':                ['Riverside', 'San Bernardino'],
  'Los Angeles County':           ['Los Angeles'],
  'Orange County':                ['Orange'],
  'San Diego\u2013Imperial':      ['Imperial', 'San Diego'],
};

// Reverse map: county → region
export const COUNTY_TO_REGION: Record<string, string> = {};
Object.entries(CA_REGIONS).forEach(([region, counties]) => {
  counties.forEach(c => { COUNTY_TO_REGION[c] = region; });
});

// Source labels
export const SOURCE_LABELS: Record<string, string> = {
  call: 'Outbound call', show: 'Show floor QR', email: 'EvidLY email',
  social: 'Social media', page: 'Website', cra: 'CRA email',
  referral: 'Referral', client: 'Client invite', other: 'Other',
};

export const PLATFORM_LABELS: Record<string, string> = {
  LinkedIn: 'LinkedIn', Facebook: 'Facebook', Instagram: 'Instagram', YouTube: 'YouTube',
};

// ── Row types ────────────────────────────────────────────────────

export interface ResponseRow {
  id: string;
  created_at: string;
  updated_at: string | null;
  status: string;
  instrument_version: string;
  source: string | null;
  source_platform: string | null;
  source_method: string | null;
  scope: string | null;
  county: string | null;
  kitchen_type: string | null;
  kitchen_count: string | null;
  system: string | null;
  record_owner: string | null;
  speed: string | null;
  askers: string[] | null;
  completed_at: string | null;
  duration_seconds: number | null;
  interviewer_id: string | null;
}

export interface AnswerRow {
  id: string;
  response_id: string;
  question_id: string;
  value: string;
  answered_at: string;
}

export interface ContactRow {
  id: string;
  response_id: string;
  email: string | null;
  wants_findings: boolean;
  wants_county_report: boolean;
  wants_referral_link: boolean;
  wants_meeting: boolean;
  created_at: string;
}

// ── Aggregate types ──────────────────────────────────────────────

export interface RecordBand {
  question_id: string;
  name: string;
  n: number;          // total who answered (excluding N/A)
  na: number;         // count of N/A
  tracked: number;
  untracked: number;
  gap: number;
  no: number;
  gapPct: number;     // (untracked + gap + no) / n
}

export interface SegmentCount {
  label: string;
  count: number;
  pct: number;
}

export interface FilterState {
  region: string | null;
  county: string | null;
  kitchenType: string | null;
  channel: string | null;
  scope: string | null;
}

export interface SurveyStats {
  total: number;
  completed: number;
  inProgress: number;
  abandoned: number;
  completionRate: number;
  medianSeconds: number;
  recordBands: RecordBand[];
  knowBands: RecordBand[];
  scopeCounts: SegmentCount[];
  systemCounts: SegmentCount[];
  ownerCounts: SegmentCount[];
  speedCounts: SegmentCount[];
  askerCounts: SegmentCount[];
  channelCounts: SegmentCount[];
  platformCounts: SegmentCount[];
  kitchenTypeCounts: SegmentCount[];
  countCounts: SegmentCount[];
  regionCounts: SegmentCount[];
  countyCounts: SegmentCount[];
  meetingQueue: Array<{ response_id: string; email: string; created_at: string }>;
  crossTabSystemByRecord: Record<string, { respondents: number; bands: RecordBand[] }>;
}

// ── Helpers ──────────────────────────────────────────────────────

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function countBy<T>(items: T[], key: (item: T) => string | null): Record<string, number> {
  const c: Record<string, number> = {};
  items.forEach(item => {
    const k = key(item);
    if (k) c[k] = (c[k] || 0) + 1;
  });
  return c;
}

function toSegmentCounts(counts: Record<string, number>, total: number): SegmentCount[] {
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count, pct: total > 0 ? Math.round(count / total * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

function computeRecordBand(qId: string, answers: AnswerRow[]): RecordBand {
  const matching = answers.filter(a => a.question_id === qId);
  const na = matching.filter(a => a.value === 'na').length;
  const pool = matching.filter(a => a.value !== 'na');
  const n = pool.length;
  const tracked = pool.filter(a => a.value === 'tracked' || a.value === 'yes').length;
  const untracked = pool.filter(a => a.value === 'untracked').length;
  const gap = pool.filter(a => a.value === 'gap' || a.value === 'unsure').length;
  const no = pool.filter(a => a.value === 'no').length;
  const gapPct = n > 0 ? Math.round((untracked + gap + no) / n * 100) : 0;
  return {
    question_id: qId, name: RECORD_NAMES[qId] || qId,
    n, na, tracked, untracked, gap, no, gapPct,
  };
}

// ── Hook ─────────────────────────────────────────────────────────

export function useSurveyData() {
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    region: null, county: null, kitchenType: null, channel: null, scope: null,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rRes, aRes, cRes] = await Promise.all([
        supabase.from('market_research_responses').select('*').order('created_at', { ascending: false }),
        supabase.from('market_research_answers').select('*'),
        supabase.from('market_research_contacts').select('*'),
      ]);
      if (rRes.error) throw rRes.error;
      if (aRes.error) throw aRes.error;
      if (cRes.error) throw cRes.error;
      setResponses((rRes.data || []) as ResponseRow[]);
      setAnswers((aRes.data || []) as AnswerRow[]);
      setContacts((cRes.data || []) as ContactRow[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setResponses([]); setAnswers([]); setContacts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Apply filters
  const filtered = useMemo(() => {
    let r = responses;
    if (filters.scope) r = r.filter(x => x.scope === filters.scope);
    if (filters.county) r = r.filter(x => x.county === filters.county);
    if (filters.kitchenType) r = r.filter(x => x.kitchen_type === filters.kitchenType);
    if (filters.channel) r = r.filter(x => x.source === filters.channel);
    if (filters.region) {
      const regionCounties = new Set(CA_REGIONS[filters.region] || []);
      r = r.filter(x => x.county && regionCounties.has(x.county));
    }
    return r;
  }, [responses, filters]);

  const filteredIds = useMemo(() => new Set(filtered.map(r => r.id)), [filtered]);
  const filteredAnswers = useMemo(() => answers.filter(a => filteredIds.has(a.response_id)), [answers, filteredIds]);
  const filteredContacts = useMemo(() => contacts.filter(c => filteredIds.has(c.response_id)), [contacts, filteredIds]);

  // Compute stats
  const stats = useMemo((): SurveyStats => {
    const completed = filtered.filter(r => r.status === 'completed');
    const inProgress = filtered.filter(r => r.status === 'in_progress');
    const abandoned = filtered.filter(r => r.status === 'abandoned');
    const total = filtered.length;

    const completionRate = total > 0 ? Math.round(completed.length / total * 100) : 0;
    const durations = completed.filter(r => r.duration_seconds).map(r => r.duration_seconds!);
    const medianSeconds = Math.round(median(durations));

    // Record bands — only from completed responses, ladder records only (pse/recs go to PSE panel)
    const completedIds = new Set(completed.map(r => r.id));
    const completedAnswers = filteredAnswers.filter(a => completedIds.has(a.response_id));
    const recordBands = LADDER_IDS
      .map(qId => computeRecordBand(qId, completedAnswers))
      .sort((a, b) => b.gapPct - a.gapPct);

    // KNOW questions — pse and recs for the Protective Safeguards panel
    const knowBands = KNOW_IDS.map(qId => computeRecordBand(qId, completedAnswers));

    // Scope distribution
    const scopeCounts = toSegmentCounts(countBy(completed, r => r.scope), completed.length);

    // System
    const systemCounts = toSegmentCounts(countBy(completed, r => r.system), completed.length);

    // Record owner
    const ownerCounts = toSegmentCounts(countBy(completed, r => r.record_owner), completed.length);

    // Speed
    const speedCounts = toSegmentCounts(countBy(completed, r => r.speed), completed.length);

    // Askers (multi-select)
    const askerMap: Record<string, number> = {};
    completed.forEach(r => {
      (r.askers || []).forEach(a => { askerMap[a] = (askerMap[a] || 0) + 1; });
    });
    const askerCounts = toSegmentCounts(askerMap, completed.length);

    // Channel
    const channelCounts = toSegmentCounts(countBy(completed, r => r.source), completed.length);

    // Platform sub-rows (for social)
    const platformCounts = toSegmentCounts(
      countBy(completed.filter(r => r.source === 'social'), r => r.source_platform),
      completed.filter(r => r.source === 'social').length,
    );

    // Kitchen type
    const kitchenTypeCounts = toSegmentCounts(countBy(completed, r => r.kitchen_type), completed.length);

    // Kitchen count
    const countCounts = toSegmentCounts(countBy(completed, r => r.kitchen_count), completed.length);

    // Region
    const regionCounts = toSegmentCounts(
      countBy(completed, r => r.county ? COUNTY_TO_REGION[r.county] || null : null),
      completed.length,
    );

    // County
    const countyCounts = toSegmentCounts(countBy(completed, r => r.county), completed.length);

    // Meeting queue — contacts who want a meeting
    const meetContacts = filteredContacts.filter(c => c.wants_meeting);
    const meetingQueue = meetContacts.map(c => ({
      response_id: c.response_id,
      email: c.email || '',
      created_at: c.created_at,
    }));

    // Cross-tab: system × record bands (the finding the study exists to produce)
    const crossTabSystemByRecord: Record<string, { respondents: number; bands: RecordBand[] }> = {};
    const systemValues = [...new Set(completed.map(r => r.system).filter(Boolean))] as string[];
    systemValues.forEach(sys => {
      const sysIds = new Set(completed.filter(r => r.system === sys).map(r => r.id));
      const sysAnswers = completedAnswers.filter(a => sysIds.has(a.response_id));
      crossTabSystemByRecord[sys] = {
        respondents: sysIds.size,
        bands: LADDER_IDS
          .map(qId => computeRecordBand(qId, sysAnswers))
          .filter(b => b.n > 0),
      };
    });

    return {
      total, completed: completed.length, inProgress: inProgress.length,
      abandoned: abandoned.length, completionRate, medianSeconds,
      recordBands, knowBands, scopeCounts, systemCounts, ownerCounts, speedCounts,
      askerCounts, channelCounts, platformCounts, kitchenTypeCounts,
      countCounts, regionCounts, countyCounts, meetingQueue,
      crossTabSystemByRecord,
    };
  }, [filtered, filteredAnswers, filteredContacts]);

  // Contact lookup: response_id → has meeting consent
  const contactMap = useMemo(() => {
    const m: Record<string, ContactRow> = {};
    contacts.forEach(c => { m[c.response_id] = c; });
    return m;
  }, [contacts]);

  // CSV export (answers, not people)
  const exportCSV = useCallback(() => {
    const completed = filtered.filter(r => r.status === 'completed');
    if (!completed.length) return;

    const header = [
      'response_id', 'created_at', 'status', 'source', 'source_platform',
      'scope', 'county', 'kitchen_type', 'kitchen_count',
      'system', 'record_owner', 'speed', 'askers', 'duration_seconds',
      'identity',
      ...ALL_RECORD_IDS,
    ];

    const answerMap: Record<string, Record<string, string>> = {};
    filteredAnswers.forEach(a => {
      if (!answerMap[a.response_id]) answerMap[a.response_id] = {};
      answerMap[a.response_id][a.question_id] = a.value;
    });

    const rows = completed.map(r => {
      const ra = answerMap[r.id] || {};
      const hasConsent = contactMap[r.id]?.wants_meeting;
      return [
        r.id, r.created_at, r.status, r.source || '', r.source_platform || '',
        r.scope || '', r.county || '', r.kitchen_type || '', r.kitchen_count || '',
        r.system || '', r.record_owner || '', r.speed || '',
        (r.askers || []).join('; '), r.duration_seconds || '',
        hasConsent ? 'Named — consented' : 'Anonymous',
        ...ALL_RECORD_IDS.map(qId => ra[qId] || ''),
      ];
    });

    const csv = [header.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kitchen-safety-study-export.csv';
    a.click(); URL.revokeObjectURL(url);
  }, [filtered, filteredAnswers, contactMap]);

  return {
    responses: filtered, answers: filteredAnswers, contacts: filteredContacts,
    allResponses: responses,
    stats, loading, error, refresh, filters, setFilters, contactMap, exportCSV,
  };
}
