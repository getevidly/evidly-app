import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email.ts";
import { buildClientInviteEmail } from "../_shared/invites.ts";
import { logger } from "../_shared/logger.ts";

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Staff gate: verify caller JWT, then confirm evidly_staff_role ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401, headers);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401, headers);

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("evidly_staff_role")
      .eq("id", user.id)
      .single();
    if (!profile?.evidly_staff_role) {
      return json({ error: "Forbidden — staff only" }, 403, headers);
    }

    const body = await req.json();
    const {
      invite_id, business_name, contact_name, email, phone, message, sender_name, client_role,
    } = body;

    const appBase = Deno.env.get("APP_PUBLIC_BASE") || "https://app.getevidly.com";

    // ═══ REMIND PATH ═══
    if (invite_id) {
      const { data: inv, error: invErr } = await supabase
        .from("evidly_client_invites")
        .select("id, business_name, contact_name, email, token, message, status, reminder_count")
        .eq("id", invite_id)
        .single();

      if (invErr || !inv) return json({ error: "Invite not found" }, 404, headers);
      if (inv.status !== "pending") {
        return json({ error: `Cannot remind a ${inv.status} invite` }, 400, headers);
      }

      const { subject, html } = buildClientInviteEmail({
        recipientName: inv.contact_name,
        senderName: sender_name || undefined,
        businessName: inv.business_name,
        inviteLink: `${appBase}/join/${inv.token}`,
        personalMessage: inv.message || undefined,
      });

      const sent = await sendEmail({ to: inv.email, subject, html });
      if (!sent) return json({ error: "Reminder failed to send" }, 502, headers);

      await supabase
        .from("evidly_client_invites")
        .update({
          reminder_count: (inv.reminder_count ?? 0) + 1,
          last_reminded_at: new Date().toISOString(),
        })
        .eq("id", inv.id);

      return json({ success: true, reminded: true, invite_id: inv.id }, 200, headers);
    }

    // ═══ NEW INVITE PATH ═══
    if (!contact_name || !email) {
      return json({ error: "contact_name and email are required" }, 400, headers);
    }

    const token = crypto.randomUUID();

    const { data: created, error: insErr } = await supabase
      .from("evidly_client_invites")
      .insert({
        business_name: business_name || null,
        contact_name, email,
        phone: phone || null,
        message: message || null,
        client_role: client_role || "owner_operator",
        token, status: "pending", invited_by: user.id,
      })
      .select("id")
      .single();

    if (insErr || !created) {
      logger.error("[create-client-invite] insert failed", insErr);
      return json({ error: "Could not create invite" }, 500, headers);
    }

    const { subject, html } = buildClientInviteEmail({
      recipientName: contact_name,
      senderName: sender_name || undefined,
      businessName: business_name,
      inviteLink: `${appBase}/join/${token}`,
      personalMessage: message || undefined,
    });

    const sent = await sendEmail({ to: email, subject, html });

    if (!sent) {
      await supabase.from("evidly_client_invites").delete().eq("id", created.id);
      return json({ error: "We couldn't send the invite — check the email and try again." }, 502, headers);
    }

    return json({ success: true, invite_id: created.id }, 200, headers);
  } catch (err) {
    logger.error("[create-client-invite] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
