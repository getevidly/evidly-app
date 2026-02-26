// ── Adaptive Onboarding Checklist Config ──────────────────────────
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
  route: string;
  section: 'getting_started' | 'safety_setup' | 'team_locations' | 'industry_specific';
  order: number;
  /** If set, step only shows for these industries. Omit = universal. */
  industries?: IndustryCode[];
  /** Minimum location tier required. Omit = all tiers. */
  minTier?: LocationTier;
  /** Future paywall gating flag (not enforced yet). */
  featureGate?: string;
}

export const ONBOARDING_SECTIONS = [
  { id: 'getting_started', label: 'Getting Started', order: 0 },
  { id: 'safety_setup', label: 'Safety Setup', order: 1 },
  { id: 'industry_specific', label: 'Industry Setup', order: 2 },
  { id: 'team_locations', label: 'Team & Locations', order: 3 },
] as const;

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  // ── GETTING STARTED (universal) ───────────────────────
  {
    id: 'profile',
    label: 'Complete your profile',
    description: 'Add your name, title, and contact info.',
    route: '/settings',
    section: 'getting_started',
    order: 1,
  },
  {
    id: 'first_location',
    label: 'Add your first location',
    description: 'Set up your kitchen with address and jurisdiction auto-detection.',
    route: '/org-hierarchy',
    section: 'getting_started',
    order: 2,
  },

  // ── SAFETY SETUP (universal) ──────────────────────────
  {
    id: 'fire_safety_doc',
    label: 'Upload a fire safety document',
    description: 'Hood cleaning certificate, suppression inspection, or similar.',
    route: '/fire-safety',
    section: 'safety_setup',
    order: 1,
  },
  {
    id: 'first_checklist',
    label: 'Set up your first daily checklist',
    description: 'Create an Opening or Closing checklist for daily compliance.',
    route: '/checklists',
    section: 'safety_setup',
    order: 2,
  },
  {
    id: 'first_temp',
    label: 'Log your first temperature reading',
    description: 'Walk to your cooler, check the thermometer, log it.',
    route: '/temp-logs',
    section: 'safety_setup',
    order: 3,
  },

  // ── INDUSTRY-SPECIFIC ─────────────────────────────────
  {
    id: 'configure_haccp',
    label: 'Configure your HACCP plan',
    description: 'Set up hazard analysis and critical control points.',
    route: '/documents',
    section: 'industry_specific',
    order: 1,
    industries: ['RESTAURANT'],
  },
  {
    id: 'upload_dietary_docs',
    label: 'Upload dietary service documentation',
    description: 'Add therapeutic diet and nutrition care documents for CMS compliance.',
    route: '/documents',
    section: 'industry_specific',
    order: 1,
    industries: ['HEALTHCARE', 'SENIOR_LIVING'],
  },
  {
    id: 'setup_usda_tracking',
    label: 'Configure USDA meal program requirements',
    description: 'Set up National School Lunch Program tracking and documentation.',
    route: '/documents',
    section: 'industry_specific',
    order: 1,
    industries: ['K12_EDUCATION'],
  },
  {
    id: 'setup_multi_outlet',
    label: 'Set up multi-outlet management',
    description: 'Configure your campus dining outlets and workflows.',
    route: '/org-hierarchy',
    section: 'industry_specific',
    order: 1,
    industries: ['HIGHER_EDUCATION'],
  },

  // ── TEAM & LOCATIONS (universal base) ─────────────────
  {
    id: 'invite_team',
    label: 'Invite a team member',
    description: 'Add staff so they can log temps and complete checklists.',
    route: '/team',
    section: 'team_locations',
    order: 1,
  },

  // ── TEAM & LOCATIONS (multi: 2+ locations) ────────────
  {
    id: 'add_locations',
    label: 'Add your additional locations',
    description: 'Register all your sites for unified compliance tracking.',
    route: '/org-hierarchy',
    section: 'team_locations',
    order: 2,
    minTier: 'multi',
  },
  {
    id: 'review_multi_dashboard',
    label: 'Review multi-location dashboard',
    description: 'See all locations at a glance from the overview.',
    route: '/dashboard',
    section: 'team_locations',
    order: 3,
    minTier: 'multi',
  },
  {
    id: 'explore_leaderboard',
    label: 'Explore location leaderboard',
    description: 'Compare compliance performance across your sites.',
    route: '/dashboard',
    section: 'team_locations',
    order: 4,
    minTier: 'multi',
    featureGate: 'leaderboard_access',
  },

  // ── TEAM & LOCATIONS (enterprise: 11+ locations) ──────
  {
    id: 'enterprise_onboarding_call',
    label: 'Schedule enterprise onboarding call',
    description: 'Book a guided setup session with our enterprise team.',
    route: '/settings',
    section: 'team_locations',
    order: 5,
    minTier: 'enterprise',
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
