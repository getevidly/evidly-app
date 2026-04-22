# EvidLY — User Experience Flow Report

> **Purpose:** Feed this document into Claude Chat and ask it to generate user journey maps, screen flow diagrams, navigation trees, and UX flowcharts. Each section includes the raw data needed to create accurate visuals.

---

## 1. COMPLETE ENTRY POINT MAP

**Generate a diagram showing every way a user can enter the EvidLY app:**

```
ENTRY POINTS
  │
  ├── UNAUTHENTICATED
  │   ├── /login                 → Email/password + Social OAuth
  │   ├── /admin-login           → Platform admin login
  │   ├── /signup                → New org registration
  │   ├── /demo                  → Instant demo (no signup needed)
  │   ├── /demo/request          → Demo request form
  │   ├── /vendor/login          → Vendor partner login
  │   ├── /vendor/register       → Vendor registration
  │   ├── /forgot-password       → Password recovery
  │   ├── /invite/:token         → Team member invitation
  │   ├── /vendor/invite/:code   → Vendor partner invitation
  │   ├── /ref/:code             → Referral redirect
  │   ├── /r/:code               → Referral page
  │   ├── /auth/callback         → OAuth callback (Google, Microsoft)
  │   └── /email-confirmed       → Post-email-verification
  │
  ├── QR CODE SCANS
  │   ├── /equipment/scan/:id    → Equipment detail via QR
  │   ├── /temp/log              → Quick temp log (QR auth)
  │   └── /temp-logs/scan        → Temp log scanner
  │
  ├── PUBLIC PAGES (no auth required)
  │   ├── /verify/:code          → Public verification badge
  │   ├── /report/:token         → Shared compliance report
  │   ├── /risk/:shareToken      → Shared insurance risk
  │   ├── /passport/:id          → Compliance passport
  │   ├── /passport/demo         → Demo passport
  │   ├── /scoretable            → Jurisdiction score index
  │   ├── /scoretable/:state     → State scores
  │   ├── /scoretable/:state/:county → County scores
  │   ├── /scoretable/city/:city → City scores
  │   ├── /compliance/california → CA compliance info
  │   ├── /compliance/california/:county → County compliance
  │   ├── /assessment            → Public assessment tool (lead gen)
  │   ├── /kitchen-check/:slug   → County kitchen assessment (lead gen)
  │   ├── /operations-check      → Operations check (lead gen)
  │   ├── /kitchen-to-community  → K2C program page
  │   ├── /leaderboard-preview   → Public leaderboard
  │   ├── /providers             → Marketplace landing
  │   ├── /enterprise            → Enterprise landing
  │   ├── /iot                   → IoT sensor landing
  │   ├── /partners/insurance    → Carrier partnership
  │   ├── /vendor-connect/apply  → Vendor application
  │   ├── /blog                  → Blog list
  │   ├── /blog/:slug            → Blog post
  │   ├── /terms                 → Terms of Service
  │   ├── /privacy               → Privacy Policy
  │   ├── /city/:citySlug        → City landing
  │   └── /:slug                 → County landing (catch-all)
  │
  └── TOKENIZED ACCESS (no login, one-time use)
      ├── /vendor/upload/:token     → Secure document upload
      ├── /vendor/schedule/:token   → Vendor schedule response
      └── /vendor-update/:token     → Service update submission
```

---

## 2. SIGNUP → FIRST VALUE JOURNEY

**Generate a user journey map for the signup-to-first-value path:**

