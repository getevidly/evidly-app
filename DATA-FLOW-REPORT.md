# EvidLY — Data Flow & Architecture Report

> **Purpose:** Feed this document into Claude Chat and ask it to generate Mermaid diagrams, flowcharts, system architecture diagrams, and dependency maps. Each section includes the raw data needed to create accurate visuals.

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

**Generate a system architecture diagram showing these components and their connections:**

```
FRONTEND (React 18.3 + TypeScript + Vite + Tailwind)
  ├── Hosted on: Vercel (app.getevidly.com)
  ├── Auth: Supabase Auth (JWT tokens, OAuth, MFA)
  ├── Data: Supabase Client (PostgREST API)
  ├── Realtime: Supabase Realtime (WebSockets)
  ├── Storage: Supabase Storage (5 buckets)
  └── Edge: Supabase Edge Functions (171 Deno functions)

BACKEND (Supabase — managed Postgres + Auth + Realtime + Storage + Edge)
  ├── Database: PostgreSQL 15 with Row Level Security
  │   ├── 400+ tables
  │   ├── 30+ RPC functions
  │   ├── 150+ migrations
  │   └── Multi-tenant via organization_id + RLS
  ├── Auth: GoTrue (email/password, OAuth, MFA/TOTP)
  ├── Realtime: 15+ active channels
  ├── Storage: 5 buckets (documents, vault, uploads, compliance-photos, reports)
  └── Edge Functions: 171 Deno functions

EXTERNAL SERVICES
  ├── Stripe (billing, subscriptions, webhooks)
  ├── Resend (transactional email)
  ├── Anthropic Claude (AI chat, photo analysis, text assist)
  ├── Crisp (live chat widget)
  ├── Google Analytics GA4 (tracking)
  ├── Google reCAPTCHA v2 (bot protection)
  ├── Nominatim / OpenStreetMap (geocoding)
  ├── Calendly (demo booking)
  ├── Twilio (SMS notifications)
  └── EvidLY Intelligence (separate Supabase project — regulatory crawling)
```

---

## 2. CONTEXT PROVIDER TREE (State Management)

**Generate a hierarchical diagram showing the React Context provider nesting order. This is the exact nesting from App.tsx:**

```
<ErrorBoundary>
  └── <BrandingProvider>          ← White-label config (colors, brand name, SSO)
      └── <Router>
          └── <AuthProvider>      ← User session, profile, org, signIn/signUp/signOut
              └── <DemoProvider>  ← Demo mode, presenter mode, demo expiration
                  └── <LanguageProvider>     ← i18n (en, es, fr, zh), t() translation
                      └── <RoleProvider>     ← User role (8 roles), role preview
                          └── <EmulationProvider>   ← Admin user emulation, audit logging
                              └── <OperatingHoursProvider>  ← Location hours, shifts
                                  └── <OfflineProvider>     ← Online/offline, sync queue
                                      └── <InactivityProvider>  ← Idle lock (30min), logout (3hr)
                                          └── <NotificationProvider>  ← Unified notifications, realtime
                                              └── <AppRoutes>
```

**Each context manages:**

| Context | State Managed | Supabase Tables | External APIs |
|---------|--------------|-----------------|---------------|
| BrandingProvider | colors, brandName, SSO config, features | None (localStorage) | None |
| AuthProvider | user, profile, session, orgOverride | user_profiles, organizations, user_location_access | Intelligence bridge |
| DemoProvider | isDemoMode, isAuthenticatedDemo, demoExpiresAt, presenterMode | organizations (is_demo, demo_expires_at) | None |
| LanguageProvider | locale, t() function | None (localStorage + i18n bundle) | None |
| RoleProvider | userRole (8 values), isPreviewMode, locationAssignments | None (reads from AuthContext profile) | None |
| EmulationProvider | isEmulating, emulatedUser, emulatedOrgId | emulation_audit_log (write) | None |
| OperatingHoursProvider | locationHours, shifts | None (hardcoded in demo) | None |
| OfflineProvider | isOnline, syncStatus, pendingCount, deviceId | None (IndexedDB via offlineDb) | None |
| InactivityProvider | isLocked | None | None |
| NotificationProvider | notifications[], unreadCount, unifiedNotifications[] | notifications (read/write via realtime) | None |

