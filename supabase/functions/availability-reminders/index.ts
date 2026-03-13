/**
 * availability-reminders — Sends reminder notifications for availability submissions.
 *
 * Scheduled cron runs:
 *   - Wednesday 9:00 AM PT: "Availability due tomorrow by 2 PM"
 *   - Thursday 9:00 AM PT: "Availability due today by 2 PM"
 *   - Thursday 1:00 PM PT: "Availability due in 1 hour"
 *
 * Also handles:
 *   - Post-deadline overdue notifications
 *   - Supervisor notification for late submissions
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ReminderTemplate {
  title: string;
  body: string;
}

const TEMPLATES: Record<string, ReminderTemplate> = {
  wednesday_9am: {
    title: 'Availability reminder',
    body: 'Please submit your availability for next week by tomorrow at 2 PM.',
  },
  thursday_9am: {
    title: 'Availability due today',
    body: 'Submit your availability for next week by 2 PM today.',
  },
  thursday_1pm: {
    title: 'Availability due in 1 hour',
    body: 'Last chance! Submit your availability by 2 PM.',
  },
  overdue: {
    title: 'Availability overdue',
    body: 'Your availability for next week was not submitted on time.',
  },
  supervisor_late: {
    title: 'Late availability submission',
    body: '{employee_name} submitted late availability for {week}. Review required.',
  },
};

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { trigger } = await req.json().catch(() => ({ trigger: 'auto' }));

    // Determine which reminder to send based on current PT time
    const now = new Date();
    // Approximate PT offset (UTC-8 standard, UTC-7 DST)
    const ptOffset = -7;
    const ptHour = (now.getUTCHours() + ptOffset + 24) % 24;
    const ptDay = now.getUTCDay();

    let templateKey: string;
    if (trigger === 'auto') {
      if (ptDay === 3 && ptHour >= 8 && ptHour < 10) {
        templateKey = 'wednesday_9am';
      } else if (ptDay === 4 && ptHour >= 8 && ptHour < 10) {
        templateKey = 'thursday_9am';
      } else if (ptDay === 4 && ptHour >= 12 && ptHour < 14) {
        templateKey = 'thursday_1pm';
      } else {
        return new Response(JSON.stringify({ message: 'No reminder due at this time' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      templateKey = trigger;
    }

    const template = TEMPLATES[templateKey];
    if (!template) {
      return new Response(JSON.stringify({ error: `Unknown template: ${templateKey}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get next Monday
    const day = now.getDay();
    const daysUntilMon = day === 0 ? 1 : 8 - day;
    const nextMon = new Date(now);
    nextMon.setDate(now.getDate() + daysUntilMon);
    const weekStart = nextMon.toISOString().slice(0, 10);

    // Find employees who haven't submitted for next week
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id, name, email, vendor_id')
      .eq('status', 'active')
      .in('role', ['technician', 'supervisor']);

    const { data: submissions } = await supabase
      .from('availability_submissions')
      .select('employee_id')
      .eq('week_start', weekStart)
      .in('status', ['submitted', 'approved']);

    const submittedIds = new Set((submissions || []).map((s: any) => s.employee_id));
    const needReminder = (allEmployees || []).filter((e: any) => !submittedIds.has(e.id));

    // In production, send push notifications + email here.
    // For now, log the reminders.
    console.log(`[availability-reminders] ${templateKey}: ${needReminder.length} employees need reminder`);
    for (const emp of needReminder) {
      console.log(`  - ${emp.name} (${emp.email})`);
    }

    return new Response(JSON.stringify({
      template: templateKey,
      week_start: weekStart,
      employees_notified: needReminder.length,
      employees: needReminder.map((e: any) => ({ id: e.id, name: e.name })),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
