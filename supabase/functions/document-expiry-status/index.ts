import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── Configuration ────────────────────────────────────────────────────────────
const EXPIRING_WINDOW_DAYS = 30;

// ── Edge function: document-expiry-status ────────────────────────────────────
// Daily cron (6am UTC) transitions compliance_documents through lifecycle:
//   current → expiring (within 30 days of expiry_date)
//   current → expired  (past expiry_date)
//   expiring → expired (past expiry_date)
//   expired → expiring (date extended into 30-day window — recovery)
//   expired → current  (date extended beyond 30 days — recovery)
//   expiring → current (date extended beyond 30 days — recovery)
//
// Only touches documents where status IN ('current','expiring','expired')
// and expiry_date IS NOT NULL. Idempotent — no writes when status is correct.

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const expiringCutoff = new Date(today.getTime() + EXPIRING_WINDOW_DAYS * 86400000)
    .toISOString().slice(0, 10);

  // Counters for observability
  const transitions = {
    current_to_expiring: 0,
    current_to_expired: 0,
    expiring_to_expired: 0,
    expired_to_expiring: 0,
    expired_to_current: 0,
    expiring_to_current: 0,
  };

  // Fetch all active-lifecycle documents with an expiry date
  const { data: docs, error } = await supabase
    .from("compliance_documents")
    .select("id, status, expiry_date")
    .in("status", ["current", "expiring", "expired"])
    .not("expiry_date", "is", null);

  if (error) {
    console.error("[document-expiry-status] Query error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!docs || docs.length === 0) {
    console.log("[document-expiry-status] No documents with expiry_date to process.");
    return new Response(JSON.stringify({ transitions, processed: 0 }), { status: 200 });
  }

  // Compute target status for each document
  const updates: { id: string; targetStatus: string; fromStatus: string }[] = [];

  for (const doc of docs) {
    const expiryDate = doc.expiry_date; // date string YYYY-MM-DD
    let targetStatus: string;

    if (expiryDate < todayStr) {
      targetStatus = "expired";
    } else if (expiryDate <= expiringCutoff) {
      targetStatus = "expiring";
    } else {
      targetStatus = "current";
    }

    if (targetStatus !== doc.status) {
      updates.push({ id: doc.id, targetStatus, fromStatus: doc.status });
    }
  }

  // Batch updates by target status for efficiency
  const byTarget: Record<string, string[]> = {};
  for (const u of updates) {
    if (!byTarget[u.targetStatus]) byTarget[u.targetStatus] = [];
    byTarget[u.targetStatus].push(u.id);

    // Count transitions
    const key = `${u.fromStatus}_to_${u.targetStatus}` as keyof typeof transitions;
    if (key in transitions) transitions[key]++;
  }

  // Execute updates
  for (const [status, ids] of Object.entries(byTarget)) {
    const { error: updateError } = await supabase
      .from("compliance_documents")
      .update({ status, updated_at: new Date().toISOString() })
      .in("id", ids);

    if (updateError) {
      console.error(`[document-expiry-status] Update error for status=${status}:`, updateError.message);
    }
  }

  const totalTransitions = Object.values(transitions).reduce((a, b) => a + b, 0);
  console.log(`[document-expiry-status] Processed ${docs.length} docs, ${totalTransitions} transitions:`, transitions);

  return new Response(JSON.stringify({
    processed: docs.length,
    transitioned: totalTransitions,
    transitions,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
