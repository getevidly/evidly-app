# EvidLY Feature Baseline Report

**Generated:** 2026-04-13
**Audited Against:** EvidLY Complete Feature Guide (124 features, 22 categories)
**Codebase Snapshot:** 272 pages, 408 components, 80 hooks, 99 lib files, 172 edge functions, 281 migrations

---

## Executive Summary

| Verdict      | Count | % of 124 |
|-------------|-------|----------|
| CONFIRMED   | 104   | 83.9%    |
| PARTIAL     | 9     | 7.3%     |
| STUB        | 1     | 0.8%     |
| MISSING     | 8     | 6.5%     |
| CONTAMINATED| 2     | 1.6%     |

**Overall Health: 84% confirmed, 91% functional (confirmed + partial)**

---

## Verdicts by Feature

### Category 1: Core Operations (1–8)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 1 | Role-Based Dashboard | CONFIRMED | All 8 roles have dedicated dashboard paths |
| 2 | Temperature Logging | PARTIAL | 3 of 5 methods (manual, probe, IoT); photo capture & Bluetooth missing |
| 3 | Digital Checklists | CONFIRMED | Full CRUD, completion tracking, daily tasks |
| 4 | Document Management | PARTIAL | Upload/view works; cloud import (Google Drive/Dropbox OAuth) missing |
| 5 | HACCP Plans | CONFIRMED | Builder, templates, CCP monitoring, flow diagrams |
| 6 | Incident Reporting | CONFIRMED | Form, timeline, corrective action linking |
| 7 | Corrective Actions | CONFIRMED | Full workflow with status tracking |
| 8 | Deficiency Tracking | CONFIRMED | Inspection-linked deficiency management |

### Category 2: Vendor & Marketplace (9–15)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 9 | Vendor Marketplace | CONFIRMED | Search, filter, request quotes |
| 10 | Vendor Onboarding | CONFIRMED | Registration, document upload, approval flow |
| 11 | Vendor Doc Review | CONFIRMED | Admin review queue with approve/reject |
| 12 | Vendor Performance | CONFIRMED | Scoring, history, trend charts |
| 13 | Vendor Connect | CONFIRMED | Real-time messaging, document sharing |
| 14 | Service Request | CONFIRMED | Create, track, assign, complete |
| 15 | Vendor Compliance Tracking | CONFIRMED | Expiration alerts, document requirements |

### Category 3: Compliance Intelligence (16–28)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 16 | Compliance Overview | CONFIRMED | Dashboard with scores, trends, alerts |
| 17 | Inspection History | CONFIRMED | Timeline view with detail drill-down |
| 18 | Self-Inspection | CONFIRMED | Guided walkthrough with scoring |
| 19 | Mock Inspection | CONFIRMED | Full simulation with inspector personas |
| 20 | Inspector Arrival Mode | CONFIRMED | Real-time checklist, document staging |
| 21 | Insurance Risk | CONFIRMED | Risk scoring, premium impact analysis |
| 22 | Jurisdiction Performance Index | PARTIAL | UI exists; `compute-jpi` edge function missing |
| 23 | CIC/PSE | CONFIRMED | "On Track" / "Potential Gap" language enforced |
| 24 | Compliance Trends | CONFIRMED | Time-series analytics, category breakdown |
| 25 | Regulatory Calendar | CONFIRMED | Jurisdiction-aware due dates |
| 26 | Workforce Risk | CONFIRMED | Training gaps, certification expiry |
| 27 | Progress Tracker | CONFIRMED | Multi-location compliance progress |
| 28 | Reporting | CONFIRMED | PDF/CSV export, scheduled reports |

### Category 4: Superpowers (29–35)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 29 | Violation Radar | CONFIRMED | Real-time jurisdiction violation monitoring |
| 30 | Inspection Forecast | CONFIRMED | Predictive scheduling based on patterns |
| 31 | Compliance Trajectory | CONFIRMED | Forward-looking compliance scoring |
| 32 | Jurisdiction Signals | CONFIRMED | Regulatory change detection |
| 33 | Team Leaderboard | CONFIRMED | Gamification with rankings |
| 34 | Operations Intelligence | CONFIRMED | Cross-location operational analytics |
| 35 | Client Intelligence | CONFIRMED | Per-client compliance profiles |

