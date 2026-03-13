/**
 * Equipment incidents & safety incident report hooks — stubbed with empty data.
 */
import { useCallback } from 'react';
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

// ── Equipment Incident Queries ────────────────────────────────

export function useEquipmentIncidents(filters?: EquipmentIncidentFilters): ApiQueryResult<EquipmentIncident[]> {
  const queryFn = useCallback(async (): Promise<EquipmentIncident[]> => [], []);
  return useApiQuery(`equipment-incidents-${JSON.stringify(filters || {})}`, queryFn, []);
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
  const queryFn = useCallback(async (): Promise<IncidentReport[]> => [], []);
  return useApiQuery(`incident-reports-${JSON.stringify(filters || {})}`, queryFn, []);
}

export function useIncidentReport(id: string): ApiQueryResult<IncidentReport | null> {
  const queryFn = useCallback(async (): Promise<IncidentReport | null> => null, []);
  return useApiQuery(`incident-report-${id}`, queryFn, null);
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
