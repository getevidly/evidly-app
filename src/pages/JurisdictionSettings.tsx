// TODO: i18n
import { type ReactNode, useState } from 'react';
import {
  ChevronDown, ChevronUp, MapPin, Shield, Phone, ExternalLink,
  CheckCircle2, XCircle, AlertTriangle, Thermometer, FileText,
  Award, Calendar, Wrench, ClipboardList, Building2, RotateCcw,
  Scale, DollarSign
} from 'lucide-react';
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
  type ComplianceGap,
} from '../lib/jurisdictionEngine';
import { CALIFORNIA_STATE_LAWS } from '../lib/californiaLaws';

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
    case 'letter_grade': return { label: 'Letter Grade (A/B/C)', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'color_placard': return { label: 'Color Placard', color: 'bg-green-100 text-green-700 border-green-200' };
    case 'pass_fail': return { label: 'Pass/Fail', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'standard': return { label: 'Standard Inspection', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    default: return { label: type, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
}

function getLawStatusBadge(status: CaliforniaStateLaw['status']): { label: string; color: string } {
  switch (status) {
    case 'effective': return { label: 'Effective', color: 'bg-green-100 text-green-700' };
    case 'upcoming': return { label: 'Upcoming', color: 'bg-amber-100 text-amber-700' };
    case 'phased': return { label: 'Phased', color: 'bg-blue-100 text-blue-700' };
    default: return { label: status, color: 'bg-gray-100 text-gray-700' };
  }
}

function getBillBadgeColor(status: CaliforniaStateLaw['status']): string {
  switch (status) {
    case 'effective': return 'bg-green-50 text-green-700 border-green-200';
    case 'upcoming': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'phased': return 'bg-blue-50 text-blue-700 border-blue-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
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
  if (days < 90) return 'bg-red-100 text-red-700';
  if (days < 180) return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}

// ── Expandable Description Component ────────────────────────────

function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 150;

  if (!isLong) {
    return <p className="text-sm text-gray-600">{text}</p>;
  }

  return (
    <div>
      <p className={`text-sm text-gray-600 ${expanded ? '' : 'line-clamp-2'}`}>
        {text}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-medium text-[#1e4d6b] hover:text-[#2a6a8f] mt-0.5"
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
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-[#1e4d6b]">{icon}</span>
        <span className="text-sm font-semibold text-gray-800 flex-1">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {open && <div className="px-6 pb-4">{children}</div>}
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────────

export function JurisdictionSettings() {
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);

  // Precompute profiles and gaps
  const locationProfiles = DEMO_LOCATION_JURISDICTIONS.map(loc => ({
    location: loc,
    profile: autoConfigureLocation(loc),
  }));
  const complianceGaps = getDemoComplianceGaps();

  // Access minimum wage from the California state level
  const caProfile = getJurisdiction('state-ca');
  const minimumWage = caProfile?.minimumWage;

  // Upcoming regulatory changes
  const upcomingLaws = CALIFORNIA_STATE_LAWS
    .filter(law => {
      if (law.status === 'upcoming') return true;
      const daysLeft = getDaysRemaining(law.effectiveDate);
      return daysLeft > 0;
    })
    .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Settings', href: '/settings' },
          { label: 'Jurisdiction Profile' },
        ]}
      />

      {/* Header */}
      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jurisdiction Configuration</h1>
        <p className="text-sm text-gray-600 mt-1">
          Auto-configured compliance requirements based on your location
        </p>
      </div>

      {/* Per-Location Cards */}
      {locationProfiles.map(({ location, profile }) => {
        const isExpanded = expandedLocation === location.locationName;
        const locationGaps = complianceGaps.find(g => g.locationName === location.locationName);

        // Get inspection system from the county level
        const chain = getJurisdictionChain(location.jurisdictionChain[location.jurisdictionChain.length - 1]);
        const countyProfile = chain.find(j => j.level === 'county');
        const inspectionSystem = countyProfile?.inspectionSystem;

        return (
          <div
            key={location.locationName}
            className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden mb-4"
          >
            {/* Card Header */}
            <div className="p-6 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#1e4d6b]" />
                  <span className="text-lg font-semibold text-gray-900">
                    {location.locationName}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1 ml-7">
                  {location.address}, {location.city}, {location.state} {location.zip}
                </p>
                <p className="text-xs text-[#1e4d6b] mt-1 ml-7">
                  {profile.jurisdictionChainNames.join(' \u2192 ')}
                </p>
                <span className="inline-block mt-2 ml-7 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                  Auto-configured
                </span>
              </div>
              <button
                onClick={() =>
                  setExpandedLocation(isExpanded ? null : location.locationName)
                }
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-gray-100">
                {/* 1. Temperature Thresholds */}
                <CollapsibleSection
                  icon={<Thermometer className="w-4 h-4" />}
                  title="Temperature Thresholds"
                  defaultOpen
                >
                  {(profile.temperatureThresholds.length > 0 ||
                    profile.cookingTemps.length > 0) && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                            <th className="pb-2 pr-4">Food Type / Threshold</th>
                            <th className="pb-2 pr-4">Required Temp</th>
                            <th className="pb-2">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.temperatureThresholds.map((t, i) => (
                            <tr key={`thresh-${i}`} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                              <td className="py-2 pr-4 font-medium text-gray-700">{t.type}</td>
                              <td className="py-2 pr-4 text-gray-600">
                                {t.tempF}&deg;F {t.type.toLowerCase().includes('cold') ? 'max' : 'min'}
                              </td>
                              <td className="py-2 text-gray-400 text-xs">{t.source}</td>
                            </tr>
                          ))}
                          {profile.cookingTemps.map((c, i) => (
                            <tr
                              key={`cook-${i}`}
                              className={
                                (profile.temperatureThresholds.length + i) % 2 === 1
                                  ? 'bg-gray-50'
                                  : ''
                              }
                            >
                              <td className="py-2 pr-4 font-medium text-gray-700">{c.foodType}</td>
                              <td className="py-2 pr-4 text-gray-600">
                                {c.requiredTempF}&deg;F for {c.holdTimeSeconds}s
                              </td>
                              <td className="py-2 text-gray-400 text-xs">{c.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Cooling Requirements */}
                  {profile.coolingRequirements.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Cooling Requirements
                      </h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                            <th className="pb-2 pr-4">Stage</th>
                            <th className="pb-2 pr-4">Temperature Range</th>
                            <th className="pb-2">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.coolingRequirements.map((cr, i) => (
                            <tr key={`cool-${i}`} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                              <td className="py-2 pr-4 font-medium text-gray-700">{cr.stage}</td>
                              <td className="py-2 pr-4 text-gray-600">
                                {cr.fromTempF}&deg;F &rarr; {cr.toTempF}&deg;F in {cr.maxHours} hours
                              </td>
                              <td className="py-2 text-gray-400 text-xs">{cr.source}</td>
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
                    <p className="text-sm text-gray-600 mb-3">
                      You have{' '}
                      <span className="font-semibold text-gray-900">
                        {locationGaps.totalCompliant}
                      </span>{' '}
                      of{' '}
                      <span className="font-semibold text-gray-900">
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
                          className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-b-0"
                        >
                          {getStatusIcon(status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{doc.name}</p>
                            <p className="text-xs text-gray-500">
                              Renewal: {doc.renewalFrequency}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 hidden sm:block">{doc.source}</span>
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
                            <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                              <th className="pb-2 pr-4">Certification</th>
                              <th className="pb-2 pr-4">Renewal Period</th>
                              <th className="pb-2 pr-4">Approved Providers</th>
                              <th className="pb-2">Source</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profile.certifications.map((cert, i) => (
                              <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                                <td className="py-2 pr-4 font-medium text-gray-700">
                                  {cert.type}
                                </td>
                                <td className="py-2 pr-4 text-gray-600">
                                  Every {cert.renewalYears} year{cert.renewalYears !== 1 ? 's' : ''}
                                </td>
                                <td className="py-2 pr-4 text-gray-600 text-xs">
                                  {cert.approvedProviders?.join(', ') || 'N/A'}
                                </td>
                                <td className="py-2 text-gray-400 text-xs">{cert.source}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Show certification gaps if any */}
                      {locationGaps && locationGaps.gaps.filter(g => g.category === 'certification').length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
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
                    <p className="text-sm text-gray-500 italic">
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
                        <span className="text-gray-500 w-40">Expected frequency:</span>
                        <span className="text-gray-800 font-medium">
                          {profile.healthDepartment.inspectionFrequency}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-40">Permit renewal:</span>
                        <span className="text-gray-800 font-medium">
                          {profile.healthDepartment.permitRenewal}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-40">Last inspection:</span>
                        <span className="text-gray-800 font-medium">Nov 15, 2025</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-40">Next expected:</span>
                        <span className="text-gray-800 font-medium">By Nov 2026</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      No local health department data available for this jurisdiction level.
                    </p>
                  )}
                </CollapsibleSection>

                {/* 4b. Inspection Grading System */}
                <CollapsibleSection
                  icon={<Shield className="w-4 h-4" />}
                  title="Inspection Grading System"
                >
                  {inspectionSystem ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">System type:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getInspectionSystemBadge(inspectionSystem.type).color}`}>
                          {getInspectionSystemBadge(inspectionSystem.type).label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{inspectionSystem.details}</p>
                      {inspectionSystem.grades && inspectionSystem.grades.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Grade Ranges
                          </h4>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                                <th className="pb-2 pr-4">Grade</th>
                                <th className="pb-2">Score Range</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inspectionSystem.grades.map((grade, i) => (
                                <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                                  <td className="py-2 pr-4 font-medium text-gray-700">{grade.label}</td>
                                  <td className="py-2 text-gray-600">{grade.range}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      No inspection grading system data available for this jurisdiction level.
                    </p>
                  )}
                </CollapsibleSection>

                {/* 5. Service Frequencies */}
                <CollapsibleSection
                  icon={<Wrench className="w-4 h-4" />}
                  title="Service Frequencies"
                >
                  {profile.serviceFrequencies.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                            <th className="pb-2 pr-4">Service</th>
                            <th className="pb-2 pr-4">Frequency</th>
                            <th className="pb-2 pr-4">Condition</th>
                            <th className="pb-2">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.serviceFrequencies.map((svc, i) => (
                            <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                              <td className="py-2 pr-4 font-medium text-gray-700">{svc.service}</td>
                              <td className="py-2 pr-4 text-gray-600">{svc.frequencyLabel}</td>
                              <td className="py-2 pr-4 text-gray-500 text-xs">
                                {svc.condition || '\u2014'}
                              </td>
                              <td className="py-2 text-gray-400 text-xs">{svc.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
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
                            className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-b-0"
                          >
                            {getStatusIcon(postingStatus)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">{posting.name}</p>
                              <div className="flex gap-1.5 mt-1">
                                {posting.languages.map(lang => (
                                  <span
                                    key={lang}
                                    className="px-2 py-0.5 text-xs rounded-full bg-[#eef4f8] text-[#1e4d6b] border border-[#b8d4e8]"
                                  >
                                    {lang}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 hidden sm:block">
                              {posting.source}
                            </span>
                          </div>
                        );
                      })}
                      {/* Show posting gaps if any */}
                      {locationGaps && locationGaps.gaps.filter(g => g.category === 'posting').length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
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
                    <p className="text-sm text-gray-500 italic">
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
                      <p className="font-semibold text-gray-900">
                        {profile.healthDepartment.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a
                          href={`tel:${profile.healthDepartment.phone}`}
                          className="text-[#1e4d6b] hover:underline"
                        >
                          {profile.healthDepartment.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                        <a
                          href={profile.healthDepartment.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1e4d6b] hover:underline"
                        >
                          {profile.healthDepartment.website}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Inspection frequency:</span>
                        <span className="text-gray-800">
                          {profile.healthDepartment.inspectionFrequency}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Permit renewal:</span>
                        <span className="text-gray-800">
                          {profile.healthDepartment.permitRenewal}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
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
                          className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                        >
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border ${billColor}`}>
                              {law.billNumber}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 flex-1">
                              {law.name}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.color}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Effective: {new Date(law.effectiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <div className="mt-1.5">
                            <ExpandableDescription text={law.description} />
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-gray-400 italic mt-2">
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
                        {/* General Rate */}
                        <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">General Rate</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            ${minimumWage.general.toFixed(2)}
                            <span className="text-sm font-normal text-gray-500">/hr</span>
                          </p>
                        </div>
                        {/* Fast Food Rate */}
                        {minimumWage.fastFood && (
                          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
                            <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold">Fast Food Rate</p>
                            <p className="text-2xl font-bold text-amber-900 mt-1">
                              ${minimumWage.fastFood.toFixed(2)}
                              <span className="text-sm font-normal text-amber-600">/hr</span>
                            </p>
                            <p className="text-xs text-amber-600 mt-0.5">National chains with 60+ locations</p>
                          </div>
                        )}
                        {/* Healthcare Rate */}
                        {minimumWage.healthcare && (
                          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                            <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold">Healthcare Rate</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">
                              ${minimumWage.healthcare.toFixed(2)}
                              <span className="text-sm font-normal text-blue-600">/hr</span>
                            </p>
                            <p className="text-xs text-blue-600 mt-0.5">Healthcare facility workers</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Source: {minimumWage.source}</span>
                        <span className="text-gray-300">|</span>
                        <span>
                          Effective: {new Date(minimumWage.effectiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-[#eef4f8] border border-[#b8d4e8]">
                        <p className="text-xs text-gray-600">
                          <strong>Note:</strong> Local city minimum wages may be higher than the state rate.
                          Check your city ordinances for applicable local minimum wage requirements.
                          Cities like San Francisco, West Hollywood, and Emeryville have rates above $19/hr.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Minimum wage data not available for this jurisdiction.
                    </p>
                  )}
                </CollapsibleSection>

                {/* Override Controls */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
                  <button
                    onClick={() =>
                      alert(
                        'Override controls available for Management and Executive roles. (Demo mode)'
                      )
                    }
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
                  >
                    Override
                  </button>
                  <button
                    onClick={() => alert('Reset to jurisdiction defaults. (Demo mode)')}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Default
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Compliance Gap Analysis Section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Compliance Gap Analysis</h2>

        {complianceGaps.map(locationGap => {
          const pct = Math.round(
            (locationGap.totalCompliant / locationGap.totalRequired) * 100
          );
          const barColor = pct < 60 ? 'bg-red-500' : pct < 80 ? 'bg-amber-500' : 'bg-green-500';

          return (
            <div
              key={locationGap.locationName}
              className="bg-white rounded-lg shadow border border-gray-100 p-6 mb-4"
            >
              {/* Summary */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  {locationGap.locationName}
                </h3>
                <span className="text-sm font-bold text-gray-700">
                  {locationGap.totalCompliant} / {locationGap.totalRequired} &mdash; {pct}%
                </span>
              </div>
              <div className="bg-gray-200 rounded-full h-2 mb-4">
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
                      className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50"
                    >
                      {getStatusIcon(gap.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{gap.item}</p>
                        <p className="text-xs text-gray-500">{gap.detail}</p>
                      </div>
                      <button
                        onClick={() => alert(`${gap.action || 'Action'} (Demo mode)`)}
                        className="px-3 py-1 text-xs font-medium text-[#1e4d6b] border border-[#b8d4e8] rounded-lg hover:bg-[#eef4f8] whitespace-nowrap"
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
          <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Regulatory Changes</h2>

          <div className="space-y-3">
            {upcomingLaws.map((law) => {
              const daysLeft = getDaysRemaining(law.effectiveDate);
              const urgencyBorder = getUrgencyColor(daysLeft);
              const urgencyText = getUrgencyTextColor(daysLeft);
              const urgencyBadge = getUrgencyBadgeColor(daysLeft);

              return (
                <div
                  key={law.id}
                  className={`bg-white rounded-lg shadow border-l-4 ${urgencyBorder} p-5`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded ${urgencyBadge}`}>
                          {daysLeft > 0 ? `${daysLeft} days remaining` : 'Effective now'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(law.effectiveDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-semibold ${urgencyText}`}>
                          {law.billNumber}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{law.name}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {law.description}
                      </p>
                    </div>
                    <button
                      onClick={() => alert(`Preparing compliance plan for ${law.billNumber}: ${law.name}. (Demo mode)`)}
                      className="px-3 py-1.5 text-xs font-medium text-white rounded-lg whitespace-nowrap"
                      style={{ backgroundColor: '#1e4d6b' }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
                    >
                      Prepare Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Key Upcoming Dates Summary */}
          <div className="mt-4 p-4 bg-white rounded-lg shadow border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Key Upcoming Dates</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
                <p className="text-xs font-semibold text-amber-700">Jul 1, 2026</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">AB 660 &amp; SB 68</p>
                <p className="text-xs text-gray-600 mt-0.5">Date labels + Allergen disclosure</p>
              </div>
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                <p className="text-xs font-semibold text-blue-700">Jan 1, 2027</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">AB 418</p>
                <p className="text-xs text-gray-600 mt-0.5">Banned food additives</p>
              </div>
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                <p className="text-xs font-semibold text-blue-700">Dec 31, 2027</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">AB 2316</p>
                <p className="text-xs text-gray-600 mt-0.5">School food synthetic dye ban</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Note */}
      <div className="bg-[#eef4f8] rounded-lg p-4 border border-[#b8d4e8] mt-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#1e4d6b] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-700">
            During onboarding, EvidLY automatically detects your jurisdiction from your location
            address and pre-configures all compliance requirements. You can customize any setting
            from this page.
          </p>
        </div>
      </div>
    </div>
  );
}
