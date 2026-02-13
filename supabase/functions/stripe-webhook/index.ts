import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Map Stripe price IDs to human-readable plan names
function getPlanName(priceId: string): string {
  if (priceId.includes("founder")) return "founder";
  if (priceId.includes("professional")) return "professional";
  if (priceId.includes("enterprise")) return "enterprise";
  return "unknown";
}

async function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const parts = signature.split(",");
  const timestamp = parts.find((p) => p.startsWith("t="))?.split("=")[1];
  const v1Signature = parts.find((p) => p.startsWith("v1="))?.split("=")[1];

  if (!timestamp || !v1Signature) return false;

  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSignature === v1Signature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook signature
    const isValid = await verifyStripeSignature(body, signature, webhookSecret);
    if (!isValid) {
      console.error("Invalid Stripe webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(body);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const subscriptionId = session.subscription;

        if (!userId || !subscriptionId) {
          console.error("Missing userId or subscriptionId in checkout session");
          break;
        }

        // Fetch the full subscription from Stripe to get price details
        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
        const subRes = await fetch(
          `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
          {
            headers: { Authorization: `Bearer ${stripeSecretKey}` },
          }
        );
        const subscription = await subRes.json();

        const priceId = subscription.items?.data?.[0]?.price?.id || "";
        const planName = getPlanName(priceId);

        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: priceId,
            plan_name: planName,
            status: subscription.status || "active",
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            cancel_at: subscription.cancel_at
              ? new Date(subscription.cancel_at * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_subscription_id" }
        );

        console.log(`Subscription created for user ${userId}: ${planName}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const priceId = subscription.items?.data?.[0]?.price?.id || "";
        const planName = getPlanName(priceId);

        const { error } = await supabase
          .from("subscriptions")
          .update({
            stripe_price_id: priceId,
            plan_name: planName,
            status: subscription.status,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            cancel_at: subscription.cancel_at
              ? new Date(subscription.cancel_at * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Error updating subscription:", error);
        } else {
          console.log(`Subscription updated: ${subscription.id} -> ${planName} (${subscription.status})`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            cancel_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Error canceling subscription:", error);
        } else {
          console.log(`Subscription canceled: ${subscription.id}`);
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        // Trial ending in 3 days — Stripe sends this automatically
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          // Record trial ending notification for in-app display
          await supabase.from("notifications").insert({
            user_id: userId,
            type: "trial_ending",
            title: "Your free trial ends in 3 days",
            message: "Your 30-day free trial is ending soon. Your card will be charged automatically. You can cancel anytime from Settings > Billing.",
            read: false,
            created_at: new Date().toISOString(),
          });
          console.log(`Trial ending notification created for user ${userId}`);
        }
        break;
      }

      case "invoice.paid": {
        // First payment after trial — start 45-day guarantee window
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId && invoice.billing_reason === "subscription_cycle") {
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: "active",
              guarantee_start: new Date().toISOString(),
              guarantee_end: new Date(Date.now() + 45 * 86400000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            console.error("Error updating guarantee dates:", error);
          } else {
            console.log(`Guarantee window started for subscription ${subscriptionId}`);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        // Payment failed — notify user
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          // Look up user from subscription
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", subscriptionId)
            .maybeSingle();

          if (sub?.user_id) {
            await supabase.from("notifications").insert({
              user_id: sub.user_id,
              type: "payment_failed",
              title: "Payment failed",
              message: "We couldn't process your payment. Please update your payment method in Settings > Billing to avoid service interruption.",
              read: false,
              created_at: new Date().toISOString(),
            });
            console.log(`Payment failed notification created for user ${sub.user_id}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
