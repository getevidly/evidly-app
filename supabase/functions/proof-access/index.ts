// ═══════════════════════════════════════════════════════════
// proof-access — the public side of Estimate Proof via EvidLY.
//
// No account or password. The 43-character link token is the only
// credential; it resolves exactly one estimate_proof_links row, and that
// row's company_id is the only company anything here touches.
//
//   /proof/<token>             action 'certifications', 'certification_file'
//
// Every page load and every certificate opened is logged in
// estimate_proof_views (link, page, item, IP, user agent, time).
//
// Files are never public: each View Certificate fetches a five-minute
// signed URL for that one file, and only for an item that is current.
//
// Default verify_jwt = true: the page calls with the project anon key.
// ═══════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { todayUtcMs } from "../_shared/estimateProof.ts";
import {
  companyProfile,
  currentItemPath,
  type Db,
  type LinkRow,
  linkByToken,
  listCertifications,
  logView,
  shapeCertification,
  signPath,
} from "../_shared/companyProof.ts";

type Json = Record<string, unknown>;
type Handler = (ctx: { db: Db; req: Request; body: Json; link: LinkRow; todayMs: number }) => Promise<[Json, number]>;

const str = (v: unknown, max = 100) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// ── /proof/<token> ───────────────────────────────────────────

const certifications: Handler = async ({ db, req, link, todayMs }) => {
  const [company, certs] = await Promise.all([
    companyProfile(db, link.company_id),
    listCertifications(db, link.company_id),
  ]);
  await logView(db, link, "certifications", req);
  return [{
    status: "ok",
    company_name: company.name,
    location_name: link.location_name,
    approved: !!link.approved_at,
    certifications: certs.map((c) => shapeCertification(c, todayMs)),
  }, 200];
};

const certificationFile: Handler = async ({ db, req, body, link, todayMs }) => {
  const id = str(body.item_id, 60);
  const path = id ? await currentItemPath(db, link.company_id, "company_certifications", id, todayMs) : null;
  const url = await signPath(db, path);
  if (!url) return [{ error: "This certificate is not available." }, 404];
  await logView(db, link, "certification_file", req, id);
  return [{ url }, 200];
};

const HANDLERS: Record<string, Handler> = {
  certifications,
  certification_file: certificationFile,
};

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req.headers.get("origin"));
  const respond = (payload: Json, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  let body: Json;
  try {
    body = await req.json();
  } catch {
    return respond({ error: "Invalid JSON" }, 400);
  }

  const action = str(body.action, 40);
  const handler = HANDLERS[action];
  if (!handler) return respond({ error: "Unknown action" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const link = await linkByToken(db, str(body.token, 100));
    // An unknown, revoked or malformed token: the same answer every time.
    if (!link) return respond({ status: "invalid" }, 200);
    const [payload, status] = await handler({ db, req, body, link, todayMs: todayUtcMs() });
    return respond(payload, status);
  } catch (err) {
    console.error(`[proof-access] ${action} failed: ${err instanceof Error ? err.message : String(err)}`);
    return respond({ error: "Internal error" }, 500);
  }
});
