/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ReminderResult {
  employee_id: string;
  enrollment_id: string;
  type: 'gentle_nudge' | 'deadline_reminder' | 'urgent_alert';
  message: string;
  notify_manager: boolean;
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const now = new Date();
  const results: ReminderResult[] = [];
  const notifiedToday = new Set<string>();

  // Get all active enrollments
  const { data: enrollments } = await supabase
    .from('training_enrollments')
    .select('id, employee_id, course_id, enrolled_at, progress_percent, status, expires_at, training_courses(title)')
    .in('status', ['not_started', 'in_progress']);

  for (const enrollment of enrollments || []) {
    // Rate limit: max 1 reminder per employee per day
    if (notifiedToday.has(enrollment.employee_id)) continue;

    const enrolledAt = new Date(enrollment.enrolled_at);
    const daysSinceEnroll = Math.floor((now.getTime() - enrolledAt.getTime()) / 86400000);
    const courseTitle = (enrollment as any).training_courses?.title || 'Training';
    const hasDeadline = !!enrollment.expires_at;
    let daysToDeadline = hasDeadline
      ? Math.ceil((new Date(enrollment.expires_at!).getTime() - now.getTime()) / 86400000)
      : null;

    let reminder: ReminderResult | null = null;

    // Urgent: 20+ days enrolled, <75% complete, has 30-day deadline
    if (daysSinceEnroll >= 20 && enrollment.progress_percent < 75 && hasDeadline && (daysToDeadline !== null && daysToDeadline <= 10)) {
      reminder = {
        employee_id: enrollment.employee_id,
        enrollment_id: enrollment.id,
        type: 'urgent_alert',
        message: `URGENT: Only ${daysToDeadline} days remaining to complete "${courseTitle}". You are ${enrollment.progress_percent}% done. California law requires completion within 30 days of hire.`,
        notify_manager: true,
      };
    }
    // Moderate: 10+ days enrolled, <50% complete
    else if (daysSinceEnroll >= 10 && enrollment.progress_percent < 50) {
      reminder = {
        employee_id: enrollment.employee_id,
        enrollment_id: enrollment.id,
        type: 'deadline_reminder',
        message: `Reminder: You're ${enrollment.progress_percent}% through "${courseTitle}". ${hasDeadline ? `Deadline: ${daysToDeadline} days remaining.` : ''} Keep going — each module takes about 15 minutes!`,
        notify_manager: false,
      };
    }
    // Gentle: 3+ days enrolled, <25% complete
    else if (daysSinceEnroll >= 3 && enrollment.progress_percent < 25) {
      reminder = {
        employee_id: enrollment.employee_id,
        enrollment_id: enrollment.id,
        type: 'gentle_nudge',
        message: `Hey! You were enrolled in "${courseTitle}" ${daysSinceEnroll} days ago. Ready to start? The first module only takes about 15 minutes.`,
        notify_manager: false,
      };
    }

    if (reminder) {
      results.push(reminder);
      notifiedToday.add(enrollment.employee_id);

      // Store notification (assumes notifications table exists)
      await supabase.from('notifications').insert({
        user_id: enrollment.employee_id,
        title: reminder.type === 'urgent_alert' ? 'Urgent: Training Deadline' : 'Training Reminder',
        message: reminder.message,
        type: reminder.type === 'urgent_alert' ? 'error' : 'info',
        link: `/training/course/${enrollment.course_id}`,
      }).catch(() => { /* notifications table may not exist */ });

      // Notify manager if urgent
      if (reminder.notify_manager) {
        const { data: location } = await supabase
          .from('training_enrollments')
          .select('location_id')
          .eq('id', enrollment.id)
          .single();

        if (location?.location_id) {
          const { data: managers } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('role', 'manager')
            .eq('location_id', location.location_id);

          for (const mgr of managers || []) {
            await supabase.from('notifications').insert({
              user_id: mgr.id,
              title: 'Training Deadline Alert',
              message: `Employee has only ${daysToDeadline} days to complete required training "${courseTitle}" (${enrollment.progress_percent}% done).`,
              type: 'error',
              link: '/training',
            }).catch(() => {});
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({
    processed_at: now.toISOString(),
    total_active_enrollments: (enrollments || []).length,
    reminders_sent: results.length,
    breakdown: {
      gentle_nudge: results.filter(r => r.type === 'gentle_nudge').length,
      deadline_reminder: results.filter(r => r.type === 'deadline_reminder').length,
      urgent_alert: results.filter(r => r.type === 'urgent_alert').length,
    },
    reminders: results,
  }), { headers: { 'Content-Type': 'application/json' } });
});
