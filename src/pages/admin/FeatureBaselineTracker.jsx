/**
 * FeatureBaselineTracker — Interactive audit report of 124 features vs Feature Guide
 * Route: /admin/feature-baseline
 * Generated: 2026-04-14
 */
import { useState, useMemo } from 'react';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';

const VERDICTS = {
  CONFIRMED: { label: 'Confirmed', color: '#166534', bg: '#F0FFF4' },
  PARTIAL:   { label: 'Partial',   color: '#D97706', bg: '#FFFBEB' },
  STUB:      { label: 'Stub',      color: '#9333EA', bg: '#FAF5FF' },
  MISSING:   { label: 'Missing',   color: '#DC2626', bg: '#FEF2F2' },
  CONTAMINATED: { label: 'Contaminated', color: '#BE185D', bg: '#FDF2F8' },
};

const CATEGORIES = [
  'Core Operations',
  'Vendor & Document Intelligence',
  'Compliance & Scoring',
  'Seven Superpowers',
  'AI-Powered Features',
  'Enterprise & Infrastructure',
  'Facilities & Equipment',
  'Communication & Platform',
  'Billing & Growth',
  'People Management',
  'Regulatory Modules',
  'Alerts & Monitoring',
  'Diagnosis & Field Tools',
  'Demo System',
  'Security',
  'SEO & Public Pages',
  'Admin Console',
  'Public & Community',
  'Support & Ops',
  'Known Gaps',
  'Intelligence Pipeline',
  'IoT Deep Dive',
];

