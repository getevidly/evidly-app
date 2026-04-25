import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X, ChevronRight, Sparkles,
  User, Users, Truck, Thermometer, FileText, Send,
  Wrench, FileSearch, Heart, Calendar, PartyPopper,
  MapPin, Bot, Map, Leaf, GraduationCap, Wifi,
} from 'lucide-react';
import { useOnboardingChecklist } from '../../hooks/useOnboardingChecklist';

const ACCENT_GOLD = '#A08C5A';
const GREEN = '#3B6D11';
const NAVY = '#1E2D4D';

const STEP_ICONS: Record<string, typeof User> = {
  profile: User,
  setup_locations: MapPin,
  add_team: Users,
  invite_team: Send,
  add_vendors: Truck,
  invite_vendors: Send,
  add_vendor_services: Wrench,
  register_equipment: Thermometer,
  upload_documents: FileText,
  ai_document_routing: Sparkles,
  request_documents: FileSearch,
  sb1383_setup: Leaf,
  k12_setup: GraduationCap,
  iot_readiness: Wifi,
  take_tour: Map,
  k2c_referral: Heart,
  schedule_consultation: Calendar,
  setup_complete: PartyPopper,
};

// Route tokens for context matching — maps step id to route fragments
const STEP_ROUTE_TOKENS: Record<string, string[]> = {
  profile: ['/settings'],
  setup_locations: ['/settings', '/locations'],
  add_team: ['/team'],
  invite_team: ['/team'],
  add_vendors: ['/vendors'],
  invite_vendors: ['/vendors'],
  add_vendor_services: ['/vendors'],
  register_equipment: ['/equipment', '/temp-logs', '/temperatures'],
  upload_documents: ['/documents'],
  ai_document_routing: ['/documents'],
  request_documents: ['/documents'],
  sb1383_setup: ['/food-recovery', '/sb1383'],
  k12_setup: ['/usda', '/k12'],
  iot_readiness: ['/equipment'],
  take_tour: [],
  k2c_referral: ['/referrals'],
  schedule_consultation: [],
  setup_complete: [],
};

function pickStep(
  currentRoute: string,
  completedIds: Set<string>,
  visibleSteps: Array<{ id: string; completed: boolean; label: string }>,
) {
  // 1. Find first incomplete step whose route tokens match current page
  const contextual = visibleSteps.find(s => {
    if (s.completed) return false;
    const tokens = STEP_ROUTE_TOKENS[s.id] || [];
    return tokens.some(t => currentRoute.includes(t));
  });
  if (contextual) return contextual;

  // 2. Fallback: first incomplete step globally
  return visibleSteps.find(s => !s.completed) || null;
}

export function SetupBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const {
    steps,
    completedCount,
    totalCount,
    isAllComplete,
    isDismissed: checklistDismissed,
    loading,
  } = useOnboardingChecklist();

  // Don't render on /dashboard — stepper handles it there
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

  // Hide conditions
  if (isDashboard || dismissed || loading || isAllComplete || checklistDismissed || totalCount === 0) {
    return null;
  }

  const completedSet = useMemo(
    () => new Set(steps.filter(s => s.completed).map(s => s.id)),
    [steps],
  );

  const activeStep = pickStep(location.pathname, completedSet, steps);
  if (!activeStep) return null;

  const actionableTotal = steps.filter(s => s.stepType !== 'celebration').length;
  const pct = actionableTotal > 0 ? Math.round((completedCount / actionableTotal) * 100) : 0;
  const remaining = actionableTotal - completedCount;
  const nearComplete = completedCount >= 14 && actionableTotal >= 16;

  // Display number for the active step
  const stepIndex = steps.findIndex(s => s.id === activeStep.id);
  const displayNum = stepIndex + 1;

  // Is the matched step contextual (page-specific) or fallback?
  const tokens = STEP_ROUTE_TOKENS[activeStep.id] || [];
  const isContextual = tokens.some(t => location.pathname.includes(t));

  const Icon = STEP_ICONS[activeStep.id] || Sparkles;
  const accentColor = nearComplete ? GREEN : ACCENT_GOLD;

  // Route for CTA
  const stepRoute = activeStep.id === 'profile' || activeStep.id === 'setup_locations'
    ? '/settings'
    : (steps[stepIndex] as { route?: string })?.route || '/dashboard';

  // Copy
  const eyebrow = nearComplete
    ? `Almost there · Step ${displayNum} of ${totalCount}`
    : isContextual
      ? `Setup · Step ${displayNum} of ${totalCount}`
      : `Setup · ${pct}% complete · ${remaining} step${remaining !== 1 ? 's' : ''} remaining`;

  const message = isContextual
    ? activeStep.label
    : `Pick up where you left off — ${activeStep.label}`;

  const meta = isContextual
    ? (activeStep as { description?: string }).description || 'Continue setup to unlock everything.'
    : 'Continue setup to unlock everything.';

  return (
    <div
      className="mx-4 sm:mx-6 lg:mx-8 max-w-[1200px] xl:mx-auto w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)] mt-3 animate-slideDown"
      style={{
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg"
        style={{
          borderLeft: `3px solid ${accentColor}`,
          border: `0.5px solid #D1D9E6`,
          borderLeftWidth: 3,
          borderLeftColor: accentColor,
        }}
      >
        {/* Icon */}
        <div
          className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}12` }}
        >
          <Icon size={16} style={{ color: accentColor }} />
        </div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6B7F96' }}>
            {eyebrow}
          </p>
          <p className="text-sm font-medium truncate" style={{ color: NAVY }}>
            {message}
          </p>
          <p className="text-xs truncate mt-0.5" style={{ color: '#6B7F96' }}>
            {meta}
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate(stepRoute)}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          Continue
          <ChevronRight size={14} />
        </button>

        {/* Dismiss */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
          aria-label="Dismiss setup banner"
        >
          <X size={14} style={{ color: '#9CA3AF' }} />
        </button>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
