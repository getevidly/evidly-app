# Modal Positioning — Phase 1 Discovery Report

**Date:** 2026-04-21
**Scope:** READ-ONLY audit of every modal/overlay in the EvidLY codebase
**Goal:** Identify why modals mis-position and which components need fixing

---

## 1. Modal Inventory Table

### Bucket Definitions

| Bucket | Description | Portal? | Affected by containing-block? |
|--------|-------------|---------|-------------------------------|
| **A** | Uses `createPortal(…, document.body)` | YES | NO — escapes the React tree |
| **B** | Own `fixed inset-0` overlay, rendered inline | NO | YES — trapped if ancestor creates containing block |
| **C** | Library primitive (Radix/HeadlessUI/shadcn) | Varies | Varies |
| **D** | Non-modal overlay (click-away layer, watermark, toast) | NO | YES but not a dialog |

### Bucket A — Portaled Modals (5 total)

All use `ModalShell` from `src/components/temp-logs/shared.tsx` which calls `createPortal(…, document.body)`.

| # | File | Component | Parent on render |
|---|------|-----------|-----------------|
| 1 | `src/components/temp-logs/AddCooldownReadingModal.tsx` | AddCooldownReadingModal | TempLogs page |
| 2 | `src/components/temp-logs/AddCurrentReadingModal.tsx` | AddCurrentReadingModal | TempLogs page |
| 3 | `src/components/temp-logs/AddHoldingReadingModal.tsx` | AddHoldingReadingModal | TempLogs page |
| 4 | `src/components/temp-logs/AddReceivingReadingModal.tsx` | AddReceivingReadingModal | TempLogs page |
| 5 | `src/components/locations/AddLocationModal.tsx` | AddLocationModal | Various pages |

### Bucket B — Inline Fixed Overlays, NOT Portaled (97 total)

These are the **fix targets**. Every one renders `fixed inset-0` inside the React tree. If any ancestor creates a CSS containing block, the modal positions relative to that ancestor instead of the viewport.