const FEATURES = [
  // Core Operations (1-8)
  { id: 1, name: 'Role-Adaptive Dashboard', category: 'Core Operations', verdict: 'CONFIRMED', route: '/dashboard', files: 'Dashboard.tsx + 7 role variants', notes: '8 role switch variants confirmed' },
  { id: 2, name: 'Temperature Logging — 5 Input Methods', category: 'Core Operations', verdict: 'PARTIAL', route: '/temp-logs', files: 'TempLogs.tsx, TempLogQuick.tsx, TempLogScan.tsx', notes: '3/5 methods: manual, QR, IoT. Photo thermometer + Bluetooth missing.' },
  { id: 3, name: 'Smart Checklists', category: 'Core Operations', verdict: 'CONFIRMED', route: '/checklists', files: 'Checklists.tsx (1200+ lines)', notes: 'Opening, closing, weekly, HACCP CCP fields, authority tracking' },
  { id: 4, name: 'Document Management with AI Classification', category: 'Core Operations', verdict: 'PARTIAL', route: '/documents', files: 'Documents.tsx, documentClassifier.ts', notes: 'Classification + AI working. Cloud import fields present but cloud-file-import edge function needs OAuth creds.' },
  { id: 5, name: 'HACCP Plans — AI Generated', category: 'Core Operations', verdict: 'CONFIRMED', route: '/haccp', files: 'HACCP.tsx, HACCPAICreate.tsx', notes: 'generate-haccp-from-checklists edge function, CCP-01 through CCP-05+' },
  { id: 6, name: 'Incident Logging & Timeline', category: 'Core Operations', verdict: 'CONFIRMED', route: '/incidents', files: 'IncidentLog.tsx (900+ lines)', notes: '8 incident types, 3 severity levels, playbook integration' },
  { id: 7, name: 'Corrective Actions — AI Drafted', category: 'Core Operations', verdict: 'CONFIRMED', route: '/corrective-actions', files: 'CorrectiveActions.tsx, CorrectiveActionDetail.tsx', notes: 'ai-corrective-action-draft edge function, 5-status workflow' },
  { id: 8, name: 'Deficiency Tracking', category: 'Core Operations', verdict: 'CONFIRMED', route: '/deficiencies', files: 'Deficiencies.tsx, DeficiencyDetail.tsx, 3 modals', notes: 'AcknowledgeModal, DeferModal, ResolutionModal, 4 severity levels' },

  // Vendor & Document Intelligence (9-15)
  { id: 9, name: 'Vendor Portal & Vendor Connect', category: 'Vendor & Document Intelligence', verdict: 'CONFIRMED', route: '/vendor/*', files: '11 pages, 12 edge functions', notes: 'Full vendor lifecycle: login, register, dashboard, connect, upload, schedule' },
  { id: 10, name: 'Smart Document Routing & Auto-Request', category: 'Vendor & Document Intelligence', verdict: 'CONFIRMED', route: 'N/A (cron)', files: 'auto-request-documents, send-missing-doc-reminders, send-document-alerts', notes: 'Batch processing with 50s timeout, 4/7/14-day reminders' },
  { id: 11, name: 'AI Document Analysis — Vision', category: 'Vendor & Document Intelligence', verdict: 'CONFIRMED', route: 'N/A', files: 'ai-document-analysis edge function', notes: 'Claude Vision (Sonnet 4.5), PDF + image, structured metadata extraction' },
  { id: 12, name: 'Document Classification Engine', category: 'Vendor & Document Intelligence', verdict: 'CONFIRMED', route: 'N/A', files: 'classify-document, documentClassifier.ts', notes: '20+ types across 4 pillars, confidence scoring' },
  { id: 13, name: 'Cloud Document Import', category: 'Vendor & Document Intelligence', verdict: 'CONFIRMED', route: 'N/A', files: 'CloudImportPicker.tsx (386 lines), cloud-file-import', notes: 'Google Drive, OneDrive, Dropbox — requires OAuth env vars' },
  { id: 14, name: 'Vendor Marketplace', category: 'Vendor & Document Intelligence', verdict: 'CONFIRMED', route: '/marketplace', files: 'VendorMarketplace.tsx, VendorProfile.tsx, MarketplaceLanding.tsx', notes: '7 service types, vendor-recommendation-engine edge function' },
  { id: 15, name: 'Vendor Cost Intelligence', category: 'Vendor & Document Intelligence', verdict: 'CONFIRMED', route: 'N/A', files: 'ServiceCostSection.tsx, CostOfInactionEngine.tsx', notes: 'Annual spend rollup, risk/deferral cost calculation' },

  // Compliance & Scoring (16-28)
  { id: 16, name: 'Dual-Pillar Compliance Scoring', category: 'Compliance & Scoring', verdict: 'CONFIRMED', route: 'N/A', files: 'complianceScoring.ts, complianceEngine.ts', notes: 'Food safety (5 states) + fire safety (Pass/Fail) independent pillars' },
  { id: 17, name: 'Jurisdiction Intelligence Engine (JIE)', category: 'Compliance & Scoring', verdict: 'CONFIRMED', route: 'N/A', files: 'jurisdictionEngine.ts (606 lines)', notes: '7+ states, auto-detect by ZIP, hierarchical jurisdiction chains' },
  { id: 18, name: 'Insurance Risk Engine', category: 'Compliance & Scoring', verdict: 'CONFIRMED', route: '/insurance-risk', files: 'insuranceRiskScoreV2.ts, InsuranceRisk.tsx', notes: '7 edge functions, carrier API, daily recalculation' },
  { id: 19, name: 'Self-Inspection', category: 'Compliance & Scoring', verdict: 'CONFIRMED', route: '/self-audit', files: 'SelfAudit.tsx, selfInspectionScoring.ts, selfInspectionPdf.ts', notes: 'Jurisdiction-aware criteria, severity-based penalty system' },
  { id: 20, name: 'CIC/PSE Compliance Intelligence', category: 'Compliance & Scoring', verdict: 'CONFIRMED', route: '/cic-pse', files: 'CicPseView.tsx, cicPillars.ts', notes: 'Five-pillar CIC architecture (Revenue, Liability, Cost, Operational, Workforce)' },
  { id: 21, name: 'Inspector Arrival Mode', category: 'Compliance & Scoring', verdict: 'CONFIRMED', route: '/inspector-view', files: 'InspectorView.tsx', notes: 'Clean data flow, no hardcoded values' },
  { id: 22, name: 'Inspection Reports & JPI', category: 'Compliance & Scoring', verdict: 'PARTIAL', route: '/audit-report', files: 'AuditReport.tsx, HealthDeptReport.tsx', notes: 'Reports exist but compute-jpi edge function is MISSING' },
  { id: 23, name: 'Compliance Passport', category: 'Compliance & Scoring', verdict: 'CONFIRMED', route: '/passport/:id', files: 'Passport.tsx, PublicVerification.tsx, PassportDemo.tsx', notes: 'Share link + verification code system' },
  { id: 24, name: 'Workforce Risk Assessment', category: 'Compliance & Scoring', verdict: 'CONFIRMED', route: '/workforce-risk', files: 'WorkforceRisk.tsx, workforceRiskScanner.ts', notes: 'CIC Pillar 5, cert expiration tracking, idempotent scanner' },
  { id: 25, name: 'Improve Score Recommendations', category: 'Compliance & Scoring', verdict: 'CONFIRMED', route: '/improve-score', files: 'ImproveScore.tsx', notes: 'Score improvement recommendations' },
  { id: 26, name: 'Compliance Trends', category: 'Compliance & Scoring', verdict: 'CONFIRMED', route: '/compliance-trends', files: 'ComplianceTrends.tsx + 6 trend components', notes: 'Category, location, and overall trend analysis' },
  { id: 27, name: 'Benchmark System', category: 'Compliance & Scoring', verdict: 'CONFIRMED', route: '/benchmarks', files: 'Benchmarks.tsx, benchmarkEngine.ts, benchmarkNormalization.ts', notes: '4 edge functions, 4 badge tiers, weekly/monthly/quarterly crons' },
  { id: 28, name: 'Regulatory Change Monitoring', category: 'Compliance & Scoring', verdict: 'CONFIRMED', route: '/regulatory-alerts', files: 'RegulatoryAlerts.tsx, AdminRegulatoryChanges.tsx', notes: 'monitor-regulations edge function, admin-assisted workflow' },

  // Seven Superpowers (29-35)
  { id: 29, name: 'SP1: Inspection Forecast', category: 'Seven Superpowers', verdict: 'CONFIRMED', route: '/insights/inspection-forecast', files: 'InspectionForecast.jsx, inspectionForecast.ts (108 lines)', notes: 'Advisory-only output, risk levels, confidence scoring' },
  { id: 30, name: 'SP2: Violation Risk Radar', category: 'Seven Superpowers', verdict: 'CONFIRMED', route: '/insights/violation-radar', files: 'ViolationRadar.jsx, violationRadar.ts (106 lines)', notes: '5 risk domains, probability/severity scoring' },
  { id: 31, name: 'SP3: Compliance Trajectory', category: 'Seven Superpowers', verdict: 'CONFIRMED', route: '/insights/compliance-trajectory', files: 'ComplianceTrajectory.jsx', notes: '90-day historical snapshots from readiness_snapshots' },
  { id: 32, name: 'SP4: Vendor Performance Scoring', category: 'Seven Superpowers', verdict: 'CONFIRMED', route: '/insights/vendor-performance', files: 'VendorPerformance.jsx, vendorPerformance.ts (121 lines)', notes: '4 dimensions: Timeliness(40), Cert(30), COI(15), Missed(15)' },
  { id: 33, name: 'SP5: Shift Intelligence', category: 'Seven Superpowers', verdict: 'CONFIRMED', route: 'N/A (widget)', files: 'ShiftSummaryCard.jsx, shiftIntelligence.ts (111 lines)', notes: 'Shift labels, completion stats, handoff notes' },
  { id: 34, name: 'SP6: Jurisdiction Signals', category: 'Seven Superpowers', verdict: 'CONFIRMED', route: '/insights/jurisdiction-signals', files: 'JurisdictionSignals.jsx, JurisdictionSignalFeed.jsx', notes: 'County-based signal queries from published data' },
  { id: 35, name: 'SP7: Team Leaderboard', category: 'Seven Superpowers', verdict: 'CONFIRMED', route: '/insights/team-leaderboard', files: 'TeamLeaderboard.jsx, teamLeaderboard.ts (76 lines)', notes: '3 categories: Checklist(40), TempLog(35), CA Resolution(25)' },

  // AI-Powered Features (36-46)
  { id: 36, name: 'AI Compliance Chat', category: 'AI-Powered Features', verdict: 'CONFIRMED', route: '/ai-advisor', files: 'AIAdvisor.tsx (300+ lines), ai-chat edge function', notes: 'Streaming, 5-pillar CIC context, 50 msg/day rate limit' },
  { id: 37, name: 'AI Text Assist', category: 'AI-Powered Features', verdict: 'CONFIRMED', route: 'N/A (widget)', files: 'aiTextAssist.ts (290 lines), GhostInput, SuggestionPill, TapToFillButton', notes: '40+ field templates, ghost mode completions' },
  { id: 38, name: 'AI Proactive Copilot', category: 'AI-Powered Features', verdict: 'PARTIAL', route: '/copilot-insights', files: 'CopilotInsights.tsx, copilot-analyze edge function', notes: 'Backend complete (5 modules, daily 6am). Frontend shows empty state by design (ZERO FAKE DATA).' },
  { id: 39, name: 'Thermometer Photo Reader', category: 'AI-Powered Features', verdict: 'CONFIRMED', route: 'N/A', files: 'ai-photo-analysis edge function', notes: 'Claude Vision, NFPA references, pre/post comparison' },
  { id: 40, name: 'Voice Commands', category: 'AI-Powered Features', verdict: 'CONFIRMED', route: 'N/A', files: 'useVoiceCommand.ts, voiceParser.ts (150+ lines), VoiceButton.jsx', notes: 'Web Speech API, 8 action types, ai-voice-transcription edge function' },
  { id: 41, name: 'Kitchen Video Analysis', category: 'AI-Powered Features', verdict: 'CONFIRMED', route: 'N/A', files: 'ai-photo-analysis edge function (shared)', notes: 'Claude Vision handles video frames, NFPA 96 + UL 300 references' },
  { id: 42, name: 'AI Weekly Digest', category: 'AI-Powered Features', verdict: 'CONFIRMED', route: '/weekly-digest', files: 'WeeklyDigest.tsx, sendWeeklyDigest.ts, ai-weekly-digest', notes: 'Monday 6am, role-based, Resend emails, HTML generation' },
  { id: 43, name: 'AI Flag Suggestions', category: 'AI-Powered Features', verdict: 'CONFIRMED', route: 'N/A', files: 'ai-flag-suggest edge function', notes: 'Feature-name + trigger-type based suggestions' },
  { id: 44, name: 'Landing Page Chat', category: 'AI-Powered Features', verdict: 'CONFIRMED', route: 'N/A (public)', files: 'AIChatWidget.tsx, landing-chat edge function', notes: 'Public, no auth, 20 msg/hr rate limit, Sonnet for cost' },
  { id: 45, name: 'AI Pattern Analysis', category: 'AI-Powered Features', verdict: 'CONFIRMED', route: 'N/A', files: 'ai-pattern-analysis edge function', notes: 'Daily 2am, 7/14/30-day analysis, statistical thresholds' },
  { id: 46, name: 'AI Predictive Alerts', category: 'AI-Powered Features', verdict: 'CONFIRMED', route: 'N/A', files: 'ai-predictive-alerts edge function', notes: 'Sunday 6am, cert/doc/inspection expiry projections' },

  // Enterprise & Infrastructure (47-55)
  { id: 47, name: 'Enterprise Multi-Tenant SSO/SCIM', category: 'Enterprise & Infrastructure', verdict: 'CONFIRMED', route: '/enterprise/admin', files: 'EnterpriseDashboard.tsx (10 tabs), 7 edge functions', notes: '7 tables, 5-level hierarchy, SSO/SCIM, white-label branding' },
  { id: 48, name: 'API Platform OAuth 2.0 + PKCE', category: 'Enterprise & Infrastructure', verdict: 'CONFIRMED', route: '/developers', files: 'DeveloperPortal.tsx, 14+ edge functions', notes: '11 tables, 3 rate tiers, sandbox, v1 API routes' },
  { id: 49, name: 'Feature Gating System', category: 'Enterprise & Infrastructure', verdict: 'CONFIRMED', route: 'N/A', files: 'featureGating.ts, FeatureGate.tsx, useFeatureAccess.ts', notes: '12 gates (spec says 18), 4 restriction types verified' },
  { id: 50, name: 'Shared Compliance Reports', category: 'Enterprise & Infrastructure', verdict: 'CONFIRMED', route: '/report/:token', files: 'SharedReport.tsx', notes: 'Token-based public view, multiple report types, expiry check' },
  { id: 51, name: 'IoT Sensor Platform', category: 'Enterprise & Infrastructure', verdict: 'CONFIRMED', route: '/iot-monitoring', files: '7 pages, 9 edge functions, tempAnomalyEngine.ts', notes: 'Z-score anomaly detection, multi-provider, real-time alerts' },
  { id: 52, name: 'Training LMS', category: 'Enterprise & Infrastructure', verdict: 'CONFIRMED', route: '/training', files: '8 pages, 11 edge functions, 10 tables', notes: 'SB 476, AI quiz generation, certificates, 8-tab hub' },
  { id: 53, name: 'Playbook Engine', category: 'Enterprise & Infrastructure', verdict: 'CONFIRMED', route: '/playbooks', files: '5 pages, 6 edge functions, 12 tables', notes: 'Auto-trigger, AI assistant, escalation monitor, food loss calc' },
  { id: 54, name: 'Offline/PWA Architecture', category: 'Enterprise & Infrastructure', verdict: 'CONFIRMED', route: 'N/A', files: 'offlineDb.ts, syncEngine.ts, connectivityManager.ts, 5 edge functions', notes: 'IndexedDB, 3 stores, batch photo upload, conflict resolution' },
  { id: 55, name: 'QR Code System', category: 'Enterprise & Infrastructure', verdict: 'CONFIRMED', route: '/equipment/scan/:id', files: 'EquipmentQRCode.tsx, QRAuthGuard.jsx, QRScanLandingPage.tsx', notes: 'SVG QR generation, CalCode §113996, DOMPurify' },

  // Facilities & Equipment (56-60)
  { id: 56, name: 'Equipment Management', category: 'Facilities & Equipment', verdict: 'CONFIRMED', route: '/equipment', files: 'EquipmentPage.tsx + 11 components', notes: 'QR codes, service records, incident tracking, bulk print' },
  { id: 57, name: 'Ice Machine Cleaning Tracker', category: 'Facilities & Equipment', verdict: 'MISSING', route: 'N/A', files: 'NOT FOUND', notes: 'Ice machine mentioned only as demo equipment, no dedicated tracker' },
  { id: 58, name: 'Grease Filter Exchange Tracker', category: 'Facilities & Equipment', verdict: 'MISSING', route: 'N/A', files: 'NOT FOUND', notes: 'GreaseTrapFOG.tsx exists for FOG reporting but no exchange tracker' },
  { id: 59, name: 'POS Integration', category: 'Facilities & Equipment', verdict: 'CONFIRMED', route: '/settings/integrations', files: 'pos-connect, pos-sync-all, pos-sync-employees, pos-sync-locations', notes: 'All 4 edge functions present' },
  { id: 60, name: 'Sensor CSV Import', category: 'Facilities & Equipment', verdict: 'MISSING', route: 'N/A', files: 'NOT FOUND', notes: 'No CSV import functionality for sensors' },

  // Communication & Platform (61-66)
  { id: 61, name: 'Realtime Notification System', category: 'Communication & Platform', verdict: 'CONFIRMED', route: 'N/A', files: 'NotificationBell.tsx, NotificationPanel.tsx, NotificationContext', notes: '4 priority levels, Supabase realtime, bell + banner' },
  { id: 62, name: 'Email System — 25+ Types (Resend)', category: 'Communication & Platform', verdict: 'CONFIRMED', route: 'N/A', files: '_shared/email.ts, 9+ send functions', notes: 'buildEmailHtml(), welcome, invite, alert, reminder, trial emails' },
  { id: 63, name: 'SMS Notifications (Twilio)', category: 'Communication & Platform', verdict: 'CONFIRMED', route: 'N/A', files: '_shared/sms.ts, send-sms-invite', notes: 'Graceful degradation if Twilio not configured' },
  { id: 64, name: 'Community Forum — AI Moderated', category: 'Communication & Platform', verdict: 'MISSING', route: 'N/A', files: 'NOT FOUND', notes: 'No forum-moderate edge function, no forum pages exist' },
  { id: 65, name: 'Bilingual Interface — EN/ES', category: 'Communication & Platform', verdict: 'CONFIRMED', route: 'N/A', files: 'i18n.ts (108 KB), i18nMeta.ts, LanguageProvider', notes: 'English + Spanish, lazy-loaded translations' },
  { id: 66, name: 'Drift Monitor System', category: 'Communication & Platform', verdict: 'CONFIRMED', route: 'N/A', files: 'jurisdiction-drift-alert edge function', notes: 'Supabase trigger, Resend alert, hash comparison' },

  // Billing & Growth (67-71)
  { id: 67, name: 'Stripe Billing Integration', category: 'Billing & Growth', verdict: 'PARTIAL', route: '/settings/billing', files: 'stripe.ts, BillingPage.tsx, 3 edge functions', notes: 'Edge functions complete. PRICING DISCREPANCY: BillingPage shows $299 Standard (should be $199).' },
  { id: 68, name: 'Blog — Sanity CMS', category: 'Billing & Growth', verdict: 'CONFIRMED', route: '/blog', files: 'sanityClient.ts, BlogList.tsx, BlogPost.tsx', notes: 'Full Sanity integration with GROQ queries' },
  { id: 69, name: 'Referral System — 5 Mechanics', category: 'Billing & Growth', verdict: 'CONFIRMED', route: '/referrals', files: 'referralSystem.ts, ReferralDashboard.tsx', notes: '5 mechanics: champion, leaderboard, hero, k2c, vendor ripple' },
  { id: 70, name: 'Kitchen to Community — K2C', category: 'Billing & Growth', verdict: 'CONFIRMED', route: '/kitchen-to-community', files: 'KitchenToCommunity.tsx, 2 edge functions, 3 components', notes: 'k2c-processor, k2c-referral-invite, K2CWidget' },
  { id: 71, name: 'Ground Truth Missions', category: 'Billing & Growth', verdict: 'PARTIAL', route: '/operations-check', files: 'OperationsCheck.jsx, 2 edge functions', notes: '9 focus areas present. Only 2/3 expected edge functions found.' },

  // People Management (72-74)
  { id: 72, name: 'Employee Management', category: 'People Management', verdict: 'CLEANED', route: 'REMOVED', files: 'DELETED in BUILD-01', notes: 'HoodOps PRO feature fully removed — pages, components, hooks, demo data all deleted.' },
  { id: 73, name: 'Timecard Tracking', category: 'People Management', verdict: 'CLEANED', route: 'REMOVED', files: 'DELETED in BUILD-01', notes: 'HoodOps PRO feature fully removed — pages, components, hooks, demo data all deleted.' },
  { id: 74, name: 'Team Structure', category: 'People Management', verdict: 'CONFIRMED', route: '/team', files: 'Team.tsx', notes: 'Real Supabase queries (user_profiles, user_invitations), TeamInviteModal' },

  // Regulatory Modules (75-79)
  { id: 75, name: 'SB 1383 Organic Waste', category: 'Regulatory Modules', verdict: 'CONFIRMED', route: '/sb1383', files: 'SB1383Compliance.tsx', notes: 'Org-type restricted, full compliance module' },
  { id: 76, name: 'K-12 School Nutrition', category: 'Regulatory Modules', verdict: 'CONFIRMED', route: '/k12', files: 'K12Compliance.tsx', notes: 'Org-type restricted' },
  { id: 77, name: 'USDA Production Records', category: 'Regulatory Modules', verdict: 'CONFIRMED', route: '/usda/production-records', files: 'USDAProductionRecords.tsx', notes: 'Full implementation' },
  { id: 78, name: 'RFP Intelligence', category: 'Regulatory Modules', verdict: 'CONFIRMED', route: '/admin/rfp-monitor', files: 'RfpIntelligence.tsx, rfp-crawl, rfp-classify', notes: 'Crawl + classify pipeline, admin UI' },
  { id: 79, name: '11 California Regulations in JIE', category: 'Regulatory Modules', verdict: 'CONFIRMED', route: 'N/A', files: 'californiaLaws.ts, jurisdictionEngine.ts', notes: '11+ CA regulations tracked with status/countdown' },

  // Alerts & Monitoring (80-84)
  { id: 80, name: 'Compliance Alerts Hub', category: 'Alerts & Monitoring', verdict: 'CONFIRMED', route: '/alerts', files: 'Alerts.tsx', notes: 'Full alert management' },
  { id: 81, name: 'Regulatory Alert Feed', category: 'Alerts & Monitoring', verdict: 'CONFIRMED', route: '/regulatory-alerts', files: 'RegulatoryAlerts.tsx', notes: 'Regulatory change feed' },
  { id: 82, name: 'Scoring Breakdown', category: 'Alerts & Monitoring', verdict: 'CONFIRMED', route: '/scoring-breakdown', files: 'ScoringBreakdown.tsx', notes: 'Full scoring breakdown' },
  { id: 83, name: 'Compliance Index', category: 'Alerts & Monitoring', verdict: 'CONFIRMED', route: '/compliance-index', files: 'ComplianceIndex.tsx', notes: 'Compliance index view' },
  { id: 84, name: 'AI Predictive Alerts', category: 'Alerts & Monitoring', verdict: 'CONFIRMED', route: 'N/A', files: 'ai-predictive-alerts edge function', notes: 'Not duplicated with feature 46 — distinct use' },

  // Diagnosis & Field Tools (85-86)
  { id: 85, name: 'Diagnosis Wizard', category: 'Diagnosis & Field Tools', verdict: 'CONFIRMED', route: '/self-diagnosis', files: 'SelfDiagnosis.tsx, DiagnosisWizard.tsx, PhotoCapture.tsx, VideoCapture.tsx', notes: 'Step-based wizard with photo/video capture' },
  { id: 86, name: 'QR Code System (Field)', category: 'Diagnosis & Field Tools', verdict: 'CONFIRMED', route: '/equipment/scan/:id', files: 'See feature 55', notes: 'Not duplicated — distinct field-use context' },

  // Demo System (87-91)
  { id: 87, name: 'Guided Tour — 3 Modes', category: 'Demo System', verdict: 'CONFIRMED', route: '/demo', files: 'GuidedTour.tsx, DemoTour.tsx, RolePreview.jsx', notes: 'Anonymous, Authenticated, Role Preview modes' },
  { id: 88, name: 'Demo Data Generator', category: 'Demo System', verdict: 'CONFIRMED', route: 'N/A', files: 'demoDataGenerator.ts (650 lines)', notes: 'Jurisdiction-aware, 30-day realistic data generation' },
  { id: 89, name: 'Demo Write Guard — 3-Tier Proxy', category: 'Demo System', verdict: 'CONFIRMED', route: 'N/A', files: 'supabaseGuard.ts', notes: 'live / anonymous_demo / authenticated_demo modes' },
  { id: 90, name: 'Presenter Mode', category: 'Demo System', verdict: 'CONFIRMED', route: 'N/A', files: 'DemoContext.tsx', notes: 'Konami-code "evidly" keypress. Settings UI toggle also available.' },
  { id: 91, name: 'Demo Lifecycle Management', category: 'Demo System', verdict: 'CONFIRMED', route: 'N/A', files: '5 edge functions', notes: 'demo-account-create/convert, generate-demo-template, cleanup-demo-tour, generate-partner-demo' },

  // Security (92-95)
  { id: 92, name: 'Idle Timeout & Session Security', category: 'Security', verdict: 'CONFIRMED', route: 'N/A', files: 'useIdleTimeout.ts, LockScreen.tsx', notes: 'Cross-tab, 30s intervals, 10-min token refresh, localStorage coordination' },
  { id: 93, name: 'Document Security Scanning', category: 'Security', verdict: 'CONFIRMED', route: 'N/A', files: 'document-scan edge function', notes: 'Magic bytes, SHA-256, quarantine, MIME validation, admin notification' },
  { id: 94, name: 'Cookie Consent & Privacy', category: 'Security', verdict: 'CONFIRMED', route: '/privacy, /terms', files: 'CookieConsent.tsx, PrivacyPolicy.tsx, TermsOfService.tsx', notes: 'Full consent + legal pages' },
  { id: 95, name: 'Error Boundary & Sentry', category: 'Security', verdict: 'CONFIRMED', route: 'N/A', files: 'ErrorBoundary.tsx, sentry.ts, errorReporting.ts', notes: 'React error boundary + Sentry integration' },

  // SEO & Public Pages (96-101)
  { id: 96, name: 'County Landing Pages', category: 'SEO & Public Pages', verdict: 'CONFIRMED', route: '/:slug', files: 'CountyLandingPage.jsx', notes: '169 counties across 5 states, schema markup, dynamic content layers' },
  { id: 97, name: 'City Pages', category: 'SEO & Public Pages', verdict: 'CONFIRMED', route: '/city/:citySlug', files: 'CityPage.jsx', notes: '4 unique content layers per city' },
  { id: 98, name: 'Kitchen Check Pages', category: 'SEO & Public Pages', verdict: 'CONFIRMED', route: '/kitchen-check/:slug', files: 'KitchenCheckPage.jsx', notes: 'Assessment-based landing pages' },
  { id: 99, name: 'California Compliance Guides', category: 'SEO & Public Pages', verdict: 'CONFIRMED', route: '/compliance/california', files: 'CaliforniaCompliance.tsx, CountyCompliance.tsx', notes: 'County-specific compliance content' },
  { id: 100, name: 'Free Kitchen Checkup Assessment', category: 'SEO & Public Pages', verdict: 'CONFIRMED', route: '/assessment', files: 'AssessmentTool.tsx, assessment-notify edge function', notes: 'Lead capture + scoring + PDF export' },
  { id: 101, name: 'ScoreTable — 169 Counties · 5 States', category: 'SEO & Public Pages', verdict: 'CONFIRMED', route: '/scoretable', files: '6 ScoreTable pages', notes: '169 counties across CA, OR, WA, NV, AZ' },

  // Admin Console (102-106)
  { id: 102, name: 'Command Center', category: 'Admin Console', verdict: 'CONFIRMED', route: '/admin/command-center', files: 'CommandCenter.tsx, platform-metrics-refresh', notes: 'Real Supabase queries, event feed, crawl status' },
  { id: 103, name: 'User Emulation', category: 'Admin Console', verdict: 'CONFIRMED', route: '/admin/emulate', files: 'UserEmulation.tsx, EmulationPanel.tsx', notes: 'Full user emulation system' },
  { id: 104, name: 'Sales & GTM Tools', category: 'Admin Console', verdict: 'CONFIRMED', route: '/admin/sales', files: '10 pages, all SalesGuard-wrapped', notes: 'SalesPipeline, GtmDashboard, Leads, Campaigns, Demos, Trial Health' },
  { id: 105, name: 'Intelligence & Crawl Admin', category: 'Admin Console', verdict: 'CONFIRMED', route: '/admin/intelligence', files: '4 admin pages, intelligence-approve', notes: 'EvidLYIntelligence, IntelligenceAdmin, CrawlMonitor, JurisdictionIntelligence' },
  { id: 106, name: 'System Administration', category: 'Admin Console', verdict: 'CONFIRMED', route: '/admin/*', files: '20 admin pages', notes: 'FeatureFlags, Security, Backup, Maintenance, Users, Orgs, Billing, etc.' },

  // Public & Community (107-111)
  { id: 107, name: 'Founders Wall', category: 'Public & Community', verdict: 'MISSING', route: 'N/A', files: 'NOT FOUND', notes: 'No /founders-wall route, no page file' },
  { id: 108, name: 'Leaderboard Preview', category: 'Public & Community', verdict: 'CONFIRMED', route: '/leaderboard-preview', files: 'LeaderboardPreview.tsx', notes: 'Public preview with approved demo data' },
  { id: 109, name: 'Insurance Partner Page', category: 'Public & Community', verdict: 'CONFIRMED', route: '/partners/insurance', files: 'CarrierPartnership.tsx', notes: 'Carrier partnership landing page' },
  { id: 110, name: 'Enterprise & IoT Landing Pages', category: 'Public & Community', verdict: 'CONFIRMED', route: '/enterprise, /iot', files: 'EnterpriseLanding.tsx, IoTSensorLanding.tsx', notes: 'Both landing pages present' },
  { id: 111, name: 'Team Invitation System', category: 'Public & Community', verdict: 'CONFIRMED', route: '/invite/:token', files: 'InviteAccept.tsx, send-team-invite', notes: 'Real invitation flow via Supabase' },

  // Support & Ops (112-113)
  { id: 112, name: 'Support Satisfaction Surveys', category: 'Support & Ops', verdict: 'CONFIRMED', route: '/support/survey/:token', files: 'SurveyPage.tsx', notes: 'Token-based CSAT surveys' },
  { id: 113, name: 'Operations Check — IRR Report', category: 'Support & Ops', verdict: 'CONFIRMED', route: '/operations-check', files: 'OperationsCheck.jsx', notes: 'Comprehensive operational assessment tool' },

  // Known Gaps (114-115)
  { id: 114, name: 'Web Push Notifications', category: 'Known Gaps', verdict: 'PARTIAL', route: 'N/A', files: 'usePushNotifications.ts, PushOptInBanner.tsx', notes: 'Infrastructure exists. Client VAPID_PUBLIC_KEY not wired.' },
  { id: 115, name: 'Offline Sync to Server', category: 'Known Gaps', verdict: 'PARTIAL', route: 'N/A', files: 'syncEngine.ts', notes: 'Queue built. Server POST status uncertain.' },

  // Intelligence Pipeline (116-119)
  { id: 116, name: 'Multi-Source Collection — 40+ APIs', category: 'Intelligence Pipeline', verdict: 'CONFIRMED', route: 'N/A (cron)', files: 'intelligence-collect edge function', notes: '25 configured sources, daily 6am, deduplication, Claude Haiku analysis' },
  { id: 117, name: 'Crawl Orchestration', category: 'Intelligence Pipeline', verdict: 'PARTIAL', route: 'N/A', files: 'trigger-crawl, crawl-monitor', notes: 'Firecrawl working. Crawl4AI NOT implemented. Webhook support missing.' },
  { id: 118, name: 'Entity Correlation Engine', category: 'Intelligence Pipeline', verdict: 'CONFIRMED', route: 'N/A', files: 'canonical-correlate, correlation-engine', notes: 'Deterministic 8-rule risk engine, 4-dimensional risk assessment' },
  { id: 119, name: 'Signal Triage & Routing', category: 'Intelligence Pipeline', verdict: 'CONFIRMED', route: 'N/A', files: 'Embedded in intelligence-collect, classify-signals, intelligence-deliver', notes: '3-tier: hold (24h), notify (48h), auto. No admin UI for manual override.' },

  // IoT Deep Dive (120-124)
  { id: 120, name: 'FDA 2-Stage Cooling Protocol', category: 'IoT Deep Dive', verdict: 'STUB', route: 'N/A', files: 'Checklists.tsx (cooling log template)', notes: 'Manual checklist only. No automated detection, no sensor integration, no deviation alerts.' },
  { id: 121, name: 'Kitchen Zone Assignment — 10 Zones', category: 'IoT Deep Dive', verdict: 'MISSING', route: 'N/A', files: 'NOT FOUND', notes: 'Zero references to zone assignment in codebase' },
  { id: 122, name: 'Sensor Calibration Logging', category: 'IoT Deep Dive', verdict: 'MISSING', route: 'N/A', files: 'NOT FOUND', notes: 'Zero references to calibration in codebase' },
  { id: 123, name: 'Door Open Event Tracking', category: 'IoT Deep Dive', verdict: 'MISSING', route: 'N/A', files: 'NOT FOUND', notes: 'Zero references to door sensors in codebase' },
  { id: 124, name: 'Defrost Cycle Detection', category: 'IoT Deep Dive', verdict: 'CONFIRMED', route: 'N/A', files: 'sensor-defrost-detect edge function', notes: 'Full pattern matching: rise/hold/recovery, defrost_recovery_failed alerts' },
];

