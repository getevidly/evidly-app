// Estimate Proof — handler tests with an in-memory database.
// Run: deno test --node-modules-dir=none --no-lock -A supabase/functions/proof-access/
//
//   links work without login     no Authorization header anywhere below
//   every view logged            each page and file open writes one row
//   insurance locked             until approved_at is set
//   expired never Current        and an expired file is never handed out
//   requests compare correctly   You Meet This / Ask Your Broker
//   company walls                nothing of company B through A's link or token

import { assert, assertEquals } from "jsr:@std/assert@1";
import { dispatch } from "./handlers.ts";
import { FakeDb } from "./fakeDb.ts";
import { DEFAULT_OPTIONS_FOR_TEST } from "./testOptions.ts";

// No email leaves a test: sendEmail returns null without a key.
Deno.env.delete("RESEND_API_KEY");
Deno.env.delete("SUPABASE_URL");

const TODAY = Date.UTC(2026, 10, 16); // November 16, 2026
const tokenA = "a".repeat(43);
const tokenB = "b".repeat(43);
const areaA = "c".repeat(43);
const areaB = "d".repeat(43);

function req(): Request {
  return new Request("https://example.test/functions/v1/proof-access", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.7", "user-agent": "TestBrowser/1.0" },
  });
}

function seed() {
  const db = new FakeDb();
  db.tables.partner_applications = [
    { id: "A", business_name: "Company A", email: "a@example.test", hoodops_tenant_id: "tA" },
    { id: "B", business_name: "Company B", email: "b@example.test", hoodops_tenant_id: "tB" },
  ];
  db.tables.proof_requirement_options = DEFAULT_OPTIONS_FOR_TEST.map((o) => ({ ...o, company_id: null }));
  db.tables.company_certifications = [
    { id: "cA1", company_id: "A", name: "CESI", cert_number: "1", holder: "Holder A", expiration_date: "2027-03-31", file_path: "A/certifications/cA1.pdf", archived_at: null, sort_order: 0, created_at: "1" },
    { id: "cA2", company_id: "A", name: "Old", cert_number: "2", holder: "Holder A", expiration_date: "2026-11-15", file_path: "A/certifications/cA2.pdf", archived_at: null, sort_order: 1, created_at: "2" },
    { id: "cB1", company_id: "B", name: "B Only", cert_number: "9", holder: "Holder B", expiration_date: "2027-03-31", file_path: "B/certifications/cB1.pdf", archived_at: null, sort_order: 0, created_at: "1" },
  ];
  db.tables.company_insurance_policies = [
    { id: "pA1", company_id: "A", coverage_code: "general_liability", carrier: "Carrier", policy_number: "GL1", per_occurrence_limit: 1000000, aggregate_limit: 2000000, limits_text: null, endorsements: ["waiver_of_subrogation"], notice_of_cancellation_days: 30, expiration_date: "2027-06-30", file_path: "A/policies/pA1.pdf", archived_at: null, sort_order: 0, created_at: "1" },
    { id: "pA2", company_id: "A", coverage_code: "workers_compensation", carrier: "Carrier", policy_number: "WC1", per_occurrence_limit: null, aggregate_limit: null, limits_text: "Statutory", endorsements: [], notice_of_cancellation_days: null, expiration_date: "2026-01-01", file_path: "A/policies/pA2.pdf", archived_at: null, sort_order: 1, created_at: "2" },
    { id: "pB1", company_id: "B", coverage_code: "workers_compensation", carrier: "Carrier B", policy_number: "WCB", per_occurrence_limit: null, aggregate_limit: null, limits_text: null, endorsements: [], notice_of_cancellation_days: null, expiration_date: "2027-06-30", file_path: "B/policies/pB1.pdf", archived_at: null, sort_order: 0, created_at: "1" },
  ];
  db.tables.estimate_proof_links = [
    { id: "LA", company_id: "A", token: tokenA, estimate_ref: "E-1", location_name: "Kitchen A", location_ref: null, client_name: "Client", client_email: "client@example.test", approved_at: null, created_at: "1", revoked_at: null },
    { id: "LB", company_id: "B", token: tokenB, estimate_ref: "E-9", location_name: "Kitchen B", location_ref: null, client_name: null, client_email: null, approved_at: "2026-11-01T00:00:00Z", created_at: "1", revoked_at: null },
  ];
  db.tables.company_area_links = [
    { id: "xA", company_id: "A", token: areaA, expires_at: "2099-01-01T00:00:00Z", revoked_at: null },
    { id: "xB", company_id: "B", token: areaB, expires_at: "2099-01-01T00:00:00Z", revoked_at: null },
  ];
  db.tables.estimate_proof_views = [];
  db.tables.insurance_requests = [];
  for (const p of ["A/certifications/cA1.pdf", "A/certifications/cA2.pdf", "B/certifications/cB1.pdf", "A/policies/pA1.pdf", "A/policies/pA2.pdf", "B/policies/pB1.pdf"]) {
    db.files.set(p, new Uint8Array([1]));
  }
  return db;
}

