# UI Contract Manifest

> **Type:** TIER 0 -- UI Contract Extraction
> **Date:** 2026-05-10
> **Sources:** EvidLY_Documents_Preview.jsx (622 lines), EvidLY_Vendor_Services_Preview.jsx (2225 lines)
> **Rule:** If ticket and preview disagree, preview wins.

---

## TABLE 1 -- Field Access Manifest

### Object: document (Documents Preview)

| Property | File:Line | Usage | Inferred Type | Enum Values |
|---|---|---|---|---|
| `id` | Docs:67-91 | Key prop for list rendering | string (PK) | -- |
| `expires` | Docs:67-91, 329, 400 | Rendered as text ("Expires {date}" or "No expiration" when "---"); displayed in modal | string ("YYYY-MM-DD" or "---") | -- |
| `location` | Docs:67-91, 326, 151, 399 | Rendered in card subtitle; used in filter pipeline; displayed in modal | string | -- |
| `name` | Docs:67-91, 149, 322, 392 | Rendered as card title; filtered by search; displayed in modal header | string | -- |
| `request` | Docs:76-91, 306, 331, 402 | Conditional: if present, render request stage pill + last update date | object or null | -- |
| `request.at` | Docs:76-91, 331, 403 | Rendered as "Last update {date}" in card and modal | string (date) | -- |
| `request.stage` | Docs:76-91, 306, 402 | Passed to requestStagePill(); rendered as pill in card and modal | enum: string | sent, viewed, uploaded, overdue |
| `status` | Docs:67-91, 150, 305, 408, 414 | Passed to statusPill(); used in filter; conditional for Accept/Reject/Resend buttons | enum: string | current, expiring, expired, pending_review, requested, overdue |
| `type` | Docs:67-91, 324, 391 | Rendered in card subtitle and modal header | string | -- |
| `uploadedAt` | Docs:67-72, 330 | Rendered as "Uploaded by {name} on {date}" (kitchen tab only) | string (date) | -- |
| `uploadedBy` | Docs:67-72, 330, 401 | Rendered in card and modal; fallback to "Vendor" if request.stage=uploaded | string | -- |
| `vendor` | Docs:76-91, 152, 325, 398 | Rendered in card subtitle; used in vendor filter; displayed in modal | string or undefined | -- |

### Object: missingDocument (Documents Preview)

| Property | File:Line | Usage | Inferred Type | Enum Values |
|---|---|---|---|---|
| `reason` | Docs:160-165, 287 | Rendered as description text | string | -- |
| `type` | Docs:160-165, 286 | Rendered as title | string | -- |
| `vendor` | Docs:160-165, 287 | Rendered alongside reason | string | -- |

### Object: recommendedDocument (Documents Preview -- Send Wizard Step 3)

| Property | File:Line | Usage | Inferred Type | Enum Values |
|---|---|---|---|---|
| `id` | Docs:457-467, 469 | Used for checkbox toggle state key | string (FK to document) | -- |
| `name` | Docs:457-467, 558 | Rendered as document name | string | -- |
| `reason` | Docs:457-467, 561 | Rendered as rationale for inclusion | string | -- |
| `required` | Docs:457-467, 551, 559 | Conditional: red left border if true; "REQUIRED" badge | boolean | -- |

### Object: recipient (Documents Preview -- Send Wizard Step 1)

| Property | File:Line | Usage | Inferred Type | Enum Values |
|---|---|---|---|---|
| `l` | Docs:446-452, 509 | Rendered as button label | string | -- |
| `purposes` | Docs:446-452, 520 | Iterated to render purpose buttons in step 2 | string[] | (see TABLE 2) |
| `v` | Docs:446-452, 501 | Used as selection value; matched to find current recipient | enum: string | ehd, ahj, insurance_broker, insurance_carrier, auditor, client_legal |

### Object: service (Vendor Services Preview)