---

## 3. AUTHENTICATION FLOW

**Generate a flowchart for the complete authentication lifecycle:**

```
START
  │
  ├── [Email/Password Login]
  │   ├── supabase.auth.signInWithPassword()
  │   ├── IF error → Show error, reset CAPTCHA
  │   ├── IF success → Check MFA factors
  │   │   ├── IF MFA enrolled → Redirect /mfa-challenge
  │   │   │   ├── User enters 6-digit TOTP code
  │   │   │   ├── supabase.auth.mfa.challenge() + verify()
  │   │   │   ├── IF valid → Route by user_type
  │   │   │   └── IF invalid → Show error, retry
  │   │   └── IF no MFA → Route by user_type
  │   └── Route by user_type:
  │       ├── vendor → /vendor/dashboard
  │       ├── @getevidly.com OR platform_admin → /admin
  │       └── default → /dashboard
  │
  ├── [Social OAuth Login (Google/Microsoft)]
  │   ├── supabase.auth.signInWithOAuth()
  │   ├── Redirect to provider consent screen
  │   ├── Callback to /auth/callback
  │   ├── IF new user:
  │   │   ├── Create organization "{Name}'s Organization"
  │   │   ├── Create user_profile (role: admin)
  │   │   ├── Create user_location_access
  │   │   └── Route to /dashboard
  │   └── IF existing user:
  │       ├── Update last_login_at
  │       └── Route by user_type (same as above)
  │
  ├── [Signup]
  │   ├── Collect: name, email, phone, org, state, county, kitchen type, SB1383
  │   ├── supabase.auth.signUp()
  │   ├── INSERT organizations row
  │   ├── INSERT user_profiles row (role: admin)
  │   ├── INSERT user_location_access row
  │   ├── Send email confirmation
  │   └── Show "Check your email" screen
  │       ├── User clicks email link → /email-confirmed
  │       └── User logs in → /login flow above
  │
  ├── [Team Invite]
  │   ├── Admin sends invite → INSERT user_invitations
  │   ├── User receives email → /invite/:token
  │   ├── Fill: name, password (email pre-filled)
  │   ├── Create auth user + user_profile + location_access
  │   ├── Mark invitation as accepted
  │   └── Redirect to /dashboard
  │
  ├── [Password Reset]
  │   ├── /forgot-password → enter email
  │   ├── supabase.auth.resetPasswordForEmail()
  │   ├── User clicks email link → /reset-password
  │   ├── onAuthStateChange('PASSWORD_RECOVERY')
  │   ├── Enter new password (12-char requirements)
  │   ├── supabase.auth.updateUser({ password })
  │   ├── Sign out recovery session
  │   └── Redirect to /login after 3s
  │
  ├── [MFA Enrollment (forced)]
  │   ├── TRIGGER: Role requires MFA + not enrolled + grace period expired
  │   ├── Forced redirect to /setup-mfa
  │   ├── supabase.auth.mfa.enroll() → QR code
  │   ├── User scans with authenticator app
  │   ├── Enter verification code
  │   ├── UPDATE user_mfa_config (mfa_enabled: true)
  │   └── Redirect to /dashboard
  │
  ├── [Session Management]
  │   ├── autoRefreshToken: true (Supabase auto)
  │   ├── onAuthStateChange() listener active
  │   ├── Inactivity lock at 30 min (warning at 25 min)
  │   ├── Forced logout at 3 hours
  │   └── Suspension check: if profile.is_suspended → sign out → /suspended
  │
  └── [Demo Mode]
      ├── /demo → DemoWizard → instant redirect to /dashboard
      ├── Sets sessionStorage 'evidly_demo_mode'
      ├── Demo guard blocks ALL writes
      ├── Sample data served from hardcoded payloads
      └── No auth required
```

