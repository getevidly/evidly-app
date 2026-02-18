import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed, Flame, CalendarDays, ClipboardCheck,
  ChevronDown, ChevronUp, ExternalLink, Phone,
  AlertCircle, BookOpen,
} from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { DEMO_ORG, LOCATIONS_WITH_SCORES } from '../../data/demoData';
import { useAllLocationJurisdictions } from '../../hooks/useJurisdiction';
import { useAllComplianceScores } from '../../hooks/useComplianceScore';
import type { LocationScore, LocationJurisdiction } from '../../types/jurisdiction';
import { DEMO_LOCATION_GRADE_OVERRIDES } from '../../data/demoJurisdictions';
import { AlertBanner, type AlertBannerItem } from '../shared/AlertBanner';
import { FireStatusBars } from '../shared/FireStatusBars';
import { FoodSafetyWidget } from '../shared/FoodSafetyWidget';

// ================================================================
// CONSTANTS
// ================================================================

const GOLD = '#C49A2B';
const NAVY = '#163a5f';
const PAGE_BG = '#f4f6f9';
const MUTED = '#94a3b8';
const BODY_TEXT = '#1e293b';
const FONT: React.CSSProperties = { fontFamily: "'Inter', 'DM Sans', sans-serif" };
const STEEL_SLATE_GRADIENT = 'linear-gradient(135deg, #1c2a3f 0%, #263d56 50%, #2f4a66 100%)';

// Maps dashboard location IDs -> JIE dual-authority location IDs
const JIE_LOC_MAP: Record<string, string> = {
  'downtown': 'demo-loc-downtown',
  'airport': 'demo-loc-airport',
  'university': 'demo-loc-university',
};

// ================================================================
// KEYFRAMES
// ================================================================

const KEYFRAMES = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

function stagger(i: number): React.CSSProperties {
  return { animation: `fadeInUp 0.4s ease-out ${i * 0.1}s both` };
}

// ================================================================
// HELPERS
// ================================================================

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function statusColor(status: 'passing' | 'failing' | 'at_risk' | 'unknown'): string {
  switch (status) {
    case 'passing': return '#16a34a';
    case 'failing': return '#dc2626';
    case 'at_risk': return '#d97706';
    default: return '#94a3b8';
  }
}

function gradingTypeLabel(gradingType: string | null): string {
  if (!gradingType) return '';
  switch (gradingType) {
    case 'pass_reinspect': return 'CalCode Pass/Reinspect';
    case 'three_tier_rating': return 'Three-Tier Rating';
    case 'violation_based': return 'CalCode Violation-Based';
    case 'letter_grade': return 'Letter Grade';
    default: return gradingType;
  }
}

// ================================================================
// ALERT DATA
// ================================================================

const COMPLIANCE_ALERTS: AlertBannerItem[] = [
  {
    id: 'ca1',
    severity: 'critical',
    message: 'University Dining \u2014 3 open major violations require reinspection within 30 days',
    location: 'University Dining',
    pillar: 'Food Safety',
    actionLabel: 'View Details',
    route: '/dashboard?location=university',
  },
  {
    id: 'ca2',
    severity: 'warning',
    message: 'Airport Cafe approaching satisfactory threshold \u2014 9 violation points (limit: 13)',
    location: 'Airport Cafe',
    pillar: 'Food Safety',
    actionLabel: 'Review',
    route: '/dashboard?location=airport',
  },
  {
    id: 'ca3',
    severity: 'info',
    message: 'CalCode amendment AB-1228 effective March 1 \u2014 updated allergen labeling requirements',
    pillar: 'Regulatory',
    actionLabel: 'Read More',
    route: '/regulatory-alerts',
  },
];

// ================================================================
// DEMO DATA
// ================================================================

const DEMO_INSPECTIONS = [
  { location: 'Downtown Kitchen', type: 'Food Safety \u2014 Annual', agency: 'Fresno County DPH', date: 'Mar 15, 2026', status: 'scheduled' as const },
  { location: 'Airport Cafe', type: 'Fire Suppression Inspection', agency: 'Merced County Fire', date: 'Feb 28, 2026', status: 'scheduled' as const },
  { location: 'University Dining', type: 'Food Safety \u2014 Reinspection', agency: 'Stanislaus County DEH', date: 'Feb 22, 2026', status: 'urgent' as const },
];

