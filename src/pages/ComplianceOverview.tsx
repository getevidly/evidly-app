// ============================================================
// ComplianceOverview — Dual-Pillar Compliance Status Page
// ============================================================
// GAP-14: Food Safety + Facility Safety displayed side by side.
// GAP-12: Multi-AHJ support — primary + federal overlay cards
//         with worst-case compliance resolution.
//
// Each pillar scores independently using its own jurisdiction
// methodology. NO combined score, NO unified math.
//
// Data sources:
//   Food Safety  → useComplianceEngine → jurisdictionResult
//   Facility Safety → JURISDICTION_DATABASE + DEMO_LOCATION_GRADE_OVERRIDES
//   Inspection dates → demoIntelligence.complianceMatrix
//   Yosemite (multi-AHJ) → DEMO_LOCATIONS + demoLocationJurisdictions
//
// All scores/grades/thresholds from jurisdiction config — never hardcoded.
// ============================================================

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle, ClipboardCheck,
  UtensilsCrossed, Flame, Info, Calendar, Shield,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { FireStatusBars } from '../components/shared/FireStatusBars';
import { useComplianceEngine } from '../hooks/useComplianceEngine';
import { useDemo } from '../contexts/DemoContext';
import { locations, demoIntelligence, type ScoreImpactItem } from '../data/demoData';
import {
  DEMO_LOCATION_GRADE_OVERRIDES,
  DEMO_LOCATIONS,
  demoLocationJurisdictions,
} from '../data/demoJurisdictions';
import { JURISDICTION_DATABASE } from '../data/jurisdictionData';
import { getReadinessColor } from '../utils/inspectionReadiness';
import {
  DEMO_CORRECTIVE_ACTIONS,
  isOverdue as isCAOverdue,
  SEVERITY_LABELS,
  type CorrectiveActionItem,
} from '../data/correctiveActionsDemoData';

// ── Brand Colors (EvidLY spec) ───────────────────────────────

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

// ── Location-to-override-key mapping ─────────────────────────

const LOCATION_OVERRIDE_KEY: Record<string, string> = {
  downtown: 'demo-loc-downtown',
  airport: 'demo-loc-airport',
  university: 'demo-loc-university',
  yosemite: 'demo-loc-yosemite',
};

const LOCATION_COUNTY: Record<string, string> = {
  downtown: 'Fresno',
  airport: 'Merced',
  university: 'Stanislaus',
  yosemite: 'Mariposa',
};

// ── Yosemite static data (no engine — uses DEMO_LOCATIONS) ───

const YOSEMITE_DATA = DEMO_LOCATIONS.find(l => l.id === 'demo-loc-yosemite');

// ── All location tabs (3 from demoData + Yosemite multi-AHJ) ─

const ALL_LOCATION_TABS = [
  ...locations.map(l => ({ urlId: l.urlId, name: l.name })),
  { urlId: 'yosemite', name: 'Yosemite (Aramark)' },
];

// ── Inspection date lookup from demoIntelligence ─────────────

const INSPECTION_DATES: Record<string, string> = {};
for (const row of demoIntelligence.complianceMatrix) {
  INSPECTION_DATES[row.locationId] = row.lastInspectionDate;
}
// Yosemite: static demo date
INSPECTION_DATES['yosemite'] = '2026-02-10';

// ── Jurisdiction authority lookup ─────────────────────────────

function getJurisdictionEntry(county: string, pillar: 'food_safety' | 'facility_safety') {
  return JURISDICTION_DATABASE.find(
    j => j.county === county && j.pillar === pillar,
  );
}

// ── Worst-case status resolution (GAP-12) ────────────────────
// When multiple AHJs exist, compliance = MORE STRINGENT outcome

type JurisdictionStatus = 'passing' | 'failing' | 'at_risk';

const STATUS_SEVERITY: Record<JurisdictionStatus, number> = {
  passing: 0,
  at_risk: 1,
  failing: 2,
};

function worstCaseStatus(a: JurisdictionStatus, b: JurisdictionStatus): JurisdictionStatus {
  return STATUS_SEVERITY[a] >= STATUS_SEVERITY[b] ? a : b;
}

// ── Status colors ────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  passing: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', dot: '#16a34a' },
  at_risk: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: '#d97706' },
  failing: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', dot: '#dc2626' },
};

// ── Progress Bar ──────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Status Icon ───────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'current': return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />;
    case 'overdue':
    case 'expired':
    case 'missing': return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
    case 'due_soon':
    case 'expiring': return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
    default: return null;
  }
}

