# Estimate Proof via EvidLY — API for HoodOps

Part 1 of 2 (EvidLY side). Approved mock: Arthur, November 16, 2026.
Function: `hoodops-estimate-proof` (`supabase/functions/hoodops-estimate-proof/index.ts`).

```
POST https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/hoodops-estimate-proof
```

## Auth (server to server)

The same auth as the live HoodOps → EvidLY link (`hoodops-partner-link`, `hoodops-partner-documents`),
through `_shared/verifyHoodopsRequest.ts`:

| Header | Value |
|---|---|
| `Authorization` | `Bearer <EvidLY project anon key>` (gateway JWT check stays on) |
| `Content-Type` | `application/json` |
| `x-hoodops-signature` | Lowercase hex HMAC-SHA256 of the **exact** request body bytes, keyed by the tenant's `signing_secret` (from `hoodops-tenant-register`) |
| `x-hoodops-tenant` | Optional; the tenant slug, if not in the body |

The body names the tenant with `hoodops_tenant_slug` (inside the signed bytes) and the operation with
`action`. There is no global-secret fallback: a missing, unknown or inactive tenant, or a bad
signature, is `401`.

**The company is the verified tenant.** Every action works on that tenant's EvidLY records set
(`partner_applications.hoodops_tenant_id`). Nothing in the body can name another company.

**Account set up on first use.** `certification.save`, `policy.save`, `settings.save` and
`company_area.link` set up the company's EvidLY records set the first time, if it has none. Send
`email` (required then) and `business_name` (defaults to the tenant name); optional `first_name`,
`last_name`, `phone`, `website`. The response carries `account_created: true` that one time.
Company level only: no kitchen, location or organization data.

## Conventions

- Dates are `YYYY-MM-DD`. Every item also carries `expires` as month and year (`"March 2027"`).
- `status` is computed by EvidLY on each call: `"current"` or `"expired"`. An item past its expiration
  date is never `"current"`. An item with no expiration date is `"current"`.
- Files go in as `{ "content_type": "application/pdf" | "image/jpeg" | "image/png" | "image/heic" | "image/webp", "base64": "..." }`, 10 MB at most.
- Errors: `{ "error": "<message>" }` with `400` (bad input), `401` (auth), `404` (not found),
  `409` (company has no EvidLY records yet), `500`.
- `estimate_id` is HoodOps' own estimate ID (any string up to 200 characters).

---

## 1. Create Proof Link — `proof_link.create`

One link per estimate. Calling again for the same `estimate_id` returns the same link (with
`location_name`, `location_id`, `client_name`, `client_email` refreshed), so it is safe to retry.

```json
{
  "hoodops_tenant_slug": "cleaning-pros-plus",
  "action": "proof_link.create",
  "estimate_id": "EST-10482",
  "location_name": "Central Valley Medical Center",
  "location_id": "loc_8812",
  "client_name": "Jordan Lee",
  "client_email": "jordan@example.com"
}
```

Required: `estimate_id`, `location_name`. `201` when created, `200` when it already existed.

```json
{
  "link_id": "uuid",
  "estimate_id": "EST-10482",
  "location_name": "Central Valley Medical Center",
  "location_id": "loc_8812",
  "approved": false,
  "approved_at": null,
  "certifications_url": "https://app.getevidly.com/proof/<token>",
  "insurance_url": "https://app.getevidly.com/proof/<token>/insurance",
  "created_at": "2026-11-16T15:00:00Z",
  "created": true,
  "certifications": [
    { "id": "uuid", "name": "Certified Exhaust System Inspector (CESI)", "number": "200771",
      "holder": "Arthur Haggerty", "expiration_date": "2027-03-31", "expires": "March 2027",
      "status": "current", "has_file": true }
  ]
}
```

Use `certifications` for the estimate email's "Our Certifications" box and `certifications_url` for
its View Our Certifications button. `409` if the company has no EvidLY records yet.

## 2. Mark Approved — `proof_link.approve`

Call when the client approves the estimate. Unlocks `insurance_url`. Idempotent; the first
approval time is kept.

```json
{
  "hoodops_tenant_slug": "cleaning-pros-plus",
  "action": "proof_link.approve",
  "estimate_id": "EST-10482",
  "client_name": "Jordan Lee",
  "client_email": "jordan@example.com"
}
```

`client_email` is where EvidLY sends "Your Updated Certificate of Insurance Is Ready" when the
company answers a request; send it here or on `proof_link.create`.

Response: the link (as above, now `approved: true`) plus `insurance`, the **current** policies only,
for the approval email's "Our Insurance" box.

```json
{
  "approved": true,
  "approved_at": "2026-11-18T17:22:04Z",
  "insurance": [
    { "id": "uuid", "coverage_code": "general_liability", "type": "General Liability",
      "carrier": "[Carrier]", "policy_number": "[Number]",
      "limits": "$1,000,000 per occurrence · $2,000,000 aggregate",
      "endorsements": ["waiver_of_subrogation"], "endorsement_labels": ["Waiver of Subrogation"],
      "expiration_date": "2027-06-30", "expires": "June 2027", "status": "current", "has_file": true }
  ]
}
```

`404` if no link exists for that `estimate_id` (call `proof_link.create` first).

## 3. List Certifications and Insurance — `records.list`

For HoodOps › Settings › Certifications and Insurance.

```json
{ "hoodops_tenant_slug": "cleaning-pros-plus", "action": "records.list", "include_urls": true }
```

