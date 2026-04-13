import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Thermometer, Users, Package, Wrench, Flame, Building2, FileText,
  CheckCircle2, XCircle, MinusCircle, ChevronLeft, ChevronRight,
  Play, RotateCcw, Printer, Share2, Trash2, TrendingUp, AlertTriangle,
  ClipboardList, ArrowLeft, History, Download, ListChecks,
} from 'lucide-react';
import {
  generateSelfInspectionPdf,
  printSelfInspectionPdf,
  type SelfInspectionPdfParams,
} from '../lib/selfInspectionPdf';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { getStateLabel } from '../lib/stateCodes';
import { PhotoEvidence, PhotoButton, type PhotoRecord } from '../components/PhotoEvidence';
import { PhotoGallery } from '../components/PhotoGallery';
import { AIAssistButton, AIGeneratedIndicator } from '../components/ui/AIAssistButton';
import { useJurisdiction } from '../hooks/useJurisdiction';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DEMO_JURISDICTIONS, type DemoJurisdiction } from '../data/demoJurisdictions';
import {
  INSPECTION_SECTIONS,
  INSPECTION_ITEMS,
  FDA_OVERLAY_ITEMS,
  FDA_OVERLAY_SECTION_ADDITIONS,
  getVariancesForJurisdiction,
  getItemVariance,
  type InspectionItemDef,
} from '../data/selfInspectionChecklist';
import { getJurisdictionScoringConfig, type JurisdictionScoringConfig } from '../data/selfInspectionJurisdictionMap';
import {
  computeJurisdictionScore,
  gradeInspection,
  getScoringMethodLabel,
  getGradingFormatLabel,
  type CompletedItem,
} from '../lib/selfInspectionScoring';
import { JurisdictionProfileHeader } from '../components/self-inspection/JurisdictionProfileHeader';
import { VarianceIndicator } from '../components/self-inspection/VarianceIndicator';
import { usePageTitle } from '../hooks/usePageTitle';

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
  itemDefId?: string;   // Links back to InspectionItemDef.id
  citation?: string;    // Jurisdiction-specific citation
  category?: 'food_safety' | 'facility_safety';
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

function buildSections(useFdaOverlay = false): AuditSection[] {
  return INSPECTION_SECTIONS.map((sectionDef, si) => {
    const extras = useFdaOverlay ? (FDA_OVERLAY_SECTION_ADDITIONS[sectionDef.id] || []) : [];
    const allItemIds = [...sectionDef.itemIds, ...extras];
    const items: AuditItem[] = allItemIds.map((itemId, ii) => {
      const def = INSPECTION_ITEMS[itemId] || FDA_OVERLAY_ITEMS[itemId];
      if (!def) {
        return { id: `s${si}-i${ii}`, text: itemId, status: null, notes: '', severity: 'major' as Severity, itemDefId: itemId };
      }
      const citation = useFdaOverlay && def.fdaCitation && def.codeBasis === 'calcode'
        ? def.fdaCitation
        : def.citation;
      return {
        id: `s${si}-i${ii}`,
        text: def.text,
        status: null,
        notes: '',
        severity: def.defaultSeverity,
        itemDefId: def.id,
        citation,
        category: def.category,
      };
    });
    return {
      id: si,
      name: sectionDef.name,
      citation: useFdaOverlay && sectionDef.category === 'food_safety'
        ? sectionDef.defaultCitation.replace('CalCode', 'FDA Food Code 2022')
        : sectionDef.defaultCitation,
      icon: SECTION_ICONS[si],
      items,
    };
  });
}

