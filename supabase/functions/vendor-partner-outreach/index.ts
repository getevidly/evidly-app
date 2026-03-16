/**
 * vendor-partner-outreach — Daily cron (9 AM PT / 17:00 UTC)
 *
 * 3-step outreach sequence for vendor partners:
 *  Step 0 → send Step 1 immediately after manual add
 *  Step 1 → send Step 2 after 5 days
 *  Step 2 → send Step 3 after 10 days
 *  After Step 3 → set status = 'contacted', stop sequence
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const REPLY_TO = "founders@getevidly.com";

// ── Helper: escape HTML ──────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Friendly category labels ─────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  hood_cleaning: "hood cleaning",
  suppression: "fire suppression",
  fire_extinguisher: "fire extinguisher inspection",
  grease_trap: "grease trap/FOG management",
  pest_control: "pest control",
  backflow: "backflow prevention",
  elevator: "elevator inspection",
};

function categoryLabel(cat: string | null): string {
  if (!cat) return "commercial kitchen services";
  return CATEGORY_LABELS[cat] || cat.replace(/_/g, " ");
}

// ── Email content generators ─────────────────────────────────────

interface VendorPartner {
  company_name: string;
  contact_name: string | null;
  contact_email: string;
  vendor_category: string | null;
}

function step1Email(v: VendorPartner): { subject: string; bodyHtml: string } {
  const name = v.contact_name || "there";
  const cat = categoryLabel(v.vendor_category);
  return {
    subject: "A compliance platform that sends you business",
    bodyHtml: `
      <p>I'm Arthur Haggerty, founder of EvidLY — a compliance intelligence platform for California commercial kitchens.</p>
      <p><strong>Here's why I'm reaching out to ${esc(v.company_name)}:</strong></p>
      <p>EvidLY tracks service currency for ${esc(cat)} across our operator network. When a kitchen's records show a service is overdue or a vendor hasn't been confirmed, we alert the operator — and surface recommended vendors in their area.</p>
      <p>If you serve California commercial kitchens, I'd like to discuss having ${esc(v.company_name)} listed as a preferred provider in EvidLY for operators in your service area.</p>
      <p>No cost to be listed. We send you qualified leads.</p>
      <p>15 minutes: <a href="https://calendly.com/founders-getevidly/60min" style="color:#1e4d6b;">calendly.com/founders-getevidly/60min</a><br/>Or reply directly — I check this email personally.</p>
      <p style="margin-top:24px;color:#64748b;font-size:13px;">
        — Arthur Haggerty<br/>
        EvidLY · (209) 600-7675
      </p>
    `,
  };
}

function step2Email(v: VendorPartner): { subject: string; bodyHtml: string } {
  const cat = categoryLabel(v.vendor_category);
  return {
    subject: "Following up — EvidLY vendor partner program",
    bodyHtml: `
      <p>Following up on my note from last week.</p>
      <p>One thing I should have mentioned: EvidLY operators who use the platform see exactly when their ${esc(cat)} service is due. They get a reminder. They need to schedule.</p>
      <p>We want to send those operators to partners we trust — companies with verified COIs, current licenses, and a track record of quality work.</p>
      <p>Is ${esc(v.company_name)} interested in being that partner for your area?</p>
      <p style="margin-top:24px;color:#64748b;font-size:13px;">— Arthur</p>
    `,
  };
}

function step3Email(v: VendorPartner): { subject: string; bodyHtml: string } {
  const cat = categoryLabel(v.vendor_category);
  return {
    subject: "What EvidLY partner status looks like in practice",
    bodyHtml: `
      <p>Last note from me on this — I want to make sure you have the full picture before I move on.</p>
      <p><strong>What EvidLY vendor partner status means:</strong></p>
      <ul style="color:#334155;line-height:1.8;">
        <li>Your company surfaces when operators in your area are due for ${esc(cat)} service</li>
        <li>Operators can request a quote directly from EvidLY</li>
        <li>Your completed service records sync back to EvidLY (no double entry for your team)</li>
        <li>Your COI and license are verified once — operators see you as pre-vetted</li>
      </ul>
      <p>We're building this network now, before we scale. Early partners get preferred positioning.</p>
      <p>Reply or book a call if you're interested:<br/><a href="https://calendly.com/founders-getevidly/60min" style="color:#1e4d6b;">calendly.com/founders-getevidly/60min</a></p>
      <p style="margin-top:24px;color:#64748b;font-size:13px;">
        — Arthur Haggerty<br/>
        EvidLY · founders@getevidly.com · (209) 600-7675
      </p>
    `,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      sent: [] as { company: string; step: number }[],
      skipped: 0,
      errors: [] as string[],
    };

    const now = new Date();

    // Get all prospect vendors
    const { data: prospects, error: fetchErr } = await supabase
      .from("vendor_partners")
      .select("*")
      .eq("status", "prospect")
      .order("created_at", { ascending: true });

    if (fetchErr) throw fetchErr;
    if (!prospects || prospects.length === 0) {
      return jsonResponse({ message: "No prospect vendors", ...results });
    }

    for (const vendor of prospects) {
      const v: VendorPartner = {
        company_name: vendor.company_name,
        contact_name: vendor.contact_name,
        contact_email: vendor.contact_email,
        vendor_category: vendor.vendor_category,
      };
      const recipientName = vendor.contact_name || "there";
      const currentStep = vendor.outreach_step || 0;

      // Determine which step to send
      let emailContent: { subject: string; bodyHtml: string } | null = null;
      let nextStep = currentStep;

      if (currentStep === 0) {
        // Send Step 1 immediately (first run after admin adds vendor)
        emailContent = step1Email(v);
        nextStep = 1;
      } else if (currentStep === 1 && vendor.last_emailed_at) {
        const daysSince = Math.floor(
          (now.getTime() - new Date(vendor.last_emailed_at).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (daysSince >= 5) {
          emailContent = step2Email(v);
          nextStep = 2;
        }
      } else if (currentStep === 2 && vendor.last_emailed_at) {
        const daysSince = Math.floor(
          (now.getTime() - new Date(vendor.last_emailed_at).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (daysSince >= 5) {
          emailContent = step3Email(v);
          nextStep = 3;
        }
      }

      if (!emailContent) {
        results.skipped++;
        continue;
      }

      // Build branded HTML
      const html = buildEmailHtml({
        recipientName,
        bodyHtml: emailContent.bodyHtml,
        ctaText: "Book a 15-Minute Call →",
        ctaUrl: "https://calendly.com/founders-getevidly/60min",
      });

      const result = await sendEmail({
        to: vendor.contact_email,
        subject: emailContent.subject,
        html,
        replyTo: REPLY_TO,
      });

      if (result) {
        // Update vendor record
        const updatePayload: Record<string, unknown> = {
          outreach_step: nextStep,
          last_emailed_at: now.toISOString(),
        };

        // After step 3, mark as contacted
        if (nextStep >= 3) {
          updatePayload.status = "contacted";
        }

        await supabase
          .from("vendor_partners")
          .update(updatePayload)
          .eq("id", vendor.id);

        results.sent.push({ company: vendor.company_name, step: nextStep });
        logger.info(
          "[VENDOR-OUTREACH]",
          `Step ${nextStep} sent to`,
          vendor.contact_email,
        );
      } else {
        results.errors.push(
          `Failed to send step ${nextStep} to ${vendor.company_name}`,
        );
      }
    }

    return jsonResponse({ success: true, ...results });
  } catch (error) {
    logger.error("[VENDOR-OUTREACH] Fatal error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