```json
{
  "connected": true,
  "certifications": [ { "id": "uuid", "name": "...", "status": "current", "url": "https://... (signed, 5 minutes)" } ],
  "insurance": [ { "id": "uuid", "type": "General Liability", "per_occurrence_limit": 1000000,
                   "aggregate_limit": 2000000, "limits_text": null,
                   "notice_of_cancellation_days": 30, "status": "current", "url": "https://..." } ],
  "broker_email": "broker@example.com",
  "reminder_days": [60, 30],
  "coverage_options": [ { "code": "general_liability", "label": "General Liability", "fields": ["per_occurrence", "aggregate"] } ],
  "endorsement_options": [ { "code": "additional_insured", "label": "Additional Insured", "fields": ["name"] } ]
}
```

Expired items are listed (so the company can replace them) with `status: "expired"`. `url` is
included only with `include_urls: true`, only for current items with a file, and lasts five minutes.
A company with no records yet gets `{ "connected": false, "certifications": [], "insurance": [] }`.

### Keeping them up to date

| Action | Body | Response |
|---|---|---|
| `certification.save` | `certification: { id?, name, number, holder, expiration_date, sort_order?, file? }` | `{ id, account_created }` |
| `certification.archive` | `id` | `{ archived: true }` |
| `policy.save` | `policy: { id?, coverage_code, carrier, policy_number, per_occurrence_limit, aggregate_limit, limits_text, endorsements: [codes], notice_of_cancellation_days, expiration_date, sort_order?, file? }` | `{ id, account_created }` |
| `policy.archive` | `id` | `{ archived: true }` |
| `settings.save` | `settings: { broker_email?, reminder_days? }` (days from 1, 2, 3, 5, 7, 10, 14, 15, 21, 30, 45, 60, 75, 90, 120, 180; default `[60, 30]`) | `{ saved: true, broker_email, reminder_days }` |

Without `id` a save creates the item; with `id` it updates it. `coverage_code` and `endorsements`
must be codes from `coverage_options` / `endorsement_options` (those lists are settings in
`proof_requirement_options`, not hard-coded). Changing an expiration date resets that item's reminders.

## 4. List Open Insurance Requests — `insurance_requests.list`

For the HoodOps task "Insurance Request from [Location Name]".

```json
{ "hoodops_tenant_slug": "cleaning-pros-plus", "action": "insurance_requests.list", "status": "open" }
```

`status`: `"open"` (default) or `"all"` (adds answered ones).

```json
{
  "connected": true,
  "open_count": 1,
  "answer_url": "https://app.getevidly.com/company-proof/<token>",
  "answer_url_expires_at": "2026-11-23T15:00:00Z",
  "requests": [
    {
      "request_id": "uuid",
      "kind": "requirements",
      "status": "open",
      "location_name": "Central Valley Medical Center",
      "location_id": "loc_8812",
      "estimate_id": "EST-10482",
      "requested_at": "2026-11-18T17:40:11Z",
      "who_is_asking": "Landlord or Property Manager",
      "certificate_holder": "Valley Property Group",
      "certificate_holder_address": "100 Main Street, Fresno, CA 93721",
      "lines": [
        { "kind": "coverage", "code": "general_liability", "text": "General Liability · $1,000,000 per occurrence · $2,000,000 aggregate", "meets": true },
        { "kind": "endorsement", "code": "additional_insured", "text": "Additional Insured · Valley Property Group", "meets": false }
      ],
      "all_met": false,
      "has_requirements_file": true,
      "broker_emailed_at": null,
      "answered_at": null,
      "has_updated_certificate": false,
      "client_notified_at": null
    }
  ]
}
```

`meets: true` shows as **You Meet This**, `false` as **Ask Your Broker**. Comparison rules: a
coverage is met by one current policy of that type carrying every minimum asked for; Waiver of
Subrogation and Primary and Non-Contributory by a current policy carrying that endorsement; Notice
of Cancellation by a current policy giving at least the days asked; Additional Insured (it names a
party) and Other are always Ask Your Broker. Expired policies never count.

`answer_url` opens the company's EvidLY Insurance Requests (no password, works seven days), where it
can Email the Request to My Broker and Upload Updated Certificate. Uploading emails the client and
answers the request, so it drops off `open`.

## 5. Company Area Link — `company_area.link`

A fresh seven-day link to the company's Certifications and Insurance and Insurance Requests in
EvidLY, for a HoodOps "Open in EvidLY" button.

```json
{ "hoodops_tenant_slug": "cleaning-pros-plus", "action": "company_area.link" }
```

```json
{ "url": "https://app.getevidly.com/company-proof/<token>", "expires_at": "2026-11-23T15:00:00Z", "account_created": false }
```

---

## What the client sees (no API call; for reference)

| URL | Page | Rules |
|---|---|---|
| `/proof/<token>` | Certifications (mock screen 2) | Always open. Every certification with number, holder, expiry (month and year), status and View Certificate (current only). |
| `/proof/<token>/insurance` | Insurance and What Insurance Do You Require? (mock screen 4) | Locked until `proof_link.approve`. Current policies only, then the requirements form, then any updated certificates the company has uploaded. |

Every page load and every certificate opened is logged in `estimate_proof_views` (link, page, item,
IP, browser, time) and shown to the company in its EvidLY area.

## Reminders

`proof-expiry-reminders` runs daily at 11:30 UTC and emails the company once at each reminder day
before an item expires (`reminder_days`, default 60 and 30), with a link to its EvidLY area.

## Domain

The links are on `app.getevidly.com` (this repo). Serving them as `www.getevidly.com/proof/…`, as the
mock shows, needs a rewrite in the evidly-landing repo; set `PROOF_BASE_URL` once that exists.
