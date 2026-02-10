// ============================================================
// EvidLY Jurisdiction Auto-Configuration Engine
// ============================================================
// Merges hierarchical jurisdiction profiles and auto-configures
// location compliance requirements.
//
// TODO: Wire to Supabase for persistent overrides per organization
// TODO: Auto-generate checklist templates from jurisdiction thresholds
// TODO: Integrate with scoring engine (complianceScoring.ts)
// TODO: API endpoint for dynamic jurisdiction detection from geocoded address
// ============================================================

import {
  type JurisdictionProfile,
  type TemperatureThreshold,
  type CookingTemp,
  type CoolingRequirement,
  type CertificationRequirement,
  type RequiredDocument,
  type RequiredPosting,
  type ServiceFrequency,
  type HealthDepartment,
  type InspectionSystem,
  type MinimumWageInfo,
  type CaliforniaStateLaw,
  type LocationJurisdiction,
  getJurisdictionChain,
  DEMO_LOCATION_JURISDICTIONS,
} from './jurisdictions';
import { CALIFORNIA_STATE_LAWS, CALIFORNIA_CITIES } from './californiaLaws';

// ── Merged Profile ────────────────────────────────────────────

export interface MergedJurisdictionProfile {
  locationName: string;
  jurisdictionChainNames: string[];
  temperatureThresholds: TemperatureThreshold[];
  cookingTemps: CookingTemp[];
  coolingRequirements: CoolingRequirement[];
  certifications: CertificationRequirement[];
  requiredDocuments: RequiredDocument[];
  requiredPostings: RequiredPosting[];
  serviceFrequencies: ServiceFrequency[];
  healthDepartment?: HealthDepartment;
  inspectionSystem?: InspectionSystem;
  minimumWage?: MinimumWageInfo;
  applicableLaws: CaliforniaStateLaw[];
  specialRequirements: string[];
}

// ── Compliance Gap ────────────────────────────────────────────

export interface ComplianceGap {
  category: 'document' | 'certification' | 'service' | 'posting' | 'law';
  item: string;
  status: 'compliant' | 'missing' | 'expiring' | 'overdue';
  detail: string;
  action?: string;
}

export interface LocationComplianceGap {
  locationName: string;
  totalRequired: number;
  totalCompliant: number;
  gaps: ComplianceGap[];
}

// ── Core Engine Functions ─────────────────────────────────────

/**
 * Get a merged jurisdiction profile by combining all levels in the hierarchy.
 * More specific jurisdictions (county/city) add to and override less specific (federal/state).
 */