```
STEP 1: DISCOVERY
  User finds EvidLY via:
  ├── Google search → /scoretable or /compliance/california/:county
  ├── Public assessment → /assessment or /kitchen-check/:slug
  ├── Referral link → /ref/:code
  ├── Demo request → /demo/request
  └── Direct URL → /signup

STEP 2: SIGNUP (/signup)
  ├── Fill form (10+ fields):
  │   ├── Full Name
  │   ├── Email
  │   ├── Phone
  │   ├── Organization Name
  │   ├── State (CA, OR, WA, NV, AZ)
  │   ├── County/Jurisdiction
  │   ├── Commercial Kitchen Type (14 options)
  │   ├── SB 1383 qualification (conditional)
  │   ├── Password (12+ chars, 5 requirements)
  │   ├── Confirm Password
  │   └── Terms acceptance
  ├── OR Social OAuth (Google/Microsoft)
  └── Submit

STEP 3: EMAIL VERIFICATION
  ├── "Check your email" confirmation screen
  ├── User clicks email link
  ├── Lands on /email-confirmed
  └── Must manually navigate to /login

STEP 4: FIRST LOGIN (/login)
  ├── Enter credentials
  ├── MFA check (if role requires it)
  └── Redirect to /dashboard

STEP 5: FIRST DASHBOARD (/dashboard)
  ├── WelcomeModal appears (first visit)
  │   ├── "Welcome, [Name]!"
  │   ├── Quick start tips
  │   └── Dismiss → localStorage flag set
  ├── PushOptInBanner appears (after modal)
  ├── Role-specific dashboard renders
  └── PROBLEM: Dashboard has empty states everywhere
      (no data, no checklists, no temp logs, no documents)

STEP 6: ONBOARDING (WEAK — exists but not in main flow)
  ├── Onboarding.tsx exists but not auto-triggered
  ├── OnboardingChecklist.tsx exists but not prominent
  └── SignupLocations.tsx exists at /signup/locations but optional

STEP 7: FIRST VALUE ACTION (user must discover on their own)
  ├── Option A: Navigate to /temp-logs → Log first temperature
  ├── Option B: Navigate to /checklists → Complete first checklist
  ├── Option C: Navigate to /documents → Upload first document
  └── Option D: Navigate to /self-inspection → Run self-inspection

CURRENT TIME TO FIRST VALUE: HIGH (too many steps, too little guidance)
IDEAL TIME TO FIRST VALUE: < 5 minutes after email confirmation
```

---

## 3. ROLE-BASED NAVIGATION TREES

**Generate a navigation tree diagram for each of the 8 roles:**

### 3.1 Platform Admin
```
PLATFORM ADMIN (Arthur)
  │
  ├── /admin (AdminHome — command center)
  │
  ├── COMMAND CENTER
  │   ├── /admin/command-center
  │   ├── /admin/crawl-monitor
  │   └── /admin/system/edge-functions
  │
  ├── SALES & GTM
  │   ├── /admin/sales (Pipeline)
  │   ├── /admin/gtm (GTM Dashboard)
  │   ├── /admin/campaigns (Marketing)
  │   ├── /admin/kitchen-checkup (Assessment Leads)
  │   ├── /admin/violation-outreach
  │   ├── /admin/email-sequences
  │   └── /admin/trial-health
  │
  ├── DEMOS
  │   ├── /admin/demo-generator
  │   ├── /admin/demo-launcher
  │   ├── /admin/demo-pipeline
  │   ├── /admin/demo-tours
  │   └── /admin/partner-demos
  │
  ├── INTELLIGENCE
  │   ├── /admin/intelligence
  │   ├── /admin/intelligence-admin
  │   ├── /admin/jurisdiction-intelligence
  │   ├── /admin/regulatory-changes
  │   └── /admin/rfp-monitor
  │
  ├── PLATFORM
  │   ├── /admin/users
  │   ├── /admin/orgs
  │   ├── /admin/security-settings
  │   ├── /admin/audit-log
  │   ├── /admin/feature-flags
  │   ├── /admin/billing
  │   ├── /admin/messages
  │   ├── /admin/maintenance
  │   ├── /admin/backup
  │   ├── /admin/vault
  │   └── /admin/event-log
  │
  ├── SUPPORT
  │   ├── /admin/support (Tickets)
  │   ├── /admin/remote-connect
  │   ├── /admin/emulate
  │   └── /admin/provisioning
  │
  └── + ALL tenant routes (can switch to any role via emulation)
```

