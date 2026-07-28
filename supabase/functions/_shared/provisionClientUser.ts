/**
 * _shared/provisionClientUser.ts — PROVISION-SHARED-01
 *
 * Shadow-auth-user + user_profiles + user_location_access provisioning,
 * extracted from create-client-invite so that hoodops-webhook (and any
 * other service-role caller) can provision a client user without needing
 * a JWT or staff gate.
 *
 * Requires a SERVICE-ROLE Supabase client. Callers must enforce their
 * own auth before invoking.
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { logger } from "./logger.ts";

export interface ProvisionClientUserParams {
  supabase: SupabaseClient;
  email: string;
  contactName: string;
  organizationId: string;
  phone?: string | null;
  role?: string;
}

export interface ProvisionClientUserResult {
  userId: string | null;
  adopted: boolean;
}

/**
 * Provision a shadow auth user, user_profiles row (status='invited'),
 * and user_location_access for every location in the org.
 *
 * Idempotent: if the auth user already exists (422), adopts it
 * unless the existing profile belongs to a different org.
 */
export async function provisionClientUser(
  params: ProvisionClientUserParams,
): Promise<ProvisionClientUserResult> {
  const {
    supabase,
    email,
    contactName,
    organizationId,
    phone = null,
    role = "owner_operator",
  } = params;

  let userId: string | null = null;
  let adopted = false;

  try {
    // ── 1. Create shadow auth user (no password — can't log in until claim) ──
    const { data: authResult, error: provAuthErr } =
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: contactName },
      });

    if (provAuthErr) {
      const is422 =
        provAuthErr.status === 422 ||
        String(provAuthErr.message ?? "").includes("already registered");

      if (is422) {
        // ── ADOPT PATH: auth user exists — resolve id, upsert profile + access ──
        const { data: existingUid, error: lookupErr } = await supabase.rpc(
          "auth_uid_by_email",
          { p_email: email },
        );

        if (lookupErr || !existingUid) {
          logger.error("[provisionClientUser] adopt lookup failed", lookupErr);
          return { userId: null, adopted: false };
        }

        // Guard: if profile exists under a DIFFERENT org, do not clobber
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("organization_id")
          .eq("id", existingUid)
          .maybeSingle();

        if (existingProfile && existingProfile.organization_id !== organizationId) {
          logger.warn(
            `[provisionClientUser] profile ${existingUid} belongs to different org — skipping`,
          );
          return { userId: null, adopted: false };
        }

        userId = existingUid;
        adopted = true;

        const { error: profErr } = await supabase
          .from("user_profiles")
          .upsert({
            id: existingUid,
            full_name: contactName,
            email,
            phone: phone || null,
            organization_id: organizationId,
            role,
            status: "invited",
          }, { onConflict: "id" });

        if (profErr) {
          logger.error("[provisionClientUser] adopt profile upsert failed", profErr);
          return { userId: null, adopted: false };
        }
      } else {
        logger.error("[provisionClientUser] auth provision failed", provAuthErr);
        return { userId: null, adopted: false };
      }
    } else if (authResult?.user) {
      userId = authResult.user.id;

      // INSERT user_profiles with status='invited'
      const { error: profErr } = await supabase
        .from("user_profiles")
        .insert({
          id: userId,
          full_name: contactName,
          email,
          phone: phone || null,
          organization_id: organizationId,
          role,
          status: "invited",
        });

      if (profErr) {
        logger.error("[provisionClientUser] profile insert failed", profErr);
        await supabase.auth.admin.deleteUser(userId);
        return { userId: null, adopted: false };
      }
    }

    // ── 2. Grant user_location_access for every org location (upsert — safe on repeat) ──
    if (userId) {
      const { data: orgLocs } = await supabase
        .from("locations")
        .select("id")
        .eq("organization_id", organizationId);

      if (orgLocs && orgLocs.length > 0) {
        await supabase.from("user_location_access").upsert(
          orgLocs.map((loc: { id: string }) => ({
            user_id: userId!,
            organization_id: organizationId,
            location_id: loc.id,
            role,
          })),
          { onConflict: "user_id,organization_id,location_id" },
        );
      }
    }

    return { userId, adopted };
  } catch (err) {
    logger.error("[provisionClientUser] unexpected error", (err as Error).message);
    return { userId: null, adopted: false };
  }
}
