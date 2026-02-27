import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useRole } from '../contexts/RoleContext';
import { supabase } from '../lib/supabase';
import {
  resolveVisibleSteps,
  ONBOARDING_SECTIONS,
  type OnboardingStepDef,
} from '../config/onboardingChecklistConfig';

// ── Storage keys ────────────────────────────────────────
const DEMO_STORAGE_KEY = 'evidly_onboarding_checklist';
const DEMO_DISMISSED_KEY = 'evidly_onboarding_dismissed';
const DEMO_LEAD_KEY = 'evidly_demo_lead';

function authStorageKey(orgId: string) {
  return `evidly_onboarding_checklist_${orgId}`;
}
function authDismissedKey(orgId: string) {
  return `evidly_onboarding_dismissed_${orgId}`;
}

// ── Roles allowed to see the checklist ──────────────────
const ALLOWED_ROLES = new Set(['owner_operator', 'executive']);

// ── Demo defaults (Pacific Coast Dining = RESTAURANT, 3 locations) ──
const DEMO_DEFAULTS = {
  industry_type: 'RESTAURANT' as string | null,
  planned_location_count: 3,
};

// ── Pre-seed step IDs for demo mode ─────────────────────
const DEMO_PRESEED = ['profile', 'first_location'];

// ── Read demo lead from sessionStorage ──────────────────
function getDemoOrgInfo(): { industry: string | null; locationCount: number } {
  try {
    const raw = sessionStorage.getItem(DEMO_LEAD_KEY);
    if (raw) {
      const lead = JSON.parse(raw);
      if (lead.industry) {
        return {
          industry: lead.industry,
          locationCount: lead.locationCount || DEMO_DEFAULTS.planned_location_count,
        };
      }
      if (lead.businessType) {
        return {
          industry: lead.businessType,
          locationCount: DEMO_DEFAULTS.planned_location_count,
        };
      }
    }
  } catch { /* ignore */ }
  return { industry: DEMO_DEFAULTS.industry_type, locationCount: DEMO_DEFAULTS.planned_location_count };
}

// ── Public types ────────────────────────────────────────

export interface OnboardingChecklistSection {
  id: string;
  label: string;
  steps: Array<OnboardingStepDef & { completed: boolean }>;
}

export interface UseOnboardingChecklistReturn {
  /** Flat ordered list of visible steps with completion status */
  steps: Array<OnboardingStepDef & { completed: boolean }>;
  /** Grouped by section (legacy compat) */
  sections: OnboardingChecklistSection[];
  completedCount: number;
  totalCount: number;
  isAllComplete: boolean;
  isDismissed: boolean;
  shouldShow: boolean;
  loading: boolean;
  /** Index of the current active wizard step */
  currentStepIndex: number;
  /** Mark current step complete and advance to next */
  completeStep: (stepId: string) => void;
  /** Skip current step without completing — advance to next */
  skipStep: () => void;
  /** Jump to a specific step index */
  goToStep: (index: number) => void;
  /** Legacy toggle (still used by checklist mode) */
  toggleStep: (stepId: string) => void;
  dismiss: () => void;
}

// ── Hook ────────────────────────────────────────────────

