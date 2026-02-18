# EvidLY Build Status Report
Generated: 2026-02-16

---

## 1. Environment Summary

| Environment | URL | Database | Status |
|---|---|---|---|
| **Production / Demo** | https://evidly-app.vercel.app | `irxgmhxhmxtzfwuieblc.supabase.co` | Live |
| Test / Staging | None | None | Does not exist |
| Local Dev | `localhost:5173` | Same production Supabase | Works |

**Key Finding:** There is **ONE environment only**. Demo mode and production share the same Supabase project. There is no database isolation between demo users and real users.

- **Supabase Project Ref:** `irxgmhxhmxtzfwuieblc`
- **GitHub Repo:** `getevidly/evidly-app` (main branch)
- **Vercel:** Single production deployment via `npx vercel --prod --yes`
- **Demo Mode:** Controlled by `DemoContext` (sessionStorage), uses static `demoData.ts` — does NOT write to Supabase in practice but has no explicit write-blocking guard

---

## 2. Database Summary

| Category | Count | Notes |
|---|---|---|
| **Migration Files** | 55 | `20260204000000` through `20260307000000` |
| **Core Business Tables** | ~60 | Orgs, locations, profiles, checklists, temps, docs, vendors, equipment |
| **Intelligence/Insights Tables** | ~20 | AI insights, benchmarks, regulatory monitoring |
| **Enterprise/Multi-tenant Tables** | ~10 | White-label tenants, SSO, SCIM, hierarchy |
| **Edge Functions** | 93 | AI, scoring, notifications, IoT, billing, enterprise |
| **RLS Enabled** | All tables | Organization-scoped policies on every table |
| **Database Functions** | 7+ | Token generation, timestamp triggers, scoring |
| **CalCode Mappings** | 45 sections | California Retail Food Code violation mapping |

### Key Tables

| Module | Tables | Purpose |
|---|---|---|
| Core | organizations, locations, user_profiles, user_location_access | Foundation |
| Checklists | checklists, checklist_items, checklist_assignments, checklist_completions, checklist_templates, checklist_template_items, checklist_template_completions, checklist_responses, tasks | Full checklist lifecycle |
| Temperature | temp_logs, temperature_equipment, temp_check_completions, receiving_temp_logs, cooldown_logs, cooldown_temp_checks | Temp monitoring + FDA cooling |
| Documents | documents, compliance_photos | File management + evidence |
| Vendors | vendors, vendor_users, vendor_client_relationships, vendor_upload_requests, vendor_secure_tokens, vendor_contact_log | Full vendor portal |
| Equipment | equipment, equipment_service_records, equipment_maintenance_schedule, equipment_vendor_links | Fire safety equipment lifecycle |
| HACCP | haccp_plans, haccp_critical_control_points, haccp_monitoring_logs, haccp_corrective_actions | CCP tracking |
| Incidents | playbooks (12 tables) | Full playbook system |
| IoT | iot_sensor_providers, iot_sensors, iot_sensor_readings, iot_sensor_alerts, iot_integration_configs, iot_ingestion_log | Sensor platform |
| Jurisdiction | jurisdictions, jurisdiction_scoring_profiles, violation_code_mappings, location_jurisdiction_scores, calcode_violation_map, location_jurisdictions | Dual-authority scoring |
| Insurance | insurance_risk_scores, insurance_api_keys, insurance_api_requests | Carrier risk API |
| AI | ai_insights, ai_corrective_actions, ai_weekly_digests, ai_interaction_logs | AI flywheel |
| Billing | stripe_customers, subscriptions | Stripe integration |
| Enterprise | enterprise_tenants, enterprise_sso_configs, enterprise_scim_tokens, enterprise_hierarchy_nodes, enterprise_user_mappings, enterprise_report_templates, enterprise_audit_log | White-label |
| Regulatory | regulatory_sources, regulatory_changes, regulatory_change_reads | Change monitoring |
| Benchmarks | benchmark_snapshots, benchmark_badges, benchmark_index_reports, location_benchmark_ranks | Industry benchmarks |

---

## 3. Frontend Module Status