---

## 4. DATA READ FLOW (Supabase → UI)

**Generate a data flow diagram showing how data moves from database to screen:**

```
┌─────────────────────────────────┐
│         SUPABASE POSTGRES       │
│  (400+ tables, RLS enforced)    │
└────────────┬────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌──────────┐   ┌──────────────┐
│ PostgREST│   │   Realtime   │
│   API    │   │  (WebSocket) │
└────┬─────┘   └──────┬───────┘
     │                │
     ▼                ▼
┌────────────────────────────┐
│    SUPABASE JS CLIENT      │
│  (with Demo Guard Proxy)   │
│                            │
│  Demo modes:               │
│  - live → pass through     │
│  - anonymous_demo → block  │
│  - authenticated_demo →    │
│    selective block          │
│  - emulation → block all   │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│      CUSTOM HOOKS          │
│                            │
│  useDashboardData()        │
│  useRealtimeNotifications()│
│  useIntelligenceFeed()     │
│  useTaskInstances()        │
│  useServiceRequests()      │
│  useVendorSubmissions()    │
│  useSubscription()         │
│  useSignalNotifications()  │
│  useActiveBanner()         │
│  useEdgeFunctions()        │
│  usePermission()           │
│  useUnreadSignals()        │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│    CONTEXT PROVIDERS       │
│                            │
│  AuthContext (profile, org) │
│  NotificationContext       │
│  DemoContext               │
│  RoleContext               │
│  EmulationContext          │
│  OfflineContext            │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│     REACT COMPONENTS       │
│                            │
│  Dashboard → role-specific │
│  Pages → data tables/cards │
│  Modals → forms/detail     │
│  Charts → visualizations   │
└────────────────────────────┘
```

---

## 5. DATA WRITE FLOW (UI → Supabase)

**Generate a flowchart for the write path:**

```
User Action (button click, form submit)
     │
     ▼
Component Event Handler
     │
     ▼
┌───────────────────────────┐
│   DEMO GUARD PROXY CHECK  │
│                           │
│ IF live mode:             │
│   → Pass through          │
│                           │
│ IF anonymous_demo:        │
│   → Block (return fake    │
│     success, log warning) │
│   EXCEPT: demo_leads,     │
│   assessment_leads,       │
│   assessment_responses    │
│                           │
│ IF authenticated_demo:    │
│   → Allow profile tables  │
│   → Block operational     │
│                           │
│ IF emulation:             │
│   → Block ALL writes      │
│   → Show toast warning    │
└───────────┬───────────────┘
            │ (if allowed)
            ▼
┌───────────────────────────┐
│   SUPABASE CLIENT         │
│   .from('table')          │
│   .insert() / .update()   │
│   .upsert() / .delete()   │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│   ROW LEVEL SECURITY      │
│                           │
│ Check: auth.uid() matches │
│ organization_id via       │
│ user_location_access      │
│                           │
│ IF allowed → Write        │
│ IF denied → 403 error     │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│   POSTGRES TRIGGERS       │
│                           │
│ - set_updated_at()        │
│ - notify_on_signal_publish│
│ - log_haccp_from_checklist│
│ - expire_demo_accounts    │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│   REALTIME BROADCAST      │
│                           │
│ postgres_changes event    │
│ sent to subscribed clients│
└───────────┬───────────────┘
            │
            ▼
   Other clients' UIs update
```

---

## 6. EDGE FUNCTION ARCHITECTURE

**Generate a categorized diagram of all 171 edge functions grouped by domain:**