// ── Status label ──────────────────────────────────────────────

function statusLabel(status: string): string {
  switch (status) {
    case 'current': return 'Current';
    case 'overdue': return 'Overdue';
    case 'expired': return 'Expired';
    case 'due_soon': return 'Due Soon';
    case 'missing': return 'Missing';
    default: return status;
  }
}

// ── Score display: "\u2014" when unavailable ───────────────────────

function scoreDisplay(score: number | null | undefined): string {
  if (score === null || score === undefined || score === 0) return '\u2014';
  return String(score);
}

// ── Date formatting ───────────────────────────────────────────

function formatInspectionDate(dateStr: string | undefined): string {
  if (!dateStr) return 'No inspections on record';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'No inspections on record';
  }
}

// ── Pillar Card Loading Skeleton ──────────────────────────────

function PillarSkeleton({ pillar }: { pillar: 'food_safety' | 'facility_safety' }) {
  const Icon = pillar === 'food_safety' ? UtensilsCrossed : Flame;
  const label = pillar === 'food_safety' ? 'Food Safety' : 'Facility Safety';
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <Icon className="w-5 h-5 text-gray-300" />
        <h2 className="text-lg font-bold text-gray-400">{label}</h2>
      </div>
      <div className="p-4 sm:p-5 space-y-4">
        <div className="h-20 bg-gray-100 rounded-lg" />
        <div className="h-16 bg-gray-100 rounded-lg" />
        <div className="h-12 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}

// ── AHJ Card (single authority display) ──────────────────────

interface AhjCardProps {
  label: string;
  grade: string;
  summary: string;
  authority: string;
  status: JurisdictionStatus;
  lastInspectionDate?: string;
  isFederal?: boolean;
}

function AhjCard({ label, grade, summary, authority, status, lastInspectionDate, isFederal }: AhjCardProps) {
  const statusColors = STATUS_COLORS[status] || STATUS_COLORS.at_risk;
  return (
    <div className={`rounded-lg p-4 border ${statusColors.bg} ${statusColors.border}`}>
      <div className="flex items-start gap-3">
        <div
          className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
          style={{ backgroundColor: statusColors.dot }}
        />
        <div className="flex-1">
          {/* AHJ label (Primary / Federal Overlay) */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider"
              style={{
                color: isFederal ? '#92400e' : NAVY,
                backgroundColor: isFederal ? '#fef3c7' : '#F0F3F7',
                border: `1px solid ${isFederal ? '#fbbf24' : '#D1D9E6'}`,
              }}
            >
              {label}
            </span>
          </div>
          <div className={`text-base font-bold ${statusColors.text}`}>
            {grade || '\u2014'}
          </div>
          <div className="text-sm text-gray-600 mt-1">{summary}</div>
          <div className="text-xs text-gray-400 mt-2">
            Authority: {authority}
          </div>
          {lastInspectionDate && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
              <Calendar className="w-3 h-3" />
              <span>Last inspection: {formatInspectionDate(lastInspectionDate)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pillar Panel ──────────────────────────────────────────────

interface FederalOverlayData {
  grade: string;
  summary: string;
  authority: string;
  status: JurisdictionStatus;
}

interface PillarPanelProps {
  pillar: 'food_safety' | 'facility_safety';
  score: number | null;
  opsScore: number | null;
  docsScore: number | null;
  jurisdictionGrade: string;
  jurisdictionSummary: string;
  jurisdictionAuthority: string;
  jurisdictionStatus: JurisdictionStatus;
  jurisdictionConfigured: boolean;
  lastInspectionDate?: string;
  impactItems: ScoreImpactItem[];
  facilityStatusBars?: {
    permitStatus: string;
    hoodStatus: string;
    extinguisherStatus: string;
    ansulStatus: string;
  };
  onEquipmentClick?: (key: string) => void;
  federalOverlay?: FederalOverlayData;
}

function PillarPanel({
  pillar, score, opsScore, docsScore,
  jurisdictionGrade, jurisdictionSummary, jurisdictionAuthority,
  jurisdictionStatus, jurisdictionConfigured, lastInspectionDate,
  impactItems, facilityStatusBars, onEquipmentClick,
  federalOverlay,
}: PillarPanelProps) {
  const isFoodSafety = pillar === 'food_safety';
  const Icon = isFoodSafety ? UtensilsCrossed : Flame;
  const label = isFoodSafety ? 'Food Safety' : 'Facility Safety';
  const hasScore = score !== null && score !== undefined && score > 0;
  const scoreColor = hasScore ? getReadinessColor(score!) : '#94a3b8';
  const opsColor = opsScore && opsScore > 0 ? getReadinessColor(opsScore) : '#94a3b8';
  const docsColor = docsScore && docsScore > 0 ? getReadinessColor(docsScore) : '#94a3b8';

  // Worst-case resolution: if federal overlay exists, use more stringent status
  const resolvedStatus = federalOverlay
    ? worstCaseStatus(jurisdictionStatus, federalOverlay.status)
    : jurisdictionStatus;
  const hasMultiAhj = !!federalOverlay;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Pillar Header */}
      <div
        className="px-4 sm:px-5 py-4 border-b flex items-center gap-3"
        style={{ borderBottomColor: '#E5E7EB' }}
      >
        <Icon className="w-5 h-5" style={{ color: hasScore ? scoreColor : NAVY }} />
        <h2 className="text-lg font-bold" style={{ color: NAVY }}>{label}</h2>
        {hasMultiAhj && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"
            style={{ color: '#92400e', backgroundColor: '#fef3c7', border: '1px solid #fbbf24' }}
          >
            <Shield className="w-3 h-3" />
            Multi-AHJ
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* ── Section 1: Jurisdiction Status ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <EvidlyIcon size={16} />
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: NAVY }}>
              Jurisdiction Status
            </h3>
            {hasMultiAhj && (
              <span className="text-[10px] text-gray-400">
                Resolved: {resolvedStatus === 'passing' ? 'Passing' : resolvedStatus === 'at_risk' ? 'At Risk' : 'Failing'}
              </span>
            )}
          </div>

          {jurisdictionConfigured ? (
            <div className="space-y-3">
              {/* Primary AHJ */}
              <AhjCard
                label={hasMultiAhj ? 'Primary AHJ' : 'Authority'}
                grade={jurisdictionGrade}
                summary={jurisdictionSummary}
                authority={jurisdictionAuthority}
                status={jurisdictionStatus}
                lastInspectionDate={lastInspectionDate}
              />

              {/* Federal Overlay AHJ (GAP-12) */}
              {federalOverlay && (
                <AhjCard
                  label="Federal Overlay"
                  grade={federalOverlay.grade}
                  summary={federalOverlay.summary}
                  authority={federalOverlay.authority}
                  status={federalOverlay.status}
                  isFederal
                />
              )}
            </div>
          ) : (
            <div className="rounded-lg p-4 border border-gray-200 bg-gray-50">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    {label} jurisdiction not configured
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    No verified jurisdiction methodology is available for {label.toLowerCase()} at this location.
                  </div>
                  <button
                    onClick={() => alert('Contact your EvidLY account manager to configure jurisdiction scoring.')}
                    className="text-xs font-medium mt-2 hover:underline"
                    style={{ color: NAVY }}
                  >
                    Configure jurisdiction &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2: EvidLY Score ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="w-4 h-4" style={{ color: NAVY }} />
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: NAVY }}>
              EvidLY Score
            </h3>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider border"
              style={{ color: NAVY, backgroundColor: '#F0F3F7', borderColor: '#D1D9E6' }}
            >
              EvidLY Internal
            </span>
          </div>

          <div className="space-y-3">
            {/* Overall pillar score */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overall</span>
              <span className="text-xl font-bold" style={{ color: hasScore ? scoreColor : '#94a3b8' }}>
                {scoreDisplay(score)}
              </span>
            </div>
            {hasScore && <ProgressBar value={score!} color={scoreColor} />}

            {/* Sub-scores */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Operations</div>
                <div className="text-lg font-bold" style={{ color: opsColor }}>
                  {scoreDisplay(opsScore)}
                </div>
                {opsScore != null && opsScore > 0 && <ProgressBar value={opsScore} color={opsColor} />}
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Documentation</div>
                <div className="text-lg font-bold" style={{ color: docsColor }}>
                  {scoreDisplay(docsScore)}
                </div>
                {docsScore != null && docsScore > 0 && <ProgressBar value={docsScore} color={docsColor} />}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 3: Fire Equipment Status (Facility Safety only) ── */}
        {facilityStatusBars && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Equipment &amp; Permit Status
            </div>
            <FireStatusBars
              permitStatus={facilityStatusBars.permitStatus as any}
              hoodStatus={facilityStatusBars.hoodStatus as any}
              extinguisherStatus={facilityStatusBars.extinguisherStatus as any}
              ansulStatus={facilityStatusBars.ansulStatus as any}
              onCardClick={onEquipmentClick}
            />
          </div>
        )}

        {/* ── Section 4: Tracked Items ── */}
        {impactItems.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Tracked Items
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
              {impactItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-3 sm:px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-800">{item.label}</span>
                  </div>
                  <span className={`text-xs font-medium ${
                    item.status === 'current' ? 'text-green-600'
                      : item.status === 'due_soon' ? 'text-amber-600'
                        : 'text-red-600'
                  }`}>
                    {statusLabel(item.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export function ComplianceOverview() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const params = new URLSearchParams(window.location.search);
  const locationParam = params.get('location') || 'downtown';
  const isYosemite = locationParam === 'yosemite';

  const compliance = useComplianceEngine(
    ['downtown', 'airport', 'university'],
    isDemoMode,
  );

  // Live mode: empty state
  if (!isDemoMode) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No compliance data yet</h2>
          <p className="text-sm text-gray-500 mb-6">
            Add locations and complete checklists to see your compliance overview.
          </p>
          <button
            onClick={() => navigate('/org-hierarchy')}
            className="px-5 py-2.5 text-sm font-medium text-white rounded-lg mb-3"
            style={{ backgroundColor: NAVY }}
          >
            Add Location
          </button>
          <br />
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm font-medium hover:underline"
            style={{ color: NAVY }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Location display name
  const selectedLocation = isYosemite
    ? { name: 'Yosemite (Aramark)', urlId: 'yosemite' }
    : locations.find(l => l.urlId === locationParam) || locations[0];

  const overrideKey = LOCATION_OVERRIDE_KEY[locationParam] || 'demo-loc-downtown';
  const gradeData = DEMO_LOCATION_GRADE_OVERRIDES[overrideKey];
  const county = LOCATION_COUNTY[locationParam] || 'California';
  const lastInspection = INSPECTION_DATES[locationParam];

  // Jurisdiction data for multi-AHJ detection
  const jurisdictionData = demoLocationJurisdictions[overrideKey];
  const hasFoodOverlay = !!jurisdictionData?.federalFoodOverlay;
  const hasFireOverlay = !!jurisdictionData?.federalFireOverlay;

  // Engine results (null for Yosemite — uses static DEMO_LOCATIONS data)
  const engineResult = isYosemite ? null : compliance.results[locationParam];

  // ── Food safety jurisdiction ──────────────────────────────
  const foodJurisdiction = useMemo(() => {
    const jEntry = getJurisdictionEntry(county, 'food_safety');

    if (isYosemite) {
      // Yosemite: use grade overrides directly
      return {
        configured: true,
        grade: gradeData.foodSafety.gradeDisplay,
        summary: gradeData.foodSafety.summary,
        authority: jEntry?.agencyName || 'Mariposa County Environmental Health',
        status: gradeData.foodSafety.status,
      };
    }

    if (!engineResult?.jurisdictionResult) {
      return { configured: false, grade: '', summary: '', authority: '', status: 'at_risk' as const };
    }
    const jr = engineResult.jurisdictionResult;
    if (jr.systemType === 'none') {
      return { configured: false, grade: '', summary: '', authority: '', status: 'at_risk' as const };
    }
    return {
      configured: true,
      grade: gradeData.foodSafety.gradeDisplay,
      summary: gradeData.foodSafety.summary,
      authority: jEntry?.agencyName || jr.countyName,
      status: gradeData.foodSafety.status,
    };
  }, [engineResult, gradeData, county, isYosemite]);

  // ── Food safety federal overlay (GAP-12) ──────────────────
  const foodFederalOverlay = useMemo((): FederalOverlayData | undefined => {
    if (!hasFoodOverlay || !jurisdictionData?.federalFoodOverlay) return undefined;
    const overlay = jurisdictionData.federalFoodOverlay;
    const details = gradeData.foodSafety.details;
    return {
      grade: details?.federalStatus === 'passing' ? 'In Compliance' : 'Priority Violation',
      summary: `${overlay.code_basis} \u2014 federal inspection program`,
      authority: overlay.agency_name,
      status: (details?.federalStatus as JurisdictionStatus) || 'passing',
    };
  }, [hasFoodOverlay, jurisdictionData, gradeData]);

  // ── Facility safety jurisdiction ──────────────────────────
  const facilityJurisdiction = useMemo(() => {
    const jEntry = getJurisdictionEntry(county, 'facility_safety');
    const fs = gradeData.facilitySafety;

    // If all statuses are 'no_status', jurisdiction data is pending
    const allNoStatus = fs.permitStatus === 'no_status' &&
      fs.hoodStatus === 'no_status' &&
      fs.extinguisherStatus === 'no_status' &&
      fs.ansulStatus === 'no_status';

    return {
      configured: !allNoStatus,
      grade: fs.gradeDisplay,
      summary: fs.summary,
      authority: jEntry?.agencyName || jurisdictionData?.facilitySafety?.agency_name || 'NFPA 96 (2024)',
      status: fs.status,
    };
  }, [gradeData, county, jurisdictionData]);

  // ── Facility safety federal overlay (GAP-12) ──────────────
  const facilityFederalOverlay = useMemo((): FederalOverlayData | undefined => {
    if (!hasFireOverlay || !jurisdictionData?.federalFireOverlay) return undefined;
    const overlay = jurisdictionData.federalFireOverlay;
    return {
      grade: 'Compliant',
      summary: `${overlay.code_basis} \u2014 federal fire management`,
      authority: overlay.agency_name,
      status: 'passing' as JurisdictionStatus,
    };
  }, [hasFireOverlay, jurisdictionData]);

  // ── Scores (engine for standard, static for Yosemite) ─────
  const foodScore = isYosemite
    ? (YOSEMITE_DATA ? Math.round((YOSEMITE_DATA.foodSafety.ops + YOSEMITE_DATA.foodSafety.docs) / 2) : null)
    : (engineResult?.foodSafetyScore ?? null);
  const foodOps = isYosemite ? (YOSEMITE_DATA?.foodSafety.ops ?? null) : (engineResult?.foodSafetyOps ?? null);
  const foodDocs = isYosemite ? (YOSEMITE_DATA?.foodSafety.docs ?? null) : (engineResult?.foodSafetyDocs ?? null);

  const facilityScore = isYosemite
    ? (YOSEMITE_DATA ? Math.round((YOSEMITE_DATA.facilitySafety.ops + YOSEMITE_DATA.facilitySafety.docs) / 2) : null)
    : (engineResult?.facilitySafetyScore ?? null);
  const facilityOps = isYosemite ? (YOSEMITE_DATA?.facilitySafety.ops ?? null) : (engineResult?.facilitySafetyOps ?? null);
  const facilityDocs = isYosemite ? (YOSEMITE_DATA?.facilitySafety.docs ?? null) : (engineResult?.facilitySafetyDocs ?? null);

  // Filter impact items by pillar
  const foodItems = useMemo(() => {
    if (!engineResult) return [];
    return engineResult.scoreImpactItems.filter(i => i.pillar === 'Food Safety');
  }, [engineResult]);

  const facilityItems = useMemo(() => {
    if (!engineResult) return [];
    return engineResult.scoreImpactItems.filter(i => i.pillar === 'Facility Safety');
  }, [engineResult]);

  // Equipment click handler
  const handleEquipmentClick = (key: string) => {
    const routes: Record<string, string> = {
      permit: '/equipment?category=permit',
      extinguisher: '/equipment?category=fire_extinguisher',
      hood: '/calendar?category=hood_cleaning',
      ansul: '/calendar?category=fire_suppression',
    };
    navigate(routes[key] || '/equipment');
  };

  // Determine if data is ready (engine loaded or Yosemite static)
  const dataReady = isYosemite || !!engineResult;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: selectedLocation.name, href: isYosemite ? undefined : `/dashboard?location=${locationParam}` },
        { label: 'Compliance Overview' },
      ]} />

      {/* Header */}
      <div>
        <button
          onClick={() => navigate(isYosemite ? '/dashboard' : `/dashboard?location=${locationParam}`)}
          className="flex items-center gap-1 text-sm font-medium transition-colors mb-2 min-h-[44px]"
          style={{ color: NAVY }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Compliance Overview</h1>
        <p className="text-gray-500 text-sm mt-1">
          {selectedLocation.name} &mdash; {county} County
          {(hasFoodOverlay || hasFireOverlay) && (
            <span className="ml-2 text-amber-700 font-medium">(Multi-AHJ)</span>
          )}
        </p>
      </div>

      {/* Location Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {ALL_LOCATION_TABS.map(loc => (
          <button
            key={loc.urlId}
            onClick={() => navigate(`/compliance-overview?location=${loc.urlId}`)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors min-h-[44px] ${
              loc.urlId === locationParam
                ? 'bg-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={loc.urlId === locationParam ? { color: NAVY } : undefined}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Dual Pillar Layout — independent loading per card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Food Safety */}
        {dataReady ? (
          <PillarPanel
            pillar="food_safety"
            score={foodScore}
            opsScore={foodOps}
            docsScore={foodDocs}
            jurisdictionGrade={foodJurisdiction.grade}
            jurisdictionSummary={foodJurisdiction.summary}
            jurisdictionAuthority={foodJurisdiction.authority}
            jurisdictionStatus={foodJurisdiction.status}
            jurisdictionConfigured={foodJurisdiction.configured}
            lastInspectionDate={lastInspection}
            impactItems={foodItems}
            federalOverlay={foodFederalOverlay}
          />
        ) : (
          <PillarSkeleton pillar="food_safety" />
        )}

        {/* Facility Safety */}
        {dataReady ? (
          <PillarPanel
            pillar="facility_safety"
            score={facilityScore}
            opsScore={facilityOps}
            docsScore={facilityDocs}
            jurisdictionGrade={facilityJurisdiction.grade}
            jurisdictionSummary={facilityJurisdiction.summary}
            jurisdictionAuthority={facilityJurisdiction.authority}
            jurisdictionStatus={facilityJurisdiction.status}
            jurisdictionConfigured={facilityJurisdiction.configured}
            lastInspectionDate={lastInspection}
            impactItems={facilityItems}
            facilityStatusBars={{
              permitStatus: gradeData.facilitySafety.permitStatus,
              hoodStatus: gradeData.facilitySafety.hoodStatus,
              extinguisherStatus: gradeData.facilitySafety.extinguisherStatus,
              ansulStatus: gradeData.facilitySafety.ansulStatus,
            }}
            onEquipmentClick={handleEquipmentClick}
            federalOverlay={facilityFederalOverlay}
          />
        ) : (
          <PillarSkeleton pillar="facility_safety" />
        )}
      </div>

      {/* Corrective Actions for selected location */}
      {!isYosemite && <CorrectiveActionsSummary locationId={locationParam} navigate={navigate} />}
    </div>
  );
}

// ── Corrective Actions Summary (per-location) ───────────────

const SEV_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
  high:     { color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  medium:   { color: '#1e4d6b', bg: '#eef4f8', border: '#b8d4e8' },
  low:      { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
};
const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function CorrectiveActionsSummary({ locationId, navigate }: { locationId: string; navigate: (p: string) => void }) {
  const openCAs = DEMO_CORRECTIVE_ACTIONS
    .filter(a => a.locationId === locationId && (a.status === 'created' || a.status === 'in_progress'))
    .sort((a, b) => (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3));

  const top3 = openCAs.slice(0, 3);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Open Corrective Actions</h3>
        {openCAs.length > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-red-700 bg-red-50">
            {openCAs.length}
          </span>
        )}
      </div>

      {openCAs.length === 0 ? (
        <p className="text-xs text-gray-400">No open corrective actions for this location.</p>
      ) : (
        <div className="space-y-2">
          {top3.map(ca => {
            const sevCfg = SEV_COLORS[ca.severity] || SEV_COLORS.medium;
            const overdue = isCAOverdue(ca);
            return (
              <button
                key={ca.id}
                onClick={() => navigate(`/corrective-actions/${ca.id}`)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-gray-50 transition-colors"
                style={{ border: '1px solid #e5e7eb' }}
              >
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0"
                  style={{ color: sevCfg.color, backgroundColor: sevCfg.bg, border: `1px solid ${sevCfg.border}` }}
                >
                  {SEVERITY_LABELS[ca.severity]}
                </span>
                <span className="text-xs text-gray-700 flex-1 truncate">{ca.title}</span>
                {overdue && (
                  <span className="text-[9px] font-bold text-red-600">OVERDUE</span>
                )}
              </button>
            );
          })}
          {openCAs.length > 3 && (
            <button
              onClick={() => navigate(`/corrective-actions?location=${locationId}`)}
              className="text-xs font-semibold w-full text-center py-1"
              style={{ color: '#1e4d6b' }}
            >
              View all {openCAs.length} &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
