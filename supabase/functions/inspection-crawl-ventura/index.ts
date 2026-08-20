import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

function parseCityStateZip(raw: string): { city: string; zip: string } {
  const parts = raw.trim().split(/\s+/);
  if (parts.length < 3) return { city: parts[0] || "", zip: "" };
  const zip = parts[parts.length - 1];
  const city = parts.slice(0, parts.length - 2).join(" ");
  return { city, zip };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface TaskSummary {
  taskId: string;
  search_kind: string;
  search_value: string;
  facilitiesFound: number;
  facilitiesWritten: number;
  inspectionsWritten: number;
  violationsWritten: number;
  truncated: boolean;
  tasksSpawned: number;
  error?: string;
  warning?: string;
}

// ── Per-task processing — identical logic to the original single-task version ──
async function processOneTask(
  // deno-lint-ignore no-explicit-any
  task: any,
  sourceId: string,
  guid: string,
  cookieHeader: string,
  supabase: SupabaseClient,
  BASE: string,
): Promise<TaskSummary> {
  const summary: TaskSummary = {
    taskId: task.id,
    search_kind: task.search_kind,
    search_value: task.search_value,
    facilitiesFound: 0,
    facilitiesWritten: 0,
    inspectionsWritten: 0,
    violationsWritten: 0,
    truncated: false,
    tasksSpawned: 0,
  };

  // ── Step 3: Build search body from task ────────────────────────
  // deno-lint-ignore no-explicit-any
  let searchBody: Record<string, any>;
  if (task.search_kind === "zip") {
    searchBody = { FacilityName: "", StreetName: "", City: "", Zip: task.search_value };
  } else if (task.search_kind === "name_prefix") {
    const pipeIdx = (task.search_value as string).indexOf("|");
    const zip = (task.search_value as string).slice(0, pipeIdx);
    const prefix = (task.search_value as string).slice(pipeIdx + 1);
    searchBody = { FacilityName: prefix, StreetName: "", City: "", Zip: zip };
  } else {
    searchBody = { FacilityName: "", StreetName: "", City: "", Zip: task.search_value };
  }

  const searchUrl = BASE + "/api/pressAgentClient/searchFacilities?PressAgentOid=" + guid;
  const searchResp = await fetch(searchUrl, {
    method: "POST",
    headers: { Cookie: cookieHeader, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(searchBody),
  });

  // deno-lint-ignore no-explicit-any
  let facResults: any[];
  try {
    const parsed = await searchResp.json();
    facResults = Array.isArray(parsed) ? parsed : [];
  } catch {
    const text = await searchResp.text();
    const errMsg = "searchFacilities non-JSON: " + text.slice(0, 500);
    await supabase.from("inspection_crawl_tasks").update({
      status: "error", last_error: errMsg,
    }).eq("id", task.id);
    summary.error = errMsg;
    return summary;
  }

  summary.facilitiesFound = facResults.length;

  // ── Step 4: Handle truncation (exactly 50) ─────────────────────
  if (facResults.length === 50) {
    summary.truncated = true;

    if (task.search_kind === "zip") {
      // Split into 26 name_prefix tasks A-Z
      const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const newTasks = [];
      for (const letter of alpha) {
        newTasks.push({
          source_id: sourceId,
          search_kind: "name_prefix",
          search_value: task.search_value + "|" + letter,
          status: "pending",
          attempts: 0,
        });
      }

      const { error: spawnErr } = await supabase
        .from("inspection_crawl_tasks")
        .upsert(newTasks, { onConflict: "source_id,search_kind,search_value", ignoreDuplicates: true });

      if (spawnErr) {
        const errMsg = "spawn failed: " + JSON.stringify(spawnErr);
        await supabase.from("inspection_crawl_tasks").update({
          status: "error", last_error: errMsg,
        }).eq("id", task.id);
        summary.error = errMsg;
        return summary;
      }

      summary.tasksSpawned = 26;

      // Mark this task as split, do NOT write facilities
      await supabase.from("inspection_crawl_tasks").update({
        status: "split", truncated: true, facilities_found: 50,
        completed_at: new Date().toISOString(),
      }).eq("id", task.id);

      return summary;
    }
    // name_prefix truncated: warn but still process below
    summary.warning = "name_prefix truncated at 50 — needs deeper subdivision";
  }

  // ── Step 5: Process each facility ──────────────────────────────
  for (const fac of facResults) {
    const facKey = fac.FacilityId ?? fac.facilityId ?? fac.Id ?? fac.id;
    if (!facKey) continue;

    const parsed = parseCityStateZip(fac.CityStateZip || "");

    // Upsert facility
    const { data: facRow, error: facErr } = await supabase
      .from("facilities")
      .upsert(
        {
          source_id: sourceId,
          source_facility_key: facKey,
          name: (fac.FacilityName || "").trim(),
          address: (fac.Address || "").trim(),
          city: parsed.city,
          zip: parsed.zip,
          identity_status: "unresolved",
        },
        { onConflict: "source_id,source_facility_key" },
      )
      .select("id")
      .single();

    if (facErr) {
      const errMsg = "facility upsert: " + JSON.stringify(facErr);
      await supabase.from("inspection_crawl_tasks").update({
        status: "error", last_error: errMsg,
      }).eq("id", task.id);
      summary.error = errMsg;
      return summary;
    }

    summary.facilitiesWritten++;
    const facilityRowId = facRow.id;

    // GET programs
    await sleep(150);
    const progsUrl = BASE + "/api/pressAgentClient/programs?PressAgentOid=" + guid + "&FacilityId=" + facKey;
    const progsResp = await fetch(progsUrl, {
      headers: { Cookie: cookieHeader, Accept: "application/json" },
    });

    // deno-lint-ignore no-explicit-any
    let progArr: any[];
    try {
      const p = await progsResp.json();
      progArr = Array.isArray(p) ? p : [];
    } catch {
      progArr = [];
    }

    // For each program, get inspections
    for (const prog of progArr) {
      const progId = prog.ProgramId ?? prog.programId ?? prog.Id ?? prog.id;
      if (!progId) continue;

      await sleep(150);
      const inspUrl = BASE + "/api/pressAgentClient/inspections?PressAgentOid=" + guid + "&ProgramId=" + progId;
      const inspResp = await fetch(inspUrl, {
        headers: { Cookie: cookieHeader, Accept: "application/json" },
      });

      // deno-lint-ignore no-explicit-any
      let inspArr: any[];
      try {
        const d = await inspResp.json();
        inspArr = Array.isArray(d) ? d : [];
      } catch {
        inspArr = [];
      }

      for (const insp of inspArr) {
        const inspOid = insp.Oid;
        if (!inspOid) continue;

        const { data: inspRow, error: inspErr } = await supabase
          .from("inspections")
          .upsert(
            {
              source_id: sourceId,
              source_inspection_key: inspOid,
              facility_id: facilityRowId,
              source_facility_key: facKey,
              program_id: progId,
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
          const errMsg = "inspection upsert: " + JSON.stringify(inspErr);
          await supabase.from("inspection_crawl_tasks").update({
            status: "error", last_error: errMsg,
          }).eq("id", task.id);
          summary.error = errMsg;
          return summary;
        }

        summary.inspectionsWritten++;

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
            const errMsg = "violation upsert: " + JSON.stringify(vioErr);
            await supabase.from("inspection_crawl_tasks").update({
              status: "error", last_error: errMsg,
            }).eq("id", task.id);
            summary.error = errMsg;
            return summary;
          }

          summary.violationsWritten++;
        }
      }
    }
  }

  // ── Step 6: Mark task done ──────────────────────────────────────
  await supabase.from("inspection_crawl_tasks").update({
    status: "done",
    completed_at: new Date().toISOString(),
    facilities_found: facResults.length,
    truncated: summary.truncated,
  }).eq("id", task.id);

  return summary;
}

// ══════════════════════════════════════════════════════════════════════
Deno.serve(async (_req: Request) => {
  const BASE = "https://eco.vcrma.org";
  const startTime = Date.now();
  const TIME_BUDGET_MS = 90_000;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Look up Ventura source_id ──────────────────────────────────────
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

  // ── Step 1: Reset stale claims (once per invocation) ───────────────
  await supabase
    .from("inspection_crawl_tasks")
    .update({ status: "pending", claimed_at: null })
    .eq("status", "running")
    .lt("claimed_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

  // ── Bootstrap session: cookie + PressAgentOid (once per invocation) ─
  const homeResp = await fetch(BASE + "/", { redirect: "manual" });

  const cookieJar: string[] = [];
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
  }

  const cookieHeader = cookieJar.join("; ");

  // Follow redirect if needed to get HTML
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

  // Extract food-establishment PressAgentOid
  let guid = "";
  const poRe =
    /PressAgentOid=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
  const poMatches: Array<{ guid: string; context: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = poRe.exec(html)) !== null) {
    const start = Math.max(0, m.index - 400);
    const end = Math.min(html.length, m.index + m[0].length + 400);
    poMatches.push({ guid: m[1].toLowerCase(), context: html.slice(start, end) });
  }

  for (const pm of poMatches) {
    if (/food\s*establish/i.test(pm.context)) { guid = pm.guid; break; }
  }
  if (!guid) {
    for (const pm of poMatches) {
      if (/\bfood\b/i.test(pm.context) && !/pool|mosquito|hazard/i.test(pm.context)) { guid = pm.guid; break; }
    }
  }
  if (!guid) {
    const jsRe = /["']([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})["']/gi;
    let jm: RegExpExecArray | null;
    while ((jm = jsRe.exec(html)) !== null) {
      const start = Math.max(0, jm.index - 300);
      const end = Math.min(html.length, jm.index + 300);
      const ctx = html.slice(start, end);
      if (/food/i.test(ctx) && /pressagent/i.test(ctx)) { guid = jm[1].toLowerCase(); break; }
    }
  }

  if (!guid) {
    return Response.json({ error: "Could not extract PressAgentOid from homepage" });
  }

  // ── Time-budgeted task loop ────────────────────────────────────────
  const taskSummaries: TaskSummary[] = [];
  let totalFacilitiesWritten = 0;
  let totalInspectionsWritten = 0;
  let totalViolationsWritten = 0;
  let tasksErrored = 0;

  while (Date.now() - startTime < TIME_BUDGET_MS) {
    // ── Claim one task ─────────────────────────────────────────────
    const { data: tasks, error: taskErr } = await supabase
      .from("inspection_crawl_tasks")
      .select("*")
      .eq("source_id", sourceId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (taskErr) {
      // DB error on claim query — break, report what we have
      taskSummaries.push({
        taskId: "n/a", search_kind: "n/a", search_value: "n/a",
        facilitiesFound: 0, facilitiesWritten: 0, inspectionsWritten: 0,
        violationsWritten: 0, truncated: false, tasksSpawned: 0,
        error: "task query failed: " + JSON.stringify(taskErr),
      });
      tasksErrored++;
      break;
    }

    if (!tasks || tasks.length === 0) {
      break; // No pending tasks
    }

    const task = tasks[0];

    const { error: claimErr } = await supabase
      .from("inspection_crawl_tasks")
      .update({
        status: "running",
        claimed_at: new Date().toISOString(),
        attempts: (task.attempts || 0) + 1,
      })
      .eq("id", task.id);

    if (claimErr) {
      taskSummaries.push({
        taskId: task.id, search_kind: task.search_kind, search_value: task.search_value,
        facilitiesFound: 0, facilitiesWritten: 0, inspectionsWritten: 0,
        violationsWritten: 0, truncated: false, tasksSpawned: 0,
        error: "claim failed: " + JSON.stringify(claimErr),
      });
      tasksErrored++;
      continue;
    }

    // ── Process the task ───────────────────────────────────────────
    try {
      const result = await processOneTask(task, sourceId, guid, cookieHeader, supabase, BASE);

      taskSummaries.push(result);

      if (result.error) {
        tasksErrored++;
      } else {
        totalFacilitiesWritten += result.facilitiesWritten;
        totalInspectionsWritten += result.inspectionsWritten;
        totalViolationsWritten += result.violationsWritten;
      }
    } catch (err) {
      // Unexpected error — mark task as error, continue to next
      const errMsg = String(err);
      try {
        await supabase.from("inspection_crawl_tasks").update({
          status: "error", last_error: errMsg,
        }).eq("id", task.id);
      } catch { /* best effort */ }

      taskSummaries.push({
        taskId: task.id, search_kind: task.search_kind, search_value: task.search_value,
        facilitiesFound: 0, facilitiesWritten: 0, inspectionsWritten: 0,
        violationsWritten: 0, truncated: false, tasksSpawned: 0,
        error: errMsg,
      });
      tasksErrored++;
      continue;
    }
  }

  // ── Remaining pending count ────────────────────────────────────────
  const { count: remaining } = await supabase
    .from("inspection_crawl_tasks")
    .select("id", { count: "exact", head: true })
    .eq("source_id", sourceId)
    .eq("status", "pending");

  const elapsedMs = Date.now() - startTime;

  return Response.json({
    tasksProcessed: taskSummaries.length,
    tasks: taskSummaries,
    totalFacilitiesWritten,
    totalInspectionsWritten,
    totalViolationsWritten,
    tasksErrored,
    elapsedMs,
    remainingPending: remaining ?? 0,
  });
});
