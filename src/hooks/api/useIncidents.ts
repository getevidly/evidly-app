/**
 * Equipment incidents & safety incident report hooks.
 *
 * Reads from the `incidents` table, org-scoped.
 * Mutations remain stubs until write paths are built.
 */
import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from './useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export type EquipmentIncidentType = 'damage' | 'loss' | 'theft' | 'malfunction';
export type SafetyIncidentType = 'injury' | 'near_miss' | 'property_damage' | 'vehicle_accident' | 'chemical_exposure';
export type IncidentSeverity = 'minor' | 'moderate' | 'serious' | 'critical';
export type IncidentReportStatus = 'reported' | 'investigating' | 'resolved' | 'closed';

export interface EquipmentIncident {
  id: string;
  employeeId: string;
  employeeName?: string;
  incidentType: EquipmentIncidentType;
  equipmentName: string;
  equipmentId: string | null;
  serialNumber: string | null;
  description: string;
  incidentDate: string;
  location: string | null;
  estimatedCost: number | null;
  photos: string[];
  resolution: string | null;
  resolvedAt: string | null;
  impactsBonus: boolean;
  createdAt: string;
}

export interface IncidentReport {
  id: string;
  reportedBy: string;
  reportedByName?: string;
  incidentType: SafetyIncidentType;
  severity: IncidentSeverity;
  incidentDate: string;
  incidentTime: string | null;
  location: string;
  jobId: string | null;
  injuredEmployeeId: string | null;
  injuredEmployeeName?: string;
  thirdPartyInvolved: boolean;
  thirdPartyName: string | null;
  description: string;
  immediateActions: string | null;
  witnesses: string | null;
  photos: string[];
  medicalAttentionRequired: boolean;
  medicalFacility: string | null;
  workersCompFiled: boolean;
  workersCompClaimNumber: string | null;
  rootCause: string | null;
  preventiveMeasures: string | null;
  investigatedBy: string | null;
  investigatedAt: string | null;
  status: IncidentReportStatus;
  causedByNegligence: boolean;
  createdAt: string;
}

export interface EquipmentIncidentFilters {
  incidentType?: EquipmentIncidentType;
  employeeId?: string;
  resolved?: boolean;
}

export interface SafetyIncidentFilters {
  incidentType?: SafetyIncidentType;
  severity?: IncidentSeverity;
  status?: IncidentReportStatus;
}

export interface CreateEquipmentIncidentInput {
  incidentType: EquipmentIncidentType;
  equipmentName: string;
  equipmentId?: string;
  serialNumber?: string;
  description: string;
  incidentDate: string;
  location?: string;
  estimatedCost?: number;
}

export interface CreateIncidentReportInput {
  incidentType: SafetyIncidentType;
  severity: IncidentSeverity;
  incidentDate: string;
  incidentTime?: string;
  location: string;
  jobId?: string;
  injuredEmployeeId?: string;
  thirdPartyInvolved?: boolean;
  thirdPartyName?: string;
  description: string;
  immediateActions?: string;
  witnesses?: string;
  medicalAttentionRequired?: boolean;
  medicalFacility?: string;
}

export interface InvestigateInput {
  id: string;
  rootCause: string;
  preventiveMeasures: string;
  causedByNegligence: boolean;
}

// ── Row mappers ───────────────────────────────────────────────

function mapEquipmentIncident(row: any): EquipmentIncident {
  return {
    id: row.id,
    employeeId: row.reported_by || '',
    incidentType: (row.type || 'malfunction') as EquipmentIncidentType,
    equipmentName: row.title || '',
    equipmentId: null,
    serialNumber: null,
    description: row.description || row.title || '',
    incidentDate: row.created_at,
    location: row.location_name || null,
    estimatedCost: null,
    photos: row.photos || [],
    resolution: row.resolution_summary || null,
    resolvedAt: row.resolved_at || null,
    impactsBonus: false,
    createdAt: row.created_at,
  };
}

