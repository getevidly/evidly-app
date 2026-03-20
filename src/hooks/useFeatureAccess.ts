/**
 * CPP-VENDOR-CONNECT-01 — Feature access hook for CPP Free Tier gating.
 *
 * Reads org plan_tier + is_cpp_client from Supabase.
 * Returns boolean flags for each gated feature.
 *
 * Demo mode: returns full access (isPaid=true).
 * CPP Free: limited access (hood cleaning + My Vendors + service requests only).
 * Trial/Founder/Standard/Enterprise: full access.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';

export interface FeatureAccessFlags {
  loading: boolean;
  plan: string;
  isCPPFree: boolean;
  isPaid: boolean;
  isCPPClient: boolean;

  // Always free
  canTrackHoodCleaning: boolean;
  canViewHoodCert: boolean;
  canUseMyVendors: boolean;
  canRequestService: boolean;
  canReadForum: boolean;

  // Paid only
  canLogTemperature: boolean;
  canUseChecklists: boolean;
  canUseHACCP: boolean;
  canStorePSEDocs: boolean;
  canTrackPSECompliance: boolean;
  canAccessVendorConnect: boolean;
  canStoreVendorDocs: boolean;
  canSeeJurisdictionIntel: boolean;
  canSeeFullReadinessScore: boolean;
  canUploadDocuments: boolean;
  canPostForum: boolean;
  canUseVoice: boolean;
  canUseAISuperpowers: boolean;
  canManageTeam: boolean;
  canAccessCalendar: boolean;
  canAccessReports: boolean;
  isK2CParticipant: boolean;
}

const FULL_ACCESS: FeatureAccessFlags = {
  loading: false,
  plan: 'founder',
  isCPPFree: false,
  isPaid: true,
  isCPPClient: false,
  canTrackHoodCleaning: true,
  canViewHoodCert: true,
  canUseMyVendors: true,
  canRequestService: true,
  canReadForum: true,
  canLogTemperature: true,
  canUseChecklists: true,
  canUseHACCP: true,
  canStorePSEDocs: true,
  canTrackPSECompliance: true,
  canAccessVendorConnect: true,
  canStoreVendorDocs: true,
  canSeeJurisdictionIntel: true,
  canSeeFullReadinessScore: true,
  canUploadDocuments: true,
  canPostForum: true,
  canUseVoice: true,
  canUseAISuperpowers: true,
  canManageTeam: true,
  canAccessCalendar: true,
  canAccessReports: true,
  isK2CParticipant: true,
};

export function useFeatureAccess(): FeatureAccessFlags {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [orgData, setOrgData] = useState<{ plan_tier: string; is_cpp_client: boolean } | null>(null);
  const [loading, setLoading] = useState(!isDemoMode);

  useEffect(() => {
    if (isDemoMode || !profile?.organization_id) return;

    supabase
      .from('organizations')
      .select('plan_tier, is_cpp_client')
      .eq('id', profile.organization_id)
      .maybeSingle()
      .then(({ data }) => {
        setOrgData(data ? { plan_tier: data.plan_tier || 'trial', is_cpp_client: !!data.is_cpp_client } : null);
        setLoading(false);
      });
  }, [isDemoMode, profile?.organization_id]);

  // Demo mode: full access
  if (isDemoMode) return FULL_ACCESS;

  // Still loading
  if (loading || !orgData) {
    return { ...FULL_ACCESS, loading: true, plan: 'unknown' };
  }

  const plan = orgData.plan_tier;
  const isCPPFree = plan === 'cpp_free';
  const isPaid = ['founder', 'standard', 'enterprise'].includes(plan);
  const hasAccess = isPaid || plan === 'trial';

  return {
    loading: false,
    plan,
    isCPPFree,
    isPaid,
    isCPPClient: orgData.is_cpp_client,

    // Always free
    canTrackHoodCleaning: true,
    canViewHoodCert: true,
    canUseMyVendors: true,
    canRequestService: true,
    canReadForum: true,

    // Paid (or trial) only
    canLogTemperature: hasAccess,
    canUseChecklists: hasAccess,
    canUseHACCP: hasAccess,
    canStorePSEDocs: hasAccess,
    canTrackPSECompliance: hasAccess,
    canAccessVendorConnect: hasAccess,
    canStoreVendorDocs: hasAccess,
    canSeeJurisdictionIntel: hasAccess,
    canSeeFullReadinessScore: hasAccess,
    canUploadDocuments: hasAccess,
    canPostForum: hasAccess,
    canUseVoice: hasAccess,
    canUseAISuperpowers: hasAccess,
    canManageTeam: hasAccess,
    canAccessCalendar: hasAccess,
    canAccessReports: hasAccess,
    isK2CParticipant: isPaid,
  };
}
