// ── Adaptive Onboarding Wizard Config ──────────────────────────
// Declarative step definitions with visibility conditions.
// Each step declares its own industry/tier requirements.
// resolveVisibleSteps() is a pure function — no side effects.

// Industry codes match Signup.tsx INDUSTRY_TYPES keys
export type IndustryCode =
  | 'RESTAURANT'
  | 'HEALTHCARE'
  | 'SENIOR_LIVING'
  | 'K12_EDUCATION'
  | 'HIGHER_EDUCATION';

export type LocationTier = 'single' | 'multi' | 'enterprise';

export interface OnboardingStepDef {
  id: string;
  label: string;
  description: string;
  hint: string;
  route: string;
  /** Contextual label for the action button */
  actionLabel: string;
  section: 'getting_started' | 'safety_setup' | 'team_locations' | 'industry_specific';
  order: number;
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
  { id: 'safety_setup', label: 'Safety & Compliance', order: 1 },
  { id: 'team_locations', label: 'Team & Operations', order: 2 },
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
  // ── Step 2: First Location ──────────────────────────────
  {
    id: 'first_location',
    label: 'Add Your First Location',
    description: 'Set up your first kitchen with address and jurisdiction auto-detection.',
    hint: 'We\'ll auto-detect your local health department requirements',
    route: '/org-hierarchy',
    actionLabel: 'Add Location',
    section: 'getting_started',
    order: 2,
    completionTable: 'locations',
    completionMinCount: 1,
  },
  // ── Step 3: Additional Locations (multi/enterprise only) ─
  {
    id: 'add_locations',
    label: 'Add Additional Locations',
    description: 'Register all your sites for unified compliance tracking across locations.',
    hint: 'You can always add more locations later',
    route: '/org-hierarchy',
    actionLabel: 'Add More Locations',
    section: 'getting_started',
    order: 3,
    minTier: 'multi',
    completionTable: 'locations',
    completionMinCount: 2,
  },
  // ── Step 4: Invite Team ─────────────────────────────────
  {
    id: 'invite_team',
    label: 'Invite Your Team',
    description: 'Add staff members so they can log temps, complete checklists, and stay compliant.',
    hint: 'They\'ll get an email invitation to join',
    route: '/team',
    actionLabel: 'Invite Team',
    section: 'team_locations',
    order: 1,
    completionTable: 'profiles',
    completionMinCount: 2,
  },
  // ── Step 5: Upload Documents ────────────────────────────
  {
    id: 'upload_documents',
    label: 'Upload Key Documents',
    description: 'Add your health permits, facility safety certificates, and insurance documents.',
    hint: 'Keeps everything in one place for inspections',
    route: '/documents',
    actionLabel: 'Upload Documents',
    section: 'safety_setup',
    order: 1,
    completionTable: 'documents',
    completionMinCount: 1,
  },
  // ── Step 6: Add Vendors ─────────────────────────────────
  {
    id: 'add_vendors',
    label: 'Add Your Vendors',
    description: 'Register your food suppliers and service vendors for compliance tracking.',
    hint: 'Track certifications, insurance, and delivery records',
    route: '/vendors',
    actionLabel: 'Add Vendors',
    section: 'team_locations',
    order: 2,
    completionTable: 'vendors',
    completionMinCount: 1,
  },
  // ── Step 7: Register Equipment ──────────────────────────
  {
    id: 'register_equipment',
    label: 'Register Equipment',
    description: 'Add your refrigerators, freezers, and cooking equipment for temperature monitoring.',
    hint: 'Enables automated temp logging and alerts',
    route: '/equipment',
    actionLabel: 'Add Equipment',
    section: 'safety_setup',
    order: 2,
    completionTable: 'equipment',
    completionMinCount: 1,
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
