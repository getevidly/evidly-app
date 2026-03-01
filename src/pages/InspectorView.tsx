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
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { getStateLabel } from '../lib/stateCodes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequirementItem {
  citation: string;
  title: string;
  status: 'pass' | 'fail';
  evidence: string[];
  detail: string;
}

interface Section {
  key: string;
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
  calCode: string;
  items: RequirementItem[];
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const location = {
  name: 'Downtown Kitchen', // demo
  stateCode: 'CA',
  county: 'Fresno County',
};

const reportDate = 'February 12, 2026';

const complianceRate = { met: 32, total: 32, percent: 100 };

// Section 1 — Food Temperature Control
const tempSection: Section = {
  key: 'temp',
  title: 'Food Temperature Control',
  icon: Thermometer,
  calCode: '\u00A7113996\u2013\u00A7114014',
  items: [
    {
      citation: '\u00A7113996',
      title: 'Cold Holding \u2264 41\u00B0F',
      status: 'pass',
      evidence: [
        'Walk-in Cooler #1: 36\u00B0F @ 6:00 AM today', // demo
        'Walk-in Cooler #2: 37\u00B0F @ 6:05 AM today',
        'Prep Table Cooler: 38\u00B0F @ 6:10 AM today',
      ],
      detail: '7-day compliance: 100% (49/49 readings in range)',
    },
    {
      citation: '\u00A7113996',
      title: 'Hot Holding \u2265 135\u00B0F',
      status: 'pass',
      evidence: ['Hot Holding Unit: 142\u00B0F @ 11:00 AM today'],
      detail: '7-day compliance: 100% (14/14 readings in range)',
    },
    {
      citation: '\u00A7114004',
      title: 'Cooking temperatures reached',
      status: 'pass',
      evidence: ['All proteins verified \u2265 165\u00B0F internal before serving'],
      detail: 'Last 7 days: 21 cooking temp checks, all compliant',
    },
    {
      citation: '\u00A7114002',
      title: 'Cooling procedures followed',
      status: 'pass',
      evidence: ['135\u00B0F\u219270\u00B0F in 1.5 hrs, 70\u00B0F\u219241\u00B0F in 3.5 hrs (yesterday batch)'],
      detail: 'Cooling log completed daily, all within limits',
    },
    {
      citation: '\u00A7114014',
      title: 'Reheating to 165\u00B0F',
      status: 'pass',
      evidence: ['All reheated items verified \u2265 165\u00B0F within 2 hours'],
      detail: 'Last 7 days: 8 reheat verifications, all compliant',
    },
    {
      citation: '\u00A7114059',
      title: 'Date marking on ready-to-eat foods',
      status: 'pass',
      evidence: ['All RTE items labeled with 7-day use-by dates'],
      detail: 'Date label compliance checked daily at opening',
    },
    {
      citation: '\u00A7113996(d)',
      title: 'Time as public health control',
      status: 'pass',
      evidence: ['TPHC items logged with 4-hour discard times when used'],
      detail: 'TPHC policy on file and followed per checklist',
    },
  ],
};

// Section 2 — Food Source & Condition
const foodSection: Section = {
  key: 'food',
  title: 'Food Source & Condition',
  icon: ShoppingBag,
  calCode: '\u00A7113735\u2013\u00A7114039',
  items: [
    {
      citation: '\u00A7113735',
      title: 'Approved food sources',
      status: 'pass',
      evidence: ['5 active vendors with current licenses on file'],
      detail:
        'Valley Fresh Produce, Pacific Seafood, Central Meats, Mission Dairy, Sierra Dry Goods',
    },
    {
      citation: '\u00A7113735',
      title: 'Food received in good condition',
      status: 'pass',
      evidence: ['Receiving temps checked on every delivery'],
      detail: 'Last 7 days: 12 deliveries received, all temps in range',
    },
    {
      citation: '\u00A7114039',
      title: 'Shellfish tags retained 90 days',
      status: 'pass',
      evidence: ['Shellfish tag binder current through November 2025'],
      detail: 'Tags filed by date, oldest tag: Nov 14, 2025',
    },
  ],
};

// Section 3 — Food Contact Surfaces
const surfacesSection: Section = {
  key: 'surfaces',
  title: 'Food Contact Surfaces',
  icon: Wrench,
  calCode: '\u00A7114099\u2013\u00A7114074',
  items: [
    {
      citation: '\u00A7114099',
      title: 'Equipment clean and sanitized',
      status: 'pass',
      evidence: ['All prep surfaces sanitized at shift change'],
      detail: 'Sanitizer concentration verified 3x daily (200ppm quat)',
    },
    {
      citation: '\u00A7114099.6',
      title: 'Proper sanitizer concentration',
      status: 'pass',
      evidence: ['Test strips used at each check \u2014 200 ppm quaternary ammonia'],
      detail: 'Sanitizer bucket refreshed every 4 hours per SOP',
    },
    {
      citation: '\u00A7114099',
      title: 'Ice machine clean (FDA \u00A74-602.11)',
      status: 'pass',
      evidence: ['Ice Machine (Hoshizaki): cleaned Jan 28, 2026'],
      detail: 'Monthly cleaning on schedule, next due Feb 28. Ice quality: clear, odorless',
    },
    {
      citation: '\u00A7114074',
      title: 'Utensils stored properly',
      status: 'pass',
      evidence: ['Utensils stored handles-up in clean containers'],
      detail: 'Verified at opening and closing checklists daily',
    },
  ],
};

// Section 4 — Employee Health & Hygiene
const employeeSection: Section = {
  key: 'employee',
  title: 'Employee Health & Hygiene',
  icon: Users,
  calCode: '\u00A7113948\u2013\u00A7113961',
  items: [
    {
      citation: '\u00A7113948',
      title: 'Food Handler Cards current',
      status: 'pass',
      evidence: ['8/9 staff members have current California Food Handler Cards (1 expiring within 30 days)'],
      detail: 'Earliest expiry: Ana Torres \u2014 expires Aug 15, 2026',
    },
    {
      citation: '\u00A7113953.3',
      title: 'Proper handwashing observed',
      status: 'pass',
      evidence: ['Handwashing stations stocked and accessible'],
      detail: 'Handwashing compliance spot-checked daily at midday',
    },
    {
      citation: '\u00A7113961',
      title: 'No bare hand contact with RTE food',
      status: 'pass',
      evidence: ['Gloves and utensils used for all RTE food handling'],
      detail: 'Bare hand contact policy posted and enforced',
    },
    {
      citation: '\u00A7113949.1',
      title: 'Employee illness reporting policy',
      status: 'pass',
      evidence: ['Written illness reporting policy on file'],
      detail: 'Last illness exclusion: none in past 30 days',
    },
  ],
};

// Section 5 — Facility & Operations
const facilitySection: Section = {
  key: 'facility',
  title: 'Facility & Operations',
  icon: Building2,
  calCode: '\u00A7114381\u2013\u00A7114259',
  items: [
    {
      citation: '\u00A7114381',
      title: 'Health permit current and posted',
      status: 'pass',
      evidence: ['Fresno County Health Permit #2026-FHF-04821'],
      detail: 'Valid through Dec 31, 2026. Posted at main entrance.',
    },
    {
      citation: '\u00A7114419.1',
      title: 'HACCP plan on file (if required)',
      status: 'pass',
      evidence: ['HACCP plan current for all CCP categories'],
      detail: '5 CCPs documented: receiving, cooking, cooling, hot holding, reheating',
    },
    {
      citation: '\u00A7114259',
      title: 'Pest control measures in place',
      status: 'pass',
      evidence: ['Valley Pest Solutions \u2014 last service Feb 3, 2026'],
      detail: 'Monthly service. Next scheduled: Mar 3, 2026. No activity reported.',
    },
    {
      citation: '\u00A7114245',
      title: 'Proper waste disposal',
      status: 'pass',
      evidence: ['Waste removal daily, dumpster area clean'],
      detail: 'Organic waste diversion per SB 1383 in place',
    },
  ],
};

// Section 6 — Ventilation & Facility Safety
const fireSection: Section = {
  key: 'fire',
  title: 'Ventilation & Facility Safety',
  icon: Flame,
  calCode: 'NFPA 96 (2024)',
  items: [
    {
      citation: 'NFPA 96 (2024) \u00A712.4',
      title: 'Hood system cleaning current',
      status: 'pass',
      evidence: ['Last hood cleaning: Jan 15, 2026 by ABC Fire Protection'],
      detail:
        'Quarterly schedule. Cleaned to bare metal. Before/after photos on file.',
    },
    {
      citation: 'NFPA 96-2024 \u00A711.2.2',
      title: 'Fire suppression system inspected',
      status: 'pass',
      evidence: ['Semi-annual inspection: Dec 12, 2025 by Valley Fire Systems'],
      detail: 'Next inspection due: Jun 12, 2026. All nozzles clear, agent charged.',
    },
    {
      citation: 'NFPA 10-2025 \u00A77.3.1',
      title: 'Fire extinguishers inspected',
      status: 'pass',
      evidence: ['Annual inspection: Nov 5, 2025. Monthly visual: Feb 1, 2026.'],
      detail: '3 Class K extinguishers, all current. Tags attached.',
    },
  ],
};

const allSections: Section[] = [
  tempSection,
  foodSection,
  surfacesSection,
  employeeSection,
  facilitySection,
  fireSection,
];

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

