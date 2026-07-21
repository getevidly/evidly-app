import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email.ts";
import { buildClientInviteEmail } from "../_shared/invites.ts";
import { logger } from "../_shared/logger.ts";
import { stampJourneyStage } from "../_shared/journeyStamp.ts";

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
      invite_id, organization_id, organization_name, contact_name, email, phone, message, sender_name, client_role,
    } = body;

    const appBase = Deno.env.get("APP_PUBLIC_BASE") || "https://app.getevidly.com";

    // ═══ REMIND PATH ═══
    if (invite_id) {
      const { data: inv, error: invErr } = await supabase
        .from("evidly_client_invites")
        .select("id, organization_name, contact_name, email, token, message, status, reminder_count")
        .eq("id", invite_id)
        .single();

      if (invErr || !inv) return json({ error: "Invite not found" }, 404, headers);
      if (inv.status !== "pending") {
        return json({ error: `Cannot remind a ${inv.status} invite` }, 400, headers);
      }

      const { subject, html } = buildClientInviteEmail({
        recipientName: inv.contact_name,
        senderName: sender_name || undefined,
        businessName: inv.organization_name || 'your kitchen',
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
    if (!contact_name || !email || !organization_id) {
      return json({ error: "contact_name, email, and organization_id are required" }, 400, headers);
    }

    const token = crypto.randomUUID();

    // Snapshot org created_at + primary location address for the /join page
    let locationSnapshot: Record<string, unknown> | null = null;
    try {
      const { data: orgRow } = await supabase
        .from("organizations")
        .select("created_at")
        .eq("id", organization_id)
        .maybeSingle();

      const { data: locRow } = await supabase
        .from("locations")
        .select("address, city, state, zip, county")
        .eq("organization_id", organization_id)
        .limit(1)
        .maybeSingle();

      if (orgRow || locRow) {
        locationSnapshot = {
          ...(orgRow?.created_at ? { org_created_at: orgRow.created_at } : {}),
          ...(locRow?.address ? { address: locRow.address } : {}),
          ...(locRow?.city ? { city: locRow.city } : {}),
          ...(locRow?.state ? { state: locRow.state } : {}),
          ...(locRow?.zip ? { zip: locRow.zip } : {}),
          ...(locRow?.county ? { county: locRow.county } : {}),
        };
        if (Object.keys(locationSnapshot).length === 0) locationSnapshot = null;
      }
    } catch {
      // Non-fatal — invite still works without snapshot
    }

    const { data: created, error: insErr } = await supabase
      .from("evidly_client_invites")
      .insert({
        organization_id,
        organization_name: organization_name || null,
        contact_name, email,
        phone: phone || null,
        message: message || null,
        client_role: client_role || "owner_operator",
        token, status: "pending", invited_by: user.id,
        location_snapshot: locationSnapshot,
      })
      .select("id")
      .single();

    if (insErr || !created) {
      logger.error("[create-client-invite] insert failed", insErr);
      return json({ error: "Could not create invite" }, 500, headers);
    }

    // ── Provision auth user + profile (idempotent) ──────────────
    // Shadow auth user with no password — can't log in until claim.
    // Appears in AdminUsers as status='invited'.
    let provisionedUserId: string | null = null;

    try {
      const { data: authResult, error: provAuthErr } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: contact_name },
        });

      if (provAuthErr) {
        // 422 = email already registered → skip provisioning silently
        if (!(provAuthErr.status === 422 || provAuthErr.message?.includes("already"))) {
          logger.error("[create-client-invite] auth provision failed", provAuthErr);
        }
      } else if (authResult?.user) {
        provisionedUserId = authResult.user.id;

        // INSERT user_profiles with status='invited'
        const { error: profErr } = await supabase
          .from("user_profiles")
          .insert({
            id: provisionedUserId,
            full_name: contact_name,
            email,
            phone: phone || null,
            organization_id,
            role: client_role || "owner_operator",
            status: "invited",
          });

        if (profErr) {
          logger.error("[create-client-invite] profile provision failed", profErr);
          await supabase.auth.admin.deleteUser(provisionedUserId);
          provisionedUserId = null;
        }
      }

      // Grant user_location_access for EACH org location
      if (provisionedUserId) {
        const { data: orgLocs } = await supabase
          .from("locations")
          .select("id")
          .eq("organization_id", organization_id);

        if (orgLocs && orgLocs.length > 0) {
          await supabase.from("user_location_access").insert(
            orgLocs.map((loc: { id: string }) => ({
              user_id: provisionedUserId!,
              organization_id,
              location_id: loc.id,
              role: client_role || "owner_operator",
            })),
          );
        }
      }
    } catch (provErr) {
      logger.error("[create-client-invite] provision block failed", provErr);
      // Non-fatal: invite still works — user gets provisioned on claim
    }

    // Journey stage: invited (shared helper — idempotent, never moves backwards)
    await stampJourneyStage(supabase, organization_id, 'invited');

    const { subject, html } = buildClientInviteEmail({
      recipientName: contact_name,
      senderName: sender_name || undefined,
      businessName: organization_name || 'your kitchen',
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
