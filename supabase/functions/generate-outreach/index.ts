import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
const corsHeaders = getCorsHeaders(null);

// ── VIOLATION-OUTREACH-01: Generate personalized outreach content ──
// Produces letter/mailer, email, and phone call script
// based on a prospect's specific violations and relevant offerings.

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const OFFERINGS: Record<string, string> = {
  evidly:
    "EvidLY — a compliance platform that tracks food safety inspections, temperature logs, checklists, and vendor records so you always know where you stand before an inspector walks in.",
  cpp_hood_cleaning:
    "Cleaning Pros Plus — IKECA-certified hood cleaning serving the Central Valley. We handle the documentation, photos, and service records that inspectors want to see.",
  filta_fryer:
    "Filta — mobile fryer management and oil recycling. Clean oil, clean fryers, no grease violations.",
};

// Follow-up workflow: letter → 5d → call → 3d → email → 6d → call2 → 7d → final email
const FOLLOWUP_DAYS: Record<string, number> = {
  letter: 5,
  call: 3,
  email: 7,
};
const NEXT_TOUCH: Record<string, string> = {
  letter: "call",
  call: "email",
  email: "call",
};
const STATUS_MAP: Record<string, string> = {
  letter: "letter_sent",
  call: "called",
  email: "emailed",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!authHeader.includes(serviceKey) && !authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { prospect_id, touch_type } = await req.json();
  if (!prospect_id || !touch_type) {
    return jsonResponse({ error: "prospect_id and touch_type required" }, 400);
  }

  const { data: prospect } = await supabase
    .from("violation_prospects")
    .select("*")
    .eq("id", prospect_id)
    .single();

  if (!prospect) return jsonResponse({ error: "Prospect not found" }, 404);

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) return jsonResponse({ error: "ANTHROPIC_API_KEY not set" }, 500);

  const relevantDescriptions = (prospect.relevant_offerings ?? [])
    .map((o: string) => OFFERINGS[o])
    .filter(Boolean)
    .join("\n");

  let prompt = "";

  if (touch_type === "letter") {
    prompt = `Write a professional direct mail letter to a restaurant owner who recently received health inspection violations.

Business: ${prospect.business_name}
City: ${prospect.city ?? "Unknown"}, ${prospect.county ?? ""} County, CA
Violations: ${prospect.violation_summary ?? `${prospect.violation_count} violations`}
Violation count: ${prospect.violation_count} (${prospect.critical_violation_count} critical)

Our offerings relevant to their violations:
${relevantDescriptions}

Write from Arthur Haggerty, owner of Cleaning Pros Plus and EvidLY.
Arthur is IKECA-certified (Member ID 76716495) and has serviced 100+ commercial kitchens in California.

Tone: Professional, empathetic, not pushy. Acknowledge their situation briefly. Lead with value.
Format: Business letter format. 3-4 short paragraphs. End with clear CTA (call or visit getevidly.com).
Do not mention their inspection results directly — focus on the solution, not the problem.

Include at the bottom:
Arthur Haggerty
Cleaning Pros Plus · EvidLY
(209) 636-6116
www.getevidly.com`;
  } else if (touch_type === "email") {
    prompt = `Write a short, direct email to a restaurant owner in ${prospect.city ?? "California"}.
They recently received ${prospect.violation_count} health inspection violations (${prospect.critical_violation_count} critical).

Relevant solutions we offer:
${relevantDescriptions}

Rules:
- Subject line that creates urgency without being alarmist
- 3 short paragraphs max
- No jargon
- End with one clear ask (15-minute call or visit getevidly.com)
- Sign off as Arthur Haggerty, (209) 636-6116

Return format:
SUBJECT: [subject line]
BODY:
[email body]`;
  } else if (touch_type === "call") {
    prompt = `Write a phone call script for reaching the owner of ${prospect.business_name} in ${prospect.city ?? "California"}.
They recently had ${prospect.violation_count} health inspection violations (${prospect.critical_violation_count} critical).

Relevant solutions:
${relevantDescriptions}

Format the script with:
OPENING (10 seconds): How to introduce yourself
HOOK (20 seconds): Why you're calling — lead with value
QUALIFYING QUESTION: One question to open dialogue
PITCH (60 seconds): What you offer and why it matters now
OBJECTION RESPONSES: Handle "not interested", "already handled it", "too busy"
CLOSE: Ask for a 15-minute meeting or send info
VOICEMAIL: 20-second voicemail script if no answer

Caller is Arthur Haggerty, IKECA-certified hood cleaning + compliance tech, (209) 636-6116.`;
  } else {
    return jsonResponse({ error: `Unknown touch_type: ${touch_type}` }, 400);
  }

  // Call Claude Sonnet for high-quality outreach content
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const result = await res.json();
  const content = result?.content?.[0]?.text ?? "";

  if (!content) {
    return jsonResponse({ error: "Failed to generate content" }, 500);
  }

  // Determine follow-up schedule
  const followupDays = FOLLOWUP_DAYS[touch_type] ?? 7;
  const nextTouchType = NEXT_TOUCH[touch_type] ?? "call";
  const followupAt = new Date(Date.now() + followupDays * 86400000).toISOString();

  // Log the touch
  const { data: touch } = await supabase
    .from("outreach_touches")
    .insert({
      prospect_id,
      touch_type,
      outcome: "sent",
      body: content,
      generated_by: "ai",
      followup_due_at: followupAt,
      followup_type: nextTouchType,
    })
    .select()
    .single();

  // Update prospect status
  await supabase
    .from("violation_prospects")
    .update({
      outreach_status: STATUS_MAP[touch_type] ?? "contacted",
      last_outreach_at: new Date().toISOString(),
      next_followup_at: followupAt,
      outreach_count: (prospect.outreach_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", prospect_id);

  return jsonResponse({ content, touch });
});
