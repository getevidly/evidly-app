/**
 * Inventory API hooks — stubbed with empty data.
 */
import { useCallback } from 'react';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from '@shared/hooks/api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export type InventoryCategory = 'chemicals' | 'parts' | 'equipment' | 'ppe' | 'supplies';
export type TransactionType = 'use' | 'restock' | 'adjustment' | 'transfer' | 'damage' | 'loss';
export type RequestStatus = 'pending' | 'approved' | 'denied' | 'ordered' | 'received';
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface InventoryItem {
  id: string;
  vendorId: string;
  name: string;
  sku: string | null;
  category: InventoryCategory;
  unit: string;
  currentQuantity: number;
  reorderPoint: number;
  reorderQuantity: number;
  unitCost: number | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName?: string;
  employeeId: string;
  employeeName?: string;
  transactionType: TransactionType;
  quantity: number;
  jobId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface InventoryRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  status: RequestStatus;
  priority: RequestPriority;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  items: InventoryRequestItem[];
}

export interface InventoryRequestItem {
  id: string;
  itemId: string | null;
  itemName: string;
  quantityRequested: number;
  quantityApproved: number | null;
  notes: string | null;
}

export interface InventoryFilters {
  category?: InventoryCategory;
  location?: string;
  lowStockOnly?: boolean;
  search?: string;
}

export interface LogUsageInput {
  itemId: string;
  quantity: number;
  jobId?: string;
  notes?: string;
}

export interface CreateRequestInput {
  priority: RequestPriority;
  notes?: string;
  items: { itemId?: string; itemName: string; quantity: number; notes?: string }[];
}

// ── Queries ───────────────────────────────────────────────────

export function useInventoryItems(filters?: InventoryFilters): ApiQueryResult<InventoryItem[]> {
  const queryFn = useCallback(async (): Promise<InventoryItem[]> => [], []);
  return useApiQuery(`inventory-items-${JSON.stringify(filters || {})}`, queryFn, []);
}

export function useInventoryItem(id: string): ApiQueryResult<InventoryItem | null> {
  const queryFn = useCallback(async (): Promise<InventoryItem | null> => null, []);
  return useApiQuery(`inventory-item-${id}`, queryFn, null);
}

export function useInventoryTransactions(itemId?: string): ApiQueryResult<InventoryTransaction[]> {
  const queryFn = useCallback(async (): Promise<InventoryTransaction[]> => [], []);
  return useApiQuery(`inventory-txn-${itemId || 'all'}`, queryFn, []);
}

export function useInventoryRequests(status?: RequestStatus): ApiQueryResult<InventoryRequest[]> {
  const queryFn = useCallback(async (): Promise<InventoryRequest[]> => [], []);
  return useApiQuery(`inventory-requests-${status || 'all'}`, queryFn, []);
}

// ── Mutations ─────────────────────────────────────────────────

export function useLogUsage(): ApiMutationResult<LogUsageInput> {
  const mutationFn = useCallback(async (_args: LogUsageInput): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: LogUsageInput): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useCreateInventoryRequest(): ApiMutationResult<CreateRequestInput> {
  const mutationFn = useCallback(async (_args: CreateRequestInput): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: CreateRequestInput): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useApproveInventoryRequest(): ApiMutationResult<string> {
  const mutationFn = useCallback(async (_id: string): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_id: string): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useDenyInventoryRequest(): ApiMutationResult<string> {
  const mutationFn = useCallback(async (_id: string): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_id: string): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useCreateInventoryItem(): ApiMutationResult<Omit<InventoryItem, 'id' | 'vendorId' | 'createdAt'>> {
  const mutationFn = useCallback(async (_args: Omit<InventoryItem, 'id' | 'vendorId' | 'createdAt'>): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: Omit<InventoryItem, 'id' | 'vendorId' | 'createdAt'>): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useUpdateInventoryItem(): ApiMutationResult<InventoryItem> {
  const mutationFn = useCallback(async (_args: InventoryItem): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: InventoryItem): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}
