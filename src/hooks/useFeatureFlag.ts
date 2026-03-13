/**
 * useFeatureFlag — DB-backed feature flag evaluation hook
 *
 * Returns { enabled, reason, message, messageTitle, loading }
 * enabled = true  → render the feature normally
 * enabled = false → render the gate component with message
 * reason: 'disabled' | 'scheduled' | 'criteria_not_met' | 'role_restricted' | 'plan_restricted'
 */
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useRole } from '../contexts/RoleContext';

interface FlagData {
  name?: string;
  trigger_type: string;
  date_config: any;
  criteria: any[];
  allowed_roles: string[] | null;
  plan_tiers: string[] | null;
}

interface FeatureFlagResult {
  enabled: boolean;
  reason: string | null;
  message: string | null;
  messageTitle: string | null;
  loading: boolean;
  flagData: FlagData | null;
}

interface FlagRow {
  key: string;
  name: string;
  is_enabled: boolean;
  trigger_type: string;
  date_config: any;
  criteria: any[];
  criteria_logic: string;
  visible_to: string;
  allowed_roles: string[] | null;
  plan_tiers: string[] | null;
  disabled_message: string | null;
  disabled_message_title: string | null;
}

// Module-level cache to avoid re-fetching the same flag within a session
const flagCache = new Map<string, { data: FlagRow; ts: number }>();
const CACHE_TTL = 60_000; // 60 seconds

export function useFeatureFlag(key: string): FeatureFlagResult {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const { userRole } = useRole();
  const [result, setResult] = useState<FeatureFlagResult>({
    enabled: true,
    reason: null,
    message: null,
    messageTitle: null,
    loading: true,
    flagData: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Demo mode → always enabled
    if (isDemoMode) {
      setResult({ enabled: true, reason: null, message: null, messageTitle: null, loading: false, flagData: null });
      return;
    }

    const evaluate = async () => {
      // Check cache
      const cached = flagCache.get(key);
      let flag: FlagRow | null = null;

      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        flag = cached.data;
      } else {
        const { data } = await supabase
          .from('feature_flags')
          .select('key, name, is_enabled, trigger_type, date_config, criteria, criteria_logic, visible_to, allowed_roles, plan_tiers, disabled_message, disabled_message_title')
          .eq('key', key)
          .single();

        if (data) {
          flag = data as FlagRow;
          flagCache.set(key, { data: flag, ts: Date.now() });
        }
      }

      if (!mountedRef.current) return;

      // Flag not found → allow access (unknown = enabled)
      if (!flag) {
        setResult({ enabled: true, reason: null, message: null, messageTitle: null, loading: false, flagData: null });
        return;
      }

      const msg = flag.disabled_message;
      const msgTitle = flag.disabled_message_title;
      const fd: FlagData = {
        name: flag.name,
        trigger_type: flag.trigger_type,
        date_config: flag.date_config,
        criteria: flag.criteria,
        allowed_roles: flag.allowed_roles,
        plan_tiers: flag.plan_tiers,
      };

      // Master switch off
      if (!flag.is_enabled && flag.trigger_type === 'always_on') {
        setResult({ enabled: false, reason: 'disabled', message: msg, messageTitle: msgTitle, loading: false, flagData: fd });
        return;
      }

      // Trigger type evaluation
      if (flag.trigger_type === 'fixed_date' && flag.date_config?.go_live) {
        const goLive = new Date(flag.date_config.go_live);
        if (Date.now() < goLive.getTime()) {
          setResult({ enabled: false, reason: 'scheduled', message: msg, messageTitle: msgTitle, loading: false, flagData: fd });
          return;
        }
      }

      if (flag.trigger_type === 'relative_date' && flag.date_config?.days) {
        const createdAt = profile?.created_at ? new Date(profile.created_at) : null;
        if (createdAt) {
          const unlockDate = new Date(createdAt.getTime() + flag.date_config.days * 86400000);
          if (Date.now() < unlockDate.getTime()) {
            setResult({ enabled: false, reason: 'pending', message: msg, messageTitle: msgTitle, loading: false, flagData: fd });
            return;
          }
        }
      }

      if (flag.trigger_type === 'time_window' && flag.date_config) {
        const now = Date.now();
        const start = flag.date_config.start ? new Date(flag.date_config.start).getTime() : 0;
        const end = flag.date_config.end ? new Date(flag.date_config.end).getTime() : Infinity;
        if (now < start || now > end) {
          const afterEnd = flag.date_config.after_end;
          if (afterEnd === 'on') {
            // stays on after window
          } else {
            setResult({ enabled: false, reason: 'scheduled', message: msg, messageTitle: msgTitle, loading: false, flagData: fd });
            return;
          }
        }
      }

      // rolling_window — stub: enabled until activity tracking is built
      if (flag.trigger_type === 'rolling_window') {
        if (!flag.is_enabled) {
          setResult({ enabled: false, reason: 'pending', message: msg, messageTitle: msgTitle, loading: false, flagData: fd });
          return;
        }
      }

      // event_delay — check feature_flag_unlocks for this user
      if (flag.trigger_type === 'event_delay') {
        const userId = profile?.id;
        if (userId) {
          const { data: unlock } = await supabase
            .from('feature_flag_unlocks')
            .select('unlocked_at')
            .eq('flag_key', key)
            .eq('user_id', userId)
            .maybeSingle();
          if (!unlock) {
            setResult({ enabled: false, reason: 'pending', message: msg, messageTitle: msgTitle, loading: false, flagData: fd });
            return;
          }
          const delayDays = flag.date_config?.delay_days || 0;
          const unlockAt = new Date(new Date(unlock.unlocked_at).getTime() + delayDays * 86400000);
          if (Date.now() < unlockAt.getTime()) {
            setResult({ enabled: false, reason: 'pending', message: msg, messageTitle: msgTitle, loading: false, flagData: fd });
            return;
          }
        }
      }

      // fiscal_renewal — check plan/subscription cycle
      if (flag.trigger_type === 'fiscal_renewal') {
        if (!flag.is_enabled) {
          setResult({ enabled: false, reason: 'plan_restricted', message: msg, messageTitle: msgTitle, loading: false, flagData: fd });
          return;
        }
      }

      if (flag.trigger_type === 'criteria' && !flag.is_enabled) {
        setResult({ enabled: false, reason: 'criteria_not_met', message: msg, messageTitle: msgTitle, loading: false, flagData: fd });
        return;
      }

      // Visibility check
      if (flag.visible_to === 'admin_only' && userRole !== 'platform_admin') {
        setResult({ enabled: false, reason: 'role_restricted', message: msg, messageTitle: msgTitle, loading: false, flagData: fd });
        return;
      }

      if (flag.visible_to === 'role_filtered' && flag.allowed_roles?.length) {
        if (!flag.allowed_roles.includes(userRole)) {
          setResult({ enabled: false, reason: 'role_restricted', message: msg, messageTitle: msgTitle, loading: false, flagData: fd });
          return;
        }
      }

      // Plan tier check
      if (flag.plan_tiers?.length) {
        const userPlan = (profile as any)?.plan || 'founder';
        if (!flag.plan_tiers.includes(userPlan)) {
          setResult({ enabled: false, reason: 'plan_restricted', message: msg, messageTitle: msgTitle, loading: false, flagData: fd });
          return;
        }
      }

      // All checks passed
      setResult({ enabled: flag.is_enabled, reason: flag.is_enabled ? null : 'disabled', message: msg, messageTitle: msgTitle, loading: false, flagData: fd });
    };

    evaluate();
  }, [key, isDemoMode, profile, userRole]);

  return result;
}