### AI & Copilot (15 functions)
```
ai-chat                    → Anthropic Claude API → ai_interaction_logs
ai-corrective-action-draft → Anthropic Claude → Draft corrective actions
ai-document-analysis       → Anthropic Claude → Document classification
ai-estimate-submit         → Anthropic Claude → Cost estimates
ai-flag-suggest            → Anthropic Claude → Flag suggestions
ai-pattern-analysis        → Anthropic Claude → Pattern detection
ai-photo-analysis          → Anthropic Claude Vision → Photo evidence analysis
ai-predictive-alerts       → Rules engine → predictive_alerts
ai-text-assist             → Anthropic Claude → Text generation
ai-voice-transcription     → Whisper/Deepgram → Text transcription
ai-weekly-digest           → Anthropic Claude → ai_weekly_digests
copilot-analyze            → Anthropic Claude → Copilot insights
training-ai-companion      → Anthropic Claude → Training assistant
training-ai-quiz-gen       → Anthropic Claude → Quiz generation
playbook-ai-assistant      → Anthropic Claude → Playbook guidance
```

### Intelligence & Signals (10 functions)
```
intelligence-collect       → Crawls regulatory sources → intelligence_signals
intelligence-deliver       → Pushes insights to orgs → client_intelligence_feed
intelligence-approve       → Admin approves signal → intelligence_signals
intelligence-auto-publish  → Auto-publish signals → intelligence_auto_publish_log
intelligence-bridge-proxy  → Bridge to Intelligence project
intelligence-feed          → Fetches org feed → client_intelligence_feed
intelligence-webhook       → Receives external webhooks
classify-signals           → Anthropic Claude → Signal classification
canonical-correlate        → Correlates signals → intelligence_correlations
correlation-engine         → Advanced correlation analysis
```

### Compliance & Scoring (10 functions)
```
calculate-compliance-score → Scores org compliance → compliance_score_snapshots
generate-alerts            → Daily cron → predictive_alerts, notifications
check-expiries             → Document expiry check → document_alerts
check-equipment-alerts     → Equipment maintenance check → alerts
check-onboarding-progress  → Onboarding status → onboarding_checklist_items
benchmark-aggregate        → Aggregate benchmarks → benchmark_aggregates
benchmark-badge-check      → Check badge eligibility → benchmark_badges
benchmark-quarterly-report → Generate quarterly report
benchmark-snapshot         → Snapshot benchmark data → benchmark_snapshots
snapshot-readiness         → Readiness snapshot → readiness_snapshots
```

### Vendor & Marketplace (12 functions)
```
vendor-analytics-snapshot   → Vendor performance → vendor_analytics
vendor-certification-evaluate → Cert verification → vendor_certification_status
vendor-connect-apply        → Vendor application → vendor_connect_applications
vendor-contact              → Contact vendor → vendor_contact_log
vendor-credential-check     → Credential verification → marketplace_credentials
vendor-partner-outreach     → Outreach campaigns → vendor_outreach_pipeline
vendor-recommendation-engine → AI recommendations
vendor-schedule-response    → Schedule management
vendor-secure-upload        → Tokenized upload → vendor_document_submissions
vendor-service-token        → Generate secure tokens → vendor_secure_tokens
evidly-service-request      → Create service request → service_requests
process-service-request     → Process request → service_requests
```

### IoT & Sensors (9 functions)
```
iot-process-reading         → Process sensor data → iot_sensor_readings
iot-sensor-alerts           → Alert on threshold breach → iot_sensor_alerts
iot-sensor-pull             → Pull from provider API → iot_sensor_readings
iot-sensor-webhook          → Receive webhook data → iot_sensor_readings
sensor-alert-escalate       → Escalate alerts → notifications
sensor-compliance-aggregate → Aggregate compliance → sensor compliance data
sensor-defrost-detect       → Detect defrost cycles → sensor_defrost_schedules
sensor-device-health        → Monitor device health → iot_sensors
sensor-threshold-evaluate   → Evaluate thresholds → iot_sensor_alerts
```

