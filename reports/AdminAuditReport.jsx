/**
 * ADMIN-AUDIT-REPORT
 * Generated: 2026-04-11
 * Scope: Every admin, enterprise, partner, and settings page
 * Total pages audited: 68
 * Total lines of code: 38,491
 *
 * READ ONLY — No source files were changed.
 */
import { useState } from 'react';

/* ─── palette ─── */
const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const CREAM = '#FAF7F0';
const GREEN = '#166534';
const RED = '#991B1B';
const WHITE = '#FFFFFF';

/* ─── grading helper ─── */
function gradeColor(g) {
  if (g.startsWith('A')) return GREEN;
  if (g.startsWith('B')) return NAVY;
  if (g.startsWith('C')) return GOLD;
  return RED;
}

function gradeBg(g) {
  if (g.startsWith('A')) return '#f0fdf4';
  if (g.startsWith('B')) return '#f0f4ff';
  if (g.startsWith('C')) return '#fefce8';
  return '#fef2f2';
}

/* ═══════════════════════════════════════════════════════════════
   TAB 1 — PAGE INVENTORY (68 pages)
   ═══════════════════════════════════════════════════════════════ */
const INVENTORY = [
  // ── src/pages/admin/ (50 files) ──
  { path: '/admin', file: 'AdminHome.tsx', lines: 635, grade: 'B+', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin (redirect)', file: 'AdminDashboard.tsx', lines: 943, grade: 'B', sidebar: true, db: true, fake: 'DEMO_* x6 (isDemoMode)', shared: 'AdminBreadcrumb, KpiTile, StatCardRow' },
  { path: '/admin/command-center', file: 'CommandCenter.tsx', lines: 393, grade: 'B+', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/configure', file: 'Configure.tsx', lines: 1284, grade: 'C+', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/event-log', file: 'EventLog.tsx', lines: 232, grade: 'A-', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb, EmptyState' },
  { path: '/admin/intelligence', file: 'EvidLYIntelligence.tsx', lines: 2469, grade: 'B-', sidebar: true, db: true, fake: 'SAMPLE_CORRELATIONS (isDemoMode)', shared: 'AdminBreadcrumb' },
  { path: '/admin/intelligence-admin', file: 'IntelligenceAdmin.tsx', lines: 2398, grade: 'B-', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/crawl-monitor', file: 'AdminCrawlMonitor.tsx', lines: 397, grade: 'B+', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/rfp-monitor', file: 'RfpIntelligence.tsx', lines: 1458, grade: 'B-', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/jurisdiction-intelligence', file: 'JurisdictionIntelligence.tsx', lines: 210, grade: 'A', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/demo-generator', file: 'DemoGenerator.tsx', lines: 591, grade: 'B', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/demo-launcher', file: 'DemoLauncher.tsx', lines: 455, grade: 'B+', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/demo-pipeline', file: 'DemoPipeline.tsx', lines: 456, grade: 'B', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/demo/dashboard', file: 'DemoDashboard.tsx', lines: 330, grade: 'C+', sidebar: false, db: false, fake: 'DEMO_* (intentional ref page)', shared: 'None' },
  { path: '/admin/demo-tours', file: 'DemoTours.jsx', lines: 742, grade: 'B', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/partner-demos', file: 'PartnerDemos.jsx', lines: 715, grade: 'B', sidebar: true, db: true, fake: 'TRIBAL_OPTIONS (form data)', shared: 'AdminBreadcrumb' },
  { path: '/admin/guided-tours', file: 'GuidedTours.tsx', lines: 1378, grade: 'B', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/kitchen-checkup', file: 'AssessmentLeads.tsx', lines: 436, grade: 'B+', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/scoretable', file: 'AdminScoreTable.tsx', lines: 164, grade: 'A', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/testimonials', file: 'AdminTestimonials.tsx', lines: 280, grade: 'A-', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/sales', file: 'SalesPipeline.tsx', lines: 405, grade: 'B+', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/gtm', file: 'GtmDashboard.tsx', lines: 200, grade: 'B', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/campaigns', file: 'MarketingCampaigns.tsx', lines: 516, grade: 'B', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/violation-outreach', file: 'ViolationOutreach.tsx', lines: 592, grade: 'C', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/email-sequences', file: 'EmailSequenceManager.tsx', lines: 959, grade: 'C', sidebar: true, db: true, fake: 'DEMO_* x4 (isDemoMode)', shared: 'AdminBreadcrumb' },
  { path: '/admin/trial-health', file: 'TrialHealth.tsx', lines: 551, grade: 'B-', sidebar: true, db: true, fake: 'DEMO_* x3 (isDemoMode)', shared: 'AdminBreadcrumb, KpiTile' },
  { path: '/admin/support', file: 'SupportTickets.tsx', lines: 1157, grade: 'B-', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/support/survey/:token', file: 'SurveyPage.tsx', lines: 241, grade: 'B+', sidebar: false, db: true, fake: false, shared: 'None' },
  { path: '/admin/feature-flags', file: 'FeatureFlags.tsx', lines: 771, grade: 'B', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/api-keys', file: 'InsuranceApiKeys.tsx', lines: 561, grade: 'B', sidebar: true, db: true, fake: 'DEMO_* x2 (isDemoMode)', shared: 'AdminBreadcrumb, KpiTile' },
  { path: '/admin/security-settings', file: 'SecuritySettings.tsx', lines: 452, grade: 'B', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/security', file: 'AdminSecurity.tsx', lines: 554, grade: 'C+', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/audit-log', file: 'AdminAuditLog.tsx', lines: 465, grade: 'C', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/users', file: 'AdminUsers.tsx', lines: 597, grade: 'C+', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb, OrgCombobox' },
  { path: '/admin/orgs', file: 'AdminOrgs.tsx', lines: 336, grade: 'C+', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/billing', file: 'AdminBilling.tsx', lines: 235, grade: 'B', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/k2c', file: 'AdminK2C.tsx', lines: 218, grade: 'B', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/reports', file: 'AdminReports.tsx', lines: 315, grade: 'B', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/vendor-connect', file: 'AdminVendorConnect.jsx', lines: 395, grade: 'B', sidebar: false, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/emulate', file: 'UserEmulation.tsx', lines: 261, grade: 'B-', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb, EmulationPanel' },
  { path: '/admin/provisioning', file: 'UserProvisioning.tsx', lines: 536, grade: 'C', sidebar: false, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/staff', file: 'StaffRoles.tsx', lines: 856, grade: 'C+', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/role-preview', file: 'RolePreview.jsx', lines: 737, grade: 'D', sidebar: true, db: false, fake: 'PD object (341 lines hardcoded)', shared: 'None' },
  { path: '/admin/backup', file: 'DatabaseBackup.tsx', lines: 151, grade: 'B-', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/maintenance', file: 'MaintenanceMode.tsx', lines: 229, grade: 'B-', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/vault', file: 'DocumentVault.tsx', lines: 287, grade: 'B', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/messages', file: 'SystemMessages.tsx', lines: 261, grade: 'B-', sidebar: false, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/remote-connect', file: 'RemoteConnect.tsx', lines: 563, grade: 'B+', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/verification', file: 'VerificationReport.tsx', lines: 554, grade: 'A-', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb, KpiTile, VerificationPanel' },
  { path: '/admin/system/edge-functions', file: 'system/EdgeFunctions.tsx', lines: 1073, grade: 'A-', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },

  // ── src/pages/ — admin outside /admin/ (5 files) ──
  { path: '/admin/onboarding', file: 'AdminClientOnboarding.tsx', lines: 453, grade: 'B+', sidebar: true, db: true, fake: 'TRIBAL_OPTIONS (form data)', shared: 'AdminBreadcrumb' },
  { path: '/admin (hub)', file: 'AdminHub.tsx', lines: 63, grade: 'A', sidebar: false, db: false, fake: false, shared: 'None (nav container)' },
  { path: '/admin/intelligence-queue', file: 'AdminIntelligenceQueue.tsx', lines: 580, grade: 'B+', sidebar: true, db: true, fake: false, shared: 'AdminBreadcrumb' },
  { path: '/admin/login', file: 'AdminLogin.tsx', lines: 164, grade: 'A-', sidebar: false, db: true, fake: false, shared: 'None (auth page)' },
  { path: '/admin/regulatory-changes', file: 'AdminRegulatoryChanges.tsx', lines: 688, grade: 'B+', sidebar: true, db: true, fake: 'DEMO_SEED (isDemoMode)', shared: 'AdminBreadcrumb' },

  // ── src/pages/ — enterprise (3 files) ──
  { path: '/enterprise/dashboard', file: 'EnterpriseDashboard.tsx', lines: 2072, grade: 'C+', sidebar: false, db: true, fake: 'demoData imports x10', shared: 'None' },
  { path: '/enterprise/executive', file: 'EnterpriseExecutive.tsx', lines: 560, grade: 'C+', sidebar: false, db: true, fake: 'demoData imports x8', shared: 'None' },
  { path: '/enterprise', file: 'EnterpriseLanding.tsx', lines: 136, grade: 'B-', sidebar: false, db: false, fake: false, shared: 'None' },

  // ── src/pages/ — partner (2 files) ──
  { path: '/partner/carrier', file: 'CarrierPartnership.tsx', lines: 132, grade: 'A', sidebar: false, db: false, fake: false, shared: 'None (marketing page)' },
  { path: '/partner/vendor-demo', file: 'VendorPartnerDashboard.jsx', lines: 417, grade: 'B+', sidebar: false, db: true, fake: false, shared: 'None' },

  // ── src/pages/settings/ (8 files) ──
  { path: '/settings', file: 'SettingsPage.tsx', lines: 128, grade: 'C', sidebar: true, db: false, fake: false, shared: 'None' },
  { path: '/settings/billing', file: 'BillingPage.tsx', lines: 330, grade: 'D', sidebar: true, db: false, fake: 'PLAN_FEATURES (WRONG PRICING)', shared: 'None' },
  { path: '/settings/clock-reminders', file: 'ClockRemindersPage.tsx', lines: 455, grade: 'B', sidebar: true, db: true, fake: false, shared: 'None' },
  { path: '/settings/integrations', file: 'IntegrationsPage.tsx', lines: 191, grade: 'B+', sidebar: true, db: true, fake: false, shared: 'None' },
  { path: '/settings/notifications', file: 'NotificationsPage.tsx', lines: 306, grade: 'B', sidebar: true, db: true, fake: false, shared: 'None' },
  { path: '/settings/service-types', file: 'ServiceTypesPage.tsx', lines: 247, grade: 'D', sidebar: true, db: true, fake: 'DEMO_SERVICE_TYPES', shared: 'None' },
  { path: '/settings/team', file: 'TeamRolesPage.tsx', lines: 186, grade: 'C+', sidebar: true, db: true, fake: false, shared: 'None' },
  { path: '/settings/company', file: 'CompanyProfilePage.tsx', lines: 389, grade: 'C', sidebar: true, db: true, fake: false, shared: 'None' },
];

/* ═══════════════════════════════════════════════════════════════
   TAB 2 — ANTI-PATTERN COUNTS
   ═══════════════════════════════════════════════════════════════ */
const ANTI_PATTERNS = [
  // file, inlineStyles, grays, rawButtons, hardcodedHex, lines
  // ── admin/ ──
  { file: 'EvidLYIntelligence.tsx', inlineStyles: 327, grays: 0, rawButtons: 13, hex: 62, lines: 2469 },
  { file: 'IntelligenceAdmin.tsx', inlineStyles: 275, grays: 0, rawButtons: 35, hex: 28, lines: 2398 },
  { file: 'Configure.tsx', inlineStyles: 242, grays: 0, rawButtons: 20, hex: 55, lines: 1284 },
  { file: 'RfpIntelligence.tsx', inlineStyles: 166, grays: 0, rawButtons: 22, hex: 18, lines: 1458 },
  { file: 'SupportTickets.tsx', inlineStyles: 137, grays: 0, rawButtons: 10, hex: 14, lines: 1157 },
  { file: 'EdgeFunctions.tsx', inlineStyles: 124, grays: 0, rawButtons: 8, hex: 12, lines: 1073 },
  { file: 'RolePreview.jsx', inlineStyles: 112, grays: 0, rawButtons: 4, hex: 36, lines: 737 },
  { file: 'AdminDashboard.tsx', inlineStyles: 107, grays: 0, rawButtons: 8, hex: 39, lines: 943 },
  { file: 'StaffRoles.tsx', inlineStyles: 102, grays: 0, rawButtons: 11, hex: 10, lines: 856 },
  { file: 'ViolationOutreach.tsx', inlineStyles: 89, grays: 0, rawButtons: 15, hex: 8, lines: 592 },
  { file: 'UserProvisioning.tsx', inlineStyles: 85, grays: 0, rawButtons: 9, hex: 6, lines: 536 },
  { file: 'VerificationReport.tsx', inlineStyles: 81, grays: 0, rawButtons: 5, hex: 4, lines: 554 },
  { file: 'FeatureFlags.tsx', inlineStyles: 81, grays: 0, rawButtons: 10, hex: 5, lines: 771 },
  { file: 'GuidedTours.tsx', inlineStyles: 74, grays: 0, rawButtons: 21, hex: 95, lines: 1378 },
  { file: 'DemoDashboard.tsx', inlineStyles: 74, grays: 0, rawButtons: 3, hex: 12, lines: 330 },
  { file: 'RemoteConnect.tsx', inlineStyles: 64, grays: 0, rawButtons: 7, hex: 4, lines: 563 },
  { file: 'TrialHealth.tsx', inlineStyles: 62, grays: 0, rawButtons: 6, hex: 5, lines: 551 },
  { file: 'SecuritySettings.tsx', inlineStyles: 60, grays: 0, rawButtons: 7, hex: 4, lines: 452 },
  { file: 'AdminCrawlMonitor.tsx', inlineStyles: 60, grays: 0, rawButtons: 6, hex: 8, lines: 397 },
  { file: 'SystemMessages.tsx', inlineStyles: 54, grays: 0, rawButtons: 5, hex: 3, lines: 261 },
  { file: 'AdminHome.tsx', inlineStyles: 52, grays: 0, rawButtons: 5, hex: 8, lines: 635 },
  { file: 'AdminSecurity.tsx', inlineStyles: 51, grays: 0, rawButtons: 13, hex: 6, lines: 554 },
  { file: 'AdminBilling.tsx', inlineStyles: 50, grays: 0, rawButtons: 4, hex: 3, lines: 235 },
  { file: 'CommandCenter.tsx', inlineStyles: 49, grays: 0, rawButtons: 6, hex: 5, lines: 393 },
  { file: 'AdminUsers.tsx', inlineStyles: 49, grays: 0, rawButtons: 13, hex: 6, lines: 597 },
  { file: 'DocumentVault.tsx', inlineStyles: 41, grays: 0, rawButtons: 4, hex: 3, lines: 287 },
  { file: 'AdminAuditLog.tsx', inlineStyles: 38, grays: 0, rawButtons: 5, hex: 4, lines: 465 },
  { file: 'UserEmulation.tsx', inlineStyles: 38, grays: 0, rawButtons: 3, hex: 2, lines: 261 },
  { file: 'AdminK2C.tsx', inlineStyles: 37, grays: 0, rawButtons: 3, hex: 4, lines: 218 },
  { file: 'SurveyPage.tsx', inlineStyles: 37, grays: 0, rawButtons: 3, hex: 2, lines: 241 },
  { file: 'MaintenanceMode.tsx', inlineStyles: 36, grays: 0, rawButtons: 3, hex: 2, lines: 229 },
  { file: 'EmailSequenceManager.tsx', inlineStyles: 32, grays: 0, rawButtons: 5, hex: 67, lines: 959 },
  { file: 'AdminReports.tsx', inlineStyles: 32, grays: 0, rawButtons: 4, hex: 3, lines: 315 },
  { file: 'EventLog.tsx', inlineStyles: 30, grays: 0, rawButtons: 3, hex: 2, lines: 232 },
  { file: 'AdminTestimonials.tsx', inlineStyles: 29, grays: 0, rawButtons: 4, hex: 2, lines: 280 },
  { file: 'DatabaseBackup.tsx', inlineStyles: 29, grays: 0, rawButtons: 3, hex: 1, lines: 151 },
  { file: 'AdminOrgs.tsx', inlineStyles: 27, grays: 0, rawButtons: 4, hex: 3, lines: 336 },
  { file: 'AssessmentLeads.tsx', inlineStyles: 26, grays: 0, rawButtons: 5, hex: 35, lines: 436 },
  { file: 'DemoLauncher.tsx', inlineStyles: 23, grays: 0, rawButtons: 4, hex: 4, lines: 455 },
  { file: 'AdminScoreTable.tsx', inlineStyles: 22, grays: 0, rawButtons: 2, hex: 2, lines: 164 },
  { file: 'DemoGenerator.tsx', inlineStyles: 21, grays: 0, rawButtons: 6, hex: 5, lines: 591 },
  { file: 'SalesPipeline.tsx', inlineStyles: 12, grays: 0, rawButtons: 10, hex: 3, lines: 405 },
  { file: 'InsuranceApiKeys.tsx', inlineStyles: 7, grays: 0, rawButtons: 9, hex: 4, lines: 561 },
  { file: 'AdminVendorConnect.jsx', inlineStyles: 7, grays: 0, rawButtons: 3, hex: 65, lines: 395 },
  { file: 'DemoPipeline.tsx', inlineStyles: 7, grays: 0, rawButtons: 3, hex: 4, lines: 456 },
  { file: 'MarketingCampaigns.tsx', inlineStyles: 7, grays: 0, rawButtons: 5, hex: 81, lines: 516 },
  { file: 'GtmDashboard.tsx', inlineStyles: 6, grays: 0, rawButtons: 3, hex: 2, lines: 200 },
  { file: 'DemoTours.jsx', inlineStyles: 0, grays: 0, rawButtons: 5, hex: 71, lines: 742 },
  { file: 'PartnerDemos.jsx', inlineStyles: 0, grays: 0, rawButtons: 4, hex: 8, lines: 715 },
  { file: 'JurisdictionIntelligence.tsx', inlineStyles: 3, grays: 0, rawButtons: 2, hex: 0, lines: 210 },
  // ── outside admin/ ──
  { file: 'AdminClientOnboarding.tsx', inlineStyles: 0, grays: 0, rawButtons: 2, hex: 0, lines: 453 },
  { file: 'AdminHub.tsx', inlineStyles: 4, grays: 0, rawButtons: 0, hex: 0, lines: 63 },
  { file: 'AdminIntelligenceQueue.tsx', inlineStyles: 5, grays: 0, rawButtons: 6, hex: 0, lines: 580 },
  { file: 'AdminLogin.tsx', inlineStyles: 8, grays: 0, rawButtons: 3, hex: 0, lines: 164 },
  { file: 'AdminRegulatoryChanges.tsx', inlineStyles: 9, grays: 0, rawButtons: 9, hex: 0, lines: 688 },
  // ── enterprise ──
  { file: 'EnterpriseDashboard.tsx', inlineStyles: 83, grays: 0, rawButtons: 48, hex: 0, lines: 2072 },
  { file: 'EnterpriseExecutive.tsx', inlineStyles: 16, grays: 0, rawButtons: 6, hex: 0, lines: 560 },
  { file: 'EnterpriseLanding.tsx', inlineStyles: 10, grays: 0, rawButtons: 0, hex: 0, lines: 136 },
  // ── partner ──
  { file: 'CarrierPartnership.tsx', inlineStyles: 9, grays: 0, rawButtons: 0, hex: 0, lines: 132 },
  { file: 'VendorPartnerDashboard.jsx', inlineStyles: 13, grays: 0, rawButtons: 7, hex: 0, lines: 417 },
  // ── settings/ ──
  { file: 'BillingPage.tsx', inlineStyles: 60, grays: 0, rawButtons: 8, hex: 5, lines: 330 },
  { file: 'ClockRemindersPage.tsx', inlineStyles: 66, grays: 0, rawButtons: 3, hex: 0, lines: 455 },
  { file: 'CompanyProfilePage.tsx', inlineStyles: 24, grays: 0, rawButtons: 1, hex: 0, lines: 389 },
  { file: 'IntegrationsPage.tsx', inlineStyles: 17, grays: 0, rawButtons: 2, hex: 2, lines: 191 },
  { file: 'NotificationsPage.tsx', inlineStyles: 31, grays: 0, rawButtons: 2, hex: 0, lines: 306 },
  { file: 'ServiceTypesPage.tsx', inlineStyles: 27, grays: 0, rawButtons: 4, hex: 1, lines: 247 },
  { file: 'SettingsPage.tsx', inlineStyles: 9, grays: 0, rawButtons: 0, hex: 0, lines: 128 },
  { file: 'TeamRolesPage.tsx', inlineStyles: 20, grays: 0, rawButtons: 1, hex: 0, lines: 186 },
];

/* ═══════════════════════════════════════════════════════════════
   TAB 3 — PROBLEMS
   ═══════════════════════════════════════════════════════════════ */
const PROBLEMS = {
  fakeData: [
    { file: 'RolePreview.jsx', severity: 'CRITICAL', detail: 'PD object: 341 lines of hardcoded fake checklists, temps, training, vendors, docs. NOT gated by isDemoMode. Violates ZERO FAKE DATA rule.' },
    { file: 'BillingPage.tsx', severity: 'CRITICAL', detail: 'PLAN_FEATURES contains WRONG pricing ($49/$149/$399). Should be $99/$199/$349 per PRICING-UPDATE-01. NOT gated by isDemoMode.' },
    { file: 'ServiceTypesPage.tsx', severity: 'HIGH', detail: 'DEMO_SERVICE_TYPES seeded array used as fallback when server data is empty. Violates ZERO FAKE DATA rule — should show empty state.' },
    { file: 'EnterpriseDashboard.tsx', severity: 'HIGH', detail: '10+ demoData imports. Large volumes of fake org/location/score data used throughout the page.' },
    { file: 'EnterpriseExecutive.tsx', severity: 'HIGH', detail: '8+ demoData imports. Fake executive summary data rendered directly.' },
    { file: 'EmailSequenceManager.tsx', severity: 'MEDIUM', detail: 'DEMO_SEQUENCES, DEMO_VENDORS, DEMO_NOTIFICATIONS, DEMO_REFERRALS (lines 41-112). Gated by isDemoMode.' },
    { file: 'TrialHealth.tsx', severity: 'MEDIUM', detail: 'DEMO_COHORTS, DEMO_FUNNEL, DEMO_EXPIRING (lines 34-72). Gated by isDemoMode.' },
    { file: 'InsuranceApiKeys.tsx', severity: 'MEDIUM', detail: 'DEMO_KEYS, DEMO_REQUEST_LOG (lines 53-89). Gated by isDemoMode.' },
    { file: 'AdminDashboard.tsx', severity: 'LOW', detail: 'DEMO_* x6 sets. Properly gated with isDemoMode conditional.' },
    { file: 'AdminRegulatoryChanges.tsx', severity: 'LOW', detail: 'DEMO_SEED (lines 47-111). Properly gated with isDemoMode.' },
    { file: 'AdminClientOnboarding.tsx', severity: 'INFO', detail: 'TRIBAL_OPTIONS and DEFAULT_OUTLET_NAMES are real jurisdictional form data, not fake demo data.' },
    { file: 'PartnerDemos.jsx', severity: 'INFO', detail: 'TRIBAL_OPTIONS used in partner demo form — same real jurisdictional data.' },
  ],

  oversized: [
    { file: 'EvidLYIntelligence.tsx', lines: 2469, recommendation: 'Extract tab panels into sub-components' },
    { file: 'IntelligenceAdmin.tsx', lines: 2398, recommendation: 'Extract intelligence pipeline stages' },
    { file: 'EnterpriseDashboard.tsx', lines: 2072, recommendation: 'Extract KPI sections, chart panels' },
    { file: 'RfpIntelligence.tsx', lines: 1458, recommendation: 'Extract RFP match cards, filters' },
    { file: 'GuidedTours.tsx', lines: 1378, recommendation: 'Extract tour step definitions into config' },
    { file: 'Configure.tsx', lines: 1284, recommendation: 'Extract config sections into tab components' },
    { file: 'SupportTickets.tsx', lines: 1157, recommendation: 'Extract ticket list, detail panel' },
    { file: 'EdgeFunctions.tsx', lines: 1073, recommendation: 'Extract function list, log viewer' },
  ],

  orphans: [
    { file: 'SystemMessages.tsx', path: '/admin/messages', detail: 'Route exists in App.tsx but NO link in AdminShell sidebar. Unreachable without direct URL.' },
    { file: 'DemoDashboard.tsx', path: '/admin/demo/dashboard', detail: 'Route exists but NO sidebar link. Reference-only demo data viewer.' },
    { file: 'UserProvisioning.tsx', path: '/admin/provisioning', detail: 'Route exists but NO sidebar link. Discovered during audit.' },
    { file: 'AdminVendorConnect.jsx', path: '/admin/vendor-connect', detail: 'Route exists but no AdminShell sidebar entry. Partially orphaned.' },
  ],

  staleData: [
    { file: 'BillingPage.tsx', detail: 'PLAN_FEATURES shows Starter ($49/mo), Professional ($149/mo), Enterprise ($399/mo). Correct pricing per PRICING-UPDATE-01: Founder ($99/mo), Standard ($199/mo), Professional ($349/mo), Enterprise (Custom).' },
  ],

  redundant: [
    { files: ['AdminSecurity.tsx', 'SecuritySettings.tsx'], detail: 'Two separate security pages with overlapping concerns. AdminSecurity (554 lines) and SecuritySettings (452 lines) could potentially be merged.' },
    { files: ['AdminDashboard.tsx', 'AdminHome.tsx'], detail: 'AdminDashboard (943 lines) redirects to AdminHome. AdminHome (635 lines) is the actual landing page. The redirect layer adds complexity.' },
    { files: ['DemoGenerator.tsx', 'DemoLauncher.tsx', 'DemoPipeline.tsx'], detail: 'Three separate demo management pages (591 + 455 + 456 = 1,502 lines). Could be unified into a single demo management hub.' },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   TAB 4 — GRADES SUMMARY
   ═══════════════════════════════════════════════════════════════ */
function computeGradeSummary() {
  const dist = {};
  INVENTORY.forEach(p => {
    dist[p.grade] = (dist[p.grade] || 0) + 1;
  });

  const gradeValue = { 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0 };
  const total = INVENTORY.reduce((s, p) => s + (gradeValue[p.grade] || 0), 0);
  const avg = total / INVENTORY.length;
  const avgLetter = avg >= 3.5 ? 'A-' : avg >= 3.15 ? 'B+' : avg >= 2.85 ? 'B' : avg >= 2.5 ? 'B-' : avg >= 2.15 ? 'C+' : avg >= 1.85 ? 'C' : 'C-';

  const sorted = [...INVENTORY].sort((a, b) => (gradeValue[a.grade] || 0) - (gradeValue[b.grade] || 0));
  const worst3 = sorted.slice(0, 3);
  const best3 = sorted.slice(-3).reverse();

  const order = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
  const orderedDist = order.filter(g => dist[g]).map(g => ({ grade: g, count: dist[g] }));

  return { orderedDist, avg: avg.toFixed(2), avgLetter, worst3, best3, total: INVENTORY.length };
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const TABS = ['Page Inventory', 'Anti-Pattern Counts', 'Problems', 'Grades Summary'];

export default function AdminAuditReport() {
  const [tab, setTab] = useState(0);
  const summary = computeGradeSummary();

  const totalInlineStyles = ANTI_PATTERNS.reduce((s, p) => s + p.inlineStyles, 0);
  const totalRawButtons = ANTI_PATTERNS.reduce((s, p) => s + p.rawButtons, 0);
  const totalHex = ANTI_PATTERNS.reduce((s, p) => s + p.hex, 0);
  const totalLines = INVENTORY.reduce((s, p) => s + p.lines, 0);

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: NAVY, color: WHITE, padding: '32px 40px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>ADMIN-AUDIT-REPORT</h1>
        <p style={{ color: GOLD, marginTop: 8, fontSize: 14 }}>
          {summary.total} pages &middot; {totalLines.toLocaleString()} lines &middot; Average Grade: {summary.avgLetter} ({summary.avg})
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4, fontSize: 12 }}>
          Generated 2026-04-11 &middot; READ ONLY &mdash; no source files changed
        </p>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'flex', gap: 16, padding: '24px 40px', flexWrap: 'wrap' }}>
        {[
          { label: 'Pages Audited', value: summary.total, color: NAVY },
          { label: 'Total Lines', value: totalLines.toLocaleString(), color: NAVY },
          { label: 'Inline Styles', value: totalInlineStyles.toLocaleString(), color: RED },
          { label: 'Raw Buttons', value: totalRawButtons, color: GOLD },
          { label: 'Hardcoded Hex', value: totalHex, color: GOLD },
          { label: 'Fake Data Issues', value: PROBLEMS.fakeData.filter(f => ['CRITICAL','HIGH'].includes(f.severity)).length, color: RED },
          { label: 'Orphan Pages', value: PROBLEMS.orphans.length, color: GOLD },
          { label: 'Oversized Files', value: PROBLEMS.oversized.length, color: GOLD },
        ].map((kpi, i) => (
          <div key={i} style={{ background: WHITE, borderRadius: 12, padding: '16px 20px', minWidth: 140, border: '1px solid rgba(30,45,77,0.08)', flex: '1 1 140px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(30,45,77,0.4)' }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color, marginTop: 4 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, padding: '0 40px', borderBottom: '1px solid rgba(30,45,77,0.1)' }}>
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              padding: '12px 20px',
              fontSize: 13,
              fontWeight: tab === i ? 600 : 400,
              color: tab === i ? NAVY : 'rgba(30,45,77,0.4)',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === i ? `2px solid ${GOLD}` : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '24px 40px' }}>
        {/* ─── TAB 0: Page Inventory ─── */}
        {tab === 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: CREAM, borderBottom: `1px solid rgba(30,45,77,0.1)` }}>
                  {['#', 'Route', 'File', 'Lines', 'Grade', 'Sidebar', 'DB', 'Fake Data', 'Shared Components'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(30,45,77,0.4)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INVENTORY.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(30,45,77,0.05)', background: i % 2 === 0 ? WHITE : 'rgba(250,247,240,0.5)' }}>
                    <td style={{ padding: '8px 12px', color: 'rgba(30,45,77,0.3)', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, color: NAVY }}>{p.path}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{p.file}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: p.lines >= 1000 ? 700 : 400, color: p.lines >= 1000 ? RED : NAVY }}>{p.lines}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: gradeBg(p.grade), color: gradeColor(p.grade) }}>{p.grade}</span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{p.sidebar ? '\u2713' : '\u2717'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{p.db ? '\u2713' : '\u2717'}</td>
                    <td style={{ padding: '8px 12px', fontSize: 11, color: p.fake ? RED : 'rgba(30,45,77,0.3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.fake || 'None'}</td>
                    <td style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(30,45,77,0.6)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.shared}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── TAB 1: Anti-Pattern Counts ─── */}
        {tab === 1 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: CREAM, borderBottom: `1px solid rgba(30,45,77,0.1)` }}>
                  {['#', 'File', 'Lines', 'Inline Styles', 'Generic Grays', 'Raw Buttons', 'Hardcoded Hex', 'Debt Score'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 12px', textAlign: i >= 2 ? 'right' : 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(30,45,77,0.4)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...ANTI_PATTERNS]
                  .sort((a, b) => (b.inlineStyles + b.rawButtons * 2 + b.hex) - (a.inlineStyles + a.rawButtons * 2 + a.hex))
                  .map((p, i) => {
                    const debt = p.inlineStyles + p.rawButtons * 2 + p.hex;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(30,45,77,0.05)', background: i % 2 === 0 ? WHITE : 'rgba(250,247,240,0.5)' }}>
                        <td style={{ padding: '8px 12px', color: 'rgba(30,45,77,0.3)', fontSize: 11 }}>{i + 1}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{p.file}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{p.lines}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: p.inlineStyles >= 100 ? 700 : 400, color: p.inlineStyles >= 100 ? RED : p.inlineStyles >= 50 ? GOLD : NAVY }}>{p.inlineStyles}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: GREEN }}>{p.grays}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: p.rawButtons >= 15 ? 700 : 400, color: p.rawButtons >= 15 ? RED : NAVY }}>{p.rawButtons}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: p.hex >= 50 ? 700 : 400, color: p.hex >= 50 ? RED : NAVY }}>{p.hex}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: debt >= 200 ? '#fef2f2' : debt >= 80 ? '#fefce8' : '#f0fdf4', color: debt >= 200 ? RED : debt >= 80 ? GOLD : GREEN }}>{debt}</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${NAVY}`, background: CREAM, fontWeight: 700 }}>
                  <td style={{ padding: '10px 12px' }} colSpan={2}>TOTALS ({ANTI_PATTERNS.length} files)</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{ANTI_PATTERNS.reduce((s, p) => s + p.lines, 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: RED }}>{totalInlineStyles.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: GREEN }}>0</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: RED }}>{totalRawButtons}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: RED }}>{totalHex}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{ANTI_PATTERNS.reduce((s, p) => s + p.inlineStyles + p.rawButtons * 2 + p.hex, 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ─── TAB 2: Problems ─── */}
        {tab === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Fake Data */}
            <section>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${RED}` }}>
                Fake Data Violations ({PROBLEMS.fakeData.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PROBLEMS.fakeData.map((item, i) => (
                  <div key={i} style={{ background: WHITE, borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(30,45,77,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: item.severity === 'CRITICAL' ? '#fef2f2' : item.severity === 'HIGH' ? '#fefce8' : item.severity === 'MEDIUM' ? '#f0f4ff' : item.severity === 'LOW' ? '#f0fdf4' : CREAM,
                        color: item.severity === 'CRITICAL' ? RED : item.severity === 'HIGH' ? '#92400e' : item.severity === 'MEDIUM' ? NAVY : item.severity === 'LOW' ? GREEN : 'rgba(30,45,77,0.4)',
                      }}>{item.severity}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: NAVY }}>{item.file}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(30,45,77,0.7)', lineHeight: 1.5 }}>{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Stale Data */}
            <section>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${GOLD}` }}>
                Stale / Incorrect Data ({PROBLEMS.staleData.length})
              </h3>
              {PROBLEMS.staleData.map((item, i) => (
                <div key={i} style={{ background: WHITE, borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(30,45,77,0.08)' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: NAVY }}>{item.file}</span>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(30,45,77,0.7)', lineHeight: 1.5 }}>{item.detail}</p>
                </div>
              ))}
            </section>

            {/* Oversized Files */}
            <section>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${GOLD}` }}>
                Oversized Files &mdash; 1,000+ Lines ({PROBLEMS.oversized.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PROBLEMS.oversized.map((item, i) => (
                  <div key={i} style={{ background: WHITE, borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(30,45,77,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: NAVY }}>{item.file}</span>
                      <span style={{ marginLeft: 10, fontSize: 12, color: RED, fontWeight: 700 }}>{item.lines.toLocaleString()} lines</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'rgba(30,45,77,0.5)' }}>{item.recommendation}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Orphans */}
            <section>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${GOLD}` }}>
                Orphan Pages &mdash; No Sidebar Link ({PROBLEMS.orphans.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PROBLEMS.orphans.map((item, i) => (
                  <div key={i} style={{ background: WHITE, borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(30,45,77,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: NAVY }}>{item.file}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: GOLD }}>{item.path}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(30,45,77,0.7)', lineHeight: 1.5 }}>{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Redundant */}
            <section>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid rgba(30,45,77,0.2)` }}>
                Potentially Redundant Pages ({PROBLEMS.redundant.length} groups)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PROBLEMS.redundant.map((item, i) => (
                  <div key={i} style={{ background: WHITE, borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(30,45,77,0.08)' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      {item.files.map((f, j) => (
                        <span key={j} style={{ fontFamily: 'monospace', fontSize: 12, background: CREAM, padding: '2px 8px', borderRadius: 6 }}>{f}</span>
                      ))}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(30,45,77,0.7)', lineHeight: 1.5 }}>{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ─── TAB 3: Grades Summary ─── */}
        {tab === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Distribution */}
            <section>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Grade Distribution</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {summary.orderedDist.map((d, i) => (
                  <div key={i} style={{ background: WHITE, borderRadius: 12, padding: '16px 24px', border: '1px solid rgba(30,45,77,0.08)', textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: gradeColor(d.grade) }}>{d.count}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginTop: 4 }}>{d.grade}</div>
                    <div style={{ fontSize: 11, color: 'rgba(30,45,77,0.4)', marginTop: 2 }}>{((d.count / summary.total) * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, fontSize: 14, color: NAVY }}>
                <strong>Average:</strong> {summary.avgLetter} ({summary.avg}) across {summary.total} pages
              </div>
            </section>

            {/* Bar chart */}
            <section>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Visual Distribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {summary.orderedDist.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 28, fontSize: 13, fontWeight: 600, color: gradeColor(d.grade), textAlign: 'right' }}>{d.grade}</span>
                    <div style={{ flex: 1, background: 'rgba(30,45,77,0.05)', borderRadius: 6, height: 24, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(d.count / summary.total) * 100}%`, background: gradeColor(d.grade), borderRadius: 6, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ width: 24, fontSize: 13, fontWeight: 600, color: NAVY, textAlign: 'right' }}>{d.count}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Best & Worst */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <section style={{ flex: 1, minWidth: 280 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: GREEN, marginBottom: 12 }}>Top 3 Best</h3>
                {summary.best3.map((p, i) => (
                  <div key={i} style={{ background: WHITE, borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(30,45,77,0.08)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: NAVY }}>{p.file}</span>
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'rgba(30,45,77,0.4)' }}>{p.lines} lines</span>
                    </div>
                    <span style={{ padding: '2px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: gradeBg(p.grade), color: gradeColor(p.grade) }}>{p.grade}</span>
                  </div>
                ))}
              </section>
              <section style={{ flex: 1, minWidth: 280 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: RED, marginBottom: 12 }}>Top 3 Worst</h3>
                {summary.worst3.map((p, i) => (
                  <div key={i} style={{ background: WHITE, borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(30,45,77,0.08)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: NAVY }}>{p.file}</span>
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'rgba(30,45,77,0.4)' }}>{p.lines} lines</span>
                    </div>
                    <span style={{ padding: '2px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: gradeBg(p.grade), color: gradeColor(p.grade) }}>{p.grade}</span>
                  </div>
                ))}
              </section>
            </div>

            {/* Recommendations */}
            <section>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${GOLD}` }}>Phase 3 Recommendations</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { priority: 'P0', title: 'Fix BillingPage pricing', detail: 'PLAN_FEATURES shows $49/$149/$399 — must match PRICING-UPDATE-01: Founder $99, Standard $199, Professional $349, Enterprise Custom.' },
                  { priority: 'P0', title: 'Remove RolePreview fake data', detail: '341 lines of hardcoded PD object with fake checklists, temperatures, training, vendors. Replace with empty state or real data fetch.' },
                  { priority: 'P0', title: 'Fix ServiceTypesPage fake data', detail: 'DEMO_SERVICE_TYPES fallback violates ZERO FAKE DATA rule. Show empty state when no server data.' },
                  { priority: 'P1', title: 'Modularize oversized files', detail: '8 files exceed 1,000 lines. EvidLYIntelligence (2,469), IntelligenceAdmin (2,398), EnterpriseDashboard (2,072) are most urgent.' },
                  { priority: 'P1', title: 'Migrate inline styles to Tailwind', detail: `${totalInlineStyles.toLocaleString()} inline style= occurrences across 68 files. Top offenders: EvidLYIntelligence (327), IntelligenceAdmin (275), Configure (242).` },
                  { priority: 'P2', title: 'Adopt shared Button component', detail: `${totalRawButtons} raw <button> tags. Replace with shared Button.jsx for consistent styling.` },
                  { priority: 'P2', title: 'Replace hardcoded hex', detail: `${totalHex} Tailwind arbitrary hex values [#...]. Convert to design tokens (bg-navy, text-gold, etc).` },
                  { priority: 'P2', title: 'Link orphan pages', detail: `${PROBLEMS.orphans.length} pages have no sidebar link: SystemMessages, DemoDashboard, UserProvisioning, AdminVendorConnect.` },
                  { priority: 'P3', title: 'Merge redundant pages', detail: 'AdminSecurity + SecuritySettings overlap. AdminDashboard redirect adds complexity. Three demo pages could unify.' },
                ].map((rec, i) => (
                  <div key={i} style={{ background: WHITE, borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(30,45,77,0.08)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: rec.priority === 'P0' ? '#fef2f2' : rec.priority === 'P1' ? '#fefce8' : rec.priority === 'P2' ? '#f0f4ff' : CREAM,
                      color: rec.priority === 'P0' ? RED : rec.priority === 'P1' ? '#92400e' : rec.priority === 'P2' ? NAVY : 'rgba(30,45,77,0.5)',
                      flexShrink: 0, marginTop: 2,
                    }}>{rec.priority}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{rec.title}</div>
                      <div style={{ fontSize: 13, color: 'rgba(30,45,77,0.6)', marginTop: 4, lineHeight: 1.5 }}>{rec.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