function buildDemoSections(useFdaOverlay = false): AuditSection[] {
  const sections = buildSections(useFdaOverlay);
  // Sections 0-5 completed with mostly passes and 3 failures
  const demoFails: Record<string, { severity: Severity; notes: string }> = {
    's0-i2': { severity: 'major', notes: 'Walk-in cooler cooling log showed 135°F to 80°F in 2 hours. Needs recalibration.' },
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
      { section: 'Food Temperature Control', item: 'Cold holding below 41°F', severity: 'critical', notes: 'Walk-in cooler temp at 47°F.' },
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
      { section: 'Food Temperature Control', item: 'Cooling from 135°F to 70°F within 2 hours', severity: 'critical', notes: 'Soup cooling took 2.5 hours.' },
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
      { section: 'Food Temperature Control', item: 'Cooling from 135°F to 70°F within 2 hours', severity: 'major', notes: 'Walk-in cooler cooling log showed 135°F to 80°F in 2 hours.' },
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
    critical: 'bg-red-50 text-red-700 border-red-200',
    major: 'bg-orange-100 text-orange-700 border-orange-200',
    minor: 'bg-amber-50 text-amber-700 border-yellow-200',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${map[sev]}`}>
      {sev.charAt(0).toUpperCase() + sev.slice(1)}
    </span>
  );
}

function computeScore(sections: AuditSection[], config?: JurisdictionScoringConfig): number {
  const weights = config?.penaltyWeights || { critical: 10, major: 5, minor: 2 };
  const items: CompletedItem[] = [];
  sections.forEach((s) =>
    s.items.forEach((it) => {
      items.push({ id: it.id, status: it.status, severity: it.severity });
    }),
  );
  const result = computeJurisdictionScore(items, config || {
    key: 'default',
    county: 'Unknown',
    agencyName: 'Unknown',
    penaltyWeights: weights,
    scoringType: 'violation_report',
    gradingType: 'violation_report_only',
    codeBasis: 'calcode',
    inspectionFrequency: 'Annual',
    configLastUpdated: 'Not verified',
    isVerified: false,
    dataSourceTier: 4,
    varianceNotes: [],
  });
  return result.rawScore;
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
  const navigate = useNavigate();
  usePageTitle('Self Audit');

  // Jurisdiction awareness
  const [searchParams] = useSearchParams();
  const { isDemoMode } = useDemo();
  const locationParam = searchParams.get('location') || 'downtown';
  const jieLocKey = `demo-loc-${locationParam}`;
  const locationJurisdiction = useJurisdiction(jieLocKey, isDemoMode);

  // Resolve DemoJurisdiction for scoring
  const demoJurisdiction = useMemo<DemoJurisdiction | null>(() => {
    if (!locationJurisdiction) return DEMO_JURISDICTIONS[0]; // Fresno default
    return DEMO_JURISDICTIONS.find(
      (j) => j.county === locationJurisdiction.county,
    ) || DEMO_JURISDICTIONS[0];
  }, [locationJurisdiction]);

  // Resolve scoring config from 62-jurisdiction map
  const scoringConfig = useMemo<JurisdictionScoringConfig>(() => {
    if (!locationJurisdiction) return getJurisdictionScoringConfig('Fresno');
    return getJurisdictionScoringConfig(locationJurisdiction.county);
  }, [locationJurisdiction]);

  // Dual-jurisdiction detection (Yosemite)
  const isDualJurisdiction = locationJurisdiction?.federalFoodOverlay != null;
  const [activeTrack, setActiveTrack] = useState<'primary' | 'federal'>('primary');

  // Federal overlay scoring config (for NPS track)
  const federalScoringConfig = useMemo<JurisdictionScoringConfig | null>(() => {
    if (!isDualJurisdiction) return null;
    return {
      ...scoringConfig,
      key: 'NPS',
      county: 'Mariposa',
      agencyName: 'NPS — Yosemite Environmental Health',
      codeBasis: 'fda_food_code_2022',
      configLastUpdated: 'Not verified',
      isVerified: false,
      dataSourceTier: 4,
      varianceNotes: ['Federal overlay — FDA Food Code 2022 + NPS Reference Manual 83'],
    };
  }, [isDualJurisdiction, scoringConfig]);

  // Jurisdiction variances for current jurisdiction
  const variances = useMemo(() => {
    return getVariancesForJurisdiction(scoringConfig.county);
  }, [scoringConfig.county]);

  // View state
  const [activeTab, setActiveTab] = useState<'audit' | 'history'>('audit');
  const [auditPhase, setAuditPhase] = useState<'overview' | 'walkthrough' | 'results'>('overview');

  // Audit state
  const [sections, setSections] = useState<AuditSection[]>(() => buildSections(false));
  const [currentSection, setCurrentSection] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  // History state
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [pastSessions, setPastSessions] = useState<HistoryAudit[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Saved state detection
  const [hasSavedState, setHasSavedState] = useState(false);

  // Photo evidence
  const [auditPhotos, setAuditPhotos] = useState<PhotoRecord[]>([]);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());

  // DB persistence
  const { user, profile } = useAuth();
  const dbSessionId = useRef<string | null>(null);

  // Check for saved state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setHasSavedState(true);
    } catch {
      // ignore
    }
  }, []);

  // Fetch past sessions from DB when history tab is selected
  useEffect(() => {
    if (activeTab !== 'history') return;
    if (isDemoMode) {
      setPastSessions(DEMO_HISTORY);
      return;
    }
    if (!profile?.organization_id) return;
    let cancelled = false;
    setLoadingHistory(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('self_inspection_sessions')
          .select('id, started_at, completed_at, sections_json, failed_items_json, user_id')
          .eq('org_id', profile.organization_id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(20);
        if (cancelled || !data) return;
        const mapped: HistoryAudit[] = data.map((row: any) => {
          const failedItems = (row.failed_items_json || []) as any[];
          const critical = failedItems.filter((f: any) => f.severity === 'critical').length;
          const major = failedItems.filter((f: any) => f.severity === 'major').length;
          const minor = failedItems.filter((f: any) => f.severity === 'minor').length;
          return {
            id: row.id,
            date: row.completed_at || row.started_at,
            score: 0, // Not stored — severity counts only
            totalFails: failedItems.length,
            critical,
            major,
            minor,
            auditor: '',
            fails: failedItems.map((f: any) => ({
              section: f.section || '',
              item: f.text || '',
              severity: f.severity || 'major',
              notes: f.notes || '',
            })),
          };
        });
        setPastSessions(mapped);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, isDemoMode, profile?.organization_id]);

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
    updateDbSession(sections);
  }, [sections, currentSection, auditPhase, startedAt]);

  useEffect(() => {
    if (auditPhase === 'walkthrough') saveState();
  }, [sections, currentSection, saveState, auditPhase]);

  // DB helpers
  const createDbSession = async (now: string) => {
    if (isDemoMode || !profile?.organization_id || !user?.id) return;
    try {
      const { data } = await supabase
        .from('self_inspection_sessions')
        .insert({
          org_id: profile.organization_id,
          user_id: user.id,
          jurisdiction_key: scoringConfig.key,
          scoring_type: scoringConfig.scoringType,
          started_at: now,
        })
        .select('id')
        .single();
      if (data) dbSessionId.current = data.id;
    } catch {
      // silent — localStorage is the primary save
    }
  };

  const updateDbSession = async (sectionsData: AuditSection[]) => {
    if (isDemoMode || !dbSessionId.current) return;
    try {
      const stripped = sectionsData.map(s => ({
        id: s.id, name: s.name,
        items: s.items.map(it => ({
          id: it.id, text: it.text, status: it.status,
          notes: it.notes, severity: it.severity,
          itemDefId: it.itemDefId, citation: it.citation,
          category: it.category,
        })),
      }));
      await supabase
        .from('self_inspection_sessions')
        .update({ sections_json: stripped })
        .eq('id', dbSessionId.current);
    } catch {
      // silent
    }
  };

  const finalizeDbSession = async (sectionsData: AuditSection[]) => {
    if (isDemoMode || !dbSessionId.current) return;
    try {
      const failed = sectionsData.flatMap(s =>
        s.items.filter(i => i.status === 'fail').map(i => ({
          id: i.id, text: i.text, severity: i.severity,
          notes: i.notes, section: s.name,
        })),
      );
      await supabase
        .from('self_inspection_sessions')
        .update({
          sections_json: sectionsData.map(s => ({
            id: s.id, name: s.name,
            items: s.items.map(it => ({
              id: it.id, text: it.text, status: it.status,
              notes: it.notes, severity: it.severity,
              itemDefId: it.itemDefId, citation: it.citation,
              category: it.category,
            })),
          })),
          failed_items_json: failed,
          completed_at: new Date().toISOString(),
        })
        .eq('id', dbSessionId.current);
    } catch {
      // silent
    }
  };

  // Handlers
  const startAudit = (track: 'primary' | 'federal' = 'primary') => {
    const useFda = track === 'federal';
    const demo = buildDemoSections(useFda);
    setSections(demo);
    setActiveTrack(track);
    setCurrentSection(6); // land on section 7 (index 6)
    const now = new Date().toISOString();
    setStartedAt(now);
    setAuditPhase('walkthrough');
    setHasSavedState(false);
    createDbSession(now);
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
    setSections(buildSections(activeTrack === 'federal'));
    setCurrentSection(0);
    setStartedAt(null);
    setAuditPhase('overview');
    setHasSavedState(false);
    dbSessionId.current = null;
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
    finalizeDbSession(sections);
    setAuditPhase('results');
  };

  // Derived
  const activeScoringConfig = activeTrack === 'federal' && federalScoringConfig
    ? federalScoringConfig
    : scoringConfig;
  const score = computeScore(sections, activeScoringConfig);

  // Jurisdiction-native grade
  const jurisdictionGrade = useMemo(() => {
    if (!demoJurisdiction) return null;
    return gradeInspection(score, demoJurisdiction);
  }, [score, demoJurisdiction]);
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
      {/* Jurisdiction Profile Header */}
      <JurisdictionProfileHeader
        config={scoringConfig}
        federalOverlay={federalScoringConfig}
      />

      <div className="bg-white rounded-xl border border-[#b8d4e8] p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-2">
          <ClipboardList className="h-6 w-6 text-[#1E2D4D]" />
          <h2 className="text-xl font-bold text-[#1E2D4D]">Self-Inspection Checklist</h2>
        </div>
        <p className="text-sm text-[#1E2D4D]/70 mb-4">
          Walk through 7 compliance sections covering {total} checklist items. Score your location
          using <span className="font-medium">{scoringConfig.agencyName}</span> inspection criteria.
        </p>

        {/* Dual-jurisdiction track selection for Yosemite */}
        {isDualJurisdiction ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => startAudit('primary')}
                className="px-5 py-3 rounded-lg font-semibold text-sm text-[#1E2D4D] bg-[#A08C5A] hover:bg-[#c49a2b] transition-colors text-left"
              >
                <Play className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                Start CalCode Track
                <span className="block text-xs font-normal mt-0.5 opacity-80">
                  Mariposa County — CalCode
                </span>
              </button>
              <button
                onClick={() => startAudit('federal')}
                className="px-5 py-3 rounded-lg font-semibold text-sm text-[#1E2D4D] bg-[#A08C5A] hover:bg-[#c49a2b] transition-colors text-left"
              >
                <Play className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                Start FDA Food Code Track
                <span className="block text-xs font-normal mt-0.5 opacity-80">
                  NPS — FDA Food Code 2022
                </span>
              </button>
            </div>
            {hasSavedState && (
              <div className="flex gap-3">
                <button
                  onClick={resumeAudit}
                  className="px-6 py-2.5 rounded-lg font-semibold text-sm text-[#1E2D4D] border-2 border-[#A08C5A] hover:bg-[#eef4f8] transition-colors"
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
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => startAudit('primary')}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm text-[#1E2D4D] bg-[#A08C5A] hover:bg-[#c49a2b] transition-colors"
            >
              <Play className="h-4 w-4 inline mr-1.5 -mt-0.5" />
              Start Inspection
            </button>
            {hasSavedState && (
              <>
                <button
                  onClick={resumeAudit}
                  className="px-6 py-2.5 rounded-lg font-semibold text-sm text-[#1E2D4D] border-2 border-[#A08C5A] hover:bg-[#eef4f8] transition-colors"
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
        )}
      </div>

      {/* Section cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((s, idx) => (
          <div
            key={s.id}
            className="bg-white rounded-xl border border-[#b8d4e8] p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="h-9 w-9 rounded-lg bg-[#eef4f8] flex items-center justify-center text-[#1E2D4D]">
                {SECTION_ICONS[idx]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[#1E2D4D] truncate">{s.name}</h3>
                <p className="text-xs text-[#1E2D4D]/50">{s.citation}</p>
              </div>
            </div>
            <p className="text-xs text-[#1E2D4D]/50">{s.items.length} items</p>
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
            <span className="text-sm font-medium text-[#1E2D4D]/80">
              {completedSections} of 7 sections &mdash; {sectionPct}% complete
            </span>
            <span className={`text-sm font-bold ${getScoreColor(score)}`}>Score: {score}%</span>
          </div>
          <div className="h-3 bg-[#1E2D4D]/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${sectionPct}%`, backgroundColor: '#A08C5A' }}
            />
          </div>
        </div>

        {/* Active track indicator for dual-jurisdiction */}
        {isDualJurisdiction && (
          <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200">
            {activeTrack === 'primary'
              ? 'Track: Mariposa County — CalCode'
              : 'Track: NPS — FDA Food Code 2022'}
          </div>
        )}

        {/* Back link */}
        <button
          onClick={() => setAuditPhase('overview')}
          className="text-sm text-[#1E2D4D] hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to All Sections
        </button>

        {/* Section header */}
        <div className="bg-white rounded-xl border border-[#b8d4e8] p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-lg bg-[#eef4f8] flex items-center justify-center text-[#1E2D4D]">
              {SECTION_ICONS[currentSection]}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1E2D4D]">
                Section {currentSection + 1}: {sec.name}
              </h2>
              <p className="text-xs text-[#1E2D4D]/50">{sec.citation}</p>
            </div>
          </div>
          <p className="text-sm text-[#1E2D4D]/50 mt-2">
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
                  ? 'border-[#1E2D4D]/15 bg-[#FAF7F0]/30'
                  : 'border-[#b8d4e8]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1E2D4D]">{item.text}</p>
                  <p className="text-xs text-[#1E2D4D]/50 mt-0.5">{item.citation || sec.citation}</p>
                  {/* Jurisdiction Variance indicator */}
                  {item.itemDefId && (() => {
                    const variance = getItemVariance(item.itemDefId!, scoringConfig.county);
                    return variance ? <VarianceIndicator variance={variance} /> : null;
                  })()}
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
                        ? 'bg-[#1E2D4D]/40 text-white'
                        : 'bg-[#FAF7F0] text-[#1E2D4D]/80 hover:bg-[#1E2D4D]/5 border border-[#1E2D4D]/10'
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
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#1E2D4D]/80">Issue Description</span>
                      <AIAssistButton
                        fieldLabel="Issue Description"
                        context={{ itemName: item.text }}
                        currentValue={item.notes}
                        onGenerated={(text) => { setItemNotes(currentSection, ii, text); setAiFields(prev => new Set(prev).add(`notes-${item.id}`)); }}
                      />
                    </div>
                    <textarea
                      value={item.notes}
                      onChange={(e) => { setItemNotes(currentSection, ii, e.target.value); setAiFields(prev => { const n = new Set(prev); n.delete(`notes-${item.id}`); return n; }); }}
                      placeholder="Describe the issue..."
                      rows={2}
                      className="w-full text-sm border border-[#1E2D4D]/15 rounded-xl px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/30 focus:border-[#1E2D4D] resize-none"
                    />
                    {aiFields.has(`notes-${item.id}`) && <AIGeneratedIndicator />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#1E2D4D]/80 mb-1.5">Severity</p>
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
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-[#1E2D4D] bg-[#eef4f8] hover:bg-[#d9e8f0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ minHeight: 44 }}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Section
          </button>
          {currentSection < 6 ? (
            <button
              onClick={() => setCurrentSection((p) => Math.min(6, p + 1))}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[#1E2D4D] hover:bg-[#162340] transition-colors"
              style={{ minHeight: 44 }}
            >
              Next Section
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={finishAudit}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold text-[#1E2D4D] bg-[#A08C5A] hover:bg-[#c49a2b] transition-colors"
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
      const sItems: CompletedItem[] = s.items.map((it) => ({
        id: it.id, status: it.status, severity: it.severity,
      }));
      return computeJurisdictionScore(sItems, activeScoringConfig).rawScore;
    });

    return (
      <div className="space-y-6">
        {/* Jurisdiction context */}
        <JurisdictionProfileHeader
          config={activeScoringConfig}
          federalOverlay={activeTrack === 'federal' ? null : undefined}
        />

        {/* Score overview */}
        <div className="bg-white rounded-xl border border-[#b8d4e8] p-4 sm:p-5 text-center">
          <h2 className="text-lg font-bold text-[#1E2D4D] mb-4">Inspection Results</h2>

          {/* Jurisdiction-native grade display */}
          {jurisdictionGrade && jurisdictionGrade.passFail !== 'no_grade' && (
            <div className="mb-3">
              <span className={`inline-block text-2xl font-extrabold px-4 py-1 rounded-lg ${
                jurisdictionGrade.passFail === 'pass' ? 'bg-emerald-50 text-emerald-700' :
                jurisdictionGrade.passFail === 'warning' ? 'bg-amber-50 text-amber-700' :
                'bg-red-50 text-red-700'
              }`}>
                {jurisdictionGrade.display}
              </span>
            </div>
          )}

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
              <span className={`text-3xl font-bold tracking-tight ${getScoreColor(score)}`}>{score}</span>
            </div>
          </div>

          {/* Scoring method label */}
          <p className="text-xs text-[#1E2D4D]/50 mb-1">
            {getScoringMethodLabel(activeScoringConfig.scoringType)} — {activeScoringConfig.agencyName}
          </p>

          <p className="text-sm text-[#1E2D4D]/70">
            {failedItems.length} failed item{failedItems.length !== 1 ? 's' : ''} out of{' '}
            {sections.reduce((a, s) => a + s.items.filter((i) => i.status !== null && i.status !== 'na').length, 0)} scored
          </p>
          {startedAt && (
            <p className="text-xs text-[#1E2D4D]/30 mt-1">
              Completed {format(new Date(), 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </div>

        {/* Section breakdown bar chart */}
        <div className="bg-white rounded-xl border border-[#b8d4e8] p-5">
          <h3 className="text-sm font-bold text-[#1E2D4D] mb-4">Score by Section</h3>
          <div className="space-y-3">
            {sections.map((s, idx) => (
              <div key={s.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[#1E2D4D]/80 truncate max-w-[60%]">{s.name}</span>
                  <span className={`text-xs font-bold ${getScoreColor(sectionScores[idx])}`}>
                    {sectionScores[idx]}%
                  </span>
                </div>
                <div className="h-2.5 bg-[#1E2D4D]/8 rounded-full overflow-hidden">
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
            <h3 className="text-sm font-bold text-[#1E2D4D] mb-4">Failed Items</h3>
            {[
              { label: 'Critical', items: criticalFails, color: 'border-l-red-500' },
              { label: 'Major', items: majorFails, color: 'border-l-orange-500' },
              { label: 'Minor', items: minorFails, color: 'border-l-yellow-500' },
            ]
              .filter((g) => g.items.length > 0)
              .map((group) => (
                <div key={group.label} className="mb-4 last:mb-0">
                  <h4 className="text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wide mb-2">
                    {group.label} ({group.items.length})
                  </h4>
                  <div className="space-y-2">
                    {group.items.map((f) => (
                      <div
                        key={f.id}
                        className={`border-l-4 ${group.color} bg-[#FAF7F0] rounded-r-lg p-3`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-[#1E2D4D]">{f.text}</p>
                            <p className="text-xs text-[#1E2D4D]/50 mt-0.5">{f.sectionName}</p>
                          </div>
                          {severityBadge(f.severity)}
                        </div>
                        {f.notes && <p className="text-xs text-[#1E2D4D]/70 mt-1.5 italic">{f.notes}</p>}
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
            <h3 className="text-sm font-bold text-[#1E2D4D] mb-4">
              <AlertTriangle className="h-4 w-4 inline mr-1.5 -mt-0.5 text-[#A08C5A]" />
              Corrective Action Plan
            </h3>
            <div className="space-y-3">
              {failedItems.map((f, idx) => (
                <div key={f.id} className="flex gap-3">
                  <span className="text-xs font-bold text-[#1E2D4D]/30 mt-0.5 shrink-0">{idx + 1}.</span>
                  <div>
                    <p className="text-sm text-[#1E2D4D]/90">{correctiveAction(f, f.sectionName)}</p>
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
            onClick={() => {
              const pdfParams: SelfInspectionPdfParams = {
                sections,
                jurisdictionConfig: activeScoringConfig,
                failedItems: failedItems.map(f => ({ ...f, status: 'fail' as const })),
                locationName: locationParam.charAt(0).toUpperCase() + locationParam.slice(1),
              };
              printSelfInspectionPdf(pdfParams);
            }}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-[#1E2D4D] bg-[#eef4f8] border border-[#b8d4e8] hover:bg-[#d9e8f0] transition-colors"
            style={{ minHeight: 44 }}
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
          <button
            onClick={() => {
              const pdfParams: SelfInspectionPdfParams = {
                sections,
                jurisdictionConfig: activeScoringConfig,
                failedItems: failedItems.map(f => ({ ...f, status: 'fail' as const })),
                locationName: locationParam.charAt(0).toUpperCase() + locationParam.slice(1),
              };
              generateSelfInspectionPdf(pdfParams);
              toast.success('PDF downloaded');
            }}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-[#1E2D4D] bg-[#eef4f8] border border-[#b8d4e8] hover:bg-[#d9e8f0] transition-colors"
            style={{ minHeight: 44 }}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
          {failedItems.length > 0 && (
            <button
              onClick={() => {
                const caItems = failedItems.map(f => ({
                  title: f.text,
                  description: correctiveAction(f, f.sectionName),
                  severity: f.severity,
                  section: f.sectionName,
                  citation: f.citation || '',
                  notes: f.notes,
                }));
                sessionStorage.setItem('inspection_ca_items', JSON.stringify(caItems));
                navigate('/corrective-actions?from=self-inspection');
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#1E2D4D] hover:bg-[#162340] transition-colors"
              style={{ minHeight: 44 }}
            >
              <ListChecks className="h-4 w-4" />
              Create Corrective Actions ({failedItems.length})
            </button>
          )}
          <button
            onClick={resetAudit}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold text-[#1E2D4D] bg-[#A08C5A] hover:bg-[#c49a2b] transition-colors"
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
      {/* Trend header (demo only) */}
      {isDemoMode && pastSessions.length > 1 && (
        <div className="bg-white rounded-xl border border-[#b8d4e8] p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="text-sm font-bold text-[#1E2D4D]">Inspection Trend</h3>
          </div>
          <p className="text-sm text-[#1E2D4D]/70">
            Your scores have improved from 85% to 94% over the last 3 inspections — a{' '}
            <span className="font-semibold text-green-600">+9 point</span> improvement.
          </p>
        </div>
      )}

      {loadingHistory && (
        <div className="bg-white rounded-xl border border-[#b8d4e8] p-8 text-center text-sm text-[#1E2D4D]/50">
          Loading past inspections...
        </div>
      )}

      {!loadingHistory && pastSessions.length === 0 && (
        <div className="bg-white rounded-xl border border-[#b8d4e8] p-8 text-center">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 text-[#1E2D4D]/30" />
          <p className="text-sm text-[#1E2D4D]/50">No completed inspections yet.</p>
          <p className="text-xs text-[#1E2D4D]/30 mt-1">Complete a self-inspection to see it here.</p>
        </div>
      )}

      {/* Audit rows */}
      {pastSessions.map((audit) => {
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
                  <span className="text-sm font-semibold text-[#1E2D4D]">
                    {format(new Date(audit.date), 'MMM d, yyyy')}
                  </span>
                  {audit.score > 0 && (
                    <span className={`text-lg font-bold ${getScoreColor(audit.score)}`}>
                      {audit.score}%
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#1E2D4D]/50">
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
                  {audit.auditor && (
                    <>
                      <span className="text-[#1E2D4D]/30">|</span>
                      <span>{audit.auditor}</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight
                className={`h-5 w-5 text-[#1E2D4D]/30 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </button>

            {isExpanded && (
              <div className="border-t border-[#b8d4e8] px-5 py-4 bg-[#eef4f8]/30">
                <h4 className="text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wide mb-3">
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
                          <p className="text-sm font-medium text-[#1E2D4D]">{f.item}</p>
                          <p className="text-xs text-[#1E2D4D]/50">{f.section}</p>
                        </div>
                        {severityBadge(f.severity)}
                      </div>
                      {f.notes && <p className="text-xs text-[#1E2D4D]/70 mt-1.5 italic">{f.notes}</p>}
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
                ? 'bg-[#1E2D4D] text-white'
                : 'text-[#1E2D4D]/70 hover:bg-[#eef4f8]'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Inspection Mode
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'history'
                ? 'bg-[#1E2D4D] text-white'
                : 'text-[#1E2D4D]/70 hover:bg-[#eef4f8]'
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