export function getJurisdictionProfile(
  jurisdictionLeafId: string,
): MergedJurisdictionProfile {
  const chain = getJurisdictionChain(jurisdictionLeafId);

  const merged: MergedJurisdictionProfile = {
    locationName: '',
    jurisdictionChainNames: chain.map(j => j.name),
    temperatureThresholds: [],
    cookingTemps: [],
    coolingRequirements: [],
    certifications: [],
    requiredDocuments: [],
    requiredPostings: [],
    serviceFrequencies: [],
    healthDepartment: undefined,
    inspectionSystem: undefined,
    minimumWage: undefined,
    applicableLaws: [],
    specialRequirements: [],
  };

  for (const profile of chain) {
    // Temperature thresholds: more specific overrides by type
    for (const threshold of profile.temperatureThresholds) {
      const existingIdx = merged.temperatureThresholds.findIndex(t => t.type === threshold.type);
      if (existingIdx >= 0) {
        merged.temperatureThresholds[existingIdx] = threshold;
      } else {
        merged.temperatureThresholds.push(threshold);
      }
    }

    // Cooking temps: more specific overrides by food type
    for (const cookTemp of profile.cookingTemps) {
      const existingIdx = merged.cookingTemps.findIndex(c => c.foodType === cookTemp.foodType);
      if (existingIdx >= 0) {
        merged.cookingTemps[existingIdx] = cookTemp;
      } else {
        merged.cookingTemps.push(cookTemp);
      }
    }

    // Cooling: more specific overrides by stage
    for (const cool of profile.coolingRequirements) {
      const existingIdx = merged.coolingRequirements.findIndex(c => c.stage === cool.stage);
      if (existingIdx >= 0) {
        merged.coolingRequirements[existingIdx] = cool;
      } else {
        merged.coolingRequirements.push(cool);
      }
    }

    // Certifications: accumulate (no override, additive)
    for (const cert of profile.certifications) {
      if (!merged.certifications.find(c => c.type === cert.type)) {
        merged.certifications.push(cert);
      }
    }

    // Documents: accumulate (no override, additive)
    for (const doc of profile.requiredDocuments) {
      if (!merged.requiredDocuments.find(d => d.name === doc.name)) {
        merged.requiredDocuments.push(doc);
      }
    }

    // Postings: accumulate
    for (const posting of profile.requiredPostings) {
      if (!merged.requiredPostings.find(p => p.name === posting.name)) {
        merged.requiredPostings.push(posting);
      }
    }

    // Service frequencies: more specific overrides by service name
    for (const svc of profile.serviceFrequencies) {
      const existingIdx = merged.serviceFrequencies.findIndex(s => s.service === svc.service);
      if (existingIdx >= 0) {
        merged.serviceFrequencies[existingIdx] = svc;
      } else {
        merged.serviceFrequencies.push(svc);
      }
    }

    // Health department: most specific wins
    if (profile.healthDepartment) {
      merged.healthDepartment = profile.healthDepartment;
    }

    // Inspection system: most specific wins
    if (profile.inspectionSystem) {
      merged.inspectionSystem = profile.inspectionSystem;
    }

    // Minimum wage: highest applicable wins (more specific can override with higher rate)
    if (profile.minimumWage) {
      if (!merged.minimumWage || profile.minimumWage.general > merged.minimumWage.general) {
        merged.minimumWage = profile.minimumWage;
      }
    }

    // Special requirements: accumulate all
    merged.specialRequirements.push(...profile.specialRequirements);
  }

  // Add applicable state laws (for CA locations)
  const hasCaInChain = chain.some(j => j.id === 'state-ca');
  if (hasCaInChain) {
    merged.applicableLaws = CALIFORNIA_STATE_LAWS;
  }

  return merged;
}

/**
 * Auto-configure a location based on its jurisdiction chain.
 * Returns the merged profile for the location's most specific jurisdiction.
 */
export function autoConfigureLocation(location: LocationJurisdiction): MergedJurisdictionProfile {
  const leafJurisdiction = location.jurisdictionChain[location.jurisdictionChain.length - 1];
  const profile = getJurisdictionProfile(leafJurisdiction);
  profile.locationName = location.locationName;
  return profile;
}

/**
 * Get all required documents for a merged jurisdiction profile.
 */
export function getRequiredDocuments(profile: MergedJurisdictionProfile): RequiredDocument[] {
  return profile.requiredDocuments;
}

/**
 * Get all temperature thresholds for a merged jurisdiction profile.
 */
export function getTemperatureThresholds(profile: MergedJurisdictionProfile): {
  thresholds: TemperatureThreshold[];
  cookingTemps: CookingTemp[];
  coolingRequirements: CoolingRequirement[];
} {
  return {
    thresholds: profile.temperatureThresholds,
    cookingTemps: profile.cookingTemps,
    coolingRequirements: profile.coolingRequirements,
  };
}

/**
 * Get certification requirements for a merged jurisdiction profile.
 */
export function getCertificationRequirements(profile: MergedJurisdictionProfile): CertificationRequirement[] {
  return profile.certifications;
}

/**
 * Get the service frequency schedule for a location.
 */
export function getServiceSchedule(profile: MergedJurisdictionProfile): ServiceFrequency[] {
  return profile.serviceFrequencies;
}

/**
 * Get applicable state laws filtered by business type and size.
 * In production, this would filter based on actual business profile.
 * For demo, returns all laws for CA locations.
 */
export function getApplicableLaws(
  profile: MergedJurisdictionProfile,
  _businessType?: string,
  _locationCount?: number,
): CaliforniaStateLaw[] {
  return profile.applicableLaws;
  // TODO: Filter by business type/size in production:
  // - SB 68: only if 20+ locations nationally
  // - AB 1228: only if fast food chain 60+ locations
  // - SB 1383: only if meets Tier 1 or Tier 2 thresholds
  // - AB 2316/AB 1264: only if K-12 school
  // - Cal/OSHA 3396: ALL (flag commercial kitchens as high-radiant-heat → 82°F threshold)
}