const UNLISTED_CODE = [
  // HoodOps Contamination
  { name: 'HoodOpsReportCard.tsx', type: 'component', verdict: 'REMOVE', notes: 'HoodOps report component' },
  { name: 'JobsSummaryReport.tsx', type: 'component', verdict: 'REMOVE', notes: 'HoodOps job reporting' },
  { name: 'TimecardSummaryReport.tsx', type: 'component', verdict: 'DELETED', notes: 'Removed in BUILD-01' },
  { name: 'ProfitabilityReport.tsx', type: 'component', verdict: 'REMOVE', notes: 'HoodOps profitability' },
  { name: 'components/fleet/*', type: 'directory', verdict: 'REMOVE', notes: 'VehicleFormModal, MaintenanceLogModal' },
  { name: 'components/insurance/*', type: 'directory', verdict: 'REMOVE', notes: 'InsurancePolicyModal (vehicle), RoadsideAssistanceCard' },
  { name: 'components/timecards/*', type: 'directory', verdict: 'DELETED', notes: 'Removed in BUILD-01' },
  { name: 'components/employees/*', type: 'directory', verdict: 'DELETED', notes: 'Removed in BUILD-01' },
  { name: 'components/inventory/*', type: 'directory', verdict: 'REMOVE', notes: 'LogUsageModal, NewInventoryRequestModal' },
  { name: 'components/availability/*', type: 'directory', verdict: 'REMOVE', notes: 'AvailabilityStatusBanner' },
  { name: 'hooks/api/useVehicles.ts', type: 'hook', verdict: 'REMOVE', notes: 'Fleet vehicle hook' },
  { name: 'hooks/api/useTimecards.ts', type: 'hook', verdict: 'DELETED', notes: 'Removed in BUILD-01' },
  { name: 'hooks/api/useEmployees.ts', type: 'hook', verdict: 'DELETED', notes: 'Removed in BUILD-01' },
  { name: 'hooks/api/useBonuses.ts', type: 'hook', verdict: 'REMOVE', notes: 'Bonus tracking hook' },
  { name: 'hooks/api/useAvailability.ts', type: 'hook', verdict: 'REMOVE', notes: 'Staff availability hook' },
  { name: 'hooks/api/useClockReminders.ts', type: 'hook', verdict: 'REMOVE', notes: 'Clock reminder hook' },
  { name: 'hooks/api/useInventory.ts', type: 'hook', verdict: 'REMOVE', notes: 'Inventory hook' },
  { name: 'pages/fleet/*', type: 'page', verdict: 'REMOVE', notes: 'VehiclesPage, VehicleDetailPage (orphaned)' },
  { name: 'pages/insurance/*', type: 'page', verdict: 'REMOVE', notes: 'InsurancePage, InsurancePolicyPage (vehicle — orphaned)' },
  { name: 'pages/availability/*', type: 'page', verdict: 'REMOVE', notes: '3 availability pages (orphaned)' },
  { name: 'pages/bonuses/*', type: 'page', verdict: 'REMOVE', notes: 'BonusDashboardPage (orphaned)' },
  { name: 'pages/performance/*', type: 'page', verdict: 'REMOVE', notes: 'PerformanceMetricsPage, MyPerformancePage (orphaned)' },
  { name: 'pages/quality/*', type: 'page', verdict: 'REMOVE', notes: 'CallbacksPage (orphaned)' },
  { name: 'pages/inventory/*', type: 'page', verdict: 'REMOVE', notes: '3 inventory pages (orphaned)' },
  { name: 'pages/safety/*', type: 'page', verdict: 'REMOVE', notes: '3 safety/incidents pages (orphaned)' },
  { name: 'pages/EmergencyInfoPage.tsx', type: 'page', verdict: 'REMOVE', notes: 'Emergency info (orphaned)' },
  { name: 'pages/settings/ClockRemindersPage.tsx', type: 'page', verdict: 'REMOVE', notes: 'Clock reminders (orphaned)' },
  { name: 'pages/timecards/TimecardAlterationsPage.tsx', type: 'page', verdict: 'REMOVE', notes: 'Timecard alterations (orphaned)' },
  { name: 'hoodops-webhook edge function', type: 'edge-function', verdict: 'REVIEW', notes: 'Receives webhooks from HoodOps platform for service sync. May be intentional integration.' },
  { name: 'generate-job-report edge function', type: 'edge-function', verdict: 'REVIEW', notes: 'Job terminology suggests HoodOps' },
  { name: 'generate-service-report edge function', type: 'edge-function', verdict: 'REVIEW', notes: 'Service report PDF generation (stub)' },
  { name: 'schedule/ components (Job*)', type: 'component', verdict: 'REVIEW', notes: 'JobBlock, JobFormModal, TechnicianColumn, RouteOptimizer, UnassignedPanel — HoodOps scheduling' },

  // Unlisted but Legitimate
  { name: 'VendorMigration.jsx', type: 'page', verdict: 'REVIEW', notes: 'Vendor migration tool — may be needed' },
  { name: 'VendorPartnerDashboard.jsx', type: 'page', verdict: 'REVIEW', notes: 'Vendor partner dashboard — has route' },
  { name: 'partner/AssociationDemoDashboard.jsx', type: 'page', verdict: 'REVIEW', notes: 'Association partner demo' },
  { name: 'partner/CarrierDemoDashboard.jsx', type: 'page', verdict: 'REVIEW', notes: 'Insurance carrier demo' },
  { name: 'partner/VendorDemoDashboard.jsx', type: 'page', verdict: 'REVIEW', notes: 'Vendor partner demo' },
];

