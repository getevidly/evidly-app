import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle,
  ClipboardCheck, Info,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { Breadcrumb } from '../components/Breadcrumb';
import { FireStatusBars } from '../components/shared/FireStatusBars';
import { DEMO_LOCATION_GRADE_OVERRIDES } from '../data/demoJurisdictions';
import { locations } from '../data/demoData';
import { JURISDICTION_DATABASE } from '../data/jurisdictionData';

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

// ── Jurisdiction methodology (dynamic from jurisdictionData.ts) ──

const FALLBACK_INFO = { name: 'California (Standard CalCode)', system: 'Violation-based (CalCode)', description: 'Standard CalCode inspection — violations documented by severity.' };

function getJurisdictionInfo(locationUrlId: string): { name: string; system: string; description: string } {
  const county = LOCATION_COUNTY[locationUrlId];
  if (!county) return FALLBACK_INFO;
  const entry = JURISDICTION_DATABASE.find(j => j.county === county && j.pillar === 'food_safety');
  if (!entry) return FALLBACK_INFO;
  return {
    name: entry.agencyName,
    system: entry.gradingScale,
    description: [
      `Passing: ${entry.passingThreshold}.`,
      entry.closureTrigger ? `Closure: ${entry.closureTrigger}.` : '',
      entry.reinspectionPolicy ? `Re-inspection: ${entry.reinspectionPolicy}` : '',
    ].filter(Boolean).join(' '),
  };
}

// ── Operational readiness (real internal metrics) ─────────────

const OPERATIONAL_METRICS = [
  { label: 'Checklist Completion', value: '28/30', pct: 93 as number | null, status: 'good' },
  { label: 'Temperature Logs', value: '34/35', pct: 97 as number | null, status: 'good' },
  { label: 'Incident Resolution', value: '20/20', pct: 100 as number | null, status: 'good' },
  { label: 'HACCP Monitoring', value: '12/15', pct: 80 as number | null, status: 'warning' },
  { label: 'Equipment Status', value: '2 items overdue', pct: null as number | null, status: 'warning' },
  { label: 'Training Compliance', value: '12/14 current', pct: 86 as number | null, status: 'good' },
  { label: 'Document Currency', value: '4 expiring within 30d', pct: null as number | null, status: 'warning' },
];

// ── Status colors ────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  passing: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', dot: '#16a34a' },
  at_risk: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: '#d97706' },
  failing: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', dot: '#dc2626' },
};

// ── Collapsible Section ──────────────────────────────────────

function CollapsibleSection({ title, icon, badge, defaultOpen = false, children }: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 sm:px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-gray-900">{title}</span>
          {badge}
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {isOpen && <div className="px-3 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100">{children}</div>}
    </div>
  );
}

// ── StatusIcon ────────────────────────────────────────────────

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

// ── Main Component ───────────────────────────────────────────