| # | File | Line | Component / Context |
|---|------|------|-------------------|
| 1 | `src/pages/VendorProfile.tsx` | 932 | Subscription modal |
| 2 | `src/pages/VendorDocumentReview.jsx` | 389 | Approve modal |
| 3 | `src/pages/VendorDocumentReview.jsx` | 430 | Flag modal |
| 4 | `src/pages/VendorDetail.tsx` | 441 | Delete confirm |
| 5 | `src/pages/VendorDashboard.tsx` | 911 | Subscription modal |
| 6 | `src/pages/TempLogs.tsx` | 2022 | Alert details modal |
| 7 | `src/pages/TempLogs.tsx` | 3449 | Batch modal |
| 8 | `src/pages/TempLogs.tsx` | 3588 | Equipment config modal |
| 9 | `src/pages/TempLogs.tsx` | 3690 | Threshold modal |
| 10 | `src/pages/TempLogs.tsx` | 3791 | Delete confirm modal |
| 11 | `src/pages/TempLogQuick.tsx` | 219 | Success toast overlay |
| 12 | `src/pages/Team.tsx` | 903 | Edit member modal |
| 13 | `src/pages/Team.tsx` | 1105 | Remove confirm modal |
| 14 | `src/pages/Team.tsx` | 1166 | Invite modal |
| 15 | `src/pages/ServicesPage.tsx` | 485–486 | Log service modal (two layers) |
| 16 | `src/pages/SensorHub.tsx` | 295 | Sensor detail modal |
| 17 | `src/pages/PhotoEvidencePage.tsx` | 705 | Lightbox |
| 18 | `src/pages/JurisdictionSettings.tsx` | 309 | Edit modal |
| 19 | `src/pages/IoTSensorHub.tsx` | 1171 | Sensor modal |
| 20 | `src/pages/IntegrationHub.tsx` | 384 | Integration detail modal |
| 21 | `src/pages/InsuranceSettings.tsx` | 343 | Policy modal |
| 22 | `src/pages/InsuranceRisk.tsx` | 1115 | Detail modal |
| 23 | `src/pages/InspectorView.tsx` | 541 | Print preview modal |
| 24 | `src/pages/IncidentLog.tsx` | 1329 | New incident modal |
| 25 | `src/pages/IncidentLog.tsx` | 1420 | Edit incident modal |
| 26 | `src/pages/IncidentLog.tsx` | 1509 | Delete confirm modal |
| 27 | `src/pages/Equipment.tsx` | 1683 | Equipment form modal |
| 28 | `src/pages/Equipment.tsx` | 1853 | QR label modal |
| 29 | `src/pages/DocumentChecklist.tsx` | 443 | Upload modal |
| 30 | `src/pages/CorrectiveActions.tsx` | 582 | Detail modal |
| 31 | `src/pages/Checklists.tsx` | 2182 | New checklist modal |
| 32 | `src/pages/Checklists.tsx` | 2304 | Checklist detail modal |
| 33 | `src/pages/availability/AvailabilitySubmissionPage.tsx` | 235 | Confirm modal |
| 34 | `src/pages/Alerts.tsx` | 768 | Alert detail modal |
| 35 | `src/pages/admin/ViolationOutreach.tsx` | 478 | Email modal |
| 36 | `src/pages/admin/ViolationOutreach.tsx` | 516 | Preview modal |
| 37 | `src/pages/admin/SupportTickets.tsx` | 663 | Ticket detail modal |
| 38 | `src/pages/admin/SupportTickets.tsx` | 1001 | New ticket modal |
| 39 | `src/pages/admin/StaffRoles.tsx` | 369 | Role confirm modal |
| 40 | `src/pages/admin/SalesPipeline.tsx` | 351 | Deal detail drawer |
| 41 | `src/pages/admin/RfpIntelligence.tsx` | 667 | RFP detail panel |
| 42 | `src/pages/admin/RemoteConnect.tsx` | 455 | Confirm modal |
| 43 | `src/pages/admin/MarketingCampaigns.tsx` | 338 | Campaign detail modal |
| 44 | `src/pages/admin/IntelligenceAdmin.tsx` | 2048 | Signal detail modal |
| 45 | `src/pages/admin/IntelligenceAdmin.tsx` | 2113 | Edit signal modal |
| 46 | `src/pages/admin/IntelligenceAdmin.tsx` | 2169 | Delete confirm modal |
| 47 | `src/pages/admin/InsuranceApiKeys.tsx` | 456 | API key modal |
| 48 | `src/pages/admin/GuidedTours.tsx` | 1247 | Tour edit modal |
| 49 | `src/pages/admin/EvidLYIntelligence.tsx` | 2080 | Signal detail modal |
| 50 | `src/pages/admin/Configure.tsx` | 53 | Config modal |
| 51 | `src/pages/admin/AdminUsers.tsx` | 415 | Edit user modal |
| 52 | `src/pages/admin/AdminUsers.tsx` | 507 | Confirm modal |
| 53 | `src/components/WelcomeModal.tsx` | 43 | Welcome modal |
| 54 | `src/components/VendorContactActions.tsx` | 87 | Email modal |
| 55 | `src/components/VendorContactActions.tsx` | 121 | Call modal |
| 56 | `src/components/vendor/ShareInviteLinkPanel.tsx` | 43 | Share link modal |
| 57 | `src/components/vendor/InviteVendorModal.tsx` | 109–110 | Invite vendor modal (two layers) |
| 58 | `src/components/vendor/FlagDocumentModal.tsx` | 34 | Flag doc modal |
| 59 | `src/components/vendor/BulkClientImport.tsx` | 230 | Bulk import modal |
| 60 | `src/components/vendor/AddVendorModal.tsx` | 157–158 | Add vendor modal (two layers) |
| 61 | `src/components/ui/Modal.jsx` | 32 | **Shared Modal component** (0 importers currently) |
| 62 | `src/components/training/AddCertificationModal.tsx` | 147 | Certification modal |
| 63 | `src/components/AutoDocumentRequest.tsx` | 151 | Auto-request modal |
| 64 | `src/components/AiUpgradePrompt.tsx` | 44 | Upgrade prompt modal |
| 65 | `src/components/admin/EmulationPanel.tsx` | 354–355 | Confirm emulation modal (two layers) |
| 66 | `src/components/dashboard/OwnerOperatorDashboard.tsx` | 626–627 | Role change confirm (two layers) |
| 67 | `src/components/dashboard/LocationCard.tsx` | 72–74 | QR modal (two layers) |
| 68 | `src/components/fleet/VehicleFormModal.tsx` | 38 | Vehicle form modal |
| 69 | `src/components/fleet/MaintenanceLogModal.tsx` | 41 | Maintenance log modal |
| 70 | `src/components/facility-safety/FacilityDetailModal.tsx` | 79 | Facility detail modal |
| 71 | `src/components/equipment/ReportEquipmentIncidentModal.tsx` | 54 | Report incident modal |
| 72 | `src/components/equipment/QRCodePrintModal.tsx` | 70 | QR print modal |
| 73 | `src/components/equipment/EquipmentFormModal.tsx` | 109 | Equipment form modal |
| 74 | `src/components/equipment/BulkQRPrintModal.tsx` | 88 | Bulk QR modal |
| 75 | `src/components/DocumentScanAnimation.tsx` | 52 | Scan animation overlay |
| 76 | `src/components/DemoUpgradePrompt.tsx` | 31 | Demo upgrade prompt |
| 77 | `src/components/DemoTour.tsx` | 169 | Tour step modal |
| 78 | `src/components/demo/DemoConversionModal.tsx` | 32–33 | Demo conversion modal (two layers) |
| 79 | `src/components/deficiencies/ResolutionModal.tsx` | 16 | Resolution modal |
| 80 | `src/components/deficiencies/DeferModal.tsx` | 17 | Defer modal |
| 81 | `src/components/deficiencies/AddDeficiencyModal.tsx` | 53 | Add deficiency modal |
| 82 | `src/components/deficiencies/AcknowledgeModal.tsx` | 22 | Acknowledge modal |
| 83 | `src/components/dashboard/shared/OnboardingChecklistCard.tsx` | 63 | Onboarding detail modal |
| 84 | `src/components/temp-logs/QuickTempSheet.tsx` | 87 | Sheet backdrop |
| 85 | `src/components/TeamInviteModal.tsx` | 284 | Team invite modal |
| 86 | `src/components/tasks/TaskDefinitionForm.jsx` | 120 | Task definition modal |
| 87 | `src/components/tasks/NotificationPrefs.jsx` | 29 | Notification prefs modal |
| 88 | `src/components/SmartUploadModal.tsx` | 339 | Smart upload modal |
| 89 | `src/components/ShareModal.tsx` | 66–68 | Share modal (two layers) |
| 90 | `src/components/inventory/NewInventoryRequestModal.tsx` | 60 | New request modal |
| 91 | `src/components/inventory/LogUsageModal.tsx` | 32 | Log usage modal |
| 92 | `src/components/services/ReviewAlternativesModal.tsx` | 74, 126 | Review alternatives (two views) |
| 93 | `src/components/services/RequestServiceModal.tsx` | 144 | Request service modal |
| 94 | `src/components/insurance/InsurancePolicyModal.tsx` | 65 | Insurance policy modal |
| 95 | `src/components/services/FlagServiceModal.tsx` | 26 | Flag service modal |
| 96 | `src/components/permissions/UserExceptionModal.tsx` | 125 | User exception modal |
| 97 | `src/components/permissions/ConfirmRoleChangeModal.tsx` | 36 | Role change confirm |
| 98 | `src/components/schedule/RescheduleModal.tsx` | 34 | Reschedule modal |
| 99 | `src/components/schedule/RecurringScheduleModal.tsx` | 58 | Recurring schedule modal |
| 100 | `src/components/schedule/JobFormModal.tsx` | 77 | Job form modal |
| 101 | `src/components/schedule/AvailabilityEditor.tsx` | 71 | Availability editor modal |
| 102 | `src/components/reports/ScheduleReportModal.tsx` | 49 | Schedule report modal |
| 103 | `src/components/ProfileModal.tsx` | 95 | Profile modal |
| 104 | `src/components/LeadCaptureModal.tsx` | 48–49 | Lead capture modal (two layers) |
| 105 | `src/components/layout/TopBar.tsx` | 456–457 | Change password modal (two layers) |
| 106 | `src/components/referral/K2CInviteModal.tsx` | — | K2C invite modal |
| 107 | `src/components/social-proof/InspectionBadgeModal.tsx` | — | Inspection badge modal |
| 108 | `src/components/social-proof/TestimonialCollectionModal.tsx` | — | Testimonial modal |
| 109 | `src/components/settings/IntegrationDetailModal.tsx` | — | Integration detail modal |
| 110 | `src/components/settings/ServiceTypeFormModal.tsx` | — | Service type form modal |
| 111 | `src/components/ambassador/MilestoneCelebrationModal.tsx` | — | Milestone modal |
| 112 | `src/components/ambassador/StandingCardModal.tsx` | — | Standing card modal |