### Category 5: AI Features (36–46)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 36 | AI Insights | CONFIRMED | Natural language compliance analysis |
| 37 | AI Risk Scoring | CONFIRMED | ML-based risk assessment |
| 38 | Copilot Frontend | PARTIAL | Component exists; shows empty state (by design until training data) |
| 39 | Smart Scheduling | CONFIRMED | AI-optimized inspection scheduling |
| 40 | Anomaly Detection | CONFIRMED | Temperature/checklist anomaly alerts |
| 41 | Predictive Analytics | CONFIRMED | Forward-looking compliance predictions |
| 42 | NLP Document Analysis | CONFIRMED | Automated document parsing |
| 43 | Automated Reporting | CONFIRMED | AI-generated compliance summaries |
| 44 | Training Recommendations | CONFIRMED | Personalized staff training suggestions |
| 45 | Compliance Scoring AI | CONFIRMED | Multi-factor compliance scoring |
| 46 | Incident Pattern Recognition | CONFIRMED | Cross-incident pattern analysis |

### Category 6: Enterprise & Infrastructure (47–55)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 47 | Multi-Location | CONFIRMED | Organization-scoped location management |
| 48 | SSO/SAML | CONFIRMED | Enterprise SSO integration |
| 49 | Audit Trail | CONFIRMED | Immutable audit log with tamper detection |
| 50 | Role-Based Access | CONFIRMED | 8 roles with granular permissions |
| 51 | API Access | CONFIRMED | REST API with key management |
| 52 | White-Label | CONFIRMED | Custom branding per organization |
| 53 | Data Export | CONFIRMED | CSV/PDF export across modules |
| 54 | Webhooks | CONFIRMED | Event-driven webhook delivery |
| 55 | Feature Gates | CONFIRMED | 12 of 18 plan-gated feature flags active |

### Category 7: Facilities & Equipment (56–60)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 56 | Equipment Tracking | CONFIRMED | Asset management with maintenance schedules |
| 57 | Ice Machine Monitoring | MISSING | No page, component, or edge function |
| 58 | Grease Filter Scheduling | MISSING | No page, component, or edge function |
| 59 | POS Integration | CONFIRMED | Integration configuration UI |
| 60 | Sensor CSV Import | MISSING | No bulk import UI; manual-only sensor entry |

### Category 8: Communications (61–66)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 61 | Notification Center | CONFIRMED | In-app notification hub |
| 62 | Email Sequences | CONFIRMED | Drip campaign builder |
| 63 | SMS Alerts | CONFIRMED | Twilio-backed SMS delivery |
| 64 | Community Forum | MISSING | No page, component, or database table |
| 65 | Bilingual Support | CONFIRMED | English/Spanish with LanguageContext |
| 66 | Drift Monitor | CONFIRMED | Content drift detection |

### Category 9: Billing & Growth (67–71)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 67 | Stripe Billing | PARTIAL | Stripe integration works; BillingPage shows $299 Standard (should be $199) |
| 68 | Blog / Content | CONFIRMED | CMS-driven blog pages |
| 69 | Referral Program | CONFIRMED | 5-referral reward system |
| 70 | Kitchen-to-Compliance (K2C) | CONFIRMED | Full onboarding flow |
| 71 | Ground Truth Verification | PARTIAL | Core verification works; missing schedule-ground-truth edge function |

### Category 10: Admin & People (72–84)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 72 | Employee Management | CONTAMINATED | HoodOps page — routes removed, file remains |
| 73 | Timecard Management | CONTAMINATED | HoodOps page — routes removed, file remains |
| 74 | Team Management | CONFIRMED | Role assignment, permissions |
| 75 | Training Records | CONFIRMED | Certification tracking |
| 76 | Training Catalog | CONFIRMED | Course library management |
| 77 | Staff Roles Config | CONFIRMED | Admin role configuration UI |
| 78 | User Provisioning | CONFIRMED | Bulk user creation |
| 79 | User Emulation | CONFIRMED | Admin impersonation for support |
| 80 | Support Tickets | CONFIRMED | Internal ticketing system |
| 81 | Admin Audit Log | CONFIRMED | Platform-wide audit trail |
| 82 | System Messages | CONFIRMED | Admin broadcast messaging |
| 83 | Configure | CONFIRMED | Platform configuration panel |
| 84 | Command Center | CONFIRMED | Admin operational dashboard |

### Category 11: Demo & Sales (85–91)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 85 | Demo Generator | CONFIRMED | Automated demo environment creation |
| 86 | Demo Pipeline | CONFIRMED | Demo-to-close tracking |
| 87 | Demo Launcher | CONFIRMED | One-click demo deployment |
| 88 | Demo Dashboard | CONFIRMED | Demo session analytics |
| 89 | Partner Demos | CONFIRMED | Partner-branded demo environments |
| 90 | Presenter Mode | CONFIRMED | Fullscreen presentation UI (missing ?presenter query param) |
| 91 | Demo Tours | CONFIRMED | Guided walkthrough tours |

