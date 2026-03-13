/**
 * Employee API hooks — stubbed with demo data.
 *
 * When Supabase `employees` table is ready, replace the queryFn
 * implementations with real queries. The hook signatures stay the same.
 */

import { useCallback } from 'react';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from './useApiQuery';
import {
  DEMO_EMPLOYEES,
  type Employee,
  type EmployeeRole,
} from '../../data/employeesDemoData';

// ── Queries ───────────────────────────────────────────────────

/** Fetch all employees for the current org. */
export function useEmployees(): ApiQueryResult<Employee[]> {
  const queryFn = useCallback(async (): Promise<Employee[]> => {
    // TODO: Replace with Supabase query
    // const { data } = await supabase.from('employees').select('*').eq('org_id', orgId);
    return DEMO_EMPLOYEES;
  }, []);

  return useApiQuery('employees', queryFn, DEMO_EMPLOYEES);
}

/** Fetch a single employee by ID. */
export function useEmployee(id: string | undefined): ApiQueryResult<Employee | null> {
  const demoEmployee = DEMO_EMPLOYEES.find(e => e.id === id) ?? null;

  const queryFn = useCallback(async (): Promise<Employee | null> => {
    if (!id) return null;
    // TODO: Replace with Supabase query
    // const { data } = await supabase.from('employees').select('*').eq('id', id).single();
    return demoEmployee;
  }, [id, demoEmployee]);

  return useApiQuery(`employee-${id}`, queryFn, demoEmployee);
}

// ── Mutations ─────────────────────────────────────────────────

interface InviteArgs {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  hourlyRate: number;
  serviceTypes: string[];
}

/** Invite a new employee (creates with status='pending'). */
export function useInviteEmployee(): ApiMutationResult<InviteArgs, Employee> {
  const mutationFn = useCallback(async (args: InviteArgs): Promise<Employee> => {
    // TODO: Replace with Supabase insert + invite email via edge function
    throw new Error('Not implemented — Supabase table not yet created');
  }, []);

  const demoFn = useCallback((args: InviteArgs): Employee => ({
    id: `d-new-${Date.now()}`,
    firstName: args.firstName,
    lastName: args.lastName,
    name: `${args.firstName} ${args.lastName}`,
    email: args.email,
    phone: args.phone,
    role: args.role,
    status: 'pending',
    avatarUrl: null,
    locationId: 'downtown',
    locationName: 'Downtown Kitchen',
    hireDate: new Date().toISOString().slice(0, 10),
    hourlyRate: args.hourlyRate,
    serviceTypes: args.serviceTypes,
    lastLogin: null,
    clockState: 'off',
    clockSince: null,
    jobLocation: null,
    hoursThisWeek: 0,
    jobsAssignedThisWeek: 0,
    certifications: [],
    performance: {
      jobsAllTime: 0, jobsThisMonth: 0, avgQaScore: 0, deficienciesDocumented: 0,
      customerCompliments: 0, onTimeRate: 0, pointsEarned: 0, leaderboardPosition: 10,
      achievements: [], weeklyJobs: [0, 0, 0, 0, 0, 0, 0, 0], weeklyQaScores: [],
    },
  }), []);

  return useApiMutation(mutationFn, demoFn);
}

/** Resend an invite email to a pending employee. */
export function useResendInvite(): ApiMutationResult<string> {
  const mutationFn = useCallback(async (employeeId: string): Promise<void> => {
    // TODO: Call Supabase edge function to resend invite
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((_employeeId: string): void => {
    // no-op in demo — UI shows alert
  }, []);

  return useApiMutation(mutationFn, demoFn);
}

/** Deactivate an employee (set status='inactive'). */
export function useDeactivateEmployee(): ApiMutationResult<string> {
  const mutationFn = useCallback(async (employeeId: string): Promise<void> => {
    // TODO: await supabase.from('employees').update({ status: 'inactive' }).eq('id', employeeId);
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((_employeeId: string): void => {
    // no-op in demo — page handles local state
  }, []);

  return useApiMutation(mutationFn, demoFn);
}
