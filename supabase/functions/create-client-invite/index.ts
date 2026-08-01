import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email.ts";
import { buildClientInviteEmail } from "../_shared/invites.ts";
import { logger } from "../_shared/logger.ts";
import { provisionClientUser } from "../_shared/provisionClientUser.ts";
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
      action, skip_send,
      invite_id, organization_id, organization_name, contact_name, email, phone, message, sender_name, client_role,
    } = body;

    const appBase = Deno.env.get("APP_PUBLIC_BASE") || "https://app.getevidly.com";

    // ═══ SEND PATH (draft → pending, send email, stamp journey) ═══
    if (action === 'send') {
      const ids: string[] = body.invite_ids || (body.invite_id ? [body.invite_id] : []);
      if (ids.length === 0) return json({ error: 'invite_ids required' }, 400, headers);
      if (ids.length > 50) return json({ error: 'Batch limit is 50' }, 400, headers);

      const results: { id: string; ok: boolean; error?: string }[] = [];

      for (const id of ids) {
        const { data: inv, error: invErr } = await supabase
          .from('evidly_client_invites')
          .select('id, organization_id, organization_name, contact_name, email, token, message, status, sent_at')
          .eq('id', id)
          .single();

        if (invErr || !inv) { results.push({ id, ok: false, error: 'Invite not found' }); continue; }
        if (inv.sent_at)    { results.push({ id, ok: false, error: 'Already sent' }); continue; }
        if (inv.status !== 'draft') {
          results.push({ id, ok: false, error: `Cannot send a ${inv.status} invite` });
          continue;
        }

        // Gate: hood cleaning certificate must be on file before sending
        const { data: hoodCerts } = await supabase
          .from('vendor_service_records')
          .select('id')
          .eq('organization_id', inv.organization_id)
          .eq('safeguard_type', 'hood_cleaning')
          .eq('is_sample', false)
          .limit(1);
        if (!hoodCerts?.length) {
          results.push({ id, ok: false, error: 'Hood cleaning certificate must be on file before sending' });
          continue;
        }

        const { subject, html } = await buildClientInviteEmail({
          recipientName: inv.contact_name,
          senderName: sender_name || undefined,
          businessName: inv.organization_name || 'your kitchen',
          inviteLink: `${appBase}/join/${inv.token}`,
          personalMessage: inv.message || undefined,
          supabase,
        });

        const emailResult = await sendEmail({ to: inv.email, subject, html });
        if (!emailResult) { results.push({ id, ok: false, error: 'Email delivery failed' }); continue; }

        const now = new Date();
        await supabase.from('evidly_client_invites').update({
          status: 'pending',
          sent_at: now.toISOString(),
          expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', id);

        if (inv.organization_id) {
          await stampJourneyStage(supabase, inv.organization_id, 'invited');
        }

        results.push({ id, ok: true });
      }

      const allOk = results.every(r => r.ok);
      return json({ success: allOk, results }, allOk ? 200 : 207, headers);
    }

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

      const { subject, html } = await buildClientInviteEmail({
        recipientName: inv.contact_name,
        senderName: sender_name || undefined,
        businessName: inv.organization_name || 'your kitchen',
        inviteLink: `${appBase}/join/${inv.token}`,
        personalMessage: inv.message || undefined,
        supabase,
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

    const insertRow: Record<string, unknown> = {
      organization_id,
      organization_name: organization_name || null,
      contact_name, email,
      phone: phone || null,
      message: message || null,
      client_role: client_role || "owner_operator",
      token, status: skip_send ? "draft" : "pending",
      invited_by: user.id,
      location_snapshot: locationSnapshot,
    };
    if (skip_send) insertRow.expires_at = null;

    const { data: created, error: insErr } = await supabase
      .from("evidly_client_invites")
      .insert(insertRow)
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
      const { userId } = await provisionClientUser({
        supabase,
        email,
        contactName: contact_name,
        organizationId: organization_id,
        phone: phone || null,
        role: client_role || "owner_operator",
      });
      provisionedUserId = userId;
    } catch (provErr) {
      logger.error("[create-client-invite] provision block failed", provErr);
      // Non-fatal: invite still works — user gets provisioned on claim
    }

    // ── skip_send: provision only, no email, no journey stamp ──
    if (skip_send) {
      return json({ success: true, invite_id: created.id, sent: false }, 200, headers);
    }

    // ── Gate: hood cleaning certificate must be on file before sending ──
    const { data: hoodCerts } = await supabase
      .from('vendor_service_records')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('safeguard_type', 'hood_cleaning')
      .eq('is_sample', false)
      .limit(1);
    if (!hoodCerts?.length) {
      await supabase.from("evidly_client_invites").update({
        status: "draft", expires_at: null,
      }).eq("id", created.id);
      return json({
        error: "Hood cleaning certificate must be on file before sending",
        invite_id: created.id, sent: false,
      }, 422, headers);
    }

    // Journey stage: invited (shared helper — idempotent, never moves backwards)
    await stampJourneyStage(supabase, organization_id, 'invited');

    const { subject, html } = await buildClientInviteEmail({
      recipientName: contact_name,
      senderName: sender_name || undefined,
      businessName: organization_name || 'your kitchen',
      inviteLink: `${appBase}/join/${token}`,
      personalMessage: message || undefined,
      supabase,
    });

    const sent = await sendEmail({ to: email, subject, html });

    if (!sent) {
      // Downgrade to draft — preserve provisioned invite + auth user
      await supabase.from("evidly_client_invites").update({
        status: "draft", expires_at: null,
      }).eq("id", created.id);
      return json({ error: "We couldn't send the invite — check the email and try again.", invite_id: created.id, sent: false }, 502, headers);
    }

    // Stamp sent_at
    await supabase.from("evidly_client_invites").update({
      sent_at: new Date().toISOString(),
    }).eq("id", created.id);

    return json({ success: true, invite_id: created.id, sent: true }, 200, headers);
  } catch (err) {
    logger.error("[create-client-invite] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
