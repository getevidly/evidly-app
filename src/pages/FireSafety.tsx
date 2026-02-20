import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Flame, Check, X, Camera, AlertTriangle, Clock, ChevronDown,
  ChevronRight, CheckCircle2, XCircle, FileText, MapPin, CalendarDays,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { toast } from 'sonner';
import { useRole } from '../contexts/RoleContext';
import { DEMO_LOCATION_GRADE_OVERRIDES } from '../data/demoJurisdictions';
import { FireStatusBars } from '../components/shared/FireStatusBars';
import { PhotoButton, type PhotoRecord } from '../components/PhotoEvidence';

// ── Brand ─────────────────────────────────────────────────────────
const NAVY = '#1e4d6b';
const NAVY_HOVER = '#163a52';
const GOLD = '#d4af37';
const LIGHT_BLUE_BG = '#eef4f8';
const BORDER = '#b8d4e8';

const F: React.CSSProperties = { fontFamily: "'Inter', 'DM Sans', sans-serif" };

// ── Authority source display labels ───────────────────────────────
const AUTHORITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  nfpa_96:   { label: 'NFPA 96',        color: '#b91c1c', bg: '#fef2f2' },
  cfc:       { label: 'NFPA 96 (2024)',  color: '#c2410c', bg: '#fff7ed' },
  nfpa_10:   { label: 'NFPA 10',        color: '#b91c1c', bg: '#fef2f2' },
  nfpa_80:   { label: 'NFPA 80',        color: '#b91c1c', bg: '#fef2f2' },
  nfpa_101:  { label: 'NFPA 101',       color: '#b91c1c', bg: '#fef2f2' },
  calfire:   { label: 'CalFire Title 19', color: '#c2410c', bg: '#fff7ed' },
  evidly_best_practice: { label: 'EvidLY Best Practice', color: '#1e4d6b', bg: '#eef4f8' },
};

// ── Types ─────────────────────────────────────────────────────────
type Frequency = 'daily' | 'weekly' | 'monthly';

interface FireCheckItem {
  id: string;
  title: string;
  description: string;
  category: string;
  authoritySource: string;
  authoritySection: string | null;
  authorityNote: string;
  requiresCorrectiveAction: boolean;
  requiresPhotoOnFail: boolean;
}

interface CheckResponse {
  status: 'pass' | 'fail' | null;
  notes: string;
  correctiveAction: string;
  photos: PhotoRecord[];
}

// ── Demo checklist items (matching DB seed exactly) ───────────────

