/**
 * EMOTIONAL-UX-01 — Role-aware emotional copy for all JTBD touchpoints.
 * AI Advisor intros, confidence banners, loading messages, onboarding.
 */

// ── AI Advisor role-aware intro headers ──────────────────────────

export const AI_ADVISOR_INTROS: Record<string, string> = {
  owner_operator: "Here's what this means for your operation:",
  executive: "Here's the leadership view:",
  compliance_manager: "Here's how to stay ahead of this:",
  facilities_manager: "Here's what your facility needs:",
  chef: "Here's what this means for your kitchen:",
  kitchen_manager: "Here's what your team should do:",
  kitchen_staff: "Here's exactly what to do:",
};

// ── Confidence Banner copy by role + status ──────────────────────

export const CONFIDENCE_BANNER_COPY: Record<string, Record<string, string>> = {
  owner_operator: {
    strong: 'Your operation is in good standing. Keep the standards high.',
    moderate: 'A few things need attention. Address them before your next inspection.',
    needs_attention: 'Action required. Your operation has gaps that need to close.',
  },
  executive: {
    strong: 'Your portfolio is performing well across all locations.',
    moderate: 'Some locations need attention. Your team has the details.',
    needs_attention: 'Leadership action needed. Multiple locations have open items.',
  },
  compliance_manager: {
    strong: "You're ahead of your inspections. That's exactly where you want to be.",
    moderate: 'A few items to close out before your next inspection window.',
    needs_attention: 'Inspection risk is elevated. Prioritize these items today.',
  },
  facilities_manager: {
    strong: 'All safeguards are current. Your building is protected.',
    moderate: 'Some safeguard records need updating.',
    needs_attention: 'Safeguard gaps identified. Address these before your next AHJ visit.',
  },
  chef: {
    strong: 'Your kitchen is running clean. Keep the records tight.',
    moderate: 'A few food safety items to close out.',
    needs_attention: 'Food safety gaps need your attention today.',
  },
  kitchen_manager: {
    strong: 'Your team is performing consistently. Great management.',
    moderate: 'A few items your team needs to complete.',
    needs_attention: 'Team compliance needs attention. Check in with your staff.',
  },
  kitchen_staff: {
    strong: "You're all caught up. Great work today.",
    moderate: "A few tasks left. You've got this.",
    needs_attention: "Some items need to be completed. Let's get it done.",
  },
};

// ── Loading state micro-copy by role ────────────────────────────

export const LOADING_MESSAGES: Record<string, string[]> = {
  owner_operator: [
    'Pulling your operation together...',
    'Checking your portfolio...',
    'Getting your dashboard ready...',
  ],
  executive: [
    'Loading your leadership view...',
    'Gathering your location data...',
    'Preparing your summary...',
  ],
  compliance_manager: [
    'Checking your jurisdiction data...',
    'Loading your inspection records...',
    'Getting your compliance picture...',
  ],
  facilities_manager: [
    'Checking your safeguards...',
    'Loading your service records...',
    'Reviewing your facility safety status...',
  ],
  chef: [
    'Getting your kitchen ready...',
    'Loading your food safety records...',
    'Checking your temperature logs...',
  ],
  kitchen_manager: [
    "Loading your team's activity...",
    'Getting your shift ready...',
    'Checking your checklists...',
  ],
  kitchen_staff: [
    'Getting your tasks ready...',
    'Loading your checklist...',
    'Almost there...',
  ],
};

// ── Onboarding WelcomeModal role-aware subtext ──────────────────

export const WELCOME_SUBTEXT: Record<string, string> = {
  owner_operator:
    'EvidLY gives you the visibility to lead your operation with confidence — before an inspector, a fire marshal, or a bad review tells you something you should have known first.',
  executive:
    "EvidLY gives your leadership team a single view of every location's compliance posture — so you lead with facts, not assumptions.",
  compliance_manager:
    "EvidLY is built for people like you — the ones who catch problems before they become violations. You'll always know before they do.",
  facilities_manager:
    "EvidLY tracks every safeguard, every service record, every inspection — so your building is always ready, on paper and in practice.",
  chef:
    'Your kitchen runs at your standard. EvidLY makes sure the records reflect that — so your craft is always protected.',
  kitchen_manager:
    "EvidLY helps you build a team that does it right when you're watching and when you're not. That's what great managers do.",
  kitchen_staff:
    'EvidLY makes sure you always know what to do, have the records to show for it, and never get caught off guard.',
};
