/**
 * useInsurance — API hooks for company insurance, vehicle insurance, and roadside assistance.
 * All hooks return empty data until Supabase tables are populated.
 */
import { useApiQuery, useApiMutation } from '@shared/hooks/api/useApiQuery';

// ── Types ──────────────────────────────────────────────────

export type CompanyPolicyType = 'general_liability' | 'workers_comp' | 'professional_liability' | 'property' | 'cyber' | 'umbrella';
export type VehiclePolicyType = 'liability' | 'collision' | 'comprehensive' | 'commercial_auto' | 'umbrella';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type CoverageType = 'basic' | 'plus' | 'premier';

export interface CompanyInsurance {
  id: string;
  vendorId: string;
  policyType: CompanyPolicyType;
  insuranceCompany: string;
  policyNumber: string;
  coverageAmount: number | null;
  aggregateLimit: number | null;
  deductible: number | null;
  effectiveDate: string;
  expiryDate: string;
  premiumAmount: number | null;
  paymentFrequency: PaymentFrequency | null;
  agentName: string | null;
  agentCompany: string | null;
  agentPhone: string | null;
  agentEmail: string | null;
  policyDocumentUrl: string | null;
  certificateOfInsuranceUrl: string | null;
  experienceModRate: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface VehicleInsurance {
  id: string;
  vendorId: string;
  vehicleId: string | null;
  policyType: VehiclePolicyType;
  insuranceCompany: string;
  policyNumber: string;
  coverageAmount: number | null;
  deductible: number | null;
  effectiveDate: string;
  expiryDate: string;
  premiumAmount: number | null;
  paymentFrequency: PaymentFrequency | null;
  agentName: string | null;
  agentPhone: string | null;
  agentEmail: string | null;
  policyDocumentUrl: string | null;
  insuranceCardUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface RoadsideAssistance {
  id: string;
  vendorId: string;
  providerName: string;
  membershipNumber: string | null;
  phoneNumber: string;
  phoneNumberAlt: string | null;
  website: string | null;
  appName: string | null;
  coverageType: CoverageType | null;
  towingMilesIncluded: number | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  vehiclesCovered: string[];
  membershipCardUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface EmergencyInfo {
  roadsideAssistance: RoadsideAssistance[];
  autoInsurance: VehicleInsurance[];
  companyContacts: { role: string; name: string; phone: string }[];
  assignedVehicle: {
    name: string;
    vin: string | null;
    licensePlate: string | null;
    registrationExpiry: string | null;
  } | null;
}

export interface CreateCompanyInsuranceInput {
  policyType: CompanyPolicyType;
  insuranceCompany: string;
  policyNumber: string;
  coverageAmount?: number;
  aggregateLimit?: number;
  deductible?: number;
  effectiveDate: string;
  expiryDate: string;
  premiumAmount?: number;
  paymentFrequency?: PaymentFrequency;
  agentName?: string;
  agentCompany?: string;
  agentPhone?: string;
  agentEmail?: string;
  experienceModRate?: number;
}

export interface CreateVehicleInsuranceInput {
  vehicleId?: string;
  policyType: VehiclePolicyType;
  insuranceCompany: string;
  policyNumber: string;
  coverageAmount?: number;
  deductible?: number;
  effectiveDate: string;
  expiryDate: string;
  premiumAmount?: number;
  paymentFrequency?: PaymentFrequency;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
}

export interface CreateRoadsideInput {
  providerName: string;
  phoneNumber: string;
  membershipNumber?: string;
  phoneNumberAlt?: string;
  website?: string;
  appName?: string;
  coverageType?: CoverageType;
  towingMilesIncluded?: number;
  effectiveDate?: string;
  expiryDate?: string;
}

// ── Query hooks ────────────────────────────────────────────

export function useCompanyInsurance() {
  return useApiQuery<CompanyInsurance[]>(
    ['company-insurance'],
    async () => [],
    { staleTime: 60_000 },
  );
}

export function useVehicleInsurance(vehicleId?: string) {
  return useApiQuery<VehicleInsurance[]>(
    ['vehicle-insurance', vehicleId],
    async () => [],
    { staleTime: 60_000 },
  );
}

export function useRoadsideAssistance() {
  return useApiQuery<RoadsideAssistance[]>(
    ['roadside-assistance'],
    async () => [],
    { staleTime: 60_000 },
  );
}

export function useInsurancePolicy(id: string | undefined) {
  return useApiQuery<CompanyInsurance | VehicleInsurance | null>(
    ['insurance-policy', id],
    async () => null,
    { enabled: !!id },
  );
}

export function useEmergencyInfo() {
  return useApiQuery<EmergencyInfo>(
    ['emergency-info'],
    async () => ({
      roadsideAssistance: [],
      autoInsurance: [],
      companyContacts: [],
      assignedVehicle: null,
    }),
    { staleTime: 30_000 },
  );
}

// ── Mutation hooks ─────────────────────────────────────────

export function useCreateInsurancePolicy() {
  return useApiMutation<CompanyInsurance | VehicleInsurance, CreateCompanyInsuranceInput | CreateVehicleInsuranceInput>(
    async (_input) => { throw new Error('Not implemented — Supabase table required'); },
    { invalidateKeys: [['company-insurance'], ['vehicle-insurance']] },
  );
}

export function useUpdateInsurancePolicy() {
  return useApiMutation<CompanyInsurance | VehicleInsurance, { id: string } & Partial<CreateCompanyInsuranceInput & CreateVehicleInsuranceInput>>(
    async (_input) => { throw new Error('Not implemented — Supabase table required'); },
    { invalidateKeys: [['company-insurance'], ['vehicle-insurance']] },
  );
}

export function useCreateRoadsideAssistance() {
  return useApiMutation<RoadsideAssistance, CreateRoadsideInput>(
    async (_input) => { throw new Error('Not implemented — Supabase table required'); },
    { invalidateKeys: [['roadside-assistance']] },
  );
}
