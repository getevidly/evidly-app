# EvidLY App — Status Report
Generated: 2026-03-05

---

## Build Health

| Check | Status |
|-------|--------|
| TypeScript (`tsc --noEmit`) | **PASS** — 0 errors |
| Production Build (`vite build`) | **PASS** — built in 52s |
| PWA Service Worker | **PASS** — 354 precache entries |
| Vercel Deploy | **PASS** — live at getevidly.com |

### Bundle Size (Top Chunks)

| Chunk | Raw | Gzipped |
|-------|-----|---------|
| `index` (app shell) | 1,022 KB | 282 KB |
| `vendor-charts` (Recharts) | 438 KB | 124 KB |
| `jspdf` (PDF export) | 390 KB | 128 KB |
| `ImportData` (CSV/Excel) | 358 KB | 122 KB |
| `Dashboard` | 237 KB | 55 KB |
| `JurisdictionSettings` | 208 KB | 41 KB |
| `html2canvas` | 201 KB | 48 KB |
| `vendor-supabase` | 177 KB | 47 KB |
| `vendor-react` | 178 KB | 59 KB |
| `ComplianceIntelligence` | 141 KB | 32 KB |
| `TempLogs` | 128 KB | 28 KB |

**Note:** `index` chunk exceeds 500 KB warning threshold. Consider manual chunk splitting for the app shell.

---

## Codebase Scale

| Category | Count |
|----------|-------|
| **Pages** (`src/pages/*.tsx`) | 170 |
| **Components** (`src/components/*.tsx`) | 250 |
| **Libraries** (`src/lib/*.ts`) | 68 |
| **Hooks** (`src/hooks/*.ts`) | 29 |
| **Data Files** (`src/data/*.ts`) | 46 |
| **Config Files** (`src/config/*.ts`) | 10 |
| **Total Source Files** (`src/`) | **604** |
| **Edge Functions** (`supabase/functions/`) | 120 |
| **DB Migrations** (`supabase/migrations/`) | 190 |
| **Total Commits** | 597 |

### Component Directories (26)

```
admin/          benchmarks/     compliance/     dashboard/
dashboard/shared/  demo/        diagnosis/      documents/
facility-safety/   hub/         intelligence/   landing/
layout/         locations/      mobile/         permissions/
referral/       reports/        self-inspection/ shared/
temp-logs/      training/       trends/         ui/
vendor/
```

---

## Route Inventory

| Category | Count |
|----------|-------|
| **Total Routes** | 187 |
| Inside ProtectedLayout (sidebar + topbar) | 127 |
| Public / Landing | 43 |
| Standalone Protected | 7 |
| Redirect / Alias Routes | 14 |
| Lazy-loaded | All (except 3 wrappers) |

### Route Breakdown by Section

| Section | Routes | Examples |
|---------|--------|---------|
| **Core Dashboard** | 15 | `/dashboard`, `/food-safety`, `/compliance`, `/insights`, `/tools` |
| **Admin Console** | 30 | `/admin/configure`, `/admin/command-center`, `/admin/intelligence`, `/admin/pipeline` |
| **Equipment & Temps** | 6 | `/equipment`, `/equipment/:id`, `/temp-logs`, `/iot-monitoring` |
| **Training** | 8 | `/training`, `/training/course/:id`, `/dashboard/training`, `/dashboard/training/:employeeId` |
| **Playbooks** | 5 | `/playbooks`, `/playbooks/active/:id`, `/playbooks/builder`, `/playbooks/analytics` |
| **Compliance** | 12 | `/compliance-overview`, `/insurance-risk`, `/facility-safety`, `/k12`, `/sb1383` |
| **Vendor Portal** | 8 | `/vendor/dashboard`, `/vendor/login`, `/vendors`, `/marketplace` |
| **Reports & Analysis** | 6 | `/reports`, `/reports/:reportType`, `/analysis`, `/audit-report` |
| **Settings** | 5 | `/settings`, `/settings/branding`, `/settings/roles-permissions` |
| **Public Pages** | 15 | `/`, `/assessment`, `/checkup`, `/blog`, `/city/:citySlug`, `/:slug` |
| **Auth** | 10 | `/login`, `/signup`, `/forgot-password`, `/demo`, `/auth/callback` |
| **Enterprise** | 4 | `/enterprise/admin`, `/enterprise/dashboard`, `/enterprise/intelligence` |
| **IoT / Sensors** | 5 | `/iot/hub`, `/sensors`, `/sensors/add`, `/sensors/:id`, `/iot-platform` |
| **Other** | 14 | `/documents`, `/checklists`, `/calendar`, `/alerts`, `/team`, `/help` |
| **Redirects** | 14 | `/ai-insights` → `/ai-advisor`, `/locations` → `/org-hierarchy`, etc. |

### Route Guards