| Property | File:Line | Usage | Inferred Type | Enum Values |
|---|---|---|---|---|
| `acknowledged` | VS:161-390, 627 | Conditional: if false AND status=at-risk, show Ack button | boolean | -- |
| `compliance` | VS:153-390, 616, 2041 | Rendered as "Required by:" text in ServiceCard and NormalServiceRow | string | -- |
| `contractRate` | VS:158-390, 577-578, 718, 1370, 1916 | Variance calculation (>10% triggers flag); rendered as "Contract: ${rate}" | number or null | -- |
| `daysOffset` | VS:157-390, 695-696, 1226-1227, 1589, 1959 | Rendered as "{N} days overdue" or "in {N} days/weeks"; used in sort tiebreaker | number (negative=overdue) | -- |
| `docCount` | VS:159-390, 682, 768, 794-796 | Rendered as "{N} records on file"; button label "View Records ({N})"; YTD spend calc | number | -- |
| `docStatus` | VS:159-390, 737, 2048 | Passed to DocumentLoopIndicator; determines doc receipt indicator | enum: string | received, awaiting, never |
| `frequency` | VS:154-390, 621 | Rendered alongside frequencyReason | string | -- |
| `frequencyReason` | VS:154-390, 621 | Rendered as explanation of frequency | string | -- |
| `id` | VS:152-390 | Key prop for list rendering | string (PK) | -- |
| `lastCompleted` | VS:156-390, 681, 1566-1578, 2026 | Rendered as text or "Never" if null; used in sort (last-asc, last-desc) | string (date) or null | -- |
| `lastInvoice` | VS:158-390, 577, 707, 795-796, 1370, 1583, 1964 | Rendered as cost; variance calc; YTD calc; sort (cost-desc) | number or null | -- |
| `locationId` | VS:152-390, 964-968, 1299, 1400, 1609-1611 | FK lookup via locationById(); filter key; location grouping | string (FK) | -- |
| `nextDue` | VS:156-390, 689, 1227, 1366, 1548-1563, 1959, 2029 | Rendered with conditional color by status; used in sort (due-asc, due-desc) | string (date) | -- |
| `pillar` | VS:152-390, 574, 968, 1612, 1640 | Passed to pillarStyle(); filter key; group key | enum: string | food, fire, general |
| `status` | VS:157-390, 609, 627, 694-696, 968, 1406, 1526, 1613, 1636 | Passed to statusStyle(); filter/sort/group key; conditional rendering | enum: string | current, upcoming, at-risk, overdue, deferred |
| `type` | VS:152-390, 608, 953, 1361, 1581, 1609, 1637, 2005 | Rendered as service name; filter key; sort (name); group key | string | -- |
| `upcoming` | VS:160-390, 582-586 | Mapped to recurrence ribbon (next 3 dates with status colors) | string[] (dates) | -- |
| `vendorId` | VS:155-390, 573, 579, 627, 672, 736, 742, 968, 1610, 1638 | FK lookup via vendorById(); null check for "no vendor" state; filter key; group key | string (FK) or null | -- |

### Object: location (Vendor Services Preview)

| Property | File:Line | Usage | Inferred Type | Enum Values |
|---|---|---|---|---|
| `address` | VS:58-64, 1172, 1308 | Rendered in heat map tile and expanded detail | string | -- |
| `hasServices` | VS:58-64, 1413, 1715 | Conditional: if false, show EmptyLocationState; filter in location dropdown | boolean | -- |
| `id` | VS:58-64 | Key prop; FK reference | string (PK) | -- |
| `industry` | VS:58-64, 854, 868, 931, 1326 | Template lookup key; rendered in empty state and apply button | string | Restaurant, Healthcare |
| `name` | VS:58-64, 865, 1171, 1307, 1940, 2016 | Rendered in multiple surfaces; location selector; heat map tile | string | -- |
| `volumeTier` | VS:58-64, 62 | null for unconfigured locations; no direct render (configured via picker) | string or null | Light, Moderate, Heavy, Solid Fuel |

### Object: vendor (Vendor Services Preview)

| Property | File:Line | Usage | Inferred Type | Enum Values |
|---|---|---|---|---|
| `color` | VS:67-72, 658, 1947, 2020 | Avatar background color | string (hex) | -- |
| `id` | VS:67-72 | Key prop; FK reference | string (PK) | -- |
| `jobs` | VS:67-72, 669, 804 | Rendered as "{N} jobs" in vendor info | number | -- |
| `name` | VS:67-72, 659, 661, 803, 1015, 1222, 1369, 1950, 2021 | Rendered in multiple surfaces; filter labels; avatar initial | string | -- |
| `reliability` | VS:67-72, 668-669, 804, 2022-2023 | Rendered as "{N}% on-time"; conditional color (>=95 green, else amber) | number (0-100) | -- |
| `type` | VS:67-72 | Vendor's primary service type category | string | -- |

### Object: vendorBusinessDoc (Vendor Services Preview)

| Property | File:Line | Usage | Inferred Type | Enum Values |
|---|---|---|---|---|
| `expiry` | VS:77-103, 552 | Rendered when status is not pending/missing; null means no expiration | string (date) or null | -- |
| `id` | VS:77-103 | Key prop | string (PK) | -- |
| `status` | VS:77-103, 109-112, 536-543 | Used in vendorDocsHealth() aggregation; conditional display and action text | enum: string | current, expired, expiring, pending, missing |
| `type` | VS:77-103, 549 | Rendered as document type name | string | -- |

