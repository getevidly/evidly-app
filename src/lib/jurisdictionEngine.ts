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
  type LocationJurisdiction,
  getJurisdictionChain,
  DEMO_LOCATION_JURISDICTIONS,
} from './jurisdictions';

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
  specialRequirements: string[];
}

// ── Compliance Gap ────────────────────────────────────────────

export interface ComplianceGap {
  category: 'document' | 'certification' | 'service' | 'posting';
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

    // Special requirements: accumulate all
    merged.specialRequirements.push(...profile.specialRequirements);
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
      // Nearly compliant — missing 1 document
      const gaps: ComplianceGap[] = [
        { category: 'document', item: 'Grease Trap Maintenance Record', status: 'missing', detail: 'No grease trap maintenance record on file', action: 'Upload grease trap service receipt' },
      ];
      return { locationName: location.locationName, totalRequired, totalCompliant: totalRequired - 1, gaps };
    }

    if (location.locationName === 'Airport Cafe') {
      // Missing 2 documents and 1 cert
      const gaps: ComplianceGap[] = [
        { category: 'document', item: 'Fire Inspection Certificate', status: 'expiring', detail: 'Fire inspection certificate expires in 14 days', action: 'Schedule fire inspection' },
        { category: 'document', item: 'Hood Cleaning Certificate', status: 'missing', detail: 'No hood cleaning certificate on file — last cleaning was 7 months ago', action: 'Schedule hood cleaning and upload certificate' },
        { category: 'certification', item: 'Food Protection Manager Certification', status: 'missing', detail: '0 of 1 required managers have current certification', action: 'Register manager for ServSafe Manager exam' },
      ];
      return { locationName: location.locationName, totalRequired, totalCompliant: totalRequired - 3, gaps };
    }

    // University Dining — missing several items, overdue on hood cleaning
    const gaps: ComplianceGap[] = [
      { category: 'document', item: 'City of Modesto Business License', status: 'missing', detail: 'City business license not on file (required in addition to county health permit)', action: 'Apply at City of Modesto Business License office' },
      { category: 'document', item: 'Hood Cleaning Certificate', status: 'overdue', detail: 'Hood cleaning is 2 weeks overdue — last cleaned 7 months ago (semi-annual required)', action: 'Schedule emergency hood cleaning' },
      { category: 'document', item: 'Pest Control Service Agreement', status: 'expiring', detail: 'Pest control contract expires in 30 days', action: 'Renew pest control service agreement' },
      { category: 'certification', item: 'Food Handler Certification', status: 'missing', detail: '3 of 12 staff missing current food handler certification', action: 'Notify staff to complete certification' },
      { category: 'posting', item: 'Handwashing Signage', status: 'missing', detail: 'Spanish-language handwashing signs not posted at 2 stations', action: 'Print and post bilingual handwashing signs' },
    ];
    return { locationName: location.locationName, totalRequired: totalRequired + 1, totalCompliant: totalRequired + 1 - 5, gaps };
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
 *
 * Closing Checklist:
 * - All cooling logs completed (2hr stage 1, 4hr stage 2 per jurisdiction)
 * - Hot holding items discarded or properly cooled
 * - All surfaces cleaned and sanitized
 * - Handwashing stations restocked
 * - Walk-in temps verified and logged
 */
export function _generateChecklistTemplates(_profile: MergedJurisdictionProfile): void {
  // TODO: Create checklist_templates in Supabase
  // TODO: Use profile.temperatureThresholds for temp check items
  // TODO: Use profile.requiredPostings for posting verification items
  // TODO: Use profile.coolingRequirements for cooling log items
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
 */
export function _calculateJurisdictionScore(
  _gaps: LocationComplianceGap,
): number {
  // TODO: Implement scoring integration
  return 0;
}
