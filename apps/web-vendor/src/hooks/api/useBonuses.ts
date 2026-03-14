/**
 * Bonus & performance API hooks — stubbed with empty data.
 */
import { useCallback } from 'react';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from '@shared/hooks/api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface BonusConfiguration {
  id: string;
  vendorId: string;
  employeeId: string | null;
  role: string | null;
  bonusRate: number;
  isActive: boolean;
}

export interface PerformanceMetrics {
  id: string;
  employeeId: string;
  employeeName?: string;
  quarter: string;
  jobsCompleted: number;
  employeeJobRevenue: number;
  totalCompanyRevenue: number;
  callbacks: number;
  safetyViolations: number;
  noCallNoShows: number;
  verifiedComplaints: number;
  qaFirstPassRate: number | null;
  onTimeArrivalRate: number | null;
  deficiencyDocumentationRate: number | null;
  photoComplianceRate: number | null;
  averageCustomerRating: number | null;
  timecardAccuracyRate: number | null;
  availabilitySubmissionRate: number | null;
  equipmentDamageCount: number;
  equipmentLossCount: number;
  inventoryVarianceRate: number | null;
  safetyIncidents: number;
  bonusEligible: boolean;
  bonusMultiplier: number | null;
  calculatedBonus: number | null;
}

export interface BonusSummary {
  quarter: string;
  totalRevenue: number;
  totalBonuses: number;
  eligibleCount: number;
  disqualifiedCount: number;
  employees: PerformanceMetrics[];
}

export interface JobCallback {
  id: string;
  originalJobId: string;
  callbackJobId: string | null;
  employeeId: string;
  employeeName?: string;
  reason: string;
  description: string | null;
  customerReported: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CreateCallbackInput {
  originalJobId: string;
  employeeId: string;
  reason: string;
  description?: string;
  customerReported?: boolean;
}

// ── Queries ───────────────────────────────────────────────────

export function useBonusConfiguration(): ApiQueryResult<BonusConfiguration[]> {
  const queryFn = useCallback(async (): Promise<BonusConfiguration[]> => [], []);
  return useApiQuery('bonus-config', queryFn, []);
}

export function useQuarterlyMetrics(employeeId?: string, quarter?: string): ApiQueryResult<PerformanceMetrics[]> {
  const queryFn = useCallback(async (): Promise<PerformanceMetrics[]> => [], []);
  return useApiQuery(`quarterly-metrics-${employeeId || 'all'}-${quarter || 'current'}`, queryFn, []);
}

export function useCalculateBonus(employeeId: string, quarter: string): ApiQueryResult<PerformanceMetrics | null> {
  const queryFn = useCallback(async (): Promise<PerformanceMetrics | null> => null, []);
  return useApiQuery(`bonus-calc-${employeeId}-${quarter}`, queryFn, null);
}

export function useBonusSummary(quarter: string): ApiQueryResult<BonusSummary | null> {
  const queryFn = useCallback(async (): Promise<BonusSummary | null> => null, []);
  return useApiQuery(`bonus-summary-${quarter}`, queryFn, null);
}

export function useCallbacks(quarter?: string): ApiQueryResult<JobCallback[]> {
  const queryFn = useCallback(async (): Promise<JobCallback[]> => [], []);
  return useApiQuery(`callbacks-${quarter || 'all'}`, queryFn, []);
}

// ── Mutations ─────────────────────────────────────────────────

export function useCreateCallback(): ApiMutationResult<CreateCallbackInput> {
  const mutationFn = useCallback(async (_args: CreateCallbackInput): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: CreateCallbackInput): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

export function useUpdateBonusConfiguration(): ApiMutationResult<BonusConfiguration> {
  const mutationFn = useCallback(async (_args: BonusConfiguration): Promise<void> => {
    throw new Error('Not implemented');
  }, []);
  const demoFn = useCallback((_args: BonusConfiguration): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}

// ── Helpers ───────────────────────────────────────────────────

export function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

export function getQuarterDateRange(quarter: string): { start: string; end: string } {
  const [year, qStr] = quarter.split('-Q');
  const q = parseInt(qStr, 10);
  const startMonth = (q - 1) * 3;
  const start = new Date(parseInt(year, 10), startMonth, 1);
  const end = new Date(parseInt(year, 10), startMonth + 3, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export const BONUS_MULTIPLIER_METRICS = [
  { key: 'qaFirstPassRate', label: 'QA First-Pass Rate', target: 95, bonus: 0.10 },
  { key: 'onTimeArrivalRate', label: 'On-Time Arrival', target: 95, bonus: 0.05 },
  { key: 'deficiencyDocumentationRate', label: 'Deficiency Documentation', target: 100, bonus: 0.05 },
  { key: 'photoComplianceRate', label: 'Photo Compliance', target: 100, bonus: 0.05 },
  { key: 'averageCustomerRating', label: 'Customer Rating', target: 4.5, bonus: 0.10 },
  { key: 'timecardAccuracyRate', label: 'Timecard Accuracy', target: 100, bonus: 0.05 },
  { key: 'availabilitySubmissionRate', label: 'Availability Submitted', target: 100, bonus: 0.05 },
  { key: 'equipmentCare', label: 'Equipment Care', target: 0, bonus: 0.05 },
  { key: 'inventoryVarianceRate', label: 'Inventory Accuracy', target: 2, bonus: 0.05 },
  { key: 'safetyIncidents', label: 'Safety Record', target: 0, bonus: 0.10 },
] as const;

export const BONUS_KILLERS = [
  { key: 'callbacks', label: 'Callback Required' },
  { key: 'safetyViolations', label: 'Safety Violation' },
  { key: 'noCallNoShows', label: 'No-Call No-Show' },
  { key: 'verifiedComplaints', label: 'Verified Customer Complaint' },
] as const;