### 3.2 Owner/Operator
```
OWNER/OPERATOR (Multi-location)
  │
  ├── /dashboard (OwnerOperatorDashboard)
  │   ├── Multi-location compliance cards
  │   ├── Alert feed
  │   ├── Corrective actions
  │   ├── Vendor status
  │   └── Team performance
  │
  ├── /calendar
  │
  ├── FOOD SAFETY
  │   ├── /food-safety (Hub)
  │   ├── /checklists
  │   ├── /temp-logs
  │   ├── /haccp
  │   ├── /corrective-actions
  │   └── /incidents
  │
  ├── FIRE SAFETY
  │   └── /facility-safety
  │
  ├── COMPLIANCE
  │   ├── /compliance (Hub)
  │   ├── /compliance-overview
  │   ├── /deficiencies
  │   ├── /documents
  │   ├── /self-audit
  │   ├── /mock-inspection
  │   ├── /insurance-risk
  │   ├── /workforce-risk
  │   ├── /cic-pse
  │   ├── /progress
  │   ├── /regulatory-alerts
  │   ├── /reports
  │   ├── /services
  │   └── /vendors
  │
  ├── INSIGHTS
  │   ├── /insights (Hub)
  │   ├── /ai-advisor
  │   ├── /copilot
  │   ├── /analysis
  │   ├── /compliance-trends
  │   ├── /audit-trail
  │   ├── /benchmarks
  │   ├── /intelligence
  │   ├── /insights/reports
  │   └── /insights/predictions
  │
  ├── TOOLS
  │   ├── /tools (Hub)
  │   ├── /inspector-mode
  │   └── /self-diagnosis (AI equipment diagnosis)
  │
  └── ADMINISTRATION
      ├── /equipment
      ├── /integrations
      ├── /sensors
      ├── /import
      ├── /org-hierarchy
      ├── /settings
      ├── /roles-permissions
      ├── /team
      ├── /dashboard/training
      └── /vendors
```

### 3.3 Executive
```
EXECUTIVE
  │
  ├── /dashboard (ExecutiveDashboard)
  │   ├── Org-wide analytics charts
  │   ├── Benchmarks vs peers
  │   ├── Insurance risk summary
  │   ├── Strategic AI insights
  │   └── Financial impact analysis
  │
  ├── INSIGHTS (PRIMARY FOCUS)
  │   ├── /ai-advisor
  │   ├── /copilot
  │   ├── /analysis
  │   ├── /compliance-trends
  │   ├── /audit-trail
  │   ├── /benchmarks
  │   ├── /intelligence
  │   ├── /insights/reports
  │   └── /insights/predictions
  │
  ├── COMPLIANCE (read-heavy)
  │   ├── /insurance-risk
  │   ├── /workforce-risk
  │   ├── /cic-pse
  │   ├── /progress
  │   ├── /regulatory-alerts
  │   ├── /reports
  │   └── /services
  │
  └── ADMIN (limited)
      ├── /integrations
      ├── /settings
      └── /dashboard/training
```

### 3.4 Kitchen Staff (Simplest)
```
KITCHEN STAFF
  │
  ├── /dashboard (KitchenStaffTaskList — task list only, no tabs)
  │   ├── Today's checklists
  │   ├── Temperature readings due
  │   └── Assigned tasks
  │
  ├── FOOD SAFETY
  │   ├── /checklists
  │   ├── /temp-logs
  │   └── /tasks (Task Manager)
  │
  ├── TOOLS
  │   ├── /self-diagnosis
  │   └── /voice-help
  │
  └── HELP
      └── /help
```

---

## 4. CORE WORKFLOW USER JOURNEYS

**Generate a step-by-step user journey flowchart for each workflow:**

### 4.1 Temperature Logging Journey
```
START: Kitchen staff arrives for shift
  │
  ├── PATH A: Dashboard prompt
  │   ├── See "3 temp readings due" on task list
  │   ├── Tap "Walk-in Cooler"
  │   └── Modal opens with temp input
  │
  ├── PATH B: QR Code scan
  │   ├── Scan QR code on equipment
  │   ├── → /equipment/scan/:id or /temp/log
  │   ├── QRAuthGuard checks login
  │   │   ├── IF logged in → Pre-filled form
  │   │   └── IF not → Login prompt → Return to form
  │   └── Enter temp reading
  │
  └── PATH C: Navigate to /temp-logs
      ├── See equipment list with status indicators
      ├── Green checkmarks for logged today
      ├── Red alerts for overdue
      ├── Tap equipment → Enter reading
      └── Optional: Barcode/QR scanner mode

SUBMIT READING:
  ├── Enter temperature value
  ├── System validates against safe range
  │   ├── IN RANGE (32-41°F cooler)
  │   │   ├── Green "Saved" confirmation
  │   │   ├── Timestamp recorded
  │   │   └── Return to list
  │   └── OUT OF RANGE
  │       ├── Red "Alert" warning
  │       ├── Prompt: "Take corrective action?"
  │       │   ├── YES → Create corrective action
  │       │   └── NO → Log reading anyway (flagged)
  │       ├── Manager notified automatically
  │       └── Return to list (flagged reading)
  │
  └── END: Equipment shows "Logged 2 min ago"
```