### Payments (3 functions)
```
stripe-create-checkout     → Create Stripe checkout session
stripe-customer-portal     → Redirect to Stripe portal
stripe-webhook             → Process Stripe events → subscriptions, notifications
```

### Notifications (12 functions)
```
send-reminders             → General reminders → notifications
send-team-invite           → Team invitations → user_invitations
send-sms-invite            → SMS via Twilio
send-welcome-email         → Welcome email via Resend
task-notifications         → Task alerts → notifications
vendor-document-reminders  → Document reminders → notifications
vendor-document-notify     → Document notifications
vendor-lead-notify         → Lead notifications
training-progress-reminder → Training reminders
availability-reminders     → Availability alerts
process-service-reminders  → Service reminders
client-invite-send         → Client invitations
```

### Enterprise (7 functions)
```
enterprise-alert-rollup      → Roll up alerts across tenants
enterprise-audit-export      → Export audit logs
enterprise-report-generate   → Generate enterprise reports
enterprise-rollup-calculate  → Calculate rollup scores
enterprise-scim-users        → SCIM user provisioning
enterprise-sso-callback      → SSO callback handler
enterprise-tenant-provision  → Provision new enterprise tenant
```

### Reports & PDFs (8 functions)
```
generate-agreement-pdf         → PDF generation
generate-certificate           → Certificate PDF
generate-compliance-package    → Compliance package PDF
generate-haccp-from-checklists → HACCP plan from checklists
generate-job-report            → Job report PDF
generate-kec-report            → KEC report
generate-outreach              → Outreach materials
generate-service-report        → Service report PDF
```

---

## 7. DATABASE TABLE RELATIONSHIPS

**Generate an ER diagram for the core tables:**

### Core Entity Relationships
```
organizations (1) ──── (N) locations
organizations (1) ──── (N) user_profiles
organizations (1) ──── (N) vendors
organizations (1) ──── (N) equipment
organizations (1) ──── (N) documents

user_profiles (N) ──── (N) locations  [via user_location_access]
user_profiles (1) ──── (1) user_mfa_config
user_profiles (1) ──── (N) notifications

locations (1) ──── (N) temperature_logs
locations (1) ──── (N) checklist_completions
locations (1) ──── (N) incidents
locations (1) ──── (N) corrective_actions
locations (1) ──── (N) iot_sensors
locations (N) ──── (N) jurisdictions  [via location_jurisdictions]

jurisdictions (1) ──── (N) external_inspections
jurisdictions (1) ──── (1) jurisdiction_scoring_profiles

vendors (1) ──── (N) vendor_service_records
vendors (1) ──── (N) vendor_documents
vendors (1) ──── (N) vendor_document_submissions
vendors (N) ──── (N) organizations  [via vendor_client_relationships]

equipment (1) ──── (N) equipment_service_records
equipment (1) ──── (N) equipment_qr_codes
equipment (1) ──── (N) temperature_logs

iot_sensors (1) ──── (N) iot_sensor_readings
iot_sensors (1) ──── (N) iot_sensor_alerts

intelligence_signals (1) ──── (N) client_intelligence_feed
intelligence_signals (1) ──── (N) intelligence_insights

checklist_templates (1) ──── (N) checklist_template_items
checklist_templates (1) ──── (N) checklist_template_completions

haccp_plans (1) ──── (N) haccp_critical_control_points
haccp_critical_control_points (1) ──── (N) haccp_monitoring_logs

training_courses (1) ──── (N) training_modules
training_modules (1) ──── (N) training_lessons
training_courses (1) ──── (N) training_enrollments
training_enrollments (1) ──── (N) training_progress

playbook_templates (1) ──── (N) playbook_activations
playbook_activations (1) ──── (N) playbook_steps
playbook_steps (1) ──── (N) playbook_step_responses
```

