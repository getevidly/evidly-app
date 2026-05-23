import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { DeficiencyItem } from '../../data/deficienciesDemoData';

export interface ResolutionPlanStep {
  id: string;
  text: string;
  meta: string;
  action_type: 'log_result' | 'add_temp_log_task' | 'schedule_service' | 'view_packet' | 'generic';
  action_label?: string;
  completed_at: string | null;
  completed_by: string | null;
}

export interface DeficiencyResolutionPlan {
  id: string;
  deficiency_id: string;
  drafted_ca_title: string;
  drafted_ca_severity: string;
  drafted_ca_category: string;
  drafted_ca_assignee_id: string | null;
  drafted_ca_due_date: string | null;
  steps: ResolutionPlanStep[];
  ai_model: string;
  ai_prompt_version: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_corrective_action_id: string | null;
  created_at: string;
}

const PROMPT_VERSION = 'v1';

interface UseDeficiencyResolutionPlanReturn {
  plan: DeficiencyResolutionPlan | null;
  loading: boolean;
  generating: boolean;
  generatePlan: () => Promise<void>;
  acceptPlan: () => Promise<void>;
  completeStep: (stepId: string) => Promise<void>;
  regeneratePlan: () => Promise<void>;
}

/**
 * Manages the AI resolution plan for a single deficiency.
 *
 * In demo mode, calls the generate-deficiency-plan edge function.
 * Falls back gracefully when the API key is not configured.
 */
export function useDeficiencyResolutionPlan(
  deficiency: DeficiencyItem | null
): UseDeficiencyResolutionPlanReturn {
  const [plan, setPlan] = useState<DeficiencyResolutionPlan | null>(null);
  const [loading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generatePlan = useCallback(async () => {
    if (!deficiency) return;
    setGenerating(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        toast.error('Supabase not configured');
        return;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-deficiency-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deficiency_id: deficiency.id }),
      });

      if (res.status === 501 || res.status === 503) {
        // AI not configured — show graceful fallback
        toast.info('AI plan generation not yet configured. Add ANTHROPIC_API_KEY to environment.');
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(err.error || 'Failed to generate plan');
        return;
      }

      const data = await res.json();
      setPlan(data.plan);
      toast.success('Resolution plan generated');
    } catch {
      toast.error('Failed to reach AI service');
    } finally {
      setGenerating(false);
    }
  }, [deficiency]);

  const acceptPlan = useCallback(async () => {
    if (!plan) return;

    const acceptedPlan: DeficiencyResolutionPlan = {
      ...plan,
      accepted_at: new Date().toISOString(),
      accepted_by: 'current-user',
      created_corrective_action_id: `ca-from-plan-${Date.now()}`,
    };

    setPlan(acceptedPlan);
    toast.success('Plan accepted — corrective action created');
  }, [plan]);

  const completeStep = useCallback(async (stepId: string) => {
    if (!plan) return;

    setPlan({
      ...plan,
      steps: plan.steps.map((s) =>
        s.id === stepId
          ? { ...s, completed_at: new Date().toISOString(), completed_by: 'current-user' }
          : s
      ),
    });
  }, [plan]);

  const regeneratePlan = useCallback(async () => {
    setPlan(null);
    await generatePlan();
  }, [generatePlan]);

  return {
    plan,
    loading,
    generating,
    generatePlan,
    acceptPlan,
    completeStep,
    regeneratePlan,
  };
}
