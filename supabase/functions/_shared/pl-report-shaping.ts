// supabase/functions/_shared/pl-report-shaping.ts
// SINGLE SOURCE OF TRUTH for shaping a released Policy Lens run into the
// v3 report contract. Lifted verbatim from pl-get-findings (the original
// inline implementation) so the SEAL (pl-release-report compose) and the
// LIVE READS (pl-get-findings, pl-get-findings-insured) produce byte-identical
// output. Any divergence here would make a sealed report's hash fail to match
// what a reader actually saw — the one bug a tamper-evident record cannot have.
//
// Both functions are PURE: input -> output, no DB, no side effects, no I/O.
//
// reviewer_corrected override (kitchen voice ONLY): when a correction is
// present, override correlation.expects.kitchen (from rc.body) and
// gap.prospect.kitchen (from rc.risk). Agent-voice paths are NEVER touched —
// corrections are authored against kitchen text and were not reviewed for
// agent voice. If correlation is null, skip the override (cannot construct a
// meaningful correlation from corrections alone).

// ── shapeFindings ───────────────────────────────────────────────
// Input: raw pl_findings rows (finding_key, part, flag, agent_payload,
//        kitchen_payload, correlation, reviewer_corrected), already ordered
//        by (part ASC, finding_key ASC) by the caller's query.
// Output: array of v3-contract findings, each carrying BOTH voices.
export function shapeFindings(rows: any[]): any[] {
  return (rows ?? []).map((r: any) => {
    const a = r.agent_payload ?? {};
    const k = r.kitchen_payload ?? {};
    const rc = r.reviewer_corrected as { body?: string; risk?: string } | null;
    const raw = r.correlation ?? null;

    let corr = raw;
    if (raw && rc) {
      const overrideExpects = typeof rc.body === "string" && rc.body !== "";
      const overrideGap = typeof rc.risk === "string" && rc.risk !== "";
      if (overrideExpects || overrideGap) {
        corr = {
          ...raw,
          ...(overrideExpects
            ? { expects: { ...raw.expects, kitchen: rc.body } }
            : {}),
          ...(overrideGap
            ? { gap: { ...raw.gap, prospect: { ...raw.gap?.prospect, kitchen: rc.risk } } }
            : {}),
        };
      }
    }

    return {
      id: r.finding_key,
      part: r.part,         // 'fire' | 'food' | 'general'
      flag: r.flag,         // 'high' | 'elevated' | 'satisfied' | 'low'
      correlation: corr,
      agent: {
        title: a.title ?? "",
        body: a.body ?? "",
        refs: a.refs ?? null,
      },
      kitchen: {
        title: k.title ?? "",
        body: k.body ?? "",
      },
    };
  });
}

// ── buildCoverageDetail ─────────────────────────────────────────
// Input: run.reconciled jsonb (or null).
// Output: coverage_detail object (framing + locations + policy_wide +
//         food_sublimits), with conflict handling: array-level location
//         conflict omits all location figures; per-item policy_wide/food
//         conflicts render "Refer to policy". §1731 read-only — verbatim
//         figures as stated in the policy, no advice.
export function buildCoverageDetail(
  reconciled: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!reconciled) {
    return {
      framing: "Coverage figures as stated in your policy",
      locations: [],
      policy_wide: [],
      food_sublimits: [],
    };
  }

  const decl = reconciled.declarations as Record<string, unknown> | undefined;
  const locsWrapper = decl?.locations as { value?: unknown[]; _status?: string } | undefined;

  // ── Locations: array-level conflict → omit all figures ──
  let locations: unknown[];
  let locations_note: string | undefined;

  if (locsWrapper?._status === "conflict") {
    locations = [];
    locations_note = "Location coverage figures could not be confirmed — refer to policy.";
  } else {
    const rawLocs = Array.isArray(locsWrapper?.value) ? locsWrapper.value : [];
    locations = rawLocs.map((loc: any) => ({
      loc_no: loc.loc_no ?? null,
      address: loc.address ?? null,
      scheduled_building: loc.scheduled_building ?? null,
      scheduled_bpp: loc.scheduled_bpp ?? null,
      bi_limit: loc.bi_limit ?? null,
      coinsurance: loc.coinsurance ?? null,
      spoilage_sublimit: loc.spoilage_sublimit ?? null,
    }));
  }

  // ── Policy-wide: per-item conflict → "Refer to policy" ──
  const rawPw = Array.isArray(reconciled.policy_wide) ? reconciled.policy_wide : [];
  const policy_wide = rawPw
    .filter((item: any) => item.percentage_or_value != null)
    .map((item: any) => ({
      label: item.topic ?? null,
      value: (item._status === "agreed" || item._status === "single_pass") ? item.percentage_or_value : "Refer to policy",
      section_ref: item.section_ref ?? null,
    }));

  // ── Food sublimits: per-item conflict → "Refer to policy" ──
  const rawFood = Array.isArray(reconciled.food_findings) ? reconciled.food_findings : [];
  const food_sublimits = rawFood
    .filter((item: any) => item.sublimit_amount != null)
    .map((item: any) => ({
      label: item.topic ?? null,
      value: (item._status === "agreed" || item._status === "single_pass") ? item.sublimit_amount : "Refer to policy",
    }));

  return {
    framing: "Coverage figures as stated in your policy",
    locations,
    ...(locations_note ? { locations_note } : {}),
    policy_wide,
    food_sublimits,
  };
}