| Guard | Purpose | Routes |
|-------|---------|--------|
| `ProtectedRoute` | Requires auth | All dashboard routes |
| `PublicRoute` | Redirects if authed | Login, Signup, Forgot Password |
| `AdminRoute` | Platform admin only | `/admin` root |
| `SalesGuard` | Sales/marketing lockout | 7 growth routes (demo-generator, demos, assessments, guided-tours, leads, campaigns, pipeline) |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | React | 18.3.1 |
| **Routing** | React Router | 7.13.0 |
| **Build** | Vite | 5.4.2 |
| **Language** | TypeScript | (via tsc) |
| **Styling** | Tailwind CSS | 3.4.1 |
| **Backend** | Supabase | 2.57.4 |
| **Charts** | Recharts | 3.7.0 |
| **Icons** | Lucide React | 0.344.0 |
| **Animation** | Framer Motion | 12.34.0 |
| **PDF** | jsPDF | 4.1.0 |
| **Excel** | xlsx | 0.18.5 |
| **Payments** | Stripe.js | 8.7.0 |
| **CMS** | Sanity | 7.16.0 |
| **Monitoring** | Sentry | 10.39.0 |
| **PWA** | vite-plugin-pwa | 0.21.2 |
| **Testing** | Vitest | 4.0.18 |
| **Toasts** | Sonner | 2.0.7 |
| **SEO** | react-helmet-async | 2.0.5 |

**Total packages:** 26 dependencies + 14 devDependencies = **40 packages**

---

## Feature Inventory

### Customer-Facing Features

| Feature | Status | Key Files |
|---------|--------|-----------|
| **Multi-Location Dashboard** | Active | 6 role-specific dashboards (Owner, Executive, Compliance, Facilities, Chef, Kitchen Staff) |
| **Food Safety Scoring** | Active | `complianceScoring.ts` — two-pillar system (Food Safety + Facility Safety) |
| **Temperature Monitoring** | Active | Current Readings + Holding tabs, overdue checks, trend charts |
| **Daily Checklists** | Active | Location-filtered, completion tracking, gap detection |
| **Equipment Management** | Active | Service records, warranty tracking, NFPA 96 compliance |
| **Vendor Management** | Active | Portal, COI tracking, marketplace, document exchange |
| **Document Management** | Active | Smart upload, AI classification, expiry alerts |
| **Training & Certs** | Active | LMS hub + employee records, renewal tracking |
| **AI Compliance Advisor** | Active | Claude API integration, streaming, inspection mode |
| **Reports Center** | Active | 12 report types, PDF export, role-based access |
| **Self Audit / Inspection** | Active | Jurisdiction-aware, scoring engine |
| **Incident Playbooks** | Active | Builder, runner, analytics, timeline |
| **Insurance Risk Score** | Active | V2 scoring engine, shareable reports |
| **Compliance Intelligence** | Active | Regulatory monitor, alerts, jurisdiction engine |
| **Calendar** | Active | Equipment service + compliance deadlines |
| **Leaderboard** | Active | Opt-in, anonymous benchmarking |
| **Corrective Actions** | Active | Templates, assignment, tracking |
| **Kitchen Checkup** | Active | Public assessment, PDF report, email notification |
| **Weekly Digest** | Active | Summary emails |
| **Audit Trail** | Active | Full activity logging |

### Admin Console (30 pages)

| Page | Status | Key Capability |
|------|--------|---------------|
| Admin Home | GOOD | Navigation hub with role-based cards |
| Configure (Orgs/Locs/Users/Vendors) | GOOD | Master CRUD with 4 entity tabs, 4 detail drawers |
| Command Center | GOOD | Real-time KPIs, event monitoring |
| EvidLY Intelligence | GOOD | 80+ sources, signal tracking, JIE updates |
| Support Tickets | GOOD | Full conversation drawer with CSAT |
| Staff & Roles | GOOD | Permission management with 3-tab drawer |
| Sales Pipeline | GOOD | Kanban deal management |
| Marketing Campaigns | GOOD | Attribution tracking |
| Guided Tours | PARTIAL | Demo session management |
| Billing | PARTIAL | Subscription + invoice tables |
| RFP Intelligence | GOOD | AI classification, crawl + scoring |
| K2C (Kitchen to Community) | GOOD | Donation tracking |
| User Emulation | PARTIAL | Navigate-to-emulate |
| Crawl Monitor | GOOD | Health + run monitoring |
| Database Backup | GOOD | Config + history |
| Security Settings | GOOD | Config management |
| Event Log | GOOD | Real-time subscription |
| Maintenance Mode | GOOD | Toggle + scheduling |
| System Messages | GOOD | Compose + targeting |
| Document Vault | GOOD | Secure storage |
| Demo Generator | GOOD | Edge function integration |
| Demo Pipeline | PARTIAL | Card-based management |
| Assessment Leads | PARTIAL | Demo fallback |
| User Provisioning | PARTIAL | Alert-based actions |
| Remote Connect | PARTIAL | Session management |
| API Keys | PARTIAL | Expandable cards + logs |
| Edge Functions | GOOD | System monitoring |

