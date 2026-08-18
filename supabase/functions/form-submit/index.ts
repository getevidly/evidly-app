import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PUBLIC_CORS_HEADERS } from "../_shared/cors.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { logger } from "../_shared/logger.ts";

const VALID_FORM_TYPES = [
  "founding_member",
  "alerts",
  "feedback",
  "partner",
  "cta",
  "resource",
] as const;
type FormType = (typeof VALID_FORM_TYPES)[number];

// ── Known top-level fields (everything else → metadata) ─────
const KNOWN_FIELDS = new Set([
  "form_type",
  "name",
  "business_name",
  "email",
  "phone",
  "state",
  "jurisdiction",
  "message",
  "consent",
  "source_page",
]);

// ── Auto-reply copy per form_type ───────────────────────────
interface ReplyTemplate {
  subject: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  skipGreeting?: boolean;
}

// ── Checklist email builder  v23 ────────────────────────────────────────
function buildChecklistEmail(name: string, metadata: Record<string, unknown>, sourcePage?: string): string {
  const firstName = metadata.first_name ? String(metadata.first_name).trim() : "";
  const greeting = firstName || (name ? name.trim() : "") || "there";
  const businessName = metadata.business_name ? String(metadata.business_name) : "";
  const kitchenCount = Number(metadata.kitchens) || 1;
  const svcCount = Number(metadata.service_companies) || 1;
  const kitchenStr = `${kitchenCount} kitchen${kitchenCount === 1 ? "" : "s"}`;
  const svcStr = `${svcCount} service ${svcCount === 1 ? "company" : "companies"}`;

  const intro = sourcePage === 'count-booth'
    ? `Thanks for stopping by booth 522 at this year&#39;s California Restaurant Show &mdash; I appreciate you taking a minute to speak with us. Here is the itemized checklist for fire and food safety plus business operational documents. These are the minimum to help reduce your internal and third-party risks.`
    : `Thanks for running your count. Here is the itemized checklist for fire and food safety plus business operational documents. These are the minimum to help reduce your internal and third-party risks.`;

  const prep = businessName
    ? `Prepared for <b style="color:#fff">${businessName}</b> &middot; ${kitchenStr} &middot; ${svcStr}`
    : `${kitchenStr} &middot; ${svcStr}`;

  return `<table width="600" cellpadding="0" cellspacing="0" border="0" align="center" bgcolor="#FFFFFF" style="width:600px;max-width:600px;background:#FFFFFF;border-collapse:collapse"><tr><td><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:24px 28px 22px">
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1E2D4D;line-height:1.5;margin-bottom:14px">Hi ${greeting},</div>
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:13.5px;color:#3F4A5A;line-height:1.65;margin-bottom:12px">${intro}</div>
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:13.5px;color:#3F4A5A;line-height:1.65;margin-bottom:16px">Start by checking off what you can produce today &mdash; then let&#39;s talk about the rest.</div>
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:13.5px;color:#3F4A5A;line-height:1.5">Talk soon,</div>
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:13.5px;font-weight:bold;color:#1E2D4D;line-height:1.4;margin-top:2px">Arthur</div>
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8A8578;line-height:1.4">Founder, EvidLY</div>
   </td></tr></table></td></tr><tr><td style="padding:22px 28px 0"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr><td style="padding:0 0 22px"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-bottom:2px solid #CB5C39;margin-bottom:6px"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:16px;color:#CB5C39;padding:0 0 5px"><span style="display:inline-block;width:11px;height:11px;background:#CB5C39;border-radius:3px;margin-right:7px;vertical-align:middle"></span>Fire safety</td><td align="right" valign="bottom" style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:19px;color:#1E2D4D;padding:0 0 5px 14px;white-space:nowrap">5</td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Hood and exhaust cleaning</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">NFPA 96-2024 &middot; CFC 609</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Fire suppression system</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">19 CCR &sect;904(a)(2) &middot; NFPA 17A-2024</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Sprinkler system</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">NFPA 25 (2013 CA ed.) &middot; CFC 901</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Fire alarm system</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">NFPA 72-2025 &middot; CFC 907</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Fire extinguishers</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">NFPA 10 &middot; CFC 906</div></td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:8px"><tr><td bgcolor="#F4F1EA" style="background:#F4F1EA;border-radius:6px;padding:9px 11px"><div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#9a9484;margin-bottom:5px">Also listed &mdash; not counted above</div><div style="padding:0"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#4a5464">Fire authority inspection report</span><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">Issued to you &middot; Local fire authority</div></div></td></tr></table></td></tr><tr><td style="padding:0 0 22px"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-bottom:2px solid #3E6B8A;margin-bottom:6px"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:16px;color:#3E6B8A;padding:0 0 5px"><span style="display:inline-block;width:11px;height:11px;background:#3E6B8A;border-radius:3px;margin-right:7px;vertical-align:middle"></span>Food safety</td><td align="right" valign="bottom" style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:19px;color:#1E2D4D;padding:0 0 5px 14px;white-space:nowrap">13</td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Pest control</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">&sect;114259</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Receiving temperature log</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">&sect;114037 &middot; one per day</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Cold holding log</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">&sect;113996 &middot; one per day</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Hot holding log</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">&sect;113996 &middot; one per day</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Cooling log</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">&sect;114002 &middot; one per day</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Reheating log</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">&sect;114016 &middot; one per day</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Warewash and sanitizer</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">&sect;114099 &middot; &sect;114107</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Health permit</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">&sect;114381</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Food protection manager</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">&sect;113947.1 &middot; one certified person</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Food handler cards</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">&sect;113948 &middot; one per person</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Allergen awareness and training</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">&sect;113947(b) &middot; one per person</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Person in charge</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">&sect;113945</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Employee health policy</div><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">&sect;113949</div></td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:8px"><tr><td bgcolor="#F4F1EA" style="background:#F4F1EA;border-radius:6px;padding:9px 11px"><div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#9a9484;margin-bottom:5px">Also listed &mdash; not counted above</div><div style="padding:0"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#4a5464">Grease trap service</span><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">If applicable &middot; Local FOG ordinance</div></div><div style="padding:5px 0 0"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#4a5464">Backflow testing</span><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">If applicable &middot; 17 CCR</div></div><div style="padding:5px 0 0"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#4a5464">HACCP plan</span><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">If applicable &middot; &sect;114419</div></div><div style="padding:5px 0 0"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#4a5464">Edible food recovery agreement and log</span><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">If applicable &middot; 14 CCR &sect;18991.3</div></div><div style="padding:5px 0 0"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#4a5464">Allergen labelling on menus</span><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">If applicable &middot; &sect;114093.5 &middot; effective 1 July 2026</div></div><div style="padding:5px 0 0"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#4a5464">Prepackaged food labelling</span><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">If applicable &middot; &sect;114089</div></div><div style="padding:5px 0 0"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#4a5464">Health inspection report</span><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">Issued to you &middot; County health department</div></div></td></tr></table></td></tr><tr><td style="padding:0 0 22px"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-bottom:2px solid #D8A93A;margin-bottom:6px"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:16px;color:#B08611;padding:0 0 5px"><span style="display:inline-block;width:11px;height:11px;background:#D8A93A;border-radius:3px;margin-right:7px;vertical-align:middle"></span>Kitchen business</td><td align="right" valign="bottom" style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:19px;color:#1E2D4D;padding:0 0 5px 14px;white-space:nowrap">6</td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">General liability insurance</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Workers compensation insurance</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Food contamination and spoilage insurance</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Business licence</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Seller's permit</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Certificate of occupancy</div></td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:8px"><tr><td bgcolor="#F4F1EA" style="background:#F4F1EA;border-radius:6px;padding:9px 11px"><div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#9a9484;margin-bottom:5px">Also listed &mdash; not counted above</div><div style="padding:0"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#4a5464">Liquor licence</span><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">If applicable &middot; California ABC</div></div><div style="padding:5px 0 0"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#4a5464">Lease</span><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">If applicable</div></div></td></tr></table><div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-style:italic;color:#6b7280;line-height:1.4;margin-top:8px">Held once for the business, however many kitchens you run. A liquor licence applies only if you serve alcohol.</div></td></tr><tr><td style="padding:0 0 22px"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-bottom:2px solid #A79E8B;margin-bottom:6px"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:16px;color:#5a5346;padding:0 0 5px"><span style="display:inline-block;width:11px;height:11px;background:#A79E8B;border-radius:3px;margin-right:7px;vertical-align:middle"></span>Service company</td><td align="right" valign="bottom" style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:19px;color:#1E2D4D;padding:0 0 5px 14px;white-space:nowrap">15</td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">General liability certificate of insurance</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Workers compensation certificate of insurance</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Professional licence</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Business licence</div></td></tr><tr><td width="20" valign="top" style="padding:5px 0"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" bgcolor="#FFFFFF" style="width:12px;height:12px;background:#FFFFFF;border:1.5px solid #C4CBD4;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td><td valign="top" style="padding:5px 0"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E2D4D;line-height:1.25">Form W-9</div></td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:8px"><tr><td bgcolor="#F4F1EA" style="background:#F4F1EA;border-radius:6px;padding:9px 11px"><div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#9a9484;margin-bottom:5px">Also listed &mdash; not counted above</div><div style="padding:0"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#4a5464">Commercial auto insurance certificate</span><div style="font-family:'Courier New',monospace;font-size:11px;color:#9a9484;line-height:1.4;margin-top:1px">If applicable</div></div></td></tr></table><div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-style:italic;color:#6b7280;line-height:1.4;margin-top:8px">The company's own paperwork &mdash; separate from the service records above. One company can hold several services; the fire contractor is often all four. Commercial auto applies where they drive to you.</div></td></tr></table></td></tr><tr><td><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:16px 28px 0">
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;line-height:1.45;border-top:1px solid #ECE8DE;padding-top:12px"><b style="color:#1E2D4D">How to read this:</b> Check each record you can produce today. Items in the shaded box are listed for awareness &mdash; they apply only to some kitchens, or are issued to you by an authority, and aren&#39;t in your count. EvidLY reads and identifies; it does not decide your coverage.</div>
</td></tr></table></td></tr><tr><td style="padding-top:8px"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr><td align="center" bgcolor="#1E2D4D" style="background:#1E2D4D;padding:26px 28px">
     <table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td bgcolor="#CB5C39" style="background:#CB5C39;border-radius:6px">
       <a href="https://calendly.com/founders-getevidly/discovery-call" style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:15px;color:#FFFFFF;text-decoration:none;padding:13px 30px">Schedule a meeting</a>
     </td></tr></table>
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#AEBACD;line-height:1.5;margin-top:16px;max-width:400px;margin-left:auto;margin-right:auto;text-align:center">Bring this checklist. We will go through it with you &mdash; what you can produce today, what is missing, and what it takes to keep every record current.</div>
     <div style="margin-top:14px;text-align:center"><a href="tel:+18553843591" style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:17px;color:#CB5C39;text-decoration:none">(855) 384-3591</a></div>
   </td></tr></table></td></tr></table>`;
}

