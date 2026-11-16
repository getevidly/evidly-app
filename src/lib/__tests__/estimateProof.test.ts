/**
 * Estimate Proof — the pure rules (supabase/functions/_shared/estimateProof.ts).
 * Handler-level tests (locking, view logging, no login, company walls) are in
 * supabase/functions/proof-access/proof-access.test.ts (Deno).
 */
import { describe, expect, it } from 'vitest';
import {
  compareRequest,
  dueReminderStage,
  effectiveOptions,
  itemStatus,
  monthYear,
  newToken,
  normalizeRequirements,
  checkFile,
  type RequirementOption,
} from '../../../supabase/functions/_shared/estimateProof.ts';

const TODAY = Date.UTC(2026, 10, 16); // November 16, 2026

const OPTIONS: RequirementOption[] = [
  { kind: 'coverage', code: 'general_liability', label: 'General Liability', fields: ['per_occurrence', 'aggregate'], sort_order: 10, active: true },
  { kind: 'coverage', code: 'workers_compensation', label: "Workers' Compensation", fields: [], sort_order: 20, active: true },
  { kind: 'coverage', code: 'commercial_auto', label: 'Commercial Auto', fields: ['minimum'], sort_order: 30, active: true },
  { kind: 'coverage', code: 'umbrella_excess', label: 'Umbrella or Excess', fields: ['minimum'], sort_order: 40, active: true },
  { kind: 'endorsement', code: 'additional_insured', label: 'Additional Insured', fields: ['name'], sort_order: 10, active: true },
  { kind: 'endorsement', code: 'waiver_of_subrogation', label: 'Waiver of Subrogation', fields: [], sort_order: 20, active: true },
  { kind: 'endorsement', code: 'primary_non_contributory', label: 'Primary and Non-Contributory', fields: [], sort_order: 30, active: true },
  { kind: 'endorsement', code: 'notice_of_cancellation', label: 'Notice of Cancellation', fields: ['days'], sort_order: 40, active: true },
  { kind: 'endorsement', code: 'other', label: 'Other', fields: ['text'], sort_order: 50, active: true },
];

describe('expired is never Current', () => {
  it('is Current through the last day printed and Expired the day after', () => {
    expect(itemStatus('2026-11-16', TODAY)).toBe('current');
    expect(itemStatus('2026-11-15', TODAY)).toBe('expired');
    expect(itemStatus('2020-01-01', TODAY)).toBe('expired');
    expect(itemStatus('2027-03-31', TODAY)).toBe('current');
  });
  it('treats no expiration date as Current', () => {
    expect(itemStatus(null, TODAY)).toBe('current');
  });
  it('never returns Current for any past date', () => {
    for (let d = 1; d <= 800; d += 7) {
      const past = new Date(TODAY - d * 86400000).toISOString().slice(0, 10);
      expect(itemStatus(past, TODAY)).toBe('expired');
    }
  });
  it('shows expiry as month and year', () => {
    expect(monthYear('2027-03-31')).toBe('March 2027');
    expect(monthYear(null)).toBeNull();
  });
});

describe('reminders at 60 and 30 days', () => {
  it('sends 60 then 30, each once', () => {
    expect(dueReminderStage('2027-01-30', [60, 30], null, TODAY)).toBeNull(); // 75 days
    expect(dueReminderStage('2027-01-15', [60, 30], null, TODAY)).toBe(60); // 60 days
    expect(dueReminderStage('2027-01-01', [60, 30], 60, TODAY)).toBeNull(); // 46 days, 60 sent
    expect(dueReminderStage('2026-12-16', [60, 30], 60, TODAY)).toBe(30); // 30 days
    expect(dueReminderStage('2026-12-10', [60, 30], 30, TODAY)).toBeNull(); // 24 days, 30 sent
  });
  it('a late start sends only the most urgent stage', () => {
    expect(dueReminderStage('2026-12-01', [60, 30], null, TODAY)).toBe(30);
  });
  it('sends nothing after expiry or without a date', () => {
    expect(dueReminderStage('2026-11-10', [60, 30], null, TODAY)).toBeNull();
    expect(dueReminderStage(null, [60, 30], null, TODAY)).toBeNull();
  });
  it('follows the setting', () => {
    expect(dueReminderStage('2027-02-10', [90, 14], null, TODAY)).toBe(90);
    expect(dueReminderStage('2026-12-16', [14], null, TODAY)).toBeNull();
  });
});

describe('settings: coverage and endorsement lists', () => {
  it('overlays a company row on the default and drops inactive rows', () => {
    const rows: RequirementOption[] = [
      ...OPTIONS.map((o) => ({ ...o, company_id: null })),
      { kind: 'coverage', code: 'commercial_auto', label: 'Business Auto', fields: ['minimum'], sort_order: 30, active: true, company_id: 'A' },
      { kind: 'endorsement', code: 'other', label: 'Other', fields: ['text'], sort_order: 50, active: false, company_id: 'A' },
      { kind: 'coverage', code: 'pollution', label: 'Pollution', fields: [], sort_order: 60, active: true, company_id: 'B' },
    ];
    const a = effectiveOptions(rows, 'A');
    expect(a.find((o) => o.code === 'commercial_auto')?.label).toBe('Business Auto');
    expect(a.some((o) => o.code === 'other')).toBe(false);
    expect(a.some((o) => o.code === 'pollution')).toBe(false);
    expect(a[0].kind).toBe('coverage');
  });
});

