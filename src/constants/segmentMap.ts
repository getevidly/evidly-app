/**
 * INDUSTRY_SEGMENT_TO_COI — maps locations.industry_segment → coi_benchmarks.segment.
 *
 * Follows the REQUIREMENT_TO_SERVICE_CODE convention (Record<string, string>).
 * Values NOT in this map have no benchmark equivalent — the dollar-exposure gate
 * treats them as unresolved (placeholder / count-only mode).
 *
 * Source enums:
 *   locations.industry_segment — migration 20260226000000 (13 values incl. 'other').
 *   coi_benchmarks.segment CHECK — migration 20260705174005 (8 values).
 *
 * Unresolved (no valid benchmarks target):
 *   hotel, catering, food_truck, grocery_deli, convenience, other
 *
 * coi_benchmarks segments with no inbound mapping:
 *   fast_casual, bar_nightclub, ghost_cloud, solid_fuel
 */
export const INDUSTRY_SEGMENT_TO_COI: Record<string, string> = {
  casual_dining: 'casual',
  quick_service: 'qsr',
  fine_dining: 'fine_dining',
  education_k12: 'institutional',
  education_university: 'institutional',
  healthcare: 'institutional',
  corporate_dining: 'institutional',
};
