/**
 * useFeatureCriteriaProgress — Evaluates criteria progress for feature gates
 *
 * Returns progress data for each criteria item so the FeatureGate
 * component can render unlock progress rows with action CTAs.
 * Demo mode returns hardcoded mock progress.
 */
import { useState, useEffect, useRef } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface CriteriaProgress {
  label: string;
  required: string;
  current: string;
  met: boolean;
  progress: number; // 0-1
  actionHref?: string;
  actionLabel?: string;
}

const DEMO_PROGRESS: CriteriaProgress[] = [
  { label: 'Inspection uploaded', required: '1 inspection', current: '1 uploaded', met: true, progress: 1 },
  { label: 'Profile completeness', required: '80%', current: '74%', met: false, progress: 0.925, actionHref: '/settings', actionLabel: 'Complete profile' },
  { label: 'Temperature log compliance', required: '70%', current: '68%', met: false, progress: 0.971, actionHref: '/temp-logs', actionLabel: 'Log temperatures' },
  { label: 'Documents on file', required: 'COI + HACCP', current: 'COI uploaded', met: false, progress: 0.5, actionHref: '/documents', actionLabel: 'Upload documents' },
];

const CRITERIA_ACTIONS: Record<string, { href: string; label: string }> = {
  inspections_uploaded: { href: '/documents', label: 'Upload inspection' },
  profile_completeness: { href: '/settings', label: 'Complete profile' },
  temp_log_completeness: { href: '/temp-logs', label: 'Log temperatures' },
  docs_on_file: { href: '/documents', label: 'Upload documents' },
  checklists_completed: { href: '/checklists', label: 'Complete checklists' },
  account_age_days: { href: '/dashboard', label: 'View dashboard' },
  plan_tier: { href: '/settings?tab=billing', label: 'Upgrade plan' },
  guided_tour_complete: { href: '/dashboard', label: 'Start tour' },
  team_member_invited: { href: '/team', label: 'Invite team member' },
  vendor_coi_on_file: { href: '/vendors', label: 'Add vendor COI' },
  jie_county_verified: { href: '/jurisdiction', label: 'View jurisdiction' },
};

export function useFeatureCriteriaProgress(
  criteria: any[] | null,
  dateConfig: any | null
): { items: CriteriaProgress[]; loading: boolean } {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const [items, setItems] = useState<CriteriaProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (isDemoMode) {
      setItems(DEMO_PROGRESS);
      setLoading(false);
      return;
    }

    if (!criteria || criteria.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const resolve = async () => {
      const results: CriteriaProgress[] = [];

      for (const c of criteria) {
        const action = CRITERIA_ACTIONS[c.type] || {};
        const label = c.label || c.type.replace(/_/g, ' ');
        const requiredVal = c.value ?? 1;

        let current = 0;
        let currentLabel = '0';
        let requiredLabel = String(requiredVal);
        let met = false;

        try {
          switch (c.type) {
            case 'inspections_uploaded': {
              const { count } = await supabase.from('inspections').select('*', { count: 'exact', head: true });
              current = count || 0;
              currentLabel = `${current} uploaded`;
              requiredLabel = `${requiredVal} inspection${requiredVal > 1 ? 's' : ''}`;
              met = current >= requiredVal;
              break;
            }
            case 'profile_completeness': {
              // Estimate from location profile fields
              const { data } = await supabase.from('locations').select('*').limit(1).single();
              if (data) {
                const fields = ['name', 'address', 'city', 'state', 'zip', 'phone', 'industry_type', 'county'];
                const filled = fields.filter(f => data[f]).length;
                current = Math.round((filled / fields.length) * 100);
              }
              currentLabel = `${current}%`;
              requiredLabel = `${requiredVal}%`;
              met = current >= requiredVal;
              break;
            }
            case 'temp_log_completeness': {
              const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
              const { count } = await supabase.from('temp_check_completions').select('*', { count: 'exact', head: true }).gte('recorded_at', thirtyDaysAgo);
              // Rough compliance: expect ~2 logs per day for 30 days
              const expected = 60;
              current = Math.min(100, Math.round(((count || 0) / expected) * 100));
              currentLabel = `${current}%`;
              requiredLabel = `${requiredVal}%`;
              met = current >= requiredVal;
              break;
            }
            case 'docs_on_file': {
              const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true });
              current = count || 0;
              currentLabel = `${current} document${current !== 1 ? 's' : ''}`;
              requiredLabel = `${requiredVal} required`;
              met = current >= requiredVal;
              break;
            }
            case 'checklists_completed': {
              const { count } = await supabase.from('checklist_completions').select('*', { count: 'exact', head: true });
              current = count || 0;
              currentLabel = `${current} completed`;
              requiredLabel = `${requiredVal} required`;
              met = current >= requiredVal;
              break;
            }
            case 'account_age_days': {
              const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
              const daysSince = Math.floor((Date.now() - createdAt.getTime()) / 86400000);
              current = daysSince;
              currentLabel = `${daysSince} days`;
              requiredLabel = `${requiredVal} days`;
              met = daysSince >= requiredVal;
              break;
            }
            case 'plan_tier': {
              const userPlan = (profile as any)?.plan || 'founder';
              currentLabel = userPlan;
              requiredLabel = String(requiredVal);
              met = userPlan === requiredVal;
              current = met ? 1 : 0;
              break;
            }
            default: {
              currentLabel = 'Unknown';
              requiredLabel = String(requiredVal);
              break;
            }
          }
        } catch {
          // Silently handle query failures
        }

        const progress = requiredVal > 0 ? Math.min(1, current / requiredVal) : 0;

        results.push({
          label,
          required: requiredLabel,
          current: currentLabel,
          met,
          progress,
          actionHref: met ? undefined : action.href,
          actionLabel: met ? undefined : action.label,
        });
      }

      if (mountedRef.current) {
        setItems(results);
        setLoading(false);
      }
    };

    resolve();
  }, [criteria, dateConfig, isDemoMode, profile]);

  return { items, loading };
}
