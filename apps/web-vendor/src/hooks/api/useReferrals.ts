/**
 * Referral API hooks — stubbed with empty data.
 */
import { useCallback } from 'react';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from '@shared/hooks/api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface ReferralCode {
  id: string;
  vendor_id: string;
  organization_id: string;
  location_id: string | null;
  code: string;
  type: 'standard' | 'vip' | 'campaign';
  referrer_reward_amount: number;
  referrer_reward_type: string;
  referee_reward_amount: number;
  referee_reward_type: string;
  total_referrals: number;
  successful_referrals: number;
  total_rewards_earned: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  organization?: { name: string };
}

export interface Referral {
  id: string;
  vendor_id: string;
  referral_code_id: string;
  referrer_org_id: string;
  referee_name: string;
  referee_business_name: string | null;
  referee_email: string | null;
  referee_phone: string | null;
  referee_address: string | null;
  status: 'pending' | 'contacted' | 'quoted' | 'converted' | 'lost' | 'expired';
  referee_org_id: string | null;
  first_job_id: string | null;
  first_job_completed_at: string | null;
  referrer_reward_status: 'pending' | 'earned' | 'paid' | 'expired';
  referrer_reward_amount: number | null;
  referrer_reward_paid_at: string | null;
  referee_reward_status: 'pending' | 'earned' | 'paid' | 'expired';
  referee_reward_amount: number | null;
  referee_reward_applied_at: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  referral_code?: ReferralCode;
  referrer_org?: { name: string };
}

export interface ReferralStats {
  totalReferrals: number;
  converted: number;
  pending: number;
  rewardsPaid: number;
}

export interface ReferralCampaign {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  referrer_reward_multiplier: number;
  referee_reward_multiplier: number;
  starts_at: string;
  ends_at: string;
  max_referrals: number | null;
  current_referrals: number;
  is_active: boolean;
  created_at: string;
}

export interface CustomerCredit {
  id: string;
  vendor_id: string;
  organization_id: string;
  amount: number;
  remaining_amount: number;
  source: string;
  description: string | null;
  expires_at: string | null;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  created_at: string;
}

export interface ReferralFilters {
  status?: string;
  dateRange?: { start: string; end: string };
}

// ── Queries ───────────────────────────────────────────────────

export function useReferrals(filters?: ReferralFilters): ApiQueryResult<Referral[]> {
  return useApiQuery<Referral[]>(['referrals', filters], async () => [], { enabled: true });
}

export function useReferral(id: string | undefined): ApiQueryResult<Referral | null> {
  return useApiQuery<Referral | null>(['referral', id], async () => null, { enabled: !!id });
}

export function useReferralCodes(orgId?: string): ApiQueryResult<ReferralCode[]> {
  return useApiQuery<ReferralCode[]>(['referral-codes', orgId], async () => [], { enabled: true });
}

export function useReferralCode(code: string | undefined): ApiQueryResult<ReferralCode | null> {
  return useApiQuery<ReferralCode | null>(['referral-code', code], async () => null, { enabled: !!code });
}

export function useReferralStats(): ApiQueryResult<ReferralStats> {
  return useApiQuery<ReferralStats>(
    ['referral-stats'],
    async () => ({ totalReferrals: 0, converted: 0, pending: 0, rewardsPaid: 0 }),
    { enabled: true }
  );
}

export function useCampaigns(): ApiQueryResult<ReferralCampaign[]> {
  return useApiQuery<ReferralCampaign[]>(['campaigns'], async () => [], { enabled: true });
}

export function useCustomerCredits(orgId?: string): ApiQueryResult<CustomerCredit[]> {
  return useApiQuery<CustomerCredit[]>(['customer-credits', orgId], async () => [], { enabled: !!orgId });
}

// ── Mutations ─────────────────────────────────────────────────

export function useCreateReferral(): ApiMutationResult<Referral, Partial<Referral>> {
  const mutationFn = useCallback(async (_args: Partial<Referral>) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<Referral, Partial<Referral>>(mutationFn, { invalidateKeys: [['referrals'], ['referral-stats']] });
}

export function useUpdateReferralStatus(): ApiMutationResult<void, { id: string; status: string; notes?: string }> {
  const mutationFn = useCallback(async (_args: { id: string; status: string; notes?: string }) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<void, { id: string; status: string; notes?: string }>(mutationFn, { invalidateKeys: [['referrals'], ['referral-stats']] });
}

export function useConvertReferral(): ApiMutationResult<void, { id: string; orgId: string; jobId?: string }> {
  const mutationFn = useCallback(async (_args: { id: string; orgId: string; jobId?: string }) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<void, { id: string; orgId: string; jobId?: string }>(mutationFn, { invalidateKeys: [['referrals'], ['referral-stats']] });
}

export function useGenerateReferralCode(): ApiMutationResult<ReferralCode, { organizationId: string; code?: string }> {
  const mutationFn = useCallback(async (_args: { organizationId: string; code?: string }) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<ReferralCode, { organizationId: string; code?: string }>(mutationFn, { invalidateKeys: [['referral-codes']] });
}

export function useCreateCampaign(): ApiMutationResult<ReferralCampaign, Partial<ReferralCampaign>> {
  const mutationFn = useCallback(async (_args: Partial<ReferralCampaign>) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<ReferralCampaign, Partial<ReferralCampaign>>(mutationFn, { invalidateKeys: [['campaigns']] });
}

export function useApplyCredit(): ApiMutationResult<void, { creditId: string; jobId: string; amount: number }> {
  const mutationFn = useCallback(async (_args: { creditId: string; jobId: string; amount: number }) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<void, { creditId: string; jobId: string; amount: number }>(mutationFn, { invalidateKeys: [['customer-credits']] });
}

export function useAddManualCredit(): ApiMutationResult<CustomerCredit, { organizationId: string; amount: number; description: string }> {
  const mutationFn = useCallback(async (_args: { organizationId: string; amount: number; description: string }) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<CustomerCredit, { organizationId: string; amount: number; description: string }>(mutationFn, { invalidateKeys: [['customer-credits']] });
}