export function useOnboardingChecklist(): UseOnboardingChecklistReturn {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();
  const isDemo = isDemoMode || !profile?.organization_id;
  const orgId = profile?.organization_id || '';

  const [orgIndustry, setOrgIndustry] = useState<string | null>(null);
  const [orgLocationCount, setOrgLocationCount] = useState(1);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [manualStepIndex, setManualStepIndex] = useState<number | null>(null);

  // ── Load org profile + persisted state ────────────────
  useEffect(() => {
    if (isDemo) {
      const demoOrg = getDemoOrgInfo();
      setOrgIndustry(demoOrg.industry);
      setOrgLocationCount(demoOrg.locationCount);
      try {
        const stored = localStorage.getItem(DEMO_STORAGE_KEY);
        if (stored) setCompletedIds(new Set(JSON.parse(stored)));
        if (localStorage.getItem(DEMO_DISMISSED_KEY) === 'true') setIsDismissed(true);
      } catch { /* ignore */ }
      setLoading(false);
      return;
    }

    // Auth mode: fetch from Supabase
    (async () => {
      try {
        const { data } = await supabase
          .from('organizations')
          .select('industry_type, planned_location_count, onboarding_completed')
          .eq('id', orgId)
          .maybeSingle();

        if (data) {
          setOrgIndustry(data.industry_type || null);
          setOrgLocationCount(data.planned_location_count || 1);
          if (data.onboarding_completed) setIsDismissed(true);
        }
      } catch { /* ignore */ }

      // Load completion from localStorage (keyed per org)
      try {
        const stored = localStorage.getItem(authStorageKey(orgId));
        if (stored) setCompletedIds(new Set(JSON.parse(stored)));
        if (localStorage.getItem(authDismissedKey(orgId)) === 'true') setIsDismissed(true);
      } catch { /* ignore */ }

      setLoading(false);
    })();
  }, [isDemo, orgId]);

  // ── Compute visible steps ─────────────────────────────
  const visibleSteps = useMemo(
    () => resolveVisibleSteps(orgIndustry, orgLocationCount),
    [orgIndustry, orgLocationCount],
  );

  // ── Flat step list with completion ────────────────────
  const steps = useMemo(
    () => visibleSteps.map(s => ({ ...s, completed: completedIds.has(s.id) })),
    [visibleSteps, completedIds],
  );

  // ── Group into sections ───────────────────────────────
  const sections = useMemo(() => {
    const sectionMap = new Map<string, Array<OnboardingStepDef & { completed: boolean }>>();
    for (const step of steps) {
      if (!sectionMap.has(step.section)) sectionMap.set(step.section, []);
      sectionMap.get(step.section)!.push(step);
    }
    return ONBOARDING_SECTIONS
      .filter(s => sectionMap.has(s.id))
      .map(s => ({ id: s.id, label: s.label, steps: sectionMap.get(s.id)! }));
  }, [steps]);

  const totalCount = visibleSteps.length;
  const completedCount = visibleSteps.filter(s => completedIds.has(s.id)).length;
  const isAllComplete = totalCount > 0 && completedCount === totalCount;
  const shouldShow = !isDismissed && !isAllComplete && !loading && ALLOWED_ROLES.has(userRole);

  // ── Auto-detect current step: first incomplete step ───
  const autoStepIndex = useMemo(() => {
    const idx = steps.findIndex(s => !s.completed);
    return idx === -1 ? steps.length - 1 : idx;
  }, [steps]);

  const currentStepIndex = manualStepIndex !== null && manualStepIndex < steps.length
    ? manualStepIndex
    : autoStepIndex;

  // ── Persist completion ────────────────────────────────
  const persistCompletion = useCallback((ids: Set<string>) => {
    const key = isDemo ? DEMO_STORAGE_KEY : authStorageKey(orgId);
    try { localStorage.setItem(key, JSON.stringify([...ids])); } catch { /* ignore */ }
  }, [isDemo, orgId]);

  const toggleStep = useCallback((stepId: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId); else next.add(stepId);
      persistCompletion(next);
      return next;
    });
  }, [persistCompletion]);

  const completeStep = useCallback((stepId: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      next.add(stepId);
      persistCompletion(next);
      return next;
    });
    // Auto-advance: clear manual override so autoStepIndex picks up next incomplete
    setManualStepIndex(null);
  }, [persistCompletion]);

  const skipStep = useCallback(() => {
    // Move to next step without marking complete
    setManualStepIndex(prev => {
      const current = prev !== null ? prev : autoStepIndex;
      const next = current + 1;
      return next < steps.length ? next : current;
    });
  }, [autoStepIndex, steps.length]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setManualStepIndex(index);
    }
  }, [steps.length]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    const key = isDemo ? DEMO_DISMISSED_KEY : authDismissedKey(orgId);
    try { localStorage.setItem(key, 'true'); } catch { /* ignore */ }
  }, [isDemo, orgId]);

  return {
    steps, sections, completedCount, totalCount, isAllComplete,
    isDismissed, shouldShow, loading,
    currentStepIndex, completeStep, skipStep, goToStep,
    toggleStep, dismiss,
  };
}