### 4.2 Checklist Completion Journey
```
START: Opening shift
  │
  ├── Dashboard shows "Opening Checklist — Location 1"
  ├── Tap to open
  │
  └── CHECKLIST SCREEN (/checklists)
      ├── Header: "Opening Checklist · Downtown Kitchen"
      ├── Progress bar: 0/15 items
      │
      ├── SECTION: Handwashing & Sanitation
      │   ├── [ ] Handwashing stations stocked (soap, towels)
      │   ├── [ ] Sanitizer buckets prepared (200 ppm)
      │   └── [ ] No-touch thermometer available
      │
      ├── SECTION: Food Storage
      │   ├── [ ] Walk-in cooler temp verified (< 41°F)
      │   ├── [ ] Freezer temp verified (< 0°F)
      │   ├── [ ] FIFO rotation checked
      │   └── [ ] Date labels on all prep items
      │
      ├── SECTION: Equipment
      │   ├── [ ] Hot hold units at 135°F+
      │   ├── [ ] Grill/flat top cleaned
      │   └── [ ] Hood system running
      │
      ├── Each item: Tap to toggle → Checkmark animation
      ├── Optional: Add photo (camera icon on each item)
      ├── Optional: Add note (comment icon on each item)
      │
      ├── ITEM FAILS → Prompt: "Create corrective action?"
      │   ├── YES → Quick CA form (pre-filled with item)
      │   └── NO → Mark as failed, continue
      │
      ├── Progress bar fills: 15/15
      ├── "Submit Checklist" button activates
      ├── Tap Submit → Confirmation modal
      │   ├── "Opening Checklist completed at 6:45 AM"
      │   ├── Time taken: 8 minutes
      │   └── [View Report] [Back to Dashboard]
      │
      └── END: Dashboard shows "Completed" badge
```

### 4.3 Self-Inspection Journey
```
START: Compliance manager prepares for inspection
  │
  ├── Navigate to /self-audit (or /self-inspection alias)
  ├── Page shows jurisdiction-specific criteria
  │   (e.g., "Los Angeles County DEHS — 48 Critical Items")
  │
  ├── Tap "Start Self-Inspection"
  │
  └── INSPECTION WALKTHROUGH
      ├── Category 1: Food Temperature Control (12 items)
      │   ├── Q: "Hot foods held at 135°F or above?" [Yes] [No] [N/A]
      │   ├── Q: "Cold foods held at 41°F or below?" [Yes] [No] [N/A]
      │   ├── Q: "Cooling procedures followed?" [Yes] [No] [N/A]
      │   └── ... (12 items total)
      │
      ├── Category 2: Personal Hygiene (8 items)
      │   ├── Q: "Employees washing hands properly?" [Yes] [No] [N/A]
      │   └── ...
      │
      ├── Category 3: Food Source & Protection (10 items)
      ├── Category 4: Facility Maintenance (10 items)
      ├── Category 5: Equipment & Utensils (8 items)
      │
      ├── Each "No" answer:
      │   ├── Violation severity auto-classified (Major/Minor)
      │   ├── Recommendation card shown inline
      │   ├── Option: Take photo evidence
      │   └── Option: Create corrective action immediately
      │
      ├── COMPLETION (50+ questions answered)
      │
      └── RESULTS SCREEN
          ├── Overall Score: 85/100
          ├── Category Breakdown:
          │   ├── Food Temp Control: 90% ■■■■■■■■■□
          │   ├── Personal Hygiene: 100% ■■■■■■■■■■
          │   ├── Food Source: 80% ■■■■■■■■□□
          │   ├── Facility: 75% ■■■■■■■□□□
          │   └── Equipment: 85% ■■■■■■■■□□
          ├── Violations Found: 3 Major, 2 Minor
          ├── [Generate PDF Report]
          ├── [Create Corrective Actions for All Violations]
          ├── [Share with Team]
          └── [Compare to Last Inspection]
```