const call = (db: FakeDb, body: Record<string, unknown>) => dispatch(db, req(), body, TODAY);
const approve = (db: FakeDb) => {
  db.tables.estimate_proof_links.find((l) => l.id === "LA")!.approved_at = "2026-11-16T00:00:00Z";
};

const PDF = { content_type: "application/pdf", base64: btoa("%PDF-1.4 test") };

Deno.test("certifications page works without login and shows only that company's certifications", async () => {
  const db = seed();
  const [p, s] = await call(db, { action: "certifications", token: tokenA });
  assertEquals(s, 200);
  assertEquals(p.status, "ok");
  assertEquals(p.company_name, "Company A");
  assertEquals(p.location_name, "Kitchen A");
  const certs = p.certifications as { id: string; status: string; expires: string }[];
  assertEquals(certs.map((c) => c.id), ["cA1", "cA2"]);
  assertEquals(certs[0].expires, "March 2027");
});

Deno.test("an expired certification is never Current and its file is not handed out", async () => {
  const db = seed();
  const [p] = await call(db, { action: "certifications", token: tokenA });
  const old = (p.certifications as { id: string; status: string }[]).find((c) => c.id === "cA2")!;
  assertEquals(old.status, "expired");
  const [, s] = await call(db, { action: "certification_file", token: tokenA, item_id: "cA2" });
  assertEquals(s, 404);
});

Deno.test("every view is logged: who, which link, when", async () => {
  const db = seed();
  await call(db, { action: "certifications", token: tokenA });
  const [f] = await call(db, { action: "certification_file", token: tokenA, item_id: "cA1" });
  assert(String(f.url).includes("A/certifications/cA1.pdf"));
  await call(db, { action: "insurance", token: tokenA });
  const views = db.tables.estimate_proof_views;
  assertEquals(views.map((v) => v.page), ["certifications", "certification_file", "insurance"]);
  for (const v of views) {
    assertEquals(v.link_id, "LA");
    assertEquals(v.company_id, "A");
    assertEquals(v.ip, "203.0.113.7");
    assertEquals(v.user_agent, "TestBrowser/1.0");
    assert(v.viewed_at);
  }
  assertEquals(views[1].item_id, "cA1");
});

Deno.test("an unknown or short token gets the same answer and logs nothing", async () => {
  const db = seed();
  for (const token of ["z".repeat(43), "short", ""]) {
    const [p, s] = await call(db, { action: "certifications", token });
    assertEquals([p.status, s], ["invalid", 200]);
  }
  assertEquals(db.tables.estimate_proof_views.length, 0);
});

