import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
const DEMO_SKIPPED_KEY = 'evidly_onboarding_skipped';
const DEMO_DISMISSED_KEY = 'evidly_onboarding_dismissed';
const DEMO_LEAD_KEY = 'evidly_demo_lead';

function authStorageKey(orgId: string) {
  return `evidly_onboarding_checklist_${orgId}`;
}
function authSkippedKey(orgId: string) {
  return `evidly_onboarding_skipped_${orgId}`;
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

// ── Helpers for localStorage sets ───────────────────────
function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveSet(key: string, set: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch { /* ignore */ }
}

// ── Public types ────────────────────────────────────────

export interface OnboardingChecklistSection {
  id: string;
  label: string;
  steps: Array<OnboardingStepDef & { completed: boolean; skipped: boolean }>;
}

export interface UseOnboardingChecklistReturn {
  /** Flat ordered list of visible steps with completion status */
  steps: Array<OnboardingStepDef & { completed: boolean; skipped: boolean }>;
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
  /** Whether a step at given index is unlocked */
  isStepUnlocked: (index: number) => boolean;
  /** Mark a step complete and advance to next */
  completeStep: (stepId: string) => void;
  /** Skip current step without completing — advance to next */
  skipStep: (stepId: string) => void;
  /** Jump to a specific step index (only if unlocked) */
  goToStep: (index: number) => void;
  /** Legacy toggle (still used by checklist mode) */
  toggleStep: (stepId: string) => void;
  dismiss: () => void;
}

// ── Hook ────────────────────────────────────────────────

export function useOnboardingChecklist(): UseOnboardingChecklistReturn {
  const { profile, user } = useAuth();
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();
  const isDemo = isDemoMode || !profile?.organization_id;
  const orgId = profile?.organization_id || '';
  const userId = user?.id || '';

  const [orgIndustry, setOrgIndustry] = useState<string | null>(null);
  const [orgLocationCount, setOrgLocationCount] = useState(1);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [manualStepIndex, setManualStepIndex] = useState<number | null>(null);

  // Track whether auto-detection has run at least once
  const autoDetectRanRef = useRef(false);

  // ── Load org profile + persisted state ────────────────
  useEffect(() => {
    if (isDemo) {
      const demoOrg = getDemoOrgInfo();
      setOrgIndustry(demoOrg.industry);
      setOrgLocationCount(demoOrg.locationCount);
      const stored = loadSet(DEMO_STORAGE_KEY);
      // Pre-seed demo completions
      const merged = new Set([...DEMO_PRESEED, ...stored]);
      setCompletedIds(merged);
      setSkippedIds(loadSet(DEMO_SKIPPED_KEY));
      if (localStorage.getItem(DEMO_DISMISSED_KEY) === 'true') setIsDismissed(true);
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

      // Load completion + skipped from localStorage (keyed per org)
      setCompletedIds(loadSet(authStorageKey(orgId)));
      setSkippedIds(loadSet(authSkippedKey(orgId)));
      if (localStorage.getItem(authDismissedKey(orgId)) === 'true') setIsDismissed(true);

      setLoading(false);
    })();
  }, [isDemo, orgId]);

  // ── Compute visible steps ─────────────────────────────
  const visibleSteps = useMemo(
    () => resolveVisibleSteps(orgIndustry, orgLocationCount),
    [orgIndustry, orgLocationCount],
  );

  // ── Auto-detection: query Supabase tables (auth mode only) ──
  const runCompletionChecks = useCallback(async () => {
    if (isDemo || !orgId || !userId) return;

    const detected = new Set<string>();

    try {
      // Batch all checks in parallel
      const checks = visibleSteps.map(async (step) => {
        // Profile check: verify field is non-null
        if (step.completionProfileField) {
          const { data } = await supabase
            .from('profiles')
            .select(step.completionProfileField)
            .eq('id', userId)
            .maybeSingle();

          if (data && data[step.completionProfileField]) {
            detected.add(step.id);
          }
          return;
        }

        // Table count check
        if (step.completionTable) {
          const col = step.completionOrgColumn || 'organization_id';
          const minCount = step.completionMinCount || 1;

          const { count } = await supabase
            .from(step.completionTable)
            .select('id', { count: 'exact', head: true })
            .eq(col, orgId);

          if ((count || 0) >= minCount) {
            detected.add(step.id);
          }
        }
      });

      await Promise.all(checks);
    } catch {
      // Silently fail — don't block the wizard
    }

    if (detected.size > 0) {
      setCompletedIds(prev => {
        const merged = new Set([...prev, ...detected]);
        if (merged.size === prev.size) return prev; // no change
        const key = authStorageKey(orgId);
        saveSet(key, merged);
        return merged;
      });
    }
  }, [isDemo, orgId, userId, visibleSteps]);

  // Run auto-detection on mount (after loading finishes)
  useEffect(() => {
    if (loading || isDemo || autoDetectRanRef.current) return;
    autoDetectRanRef.current = true;
    runCompletionChecks();
  }, [loading, isDemo, runCompletionChecks]);

  // Run auto-detection when page regains visibility (user returns from another page)
  useEffect(() => {
    if (isDemo) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        runCompletionChecks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isDemo, runCompletionChecks]);

  // ── Flat step list with completion + skipped status ────
  const steps = useMemo(
    () => visibleSteps.map(s => ({
      ...s,
      completed: completedIds.has(s.id),
      skipped: skippedIds.has(s.id),
    })),
    [visibleSteps, completedIds, skippedIds],
  );

  // ── Group into sections ───────────────────────────────
  const sections = useMemo(() => {
    const sectionMap = new Map<string, Array<OnboardingStepDef & { completed: boolean; skipped: boolean }>>();
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

  // ── Sequential locking ────────────────────────────────
  const isStepUnlocked = useCallback((index: number): boolean => {
    if (index === 0) return true;
    // All prior steps must be completed or skipped
    return steps.slice(0, index).every(s => s.completed || s.skipped);
  }, [steps]);

  // ── Auto-detect current step: first unlocked incomplete step ──
  const autoStepIndex = useMemo(() => {
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].completed && isStepUnlocked(i)) return i;
    }
    // All complete or all locked — show last step
    return steps.length - 1;
  }, [steps, isStepUnlocked]);

  const currentStepIndex = manualStepIndex !== null
    && manualStepIndex < steps.length
    && isStepUnlocked(manualStepIndex)
    ? manualStepIndex
    : autoStepIndex;

  // ── Persist helpers ────────────────────────────────────
  const completedKey = isDemo ? DEMO_STORAGE_KEY : authStorageKey(orgId);
  const skippedKey = isDemo ? DEMO_SKIPPED_KEY : authSkippedKey(orgId);

  const toggleStep = useCallback((stepId: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId); else next.add(stepId);
      saveSet(completedKey, next);
      return next;
    });
  }, [completedKey]);

  const completeStep = useCallback((stepId: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      next.add(stepId);
      saveSet(completedKey, next);
      return next;
    });
    // Auto-advance: clear manual override so autoStepIndex picks up next incomplete
    setManualStepIndex(null);
  }, [completedKey]);

  const skipStep = useCallback((stepId: string) => {
    setSkippedIds(prev => {
      const next = new Set(prev);
      next.add(stepId);
      saveSet(skippedKey, next);
      return next;
    });
    // Auto-advance
    setManualStepIndex(null);
  }, [skippedKey]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length && isStepUnlocked(index)) {
      setManualStepIndex(index);
    }
  }, [steps.length, isStepUnlocked]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    const key = isDemo ? DEMO_DISMISSED_KEY : authDismissedKey(orgId);
    try { localStorage.setItem(key, 'true'); } catch { /* ignore */ }
  }, [isDemo, orgId]);

  return {
    steps, sections, completedCount, totalCount, isAllComplete,
    isDismissed, shouldShow, loading,
    currentStepIndex, isStepUnlocked,
    completeStep, skipStep, goToStep,
    toggleStep, dismiss,
  };
}