function getReplyTemplate(
  formType: FormType,
  seatsRemaining?: number,
  sourcePage?: string,
  name?: string,
  metadata?: Record<string, unknown>,
): ReplyTemplate {
  switch (formType) {
    case "founding_member": {
      const seatsCopy = seatsRemaining != null
        ? `<strong>${seatsRemaining} seats</strong> left`
        : `<strong>limited seats</strong> available`;
      return {
        subject: "You\u2019re on the list \u2014 EvidLY Founder seats",
        bodyHtml:
          `<p>Thanks for putting your name in for an EvidLY Founder seat \u2014 we\u2019ve got your details.</p><p>The Founder Window is open now, with ${seatsCopy} for California kitchen leaders. Claim yours and your rate locks for 36 months. Seats close when they\u2019re gone \u2014 not on a date \u2014 so being early matters.</p><p>Questions? Just reply; it comes straight to us.</p><p>\u2014 Arthur Haggerty, Founder &amp; CEO<br>EvidLY</p>`,
      };
    }
    case "alerts":
      return {
        subject: "You\u2019re on the list \u2014 EvidLY alerts",
        bodyHtml:
          "<p>Thanks \u2014 you\u2019re on the list. County and state alerts aren\u2019t open yet; we\u2019ll email you once they are, and you can leave the list at any time by replying to this message.</p>",
      };
    case "feedback":
      return {
        subject: "Thanks for the feedback",
        bodyHtml:
          "<p>Thank you for taking the time \u2014 we read every response, and yours is in front of us. This is how EvidLY gets built around what kitchens actually need.</p><p>If you raised something that needs a reply, we\u2019ll follow up. Either way, we appreciate it.</p>",
      };
    case "partner":
      return {
        subject: "We received your EvidLY partner application",
        bodyHtml:
          "<p>Thanks for applying to partner with EvidLY \u2014 we\u2019ve got your application and we\u2019ll review it.</p><p>We\u2019re building a network of quality service companies: the kind that do the work right and stand behind it. We review each application personally, and if it\u2019s a fit, we\u2019ll reach out to talk next steps \u2014 usually within a few business days.</p><p>Questions in the meantime? Reply here.</p><p>\u2014 The EvidLY team</p>",
      };
    case "cta": {
      const ctaSeatsCopy = seatsRemaining != null
        ? `${seatsRemaining} seats left`
        : `limited seats available`;
      return {
        subject: "Thanks \u2014 here\u2019s what\u2019s next with EvidLY",
        bodyHtml:
          `<p>Thanks for reaching out about EvidLY \u2014 we\u2019ve got your details and someone will follow up shortly.</p><p>In short: EvidLY keeps your kitchen\u2019s record aligned to what both your county and your insurance carrier require \u2014 documenting the work and identifying what\u2019s missing before it costs you. The Founder Window is open now with ${ctaSeatsCopy} for California kitchen leaders.</p><p>Reply with anything specific you want to cover.</p>`,
      };
    }
    case "resource": {
      if (sourcePage === "count" || sourcePage === "count-booth") {
        return {
          subject: "Your compliance record checklist",
          bodyHtml: buildChecklistEmail(name || "", metadata || {}, sourcePage),
          skipGreeting: true,
        };
      }
      return {
        subject: "You\u2019re on the list \u2014 EvidLY resource",
        bodyHtml:
          "<p>Thanks \u2014 you\u2019re on the list. We\u2019ll email this address when the resource is ready.</p>",
      };
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────
function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Handler ─────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: PUBLIC_CORS_HEADERS });
  }

  const headers = { ...PUBLIC_CORS_HEADERS, "Content-Type": "application/json" };

  try {
    // ── Parse body ────────────────────────────────────────
    const body = await req.json();
    const {
      form_type,
      name,
      business_name,
      email,
      phone,
      state,
      jurisdiction,
      message,
      consent,
      source_page,
      ...rest
    } = body;

    // ── Validate ──────────────────────────────────────────
    if (!form_type || !VALID_FORM_TYPES.includes(form_type)) {
      return json(
        { error: `form_type must be one of: ${VALID_FORM_TYPES.join(", ")}` },
        400,
        headers,
      );
    }
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return json({ error: "A valid email is required" }, 400, headers);
    }
    if (!phone || typeof phone !== "string" || phone.trim().length < 7) {
      return json({ error: "A valid phone number is required" }, 400, headers);
    }

    // ── Build metadata from unknown extra fields ─────────
    const metadata: Record<string, unknown> = { ...rest };

    // ── Insert ────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: insertError } = await supabase
      .from("form_submissions")
      .insert({
        form_type,
        name: name?.trim() || null,
        business_name: business_name?.trim() || null,
        email: email.trim(),
        phone: phone.trim(),
        state: state?.trim() || null,
        jurisdiction: jurisdiction?.trim() || null,
        message: message?.trim() || null,
        metadata,
        consent: consent === true,
        source_page: source_page?.trim() || null,
      });

    if (insertError) {
      logger.error("[FORM-SUBMIT] Insert failed", insertError);
      return json({ error: "Failed to save submission" }, 500, headers);
    }

    // ── Auto-reply email (non-blocking) ──────────────────
    const recipientName = (metadata?.first_name ? String(metadata.first_name).trim() : "") || name?.trim() || "there";

    // Fetch live founder seat count for founding_member / cta templates
    let seatsRemaining: number | undefined;
    if (form_type === "founding_member" || form_type === "cta") {
      const { data, error: rpcError } = await supabase.rpc("get_founder_count");
      if (rpcError) {
        logger.error("[FORM-SUBMIT] get_founder_count RPC failed", rpcError);
      } else {
        seatsRemaining = 250 - (data as number);
      }
    }

    let template: ReturnType<typeof getReplyTemplate>;
    try {
      template = getReplyTemplate(form_type as FormType, seatsRemaining, source_page, name, metadata);
    } catch (templateErr) {
      console.error("[FORM-SUBMIT] buildChecklistEmail threw:", templateErr, (templateErr as Error)?.message);
      // Fall back to generic resource reply so the send still happens
      template = {
        subject: "You\u2019re on the list \u2014 EvidLY resource",
        bodyHtml:
          "<p>Thanks \u2014 you\u2019re on the list. We\u2019ll email this address when the resource is ready.</p>",
      };
    }

    const emailHtml = buildEmailHtml({
      recipientName,
      bodyHtml: template.bodyHtml,
      ctaText: template.ctaText,
      ctaUrl: template.ctaUrl,
      skipGreeting: template.skipGreeting,
    });

    // Fire-and-forget style: await but don't fail on error
    try {
      const emailResult = await sendEmail({
        to: email.trim(),
        subject: template.subject,
        html: emailHtml,
      });

      if (!emailResult) {
        console.error("[FORM-SUBMIT] Auto-reply email failed for", email);
      }
    } catch (sendErr) {
      console.error("[FORM-SUBMIT] sendEmail threw for", email, ":", sendErr, (sendErr as Error)?.message);
    }

    return json({ ok: true }, 200, headers);
  } catch (err) {
    logger.error("[FORM-SUBMIT] Unexpected error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
