// TODO: i18n
import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { toast } from 'sonner';
import { ErrorState } from '../components/shared/PageStates';
import {
  ChevronDown, ChevronUp, MapPin, Phone, ExternalLink,
  CheckCircle2, XCircle, AlertTriangle, Thermometer, FileText,
  Award, Calendar, Wrench, ClipboardList, Building2, RotateCcw,
  Scale, DollarSign, Plus, Search, Zap, Clock, ToggleLeft, ToggleRight, ArrowRight, BookOpen,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  DEMO_LOCATION_JURISDICTIONS,
  getJurisdiction,
  getJurisdictionChain,
} from '../lib/jurisdictions';
import type { InspectionSystem, CaliforniaStateLaw } from '../lib/jurisdictions';
import {
  autoConfigureLocation,
  getDemoComplianceGaps,
  autoDetectJurisdiction,
  getDemoLocationConfigs,
  getKeyCaliforniaRegulations,
  type ComplianceGap,
  type LocationJurisdictionConfig,
  type RegulationStatus,
} from '../lib/jurisdictionEngine';
import { CALIFORNIA_STATE_LAWS } from '../lib/californiaLaws';
import { JURISDICTION_DATABASE, type JurisdictionScore } from '../data/jurisdictionData';
import { getCountyProfile, extractCountySlug } from '../lib/jurisdictionScoring';
import { usePageTitle } from '../hooks/usePageTitle';

// ── Helper functions ────────────────────────────────────────────

function getDocStatus(docName: string, gaps: ComplianceGap[]): 'compliant' | 'missing' | 'expiring' | 'overdue' {
  const gap = gaps.find(g => g.item === docName);
  return gap ? gap.status : 'compliant';
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'compliant': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'missing': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'expiring': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'overdue': return <XCircle className="w-4 h-4 text-red-600" />;
    default: return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  }
}

function getGapActionLabel(category: string): string {
  switch (category) {
    case 'document': return 'Upload';
    case 'certification': return 'Notify Staff';
    case 'service': return 'Schedule';
    case 'posting': return 'Upload';
    default: return 'Resolve';
  }
}

