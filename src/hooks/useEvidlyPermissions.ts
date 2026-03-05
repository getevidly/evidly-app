/**
 * useEvidlyPermissions — Staff role & permission hook for @getevidly.com admin users
 *
 * Reads evidly_staff_role and perm_* columns from user_profiles.
 * Only relevant when isAdmin / isEvidlyAdmin is true.
 *
 * Staff roles: super_admin, admin, support, sales
 * Derived: canSeeSalesMarketing — only super_admin and sales see Growth section
 */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useRole } from '../contexts/RoleContext';

export interface EvidlyPerms {
  staffRole: string | null;
  isStaff: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isSupport: boolean;
  isSales: boolean;
  canSeeSalesMarketing: boolean;
  canBilling: boolean;
  canSecurity: boolean;
  canEmulate: boolean;
  canConfigure: boolean;
  canSupportTickets: boolean;
  canCrawlManage: boolean;
  canRemoteConnect: boolean;
  canIntelligence: boolean;
  canStaffManage: boolean;
  loading: boolean;
}

const DEFAULT_PERMS: EvidlyPerms = {
  staffRole: null,
  isStaff: false,
  isSuperAdmin: false,
  isAdmin: false,
  isSupport: false,
  isSales: false,
  canSeeSalesMarketing: false,
  canBilling: false,
  canSecurity: false,
  canEmulate: false,
  canConfigure: false,
  canSupportTickets: false,
  canCrawlManage: false,
  canRemoteConnect: false,
  canIntelligence: false,
  canStaffManage: false,
  loading: true,
};

const ALL_PERMS: EvidlyPerms = {
  staffRole: 'super_admin',
  isStaff: true,
  isSuperAdmin: true,
  isAdmin: false,
  isSupport: false,
  isSales: false,
  canSeeSalesMarketing: true,
  canBilling: true,
  canSecurity: true,
  canEmulate: true,
  canConfigure: true,
  canSupportTickets: true,
  canCrawlManage: true,
  canRemoteConnect: true,
  canIntelligence: true,
  canStaffManage: true,
  loading: false,
};

export function useEvidlyPermissions(): EvidlyPerms {
  const { user, isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();
  const [perms, setPerms] = useState<EvidlyPerms>(DEFAULT_PERMS);

  useEffect(() => {
    // Demo mode: platform_admin gets full access, others get none
    if (isDemoMode) {
      setPerms(userRole === 'platform_admin' ? ALL_PERMS : { ...DEFAULT_PERMS, loading: false });
      return;
    }

    if (!user || !isEvidlyAdmin) {
      // Non-admin users get no staff perms
      setPerms({ ...DEFAULT_PERMS, loading: false });
      return;
    }

    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('user_profiles')
        .select(`
          role, evidly_staff_role,
          perm_billing, perm_security, perm_emulate, perm_configure,
          perm_support_tickets, perm_sales_pipeline, perm_crawl_manage,
          perm_remote_connect, perm_intelligence, perm_staff_manage
        `)
        .eq('id', user!.id)
        .single();

      if (cancelled) return;

      if (!data) {
        // If no profile row found, fall back to super_admin for platform_admin
        // (Arthur is always super_admin)
        setPerms({
          ...DEFAULT_PERMS,
          staffRole: 'super_admin',
          isStaff: true,
          isSuperAdmin: true,
          canSeeSalesMarketing: true,
          canBilling: true,
          canSecurity: true,
          canEmulate: true,
          canConfigure: true,
          canSupportTickets: true,
          canCrawlManage: true,
          canRemoteConnect: true,
          canIntelligence: true,
          canStaffManage: true,
          loading: false,
        });
        return;
      }

      const role = data.evidly_staff_role;
      const isPlatformAdmin = data.role === 'platform_admin';

      setPerms({
        staffRole: role,
        isStaff: isPlatformAdmin || !!role,
        isSuperAdmin: role === 'super_admin' || isPlatformAdmin,
        isAdmin: role === 'admin',
        isSupport: role === 'support',
        isSales: role === 'sales',
        // Sales/marketing: super_admin, sales role, or platform_admin without explicit role
        canSeeSalesMarketing: role === 'super_admin' || role === 'sales' || (isPlatformAdmin && !role),
        canBilling: data.perm_billing ?? false,
        canSecurity: data.perm_security ?? false,
        canEmulate: data.perm_emulate ?? false,
        canConfigure: data.perm_configure ?? false,
        canSupportTickets: data.perm_support_tickets ?? false,
        canCrawlManage: data.perm_crawl_manage ?? false,
        canRemoteConnect: data.perm_remote_connect ?? false,
        canIntelligence: data.perm_intelligence ?? false,
        canStaffManage: data.perm_staff_manage ?? false,
        loading: false,
      });
    }

    load();

    return () => { cancelled = true; };
  }, [user?.id, isEvidlyAdmin, isDemoMode, userRole]);

  return perms;
}
