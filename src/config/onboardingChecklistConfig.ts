// ── Role-Based Onboarding Wizard Config (v4) ────────────────────
// 15-step guided wizard with per-role visibility + dependency-based unlocking.
// Each step declares its own role/industry/tier requirements + dependencies.
// resolveVisibleSteps() is a pure function — no side effects.

import type { UserRole } from '../contexts/RoleContext';

// Industry codes match Signup.tsx INDUSTRY_TYPES keys
export type IndustryCode =
  | 'RESTAURANT'
  | 'HEALTHCARE'
  | 'SENIOR_LIVING'
  | 'K12_EDUCATION'
  | 'HIGHER_EDUCATION';

export type LocationTier = 'single' | 'multi' | 'enterprise';

/** How the step is activated when clicking its action button */
export type StepType = 'navigate' | 'modal' | 'external' | 'celebration' | 'tour';

export interface OnboardingStepDef {
  id: string;
  label: string;
  description: string;
  hint: string;
  route: string;
  /** Contextual label for the action button */
  actionLabel: string;
  section: 'getting_started' | 'team_vendors' | 'safety_setup' | 'platform_tour' | 'growth';
  order: number;
  /** Step activation type (default: 'navigate') */
  stepType?: StepType;
  /** Step IDs that must be COMPLETED (not skipped) before this step unlocks */
  dependsOn?: string[];
  /** External URL for 'external' step type */
  externalUrl?: string;
  /** If set, step only shows for these roles. Omit = all roles (universal). */
  roles?: UserRole[];
  /** If set, step only shows for these industries. Omit = universal. */
  industries?: IndustryCode[];
  /** Minimum location tier required. Omit = all tiers. */
  minTier?: LocationTier;
  /** Future paywall gating flag (not enforced yet). */
  featureGate?: string;
  /** Supabase table to query for auto-completion (auth mode). */
  completionTable?: string;
  /** Column to match against orgId (default: 'organization_id'). */
  completionOrgColumn?: string;
  /** Minimum row count to be "complete" (default: 1). */
  completionMinCount?: number;
  /** For profile step: check this column is non-null on the user's profile row. */
  completionProfileField?: string;
}

