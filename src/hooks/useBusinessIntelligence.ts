import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { demoIntelligence } from '../data/demoData';

// ── Canonical types ─────────────────────────────────────────

export interface ComplianceSnapshot {
  locationId: string;
  locationName: string;
  jurisdictionName: string;
  overallScore: number;
  foodSafetyScore: number | null;
  facilitySafetyScore: number | null;
  vendorScore: number | null;
  checklistsCompletedPct: number | null;
  tempInRangePct: number | null;
  incidentsOpen: number;
  documentsCurrentPct: number | null;
  scoreDate: string;
}

export interface RiskDriver {
  dimension: string;
  factor: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score_impact: number;
}

export interface RiskAssessmentData {
  locationId: string;
  locationName: string;
  operationalRisk: number;
  liabilityRisk: number;
  revenueRisk: number;
  costRisk: number;
  insuranceOverall: number | null;
  insuranceTier: string | null;
  drivers: RiskDriver[];
  intelligenceRefs: string[];
  createdAt: string;
}

export interface JurisdictionInfo {
  locationId: string;
  locationName: string;
  jurisdictionId: string;
  agencyName: string;
  agencyType: string;
  gradingType: string;
  scoringType: string;
  fireAhjName: string | null;
  fireCodeEdition: string | null;
  nfpa96Edition: string | null;
  lastSyncAt: string | null;
  jurisdictionLayer: string;
}

export interface CorrelationInsight {
  id: string;
  title: string;
  headline: string;
  summary: string;
  impactLevel: string;
  urgency: string;
  affectedPillars: string[];
  affectedCounties: string[];
  sourceType: string;
  publishedAt: string | null;
  createdAt: string;
}

export interface ExpiringDocument {
  id: string;
  title: string;
  category: string;
  expirationDate: string;
  locationId: string | null;
  locationName: string | null;
  daysUntilExpiry: number;
}

export interface BusinessIntelligenceData {
  loading: boolean;
  error: string | null;
  complianceSnapshots: ComplianceSnapshot[];
  riskAssessments: RiskAssessmentData[];
  jurisdictions: JurisdictionInfo[];
  correlations: CorrelationInsight[];
  expiringDocuments: ExpiringDocument[];
  hasFacilitySafetyDocs: boolean;
  orgName: string;
  reportDate: string;
}

// ── Demo data transformer ───────────────────────────────────

function foodSafetyStatusToScore(status: string): number {
  switch (status) {
    case 'Compliant': return 95;
    case 'Satisfactory': return 78;
    case 'Action Required': return 45;
    default: return 60;
  }
}

function facilitySafetyVerdictToScore(verdict: string): number {
  return verdict === 'Pass' ? 92 : 38;
}

function riskLevelToScores(level: string): { operational: number; liability: number; revenue: number; cost: number } {
  switch (level) {
    case 'critical': return { operational: 82, liability: 88, revenue: 75, cost: 70 };
    case 'high':     return { operational: 62, liability: 68, revenue: 55, cost: 50 };
    case 'medium':   return { operational: 40, liability: 35, revenue: 30, cost: 28 };
    case 'low':      return { operational: 15, liability: 12, revenue: 10, cost: 8 };
    default:         return { operational: 30, liability: 25, revenue: 20, cost: 18 };
  }
}