### Tech Stack
- React 18.3.1 + React Router v7.13.0 + Vite 5.4.2 + TypeScript + Tailwind
- 98 page files, all lazy-loaded with React.lazy()
- Shared layout (Sidebar + TopBar) at route level via `ProtectedLayout`
- PWA enabled (vite-plugin-pwa 0.21.1)

### Module Inventory

| Module | File | Lines | Functional | Data Source | Routable | Notes |
|---|---|---|---|---|---|---|
| Dashboard (Owner/Op) | `OwnerOperatorDashboard.tsx` | 1247 | Full | Demo + JIE hooks | /dashboard | Jurisdiction-native, dual-authority |
| Dashboard (Executive) | `ExecutiveDashboard.tsx` | 775 | Full | Demo + JIE hooks | /dashboard | KPIs, trend, location status |
| Dashboard (Facilities) | `FacilitiesDashboardNew.tsx` | 348 | Full | Demo + JIE overrides | /dashboard | Fire-focused, equipment alerts |
| Dashboard (Kitchen Mgr) | `KitchenManagerDashboard.tsx` | 369 | Full | Demo + JIE overrides | /dashboard | Checklists, temps, team |
| Dashboard (Kitchen Staff) | `KitchenStaffTaskList.tsx` | 332 | Full | Demo | /dashboard | Pure task list |
| Checklists | `Checklists.tsx` | 1896 | Full | Supabase + demo fallback | /checklists | Templates + execution + CRUD |
| Temperatures | `TempLogs.tsx` | 3326 | Full | Supabase + demo | /temp-logs | IoT + manual + receiving + cooldown |
| Training | `TrainingHub.tsx` | 1441 | Full | Demo data | /training | Course catalog + tracking |
| Equipment | `Equipment.tsx` | 1773 | Full | Demo data | /equipment | Full inventory + maintenance |
| Documents | `Documents.tsx` | 767 | Full | Supabase + demo | /documents | Upload, categorize, track expiry |
| HACCP | `HACCP.tsx` | 1985 | Full | Demo data | /haccp | CCP tracking + monitoring |
| Incidents | `IncidentLog.tsx` | 1697 | Full | Demo data | /incidents | Tracker + history |
| Incident Playbooks | `PlaybookRunner.tsx` | 1204 | Full | Demo data | /playbooks | Step-by-step execution |
| Vendors | `Vendors.tsx` | 1443 | Full | Supabase + demo | /vendors | COI tracking + portal |
| Fire Safety | `FireSafety.tsx` | 578 | Full | Demo + jurisdiction | /fire-safety | Authority mapping + status |
| Compliance Score | `ScoringBreakdown.tsx` | 493 | Full | Demo data | /scoring-breakdown | Score explanation |
| Self-Inspection | `SelfAudit.tsx` | 1127 | Full | Demo data | /self-inspection | Audit builder |
| Inspector View | `InspectorView.tsx` | 734 | Full | Demo data | /inspector-view | On-site inspection mode |
| AI Copilot | `AIAdvisor.tsx` | 986 | Full | Edge Function + demo fallback | /copilot | Chat + recommendations |
| Reporting | `Reports.tsx` | 1201 | Full | Demo data | /reports | Multi-format report generation |
| Calendar | `Calendar.tsx` | 1330 | Full | Demo data | /calendar | Events + scheduling |
| Photos | `PhotoEvidencePage.tsx` | 842 | Full | Demo data | /photo-evidence | Timestamped, geotagged photos |
| Locations | `OrgHierarchy.tsx` | 480 | Full | Demo data | /org-hierarchy | Org chart viewer |
| Benchmarks | `Benchmarks.tsx` | 834 | Full | Demo data | /benchmarks | Industry comparison |
| Risk Score | `InsuranceRisk.tsx` | 1175 | Full | Demo data | /insurance-risk | Carrier risk scoring |
| Leaderboard | `Leaderboard.tsx` | 274 | Full | Demo data | /leaderboard | Location rankings |
| Marketplace | `VendorMarketplace.tsx` | 578 | Full | Demo data | /marketplace | Vendor listings |
| Settings | `Settings.tsx` | 1629 | Full | Supabase + demo | /settings | Billing, team, integrations |
| Team | `Team.tsx` | 1073 | Full | Demo data | /team | Members + invitations |
| IoT Monitoring | `IoTMonitoring.tsx` | 646 | Full | Demo data | /iot-monitoring | Sensor dashboard |
| IoT Sensor Hub | `IoTSensorHub.tsx` | 1788 | Full | Demo data | /iot/hub | Sensor management |
| Regulatory Alerts | `RegulatoryAlerts.tsx` | 484 | Full | Demo data | /regulatory-alerts | Code change tracking |
| Alerts / Analysis | `Analysis.tsx` | 1042 | Full | Demo data | /analysis | Compliance analysis |
| Admin Onboarding | `AdminClientOnboarding.tsx` | 290 | Full | Demo data | /admin/onboard-client | Client setup |
| Usage Analytics | `UsageAnalytics.tsx` | 1028 | Full | Demo data | /admin/usage-analytics | Platform metrics |
| Help & Support | `HelpSupport.tsx` | 489 | Full | Static | /help | Help center |
| Vendor Dashboard | `VendorDashboard.tsx` | 844 | Full | Supabase + demo | /vendor/dashboard | Vendor analytics |
| Enterprise Dashboard | `EnterpriseDashboard.tsx` | 2112 | Full | Demo data | /enterprise/admin | Enterprise console |
| Compliance Intelligence | `ComplianceIntelligence.tsx` | 1833 | Full | Demo data | /enterprise/intelligence | Intel dashboard |
| Jurisdiction Settings | `JurisdictionSettings.tsx` | 1509 | Full | Demo data | /settings/jurisdiction | Scoring weights |