export function ScoringBreakdown() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const locationParam = params.get('location') || 'downtown';

  const selectedLocation = locations.find(l => l.urlId === locationParam) || locations[0];
  const overrideKey = LOCATION_OVERRIDE_KEY[locationParam] || 'demo-loc-downtown';
  const gradeData = DEMO_LOCATION_GRADE_OVERRIDES[overrideKey];
  const county = (LOCATION_COUNTY[locationParam] || 'California') + ' County';
  const jurisdictionInfo = getJurisdictionInfo(locationParam);

  const foodStatus = STATUS_COLORS[gradeData.foodSafety.status];
  const fireStatus = STATUS_COLORS[gradeData.facilitySafety.status];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: selectedLocation.name, href: `/dashboard?location=${locationParam}` },
        { label: 'Food Safety Overview' },
      ]} />

      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/dashboard?location=${locationParam}`)}
          className="flex items-center gap-1 text-sm font-medium text-[#1e4d6b] hover:text-[#163a52] transition-colors mb-2 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Food Safety Overview</h1>
        <p className="text-gray-500 text-sm mt-1">
          {selectedLocation.name} &mdash; {county}
        </p>
      </div>

      {/* Location Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {locations.map(loc => (
          <button
            key={loc.urlId}
            onClick={() => navigate(`/scoring-breakdown?location=${loc.urlId}`)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors min-h-[44px] ${
              loc.urlId === locationParam
                ? 'bg-white text-[#1e4d6b] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* ─── Section 1: Jurisdiction Status ─── */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <EvidlyIcon size={20} />
          Jurisdiction Status
        </h2>
        <p className="text-sm text-gray-500 -mt-1">What the authorities see &mdash; official grades from your inspecting agencies.</p>

        {/* Food Safety */}
        <CollapsibleSection
          title="Food Safety"
          icon={<span className="text-lg">&#127869;</span>}
          badge={
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${foodStatus.bg} ${foodStatus.text} ${foodStatus.border}`}>
              {gradeData.foodSafety.grade}
            </span>
          }
          defaultOpen
        >
          <div className="mt-4 space-y-4">
            {/* Grade Display */}
            <div className={`rounded-lg p-4 border ${foodStatus.bg} ${foodStatus.border}`}>
              <div className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: foodStatus.dot }}
                />
                <div className="flex-1">
                  <div className={`text-lg font-bold ${foodStatus.text}`}>
                    {gradeData.foodSafety.gradeDisplay}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {gradeData.foodSafety.summary}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Authority: {jurisdictionInfo.name}
                  </div>
                </div>
              </div>
            </div>

            {/* Details if available */}
            {gradeData.foodSafety.details && (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-gray-50">
                  <div className="text-lg font-bold text-gray-900">{gradeData.foodSafety.details.majorViolations}</div>
                  <div className="text-xs text-gray-500">Major Violations</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-50">
                  <div className="text-lg font-bold text-gray-900">{gradeData.foodSafety.details.minorViolations}</div>
                  <div className="text-xs text-gray-500">Minor Violations</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-50">
                  <div className="text-lg font-bold text-gray-900">{gradeData.foodSafety.details.uncorrectedMajors}</div>
                  <div className="text-xs text-gray-500">Uncorrected Majors</div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Facility Safety */}
        <CollapsibleSection
          title="Facility Safety"
          icon={<span className="text-lg">&#128293;</span>}
          badge={
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${fireStatus.bg} ${fireStatus.text} ${fireStatus.border}`}>
              {gradeData.facilitySafety.grade}
            </span>
          }
          defaultOpen
        >
          <div className="mt-4 space-y-4">
            {/* Grade Display */}
            <div className={`rounded-lg p-4 border ${fireStatus.bg} ${fireStatus.border}`}>
              <div className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: fireStatus.dot }}
                />
                <div className="flex-1">
                  <div className={`text-lg font-bold ${fireStatus.text}`}>
                    {gradeData.facilitySafety.gradeDisplay}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {gradeData.facilitySafety.summary}
                  </div>
                </div>
              </div>
            </div>

            {/* Fire Status Bars */}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Equipment &amp; Permit Status</div>
              <FireStatusBars
                permitStatus={gradeData.facilitySafety.permitStatus}
                hoodStatus={gradeData.facilitySafety.hoodStatus}
                extinguisherStatus={gradeData.facilitySafety.extinguisherStatus}
                ansulStatus={gradeData.facilitySafety.ansulStatus}
              />
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* ─── Section 2: Operational Readiness ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#1e4d6b]" />
            Operational Readiness
          </h2>
          <span className="text-[10px] font-semibold text-[#1e4d6b] bg-[#eef4f8] border border-[#b8d4e8] px-2 py-0.5 rounded-full uppercase tracking-wider">
            EvidLY Internal
          </span>
        </div>
        <p className="text-sm text-gray-500 -mt-1">Internal operational metrics tracked by EvidLY &mdash; these are not jurisdiction grades.</p>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {OPERATIONAL_METRICS.map((metric, idx) => {
              const isWarning = metric.status === 'warning';
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  {isWarning ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-800 font-medium">{metric.label}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-sm font-semibold ${isWarning ? 'text-amber-600' : 'text-gray-700'}`}>
                      {metric.value}
                    </span>
                    {metric.pct !== null && (
                      <div className="w-20 sm:w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${metric.pct}%`,
                            backgroundColor: metric.pct >= 90 ? '#16a34a' : metric.pct >= 80 ? '#d97706' : '#dc2626',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Section 3: Jurisdiction Methodology ─── */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Info className="w-5 h-5 text-[#1e4d6b]" />
          Jurisdiction Methodology
        </h2>
        <p className="text-sm text-gray-500 -mt-1">How {jurisdictionInfo.name} grades food facilities.</p>

        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#eef4f8] border border-[#b8d4e8] flex items-center justify-center flex-shrink-0">
              <EvidlyIcon size={20} />
            </div>
            <div className="flex-1">
              <div className="text-base font-bold text-gray-900">{jurisdictionInfo.name}</div>
              <div className="mt-1">
                <span className="text-xs font-semibold text-[#1e4d6b] bg-[#eef4f8] border border-[#b8d4e8] px-2 py-0.5 rounded-full">
                  {jurisdictionInfo.system}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                {jurisdictionInfo.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
