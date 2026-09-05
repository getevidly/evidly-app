import { createClient } from "npm:@supabase/supabase-js@2";

function parseCityStateZip(raw: string): { city: string; zip: string } {
  const parts = raw.trim().split(/\s+/);
  if (parts.length < 3) return { city: parts[0] || "", zip: "" };
  const zip = parts[parts.length - 1];
  const city = parts.slice(0, parts.length - 2).join(" ");
  return { city, zip };
}

Deno.serve(async (_req: Request) => {
  const BASE = "https://eco.vcrma.org";

  try {
    // ── Step 1: GET homepage, capture __ECO_SESS cookie ──────────────
    const homeResp = await fetch(BASE + "/", { redirect: "manual" });

    // Collect all Set-Cookie values
    const cookieJar: string[] = [];
    let ecoSessFound = false;

    const setCookies: string[] = [];
    try {
      const sc = homeResp.headers.getSetCookie();
      setCookies.push(...sc);
    } catch {
      const raw = homeResp.headers.get("set-cookie") || "";
      if (raw) setCookies.push(...raw.split(/,(?=\s*[A-Za-z_]+=)/));
    }

    for (const sc of setCookies) {
      const nameVal = sc.split(";")[0].trim();
      if (nameVal) cookieJar.push(nameVal);
      if (/__ECO_SESS=/.test(nameVal)) ecoSessFound = true;
    }

    const cookieHeader = cookieJar.join("; ");

    // If redirect, follow manually to get the HTML
    let html: string;
    if (homeResp.status >= 300 && homeResp.status < 400) {
      const loc = homeResp.headers.get("location") || "";
      const target = loc.startsWith("http") ? loc : BASE + loc;
      const followResp = await fetch(target, {
        headers: { Cookie: cookieHeader },
      });
      html = await followResp.text();
    } else {
      html = await homeResp.text();
    }

    // ── Step 2: Extract food-establishment PressAgentOid ─────────────
    let guid = "";
    let patternMatched = "";

    // Gather all PressAgentOid= occurrences with surrounding context
    const poRe =
      /PressAgentOid=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
    const poMatches: Array<{ guid: string; context: string; idx: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = poRe.exec(html)) !== null) {
      const start = Math.max(0, m.index - 400);
      const end = Math.min(html.length, m.index + m[0].length + 400);
      poMatches.push({
        guid: m[1].toLowerCase(),
        context: html.slice(start, end),
        idx: m.index,
      });
    }

    // Pattern A: PressAgentOid near "Food Establishment"
    for (const pm of poMatches) {
      if (/food\s*establish/i.test(pm.context)) {
        guid = pm.guid;
        patternMatched = "Pattern A: PressAgentOid= href near 'Food Establishment' text (char " + pm.idx + ")";
        break;
      }
    }

    // Pattern B: PressAgentOid near any "food" (exclude pool/hazmat)
    if (!guid) {
      for (const pm of poMatches) {
        if (/\bfood\b/i.test(pm.context) && !/pool|mosquito|hazard/i.test(pm.context)) {
          guid = pm.guid;
          patternMatched = "Pattern B: PressAgentOid= href near 'food' text (char " + pm.idx + ")";
          break;
        }
      }
    }

    // Pattern C: Quoted GUID in JS config near "food" + "pressagent"
    if (!guid) {
      const jsRe =
        /["']([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})["']/gi;
      let jm: RegExpExecArray | null;
      while ((jm = jsRe.exec(html)) !== null) {
        const start = Math.max(0, jm.index - 300);
        const end = Math.min(html.length, jm.index + 300);
        const ctx = html.slice(start, end);
        if (/food/i.test(ctx) && /pressagent/i.test(ctx)) {
          guid = jm[1].toLowerCase();
          patternMatched = "Pattern C: Quoted GUID in JS config near 'food'+'pressagent' (char " + jm.index + ")";
          break;
        }
      }
    }

    if (!guid) {
      return Response.json({
        error: "Could not extract food-establishment PressAgentOid",
        pressAgentOidsFound: poMatches.length,
        snippets: poMatches.map((p) => ({
          guid: p.guid,
          snippet: p.context.replace(/\s+/g, " ").slice(0, 120),
        })),
        htmlLength: html.length,
        ecoSessFound,
      });
    }

    // ── Step 3: Search facilities ────────────────────────────────────
    const searchUrl = BASE + "/api/pressAgentClient/searchFacilities?PressAgentOid=" + guid;
    const searchResp = await fetch(searchUrl, {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        FacilityName: "pizza",
        StreetName: "",
        City: "",
        Zip: "",
      }),
    });

    let facilities: unknown;
    try {
      facilities = await searchResp.json();
    } catch {
      const text = await searchResp.text();
      return Response.json({
        error: "searchFacilities did not return JSON",
        status: searchResp.status,
        body: text.slice(0, 2000),
        guid,
        patternMatched,
      });
    }

    const facArr = Array.isArray(facilities) ? facilities : [];
    const facilityCount = facArr.length;
    const firstFacility = facArr[0] ?? null;

    if (!firstFacility) {
      return Response.json({
        guid,
        patternMatched,
        ecoSessFound,
        facilityCount: 0,
        error: "No facilities returned for 'pizza' search",
        rawResponse: facilities,
      });
    }

    // ── Step 4: Programs for first facility ──────────────────────────
    const facilityId =
      firstFacility.FacilityId ??
      firstFacility.facilityId ??
      firstFacility.Id ??
      firstFacility.id;
    const progsUrl = BASE + "/api/pressAgentClient/programs?PressAgentOid=" + guid + "&FacilityId=" + facilityId;
    const progsResp = await fetch(progsUrl, {
      headers: { Cookie: cookieHeader, Accept: "application/json" },
    });

    let programs: unknown;
    try {
      programs = await progsResp.json();
    } catch {
      const text = await progsResp.text();
      return Response.json({
        guid,
        patternMatched,
        facilityCount,
        firstFacility,
        error: "programs endpoint did not return JSON",
        status: progsResp.status,
        body: text.slice(0, 2000),
      });
    }

    const progArr = Array.isArray(programs) ? programs : [];
    const programCount = progArr.length;
    const firstProgram = progArr[0] ?? null;

    if (!firstProgram) {
      return Response.json({
        guid,
        patternMatched,
        facilityCount,
        firstFacility,
        programCount: 0,
        error: "No programs returned for first facility",
        rawResponse: programs,
      });
    }

    // ── Step 5: Inspections for first program ────────────────────────
    const programId =
      firstProgram.ProgramId ??
      firstProgram.programId ??
      firstProgram.Id ??
      firstProgram.id;
    const inspUrl = BASE + "/api/pressAgentClient/inspections?PressAgentOid=" + guid + "&ProgramId=" + programId;
    const inspResp = await fetch(inspUrl, {
      headers: { Cookie: cookieHeader, Accept: "application/json" },
    });

    let inspections: unknown;
    try {
      inspections = await inspResp.json();
    } catch {
      const text = await inspResp.text();
      return Response.json({
        guid,
        patternMatched,
        facilityCount,
        firstFacility,
        programCount,
        firstProgram,
        error: "inspections endpoint did not return JSON",
        status: inspResp.status,
        body: text.slice(0, 2000),
      });
    }

    const inspArr = Array.isArray(inspections) ? inspections : [];
    const inspectionCount = inspArr.length;
    const firstInspection = inspArr[0] ?? null;

    // ── Step 5b: Fetch inspections for remaining programs ────────────
    // deno-lint-ignore no-explicit-any
    const allProgramInspections: Array<{ progId: string; inspections: any[] }> = [
      { progId: programId, inspections: inspArr },
    ];

    for (let i = 1; i < progArr.length; i++) {
      const prog = progArr[i];
      const pId = prog.ProgramId ?? prog.programId ?? prog.Id ?? prog.id;
      const url = BASE + "/api/pressAgentClient/inspections?PressAgentOid=" + guid + "&ProgramId=" + pId;
      const resp = await fetch(url, {
        headers: { Cookie: cookieHeader, Accept: "application/json" },
      });
      try {
        const data = await resp.json();
        allProgramInspections.push({
          progId: pId,
          inspections: Array.isArray(data) ? data : [],
        });
      } catch {
        allProgramInspections.push({ progId: pId, inspections: [] });
      }
    }

    // ── Step 7: Write to database ────────────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up source_id
    const { data: jRow, error: jErr } = await supabase
      .from("jurisdictions")
      .select("id")
      .eq("slug", "ventura-ca")
      .single();

    if (jErr || !jRow) {
      return Response.json({
        error: "source_id lookup returned no row (jurisdiction ventura-ca)",
        detail: jErr,
      });
    }

    const { data: srcRow, error: srcErr } = await supabase
      .from("inspection_sources")
      .select("id")
      .eq("jurisdiction_id", jRow.id)
      .single();

    if (srcErr || !srcRow) {
      return Response.json({
        error: "source_id lookup returned no row",
        detail: srcErr,
      });
    }

    const sourceId = srcRow.id;

    // Parse city / zip from CityStateZip
    const parsed = parseCityStateZip(firstFacility.CityStateZip || "");

    // Upsert facility
    const { data: facRow, error: facErr } = await supabase
      .from("facilities")
      .upsert(
        {
          source_id: sourceId,
          source_facility_key: facilityId,
          name: (firstFacility.FacilityName || "").trim(),
          address: (firstFacility.Address || "").trim(),
          city: parsed.city,
          zip: parsed.zip,
        },
        { onConflict: "source_id,source_facility_key" },
      )
      .select("id")
      .single();

    if (facErr) {
      return Response.json({ error: "facility upsert failed", detail: facErr });
    }

    const facilityRowId = facRow.id;
    let inspectionsWritten = 0;
    let violationsWritten = 0;

    // Upsert inspections + violations for every program
    for (const pi of allProgramInspections) {
      for (const insp of pi.inspections) {
        const inspOid = insp.Oid;
        if (!inspOid) continue;

        const { data: inspRow, error: inspErr } = await supabase
          .from("inspections")
          .upsert(
            {
              source_id: sourceId,
              source_inspection_key: inspOid,
              facility_id: facilityRowId,
              source_facility_key: facilityId,
              program_id: pi.progId,
              inspection_date: insp.activity_date ? insp.activity_date.split("T")[0] : null,
              inspection_type: insp.service || null,
              score: insp.score ?? null,
              raw_payload: insp,
            },
            { onConflict: "source_id,source_inspection_key" },
          )
          .select("id")
          .single();

        if (inspErr) {
          return Response.json({
            error: "inspection upsert failed",
            detail: inspErr,
            inspOid,
          });
        }

        inspectionsWritten++;

        const violations = Array.isArray(insp.violations) ? insp.violations : [];
        for (const vio of violations) {
          const vioOid = vio.Oid;
          if (!vioOid) continue;

          const { error: vioErr } = await supabase
            .from("violations")
            .upsert(
              {
                inspection_id: inspRow.id,
                source_violation_key: vioOid,
                source_code: vio.violation_code || null,
                description: vio.violation_description || null,
                severity_raw: vio.violation_degree || null,
                corrected_on_site: false,
                raw_payload: vio,
              },
              { onConflict: "inspection_id,source_violation_key" },
            );

          if (vioErr) {
            return Response.json({
              error: "violation upsert failed",
              detail: vioErr,
              vioOid,
            });
          }

          violationsWritten++;
        }
      }
    }

    // ── Return results ───────────────────────────────────────────────
    return Response.json({
      facilitiesWritten: 1,
      inspectionsWritten,
      violationsWritten,
      parsedCity: parsed.city,
      parsedZip: parsed.zip,
      guid,
      patternMatched,
      facilityId,
      facilityName: (firstFacility.FacilityName || "").trim(),
      programCount,
      programs: progArr.map((p: Record<string, unknown>) => p.ProgramId || p.programId || p.Id),
    });
  } catch (err) {
    return Response.json(
      { error: String(err), stack: (err as Error).stack },
      { status: 500 },
    );
  }
});
