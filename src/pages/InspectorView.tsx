// ---------------------------------------------------------------------------
// PROMPT-15: Inspector Arrival Mode
//
// HARDCODED VALUES REMOVED (original audit):
//   - Location: "Location 1", "CA", "Fresno County"
//   - Report date: "February 12, 2026"
//   - Compliance rate: met=32, total=32, percent=100
//   - Inspector/agency: none shown (no last-inspection section existed)
//   - 6 sections × 3-7 items each = 25 requirements, all hardcoded pass
//   - Evidence strings: specific temps (36°F, 37°F, 38°F, 142°F), dates,
//     vendor names (Valley Fresh Produce, Pacific Seafood, Central Meats,
//     Mission Dairy, Sierra Dry Goods), permit numbers (#2026-FHF-04821),
//     service company names (ABC Fire Protection, Valley Fire Systems,
//     Valley Pest Solutions), employee names (Ana Torres), cert numbers
//   - Cert panel: 3 CFPMs, 8 food handlers, 4 facility safety records
//     all with hardcoded names, cert numbers, dates
//   - Talk-track: did not exist
//
// All data now flows from InspectorScenarioData (demo) or Supabase (live).
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  Printer,
  Download,
  Share2,
  Thermometer,
  ShoppingBag,
  Wrench,
  Users,
  Building2,
  Flame,
  ChevronDown,
  ChevronRight,
  Clock,
  GraduationCap,
  X,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { getStateLabel } from '../lib/stateCodes';
import {
  DEMO_SCENARIOS,
  SCENARIO_KEYS,
  generateTalkTrack,
  type ScenarioKey,
  type InspectorScenarioData,
  type InspectorSection,
  type InspectorRequirement,
} from '../data/inspectorViewDemoData';

// ---------------------------------------------------------------------------
// Icon resolver — maps iconKey string → React component
// ---------------------------------------------------------------------------

const SECTION_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string }>> = {
  thermometer: Thermometer,
  'shopping-bag': ShoppingBag,
  wrench: Wrench,
  users: Users,
  building: Building2,
  flame: Flame,
};

// ---------------------------------------------------------------------------
// Build empty live-mode data (no Supabase tables yet)
// ---------------------------------------------------------------------------

