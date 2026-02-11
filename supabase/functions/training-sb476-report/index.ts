/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ReportRequest {
  organization_id: string;
  location_id?: string;
  start_date?: string;
  end_date?: string;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const body: ReportRequest = await req.json();

  let query = supabase
    .from('training_sb476_log')
    .select('*, training_enrollments!inner(course_id, training_courses(title))')
    .order('hire_date', { ascending: false });

  if (body.location_id) {
    query = query.eq('location_id', body.location_id);
  }
  if (body.start_date) {
    query = query.gte('hire_date', body.start_date);
  }
  if (body.end_date) {
    query = query.lte('hire_date', body.end_date);
  }

  const { data: entries, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch SB 476 data', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const records = entries || [];

  // Aggregate statistics
  const totalTrainingCosts = records.reduce((s, r) => s + r.training_cost_cents, 0);
  const totalCompensation = records.reduce((s, r) => s + r.total_compensation_cents, 0);
  const totalCompensableHours = records.reduce((s, r) => s + Number(r.compensable_hours), 0);
  const compliantCount = records.filter(r => r.completed_within_30_days).length;
  const nonCompliantCount = records.filter(r => !r.completed_within_30_days).length;
  const pendingCount = records.filter(r => !r.training_completed_date).length;
  const duringWorkHours = records.filter(r => r.training_during_work_hours).length;
  const relievedOfDuties = records.filter(r => r.employee_relieved_of_duties).length;

  // Per-location breakdown
  const locationMap: Record<string, {
    location_id: string;
    total: number;
    compliant: number;
    non_compliant: number;
    pending: number;
    total_cost_cents: number;
    total_compensation_cents: number;
  }> = {};

  for (const r of records) {
    const loc = r.location_id || 'unknown';
    if (!locationMap[loc]) {
      locationMap[loc] = { location_id: loc, total: 0, compliant: 0, non_compliant: 0, pending: 0, total_cost_cents: 0, total_compensation_cents: 0 };
    }
    locationMap[loc].total++;
    if (r.completed_within_30_days) locationMap[loc].compliant++;
    else if (!r.training_completed_date) locationMap[loc].pending++;
    else locationMap[loc].non_compliant++;
    locationMap[loc].total_cost_cents += r.training_cost_cents;
    locationMap[loc].total_compensation_cents += r.total_compensation_cents;
  }

  // Non-compliant employees detail
  const nonCompliantEmployees = records
    .filter(r => !r.completed_within_30_days && r.training_completed_date)
    .map(r => ({
      employee_id: r.employee_id,
      hire_date: r.hire_date,
      training_completed_date: r.training_completed_date,
      days_to_complete: Math.ceil(
        (new Date(r.training_completed_date).getTime() - new Date(r.hire_date).getTime()) / 86400000
      ),
    }));

  return new Response(JSON.stringify({
    report_date: new Date().toISOString(),
    period: {
      start: body.start_date || 'all',
      end: body.end_date || 'all',
    },
    summary: {
      total_employees: records.length,
      compliant: compliantCount,
      non_compliant: nonCompliantCount,
      pending: pendingCount,
      compliance_rate: records.length > 0 ? +((compliantCount / records.length) * 100).toFixed(1) : 0,
      total_training_costs_cents: totalTrainingCosts,
      total_compensation_cents: totalCompensation,
      total_compensable_hours: +totalCompensableHours.toFixed(1),
      training_during_work_hours: duringWorkHours,
      employees_relieved_of_duties: relievedOfDuties,
    },
    by_location: Object.values(locationMap),
    non_compliant_employees: nonCompliantEmployees,
    entries: records,
  }), { headers: { 'Content-Type': 'application/json' } });
});