function mapIncidentReport(row: any): IncidentReport {
  return {
    id: row.id,
    reportedBy: row.reported_by || '',
    incidentType: (row.type || 'near_miss') as SafetyIncidentType,
    severity: (row.severity || 'minor') as IncidentSeverity,
    incidentDate: row.created_at,
    incidentTime: null,
    location: row.location_name || '',
    jobId: null,
    injuredEmployeeId: null,
    thirdPartyInvolved: false,
    thirdPartyName: null,
    description: row.description || row.title || '',
    immediateActions: row.corrective_action || null,
    witnesses: null,
    photos: row.photos || [],
    medicalAttentionRequired: false,
    medicalFacility: null,
    workersCompFiled: false,
    workersCompClaimNumber: null,
    rootCause: row.root_cause || null,
    preventiveMeasures: null,
    investigatedBy: null,
    investigatedAt: null,
    status: (row.status || 'reported') as IncidentReportStatus,
    causedByNegligence: false,
    createdAt: row.created_at,
  };
}

const INCIDENT_COLS = 'id, title, description, type, severity, status, category, location_name, reported_by, assigned_to, created_at, resolved_at, corrective_action, resolution_summary, root_cause, photos';

// ── Equipment Incident Queries ────────────────────────────────

export function useEquipmentIncidents(filters?: EquipmentIncidentFilters): ApiQueryResult<EquipmentIncident[]> {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const queryFn = useCallback(async (): Promise<EquipmentIncident[]> => {
    if (!orgId) return [];
    let query = supabase
      .from('incidents')
      .select(INCIDENT_COLS)
      .eq('organization_id', orgId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (filters?.incidentType) query = query.eq('type', filters.incidentType);
    if (filters?.employeeId) query = query.eq('reported_by', filters.employeeId);
    if (filters?.resolved === true) query = query.not('resolved_at', 'is', null);
    if (filters?.resolved === false) query = query.is('resolved_at', null);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapEquipmentIncident);
  }, [orgId, filters?.incidentType, filters?.employeeId, filters?.resolved]);

  return useApiQuery(`equipment-incidents-${orgId}-${JSON.stringify(filters || {})}`, queryFn, []);
}

export function useCreateEquipmentIncident(): ApiMutationResult<CreateEquipmentIncidentInput> {
  const mutationFn = useCallback(async (_args: CreateEquipmentIncidentInput): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: CreateEquipmentIncidentInput): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useResolveEquipmentIncident(): ApiMutationResult<{ id: string; resolution: string }> {
  const mutationFn = useCallback(async (_args: { id: string; resolution: string }): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: { id: string; resolution: string }): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

// ── Safety Incident Report Queries ────────────────────────────

export function useIncidentReports(filters?: SafetyIncidentFilters): ApiQueryResult<IncidentReport[]> {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const queryFn = useCallback(async (): Promise<IncidentReport[]> => {
    if (!orgId) return [];
    let query = supabase
      .from('incidents')
      .select(INCIDENT_COLS)
      .eq('organization_id', orgId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (filters?.incidentType) query = query.eq('type', filters.incidentType);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapIncidentReport);
  }, [orgId, filters?.incidentType, filters?.severity, filters?.status]);

  return useApiQuery(`incident-reports-${orgId}-${JSON.stringify(filters || {})}`, queryFn, []);
}

export function useIncidentReport(id: string): ApiQueryResult<IncidentReport | null> {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const queryFn = useCallback(async (): Promise<IncidentReport | null> => {
    if (!id || !orgId) return null;
    const { data, error } = await supabase
      .from('incidents')
      .select(INCIDENT_COLS)
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapIncidentReport(data) : null;
  }, [id, orgId]);

  return useApiQuery(`incident-report-${orgId}-${id}`, queryFn, null);
}

export function useCreateIncidentReport(): ApiMutationResult<CreateIncidentReportInput> {
  const mutationFn = useCallback(async (_args: CreateIncidentReportInput): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: CreateIncidentReportInput): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useUpdateIncidentReport(): ApiMutationResult<Partial<IncidentReport> & { id: string }> {
  const mutationFn = useCallback(async (_args: Partial<IncidentReport> & { id: string }): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: Partial<IncidentReport> & { id: string }): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useInvestigateIncident(): ApiMutationResult<InvestigateInput> {
  const mutationFn = useCallback(async (_args: InvestigateInput): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: InvestigateInput): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}
