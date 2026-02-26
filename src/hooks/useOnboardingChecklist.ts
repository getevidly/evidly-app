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
  sections: OnboardingChecklistSection[];
  completedCount: number;
  totalCount: number;
  isAllComplete: boolean;
  isDismissed: boolean;
  shouldShow: boolean;
  loading: boolean;
  toggleStep: (stepId: string) => void;
  dismiss: () => void;
}

// ── Hook ────────────────────────────────────────────────

export function useOnboardingChecklist(): UseOnboardingChecklistReturn {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const isDemo = isDemoMode || !profile?.organization_id;
  const orgId = profile?.organization_id || '';

  const [orgIndustry, setOrgIndustry] = useState<string | null>(null);
  const [orgLocationCount, setOrgLocationCount] = useState(1);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // ── Group into sections ───────────────────────────────
  const sections = useMemo(() => {
    const sectionMap = new Map<string, Array<OnboardingStepDef & { completed: boolean }>>();
    for (const step of visibleSteps) {
      if (!sectionMap.has(step.section)) sectionMap.set(step.section, []);
      sectionMap.get(step.section)!.push({ ...step, completed: completedIds.has(step.id) });
    }
    return ONBOARDING_SECTIONS
      .filter(s => sectionMap.has(s.id))
      .map(s => ({ id: s.id, label: s.label, steps: sectionMap.get(s.id)! }));
  }, [visibleSteps, completedIds]);

  const totalCount = visibleSteps.length;
  const completedCount = visibleSteps.filter(s => completedIds.has(s.id)).length;
  const isAllComplete = totalCount > 0 && completedCount === totalCount;

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

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    const key = isDemo ? DEMO_DISMISSED_KEY : authDismissedKey(orgId);
    try { localStorage.setItem(key, 'true'); } catch { /* ignore */ }
  }, [isDemo, orgId]);

  return { sections, completedCount, totalCount, isAllComplete, isDismissed, loading, toggleStep, dismiss };
}