### Category 12: Security (92–95)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 92 | Security Dashboard | CONFIRMED | Security posture overview |
| 93 | Security Settings | CONFIRMED | MFA, session, password policies |
| 94 | Remote Connect | CONFIRMED | Secure remote session management |
| 95 | Violation Outreach | CONFIRMED | Automated outreach on violations |

### Category 13: SEO & Public Pages (96–101)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 96 | ScoreTable | CONFIRMED | Public compliance scores |
| 97 | County Pages (CA) | CONFIRMED | 62 California county pages |
| 98 | County Pages (WA) | CONFIRMED | 39 Washington county pages |
| 99 | Blog | CONFIRMED | Public blog with CMS |
| 100 | Landing Pages | CONFIRMED | Marketing landing pages |
| 101 | Pricing Page | CONFIRMED | Public pricing with plan comparison |

### Category 14: Admin Tools (102–106)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 102 | Admin Home | CONFIRMED | Admin landing with quick actions |
| 103 | Admin Orgs | CONFIRMED | Organization management |
| 104 | Admin Users | CONFIRMED | User management console |
| 105 | Admin Billing | CONFIRMED | Billing administration |
| 106 | GTM Dashboard | CONFIRMED | Go-to-market analytics |

### Category 15: Public Features (107–111)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 107 | Founders Wall | MISSING | No page or component |
| 108 | Assessment Leads | CONFIRMED | Lead capture from assessments |
| 109 | Kitchen Checkup | CONFIRMED | Public self-assessment tool |
| 110 | Sales Pipeline | CONFIRMED | CRM pipeline management |
| 111 | Email Sequence Manager | CONFIRMED | Email automation builder |

### Category 16: Regulatory (112–115)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 112 | Jurisdiction Intelligence | CONFIRMED | Multi-jurisdiction regulatory monitoring |
| 113 | RFP Intelligence | CONFIRMED | Government RFP tracking |
| 114 | Web Push Notifications | PARTIAL | Service worker registered; push subscription/delivery incomplete |
| 115 | Offline Sync | PARTIAL | OfflineContext exists; IndexedDB queue sync not fully implemented |

### Category 17: Intelligence (116–119)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 116 | EvidLY Intelligence | CONFIRMED | AI-powered intelligence hub |
| 117 | Crawl System | PARTIAL | UI + edge functions exist; Crawl4AI integration missing |
| 118 | Intelligence Admin | CONFIRMED | Admin intelligence configuration |
| 119 | Client Reports | CONFIRMED | Per-client report generation |

### Category 18: IoT (120–124)

| # | Feature | Verdict | Notes |
|---|---------|---------|-------|
| 120 | FDA Cooling Compliance | STUB | Manual logging only; no real-time IoT integration |
| 121 | Zone Temperature Mapping | MISSING | No page, component, or edge function |
| 122 | Sensor Calibration Tracking | MISSING | No calibration management UI |
| 123 | Door Open/Close Monitoring | MISSING | No door sensor integration |
| 124 | Defrost Cycle Optimization | CONFIRMED | Defrost scheduling and optimization |

---

## Anti-Pattern Summary

| Anti-Pattern | Count |
|-------------|-------|
| Inline styles (style={...}) | ~1,008 |
| Hardcoded hex colors | ~1,474 |
| Ungated demo/fake data | ~110 instances |
| Raw `<button>` (not `<Button>`) | Previously addressed in P3 pass |

---

## Recommendations

1. **P0 — Fix pricing discrepancy**: BillingPage shows $299 Standard tier, should be $199
2. **P1 — Remove HoodOps contamination**: Delete ~40-50 orphaned page/component/hook files
3. **P1 — Delete HoodOps edge functions**: hoodops-webhook, generate-job-report, generate-service-report
4. **P2 — Build missing features**: Ice Machine (57), Grease Filter (58), Sensor CSV (60), Community Forum (64), Founders Wall (107), Zone Mapping (121), Calibration (122), Door Monitoring (123)
5. **P2 — Complete partial features**: JPI edge function (22), Crawl4AI (117), Web Push (114), Offline Sync (115)
6. **P3 — Continue style migration**: ~1,008 inline styles and ~1,474 hex colors to convert to Tailwind tokens