const DEMO_SELF_INSPECTIONS = [
  { location: 'Downtown Kitchen', lastCompleted: 'Feb 10, 2026', score: '94%', nextDue: 'Mar 10, 2026', status: 'current' as const },
  { location: 'Airport Cafe', lastCompleted: 'Jan 28, 2026', score: '87%', nextDue: 'Feb 28, 2026', status: 'due_soon' as const },
  { location: 'University Dining', lastCompleted: 'Dec 15, 2025', score: '72%', nextDue: 'Jan 15, 2026', status: 'overdue' as const },
];

const DEMO_REGULATORY = [
  { date: 'Feb 12, 2026', title: 'CalCode Amendment AB-1228 \u2014 Allergen Labeling', summary: 'New allergen labeling requirements for commercial kitchens effective March 1.', impact: 'high' as const },
  { date: 'Feb 5, 2026', title: 'CFC 2025 Operational Permit Updates', summary: 'Revised operational fire permit requirements for commercial kitchen hoods.', impact: 'medium' as const },
  { date: 'Jan 20, 2026', title: 'HACCP Plan Verification Schedule Change', summary: 'Annual HACCP plan verification now required within 60 days of license renewal.', impact: 'low' as const },
];

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function ComplianceManagerDashboard() {
  const navigate = useNavigate();
  const { companyName, isDemoMode } = useDemo();

  // JIE: Dual-authority jurisdiction data per location
  const jieLocIds = useMemo(
    () => LOCATIONS_WITH_SCORES.map(l => JIE_LOC_MAP[l.id] || l.id),
    [],
  );
  const jurisdictions = useAllLocationJurisdictions(jieLocIds, isDemoMode);
  const jieScores = useAllComplianceScores(jurisdictions, isDemoMode);

  // Dismissed alerts (session-only)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const visibleAlerts = COMPLIANCE_ALERTS.filter(a => !dismissedAlerts.has(a.id));
  const handleDismissAlert = (id: string) => {
    setDismissedAlerts(prev => new Set(prev).add(id));
  };

  // Expanded location cards
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const toggleExpanded = (locId: string) => {
    setExpandedLocations(prev => {
      const next = new Set(prev);
      if (next.has(locId)) next.delete(locId);
      else next.add(locId);
      return next;
    });
  };

  const locs = LOCATIONS_WITH_SCORES;

  // Compute unique counties for header summary
  const uniqueCounties = useMemo(() => {
    const counties = new Set<string>();
    for (const loc of locs) {
      const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
      const jur = jurisdictions[jieLocId];
      if (jur?.county) counties.add(jur.county);
    }
    return counties.size;
  }, [locs, jurisdictions]);

  const uniqueFireAHJs = useMemo(() => {
    const ahjs = new Set<string>();
    for (const loc of locs) {
      const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
      const jur = jurisdictions[jieLocId];
      if (jur?.fireSafety?.agency_name) ahjs.add(jur.fireSafety.agency_name);
    }
    return ahjs.size;
  }, [locs, jurisdictions]);

  return (
    <div style={{ ...FONT, backgroundColor: PAGE_BG, minHeight: '100vh', paddingBottom: 80 }}>
      <style>{KEYFRAMES}</style>

      {/* ============================================================ */}
      {/* HERO BANNER — Steel-Slate Gradient                           */}
      {/* ============================================================ */}
      <div
        className="relative overflow-hidden"
        style={{
          background: STEEL_SLATE_GRADIENT,
          padding: '20px 24px 40px',
          ...stagger(0),
        }}
      >
        {/* Gold radial glow */}
        <div className="absolute pointer-events-none" style={{
          top: -80, right: -40, width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(196,154,43,0.10) 0%, transparent 55%)',
        }} />

        {/* Row 1: Logo | Divider | Greeting | Org */}
        <div className="flex items-start gap-4 mb-6 relative z-10">
          <div className="flex-shrink-0">
            <div className="flex items-baseline">
              <span className="text-[22px] font-bold" style={{ color: GOLD }}>E</span>
              <span className="text-[22px] font-bold text-white">vid</span>
              <span className="text-[22px] font-bold" style={{ color: GOLD }}>LY</span>
            </div>
            <p className="text-[9px] uppercase text-white mt-0.5" style={{ opacity: 0.45, letterSpacing: '0.12em' }}>
              Compliance Simplified
            </p>
          </div>

          <div className="w-px self-stretch" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />

          <div className="flex-1 min-w-0">
            <p className="text-white text-base font-medium">{getGreeting()}, Sarah.</p>
            <p className="text-blue-200 text-xs mt-0.5" style={{ opacity: 0.7 }}>{getFormattedDate()}</p>
          </div>

          <div className="text-right flex-shrink-0 hidden sm:block">
            <p className="text-white font-semibold text-sm">Central Valley Food Group</p>
            <p className="text-blue-200 text-xs mt-0.5" style={{ opacity: 0.7 }}>
              {DEMO_ORG.locationCount} locations &middot; CA
            </p>
          </div>
        </div>

        {/* Dual-Authority Jurisdiction Summary */}
        <div className="flex flex-col sm:flex-row gap-3 relative z-10 max-w-3xl mx-auto" style={stagger(1)}>
          {/* Food Safety Panel */}
          <div
            className="flex-1 rounded-xl p-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <UtensilsCrossed size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
              <span className="text-[13px] text-white font-semibold">Food Safety</span>
            </div>
            <p className="text-[10px] text-white mb-3" style={{ opacity: 0.5 }}>
              {uniqueCounties} County Health Dept{uniqueCounties !== 1 ? 's' : ''} &mdash; each grades differently
            </p>
            <div className="space-y-2">
              {locs.map(loc => {
                const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
                const score = jieScores[jieLocId];
                const foodStatus = score?.foodSafety?.status ?? 'unknown';
                const gradeDisp = score?.foodSafety?.gradeDisplay ?? 'N/A';

                return (
                  <div key={loc.id} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: statusColor(foodStatus) }}
                    />
                    <span className="text-[11px] text-white truncate flex-1" style={{ opacity: 0.9 }}>
                      {loc.name}
                    </span>
                    <span className="text-[11px] text-white font-medium shrink-0 truncate max-w-[120px]" style={{ opacity: 0.85 }}>
                      {gradeDisp}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fire Safety Panel */}
          <div
            className="flex-1 rounded-xl p-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Flame size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
              <span className="text-[13px] text-white font-semibold">Fire Safety</span>
            </div>
            <p className="text-[10px] text-white mb-3" style={{ opacity: 0.5 }}>
              {uniqueFireAHJs} Fire AHJ{uniqueFireAHJs !== 1 ? 's' : ''} &mdash; 2025 CFC operational permits
            </p>
            <div className="space-y-2">
              {locs.map(loc => {
                const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
                const score = jieScores[jieLocId];
                const jur = jurisdictions[jieLocId];
                const fireStatus = score?.fireSafety?.status ?? 'unknown';
                const fireAHJ = jur?.fireSafety?.agency_name ?? '';

                return (
                  <div key={loc.id} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: statusColor(fireStatus) }}
                    />
                    <span className="text-[11px] text-white truncate flex-1" style={{ opacity: 0.9 }}>
                      {loc.name}
                    </span>
                    {fireStatus === 'passing' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.25)', color: '#86efac' }}>Pass</span>
                    )}
                    {fireStatus === 'failing' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.25)', color: '#fca5a5' }}>Fail</span>
                    )}
                    {fireStatus === 'at_risk' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'rgba(234,179,8,0.25)', color: '#fde68a' }}>At Risk</span>
                    )}
                    {fireStatus === 'unknown' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'rgba(148,163,184,0.25)', color: '#cbd5e1' }}>--</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Gold accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: GOLD }} />
      </div>

      {/* ============================================================ */}
      {/* CONTENT                                                       */}
      {/* ============================================================ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 space-y-6">

        {/* Alert Banners */}
        <div style={stagger(2)}>
          <AlertBanner alerts={visibleAlerts} onDismiss={handleDismissAlert} navigate={navigate} />
        </div>

        {/* ============================================================ */}
        {/* 1. LOCATION COMPLIANCE OVERVIEW                              */}
        {/* ============================================================ */}
        <div style={stagger(3)}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Location Compliance Overview</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {locs.map(loc => {
              const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
              const score = jieScores[jieLocId];
              const jur = jurisdictions[jieLocId];
              const override = DEMO_LOCATION_GRADE_OVERRIDES[jieLocId];
              const isExpanded = expandedLocations.has(loc.id);

              const foodStatus = score?.foodSafety?.status ?? 'unknown';
              const foodGradeDisplay = score?.foodSafety?.gradeDisplay ?? 'Not assessed';
              const foodSummary = (score?.foodSafety?.details as Record<string, any>)?.summary ?? undefined;
              const foodGradingType = jur?.foodSafety?.grading_type ?? null;

              const fireStatus = score?.fireSafety?.status ?? 'unknown';
              const fireAHJName = jur?.fireSafety?.agency_name ?? 'Fire AHJ';
              const county = jur?.county ?? '';

              return (
                <div
                  key={loc.id}
                  className="bg-white rounded-xl p-5"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                >
                  {/* Name + County badge */}
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>{loc.name}</h4>
                    {county && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                        {county}
                      </span>
                    )}
                  </div>

                  {/* Food Safety Widget */}
                  <FoodSafetyWidget
                    gradeDisplay={foodGradeDisplay}
                    summary={foodSummary}
                    status={foodStatus}
                    gradingTypeLabel={gradingTypeLabel(foodGradingType) || undefined}
                  />

                  {/* Fire Safety row */}
                  <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#f8f8f8' }}>
                    <div className="flex items-center gap-2">
                      <Flame size={14} style={{ color: '#ea580c', flexShrink: 0 }} />
                      <span className="text-[13px] font-semibold flex-1" style={{ color: BODY_TEXT }}>{fireAHJName}</span>
                      {fireStatus === 'passing' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>Pass</span>
                      )}
                      {fireStatus === 'failing' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>Fail</span>
                      )}
                      {fireStatus === 'at_risk' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>At Risk</span>
                      )}
                      {fireStatus === 'unknown' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f1f5f9', color: '#94a3b8' }}>Unknown</span>
                      )}
                    </div>
                    {/* FireStatusBars compact */}
                    {override && (
                      <div className="mt-2">
                        <FireStatusBars
                          permitStatus={override.fireSafety.permitStatus}
                          hoodStatus={override.fireSafety.hoodStatus}
                          extinguisherStatus={override.fireSafety.extinguisherStatus}
                          ansulStatus={override.fireSafety.ansulStatus}
                          compact
                        />
                      </div>
                    )}
                  </div>

                  {/* Expandable Details toggle */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(loc.id)}
                    className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    style={{ color: NAVY }}
                  >
                    Details {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {/* Expanded section: agency contact info */}
                  {isExpanded && jur && (
                    <div
                      className="mt-2 p-3 rounded-lg space-y-3"
                      style={{ backgroundColor: '#fafbfc', border: '1px solid #f0f0f0', animation: 'slideDown 0.2s ease-out' }}
                    >
                      {/* Food Safety Agency */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Food Safety Agency</p>
                        <p className="text-[12px] font-medium" style={{ color: BODY_TEXT }}>{jur.foodSafety.agency_name}</p>
                        {jur.foodSafety.agency_phone && (
                          <a
                            href={`tel:${jur.foodSafety.agency_phone}`}
                            className="flex items-center gap-1 text-[11px] mt-0.5 hover:underline"
                            style={{ color: NAVY }}
                          >
                            <Phone size={10} /> {jur.foodSafety.agency_phone}
                          </a>
                        )}
                        {jur.foodSafety.agency_website && (
                          <a
                            href={jur.foodSafety.agency_website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] mt-0.5 hover:underline"
                            style={{ color: NAVY }}
                          >
                            <ExternalLink size={10} /> Agency Website
                          </a>
                        )}
                      </div>

                      {/* Fire Safety AHJ */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Fire Safety AHJ</p>
                        <p className="text-[12px] font-medium" style={{ color: BODY_TEXT }}>{jur.fireSafety.agency_name}</p>
                        {jur.fireSafety.agency_phone && (
                          <a
                            href={`tel:${jur.fireSafety.agency_phone}`}
                            className="flex items-center gap-1 text-[11px] mt-0.5 hover:underline"
                            style={{ color: NAVY }}
                          >
                            <Phone size={10} /> {jur.fireSafety.agency_phone}
                          </a>
                        )}
                        {jur.fireSafety.agency_website && (
                          <a
                            href={jur.fireSafety.agency_website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] mt-0.5 hover:underline"
                            style={{ color: NAVY }}
                          >
                            <ExternalLink size={10} /> AHJ Website
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. UPCOMING INSPECTIONS                                      */}
        {/* ============================================================ */}
        <div style={stagger(4)}>
          <div
            className="bg-white rounded-xl p-5"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={16} style={{ color: NAVY }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Upcoming Inspections</h3>
            </div>
            <div className="space-y-2">
              {DEMO_INSPECTIONS.map((insp, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{
                    backgroundColor: insp.status === 'urgent' ? '#fef2f2' : '#fafafa',
                    border: `1px solid ${insp.status === 'urgent' ? '#fecaca' : '#f0f0f0'}`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold" style={{ color: BODY_TEXT }}>{insp.location}</p>
                    <p className="text-[11px] text-gray-500">{insp.type}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{insp.agency}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-medium" style={{ color: BODY_TEXT }}>{insp.date}</p>
                    {insp.status === 'urgent' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded mt-1"
                        style={{ backgroundColor: '#dc2626', color: '#fff' }}>
                        <AlertCircle size={10} /> Urgent
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block"
                        style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                        Scheduled
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. SELF-INSPECTION STATUS                                    */}
        {/* ============================================================ */}
        <div style={stagger(5)}>
          <div
            className="bg-white rounded-xl p-5"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCheck size={16} style={{ color: NAVY }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Self-Inspection Status</h3>
            </div>
            <div className="space-y-2">
              {DEMO_SELF_INSPECTIONS.map((si, idx) => {
                const selfStatusColor = si.status === 'current' ? '#16a34a'
                  : si.status === 'due_soon' ? '#d97706'
                  : '#dc2626';
                const selfStatusLabel = si.status === 'current' ? 'Current'
                  : si.status === 'due_soon' ? 'Due Soon'
                  : 'Overdue';
                const selfStatusBg = si.status === 'current' ? '#dcfce7'
                  : si.status === 'due_soon' ? '#fef3c7'
                  : '#fef2f2';

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{
                      backgroundColor: si.status === 'overdue' ? '#fef2f2' : '#fafafa',
                      border: `1px solid ${si.status === 'overdue' ? '#fecaca' : '#f0f0f0'}`,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold" style={{ color: BODY_TEXT }}>{si.location}</p>
                      <p className="text-[11px] text-gray-500">
                        Last: {si.lastCompleted} &middot; Score: {si.score}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Next due: {si.nextDue}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: selfStatusBg, color: selfStatusColor }}
                      >
                        {selfStatusLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('/self-inspection')}
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-colors hover:opacity-90"
                        style={{ backgroundColor: NAVY, color: '#fff' }}
                      >
                        Start Inspection &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. REGULATORY UPDATES                                        */}
        {/* ============================================================ */}
        <div style={stagger(6)}>
          <div
            className="bg-white rounded-xl p-5"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen size={16} style={{ color: NAVY }} />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Regulatory Updates</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/regulatory-alerts')}
                className="text-xs font-medium hover:underline"
                style={{ color: NAVY }}
              >
                View All &rarr;
              </button>
            </div>
            <div className="space-y-2">
              {DEMO_REGULATORY.map((reg, idx) => {
                const impactColor = reg.impact === 'high' ? '#dc2626'
                  : reg.impact === 'medium' ? '#d97706'
                  : '#6b7280';
                const impactBg = reg.impact === 'high' ? '#fef2f2'
                  : reg.impact === 'medium' ? '#fef3c7'
                  : '#f3f4f6';
                const impactLabel = reg.impact === 'high' ? 'High Impact'
                  : reg.impact === 'medium' ? 'Medium Impact'
                  : 'Low Impact';

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: '#fafafa', border: '1px solid #f0f0f0' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold" style={{ color: BODY_TEXT }}>{reg.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{reg.summary}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{reg.date}</p>
                      </div>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ backgroundColor: impactBg, color: impactColor }}
                      >
                        {impactLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* FOOTER                                                       */}
        {/* ============================================================ */}
        <div className="flex items-center justify-center py-6 mt-4">
          <span className="text-xs text-gray-400">Powered by </span>
          <span className="text-xs font-bold ml-1">
            <span style={{ color: GOLD }}>E</span>
            <span style={{ color: NAVY }}>vid</span>
            <span style={{ color: GOLD }}>LY</span>
          </span>
        </div>

      </div>
    </div>
  );
}