  const [showCertPanel, setShowCertPanel] = useState(false);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    temp: true,
    food: true,
    surfaces: true,
    employee: true,
    facility: true,
    fire: true,
  });

  // Toggle a single section
  const toggle = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Helpers
  const issuesInSection = (items: RequirementItem[]) =>
    items.filter((i) => i.status === 'fail').length;

  const isFullyCompliant = complianceRate.percent === 100;

  // Actions
  const handlePrint = () => window.print();

  const handleExportPdf = () => {
    if (isDemoMode) {
      guardAction('export', 'PDF export', () => {});
      return;
    }
    window.print();
  };

  const handleShare = () => {
    if (isDemoMode) {
      guardAction('export', 'share link', () => {});
      return;
    }
    toast.success('Share link copied');
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          nav, [data-tour], .mobile-tab-bar { display: none !important; }
          body { background: white !important; }
          .lg\\:pl-60 { padding-left: 0 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-[#faf8f3]">
        {/* Breadcrumb */}
        <div className="print:hidden">
          <Breadcrumb
            items={[
              { label: 'Compliance', href: '/scoring-breakdown' },
              { label: 'Inspector View' },
            ]}
          />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* ---------------------------------------------------------------- */}
          {/* Header                                                          */}
          {/* ---------------------------------------------------------------- */}
          <div className="space-y-4">
            {/* Title row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#1e4d6b] flex items-center justify-center">
                  <EvidlyIcon size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#1e4d6b]">
                    Inspector Compliance View
                  </h1>
                  <p className="text-sm text-gray-500">
                    {location.name} &middot; {getStateLabel(location.stateCode)} &middot;{' '}
                    {location.county}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#1e4d6b] bg-white border border-gray-200 rounded-xl hover:bg-[#eef4f8] transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={handleExportPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#1e4d6b] bg-white border border-gray-200 rounded-xl hover:bg-[#eef4f8] transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export PDF
                </button>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#1e4d6b] bg-white border border-gray-200 rounded-xl hover:bg-[#eef4f8] transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button
                  onClick={() => setShowCertPanel(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#1e4d6b] border border-[#1e4d6b] rounded-xl hover:bg-[#163a52] transition-colors"
                >
                  <GraduationCap className="h-4 w-4" />
                  Show Certs
                </button>
              </div>
            </div>

            {/* Report date */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>Report generated: {reportDate}</span>
            </div>

            {/* Compliance badge */}
            {isFullyCompliant ? (
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-6 py-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-7 w-7 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-emerald-800">
                    100% COMPLIANT
                  </p>
                  <p className="text-sm text-emerald-600">
                    {complianceRate.met}/{complianceRate.total} requirements met &mdash;{' '}
                    no corrective actions required
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
                    {complianceRate.total - complianceRate.met} Issue
                    {complianceRate.total - complianceRate.met !== 1 ? 's' : ''} Found
                  </p>
                  <p className="text-sm text-amber-600">
                    {complianceRate.met}/{complianceRate.total} requirements met &mdash;{' '}
                    review flagged items below
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Sections                                                        */}
          {/* ---------------------------------------------------------------- */}
          <div className="space-y-4">
            {allSections.map((section) => {
              const SectionIcon = section.icon;
              const issues = issuesInSection(section.items);
              const expanded = expandedSections[section.key] ?? false;

              return (
                <div
                  key={section.key}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Section header */}
                  <button
                    onClick={() => toggle(section.key)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#eef4f8] flex items-center justify-center flex-shrink-0">
                        <SectionIcon className="h-5 w-5 text-[#1e4d6b]" />
                      </div>
                      <div>
                        <span className="font-semibold text-[#1e4d6b]">
                          {section.title}
                        </span>
                        <span className="ml-2 text-xs text-gray-400 font-normal">
                          {section.calCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {issues === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                          <CheckCircle className="h-3.5 w-3.5" />
                          All Met
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
                          <XCircle className="h-3.5 w-3.5" />
                          {issues} Issue{issues !== 1 ? 's' : ''}
                        </span>
                      )}
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded requirement list */}
                  {expanded && (
                    <div className="border-t border-gray-100">
                      {section.items.map((item, idx) => (
                        <div
                          key={idx}
                          className={`px-5 py-4 flex gap-3 ${
                            idx !== section.items.length - 1
                              ? 'border-b border-gray-100'
                              : ''
                          }`}
                        >
                          {/* Status icon */}
                          <div className="flex-shrink-0 pt-0.5">
                            {item.status === 'pass' ? (
                              <CheckCircle className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-block text-[11px] font-mono text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                                {item.citation}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {item.title}
                              </span>
                            </div>

                            {/* Evidence bullets */}
                            <ul className="space-y-0.5">
                              {item.evidence.map((ev, evIdx) => (
                                <li
                                  key={evIdx}
                                  className="text-xs text-gray-500 flex items-start gap-1.5"
                                >
                                  <span className="mt-1.5 h-1 w-1 rounded-full bg-gray-300 flex-shrink-0" />
                                  {ev}
                                </li>
                              ))}
                            </ul>

                            {/* Detail */}
                            <p className="text-xs text-gray-400 italic">
                              {item.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Footer                                                          */}
          {/* ---------------------------------------------------------------- */}
          <div className="space-y-3 pt-2">
            {/* Summary bar */}
            <div className="rounded-xl bg-[#1e4d6b] text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="font-semibold text-sm">
                {complianceRate.met}/{complianceRate.total} requirements met
              </p>
              <p className="text-sm text-white/80">
                {complianceRate.percent}% Compliant &mdash; {location.name},{' '}
                {location.county}
              </p>
            </div>

            {/* Generated-by line */}
            <p className="text-center text-xs text-gray-400">
              Generated by EvidLY &middot; evidly.com
            </p>

            {/* Print-only footer */}
            <div className="hidden print:block text-center text-xs text-gray-500 pt-4 border-t border-gray-200">
              <p>
                This compliance report was generated by EvidLY on {reportDate}.
              </p>
              <p>
                {location.name} &middot; {location.county} &middot;{' '}
                {getStateLabel(location.stateCode)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cert Quick-Pull Panel */}
      {showCertPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:bg-white print:static print:inset-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col print:shadow-none print:rounded-none print:max-h-none">
            {/* Panel header */}
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
            {/* Panel body */}
            <div className="overflow-y-auto px-6 py-4 space-y-5">
              {/* CFPM */}
              <div>
                <h3 className="text-sm font-bold text-[#1e4d6b] uppercase tracking-wide mb-2">Certified Food Protection Managers (CFPM)</h3>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b"><th className="text-left px-3 py-2 font-semibold text-gray-600">Name</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Cert #</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Issued</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Expires</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th></tr></thead>
                    <tbody>
                      <tr className="border-b border-gray-100"><td className="px-3 py-2 font-medium">Marcus Johnson</td><td className="px-3 py-2"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">SM-2025-7721</code></td><td className="px-3 py-2 text-gray-600">Mar 10, 2025</td><td className="px-3 py-2 text-gray-600">Mar 10, 2030</td><td className="px-3 py-2"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Active</span></td></tr>
                      <tr className="border-b border-gray-100"><td className="px-3 py-2 font-medium">Sarah Chen</td><td className="px-3 py-2"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">SM-2025-8832</code></td><td className="px-3 py-2 text-gray-600">Apr 5, 2025</td><td className="px-3 py-2 text-amber-600 font-medium">Mar 15, 2026</td><td className="px-3 py-2"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Expiring</span></td></tr>
                      <tr><td className="px-3 py-2 font-medium">Maria Garcia</td><td className="px-3 py-2"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">SM-2025-6643</code></td><td className="px-3 py-2 text-gray-600">Jul 20, 2025</td><td className="px-3 py-2 text-gray-600">Jul 20, 2030</td><td className="px-3 py-2"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Active</span></td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-1">CalCode §113947.1 — at least one CFPM required per establishment during operating hours</p>
              </div>
              {/* Food Handlers */}
              <div>
                <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-2">Food Handler Cards</h3>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b"><th className="text-left px-3 py-2 font-semibold text-gray-600">Name</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Location</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Cert #</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Expires</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th></tr></thead>
                    <tbody>
                      {[
                        { name: 'Marcus Johnson', loc: 'Downtown', num: 'FH-2025-4481', exp: 'Jun 15, 2028', ok: true },
                        { name: 'Sarah Chen', loc: 'Downtown', num: 'FH-2025-5502', exp: 'Aug 20, 2028', ok: true },
                        { name: 'Emma Rodriguez', loc: 'Downtown', num: 'FH-2025-9912', exp: 'Jul 10, 2028', ok: true },
                        { name: 'Maria Garcia', loc: 'Airport', num: 'FH-2025-3390', exp: 'Sep 1, 2028', ok: true },
                        { name: 'David Park', loc: 'Airport', num: 'FH-2024-2201', exp: 'Apr 2, 2027', ok: true },
                        { name: 'Michael Torres', loc: 'Airport', num: 'FH-2023-1188', exp: 'Feb 26, 2026', ok: false },
                        { name: 'Alex Thompson', loc: 'University', num: 'FH-2024-8834', exp: 'Dec 10, 2027', ok: true },
                        { name: 'Lisa Wang', loc: 'University', num: 'FH-2025-1105', exp: 'Jan 25, 2028', ok: true },
                      ].map((r, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0"><td className="px-3 py-2 font-medium">{r.name}</td><td className="px-3 py-2 text-gray-600">{r.loc}</td><td className="px-3 py-2"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.num}</code></td><td className={`px-3 py-2 ${r.ok ? 'text-gray-600' : 'text-red-600 font-medium'}`}>{r.exp}</td><td className="px-3 py-2"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{r.ok ? 'Active' : 'Expiring'}</span></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-1">CalCode §113948 / SB 476 — food handler certification required within 30 days of hire</p>
              </div>
              {/* Facility Safety */}
              <div>
                <h3 className="text-sm font-bold text-red-600 uppercase tracking-wide mb-2">Facility Safety Training</h3>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b"><th className="text-left px-3 py-2 font-semibold text-gray-600">Name</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Training</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Completed</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Next Due</th><th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th></tr></thead>
                    <tbody>
                      {[
                        { name: 'Marcus Johnson', tr: 'Fire Extinguisher', done: 'Nov 15, 2025', next: 'Nov 15, 2026', ok: true },
                        { name: 'Sarah Chen', tr: 'Fire Extinguisher', done: 'Nov 15, 2025', next: 'Nov 15, 2026', ok: true },
                        { name: 'Maria Garcia', tr: 'Fire Extinguisher', done: 'Nov 18, 2025', next: 'Nov 18, 2026', ok: true },
                        { name: 'David Park', tr: 'Hood Suppression Awareness', done: 'Dec 1, 2025', next: 'Dec 1, 2026', ok: true },
                      ].map((r, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0"><td className="px-3 py-2 font-medium">{r.name}</td><td className="px-3 py-2 text-gray-600">{r.tr}</td><td className="px-3 py-2 text-gray-600">{r.done}</td><td className="px-3 py-2 text-gray-600">{r.next}</td><td className="px-3 py-2"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{r.ok ? 'Current' : 'Overdue'}</span></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-1">OSHA 29 CFR 1910.157 / NFPA 10 — annual fire extinguisher training required</p>
              </div>
            </div>
            {/* Panel footer */}
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400 print:border-t-2">
              <span>8 food handlers · 3 CFPMs · 4 facility safety records</span>
              <span>Generated by EvidLY &middot; {reportDate}</span>
            </div>
          </div>
        </div>
      )}

      {/* Demo upgrade prompt */}
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
