// ── Adaptive Onboarding Wizard Config ──────────────────────────
// 12-step guided wizard with dependency-based unlocking.
// Each step declares its own industry/tier requirements + dependencies.
// resolveVisibleSteps() is a pure function — no side effects.

// Industry codes match Signup.tsx INDUSTRY_TYPES keys
export type IndustryCode =
  | 'RESTAURANT'
  | 'HEALTHCARE'
  | 'SENIOR_LIVING'
  | 'K12_EDUCATION'
  | 'HIGHER_EDUCATION';

export type LocationTier = 'single' | 'multi' | 'enterprise';

/** How the step is activated when clicking its action button */
export type StepType = 'navigate' | 'modal' | 'external' | 'celebration';

export interface OnboardingStepDef {
  id: string;
  label: string;
  description: string;
  hint: string;
  route: string;
  /** Contextual label for the action button */
  actionLabel: string;
  section: 'getting_started' | 'safety_setup' | 'team_locations' | 'growth';
  order: number;
  /** Step activation type (default: 'navigate') */
  stepType?: StepType;
  /** Step IDs that must be COMPLETED (not skipped) before this step unlocks */
  dependsOn?: string[];
  /** External URL for 'external' step type */
  externalUrl?: string;
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
  { id: 'team_locations', label: 'Team & Vendors', order: 1 },
  { id: 'safety_setup', label: 'Safety & Compliance', order: 2 },
  { id: 'growth', label: 'Grow & Connect', order: 3 },
] as const;

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  // ── Step 1: Profile ─────────────────────────────────────
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
  },
  // ── Step 2: Add Team Members ──────────────────────────────
  {
    id: 'add_team',
    label: 'Add Team Members',
    description: 'Create profiles for your staff — managers, chefs, kitchen staff — so they can be assigned roles.',
    hint: 'You can add as many team members as needed',
    route: '/team',
    actionLabel: 'Add Team',
    section: 'team_locations',
    order: 1,
    completionTable: 'profiles',
    completionMinCount: 2,
  },
  // ── Step 3: Invite Team ─────────────────────────────────
  {
    id: 'invite_team',
    label: 'Invite Your Team',
    description: 'Send email invitations so team members can log in, complete checklists, and log temps.',
    hint: 'They\'ll get an email with a secure login link',
    route: '/team',
    actionLabel: 'Send Invites',
    section: 'team_locations',
    order: 2,
    dependsOn: ['add_team'],
  },
  // ── Step 4: Add Vendors ─────────────────────────────────
  {
    id: 'add_vendors',
    label: 'Add Your Vendors',
    description: 'Register hood cleaning, fire suppression, pest control, and other service vendors.',
    hint: 'Track certifications, insurance, and service schedules',
    route: '/vendors',
    actionLabel: 'Add Vendors',
    section: 'team_locations',
    order: 3,
    completionTable: 'vendors',
    completionMinCount: 1,
  },
  // ── Step 5: Invite Vendors ──────────────────────────────
  {
    id: 'invite_vendors',
    label: 'Invite Vendors to Portal',
    description: 'Send vendor portal invitations so vendors can upload certificates and service records directly.',
    hint: 'Vendors self-serve their own compliance documents',
    route: '/vendors',
    actionLabel: 'Invite Vendors',
    section: 'team_locations',
    order: 4,
    dependsOn: ['add_vendors'],
  },
  // ── Step 6: Add Vendor Services ─────────────────────────
  {
    id: 'add_vendor_services',
    label: 'Add Vendor Services',
    description: 'Link each vendor to the services they provide — hood cleaning, fire suppression, pest control, etc.',
    hint: 'Enables automated compliance tracking per service',
    route: '/vendors',
    actionLabel: 'Add Services',
    section: 'team_locations',
    order: 5,
    dependsOn: ['add_vendors'],
  },
  // ── Step 7: Add Equipment ───────────────────────────────
  {
    id: 'register_equipment',
    label: 'Register Equipment',
    description: 'Add refrigerators, freezers, ovens, and hood systems for monitoring and maintenance tracking.',
    hint: 'Enables automated temp logging and service alerts',
    route: '/equipment',
    actionLabel: 'Add Equipment',
    section: 'safety_setup',
    order: 1,
    completionTable: 'equipment',
    completionMinCount: 1,
  },
  // ── Step 8: Upload Documents ────────────────────────────
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
  },
  // ── Step 9: Request Missing Documents ───────────────────
  {
    id: 'request_documents',
    label: 'Request Missing Documents',
    description: 'Send automated requests to vendors for certificates, insurance, or compliance documents you\'re still missing.',
    hint: 'Vendors receive a secure link to upload directly',
    route: '/documents',
    actionLabel: 'Request Documents',
    section: 'safety_setup',
    order: 3,
    dependsOn: ['add_vendors', 'upload_documents'],
  },
  // ── Step 10: Kitchen to Community Referral ──────────────
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
  },
  // ── Step 11: Schedule Consultation ──────────────────────
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
  },
  // ── Step 12: Setup Complete ─────────────────────────────
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
  },
];

// ── Tier ranking for comparisons ────────────────────────
const TIER_RANK: Record<LocationTier, number> = { single: 0, multi: 1, enterprise: 2 };

const SECTION_ORDER = ONBOARDING_SECTIONS.reduce(
  (map, s) => { map[s.id] = s.order; return map; },
  {} as Record<string, number>,
);

/**
 * Pure function: resolve which steps are visible for a given org profile.
 * No side effects, no Supabase calls — just filtering + sorting.
 */
export function resolveVisibleSteps(
  industryType: string | null,
  plannedLocationCount: number,
): OnboardingStepDef[] {
  const tier: LocationTier =
    plannedLocationCount >= 11 ? 'enterprise' :
    plannedLocationCount >= 2 ? 'multi' : 'single';

  return ONBOARDING_STEPS.filter(step => {
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
