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

    // ── Step 6: Return full probe result ─────────────────────────────
    return Response.json({
      guid,
      patternMatched,
      ecoSessFound,
      facilityCount,
      firstFacility,
      programCount,
      firstProgram,
      inspectionCount,
      firstInspection,
    });
  } catch (err) {
    return Response.json(
      { error: String(err), stack: (err as Error).stack },
      { status: 500 }
    );
  }
});