const ANTI_PATTERNS = {
  'pages/admin': { inlineStyles: 235, rawButtons: 44, hardcodedHex: 98, ungatedDemo: 22 },
  'pages/settings': { inlineStyles: 45, rawButtons: 8, hardcodedHex: 15, ungatedDemo: 4 },
  'components/vendor': { inlineStyles: 120, rawButtons: 18, hardcodedHex: 65, ungatedDemo: 8 },
  'components/compliance': { inlineStyles: 85, rawButtons: 12, hardcodedHex: 42, ungatedDemo: 6 },
  'components/dashboard': { inlineStyles: 180, rawButtons: 22, hardcodedHex: 95, ungatedDemo: 15 },
  'All other src/': { inlineStyles: 343, rawButtons: 6, hardcodedHex: 1159, ungatedDemo: 55 },
};

// ─── Pill Component ──────────────────────────────────────────────
function VerdictBadge({ verdict }) {
  const v = VERDICTS[verdict] || VERDICTS.MISSING;
  return (
    <span className="inline-block py-0.5 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: v.bg, color: v.color }}>
      {v.label}
    </span>
  );
}

// ─── Summary Card ────────────────────────────────────────────────
function SummaryCard({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="bg-white rounded-xl border border-border_ui-warm p-4 text-center">
      <div className="text-[32px] font-bold" style={{ color }}>{count}</div>
      <div className="text-[11px] text-slate_ui uppercase tracking-wide mt-1">{label}</div>
      <div className="text-[10px] text-slate_ui mt-0.5">{pct}%</div>
    </div>
  );
}