describe('the client form', () => {
  const base = { holder_name: 'Landlord LLC', holder_address: '1 Main St', who_is_asking: 'landlord_or_property_manager' };
  it('keeps only listed codes and the fields each asks for', () => {
    const r = normalizeRequirements({
      ...base,
      coverages: [{ code: 'general_liability', per_occurrence: '$1,000,000', aggregate: '2000000', minimum: '5' }, { code: 'made_up' }],
      endorsements: [{ code: 'waiver_of_subrogation', name: 'ignored' }],
    }, OPTIONS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.coverages).toEqual([{ code: 'general_liability', per_occurrence: 1000000, aggregate: 2000000 }]);
    expect(r.value.endorsements).toEqual([{ code: 'waiver_of_subrogation' }]);
  });
  it('requires the holder, who is asking, a name for Additional Insured, and at least one line', () => {
    expect(normalizeRequirements({ ...base, holder_name: '' , coverages: [{ code: 'workers_compensation' }] }, OPTIONS).ok).toBe(false);
    expect(normalizeRequirements({ ...base, who_is_asking: 'nobody', coverages: [{ code: 'workers_compensation' }] }, OPTIONS).ok).toBe(false);
    expect(normalizeRequirements({ ...base, endorsements: [{ code: 'additional_insured' }] }, OPTIONS).ok).toBe(false);
    expect(normalizeRequirements({ ...base }, OPTIONS).ok).toBe(false);
  });
});

describe('What They Require, Against What You Have', () => {
  const gl = {
    coverage_code: 'general_liability', per_occurrence_limit: '1000000.00', aggregate_limit: 2000000,
    endorsements: ['waiver_of_subrogation', 'primary_non_contributory'], notice_of_cancellation_days: 30, expiration_date: '2027-06-30',
  };
  const wcExpired = {
    coverage_code: 'workers_compensation', per_occurrence_limit: null, aggregate_limit: null,
    endorsements: [], notice_of_cancellation_days: null, expiration_date: '2026-10-01',
  };
  const meets = (coverages: object[], endorsements: object[] = [], policies: object[] = [gl, wcExpired]) =>
    Object.fromEntries(compareRequest({ coverages, endorsements } as never, policies as never, OPTIONS, TODAY).map((l) => [l.code, l.meets]));

  it('meets a minimum at or under the limit, not over it', () => {
    expect(meets([{ code: 'general_liability', per_occurrence: 1000000, aggregate: 2000000 }]).general_liability).toBe(true);
    expect(meets([{ code: 'general_liability', per_occurrence: 2000000 }]).general_liability).toBe(false);
    expect(meets([{ code: 'general_liability', aggregate: 3000000 }]).general_liability).toBe(false);
  });
  it('an expired policy never meets a requirement', () => {
    expect(meets([{ code: 'workers_compensation' }]).workers_compensation).toBe(false);
    expect(meets([{ code: 'general_liability' }], [], [{ ...gl, expiration_date: '2026-11-15' }]).general_liability).toBe(false);
  });
  it('a minimum with no limit on file is not met; a missing coverage is not met', () => {
    expect(meets([{ code: 'commercial_auto', minimum: 1 }]).commercial_auto).toBe(false);
    expect(meets([{ code: 'general_liability', per_occurrence: 1 }], [], [{ ...gl, per_occurrence_limit: null }]).general_liability).toBe(false);
  });
  it('reads endorsements from current policies; Additional Insured and Other always go to the broker', () => {
    const m = meets([], [
      { code: 'additional_insured', name: 'Landlord LLC' },
      { code: 'waiver_of_subrogation' },
      { code: 'primary_non_contributory' },
      { code: 'notice_of_cancellation', days: 30 },
      { code: 'other', text: 'Loss payee' },
    ]);
    expect(m).toEqual({
      additional_insured: false, waiver_of_subrogation: true, primary_non_contributory: true,
      notice_of_cancellation: true, other: false,
    });
    expect(meets([], [{ code: 'notice_of_cancellation', days: 60 }]).notice_of_cancellation).toBe(false);
  });
  it('writes each line the way the company reads it', () => {
    const [line] = compareRequest({ coverages: [{ code: 'general_liability', per_occurrence: 1000000 }], endorsements: [] }, [], OPTIONS, TODAY);
    expect(line.text).toBe('General Liability · $1,000,000 per occurrence');
  });
});

describe('links and files', () => {
  it('makes 43-character url-safe tokens, all different', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const t = newToken();
      expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
      seen.add(t);
    }
    expect(seen.size).toBe(200);
  });
  it('accepts PDFs and photos up to 10 MB only', () => {
    expect(checkFile({ content_type: 'application/pdf', base64: 'JVBERi0=' }).ok).toBe(true);
    expect(checkFile({ content_type: 'image/jpeg', base64: '/9j/' }).ok).toBe(true);
    expect(checkFile({ content_type: 'text/html', base64: 'PGgxPg==' }).ok).toBe(false);
    expect(checkFile({ content_type: 'application/pdf', base64: 'A'.repeat(14 * 1024 * 1024) }).ok).toBe(false);
  });
});