### Object: locationHealth (Vendor Services Preview)

| Property | File:Line | Usage | Inferred Type | Enum Values |
|---|---|---|---|---|
| `atRisk` | VS:395-401, 974 | Count of at-risk services; tile status calc | number | -- |
| `current` | VS:395-401, 975 | Count of current services | number | -- |
| `health` | VS:395-401, 449-463, 980-990 | Health percentage (0-100 or null for empty); drives tile color | number or null | -- |
| `id` | VS:395-401, 961 | FK to location | string (FK) | -- |
| `overdue` | VS:395-401, 973 | Count of overdue services; tile status calc | number | -- |
| `total` | VS:395-401, 979 | Total service count at location | number | -- |

### Object: volumeTier (Vendor Services Preview)

| Property | File:Line | Usage | Inferred Type | Enum Values |
|---|---|---|---|---|
| `desc` | VS:125-129, 894 | Rendered as tier description | string | -- |
| `freq` | VS:125-129, 895, 907 | Hood cleaning frequency for this tier; rendered and used in template | string | Annual, Semi-Annual, Quarterly, Monthly |
| `id` | VS:125-129, 882 | Selection value; matched against state | string | Light, Moderate, Heavy, Solid Fuel |
| `label` | VS:125-129, 893 | Rendered as tier name | string | -- |

### Object: industryTemplateItem (Vendor Services Preview)

| Property | File:Line | Usage | Inferred Type | Enum Values |
|---|---|---|---|---|
| `compliance` | VS:134-147, 917 | Rendered as compliance citation | string | -- |
| `frequency` | VS:135-147, 907 | Used when frequencyByVolume is false | string | -- |
| `frequencyByVolume` | VS:134-147, 907 | If true, frequency comes from selected volume tier instead | boolean | -- |
| `pillar` | VS:134-147, 908 | Passed to pillarStyle() for icon/color | enum: string | food, fire, general |
| `type` | VS:134-147, 916 | Rendered as service type name | string | -- |
| `vendorType` | VS:134-147 | Maps to vendor category for assignment | string | -- |

---

## TABLE 2 -- Enum / CHECK Constraint Values

### Document status

| Value | Source | Where Set |
|---|---|---|
| `current` | Docs:67,68,70,71,77,85-90,97-100 | Mock data; statusPill() line 98 |
| `expiring` | Docs:69,88,91 | Mock data; statusPill() line 99 |
| `expired` | Docs:72,84,101 | Mock data; statusPill() line 100 |
| `pending_review` | Docs:78,89 | Mock data; statusPill() line 101 |
| `requested` | Docs:79,80,90 | Mock data; statusPill() line 102 |
| `overdue` | Docs:81 | Mock data; statusPill() line 103 |

**6 values. Matches handoff doc (current, expiring, expired, pending_review, requested, overdue).**

### Document request stage

| Value | Source | Where Set |
|---|---|---|
| `sent` | Docs:80,90, 110 | Mock data; requestStagePill() |
| `viewed` | Docs:79, 111 | Mock data; requestStagePill() |
| `uploaded` | Docs:76-78,85-88, 112 | Mock data; requestStagePill() |
| `overdue` | Docs:81, 113 | Mock data; requestStagePill() |

**4 values.**

### Document category (tab id)

| Value | Label | Description |
|---|---|---|
| `kitchen` | Kitchen & Employee Records | Your kitchen + staff certifications |
| `service` | Vendor Service Records | Reports of work performed by vendors |
| `business` | Vendor Business Records | Vendor credentials (COI, W-9, license) |

**3 values. Arthur's locked 3-value model confirmed.**

### Service status (Vendor Services)

| Value | Label | Source | Where Set |
|---|---|---|---|
| `current` | On track | VS:169,229-306, statusStyle():418 | Mock data; statusStyle() |
| `upcoming` | Upcoming | statusStyle():419 | statusStyle() only -- NOT in any mock data |
| `at-risk` | At Risk | VS:205,253,379, statusStyle():420 | Mock data; statusStyle() |
| `overdue` | Overdue | VS:157,329-338, statusStyle():421 | Mock data; statusStyle() |
| `deferred` | Deferred | statusStyle():422 | statusStyle() only -- NOT in any mock data |

**5 values defined in statusStyle(). Only 3 appear in mock data (current, at-risk, overdue). "upcoming" and "deferred" are UI-ready but not exercised.**