function buildDemoData(): Omit<BusinessIntelligenceData, 'loading' | 'error'> {
  const d = demoIntelligence;

  const complianceSnapshots: ComplianceSnapshot[] = (d.complianceMatrix || []).map(loc => ({
    locationId: loc.locationId,
    locationName: loc.locationName,
    jurisdictionName: loc.jurisdiction,
    overallScore: Math.round(
      foodSafetyStatusToScore(loc.foodSafetyStatus) * 0.45 +
      facilitySafetyVerdictToScore(loc.facilitySafetyVerdict) * 0.35 +
      (loc.checklistCompletionRate * 100) * 0.20
    ),
    foodSafetyScore: foodSafetyStatusToScore(loc.foodSafetyStatus),
    facilitySafetyScore: facilitySafetyVerdictToScore(loc.facilitySafetyVerdict),
    vendorScore: Math.round(loc.checklistCompletionRate * 100),
    checklistsCompletedPct: loc.checklistCompletionRate,
    tempInRangePct: loc.tempLogCompletionRate,
    incidentsOpen: loc.openItems,
    documentsCurrentPct: loc.permitExpirations.length === 0 ? 1.0 : 0.7,
    scoreDate: loc.lastInspectionDate,
  }));

  const riskAssessments: RiskAssessmentData[] = (d.complianceMatrix || []).map(loc => {
    const scores = riskLevelToScores(loc.riskLevel);
    const drivers: RiskDriver[] = [];

    if (loc.staffTurnoverRate > 0.3) {
      drivers.push({
        dimension: 'people',
        factor: 'High Staff Turnover',
        description: `${Math.round(loc.staffTurnoverRate * 100)}% annual turnover — 3-week compliance proficiency gap per new hire`,
        severity: loc.staffTurnoverRate > 0.4 ? 'critical' : 'high',
        score_impact: Math.round(loc.staffTurnoverRate * 30),
      });
    }

    if (loc.checklistCompletionRate < 0.8) {
      drivers.push({
        dimension: 'operational',
        factor: 'Low Checklist Completion',
        description: `${Math.round(loc.checklistCompletionRate * 100)}% completion — below 80% threshold`,
        severity: loc.checklistCompletionRate < 0.6 ? 'critical' : 'high',
        score_impact: Math.round((1 - loc.checklistCompletionRate) * 40),
      });
    }

    if (loc.facilitySafetyVerdict === 'Fail') {
      drivers.push({
        dimension: 'liability',
        factor: 'Facility Safety Failure',
        description: 'Active facility safety failure — NFPA 96 (2024) non-compliance',
        severity: 'critical',
        score_impact: 25,
      });
    }

    if (loc.foodSafetyStatus === 'Action Required') {
      drivers.push({
        dimension: 'liability',
        factor: 'Food Safety Action Required',
        description: 'Reinspection required — unresolved major violations',
        severity: 'critical',
        score_impact: 30,
      });
    }

    (loc.permitExpirations || []).forEach(p => {
      drivers.push({
        dimension: 'financial',
        factor: `${p.document} Expiring`,
        description: `Expires in ${p.daysUntilExpiry} days — non-renewal may trigger closure`,
        severity: p.daysUntilExpiry <= 7 ? 'critical' : p.daysUntilExpiry <= 30 ? 'high' : 'medium',
        score_impact: p.daysUntilExpiry <= 7 ? 20 : 10,
      });
    });

    if (loc.tempLogCompletionRate < 0.75) {
      drivers.push({
        dimension: 'operational',
        factor: 'Temp Log Gaps',
        description: `${Math.round(loc.tempLogCompletionRate * 100)}% completion — food safety risk`,
        severity: loc.tempLogCompletionRate < 0.65 ? 'high' : 'medium',
        score_impact: Math.round((1 - loc.tempLogCompletionRate) * 25),
      });
    }

    if (loc.incidentsLast90Days > 0) {
      drivers.push({
        dimension: 'liability',
        factor: 'Recent Incidents',
        description: `${loc.incidentsLast90Days} incident(s) in past 90 days`,
        severity: loc.incidentsLast90Days >= 3 ? 'critical' : loc.incidentsLast90Days >= 2 ? 'high' : 'medium',
        score_impact: loc.incidentsLast90Days * 8,
      });
    }

    return {
      locationId: loc.locationId,
      locationName: loc.locationName,
      operationalRisk: scores.operational,
      liabilityRisk: scores.liability,
      revenueRisk: scores.revenue,
      costRisk: scores.cost,
      insuranceOverall: scores.operational * 0.3 + scores.liability * 0.4 + scores.revenue * 0.2 + scores.cost * 0.1,
      insuranceTier: loc.riskLevel === 'critical' ? 'high' : loc.riskLevel === 'high' ? 'elevated' : loc.riskLevel === 'medium' ? 'standard' : 'preferred',
      drivers,
      intelligenceRefs: [],
      createdAt: new Date().toISOString(),
    };
  });

  const jurisdictions: JurisdictionInfo[] = [
    {
      locationId: 'downtown',
      locationName: 'Downtown Kitchen', // demo
      jurisdictionId: 'fresno-county-food',
      agencyName: 'Fresno County Department of Public Health',
      agencyType: 'county_health',
      gradingType: 'Percentage (0-100)',
      scoringType: 'deduction',
      fireAhjName: 'Fresno City Fire Department',
      fireCodeEdition: 'CBC 2022 / NFPA 96 (2024)',
      nfpa96Edition: '2024',
      lastSyncAt: '2026-02-15T00:00:00Z',
      jurisdictionLayer: 'food_safety',
    },
    {
      locationId: 'airport',
      locationName: 'Airport Cafe', // demo
      jurisdictionId: 'merced-county-food',
      agencyName: 'Merced County Department of Public Health',
      agencyType: 'county_health',
      gradingType: 'Pass/Fail + Score',
      scoringType: 'deduction',
      fireAhjName: 'Merced County Fire Department',
      fireCodeEdition: 'CBC 2022 / NFPA 96 (2024)',
      nfpa96Edition: '2024',
      lastSyncAt: '2026-02-10T00:00:00Z',
      jurisdictionLayer: 'food_safety',
    },
    {
      locationId: 'university',
      locationName: 'University Dining', // demo
      jurisdictionId: 'stanislaus-county-food',
      agencyName: 'Stanislaus County Dept. of Environmental Resources',
      agencyType: 'county_health',
      gradingType: 'Percentage (0-100)',
      scoringType: 'deduction',
      fireAhjName: 'Stanislaus County Fire Authority',
      fireCodeEdition: 'CBC 2022 / NFPA 96 (2024)',
      nfpa96Edition: '2024',
      lastSyncAt: '2026-02-01T00:00:00Z',
      jurisdictionLayer: 'food_safety',
    },
  ];

  const correlations: CorrelationInsight[] = [
    {
      id: 'corr-1',
      title: 'Staff turnover correlation at University Dining', // demo
      headline: 'High turnover driving compliance decline at University Dining', // demo
      summary: '51% annual turnover rate directly correlates with 46-point checklist completion gap. Each 10% turnover reduction estimated to improve compliance by 8-12 points.',
      impactLevel: 'critical',
      urgency: 'immediate',
      affectedPillars: ['food_safety', 'facility_safety'],
      affectedCounties: ['Stanislaus'],
      sourceType: 'ai_pattern',
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'corr-2',
      title: 'Facility safety document cascade risk at Airport Cafe', // demo
      headline: 'Hood cleaning certificate expiry compounds active facility safety failure',
      summary: 'Airport Cafe has an active facility safety failure and hood cleaning certificate expiring in 18 days. If unresolved, AHJ has grounds for immediate enforcement under NFPA 96 (2024).', // demo
      impactLevel: 'high',
      urgency: 'urgent',
      affectedPillars: ['facility_safety'],
      affectedCounties: ['Merced'],
      sourceType: 'ai_pattern',
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];

  const expiringDocuments: ExpiringDocument[] = [];
  (d.complianceMatrix || []).forEach(loc => {
    (loc.permitExpirations || []).forEach((p, i) => {
      expiringDocuments.push({
        id: `${loc.locationId}-doc-${i}`,
        title: p.document,
        category: p.document.toLowerCase().includes('fire') || p.document.toLowerCase().includes('hood') || p.document.toLowerCase().includes('suppression')
          ? 'facility_safety' : 'food_safety',
        expirationDate: new Date(Date.now() + p.daysUntilExpiry * 86400000).toISOString().split('T')[0],
        locationId: loc.locationId,
        locationName: loc.locationName,
        daysUntilExpiry: p.daysUntilExpiry,
      });
    });
  });

  // In demo mode the org has facility safety documents
  const hasFacilitySafetyDocs = expiringDocuments.some(d =>
    d.category === 'facility_safety' ||
    d.title.toLowerCase().includes('fire') ||
    d.title.toLowerCase().includes('hood') ||
    d.title.toLowerCase().includes('suppression') ||
    d.title.toLowerCase().includes('nfpa')
  ) || (d.complianceMatrix || []).some(loc =>
    (loc.permitExpirations || []).some((p: any) => {
      const t = (p.document || '').toLowerCase();
      return t.includes('fire') || t.includes('hood') || t.includes('suppression') || t.includes('nfpa');
    })
  );

  return {
    complianceSnapshots,
    riskAssessments,
    jurisdictions,
    correlations,
    expiringDocuments,
    hasFacilitySafetyDocs,
    orgName: d.orgName,
    reportDate: d.reportDate,
  };
}

// ── Live data fetcher ───────────────────────────────────────

async function fetchLiveData(organizationId: string): Promise<Omit<BusinessIntelligenceData, 'loading' | 'error'>> {
  // 1. Get org name
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single();

  // 2. Get locations
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  const locationMap = new Map((locations || []).map(l => [l.id, l.name]));
  const locationIds = Array.from(locationMap.keys());

  if (locationIds.length === 0) {
    return {
      complianceSnapshots: [],
      riskAssessments: [],
      jurisdictions: [],
      correlations: [],
      expiringDocuments: [],
      orgName: org?.name || 'Your Organization',
      reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    };
  }

  // 3. Most recent compliance_score_snapshots per location
  const { data: snapshots } = await supabase
    .from('compliance_score_snapshots')
    .select('*')
    .eq('organization_id', organizationId)
    .in('location_id', locationIds)
    .order('score_date', { ascending: false });

  // Deduplicate: keep only most recent per location
  const snapshotByLoc = new Map<string, any>();
  (snapshots || []).forEach(s => {
    if (!snapshotByLoc.has(s.location_id)) snapshotByLoc.set(s.location_id, s);
  });

  // 4. Jurisdiction data per location
  const { data: locJurisdictions } = await supabase
    .from('location_jurisdictions')
    .select('location_id, jurisdiction_id, jurisdiction_layer, jurisdictions(agency_name, agency_type, grading_type, scoring_type, fire_ahj_name, fire_code_edition, nfpa96_edition, last_sync_at)')
    .in('location_id', locationIds);

  const jurisdictionByLoc = new Map<string, string>();
  (locJurisdictions || []).forEach(lj => {
    if (lj.jurisdiction_layer === 'food_safety' && (lj as any).jurisdictions?.agency_name) {
      jurisdictionByLoc.set(lj.location_id, (lj as any).jurisdictions.agency_name);
    }
  });

  // 5. Build compliance snapshots
  const complianceSnapshots: ComplianceSnapshot[] = locationIds.map(locId => {
    const snap = snapshotByLoc.get(locId);
    return {
      locationId: locId,
      locationName: locationMap.get(locId) || 'Unknown',
      jurisdictionName: jurisdictionByLoc.get(locId) || 'Not assigned',
      overallScore: snap?.overall_score ?? 0,
      foodSafetyScore: snap?.food_safety_score ?? null,
      facilitySafetyScore: snap?.facility_safety_score ?? null,
      vendorScore: snap?.vendor_score ?? null,
      checklistsCompletedPct: snap?.checklists_completed_pct ?? null,
      tempInRangePct: snap?.temp_in_range_pct ?? null,
      incidentsOpen: snap?.incidents_open ?? 0,
      documentsCurrentPct: snap?.documents_current_pct ?? null,
      scoreDate: snap?.score_date ?? '',
    };
  });

  // 6. Most recent risk_assessments per location
  const { data: riskRows } = await supabase
    .from('risk_assessments')
    .select('*')
    .eq('organization_id', organizationId)
    .in('location_id', locationIds)
    .order('created_at', { ascending: false });

  const riskByLoc = new Map<string, any>();
  (riskRows || []).forEach(r => {
    if (!riskByLoc.has(r.location_id)) riskByLoc.set(r.location_id, r);
  });

  const riskAssessments: RiskAssessmentData[] = locationIds
    .filter(locId => riskByLoc.has(locId))
    .map(locId => {
      const r = riskByLoc.get(locId)!;
      return {
        locationId: locId,
        locationName: locationMap.get(locId) || 'Unknown',
        operationalRisk: r.operational_risk ?? 0,
        liabilityRisk: r.liability_risk ?? 0,
        revenueRisk: r.revenue_risk ?? 0,
        costRisk: r.cost_risk ?? 0,
        insuranceOverall: r.insurance_overall ?? null,
        insuranceTier: r.insurance_tier ?? null,
        drivers: Array.isArray(r.drivers_json) ? r.drivers_json : [],
        intelligenceRefs: Array.isArray(r.intelligence_refs) ? r.intelligence_refs : [],
        createdAt: r.created_at,
      };
    });

  // 7. Jurisdictions
  const jurisdictionsData: JurisdictionInfo[] = (locJurisdictions || [])
    .filter(lj => (lj as any).jurisdictions)
    .map(lj => {
      const j = (lj as any).jurisdictions;
      return {
        locationId: lj.location_id,
        locationName: locationMap.get(lj.location_id) || 'Unknown',
        jurisdictionId: lj.jurisdiction_id,
        agencyName: j.agency_name || 'Unknown Agency',
        agencyType: j.agency_type || '',
        gradingType: j.grading_type || '',
        scoringType: j.scoring_type || '',
        fireAhjName: j.fire_ahj_name || null,
        fireCodeEdition: j.fire_code_edition || null,
        nfpa96Edition: j.nfpa96_edition || null,
        lastSyncAt: j.last_sync_at || null,
        jurisdictionLayer: lj.jurisdiction_layer,
      };
    });

  // 8. Intelligence insights — correlations
  const { data: insights } = await supabase
    .from('intelligence_insights')
    .select('id, title, headline, summary, impact_level, urgency, affected_pillars, affected_counties, source_type, published_at, created_at')
    .eq('status', 'published')
    .in('source_type', ['ai_pattern', 'ai_prediction', 'ai_corrective'])
    .order('created_at', { ascending: false })
    .limit(20);

  const correlations: CorrelationInsight[] = (insights || []).map(ins => ({
    id: ins.id,
    title: ins.title,
    headline: ins.headline,
    summary: ins.summary,
    impactLevel: ins.impact_level,
    urgency: ins.urgency,
    affectedPillars: ins.affected_pillars || [],
    affectedCounties: ins.affected_counties || [],
    sourceType: ins.source_type,
    publishedAt: ins.published_at,
    createdAt: ins.created_at,
  }));

  // 9. Documents expiring within 60 days
  const sixtyDaysFromNow = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, category, expiration_date, location_id')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .not('expiration_date', 'is', null)
    .gte('expiration_date', today)
    .lte('expiration_date', sixtyDaysFromNow);

  const expiringDocuments: ExpiringDocument[] = (docs || []).map(doc => {
    const expDate = new Date(doc.expiration_date);
    const daysUntil = Math.ceil((expDate.getTime() - Date.now()) / 86400000);
    return {
      id: doc.id,
      title: doc.title,
      category: doc.category,
      expirationDate: doc.expiration_date,
      locationId: doc.location_id,
      locationName: doc.location_id ? (locationMap.get(doc.location_id) || null) : null,
      daysUntilExpiry: Math.max(0, daysUntil),
    };
  });

  // Check if org has ANY facility safety documents (not just expiring ones)
  const { count: fireDocCount } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .or('category.eq.facility_safety,title.ilike.%fire%,title.ilike.%hood%,title.ilike.%suppression%,title.ilike.%nfpa%');

  return {
    complianceSnapshots,
    riskAssessments,
    jurisdictions: jurisdictionsData,
    correlations,
    expiringDocuments,
    hasFacilitySafetyDocs: (fireDocCount || 0) > 0,
    orgName: org?.name || 'Your Organization',
    reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  };
}

// ── Hook ────────────────────────────────────────────────────

export function useBusinessIntelligence(): BusinessIntelligenceData {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [data, setData] = useState<Omit<BusinessIntelligenceData, 'loading' | 'error'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (isDemoMode || !profile?.organization_id) {
          const demo = buildDemoData();
          if (!cancelled) setData(demo);
        } else {
          const live = await fetchLiveData(profile.organization_id);
          if (!cancelled) setData(live);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load business intelligence data');
          // Fall back to demo data on error
          setData(buildDemoData());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isDemoMode, profile?.organization_id]);

  return {
    loading,
    error,
    complianceSnapshots: data?.complianceSnapshots || [],
    riskAssessments: data?.riskAssessments || [],
    jurisdictions: data?.jurisdictions || [],
    correlations: data?.correlations || [],
    expiringDocuments: data?.expiringDocuments || [],
    hasFacilitySafetyDocs: data?.hasFacilitySafetyDocs ?? false,
    orgName: data?.orgName || '',
    reportDate: data?.reportDate || '',
  };
}