Deno.test("insurance is locked until the estimate is approved", async () => {
  const db = seed();
  const [locked] = await call(db, { action: "insurance", token: tokenA });
  assertEquals(locked.status, "locked");
  assertEquals(locked.policies, undefined);
  for (const action of ["policy_file", "submit_requirements", "current_enough", "updated_certificate_file"]) {
    const [, s] = await call(db, { action, token: tokenA, item_id: "pA1", request_id: "x" });
    assertEquals(s, 403, action);
  }
  assertEquals(db.tables.insurance_requests.length, 0);

  approve(db);
  const [open] = await call(db, { action: "insurance", token: tokenA });
  assertEquals(open.status, "ok");
  // Only current policies are shown: the lapsed workers' compensation is not.
  assertEquals((open.policies as { id: string }[]).map((p) => p.id), ["pA1"]);
  const [f, s] = await call(db, { action: "policy_file", token: tokenA, item_id: "pA1" });
  assertEquals(s, 200);
  assert(String(f.url).includes("A/policies/pA1.pdf"));
});

Deno.test("the coverage and endorsement lists come from settings", async () => {
  const db = seed();
  approve(db);
  db.tables.proof_requirement_options.push({ company_id: "A", kind: "coverage", code: "pollution", label: "Pollution Liability", fields: ["minimum"], sort_order: 50, active: true });
  db.tables.proof_requirement_options.push({ company_id: "A", kind: "endorsement", code: "other", label: "Other", fields: ["text"], sort_order: 50, active: false });
  const [p] = await call(db, { action: "insurance", token: tokenA });
  const coverage = (p.coverage_options as { code: string }[]).map((o) => o.code);
  const endorsements = (p.endorsement_options as { code: string }[]).map((o) => o.code);
  assert(coverage.includes("pollution"));
  assert(!endorsements.includes("other"));
  const [pb] = await call(db, { action: "insurance", token: tokenB });
  assert(!(pb.coverage_options as { code: string }[]).some((o) => o.code === "pollution"));
});

Deno.test("requirements are saved for the link's company and compared correctly", async () => {
  const db = seed();
  approve(db);
  const [p, s] = await call(db, {
    action: "submit_requirements",
    token: tokenA,
    requirements: {
      holder_name: "Landlord LLC",
      holder_address: "1 Main St, Fresno, CA 93721",
      who_is_asking: "landlord_or_property_manager",
      coverages: [
        { code: "general_liability", per_occurrence: "1,000,000", aggregate: "2000000" },
        { code: "workers_compensation" },
        { code: "commercial_auto", minimum: "1000000" },
      ],
      endorsements: [
        { code: "additional_insured", name: "Landlord LLC" },
        { code: "waiver_of_subrogation" },
        { code: "notice_of_cancellation", days: 30 },
        { code: "primary_non_contributory" },
      ],
    },
    file: PDF,
  });
  assertEquals([p.status, s], ["sent", 200]);
  const r = db.tables.insurance_requests[0];
  assertEquals(r.company_id, "A");
  assertEquals(r.link_id, "LA");
  assert(String(r.upload_path).startsWith(`A/requests/${r.id}/requirements.`));

  const [loaded] = await call(db, { action: "company.load", token: areaA });
  const req0 = (loaded.requests as { lines: { code: string; meets: boolean }[]; who_is_asking: string }[])[0];
  const meets = Object.fromEntries(req0.lines.map((l) => [l.code, l.meets]));
  assertEquals(meets, {
    general_liability: true,
    workers_compensation: false, // on file, but expired
    commercial_auto: false, // no policy
    additional_insured: false, // a named party: always Ask Your Broker
    waiver_of_subrogation: true,
    notice_of_cancellation: true,
    primary_non_contributory: false,
  });
  assertEquals(req0.who_is_asking, "Landlord or Property Manager");
});

Deno.test("Our Current Certificates Are Enough is recorded and is not an open request", async () => {
  const db = seed();
  approve(db);
  const [p] = await call(db, { action: "current_enough", token: tokenA });
  assertEquals(p.status, "recorded");
  assertEquals(db.tables.insurance_requests[0].status, "closed");
  const [loaded] = await call(db, { action: "company.load", token: areaA });
  assertEquals((loaded.requests as unknown[]).length, 0);
});

