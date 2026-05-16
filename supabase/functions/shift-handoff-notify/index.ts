import { createClient } from "npm:@supabase/supabase-js@2";
import { createNotification, type NotificationCategory } from "../_shared/notify.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { ensureThread, recordMessage } from "../_shared/threadMessage.ts";
import { buildReplyAddress } from "../_shared/replyAddress.ts";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const SHIFT_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

function getNextShiftName(current: string): string {
  const order = ["morning", "afternoon", "evening"];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const { handoffId, organizationId, locationId, shiftName, shiftDate } =
      await req.json();
    if (!handoffId || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch handoff row
    const { data: handoff, error: hErr } = await supabase
      .from("shift_handoffs")
      .select(
        "id, handed_off_by, notes, temp_count, checklist_count, ca_resolved, open_items, stats_snapshot",
      )
      .eq("id", handoffId)
      .single();

    if (hErr || !handoff) {
      logger.error(
        "[HANDOFF-NOTIFY] Handoff not found",
        handoffId,
        hErr?.message,
      );
      return new Response(JSON.stringify({ dispatched: 0 }), {
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
        },
      });
    }

    // Fetch operator name
    const { data: operatorProfile } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", handoff.handed_off_by)
      .maybeSingle();
    const operatorName = operatorProfile?.full_name || "A team member";

    // Fetch location name
    const { data: loc } = await supabase
      .from("locations")
      .select("name")
      .eq("id", locationId)
      .maybeSingle();
    const locationName = loc?.name || "your location";

    const shiftLabel = SHIFT_LABELS[shiftName] || shiftName;
    const openItemsArr = Array.isArray(handoff.open_items) ? handoff.open_items : [];
    let dispatched = 0;

    // ── 1. In-app notifications to next-shift staff ────────────
    const nextName = getNextShiftName(shiftName);
    const nextShiftLabel = SHIFT_LABELS[nextName] || nextName;
    try {
      const { data: tmpl } = await supabase
        .from("shift_templates")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("location_id", locationId)
        .ilike("name", nextName)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (tmpl) {
        const today = shiftDate;
        const { data: assignments } = await supabase
          .from("shift_assignments")
          .select("primary_user_id, secondary_user_id")
          .eq("shift_template_id", tmpl.id)
          .eq("is_active", true)
          .lte("effective_from", today)
          .or(`effective_until.is.null,effective_until.gte.${today}`);

        if (assignments) {
          const userIds = new Set<string>();
          for (const a of assignments) {
            if (a.primary_user_id) userIds.add(a.primary_user_id);
            if (a.secondary_user_id) userIds.add(a.secondary_user_id);
          }
          for (const uid of userIds) {
            const result = await createNotification({
              supabase,
              organizationId,
              userId: uid,
              type: "shift_handoff",
              category: "team" as NotificationCategory,
              title: `Your ${nextShiftLabel} shift is starting`,
              body: openItemsArr.length > 0
                ? `${operatorName} handed off ${openItemsArr.length} open item${openItemsArr.length > 1 ? "s" : ""} for your shift.`
                : `${operatorName} completed a clean handoff — no open items.`,
              actionUrl: "/current-shift",
              actionLabel: "View current shift",
              priority: "medium",
              severity: "info",
              sourceType: "shift_handoff",
              sourceId: handoffId,
              deduplicate: true,
            });
            if (result.notificationId && !result.deduplicated) dispatched++;
          }
        }
      }
    } catch (err) {
      logger.error(
        "[HANDOFF-NOTIFY] Next-shift staff failed",
        (err as Error).message,
      );
    }

    // ── 2. Email to owner_operator + compliance_manager ────────
    const { data: emailUsers } = await supabase
      .from("user_profiles")
      .select("id, full_name, role")
      .eq("organization_id", organizationId)
      .in("role", ["owner_operator", "compliance_manager"]);

    if (emailUsers && emailUsers.length > 0) {
      // Ensure thread for Stage A reply-to
      const thread = await ensureThread({
        supabase,
        organizationId,
        entityType: "shift_handoff",
        entityId: handoffId,
        subject: `${shiftLabel} Shift Handoff — ${locationName}`,
      });

      const replyTo = thread ? buildReplyAddress(thread.id) : undefined;

      const incidentCount =
        (handoff.stats_snapshot as Record<string, unknown>)?.incidentCount ?? 0;

      // Build digest HTML
      const statsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; text-align: center; background: #FAF7F0; border-radius: 8px;">
              <strong style="font-size: 20px; color: #1E2D4D;">${handoff.temp_count ?? 0}</strong><br/>
              <span style="font-size: 12px; color: #6B7F96;">Temperatures</span>
            </td>
            <td style="width: 8px;"></td>
            <td style="padding: 8px; text-align: center; background: #FAF7F0; border-radius: 8px;">
              <strong style="font-size: 20px; color: #1E2D4D;">${handoff.checklist_count ?? 0}</strong><br/>
              <span style="font-size: 12px; color: #6B7F96;">Checklists</span>
            </td>
          </tr>
          <tr><td colspan="3" style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 8px; text-align: center; background: #FAF7F0; border-radius: 8px;">
              <strong style="font-size: 20px; color: #1E2D4D;">${incidentCount}</strong><br/>
              <span style="font-size: 12px; color: #6B7F96;">Incidents</span>
            </td>
            <td style="width: 8px;"></td>
            <td style="padding: 8px; text-align: center; background: #FAF7F0; border-radius: 8px;">
              <strong style="font-size: 20px; color: #1E2D4D;">${handoff.ca_resolved ?? 0}</strong><br/>
              <span style="font-size: 12px; color: #6B7F96;">CAs Resolved</span>
            </td>
          </tr>
        </table>`;

      const notesHtml = handoff.notes
        ? `<p style="margin: 16px 0 0;"><strong>Notes:</strong></p><p style="color: #3D5068;">${handoff.notes}</p>`
        : "";

      const openItemsHtml =
        openItemsArr.length > 0
          ? `<p style="margin: 16px 0 0;"><strong>Open items carried forward:</strong></p><ul style="color: #3D5068; padding-left: 20px;">${openItemsArr.map((i: string) => `<li>${i}</li>`).join("")}</ul>`
          : "";

      const bodyHtml = `
        <p><strong>${operatorName}</strong> completed the <strong>${shiftLabel.toLowerCase()} shift</strong> handoff at <strong>${locationName}</strong>.</p>
        ${statsHtml}
        ${notesHtml}
        ${openItemsHtml}`;

      for (const user of emailUsers) {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            user.id,
          );
          if (!authUser?.user?.email) continue;

          const html = buildEmailHtml({
            recipientName: user.full_name || "there",
            bodyHtml,
            ctaText: "View in EvidLY",
            ctaUrl: "https://app.getevidly.com/shift-handoff",
          });

          const emailResult = await sendEmail({
            to: authUser.user.email,
            subject: `${shiftLabel} Shift Handoff — ${locationName}`,
            html,
            replyTo,
          });

          if (emailResult && thread) {
            await recordMessage({
              supabase,
              threadId: thread.id,
              organizationId,
              channel: "email",
              direction: "outbound",
              senderType: "system",
              senderIdentifier: "noreply@getevidly.com",
              subject: `${shiftLabel} Shift Handoff — ${locationName}`,
              bodyHtml,
              providerMessageId: emailResult.id,
              metadata: { recipientRole: user.role, recipientId: user.id },
            });
          }

          if (emailResult) dispatched++;
        } catch (err) {
          logger.error(
            "[HANDOFF-NOTIFY] Email to",
            user.id,
            "failed",
            (err as Error).message,
          );
        }
      }
    }

    // Update stats_snapshot with dispatch info
    try {
      const snapshot =
        (handoff.stats_snapshot as Record<string, unknown>) || {};
      await supabase
        .from("shift_handoffs")
        .update({
          stats_snapshot: {
            ...snapshot,
            dispatched_count: dispatched,
            dispatched_at: new Date().toISOString(),
          },
        })
        .eq("id", handoffId);
    } catch {
      /* non-critical */
    }

    logger.info(
      "[HANDOFF-NOTIFY] Done",
      handoffId,
      `dispatched=${dispatched}`,
    );

    return new Response(JSON.stringify({ dispatched }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    logger.error(
      "[HANDOFF-NOTIFY] Unexpected",
      (err as Error).message,
    );
    return new Response(
      JSON.stringify({ error: "Internal error", dispatched: 0 }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }
});
