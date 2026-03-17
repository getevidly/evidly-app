import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "https://app.getevidly.com";

    // Authenticate user from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { priceId, tier, locationCount } = await req.json();
    if (!priceId) {
      return new Response(JSON.stringify({ error: "priceId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reject enterprise-scale via checkout (must contact sales)
    if (tier === "enterprise" || (locationCount && locationCount > 10)) {
      return new Response(JSON.stringify({ error: "Contact sales for 11+ locations" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up existing Stripe customer
    const { data: existingCustomer } = await supabaseAuth
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let stripeCustomerId = existingCustomer?.stripe_customer_id;

    // Create Stripe customer if not found
    if (!stripeCustomerId) {
      const customerRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: user.email || "",
          "metadata[supabase_user_id]": user.id,
        }),
      });
      const customer = await customerRes.json();

      if (customer.error) {
        throw new Error(customer.error.message);
      }

      stripeCustomerId = customer.id;

      await supabaseAuth.from("stripe_customers").insert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
      });
    }

    // Build line items — multi-location adds additional location line items
    const params = new URLSearchParams();
    params.set("customer", stripeCustomerId!);
    params.set("mode", "subscription");
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("subscription_data[trial_period_days]", "30");
    params.set("subscription_data[metadata][supabase_user_id]", user.id);
    params.set("subscription_data[metadata][tier]", tier || "founder_single");
    params.set("success_url", `${appUrl}/settings?tab=billing&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${appUrl}/settings?tab=billing`);
    params.set("metadata[supabase_user_id]", user.id);

    if (tier === "founder_multi" && locationCount && locationCount > 1) {
      const additionalPriceId = Deno.env.get("STRIPE_FOUNDER_ADDITIONAL_PRICE_ID");
      if (additionalPriceId) {
        params.set("line_items[1][price]", additionalPriceId);
        params.set("line_items[1][quantity]", String(locationCount - 1));
      }
      params.set("subscription_data[metadata][location_count]", String(locationCount));
    }

    // Create Stripe Checkout Session
    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const session = await sessionRes.json();

    if (session.error) {
      throw new Error(session.error.message);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
