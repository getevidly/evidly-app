import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

interface InviteRequest {
  email: string;
  inviteUrl: string;
  role: string;
  inviterName: string;
  organizationName?: string;
  invite_id?: string; // When set, triggers pre-provisioning (P2)
}

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
    const body: InviteRequest = await req.json();
    const { email, inviteUrl, role, inviterName, organizationName, invite_id } = body;

    const orgLabel = organizationName || "their team";

    // ── P2: Pre-provision shadow user when invite_id is provided ──
    if (invite_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // Read the full invitation row
      const { data: invite, error: invErr } = await supabase
        .from("user_invitations")
        .select("id, organization_id, email, full_name, phone, role, location_ids")
        .eq("id", invite_id)
        .single();

      if (!invErr && invite) {
        let provisionedUserId: string | null = null;

        try {
          // Shadow auth user — no password, email confirmed (can't log in until accept)
          const { data: authResult, error: provAuthErr } =
            await supabase.auth.admin.createUser({
              email: invite.email,
              email_confirm: true,
              user_metadata: { full_name: invite.full_name || invite.email.split("@")[0] },
            });

          if (provAuthErr) {
            // 422 = email already registered → skip provisioning (idempotent)
            if (!(provAuthErr.status === 422 || provAuthErr.message?.includes("already"))) {
              logger.error("[send-team-invite] auth provision failed", provAuthErr);
            }
            // Even if auth user exists, ensure location grants below
            // Look up existing auth user for the location grant
            const { data: existingProfile } = await supabase
              .from("user_profiles")
              .select("id")
              .eq("email", invite.email)
              .maybeSingle();
            if (existingProfile) {
              provisionedUserId = existingProfile.id;
              // Ensure location access for re-invited users
              await ensureLocationAccess(supabase, provisionedUserId, invite);
            }
          } else if (authResult?.user) {
            provisionedUserId = authResult.user.id;

            // UPSERT user_profiles with status='invited'
            // Uses upsert so status='invited' wins over any trigger-created default
            const { error: profErr } = await supabase
              .from("user_profiles")
              .upsert({
                id: provisionedUserId,
                full_name: invite.full_name || invite.email.split("@")[0],
                email: invite.email,
                phone: invite.phone || null,
                organization_id: invite.organization_id,
                role: invite.role.toLowerCase(),
                status: "invited",
              }, { onConflict: "id" });

            if (profErr) {
              logger.error("[send-team-invite] profile provision failed", profErr);
              await supabase.auth.admin.deleteUser(provisionedUserId);
              provisionedUserId = null;
            }

            // Grant per-location access from invitation.location_ids
            if (provisionedUserId) {
              await ensureLocationAccess(supabase, provisionedUserId, invite);
            }
          }
        } catch (provErr) {
          logger.error("[send-team-invite] provision block failed", provErr);
          // Non-fatal: invite still works — user gets provisioned on accept
        }
      }
    }

    // ── Send the email ──────────────────────────────────────
    const recipientName = email.split("@")[0];
    const html = buildEmailHtml({
      recipientName,
      bodyHtml: `
        <p><strong>${inviterName}</strong> has invited you to join <strong>${orgLabel}</strong> on EvidLY as <strong>${role}</strong>.</p>
        <p>EvidLY helps commercial kitchens lead with confidence through integrated food safety and facility safety management with real-time monitoring, smart checklists, and automated documentation.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-weight: 600; margin: 0 0 4px 0;">Your role: ${role}</p>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Invited by: ${inviterName}</p>
        </div>
      `,
      ctaText: "Accept Invitation \u2192",
      ctaUrl: inviteUrl,
      footerNote: "This invitation link is unique to you. If you did not expect this invite, you can safely ignore this email.",
    });

    const result = await sendEmail({
      to: email,
      subject: `You've been invited to join ${orgLabel} on EvidLY as ${role}`,
      html,
    });

    return json({
      success: true,
      message: result ? "Invitation email sent" : "Invitation logged (email service unavailable)",
      emailId: result?.id || null,
      inviteUrl,
    }, 200, headers);
  } catch (error) {
    logger.error("[send-team-invite] Error", error);
    return json({ error: (error as Error).message }, 500, headers);
  }
});

// ── Helper: insert per-location access rows (mirrors accept-team-invite) ──
async function ensureLocationAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  invite: { organization_id: string; role: string; location_ids: string[] | null },
) {
  const role = invite.role.toLowerCase();

  if (invite.location_ids && invite.location_ids.length > 0) {
    for (const locId of invite.location_ids) {
      await supabase
        .from("user_location_access")
        .upsert(
          { user_id: userId, organization_id: invite.organization_id, location_id: locId, role },
          { onConflict: "user_id,organization_id,location_id" },
        );
    }
  } else {
    const { data: orgLocs } = await supabase
      .from("locations")
      .select("id")
      .eq("organization_id", invite.organization_id);

    if (orgLocs && orgLocs.length > 0) {
      for (const loc of orgLocs) {
        await supabase
          .from("user_location_access")
          .upsert(
            { user_id: userId, organization_id: invite.organization_id, location_id: loc.id, role },
            { onConflict: "user_id,organization_id,location_id" },
          );
      }
    } else {
      await supabase
        .from("user_location_access")
        .upsert(
          { user_id: userId, organization_id: invite.organization_id, role },
          { onConflict: "user_id,organization_id,location_id" },
        );
    }
  }
}