### Bucket C — Library Primitives

**NONE.** Zero Radix, HeadlessUI, or shadcn Dialog/Modal imports found in the codebase.

### Bucket D — Non-Modal Overlays (click-away, watermarks, panels)

| # | File | Line | Purpose |
|---|------|------|---------|
| 1 | `src/pages/RolesPermissions.tsx` | 259 | Dropdown click-away layer |
| 2 | `src/pages/admin/UserProvisioning.tsx` | 431 | Drawer click-away layer |
| 3 | `src/pages/admin/SupportTickets.tsx` | 745 | Drawer click-away layer |
| 4 | `src/pages/admin/StaffRoles.tsx` | 668 | Drawer click-away layer |
| 5 | `src/pages/admin/Configure.tsx` | 730 | Drawer click-away layer |
| 6 | `src/pages/admin/Configure.tsx` | 925 | Drawer click-away layer |
| 7 | `src/pages/admin/Configure.tsx` | 1089 | Drawer click-away layer |
| 8 | `src/pages/admin/Configure.tsx` | 1183 | Drawer click-away layer |
| 9 | `src/components/AIChatPanel.tsx` | 255 | Mobile chat panel backdrop |
| 10 | `src/components/DemoWatermark.tsx` | 8 | Demo watermark overlay |
| 11 | `src/components/GuidedTour.tsx` | 218 | Tour backdrop |
| 12 | `src/components/DemoTour.tsx` | 271 | Tour click-away |
| 13 | `src/components/QuickSwitcher.tsx` | 143–146 | Quick switcher backdrop |
| 14 | `src/components/notifications/NotificationPanel.tsx` | 72 | Notification panel backdrop |
| 15 | `src/components/mobile/MobileMoreMenu.tsx` | 38 | Mobile menu fullscreen |
| 16 | `src/components/mobile/MobileDailyTasksProduction.tsx` | 47, 75 | Mobile task panel |
| 17 | `src/components/mobile/MobileDailyTasks.tsx` | 17 | Mobile task panel |
| 18 | `src/components/LockScreen.tsx` | 54 | Lock screen overlay |
| 19 | `src/components/layout/TopBar.tsx` | 141 | User dropdown click-away |
| 20 | `src/components/layout/MobileTabBar.tsx` | 167 | Mobile sidebar backdrop |
| 21 | `src/components/temp-logs/QuickTempSheet.tsx` | 154 | Success toast (pointer-events-none) |

