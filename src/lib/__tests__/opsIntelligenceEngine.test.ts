import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generatePSEInsights,
  generateDocumentInsights,
  generateServiceInsights,
  generateCAInsights,
  generateTempInsights,
  generateChecklistInsights,
  generateCertInsights,
  generateLocationInsights,
  generateTrajectoryInsights,
  generateSignalInsights,
  generateAllInsights,
} from '../opsIntelligenceEngine';

// ── Mock Supabase client ─────────────────────────────────────

function createMockSupabase(tables) {
  return {
    from: (table) => {
      const data = tables[table] || [];
      let filtered = [...data];
      let selectCols = null;
      let limitN = null;
      let singleMode = false;

      const chain = {
        select: (cols) => { selectCols = cols; return chain; },
        eq: (col, val) => { filtered = filtered.filter(r => r[col] === val); return chain; },
        in: (col, vals) => { filtered = filtered.filter(r => vals.includes(r[col])); return chain; },
        not: (col, op, val) => { filtered = filtered.filter(r => r[col] != null); return chain; },
        gte: (col, val) => { filtered = filtered.filter(r => r[col] >= val); return chain; },
        lt: (col, val) => { filtered = filtered.filter(r => r[col] < val); return chain; },
        lte: (col, val) => { filtered = filtered.filter(r => r[col] <= val); return chain; },
        order: (col, opts) => {
          filtered.sort((a, b) => {
            if (opts?.ascending === false) return a[col] > b[col] ? -1 : 1;
            return a[col] > b[col] ? 1 : -1;
          });
          return chain;
        },
        limit: (n) => { limitN = n; return chain; },
        maybeSingle: () => {
          singleMode = true;
          const result = limitN ? filtered.slice(0, limitN) : filtered;
          return { data: result[0] || null, error: null };
        },
        then: undefined,
      };

      // Make it thenable to resolve as { data }
      Object.defineProperty(chain, 'then', {
        get() {
          return (resolve) => {
            const result = limitN ? filtered.slice(0, limitN) : filtered;
            resolve({ data: result, error: null });
          };
        },
      });

      return chain;
    },
  };
}

// Helper: date N days from now
function daysFromNow(n) {
  return new Date(Date.now() + n * 86400000).toISOString().split('T')[0];
}
function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

// ── Tests ────────────────────────────────────────────────────

