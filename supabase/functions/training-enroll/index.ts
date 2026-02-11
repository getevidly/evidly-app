/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface EnrollRequest {
  employee_id: string;
  course_id: string;
  location_id: string;
  enrolled_by: string;
  enrollment_reason: 'new_hire' | 'expiring_cert' | 'failed_checklist' | 'regulatory_change' | 'manual' | 'manager_assigned';
  expires_at?: string;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const body: EnrollRequest = await req.json();

  // Validate course exists and is active
  const { data: course, error: courseErr } = await supabase
    .from('training_courses')
    .select('id, title, is_active, max_attempts')
    .eq('id', body.course_id)
    .single();

  if (courseErr || !course) {
    return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }
  if (!course.is_active) {
    return new Response(JSON.stringify({ error: 'Course is not active' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Check for existing active enrollment
  const { data: existing } = await supabase
    .from('training_enrollments')
    .select('id, status')
    .eq('employee_id', body.employee_id)
    .eq('course_id', body.course_id)
    .in('status', ['not_started', 'in_progress'])
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ error: 'Employee already has an active enrollment', enrollment_id: existing.id }), { status: 409, headers: { 'Content-Type': 'application/json' } });
  }

  // Create enrollment
  const { data: enrollment, error: enrollErr } = await supabase
    .from('training_enrollments')
    .insert({
      employee_id: body.employee_id,
      course_id: body.course_id,
      location_id: body.location_id,
      enrolled_by: body.enrolled_by,
      enrollment_reason: body.enrollment_reason,
      status: 'not_started',
      expires_at: body.expires_at || null,
    })
    .select()
    .single();

  if (enrollErr) {
    return new Response(JSON.stringify({ error: 'Failed to create enrollment', details: enrollErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // For food handler enrollments in CA, create SB 476 log entry
  if (body.enrollment_reason === 'new_hire') {
    const { data: employee } = await supabase
      .from('user_profiles')
      .select('hire_date')
      .eq('id', body.employee_id)
      .maybeSingle();

    if (employee?.hire_date) {
      await supabase.from('training_sb476_log').insert({
        employee_id: body.employee_id,
        enrollment_id: enrollment.id,
        location_id: body.location_id,
        hire_date: employee.hire_date,
        training_during_work_hours: true,
        employee_relieved_of_duties: true,
      });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    enrollment_id: enrollment.id,
    course_title: course.title,
    status: 'not_started',
  }), { headers: { 'Content-Type': 'application/json' } });
});