---

## 2. Fix Targets — Buckets B and D

**All 112 Bucket B modals** are vulnerable to mis-positioning if any ancestor element creates a CSS containing block. Currently:

- **In production:** The Playwright sweep (2026-04-21) confirmed `isolate` is still present on Layout.tsx's main wrapper in the deployed build. This means **every Bucket B modal rendered inside Layout is currently broken** — the `fixed inset-0` positions relative to the `lg:pl-60` wrapper instead of the viewport.

- **Locally:** `isolate` has been removed from Layout.tsx line 104. If deployed, this would fix the containing-block issue for all Bucket B modals simultaneously.

**The 5 Bucket A modals (portaled via ModalShell) are immune** — they render into `document.body` and bypass any containing-block ancestors.

**Bucket D overlays** are also affected but are less user-visible (click-away layers, watermarks).

### Why only TempLogs modals work correctly
The 5 temp-log reading modals + AddLocationModal use `ModalShell` → `createPortal(…, document.body)`. They escape the Layout wrapper entirely and position correctly regardless of `isolate`.

### ui/Modal.jsx — unused shared component
`src/components/ui/Modal.jsx` is a well-built shared modal with Escape handling and body scroll lock, but it does **NOT** use `createPortal`. It renders inline with `fixed inset-0 z-[9999]`. **Zero components currently import it.**

