// ═══════════════════════════════════════════════════════════
// proof-access — the public side of Estimate Proof via EvidLY.
// Actions and their rules: ./handlers.ts (client proof links) and
// ./company.ts (the company's own area).
//
// Default verify_jwt = true: the pages call with the project anon key.
// ═══════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { dispatch, type Json } from "./handlers.ts";

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

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const [payload, status] = await dispatch(db, req, body);
    return respond(payload, status);
  } catch (err) {
    console.error(`[proof-access] ${String(body.action)} failed: ${err instanceof Error ? err.message : String(err)}`);
    return respond({ error: "Internal error" }, 500);
  }
});