### 4.4 Corrective Action Lifecycle
```
TRIGGER EVENT
  ├── Self-inspection violation
  ├── Out-of-range temp log
  ├── Failed checklist item
  ├── AI-detected anomaly
  ├── Manual creation by manager
  └── External inspection violation

CREATE (/corrective-actions/new)
  ├── Issue Title (auto-filled from trigger)
  ├── Description (AI draft available)
  ├── Severity: [Major] [Minor] [Critical]
  ├── Root Cause: [Equipment] [Training] [Process] [Supplier]
  ├── Corrective Steps (AI suggests based on violation type)
  ├── Assigned To: [dropdown of team members]
  ├── Target Date: [date picker]
  ├── Photo Evidence: [camera / upload]
  └── Submit → Creates record

TRACKING (/corrective-actions/:id)
  ├── Status: Open → In Progress → Pending Review → Resolved
  │
  ├── ASSIGNEE ACTIONS:
  │   ├── Update status to "In Progress"
  │   ├── Add progress notes
  │   ├── Upload completion photos
  │   ├── Request extension (with reason)
  │   └── Mark as "Ready for Review"
  │
  ├── MANAGER ACTIONS:
  │   ├── Review completion evidence
  │   ├── Accept → Status: "Resolved"
  │   ├── Reject → Status: "In Progress" + feedback
  │   └── Escalate → Notify compliance manager
  │
  ├── NOTIFICATIONS:
  │   ├── Assignee gets push/email when assigned
  │   ├── Manager gets alert when ready for review
  │   ├── Both get reminders 24h before target date
  │   └── Escalation if overdue by 48h
  │
  └── RESOLUTION
      ├── Final status: "Resolved"
      ├── Resolution date/time recorded
      ├── Audit trail locked (immutable)
      ├── Compliance score updated
      └── Dashboard metric updated
```

---

## 5. DEMO MODE USER JOURNEY

**Generate a flowchart for the demo experience:**

```
ENTRY: User navigates to /demo
  │
  ├── DemoWizard loads
  ├── Instantly:
  │   ├── Set sessionStorage 'evidly_demo_mode' = true
  │   ├── Configure operating hours & shifts
  │   ├── Activate demo guard (block all writes)
  │   └── Redirect to /dashboard
  │
  └── DEMO DASHBOARD (/dashboard)
      ├── DemoBanner: "You're viewing a demo — [Sign up to get started]"
      ├── DemoModeBadge in TopBar: "DEMO"
      ├── DemoWatermark: Subtle "Demo" overlay
      ├── DemoRestrictions: Block write actions with tooltip
      ├── DemoButtonGuard: Disabled buttons show "Sign up to use"
      │
      ├── Role Switcher visible in TopBar:
      │   ├── Owner / Operator (Maria Rodriguez)
      │   ├── Executive (James Park)
      │   ├── Compliance Manager (Sofia Chen)
      │   ├── Chef (Ana Torres)
      │   ├── Facilities Manager (Michael Torres)
      │   ├── Kitchen Manager (David Kim)
      │   └── Kitchen Staff (Lisa Nguyen)
      │   [Switch role → Dashboard reloads with role-specific view]
      │
      ├── All data is hardcoded sample data (no Supabase queries)
      ├── Navigation works — all pages accessible
      ├── Write actions show "Demo mode — sign up to save changes"
      │
      ├── GUIDED TOUR (optional)
      │   ├── GuidedTour.tsx → Step-by-step feature walkthrough
      │   ├── DemoTour.tsx → Sales-focused tour
      │   ├── Highlights: Dashboard → Checklists → Temp Logs → AI Advisor
      │   └── Tour tooltip at each stop with "Next" button
      │
      ├── CONVERSION POINTS:
      │   ├── DemoCTABar: Sticky bottom bar "Ready to start? [Sign Up Free]"
      │   ├── DemoConversionModal: After 5+ pages viewed
      │   ├── DemoUpgradePrompt: On attempting blocked action
      │   └── Each shows signup link with email pre-fill
      │
      └── PRESENTER MODE (secret):
          ├── Type "evidly" anywhere → Activates
          ├── OR add ?presenter=true to URL
          ├── Hides: DemoBanner, DemoModeBadge, DemoWatermark, DemoCTABar
          ├── Looks like production app
          └── Used for live sales demos
```

