/**
 * useVehicles — API hooks for fleet management (vehicles, maintenance, incidents).
 * All hooks return empty data until Supabase tables are populated.
 */
import { useApiQuery, useApiMutation } from '@shared/hooks/api/useApiQuery';

// ── Types ──────────────────────────────────────────────────

export type VehicleType = 'truck' | 'van' | 'trailer';
export type VehicleStatus = 'active' | 'maintenance' | 'out_of_service' | 'sold';
export type MaintenanceType = 'oil_change' | 'tires' | 'brakes' | 'inspection' | 'repair' | 'other';
export type IncidentType = 'accident' | 'breakdown' | 'theft' | 'vandalism' | 'citation';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface Vehicle {
  id: string;
  vendorId: string;
  name: string;
  vehicleType: VehicleType;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  vin: string | null;
  licensePlate: string | null;
  licenseState: string | null;
  status: VehicleStatus;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  currentOdometer: number | null;
  odometerUpdatedAt: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  purchaseOdometer: number | null;
  registrationExpiry: string | null;
  registrationDocumentUrl: string | null;
  lastInspectionDate: string | null;
  nextInspectionDue: string | null;
  inspectionDocumentUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleMaintenance {
  id: string;
  vehicleId: string;
  maintenanceType: MaintenanceType;
  description: string;
  serviceDate: string;
  odometerReading: number | null;
  serviceProvider: string | null;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  nextServiceDate: string | null;
  nextServiceOdometer: number | null;
  receiptUrl: string | null;
  loggedBy: string | null;
  createdAt: string;
}

export interface VehicleIncident {
  id: string;
  vehicleId: string;
  employeeId: string | null;
  incidentType: IncidentType;
  incidentDate: string;
  incidentTime: string | null;
  location: string | null;
  description: string;
  policeReportNumber: string | null;
  citationNumber: string | null;
  damageDescription: string | null;
  estimatedRepairCost: number | null;
  actualRepairCost: number | null;
  insuranceClaimFiled: boolean;
  insuranceClaimNumber: string | null;
  insuranceClaimStatus: string | null;
  thirdPartyInvolved: boolean;
  thirdPartyName: string | null;
  photos: string[];
  status: IncidentStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface VehicleFilters {
  vehicleType?: VehicleType;
  status?: VehicleStatus;
  search?: string;
}

export interface CreateVehicleInput {
  name: string;
  vehicleType: VehicleType;
  year?: number;
  make?: string;
  model?: string;
  color?: string;
  vin?: string;
  licensePlate?: string;
  licenseState?: string;
  assignedEmployeeId?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  registrationExpiry?: string;
  notes?: string;
}

export interface LogMaintenanceInput {
  vehicleId: string;
  maintenanceType: MaintenanceType;
  description: string;
  serviceDate: string;
  odometerReading?: number;
  serviceProvider?: string;
  partsCost?: number;
  laborCost?: number;
  nextServiceDate?: string;
  nextServiceOdometer?: number;
}

export interface ReportIncidentInput {
  vehicleId: string;
  incidentType: IncidentType;
  incidentDate: string;
  incidentTime?: string;
  location?: string;
  description: string;
  employeeId?: string;
}

// ── Query hooks ────────────────────────────────────────────

export function useVehicles(filters?: VehicleFilters) {
  return useApiQuery<Vehicle[]>(
    ['vehicles', filters],
    async () => [],
    { staleTime: 60_000 },
  );
}

export function useVehicle(id: string | undefined) {
  return useApiQuery<Vehicle | null>(
    ['vehicle', id],
    async () => null,
    { enabled: !!id },
  );
}

export function useVehicleMaintenance(vehicleId: string | undefined) {
  return useApiQuery<VehicleMaintenance[]>(
    ['vehicle-maintenance', vehicleId],
    async () => [],
    { enabled: !!vehicleId },
  );
}

export function useVehicleIncidents(vehicleId: string | undefined) {
  return useApiQuery<VehicleIncident[]>(
    ['vehicle-incidents', vehicleId],
    async () => [],
    { enabled: !!vehicleId },
  );
}

// ── Mutation hooks ─────────────────────────────────────────

export function useCreateVehicle() {
  return useApiMutation<Vehicle, CreateVehicleInput>(
    async (_input) => { throw new Error('Not implemented — Supabase table required'); },
    { invalidateKeys: [['vehicles']] },
  );
}

export function useUpdateVehicle() {
  return useApiMutation<Vehicle, { id: string } & Partial<CreateVehicleInput>>(
    async (_input) => { throw new Error('Not implemented — Supabase table required'); },
    { invalidateKeys: [['vehicles']] },
  );
}

export function useLogMaintenance() {
  return useApiMutation<VehicleMaintenance, LogMaintenanceInput>(
    async (_input) => { throw new Error('Not implemented — Supabase table required'); },
    { invalidateKeys: [['vehicle-maintenance']] },
  );
}

export function useReportVehicleIncident() {
  return useApiMutation<VehicleIncident, ReportIncidentInput>(
    async (_input) => { throw new Error('Not implemented — Supabase table required'); },
    { invalidateKeys: [['vehicle-incidents']] },
  );
}