**Cross-file note:** Documents Preview uses `overdue` as a document status. Vendor Services uses `overdue` as a service status. Same string, different domain.

### Service pillar

| Value | Label | Icon | Source |
|---|---|---|---|
| `food` | Food Safety | Utensils | VS:176-383, pillarStyle():411 |
| `fire` | Fire Safety | Flame | VS:152-367, pillarStyle():412 |
| `general` | General | Wrench | VS:200-389, pillarStyle():413 |

**3 values. Matches VENDOR-SERVICES-001 constraint: food_safety, fire_safety, general (preview uses short form: food, fire, general).**

### Vendor business doc status (Vendor Services)

| Value | Source | Where Set |
|---|---|---|
| `current` | VS:77-103 | Mock data |
| `expired` | VS:84,101 | Mock data |
| `expiring` | VS:91,95 | Mock data |
| `pending` | VS:81 | Mock data |
| `missing` | VS:94 | Mock data |

**5 values. NOTE: "pending" here (not "pending_review" like Documents Preview). These are vendor-side doc states, not the same domain as document status.**

**Cross-file mismatch:** Documents Preview uses `pending_review` for documents awaiting operator review. Vendor Services uses `pending` for the same concept on vendor business docs. The schema must reconcile this.

### Vendor docs health state (derived)

| Value | Condition | Source |
|---|---|---|
| `current` | All docs are status=current | VS:118, vendorDocsHealth() |
| `review` | Has pending docs, no expired/missing | VS:117, vendorDocsHealth() |
| `warning` | Has expiring docs, no expired/missing | VS:116, vendorDocsHealth() |
| `critical` | Has expired or missing docs | VS:115, vendorDocsHealth() |
| `unknown` | No docs on file | VS:108, vendorDocsHealth() |

**5 values. Derived client-side from vendor business doc statuses. Priority: critical > warning > review > current.**

### Service docStatus (document loop indicator)

| Value | Label | Icon | Source |
|---|---|---|---|
| `received` | Document received | FileCheck2 | VS:830 |
| `awaiting` | Awaiting document | Clock | VS:831 |
| `never` | No documents yet | FileText | VS:832 |

**3 values.**

### Recipient type (Send to Third Party)

| Value | Label | Source |
|---|---|---|
| `ehd` | Environmental Health Dept. | Docs:446 |
| `ahj` | Authority Having Jurisdiction (Fire) | Docs:447 |
| `insurance_broker` | Insurance Broker | Docs:448 |
| `insurance_carrier` | Insurance Carrier | Docs:449 |
| `auditor` | Auditor / Regulator | Docs:450 |
| `client_legal` | Client / Legal | Docs:451 |

**6 values.**

### Purpose (downstream of recipient type)

| Recipient | Purpose Values |
|---|---|
| `ehd` | Annual renewal, Inspection follow-up, Variance request |
| `ahj` | Annual fire inspection, Plan check, Permit renewal |
| `insurance_broker` | Annual renewal, Claim documentation, Underwriting review |
| `insurance_carrier` | Claim submission, Coverage verification |
| `auditor` | Compliance audit, Investigation |
| `client_legal` | Discovery, Contract compliance |

**16 total purpose values across 6 recipient types.**

### Volume tier

| Value | Label | Hood Cleaning Frequency | Source |
|---|---|---|---|
| `Light` | Light Volume | Annual | VS:125 |
| `Moderate` | Moderate Volume | Semi-Annual | VS:126 |
| `Heavy` | Heavy Volume | Quarterly | VS:127 |
| `Solid Fuel` | Solid Fuel | Monthly | VS:128 |

**4 values. IKECA-driven. Only affects hood cleaning frequency.**

### Industry (template key)

| Value | Source |
|---|---|
| `Restaurant` | VS:58-62, 133 |
| `Healthcare` | VS:63, 140 |

**2 values exercised in preview. industryTemplates.ts in codebase has 6 (restaurant-full, restaurant-quick, hotel, healthcare, education, catering).**

### View mode (Vendor Services)

| Value | Description | Source |
|---|---|---|
| `list` | Single location, detailed service cards | VS:2072, 2115 |
| `allServices` | Flat master list across all locations | VS:2122 |
| `heatmap` | Multi-location heat map overview | VS:2129 |

**3 values.**

### Group by (AllServicesView)

| Value | Label | Description | Source |
|---|---|---|---|
| `status` | Status | Triage view | VS:1518 |
| `service` | Service Type | See all hood cleanings together | VS:1519 |
| `vendor` | Vendor | Per-vendor portfolio view | VS:1520 |
| `location` | Location | Per-location list | VS:1521 |
| `pillar` | Pillar | Food vs fire | VS:1522 |
| `none` | Flat List | No grouping | VS:1523 |