/**
 * Get the applicable minimum wage for a jurisdiction profile.
 * Returns the highest applicable rate (federal < state < county < city).
 */
export function getMinimumWage(profile: MergedJurisdictionProfile): MinimumWageInfo | undefined {
  return profile.minimumWage;
}

/**
 * Get the inspection system for a jurisdiction profile.
 */
export function getInspectionSystem(profile: MergedJurisdictionProfile): InspectionSystem | undefined {
  return profile.inspectionSystem;
}

/**
 * Get upcoming regulatory changes (laws with future effective dates).
 */
export function getUpcomingChanges(): CaliforniaStateLaw[] {
  const now = new Date();
  return CALIFORNIA_STATE_LAWS
    .filter(law => new Date(law.effectiveDate) > now || law.status === 'upcoming' || law.status === 'phased')
    .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
}

/**
 * Get days until a law's effective date.
 */
export function getDaysUntil(effectiveDate: string): number {
  const now = new Date();
  const target = new Date(effectiveDate);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get city ordinance data for a city name.
 */
export function getCityOrdinance(cityName: string) {
  return CALIFORNIA_CITIES.find(c => c.cityName === cityName);
}

// ── Demo Compliance Gap Analysis ──────────────────────────────

/**
 * Generate demo compliance gap analysis for each location.
 * In production, this would check against actual uploaded documents and certifications.
 */
export function getDemoComplianceGaps(): LocationComplianceGap[] {
  return DEMO_LOCATION_JURISDICTIONS.map(location => {
    const profile = autoConfigureLocation(location);
    const totalDocs = profile.requiredDocuments.length;
    const totalPostings = profile.requiredPostings.length;
    const totalCerts = profile.certifications.length;
    const totalRequired = totalDocs + totalPostings + totalCerts;

    // Demo: different compliance levels per location
    if (location.locationName === 'Downtown Kitchen') {
      // Nearly compliant — missing 1 document (IHIPP), 1 cert expiring
      const gaps: ComplianceGap[] = [
        { category: 'document', item: 'Indoor Heat Illness Prevention Plan (IHIPP)', status: 'missing', detail: 'No written IHIPP on file — required by Cal/OSHA §3396 for all indoor workplaces', action: 'Create IHIPP template from Cal/OSHA guidelines' },
        { category: 'certification', item: 'Food Protection Manager Certification', status: 'expiring', detail: 'Manager certification expires in 45 days', action: 'Register for ServSafe Manager renewal exam' },
      ];
      return { locationName: location.locationName, totalRequired, totalCompliant: totalRequired - 2, gaps };
    }

    if (location.locationName === 'Airport Cafe') {
      // Missing 3 documents and 1 cert
      const gaps: ComplianceGap[] = [
        { category: 'document', item: 'Fire Inspection Certificate', status: 'expiring', detail: 'Fire inspection certificate expires in 14 days', action: 'Schedule fire inspection' },
        { category: 'document', item: 'Hood Cleaning Certificate', status: 'missing', detail: 'No hood cleaning certificate on file — last cleaning was 7 months ago', action: 'Schedule hood cleaning and upload certificate' },
        { category: 'document', item: 'Indoor Heat Illness Prevention Plan (IHIPP)', status: 'missing', detail: 'No written IHIPP on file — required by Cal/OSHA §3396', action: 'Create IHIPP template from Cal/OSHA guidelines' },
        { category: 'certification', item: 'Food Protection Manager Certification', status: 'missing', detail: '0 of 1 required managers have current certification', action: 'Register manager for ServSafe Manager exam' },
      ];
      return { locationName: location.locationName, totalRequired, totalCompliant: totalRequired - 4, gaps };
    }

    // University Dining — missing several items, overdue on hood cleaning
    const gaps: ComplianceGap[] = [
      { category: 'document', item: 'City of Modesto Business License', status: 'missing', detail: 'City business license not on file (required in addition to county health permit)', action: 'Apply at City of Modesto Business License office' },
      { category: 'document', item: 'Hood Cleaning Certificate', status: 'overdue', detail: 'Hood cleaning is 2 weeks overdue — last cleaned 7 months ago (semi-annual required)', action: 'Schedule emergency hood cleaning' },
      { category: 'document', item: 'Pest Control Service Agreement', status: 'expiring', detail: 'Pest control contract expires in 30 days', action: 'Renew pest control service agreement' },
      { category: 'document', item: 'Indoor Heat Illness Prevention Plan (IHIPP)', status: 'missing', detail: 'No written IHIPP on file — required by Cal/OSHA §3396', action: 'Create IHIPP template from Cal/OSHA guidelines' },
      { category: 'document', item: 'Pest Prevention Training Records', status: 'missing', detail: 'No pest prevention training records on file — required by AB 1147', action: 'Conduct pest prevention training and document' },
      { category: 'certification', item: 'Food Handler Certification', status: 'missing', detail: '3 of 12 staff missing current food handler certification', action: 'Notify staff to complete certification' },
      { category: 'posting', item: 'Handwashing Signage', status: 'missing', detail: 'Spanish-language handwashing signs not posted at 2 stations', action: 'Print and post bilingual handwashing signs' },
    ];
    return { locationName: location.locationName, totalRequired: totalRequired + 1, totalCompliant: totalRequired + 1 - 7, gaps };
  });
}

// ── Checklist Auto-Generation (TODO) ──────────────────────────

/**
 * Auto-generate checklist templates based on jurisdiction-specific thresholds.
 * TODO: Implement for production — generate these templates in the database:
 *
 * Opening Checklist:
 * - Verify cold holding ≤41°F (from jurisdiction threshold)
 * - Verify hot holding ≥135°F (from jurisdiction threshold)
 * - Check handwashing stations (soap, paper towels, warm water)
 * - Verify required postings are displayed
 * - Check sanitizer concentration (100-200 ppm quaternary, 50-100 ppm chlorine)
 *
 * Receiving Checklist:
 * - Check delivery temps against jurisdiction thresholds
 * - Verify poultry ≤41°F
 * - Verify frozen items are solidly frozen
 * - Inspect packaging for damage
 * - Check date marking on all TCS items
 * - Verify compliant date labels (AB 660, Jul 2026+)
 * - Verify no banned additives (AB 418, Jan 2027+)
 * - Verify allergen info available (SB 68 if applicable)
 *
 * Closing Checklist:
 * - All cooling logs completed (2hr stage 1, 4hr stage 2 per jurisdiction)
 * - Hot holding items discarded or properly cooled
 * - All surfaces cleaned and sanitized
 * - Handwashing stations restocked
 * - Walk-in temps verified and logged
 * - Waste separation (SB 1383 if applicable)
 *
 * Cal/OSHA Indoor Heat:
 * - Temperature monitoring log for kitchen ambient temp
 * - Trigger at 82°F for commercial kitchens (high-radiant-heat)
 *
 * Pest Monitoring:
 * - Per AB 1147 requirements — date, observations, corrective actions
 */
export function _generateChecklistTemplates(_profile: MergedJurisdictionProfile): void {
  // TODO: Create checklist_templates in Supabase
  // TODO: Use profile.temperatureThresholds for temp check items
  // TODO: Use profile.requiredPostings for posting verification items
  // TODO: Use profile.coolingRequirements for cooling log items
  // TODO: Use profile.applicableLaws for law-specific checklist items
}

// ── Scoring Engine Integration (TODO) ─────────────────────────

/**
 * Calculate jurisdiction-aware documentation safety score.
 * TODO: Wire into complianceScoring.ts graduated urgency model
 *
 * Missing required documents reduce Documentation Safety score:
 * - Each missing document: -5 points
 * - Each expiring document (within 30 days): -2 points
 * - Each overdue service: -8 points
 * - Missing certifications: -5 points per missing cert
 * - Missing required postings: -3 points per missing posting
 * - Missing IHIPP: -10 points (critical Cal/OSHA requirement)
 * - County-specific: if letter grade system, track alongside EvidLY score
 * - State law compliance: track readiness for upcoming effective dates
 */
export function _calculateJurisdictionScore(
  _gaps: LocationComplianceGap,
): number {
  // TODO: Implement scoring integration
  return 0;
}
