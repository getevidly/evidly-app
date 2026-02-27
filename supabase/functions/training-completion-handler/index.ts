/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CompletionRequest {
  enrollment_id: string;
  quiz_attempt_id: string;
}

const CERT_TYPE_MAP: Record<string, string> = {
  food_safety_handler: 'food_handler',
  food_safety_manager: 'food_manager_prep',
  facility_safety: 'facility_safety',
  compliance_ops: 'custom',
  custom: 'custom',
};

const VALIDITY_YEARS: Record<string, number> = {
  food_safety_handler: 3,
  food_safety_manager: 5,
  facility_safety: 1,
};

function generateCertNumber(type: string): string {
  const prefix: Record<string, string> = {
    food_handler: 'EVD-FH',
    food_manager_prep: 'EVD-FM',
    facility_safety: 'EVD-FS',
    custom: 'EVD-CU',
  };
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `${prefix[type] || 'EVD-XX'}-${year}-${seq}`;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const { enrollment_id, quiz_attempt_id }: CompletionRequest = await req.json();

  // 1. Get enrollment + course + quiz attempt
  const { data: enrollment, error: enrollErr } = await supabase
    .from('training_enrollments')
    .select('*, training_courses(id, title, category, description)')
    .eq('id', enrollment_id)
    .single();

  if (enrollErr || !enrollment) {
    return new Response(JSON.stringify({ error: 'Enrollment not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const { data: attempt } = await supabase
    .from('training_quiz_attempts')
    .select('*')
    .eq('id', quiz_attempt_id)
    .single();

  if (!attempt || !attempt.passed) {
    return new Response(JSON.stringify({ error: 'Quiz attempt not found or not passed' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const course = (enrollment as any).training_courses;
  const certType = CERT_TYPE_MAP[course.category] || 'custom';
  const certNumber = generateCertNumber(certType);
  const validityYears = VALIDITY_YEARS[course.category];
  const expiresAt = validityYears
    ? new Date(Date.now() + validityYears * 365.25 * 86400000).toISOString()
    : null;
  const now = new Date().toISOString();

  const actions: string[] = [];

  // 2. Update enrollment status to completed
  await supabase
    .from('training_enrollments')
    .update({
      status: 'completed',
      completed_at: now,
      score_percent: attempt.score_percent,
      progress_percent: 100,
    })
    .eq('id', enrollment_id);
  actions.push('enrollment_completed');

  // 3. Generate certificate record
  const { data: cert } = await supabase
    .from('training_certificates')
    .insert({
      employee_id: enrollment.employee_id,
      enrollment_id: enrollment.id,
      course_id: course.id,
      location_id: enrollment.location_id,
      certificate_type: certType,
      certificate_number: certNumber,
      score_percent: attempt.score_percent,
      expires_at: expiresAt,
    })
    .select()
    .single();
  actions.push('certificate_generated');

  // 4. Update or create employee_certifications record
  const { data: existingEmployeeCert } = await supabase
    .from('employee_certifications')
    .select('id')
    .eq('employee_id', enrollment.employee_id)
    .eq('certification_type', certType)
    .maybeSingle();

  if (existingEmployeeCert) {
    await supabase
      .from('employee_certifications')
      .update({
        issue_date: now,
        expiration_date: expiresAt,
        status: 'active',
        document_url: null, // PDF will be generated separately
      })
      .eq('id', existingEmployeeCert.id);
    actions.push('employee_cert_updated');
  } else {
    await supabase
      .from('employee_certifications')
      .insert({
        employee_id: enrollment.employee_id,
        certification_type: certType,
        issue_date: now,
        expiration_date: expiresAt,
        status: 'active',
      })
      .catch(() => { /* table may not exist yet */ });
    actions.push('employee_cert_created');
  }

  // 5. Log SB 476 completion if California food handler
  if (course.category === 'food_safety_handler') {
    const { data: sb476Entry } = await supabase
      .from('training_sb476_log')
      .select('id, hire_date')
      .eq('enrollment_id', enrollment_id)
      .maybeSingle();

    if (sb476Entry) {
      const hireDate = new Date(sb476Entry.hire_date);
      const completionDate = new Date();
      const daysSinceHire = Math.floor((completionDate.getTime() - hireDate.getTime()) / 86400000);

      await supabase
        .from('training_sb476_log')
        .update({
          training_completed_date: completionDate.toISOString().split('T')[0],
          completed_within_30_days: daysSinceHire <= 30,
          compensable_hours: Math.round((attempt.time_spent_seconds / 3600) * 100) / 100,
          total_compensation_cents: Math.round((attempt.time_spent_seconds / 3600) * (sb476Entry as any).hourly_rate_cents || 0),
        })
        .eq('id', sb476Entry.id);
      actions.push('sb476_logged');
    }
  }

  // 6. Fire webhook event for API subscribers
  const { data: webhookSubs } = await supabase
    .from('api_webhook_subscriptions')
    .select('id, url, secret_hash')
    .contains('events', ['employee.training_completed'])
    .eq('status', 'active');

  if (webhookSubs && webhookSubs.length > 0) {
    const payload = {
      event: 'employee.training_completed',
      timestamp: now,
      data: {
        employee_id: enrollment.employee_id,
        course_id: course.id,
        course_title: course.title,
        certificate_number: certNumber,
        score_percent: attempt.score_percent,
        location_id: enrollment.location_id,
      },
    };

    for (const sub of webhookSubs) {
      await supabase.from('api_webhook_deliveries').insert({
        subscription_id: sub.id,
        event_type: 'employee.training_completed',
        payload,
        success: false, // Will be updated by webhook dispatch
        attempt_number: 1,
      });
    }
    actions.push(`webhook_queued_${webhookSubs.length}`);
  }

  // 7. Check for additional required training
  const { data: location } = await supabase
    .from('locations')
    .select('state')
    .eq('id', enrollment.location_id)
    .maybeSingle();

  // Auto-enroll in facility safety if completed food handler
  if (course.category === 'food_safety_handler') {
    const { data: fireCourse } = await supabase
      .from('training_courses')
      .select('id')
      .eq('category', 'facility_safety')
      .eq('is_active', true)
      .eq('is_system_course', true)
      .limit(1)
      .maybeSingle();

    if (fireCourse) {
      const { data: existingFireEnroll } = await supabase
        .from('training_enrollments')
        .select('id')
        .eq('employee_id', enrollment.employee_id)
        .eq('course_id', fireCourse.id)
        .in('status', ['not_started', 'in_progress', 'completed'])
        .maybeSingle();

      if (!existingFireEnroll) {
        await supabase.from('training_enrollments').insert({
          employee_id: enrollment.employee_id,
          course_id: fireCourse.id,
          location_id: enrollment.location_id,
          enrollment_reason: 'new_hire',
          status: 'not_started',
        });
        actions.push('auto_enrolled_facility_safety');
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    enrollment_id,
    certificate_number: certNumber,
    certificate_type: certType,
    expires_at: expiresAt,
    score_percent: attempt.score_percent,
    actions,
  }), { headers: { 'Content-Type': 'application/json' } });
});