function buildLiveData(locationName: string): InspectorScenarioData {
  return {
    id: 'live',
    label: 'Live',
    description: '',
    location: { name: locationName, stateCode: '', county: '' },
    reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    lastInspection: null,
    openCorrectiveActions: [],
    overdueEquipment: [],
    haccpAlerts: [],
    sections: [],
    certifications: { cfpms: [], foodHandlers: [], facilitySafety: [] },
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InspectorView() {
  const { isDemoMode } = useDemo();
  const {
    guardAction,
    showUpgrade,
    setShowUpgrade,
    upgradeAction,
    upgradeFeature,
  } = useDemoGuard();

  const [scenario, setScenario] = useState<ScenarioKey>('A');
  const [showCertPanel, setShowCertPanel] = useState(false);

  // Resolve data source
  const data: InspectorScenarioData = isDemoMode
    ? DEMO_SCENARIOS[scenario]
    : buildLiveData('Your Location');

  const talkTrack = generateTalkTrack(data);

  // Compute compliance stats
  const totalItems = data.sections.reduce((sum, s) => sum + s.items.length, 0);
  const metItems = data.sections.reduce(
    (sum, s) => sum + s.items.filter(i => i.status === 'pass').length, 0
  );
  const compliancePercent = totalItems > 0 ? Math.round((metItems / totalItems) * 100) : 0;
  const isFullyCompliant = metItems === totalItems && totalItems > 0;

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    data.sections.forEach(s => { init[s.key] = true; });
    return init;
  });

  const toggle = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const issuesInSection = (items: InspectorRequirement[]) =>
    items.filter(i => i.status === 'fail').length;

  // Actions
  const handlePrint = () => window.print();

  const handleExportPdf = () => {
    if (isDemoMode) { guardAction('export', 'PDF export', () => {}); return; }
    window.print();
  };

  const handleShare = () => {
    if (isDemoMode) { guardAction('export', 'share link', () => {}); return; }
    toast.success('Share link copied');
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      <style>{`
        @media print {
          nav, [data-tour], .mobile-tab-bar { display: none !important; }
          body { background: white !important; }
          .lg\\:pl-60 { padding-left: 0 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-[#faf8f3]">
        <div className="print:hidden">
          <Breadcrumb
            items={[
              { label: 'Compliance', href: '/scoring-breakdown' },
              { label: 'Inspector Arrival Mode' },
            ]}
          />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

          {/* ── Scenario Selector (demo only) ──────────────────────── */}
          {isDemoMode && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 print:hidden">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Scenario
              </p>
              <div className="flex gap-2">
                {SCENARIO_KEYS.map(key => {
                  const s = DEMO_SCENARIOS[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setScenario(key)}
                      className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        scenario === key
                          ? 'bg-[#1e4d6b] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span className="font-bold">{key}:</span> {s.label}
                      <span className="block text-[11px] mt-0.5 opacity-80">{s.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#1e4d6b] flex items-center justify-center">
                  <EvidlyIcon size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#1e4d6b]">
                    Inspector Arrival Mode
                  </h1>
                  <p className="text-sm text-gray-500">
                    {data.location.name}
                    {data.location.stateCode && <> &middot; {getStateLabel(data.location.stateCode)}</>}
                    {data.location.county && <> &middot; {data.location.county}</>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#1e4d6b] bg-white border border-gray-200 rounded-xl hover:bg-[#eef4f8] transition-colors">
                  <Printer className="h-4 w-4" /> Print
                </button>
                <button onClick={handleExportPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#1e4d6b] bg-white border border-gray-200 rounded-xl hover:bg-[#eef4f8] transition-colors">
                  <Download className="h-4 w-4" /> Export PDF
                </button>
                <button onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#1e4d6b] bg-white border border-gray-200 rounded-xl hover:bg-[#eef4f8] transition-colors">
                  <Share2 className="h-4 w-4" /> Share
                </button>
                <button onClick={() => setShowCertPanel(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#1e4d6b] border border-[#1e4d6b] rounded-xl hover:bg-[#163a52] transition-colors">
                  <GraduationCap className="h-4 w-4" /> Show Certs
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>Report generated: {data.reportDate}</span>
            </div>

            {/* Compliance badge */}
            {totalItems === 0 ? (
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 px-6 py-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-blue-800">No inspection data</p>
                  <p className="text-sm text-blue-600">
                    Connect your location to start tracking compliance requirements.
                  </p>
                </div>
              </div>
            ) : isFullyCompliant ? (
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-6 py-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-7 w-7 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-emerald-800">
                    {compliancePercent}% COMPLIANT
                  </p>
                  <p className="text-sm text-emerald-600">
                    {metItems}/{totalItems} requirements met &mdash; no corrective actions required
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-6 py-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="h-7 w-7 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-amber-800">
                    {totalItems - metItems} Issue{totalItems - metItems !== 1 ? 's' : ''} Found
                  </p>
                  <p className="text-sm text-amber-600">
                    {metItems}/{totalItems} requirements met &mdash; review flagged items below
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Last Inspection Record ──────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-[#1e4d6b] uppercase tracking-wide mb-3">
              Last Inspection Record
            </h3>
            {data.lastInspection ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase">Date</p>
                    <p className="text-sm font-medium text-gray-900">{data.lastInspection.date}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase">Score</p>
                    <p className={`text-sm font-bold ${data.lastInspection.score >= 90 ? 'text-emerald-700' : data.lastInspection.score >= 80 ? 'text-amber-700' : 'text-red-700'}`}>
                      {data.lastInspection.score}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase">Inspector</p>
                    <p className="text-sm font-medium text-gray-900">{data.lastInspection.inspectorName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase">Agency</p>
                    <p className="text-sm text-gray-700">{data.lastInspection.agency}</p>
                  </div>
                </div>
                {data.lastInspection.topViolations.length > 0 && (
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase mb-1">Top Violations Cited</p>
                    <ul className="space-y-1">
                      {data.lastInspection.topViolations.map((v, i) => (
                        <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                          <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.lastInspection.topViolations.length === 0 && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5" /> No violations cited on last inspection
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No prior inspection history for this location.</p>
            )}
          </div>

          {/* ── Status Cards Row ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Open Corrective Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h4 className="text-xs font-bold text-gray-700 uppercase">Open Corrective Actions</h4>
              </div>
              {data.openCorrectiveActions.length > 0 ? (
                <>
                  <p className="text-2xl font-bold text-amber-700 mb-2">{data.openCorrectiveActions.length}</p>
                  <ul className="space-y-1.5">
                    {data.openCorrectiveActions.slice(0, 3).map((ca, i) => (
                      <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                        <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                          ca.severity === 'critical' ? 'bg-red-500' : ca.severity === 'major' ? 'bg-amber-500' : 'bg-blue-400'
                        }`} />
                        <span>{ca.title} <span className="text-gray-400">&middot; due {ca.dueDate}</span></span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-emerald-600 font-medium">None</p>
              )}
            </div>

            {/* Overdue Equipment */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-4 w-4 text-gray-500" />
                <h4 className="text-xs font-bold text-gray-700 uppercase">Overdue Equipment</h4>
              </div>
              {data.overdueEquipment.length > 0 ? (
                <>
                  <p className="text-2xl font-bold text-red-700 mb-2">{data.overdueEquipment.length}</p>
                  <ul className="space-y-1.5">
                    {data.overdueEquipment.map((eq, i) => (
                      <li key={i} className="text-xs text-gray-700">
                        {eq.name} <span className="text-gray-400">&middot; due {eq.nextDue}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-emerald-600 font-medium">No overdue equipment items</p>
              )}
            </div>

            {/* Active HACCP CCP Alerts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="h-4 w-4 text-red-500" />
                <h4 className="text-xs font-bold text-gray-700 uppercase">HACCP CCP Alerts</h4>
              </div>
              {data.haccpAlerts.length > 0 ? (
                <>
                  <p className="text-2xl font-bold text-red-700 mb-2">{data.haccpAlerts.length}</p>
                  <ul className="space-y-1.5">
                    {data.haccpAlerts.map((alert, i) => (
                      <li key={i} className="text-xs text-gray-700">
                        <span className="font-medium text-red-700">{alert.ccp}:</span> {alert.description}
                        <span className="text-gray-400"> &middot; {alert.detectedAt}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-emerald-600 font-medium">No active alerts</p>
              )}
            </div>
          </div>

          {/* ── Talk-Track Items ────────────────────────────────────── */}
          {talkTrack.length > 0 && (
            <div className="bg-gradient-to-br from-[#1e4d6b] to-[#163a52] rounded-xl shadow-sm p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-[#d4af37]" />
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  Operator Talk-Track
                </h3>
                <Lightbulb className="h-3.5 w-3.5 text-[#d4af37] ml-1" />
              </div>
              <ul className="space-y-2">
                {talkTrack.map((item, i) => (
                  <li key={i} className="text-sm flex items-start gap-2 text-white/90">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#d4af37] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Requirement Sections ───────────────────────────────── */}
          {data.sections.length > 0 && (
            <div className="space-y-4">
              {data.sections.map((section: InspectorSection) => {
                const SectionIcon = SECTION_ICONS[section.iconKey] || Building2;
                const issues = issuesInSection(section.items);
                const expanded = expandedSections[section.key] ?? false;

                return (
                  <div key={section.key}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggle(section.key)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[#eef4f8] flex items-center justify-center flex-shrink-0">
                          <SectionIcon className="h-5 w-5 text-[#1e4d6b]" />
                        </div>
                        <div>
                          <span className="font-semibold text-[#1e4d6b]">{section.title}</span>
                          <span className="ml-2 text-xs text-gray-400 font-normal">{section.calCode}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {issues === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                            <CheckCircle className="h-3.5 w-3.5" /> All Met
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
                            <XCircle className="h-3.5 w-3.5" /> {issues} Issue{issues !== 1 ? 's' : ''}
                          </span>
                        )}
                        {expanded
                          ? <ChevronDown className="h-4 w-4 text-gray-400" />
                          : <ChevronRight className="h-4 w-4 text-gray-400" />}
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t border-gray-100">
                        {section.items.map((item, idx) => (
                          <div key={idx}
                            className={`px-5 py-4 flex gap-3 ${idx !== section.items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <div className="flex-shrink-0 pt-0.5">
                              {item.status === 'pass'
                                ? <CheckCircle className="h-5 w-5 text-emerald-500" />
                                : <XCircle className="h-5 w-5 text-red-500" />}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-block text-[11px] font-mono text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                                  {item.citation}
                                </span>
                                <span className="text-sm font-medium text-gray-900">{item.title}</span>
                              </div>
                              <ul className="space-y-0.5">
                                {item.evidence.map((ev, evIdx) => (
                                  <li key={evIdx} className="text-xs text-gray-500 flex items-start gap-1.5">
                                    <span className="mt-1.5 h-1 w-1 rounded-full bg-gray-300 flex-shrink-0" />
                                    {ev}
                                  </li>
                                ))}
                              </ul>
                              <p className="text-xs text-gray-400 italic">{item.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Footer ─────────────────────────────────────────────── */}
          <div className="space-y-3 pt-2">
            <div className="rounded-xl bg-[#1e4d6b] text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="font-semibold text-sm">
                {metItems}/{totalItems} requirements met
              </p>
              <p className="text-sm text-white/80">
                {compliancePercent}% Compliant &mdash; {data.location.name}
                {data.location.county && `, ${data.location.county}`}
              </p>
            </div>
            <p className="text-center text-xs text-gray-400">
              Generated by EvidLY &middot; evidly.com
            </p>
            <div className="hidden print:block text-center text-xs text-gray-500 pt-4 border-t border-gray-200">
              <p>This compliance report was generated by EvidLY on {data.reportDate}.</p>
              <p>
                {data.location.name}
                {data.location.county && <> &middot; {data.location.county}</>}
                {data.location.stateCode && <> &middot; {getStateLabel(data.location.stateCode)}</>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cert Quick-Pull Panel ────────────────────────────────── */}
      {showCertPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:bg-white print:static print:inset-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col print:shadow-none print:rounded-none print:max-h-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 print:border-b-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-[#1e4d6b]" />
                <h2 className="text-lg font-bold text-[#1e4d6b]">Employee Certifications — Quick Pull</h2>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button onClick={() => window.print()} className="text-sm text-gray-500 hover:text-[#1e4d6b] px-2 py-1 rounded-lg border border-gray-200">
                  <Printer className="h-4 w-4" />
                </button>
                <button onClick={() => setShowCertPanel(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-6 py-4 space-y-5">
              {/* CFPM */}
              <div>
                <h3 className="text-sm font-bold text-[#1e4d6b] uppercase tracking-wide mb-2">Certified Food Protection Managers (CFPM)</h3>
                {data.certifications.cfpms.length > 0 ? (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50 border-b"><th className="text-left px-3 py-2 font-semibold text-gray-600">Name</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Cert #</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Issued</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Expires</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th></tr></thead>
                      <tbody>
                        {data.certifications.cfpms.map((c, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="px-3 py-2 font-medium">{c.name}</td>
                            <td className="px-3 py-2"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{c.certNumber}</code></td>
                            <td className="px-3 py-2 text-gray-600">{c.issued}</td>
                            <td className={`px-3 py-2 ${c.status === 'Expiring' ? 'text-amber-600 font-medium' : 'text-gray-600'}`}>{c.expires}</td>
                            <td className="px-3 py-2"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{c.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No CFPM records on file.</p>
                )}
                <p className="text-xs text-gray-500 mt-1">CalCode §113947.1 — at least one CFPM required per establishment during operating hours</p>
              </div>
              {/* Food Handlers */}
              <div>
                <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-2">Food Handler Cards</h3>
                {data.certifications.foodHandlers.length > 0 ? (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50 border-b"><th className="text-left px-3 py-2 font-semibold text-gray-600">Name</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Location</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Cert #</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Expires</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th></tr></thead>
                      <tbody>
                        {data.certifications.foodHandlers.map((r, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="px-3 py-2 font-medium">{r.name}</td>
                            <td className="px-3 py-2 text-gray-600">{r.loc}</td>
                            <td className="px-3 py-2"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.num}</code></td>
                            <td className={`px-3 py-2 ${r.ok ? 'text-gray-600' : 'text-red-600 font-medium'}`}>{r.exp}</td>
                            <td className="px-3 py-2"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{r.ok ? 'Active' : 'Expiring'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No food handler records on file.</p>
                )}
                <p className="text-xs text-gray-500 mt-1">CalCode §113948 / SB 476 — food handler certification required within 30 days of hire</p>
              </div>
              {/* Facility Safety */}
              <div>
                <h3 className="text-sm font-bold text-red-600 uppercase tracking-wide mb-2">Facility Safety Training</h3>
                {data.certifications.facilitySafety.length > 0 ? (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50 border-b"><th className="text-left px-3 py-2 font-semibold text-gray-600">Name</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Training</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Completed</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Next Due</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th></tr></thead>
                      <tbody>
                        {data.certifications.facilitySafety.map((r, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="px-3 py-2 font-medium">{r.name}</td>
                            <td className="px-3 py-2 text-gray-600">{r.tr}</td>
                            <td className="px-3 py-2 text-gray-600">{r.done}</td>
                            <td className="px-3 py-2 text-gray-600">{r.next}</td>
                            <td className="px-3 py-2"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{r.ok ? 'Current' : 'Overdue'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No facility safety training records on file.</p>
                )}
                <p className="text-xs text-gray-500 mt-1">OSHA 29 CFR 1910.157 / NFPA 10 — annual fire extinguisher training required</p>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400 print:border-t-2">
              <span>
                {data.certifications.foodHandlers.length} food handler{data.certifications.foodHandlers.length !== 1 ? 's' : ''}
                {' '}&middot; {data.certifications.cfpms.length} CFPM{data.certifications.cfpms.length !== 1 ? 's' : ''}
                {' '}&middot; {data.certifications.facilitySafety.length} facility safety record{data.certifications.facilitySafety.length !== 1 ? 's' : ''}
              </span>
              <span>Generated by EvidLY &middot; {data.reportDate}</span>
            </div>
          </div>
        </div>
      )}

      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
}
