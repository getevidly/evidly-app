import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * Refresh the one-row `inspection_stats` cache that the Inspections tab's
 * summary KPIs read.
 *
 * WHY THIS EXISTS: the summary section used to run five live count(*)
 * queries on every tab open, including violations (~957k rows). That cost
 * ~2s and intermittently tipped the request past its ceiling, showing the
 * operator "Edge Function returned a non-2xx status code". Counting is now
 * done here instead — once at the end of a crawler run, in the background,
 * where a few seconds costs nobody anything.
 *
 * PATTERN FOR FUTURE CRAWLERS: import this and call it once, immediately
 * before returning the run summary:
 *
 *   import { refreshInspectionStats } from "../_shared/refreshInspectionStats.ts";
 *   …
 *   const statsRefreshed = await refreshInspectionStats(supabase);
 *   return Response.json({ …, statsRefreshed });
 *
 * Never throws: a crawler run that succeeded must not be reported as
 * failed because a cosmetic counter did not update.
 */
export async function refreshInspectionStats(
  supabase: SupabaseClient,
): Promise<boolean> {
  try {
    const countOf = async (
      table: string,
      apply?: (q: any) => any,
    ): Promise<number> => {
      let q: any = supabase.from(table).select("*", { count: "exact", head: true });
      if (apply) q = apply(q);
      const { count, error } = await q;
      if (error) throw new Error(`${table}: ${error.message}`);
      return count ?? 0;
    };

    // Sequential, not fanned out: a wide fan-out from inside the isolate
    // is what broke the sources section, and this runs when nobody is
    // waiting on it.
    const total_sources = await countOf("inspection_sources");
    const active_sources = await countOf("inspection_sources", (q) => q.eq("is_active", true));
    const total_facilities = await countOf("facilities");
    const total_inspections = await countOf("inspections");
    const total_violations = await countOf("violations");
    const total_triggers = await countOf("inspection_triggers", (q) => q.eq("status", "new"));

    const { error } = await supabase
      .from("inspection_stats")
      .upsert({
        id: 1,
        total_sources,
        active_sources,
        total_facilities,
        total_inspections,
        total_violations,
        total_triggers,
        refreshed_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (error) throw new Error(error.message);
    return true;
  } catch (e) {
    console.error(
      "[refreshInspectionStats] failed:",
      e instanceof Error ? e.message : e,
    );
    return false;
  }
}
