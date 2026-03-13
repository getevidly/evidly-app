/**
 * Equipment API hooks — stubbed with empty data.
 *
 * When Supabase tables are ready, replace the queryFn
 * implementations with real queries.
 */

import { useCallback } from 'react';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from './useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export type EquipmentCondition = 'clean' | 'light' | 'moderate' | 'heavy' | 'deficient';
export type EquipmentStatus = 'active' | 'inactive' | 'needs_service' | 'overdue';

export interface EquipmentItem {
  id: string;
  name: string;
  equipmentType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  installDate: string | null;
  locationId: string;
  locationName: string;
  customerName: string;
  installedArea: string;
  condition: EquipmentCondition;
  status: EquipmentStatus;
  lastServiceDate: string | null;
  nextDueDate: string | null;
  serviceFrequencyDays: number | null;
  deficiencyCount: number;
  qrCodeId: string;
  notes: string;
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentServiceRecord {
  id: string;
  equipmentId: string;
  serviceDate: string;
  serviceType: string;
  technicianName: string;
  conditionBefore: EquipmentCondition;
  conditionAfter: EquipmentCondition;
  durationMinutes: number | null;
  notes: string;
  certificateNumber: string | null;
  photoUrls: string[];
  cost: number | null;
}

export interface EquipmentDeficiency {
  id: string;
  equipmentId: string;
  severity: 'critical' | 'major' | 'minor';
  code: string;
  title: string;
  description: string;
  status: 'open' | 'resolved';
  foundDate: string;
  resolvedDate: string | null;
  resolvedBy: string | null;
}

export interface EquipmentDocument {
  id: string;
  equipmentId: string;
  documentType: 'certificate' | 'installation' | 'warranty' | 'manual' | 'other';
  name: string;
  url: string;
  uploadDate: string;
  sizeBytes: number;
}

export interface CreateEquipmentInput {
  name: string;
  equipmentType: string;
  locationId: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate?: string;
  installedArea?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateEquipmentInput extends Partial<CreateEquipmentInput> {
  id: string;
  condition?: EquipmentCondition;
  status?: EquipmentStatus;
}

export interface EquipmentFilters {
  equipmentType?: string;
  condition?: EquipmentCondition;
  status?: EquipmentStatus;
  search?: string;
  locationId?: string;
}

// ── Queries ───────────────────────────────────────────────────

export function useEquipment(_filters?: EquipmentFilters): ApiQueryResult<EquipmentItem[]> {
  const queryFn = useCallback(async (): Promise<EquipmentItem[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery('equipment-list', queryFn, []);
}

export function useEquipmentItem(id: string | undefined): ApiQueryResult<EquipmentItem | null> {
  const queryFn = useCallback(async (): Promise<EquipmentItem | null> => {
    // TODO: Replace with Supabase query
    return null;
  }, []);
  return useApiQuery(`equipment-${id}`, queryFn, null);
}

export function useLocationEquipment(locationId: string): ApiQueryResult<EquipmentItem[]> {
  const queryFn = useCallback(async (): Promise<EquipmentItem[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery(`equipment-location-${locationId}`, queryFn, []);
}

export function useEquipmentServiceHistory(id: string | undefined): ApiQueryResult<EquipmentServiceRecord[]> {
  const queryFn = useCallback(async (): Promise<EquipmentServiceRecord[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery(`equipment-service-history-${id}`, queryFn, []);
}

export function useEquipmentDeficiencies(id: string | undefined): ApiQueryResult<EquipmentDeficiency[]> {
  const queryFn = useCallback(async (): Promise<EquipmentDeficiency[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery(`equipment-deficiencies-${id}`, queryFn, []);
}

export function useEquipmentDocuments(id: string | undefined): ApiQueryResult<EquipmentDocument[]> {
  const queryFn = useCallback(async (): Promise<EquipmentDocument[]> => {
    // TODO: Replace with Supabase query
    return [];
  }, []);
  return useApiQuery(`equipment-documents-${id}`, queryFn, []);
}

// ── Mutations ─────────────────────────────────────────────────

export function useCreateEquipment(): ApiMutationResult<CreateEquipmentInput, EquipmentItem> {
  const mutationFn = useCallback(async (_args: CreateEquipmentInput): Promise<EquipmentItem> => {
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((args: CreateEquipmentInput): EquipmentItem => ({
    id: `eq-${Date.now()}`,
    name: args.name,
    equipmentType: args.equipmentType,
    manufacturer: args.manufacturer || '',
    model: args.model || '',
    serialNumber: args.serialNumber || '',
    installDate: args.installDate || null,
    locationId: args.locationId,
    locationName: '',
    customerName: '',
    installedArea: args.installedArea || '',
    condition: 'clean',
    status: 'active',
    lastServiceDate: null,
    nextDueDate: null,
    serviceFrequencyDays: null,
    deficiencyCount: 0,
    qrCodeId: `qr-${Date.now()}`,
    notes: args.notes || '',
    customFields: args.customFields || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }), []);

  return useApiMutation(mutationFn, demoFn);
}

export function useUpdateEquipment(): ApiMutationResult<UpdateEquipmentInput> {
  const mutationFn = useCallback(async (_args: UpdateEquipmentInput): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: UpdateEquipmentInput): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useDeleteEquipment(): ApiMutationResult<string> {
  const mutationFn = useCallback(async (_id: string): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_id: string): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useUploadEquipmentDocument(): ApiMutationResult<{ equipmentId: string; file: File; documentType: string }, EquipmentDocument> {
  const mutationFn = useCallback(async (_args: { equipmentId: string; file: File; documentType: string }): Promise<EquipmentDocument> => {
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((args: { equipmentId: string; file: File; documentType: string }): EquipmentDocument => ({
    id: `doc-${Date.now()}`,
    equipmentId: args.equipmentId,
    documentType: args.documentType as EquipmentDocument['documentType'],
    name: args.file.name,
    url: '',
    uploadDate: new Date().toISOString(),
    sizeBytes: args.file.size,
  }), []);

  return useApiMutation(mutationFn, demoFn);
}
