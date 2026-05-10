/**
 * Equipment API hooks — reads wired to Supabase, mutations stubbed.
 *
 * Tables: equipment, equipment_service_records, equipment_deficiencies,
 *         equipment_documents (created in migration 20260814000000).
 * RLS scopes all reads to the authenticated user's organization.
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
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

// ── Row Mappers (snake_case DB → camelCase TS) ───────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEquipmentRow(row: any): EquipmentItem {
  return {
    id: row.id,
    name: row.name,
    equipmentType: row.equipment_type,
    manufacturer: row.manufacturer ?? '',
    model: row.model ?? '',
    serialNumber: row.serial_number ?? '',
    installDate: row.install_date ?? null,
    locationId: row.location_id,
    locationName: row.location_name ?? '',
    customerName: row.customer_name ?? '',
    installedArea: row.installed_area ?? '',
    condition: row.condition as EquipmentCondition,
    status: row.status as EquipmentStatus,
    lastServiceDate: row.last_service_date ?? null,
    nextDueDate: row.next_due_date ?? null,
    serviceFrequencyDays: row.service_frequency_days ?? null,
    deficiencyCount: row.deficiency_count ?? 0,
    qrCodeId: row.qr_code_id,
    notes: row.notes ?? '',
    customFields: row.custom_fields ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapServiceRow(row: any): EquipmentServiceRecord {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    serviceDate: row.service_date,
    serviceType: row.service_type,
    technicianName: row.technician_name ?? '',
    conditionBefore: row.condition_before as EquipmentCondition,
    conditionAfter: row.condition_after as EquipmentCondition,
    durationMinutes: row.duration_minutes ?? null,
    notes: row.notes ?? '',
    certificateNumber: row.certificate_number ?? null,
    photoUrls: row.photo_urls ?? [],
    cost: row.cost != null ? Number(row.cost) : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDeficiencyRow(row: any): EquipmentDeficiency {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    severity: row.severity,
    code: row.code,
    title: row.title,
    description: row.description ?? '',
    status: row.status,
    foundDate: row.found_date,
    resolvedDate: row.resolved_date ?? null,
    resolvedBy: row.resolved_by ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDocumentRow(row: any): EquipmentDocument {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    documentType: row.document_type,
    name: row.name,
    url: row.storage_path,
    uploadDate: row.uploaded_at,
    sizeBytes: Number(row.size_bytes) || 0,
  };
}

// ── Queries ───────────────────────────────────────────────────

export function useEquipment(filters?: EquipmentFilters): ApiQueryResult<EquipmentItem[]> {
  const { equipmentType, condition, status, search, locationId } = filters ?? {};

  const cacheKey = [
    'equipment-list',
    equipmentType ?? '',
    condition ?? '',
    status ?? '',
    search ?? '',
    locationId ?? '',
  ].join(':');

  const queryFn = useCallback(async (): Promise<EquipmentItem[]> => {
    let query = supabase
      .from('equipment')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (equipmentType) query = query.eq('equipment_type', equipmentType);
    if (condition) query = query.eq('condition', condition);
    if (status) query = query.eq('status', status);
    if (locationId) query = query.eq('location_id', locationId);
    if (search) {
      const q = `%${search}%`;
      query = query.or(`name.ilike.${q},customer_name.ilike.${q},location_name.ilike.${q},serial_number.ilike.${q}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapEquipmentRow);
  }, [equipmentType, condition, status, search, locationId]);

  return useApiQuery(cacheKey, queryFn, []);
}

export function useEquipmentItem(id: string | undefined): ApiQueryResult<EquipmentItem | null> {
  const queryFn = useCallback(async (): Promise<EquipmentItem | null> => {
    if (!id) return null;
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .is('archived_at', null)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null; // not found
      throw error;
    }
    return data ? mapEquipmentRow(data) : null;
  }, [id]);

  return useApiQuery(`equipment-${id}`, queryFn, null);
}

export function useLocationEquipment(locationId: string): ApiQueryResult<EquipmentItem[]> {
  const queryFn = useCallback(async (): Promise<EquipmentItem[]> => {
    if (!locationId) return [];
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('location_id', locationId)
      .is('archived_at', null)
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapEquipmentRow);
  }, [locationId]);

  return useApiQuery(`equipment-location-${locationId}`, queryFn, []);
}

export function useEquipmentServiceHistory(id: string | undefined): ApiQueryResult<EquipmentServiceRecord[]> {
  const queryFn = useCallback(async (): Promise<EquipmentServiceRecord[]> => {
    if (!id) return [];
    const { data, error } = await supabase
      .from('equipment_service_records')
      .select('*')
      .eq('equipment_id', id)
      .order('service_date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapServiceRow);
  }, [id]);

  return useApiQuery(`equipment-service-history-${id}`, queryFn, []);
}

export function useEquipmentDeficiencies(id: string | undefined): ApiQueryResult<EquipmentDeficiency[]> {
  const queryFn = useCallback(async (): Promise<EquipmentDeficiency[]> => {
    if (!id) return [];
    const { data, error } = await supabase
      .from('equipment_deficiencies')
      .select('*')
      .eq('equipment_id', id)
      .order('found_date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapDeficiencyRow);
  }, [id]);

  return useApiQuery(`equipment-deficiencies-${id}`, queryFn, []);
}

export function useEquipmentDocuments(id: string | undefined): ApiQueryResult<EquipmentDocument[]> {
  const queryFn = useCallback(async (): Promise<EquipmentDocument[]> => {
    if (!id) return [];
    const { data, error } = await supabase
      .from('equipment_documents')
      .select('*')
      .eq('equipment_id', id)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapDocumentRow);
  }, [id]);

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