**Admin Status: 20 GOOD / 10 PARTIAL / 0 BROKEN**

### Public & Marketing Pages

| Feature | Routes |
|---------|--------|
| Landing Page | `/` |
| County Landing Pages | `/:slug` (62 CA counties) |
| City Landing Pages | `/city/:citySlug` (479 CA cities) |
| Kitchen Checkup | `/assessment`, `/checkup` |
| ScoreTable | `/scoretable/:slug` |
| Blog | `/blog`, `/blog/:slug` (Sanity CMS) |
| Enterprise Landing | `/enterprise` |
| IoT Landing | `/iot` |
| Provider Marketplace | `/providers` |
| Insurance Partner | `/partners/insurance` |
| Leaderboard Preview | `/leaderboard-preview` |
| Auth | Login, Signup, Forgot Password, Invite |

### Enterprise & IoT Modules

| Module | Status | Routes |
|--------|--------|--------|
| Enterprise Admin | Active | `/enterprise/admin` |
| Enterprise Dashboard | Active | `/enterprise/dashboard` |
| Enterprise Intelligence | Active | `/enterprise/intelligence` |
| IoT Sensor Hub | Active | `/iot/hub`, `/sensors`, `/sensors/:id` |
| IoT Platform | Active | `/iot-platform`, `/iot-monitoring` |

---

## Architecture Highlights

### Layout System
- **Shared Layout** at route level via `ProtectedLayout` with `<Outlet>`
- Sidebar + TopBar stay mounted during navigation (no flash)
- `<Suspense>` wraps `<Outlet>` inside layout
- Mobile: bottom tab bar (`MobileTabBar`) at `lg:` breakpoint (1024px)

### Auth & Demo Mode
- Supabase auth with email/password + magic link
- Demo mode: static data from `src/data/demoData.ts`
- 47 pages use `useDemoGuard` hook
- Supabase write proxy (`supabaseGuard.ts`) blocks all writes in demo mode

### Role System (8 roles)
`owner_operator`, `executive`, `compliance_manager`, `facilities_manager`, `kitchen_manager`, `chef`, `kitchen_staff`, `platform_admin`

### Compliance Engine
- Two-pillar scoring: Food Safety + Facility Safety
- Jurisdiction engine with 62 CA county configs
- LA County fully verified (confidence 100/100)
- No default weights — all must be verified per jurisdiction

### Real-Time Features
- Event Log: Supabase real-time subscriptions
- Command Center: Live KPI monitoring
- Intelligence: Signal tracking with publish workflow

### PWA Support
- Service worker with 354 precache entries
- Offline capability via IndexedDB (`idb`)

---

## Recent Activity (Last 20 Commits)

```
92dab6a feat: admin console full audit — drill-down detail drawers
0bfc00a FIX: AI Advisor — remove hardcoded Location 1/2/3 names
f9b2d8e VENDOR-SERVICES: cost per visit, annual contract, frequency
c6b90ef fix: remove all hardcoded fake data from intelligence pages
0c749c2 fix: split Intelligence vs Command Center correctly
fb19168 fix: useEvidlyPermissions grants full access in demo mode
ea506cf Sales/marketing lockout: admin role can no longer see Growth
78872f1 Client Intelligence Feed + Reporting System
8afc6d6 fix: remove all hardcoded fake data from admin ticker
d49a509 feat: EvidLY Intelligence — the moat
df7180c fix: admin page consistency — empty states + AdminBreadcrumb
43e96de Admin Console redesign: ticker bar, User Provisioning
4e34f05 feat: add city-level landing pages for 479 California cities
f3a6fb3 fix: wire Kitchen Self Check + ScoreTable footer links
4e08f58 fix: show Score Simulator on all counties
5c72fd6 feat: build all admin pages — zero Coming Soon stubs
0d7f0a5 feat: guided tour setup + sales pipeline + marketing campaigns
4dfeb62 feat: API Keys (real DB) + Integrations Hub
6209745 feat: domain security, K2C billing, platform metrics
1fd7a02 fix: derive AI suggestion chip location names dynamically
```

---

## Summary

| Metric | Value |
|--------|-------|
| **Source Files** | 604 |
| **Routes** | 187 |
| **Pages** | 170 |
| **Components** | 250 |
| **Edge Functions** | 120 |
| **DB Migrations** | 190 |
| **Packages** | 40 |
| **Commits** | 597 |
| **Build Time** | 52s |
| **Build Status** | PASS (0 TS errors) |
| **Deploy Status** | LIVE (getevidly.com) |
| **Admin Pages** | 30 (20 GOOD, 10 PARTIAL, 0 BROKEN) |
| **PWA Entries** | 354 |

**Overall Status: HEALTHY** — All systems operational, zero TypeScript errors, production build clean, deployed and live.