### Multi-Tenancy Isolation Model
```
auth.uid()
  │
  ▼
user_profiles (user_id = auth.uid())
  │
  ├── organization_id ← PRIMARY TENANT KEY
  │
  ▼
user_location_access (user_id, organization_id, location_id)
  │
  ▼
ALL other tables filtered by:
  WHERE organization_id IN (
    SELECT organization_id
    FROM user_location_access
    WHERE user_id = auth.uid()
  )
```

---

## 8. REALTIME SUBSCRIPTION MAP

**Generate a diagram showing all 15+ realtime channels:**

```
SUPABASE REALTIME ENGINE
  │
  ├── notifications:{orgId}
  │   ├── Event: INSERT on notifications
  │   ├── Consumer: useRealtimeNotifications → NotificationContext
  │   └── UI: NotificationCenter bell badge, dropdown
  │
  ├── notif-unified:{orgId}
  │   ├── Event: INSERT/UPDATE on notifications
  │   ├── Consumer: useNotificationData
  │   └── UI: Unified notification panel
  │
  ├── intelligence-feed:{orgId}
  │   ├── Event: INSERT on client_intelligence_feed
  │   ├── Consumer: useIntelligenceFeed
  │   └── UI: Intelligence Hub, Dashboard widget
  │
  ├── unread-signals:{orgId}
  │   ├── Event: INSERT on client_intelligence_feed
  │   ├── Consumer: useUnreadSignals
  │   └── UI: Sidebar badge count
  │
  ├── signal-notifications:{orgId}
  │   ├── Event: INSERT on intelligence_signals
  │   ├── Consumer: useSignalNotifications
  │   └── UI: SignalAlertBanner, Dashboard
  │
  ├── task_instances_{orgId}
  │   ├── Event: UPDATE on task_instances
  │   ├── Consumer: useTaskInstances
  │   └── UI: Task lists, checklists
  │
  ├── service-requests-realtime:{orgId}
  │   ├── Event: UPDATE on service_requests
  │   ├── Consumer: useServiceRequests
  │   └── UI: Service request status
  │
  ├── reschedule-requests-realtime:{orgId}
  │   ├── Event: UPDATE on service_reschedule_requests
  │   ├── Consumer: useRescheduleRequests
  │   └── UI: Reschedule notifications
  │
  ├── vendor_doc_submissions_realtime:{orgId}
  │   ├── Event: INSERT/UPDATE on vendor_document_submissions
  │   ├── Consumer: useVendorSubmissions
  │   └── UI: Vendor document review
  │
  ├── iot-sensors-realtime:{orgId}
  │   ├── Event: INSERT/UPDATE on iot_sensors, iot_sensor_readings
  │   ├── Consumer: SensorHub page
  │   └── UI: Sensor dashboard, live readings
  │
  ├── active-banner:{orgId}
  │   ├── Event: INSERT on intelligence_signals (critical)
  │   ├── Consumer: useActiveBanner
  │   └── UI: Dashboard alert banner
  │
  ├── admin-events (platform_admin only)
  │   ├── Event: INSERT on admin_event_log
  │   ├── Consumer: AdminDashboard
  │   └── UI: Live event feed
  │
  ├── event-log-realtime (platform_admin only)
  │   ├── Event: INSERT on admin_event_log
  │   ├── Consumer: EventLog page
  │   └── UI: Event log table
  │
  └── edge-fn-invocations (platform_admin only)
      ├── Event: INSERT on edge function logs
      ├── Consumer: EdgeFunctions page
      └── UI: Edge function health dashboard
```

---

## 9. EXTERNAL SERVICE INTEGRATION MAP

**Generate a diagram showing all external service connections:**

