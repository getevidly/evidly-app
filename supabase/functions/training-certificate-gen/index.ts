/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CertRequest {
  enrollment_id: string;
}

function generateCertNumber(type: string): string {
  const prefix: Record<string, string> = {
    food_handler: 'EVD-FH',
    food_manager_prep: 'EVD-FM',
    fire_safety: 'EVD-FS',
    compliance_ops: 'EVD-CO',
    custom: 'EVD-CU',
  };
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `${prefix[type] || 'EVD-XX'}-${year}-${seq}`;
}

function getCertType(category: string): string {
  const map: Record<string, string> = {
    food_safety_handler: 'food_handler',
    food_safety_manager: 'food_manager_prep',
    fire_safety: 'fire_safety',
    compliance_ops: 'custom',
    custom: 'custom',
  };
  return map[category] || 'custom';
}

function getExpiryYears(category: string): number | null {
  const map: Record<string, number> = {
    food_safety_handler: 3,
    food_safety_manager: 5,
    fire_safety: 1,
  };
  return map[category] || null;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const { enrollment_id }: CertRequest = await req.json();

  // Get enrollment with course details
  const { data: enrollment, error } = await supabase
    .from('training_enrollments')
    .select('*, training_courses(id, title, category)')
    .eq('id', enrollment_id)
    .single();

  if (error || !enrollment) {
    return new Response(JSON.stringify({ error: 'Enrollment not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  if (enrollment.status !== 'completed') {
    return new Response(JSON.stringify({ error: 'Enrollment is not completed' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Check if certificate already exists
  const { data: existing } = await supabase
    .from('training_certificates')
    .select('id, certificate_number')
    .eq('enrollment_id', enrollment_id)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ error: 'Certificate already issued', certificate_number: existing.certificate_number }), { status: 409, headers: { 'Content-Type': 'application/json' } });
  }

  const course = (enrollment as any).training_courses;
  const certType = getCertType(course.category);
  const certNumber = generateCertNumber(certType);
  const expiryYears = getExpiryYears(course.category);
  const expiresAt = expiryYears
    ? new Date(Date.now() + expiryYears * 365.25 * 86400000).toISOString()
    : null;

  // Insert certificate
  const { data: cert, error: certErr } = await supabase
    .from('training_certificates')
    .insert({
      employee_id: enrollment.employee_id,
      enrollment_id: enrollment.id,
      course_id: course.id,
      location_id: enrollment.location_id,
      certificate_type: certType,
      certificate_number: certNumber,
      score_percent: enrollment.score_percent,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (certErr) {
    return new Response(JSON.stringify({ error: 'Failed to generate certificate', details: certErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Update SB 476 log if applicable
  if (course.category === 'food_safety_handler') {
    await supabase
      .from('training_sb476_log')
      .update({
        training_completed_date: new Date().toISOString().split('T')[0],
        completed_within_30_days: true, // Will be recalculated by trigger
      })
      .eq('enrollment_id', enrollment_id);
  }

  return new Response(JSON.stringify({
    success: true,
    certificate_id: cert?.id,
    certificate_number: certNumber,
    certificate_type: certType,
    expires_at: expiresAt,
    course_title: course.title,
  }), { headers: { 'Content-Type': 'application/json' } });
});
