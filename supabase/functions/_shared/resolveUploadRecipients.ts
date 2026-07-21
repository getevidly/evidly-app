/**
 * Centralized recipient resolution for document-upload notification emails.
 *
 * Used by both vendor-secure-upload and notify-document-upload (via the
 * flush-upload-notifications queue processor).
 *
 * Resolution chain:
 *   1. Claimed org → user_profiles filtered by routing roles, location
 *      relevance, notification_preferences opt-out, self-suppression.
 *   2. Unclaimed org → evidly_client_invites (pending) with join-link.
 *   3. Fallback → team@getevidly.com.
 */

// deno-lint-ignore-file no-explicit-any
import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { logger } from "./logger.ts";

export interface Recipient {
  email: string;
  name: string;
  userId: string | null;
  actionUrl: string;
}

export interface ResolveParams {
  supabase: SupabaseClient;
  organizationId: string;
  /** Union of eligible roles from the routing config for all docs in the batch. */
  roles: string[];
  /** Location IDs from the documents. Empty array = org-wide (no filter). */
  locationIds: string[];
  /** Document IDs — used for building the deep-link URL. */
  documentIds: string[];
  /** User IDs to exclude (self-suppression for in-app uploaders). */
  excludeUserIds?: string[];
}

export async function resolveUploadRecipients(
  params: ResolveParams,
): Promise<Recipient[]> {
  const {
    supabase,
    organizationId,
    roles,
    locationIds,
    documentIds,
    excludeUserIds = [],
  } = params;

  const docPath =
    documentIds.length === 1
      ? `/documents?doc=${documentIds[0]}`
      : "/documents";

  // ── 1. Query users with matching roles ────────────────────
  const { data: users } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, role")
    .eq("organization_id", organizationId)
    .in("role", roles)
    .not("email", "is", null);

  if (!users || users.length === 0) {
    return resolveUnclaimedFallback(supabase, organizationId, docPath);
  }

  let eligible: any[] = [...users];

  // ── 2. Location relevance ─────────────────────────────────
  if (locationIds.length > 0) {
    const { data: locAccess } = await supabase
      .from("user_location_access")
      .select("user_id, location_id")
      .eq("organization_id", organizationId);

    if (locAccess && locAccess.length > 0) {
      const locSet = new Set(locationIds);
      // Include users with access to any doc's location OR org-wide (null)
      const eligibleIds = new Set(
        locAccess
          .filter(
            (a: any) => a.location_id === null || locSet.has(a.location_id),
          )
          .map((a: any) => a.user_id),
      );
      eligible = eligible.filter((u) => eligibleIds.has(u.id));
    }
    // If no user_location_access rows exist at all, skip filter (legacy orgs)
  }

  // ── 3. Self-suppression ───────────────────────────────────
  if (excludeUserIds.length > 0) {
    const excludeSet = new Set(excludeUserIds);
    eligible = eligible.filter((u) => !excludeSet.has(u.id));
  }

  // ── 4. Notification-preferences opt-out ───────────────────
  if (eligible.length > 0) {
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id, email_enabled")
      .in(
        "user_id",
        eligible.map((u) => u.id),
      )
      .eq("category", "documents");

    if (prefs && prefs.length > 0) {
      const optedOut = new Set(
        prefs.filter((p: any) => p.email_enabled === false).map((p: any) => p.user_id),
      );
      eligible = eligible.filter((u) => !optedOut.has(u.id));
    }
  }

  if (eligible.length === 0) {
    logger.info("[RECIPIENTS] All users filtered out (opt-out/location/self)", organizationId);
    return [];
  }

  return eligible.map((u) => ({
    email: u.email as string,
    name: (u.full_name as string) || "Team",
    userId: u.id as string,
    actionUrl: `https://app.getevidly.com${docPath}`,
  }));
}

// ── Unclaimed-org fallback chain ──────────────────────────────

async function resolveUnclaimedFallback(
  supabase: SupabaseClient,
  organizationId: string,
  docPath: string,
): Promise<Recipient[]> {
  // Try pending invite
  const { data: pendingInvites } = await supabase
    .from("evidly_client_invites")
    .select("token, email, contact_name")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .not("email", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (pendingInvites && pendingInvites.length > 0) {
    const inv = pendingInvites[0] as any;
    return [
      {
        email: inv.email,
        name: inv.contact_name || "Team",
        userId: null,
        actionUrl: `https://app.getevidly.com/join/${inv.token}?returnTo=${encodeURIComponent(docPath)}`,
      },
    ];
  }

  // Last resort: support inbox
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .single();

  return [
    {
      email: "team@getevidly.com",
      name: (org as any)?.name || "Team",
      userId: null,
      actionUrl: `https://app.getevidly.com${docPath}`,
    },
  ];
}
