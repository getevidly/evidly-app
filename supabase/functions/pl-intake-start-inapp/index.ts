import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

  let body: { carrier?: string };
  try { body = await req.json(); } catch { body = {}; }

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
    })
    .select("id")
    .single();
  if (inErr || !intake) return json({ error: "failed to create intake", detail: inErr?.message }, 500);

  const { data: signed, error: signErr } = await admin.storage
    .from("policy-lens-uploads")
    .createSignedUploadUrl(`${intake.id}/policy.pdf`);
  if (signErr || !signed) return json({ error: "failed to create upload url" }, 500);

  return json({ ok: true, intake_id: intake.id, upload_token: signed.token, upload_path: signed.path });
});
