/**
 * task-notifications — TASK-ASSIGN-01
 *
 * Runs every 5 minutes via pg_cron.
 * Checks for tasks needing reminder, due-soon, overdue,
 * or escalation notifications.
 *
 * Uses _shared/notify.ts createNotification() for all notifications.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createNotification } from "../_shared/notify.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 60_000);
    const in15 = new Date(now.getTime() + 15 * 60_000);

    let reminders = 0;
    let dueSoon = 0;
    let overdueCount = 0;
    let escalations = 0;

    // ── 1. REMINDERS — due within 30 min, not yet reminded ──
    const { data: toRemind } = await supabase
      .from("task_instances")
      .select("*, task_definitions(reminder_minutes, escalation_config)")
      .in("status", ["pending", "in_progress"])
      .lte("due_at", in30.toISOString())
      .gte("due_at", now.toISOString())
      .is("reminder_sent_at", null)
      .not("assigned_to", "is", null);

    for (const task of toRemind ?? []) {
      await createNotification({
        supabase,
        organizationId: task.org_id,
        userId: task.assigned_to,
        type: "task_reminder",
        category: "team",
        title: `Reminder: ${task.title} due soon`,
        body: "Complete this task before it becomes overdue.",
        actionUrl: "/tasks",
        actionLabel: "View Tasks",
        priority: "medium",
        severity: "info",
        sourceType: "task_instance",
        sourceId: `${task.id}_reminder`,
        deduplicate: true,
      });
      await supabase
        .from("task_instances")
        .update({ reminder_sent_at: now.toISOString() })
        .eq("id", task.id);
      reminders++;
    }

    // ── 2. DUE SOON — due within 15 min, not yet notified ──
    const { data: soonTasks } = await supabase
      .from("task_instances")
      .select("*")
      .in("status", ["pending", "in_progress"])
      .lte("due_at", in15.toISOString())
      .gte("due_at", now.toISOString())
      .is("due_soon_sent_at", null)
      .not("assigned_to", "is", null);

    for (const task of soonTasks ?? []) {
      await createNotification({
        supabase,
        organizationId: task.org_id,
        userId: task.assigned_to,
        type: "task_due_soon",
        category: "team",
        title: `${task.title} due in 15 minutes`,
        body: "This task needs to be completed now.",
        actionUrl: "/tasks",
        actionLabel: "View Tasks",
        priority: "high",
        severity: "advisory",
        sourceType: "task_instance",
        sourceId: `${task.id}_due_soon`,
        deduplicate: true,
      });
      await supabase
        .from("task_instances")
        .update({ due_soon_sent_at: now.toISOString() })
        .eq("id", task.id);
      dueSoon++;
    }

    // ── 3. OVERDUE — past due, not yet marked overdue ──
    const { data: overdueTasks } = await supabase
      .from("task_instances")
      .select("*")
      .eq("status", "pending")
      .lt("due_at", now.toISOString())
      .is("overdue_sent_at", null);

    for (const task of overdueTasks ?? []) {
      await supabase
        .from("task_instances")
        .update({
          status: "overdue",
          overdue_sent_at: now.toISOString(),
        })
        .eq("id", task.id);

      if (task.assigned_to) {
        await createNotification({
          supabase,
          organizationId: task.org_id,
          userId: task.assigned_to,
          type: "task_overdue",
          category: "team",
          title: `Overdue: ${task.title}`,
          body: `This task was due at ${new Date(task.due_at).toLocaleTimeString()} and has not been completed.`,
          actionUrl: "/tasks",
          actionLabel: "Complete Now",
          priority: "high",
          severity: "urgent",
          sourceType: "task_instance",
          sourceId: `${task.id}_overdue`,
          deduplicate: true,
        });
      }
      overdueCount++;
    }

    // ── 4. ESCALATION — overdue tasks needing next level ──
    const { data: toEscalate } = await supabase
      .from("task_instances")
      .select("*, task_definitions(escalation_config)")
      .in("status", ["overdue", "escalated"]);

    for (const task of toEscalate ?? []) {
      const config = task.task_definitions?.escalation_config;
      if (!config?.enabled || !config?.levels) continue;

      const level = task.escalation_level ?? 0;
      const nextLevel = config.levels[level];
      if (!nextLevel) continue;

      const lastEscalated = task.last_escalated_at
        ? new Date(task.last_escalated_at)
        : new Date(task.overdue_sent_at ?? task.due_at);

      const minutesSince =
        (now.getTime() - lastEscalated.getTime()) / 60_000;
      if (minutesSince < nextLevel.delay_minutes) continue;

      // Find users with the escalation role in this org
      const { data: escalationUsers } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("organization_id", task.org_id)
        .eq("role", nextLevel.notify_role);

      for (const user of escalationUsers ?? []) {
        await createNotification({
          supabase,
          organizationId: task.org_id,
          userId: user.id,
          type: "task_escalation",
          category: "team",
          title: `Escalation: ${task.title} is overdue`,
          body: `This task was assigned to your team and has not been completed. Level ${level + 1} escalation.`,
          actionUrl: "/tasks",
          actionLabel: "View Task",
          priority: "critical",
          severity: "urgent",
          sourceType: "task_instance",
          sourceId: `${task.id}_escalation_${level + 1}`,
          deduplicate: true,
        });
      }

      await supabase
        .from("task_instances")
        .update({
          escalation_level: level + 1,
          last_escalated_at: now.toISOString(),
          status: "escalated",
        })
        .eq("id", task.id);
      escalations++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders,
        dueSoon,
        overdue: overdueCount,
        escalations,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("task-notifications error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