### Data Source Summary

| Source | Page Count | Notes |
|---|---|---|
| **Demo data only** | ~70 pages | Static imports from demoData.ts, demoJurisdictions.ts |
| **Supabase + demo fallback** | ~15 pages | Checklists, TempLogs, Documents, Vendors, Settings, VendorDashboard |
| **Edge Functions (AI)** | ~5 pages | AI Copilot, AI Advisor (requires ANTHROPIC_API_KEY) |
| **Static content** | ~8 pages | Legal pages, Help, Landings |

---

## 4. RBAC Status

| Feature | Status | Notes |
|---|---|---|
| **Role definitions** | 5 roles working | executive, management, kitchen_manager, kitchen, facilities |
| **Role storage** | localStorage | Key: `evidly-demo-role`, default: `management` |
| **Sidebar filtering** | Working | `getNavItemsForRole()` filters 30+ nav items per role |
| **Dashboard routing** | Working | `Dashboard.tsx` switch statement routes to 5 components |
| **Location access** | Working | Per-role location assignments in RoleContext |
| **Team management gate** | Working | `canManageTeam()` = executive + management only |
| **Billing access gate** | Working | `canAccessBilling()` = executive only |
| **Role switcher in UI** | Working | TopBar dropdown for demo role switching |
| **Collapsible sidebar sections** | Working | 5 sections, empty sections auto-hidden per role |
| **Location dots (sidebar)** | Working | Jurisdiction status colors, no numeric badges |

### Role → Location Access

| Role | Locations | Dashboard Component |
|---|---|---|
| executive | All 3 | ExecutiveDashboard |
| management | Downtown + Airport | OwnerOperatorDashboard |
| kitchen_manager | Downtown + Airport | KitchenManagerDashboard |
| kitchen | Downtown only | KitchenStaffTaskList |
| facilities | All 3 | FacilitiesDashboardNew |

---

## 5. Integration Status