```
┌─────────────────────────────────────────────────┐
│                  EvidLY APP                       │
└───────────────────┬─────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│  CLIENT  │  │   EDGE   │  │  SEPARATE    │
│  (React) │  │ FUNCTIONS│  │  PROJECT     │
└────┬─────┘  └────┬─────┘  │ (Intelligence)│
     │              │        └──────┬───────┘
     │              │               │
     │    ┌─────────┼───────────────┤
     │    │         │               │
     ▼    ▼         ▼               ▼
┌────────────┐ ┌──────────┐ ┌──────────────┐
│ Google     │ │ Stripe   │ │ Regulatory   │
│ Analytics  │ │          │ │ Sources      │
│ GA4        │ │ Checkout │ │ (crawled)    │
│            │ │ Portal   │ │              │
│ reCAPTCHA  │ │ Webhooks │ │ NFPA, FDA,   │
│            │ │          │ │ CalRecycle,  │
│ Nominatim  │ │          │ │ County HDs   │
└────────────┘ └──────────┘ └──────────────┘
     │              │
     │    ┌─────────┤
     │    │         │
     ▼    ▼         ▼
┌────────────┐ ┌──────────┐ ┌──────────────┐
│ Crisp      │ │ Resend   │ │ Anthropic    │
│ (live chat)│ │ (email)  │ │ Claude API   │
│            │ │          │ │              │
│ Calendly   │ │ Twilio   │ │ claude-sonnet│
│ (booking)  │ │ (SMS)    │ │ Vision, Chat │
└────────────┘ └──────────┘ └──────────────┘
```

### Data Flow Per Service

| Service | Direction | Data | Trigger |
|---------|-----------|------|---------|
| Stripe | App → Stripe | Checkout sessions | User clicks "Upgrade" |
| Stripe | Stripe → App | Webhook events (payment, subscription) | Stripe fires webhook |
| Resend | App → Resend | Email content (welcome, alerts, invites) | Edge function invocation |
| Anthropic | App → Anthropic | User messages, photos, documents | AI Advisor, photo analysis |
| Anthropic | Anthropic → App | AI responses, classifications | Streamed back to client |
| Crisp | App ↔ Crisp | Chat messages, user identity | Widget loads, user sends message |
| GA4 | App → Google | Page views, events, conversions | Page load, user actions |
| reCAPTCHA | App ↔ Google | Challenge token | Login form submit |
| Nominatim | App → OSM | Lat/lon coordinates | Jurisdiction detection |
| Twilio | App → Twilio | SMS content, phone number | Edge function invocation |
| Calendly | App → Calendly | Embedded widget | Demo booking page |
| Intelligence | App ↔ Intel Project | Compliance updates, signal feed | Background sync, webhooks |

---

## 10. OFFLINE SYNC ARCHITECTURE

**Generate a diagram for the offline-first data flow:**

```
┌─────────────────────────────────────┐
│          USER DEVICE                 │
│                                     │
│  ┌──────────────┐  ┌────────────┐  │
│  │   React App  │  │  IndexedDB │  │
│  │              │──▶│  (offlineDb)│  │
│  │  Component   │  │            │  │
│  │  writes data │  │  Queued    │  │
│  │              │  │  mutations │  │
│  └──────────────┘  └─────┬──────┘  │
│                          │         │
│                     ┌────┴────┐    │
│                     │ Online? │    │
│                     └────┬────┘    │
│                     YES  │  NO    │
│                          │  ↓     │
│                          │ QUEUE  │
│                          │ (wait) │
│                          │        │
└──────────────────────────┼────────┘
                           │
                           ▼ (when online)
┌──────────────────────────────────────┐
│           SYNC ENGINE                │
│                                      │
│  1. Read pending mutations from IDB  │
│  2. POST each to Supabase           │
│  3. Handle conflicts (last-write-wins)│
│  4. Clear synced items from IDB     │
│  5. Update syncStatus context       │
│                                      │
│  Reconnect: 2s debounce             │
│  Backoff: exponential on failures   │
└──────────────────────────────────────┘
```

---

## 11. STORAGE BUCKET USAGE

**Generate a diagram showing storage bucket purposes:**