---

## 6. VENDOR USER JOURNEY

**Generate a flowchart for the vendor partner experience:**

```
VENDOR ENTRY PATHS:
  │
  ├── PATH A: Invited by Restaurant
  │   ├── Restaurant admin sends invite from /vendors
  │   ├── Vendor receives email → /vendor/invite/:code
  │   ├── Landing page shows: "{Restaurant} invited you to EvidLY"
  │   ├── Fill: Company Name, Email, Password
  │   ├── Account created → /vendor/dashboard
  │   └── Auto-linked to inviting restaurant
  │
  ├── PATH B: Self-Registration
  │   ├── /vendor/register
  │   ├── Fill: Company info, service types, coverage area
  │   ├── Upload certifications
  │   └── Account created → /vendor/setup → /vendor/dashboard
  │
  ├── PATH C: Marketplace Application
  │   ├── /vendor-connect/apply
  │   ├── Fill application form
  │   ├── Admin reviews application
  │   └── Approved → Account created → /vendor/dashboard
  │
  └── PATH D: Tokenized Upload (no account needed)
      ├── Restaurant creates upload request
      ├── Vendor receives email → /vendor/upload/:token
      ├── Upload document (no login)
      ├── Token expires after use
      └── Restaurant notified of upload

VENDOR DASHBOARD (/vendor/dashboard):
  ├── Active service requests
  ├── Upcoming appointments calendar
  ├── Document upload queue
  ├── Client locations map
  ├── Certification expiration tracker
  │
  ├── ACTIONS:
  │   ├── View service request → Details, notes, location
  │   ├── Accept/decline requests
  │   ├── Upload completion docs (invoice, photos, test results)
  │   ├── Update service status (In Progress, Completed, Follow-up)
  │   ├── Schedule next visit
  │   ├── View client compliance scores
  │   └── Manage certifications
  │
  └── VENDOR PARTNER DASHBOARD (/vendor/partner-dashboard):
      ├── All connected restaurants
      ├── Service agreement overview
      ├── Revenue tracking
      └── Performance metrics
```

---

## 7. MOBILE VS DESKTOP EXPERIENCE

**Generate a comparison diagram:**

### Desktop (1024px+)
```
┌──────────────────────────────────────────────────────────┐
│ [EvidLY logo] │ TopBar: Org Name │ Search │ 🔔 │ 🌐 │ 👤 │
├──────────────┤─────────────────────────────────────────────┤
│              │ Breadcrumb: Dashboard > Food Safety > Temps  │
│  SIDEBAR     │─────────────────────────────────────────────│
│  (240px)     │                                             │
│              │         MAIN CONTENT AREA                    │
│  Dashboard   │         (max-width: 1200px)                  │
│  Calendar    │                                             │
│  ──────────  │    ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  FOOD SAFETY │    │  Card 1  │ │  Card 2  │ │  Card 3  │  │
│   Checklists │    │          │ │          │ │          │  │
│   Temp Logs  │    └──────────┘ └──────────┘ └──────────┘  │
│   HACCP      │                                             │
│  ──────────  │    ┌─────────────────────────────────────┐  │
│  COMPLIANCE  │    │         Data Table / Chart           │  │
│   Documents  │    │                                     │  │
│   Alerts     │    └─────────────────────────────────────┘  │
│  ──────────  │                                             │
│  INSIGHTS    │                                        [FAB] │
│  ──────────  │         QuickActionsBar (bottom-right)      │
│  [Log Out]   │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

### Mobile (< 1024px)
```
┌─────────────────────────┐
│ Org Name        🔔  👤  │  ← Simplified TopBar
│─────────────────────────│
│ Breadcrumb: Dashboard   │
│─────────────────────────│
│                         │
│    MAIN CONTENT         │
│    (single column)      │
│                         │
│  ┌───────────────────┐  │
│  │     Card 1        │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │     Card 2        │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │     Card 3        │  │
│  └───────────────────┘  │
│                         │
│        [🎤 Voice]       │  ← Floating voice button
│─────────────────────────│
│ 🏠  📋  ➕  🌡️  ≡    │  ← Bottom Tab Bar (5 tabs)
│Home Tasks +  Temps More │
└─────────────────────────┘