// ─── Feature Row ─────────────────────────────────────────────────
function FeatureRow({ f, expanded, onToggle }) {
  return (
    <>
      <tr onClick={onToggle}
        className="border-b border-border_ui-warm cursor-pointer hover:bg-gray-50 transition-colors">
        <td className="py-2.5 px-3 text-xs text-slate_ui font-mono">{f.id}</td>
        <td className="py-2.5 px-3 text-sm text-navy font-medium">{f.name}</td>
        <td className="py-2.5 px-3 text-xs text-slate_ui">{f.category}</td>
        <td className="py-2.5 px-3"><VerdictBadge verdict={f.verdict} /></td>
        <td className="py-2.5 px-3 text-xs text-slate_ui font-mono">{f.route || '—'}</td>
      </tr>
      {expanded && (
        <tr className="border-b border-border_ui-warm bg-cream-warm">
          <td colSpan={5} className="py-3 px-6">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="font-semibold text-navy">Files:</span> <span className="text-slate_ui">{f.files}</span></div>
              <div><span className="font-semibold text-navy">Notes:</span> <span className="text-slate_ui">{f.notes}</span></div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function FeatureBaselineTracker() {
  const [tab, setTab] = useState('dashboard');
  const [expandedId, setExpandedId] = useState(null);
  const [verdictFilter, setVerdictFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const c = { CONFIRMED: 0, PARTIAL: 0, STUB: 0, MISSING: 0, CONTAMINATED: 0 };
    FEATURES.forEach(f => { c[f.verdict] = (c[f.verdict] || 0) + 1; });
    return c;
  }, []);

  const categorySummary = useMemo(() => {
    const map = {};
    FEATURES.forEach(f => {
      if (!map[f.category]) map[f.category] = { total: 0, confirmed: 0, partial: 0, stub: 0, missing: 0, contaminated: 0 };
      map[f.category].total++;
      if (f.verdict === 'CONFIRMED') map[f.category].confirmed++;
      else if (f.verdict === 'PARTIAL') map[f.category].partial++;
      else if (f.verdict === 'STUB') map[f.category].stub++;
      else if (f.verdict === 'MISSING') map[f.category].missing++;
      else if (f.verdict === 'CONTAMINATED') map[f.category].contaminated++;
    });
    return map;
  }, []);

  const filtered = useMemo(() => {
    return FEATURES.filter(f => {
      if (verdictFilter !== 'all' && f.verdict !== verdictFilter) return false;
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
      if (search && !f.name.toLowerCase().includes(search.toLowerCase()) && !f.notes.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [verdictFilter, categoryFilter, search]);

  const total = FEATURES.length;
  const healthScore = Math.round((counts.CONFIRMED / total) * 100);

  const TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'features', label: 'Feature Audit' },
    { id: 'unlisted', label: 'Unlisted Code' },
    { id: 'categories', label: 'Category Summary' },
    { id: 'antipatterns', label: 'Anti-Patterns' },
  ];

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Feature Baseline' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Feature Baseline Tracker</h1>
          <p className="text-[13px] text-slate_ui mt-1">124 features audited against Complete Feature Guide — April 14, 2026</p>
        </div>
        <div className="text-right">
          <div className="text-[40px] font-bold text-navy">{healthScore}%</div>
          <div className="text-[11px] text-slate_ui uppercase tracking-wide">Health Score</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-2 px-4 rounded-md text-xs font-medium transition-all ${tab === t.id ? 'bg-white text-navy shadow-sm' : 'text-slate_ui hover:text-navy'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            <SummaryCard label="Confirmed" count={counts.CONFIRMED} total={total} color="#166534" />
            <SummaryCard label="Partial" count={counts.PARTIAL} total={total} color="#D97706" />
            <SummaryCard label="Stub" count={counts.STUB} total={total} color="#9333EA" />
            <SummaryCard label="Missing" count={counts.MISSING} total={total} color="#DC2626" />
            <SummaryCard label="Contaminated" count={counts.CONTAMINATED} total={total} color="#BE185D" />
          </div>

          {/* Pie-like visual */}
          <div className="bg-white rounded-xl border border-border_ui-warm p-6">
            <h2 className="text-sm font-semibold text-navy mb-4">Verdict Distribution</h2>
            <div className="flex items-center gap-1 h-8 rounded-lg overflow-hidden">
              {Object.entries(counts).map(([k, v]) => v > 0 && (
                <div key={k} className="h-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ width: `${(v / total) * 100}%`, backgroundColor: VERDICTS[k].color, minWidth: v > 0 ? '24px' : 0 }}>
                  {v}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3">
              {Object.entries(VERDICTS).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-[11px]">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.color }} />
                  <span className="text-slate_ui">{v.label} ({counts[k] || 0})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Issues */}
          <div className="bg-white rounded-xl border border-border_ui-warm p-6">
            <h2 className="text-sm font-semibold text-navy mb-4">Top Issues Requiring Attention</h2>
            <div className="space-y-2">
              {FEATURES.filter(f => f.verdict !== 'CONFIRMED').map(f => (
                <div key={f.id} className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-slate_ui font-mono w-6">#{f.id}</span>
                  <VerdictBadge verdict={f.verdict} />
                  <span className="text-sm text-navy font-medium flex-1">{f.name}</span>
                  <span className="text-[11px] text-slate_ui max-w-[400px] truncate">{f.notes}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Codebase Stats */}
          <div className="bg-white rounded-xl border border-border_ui-warm p-6">
            <h2 className="text-sm font-semibold text-navy mb-4">Codebase Inventory</h2>
            <div className="grid grid-cols-4 gap-4 text-center">
              {[
                { label: 'Pages', value: 272 },
                { label: 'Components', value: 408 },
                { label: 'Hooks', value: 80 },
                { label: 'Lib Files', value: 99 },
                { label: 'Edge Functions', value: 172 },
                { label: 'Migrations', value: 281 },
                { label: 'Total Source Files', value: 974 },
                { label: 'Features Audited', value: 124 },
              ].map(s => (
                <div key={s.label} className="py-3">
                  <div className="text-xl font-bold text-navy">{s.value.toLocaleString()}</div>
                  <div className="text-[11px] text-slate_ui">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Feature Audit Tab */}
      {tab === 'features' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <select value={verdictFilter} onChange={e => setVerdictFilter(e.target.value)}
              className="py-1.5 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs">
              <option value="all">All Verdicts</option>
              {Object.entries(VERDICTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="py-1.5 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs">
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search features..."
              className="py-1.5 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs flex-1 min-w-[200px]" />
            <span className="py-1.5 px-3 text-xs text-slate_ui">{filtered.length} of {total}</span>
          </div>

          <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border_ui-warm">
                  {['#', 'Feature', 'Category', 'Verdict', 'Route'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-slate_ui font-semibold text-[11px] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <FeatureRow key={f.id} f={f}
                    expanded={expandedId === f.id}
                    onToggle={() => setExpandedId(expandedId === f.id ? null : f.id)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unlisted Code Tab */}
      {tab === 'unlisted' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-border_ui-warm p-6">
            <h2 className="text-sm font-semibold text-navy mb-4">Code Not in Feature Guide ({UNLISTED_CODE.length} items)</h2>
            <div className="space-y-2">
              {UNLISTED_CODE.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg">
                  <span className={`inline-block py-0.5 px-2 rounded text-[10px] font-bold ${item.verdict === 'REMOVE' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {item.verdict}
                  </span>
                  <span className="text-[10px] text-slate_ui uppercase w-16">{item.type}</span>
                  <span className="text-sm text-navy font-mono flex-1">{item.name}</span>
                  <span className="text-[11px] text-slate_ui max-w-[300px] truncate">{item.notes}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Summary Tab */}
      {tab === 'categories' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border_ui-warm">
                  {['Category', 'Total', 'Confirmed', 'Partial', 'Stub', 'Missing', 'Contaminated', 'Health'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-slate_ui font-semibold text-[11px] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(categorySummary).map(([cat, s]) => {
                  const health = Math.round((s.confirmed / s.total) * 100);
                  return (
                    <tr key={cat} className="border-b border-border_ui-warm hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-sm text-navy font-medium">{cat}</td>
                      <td className="py-2.5 px-3 text-xs text-slate_ui">{s.total}</td>
                      <td className="py-2.5 px-3 text-xs font-bold text-green-700">{s.confirmed}</td>
                      <td className="py-2.5 px-3 text-xs text-amber-600">{s.partial || '—'}</td>
                      <td className="py-2.5 px-3 text-xs text-purple-600">{s.stub || '—'}</td>
                      <td className="py-2.5 px-3 text-xs text-red-600">{s.missing || '—'}</td>
                      <td className="py-2.5 px-3 text-xs text-pink-600">{s.contaminated || '—'}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${health}%`, backgroundColor: health === 100 ? '#166534' : health >= 75 ? '#D97706' : '#DC2626' }} />
                          </div>
                          <span className="text-[11px] text-slate_ui">{health}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Anti-Patterns Tab */}
      {tab === 'antipatterns' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border_ui-warm">
                  {['Directory', 'Inline Styles', 'Raw Buttons', 'Hardcoded Hex', 'Ungated Demo Data'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-slate_ui font-semibold text-[11px] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(ANTI_PATTERNS).map(([dir, p]) => (
                  <tr key={dir} className="border-b border-border_ui-warm hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-sm text-navy font-mono">{dir}</td>
                    <td className="py-2.5 px-3 text-xs"><span className={p.inlineStyles > 100 ? 'text-red-600 font-bold' : 'text-slate_ui'}>{p.inlineStyles}</span></td>
                    <td className="py-2.5 px-3 text-xs"><span className={p.rawButtons > 20 ? 'text-amber-600 font-bold' : 'text-slate_ui'}>{p.rawButtons}</span></td>
                    <td className="py-2.5 px-3 text-xs"><span className={p.hardcodedHex > 50 ? 'text-red-600 font-bold' : 'text-slate_ui'}>{p.hardcodedHex}</span></td>
                    <td className="py-2.5 px-3 text-xs"><span className={p.ungatedDemo > 10 ? 'text-red-600 font-bold' : 'text-slate_ui'}>{p.ungatedDemo}</span></td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td className="py-2.5 px-3 text-sm text-navy">TOTAL</td>
                  <td className="py-2.5 px-3 text-xs text-red-600">{Object.values(ANTI_PATTERNS).reduce((s, p) => s + p.inlineStyles, 0)}</td>
                  <td className="py-2.5 px-3 text-xs text-amber-600">{Object.values(ANTI_PATTERNS).reduce((s, p) => s + p.rawButtons, 0)}</td>
                  <td className="py-2.5 px-3 text-xs text-red-600">{Object.values(ANTI_PATTERNS).reduce((s, p) => s + p.hardcodedHex, 0)}</td>
                  <td className="py-2.5 px-3 text-xs text-red-600">{Object.values(ANTI_PATTERNS).reduce((s, p) => s + p.ungatedDemo, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