**6 values.**

### Sort by (AllServicesView)

| Value | Label | Description | Source |
|---|---|---|---|
| `priority` | Priority | Overdue -> At-Risk -> Upcoming -> Current | VS:1529 |
| `due-asc` | Next due (asc) | Earliest due first | VS:1530 |
| `due-desc` | Next due (desc) | Furthest out first | VS:1531 |
| `last-desc` | Last completed (desc) | Most recently serviced | VS:1532 |
| `last-asc` | Last completed (asc) | Stalest services first | VS:1533 |
| `name` | Service A->Z | Alphabetical | VS:1534 |
| `cost-desc` | Cost (desc) | Highest cost first | VS:1535 |

**7 values. Status priority order: overdue=0, at-risk=1, upcoming=2, current=3, deferred=4.**

### Density (AllServicesView)

| Value | Description | Source |
|---|---|---|
| `compact` | Compact rows (grid columns, more on screen) | VS:1603, 1689 |
| `normal` | Normal rows (more detail per row) | VS:1603, 1696 |

**2 values.**

### Vendor Services page tabs

| Value | Label | Icon | Source |
|---|---|---|---|
| `services` | Services | Wrench | VS:2064 |
| `vendors` | Vendor List | Briefcase | VS:2065 |
| `requests` | Service Requests | Bell | VS:2066 |
| `performance` | Performance Scorecard | BarChart3 | VS:2067 |

**4 values. Only "services" tab is implemented. vendors/requests/performance are PlaceholderTab.**

### Heat map tile status (derived)

| Value | Label | Condition | Source |
|---|---|---|---|
| `empty` | Not configured | location.hasServices=false OR health=null | VS:980, 1025 |
| `na` | N/A -- not at this location | No matching services under current filter | VS:980, 1026 |
| `current` | On track | No overdue or at-risk | VS:989, 1027 |
| `at-risk` | At Risk | Has at-risk, no overdue | VS:986, 1028 |
| `overdue` | Overdue | Has overdue services | VS:983, 1029 |

**5 values. Derived client-side per location under active filters.**

---

## TABLE 3 -- Action Handler Signatures

### Documents Preview

| # | Handler | Signature | File:Line | Action | Supabase Function | Mock Only? |
|---|---|---|---|---|---|---|
| 1 | Accept (button) | `() => void` | Docs:410 | Accept a pending_review document (mark as current) | -- | YES (no onClick) |
| 2 | Reject (button) | `() => void` | Docs:411 | Reject a pending_review document (reason required per label) | -- | YES (no onClick) |
| 3 | Resend secure link (button) | `() => void` | Docs:414 | Resend the upload request link to vendor (status=requested) | -- | YES (no onClick) |
| 4 | Download (button) | `() => void` | Docs:415 | Download document file | -- | YES (no onClick) |
| 5 | Replace (button) | `() => void` | Docs:416 | Replace existing document with new upload | -- | YES (no onClick) |
| 6 | Request -> (missing doc) | `() => void` | Docs:289-291 | Send document request to vendor for missing document | -- | YES (no onClick) |
| 7 | Request now -> (wizard) | `() => void` | Docs:568 | Request missing document inline from Send wizard step 3 | -- | YES (href="#") |
| 8 | Send Secure Link -> | `() => void` | Docs:611 | Submit Send-to-Third-Party wizard: generate secure link, send email | send_to_third_party | YES (no onClick) |
| 9 | AI draft cover message | `() => void` | Docs:471-477, 577 | Generate AI cover message from recipient + purpose context | -- | LOCAL (sets state) |
| 10 | setSendOpen | `(open: boolean) => void` | Docs:126, 178 | Open/close Send to Third Party wizard | -- | LOCAL |
| 11 | setOpenDoc | `(doc: Document or null) => void` | Docs:125, 310, 351 | Open/close document detail modal | -- | LOCAL |

### Vendor Services Preview