"More" opens bottom drawer:
┌─────────────────────────┐
│ More Options        [X] │
│─────────────────────────│
│ COMPLIANCE              │
│ ┌─────┐┌─────┐┌─────┐  │
│ │Docs ││Alert││Audit│  │
│ └─────┘└─────┘└─────┘  │
│ INSIGHTS                │
│ ┌─────┐┌─────┐┌─────┐  │
│ │ AI  ││Bench││Intel│  │
│ └─────┘└─────┘└─────┘  │
│─────────────────────────│
│     [🔴 Sign Out]       │
└─────────────────────────┘
```

### Mobile Bottom Tab Bar Per Role

| Role | Tab 1 | Tab 2 | Tab 3 | Tab 4 | Tab 5 |
|------|-------|-------|-------|-------|-------|
| owner_operator | Home | Checklists | + (Quick Actions) | Temps | More |
| executive | Home | Insights | + | Reports | More |
| compliance_manager | Home | Checklists | + | Documents | More |
| chef | Home | Checklists | + | Temps | More |
| kitchen_manager | Home | Checklists | + | Temps | More |
| facilities_manager | Home | Equipment | + | Services | More |
| kitchen_staff | Home | Checklists | Temps | Tasks | (no More) |

---

## 8. AUTHENTICATED DEMO → PAID CONVERSION

**Generate a funnel diagram:**

```
DEMO ENTRY (/demo)
  │ 100% of demo visitors
  │
  ▼
DASHBOARD VIEWED
  │ ~95% (immediate redirect)
  │
  ▼
ROLE SWITCHED (at least once)
  │ ~60% (curiosity to explore)
  │
  ▼
5+ PAGES EXPLORED
  │ ~40% (engaged demo user)
  │ → DemoConversionModal triggers
  │
  ▼
CONVERSION POINT REACHED
  │ ~25% (attempted write action OR clicked CTA)
  │ → DemoUpgradePrompt shows
  │
  ▼
SIGNUP INITIATED (/signup)
  │ ~15% (clicked through to signup)
  │
  ▼
SIGNUP COMPLETED
  │ ~10% (completed registration)
  │
  ▼
EMAIL VERIFIED
  │ ~8% (clicked email link)
  │
  ▼
FIRST LOGIN + FIRST ACTION
  │ ~5% (achieved first value)
  │
  ▼
TRIAL → PAID CONVERSION
  │ ~2-3% of original demo visitors
  └── Target: 5-8% with onboarding improvements
```

---

## 9. ADMIN USER EMULATION FLOW

**Generate a flowchart for the admin emulation journey:**

```
PLATFORM ADMIN at /admin
  │
  ├── Navigate to /admin/emulate
  ├── Search for user or organization
  ├── Select target user
  │
  ├── "Start Emulation" button
  │   ├── Confirmation modal: "You will see EvidLY as [User Name] sees it"
  │   ├── Click "Begin Emulation"
  │   │
  │   └── EMULATION ACTIVATES:
  │       ├── EmulationContext: isEmulating = true
  │       ├── Write guard: ALL writes blocked (read-only mode)
  │       ├── Org context overridden to target user's org
  │       ├── Role overridden to target user's role
  │       ├── Sidebar shows target user's navigation
  │       ├── Dashboard shows target user's data
  │       │
  │       ├── UNMISSABLE BANNER:
  │       │   "⚠️ Emulating: [User Name] at [Org Name] — Read-Only Mode"
  │       │   [Stop Emulation] button
  │       │   Gold/amber background, fixed at top
  │       │
  │       ├── BLOCKED ACTIONS (show toast when attempted):
  │       │   ├── Password reset
  │       │   ├── Billing changes
  │       │   ├── Account deletion
  │       │   ├── Role changes
  │       │   └── Any data mutation
  │       │
  │       ├── AUDIT LOG:
  │       │   INSERT emulation_audit_log
  │       │   (admin_id, target_user_id, start_time, pages_viewed)
  │       │
  │       └── STOP EMULATION:
  │           ├── Click "Stop Emulation" in banner
  │           ├── Restore admin role
  │           ├── Clear org override
  │           ├── Redirect to /admin
  │           └── Log emulation_end in audit
