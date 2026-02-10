import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * benchmark-badge-check — Weekly Monday 5am
 *
 * Evaluates all active locations against badge tier criteria.
 * Creates new badges for qualifying locations, expires old ones.
 *
 * Badge Tiers:
 * - Verified:  Score 80+ for 3 consecutive months
 * - Excellence: Score 90+ for 3 consecutive months
 * - Elite:     Top 10% in vertical for 3 consecutive months
 * - Platinum:  Top 5% overall for 6 consecutive months
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (expectedSecret && cronSecret !== expectedSecret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const now = new Date();
    const threeMonthsAgo = new Date(
      now.getTime() - 90 * 86400000,
    ).toISOString().split("T")[0];
    const sixMonthsAgo = new Date(
      now.getTime() - 180 * 86400000,
    ).toISOString().split("T")[0];
    const today = now.toISOString().split("T")[0];

    // Get all active locations
    const { data: locations } = await supabase
      .from("locations")
      .select("id, name, vertical, organization_id")
      .eq("active", true);

    if (!locations?.length) {
      return jsonResponse({
        message: "No active locations",
        badges_awarded: 0,
      });
    }

    let badgesAwarded = 0;
    let badgesExpired = 0;

    for (const loc of locations) {
      // Get 6 months of rank history for this location
      const { data: rankHistory } = await supabase
        .from("location_benchmark_ranks")
        .select("*")
        .eq("location_id", loc.id)
        .gte("snapshot_date", sixMonthsAgo)
        .order("snapshot_date", { ascending: true });

      if (!rankHistory?.length) continue;

      // Get the last 3 months of ranks
      const recent3 = rankHistory.filter(
        (r: any) => r.snapshot_date >= threeMonthsAgo,
      );

      // Check each badge tier (highest first)
      let qualifiedTier: string | null = null;

      // Platinum: top 5% overall for 6 months (need 6+ snapshots all at 95th+)
      if (rankHistory.length >= 6) {
        const allTop5 = rankHistory.every(
          (r: any) => r.overall_percentile >= 95,
        );
        if (allTop5) qualifiedTier = "platinum";
      }

      // Elite: top 10% in vertical for 3 months
      if (!qualifiedTier && recent3.length >= 3) {
        const allTop10 = recent3.every(
          (r: any) => r.overall_percentile >= 90,
        );
        if (allTop10) qualifiedTier = "elite";
      }

      // Excellence: score 90+ for 3 consecutive months
      if (!qualifiedTier && recent3.length >= 3) {
        const all90Plus = recent3.every(
          (r: any) => (r.overall_score || 0) >= 90,
        );
        if (all90Plus) qualifiedTier = "excellence";
      }

      // Verified: score 80+ for 3 consecutive months
      if (!qualifiedTier && recent3.length >= 3) {
        const all80Plus = recent3.every(
          (r: any) => (r.overall_score || 0) >= 80,
        );
        if (all80Plus) qualifiedTier = "verified";
      }

      if (qualifiedTier) {
        // Check if badge already exists
        const { data: existingBadge } = await supabase
          .from("benchmark_badges")
          .select("id, badge_tier")
          .eq("location_id", loc.id)
          .eq("badge_tier", qualifiedTier)
          .eq("status", "active")
          .maybeSingle();

        if (!existingBadge) {
          // Generate verification code
          const code = `${loc.name.replace(/\s+/g, "").substring(0, 3).toUpperCase()}-${now.getFullYear()}-${qualifiedTier.substring(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

          const periodStart = qualifiedTier === "platinum"
            ? sixMonthsAgo
            : threeMonthsAgo;

          const { error } = await supabase.from("benchmark_badges").insert({
            location_id: loc.id,
            badge_tier: qualifiedTier,
            qualifying_period_start: periodStart,
            qualifying_period_end: today,
            verification_code: code,
            public_page_url: `/verify/${code}`,
            status: "active",
          });

          if (!error) badgesAwarded++;
        }
      }

      // Expire badges where the location no longer qualifies
      const { data: activeBadges } = await supabase
        .from("benchmark_badges")
        .select("id, badge_tier")
        .eq("location_id", loc.id)
        .eq("status", "active");

      for (const badge of activeBadges || []) {
        // If qualified tier is lower or null, expire higher badges
        const tierRank: Record<string, number> = {
          verified: 1,
          excellence: 2,
          elite: 3,
          platinum: 4,
        };
        const currentRank = qualifiedTier
          ? tierRank[qualifiedTier] || 0
          : 0;
        const badgeRank = tierRank[badge.badge_tier] || 0;

        if (badgeRank > currentRank) {
          await supabase
            .from("benchmark_badges")
            .update({ status: "expired" })
            .eq("id", badge.id);
          badgesExpired++;
        }
      }
    }

    return jsonResponse({
      success: true,
      locations_evaluated: locations.length,
      badges_awarded: badgesAwarded,
      badges_expired: badgesExpired,
    });
  } catch (error) {
    console.error("Error in benchmark-badge-check:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