const DAILY_ITEMS: FireCheckItem[] = [
  { id: 'fd-1', title: 'Hood system visual inspection', description: 'Hood system visual inspection — filters in place, no visible grease buildup', category: 'hood_system', authoritySource: 'nfpa_96', authoritySection: '§12.4', authorityNote: 'NFPA 96 requires regular inspection of grease removal devices', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fd-2', title: 'Ansul system gauge check', description: 'Ansul system indicator — gauge in green range', category: 'suppression', authoritySource: 'nfpa_96', authoritySection: '§12.1', authorityNote: 'Fire suppression system must show proper pressure', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fd-3', title: 'Manual pull station accessible', description: 'Manual pull station — accessible, not blocked', category: 'suppression', authoritySource: 'cfc', authoritySection: '§607.2', authorityNote: 'Manual activation device must be unobstructed', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fd-4', title: 'K-class extinguisher in place', description: 'K-class fire extinguisher — in place near cooking equipment, pin intact', category: 'extinguisher', authoritySource: 'nfpa_96', authoritySection: '§12.3', authorityNote: 'Class K extinguisher required within 30ft of cooking', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fd-5', title: 'Exit signs illuminated', description: 'Exit signs — illuminated front and back of house', category: 'egress', authoritySource: 'cfc', authoritySection: '§1013.1', authorityNote: 'Exit signs must be illuminated at all times', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fd-6', title: 'Exit routes clear', description: 'Exit routes — clear and unobstructed', category: 'egress', authoritySource: 'cfc', authoritySection: '§1003.6', authorityNote: 'Means of egress must be free of obstructions', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fd-7', title: 'Emergency lighting functional', description: 'Emergency lighting — functional', category: 'egress', authoritySource: 'cfc', authoritySection: '§1008.3', authorityNote: 'Emergency lighting must activate on power failure', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fd-8', title: 'Gas line connections secure', description: 'Gas line connections — no smell, secure', category: 'general_fire', authoritySource: 'evidly_best_practice', authoritySection: null, authorityNote: 'Check gas connections for leaks before firing equipment', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
];

const WEEKLY_ITEMS: FireCheckItem[] = [
  { id: 'fw-1', title: 'Hood filters inspection', description: 'Hood filters — remove and inspect for grease saturation', category: 'hood_system', authoritySource: 'nfpa_96', authoritySection: '§12.4', authorityNote: 'Grease removal devices must be cleaned when grease buildup is evident', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fw-2', title: 'Grease trap level check', description: 'Grease trap/grease interceptor level check', category: 'hood_system', authoritySource: 'evidly_best_practice', authoritySection: null, authorityNote: 'Prevents overflow and sewer backup', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fw-3', title: 'Fire extinguishers visual', description: 'All fire extinguishers — visual inspection, accessible, charged, pin intact', category: 'extinguisher', authoritySource: 'nfpa_96', authoritySection: '§12.3', authorityNote: 'Portable extinguishers must be inspected monthly minimum', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fw-4', title: 'Ansul nozzles visual', description: 'Ansul nozzles — visual check for grease blockage', category: 'suppression', authoritySource: 'nfpa_96', authoritySection: '§12.1', authorityNote: 'Nozzle tips must be free of grease/debris', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fw-5', title: 'Emergency exit lighting test', description: 'Emergency exit lighting — test function', category: 'egress', authoritySource: 'cfc', authoritySection: '§1008.3', authorityNote: 'Emergency lighting must be tested regularly', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fw-6', title: 'Electrical panels clearance', description: 'Electrical panels — 36" clearance maintained', category: 'general_fire', authoritySource: 'cfc', authoritySection: '§605.3', authorityNote: '36-inch clearance required for electrical panels', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fw-7', title: 'Combustible clearance 18"', description: '18" clearance from cooking equipment to combustibles', category: 'general_fire', authoritySource: 'cfc', authoritySection: '§607.1', authorityNote: 'Maintain clearance between cooking surfaces and combustible materials', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
];

const MONTHLY_ITEMS: FireCheckItem[] = [
  { id: 'fm-1', title: 'Extinguisher monthly inspection', description: 'Fire extinguisher monthly inspection — document on tag', category: 'extinguisher', authoritySource: 'nfpa_96', authoritySection: '§12.3', authorityNote: 'Monthly inspection required per NFPA 10', requiresCorrectiveAction: false, requiresPhotoOnFail: true },
  { id: 'fm-2', title: 'Ansul gauge photo', description: 'Ansul system gauge — photograph current reading', category: 'suppression', authoritySource: 'nfpa_96', authoritySection: '§12.1', authorityNote: 'Document suppression system pressure monthly', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fm-3', title: 'Hood/duct exterior inspection', description: 'Hood/duct system — visual exterior inspection', category: 'hood_system', authoritySource: 'nfpa_96', authoritySection: '§11.6', authorityNote: 'Check for grease leaks at duct joints and access panels', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fm-4', title: 'Roof grease containment', description: 'Grease containment on roof — check level', category: 'hood_system', authoritySource: 'nfpa_96', authoritySection: '§12.4', authorityNote: 'Rooftop grease containment must not overflow', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fm-5', title: 'Fire alarm test', description: 'Fire alarm test (if owner-testable)', category: 'general_fire', authoritySource: 'cfc', authoritySection: '§907.8', authorityNote: 'Fire alarm systems require periodic testing', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fm-6', title: 'Sprinkler head inspection', description: 'Sprinkler head inspection — not obstructed, not painted', category: 'general_fire', authoritySource: 'cfc', authoritySection: '§903.5', authorityNote: 'Sprinkler heads must have proper clearance and not be painted or modified', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
  { id: 'fm-7', title: 'K-class travel distance', description: 'K-class extinguisher — verify within 30ft travel distance of cooking', category: 'extinguisher', authoritySource: 'nfpa_96', authoritySection: '§12.3', authorityNote: 'Maximum 30ft travel distance to Class K extinguisher from cooking equipment', requiresCorrectiveAction: false, requiresPhotoOnFail: false },
];

const ITEMS_BY_FREQUENCY: Record<Frequency, FireCheckItem[]> = {
  daily: DAILY_ITEMS,
  weekly: WEEKLY_ITEMS,
  monthly: MONTHLY_ITEMS,
};

const TAB_LABELS: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const LOCATIONS = [
  { urlId: 'downtown', name: 'Downtown Kitchen' },
  { urlId: 'airport', name: 'Airport Cafe' },
  { urlId: 'university', name: 'University Dining' },
];

// Demo pre-filled check history (some items pre-completed for demo realism)
const DEMO_PREFILLED: Record<string, Record<string, CheckResponse>> = {
  downtown: {
    'fd-1': { status: 'pass', notes: '', correctiveAction: '', photos: [] },
    'fd-2': { status: 'pass', notes: '', correctiveAction: '', photos: [] },
    'fd-3': { status: 'pass', notes: '', correctiveAction: '', photos: [] },
    'fd-4': { status: 'pass', notes: '', correctiveAction: '', photos: [] },
    'fd-5': { status: 'pass', notes: '', correctiveAction: '', photos: [] },
    'fd-6': { status: 'pass', notes: '', correctiveAction: '', photos: [] },
  },
  airport: {
    'fd-1': { status: 'pass', notes: '', correctiveAction: '', photos: [] },
    'fd-2': { status: 'fail', notes: 'Gauge shows yellow range', correctiveAction: 'Called vendor for inspection', photos: [] },
    'fd-3': { status: 'pass', notes: '', correctiveAction: '', photos: [] },
  },
  university: {
    'fd-1': { status: 'fail', notes: 'Grease buildup visible on filter #3', correctiveAction: 'Scheduled deep clean for tomorrow', photos: [] },
  },
};

// ── Component ─────────────────────────────────────────────────────

export function FireSafety() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userRole } = useRole();

  const locationParam = searchParams.get('location') || 'downtown';
  const [activeTab, setActiveTab] = useState<Frequency>('daily');
  const [responses, setResponses] = useState<Record<string, CheckResponse>>(() => {
    return DEMO_PREFILLED[locationParam] || {};
  });
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const jieKey = `demo-loc-${locationParam}`;
  const override = DEMO_LOCATION_GRADE_OVERRIDES[jieKey];
  const fireGrade = override?.fireSafety?.grade || 'Pending';
  const fireDisplay = override?.fireSafety?.gradeDisplay || 'Pending Verification';
  const fireSummary = override?.fireSafety?.summary || '';
  const fireStatus = override?.fireSafety?.status || 'unknown';
  const locationName = LOCATIONS.find(l => l.urlId === locationParam)?.name || 'Downtown Kitchen';

  const items = useMemo(() => {
    if (userRole === 'kitchen_staff' && activeTab !== 'daily') return [];
    return ITEMS_BY_FREQUENCY[activeTab];
  }, [activeTab, userRole]);

  const completedCount = useMemo(() => {
    return items.filter(item => responses[item.id]?.status != null).length;
  }, [items, responses]);

  const passCount = useMemo(() => {
    return items.filter(item => responses[item.id]?.status === 'pass').length;
  }, [items, responses]);

  const failCount = useMemo(() => {
    return items.filter(item => responses[item.id]?.status === 'fail').length;
  }, [items, responses]);

  const canSubmit = useMemo(() => {
    if (completedCount === 0) return false;
    // Check that all failed items have corrective actions if required
    for (const item of items) {
      const r = responses[item.id];
      if (r?.status === 'fail' && !r.correctiveAction.trim()) return false;
    }
    return true;
  }, [items, responses, completedCount]);

  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const updateResponse = useCallback((itemId: string, updates: Partial<CheckResponse>) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: {
        status: null,
        notes: '',
        correctiveAction: '',
        photos: [],
        ...prev[itemId],
        ...updates,
      },
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success(`${TAB_LABELS[activeTab]} fire safety checklist submitted successfully`, {
        description: `${completedCount}/${items.length} items completed — ${passCount} passed, ${failCount} failed`,
      });
    }, 800);
  }, [activeTab, completedCount, items.length, passCount, failCount]);

  const handleReset = useCallback(() => {
    setResponses(DEMO_PREFILLED[locationParam] || {});
    setSubmitted(false);
  }, [locationParam]);

  return (
    <div style={{ ...F, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
            <Flame size={22} color="#dc2626" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Fire Safety Checklist</h1>
            <p className="text-sm text-gray-500">NFPA 96 (2024) · ANSI/UL 300</p>
          </div>
        </div>

        {/* Location selector */}
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-gray-400" />
          <select
            value={locationParam}
            onChange={e => navigate(`/fire-safety?location=${e.target.value}`)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2"
            style={{ focusRingColor: GOLD } as any}
          >
            {LOCATIONS.map(loc => (
              <option key={loc.urlId} value={loc.urlId}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Fire Safety Status Card */}
      <div className="rounded-xl border p-4 mb-6" style={{ backgroundColor: LIGHT_BLUE_BG, borderColor: BORDER }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-xl font-bold px-3 py-1 rounded-full ${
                fireStatus === 'passing' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>{fireGrade}</div>
              <div className="text-xs text-gray-500 mt-1">{fireSummary}</div>
            </div>
            <div className="h-10 w-px bg-gray-300" />
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">{completedCount}/{items.length}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold" style={{ color: '#16a34a' }}>{passCount}</div>
                <div className="text-xs text-gray-500">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold" style={{ color: failCount > 0 ? '#dc2626' : '#6b7280' }}>{failCount}</div>
                <div className="text-xs text-gray-500">Failed</div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Progress</div>
            <div className="w-40 h-2.5 bg-white rounded-full overflow-hidden border" style={{ borderColor: '#d1d5db' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%`, backgroundColor: progressPercent === 100 ? '#16a34a' : NAVY }} />
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{progressPercent}%</div>
          </div>
        </div>
        {/* Fire status bars below */}
        {override && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <FireStatusBars
              permitStatus={override.fireSafety.permitStatus}
              hoodStatus={override.fireSafety.hoodStatus}
              extinguisherStatus={override.fireSafety.extinguisherStatus}
              ansulStatus={override.fireSafety.ansulStatus}
            />
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {(Object.keys(TAB_LABELS) as Frequency[]).map(freq => {
          const isActive = activeTab === freq;
          const count = ITEMS_BY_FREQUENCY[freq].length;
          const isDisabled = userRole === 'kitchen_staff' && freq !== 'daily';
          return (
            <button
              key={freq}
              onClick={() => { if (!isDisabled) { setActiveTab(freq); setSubmitted(false); } }}
              disabled={isDisabled}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              }`}
              style={isActive ? { backgroundColor: NAVY, color: 'white' } : { color: '#4b5563' }}
            >
              {TAB_LABELS[freq]}
              <span className="ml-1.5 text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Submitted banner */}
      {submitted && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-600" />
            <span className="text-sm font-medium text-green-800">
              {TAB_LABELS[activeTab]} checklist submitted successfully
            </span>
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-green-700 hover:text-green-900 font-medium"
          >
            Start New
          </button>
        </div>
      )}

      {/* Checklist Items */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const response = responses[item.id] || { status: null, notes: '', correctiveAction: '', photos: [] };
          const isExpanded = expandedItem === item.id;
          const isFailed = response.status === 'fail';
          const isPassed = response.status === 'pass';
          const needsCorrectiveAction = isFailed && !response.correctiveAction.trim();
          const auth = AUTHORITY_LABELS[item.authoritySource] || AUTHORITY_LABELS.evidly_best_practice;

          return (
            <div
              key={item.id}
              className={`rounded-xl border transition-all ${
                isFailed ? 'border-red-200 bg-red-50/30' :
                isPassed ? 'border-green-200 bg-green-50/30' :
                'border-gray-200 bg-white'
              }`}
            >
              {/* Main row */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Item number */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{
                      backgroundColor: isPassed ? '#dcfce7' : isFailed ? '#fecaca' : '#f3f4f6',
                      color: isPassed ? '#166534' : isFailed ? '#991b1b' : '#6b7280',
                    }}
                  >
                    {isPassed ? <Check size={14} /> : isFailed ? <X size={14} /> : idx + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                      {/* Authority badge */}
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ color: auth.color, backgroundColor: auth.bg }}
                      >
                        {auth.label}{item.authoritySection ? ` ${item.authoritySection}` : ''}
                      </span>
                      {needsCorrectiveAction && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          Corrective action required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                  </div>

                  {/* Pass/Fail buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => updateResponse(item.id, { status: response.status === 'pass' ? null : 'pass' })}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        isPassed
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-green-400 hover:text-green-600'
                      }`}
                      disabled={submitted}
                    >
                      <Check size={14} />
                      Pass
                    </button>
                    <button
                      onClick={() => updateResponse(item.id, { status: response.status === 'fail' ? null : 'fail' })}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        isFailed
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-red-400 hover:text-red-600'
                      }`}
                      disabled={submitted}
                    >
                      <X size={14} />
                      Fail
                    </button>
                    <button
                      onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300"
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>
                </div>

                {/* Failed item — corrective action inline */}
                {isFailed && !isExpanded && (
                  <div className="mt-3 ml-10">
                    <label className="text-xs font-semibold text-red-700 block mb-1">
                      <AlertTriangle size={12} className="inline mr-1" />
                      Corrective Action {needsCorrectiveAction && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      value={response.correctiveAction}
                      onChange={e => updateResponse(item.id, { correctiveAction: e.target.value })}
                      placeholder="Describe corrective action taken or planned..."
                      rows={2}
                      disabled={submitted}
                      className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Expanded section */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 ml-10">
                  <div className="grid gap-3">
                    {/* Authority note */}
                    <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5">
                      <EvidlyIcon size={13} className="mt-0.5 flex-shrink-0" />
                      <span>{item.authorityNote}</span>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
                      <textarea
                        value={response.notes}
                        onChange={e => updateResponse(item.id, { notes: e.target.value })}
                        placeholder="Optional notes..."
                        rows={2}
                        disabled={submitted}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                      />
                    </div>

                    {/* Corrective action (when expanded and failed) */}
                    {isFailed && (
                      <div>
                        <label className="text-xs font-semibold text-red-700 block mb-1">
                          <AlertTriangle size={12} className="inline mr-1" />
                          Corrective Action *
                        </label>
                        <textarea
                          value={response.correctiveAction}
                          onChange={e => updateResponse(item.id, { correctiveAction: e.target.value })}
                          placeholder="Describe corrective action taken or planned..."
                          rows={2}
                          disabled={submitted}
                          className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white resize-none"
                        />
                      </div>
                    )}

                    {/* Photo evidence */}
                    <div className="flex items-center gap-2">
                      <PhotoButton
                        photos={response.photos}
                        onChange={photos => updateResponse(item.id, { photos })}
                        highlight={isFailed && item.requiresPhotoOnFail}
                        highlightText={isFailed && item.requiresPhotoOnFail ? 'Photo required on fail' : undefined}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Kitchen role message for non-daily tabs */}
      {userRole === 'kitchen_staff' && activeTab !== 'daily' && (
        <div className="text-center py-12 text-gray-500">
          <EvidlyIcon size={32} className="mx-auto mb-2" />
          <p className="text-sm font-medium">{TAB_LABELS[activeTab]} checks are managed by your Kitchen Manager</p>
          <p className="text-xs mt-1">You have access to daily fire safety checks</p>
        </div>
      )}

      {/* Submit bar */}
      {items.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {completedCount}/{items.length} items completed
            {failCount > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                ({failCount} failed — corrective actions required)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {submitted ? (
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Start New Checklist
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: canSubmit ? NAVY : '#9ca3af' }}
                onMouseEnter={e => { if (canSubmit) (e.target as HTMLElement).style.backgroundColor = NAVY_HOVER; }}
                onMouseLeave={e => { if (canSubmit) (e.target as HTMLElement).style.backgroundColor = NAVY; }}
              >
                {submitting ? 'Submitting...' : `Submit ${TAB_LABELS[activeTab]} Checklist`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Vendor-Performed Services Reference */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <button
          onClick={() => setExpandedItem(expandedItem === 'vendor-ref' ? null : 'vendor-ref')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Vendor-Performed Services</span>
            <span className="text-xs text-gray-400">(tracked in Equipment)</span>
          </div>
          {expandedItem === 'vendor-ref' ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </button>
        {expandedItem === 'vendor-ref' && (
          <div className="border-t border-gray-100 p-4">
            <div className="space-y-3">
              {[
                { service: 'Hood Cleaning', freq: 'Semi-annual / Quarterly', authority: 'NFPA 96 §11.6', vendor: 'IKECA-certified vendor' },
                { service: 'Ansul System Service', freq: 'Semi-annual', authority: 'NFPA 96 §10.3 / ANSI/UL 300', vendor: 'Licensed fire protection vendor' },
                { service: 'Fire Extinguisher Annual', freq: 'Annual', authority: 'NFPA 10 §7.3', vendor: 'Professional fire equipment company' },
                { service: 'Grease Trap Cleaning', freq: 'Per schedule', authority: 'Local plumbing code', vendor: 'Licensed hauler' },
              ].map(svc => (
                <div key={svc.service} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{svc.service}</div>
                    <div className="text-xs text-gray-500">{svc.vendor} · {svc.freq}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: '#b91c1c', backgroundColor: '#fef2f2' }}>
                      {svc.authority}
                    </span>
                    <button
                      onClick={() => navigate('/equipment')}
                      className="text-xs font-medium px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      View in Equipment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom padding for Quick Actions bar */}
      <div className="h-24" />
    </div>
  );
}