| Service | Frontend Code | Edge Functions | Env Var | Status |
|---|---|---|---|---|
| **Supabase Auth** | `src/lib/supabase.ts` | N/A | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | Connected, working |
| **Stripe** | `src/lib/stripe.ts` | `stripe-create-checkout`, `stripe-customer-portal`, `stripe-webhook` | `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` | Integrated, 3 plans defined |
| **Resend (Email)** | N/A (backend only) | `auto-request-documents`, `ai-weekly-digest`, `send-team-invite` | `RESEND_API_KEY` | Integrated in Edge Functions |
| **Twilio (SMS)** | N/A (backend only) | `auto-request-documents` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Integrated, conditional send |
| **Claude API (AI)** | `src/lib/aiAdvisor.ts` | `ai-chat`, `ai-corrective-action-draft`, `ai-document-analysis`, `ai-weekly-digest`, `ai-pattern-analysis`, `ai-predictive-alerts` | `ANTHROPIC_API_KEY` | Integrated, demo fallback exists |
| **reCAPTCHA** | `Login.tsx`, `VendorLogin.tsx` | N/A | `VITE_RECAPTCHA_SITE_KEY` | Connected |
| **PWA / Service Worker** | `vite.config.ts` (vite-plugin-pwa) | N/A | N/A | Working, 206 precache entries |

### Edge Function Count by Category

| Category | Count |
|---|---|
| AI & Insights | 6 |
| Scoring & Benchmarks | 6 |
| Insurance | 5 |
| IoT Sensors | 9 |
| Notifications & Reminders | 6 |
| Document & Vendor | 10 |
| Equipment | 2 |
| Enterprise | 7 |
| Billing (Stripe) | 3 |
| Training | 11 |
| Playbooks | 6 |
| Integrations | 5 |
| Offline Sync | 5 |
| Regulatory | 2 |
| API Platform | 8 |
| Copilot | 1 |
| Landing/Chat | 1 |
| **TOTAL** | **93** |

---

## 6. Known Bugs & Issues

| Bug | Severity | Location | Notes |
|---|---|---|---|
| Demo mode has no explicit write guard | Medium | `DemoContext.tsx` | Demo bypasses auth but doesn't block Supabase writes. In practice, demo uses static data so no writes occur. But a crafty user could theoretically write to production DB. |
| Notifications are session-only | Low | `NotificationContext.tsx` | Uses sessionStorage, lost on page close. No persistent backend sync. |
| Predictive alert generator is stubbed | Low | `src/api/generate-alerts.ts` | Full of TODO comments, all Supabase queries are placeholders. Not deployed. |
| Large bundle chunk warning | Low | Vite build output | `index-*.js` is 1083 KB. Recommend manual chunks for recharts, jspdf. |
| Legacy dashboard still imported | Low | `Dashboard.tsx:60` | `OperatorDashboard` imported but never rendered in role switch. Dead import. |
| `DEMO_ATTENTION_ITEMS` import unused | Trivial | `demoData.ts` | Referenced in some files but the actual component was removed during JIE-7. |
| Jurisdiction TODO comments | Info | `demoJurisdictions.ts`, `jurisdiction.ts` | ~15 TODO items for verifying real health department data. Expected for demo stage. |

---

## 7. Build Health

| Check | Result |
|---|---|
| `npx tsc --noEmit --skipLibCheck` | **PASS** — zero errors |
| `npx vite build` | **PASS** — built in ~32s, 206 precache entries |
| Bundle size warning | 1 chunk >500KB (`index-*.js` at 1083KB) — cosmetic only |
| PWA generation | Working — `sw.js` + `workbox-*.js` generated |
| Latest commit | `2fe1f16 feat(JIE-7): jurisdiction-native scores + RBAC for 5 roles` |
| Branch | `main` — single branch workflow |
| Remote | `origin: https://github.com/getevidly/evidly-app.git` |

---

## 8. Environment Isolation Plan

### Current State

- **1 environment** — everything (demo, dev, production) hits the same Supabase project
- **No database isolation** — demo mode uses static imports (safe in practice) but has no write guard
- **Risk:** If a real customer signs up and creates data, it lives alongside the demo project. No way to reset demo without affecting production.

### Recommended 3-Environment Setup

#### DEMO (what prospects see)
- **URL:** `demo.evidly.com` or current `evidly-app.vercel.app`
- **Database:** Read-only demo data, local state only, never writes to Supabase
- **Purpose:** Sales demos, self-serve exploration
- **Data:** Curated Pacific Coast Dining demo org (already exists in `demoData.ts`)
- **Action Items:**
  1. Add explicit write guard in DemoContext: `if (isDemoMode) return` before any Supabase insert/update
  2. Or: create a separate "demo" Supabase project with read-only policies

