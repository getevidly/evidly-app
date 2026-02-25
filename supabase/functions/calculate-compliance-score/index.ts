// supabase/functions/calculate-compliance-score/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoringResult {
  locationId: string;
  jurisdictionId: string;
  jurisdictionName: string;
  scoringType: string;
  gradingType: string;
  pillar: string;
  subComponent: string;
  rawScore: number;
  normalizedScore: number;
  jurisdictionGrade: string;
  gradeDisplay: string;
  passFail: string;
  violations: ViolationDetail[];
  weights: { foodSafety: number; fireSafety: number; ops: number; docs: number };
  calculatedAt: string;
  majorViolations: number;
  minorViolations: number;
  uncorrectedMajors: number;
  imminentHazard: boolean;
}

interface ViolationDetail {
  calcodeSection: string;
  title: string;
  severity: string;
  pointsDeducted: number;
  module: string;
  cdcRiskFactor: boolean;
  status: string;
  correctedOnSite: boolean;
}

interface OverallScore {
  locationId: string;
  overallScore: number;
  foodSafety: PillarScore;
  fireSafety: PillarScore;
  jurisdictions: ScoringResult[];
  weightsUsed: { foodSafety: number; fireSafety: number; ops: number; docs: number };
}

interface PillarScore {
  score: number;
  ops: number;
  docs: number;
  weight: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { location_id, save_to_audit } = await req.json();