Deno.test("the company answers with an updated certificate; the client sees it", async () => {
  const db = seed();
  approve(db);
  await call(db, {
    action: "submit_requirements", token: tokenA,
    requirements: { holder_name: "H", holder_address: "Addr", who_is_asking: "our_company", coverages: [{ code: "workers_compensation" }] },
  });
  const id = db.tables.insurance_requests[0].id as string;
  const [a, s] = await call(db, { action: "company.answer", token: areaA, request_id: id, file: PDF });
  assertEquals([a.answered, s], [true, 200]);
  assertEquals(db.tables.insurance_requests[0].status, "answered");

  const [ins] = await call(db, { action: "insurance", token: tokenA });
  assertEquals((ins.requests as { has_updated_certificate: boolean }[])[0].has_updated_certificate, true);
  const [f] = await call(db, { action: "updated_certificate_file", token: tokenA, request_id: id });
  assert(String(f.url).includes(`A/requests/${id}/updated-certificate-`));
  assertEquals(db.tables.estimate_proof_views.at(-1)!.page, "updated_certificate_file");
});

Deno.test("company walls: nothing of one company through another's link or token", async () => {
  const db = seed();
  approve(db);
  // A's link cannot open B's certificate or policy.
  assertEquals((await call(db, { action: "certification_file", token: tokenA, item_id: "cB1" }))[1], 404);
  assertEquals((await call(db, { action: "policy_file", token: tokenA, item_id: "pB1" }))[1], 404);

  // B's client sends a request; A's company token cannot see, open or answer it.
  await call(db, {
    action: "submit_requirements", token: tokenB,
    requirements: { holder_name: "H", holder_address: "Addr", who_is_asking: "franchisor", coverages: [{ code: "workers_compensation" }] },
    file: PDF,
  });
  const bReq = db.tables.insurance_requests[0];
  assertEquals(bReq.company_id, "B");
  const [loadedA] = await call(db, { action: "company.load", token: areaA });
  assertEquals((loadedA.requests as unknown[]).length, 0);
  assert(!(loadedA.certifications as { id: string }[]).some((c) => c.id === "cB1"));
  assertEquals((await call(db, { action: "company.file", token: areaA, kind: "requirements", id: bReq.id }))[1], 404);
  assertEquals((await call(db, { action: "company.file", token: areaA, kind: "certification", id: "cB1" }))[1], 404);
  assertEquals((await call(db, { action: "company.answer", token: areaA, request_id: bReq.id, file: PDF }))[1], 404);
  assertEquals((await call(db, { action: "company.email_broker", token: areaA, request_id: bReq.id }))[1], 404);
  assertEquals((await call(db, { action: "company.archive", token: areaA, kind: "certification", id: "cB1" }))[1], 404);
  assertEquals(db.tables.company_certifications.find((c) => c.id === "cB1")!.archived_at, null);

  // Saving through A's token with B's id never touches B's row.
  const [upd, us] = await call(db, { action: "company.save_certification", token: areaA, certification: { id: "cB1", name: "Hijack" } });
  assertEquals([upd.error, us], ["Certification not found.", 400]);
  assertEquals(db.tables.company_certifications.find((c) => c.id === "cB1")!.name, "B Only");

  // B's view log never shows A's views.
  await call(db, { action: "certifications", token: tokenA });
  const [loadedB] = await call(db, { action: "company.load", token: areaB });
  assert((loadedB.views as { location_name: string }[]).every((v) => v.location_name === "Kitchen B"));
});

Deno.test("an expired company area link opens nothing", async () => {
  const db = seed();
  db.tables.company_area_links[0].expires_at = "2020-01-01T00:00:00Z";
  const [p] = await call(db, { action: "company.load", token: areaA });
  assertEquals(p.status, "invalid");
});

Deno.test("saving a new expiration date clears the reminder stage", async () => {
  const db = seed();
  db.tables.company_certifications[0].reminder_stage_sent = 30;
  await call(db, { action: "company.save_certification", token: areaA, certification: { id: "cA1", name: "CESI", expiration_date: "2028-03-31" } });
  assertEquals(db.tables.company_certifications[0].reminder_stage_sent, null);
});