#### TEST / STAGING (what Arthur validates before prod)
- **URL:** Vercel preview deploys (`evidly-app-xxxxx.vercel.app`)
- **Database:** Clone of prod Supabase project (separate project, same schema)
- **Purpose:** Validate new features, QA, load testing
- **Data:** Copy of production schema + anonymized seed data (refreshed on-demand)
- **Action Items:**
  1. Create Supabase project `evidly-test`
  2. Dump production schema: `supabase db dump -f schema.sql --project-ref irxgmhxhmxtzfwuieblc`
  3. Apply to test: `psql -h <test-host> -U postgres -f schema.sql`
  4. Set Vercel preview env vars to point to test project:
     ```
     VITE_SUPABASE_URL=https://<test-ref>.supabase.co
     VITE_SUPABASE_ANON_KEY=<test-anon-key>
     ```
  5. All Vercel preview deploys automatically use test database

#### PRODUCTION (what paying customers use)
- **URL:** `app.evidly.com` (custom domain) or `evidly-app.vercel.app`
- **Database:** Current production Supabase project (`irxgmhxhmxtzfwuieblc`)
- **Purpose:** Live customer data
- **Deployment:** `vercel --prod` ONLY after Arthur validates on staging
- **Action Items:**
  1. Set up Vercel production env vars (already done)
  2. Add custom domain when ready
  3. Enable Supabase Point-in-Time Recovery (PITR) for backups

### Database Copy Script

```bash
#!/bin/bash
# Copy production schema to test environment
# Run from project root with Supabase CLI installed

PROD_REF="irxgmhxhmxtzfwuieblc"
TEST_REF="<your-test-project-ref>"

# 1. Dump production schema (no data)
supabase db dump -f prod_schema.sql --project-ref $PROD_REF

# 2. Dump seed data (optional — exclude PII tables)
supabase db dump -f prod_seed.sql --project-ref $PROD_REF \
  --data-only \
  --schema public \
  --exclude-table user_profiles \
  --exclude-table stripe_customers \
  --exclude-table subscriptions \
  --exclude-table user_invitations

# 3. Apply schema to test project
supabase db push --project-ref $TEST_REF

# 4. Apply seed data to test project
psql "postgresql://postgres:<test-password>@db.<test-ref>.supabase.co:5432/postgres" \
  -f prod_seed.sql

echo "Test environment refreshed from production."
```

---

## 9. Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                      │
│  React 18 + Router v7 + Vite + TypeScript + Tailwind     │
│  98 lazy-loaded pages, PWA enabled                       │
│  5 role-based dashboard views                            │
│  Demo mode via DemoContext (sessionStorage)               │
├─────────────────────────────────────────────────────────┤
│                 SUPABASE (Backend)                        │
│  Auth: Email/password + social login + reCAPTCHA          │
│  Database: ~90 tables, RLS on all, org-scoped             │
│  Edge Functions: 93 Deno functions                        │
│  Storage: Document uploads, compliance photos             │
│  Realtime: Not actively used yet                          │
├─────────────────────────────────────────────────────────┤
│              EXTERNAL INTEGRATIONS                        │
│  Stripe: Billing (3 plans, checkout, portal)              │
│  Resend: Email notifications                              │
│  Twilio: SMS notifications                                │
│  Anthropic: AI Copilot (Claude API)                       │
│  Google: reCAPTCHA v2                                     │
└─────────────────────────────────────────────────────────┘
```

### Code Metrics

| Metric | Value |
|---|---|
| Page files | 98 |
| Dashboard components | 10 (5 active + 5 legacy/helper) |
| Edge Functions | 93 |
| Migration files | 55 |
| Total src/ lines (approx) | ~80,000+ |
| Largest file | `TempLogs.tsx` (3,326 lines) |
| Lazy-loaded routes | ~110 |
| npm dependencies | ~50 production |

---

*Report generated by codebase diagnostic scan. All data sourced from actual file reads, not chat history.*
