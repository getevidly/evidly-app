# Pillar Param Inspection — Shared Pages

**Date:** 2026-05-10
**Scope:** 5 shared pages that serve both Food Safety and Facility Safety pillars
**Objective:** Determine current pillar handling and produce a per-page wiring spec

---

## Summary Table

| Page | useSearchParams | Reads `?pillar=` | Data Hook | Hook accepts pillar | Filter location | Existing pillar branches | Schema pillar values |
|------|----------------|-----------------|-----------|--------------------|-----------------|--------------------------|--------------------|
| IncidentLog | **No** (uses `useNavigate` only) | **No** | Inline `supabase.from('incidents')` fetch (line 603) | **No** — fetches all org incidents | Component-level `.filter()` for status/type only | **None** — no pillar/category field in incidents table or UI | Schema has no `pillar`/`category` column |
| CorrectiveActions | **Yes** (line 2) | **No** — reads `?location=` (line 115) and `?from=` (line 173) only | Local state `localActions` + demo data import from `correctiveActionsDemoData` | **No** — no hook, no Supabase fetch | Component-level `useMemo` filter by status/location/severity (line 253); role-based: `facilities_manager` sees only `category === 'facility_safety'` (line 245) | **Yes** — `facilities_manager` role branch filters to `facility_safety` category; template picker has category chips (`food_safety`, `facility_safety`, `operational`) | DB: `corrective_actions.category` CHECK `('food_safety', 'facility_safety', 'operational')` |
| Deficiencies | **Yes** (line 2) | **No** — reads `?status=`, `?severity=`, `?q=`, `?sort=` only | Demo array `DEMO_DEFICIENCIES` (no Supabase fetch) | **No** — hardcoded demo constant | Component-level `.filter()` by status/severity/search (post-fetch) | **None** — no pillar/category field in demo data or DB schema | DB `deficiencies` has **no** pillar/category column |
| SelfAudit | **Yes** (line 4) | **No** — reads `?location=` (line 313) only | No fetch hook — uses static checklist data from `selfInspectionChecklist.ts` + `useJurisdiction()` for scoring context | **No** — checklist is static; items have `category: 'food_safety' | 'facility_safety'` but it's an item property, not a query filter | Static data, no filtering by pillar — all sections rendered sequentially | **Partial** — each `InspectionItemDef` has a `category` field (`food_safety` or `facility_safety`); section icons differ; but no toggle or `?pillar=` param filters sections | Static data: `'food_safety' | 'facility_safety'` per item/section |
| Calendar | **Yes** (line 2) | **No** — reads `?category=` (line 163) for vendor service type (e.g., `hood_cleaning`, `fire_suppression`) | Inline `supabase.from('calendar_events')` fetch (line 234) | **No** — fetches all org calendar events for date range | Component-level role-based `ROLE_EVENT_TYPES` filtering + category param for pre-selecting vendor service view | **None** — no pillar field; `category` means service type (Hood Cleaning, Pest Control, etc.), not food/fire pillar | DB `calendar_events.category` is free-text (service type label), no pillar enum |

---

## Per-Page Detail

### 1. IncidentLog (`src/pages/IncidentLog.tsx`)

- **Imports**: `useNavigate` from react-router — **no** `useSearchParams`
- **Data**: Fetches from `supabase.from('incidents')` at line 603 (live mode) or uses `DEMO_INCIDENTS` hardcoded array (demo mode)
- **Pillar in schema**: The `incidents` table has a `type` column (temperature_violation, equipment_failure, etc.) but **no pillar or category column**
- **Filtering**: Status/severity/type UI filters exist, but no food-vs-fire pillar filter
- **Gap**: To support `?pillar=`, would need either a `category` column added to `incidents` or inference logic mapping incident `type` → pillar

### 2. CorrectiveActions (`src/pages/CorrectiveActions.tsx`)

- **Imports**: `useSearchParams` at line 2
- **Reads params**: `?location=` (line 115), `?from=self-inspection` (line 173) — **no** `?pillar=`
- **Data**: Currently uses local state + `correctiveActionsDemoData` import. No Supabase fetch for list view.
- **Pillar in schema**: `corrective_actions.category` is `CHECK ('food_safety', 'facility_safety', 'operational')` — **pillar-ready**
- **Existing branch**: `facilities_manager` role auto-filters to `category === 'facility_safety'` (line 245)
- **Template picker**: Already uses category chips (food_safety, facility_safety, operational) at line 677
- **Gap**: Only needs `?pillar=` param reading + applying category filter to the list. Schema ready.

### 3. Deficiencies (`src/pages/Deficiencies.tsx`)

- **Imports**: `useSearchParams` at line 2
- **Reads params**: `?status=`, `?severity=`, `?q=`, `?sort=` — **no** `?pillar=`
- **Data**: Uses `DEMO_DEFICIENCIES` hardcoded array. No Supabase fetch.
- **Pillar in schema**: `deficiencies` table has **no** pillar/category column
- **Gap**: Schema needs a `category` column added before pillar filtering is possible. Data is also currently demo-only.

### 4. SelfAudit (`src/pages/SelfAudit.tsx`)

- **Imports**: `useSearchParams` at line 4
- **Reads params**: `?location=` (line 313) — **no** `?pillar=`
- **Data**: Static checklist from `selfInspectionChecklist.ts`. Each `InspectionItemDef` has `category: 'food_safety' | 'facility_safety'` and sections have the same field.
- **Filtering**: Currently renders ALL sections sequentially (food + facility) regardless of pillar
- **Gap**: Static data already tagged with pillar category. Could filter sections by `?pillar=` with no schema change needed — purely UI filtering.

### 5. Calendar (`src/pages/Calendar.tsx`)

- **Imports**: `useSearchParams` at line 2
- **Reads params**: `?category=` (line 163) — maps to vendor service type (hood_cleaning → "Hood Cleaning Inspection"), **not** a pillar param
- **Data**: `supabase.from('calendar_events')` fetch (line 234) — fetches all events for org + date range
- **Pillar in schema**: `calendar_events.category` is free-text for service type labels (Hood Cleaning, Pest Control, etc.). **No pillar enum column.**
- **Gap**: Schema has no pillar column. Would need either a `pillar` column or inference from `category` value (e.g., "Hood Cleaning" → facility_safety, "Temperature Reading" → food_safety). The `type` column (`vendor`, `inspection`, `corrective`, etc.) also doesn't map cleanly to food/fire.

---

## Wiring Readiness Summary

| Page | Schema ready | UI change only | Needs migration |
|------|-------------|----------------|-----------------|
| IncidentLog | **No** | — | Yes (`category` column on `incidents`) |
| CorrectiveActions | **Yes** | Read `?pillar=` → filter by `category` | No |
| Deficiencies | **No** | — | Yes (`category` column on `deficiencies`) |
| SelfAudit | **Yes** (static data tagged) | Read `?pillar=` → filter sections | No |
| Calendar | **No** | — | Yes (`pillar` column on `calendar_events` or inference map) |

---

## Existing Pillar Infrastructure

The `PillarToggle` component (`src/components/pillars/PillarToggle.jsx`) exists but only navigates between `/food-safety/*` and `/fire-safety/*` route prefixes. It does NOT set a `?pillar=` search param — it uses pathname-based routing. The 5 shared pages above live at unprefixed routes (e.g., `/incidents`, `/corrective-actions`) and have no `PillarToggle` integration.
