/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AutoEnrollRequest {
  trigger: 'new_employee' | 'daily_check';
  employee_id?: string;
  location_id?: string;
}

// Jurisdiction-based required certifications
const JURISDICTION_REQUIREMENTS: Record<string, { role: string; cert_type: string; course_category: string; deadline_days: number; validity_years: number }[]> = {
  CA: [
    { role: 'all', cert_type: 'food_handler', course_category: 'food_safety_handler', deadline_days: 30, validity_years: 3 },
    { role: 'manager', cert_type: 'food_manager', course_category: 'food_safety_manager', deadline_days: 0, validity_years: 5 },
  ],
  TX: [
    { role: 'all', cert_type: 'food_handler', course_category: 'food_safety_handler', deadline_days: 60, validity_years: 2 },
  ],
  NY: [
    { role: 'all', cert_type: 'food_handler', course_category: 'food_safety_handler', deadline_days: 0, validity_years: 3 },
  ],
};

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const body: AutoEnrollRequest = await req.json();
  const results: { action: string; employee_id: string; detail: string }[] = [];

  if (body.trigger === 'new_employee' && body.employee_id && body.location_id) {
    // ── New Employee Auto-Enrollment ────────────────────────────
    const enrollments = await autoEnrollEmployee(supabase, body.employee_id, body.location_id);
    results.push(...enrollments);

  } else if (body.trigger === 'daily_check') {
    // ── Daily Expiration & Deadline Check ────────────────────────
    const now = new Date();

    // 1. Check expiring certifications (60/30/14/7 days)
    for (const daysOut of [60, 30, 14, 7]) {
      const checkDate = new Date(now.getTime() + daysOut * 86400000).toISOString().split('T')[0];
      const { data: expiringCerts } = await supabase
        .from('training_certificates')
        .select('employee_id, course_id, certificate_type, expires_at')
        .gte('expires_at', checkDate + 'T00:00:00Z')
        .lt('expires_at', checkDate + 'T23:59:59Z')
        .is('revoked_at', null);

      for (const cert of expiringCerts || []) {
        // Check if already enrolled in renewal
        const { data: existing } = await supabase
          .from('training_enrollments')
          .select('id')
          .eq('employee_id', cert.employee_id)
          .eq('course_id', cert.course_id)
          .in('status', ['not_started', 'in_progress'])
          .maybeSingle();

        if (!existing) {
          const { data: enrollment } = await supabase
            .from('training_enrollments')
            .insert({
              employee_id: cert.employee_id,
              course_id: cert.course_id,
              enrollment_reason: 'expiring_cert',
              status: 'not_started',
              expires_at: cert.expires_at,
            })
            .select('id')
            .single();

          results.push({
            action: `auto_enroll_renewal_${daysOut}d`,
            employee_id: cert.employee_id,
            detail: `Certificate expires in ${daysOut} days, enrolled in renewal. Enrollment: ${enrollment?.id}`,
          });
        }
      }
    }

    // 2. Check employees with incomplete training past deadlines
    const { data: overdueEnrollments } = await supabase
      .from('training_enrollments')
      .select('id, employee_id, course_id, enrolled_at, expires_at, progress_percent, status')
      .in('status', ['not_started', 'in_progress'])
      .not('expires_at', 'is', null);

    for (const enrollment of overdueEnrollments || []) {
      const enrolledAt = new Date(enrollment.enrolled_at);
      const daysSinceEnroll = Math.floor((now.getTime() - enrolledAt.getTime()) / 86400000);

      if (daysSinceEnroll >= 28 && enrollment.progress_percent < 100) {
        results.push({
          action: 'urgent_alert_28d',
          employee_id: enrollment.employee_id,
          detail: `URGENT: ${daysSinceEnroll} days since enrollment, only ${enrollment.progress_percent}% complete. 2 days remaining for 30-day requirement.`,
        });
      } else if (daysSinceEnroll >= 20 && enrollment.progress_percent < 75) {
        results.push({
          action: 'escalation_alert_20d',
          employee_id: enrollment.employee_id,
          detail: `Escalation: ${daysSinceEnroll} days since enrollment, only ${enrollment.progress_percent}% complete.`,
        });
      }
    }
  }

  return new Response(JSON.stringify({
    trigger: body.trigger,
    processed_at: new Date().toISOString(),
    actions: results,
    total_actions: results.length,
  }), { headers: { 'Content-Type': 'application/json' } });
});

async function autoEnrollEmployee(supabase: any, employeeId: string, locationId: string) {
  const results: { action: string; employee_id: string; detail: string }[] = [];

  // Get location jurisdiction
  const { data: location } = await supabase
    .from('locations')
    .select('state, jurisdiction_id')
    .eq('id', locationId)
    .single();

  const state = location?.state || 'CA';
  const requirements = JURISDICTION_REQUIREMENTS[state] || JURISDICTION_REQUIREMENTS['CA'];

  // Get employee role
  const { data: employee } = await supabase
    .from('user_profiles')
    .select('role, hire_date')
    .eq('id', employeeId)
    .single();

  const employeeRole = employee?.role || 'kitchen';

  for (const req of requirements) {
    // Check if requirement applies to this role
    if (req.role !== 'all' && req.role !== employeeRole) continue;

    // Check for existing valid cert
    const { data: existingCert } = await supabase
      .from('training_certificates')
      .select('id, expires_at')
      .eq('employee_id', employeeId)
      .eq('certificate_type', req.cert_type)
      .gt('expires_at', new Date().toISOString())
      .is('revoked_at', null)
      .maybeSingle();

    if (existingCert) continue;

    // Find appropriate course
    const { data: course } = await supabase
      .from('training_courses')
      .select('id, title')
      .eq('category', req.course_category)
      .eq('is_active', true)
      .eq('is_system_course', true)
      .eq('language', 'en')
      .limit(1)
      .single();

    if (!course) continue;

    // Check for existing active enrollment
    const { data: existingEnrollment } = await supabase
      .from('training_enrollments')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('course_id', course.id)
      .in('status', ['not_started', 'in_progress'])
      .maybeSingle();

    if (existingEnrollment) continue;

    // Calculate deadline
    const deadline = req.deadline_days > 0
      ? new Date(Date.now() + req.deadline_days * 86400000).toISOString()
      : null;

    // Create enrollment
    const { data: enrollment } = await supabase
      .from('training_enrollments')
      .insert({
        employee_id: employeeId,
        course_id: course.id,
        location_id: locationId,
        enrolled_by: null,
        enrollment_reason: 'new_hire',
        status: 'not_started',
        expires_at: deadline,
      })
      .select('id')
      .single();

    // Create SB 476 record if CA
    if (state === 'CA' && req.course_category === 'food_safety_handler' && employee?.hire_date) {
      await supabase.from('training_sb476_log').insert({
        employee_id: employeeId,
        enrollment_id: enrollment?.id,
        location_id: locationId,
        hire_date: employee.hire_date,
        training_cost_cents: 1500,
        training_during_work_hours: true,
        employee_relieved_of_duties: true,
      });
    }

    results.push({
      action: 'auto_enroll_new_hire',
      employee_id: employeeId,
      detail: `Enrolled in "${course.title}" (${req.cert_type}), deadline: ${deadline || 'none'}. Enrollment: ${enrollment?.id}`,
    });
  }

  return results;
}