---

## 3. Containing-Block Trigger Audit

CSS properties that create a new containing block for `position: fixed` descendants:
- `transform` (even `transform: none`)
- `will-change: transform`
- `filter` (except `none`)
- `backdrop-filter`
- `perspective`
- `contain: paint | layout | content | strict`
- `isolation: isolate`

### Search Results

| Property | Hits | Location | Risk |
|----------|------|----------|------|
| `isolation: isolate` | **0 in source** | Removed from Layout.tsx locally | **STILL IN PRODUCTION** per Playwright sweep |
| `will-change` | 0 | — | None |
| `perspective` | 0 | — | None |
| `contain` | 0 | — | None |
| `transform` | ~50+ | All on inner elements (icons, buttons, SVGs, toggle switches). E.g. `hover:scale-105`, `rotate-180`, `translate-x`. **None on layout wrappers.** | **None** — inner transforms don't affect ancestor chain |
| `backdrop-blur` / `backdrop-filter` | 5 | See table below | **Low** — see analysis |

### backdrop-blur Instances

| File | Line | Element | Creates containing block? |
|------|------|---------|--------------------------|
| `src/components/Navigation.tsx` | 20 | `<nav>` fixed top nav | YES but nav is a sibling, not an ancestor of modals |
| `src/components/MobileStickyBar.tsx` | 52 | Fixed bottom bar | YES but sibling, not ancestor |
| `src/pages/public/ReferralPage.tsx` | 74 | Inline badge element | YES but inside content, not a modal ancestor |
| `src/pages/IntegrationHub.tsx` | 185 | Stat card | YES but inside content, not a modal ancestor |
| `src/components/QuickSwitcher.tsx` | 146 | QuickSwitcher backdrop | YES — but QuickSwitcher itself is a Bucket D overlay, not a modal parent |

**Verdict:** None of the 5 `backdrop-blur` instances are on elements that serve as ancestors to modals. They are either fixed-position siblings (nav, bottom bar) or deeply nested content elements.

### CSS Animations

| Animation | Keyframes | Properties | Risk |
|-----------|-----------|------------|------|
| `page-enter` | `index.css:115` | opacity 0→1 only | **None** — no transform |
| `modal-backdrop-in` | `index.css:403` | opacity 0→1 only | **None** — no transform |
| `modal-content-in` | `index.css:406` | opacity 0→1 only | **None** — no transform |

All animations are opacity-only. Safe.

---

## 4. Layout.tsx + PageTransition.tsx Current State

### Layout.tsx (`src/components/layout/Layout.tsx`)

**Line 104 (local):**
```
<div className="lg:pl-60 flex flex-col flex-1 overflow-hidden">
```

- `isolate` has been **removed locally**
- No `transform`, `will-change`, `filter`, `perspective`, or `contain` present
- No `backdrop-blur` on this element
- The `page-enter` animation at line 129 is opacity-only (safe)

