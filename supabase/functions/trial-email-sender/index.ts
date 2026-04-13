/**
 * trial-email-sender — Daily cron (7 AM PT / 15:00 UTC)
 *
 * Sends the 14-day trial email sequence:
 *  - Welcome (day 0, all roles)
 *  - Series 1: How-to-use (days 1–14, operational roles)
 *  - Series 2: Lead with Confidence (days 1–14, leadership roles)
 *  - Owner/Operator gets both series on alternating days (odd=S1, even=S2)
 *  - Referral requests on day 5 and day 10 (all roles)
 *  - Trial warnings on day 7, 13, 14 (all roles)
 *
 * Dedup: trial_email_log table with UNIQUE(user_id, email_key)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
let corsHeaders = getCorsHeaders(null);

const APP_URL = "https://app.getevidly.com";
const REPLY_TO = "founders@getevidly.com";
const MAX_RUNTIME_MS = 50_000;

// ── Role sets ────────────────────────────────────────────────────
const SERIES_1_ROLES = new Set([
  "owner_operator",
  "facilities_manager",
  "chef",
  "kitchen_manager",
  "kitchen_staff",
]);
const SERIES_2_ROLES = new Set([
  "owner_operator",
  "executive",
  "compliance_officer",
]);

// ── Helper: escape HTML ──────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Helper: format date for display ──────────────────────────────
function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Arthur signature block ───────────────────────────────────────
const ARTHUR_SIG = `
<p style="margin-top:24px;color:#64748b;font-size:13px;">
  — Arthur Haggerty<br/>
  Founder, EvidLY<br/>
  (209) 600-7675 · founders@getevidly.com
</p>`;

const ARTHUR_SHORT = `<p style="margin-top:16px;color:#64748b;font-size:13px;">— Arthur</p>`;

// ═══════════════════════════════════════════════════════════════════
// EMAIL CONTENT GENERATORS
// Each returns { subject, bodyHtml, ctaText?, ctaUrl?, footerNote? }
// ═══════════════════════════════════════════════════════════════════

interface EmailContent {
  subject: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}

// ── WELCOME (Day 0) ──────────────────────────────────────────────
function welcomeEmail(firstName: string, trialEndDate: string): EmailContent {
  return {
    subject: "Welcome to EvidLY — here's what happens next",
    bodyHtml: `
      <p>You're in. Your 14-day trial starts today.</p>
      <p><strong>Here's what EvidLY does for you:</strong></p>
      <p>EvidLY watches your California kitchen so you know what your inspector knows — before they show up.</p>
      <p>Over the next 14 days, you'll get one email each morning with exactly what to do that day to get the most out of your trial.</p>
      <p><strong>Today's one task:</strong><br/>Log your first temperature reading.</p>
      ${ARTHUR_SIG}
    `,
    ctaText: "Log a Temperature →",
    ctaUrl: `${APP_URL}/temp`,
    footerNote: `Your trial ends ${fmtDate(trialEndDate)}. No credit card required to continue exploring — we'll reach out before it ends.`,
  };
}

// ── SERIES 1: How to Use (Days 1–14) ────────────────────────────

function series1(day: number, firstName: string, county: string): EmailContent | null {
  const emails: Record<number, () => EmailContent> = {
    1: () => ({
      subject: "Day 1: Your first task takes 2 minutes",
      bodyHtml: `
        <p>Day 1 of 14. Let's start simple.</p>
        <p><strong>YOUR TASK TODAY:</strong> Log a temperature reading.</p>
        <p>Pick any piece of equipment — walk-in cooler, hot-holding, prep station — and log the reading. Takes 2 minutes.</p>
        <p><strong>Why this matters:</strong><br/>
        Every temperature you log builds your compliance record. When your ${esc(county)} County EHD inspector asks for documentation, you'll have it. When your insurance carrier asks for records, you'll have it.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Log a Temperature Now →",
      ctaUrl: `${APP_URL}/temp`,
    }),
    2: () => ({
      subject: "Day 2: The checklist that replaces the clipboard",
      bodyHtml: `
        <p>Day 2. Yesterday you logged a temp. Today: your first checklist.</p>
        <p><strong>YOUR TASK TODAY:</strong> Complete an opening or closing checklist.</p>
        <p>EvidLY built your checklist from ${esc(county)} County's actual inspection criteria — not a generic template. Every item maps to a CalCode section your inspector checks.</p>
        <p style="color:#64748b;font-size:13px;"><strong>Pro tip:</strong> Assign the opening checklist to your morning staff. They complete it on their phone. You see it done in real time.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Complete a Checklist →",
      ctaUrl: `${APP_URL}/checklists`,
    }),
    3: () => ({
      subject: `Day 3: How does ${county} County inspect kitchens like yours?`,
      bodyHtml: `
        <p>Day 3. Today's task is about understanding your inspector.</p>
        <p><strong>YOUR TASK TODAY:</strong> Review your jurisdiction profile.</p>
        <p>${esc(county)} County EHD has a specific inspection methodology. EvidLY pulled this directly from their public records — this is how they actually inspect.</p>
        <p>Knowing this changes how you prepare.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "See Your Jurisdiction Profile →",
      ctaUrl: `${APP_URL}/jurisdiction-intelligence`,
    }),
    4: () => ({
      subject: "Day 4: Who services your kitchen — and when are they due?",
      bodyHtml: `
        <p>Day 4. Today is about your service providers.</p>
        <p><strong>YOUR TASK TODAY:</strong> Add your hood cleaning and fire suppression vendors.</p>
        <p>When you add them, EvidLY tracks:</p>
        <ul style="color:#334155;line-height:1.8;">
          <li>When they last serviced your equipment</li>
          <li>When they're due back (NFPA 96-2024 Table 12.4)</li>
          <li>Whether their COI and license are current</li>
        </ul>
        <p>No more chasing paper. No more wondering if you're covered.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Add Your Vendors →",
      ctaUrl: `${APP_URL}/vendors`,
    }),
    5: () => ({
      subject: "Day 5: Log a service + a quick favor",
      bodyHtml: `
        <p>Day 5. Two things today — quick task first.</p>
        <p><strong>YOUR TASK TODAY:</strong> Log a completed service.</p>
        <p>Hood cleaning done last month? Log it. Fire suppression inspected last quarter? Log it. This builds your compliance history and starts tracking your next due dates automatically.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Log a Service Record →",
      ctaUrl: `${APP_URL}/vendors`,
    }),
    6: () => ({
      subject: "Day 6: Inspect yourself before they do",
      bodyHtml: `
        <p>Day 6. Today you become the inspector.</p>
        <p><strong>YOUR TASK TODAY:</strong> Run a self-inspection.</p>
        <p>EvidLY walks you through exactly what a ${esc(county)} County EHD inspector would check — in the order they check it, weighted by how they score it.</p>
        <p>Takes 10–15 minutes. At the end you get a report showing what would have been cited if they walked in today.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Start a Self-Inspection →",
      ctaUrl: `${APP_URL}/inspection-tools`,
    }),
    7: () => ({
      subject: "Day 7: Halfway through your trial — and your HACCP plan",
      bodyHtml: `
        <p>Day 7. You're halfway through your 14-day trial.</p>
        <p><strong>YOUR TASK TODAY:</strong> Review your HACCP control points.</p>
        <p>CalCode requires documented HACCP plans for kitchens doing specialized processes. EvidLY can generate a draft HACCP plan in minutes — reviewed by your CFPM before use.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="font-weight:600;margin:0 0 4px;color:#1e4d6b;">TRIAL UPDATE: 7 days remaining.</p>
          <p style="color:#64748b;font-size:14px;margin:0;">You've been building your compliance foundation this week. Next week we go deeper — corrective actions, facility safety, and your full readiness picture.</p>
        </div>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Review HACCP →",
      ctaUrl: `${APP_URL}/haccp`,
    }),
    8: () => ({
      subject: "Day 8: When something goes wrong, here's what to do",
      bodyHtml: `
        <p>Day 8. Today: corrective actions.</p>
        <p><strong>YOUR TASK TODAY:</strong> Create a corrective action (or review an existing one).</p>
        <p>Every time something fails — a temperature excursion, a failed checklist item, a vendor no-show — that's a corrective action. EvidLY tracks it from Reported → Assigned → Resolved → Verified.</p>
        <p><strong>Why it matters:</strong> Inspectors look for documented corrective actions as proof you take food safety seriously. "We fixed it" isn't enough. "We fixed it, here's the record" is.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Review Corrective Actions →",
      ctaUrl: `${APP_URL}/corrective-actions`,
    }),
    9: () => ({
      subject: "Day 9: Upload one document today",
      bodyHtml: `
        <p>Day 9. Today is about your paper trail.</p>
        <p><strong>YOUR TASK TODAY:</strong> Upload one compliance document.</p>
        <p>Start with whatever you have handy:</p>
        <ul style="color:#334155;line-height:1.8;">
          <li>Last hood cleaning certificate</li>
          <li>Fire suppression inspection report</li>
          <li>CFPM certificate</li>
          <li>Food handler cards</li>
        </ul>
        <p>EvidLY organizes them, tracks expiry dates, and surfaces the right document when your inspector asks for it.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Upload a Document →",
      ctaUrl: `${APP_URL}/documents`,
    }),
    10: () => ({
      subject: "Day 10: Ask EvidLY anything + one more favor",
      bodyHtml: `
        <p>Day 10. Today: your AI compliance advisor.</p>
        <p><strong>YOUR TASK TODAY:</strong> Ask the AI Copilot a question about your kitchen.</p>
        <p>Try asking:</p>
        <ul style="color:#334155;line-height:1.8;">
          <li>"What are the top violations in ${esc(county)} County?"</li>
          <li>"What does my inspector look for first?"</li>
          <li>"What's my biggest risk today?"</li>
        </ul>
        <p>The AI knows your jurisdiction, your service history, and your open corrective actions. It gives you answers specific to your kitchen — not generic food safety advice.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Ask EvidLY AI →",
      ctaUrl: `${APP_URL}/ai-advisor`,
    }),
    11: () => ({
      subject: "Day 11: What's happening in your industry right now",
      bodyHtml: `
        <p>Day 11. Today: your intelligence feed.</p>
        <p><strong>YOUR TASK TODAY:</strong> Check your Business Intelligence page.</p>
        <p>EvidLY monitors FDA recalls, CalCode updates, outbreak alerts, and regulatory changes affecting California kitchens.</p>
        <p>When something relevant happens, it shows up here — before it shows up on the news. That's the "operator knows first" advantage.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Check Your Intelligence Feed →",
      ctaUrl: `${APP_URL}/insights/intelligence`,
    }),
    12: () => ({
      subject: "Day 12: Invite your team",
      bodyHtml: `
        <p>Day 12. Two days left. Today: your team.</p>
        <p><strong>YOUR TASK TODAY:</strong> Invite one team member.</p>
        <p>EvidLY has 7 roles — each person sees only what's relevant to their job. Your chef sees temps and HACCP. Your facilities manager sees PSE safeguards and vendor services. Your staff sees their task list for today.</p>
        <p>One platform. Everyone on the same page.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Invite a Team Member →",
      ctaUrl: `${APP_URL}/team`,
    }),
    13: () => ({
      subject: "Day 13: Your trial ends tomorrow — here's what you've built",
      bodyHtml: `
        <p>Day 13. Your trial ends tomorrow.</p>
        <p><strong>Here's what you've been building:</strong></p>
        <ul style="color:#334155;line-height:1.8;">
          <li>Temperature readings logged</li>
          <li>Checklists completed</li>
          <li>Corrective actions tracked</li>
          <li>Documents uploaded</li>
          <li>Vendors on file</li>
        </ul>
        <p>This is your compliance foundation. It doesn't disappear when your trial ends — but to keep building on it, you'll need to continue your subscription.</p>
        <p><strong>Founder pricing is $99/month for your first location.</strong><br/>Locked for life if you subscribe before July 4, 2026.</p>
        <p>Questions? Reply to this email or call me directly:<br/>Arthur · (209) 600-7675</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Continue with Founder Pricing →",
      ctaUrl: `${APP_URL}/billing`,
    }),
    14: () => ({
      subject: "Your EvidLY trial ends today",
      bodyHtml: `
        <p>Your 14-day trial ends today.</p>
        <p>You've spent two weeks building something most kitchens in ${esc(county)} County don't have: a documented compliance foundation.</p>
        <p>Temperature logs. Checklists. Vendor records. Corrective actions. Your jurisdiction profile. Your AI compliance advisor.</p>
        <p>Don't let it go dark.</p>
        <p><strong>Founder pricing: $99/month · First location · Locked for life.</strong><br/>(First 50 founders only.)</p>
        <p>Or book a call: <a href="https://calendly.com/founders-getevidly/60min" style="color:#1e4d6b;">calendly.com/founders-getevidly/60min</a></p>
        ${ARTHUR_SIG}
      `,
      ctaText: "Activate Founder Pricing Now →",
      ctaUrl: `${APP_URL}/billing`,
    }),
  };

  const gen = emails[day];
  return gen ? gen() : null;
}

// ── SERIES 2: Lead with Confidence (Days 1–14) ──────────────────

function series2(day: number, firstName: string, county: string): EmailContent | null {
  const emails: Record<number, () => EmailContent> = {
    1: () => ({
      subject: "What your inspector knows that you don't (yet)",
      bodyHtml: `
        <p>Your ${esc(county)} County EHD inspector has inspected hundreds of kitchens. They know exactly what to look for, in what order, weighted by severity.</p>
        <p>Until now, operators were in the dark.</p>
        <p>EvidLY maps your jurisdiction's inspection methodology — the actual criteria, weights, and violation frequencies for ${esc(county)} County — so you see what they see before they arrive.</p>
        <p>This is the difference between reacting to an inspection and leading into one.</p>
        ${ARTHUR_SIG}
      `,
      ctaText: "See Your Jurisdiction Profile →",
      ctaUrl: `${APP_URL}/jurisdiction-intelligence`,
    }),
    2: () => ({
      subject: "What a failed inspection actually costs",
      bodyHtml: `
        <p>A temporary closure in ${esc(county)} County costs the average kitchen $47,000 in lost revenue over 14 days.</p>
        <p>That's before remediation costs. Before the re-inspection fee. Before the reputational damage.</p>
        <p>EvidLY translates every open compliance gap into estimated financial exposure — so you're not managing violations, you're managing risk.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "See Your Risk Picture →",
      ctaUrl: `${APP_URL}/dashboard`,
    }),
    3: () => ({
      subject: "The outbreak you didn't hear about — until it was too late",
      bodyHtml: `
        <p>Last quarter, an FDA recall affecting leafy greens hit 14 California counties. Most operators found out when their supplier called. Some found out when their health inspector showed up.</p>
        <p>EvidLY operators found out the morning it was published.</p>
        <p>Your intelligence feed monitors FDA, CDC, and ${esc(county)} County EHD in real time. When something happens that affects your kitchen, you know first.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Check Your Intelligence Feed →",
      ctaUrl: `${APP_URL}/insights/intelligence`,
    }),
    4: () => ({
      subject: "The fire claim your carrier might deny",
      bodyHtml: `
        <p>Most operators don't know this: if a fire occurs at your location and your hood cleaning, suppression system, or exhaust fan records are incomplete, your carrier may have grounds to deny the claim.</p>
        <p>This is called Potential Subrogation Exposure (PSE).</p>
        <p>EvidLY tracks your fire safety service currency against NFPA 96-2024 Table 12.4 and flags gaps before they become coverage issues.</p>
        <p style="color:#94a3b8;font-size:12px;">Advisory: consult your carrier for guidance specific to your policy.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Review Your PSE Status →",
      ctaUrl: `${APP_URL}/vendors`,
    }),
    5: () => ({
      subject: "What happens when you sell — or get audited",
      bodyHtml: `
        <p>When you sell a restaurant, buyers want compliance history. When you apply for a loan, lenders want operational records. When a regulator audits you, they want documentation.</p>
        <p>EvidLY builds that record automatically — every temperature, every checklist, every service, every corrective action.</p>
        <p>This isn't just compliance. It's the documented operational history that makes your business more valuable.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "View Your Compliance Record →",
      ctaUrl: `${APP_URL}/documents`,
    }),
    6: () => ({
      subject: "When everyone on your team knows what to do",
      bodyHtml: `
        <p>The best operators don't personally manage every compliance task. They build systems where their team knows exactly what to do — and there's a record proving they did it.</p>
        <p>EvidLY gives every team member role-specific tasks, checklists, and guidance for their job. You see completion in real time.</p>
        <p>Your chef logs temps. Your facilities manager tracks service records. Your staff completes the opening checklist.</p>
        <p>You see everything. You're accountable for nothing you didn't assign.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Invite Your Team →",
      ctaUrl: `${APP_URL}/team`,
    }),
    7: () => ({
      subject: "Your competitors don't know what you know",
      bodyHtml: `
        <p>Halfway through your trial. A perspective shift:</p>
        <p>Every competitor in your county is operating blind — reacting to inspections, chasing paper, guessing what their inspector prioritizes.</p>
        <p>You have the JIE: the Jurisdiction Intelligence Engine. 62 California enforcement agencies. Their methodologies. Their violation frequencies. Their inspection patterns.</p>
        <p>This isn't publicly available in a usable form anywhere else. EvidLY built it from primary research.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Explore the JIE →",
      ctaUrl: `${APP_URL}/jurisdiction-intelligence`,
    }),
    8: () => ({
      subject: "Practice the inspection before it counts",
      bodyHtml: `
        <p>What if you could run a practice inspection — same questions, same order, same weighting as your actual ${esc(county)} County EHD inspector — before the real thing?</p>
        <p>EvidLY's mock inspection does exactly that.</p>
        <p>At the end, you get a simulated report: what would have been cited, what priority, what it would cost to fix.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Try a Mock Inspection →",
      ctaUrl: `${APP_URL}/mock-inspection`,
    }),
    9: () => ({
      subject: "Your compliance advisor that never sleeps",
      bodyHtml: `
        <p>EvidLY's AI Copilot isn't a generic chatbot.</p>
        <p>It knows your jurisdiction. Your service history. Your open corrective actions. Your recent temperature logs. Your HACCP control points.</p>
        <p>When you ask "What's my biggest risk today?" — it answers based on YOUR kitchen, not a national average.</p>
        <p>Ask it anything:</p>
        <ul style="color:#334155;line-height:1.8;">
          <li>"What would close my kitchen?"</li>
          <li>"What does my inspector prioritize?"</li>
          <li>"What's the financial risk of my open violations?"</li>
        </ul>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Ask EvidLY AI →",
      ctaUrl: `${APP_URL}/ai-advisor`,
    }),
    10: () => ({
      subject: "Running multiple locations from one dashboard",
      bodyHtml: `
        <p>If you operate more than one location, EvidLY gives you something no other platform offers: a portfolio-level compliance view.</p>
        <p>Every location. Every jurisdiction. Every service gap. Every open corrective action. One dashboard.</p>
        <p>Your worst-performing location surfaces automatically. Your PSE exposure across all locations, rolled up. Your annual service spend, by location and by service type.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Add Your Locations →",
      ctaUrl: `${APP_URL}/locations`,
    }),
    11: () => ({
      subject: "How one regulatory change affected 847 California kitchens",
      bodyHtml: `
        <p>Earlier this year, Fresno County EHD updated its inspection frequency for high-volume kitchens. Operators on EvidLY got a plain-English alert the day it was published:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="font-style:italic;color:#334155;margin:0;">"This affects your location. Your next inspection may come 30 days earlier than expected."</p>
        </div>
        <p>Operators not on EvidLY found out when the inspector showed up.</p>
        <p>This is what "Lead with Confidence" means.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "See Your Active Signals →",
      ctaUrl: `${APP_URL}/insights/intelligence`,
    }),
    12: () => ({
      subject: "What the next 90 days look like with EvidLY",
      bodyHtml: `
        <p>Two days left in your trial. Here's what the next 90 days look like with EvidLY:</p>
        <p><strong>Days 1–30: Foundation</strong><br/>Your temp logs, checklists, and vendor records are documented. Your team knows their daily tasks. Your jurisdiction profile is mapped.</p>
        <p><strong>Days 31–60: Optimization</strong><br/>Your AI Copilot surfaces patterns. Corrective actions close faster. Your compliance record builds depth.</p>
        <p><strong>Days 61–90: Confidence</strong><br/>Your next inspection isn't a surprise. Your PSE gaps are closed. Your team leads without you managing every detail.</p>
        ${ARTHUR_SHORT}
      `,
      ctaText: "Activate Founder Pricing →",
      ctaUrl: `${APP_URL}/billing`,
    }),
    13: () => ({
      subject: "What operators say after their first inspection with EvidLY",
      bodyHtml: `
        <p>Your trial ends tomorrow. Before you decide, one more thing:</p>
        <p>Operators who use EvidLY through their first inspection consistently report the same experience:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:16px 0;">
          <p style="font-style:italic;color:#334155;margin:0 0 8px;">"I knew exactly what the inspector was going to look at."</p>
          <p style="font-style:italic;color:#334155;margin:0 0 8px;">"My team had everything documented. It was the smoothest inspection we've had."</p>
          <p style="font-style:italic;color:#334155;margin:0;">"I wasn't nervous. I was ready."</p>
        </div>
        <p>That's what we're building toward.</p>
        <p><strong>Founder pricing: $99/month · First location.</strong><br/>Locked for life through July 4, 2026.</p>
        ${ARTHUR_SIG}
      `,
      ctaText: "Continue with EvidLY →",
      ctaUrl: `${APP_URL}/billing`,
    }),
    14: () => ({
      subject: "Your trial ends today — Lead with Confidence",
      bodyHtml: `
        <p>Today is day 14.</p>
        <p>You started your trial because you wanted to know where you stood. You've spent two weeks building the answer.</p>
        <p>The question now: do you want to keep that answer current?</p>
        <p>EvidLY continues watching. Continues alerting. Continues building your record. Continues telling you what your inspector knows — before they show up.</p>
        <p><strong>Founder pricing: $99/month. First location. Locked for life.</strong><br/>First 50 founders only.</p>
        <p>Or book 15 minutes with me personally:<br/><a href="https://calendly.com/founders-getevidly/60min" style="color:#1e4d6b;">calendly.com/founders-getevidly/60min</a></p>
        ${ARTHUR_SIG}
      `,
      ctaText: "Activate Now →",
      ctaUrl: `${APP_URL}/billing`,
    }),
  };

  const gen = emails[day];
  return gen ? gen() : null;
}

// ── REFERRAL EMAILS (Day 5, Day 10) ─────────────────────────────

function referralEmail(requestNumber: 1 | 2): EmailContent {
  const subject =
    requestNumber === 1
      ? "Know another kitchen operator? Share EvidLY."
      : "One more favor — share your referral link";
  return {
    subject,
    bodyHtml: `
      <p>Do you know another kitchen operator who'd benefit from EvidLY?</p>
      <p>Send them your referral link and if they start a trial, you both benefit.</p>
      ${ARTHUR_SHORT}
    `,
    ctaText: "Get Your Referral Link →",
    ctaUrl: `${APP_URL}/referrals`,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const jobStart = Date.now();
    const isTimedOut = () => Date.now() - jobStart > MAX_RUNTIME_MS;

    const results = {
      emailsSent: [] as { userId: string; emailKey: string }[],
      skipped: 0,
      errors: [] as string[],
      timedOut: false,
    };

    // ── 1. Get all trial orgs with their users ──────────────────
    const { data: trialOrgs, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name, trial_start_date, trial_end_date")
      .eq("plan_tier", "trial")
      .not("trial_start_date", "is", null);

    if (orgErr) throw orgErr;
    if (!trialOrgs || trialOrgs.length === 0) {
      return jsonResponse({ message: "No trial orgs found", ...results });
    }

    // ── 2. Fetch all auth users once ────────────────────────────
    const { data: authUsersData } = await supabase.auth.admin.listUsers();
    const authMap = new Map(
      (authUsersData?.users ?? []).map((u) => [u.id, u]),
    );

    const now = new Date();

    for (const org of trialOrgs) {
      if (isTimedOut()) { results.timedOut = true; break; }

      const trialStart = new Date(org.trial_start_date);
      const trialDay = Math.floor(
        (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Only send for days 0–14
      if (trialDay < 0 || trialDay > 14) continue;

      // ── 3. Get users in this org ──────────────────────────────
      const { data: users } = await supabase
        .from("user_profiles")
        .select("id, full_name, role, organization_id")
        .eq("organization_id", org.id);

      if (!users || users.length === 0) continue;

      // ── 4. Get county from first location (fallback to "Your") ─
      const { data: locations } = await supabase
        .from("locations")
        .select("county")
        .eq("organization_id", org.id)
        .limit(1);

      const county = locations?.[0]?.county || "Your";

      for (const user of users) {
        if (isTimedOut()) { results.timedOut = true; break; }

        const authUser = authMap.get(user.id);
        if (!authUser?.email) continue;

        const firstName = (user.full_name || "there").split(" ")[0];
        const role = user.role || "member";

        // Determine which emails to send today
        const emailsToSend: { key: string; content: EmailContent }[] = [];

        // ── WELCOME (day 0) ─────────────────────────────────────
        if (trialDay === 0) {
          emailsToSend.push({
            key: "welcome",
            content: welcomeEmail(firstName, org.trial_end_date),
          });
        }

        // ── SERIES 1 (days 1–14, operational roles) ─────────────
        if (trialDay >= 1 && trialDay <= 14 && SERIES_1_ROLES.has(role)) {
          // Owner/Operator: only odd days for S1
          const shouldSendS1 =
            role === "owner_operator" ? trialDay % 2 === 1 : true;

          if (shouldSendS1) {
            const content = series1(trialDay, firstName, county);
            if (content) {
              emailsToSend.push({ key: `series1_day_${trialDay}`, content });
            }
          }
        }

        // ── SERIES 2 (days 1–14, leadership roles) ──────────────
        if (trialDay >= 1 && trialDay <= 14 && SERIES_2_ROLES.has(role)) {
          // Owner/Operator: only even days for S2
          const shouldSendS2 =
            role === "owner_operator" ? trialDay % 2 === 0 : true;

          if (shouldSendS2) {
            const content = series2(trialDay, firstName, county);
            if (content) {
              emailsToSend.push({ key: `series2_day_${trialDay}`, content });
            }
          }
        }

        // ── REFERRAL (day 5 and day 10, all roles) ──────────────
        if (trialDay === 5) {
          emailsToSend.push({ key: "referral_1", content: referralEmail(1) });
        }
        if (trialDay === 10) {
          emailsToSend.push({ key: "referral_2", content: referralEmail(2) });
        }

        // ── Send each email (checking dedup log) ────────────────
        for (const { key, content } of emailsToSend) {
          if (isTimedOut()) { results.timedOut = true; break; }

          // Check if already sent
          const { data: existing } = await supabase
            .from("trial_email_log")
            .select("id")
            .eq("user_id", user.id)
            .eq("email_key", key)
            .maybeSingle();

          if (existing) {
            results.skipped++;
            continue;
          }

          // Build and send
          const html = buildEmailHtml({
            recipientName: firstName,
            bodyHtml: content.bodyHtml,
            ctaText: content.ctaText,
            ctaUrl: content.ctaUrl,
            footerNote: content.footerNote,
          });

          const result = await sendEmail({
            to: authUser.email,
            subject: content.subject,
            html,
            replyTo: REPLY_TO,
          });

          if (result) {
            // Log successful send
            await supabase.from("trial_email_log").insert({
              organization_id: org.id,
              user_id: user.id,
              email_key: key,
            });

            results.emailsSent.push({ userId: user.id, emailKey: key });
            logger.info("[TRIAL-EMAIL]", `Sent ${key} to`, authUser.email);
          } else {
            results.errors.push(`Failed to send ${key} to user ${user.id}`);
          }
        }
      }
    }

    return jsonResponse({ success: true, ...results });
  } catch (error) {
    logger.error("[TRIAL-EMAIL] Fatal error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