function getInspectionSystemBadge(type: InspectionSystem['type']): { label: string; color: string } {
  switch (type) {
    case 'letter_grade': return { label: 'Letter Grade (A / B / C)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'color_placard': return { label: 'Color Placard', color: 'bg-emerald-50 text-emerald-700 border-green-200' };
    case 'pass_fail': return { label: 'Pass/Fail', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'standard': return { label: 'Standard Inspection', color: 'bg-[#1E2D4D]/5 text-[#1E2D4D]/80 border-[#1E2D4D]/10' };
    default: return { label: type, color: 'bg-[#1E2D4D]/5 text-[#1E2D4D]/80 border-[#1E2D4D]/10' };
  }
}

function getLawStatusBadge(status: CaliforniaStateLaw['status']): { label: string; color: string } {
  switch (status) {
    case 'effective': return { label: 'Effective', color: 'bg-emerald-50 text-emerald-700' };
    case 'upcoming': return { label: 'Upcoming', color: 'bg-amber-100 text-amber-700' };
    case 'phased': return { label: 'Phased', color: 'bg-blue-50 text-blue-700' };
    default: return { label: status, color: 'bg-[#1E2D4D]/5 text-[#1E2D4D]/80' };
  }
}

function getBillBadgeColor(status: CaliforniaStateLaw['status']): string {
  switch (status) {
    case 'effective': return 'bg-green-50 text-green-700 border-green-200';
    case 'upcoming': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'phased': return 'bg-blue-50 text-blue-700 border-blue-200';
    default: return 'bg-[#FAF7F0] text-[#1E2D4D]/80 border-[#1E2D4D]/10';
  }
}

function getDaysRemaining(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyColor(days: number): string {
  if (days < 90) return 'border-red-300 bg-red-50';
  if (days < 180) return 'border-amber-300 bg-amber-50';
  return 'border-blue-300 bg-blue-50';
}

function getUrgencyTextColor(days: number): string {
  if (days < 90) return 'text-red-700';
  if (days < 180) return 'text-amber-700';
  return 'text-blue-700';
}

function getUrgencyBadgeColor(days: number): string {
  if (days < 90) return 'bg-red-50 text-red-700';
  if (days < 180) return 'bg-amber-100 text-amber-700';
  return 'bg-blue-50 text-blue-700';
}

// Short summary for each key CA regulation
const REGULATION_SUMMARIES: Record<string, string> = {
  'calcode-114002-cooling': '2-hour first stage from cooked temp (stricter than FDA)',
  'ab-660': '"BEST if Used By" / "USE By" labels, bans "Sell By"',
  'sb-68': 'Allergen disclosure on menus for chains 20+ locations',
  'sb-1383': '75% organic waste reduction, edible food recovery',
  'sb-476': 'Employer must pay all food handler training costs',
  'cal-osha-3396': 'Heat illness prevention at 82°F for commercial kitchens',
  'ab-418': 'Bans Red Dye 3, potassium bromate, BVO, propylparaben',
  'ab-1147': 'Written pest prevention policy + employee training',
  'cfc-title24-part9': 'Fire suppression, hood cleaning, Class K extinguishers',
  'ab-1228': 'Fast food chains 60+ locations: $20/hr minimum wage',
};

// ── Location name → urlId mapping (for scoring-breakdown link) ──

const LOCATION_URL_ID: Record<string, string> = {
  'Location 1': 'downtown', // demo
  'Location 2': 'airport', // demo
  'Location 3': 'university', // demo
};

// Look up jurisdictionData entries for a given county name (e.g. "Fresno County" → "Fresno")
function getJurisdictionDataForCounty(countyField: string): { food?: JurisdictionScore; fire?: JurisdictionScore } {
  const countyName = countyField.replace(/\s*County\s*$/i, '').trim();
  return {
    food: JURISDICTION_DATABASE.find(j => j.county === countyName && j.pillar === 'food_safety'),
    fire: JURISDICTION_DATABASE.find(j => j.county === countyName && j.pillar === 'facility_safety'),
  };
}

function getTransparencyBadge(level: 'high' | 'medium' | 'low'): { label: string; className: string } {
  switch (level) {
    case 'high': return { label: 'Public Records', className: 'bg-emerald-50 text-emerald-700 border-green-200' };
    case 'medium': return { label: 'Limited Public', className: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'low': return { label: 'FOIA Required', className: 'bg-[#1E2D4D]/5 text-[#1E2D4D]/70 border-[#1E2D4D]/10' };
  }
}

// ── Expandable Description Component ────────────────────────────

function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 150;

  if (!isLong) {
    return <p className="text-sm text-[#1E2D4D]/70">{text}</p>;
  }

  return (
    <div>
      <p className={`text-sm text-[#1E2D4D]/70 ${expanded ? '' : 'line-clamp-2'}`}>
        {text}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-medium text-[#1E2D4D] hover:text-[#2A3F6B] mt-0.5"
      >
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  );
}

// ── Collapsible Section Component ───────────────────────────────

function CollapsibleSection({
  icon,
  title,
  children,
  defaultOpen = false,
  badge,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#1E2D4D]/5 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 sm:px-6 py-3 text-left hover:bg-[#FAF7F0] transition-colors"
      >
        <span className="text-[#1E2D4D]">{icon}</span>
        <span className="text-sm font-semibold text-[#1E2D4D]/90 flex-1">{title}</span>
        {badge}
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#1E2D4D]/30" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#1E2D4D]/30" />
        )}
      </button>
      {open && <div className="px-3 sm:px-6 pb-4">{children}</div>}
    </div>
  );
}

// ── Add Location Dialog ─────────────────────────────────────────

// Build unique jurisdiction options from database (grouped by county)
function getJurisdictionOptions() {
  const countyMap = new Map<string, JurisdictionScore[]>();
  for (const j of JURISDICTION_DATABASE) {
    const existing = countyMap.get(j.county) || [];
    existing.push(j);
    countyMap.set(j.county, existing);
  }
  return Array.from(countyMap.entries()).map(([county, entries]) => {
    const foodEntry = entries.find(e => e.pillar === 'food_safety');
    const fireEntry = entries.find(e => e.pillar === 'facility_safety');
    return {
      county,
      state: entries[0].state,
      foodEntry,
      fireEntry,
      gradingScale: foodEntry?.gradingScale || 'Standard inspection',
      inspectionFrequency: foodEntry?.inspectionFrequency || 'Varies',
      transparencyLevel: foodEntry?.transparencyLevel || 'medium',
      isDualJurisdiction: county === 'Mariposa', // Mariposa + NPS/Yosemite
    };
  });
}

const JURISDICTION_OPTIONS = getJurisdictionOptions();

function AddLocationDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (config: LocationJurisdictionConfig) => void;
}) {
  const { guardAction, showUpgrade: showDialogUpgrade, setShowUpgrade: setShowDialogUpgrade, upgradeAction: dialogUpgradeAction, upgradeFeature: dialogUpgradeFeature } = useDemoGuard();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [jurisdictionSearch, setJurisdictionSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [includeNPS, setIncludeNPS] = useState(false);
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [detected, setDetected] = useState<LocationJurisdictionConfig | null>(null);
  const [detecting, setDetecting] = useState(false);

  const selectedOption = JURISDICTION_OPTIONS.find(o => o.county === selectedCounty);

  const filteredOptions = jurisdictionSearch.trim().length > 0
    ? JURISDICTION_OPTIONS.filter(o =>
        o.county.toLowerCase().includes(jurisdictionSearch.toLowerCase()) ||
        (o.foodEntry?.agencyName || '').toLowerCase().includes(jurisdictionSearch.toLowerCase())
      )
    : JURISDICTION_OPTIONS;

  const handleSelectJurisdiction = (county: string) => {
    setSelectedCounty(county);
    setJurisdictionSearch('');
    setShowDropdown(false);
    setIncludeNPS(false);
    // Auto-set state to CA since all jurisdictions are California
    if (!state) setState('CA');
  };

  const handleDetect = () => {
    if (!selectedCounty && !zip && !state) return;
    setDetecting(true);
    setTimeout(() => {
      const config = autoDetectJurisdiction({
        locationId: String(Date.now()),
        locationName: name || 'New Location',
        address,
        city: selectedCounty, // Pass selected county as city for detection
        state: state || 'CA',
        zip,
      });
      setDetected(config);
      setDetecting(false);
    }, 400);
  };

  const handleAdd = () => {
    if (detected) {
      guardAction('add', 'Jurisdiction Settings', () => {
        onAdd(detected);
        onClose();
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-backdrop-enter">
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto modal-content-enter">
        <div className="p-4 sm:p-6 border-b border-[#1E2D4D]/5">
          <h2 className="text-lg font-bold text-[#1E2D4D]">Add Location</h2>
          <p className="text-sm text-[#1E2D4D]/50 mt-1">
            Select your jurisdiction to auto-configure compliance requirements
          </p>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Location Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Location 1" // demo
              className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Street Address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g., 123 Main Street"
              className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]"
            />
          </div>

          {/* Jurisdiction Selector (replaces City field) */}
          <div className="relative">
            <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
              Jurisdiction <span className="text-red-500">*</span>
            </label>
            {selectedCounty ? (
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 flex items-center gap-2 px-3 py-2 border border-[#1E2D4D] rounded-xl bg-[#eef4f8] cursor-pointer"
                  onClick={() => { setSelectedCounty(''); setShowDropdown(true); }}
                >
                  <MapPin className="w-3.5 h-3.5 text-[#1E2D4D]" />
                  <span className="text-sm font-medium text-[#1E2D4D]">{selectedCounty} County, CA</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedCounty(''); setIncludeNPS(false); }}
                    className="ml-auto text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E2D4D]/30" />
                  <input
                    type="text"
                    value={jurisdictionSearch}
                    onChange={e => { setJurisdictionSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search jurisdictions (e.g., Merced, Fresno...)"
                    className="w-full pl-9 pr-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]"
                  />
                </div>

                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-[#1E2D4D]/10 shadow-lg max-h-56 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                      filteredOptions.map(opt => (
                        <button
                          key={opt.county}
                          type="button"
                          onClick={() => handleSelectJurisdiction(opt.county)}
                          className="w-full text-left px-3 py-2.5 hover:bg-[#eef4f8] transition-colors border-b border-[#1E2D4D]/3 last:border-b-0"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#1E2D4D] flex-shrink-0" />
                            <span className="text-sm font-medium text-[#1E2D4D]">{opt.county} County</span>
                            <span className="text-xs text-[#1E2D4D]/30 ml-auto">{opt.state}</span>
                          </div>
                          <div className="ml-[22px] mt-0.5 flex items-center gap-2">
                            <span className="text-xs text-[#1E2D4D]/50">{opt.gradingScale}</span>
                            {opt.isDualJurisdiction && (
                              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700">
                                Dual Jurisdiction
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center">
                        <p className="text-sm text-[#1E2D4D]/50">No matching jurisdictions found</p>
                      </div>
                    )}
                    <div className="px-3 py-2 border-t border-[#1E2D4D]/5 bg-[#FAF7F0]">
                      <p className="text-xs text-[#1E2D4D]/30">
                        Don't see your jurisdiction?{' '}
                        <button
                          type="button"
                          onClick={() => { setShowDropdown(false); guardAction('add', 'Jurisdiction Settings', () => toast.info('Request Jurisdiction (Demo) — Contact support@evidly.com for priority onboarding.')); }}
                          className="text-[#1E2D4D] font-medium hover:underline"
                        >
                          Request it here
                        </button>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Jurisdiction confirmation line */}
            {selectedOption && (
              <div className="mt-2 space-y-2">
                <div className="p-2.5 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-green-800">
                      <p className="font-semibold">Scoring: {selectedOption.gradingScale}</p>
                      <p className="mt-0.5">Inspections: {selectedOption.inspectionFrequency}</p>
                      {selectedOption.foodEntry?.transparencyLevel && (
                        <p className="mt-0.5">
                          Transparency: <span className="capitalize">{selectedOption.foodEntry.transparencyLevel}</span>
                          {selectedOption.foodEntry.transparencyLevel === 'low' && ' — limited public access'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dual jurisdiction: Mariposa + NPS/Yosemite */}
                {selectedOption.isDualJurisdiction && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-amber-800">
                        <p className="font-semibold">Dual Jurisdiction: Mariposa County + NPS (Yosemite)</p>
                        <p className="mt-0.5">
                          Locations near Yosemite National Park may fall under both Mariposa County
                          Environmental Health and National Park Service food safety oversight.
                        </p>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeNPS}
                            onChange={e => setIncludeNPS(e.target.checked)}
                            className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="font-medium">Include NPS/Yosemite requirements</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">State</label>
              <select
                value={state}
                onChange={e => setState(e.target.value)}
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D] bg-white"
              >
                <option value="">Select State...</option>
                <option value="CA">California</option>
                <option value="TX">Texas</option>
                <option value="FL">Florida</option>
                <option value="NY">New York</option>
                <option value="WA">Washington</option>
                <option value="OR">Oregon</option>
                <option value="AZ">Arizona</option>
                <option value="OTHER">Other State (FDA baseline)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Zip Code</label>
              <input
                type="text"
                value={zip}
                onChange={e => setZip(e.target.value)}
                placeholder="93721"
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]"
              />
            </div>
          </div>

          <button
            onClick={handleDetect}
            disabled={detecting || !selectedCounty}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#1E2D4D' }}
          >
            {detecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Detecting jurisdiction...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Detect Jurisdiction
              </>
            )}
          </button>

          {/* Detection Results */}
          {detected && (
            <div className="mt-4 space-y-3">
              <div className={`p-4 rounded-xl border ${detected.isCaliforniaLocation ? 'border-green-200 bg-green-50' : 'border-[#1E2D4D]/10 bg-[#FAF7F0]'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {detected.isCaliforniaLocation ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                  <span className="text-sm font-bold text-[#1E2D4D]">
                    {detected.isCaliforniaLocation ? 'California Location Detected' : 'Non-California Location'}
                  </span>
                  <span className="ml-auto text-xs text-[#1E2D4D]/50">
                    via {detected.detectionMethod === 'zip' ? 'zip code' : 'state field'}
                  </span>
                </div>

                {detected.isCaliforniaLocation && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-[#1E2D4D]/50">Jurisdiction chain:</span>
                      <span className="text-xs font-medium text-[#1E2D4D]">
                        {detected.jurisdictionChain.map(id => {
                          const j = getJurisdiction(id);
                          return j?.name || id;
                        }).join(' → ')}
                      </span>
                    </div>

                    {detected.detectedCounty && (
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-[#1E2D4D]/30" />
                        <span className="text-xs text-[#1E2D4D]/70">
                          County: <strong>{detected.detectedCounty}</strong>
                        </span>
                      </div>
                    )}

                    {includeNPS && selectedOption?.isDualJurisdiction && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                          + NPS/Yosemite overlay applied
                        </span>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-xs font-semibold text-green-700 mb-2">
                        {detected.regulations.length} California regulations will be auto-applied:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {detected.regulations.filter(r => r.isActive).slice(0, 6).map(r => (
                          <span key={r.law.id} className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-green-200">
                            {r.law.billNumber}
                          </span>
                        ))}
                        {detected.regulations.filter(r => r.isUpcoming).slice(0, 4).map(r => (
                          <span key={r.law.id} className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                            {r.law.billNumber} ({r.countdownLabel})
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {!detected.isCaliforniaLocation && (
                  <p className="text-sm text-[#1E2D4D]/70">
                    Federal (FDA Food Code) requirements will be applied. State-specific regulations
                    not available for this location.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-[#1E2D4D]/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#1E2D4D]/80 border border-[#1E2D4D]/15 rounded-xl hover:bg-[#FAF7F0]"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!detected || !selectedCounty}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: '#1E2D4D' }}
          >
            Add Location
          </button>
        </div>
      </div>
      {showDialogUpgrade && (
        <DemoUpgradePrompt action={dialogUpgradeAction} featureName={dialogUpgradeFeature} onClose={() => setShowDialogUpgrade(false)} />
      )}
    </div>
  );
}

// ── Regulation Override Toggle ───────────────────────────────────

function RegulationToggle({
  regulation,
  enabled,
  onToggle,
}: {
  regulation: RegulationStatus;
  enabled: boolean;
  onToggle: () => void;
}) {
  const summary = REGULATION_SUMMARIES[regulation.law.id] || regulation.law.description;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${
      enabled
        ? regulation.isActive
          ? 'border-green-200 bg-green-50/50'
          : 'border-amber-200 bg-amber-50/50'
        : 'border-[#1E2D4D]/10 bg-[#FAF7F0] opacity-60'
    }`}>
      <button
        onClick={onToggle}
        className="mt-0.5 flex-shrink-0"
        title={enabled ? 'Disable this regulation' : 'Enable this regulation'}
      >
        {enabled ? (
          <ToggleRight className={`w-6 h-6 ${regulation.isActive ? 'text-green-600' : 'text-amber-600'}`} />
        ) : (
          <ToggleLeft className="w-6 h-6 text-[#1E2D4D]/30" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold ${regulation.isActive ? 'text-green-700' : 'text-amber-700'}`}>
            {regulation.law.billNumber}
          </span>
          <span className="text-sm font-medium text-[#1E2D4D]">{regulation.law.name}</span>
          {regulation.isActive ? (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700">
              Active
            </span>
          ) : (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
              Upcoming
            </span>
          )}
        </div>
        <p className="text-xs text-[#1E2D4D]/50 mt-0.5">{summary}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-[#1E2D4D]/30">
            Effective: {new Date(regulation.law.effectiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          {regulation.isUpcoming && regulation.daysUntilEffective > 0 && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${
              regulation.daysUntilEffective < 90 ? 'text-red-600' : regulation.daysUntilEffective < 180 ? 'text-amber-600' : 'text-blue-600'
            }`}>
              <Clock className="w-3 h-3" />
              {regulation.countdownLabel} remaining
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────────

export function JurisdictionSettings() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  usePageTitle('Jurisdiction Settings');
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addedLocations, setAddedLocations] = useState<LocationJurisdictionConfig[]>([]);
  const [regulationOverrides, setRegulationOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const [pageError, setPageError] = useState<string | null>(null);

  // Precompute profiles and gaps for demo locations (only in demo mode)
  let locationProfiles: { location: (typeof DEMO_LOCATION_JURISDICTIONS)[number]; profile: ReturnType<typeof autoConfigureLocation> }[] = [];
  let complianceGaps: ReturnType<typeof getDemoComplianceGaps> = [];
  let demoConfigs: ReturnType<typeof getDemoLocationConfigs> = [];
  let keyRegulations: ReturnType<typeof getKeyCaliforniaRegulations> = [];
  let caProfile: ReturnType<typeof getJurisdiction> = undefined;
  let minimumWage: typeof caProfile extends { minimumWage?: infer M } ? M : undefined;
  let upcomingLaws: typeof CALIFORNIA_STATE_LAWS = [];

  try {
    locationProfiles = isDemoMode
      ? DEMO_LOCATION_JURISDICTIONS.map(loc => ({
          location: loc,
          profile: autoConfigureLocation(loc),
        }))
      : [];
    complianceGaps = isDemoMode ? getDemoComplianceGaps() : [];

    // Demo location configs (with regulation status)
    demoConfigs = isDemoMode ? getDemoLocationConfigs() : [];

    // Key California regulations (the 11 from user requirements)
    keyRegulations = getKeyCaliforniaRegulations();

    // Minimum wage from the California state level
    caProfile = getJurisdiction('state-ca');
    minimumWage = caProfile?.minimumWage;

    // Upcoming regulatory changes
    upcomingLaws = CALIFORNIA_STATE_LAWS
      .filter(law => {
        if (law.status === 'upcoming') return true;
        const daysLeft = getDaysRemaining(law.effectiveDate);
        return daysLeft > 0;
      })
      .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
  } catch (err) {
    if (!pageError) setPageError(err instanceof Error ? err.message : 'Failed to load jurisdiction data');
  }

  // Handle adding a new location from the dialog
  const handleAddLocation = (config: LocationJurisdictionConfig) => {
    guardAction('add', 'Jurisdiction Settings', () => {
      setAddedLocations(prev => [...prev, config]);
      toast.success(`"${config.locationName}" added with ${config.regulations.length} regulations`);
    });
  };

  // Toggle a regulation override for a location
  const handleToggleRegulation = (locationId: string, lawId: string) => {
    setRegulationOverrides(prev => {
      const locOverrides = prev[locationId] || {};
      const current = locOverrides[lawId] !== undefined ? locOverrides[lawId] : true;
      return {
        ...prev,
        [locationId]: { ...locOverrides, [lawId]: !current },
      };
    });
  };

  const isRegulationEnabled = (locationId: string, lawId: string) => {
    const locOverrides = regulationOverrides[locationId];
    if (!locOverrides || locOverrides[lawId] === undefined) return true;
    return locOverrides[lawId];
  };

  // Error state
  if (pageError) {
    return (
      <div className="px-3 sm:px-6 py-6 max-w-5xl mx-auto">
        <ErrorState error={pageError} onRetry={() => setPageError(null)} />
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-6 py-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Settings', href: '/settings' },
          { label: 'Jurisdiction Profile' },
        ]}
      />

      {/* Header */}
      <div className="mt-4 mb-6 flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[#1E2D4D]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E2D4D]">Know Your Inspector</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider" style={{ backgroundColor: '#eef4f8', color: '#1E2D4D', border: '1px solid #b8d4e8' }}>
              Reference
            </span>
          </div>
          <p className="text-sm text-[#1E2D4D]/70 mt-1">
            Your jurisdiction's scoring system, inspector priorities, and violation patterns.
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg min-h-[44px]"
          style={{ backgroundColor: '#1E2D4D' }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2A3F6B')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1E2D4D')}
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {/* Auto-Detection Explainer */}
      <div className="bg-[#eef4f8] rounded-xl p-4 border border-[#b8d4e8] mb-6">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-[#1E2D4D] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#1E2D4D]">Jurisdiction Auto-Detection</p>
            <p className="text-sm text-[#1E2D4D]/80 mt-0.5">
              When a location is added with a California address or zip code (900xx–961xx), EvidLY automatically
              layers <strong>Federal (FDA/NFPA 2025/OSHA)</strong> + <strong>California state</strong> + <strong>county-specific</strong> requirements.
              County health department, grading system, and inspection frequency are detected from the zip code.
            </p>
          </div>
        </div>
      </div>

      {/* Key California Regulations Summary */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/5 mb-6 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#1E2D4D]/5">
          <div className="flex items-center gap-2">
            <EvidlyIcon size={20} />
            <h2 className="text-base sm:text-lg font-bold text-[#1E2D4D]">California Regulations — Auto-Applied</h2>
          </div>
          <p className="text-sm text-[#1E2D4D]/50 mt-1">
            These regulations are automatically applied to all California locations
          </p>
        </div>

        <div className="divide-y divide-[#1E2D4D]/5">
          {keyRegulations.map(reg => (
            <div
              key={reg.law.id}
              className="px-3 sm:px-5 py-3 flex items-center gap-4 flex-wrap"
            >
              {/* Status indicator */}
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                reg.isActive ? 'bg-green-500' : 'bg-amber-400'
              }`} />

              {/* Bill info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${reg.isActive ? 'text-green-700' : 'text-amber-700'}`}>
                    {reg.law.billNumber}
                  </span>
                  <span className="text-sm font-medium text-[#1E2D4D]">{reg.law.name}</span>
                </div>
                <p className="text-xs text-[#1E2D4D]/50 mt-0.5">
                  {REGULATION_SUMMARIES[reg.law.id] || reg.law.description}
                </p>
              </div>

              {/* Status badge with countdown */}
              {reg.isActive ? (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 whitespace-nowrap">
                  Active
                </span>
              ) : (
                <div className="text-right flex-shrink-0">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                    reg.daysUntilEffective < 90
                      ? 'bg-red-50 text-red-700'
                      : reg.daysUntilEffective < 180
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    Upcoming
                  </span>
                  <p className={`text-xs mt-0.5 font-medium ${
                    reg.daysUntilEffective < 90 ? 'text-red-600' : reg.daysUntilEffective < 180 ? 'text-amber-600' : 'text-blue-600'
                  }`}>
                    {reg.countdownLabel}
                  </p>
                </div>
              )}
            </div>
          ))}

          {/* Additional auto-applied items not in CALIFORNIA_STATE_LAWS */}
          <div className="px-3 sm:px-5 py-3 flex items-center gap-4 flex-wrap">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-green-500" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-green-700">California Labor Code</span>
                <span className="text-sm font-medium text-[#1E2D4D]">Minimum Wage $16.90/hour</span>
              </div>
              <p className="text-xs text-[#1E2D4D]/50 mt-0.5">
                State rate $16.90/hr, fast food chains (60+ locations) $20/hr, healthcare $18.63/hr
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 whitespace-nowrap">Active</span>
          </div>

          <div className="px-3 sm:px-5 py-3 flex items-center gap-4 flex-wrap">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-green-500" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-green-700">CalCode §113948</span>
                <span className="text-sm font-medium text-[#1E2D4D]">Food Handler Certification within 30 Days</span>
              </div>
              <p className="text-xs text-[#1E2D4D]/50 mt-0.5">
                All food employees must obtain certification within 30 days of hire; 3-year renewal
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 whitespace-nowrap">Active</span>
          </div>
        </div>
      </div>

      {/* Added Locations (from Add Location dialog) */}
      {addedLocations.map(config => (
        <div key={config.locationId} className="bg-white rounded-xl border border-[#1E2D4D]/5 overflow-hidden mb-4">
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-[#1E2D4D]" />
              <span className="text-lg font-semibold tracking-tight text-[#1E2D4D]">{config.locationName}</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700">
                New
              </span>
            </div>
            <p className="text-sm text-[#1E2D4D]/50 ml-7">
              {config.address}{config.address && ', '}{config.city}{config.city && ', '}{config.state} {config.zip}
            </p>
            <p className="text-xs text-[#1E2D4D] mt-1 ml-7">
              {config.jurisdictionChain.map(id => {
                const j = getJurisdiction(id);
                return j?.name || id;
              }).join(' → ')}
            </p>
            <div className="flex items-center gap-2 mt-2 ml-7">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700">
                Auto-detected
              </span>
              <span className="text-xs text-[#1E2D4D]/50">
                via {config.detectionMethod === 'zip' ? 'zip code' : 'state field'}
              </span>
            </div>

            {config.isCaliforniaLocation && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-[#1E2D4D]/90 mb-3">
                  Regulation Overrides
                  <span className="ml-2 text-xs font-normal text-[#1E2D4D]/50">
                    Toggle regulations on/off for this location
                  </span>
                </h3>
                <div className="space-y-2">
                  {config.regulations
                    .filter(r => REGULATION_SUMMARIES[r.law.id])
                    .map(reg => (
                      <RegulationToggle
                        key={reg.law.id}
                        regulation={reg}
                        enabled={isRegulationEnabled(config.locationId, reg.law.id)}
                        onToggle={() => handleToggleRegulation(config.locationId, reg.law.id)}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Empty state — live mode with no locations configured */}
      {!isDemoMode && locationProfiles.length === 0 && addedLocations.length === 0 && (
        <div className="bg-white rounded-xl border border-[#1E2D4D]/5 p-8 text-center mb-6">
          <BookOpen className="w-10 h-10 text-[#1E2D4D]/30 mx-auto mb-3" />
          <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-1">Add your first location to configure jurisdiction-specific compliance requirements.</h3>
          <p className="text-sm text-[#1E2D4D]/50 mb-4">
            Once you add a location, EvidLY will auto-detect your county and layer the relevant federal, state, and local requirements.
          </p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: '#1E2D4D' }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2A3F6B')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1E2D4D')}
          >
            <Plus className="w-4 h-4" />
            Add Your First Location
          </button>
        </div>
      )}

      {/* Per-Location Cards (existing demo locations) */}
      {locationProfiles.map(({ location, profile }) => {
        const isExpanded = expandedLocation === location.locationName;
        const locationGaps = complianceGaps.find(g => g.locationName === location.locationName);
        const demoConfig = demoConfigs.find(c => c.locationName === location.locationName);

        // Get inspection system from the county level
        const chain = getJurisdictionChain(location.jurisdictionChain[location.jurisdictionChain.length - 1]);
        const countyProfile = chain.find(j => j.level === 'county');
        const inspectionSystem = countyProfile?.inspectionSystem;

        return (
          <div
            key={location.locationName}
            className="bg-white rounded-xl border border-[#1E2D4D]/5 overflow-hidden mb-4"
          >
            {/* Card Header */}
            <div className="p-4 sm:p-6 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#1E2D4D]" />
                  <span className="text-lg font-semibold tracking-tight text-[#1E2D4D]">
                    {location.locationName}
                  </span>
                </div>
                <p className="text-sm text-[#1E2D4D]/50 mt-1 ml-7">
                  {location.address}, {location.city}, {location.state} {location.zip}
                </p>
                <p className="text-xs text-[#1E2D4D] mt-1 ml-7">
                  {profile.jurisdictionChainNames.join(' → ')}
                </p>
                <div className="flex items-center gap-2 mt-2 ml-7">
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700">
                    Auto-configured
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-[#eef4f8] text-[#1E2D4D] border border-[#b8d4e8]">
                    CA detected via zip
                  </span>
                </div>
              </div>
              <button
                onClick={() =>
                  setExpandedLocation(isExpanded ? null : location.locationName)
                }
                className="p-2 hover:bg-[#1E2D4D]/5 rounded-lg transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-[#1E2D4D]/50" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#1E2D4D]/50" />
                )}
              </button>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-[#1E2D4D]/5">
                {/* Regulation Overrides */}
                {demoConfig && (
                  <CollapsibleSection
                    icon={<EvidlyIcon size={16} />}
                    title="Applied Regulations"
                    defaultOpen
                    badge={
                      <span className="text-xs text-[#1E2D4D]/50">
                        {demoConfig.regulations.filter(r => r.isActive).length} active,{' '}
                        {demoConfig.regulations.filter(r => r.isUpcoming).length} upcoming
                      </span>
                    }
                  >
                    <div className="space-y-2">
                      {demoConfig.regulations
                        .filter(r => REGULATION_SUMMARIES[r.law.id])
                        .map(reg => (
                          <RegulationToggle
                            key={reg.law.id}
                            regulation={reg}
                            enabled={isRegulationEnabled(demoConfig.locationId, reg.law.id)}
                            onToggle={() => handleToggleRegulation(demoConfig.locationId, reg.law.id)}
                          />
                        ))}
                    </div>
                    <p className="text-xs text-[#1E2D4D]/30 italic mt-3">
                      Toggle regulations off to override auto-detection. Changes are saved per-location.
                    </p>
                  </CollapsibleSection>
                )}

                {/* 1. Temperature Thresholds */}
                <CollapsibleSection
                  icon={<Thermometer className="w-4 h-4" />}
                  title="Temperature Thresholds"
                >
                  {(profile.temperatureThresholds.length > 0 ||
                    profile.cookingTemps.length > 0) && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-[#1E2D4D]/50 uppercase tracking-wide border-b border-[#1E2D4D]/10 hover:bg-[#1E2D4D]/[0.02] transition-colors">
                            <th className="pb-2 pr-4">Food Type / Threshold</th>
                            <th className="pb-2 pr-4">Required Temp</th>
                            <th className="pb-2">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.temperatureThresholds.map((t, i) => (
                            <tr key={`thresh-${i}`} className={i % 2 === 1 ? 'bg-[#FAF7F0]' : ''}>
                              <td className="py-2 pr-4 font-medium text-[#1E2D4D]/80">{t.type}</td>
                              <td className="py-2 pr-4 text-[#1E2D4D]/70">
                                {t.tempF}&deg;F {t.type.toLowerCase().includes('cold') ? 'max' : 'min'}
                              </td>
                              <td className="py-2 text-[#1E2D4D]/30 text-xs">{t.source}</td>
                            </tr>
                          ))}
                          {profile.cookingTemps.map((c, i) => (
                            <tr
                              key={`cook-${i}`}
                              className={
                                (profile.temperatureThresholds.length + i) % 2 === 1
                                  ? 'bg-[#FAF7F0]'
                                  : ''
                              }
                            >
                              <td className="py-2 pr-4 font-medium text-[#1E2D4D]/80">{c.foodType}</td>
                              <td className="py-2 pr-4 text-[#1E2D4D]/70">
                                {c.requiredTempF}&deg;F for {c.holdTimeSeconds}s
                              </td>
                              <td className="py-2 text-[#1E2D4D]/30 text-xs">{c.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Cooling Requirements */}
                  {profile.coolingRequirements.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wide mb-2">
                        Cooling Requirements
                      </h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-[#1E2D4D]/50 uppercase tracking-wide border-b border-[#1E2D4D]/10 hover:bg-[#1E2D4D]/[0.02] transition-colors">
                            <th className="pb-2 pr-4">Stage</th>
                            <th className="pb-2 pr-4">Temperature Range</th>
                            <th className="pb-2">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.coolingRequirements.map((cr, i) => (
                            <tr key={`cool-${i}`} className={i % 2 === 1 ? 'bg-[#FAF7F0]' : ''}>
                              <td className="py-2 pr-4 font-medium text-[#1E2D4D]/80">{cr.stage}</td>
                              <td className="py-2 pr-4 text-[#1E2D4D]/70">
                                {cr.fromTempF}&deg;F &rarr; {cr.toTempF}&deg;F in {cr.maxHours} hours
                              </td>
                              <td className="py-2 text-[#1E2D4D]/30 text-xs">{cr.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CollapsibleSection>

                {/* 2. Required Documents */}
                <CollapsibleSection
                  icon={<FileText className="w-4 h-4" />}
                  title="Required Documents"
                >
                  {locationGaps && (
                    <p className="text-sm text-[#1E2D4D]/70 mb-3">
                      You have{' '}
                      <span className="font-semibold text-[#1E2D4D]">
                        {locationGaps.totalCompliant}
                      </span>{' '}
                      of{' '}
                      <span className="font-semibold text-[#1E2D4D]">
                        {locationGaps.totalRequired}
                      </span>{' '}
                      required documents on file
                    </p>
                  )}
                  <div className="space-y-2">
                    {profile.requiredDocuments.map((doc, i) => {
                      const status = locationGaps
                        ? getDocStatus(doc.name, locationGaps.gaps)
                        : 'compliant';
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 py-2 border-b border-[#1E2D4D]/3 last:border-b-0"
                        >
                          {getStatusIcon(status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1E2D4D]/90">{doc.name}</p>
                            <p className="text-xs text-[#1E2D4D]/50">
                              Renewal: {doc.renewalFrequency}
                            </p>
                          </div>
                          <span className="text-xs text-[#1E2D4D]/30 hidden sm:block">{doc.source}</span>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleSection>

                {/* 3. Certification Requirements */}
                <CollapsibleSection
                  icon={<Award className="w-4 h-4" />}
                  title="Certification Requirements"
                >
                  {profile.certifications.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-[#1E2D4D]/50 uppercase tracking-wide border-b border-[#1E2D4D]/10 hover:bg-[#1E2D4D]/[0.02] transition-colors">
                              <th className="pb-2 pr-4">Certification</th>
                              <th className="pb-2 pr-4">Renewal Period</th>
                              <th className="pb-2 pr-4">Approved Providers</th>
                              <th className="pb-2">Source</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profile.certifications.map((cert, i) => (
                              <tr key={i} className={i % 2 === 1 ? 'bg-[#FAF7F0]' : ''}>
                                <td className="py-2 pr-4 font-medium text-[#1E2D4D]/80">
                                  {cert.type}
                                </td>
                                <td className="py-2 pr-4 text-[#1E2D4D]/70">
                                  Every {cert.renewalYears} year{cert.renewalYears !== 1 ? 's' : ''}
                                </td>
                                <td className="py-2 pr-4 text-[#1E2D4D]/70 text-xs">
                                  {cert.approvedProviders?.join(', ') || 'N/A'}
                                </td>
                                <td className="py-2 text-[#1E2D4D]/30 text-xs">{cert.source}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {locationGaps && locationGaps.gaps.filter(g => g.category === 'certification').length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
                          <p className="text-xs font-semibold text-red-700 mb-2">Certification Gaps</p>
                          {locationGaps.gaps
                            .filter(g => g.category === 'certification')
                            .map((gap, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-red-600">
                                {getStatusIcon(gap.status)}
                                <span>{gap.detail}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-[#1E2D4D]/50 italic">
                      No additional certification requirements beyond inherited jurisdictions.
                    </p>
                  )}
                </CollapsibleSection>

                {/* 4. Inspection Schedule */}
                <CollapsibleSection
                  icon={<Calendar className="w-4 h-4" />}
                  title="Inspection Schedule"
                >
                  {profile.healthDepartment ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-[#1E2D4D]/50 w-40">Expected frequency:</span>
                        <span className="text-[#1E2D4D]/90 font-medium">
                          {profile.healthDepartment.inspectionFrequency}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#1E2D4D]/50 w-40">Permit renewal:</span>
                        <span className="text-[#1E2D4D]/90 font-medium">
                          {profile.healthDepartment.permitRenewal}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#1E2D4D]/50 w-40">Last inspection:</span>
                        <span className="text-[#1E2D4D]/90 font-medium">Nov 15, 2025</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#1E2D4D]/50 w-40">Next expected:</span>
                        <span className="text-[#1E2D4D]/90 font-medium">By Nov 2026</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#1E2D4D]/50 italic">
                      No local health department data available for this jurisdiction level.
                    </p>
                  )}
                </CollapsibleSection>

                {/* 4b. Inspection Grading System */}
                {(() => {
                  const jData = getJurisdictionDataForCounty(location.county);
                  const countySlug = extractCountySlug(location.county);
                  const scoringProfile = getCountyProfile(countySlug);
                  return (
                    <CollapsibleSection
                      icon={<EvidlyIcon size={16} />}
                      title="Inspection Grading System"
                    >
                      {inspectionSystem ? (
                        <div className="space-y-4">
                          {/* System type + transparency badge */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm text-[#1E2D4D]/50">System type:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getInspectionSystemBadge(inspectionSystem.type).color}`}>
                              {getInspectionSystemBadge(inspectionSystem.type).label}
                            </span>
                            {jData.food && (
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${getTransparencyBadge(jData.food.transparencyLevel).className}`}>
                                {getTransparencyBadge(jData.food.transparencyLevel).label}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#1E2D4D]/70">{inspectionSystem.details}</p>

                          {/* Grade Ranges */}
                          {inspectionSystem.grades && inspectionSystem.grades.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wide mb-2">
                                Grade Ranges
                              </h4>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs text-[#1E2D4D]/50 uppercase tracking-wide border-b border-[#1E2D4D]/10 hover:bg-[#1E2D4D]/[0.02] transition-colors">
                                    <th className="pb-2 pr-4">Grade</th>
                                    <th className="pb-2">Score Range</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inspectionSystem.grades.map((grade, i) => (
                                    <tr key={i} className={i % 2 === 1 ? 'bg-[#FAF7F0]' : ''}>
                                      <td className="py-2 pr-4 font-medium text-[#1E2D4D]/80">{grade.label}</td>
                                      <td className="py-2 text-[#1E2D4D]/70">{grade.range}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* A) Point Deductions */}
                          <div>
                            <h4 className="text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wide mb-2">
                              Point Deductions
                            </h4>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-xs text-[#1E2D4D]/50 uppercase tracking-wide border-b border-[#1E2D4D]/10 hover:bg-[#1E2D4D]/[0.02] transition-colors">
                                  <th className="pb-2 pr-4">Violation Severity</th>
                                  <th className="pb-2">Points Deducted</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { label: 'Critical violation', pts: scoringProfile.deductions.critical },
                                  { label: 'Major violation', pts: scoringProfile.deductions.major },
                                  { label: 'Minor violation', pts: scoringProfile.deductions.minor },
                                  { label: 'Good retail practice', pts: scoringProfile.deductions.good_practice },
                                ].map((row, i) => (
                                  <tr key={i} className={i % 2 === 1 ? 'bg-[#FAF7F0]' : ''}>
                                    <td className="py-2 pr-4 font-medium text-[#1E2D4D]/80">{row.label}</td>
                                    <td className="py-2 text-[#1E2D4D]/70">{row.pts > 0 ? `−${row.pts} pts` : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <p className="text-xs text-[#1E2D4D]/30 mt-1">
                              Starting score: {scoringProfile.startingScore} · County: {scoringProfile.countyName}
                            </p>
                          </div>

                          {/* B) Traffic Light Mapping */}
                          {jData.food?.trafficLightMapping && (
                            <div>
                              <h4 className="text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wide mb-2">
                                Inspection Outcome Indicators
                              </h4>
                              <div className="space-y-2">
                                {([
                                  { key: 'green' as const, color: 'bg-green-500', borderColor: 'border-green-200', bgColor: 'bg-green-50' },
                                  { key: 'yellow' as const, color: 'bg-amber-400', borderColor: 'border-amber-200', bgColor: 'bg-amber-50' },
                                  { key: 'red' as const, color: 'bg-red-500', borderColor: 'border-red-200', bgColor: 'bg-red-50' },
                                ]).map(({ key, color, borderColor, bgColor }) => {
                                  const mapping = jData.food!.trafficLightMapping![key];
                                  return (
                                    <div key={key} className={`flex items-start gap-3 p-2.5 rounded-xl border ${borderColor} ${bgColor}`}>
                                      <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${color}`} />
                                      <div>
                                        <span className="text-sm font-semibold text-[#1E2D4D]/90">{mapping.label}</span>
                                        <p className="text-xs text-[#1E2D4D]/70 mt-0.5">{mapping.condition}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* C) Closure & Re-inspection Policy */}
                          {(jData.food?.closureTrigger || jData.food?.reinspectionPolicy) && (
                            <div>
                              <h4 className="text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wide mb-2">
                                Closure Triggers &amp; Re-inspection
                              </h4>
                              <div className="space-y-2 text-sm">
                                {jData.food.closureTrigger && (
                                  <div className="flex items-start gap-2">
                                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <span className="font-medium text-[#1E2D4D]/80">Closure trigger:</span>{' '}
                                      <span className="text-[#1E2D4D]/70">{jData.food.closureTrigger}</span>
                                    </div>
                                  </div>
                                )}
                                {jData.food.reinspectionPolicy && (
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <span className="font-medium text-[#1E2D4D]/80">Re-inspection:</span>{' '}
                                      <span className="text-[#1E2D4D]/70">{jData.food.reinspectionPolicy}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* D) Transparency Notes */}
                          {jData.food?.transparencyNotes && (
                            <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#1E2D4D]/10">
                              <p className="text-xs text-[#1E2D4D]/70">
                                <strong>Transparency:</strong> {jData.food.transparencyNotes}
                              </p>
                            </div>
                          )}

                          {/* E) NFPA Adoption (facility safety) */}
                          {jData.fire?.nfpaAdoption && (
                            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                              <p className="text-xs text-[#1E2D4D]/80">
                                <strong>NFPA 96 Adoption:</strong> {jData.fire.nfpaAdoption}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-[#1E2D4D]/50 italic">
                          No inspection grading system data available for this jurisdiction level.
                        </p>
                      )}
                    </CollapsibleSection>
                  );
                })()}

                {/* 5. Service Frequencies */}
                <CollapsibleSection
                  icon={<Wrench className="w-4 h-4" />}
                  title="Service Frequencies"
                >
                  {profile.serviceFrequencies.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-[#1E2D4D]/50 uppercase tracking-wide border-b border-[#1E2D4D]/10 hover:bg-[#1E2D4D]/[0.02] transition-colors">
                            <th className="pb-2 pr-4">Service</th>
                            <th className="pb-2 pr-4">Frequency</th>
                            <th className="pb-2 pr-4">Condition</th>
                            <th className="pb-2">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.serviceFrequencies.map((svc, i) => (
                            <tr key={i} className={i % 2 === 1 ? 'bg-[#FAF7F0]' : ''}>
                              <td className="py-2 pr-4 font-medium text-[#1E2D4D]/80">{svc.service}</td>
                              <td className="py-2 pr-4 text-[#1E2D4D]/70">{svc.frequencyLabel}</td>
                              <td className="py-2 pr-4 text-[#1E2D4D]/50 text-xs">
                                {svc.condition || '—'}
                              </td>
                              <td className="py-2 text-[#1E2D4D]/30 text-xs">{svc.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-[#1E2D4D]/50 italic">
                      No additional service frequency requirements at this jurisdiction level.
                    </p>
                  )}
                </CollapsibleSection>

                {/* 6. Required Postings */}
                <CollapsibleSection
                  icon={<ClipboardList className="w-4 h-4" />}
                  title="Required Postings"
                >
                  {profile.requiredPostings.length > 0 ? (
                    <div className="space-y-2">
                      {profile.requiredPostings.map((posting, i) => {
                        const postingStatus = locationGaps
                          ? getDocStatus(posting.name, locationGaps.gaps)
                          : 'compliant';
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 py-2 border-b border-[#1E2D4D]/3 last:border-b-0"
                          >
                            {getStatusIcon(postingStatus)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1E2D4D]/90">{posting.name}</p>
                              <div className="flex gap-1.5 mt-1">
                                {posting.languages.map(lang => (
                                  <span
                                    key={lang}
                                    className="px-2 py-0.5 text-xs rounded-full bg-[#eef4f8] text-[#1E2D4D] border border-[#b8d4e8]"
                                  >
                                    {lang}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-[#1E2D4D]/30 hidden sm:block">
                              {posting.source}
                            </span>
                          </div>
                        );
                      })}
                      {locationGaps && locationGaps.gaps.filter(g => g.category === 'posting').length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
                          <p className="text-xs font-semibold text-red-700 mb-2">Posting Gaps</p>
                          {locationGaps.gaps
                            .filter(g => g.category === 'posting')
                            .map((gap, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-red-600">
                                {getStatusIcon(gap.status)}
                                <span>{gap.detail}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[#1E2D4D]/50 italic">
                      No additional posting requirements at this jurisdiction level.
                    </p>
                  )}
                </CollapsibleSection>

                {/* 7. Health Department Contact */}
                <CollapsibleSection
                  icon={<Building2 className="w-4 h-4" />}
                  title="Health Department Contact"
                >
                  {profile.healthDepartment ? (
                    <div className="space-y-3 text-sm">
                      <p className="font-semibold text-[#1E2D4D]">
                        {profile.healthDepartment.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[#1E2D4D]/30" />
                        <a
                          href={`tel:${profile.healthDepartment.phone}`}
                          className="text-[#1E2D4D] hover:underline"
                        >
                          {profile.healthDepartment.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-[#1E2D4D]/30" />
                        <a
                          href={profile.healthDepartment.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1E2D4D] hover:underline"
                        >
                          {profile.healthDepartment.website}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#1E2D4D]/50">Inspection frequency:</span>
                        <span className="text-[#1E2D4D]/90">
                          {profile.healthDepartment.inspectionFrequency}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#1E2D4D]/50">Permit renewal:</span>
                        <span className="text-[#1E2D4D]/90">
                          {profile.healthDepartment.permitRenewal}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#1E2D4D]/50 italic">
                      Health department contact not available at this jurisdiction level. Check the
                      county or city jurisdiction for local contact information.
                    </p>
                  )}
                </CollapsibleSection>

                {/* 8. Applicable State Laws */}
                <CollapsibleSection
                  icon={<Scale className="w-4 h-4" />}
                  title="Applicable State Laws"
                >
                  <div className="space-y-3">
                    {CALIFORNIA_STATE_LAWS.map((law) => {
                      const statusBadge = getLawStatusBadge(law.status);
                      const billColor = getBillBadgeColor(law.status);
                      return (
                        <div
                          key={law.id}
                          className="p-3 rounded-xl border border-[#1E2D4D]/10 bg-[#FAF7F0]"
                        >
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border ${billColor}`}>
                              {law.billNumber}
                            </span>
                            <span className="text-sm font-semibold text-[#1E2D4D] flex-1">
                              {law.name}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.color}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                          <p className="text-xs text-[#1E2D4D]/50 mt-1">
                            Effective: {new Date(law.effectiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <div className="mt-1.5">
                            <ExpandableDescription text={law.description} />
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-[#1E2D4D]/30 italic mt-2">
                      Laws filtered based on your business type and size. Contact support to update.
                    </p>
                  </div>
                </CollapsibleSection>

                {/* 9. Minimum Wage Requirements */}
                <CollapsibleSection
                  icon={<DollarSign className="w-4 h-4" />}
                  title="Minimum Wage Requirements"
                >
                  {minimumWage ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl border border-[#1E2D4D]/10 bg-[#FAF7F0]">
                          <p className="text-xs text-[#1E2D4D]/50 uppercase tracking-wide font-semibold">General Rate</p>
                          <p className="text-2xl font-bold tracking-tight text-[#1E2D4D] mt-1">
                            ${minimumWage.general.toFixed(2)}
                            <span className="text-sm font-normal text-[#1E2D4D]/50">/hr</span>
                          </p>
                        </div>
                        {minimumWage.fastFood && (
                          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50">
                            <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold">Fast Food Rate</p>
                            <p className="text-2xl font-bold tracking-tight text-amber-900 mt-1">
                              ${minimumWage.fastFood.toFixed(2)}
                              <span className="text-sm font-normal text-amber-600">/hr</span>
                            </p>
                            <p className="text-xs text-amber-600 mt-0.5">National chains with 60+ locations</p>
                          </div>
                        )}
                        {minimumWage.healthcare && (
                          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50">
                            <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold">Healthcare Rate</p>
                            <p className="text-2xl font-bold tracking-tight text-blue-900 mt-1">
                              ${minimumWage.healthcare.toFixed(2)}
                              <span className="text-sm font-normal text-blue-600">/hr</span>
                            </p>
                            <p className="text-xs text-blue-600 mt-0.5">Healthcare facility workers</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#1E2D4D]/50">
                        <span>Source: {minimumWage.source}</span>
                        <span className="text-[#1E2D4D]/30">|</span>
                        <span>
                          Effective: {new Date(minimumWage.effectiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-[#eef4f8] border border-[#b8d4e8]">
                        <p className="text-xs text-[#1E2D4D]/70">
                          <strong>Note:</strong> Local city minimum wages may be higher than the state rate.
                          Check your city ordinances for applicable local minimum wage requirements.
                          Cities like San Francisco, West Hollywood, and Emeryville have rates above $19/hr.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#1E2D4D]/50 italic">
                      Minimum wage data not available for this jurisdiction.
                    </p>
                  )}
                </CollapsibleSection>

                {/* Override Controls */}
                <div className="px-3 sm:px-6 py-4 bg-[#FAF7F0] border-t border-[#1E2D4D]/5 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        toast.info('Override available for Management roles')
                      }
                      className="px-3 py-1.5 text-xs border border-[#1E2D4D]/15 rounded-xl hover:bg-[#FAF7F0] text-[#1E2D4D]/70"
                    >
                      Override
                    </button>
                    <button
                      onClick={() => guardAction('reset', 'Jurisdiction Settings', () => toast.info('Reset to Defaults (Demo)'))}
                      className="px-3 py-1.5 text-xs border border-[#1E2D4D]/15 rounded-xl hover:bg-[#FAF7F0] text-[#1E2D4D]/70 flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset to Default
                    </button>
                  </div>
                  {LOCATION_URL_ID[location.locationName] && (
                    <button
                      onClick={() => navigate(`/scoring-breakdown?location=${LOCATION_URL_ID[location.locationName]}`)}
                      className="text-xs font-medium text-[#1E2D4D] hover:text-[#141E33] flex items-center gap-1 transition-colors"
                    >
                      View scoring breakdown
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Compliance Gap Analysis Section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-[#1E2D4D] mb-4">Compliance Gap Analysis</h2>

        {complianceGaps.map(locationGap => {
          const pct = Math.round(
            (locationGap.totalCompliant / locationGap.totalRequired) * 100
          );
          const barColor = pct < 60 ? 'bg-red-500' : pct < 80 ? 'bg-amber-500' : 'bg-green-500';

          return (
            <div
              key={locationGap.locationName}
              className="bg-white rounded-xl border border-[#1E2D4D]/5 p-4 sm:p-6 mb-4"
            >
              {/* Summary */}
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <h3 className="text-sm font-semibold text-[#1E2D4D]">
                  {locationGap.locationName}
                </h3>
                <span className="text-sm font-bold text-[#1E2D4D]/80">
                  {locationGap.totalCompliant} / {locationGap.totalRequired} &mdash; {pct}%
                </span>
              </div>
              <div className="bg-[#1E2D4D]/8 rounded-full h-2 mb-4">
                <div
                  className={`${barColor} rounded-full h-2 transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Gap Items */}
              {locationGap.gaps.length > 0 && (
                <div className="space-y-2">
                  {locationGap.gaps.map((gap, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#FAF7F0]"
                    >
                      {getStatusIcon(gap.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1E2D4D]/90">{gap.item}</p>
                        <p className="text-xs text-[#1E2D4D]/50">{gap.detail}</p>
                      </div>
                      <button
                        onClick={() => guardAction('action', 'Jurisdiction Settings', () => toast.info(`${gap.action || 'Action'} (Demo)`))}
                        className="px-3 py-1 text-xs font-medium text-[#1E2D4D] border border-[#b8d4e8] rounded-xl hover:bg-[#eef4f8] whitespace-nowrap"
                      >
                        {getGapActionLabel(gap.category)}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {locationGap.gaps.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All compliance requirements are met</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upcoming Regulatory Changes Timeline */}
      {upcomingLaws.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-[#1E2D4D] mb-4">Upcoming Regulatory Changes</h2>

          <div className="space-y-3">
            {upcomingLaws.map((law) => {
              const daysLeft = getDaysRemaining(law.effectiveDate);
              const urgencyBorder = getUrgencyColor(daysLeft);
              const urgencyText = getUrgencyTextColor(daysLeft);
              const urgencyBadge = getUrgencyBadgeColor(daysLeft);

              return (
                <div
                  key={law.id}
                  className={`bg-white rounded-xl shadow-sm border-l-4 ${urgencyBorder} p-4 sm:p-5`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded ${urgencyBadge}`}>
                          {daysLeft > 0 ? `${daysLeft} days remaining` : 'Effective now'}
                        </span>
                        <span className="text-xs text-[#1E2D4D]/50">
                          {new Date(law.effectiveDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-semibold ${urgencyText}`}>
                          {law.billNumber}
                        </span>
                        <span className="text-sm font-semibold text-[#1E2D4D]">{law.name}</span>
                      </div>
                      <p className="text-sm text-[#1E2D4D]/70 mt-1 line-clamp-2">
                        {law.description}
                      </p>
                    </div>
                    <button
                      onClick={() => guardAction('plan', 'Jurisdiction Settings', () => toast.info(`Compliance Plan for ${law.billNumber} (Demo)`))}
                      className="px-3 py-1.5 text-xs font-medium text-white rounded-lg whitespace-nowrap"
                      style={{ backgroundColor: '#1E2D4D' }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2A3F6B')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1E2D4D')}
                    >
                      Prepare Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Key Upcoming Dates Summary */}
          <div className="mt-4 p-4 bg-white rounded-xl border border-[#1E2D4D]/5">
            <h3 className="text-sm font-semibold text-[#1E2D4D] mb-3">Key Upcoming Dates</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-red-200 bg-red-50">
                <p className="text-xs font-semibold text-red-700">Apr 1, 2026</p>
                <p className="text-sm font-medium text-[#1E2D4D] mt-0.5">CalCode §114002(a)</p>
                <p className="text-xs text-[#1E2D4D]/70 mt-0.5">CA cooling requirement</p>
              </div>
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50">
                <p className="text-xs font-semibold text-amber-700">Jul 1, 2026</p>
                <p className="text-sm font-medium text-[#1E2D4D] mt-0.5">AB 660 &amp; SB 68</p>
                <p className="text-xs text-[#1E2D4D]/70 mt-0.5">Date labels + Allergen disclosure</p>
              </div>
              <div className="p-3 rounded-xl border border-blue-200 bg-blue-50">
                <p className="text-xs font-semibold text-blue-700">Jan 1, 2027</p>
                <p className="text-sm font-medium text-[#1E2D4D] mt-0.5">AB 418</p>
                <p className="text-xs text-[#1E2D4D]/70 mt-0.5">Banned food additives</p>
              </div>
              <div className="p-3 rounded-xl border border-blue-200 bg-blue-50">
                <p className="text-xs font-semibold text-blue-700">Dec 31, 2027</p>
                <p className="text-sm font-medium text-[#1E2D4D] mt-0.5">AB 2316</p>
                <p className="text-xs text-[#1E2D4D]/70 mt-0.5">School food synthetic dye ban</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Note */}
      <div className="bg-[#eef4f8] rounded-xl p-4 border border-[#b8d4e8] mt-6">
        <div className="flex items-start gap-3">
          <EvidlyIcon size={20} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-[#1E2D4D]/80">
              <strong>How auto-detection works:</strong> When you add a location with a California zip code (900xx–961xx)
              or state = "CA", EvidLY auto-flags it as a California jurisdiction and layers Federal + State + County requirements.
              County is detected from the zip code to apply the correct health department, grading system, and inspection frequency.
              You can override any regulation from the location's settings.
            </p>
            <p className="text-xs text-[#1E2D4D]/50 mt-2">
              In production, jurisdiction configs are stored per-location in the database with support for manual overrides.
            </p>
          </div>
        </div>
      </div>

      {/* Add Location Dialog */}
      {showAddDialog && (
        <AddLocationDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={handleAddLocation}
        />
      )}

      {showUpgrade && (
        <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  );
}
