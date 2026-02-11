// ============================================================
// Playbook Report Generator — Generates structured incident reports
// ============================================================
// Authenticated via service role key (Bearer token).
// POST: Receives { activation_id, report_type }. Fetches complete
//       activation data and generates a structured JSON report
//       based on type: full, insurance, health_dept, or legal.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-API-Key",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ReportRequest {
  activation_id: string;
  report_type: "full" | "insurance" | "health_dept" | "legal";
}

const VALID_REPORT_TYPES = ["full", "insurance", "health_dept", "legal"];

Deno.serve(async (req: Request) => {
  // -- CORS preflight --
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Supported methods: POST" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: ReportRequest = await req.json();

    if (!payload.activation_id) {
      return jsonResponse({ error: "Missing required field: activation_id" }, 400);
    }

    if (!payload.report_type || !VALID_REPORT_TYPES.includes(payload.report_type)) {
      return jsonResponse({
        error: `Invalid report_type. Must be one of: ${VALID_REPORT_TYPES.join(", ")}`,
      }, 400);
    }

    // -- Fetch complete activation with all related data --
    const { data: activation, error: activationError } = await supabase
      .from("playbook_activations")
      .select("*, playbook_templates(id, name, slug, severity, steps, regulatory_references)")
      .eq("id", payload.activation_id)
      .single();

    if (activationError || !activation) {
      return jsonResponse({ error: "Activation not found", details: activationError?.message }, 404);
    }

    const template = activation.playbook_templates as Record<string, unknown>;

    // -- Fetch all related records in parallel --
    const [stepResponsesRes, photosRes, foodDispositionRes, locationRes, insuranceRes] = await Promise.all([
      supabase
        .from("playbook_step_responses")
        .select("*")
        .eq("activation_id", payload.activation_id)
        .order("step_number", { ascending: true }),
      supabase
        .from("playbook_evidence_photos")
        .select("*")
        .eq("activation_id", payload.activation_id)
        .order("taken_at", { ascending: true }),
      supabase
        .from("playbook_food_disposition")
        .select("*")
        .eq("activation_id", payload.activation_id),
      supabase
        .from("locations")
        .select("name, address, city, state, zip")
        .eq("id", activation.location_id)
        .maybeSingle(),
      supabase
        .from("playbook_insurance_claims")
        .select("*")
        .eq("activation_id", payload.activation_id)
        .maybeSingle(),
    ]);

    const stepResponses = stepResponsesRes.data || [];
    const photos = photosRes.data || [];
    const foodDisposition = foodDispositionRes.data || [];
    const location = locationRes.data;
    const insuranceClaim = insuranceRes.data;

    // -- Calculate common metrics --
    const totalFoodLossCents = foodDisposition
      .filter((f: Record<string, unknown>) => f.disposition === "discard" || f.disposition === "destroy")
      .reduce((sum: number, f: Record<string, unknown>) => sum + ((f.estimated_value_cents as number) || 0), 0);

    const activatedAt = activation.activated_at ? new Date(activation.activated_at as string) : null;
    const completedAt = activation.completed_at ? new Date(activation.completed_at as string) : null;
    const durationMs = activatedAt && completedAt ? completedAt.getTime() - activatedAt.getTime() : 0;
    const durationMinutes = Math.round(durationMs / 60000);

    const templateSteps = (template?.steps as Array<Record<string, unknown>>) || [];
    const stepsCompleted = stepResponses.filter((sr: Record<string, unknown>) => sr.status === "completed").length;

    const timeline = stepResponses.map((sr: Record<string, unknown>) => ({
      step_number: sr.step_number,
      step_title: templateSteps[(sr.step_number as number)]?.title || `Step ${(sr.step_number as number) + 1}`,
      status: sr.status,
      started_at: sr.started_at,
      completed_at: sr.completed_at,
      notes: sr.notes,
      overdue: ((sr.metadata as Record<string, unknown>) || {}).overdue || false,
    }));

    // -- Generate report based on type --
    let report: Record<string, unknown>;

    switch (payload.report_type) {
      case "full":
        report = {
          report_type: "full",
          title: `Full Incident Report: ${(template?.name as string) || "Unknown Playbook"}`,
          generated_at: new Date().toISOString(),
          incident: {
            activation_id: activation.id,
            template_name: template?.name,
            template_slug: template?.slug,
            severity: template?.severity,
            status: activation.status,
            trigger_type: activation.trigger_type,
            trigger_data: activation.trigger_data,
          },
          location: {
            name: location?.name || "Unknown",
            address: location?.address || "",
            city: location?.city || "",
            state: location?.state || "",
            zip: location?.zip || "",
          },
          timing: {
            activated_at: activation.activated_at,
            completed_at: activation.completed_at,
            duration_minutes: durationMinutes,
          },
          steps: {
            total: templateSteps.length,
            completed: stepsCompleted,
            timeline,
          },
          evidence: {
            photos: photos.map((p: Record<string, unknown>) => ({
              id: p.id,
              step_number: p.step_number,
              photo_url: p.photo_url,
              caption: p.caption,
              taken_at: p.taken_at,
            })),
            total_photos: photos.length,
          },
          food_disposition: {
            items: foodDisposition,
            total_items: foodDisposition.length,
            total_loss_cents: totalFoodLossCents,
            total_loss_formatted: `$${(totalFoodLossCents / 100).toFixed(2)}`,
          },
          insurance: insuranceClaim || null,
          compliance_narrative: activation.compliance_narrative || null,
          regulatory_references: template?.regulatory_references || [],
        };
        break;

      case "insurance":
        report = {
          report_type: "insurance",
          title: `Insurance Claim Report: ${(template?.name as string) || "Unknown Playbook"}`,
          generated_at: new Date().toISOString(),
          claim_summary: {
            activation_id: activation.id,
            incident_type: template?.name,
            severity: template?.severity,
            location: location?.name || "Unknown",
            location_address: [location?.address, location?.city, location?.state, location?.zip].filter(Boolean).join(", "),
          },
          timeline: {
            incident_started: activation.activated_at,
            incident_resolved: activation.completed_at,
            duration_minutes: durationMinutes,
            response_steps: timeline,
          },
          food_loss: {
            total_items_affected: foodDisposition.length,
            items_discarded: foodDisposition.filter((f: Record<string, unknown>) => f.disposition === "discard" || f.disposition === "destroy").length,
            total_loss_cents: totalFoodLossCents,
            total_loss_formatted: `$${(totalFoodLossCents / 100).toFixed(2)}`,
            itemized_losses: foodDisposition
              .filter((f: Record<string, unknown>) => f.disposition === "discard" || f.disposition === "destroy")
              .map((f: Record<string, unknown>) => ({
                name: f.name,
                category: f.category,
                quantity: f.quantity,
                unit: f.unit,
                value_cents: f.estimated_value_cents,
                reason: f.reason,
              })),
          },
          existing_claim: insuranceClaim ? {
            claim_id: insuranceClaim.id,
            status: insuranceClaim.status,
            deductible_cents: insuranceClaim.deductible_cents,
            filed_at: insuranceClaim.created_at,
          } : null,
          evidence_photos: photos.length,
          supporting_documentation: {
            step_responses_count: stepResponses.length,
            photos_count: photos.length,
            compliance_narrative_available: !!activation.compliance_narrative,
          },
        };
        break;

      case "health_dept":
        report = {
          report_type: "health_department",
          title: `Health Department Report: ${(template?.name as string) || "Unknown Playbook"}`,
          generated_at: new Date().toISOString(),
          facility_info: {
            location_name: location?.name || "Unknown",
            address: [location?.address, location?.city, location?.state, location?.zip].filter(Boolean).join(", "),
          },
          incident_overview: {
            type: template?.name,
            severity: template?.severity,
            date_occurred: activation.activated_at,
            date_resolved: activation.completed_at,
            duration_minutes: durationMinutes,
            trigger: activation.trigger_type,
          },
          regulatory_references: (template?.regulatory_references as string[]) || [],
          corrective_actions: {
            total_steps: templateSteps.length,
            steps_completed: stepsCompleted,
            compliance_rate: templateSteps.length > 0
              ? `${Math.round((stepsCompleted / templateSteps.length) * 100)}%`
              : "N/A",
            step_details: timeline.map((t: Record<string, unknown>) => ({
              step: t.step_title,
              status: t.status,
              completed: t.completed_at,
              overdue: t.overdue,
              notes: t.notes,
            })),
          },
          food_safety: {
            items_evaluated: foodDisposition.length,
            items_discarded: foodDisposition.filter((f: Record<string, unknown>) => f.disposition === "discard" || f.disposition === "destroy").length,
            items_salvaged: foodDisposition.filter((f: Record<string, unknown>) => f.disposition === "salvage").length,
            items_donated: foodDisposition.filter((f: Record<string, unknown>) => f.disposition === "donate").length,
            disposition_details: foodDisposition.map((f: Record<string, unknown>) => ({
              item: f.name,
              category: f.category,
              disposition: f.disposition,
              reason: f.reason,
            })),
          },
          evidence_log: {
            total_photos: photos.length,
            photos: photos.map((p: Record<string, unknown>) => ({
              step: p.step_number,
              url: p.photo_url,
              caption: p.caption,
              timestamp: p.taken_at,
            })),
          },
          compliance_narrative: activation.compliance_narrative || "Report pending completion.",
        };
        break;

      case "legal":
        report = {
          report_type: "legal",
          title: `Legal Documentation: ${(template?.name as string) || "Unknown Playbook"}`,
          generated_at: new Date().toISOString(),
          disclaimer: "This report is generated for legal documentation purposes. All timestamps are recorded in UTC. Evidence photos and step responses are preserved as-is from the incident response system.",
          incident_summary: {
            activation_id: activation.id,
            incident_type: template?.name,
            severity: template?.severity,
            location: location?.name || "Unknown",
            full_address: [location?.address, location?.city, location?.state, location?.zip].filter(Boolean).join(", "),
            trigger_type: activation.trigger_type,
            trigger_data: activation.trigger_data,
          },
          chronological_timeline: [
            { event: "Incident detected / playbook triggered", timestamp: activation.activated_at },
            ...timeline.map((t: Record<string, unknown>) => ({
              event: `${t.step_title} - ${t.status}`,
              timestamp: t.completed_at || t.started_at,
              overdue: t.overdue,
              notes: t.notes,
            })),
            activation.completed_at
              ? { event: "Incident resolved / playbook completed", timestamp: activation.completed_at }
              : { event: "Incident still in progress", timestamp: new Date().toISOString() },
          ],
          evidence_log: {
            total_evidence_items: photos.length + stepResponses.length,
            photographs: photos.map((p: Record<string, unknown>) => ({
              id: p.id,
              step_number: p.step_number,
              photo_url: p.photo_url,
              caption: p.caption,
              captured_at: p.taken_at,
            })),
            step_responses: stepResponses.map((sr: Record<string, unknown>) => ({
              step_number: sr.step_number,
              status: sr.status,
              responder_notes: sr.notes,
              started_at: sr.started_at,
              completed_at: sr.completed_at,
              metadata: sr.metadata,
            })),
          },
          financial_impact: {
            total_food_loss_cents: totalFoodLossCents,
            total_food_loss_formatted: `$${(totalFoodLossCents / 100).toFixed(2)}`,
            items_disposed: foodDisposition.length,
            insurance_claim_filed: !!insuranceClaim,
          },
          compliance_record: {
            playbook_followed: stepsCompleted === templateSteps.length,
            steps_completed: stepsCompleted,
            total_steps: templateSteps.length,
            regulatory_references: (template?.regulatory_references as string[]) || [],
            compliance_narrative: activation.compliance_narrative || null,
          },
        };
        break;

      default:
        return jsonResponse({ error: "Invalid report type" }, 400);
    }

    return jsonResponse({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Error in playbook-report-generator:", error);
    return jsonResponse({ error: "Internal server error", details: (error as Error).message }, 500);
  }
});
