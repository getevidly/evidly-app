// ============================================================
// ComplianceOverview — Dual-Pillar Compliance Status Page
// ============================================================
// GAP-14: Food Safety + Facility Safety displayed side by side.
// Each pillar scores independently using its own jurisdiction
// methodology. NO combined score, NO unified math.
//
// Data sources:
//   Food Safety  → useComplianceEngine → jurisdictionResult
//   Facility Safety → JURISDICTION_DATABASE + DEMO_LOCATION_GRADE_OVERRIDES
//   Inspection dates → demoIntelligence.complianceMatrix
//
// All scores/grades/thresholds from jurisdiction config — never hardcoded.
// ============================================================

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle, ClipboardCheck,
  UtensilsCrossed, Flame, Info, Calendar,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { FireStatusBars } from '../components/shared/FireStatusBars';
import { useComplianceEngine } from '../hooks/useComplianceEngine';
import { useDemo } from '../contexts/DemoContext';
import { locations, demoIntelligence, type ScoreImpactItem } from '../data/demoData';
import { DEMO_LOCATION_GRADE_OVERRIDES } from '../data/demoJurisdictions';
import { JURISDICTION_DATABASE } from '../data/jurisdictionData';
import { getReadinessColor } from '../utils/inspectionReadiness';

// ── Brand Colors (EvidLY spec) ───────────────────────────────

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

// ── Location-to-override-key mapping ─────────────────────────

const LOCATION_OVERRIDE_KEY: Record<string, string> = {
  downtown: 'demo-loc-downtown',
  airport: 'demo-loc-airport',
  university: 'demo-loc-university',
};

const LOCATION_COUNTY: Record<string, string> = {
  downtown: 'Fresno',
  airport: 'Merced',
  university: 'Stanislaus',
};

// ── Inspection date lookup from demoIntelligence ─────────────

const INSPECTION_DATES: Record<string, string> = {};
for (const row of demoIntelligence.complianceMatrix) {
  INSPECTION_DATES[row.locationId] = row.lastInspectionDate;
}

// ── Jurisdiction authority lookup ─────────────────────────────

function getJurisdictionEntry(county: string, pillar: 'food_safety' | 'facility_safety') {
  return JURISDICTION_DATABASE.find(
    j => j.county === county && j.pillar === pillar,
  );
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

// ── Score display: "—" when unavailable ───────────────────────

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

// ── Pillar Panel ──────────────────────────────────────────────

interface PillarPanelProps {
  pillar: 'food_safety' | 'facility_safety';
  score: number | null;
  opsScore: number | null;
  docsScore: number | null;
  jurisdictionGrade: string;
  jurisdictionSummary: string;
  jurisdictionAuthority: string;
  jurisdictionStatus: 'passing' | 'failing' | 'at_risk';
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
}

function PillarPanel({
  pillar, score, opsScore, docsScore,
  jurisdictionGrade, jurisdictionSummary, jurisdictionAuthority,
  jurisdictionStatus, jurisdictionConfigured, lastInspectionDate,
  impactItems, facilityStatusBars, onEquipmentClick,
}: PillarPanelProps) {
  const isFoodSafety = pillar === 'food_safety';
  const Icon = isFoodSafety ? UtensilsCrossed : Flame;
  const label = isFoodSafety ? 'Food Safety' : 'Facility Safety';
  const hasScore = score !== null && score !== undefined && score > 0;
  const scoreColor = hasScore ? getReadinessColor(score!) : '#94a3b8';
  const opsColor = opsScore && opsScore > 0 ? getReadinessColor(opsScore) : '#94a3b8';
  const docsColor = docsScore && docsScore > 0 ? getReadinessColor(docsScore) : '#94a3b8';
  const statusColors = STATUS_COLORS[jurisdictionStatus] || STATUS_COLORS.at_risk;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Pillar Header */}
      <div
        className="px-4 sm:px-5 py-4 border-b flex items-center gap-3"
        style={{ borderBottomColor: '#E5E7EB' }}
      >
        <Icon className="w-5 h-5" style={{ color: hasScore ? scoreColor : NAVY }} />
        <h2 className="text-lg font-bold" style={{ color: NAVY }}>{label}</h2>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* ── Section 1: Jurisdiction Status ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <EvidlyIcon size={16} />
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: NAVY }}>
              Jurisdiction Status
            </h3>
          </div>

          {jurisdictionConfigured ? (
            <div className={`rounded-lg p-4 border ${statusColors.bg} ${statusColors.border}`}>
              <div className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: statusColors.dot }}
                />
                <div className="flex-1">
                  <div className={`text-base font-bold ${statusColors.text}`}>
                    {jurisdictionGrade || '\u2014'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{jurisdictionSummary}</div>
                  <div className="text-xs text-gray-400 mt-2">
                    Authority: {jurisdictionAuthority}
                  </div>
                  {/* Last inspection date */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>Last inspection: {formatInspectionDate(lastInspectionDate)}</span>
                  </div>
                </div>
              </div>
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

  const selectedLocation = locations.find(l => l.urlId === locationParam) || locations[0];
  const overrideKey = LOCATION_OVERRIDE_KEY[locationParam] || 'demo-loc-downtown';
  const gradeData = DEMO_LOCATION_GRADE_OVERRIDES[overrideKey];
  const county = LOCATION_COUNTY[locationParam] || 'California';
  const engineResult = compliance.results[locationParam];
  const lastInspection = INSPECTION_DATES[locationParam];

  // Food safety jurisdiction — from engine + jurisdiction database
  const foodJurisdiction = useMemo(() => {
    const jEntry = getJurisdictionEntry(county, 'food_safety');

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
  }, [engineResult, gradeData, county]);

  // Facility safety jurisdiction — from jurisdiction database + grade overrides
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
      authority: jEntry?.agencyName || 'NFPA 96 (2024)',
      status: fs.status,
    };
  }, [gradeData, county]);

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

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: selectedLocation.name, href: `/dashboard?location=${locationParam}` },
        { label: 'Compliance Overview' },
      ]} />

      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/dashboard?location=${locationParam}`)}
          className="flex items-center gap-1 text-sm font-medium transition-colors mb-2 min-h-[44px]"
          style={{ color: NAVY }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Compliance Overview</h1>
        <p className="text-gray-500 text-sm mt-1">
          {selectedLocation.name} &mdash; {county} County
        </p>
      </div>

      {/* Location Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {locations.map(loc => (
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
        {engineResult ? (
          <PillarPanel
            pillar="food_safety"
            score={engineResult.foodSafetyScore}
            opsScore={engineResult.foodSafetyOps}
            docsScore={engineResult.foodSafetyDocs}
            jurisdictionGrade={foodJurisdiction.grade}
            jurisdictionSummary={foodJurisdiction.summary}
            jurisdictionAuthority={foodJurisdiction.authority}
            jurisdictionStatus={foodJurisdiction.status}
            jurisdictionConfigured={foodJurisdiction.configured}
            lastInspectionDate={lastInspection}
            impactItems={foodItems}
          />
        ) : (
          <PillarSkeleton pillar="food_safety" />
        )}

        {/* Facility Safety */}
        {engineResult ? (
          <PillarPanel
            pillar="facility_safety"
            score={engineResult.facilitySafetyScore}
            opsScore={engineResult.facilitySafetyOps}
            docsScore={engineResult.facilitySafetyDocs}
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
          />
        ) : (
          <PillarSkeleton pillar="facility_safety" />
        )}
      </div>
    </div>
  );
}