```

---

## 10. PAGE-LEVEL STATE MACHINES

**Generate state diagrams for key pages:**

### Dashboard States
```
┌──────────┐    auth loaded    ┌──────────┐
│ LOADING  │ ─────────────────▶│  CHECK   │
│ (spinner)│                   │  ROLE    │
└──────────┘                   └────┬─────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌──────────┐   ┌──────────┐   ┌──────────┐
            │ OWNER    │   │ EXEC     │   │ STAFF    │
            │ DASHBOARD│   │ DASHBOARD│   │ TASK LIST│
            └──────────┘   └──────────┘   └──────────┘
                    │
                    ▼
            ┌──────────┐
            │ WELCOME  │ (first visit only)
            │ MODAL    │
            └──────────┘
                    │
                    ▼
            ┌──────────┐
            │ PUSH OPT │ (after modal dismissed)
            │ IN BANNER│
            └──────────┘
                    │
                    ▼
            ┌──────────┐
            │  READY   │ (banners, widgets, data loaded)
            └──────────┘
```

### Any Protected Page States
```
         ┌──────────┐
         │  ROUTE   │
         │ ENTERED  │
         └────┬─────┘
              │
              ▼
    ┌──────────────────┐     NO
    │ User authenticated?│──────▶ Redirect /login
    └────────┬─────────┘
             │ YES
             ▼
    ┌──────────────────┐     YES
    │ User suspended?   │──────▶ Redirect /suspended
    └────────┬─────────┘
             │ NO
             ▼
    ┌──────────────────┐     NO
    │ MFA required +    │──────▶ Continue
    │ not enrolled?     │
    └────────┬─────────┘
             │ YES
             ▼
    Redirect /setup-mfa
             │ (after enrollment)
             ▼
    ┌──────────────────┐     NO
    │ Route allowed for │──────▶ Redirect /dashboard
    │ user's role?      │
    └────────┬─────────┘
             │ YES
             ▼
    ┌──────────────────┐     YES
    │ Demo expired?     │──────▶ Redirect /demo-expired
    └────────┬─────────┘
             │ NO
             ▼
    ┌──────────────────┐
    │  RENDER PAGE     │
    │  (Suspense +     │
    │   lazy import)   │
    └──────────────────┘
```

---

## 11. INACTIVITY & SESSION MANAGEMENT

**Generate a timeline diagram:**

```
USER LOGS IN
  │
  │ 0 min ────────────────────────── Active session
  │
  │ Activity events tracked:
  │ (mousemove, keydown, click, touchstart, scroll)
  │
  │ 25 min (no activity) ──────────── WARNING MODAL APPEARS
  │   │                                "Session expiring in 5 minutes"
  │   │                                [Stay Signed In] [Sign Out]
  │   │
  │   ├── User clicks "Stay Signed In" → Timer resets to 0
  │   │
  │   └── User ignores...
  │
  │ 30 min (no activity) ──────────── SCREEN LOCKED
  │   │                                Black overlay, EvidLY logo
  │   │                                "Enter password to unlock"
  │   │
  │   ├── User enters password → Unlock, timer resets
  │   │
  │   └── User ignores...
  │
  │ 3 hours (no activity) ─────────── FORCED LOGOUT
  │                                    supabase.auth.signOut()
  │                                    Redirect to /login
  │                                    Session destroyed
  │
  │ SUSPENDED USER (any time):
  │   Profile fetch detects is_suspended = true
  │   → Immediate signOut()
  │   → Redirect to /suspended
  │   → "Your account has been suspended. Contact support."
```

---

## HOW TO USE THIS DOCUMENT

Paste this entire document into Claude Chat with one of these prompts:

1. **"Create a complete user journey map using Mermaid from this report"**
2. **"Generate a signup-to-first-value funnel diagram from Section 2"**
3. **"Create navigation tree diagrams for all 8 roles from Section 3"**
4. **"Build a flowchart for the temperature logging journey from Section 4.1"**
5. **"Create a mobile vs desktop comparison wireframe from Section 7"**
6. **"Generate a demo-to-conversion funnel from Section 8"**
7. **"Create a state machine diagram for page routing from Section 10"**
8. **"Build the complete entry point map from Section 1 as a visual diagram"**
9. **"Create all workflow journey flowcharts from Section 4"**
10. **"Generate a session management timeline from Section 11"**