    if (!location_id) {
      return new Response(
        JSON.stringify({ error: 'location_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── STEP 1: Get jurisdictions for this location ──
    const { data: locationJurisdictions, error: ljError } = await supabase
      .from('location_jurisdictions')
      .select(`
        jurisdiction_layer,
        is_most_restrictive,
        jurisdictions (
          id, county, city, agency_name, scoring_type, grading_type,
          grading_config, pass_threshold, warning_threshold, critical_threshold,
          violation_weight_map, food_safety_weight, fire_safety_weight,
          ops_weight, docs_weight
        )
      `)
      .eq('location_id', location_id);

    if (ljError || !locationJurisdictions || locationJurisdictions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No jurisdictions found for this location. Run address detection first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── STEP 2: Get CalCode violation map ──
    const { data: calcodeMap } = await supabase
      .from('calcode_violation_map')
      .select('*');

    // ── STEP 3: Get jurisdiction-specific overrides ──
    const jurisdictionIds = locationJurisdictions.map(
      (lj: any) => lj.jurisdictions.id
    );

    const { data: overrides } = await supabase
      .from('jurisdiction_violation_overrides')
      .select('*')
      .in('jurisdiction_id', jurisdictionIds);

    // ── STEP 4: Get compliance data for this location ──
    const complianceData = await getComplianceData(supabase, location_id);

    // ── STEP 5: Calculate score per jurisdiction ──
    const results: ScoringResult[] = [];

    for (const lj of locationJurisdictions) {
      const jurisdiction = (lj as any).jurisdictions;
      const layer = (lj as any).jurisdiction_layer;
      const pillar = layer.includes('fire') ? 'fire_safety' : 'food_safety';

      const opsWeight = (jurisdiction.ops_weight || 60) / 100;
      const docsWeight = (jurisdiction.docs_weight || 40) / 100;

      const jurisdictionOverrides = (overrides || []).filter(
        (o: any) => o.jurisdiction_id === jurisdiction.id
      );

      const opsResult = calculateScore(jurisdiction, calcodeMap || [], jurisdictionOverrides, complianceData, pillar, 'operations');
      const docsResult = calculateScore(jurisdiction, calcodeMap || [], jurisdictionOverrides, complianceData, pillar, 'documentation');

      const pillarRawScore = (opsResult.rawScore * opsWeight) + (docsResult.rawScore * docsWeight);
      const normalizedScore = Math.round(pillarRawScore);

      const allViolations = [...opsResult.violations, ...docsResult.violations];
      const majorViolations = allViolations.filter(
        v => v.status === 'non_compliant' && (v.severity === 'critical' || v.severity === 'major')
      ).length;
      const minorViolations = allViolations.filter(
        v => v.status === 'non_compliant' && v.severity === 'minor'
      ).length;
      const uncorrectedMajors = allViolations.filter(
        v => v.status === 'non_compliant' && (v.severity === 'critical' || v.severity === 'major') && !v.correctedOnSite
      ).length;
      const imminentHazard = checkImminentHazard(allViolations, complianceData);

      const gradeResult = determineGrade(jurisdiction, normalizedScore, {
        majorViolations, uncorrectedMajors, imminentHazard,
        totalPoints: opsResult.totalPoints + docsResult.totalPoints,
      });

      const weights = {
        foodSafety: jurisdiction.food_safety_weight || 60,
        fireSafety: jurisdiction.fire_safety_weight || 40,
        ops: jurisdiction.ops_weight || 60,
        docs: jurisdiction.docs_weight || 40,
      };

      const result: ScoringResult = {
        locationId: location_id,
        jurisdictionId: jurisdiction.id,
        jurisdictionName: jurisdiction.city
          ? `${jurisdiction.city} (${jurisdiction.county} County)`
          : `${jurisdiction.county} County`,
        scoringType: jurisdiction.scoring_type,
        gradingType: jurisdiction.grading_type,
        pillar,
        subComponent: 'combined',
        rawScore: pillarRawScore,
        normalizedScore,
        jurisdictionGrade: gradeResult.grade,
        gradeDisplay: gradeResult.display,
        passFail: gradeResult.passFail,
        violations: allViolations,
        weights,
        calculatedAt: new Date().toISOString(),
        majorViolations,
        minorViolations,
        uncorrectedMajors,
        imminentHazard,
      };

      results.push(result);
      results.push({ ...result, subComponent: 'operations', rawScore: opsResult.rawScore, normalizedScore: Math.round(opsResult.rawScore), violations: opsResult.violations });
      results.push({ ...result, subComponent: 'documentation', rawScore: docsResult.rawScore, normalizedScore: Math.round(docsResult.rawScore), violations: docsResult.violations });
    }

    // ── STEP 6: Calculate overall score ──
    const mostRestrictive = locationJurisdictions.find((lj: any) => lj.is_most_restrictive) || locationJurisdictions[0];
    const mrJurisdiction = (mostRestrictive as any).jurisdictions;

    const foodWeight = (mrJurisdiction.food_safety_weight || 60) / 100;
    const fireWeight = (mrJurisdiction.fire_safety_weight || 40) / 100;

    const foodResults = results.filter(r => r.pillar === 'food_safety' && r.subComponent === 'combined');
    const fireResults = results.filter(r => r.pillar === 'fire_safety' && r.subComponent === 'combined');

    const foodScore = foodResults.length > 0 ? Math.min(...foodResults.map(r => r.normalizedScore)) : 100;
    const fireScore = fireResults.length > 0 ? Math.min(...fireResults.map(r => r.normalizedScore)) : 100;

    const foodOps = results.find(r => r.pillar === 'food_safety' && r.subComponent === 'operations');
    const foodDocs = results.find(r => r.pillar === 'food_safety' && r.subComponent === 'documentation');
    const fireOps = results.find(r => r.pillar === 'fire_safety' && r.subComponent === 'operations');
    const fireDocs = results.find(r => r.pillar === 'fire_safety' && r.subComponent === 'documentation');

    const overallScore: OverallScore = {
      locationId: location_id,
      overallScore: Math.round((foodScore * foodWeight) + (fireScore * fireWeight)),
      foodSafety: { score: foodScore, ops: foodOps?.normalizedScore ?? 100, docs: foodDocs?.normalizedScore ?? 100, weight: mrJurisdiction.food_safety_weight || 60 },
      fireSafety: { score: fireScore, ops: fireOps?.normalizedScore ?? 100, docs: fireDocs?.normalizedScore ?? 100, weight: mrJurisdiction.fire_safety_weight || 40 },
      jurisdictions: results.filter(r => r.subComponent === 'combined'),
      weightsUsed: { foodSafety: mrJurisdiction.food_safety_weight || 60, fireSafety: mrJurisdiction.fire_safety_weight || 40, ops: mrJurisdiction.ops_weight || 60, docs: mrJurisdiction.docs_weight || 40 },
    };

    // ── STEP 7: Save to audit trail ──
    if (save_to_audit !== false) {
      const auditRecords = results.map(r => ({
        location_id: r.locationId, jurisdiction_id: r.jurisdictionId,
        calculation_type: r.pillar, pillar: r.pillar, sub_component: r.subComponent,
        raw_score: r.rawScore, normalized_score: r.normalizedScore,
        jurisdiction_grade: r.jurisdictionGrade, grade_display: r.gradeDisplay, pass_fail: r.passFail,
        inputs: { violations: r.violations, compliance_data: complianceData.summary, major_violations: r.majorViolations, minor_violations: r.minorViolations, uncorrected_majors: r.uncorrectedMajors, imminent_hazard: r.imminentHazard },
        methodology: r.scoringType,
        calculation_details: { scoring_type: r.scoringType, grading_type: r.gradingType, violation_count: r.violations.length, non_compliant_count: r.violations.filter(v => v.status === 'non_compliant').length, major_violations: r.majorViolations, uncorrected_majors: r.uncorrectedMajors },
      }));
      await supabase.from('score_calculations').insert(auditRecords);
    }

    // ── STEP 7b: Write canonical snapshot (Phase 1 — V14 fix) ──
    // Wrapped in try/catch — snapshot write failure must NOT break scoring response
    let snapshotId: string | null = null;
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch organization_id from locations table
      const { data: locData } = await supabase
        .from('locations')
        .select('organization_id')
        .eq('id', location_id)
        .single();

      if (locData?.organization_id) {
        // Compute inputs_hash (SHA-256 of scoring inputs for reproducibility)
        const hashPayload = JSON.stringify({
          summary: complianceData.summary,
          jurisdictionIds,
          weights: overallScore.weightsUsed,
        });
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hashPayload));
        const inputsHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        // Derive operational metrics from compliance data
        const tempTotal = complianceData.tempLogs.length;
        const tempInRange = complianceData.tempLogs.filter((t: any) => t.in_range).length;
        const checkTotal = complianceData.checklists.length;
        const checkPassed = complianceData.checklists.filter((c: any) => c.all_items_passed).length;
        const docTotal = complianceData.documents.length;
        const docExpired = complianceData.summary.expiredDocs;

        // UPSERT to compliance_score_snapshots on (location_id, score_date)
        const { data: snapshotRow } = await supabase
          .from('compliance_score_snapshots')
          .upsert({
            organization_id: locData.organization_id,
            location_id,
            score_date: today,
            overall_score: overallScore.overallScore,
            food_safety_score: overallScore.foodSafety.score,
            fire_safety_score: overallScore.fireSafety.score,
            vendor_score: null,
            temp_readings_count: tempTotal,
            temp_in_range_pct: tempTotal > 0 ? Math.round((tempInRange / tempTotal) * 100) : null,
            checklists_completed_pct: checkTotal > 0 ? Math.round((checkPassed / checkTotal) * 100) : null,
            documents_current_pct: docTotal > 0 ? Math.round(((docTotal - docExpired) / docTotal) * 100) : null,
            model_version: '1.0',
            scoring_engine: 'calculate-compliance-score',
            inputs_hash: inputsHash,
          }, { onConflict: 'location_id,score_date' })
          .select('id')
          .single();

        snapshotId = snapshotRow?.id ?? null;

        // Link audit trail records to this snapshot
        if (snapshotId && save_to_audit !== false) {
          await supabase
            .from('score_calculations')
            .update({ snapshot_id: snapshotId })
            .eq('location_id', location_id)
            .is('snapshot_id', null)
            .gte('created_at', new Date(Date.now() - 60000).toISOString());
        }
      }
    } catch (snapshotErr) {
      // V14 fix is additive — snapshot failure must never break scoring response
      console.error('[STEP 7b] Snapshot write failed:', (snapshotErr as Error).message);
    }

    return new Response(JSON.stringify(overallScore), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

// ═══════════════════════════════════════════════════════════
// SCORING CALCULATION ENGINE — 7 scoring types
// CREDIBILITY-FIRST: Every scoring type maps to what the
// inspector actually does. We mirror CalCode exactly.
// ═══════════════════════════════════════════════════════════

function calculateScore(
  jurisdiction: any, calcodeMap: any[], overrides: any[], complianceData: any, pillar: string, subComponent: string,
): { rawScore: number; violations: ViolationDetail[]; totalPoints: number } {

  const relevantItems = calcodeMap.filter((item: any) => item.evidly_pillar === pillar);
  const items = subComponent === 'operations'
    ? relevantItems.filter((item: any) => ['temperatures', 'checklists', 'equipment'].includes(item.evidly_module))
    : relevantItems.filter((item: any) => ['documents', 'haccp', 'training', 'photos'].includes(item.evidly_module));

  const violations: ViolationDetail[] = [];
  let totalDeductions = 0;
  let totalPoints = 0;
  let majorCount = 0;
  let uncorrectedMajorCount = 0;

  for (const item of items) {
    const override = overrides.find((o: any) => o.calcode_section === item.calcode_section);
    const severity = override?.severity_override || item.severity_default;
    const points = override?.point_deduction_override ?? item.point_deduction_default;
    const status = checkComplianceStatus(item, complianceData);
    const correctedOnSite = status === 'non_compliant' ? checkIfCorrectedOnSite(item, complianceData) : true;

    violations.push({
      calcodeSection: item.calcode_section, title: item.calcode_title, severity,
      pointsDeducted: status === 'non_compliant' ? points : 0,
      module: item.evidly_module, cdcRiskFactor: item.cdc_risk_factor, status, correctedOnSite,
    });

    if (status === 'non_compliant') {
      totalDeductions += points;
      totalPoints += points;
      if (severity === 'critical' || severity === 'major') {
        majorCount++;
        if (!correctedOnSite) uncorrectedMajorCount++;
      }
    }
  }

  complianceData.majorViolationCount = majorCount;
  complianceData.uncorrectedMajorCount = uncorrectedMajorCount;

  let rawScore: number;
  switch (jurisdiction.scoring_type) {
    case 'weighted_deduction':
      rawScore = Math.max(0, 100 - totalDeductions);
      break;
    case 'heavy_weighted': {
      const heavyDeductions = violations.filter(v => v.status === 'non_compliant').reduce((sum, v) => {
        if (v.severity === 'critical' || v.severity === 'major') return sum + 8;
        return sum + 2;
      }, 0);
      rawScore = Math.max(0, 100 - heavyDeductions);
      break;
    }
    case 'major_violation_count':
      if (majorCount <= 1) rawScore = 95;
      else if (majorCount <= 3) rawScore = 80;
      else rawScore = 60;
      break;
    case 'negative_scale':
      rawScore = Math.max(0, 100 - totalDeductions);
      break;
    case 'major_minor_reinspect':
      // CalCode ORFIR Standard (Fresno, San Joaquin, Stanislaus, Tulare, Madera, Mariposa)
      // NOT a numeric score from jurisdiction. Inspector counts majors/minors.
      // Normalized 0-100 internally for dashboard; GRADE shows Pass/Reinspect/Closed.
      rawScore = Math.max(0, 100 - totalDeductions);
      break;
    case 'violation_point_accumulation':
      // Merced County — points ACCUMULATE. Good=0-6, Satisfactory=7-13, Unsatisfactory=14+.
      rawScore = Math.max(0, 100 - totalPoints);
      break;
    case 'report_only':
      // DEPRECATED — treat same as major_minor_reinspect
      rawScore = Math.max(0, 100 - totalDeductions);
      break;
    default:
      rawScore = Math.max(0, 100 - totalDeductions);
  }

  return { rawScore, violations, totalPoints };
}

// ═══════════════════════════════════════════════════════════
// IMMINENT HEALTH HAZARD CHECK — CalCode §113985
// Same standard in ALL 62 CA jurisdictions
// ═══════════════════════════════════════════════════════════

function checkImminentHazard(violations: ViolationDetail[], complianceData: any): boolean {
  const uncorrectedCritical = violations.filter(
    v => v.status === 'non_compliant' && v.severity === 'critical' && !v.correctedOnSite
  );
  if (uncorrectedCritical.length >= 3) return true;
  if (complianceData.summary.imminentHazardFlags?.length > 0) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════
// GRADE DETERMINATION — 8 grading types
// CREDIBILITY-FIRST: Each mirrors exactly what the jurisdiction displays.
// ═══════════════════════════════════════════════════════════

function determineGrade(
  jurisdiction: any, score: number,
  violationData: { majorViolations: number; uncorrectedMajors: number; imminentHazard: boolean; totalPoints: number },
): { grade: string; display: string; passFail: string } {
  const config = jurisdiction.grading_config || {};

  // Imminent hazard = closure in ALL jurisdictions
  if (violationData.imminentHazard) {
    return { grade: 'CLOSED', display: 'Closed — Imminent Health Hazard', passFail: 'closed' };
  }

  switch (jurisdiction.grading_type) {
    case 'letter_grade': {
      const grades = config.grades || { A: [90, 100], B: [80, 89], C: [70, 79] };
      const failBelow = config.fail_below || 70;
      let letter = 'F';
      if (grades.A && score >= grades.A[0]) letter = 'A';
      else if (grades.B && score >= grades.B[0]) letter = 'B';
      else if (grades.C && score >= grades.C[0]) letter = 'C';
      return { grade: letter, display: `${letter} — ${score}`, passFail: score >= failBelow ? 'pass' : 'fail' };
    }

    case 'letter_grade_strict': {
      let letter = 'F';
      if (score >= 90) letter = 'A';
      else if (score >= 80) letter = 'B';
      else if (score >= 70) letter = 'C';
      const passRequires = config.pass_requires || 'A';
      const passing = (passRequires === 'A' && score >= 90) || (passRequires === 'B' && score >= 80) || (passRequires === 'C' && score >= 70);
      return { grade: letter, display: passing ? `${letter} — PASS` : `${letter} — FAIL`, passFail: passing ? 'pass' : 'fail' };
    }

    case 'color_placard': {
      const greenMax = config.green?.max_majors ?? 1;
      const yellowMax = config.yellow?.max_majors ?? 3;
      if (violationData.majorViolations <= greenMax) return { grade: 'Green', display: 'Green', passFail: 'pass' };
      if (violationData.majorViolations <= yellowMax) return { grade: 'Yellow', display: 'Yellow', passFail: 'warning' };
      return { grade: 'Red', display: 'Red', passFail: 'fail' };
    }

    case 'score_100': {
      const threshold = jurisdiction.pass_threshold || 70;
      return { grade: String(score), display: String(score), passFail: score >= threshold ? 'pass' : 'fail' };
    }

    case 'score_negative': {
      const negativeScore = score - 100;
      const warning = config.warning || -10;
      const critical = config.critical || -25;
      let passFail = 'pass';
      if (negativeScore <= critical) passFail = 'fail';
      else if (negativeScore <= warning) passFail = 'warning';
      return { grade: String(negativeScore), display: String(negativeScore), passFail };
    }

    case 'pass_reinspect': {
      // CalCode ORFIR Standard — Pass / Reinspection Required / Closed
      if (violationData.uncorrectedMajors === 0) {
        const minorNote = violationData.majorViolations > 0 ? ` (${violationData.majorViolations} major corrected on-site)` : '';
        return { grade: 'Pass', display: `Pass${minorNote}`, passFail: 'pass' };
      }
      return {
        grade: 'Reinspection Required',
        display: `Reinspection Required — ${violationData.uncorrectedMajors} Major Violation${violationData.uncorrectedMajors > 1 ? 's' : ''}`,
        passFail: 'fail',
      };
    }

    case 'three_tier_rating': {
      // Merced County — points accumulate, rating from thresholds
      const tiers = config.tiers || { Good: [0, 6], Satisfactory: [7, 13], Unsatisfactory: [14, null] };
      const points = violationData.totalPoints;
      if (points >= (tiers.Unsatisfactory?.[0] || 14)) return { grade: 'Unsatisfactory', display: `Unsatisfactory — ${points} points`, passFail: 'fail' };
      if (points >= (tiers.Satisfactory?.[0] || 7)) return { grade: 'Satisfactory', display: `Satisfactory — ${points} points`, passFail: 'pass' };
      return { grade: 'Good', display: `Good — ${points} points`, passFail: 'pass' };
    }

    case 'report_only':
    default:
      // DEPRECATED — treat same as pass_reinspect
      if (violationData.uncorrectedMajors === 0) return { grade: 'Pass', display: 'Pass', passFail: 'pass' };
      return {
        grade: 'Reinspection Required',
        display: `Reinspection Required — ${violationData.uncorrectedMajors} Major Violation${violationData.uncorrectedMajors > 1 ? 's' : ''}`,
        passFail: 'fail',
      };
  }
}

// ═══════════════════════════════════════════════════════════
// COMPLIANCE DATA RETRIEVAL
// ═══════════════════════════════════════════════════════════

async function getComplianceData(supabase: any, locationId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: tempLogs } = await supabase.from('temperature_logs').select('id, recorded_at, temperature, in_range').eq('location_id', locationId).gte('recorded_at', sevenDaysAgo).order('recorded_at', { ascending: false }).limit(50);
  const { data: checklists } = await supabase.from('checklist_completions').select('id, completed_at, checklist_type, all_items_passed').eq('location_id', locationId).gte('completed_at', sevenDaysAgo).order('completed_at', { ascending: false }).limit(50);
  const { data: documents } = await supabase.from('documents').select('id, document_type, expires_at, status').eq('location_id', locationId).eq('status', 'active');
  const { data: equipment } = await supabase.from('equipment').select('id, equipment_type, last_service_date, next_service_date, status').eq('location_id', locationId);
  const { data: haccpPlans } = await supabase.from('haccp_plans').select('id, status, last_reviewed_at').eq('location_id', locationId);
  const { data: training } = await supabase.from('training_records').select('id, training_type, expires_at, status').eq('location_id', locationId);

  return {
    tempLogs: tempLogs || [], checklists: checklists || [], documents: documents || [],
    equipment: equipment || [], haccpPlans: haccpPlans || [], training: training || [],
    majorViolationCount: 0, uncorrectedMajorCount: 0,
    summary: {
      tempLogsLast7Days: (tempLogs || []).length,
      checklistsLast7Days: (checklists || []).length,
      outOfRangeTemps: (tempLogs || []).filter((t: any) => !t.in_range).length,
      expiredDocs: (documents || []).filter((d: any) => d.expires_at && new Date(d.expires_at) < new Date()).length,
      overdueEquipment: (equipment || []).filter((e: any) => e.next_service_date && new Date(e.next_service_date) < new Date()).length,
      expiredTraining: (training || []).filter((t: any) => t.expires_at && new Date(t.expires_at) < new Date()).length,
      imminentHazardFlags: [],
    },
  };
}

// ═══════════════════════════════════════════════════════════
// COMPLIANCE STATUS CHECK
// ═══════════════════════════════════════════════════════════

function checkComplianceStatus(calcodeItem: any, complianceData: any): string {
  switch (calcodeItem.evidly_module) {
    case 'temperatures': {
      if (complianceData.tempLogs.length === 0) return 'non_compliant';
      const outOfRange = complianceData.tempLogs.filter((t: any) => !t.in_range);
      if (outOfRange.length > complianceData.tempLogs.length * 0.1) return 'non_compliant';
      return 'compliant';
    }
    case 'checklists': {
      if (complianceData.checklists.length === 0) return 'non_compliant';
      const failed = complianceData.checklists.filter((c: any) => !c.all_items_passed);
      if (failed.length > complianceData.checklists.length * 0.2) return 'non_compliant';
      return 'compliant';
    }
    case 'documents':
      return complianceData.summary.expiredDocs > 0 ? 'non_compliant' : 'compliant';
    case 'equipment':
      return complianceData.summary.overdueEquipment > 0 ? 'non_compliant' : 'compliant';
    case 'haccp': {
      if (complianceData.haccpPlans.length === 0) return 'not_assessed';
      return complianceData.haccpPlans.find((h: any) => h.status === 'active') ? 'compliant' : 'non_compliant';
    }
    case 'training':
      return complianceData.summary.expiredTraining > 0 ? 'non_compliant' : 'compliant';
    default:
      return 'not_assessed';
  }
}

// ═══════════════════════════════════════════════════════════
// CORRECTED-ON-SITE CHECK
// For major_minor_reinspect: was the violation corrected same day?
// ═══════════════════════════════════════════════════════════

function checkIfCorrectedOnSite(calcodeItem: any, complianceData: any): boolean {
  switch (calcodeItem.evidly_module) {
    case 'temperatures': {
      const recentLogs = complianceData.tempLogs.slice(0, 5);
      if (recentLogs.length > 0 && recentLogs[0].in_range) return true;
      return false;
    }
    case 'checklists': {
      const recent = complianceData.checklists[0];
      if (recent && recent.all_items_passed) return true;
      return false;
    }
    default:
      return false;
  }
}