| # | Handler | Signature | File:Line (declared) | Action | Supabase Function | Mock Only? |
|---|---|---|---|---|---|---|
| 12 | onSchedule | `(service: Service) => void` | VS:571, 757 | Schedule next service visit with vendor | services_schedule_next | YES (not wired in parent) |
| 13 | onAcknowledge | `(service: Service) => void` | VS:571, 629 | Acknowledge at-risk alert (suppress until next due date) | -- | YES (not wired in parent) |
| 14 | onAssignVendor | `(service: Service) => void` | VS:571, 672 | Assign existing vendor to unassigned service | -- | YES (not wired in parent) |
| 15 | onDefer | `(service: Service) => void` | VS:571, 771 | Skip this cycle (e.g. closed for renovation) | -- | YES (not wired in parent) |
| 16 | onJumpToDocs | `(service: Service) => void` | VS:571, 736-737, 765, 1901-1902, 2047-2048 | Navigate to Documents page filtered to this vendor's service records | -- | MOCK (alert in line 2182) |
| 17 | onOpenDocs | `(vendorId: string) => void` | VS:470, 525 | Navigate to Documents page filtered to vendor business docs | -- | YES (not wired at top level) |
| 18 | onUploadDoc | `(vendorId: string, doc: VendorBusinessDoc) => void` | VS:470, 556 | Upload or review a specific vendor business document | -- | YES (not wired at top level) |
| 19 | onApplyTemplate | `(template: TemplateItem[], volumeTier: string) => void` | VS:852, 928 | Apply industry template to location: create service records | -- | MOCK (alert in line 2078) |
| 20 | onLocationClick | `(location: Location) => void` | VS:945, 1317 | Open location detail from heat map | -- | LOCAL (switches view) |
| 21 | onServiceClick | `(service: Service) => void` | VS:945, 1345 | Open service detail from heat map tile | -- | LOCAL (switches view) |
| 22 | onJumpToLocation | `(locationId: string) => void` | VS:1594, 1936, 2013 | Navigate to location's service list view | -- | LOCAL (line 2181) |
| 23 | handleApplyTemplate | `(template: TemplateItem[], volumeTier: string) => void` | VS:2076-2079 | Top-level apply template handler | -- | MOCK (alert) |
| 24 | handleHeatMapLocationClick | `(location: Location) => void` | VS:2081-2084 | Switch from heat map to location list | -- | LOCAL |
| 25 | Send to Third Party (button) | `() => void` | VS:2136-2138 | Open Send to Third Party wizard (same as Docs) | -- | YES (no onClick) |
| 26 | Add Service (button) | `() => void` | VS:2139-2141 | Add a new service record manually | -- | YES (no onClick) |
| 27 | Review locations (bulk bar) | `() => void` | VS:1278-1281 | Review filtered locations before bulk action | -- | YES (no onClick) |
| 28 | Bulk Schedule (bulk bar) | `() => void` | VS:1283-1286 | Bulk schedule filtered service across multiple locations | -- | YES (no onClick) |
| 29 | Vendor Connect (disabled) | N/A | VS:649-655 | Future feature: auto-assign vendor via marketplace | -- | DISABLED (cursor: not-allowed) |

---

## TABLE 4 -- Cross-Jump URLs

| # | Source Preview | Source Component | Destination URL | Trigger | Expected Destination | Query Param Shape |
|---|---|---|---|---|---|---|
| 1 | Vendor Services | AllServicesView (line 2182) | `/documents?tab=vendor-business&vendor={vendorId}` | onJumpToDocs button click | Documents page, Vendor Business Records tab, filtered to vendor | `tab`: one of kitchen/service/business; `vendor`: vendor name or ID |
| 2 | Vendor Services | VendorDocsPanel (line 525) | `/documents?tab=business&vendor={vendorId}` | "View all" link click | Documents page, Vendor Business Records tab, filtered to vendor | `tab`: business; `vendor`: vendor ID |
| 3 | Vendor Services | ServiceCard (line 765) | `/documents?tab=service&vendor={vendorId}` | "View Records ({N})" button click | Documents page, Vendor Service Records tab, filtered to vendor | `tab`: service; `vendor`: vendor ID |
| 4 | Vendor Services | DocumentLoopIndicator (line 737, 2048) | `/documents?tab=service&service={serviceId}` | Indicator pill click | Documents page, filtered to this service's records | `tab`: service; `service`: service ID (inferred) |
| 5 | Vendor Services | HeatMapView (line 1317) | Same-page state change | "Open Location" button click | ServicesListView for that location (view=list, locationId set) | N/A (in-page) |
| 6 | Vendor Services | HeatMapView (line 2185) | Same-page state change | Service tile click in heat map | ServicesListView for that service's location | N/A (in-page) |
| 7 | Vendor Services | AllServicesView (line 2181) | Same-page state change | Location name click in compact/normal rows | ServicesListView for that location | N/A (in-page) |
| 8 | Vendor Services | Breadcrumb (line 2091-2097) | `/dashboard`, `/vendors` | Breadcrumb text (no actual links wired) | Dashboard page, Vendors page | N/A (not wired) |
| 9 | Documents | Header (line 178) | In-page modal | "Send to Third Party" button | SendToThirdPartyWizard modal | N/A (modal) |
| 10 | Vendor Services | Header (line 2136-2138) | In-page modal or route | "Send to Third Party" button | Same wizard as Documents page | N/A (not wired) |

