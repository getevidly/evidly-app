/**
 * generate-task-instances — TASK-ASSIGN-01
 *
 * Runs daily at 5 AM UTC via pg_cron.
 * Also callable manually with { date, orgId } body.
 *
 * Generates task_instances from active task_definitions
 * for the target date. Idempotent — skips existing instances.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetDate: string =
      body.date ?? new Date().toISOString().split("T")[0];
    const dayOfWeek = new Date(targetDate + "T12:00:00Z").getDay(); // 0=Sun

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all active definitions
    let query = supabase
      .from("task_definitions")
      .select("*")
      .eq("is_active", true);
    if (body.orgId) {
      query = query.eq("org_id", body.orgId);
    }

    const { data: definitions, error: defError } = await query;
    if (defError) {
      console.error("Error fetching definitions:", defError);
      return new Response(
        JSON.stringify({ error: defError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let created = 0;
    let skipped = 0;

    for (const def of definitions ?? []) {
      // Check if this definition applies today
      const appliesToday =
        def.schedule_type === "daily" ||
        (def.schedule_type === "weekly" &&
          def.schedule_days?.includes(dayOfWeek)) ||
        def.schedule_type === "shift" ||
        def.schedule_type === "custom";

      if (!appliesToday && def.schedule_type !== "once") {
        skipped++;
        continue;
      }

      // For one-time tasks, skip if any instance already exists
      if (def.schedule_type === "once") {
        const { data: anyExisting } = await supabase
          .from("task_instances")
          .select("id")
          .eq("definition_id", def.id)
          .limit(1)
          .maybeSingle();
        if (anyExisting) {
          skipped++;
          continue;
        }
      }

      // Generate instances per shift if shift-based, otherwise one instance
      const shifts: (string | null)[] =
        def.schedule_shifts?.length > 0 ? def.schedule_shifts : [null];

      for (const shift of shifts) {
        // Calculate due_at
        let dueAt: string;
        if (def.due_time) {
          dueAt = new Date(`${targetDate}T${def.due_time}Z`).toISOString();
        } else {
          dueAt = new Date(`${targetDate}T23:59:00Z`).toISOString();
        }

        // Idempotent insert — unique constraint on (definition_id, date, shift)
        const { error: insertError } = await supabase
          .from("task_instances")
          .insert({
            definition_id: def.id,
            org_id: def.org_id,
            location_id: def.location_id,
            assigned_to: def.assigned_to_user_id,
            title: def.name,
            task_type: def.task_type,
            due_at: dueAt,
            date: targetDate,
            shift: shift ?? "",
          });

        if (insertError) {
          // Unique constraint violation = already exists, skip
          if (insertError.code === "23505") {
            skipped++;
          } else {
            console.error("Insert error:", insertError);
          }
        } else {
          created++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDate,
        created,
        skipped,
        definitions_checked: definitions?.length ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-task-instances error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
