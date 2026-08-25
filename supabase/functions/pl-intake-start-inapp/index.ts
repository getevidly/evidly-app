import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const MAX_FILES = 5;
const POLICY_TYPES: readonly string[] = [
  "property",
  "general_liability",
  "umbrella_excess",
  "spoilage_contamination",
  "bop",
  "liquor_liability",
  "other",
];

/**
 * Validates the optional multi-file inputs.
 * file_count defaults to 1 and is capped at MAX_FILES; stated_policy_types,
 * when present, must be one known value per file.
 */
function planUploads(
  body: { file_count?: unknown; stated_policy_types?: unknown },
): { ok: true; fileCount: number; statedTypes: string[] | null } | { ok: false; error: string } {
  let fileCount = 1;
  const raw = body.file_count;
  if (raw !== undefined && raw !== null) {
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1 || raw > MAX_FILES) {
      return { ok: false, error: `file_count must be an integer between 1 and ${MAX_FILES}` };
    }
    fileCount = raw;
  }

  let statedTypes: string[] | null = null;
  const types = body.stated_policy_types;
  if (types !== undefined && types !== null) {
    if (!Array.isArray(types) || types.length !== fileCount) {
      return { ok: false, error: `stated_policy_types must be an array of ${fileCount} value(s)` };
    }
    for (const t of types) {
      if (typeof t !== "string" || !POLICY_TYPES.includes(t)) {
        return { ok: false, error: `unknown stated_policy_type: ${String(t)}` };
      }
    }
    statedTypes = types as string[];
  }

  return { ok: true, fileCount, statedTypes };
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "not authenticated" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "not authenticated" }, 401);
  const userId = userData.user.id;

  let body: { carrier?: string; file_count?: unknown; stated_policy_types?: unknown };
  try { body = await req.json(); } catch { body = {}; }

  const plan = planUploads(body);
  if (!plan.ok) return json({ error: plan.error }, 400);
  const { fileCount, statedTypes } = plan;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: profile, error: profErr } = await admin
    .from("user_profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();
  if (profErr || !profile?.organization_id) return json({ error: "no organization for user" }, 404);
  const orgId = profile.organization_id;

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .select("name, primary_contact_name, primary_contact_email, primary_contact_phone, main_phone")
    .eq("id", orgId)
    .single();
  if (orgErr || !org) return json({ error: "organization not found" }, 404);

  // Pull the uploading user's profile for contact identity
  const { data: profileDetail } = await admin
    .from("user_profiles")
    .select("full_name, email, phone")
    .eq("id", userId)
    .single();

  // Prefer the logged-in user's contact info; fall back to the org's primary contact
  const contactName = profileDetail?.full_name ?? org.primary_contact_name ?? null;
  const contactEmail = profileDetail?.email ?? org.primary_contact_email ?? null;
  const contactPhone = profileDetail?.phone ?? org.primary_contact_phone ?? org.main_phone ?? null;

  const { data: intake, error: inErr } = await admin
    .from("policy_lens_intakes")
    .insert({
      source: "in_app",
      status: "received",
      business_name: org.name,
      organization_id: orgId,
      carrier: body.carrier ?? null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      first_name: contactName ? contactName.split(" ")[0] : null,
      // Stashed for pl-intake-finalize to map onto each pl_documents row
      extracted_fields: statedTypes ? { stated_policy_types: statedTypes } : null,
    })
    .select("id")
    .single();
  if (inErr || !intake) return json({ error: "failed to create intake", detail: inErr?.message }, 500);

  const uploads: Array<{ path: string; token: string; signed_url: string }> = [];
  for (let i = 1; i <= fileCount; i++) {
    const { data: signed, error: signErr } = await admin.storage
      .from("policy-lens-uploads")
      .createSignedUploadUrl(`${intake.id}/policy-${i}.pdf`);
    if (signErr || !signed) return json({ error: "failed to create upload url" }, 500);
    uploads.push({ path: signed.path, token: signed.token, signed_url: signed.signedUrl });
  }

  return json({
    ok: true,
    intake_id: intake.id,
    file_count: fileCount,
    uploads,
    // Legacy single-file fields — the first upload slot
    upload_token: uploads[0].token,
    upload_path: uploads[0].path,
  });
});