describe('SP8 Ops Intelligence Engine', () => {
  const ORG = 'org-1';

  describe('generatePSEInsights', () => {
    it('flags missing safeguards as P1', async () => {
      const sb = createMockSupabase({
        vendor_service_records: [
          { organization_id: ORG, safeguard_type: 'hood_cleaning', next_due_date: daysFromNow(60), vendor_name: 'V1' },
          { organization_id: ORG, safeguard_type: 'fire_suppression', next_due_date: daysFromNow(60), vendor_name: 'V2' },
        ],
      });
      const result = await generatePSEInsights(ORG, sb);
      const missing = result.find(i => i.title.includes('missing'));
      expect(missing).toBeDefined();
      expect(missing.priority).toBe(1);
      expect(missing.category).toBe('pse_exposure');
    });

    it('flags overdue safeguards as P1', async () => {
      const sb = createMockSupabase({
        vendor_service_records: [
          { organization_id: ORG, safeguard_type: 'hood_cleaning', next_due_date: daysFromNow(-10), vendor_name: 'V1' },
          { organization_id: ORG, safeguard_type: 'fire_suppression', next_due_date: daysFromNow(60), vendor_name: 'V2' },
          { organization_id: ORG, safeguard_type: 'fire_alarm', next_due_date: daysFromNow(60), vendor_name: 'V3' },
          { organization_id: ORG, safeguard_type: 'sprinklers', next_due_date: daysFromNow(60), vendor_name: 'V4' },
        ],
      });
      const result = await generatePSEInsights(ORG, sb);
      const overdue = result.find(i => i.title.includes('overdue'));
      expect(overdue).toBeDefined();
      expect(overdue.priority).toBe(1);
    });

    it('returns P3 when all 4 are current', async () => {
      const sb = createMockSupabase({
        vendor_service_records: [
          { organization_id: ORG, safeguard_type: 'hood_cleaning', next_due_date: daysFromNow(60), vendor_name: 'V1' },
          { organization_id: ORG, safeguard_type: 'fire_suppression', next_due_date: daysFromNow(60), vendor_name: 'V2' },
          { organization_id: ORG, safeguard_type: 'fire_alarm', next_due_date: daysFromNow(60), vendor_name: 'V3' },
          { organization_id: ORG, safeguard_type: 'sprinklers', next_due_date: daysFromNow(60), vendor_name: 'V4' },
        ],
      });
      const result = await generatePSEInsights(ORG, sb);
      const good = result.find(i => i.priority === 3);
      expect(good).toBeDefined();
      expect(good.title).toContain('All 4 PSE safeguards current');
    });

    it('flags due-soon safeguards as P2', async () => {
      const sb = createMockSupabase({
        vendor_service_records: [
          { organization_id: ORG, safeguard_type: 'hood_cleaning', next_due_date: daysFromNow(15), vendor_name: 'V1' },
          { organization_id: ORG, safeguard_type: 'fire_suppression', next_due_date: daysFromNow(60), vendor_name: 'V2' },
          { organization_id: ORG, safeguard_type: 'fire_alarm', next_due_date: daysFromNow(60), vendor_name: 'V3' },
          { organization_id: ORG, safeguard_type: 'sprinklers', next_due_date: daysFromNow(60), vendor_name: 'V4' },
        ],
      });
      const result = await generatePSEInsights(ORG, sb);
      const dueSoon = result.find(i => i.priority === 2);
      expect(dueSoon).toBeDefined();
      expect(dueSoon.title).toContain('due within 30 days');
    });
  });

  describe('generateDocumentInsights', () => {
    it('flags expired documents as P1', async () => {
      const sb = createMockSupabase({
        documents: [
          { id: 'd1', organization_id: ORG, title: 'Health Permit', expiration_date: daysFromNow(-5), status: 'active', category: 'permit' },
        ],
      });
      const result = await generateDocumentInsights(ORG, sb);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].priority).toBe(1);
      expect(result[0].category).toBe('document_currency');
    });

    it('flags expiring-soon documents as P2', async () => {
      const sb = createMockSupabase({
        documents: [
          { id: 'd1', organization_id: ORG, title: 'Business License', expiration_date: daysFromNow(15), status: 'active', category: 'license' },
        ],
      });
      const result = await generateDocumentInsights(ORG, sb);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].priority).toBe(2);
    });

    it('returns empty for current documents', async () => {
      const sb = createMockSupabase({
        documents: [
          { id: 'd1', organization_id: ORG, title: 'Cert', expiration_date: daysFromNow(90), status: 'active', category: 'cert' },
        ],
      });
      const result = await generateDocumentInsights(ORG, sb);
      expect(result.length).toBe(0);
    });
  });

  describe('generateCAInsights', () => {
    it('flags CAs open >14 days as P1', async () => {
      const sb = createMockSupabase({
        corrective_actions: [
          { id: 'ca1', organization_id: ORG, title: 'Old CA', status: 'created', created_at: daysAgo(20), due_date: daysFromNow(-5) },
        ],
      });
      const result = await generateCAInsights(ORG, sb);
      const aged = result.find(i => i.title.includes('>14 days'));
      expect(aged).toBeDefined();
      expect(aged.priority).toBe(1);
    });

    it('flags CAs open 7-14 days as P2', async () => {
      const sb = createMockSupabase({
        corrective_actions: [
          { id: 'ca1', organization_id: ORG, title: 'Medium CA', status: 'in_progress', created_at: daysAgo(10), due_date: daysFromNow(5) },
        ],
      });
      const result = await generateCAInsights(ORG, sb);
      const aged = result.find(i => i.title.includes('7') && i.title.includes('14 days'));
      expect(aged).toBeDefined();
      expect(aged.priority).toBe(2);
    });

    it('flags low closure rate as P2', async () => {
      const actions = [];
      for (let i = 0; i < 10; i++) {
        actions.push({
          id: `ca${i}`, organization_id: ORG, title: `CA ${i}`,
          status: i < 3 ? 'completed' : 'created',
          created_at: daysAgo(30), due_date: daysFromNow(-10),
        });
      }
      const sb = createMockSupabase({ corrective_actions: actions });
      const result = await generateCAInsights(ORG, sb);
      const closure = result.find(i => i.title.includes('closure rate'));
      expect(closure).toBeDefined();
      expect(closure.priority).toBe(2);
    });
  });

  describe('generateTempInsights', () => {
    it('flags 3+ out-of-range readings as P1', async () => {
      const logs = [];
      for (let i = 0; i < 4; i++) {
        logs.push({
          id: `t${i}`, organization_id: ORG, equipment_name: 'Walk-in',
          temperature: 50, recorded_at: daysAgo(i), status: 'critical',
        });
      }
      const sb = createMockSupabase({ temp_logs: logs });
      const result = await generateTempInsights(ORG, sb);
      const oor = result.find(i => i.title.includes('out-of-range'));
      expect(oor).toBeDefined();
      expect(oor.priority).toBe(1);
    });

    it('detects 2°F drift as P2', async () => {
      const logs = [];
      // Week 1 (8-14 days ago): avg 36°F
      for (let i = 8; i <= 12; i++) {
        logs.push({
          id: `w1-${i}`, organization_id: ORG, equipment_name: 'Cooler',
          temperature: 36, recorded_at: daysAgo(i), status: 'normal',
        });
      }
      // Week 2 (0-6 days ago): avg 39°F
      for (let i = 0; i <= 4; i++) {
        logs.push({
          id: `w2-${i}`, organization_id: ORG, equipment_name: 'Cooler',
          temperature: 39, recorded_at: daysAgo(i), status: 'normal',
        });
      }
      const sb = createMockSupabase({ temp_logs: logs });
      const result = await generateTempInsights(ORG, sb);
      const drift = result.find(i => i.title.includes('drift'));
      expect(drift).toBeDefined();
      expect(drift.priority).toBe(2);
    });
  });

  describe('generateChecklistInsights', () => {
    it('detects 10%+ completion drop as P1', async () => {
      const completions = [];
      // Previous period: 10 completions
      for (let i = 0; i < 10; i++) {
        completions.push({
          id: `p${i}`, checklist_id: 'cl1', completed_by: `user${i % 3}`,
          completed_at: daysAgo(20 + i),
        });
      }
      // Recent period: 5 completions (50% drop)
      for (let i = 0; i < 5; i++) {
        completions.push({
          id: `r${i}`, checklist_id: 'cl1', completed_by: `user${i % 3}`,
          completed_at: daysAgo(i + 1),
        });
      }
      const sb = createMockSupabase({
        checklists: [{ id: 'cl1', organization_id: ORG }],
        checklist_completions: completions,
      });
      const result = await generateChecklistInsights(ORG, sb);
      const drop = result.find(i => i.title.includes('dropped'));
      expect(drop).toBeDefined();
      expect(drop.priority).toBe(1);
    });

    it('detects concentration (>60% by one person) as P2', async () => {
      const completions = [];
      // Recent: 10 completions, 8 by same person
      for (let i = 0; i < 10; i++) {
        completions.push({
          id: `r${i}`, checklist_id: 'cl1',
          completed_by: i < 8 ? 'user-main' : `user-other-${i}`,
          completed_at: daysAgo(i + 1),
        });
      }
      const sb = createMockSupabase({
        checklists: [{ id: 'cl1', organization_id: ORG }],
        checklist_completions: completions,
      });
      const result = await generateChecklistInsights(ORG, sb);
      const conc = result.find(i => i.title.includes('completing'));
      expect(conc).toBeDefined();
      expect(conc.priority).toBe(2);
    });
  });

  describe('generateCertInsights', () => {
    it('flags >25% expired certs as P2', async () => {
      const sb = createMockSupabase({
        employee_certifications: [
          { id: 'c1', organization_id: ORG, certification_name: 'Food Handler', expiration_date: daysFromNow(-30), status: 'expired', user_id: 'u1' },
          { id: 'c2', organization_id: ORG, certification_name: 'ServSafe', expiration_date: daysFromNow(-10), status: 'expired', user_id: 'u2' },
          { id: 'c3', organization_id: ORG, certification_name: 'CPR', expiration_date: daysFromNow(90), status: 'active', user_id: 'u3' },
          { id: 'c4', organization_id: ORG, certification_name: 'Allergen', expiration_date: daysFromNow(120), status: 'active', user_id: 'u4' },
        ],
      });
      const result = await generateCertInsights(ORG, sb);
      const expired = result.find(i => i.title.includes('expired'));
      expect(expired).toBeDefined();
      expect(expired.priority).toBe(2);
    });

    it('flags certs expiring within 60 days as P2', async () => {
      const sb = createMockSupabase({
        employee_certifications: [
          { id: 'c1', organization_id: ORG, certification_name: 'Food Handler', expiration_date: daysFromNow(30), status: 'active', user_id: 'u1' },
        ],
      });
      const result = await generateCertInsights(ORG, sb);
      const expiring = result.find(i => i.title.includes('expiring'));
      expect(expiring).toBeDefined();
      expect(expiring.priority).toBe(2);
    });
  });

  describe('generateLocationInsights', () => {
    it('returns empty for single location', async () => {
      const sb = createMockSupabase({
        locations: [{ id: 'loc1', name: 'Main', organization_id: ORG, status: 'active' }],
      });
      const result = await generateLocationInsights(ORG, sb);
      expect(result.length).toBe(0);
    });

    it('detects lagging location for 2+ locations', async () => {
      const sb = createMockSupabase({
        locations: [
          { id: 'loc1', name: 'Downtown', organization_id: ORG, status: 'active' },
          { id: 'loc2', name: 'Airport', organization_id: ORG, status: 'active' },
        ],
        checklists: [
          { id: 'cl1', organization_id: ORG, location_id: 'loc1' },
          { id: 'cl2', organization_id: ORG, location_id: 'loc2' },
        ],
        checklist_completions: [
          // loc1: 10 completions, loc2: 2 completions
          ...Array.from({ length: 10 }, (_, i) => ({
            id: `c1-${i}`, checklist_id: 'cl1', completed_at: daysAgo(i + 1),
          })),
          ...Array.from({ length: 2 }, (_, i) => ({
            id: `c2-${i}`, checklist_id: 'cl2', completed_at: daysAgo(i + 1),
          })),
        ],
      });
      const result = await generateLocationInsights(ORG, sb);
      const lagging = result.find(i => i.title.includes('lagging'));
      expect(lagging).toBeDefined();
      expect(lagging.category).toBe('multi_location');
    });
  });

  describe('generateTrajectoryInsights', () => {
    it('detects declining score as P1', async () => {
      const sb = createMockSupabase({
        readiness_snapshots: [
          { org_id: ORG, overall_score: 70, snapshot_date: daysFromNow(-1) },
          { org_id: ORG, overall_score: 72, snapshot_date: daysFromNow(-8) },
          { org_id: ORG, overall_score: 68, snapshot_date: daysFromNow(-15) },
          { org_id: ORG, overall_score: 85, snapshot_date: daysFromNow(-22) },
          { org_id: ORG, overall_score: 88, snapshot_date: daysFromNow(-29) },
          { org_id: ORG, overall_score: 82, snapshot_date: daysFromNow(-36) },
        ],
      });
      const result = await generateTrajectoryInsights(ORG, sb);
      const declining = result.find(i => i.title.includes('declining'));
      expect(declining).toBeDefined();
      expect(declining.priority).toBe(1);
    });

    it('detects improving score as P3', async () => {
      const sb = createMockSupabase({
        readiness_snapshots: [
          { org_id: ORG, overall_score: 90, snapshot_date: daysFromNow(-1) },
          { org_id: ORG, overall_score: 88, snapshot_date: daysFromNow(-8) },
          { org_id: ORG, overall_score: 92, snapshot_date: daysFromNow(-15) },
          { org_id: ORG, overall_score: 75, snapshot_date: daysFromNow(-22) },
          { org_id: ORG, overall_score: 72, snapshot_date: daysFromNow(-29) },
          { org_id: ORG, overall_score: 78, snapshot_date: daysFromNow(-36) },
        ],
      });
      const result = await generateTrajectoryInsights(ORG, sb);
      const improving = result.find(i => i.title.includes('improving'));
      expect(improving).toBeDefined();
      expect(improving.priority).toBe(3);
    });

    it('returns empty with fewer than 3 snapshots', async () => {
      const sb = createMockSupabase({
        readiness_snapshots: [
          { org_id: ORG, overall_score: 80, snapshot_date: daysFromNow(-1) },
        ],
      });
      const result = await generateTrajectoryInsights(ORG, sb);
      expect(result.length).toBe(0);
    });
  });

  describe('generateSignalInsights', () => {
    it('flags critical signals for matching county as P1', async () => {
      const sb = createMockSupabase({
        locations: [{ organization_id: ORG, city: 'Fresno', state: 'CA', status: 'active' }],
        intelligence_signals: [
          {
            id: 's1', title: 'New FDA rule', ai_urgency: 'critical',
            affected_counties: ['Fresno County'], published_at: daysAgo(5),
            summary: 'Major FDA update', status: 'published',
          },
        ],
      });
      const result = await generateSignalInsights(ORG, sb);
      const critical = result.find(i => i.priority === 1);
      expect(critical).toBeDefined();
      expect(critical.category).toBe('jurisdiction_signal');
    });

    it('returns empty when no county match', async () => {
      const sb = createMockSupabase({
        locations: [{ organization_id: ORG, city: 'Fresno', state: 'CA', status: 'active' }],
        intelligence_signals: [
          {
            id: 's1', title: 'LA rule', ai_urgency: 'critical',
            affected_counties: ['Los Angeles County'], published_at: daysAgo(5),
            summary: 'LA only', status: 'published',
          },
        ],
      });
      const result = await generateSignalInsights(ORG, sb);
      expect(result.length).toBe(0);
    });
  });

  describe('generateAllInsights', () => {
    it('sorts by priority and caps at 10', async () => {
      // Create data that generates many insights
      const records = [];
      for (const type of ['hood_cleaning', 'fire_suppression', 'fire_alarm', 'sprinklers']) {
        records.push({
          organization_id: ORG, safeguard_type: type,
          next_due_date: daysFromNow(-10), vendor_name: type,
        });
      }
      const docs = [];
      for (let i = 0; i < 5; i++) {
        docs.push({
          id: `d${i}`, organization_id: ORG, title: `Doc ${i}`,
          expiration_date: daysFromNow(-i - 1), status: 'active', category: 'permit',
        });
      }
      const sb = createMockSupabase({
        vendor_service_records: records,
        documents: docs,
        corrective_actions: Array.from({ length: 12 }, (_, i) => ({
          id: `ca${i}`, organization_id: ORG, title: `CA ${i}`,
          status: 'created', created_at: daysAgo(20), due_date: daysFromNow(-5),
        })),
        temp_logs: [],
        checklists: [],
        checklist_completions: [],
        employee_certifications: [],
        locations: [{ id: 'loc1', organization_id: ORG, city: 'Fresno', state: 'CA', status: 'active' }],
        readiness_snapshots: [],
        intelligence_signals: [],
      });

      const result = await generateAllInsights(ORG, sb);
      expect(result.length).toBeLessThanOrEqual(10);
      // Should be sorted by priority
      for (let i = 1; i < result.length; i++) {
        expect(result[i].priority).toBeGreaterThanOrEqual(result[i - 1].priority);
      }
    });

    it('returns empty or minimal for no data', async () => {
      const sb = createMockSupabase({
        vendor_service_records: [],
        documents: [],
        corrective_actions: [],
        temp_logs: [],
        checklists: [],
        checklist_completions: [],
        employee_certifications: [],
        locations: [],
        readiness_snapshots: [],
        intelligence_signals: [],
      });
      const result = await generateAllInsights(ORG, sb);
      // With no data, no meaningful insights should be generated
      // PSE may flag missing safeguards since no records exist — that's valid
      expect(result.length).toBeLessThanOrEqual(1);
    });
  });
});