**Key contract:** Destinations 1-4 require the Documents page to accept `tab` and `vendor` (and possibly `service`) query parameters, read them on mount, and set the active tab + filter accordingly.

---

## TABLE 5 -- Counts / Badges / Aggregates

### Documents Preview

| # | Count Name | UI Location | Aggregation | Scope | Update Frequency |
|---|---|---|---|---|---|
| 1 | Tab badge (kitchen) | Tab button, red dot | `count WHERE status IN ('expiring','expired')` | All kitchen docs in org | Client-side from fetched docs |
| 2 | Tab badge (service) | Tab button, red dot | `count WHERE status IN ('pending_review','overdue')` | All service docs in org | Client-side from fetched docs |
| 3 | Tab badge (business) | Tab button, red dot | `count WHERE status IN ('pending_review','expiring')` | All business docs in org | Client-side from fetched docs |
| 4 | Tab total count | Tab button label "(N)" | `count(*)` per category | Per tab | Client-side from fetched docs |
| 5 | Stats: Total | Stats row | `count(*)` across ALL categories | Org-wide | Client-side from fetched docs |
| 6 | Stats: Current | Stats row (green) | `count WHERE status = 'current'` across all categories | Org-wide | Client-side from fetched docs |
| 7 | Stats: Expiring Soon | Stats row (amber) | `count WHERE status = 'expiring'` across all categories | Org-wide | Client-side from fetched docs |
| 8 | Stats: Expired | Stats row (red) | `count WHERE status IN ('expired','overdue')` across all categories | Org-wide | Client-side from fetched docs |
| 9 | Missing docs count | Missing alert banner | Count of expected-but-missing docs per tab | Per tab + compliance rules | Client-side derivation |
| 10 | Filtered count | Implicit (filtered.length) | `count(*)` matching search + status + location + vendor filters | Per tab, filtered | Client-side from fetched docs |

### Vendor Services Preview

| # | Count Name | UI Location | Aggregation | Scope | Update Frequency |
|---|---|---|---|---|---|
| 11 | Location health: overdue | Heat map tile | `count WHERE status = 'overdue'` for services at location | Per location | Client-side from fetched services |
| 12 | Location health: atRisk | Heat map tile | `count WHERE status = 'at-risk'` for services at location | Per location | Client-side from fetched services |
| 13 | Location health: current | Heat map tile | `count WHERE status = 'current'` for services at location | Per location | Client-side from fetched services |
| 14 | Location health: total | Heat map tile | `count(*)` services at location | Per location | Client-side from fetched services |
| 15 | Location health % | Heat map tile (large number) | `round((current / total) * 100)` | Per location | Client-side derivation |
| 16 | Heat map totals: overdue | Stats row | `sum(overdue)` across all locations (under filter) | Org-wide | Client-side derivation |
| 17 | Heat map totals: atRisk | Stats row | `sum(atRisk)` across all locations (under filter) | Org-wide | Client-side derivation |
| 18 | Heat map totals: current | Stats row | `sum(current)` across all locations (under filter) | Org-wide | Client-side derivation |
| 19 | Matching locations | Filter context label | `count WHERE tileStatus NOT IN ('na','empty')` | Org-wide, filtered | Client-side derivation |
| 20 | Filter context: "N of M locations match" | Heat map filter bar | Matching locations / total locations | Org-wide | Client-side derivation |
| 21 | Vendor docs: missing | VendorDocsPanel badge | `count WHERE status = 'missing'` for vendor | Per vendor | Client-side from vendor docs |
| 22 | Vendor docs: expired | VendorDocsPanel badge | `count WHERE status = 'expired'` for vendor | Per vendor | Client-side from vendor docs |
| 23 | Vendor docs: expiring | VendorDocsPanel summary | `count WHERE status = 'expiring'` for vendor | Per vendor | Client-side from vendor docs |
| 24 | Vendor docs: pending | VendorDocsPanel summary | `count WHERE status = 'pending'` for vendor | Per vendor | Client-side from vendor docs |
| 25 | Vendor docs: total | VendorDocsPanel | `count(*)` for vendor | Per vendor | Client-side from vendor docs |
| 26 | Vendor docs: expired+missing badge | VendorDocsPanel compact pill | `expired + missing` count | Per vendor | Client-side derivation |
| 27 | AllServicesView: filtered count | Filter bar right side | `{filtered.length} of {SERVICES.length} services` | Org-wide | Client-side derivation |
| 28 | AllServicesView: overdue count | Filter bar right side | `count WHERE status = 'overdue'` in filtered set | Org-wide, filtered | Client-side derivation |
| 29 | AllServicesView: atRisk count | Filter bar right side | `count WHERE status = 'at-risk'` in filtered set | Org-wide, filtered | Client-side derivation |
| 30 | ServicesListView: filtered count | Filter bar right side | `{filtered.length} of {services.length} services` | Per location | Client-side derivation |
| 31 | YTD spend rollup | Spend card | `sum(lastInvoice * docCount)` for all services at location | Per location | Client-side derivation |
| 32 | Budget progress % | Spend card progress bar | `min(100, round((ytdSpend / annualBudget) * 100))` | Per location | Client-side derivation |
| 33 | Service docCount | ServiceCard "View Records (N)" button | Pre-computed count of service records on file | Per service | Stored on service record |
| 34 | Group header: items count | ServiceGroupBlock "(N)" | Group item count | Per group | Client-side derivation |
| 35 | Group header: overdue count | ServiceGroupBlock red badge | `count WHERE status = 'overdue'` in group | Per group | Client-side derivation |
| 36 | Group header: atRisk count | ServiceGroupBlock amber badge | `count WHERE status = 'at-risk'` in group | Per group | Client-side derivation |
| 37 | Bulk action count | Bulk action bar | `overdue + atRisk` across filtered locations | Org-wide, filtered | Client-side derivation |
| 38 | Smart insight callout | Heat map filter bar (violet) | "N locations need attention" or "at risk" or "All on track" | Org-wide, filtered | Client-side derivation |
| 39 | Template service count | EmptyLocationState apply button | `template.length` | Per industry | Static config |
| 40 | Vendor: jobs count | ServiceCard vendor info | Total completed jobs for vendor | Per vendor | Stored on vendor |
| 41 | Vendor: reliability % | ServiceCard vendor info, NormalServiceRow | On-time percentage | Per vendor | Stored on vendor |