**Line 104 (production — per Playwright sweep 2026-04-21):**
```
<div class="lg:pl-60 flex flex-col flex-1 overflow-hidden isolate">
```

- `isolate` is **STILL PRESENT** in production
- This is the root cause of all modal mis-positioning across the entire app

### PageTransition.tsx (`src/components/PageTransition.tsx`)

```tsx
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
```

- Clean. CSS-only opacity animation. No containing-block triggers.

---

## 5. DevTools Diagnostic Snippet

Paste this into the browser console on any page to find all ancestors of a modal that create containing blocks:

```js
// Run when a modal is open
(function findContainingBlockTriggers() {
  const modal = document.querySelector('[class*="fixed"][class*="inset-0"]');
  if (!modal) { console.log('No fixed inset-0 modal found. Open a modal first.'); return; }

  const triggers = [];
  let el = modal.parentElement;
  while (el) {
    const cs = getComputedStyle(el);
    const problems = [];

    if (cs.isolation === 'isolate') problems.push('isolation: isolate');
    if (cs.transform !== 'none') problems.push(`transform: ${cs.transform}`);
    if (cs.willChange !== 'auto' && cs.willChange.includes('transform')) problems.push(`will-change: ${cs.willChange}`);
    if (cs.filter !== 'none') problems.push(`filter: ${cs.filter}`);
    if (cs.backdropFilter && cs.backdropFilter !== 'none') problems.push(`backdrop-filter: ${cs.backdropFilter}`);
    if (cs.perspective !== 'none') problems.push(`perspective: ${cs.perspective}`);
    if (cs.contain && cs.contain !== 'none') problems.push(`contain: ${cs.contain}`);

    if (problems.length > 0) {
      triggers.push({ element: el, tagName: el.tagName, className: el.className.substring(0, 80), problems });
    }
    el = el.parentElement;
  }

  if (triggers.length === 0) {
    console.log('%c No containing-block triggers found in ancestor chain.', 'color: green; font-weight: bold');
  } else {
    console.log(`%c Found ${triggers.length} containing-block trigger(s):`, 'color: red; font-weight: bold');
    triggers.forEach(t => {
      console.log(`  ${t.tagName}.${t.className}`, '\n    ', t.problems.join(', '));
    });
  }

  return triggers;
})();
```

---

## 6. Recommendation

### Root Cause
**Single root cause:** `isolation: isolate` on Layout.tsx line 104 in production. This one CSS property creates a containing block that traps all 112 Bucket B modals.

### Why It Persists
The local source has `isolate` removed, but the currently deployed production build still contains it. Either:
1. The fix was never deployed, or
2. A subsequent deploy reverted it

### Fix Strategy — Two Options

**Option A: Deploy the local fix (fast, immediate)**
1. Verify `isolate` is removed in Layout.tsx locally (confirmed ✓)
2. Deploy: `npx vercel --prod`
3. Verify in production with the DevTools snippet above

This fixes all 112 Bucket B modals in one deploy. No code changes needed — the fix already exists locally.

**Option B: Portal everything (thorough, future-proof)**
1. Upgrade `src/components/ui/Modal.jsx` to use `createPortal(…, document.body)`
2. Migrate all 112 Bucket B modals to import and use `Modal.jsx`
3. This makes modals immune to ANY future containing-block triggers

### Recommended Approach
**Option A first** (deploy to unblock immediately), then **Option B as a follow-up refactor** (add `createPortal` to `ui/Modal.jsx` and gradually migrate modals to it). The two approaches are complementary, not competing.

### Verification Checklist (post-deploy)
- [ ] Open any modal on TempLogs — should center on viewport
- [ ] Open Equipment form modal — should center on viewport
- [ ] Open Team invite modal — should center on viewport
- [ ] Run DevTools snippet — should show "No containing-block triggers found"
- [ ] Test on mobile (375px) — modals should be full-width centered

---

*End of Phase 1 Discovery. No files were modified. Phase 2 prompt follows.*
