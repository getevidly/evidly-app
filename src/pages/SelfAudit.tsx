import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Thermometer, Users, Package, Wrench, Flame, Building2, FileText,
  CheckCircle2, XCircle, MinusCircle, ChevronLeft, ChevronRight,
  Play, RotateCcw, Printer, Share2, Trash2, TrendingUp, AlertTriangle,
  ClipboardList, ArrowLeft, History,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { getStateLabel } from '../lib/stateCodes';
import { PhotoEvidence, PhotoButton, type PhotoRecord } from '../components/PhotoEvidence';
import { PhotoGallery } from '../components/PhotoGallery';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ItemStatus = 'pass' | 'fail' | 'na' | null;
type Severity = 'critical' | 'major' | 'minor';

interface AuditItem {
  id: string;
  text: string;
  status: ItemStatus;
  notes: string;
  severity: Severity;
}

interface AuditSection {
  id: number;
  name: string;
  citation: string;
  icon: React.ReactNode;
  items: AuditItem[];
}

interface SavedAuditState {
  sections: AuditSection[];
  currentSection: number;
  startedAt: string;
}

interface HistoryAudit {
  id: string;
  date: string;
  score: number;
  totalFails: number;
  critical: number;
  major: number;
  minor: number;
  auditor: string;
  fails: { section: string; item: string; severity: Severity; notes: string }[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'evidly_self_audit_progress';
const stateLabel = getStateLabel('CA');

const SECTION_ICONS = [
  <Thermometer className="h-5 w-5" />,
  <Users className="h-5 w-5" />,
  <Package className="h-5 w-5" />,
  <Wrench className="h-5 w-5" />,
  <Flame className="h-5 w-5" />,
  <Building2 className="h-5 w-5" />,
  <FileText className="h-5 w-5" />,
];

function buildSections(): AuditSection[] {
  const raw: { name: string; citation: string; items: string[] }[] = [
    {
      name: 'Food Temperature Control',
      citation: `${stateLabel} \u00A7113996`,
      items: [
        'Cold holding below 41\u00B0F',
        'Hot holding above 135\u00B0F',
        'Cooling from 135\u00B0F to 70\u00B0F within 2 hours',
        'Reheating to 165\u00B0F within 1 hour',
        'Time as temperature control procedures posted',
        'Thermometer calibration verified',
      ],
    },
    {
      name: 'Employee Hygiene & Health',
      citation: `${stateLabel} \u00A7113968`,
      items: [
        'Proper handwashing observed',
        'Hair restraints worn',
        'No bare hand contact with RTE food',
        'Ill employee exclusion/restriction policy',
        'Clean uniforms/aprons',
      ],
    },
    {
      name: 'Food Storage & Labeling',
      citation: `${stateLabel} \u00A7114047`,
      items: [
        'FIFO rotation followed',
        'Date marking on opened TCS foods',
        'Foods stored 6\u2033 above floor',
        'Raw/cooked separation maintained',
        'Allergen labeling present',
        'Chemical storage separated',
      ],
    },
    {
      name: 'Equipment & Utensils',
      citation: `${stateLabel} \u00A7114130`,
      items: [
        'Food contact surfaces clean and sanitized',
        'Sanitizer concentration verified (quat/chlorine)',
        'Ice machine clean (FDA \u00A74-602.11)',
        'Cutting boards in good repair',
        '3-compartment sink setup correct',
      ],
    },
    {
      name: 'Facility Safety & Suppression',
      citation: 'NFPA 96 (2024) \u00A712.4',
      items: [
        'Hood suppression system inspection current',
        'Fire extinguishers accessible and tagged',
        'Grease filter cleaning schedule current',
        'Ansul system last service within 6 months',
        'Emergency exit paths clear',
      ],
    },
    {
      name: 'Facility & Pest Control',
      citation: `${stateLabel} \u00A7114259`,
      items: [
        'Floors, walls, ceiling in good repair',
        'Adequate ventilation operational',
        'Pest control service current',
        'No evidence of pest activity',
        'Restrooms clean and stocked',
        'Garbage areas clean and covered',
      ],
    },
    {
      name: 'Documentation & Records',
      citation: `${stateLabel} \u00A7113725`,
      items: [
        'Health permit displayed and current',
        'Food handler certifications on file',
        'Manager food safety certification valid',
        'HACCP plan available (if applicable)',
        'Vendor service records current',
        'Food supplier licenses verified',
        'Delivery temperature logs maintained',
        'Receiving inspection procedures followed',
      ],
    },
  ];

  return raw.map((s, si) => ({
    id: si,
    name: s.name,
    citation: s.citation,
    icon: SECTION_ICONS[si],
    items: s.items.map((text, ii) => ({
      id: `s${si}-i${ii}`,
      text,
      status: null,
      notes: '',
      severity: 'major' as Severity,
    })),
  }));
}

function buildDemoSections(): AuditSection[] {
  const sections = buildSections();
  // Sections 0-5 completed with mostly passes and 3 failures
  const demoFails: Record<string, { severity: Severity; notes: string }> = {
    's0-i2': { severity: 'major', notes: 'Walk-in cooler cooling log showed 135\u00B0F to 80\u00B0F in 2 hours. Needs recalibration.' },
    's2-i4': { severity: 'minor', notes: 'Allergen labels missing on two prep containers in dry storage.' },
    's4-i3': { severity: 'major', notes: 'Ansul system service tag shows last inspection was 7 months ago.' },
  };
  for (let si = 0; si < 6; si++) {
    sections[si].items.forEach((item) => {
      if (demoFails[item.id]) {
        item.status = 'fail';
        item.severity = demoFails[item.id].severity;
        item.notes = demoFails[item.id].notes;
      } else {
        item.status = Math.random() > 0.1 ? 'pass' : 'na';
      }
    });
  }
  return sections;
}

const DEMO_HISTORY: HistoryAudit[] = [
  {
    id: 'h1',
    date: '2026-01-15',
    score: 85,
    totalFails: 7,
    critical: 2,
    major: 3,
    minor: 2,
    auditor: 'Maria Gonzalez',
    fails: [
      { section: 'Food Temperature Control', item: 'Cold holding below 41\u00B0F', severity: 'critical', notes: 'Walk-in cooler temp at 47\u00B0F.' },
      { section: 'Food Temperature Control', item: 'Thermometer calibration verified', severity: 'major', notes: 'Two thermometers not calibrated.' },
      { section: 'Employee Hygiene & Health', item: 'Proper handwashing observed', severity: 'critical', notes: 'Line cook skipped handwashing between tasks.' },
      { section: 'Food Storage & Labeling', item: 'FIFO rotation followed', severity: 'major', notes: 'Old stock found behind new deliveries.' },
      { section: 'Equipment & Utensils', item: 'Cutting boards in good repair', severity: 'minor', notes: 'One cutting board has deep scoring.' },
      { section: 'Facility Safety & Suppression', item: 'Ansul system last service within 6 months', severity: 'major', notes: 'Last service was 8 months ago.' },
      { section: 'Facility & Pest Control', item: 'No evidence of pest activity', severity: 'minor', notes: 'Minor fly activity near back door.' },
    ],
  },
  {
    id: 'h2',
    date: '2026-01-29',
    score: 89,
    totalFails: 5,
    critical: 1,
    major: 2,
    minor: 2,
    auditor: 'Maria Gonzalez',
    fails: [
      { section: 'Food Temperature Control', item: 'Cooling from 135\u00B0F to 70\u00B0F within 2 hours', severity: 'critical', notes: 'Soup cooling took 2.5 hours.' },
      { section: 'Food Storage & Labeling', item: 'Date marking on opened TCS foods', severity: 'major', notes: 'Three containers missing date labels.' },
      { section: 'Equipment & Utensils', item: 'Sanitizer concentration verified', severity: 'minor', notes: 'Quat sanitizer slightly below range.' },
      { section: 'Facility Safety & Suppression', item: 'Grease filter cleaning schedule current', severity: 'major', notes: 'Filters overdue by one week.' },
      { section: 'Documentation & Records', item: 'Vendor service records current', severity: 'minor', notes: 'Missing one vendor certificate.' },
    ],
  },
  {
    id: 'h3',
    date: '2026-02-10',
    score: 94,
    totalFails: 2,
    critical: 0,
    major: 1,
    minor: 1,
    auditor: 'Maria Gonzalez',
    fails: [
      { section: 'Food Temperature Control', item: 'Cooling from 135\u00B0F to 70\u00B0F within 2 hours', severity: 'major', notes: 'Walk-in cooler cooling log showed 135\u00B0F to 80\u00B0F in 2 hours.' },
      { section: 'Food Storage & Labeling', item: 'Allergen labeling present', severity: 'minor', notes: 'Allergen labels missing on two prep containers.' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBg(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 75) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getScoreRing(score: number): string {
  if (score >= 90) return 'stroke-green-500';
  if (score >= 75) return 'stroke-yellow-500';
  return 'stroke-red-500';
}

function severityBadge(sev: Severity) {
  const map = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    major: 'bg-orange-100 text-orange-700 border-orange-200',
    minor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${map[sev]}`}>
      {sev.charAt(0).toUpperCase() + sev.slice(1)}
    </span>
  );
}

function computeScore(sections: AuditSection[]): number {
  const penaltyMap: Record<Severity, number> = { critical: 10, major: 5, minor: 2 };
  let totalItems = 0;
  let totalPenalty = 0;
  sections.forEach((s) =>
    s.items.forEach((it) => {
      if (it.status === 'na' || it.status === null) return;
      totalItems++;
      if (it.status === 'fail') totalPenalty += penaltyMap[it.severity];
    }),
  );
  if (totalItems === 0) return 100;
  const maxPoints = totalItems * 10;
  const score = Math.max(0, Math.round(((maxPoints - totalPenalty) / maxPoints) * 100));
  return score;
}

function answeredCount(sections: AuditSection[]): number {
  return sections.reduce((acc, s) => acc + s.items.filter((i) => i.status !== null).length, 0);
}

function totalItemCount(sections: AuditSection[]): number {
  return sections.reduce((acc, s) => acc + s.items.length, 0);
}

function sectionAnswered(section: AuditSection): number {
  return section.items.filter((i) => i.status !== null).length;
}

function correctiveAction(item: AuditItem, sectionName: string): string {
  const actions: Record<string, string> = {
    critical: `Immediately address "${item.text}" in ${sectionName}. Halt affected operations until corrected. Document corrective steps and re-verify within 24 hours.`,
    major: `Schedule corrective action for "${item.text}" in ${sectionName} within 48 hours. Assign responsible staff and document completion.`,
    minor: `Address "${item.text}" in ${sectionName} during next scheduled maintenance or shift change. Log the correction.`,
  };
  return actions[item.severity];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SelfAudit() {
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  // View state
  const [activeTab, setActiveTab] = useState<'audit' | 'history'>('audit');
  const [auditPhase, setAuditPhase] = useState<'overview' | 'walkthrough' | 'results'>('overview');

  // Audit state
  const [sections, setSections] = useState<AuditSection[]>(buildSections);
  const [currentSection, setCurrentSection] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  // History state
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  // Saved state detection
  const [hasSavedState, setHasSavedState] = useState(false);

  // Photo evidence
  const [auditPhotos, setAuditPhotos] = useState<PhotoRecord[]>([]);

  // Check for saved state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setHasSavedState(true);
    } catch {
      // ignore
    }
  }, []);

  // Auto-save on every answer change
  const saveState = useCallback(() => {
    if (auditPhase !== 'walkthrough') return;
    try {
      const state: SavedAuditState = {
        sections: sections.map((s) => ({ ...s, icon: undefined as any })),
        currentSection,
        startedAt: startedAt || new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [sections, currentSection, auditPhase, startedAt]);

  useEffect(() => {
    if (auditPhase === 'walkthrough') saveState();
  }, [sections, currentSection, saveState, auditPhase]);

  // Handlers
  const startAudit = () => {
    const demo = buildDemoSections();
    setSections(demo);
    setCurrentSection(6); // land on section 7 (index 6)
    setStartedAt(new Date().toISOString());
    setAuditPhase('walkthrough');
    setHasSavedState(false);
  };

  const resumeAudit = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed: SavedAuditState = JSON.parse(saved);
      const restored = buildSections();
      parsed.sections.forEach((ps, si) => {
        if (restored[si]) {
          ps.items.forEach((pi, ii) => {
            if (restored[si].items[ii]) {
              restored[si].items[ii].status = pi.status ?? null;
              restored[si].items[ii].notes = pi.notes ?? '';
              restored[si].items[ii].severity = pi.severity ?? 'major';
            }
          });
        }
      });
      setSections(restored);
      setCurrentSection(parsed.currentSection);
      setStartedAt(parsed.startedAt);
      setAuditPhase('walkthrough');
      setHasSavedState(false);
    } catch {
      toast.error('Could not restore saved audit');
    }
  };

  const discardDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedState(false);
    toast.success('Draft discarded');
  };

  const resetAudit = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSections(buildSections());
    setCurrentSection(0);
    setStartedAt(null);
    setAuditPhase('overview');
    setHasSavedState(false);
  };

  const setItemStatus = (sectionIdx: number, itemIdx: number, status: ItemStatus) => {
    setSections((prev) => {
      const next = prev.map((s, si) => {
        if (si !== sectionIdx) return s;
        return {
          ...s,
          items: s.items.map((it, ii) => {
            if (ii !== itemIdx) return it;
            const wasFail = it.status === 'fail';
            return {
              ...it,
              status,
              severity: status === 'fail' && !wasFail ? 'major' : it.severity,
              notes: status !== 'fail' ? '' : it.notes,
            };
          }),
        };
      });
      return next;
    });
  };

  const setItemNotes = (sectionIdx: number, itemIdx: number, notes: string) => {
    setSections((prev) =>
      prev.map((s, si) =>
        si !== sectionIdx
          ? s
          : { ...s, items: s.items.map((it, ii) => (ii !== itemIdx ? it : { ...it, notes })) },
      ),
    );
  };

  const setItemSeverity = (sectionIdx: number, itemIdx: number, severity: Severity) => {
    setSections((prev) =>
      prev.map((s, si) =>
        si !== sectionIdx
          ? s
          : { ...s, items: s.items.map((it, ii) => (ii !== itemIdx ? it : { ...it, severity })) },
      ),
    );
  };

  const finishAudit = () => {
    // Check all items answered
    const unanswered = sections.reduce((acc, s) => acc + s.items.filter((i) => i.status === null).length, 0);
    if (unanswered > 0) {
      toast.error(`${unanswered} item${unanswered > 1 ? 's' : ''} still unanswered. Complete all items to finish.`);
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    setAuditPhase('results');
  };

  // Derived
  const score = computeScore(sections);
  const answered = answeredCount(sections);
  const total = totalItemCount(sections);
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
  const completedSections = sections.filter((s) => s.items.every((i) => i.status !== null)).length;

  const failedItems = sections.flatMap((s) =>
    s.items
      .filter((i) => i.status === 'fail')
      .map((i) => ({ ...i, sectionName: s.name })),
  );
  const criticalFails = failedItems.filter((f) => f.severity === 'critical');
  const majorFails = failedItems.filter((f) => f.severity === 'major');
  const minorFails = failedItems.filter((f) => f.severity === 'minor');

  const sec = sections[currentSection];

  // ---------------------------------------------------------------------------
  // Render: Section Overview
  // ---------------------------------------------------------------------------

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#b8d4e8] p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-2">
          <ClipboardList className="h-6 w-6 text-[#1e4d6b]" />
          <h2 className="text-xl font-bold text-[#1e4d6b]">Self-Inspection Checklist</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Walk through 7 compliance sections covering {total} checklist items. Score your location,
          identify gaps, and generate a corrective action plan.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={startAudit}
            className="px-6 py-2.5 rounded-lg font-semibold text-sm text-[#1e4d6b] bg-[#d4af37] hover:bg-[#c49a2b] transition-colors"
          >
            <Play className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Start Inspection
          </button>
          {hasSavedState && (
            <>
              <button
                onClick={resumeAudit}
                className="px-6 py-2.5 rounded-lg font-semibold text-sm text-[#1e4d6b] border-2 border-[#d4af37] hover:bg-[#eef4f8] transition-colors"
              >
                <RotateCcw className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                Resume Inspection
              </button>
              <button
                onClick={discardDraft}
                className="px-4 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                Discard Draft
              </button>
            </>
          )}
        </div>
      </div>

      {/* Section cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((s, idx) => (
          <div
            key={s.id}
            className="bg-white rounded-xl border border-[#b8d4e8] p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="h-9 w-9 rounded-lg bg-[#eef4f8] flex items-center justify-center text-[#1e4d6b]">
                {SECTION_ICONS[idx]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{s.name}</h3>
                <p className="text-xs text-gray-500">{s.citation}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{s.items.length} items</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render: Walkthrough
  // ---------------------------------------------------------------------------

  const renderWalkthrough = () => {
    if (!sec) return null;
    const sectionPct = total > 0 ? Math.round((answered / total) * 100) : 0;

    return (
      <div className="space-y-4">
        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-[#b8d4e8] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {completedSections} of 7 sections &mdash; {sectionPct}% complete
            </span>
            <span className={`text-sm font-bold ${getScoreColor(score)}`}>Score: {score}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${sectionPct}%`, backgroundColor: '#d4af37' }}
            />
          </div>
        </div>

        {/* Back link */}
        <button
          onClick={() => setAuditPhase('overview')}
          className="text-sm text-[#1e4d6b] hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to All Sections
        </button>

        {/* Section header */}
        <div className="bg-white rounded-xl border border-[#b8d4e8] p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-lg bg-[#eef4f8] flex items-center justify-center text-[#1e4d6b]">
              {SECTION_ICONS[currentSection]}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1e4d6b]">
                Section {currentSection + 1}: {sec.name}
              </h2>
              <p className="text-xs text-gray-500">{sec.citation}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {sectionAnswered(sec)} of {sec.items.length} items answered
          </p>
        </div>

        {/* Items */}
        <div className="space-y-3">
          {sec.items.map((item, ii) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-4 transition-colors ${
                item.status === 'pass'
                  ? 'border-green-300 bg-green-50/30'
                  : item.status === 'fail'
                  ? 'border-red-300 bg-red-50/30'
                  : item.status === 'na'
                  ? 'border-gray-300 bg-gray-50/30'
                  : 'border-[#b8d4e8]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.text}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{sec.citation}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setItemStatus(currentSection, ii, 'pass')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg font-semibold text-xs transition-colors ${
                      item.status === 'pass'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                    }`}
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Pass
                  </button>
                  <button
                    onClick={() => setItemStatus(currentSection, ii, 'fail')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg font-semibold text-xs transition-colors ${
                      item.status === 'fail'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    }`}
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    <XCircle className="h-4 w-4" />
                    Fail
                  </button>
                  <button
                    onClick={() => setItemStatus(currentSection, ii, 'na')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg font-semibold text-xs transition-colors ${
                      item.status === 'na'
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    <MinusCircle className="h-4 w-4" />
                    N/A
                  </button>
                </div>
              </div>

              {/* Fail details */}
              {item.status === 'fail' && (
                <div className="mt-3 pt-3 border-t border-red-200 space-y-3">
                  <textarea
                    value={item.notes}
                    onChange={(e) => setItemNotes(currentSection, ii, e.target.value)}
                    placeholder="Describe the issue..."
                    rows={2}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b] resize-none"
                  />
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Severity</p>
                    <div className="flex gap-2">
                      {(['critical', 'major', 'minor'] as Severity[]).map((sev) => {
                        const colors = {
                          critical: item.severity === sev ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 border border-red-200',
                          major: item.severity === sev ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 border border-orange-200',
                          minor: item.severity === sev ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 border border-yellow-200',
                        };
                        return (
                          <button
                            key={sev}
                            onClick={() => setItemSeverity(currentSection, ii, sev)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${colors[sev]}`}
                            style={{ minHeight: 36 }}
                          >
                            {sev.charAt(0).toUpperCase() + sev.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <PhotoButton
                    photos={auditPhotos}
                    onChange={setAuditPhotos}
                    maxPhotos={3}
                    compact
                    label="Attach Photo"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-[#b8d4e8] p-4">
          <button
            onClick={() => setCurrentSection((p) => Math.max(0, p - 1))}
            disabled={currentSection === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-[#1e4d6b] bg-[#eef4f8] hover:bg-[#d9e8f0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ minHeight: 44 }}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Section
          </button>
          {currentSection < 6 ? (
            <button
              onClick={() => setCurrentSection((p) => Math.min(6, p + 1))}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[#1e4d6b] hover:bg-[#2a6a8f] transition-colors"
              style={{ minHeight: 44 }}
            >
              Next Section
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={finishAudit}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold text-[#1e4d6b] bg-[#d4af37] hover:bg-[#c49a2b] transition-colors"
              style={{ minHeight: 44 }}
            >
              Finish Inspection
            </button>
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Results
  // ---------------------------------------------------------------------------

  const renderResults = () => {
    // Circular progress
    const circleSize = 140;
    const strokeWidth = 10;
    const radius = (circleSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    // Section scores for bar chart
    const sectionScores = sections.map((s) => {
      const penaltyMap: Record<Severity, number> = { critical: 10, major: 5, minor: 2 };
      let items = 0;
      let penalty = 0;
      s.items.forEach((it) => {
        if (it.status === 'na' || it.status === null) return;
        items++;
        if (it.status === 'fail') penalty += penaltyMap[it.severity];
      });
      if (items === 0) return 100;
      return Math.max(0, Math.round(((items * 10 - penalty) / (items * 10)) * 100));
    });

    return (
      <div className="space-y-6">
        {/* Score overview */}
        <div className="bg-white rounded-xl border border-[#b8d4e8] p-4 sm:p-5 text-center">
          <h2 className="text-lg font-bold text-[#1e4d6b] mb-4">Inspection Results</h2>
          <div className="flex justify-center mb-4">
            <svg width={circleSize} height={circleSize} className="-rotate-90">
              <circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={strokeWidth}
              />
              <circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                fill="none"
                className={getScoreRing(score)}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className="absolute flex items-center justify-center" style={{ width: circleSize, height: circleSize }}>
              <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}%</span>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {failedItems.length} failed item{failedItems.length !== 1 ? 's' : ''} out of{' '}
            {sections.reduce((a, s) => a + s.items.filter((i) => i.status !== null && i.status !== 'na').length, 0)} scored
          </p>
          {startedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Completed {format(new Date(), 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </div>

        {/* Section breakdown bar chart */}
        <div className="bg-white rounded-xl border border-[#b8d4e8] p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Score by Section</h3>
          <div className="space-y-3">
            {sections.map((s, idx) => (
              <div key={s.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[60%]">{s.name}</span>
                  <span className={`text-xs font-bold ${getScoreColor(sectionScores[idx])}`}>
                    {sectionScores[idx]}%
                  </span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getScoreBg(sectionScores[idx])}`}
                    style={{ width: `${sectionScores[idx]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Failed items grouped by severity */}
        {failedItems.length > 0 && (
          <div className="bg-white rounded-xl border border-[#b8d4e8] p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Failed Items</h3>
            {[
              { label: 'Critical', items: criticalFails, color: 'border-l-red-500' },
              { label: 'Major', items: majorFails, color: 'border-l-orange-500' },
              { label: 'Minor', items: minorFails, color: 'border-l-yellow-500' },
            ]
              .filter((g) => g.items.length > 0)
              .map((group) => (
                <div key={group.label} className="mb-4 last:mb-0">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {group.label} ({group.items.length})
                  </h4>
                  <div className="space-y-2">
                    {group.items.map((f) => (
                      <div
                        key={f.id}
                        className={`border-l-4 ${group.color} bg-gray-50 rounded-r-lg p-3`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{f.text}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{f.sectionName}</p>
                          </div>
                          {severityBadge(f.severity)}
                        </div>
                        {f.notes && <p className="text-xs text-gray-600 mt-1.5 italic">{f.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Action Plan */}
        {failedItems.length > 0 && (
          <div className="bg-white rounded-xl border border-[#b8d4e8] p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">
              <AlertTriangle className="h-4 w-4 inline mr-1.5 -mt-0.5 text-[#d4af37]" />
              Corrective Action Plan
            </h3>
            <div className="space-y-3">
              {failedItems.map((f, idx) => (
                <div key={f.id} className="flex gap-3">
                  <span className="text-xs font-bold text-gray-400 mt-0.5 shrink-0">{idx + 1}.</span>
                  <div>
                    <p className="text-sm text-gray-800">{correctiveAction(f, f.sectionName)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Photos */}
        {auditPhotos.length > 0 && (
          <PhotoGallery photos={auditPhotos} title="Inspection Photos" />
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() =>
              guardAction('print', 'Self-Inspection Report', () => toast.success('Printing report...'))
            }
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-[#1e4d6b] bg-[#eef4f8] border border-[#b8d4e8] hover:bg-[#d9e8f0] transition-colors"
            style={{ minHeight: 44 }}
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
          <button
            onClick={() =>
              guardAction('export', 'Self-Inspection Results', () => toast.success('Sharing results...'))
            }
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-[#1e4d6b] bg-[#eef4f8] border border-[#b8d4e8] hover:bg-[#d9e8f0] transition-colors"
            style={{ minHeight: 44 }}
          >
            <Share2 className="h-4 w-4" />
            Share Results
          </button>
          <button
            onClick={resetAudit}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold text-[#1e4d6b] bg-[#d4af37] hover:bg-[#c49a2b] transition-colors"
            style={{ minHeight: 44 }}
          >
            <RotateCcw className="h-4 w-4" />
            Start New Inspection
          </button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: History Tab
  // ---------------------------------------------------------------------------

  const renderHistory = () => (
    <div className="space-y-4">
      {/* Trend header */}
      <div className="bg-white rounded-xl border border-[#b8d4e8] p-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h3 className="text-sm font-bold text-gray-900">Inspection Trend</h3>
        </div>
        <p className="text-sm text-gray-600">
          Your scores have improved from 85% to 94% over the last 3 inspections — a{' '}
          <span className="font-semibold text-green-600">+9 point</span> improvement.
        </p>
      </div>

      {/* Audit rows */}
      {DEMO_HISTORY.map((audit) => {
        const isExpanded = expandedHistory === audit.id;
        return (
          <div
            key={audit.id}
            className="bg-white rounded-xl border border-[#b8d4e8] overflow-hidden"
          >
            <button
              onClick={() => setExpandedHistory(isExpanded ? null : audit.id)}
              className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[#eef4f8]/50 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {format(new Date(audit.date), 'MMM d, yyyy')}
                  </span>
                  <span className={`text-lg font-bold ${getScoreColor(audit.score)}`}>
                    {audit.score}%
                  </span>
                  {/* Trend arrow */}
                  {audit.score >= 90 ? (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
                      <TrendingUp className="h-3 w-3" />
                    </span>
                  ) : audit.score >= 85 ? (
                    <span className="text-xs text-yellow-600 font-medium flex items-center gap-0.5">
                      <TrendingUp className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>{audit.totalFails} fail{audit.totalFails !== 1 ? 's' : ''}</span>
                  {audit.critical > 0 && (
                    <span className="text-red-600 font-medium">{audit.critical} critical</span>
                  )}
                  {audit.major > 0 && (
                    <span className="text-orange-600 font-medium">{audit.major} major</span>
                  )}
                  {audit.minor > 0 && (
                    <span className="text-yellow-600 font-medium">{audit.minor} minor</span>
                  )}
                  <span className="text-gray-400">|</span>
                  <span>{audit.auditor}</span>
                </div>
              </div>
              <ChevronRight
                className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </button>

            {isExpanded && (
              <div className="border-t border-[#b8d4e8] px-5 py-4 bg-[#eef4f8]/30">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Failed Items
                </h4>
                <div className="space-y-2">
                  {audit.fails.map((f, idx) => (
                    <div
                      key={idx}
                      className={`border-l-4 ${
                        f.severity === 'critical'
                          ? 'border-l-red-500'
                          : f.severity === 'major'
                          ? 'border-l-orange-500'
                          : 'border-l-yellow-500'
                      } bg-white rounded-r-lg p-3`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{f.item}</p>
                          <p className="text-xs text-gray-500">{f.section}</p>
                        </div>
                        {severityBadge(f.severity)}
                      </div>
                      {f.notes && <p className="text-xs text-gray-600 mt-1.5 italic">{f.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Main Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#eef4f8]">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Self-Inspection' },
        ]}
      />

      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-[#b8d4e8] p-1">
          <button
            onClick={() => {
              setActiveTab('audit');
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'audit'
                ? 'bg-[#1e4d6b] text-white'
                : 'text-gray-600 hover:bg-[#eef4f8]'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Inspection Mode
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'history'
                ? 'bg-[#1e4d6b] text-white'
                : 'text-gray-600 hover:bg-[#eef4f8]'
            }`}
          >
            <History className="h-4 w-4" />
            History
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'audit' && (
          <>
            {auditPhase === 'overview' && renderOverview()}
            {auditPhase === 'walkthrough' && renderWalkthrough()}
            {auditPhase === 'results' && renderResults()}
          </>
        )}
        {activeTab === 'history' && renderHistory()}
      </div>

      {/* Demo upgrade modal */}
      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
         
        />
      )}
    </div>
  );
}