**Assessment:** All aggregates in both previews are client-side derivations from already-fetched data. No materialized views or denormalized counters are required -- the schema just needs to return the right rows and the client computes everything. The one exception is `annualBudget` (line 1419, hardcoded to 16000 in preview) which implies a per-location or per-org budget field that doesn't exist in mock data.

---

## APPENDIX -- Commented-Out Code, Unused, and Ambiguous Items

### Commented-out code
None found in either preview file.

### Unused fields accessed but never rendered

| Field | Object | File:Line | Notes |
|---|---|---|---|
| `vendor.type` | vendor | VS:67-72 | Present in mock data but never rendered or filtered in any component. Ambiguous: could be vendor category or primary service type. |

### Ambiguous items

| Item | File:Line | Ambiguity |
|---|---|---|
| `annualBudget` | VS:1419 | Hardcoded to 16000. Unclear if this should be per-location, per-org, or configurable. No field on any object provides it. |
| `upcoming` status value | VS:419, 1461, 1526 | Defined in statusStyle() and STATUS_PRIORITY with sort order 2, but NO mock data uses it. Unclear what triggers it vs "current". |
| `deferred` status value | VS:422, 1526 | Defined in statusStyle() and STATUS_PRIORITY with sort order 4, but NO mock data uses it. Presumably set by onDefer handler. |
| `pending` vs `pending_review` | Docs:101 vs VS:81 | Documents Preview uses `pending_review` for docs awaiting operator review. Vendor Services uses `pending` for vendor business docs in the same state. Schema must decide canonical name. |
| `vendor.type` vs `vendorType` on template | VS:67 vs VS:134 | Vendor object has `type: 'KEC'`. Template item has `vendorType: 'KEC'`. Unclear if they reference the same enum or if one is a FK and the other a label. |
| Request stage vs Document status overlap | Docs:81,103,113 | Both document `status` and `request.stage` can be `overdue`. Status=overdue means the document itself is overdue. Stage=overdue means the vendor upload request is overdue. Different semantics, same string. |
| `service.docCount` | VS:159 | Described as "records on file" but used to calculate YTD spend (`lastInvoice * docCount`). This implies docCount = total historical service completions, not document count. Name is misleading. |
| Location `volumeTier` | VS:58-64 | Present on location but only used in EmptyLocationState picker (line 853 uses local state, not location.volumeTier). Unclear if the stored tier should override the picker default. |

---

*End of UI Contract Manifest. No code changes made.*