```
SUPABASE STORAGE
  │
  ├── documents/
  │   ├── Health permits
  │   ├── Fire inspection certificates
  │   ├── Business licenses
  │   ├── Insurance COIs
  │   └── Policy documents
  │
  ├── compliance-photos/
  │   ├── Inspection evidence
  │   ├── Corrective action photos
  │   ├── Incident documentation
  │   └── Self-inspection photos
  │
  ├── vault/ (admin-only)
  │   ├── Confidential documents
  │   ├── Legal agreements
  │   └── Internal reports
  │
  ├── uploads/ (temporary)
  │   ├── Vendor document submissions
  │   ├── Bulk import files (CSV)
  │   └── Temp file staging
  │
  └── reports/ (generated)
      ├── Compliance reports (PDF)
      ├── Training certificates (PDF)
      ├── Service reports (PDF)
      └── Audit trail exports
```

---

## 12. CRON JOB / SCHEDULED FUNCTION MAP

**Generate a timeline showing scheduled edge functions:**

```
DAILY (midnight UTC)
  ├── generate-alerts         → Check 7 alert types, generate predictive alerts
  ├── check-expiries          → Scan documents for upcoming expirations
  ├── check-equipment-alerts  → Scan equipment for overdue maintenance
  ├── platform-metrics-refresh → Aggregate daily platform metrics
  └── expire-demo-accounts    → Deactivate expired demo orgs

WEEKLY (Monday 6am UTC)
  ├── ai-weekly-digest        → Generate AI weekly summaries per org
  ├── benchmark-snapshot      → Snapshot benchmark data
  └── training-progress-reminder → Remind users of incomplete training

QUARTERLY
  └── benchmark-quarterly-report → Generate quarterly benchmark reports

EVENT-TRIGGERED
  ├── stripe-webhook          → On Stripe payment/subscription events
  ├── intelligence-webhook    → On intelligence project signals
  ├── iot-sensor-webhook      → On sensor data push
  ├── resend-webhook          → On email delivery events
  └── hoodops-webhook         → On HoodOps events
```

---

## 13. ENVIRONMENT VARIABLE MAP

**Generate a diagram showing env var usage:**

```
CLIENT (.env.local) → Vite injects at build time
  ├── VITE_SUPABASE_URL           → Supabase client init
  ├── VITE_SUPABASE_ANON_KEY      → Supabase client init
  ├── VITE_APP_ENV                → staging | production
  ├── VITE_APP_URL                → App base URL
  ├── VITE_RECAPTCHA_SITE_KEY     → Login CAPTCHA
  ├── VITE_STRIPE_PUBLISHABLE_KEY → Stripe checkout
  └── VITE_CRISP_WEBSITE_ID       → Crisp chat widget

EDGE FUNCTIONS (supabase secrets) → Available at runtime
  ├── SUPABASE_URL                → DB connection
  ├── SUPABASE_SERVICE_ROLE_KEY   → Bypass RLS
  ├── RESEND_API_KEY              → Email sending
  ├── ANTHROPIC_API_KEY           → AI features
  ├── STRIPE_SECRET_KEY           → Payment processing
  ├── STRIPE_WEBHOOK_SECRET       → Webhook verification
  ├── TWILIO_ACCOUNT_SID          → SMS sending
  ├── TWILIO_AUTH_TOKEN            → SMS auth
  ├── TWILIO_FROM_NUMBER           → SMS sender number
  └── INTELLIGENCE_WEBHOOK_SECRET  → Intel bridge auth
```

---

## HOW TO USE THIS DOCUMENT

Paste this entire document into Claude Chat with one of these prompts:

1. **"Create a complete system architecture diagram using Mermaid from this report"**
2. **"Generate an ER diagram for the core database tables described in Section 7"**
3. **"Create a flowchart of the authentication flow from Section 3"**
4. **"Build a data flow diagram showing the read/write paths from Sections 4 and 5"**
5. **"Create a service integration map from Section 9"**
6. **"Generate a context provider dependency tree from Section 2"**
7. **"Create a realtime subscription topology diagram from Section 8"**
