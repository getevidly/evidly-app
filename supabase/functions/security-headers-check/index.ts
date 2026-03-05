import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { domains } = await req.json();

    if (!Array.isArray(domains) || domains.length === 0) {
      return new Response(JSON.stringify({ error: "domains array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.all(
      domains.map(async (domain: string) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          const res = await fetch(`https://${domain}`, {
            method: "HEAD",
            signal: controller.signal,
            headers: { "User-Agent": "EvidLY-SecurityCheck/1.0" },
          });
          clearTimeout(timeout);

          return {
            domain,
            https: true,
            hsts: !!res.headers.get("strict-transport-security"),
            csp: !!res.headers.get("content-security-policy"),
            xframe:
              res.headers.get("x-frame-options") === "DENY" ||
              res.headers.get("x-frame-options") === "SAMEORIGIN",
            xctype: res.headers.get("x-content-type-options") === "nosniff",
            referrer: !!res.headers.get("referrer-policy"),
            permissions: !!res.headers.get("permissions-policy"),
            status: res.status,
            checked_at: new Date().toISOString(),
          };
        } catch (e: any) {
          return {
            domain,
            https: false,
            hsts: false,
            csp: false,
            xframe: false,
            xctype: false,
            referrer: false,
            permissions: false,
            error: e.name === "AbortError" ? "Timeout after 10s" : e.message,
            checked_at: new Date().toISOString(),
          };
        }
      })
    );

    // Log the check
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("admin_event_log").insert({
      level: "INFO",
      category: "security",
      message: `Security headers checked for ${domains.length} domains`,
      metadata: { domains, results: results.map((r) => ({ domain: r.domain, https: r.https, hsts: r.hsts, csp: r.csp })) },
    });

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
