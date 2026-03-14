/**
 * Settings API hooks — stubbed with empty data.
 *
 * When Supabase tables are ready, replace the queryFn
 * implementations with real queries. Returns null/[] so
 * pages render empty states until connected.
 */

import { useCallback } from 'react';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from '@shared/hooks/api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface VendorSettings {
  id: string;
  orgId: string;
  companyName: string;
  phone: string;
  email: string;
  website: string;
  address: { street: string; city: string; state: string; zip: string };
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  currency: 'USD' | 'CAD' | 'GBP' | 'EUR';
  fiscalYearStart: number;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  certHeaderText: string;
  certFooterText: string;
}

export type SettingsRole = 'owner' | 'admin' | 'supervisor' | 'technician' | 'office';

export interface RolePermissionRow {
  permission: string;
  label: string;
  roles: Record<SettingsRole, boolean>;
}

export interface ServiceType {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  color: string;
  durationMinutes: number;
  basePrice: number;
  complianceCodes: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

export interface IntegrationConfig {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: 'accounting' | 'payments' | 'sms' | 'email' | 'crm' | 'compliance';
  status: IntegrationStatus;
  connectedAt: string | null;
  lastSyncAt: string | null;
  config: Record<string, unknown>;
}

export type NotificationChannel = 'email' | 'sms' | 'push';

export interface NotificationEvent {
  key: string;
  label: string;
  channels: Record<NotificationChannel, boolean>;
}

export interface NotificationPreferences {
  globalToggles: Record<NotificationChannel, boolean>;
  events: NotificationEvent[];
}

export type PlanTier = 'starter' | 'professional' | 'enterprise';

export interface BillingInfo {
  planTier: PlanTier;
  planName: string;
  monthlyPrice: number;
  usage: {
    employees: { current: number; limit: number };
    jobs: { current: number; limit: number };
    storageGb: { current: number; limit: number };
  };
  paymentMethod: {
    type: 'card' | 'bank';
    last4: string;
    expiresAt: string;
  } | null;
  nextBillingDate: string;
  cancelledAt: string | null;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  pdfUrl: string;
}

// ── Queries ───────────────────────────────────────────────────

export function useVendorSettings(): ApiQueryResult<VendorSettings | null> {
  const queryFn = useCallback(async (): Promise<VendorSettings | null> => {
    // TODO: Replace with Supabase query
    return null;
  }, []);
  return useApiQuery('vendor-settings', queryFn, null);
}

export function useRolePermissions(): ApiQueryResult<RolePermissionRow[]> {
  const queryFn = useCallback(async (): Promise<RolePermissionRow[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery('role-permissions-settings', queryFn, []);
}

export function useServiceTypes(): ApiQueryResult<ServiceType[]> {
  const queryFn = useCallback(async (): Promise<ServiceType[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery('service-types', queryFn, []);
}

export function useIntegrations(): ApiQueryResult<IntegrationConfig[]> {
  const queryFn = useCallback(async (): Promise<IntegrationConfig[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery('integrations', queryFn, []);
}

export function useNotificationPreferences(): ApiQueryResult<NotificationPreferences | null> {
  const queryFn = useCallback(async (): Promise<NotificationPreferences | null> => {
    // TODO: Replace with Supabase query
    return null;
  }, []);
  return useApiQuery('notification-preferences', queryFn, null);
}

export function useBillingInfo(): ApiQueryResult<BillingInfo | null> {
  const queryFn = useCallback(async (): Promise<BillingInfo | null> => {
    // TODO: Replace with Supabase query
    return null;
  }, []);
  return useApiQuery('billing-info', queryFn, null);
}

export function useInvoices(): ApiQueryResult<Invoice[]> {
  const queryFn = useCallback(async (): Promise<Invoice[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery('invoices', queryFn, []);
}

// ── Mutations ─────────────────────────────────────────────────

export function useUpdateVendorSettings(): ApiMutationResult<Partial<VendorSettings>> {
  const mutationFn = useCallback(async (_args: Partial<VendorSettings>): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: Partial<VendorSettings>): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useUpdateRolePermissions(): ApiMutationResult<RolePermissionRow[]> {
  const mutationFn = useCallback(async (_rows: RolePermissionRow[]): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_rows: RolePermissionRow[]): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useCreateServiceType(): ApiMutationResult<Omit<ServiceType, 'id' | 'createdAt' | 'updatedAt'>, ServiceType> {
  const mutationFn = useCallback(async (_args: Omit<ServiceType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceType> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((args: Omit<ServiceType, 'id' | 'createdAt' | 'updatedAt'>): ServiceType => ({
    ...args,
    id: `st-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }), []);
  return useApiMutation(mutationFn, demoFn);
}

export function useUpdateServiceType(): ApiMutationResult<ServiceType> {
  const mutationFn = useCallback(async (_args: ServiceType): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: ServiceType): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useDeleteServiceType(): ApiMutationResult<string> {
  const mutationFn = useCallback(async (_id: string): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_id: string): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useConnectIntegration(): ApiMutationResult<{ slug: string; config: Record<string, unknown> }> {
  const mutationFn = useCallback(async (_args: { slug: string; config: Record<string, unknown> }): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: { slug: string; config: Record<string, unknown> }): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useDisconnectIntegration(): ApiMutationResult<string> {
  const mutationFn = useCallback(async (_slug: string): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_slug: string): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useUpdateNotificationPreferences(): ApiMutationResult<NotificationPreferences> {
  const mutationFn = useCallback(async (_prefs: NotificationPreferences): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_prefs: NotificationPreferences): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}
