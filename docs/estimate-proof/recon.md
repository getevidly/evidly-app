# Estimate Proof via EvidLY — Recon (Part A)

Read-only recon for Part 1 of 2 (EvidLY side). Approved mock: Arthur, November 16, 2026.
Base: origin/main 865c4b10. Recorded November 16, 2026.

## 1. The live HoodOps → EvidLY link

**Identity.** A HoodOps company is a row in `hoodops_tenants` (migration 20261229000000):
`tenant_slug`, `tenant_name`, a per-tenant `signing_secret`, `active`. Service role only; anon and
authenticated have no access. HoodOps registers a tenant (and rotates its secret) through
`hoodops-tenant-register`, authenticated by the platform secret `HOODOPS_PLATFORM_REGISTRATION_SECRET`.

**Auth between the two.** Every HoodOps → EvidLY call is server to server:

- `x-hoodops-signature`: lowercase hex HMAC-SHA256 of the exact request body, keyed by the tenant's
  `signing_secret`.
- Tenant named by `hoodops_tenant_slug` in the JSON body (inside the signed bytes) or the
  `x-hoodops-tenant` header.
- `_shared/verifyHoodopsRequest.ts` does this with no global-secret fallback. Gateway JWT verification
  stays on (no `config.toml` block), so HoodOps also sends the project anon key as the bearer.
- `hoodops-webhook` (1,608 lines) is the older path: same HMAC, plus a legacy fallback to the global
  `HOODOPS_WEBHOOK_SECRET`. Events: `service.completed`, `service.scheduled`, `reschedule.*`,
  `document.report`, `document.cert`. It writes `vendor_service_records` (sealed, write-once),
  `compliance_documents`, `location_service_schedules`, portal send records, and since 0fc74194 a
  non-expiring `sealed_document_links` row per sealed document. Idempotent by `event_id`, audit-logged
  to `platform_audit_log`.

**How a HoodOps company maps to EvidLY.**

- *Kitchens' copies* of reports and certificates land in the **kitchen's** organization
  (`vendor_service_records.organization_id`, `compliance_documents`). That is the kitchen's data.
- *The company's own business records* (certificates of insurance, licences, W-9) live in the
  **records set**: one `partner_applications` row per tenant, tied by
  `partner_applications.hoodops_tenant_id` (unique, migration 20261231000000), with six fixed
  `partner_documents` slots (`business_license`, `professional_license`, `w9`,
  `liability_insurance`, `workers_comp`, `auto_insurance`).
  - `hoodops-partner-link` creates or adopts the records set and returns a 30-day upload link
    (`https://getevidly.com/partners/upload?token=…`, served by evidly-landing).
  - `hoodops-partner-documents` returns the set's documents with five-minute signed URLs.
  - `partner-expiry-scan` (cron 11:00 UTC) emails a 30-day expiry digest per company.
  - Private bucket `partner-documents`, service role only.
- `vendors.hoodops_tenant_id` also exists but no vendor row is linked in production, and no
  `vendor_users` login exists for any HoodOps company.
- Production today: one tenant, `cleaning-pros-plus` (Cleaning Pros Plus, LLC), active, with one
  records set and no vendor login.

**Conclusion.** For a HoodOps company, "its EvidLY account" is the records set. Estimate Proof hangs
off `partner_applications.id`, and the first certificate a company adds sets one up if it has none
(the same create-or-adopt rule `hoodops-partner-link` uses). Company-level only: no organization, no
location, no kitchen data.

## 2. What already exists for vendor and contractor documents

| Existing piece | What it is | Reuse for Estimate Proof |
|---|---|---|
| `partner_applications` / `partner_documents` (Trusted Partner Alliance) | The company's own records, six fixed slots, one file per slot, expiry date only | **Reused as the company anchor** (`company_id` = `partner_applications.id`). The fixed slots cannot hold a certification's number and holder, more than one certification, or a policy's carrier, number, limits and endorsements, so certifications and policies get their own tables keyed to it. The partner slots are left untouched. |
| `hoodops-partner-link` / `hoodops-partner-documents` | Records set create-or-adopt, signed URL read | Same create-or-adopt rule, same HMAC helper, same five-minute signed URLs. |
| `partner-expiry-scan` | 30-day digest for partner slots | Pattern reused (one digest per company, stamp only after a confirmed send) for the 60 and 30 day reminders. Not modified. |
| `vendor_documents`, `vendor_document_*` | A **kitchen's** copy of a vendor's documents, keyed by the kitchen's `organization_id` and `vendor_id` | Not reused: it is the kitchen's data, and CLAUDE.md forbids new tables keyed to a vendor system. |
| `external_parties` (carriers, brokers, property managers) | Directory and portal scoping for locations | Not reused: Estimate Proof's broker is an email address on the company's settings; property managers here are free text on a client's request. |
| `/insurance` (`InsurancePage.tsx`) | The **kitchen's** own insurance | Not reused. |
| `/portal/:token` + `portal-access` | Kitchen document send records, token links with expiry, open counts | Pattern reused (see 3). |

## 3. The public share page pattern

- `/sealed/:token` (`SealedDocument.jsx`, migration 20270103000000) is the newest and cleanest:
  token of 32 random bytes as base64url (43 characters), table with no anon or authenticated access,
  page reads through a function, PDF via a five-minute signed URL fetched on each click
  (`portal-access` action `sealed_pdf`), `window.location.assign(signedUrl)` to open the file.
- `/portal/:token` (`PortalPage`, `portal-access`) adds expiry, revocation and `opened_at` /
  `opened_count` on the send record; responses use `PUBLIC_CORS_HEADERS`.
- Neither keeps a per-view log with who and when; Estimate Proof adds one (`estimate_proof_views`).

## 4. Domain

`www.getevidly.com` is served by the separate evidly-landing Next.js repo; this repo serves
`app.getevidly.com`. The proof pages are built here at `app.getevidly.com/proof/:token` and
`/proof/:token/insurance`. The base URL the API hands HoodOps is one setting (`PROOF_BASE_URL`,
default `https://app.getevidly.com`). Showing them under `www.getevidly.com/proof/…` needs a rewrite
in evidly-landing; that repo is out of scope for this task.

## 5. Staging

The EvidLY staging project (`evidly-testing`, uroawofnyjzcqbmgdiqq) is at migration 20260720000001
and has none of `hoodops_tenants`, `partner_applications`, `partner_documents`. The walk therefore
uses a test company on production (a test tenant and records set), deleted when checks pass.

## 6. Migration numbers

Highest on every local branch, every worktree and production: 20270103000000. Estimate Proof takes
20270104000000.
