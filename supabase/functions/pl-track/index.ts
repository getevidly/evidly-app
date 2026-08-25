/**
 * PL Track — open pixel and click redirect for Policy Lens email.
 *
 *   GET /pl-track?a=o&t=<token>              -> 1x1 GIF, logs the open
 *   GET /pl-track?a=c&t=<token>&to=<url>     -> 302 to `to`, logs the click
 *
 * The token is HMAC-signed (PL_AUTH_SIGN_SECRET, the same scheme
 * pl-intake-start / pl-authorize-sign use) and carries
 * { agent_id, intake_id?, kind }.
 *
 * THIS ENDPOINT NEVER RENDERS AN ERROR. It is loaded by mail clients,
 * where a broken image or an error page is what the recipient sees.
 * Every failure path — bad signature, unknown action, dead database —
 * degrades to a silent 204 (pixel) or a 302 to the marketing home
 * (click). Nothing is logged to the recipient, only to the console.
 *
 * Public by design: verify_jwt = false. The signature IS the auth.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { verifyTrackToken } from "../_shared/disclosure.ts";
import type { TrackKind } from "../_shared/disclosure.ts";

/** Where a rejected or malformed click lands. */
const SAFE_HOME = "https://getevidly.com";

/** The only hosts a click may be redirected to. */
const ALLOWED_HOSTS = ["getevidly.com", "app.getevidly.com"];

/** 43-byte fully transparent 1x1 GIF. */
const PIXEL_B64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function pixelBytes(): Uint8Array {
  const binary = atob(PIXEL_B64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** The GIF, with caching disabled so every open is a fresh request. */
function pixelResponse(): Response {
  return new Response(pixelBytes(), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
      "Expires": "0",
      "Content-Length": "43",
    },
  });
}

/** Silent no-op for a pixel we refuse to record. */
function pixelNoop(): Response {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

function redirect(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { "Location": url, "Cache-Control": "no-store" },
  });
}

/**
 * Open-redirect guard: only https URLs on getevidly.com or
 * app.getevidly.com survive. Everything else becomes the home page —
 * including javascript:, protocol-relative, and lookalike hosts such
 * as getevidly.com.attacker.example.
 */
function safeDestination(raw: string | null): string {
  if (!raw) return SAFE_HOME;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return SAFE_HOME;
  }
  if (parsed.protocol !== "https:") return SAFE_HOME;
  if (!ALLOWED_HOSTS.includes(parsed.hostname.toLowerCase())) return SAFE_HOME;
  return parsed.toString();
}

/** Actions map to the kinds they are allowed to record. */
const ACTION_KINDS: Record<string, TrackKind[]> = {
  o: ["invite_opened", "client_opened"],
  c: ["invite_clicked", "client_clicked"],
};

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("a") ?? "";
  const token = url.searchParams.get("t");
  const isClick = action === "c";

  // Every early return below is deliberately indistinguishable from a
  // success to the mail client.
  const bail = () => (isClick ? redirect(safeDestination(url.searchParams.get("to"))) : pixelNoop());

  try {
    if (req.method !== "GET" && req.method !== "HEAD") return bail();
    if (action !== "o" && action !== "c") return pixelNoop();
    if (!token) return bail();

    let payload;
    try {
      payload = await verifyTrackToken(token);
    } catch (verifyErr) {
      logger.error("[pl-track] Token rejected", verifyErr);
      return bail();
    }

    // The token's kind has to belong to the action being performed —
    // an open token cannot be replayed as a click, or the reverse.
    if (!ACTION_KINDS[action].includes(payload.kind)) {
      logger.error("[pl-track] Kind does not match action", {
        action,
        kind: payload.kind,
      });
      return bail();
    }

    // ── Record the event. A failure here must not cost the redirect. ──
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      // Either id may legitimately be null — an agent-led send has no
      // intake, an intake-sourced send has no pl_agents row.
      const { error: insertErr } = await supabase.from("pl_send_events").insert({
        agent_id: payload.agent_id ?? null,
        intake_id: payload.intake_id ?? null,
        kind: payload.kind,
      });
      if (insertErr) {
        // Loud on purpose: this is the only place a tracked event can be
        // lost, and the reader still gets a pixel either way.
        console.error("[pl-track] Event insert FAILED", JSON.stringify({
          kind: payload.kind,
          agent_id: payload.agent_id ?? null,
          intake_id: payload.intake_id ?? null,
          code: insertErr.code ?? null,
          message: insertErr.message ?? String(insertErr),
          details: insertErr.details ?? null,
        }));
        logger.error("[pl-track] Event insert failed", insertErr);
      }
    } catch (dbErr) {
      logger.error("[pl-track] Event insert threw", dbErr);
    }

    return isClick
      ? redirect(safeDestination(url.searchParams.get("to")))
      : pixelResponse();
  } catch (err) {
    logger.error("[pl-track] Unhandled error", err);
    return bail();
  }
});
