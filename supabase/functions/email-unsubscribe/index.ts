import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function html(body: string, status = 200): Response {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>EvidLY</title>
<style>body{margin:0;padding:0;background:#F7F1E6;font-family:'Inter',Arial,sans-serif;}
.card{max-width:480px;margin:60px auto;background:#fff;border:1px solid #EEE7D9;border-radius:8px;padding:40px;text-align:center;}
h1{color:#1C2A3A;font-size:22px;margin:0 0 16px;}
p{color:#4A5566;font-size:15px;line-height:1.6;margin:8px 0;}
a.link{color:#1C2A3A;text-decoration:underline;font-size:13px;}
.brand{color:#9A9384;font-size:11px;margin-top:24px;}</style>
</head><body><div class="card">${body}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function resolveTokenEmail(token: string): Promise<string | null> {
  // Check county_briefing_recipients first
  const { data: cbr } = await supabase
    .from("county_briefing_recipients")
    .select("email")
    .eq("unsub_token", token)
    .maybeSingle();
  if (cbr?.email) return cbr.email.toLowerCase();

  // Check study_email_log
  const { data: sel } = await supabase
    .from("study_email_log")
    .select("recipient_email")
    .eq("unsub_token", token)
    .maybeSingle();
  if (sel?.recipient_email) return sel.recipient_email.toLowerCase();

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") {
    return html("<h1>Method not allowed</h1>", 405);
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return html(
      `<h1>Missing link</h1>
       <p>This unsubscribe link is incomplete. If you copied it from an email, make sure you got the full URL.</p>`,
      400,
    );
  }

  const email = await resolveTokenEmail(token);

  if (!email) {
    return html(
      `<h1>Invalid or expired link</h1>
       <p>This unsubscribe link is no longer valid. If you continue to receive unwanted emails, reply to any EvidLY email with the word "unsubscribe" and we will remove you manually.</p>`,
      404,
    );
  }

  const undo = url.searchParams.get("undo") === "1";
  const baseUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/email-unsubscribe`;

  if (undo) {
    // Re-subscribe: remove from suppressions
    await supabase
      .from("email_suppressions")
      .delete()
      .eq("email", email);

    logger.info("[UNSUB] Re-subscribed", email, "token:", token);

    return html(
      `<h1>You have been re-subscribed</h1>
       <p>Future campaign emails to <strong>${email}</strong> will resume.</p>
       <p class="brand">EvidLY &middot; Commercial Kitchen Risk Management</p>`,
    );
  }

  // Unsubscribe: upsert into suppressions
  await supabase
    .from("email_suppressions")
    .upsert(
      {
        email,
        reason: "One-click unsubscribe",
        source: "email-unsubscribe",
        suppressed_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );

  logger.info("[UNSUB] Unsubscribed", email, "token:", token);

  const resubUrl = `${baseUrl}?token=${encodeURIComponent(token)}&undo=1`;

  return html(
    `<h1>You have been unsubscribed</h1>
     <p>You will no longer receive campaign emails from EvidLY at <strong>${email}</strong>.</p>
     <p>Unsubscribed by mistake? <a class="link" href="${resubUrl}">Click here to re-subscribe</a>.</p>
     <p class="brand">EvidLY &middot; Commercial Kitchen Risk Management</p>`,
  );
});