export const ONBOARDING_SECTIONS = [
  { id: 'getting_started', label: 'Getting Started', order: 0 },
  { id: 'team_vendors', label: 'Team & Vendors', order: 1 },
  { id: 'safety_setup', label: 'Safety & Compliance', order: 2 },
  { id: 'platform_tour', label: 'Platform Tour', order: 3 },
  { id: 'growth', label: 'Grow & Connect', order: 4 },
] as const;

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  // ── Getting Started ───────────────────────────────────────
  {
    id: 'profile',
    label: 'Complete Your Profile',
    description: 'Add your name, title, and contact info so your team knows who you are.',
    hint: 'Takes about 2 minutes',
    route: '/settings',
    actionLabel: 'Set Up Profile',
    section: 'getting_started',
    order: 1,
    completionProfileField: 'full_name',
    // roles: omitted = ALL roles
  },
  {
    id: 'setup_locations',
    label: 'Set Up Locations',
    description: 'Configure your locations — addresses, operating hours, and jurisdiction info.',
    hint: 'Multi-location orgs can add all sites here',
    route: '/settings',
    actionLabel: 'Set Up Locations',
    section: 'getting_started',
    order: 2,
    roles: ['owner_operator', 'executive', 'platform_admin'],
  },

  // ── Team & Vendors ────────────────────────────────────────
  {
    id: 'add_team',
    label: 'Add Team Members',
    description: 'Create profiles for your staff — managers, chefs, kitchen staff — so they can be assigned roles.',
    hint: 'You can add as many team members as needed',
    route: '/team',
    actionLabel: 'Add Team',
    section: 'team_vendors',
    order: 1,
    roles: ['owner_operator', 'executive', 'kitchen_manager', 'platform_admin'],
    completionTable: 'profiles',
    completionMinCount: 2,
  },
  {
    id: 'invite_team',
    label: 'Invite Your Team',
    description: 'Send email invitations so team members can log in, complete checklists, and log temps.',
    hint: 'They\'ll get an email with a secure login link',
    route: '/team',
    actionLabel: 'Send Invites',
    section: 'team_vendors',
    order: 2,
    dependsOn: ['add_team'],
    roles: ['owner_operator', 'executive', 'platform_admin'],
  },
  {
    id: 'add_vendors',
    label: 'Add Your Vendors',
    description: 'Register hood cleaning, fire suppression, pest control, and other service vendors.',
    hint: 'Track certifications, insurance, and service schedules',
    route: '/vendors',
    actionLabel: 'Add Vendors',
    section: 'team_vendors',
    order: 3,
    roles: ['owner_operator', 'executive', 'compliance_manager', 'facilities_manager', 'platform_admin'],
    completionTable: 'vendors',
    completionMinCount: 1,
  },
  {
    id: 'invite_vendors',
    label: 'Invite Vendors to Portal',
    description: 'Send vendor portal invitations so vendors can upload certificates and service records directly.',
    hint: 'Vendors self-serve their own compliance documents',
    route: '/vendors',
    actionLabel: 'Invite Vendors',
    section: 'team_vendors',
    order: 4,
    dependsOn: ['add_vendors'],
    roles: ['owner_operator', 'executive', 'platform_admin'],
  },
  {
    id: 'add_vendor_services',
    label: 'Add Vendor Services',
    description: 'Link each vendor to the services they provide — hood cleaning, fire suppression, pest control, etc.',
    hint: 'Enables automated compliance tracking per service',
    route: '/vendors',
    actionLabel: 'Add Services',
    section: 'team_vendors',
    order: 5,
    dependsOn: ['add_vendors'],
    roles: ['owner_operator', 'executive', 'compliance_manager', 'facilities_manager', 'platform_admin'],
  },

  // ── Safety & Compliance ───────────────────────────────────
  {
    id: 'register_equipment',
    label: 'Register Equipment',
    description: 'Add refrigerators, freezers, ovens, and hood systems for monitoring and maintenance tracking.',
    hint: 'Enables automated temp logging and service alerts',
    route: '/equipment',
    actionLabel: 'Add Equipment',
    section: 'safety_setup',
    order: 1,
    roles: ['owner_operator', 'executive', 'facilities_manager', 'kitchen_manager', 'platform_admin'],
    completionTable: 'equipment',
    completionMinCount: 1,
  },
  {
    id: 'upload_documents',
    label: 'Upload Key Documents',
    description: 'Add health permits, facility safety certificates, insurance docs, and vendor contracts.',
    hint: 'Keeps everything in one place for inspections',
    route: '/documents',
    actionLabel: 'Upload Documents',
    section: 'safety_setup',
    order: 2,
    completionTable: 'documents',
    completionMinCount: 1,
    // roles: omitted = ALL roles
  },
  {
    id: 'ai_document_routing',
    label: 'AI Document Routing',
    description: 'Try EvidLY\'s AI-powered document router — upload any document and it\'ll be auto-classified and filed.',
    hint: 'Works with permits, certificates, insurance docs, and more',
    route: '/documents',
    actionLabel: 'Try AI Routing',
    section: 'safety_setup',
    order: 3,
    roles: ['owner_operator', 'executive', 'compliance_manager', 'platform_admin'],
  },
  {
    id: 'request_documents',
    label: 'Request Missing Documents',
    description: 'Send automated requests to vendors for certificates, insurance, or compliance documents you\'re still missing.',
    hint: 'Vendors receive a secure link to upload directly',
    route: '/documents',
    actionLabel: 'Request Documents',
    section: 'safety_setup',
    order: 4,
    dependsOn: ['add_vendors', 'upload_documents'],
    roles: ['owner_operator', 'executive', 'compliance_manager', 'platform_admin'],
  },

  // ── Platform Tour ─────────────────────────────────────────
  {
    id: 'take_tour',
    label: 'Take a Platform Tour',
    description: 'Take a guided walkthrough of EvidLY\'s key features — sidebar navigation, dashboards, and tools.',
    hint: 'Takes about 2 minutes',
    route: '/dashboard',
    actionLabel: 'Start Tour',
    section: 'platform_tour',
    order: 1,
    stepType: 'tour',
    // roles: omitted = ALL roles
  },

  // ── Grow & Connect ────────────────────────────────────────
  {
    id: 'k2c_referral',
    label: 'Share Kitchen to Community',
    description: 'Refer a fellow restaurant operator to EvidLY and earn rewards through our Kitchen to Community program.',
    hint: 'Both you and your referral get a free month',
    route: '',
    actionLabel: 'Share & Earn',
    section: 'growth',
    order: 1,
    stepType: 'modal',
    roles: ['owner_operator', 'executive', 'platform_admin'],
  },
  {
    id: 'schedule_consultation',
    label: 'Schedule Your Consultation',
    description: 'Book a free 15-minute onboarding call with our compliance team to review your setup.',
    hint: 'Get personalized guidance for your locations',
    route: '',
    actionLabel: 'Schedule Now',
    section: 'growth',
    order: 2,
    stepType: 'external',
    externalUrl: 'https://calendly.com/evidly/onboarding',
    roles: ['owner_operator', 'executive', 'platform_admin'],
  },
  {
    id: 'setup_complete',
    label: 'Setup Complete!',
    description: 'You\'ve finished setting up EvidLY. Your compliance dashboard is ready to use.',
    hint: 'Welcome to streamlined compliance management',
    route: '/dashboard',
    actionLabel: 'Go to Dashboard',
    section: 'growth',
    order: 3,
    stepType: 'celebration',
    // roles: omitted = ALL roles
  },
];

// ── Tier ranking for comparisons ────────────────────────
const TIER_RANK: Record<LocationTier, number> = { single: 0, multi: 1, enterprise: 2 };

const SECTION_ORDER = ONBOARDING_SECTIONS.reduce(
  (map, s) => { map[s.id] = s.order; return map; },
  {} as Record<string, number>,
);

/**
 * Pure function: resolve which steps are visible for a given org profile + role.
 * No side effects, no Supabase calls — just filtering + sorting.
 */
export function resolveVisibleSteps(
  industryType: string | null,
  plannedLocationCount: number,
  userRole?: UserRole,
): OnboardingStepDef[] {
  const tier: LocationTier =
    plannedLocationCount >= 11 ? 'enterprise' :
    plannedLocationCount >= 2 ? 'multi' : 'single';

  return ONBOARDING_STEPS.filter(step => {
    // Role filter
    if (step.roles && step.roles.length > 0 && userRole) {
      if (!step.roles.includes(userRole)) return false;
    }
    // Industry filter
    if (step.industries && step.industries.length > 0) {
      if (!industryType || !step.industries.includes(industryType as IndustryCode)) {
        return false;
      }
    }
    // Tier filter
    if (step.minTier && TIER_RANK[tier] < TIER_RANK[step.minTier]) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    const sd = (SECTION_ORDER[a.section] ?? 99) - (SECTION_ORDER[b.section] ?? 99);
    return sd !== 0 ? sd : a.order - b.order;
  });
}
