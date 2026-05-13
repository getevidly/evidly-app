# User Modal + Admin Modal Audit — 2026-05-13

## Inventory

### Base Modal Frameworks
- `src/components/ui/Modal.jsx` — React Portal modal wrapper; all standard modals use this
- `src/components/temp-logs/shared.tsx` (`ModalShell`) — Alternative portal modal for TempLogs + AddLocationModal

### Authentication & Onboarding Modals (User-Facing)
- `src/components/AuthModal.tsx` — Login / signup form with demo entry
- `src/components/WelcomeModal.tsx` — Founder welcome letter shown on first login
- `src/components/RiskFreeStatusModal.tsx` — Risk-Free Guarantee eligibility tracker
- `src/components/onboarding/responsibilities/SkipReasonModal.tsx` — Skip reason capture during onboarding
- `src/components/onboarding/work/modals/UploadDocumentModal.tsx` — AI-classified document upload (onboarding)
- `src/components/onboarding/work/modals/InviteRoleModal.tsx` — Team invite wrapper (onboarding)
- `src/components/onboarding/work/modals/RequestDocumentModal.tsx` — Vendor document request (onboarding)
- `src/components/onboarding/work/modals/IdentifyVendorModal.tsx` — Vendor identification multi-path (onboarding)

### Team & Permissions Modals
- `src/components/TeamInviteModal.tsx` — Single/bulk team invite
- `src/components/ProfileModal.tsx` — User profile edit (name, phone, kiosk PIN)
- `src/components/permissions/ConfirmRoleChangeModal.tsx` — Role-level permission change confirmation (admin)
- `src/components/permissions/UserExceptionModal.tsx` — Per-user permission exception editor (admin)

### Temperature Logging Modals (User-Facing)
- `src/components/temp-logs/AddCurrentReadingModal.tsx`
- `src/components/temp-logs/AddCooldownReadingModal.tsx`
- `src/components/temp-logs/AddReceivingReadingModal.tsx`
- `src/components/temp-logs/AddHoldingReadingModal.tsx`
- `src/components/temp-logs/ReadingDetailModal.tsx`

### Deficiency Management Modals (User-Facing)
- `src/components/deficiencies/AcknowledgeModal.tsx`
- `src/components/deficiencies/DeferModal.tsx`
- `src/components/deficiencies/ResolutionModal.tsx`
- `src/components/deficiencies/AddDeficiencyModal.tsx`

### Vendor & Service Modals (User-Facing)
- `src/components/vendor/AddVendorModal.tsx`
- `src/components/vendor/InviteVendorModal.tsx`
- `src/components/vendor/ClientInviteModal.tsx`
- `src/components/vendor/FlagDocumentModal.tsx`
- `src/components/services/RequestServiceModal.tsx`
- `src/components/services/ReviewAlternativesModal.tsx`
- `src/components/services/FlagServiceModal.tsx`

### Document Management Modals (User-Facing)
- `src/components/documents/modals/DocumentDetailModal.tsx`
- `src/components/documents/modals/AddVendorDocumentModal.tsx`
- `src/components/documents/modals/RequestFromVendorModal.tsx`
- `src/components/documents/modals/SendToThirdPartyModal.tsx`
- `src/components/SmartUploadModal.tsx` — AI-classified multi-file upload
- `src/components/ShareModal.tsx` — Share documents/reports with third parties

### Equipment & Asset Modals (User-Facing)
- `src/components/equipment/EquipmentFormModal.tsx`
- `src/components/equipment/QRCodePrintModal.tsx`
- `src/components/equipment/BulkQRPrintModal.tsx`
- `src/components/equipment/ReportEquipmentIncidentModal.tsx`
- `src/components/fleet/VehicleFormModal.tsx`
- `src/components/fleet/MaintenanceLogModal.tsx`

### Inventory, Training, Location Modals (User-Facing)
- `src/components/inventory/NewInventoryRequestModal.tsx`
- `src/components/inventory/LogUsageModal.tsx`
- `src/components/locations/AddLocationModal.tsx`
- `src/components/training/AssignTrainingModal.tsx`
- `src/components/training/AddCertificationModal.tsx`

### Reporting, Scheduling, Calendar Modals (User-Facing)
- `src/components/reports/ScheduleReportModal.tsx`
- `src/components/schedule/JobFormModal.tsx`
- `src/components/schedule/RescheduleModal.tsx`
- `src/components/schedule/RecurringScheduleModal.tsx`
- `src/components/calendar/ReadOnlyEventModal.tsx`

### Insurance, Facility Safety, Social Proof Modals (User-Facing)
- `src/components/insurance/InsurancePolicyModal.tsx`
- `src/components/facility-safety/FacilityDetailModal.tsx`
- `src/components/social-proof/InspectionBadgeModal.tsx`
- `src/components/social-proof/TestimonialCollectionModal.tsx`
- `src/components/ambassador/MilestoneCelebrationModal.tsx`
- `src/components/ambassador/StandingCardModal.tsx`
- `src/components/referral/K2CInviteModal.tsx`

### Settings & Integration Modals (User-Facing)
- `src/components/settings/IntegrationDetailModal.tsx`
- `src/components/settings/ServiceTypeFormModal.tsx`

### Demo & Marketing Modals
- `src/components/LeadCaptureModal.tsx` — Pre-demo lead capture (public-facing)
- `src/components/demo/DemoConversionModal.tsx` — Convert demo to live (admin-only)

### Admin-Only Modals (in Configure.tsx)
- `src/pages/admin/Configure.tsx` — Contains inline: `ConfigModal`, `AddOrgModal`, `AddLocModal`, `AddUserModal`, `AddVendorModal`

**Total: 69 modal components across 2 base frameworks.**

---

## Summary

| Severity | Count |
|----------|-------|
| HIGH     | 13    |
| MEDIUM   | 10    |
| LOW      | 5     |
| PASS     | 18    |

---

## HIGH Findings

### [H1] WelcomeModal — "compliance score" banned term in customer-facing copy
- **File:** `src/components/WelcomeModal.tsx:104`
- **Checklist item:** B
- **Evidence:** `"You'll see your compliance score climb in real time."`
- **Why HIGH:** "score" / "compliance score" is an explicitly banned term on all customer-facing surfaces. This modal is shown to every new user on first login.
- **Recommended action:** Remove or rewrite. Example: "You'll see your readiness build in real time."

### [H2] WelcomeModal — "scoring" banned term in customer-facing copy
- **File:** `src/components/WelcomeModal.tsx:80`
- **Checklist item:** B
- **Evidence:** `"real-time scoring, photo evidence, and reports you can hand to any inspector in 10 seconds."`
- **Why HIGH:** "scoring" is a banned term. This is the founder welcome letter seen by every new user.
- **Recommended action:** Replace "scoring" with "visibility" or "evidence tracking."

### [H3] ShareModal — "Compliance Score" banned term in toggle label
- **File:** `src/components/ShareModal.tsx:179`
- **Checklist item:** B
- **Evidence:** `"Include Compliance Score?"` and subtitle `"Attaches a compliance summary PDF"`
- **Why HIGH:** "Compliance Score" is explicitly banned. This toggle is visible to all users sharing documents.
- **Recommended action:** Replace with "Include Readiness Summary?" or remove the toggle.

### [H4] ShareModal — Hardcoded fake document data
- **File:** `src/components/ShareModal.tsx:24-30`
- **Checklist item:** E1 (data layer), CLAUDE.md zero-fake-data rule
- **Evidence:**
  ```js
  const availableDocuments = [
    'Business License - Location 1',
    'Food Handler Certificate - John Smith',
    'Fire Suppression Certificate',
    'Health Permit - Location 1',
    'COI - A1 Fire Protection',
  ];
  ```
- **Why HIGH:** Violates the absolute zero-fake-data rule. This hardcoded array renders in production for all users. Additionally, `handleSend` at line 49 simulates sending with `setTimeout(resolve, 1500)` — no real backend call.
- **Recommended action:** Replace with Supabase query for real `compliance_documents` scoped to the user's organization. Wire `handleSend` to an actual edge function or Supabase insert.

### [H5] No focus trap in any modal — all 69 modals affected
- **File:** `src/components/ui/Modal.jsx` (all modals inherit), `src/components/temp-logs/shared.tsx`
- **Checklist item:** D2
- **Evidence:** Searched entire codebase for `focusTrap`, `focus-trap`, `FocusTrap`, `createFocusTrap` — zero results in any modal file. No focus-trap library imported anywhere in modal code.
- **Why HIGH:** WCAG 2.1 requires focus to be trapped within modal dialogs. Users can Tab out of every modal into background content while the modal is open. This is a Level A accessibility violation.
- **Recommended action:** Add focus-trap-react or equivalent to `Modal.jsx` and `ModalShell`. All 69 modals inherit the fix.

### [H6] ModalShell missing `role="dialog"` and `aria-modal="true"`
- **File:** `src/components/temp-logs/shared.tsx:19`
- **Checklist item:** D1
- **Evidence:** The `ModalShell` outer `<div>` has no `role="dialog"` or `aria-modal="true"`. Only `Modal.jsx` has these attributes. ModalShell is used by all TempLog reading modals and `AddLocationModal`.
- **Why HIGH:** Screen readers cannot identify ModalShell-based modals as dialogs. At least 6 modals are affected (4 temp-log modals + AddLocationModal + any other ModalShell consumers).
- **Recommended action:** Add `role="dialog"` and `aria-modal="true"` to the ModalShell overlay div at `shared.tsx:19`.

### [H7] Modal.jsx missing `aria-labelledby` and `aria-describedby`
- **File:** `src/components/ui/Modal.jsx:42-44`
- **Checklist item:** D1
- **Evidence:** The base Modal has `role="dialog"` and `aria-modal="true"` but no `aria-labelledby` pointing to the modal title or `aria-describedby` pointing to the description. No modal in the codebase adds these attributes.
- **Why HIGH:** Without `aria-labelledby`, screen readers announce the dialog without identifying its purpose. Affects all 63+ modals using `Modal.jsx`.
- **Recommended action:** Accept an optional `titleId` prop in Modal.jsx and wire it to `aria-labelledby`. Each modal should give its `<h2>` a matching `id`.

### [H8] LeadCaptureModal — Gold #A08C5A used as button background fill
- **File:** `src/components/LeadCaptureModal.tsx:134`
- **Checklist item:** C2
- **Evidence:** `style={{ backgroundColor: '#A08C5A' }}` on the "Start My Demo" submit button.
- **Why HIGH:** Gold is reserved for the brand-mark only. Using it as a button fill on a public-facing lead capture modal violates the brand token rule.
- **Recommended action:** Change button background to Navy `#1E2D4D`, consistent with all other primary CTAs.

### [H9] LeadCaptureModal — "platform" banned term in customer-facing copy
- **File:** `src/components/LeadCaptureModal.tsx:140`
- **Checklist item:** B
- **Evidence:** `"No account needed — explore the full platform instantly"`
- **Why HIGH:** "platform" is a banned term. This is on the public-facing lead capture modal seen by unauthenticated prospects.
- **Recommended action:** Replace with "No account needed — explore EvidLY instantly."

### [H10] AuthModal — "compliance dashboard" in customer-facing copy
- **File:** `src/components/AuthModal.tsx:74`
- **Checklist item:** B
- **Evidence:** `"Sign in to your compliance dashboard"` — login mode subtext.
- **Why HIGH:** Uses "compliance" as a product noun describing the dashboard. Per brand rules, compliance is the result, not the product.
- **Recommended action:** Replace with "Sign in to your EvidLY dashboard" or "Sign in to your kitchen's command center."

### [H11] AuthModal — Wordmark uses Syne font, not Montserrat 800
- **File:** `src/components/AuthModal.tsx:69`
- **Checklist item:** C3
- **Evidence:** `fontFamily:'Syne, system-ui, sans-serif', fontWeight:800` — the "EvidLY" wordmark renders in Syne 800 instead of Montserrat 800.
- **Why HIGH:** This is the login/signup modal — the first brand impression. The locked brand rule specifies Montserrat 800 for the wordmark.
- **Recommended action:** Change `fontFamily` to `'Montserrat, system-ui, sans-serif'` for the wordmark span.

### [H12] AddLocationModal — "Jurisdiction" label in customer-facing modal
- **File:** `src/components/locations/AddLocationModal.tsx:177`
- **Checklist item:** B
- **Evidence:** `<FormField label="Jurisdiction / Health Dept">` — this is a customer-facing modal for adding locations during onboarding and from settings.
- **Why HIGH:** "Jurisdiction" is banned in customer-facing surfaces; should be "county" or "County / Health Dept."
- **Recommended action:** Rename label to "County / Health Dept" or just "County."

### [H13] RiskFreeStatusModal — Gold #A08C5A used as progress bar fill
- **File:** `src/components/RiskFreeStatusModal.tsx:41`
- **Checklist item:** C2
- **Evidence:** `backgroundColor: pct >= 100 ? '#059669' : '#A08C5A'` — progress bars render in Gold until 100%.
- **Why HIGH:** Gold is reserved for brand-mark only, never in chart fills or status indicators. This is a customer-facing modal showing progress bars in Gold.
- **Recommended action:** Replace `#A08C5A` with Navy `#1E2D4D` or a blue-tinted progress color.

---

## MEDIUM Findings

### [M1] SmartUploadModal — "pillar" in user-facing select placeholder
- **File:** `src/components/SmartUploadModal.tsx:688`
- **Checklist item:** B
- **Evidence:** `<option value="">Select pillar...</option>` — rendered in document classification form.
- **Why MEDIUM:** "Pillars" is internal-only terminology. Not as prominent as other banned terms since it's a select placeholder, but it's customer-facing.
- **Recommended action:** Change to "Select category..."

### [M2] SmartUploadModal — "compliance category" label
- **File:** `src/components/SmartUploadModal.tsx:681`
- **Checklist item:** B
- **Evidence:** `<label>compliance category</label>` — lowercase, in the document classification detail panel.
- **Why MEDIUM:** Uses "compliance" as a classification concept in the label. The select options themselves are fine (Fire Safety, Food Safety, etc.).
- **Recommended action:** Change label to "Category" or "Document category."

### [M3] WelcomeModal — "compliance" used as product noun in multiple places
- **File:** `src/components/WelcomeModal.tsx:74-75, 79, 91, 124`
- **Checklist item:** B
- **Evidence:**
  - Line 75: `"compliance runs on paper, spreadsheets, and hope."`
  - Line 79: `"vendor compliance"`
  - Line 91: `"compliance documents"`
  - Line 124: `"Let's simplify compliance together."`
- **Why MEDIUM:** While some uses are borderline acceptable as result descriptions, lines 75 and 124 treat "compliance" as a standalone product concept. This is the founder letter — prominent copy.
- **Recommended action:** Review each instance. Line 75: "food safety and fire safety run on paper..." Line 124: "Let's simplify your kitchen's safety together."

### [M4] TeamInviteModal — Gold #A08C5A used as icon accent
- **File:** `src/components/TeamInviteModal.tsx:295-296`
- **Checklist item:** C2
- **Evidence:** `<div className="p-2 bg-[#A08C5A]/10 rounded-lg">` and `<UserPlus className="w-6 h-6 text-[#A08C5A]" />`
- **Why MEDIUM:** Gold used as icon color and background tint. Not as egregious as button fill, but still violates "never in accents."
- **Recommended action:** Replace icon color with Navy, background tint with Navy/10.

### [M5] Multiple modals — Gold #A08C5A in focus ring accents
- **Files:** ProfileModal.tsx:113,142,164,187; TeamInviteModal.tsx:330,349,446; SmartUploadModal.tsx:645,683,705,719,733,745; and 15+ other modal files
- **Checklist item:** C2
- **Evidence:** `focus:ring-[#A08C5A]` or `focus-visible:ring-[#A08C5A]/50` on input fields across most modal files.
- **Why MEDIUM:** Focus rings are transient UI state indicators. The rule says "never in accents." Input focus rings are the most common accent pattern in the codebase.
- **Recommended action:** Standardize focus ring to Navy `focus:ring-[#1E2D4D]` or a blue-tinted ring.

### [M6] DemoConversionModal — "compliance scores" and "jurisdiction" (admin-only)
- **File:** `src/components/demo/DemoConversionModal.tsx:52,66`
- **Checklist item:** B
- **Evidence:** Line 52: `"Jurisdiction: {session.health_authority}"`, Line 66: `"Sample compliance scores"`
- **Why MEDIUM:** Admin-only modal (not customer-facing), but these terms bleed into admin vocabulary. Lower severity since only platform_admin sees it.
- **Recommended action:** Replace "Jurisdiction" with "Health Authority" and "compliance scores" with "compliance data."

### [M7] Configure.tsx AddOrgModal — "Trial" status option
- **File:** `src/pages/admin/Configure.tsx:364`
- **Checklist item:** I1
- **Evidence:** `<option value="trial">Trial</option>` in the organization status dropdown.
- **Why MEDIUM:** Admin-only, but creates "trial" status records in Supabase that could surface elsewhere. The launch blocker explicitly removed trial language.
- **Recommended action:** Remove "Trial" option or rename to "Evaluation" if the status is needed operationally.

### [M8] WelcomeModal — Sets `onboarding_completed: true` on dismiss
- **File:** `src/components/WelcomeModal.tsx:35`
- **Checklist item:** F2 (cross-reference open HIGH bug)
- **Evidence:** `await supabase.from('user_profiles').update({ onboarding_completed: true }).eq('id', profile.id)` — fires when user clicks "Let's build your kitchen's foundation" or the X button.
- **Why MEDIUM:** The WelcomeModal dismissal marks onboarding as complete before the user has actually completed any onboarding steps. This contributes to the canonical onboarding path deviation bug (F2). The latch prevents re-triggering.
- **Recommended action:** This modal should not set `onboarding_completed`. That flag should be set by `evaluateOnboardingComplete()` which checks real completion criteria.

### [M9] RiskFreeStatusModal — 60-day window hardcoded
- **File:** `src/components/RiskFreeStatusModal.tsx:63,69`
- **Checklist item:** H2
- **Evidence:** `"Day {e.days_elapsed} of 60"` and `<ProgressBar value={e.days_elapsed} max={60} />` — the `60` is hardcoded in the modal rather than read from the eligibility object or ToS config.
- **Why MEDIUM:** If the Risk-Free guarantee period changes, this modal will display stale values. The eligibility API provides `days_remaining` and `guarantee_window_end` dynamically, but the denominator `60` is static.
- **Recommended action:** Derive total window from `e.days_elapsed + e.days_remaining` or add a `total_window_days` field to the eligibility API.

### [M10] RiskFreeStatusModal — Brittle DOM query for close
- **File:** `src/components/RiskFreeStatusModal.tsx:153`
- **Checklist item:** D (structure)
- **Evidence:** `document.querySelector('[data-rfm-close]') as HTMLButtonElement` — the "Continue using EvidLY" button closes the modal by querying the DOM for the close button.
- **Why MEDIUM:** This bypasses React's data flow and is fragile. If the close button's `data-rfm-close` attribute changes, the CTA silently breaks.
- **Recommended action:** Pass `onClose` directly to the `EligibleContent` component and call it from the button handler.

---

## LOW Findings

### [L1] SmartUploadModal — Gold #A08C5A in Sparkles icon and progress animation
- **File:** `src/components/SmartUploadModal.tsx:342,512`
- **Checklist item:** C2
- **Evidence:** Line 342: `<Sparkles size={20} style={{ color: '#A08C5A' }} />` (header icon). Line 512: gradient `linear-gradient(90deg, #1E2D4D, #A08C5A)` in classification progress bar.
- **Why LOW:** These are transient UI decorations. The Sparkles icon is a visual accent and the progress bar is a brief animation during classification.
- **Recommended action:** Replace with Navy tones.

### [L2] Admin ConfigModal uses `<h3>` instead of `<h2>` for title
- **File:** `src/pages/admin/Configure.tsx:57`
- **Checklist item:** D6
- **Evidence:** `<h3 className="text-base font-bold text-navy">{title}</h3>` — modal titles should be `<h2>` per accessibility guidelines.
- **Why LOW:** Admin-only. Functional but technically incorrect heading level.
- **Recommended action:** Change `<h3>` to `<h2>`.

### [L3] SkipReasonModal — No explicit close button (X)
- **File:** `src/components/onboarding/responsibilities/SkipReasonModal.tsx`
- **Checklist item:** D5
- **Evidence:** The modal has Cancel and Skip buttons but no visible X close affordance. Escape key works (inherited from Modal.jsx) and Cancel closes it, but no dedicated close icon.
- **Why LOW:** Functional — user can Cancel or press Escape. But a visible X close button is a standard modal pattern.
- **Recommended action:** Add an X close button consistent with other modals.

### [L4] ProfileModal — `window.location.reload()` after save
- **File:** `src/components/ProfileModal.tsx:84`
- **Checklist item:** D (structure)
- **Evidence:** `window.location.reload()` on successful profile save. This forces a full page reload, which loses any unsaved state in parent components and provides a jarring UX.
- **Why LOW:** Functional but poor UX. A context refresh or invalidation would be cleaner.
- **Recommended action:** Refresh user context/profile via AuthContext instead of hard reload.

### [L5] K2CInviteModal — Gold gradient used as decorative background
- **File:** `src/components/referral/K2CInviteModal.tsx:295`
- **Checklist item:** C2
- **Evidence:** `background: 'linear-gradient(135deg, #A08C5A, #C4AE7A)'` — decorative gradient.
- **Why LOW:** This is in the referral invitation flow which may be a lower-visibility surface.
- **Recommended action:** Replace gradient with Navy-toned gradient.

---

## Passes

| Checklist | Status | Notes |
|-----------|--------|-------|
| A1 — PPP voice where applicable | PASS | WelcomeModal, RiskFreeStatusModal, and onboarding modals use prediction/prevention framing. Operational modals (ProfileModal, TempLog modals) are correctly N/A. |
| A3 — Kitchen leader framing | PASS | WelcomeModal subtext addresses each role directly. Emotional copy config at `src/config/emotionalCopy.ts` is well-crafted per role. |
| A4 — Empty states with PPP framing | N/A | Most modals do not have empty states; they are form-centric. IdentifyVendorModal Path B empty state ("No vendors on file") is neutral and acceptable. |
| B — "operators" term | PASS | Not found in any customer-facing modal copy. |
| B — "monitor" / "track" standalone | PASS | Not found as standalone verbs in any modal copy. |
| B — "Get Started" as CTA | PASS | No modal uses "Get Started" as a CTA button label. WelcomeModal uses "Let's build your kitchen's foundation." |
| C1 — Navy/Cream/Footer tokens | PASS | Navy `#1E2D4D` used consistently for headings, text, and primary buttons. Cream `#FAF7F0` used for backgrounds. Footer `#283f6a` not applicable to modals. |
| C4 — Deprecated icon absent | PASS | No deprecated icon found in any modal. Shield SVG (EvidLY brand-mark) used consistently. |
| C5 — Tagline accuracy | PASS | No tagline rendered in any modal. Brand-mark appears without tagline. |
| D3 — Escape closes modal | PASS | Both `Modal.jsx` (line 16) and `ModalShell` (inherited via close callback) support Escape key to close. |
| D4 — Backdrop click closes modal | PASS | `Modal.jsx` supports `closeOnBackdrop` (default true). WelcomeModal explicitly sets `closeOnBackdrop={false}` which is intentional for the welcome flow. |
| D5 — Close affordance keyboard-reachable | PASS | All modals (except SkipReasonModal — L3) have an X button or Cancel button that is keyboard-reachable via Tab. All close buttons have `aria-label="Close"`. |
| D7 — Mobile 375×812 rendering | PASS | `Modal.jsx` uses `max-h-[calc(100vh-2rem)]` with `overflow-y-auto`. Mobile-specific padding via `sm:` breakpoints in WelcomeModal, TeamInviteModal, AddLocationModal. |
| D8 — Tab order | PASS (with caveat) | Interactive elements follow logical DOM order. No explicit `tabIndex` manipulation detected that would break natural flow. Caveat: without focus trap (H5), Tab escapes the modal entirely. |
| E1 — Supabase query scoping | PASS | TeamInviteModal scopes via `organization_id`. UploadDocumentModal scopes via `organizationId`. IdentifyVendorModal vendor query chains through `vendor_client_relationships.organization_id`. No direct `organization_id` queries on `temperature_logs`. |
| G1/G2 — Quick Actions Bar interaction | PASS | `Modal.jsx` uses `z-[9999]` which renders above `QuickActionsBar`. Body overflow is locked (`overflow: hidden`) while modal is open, preventing scroll to the bar. ModalShell uses `z-50` which should also suffice. |
| I1 — No trial language in user-facing modals | PASS | No `trial_period_days` or trial copy found in any user-facing modal. Configure.tsx has "Trial" status option (M7) but that is admin-only. |
| I2 — Accept.blue / Stripe in user-facing copy | PASS | No Stripe or Accept.blue branding found in any user-facing modal copy. `IntegrationDetailModal.tsx:56` references `'stripe'` in a code array but this is internal integration config, not rendered user copy. |
| J1 — Kitchen-leader-down positioning | PASS | WelcomeModal, emotional copy config, and onboarding modals all lead with the kitchen leader perspective. Role-aware subtext starts from the user's role, not from inspections/jurisdiction. |

---

## Open Questions for Arthur

1. **WelcomeModal rewrite scope:** The founder letter in `WelcomeModal.tsx` contains multiple banned terms ("scoring," "compliance score," "compliance" as product noun). Should the entire letter be rewritten to PPP voice, or is the current copy considered approved founder-voice that is exempt from the banned terms list?

2. **ShareModal backend:** `ShareModal.tsx` has no real backend — `handleSend` is a simulated 1.5s delay. Is this modal intended to ship as-is (demo-only), or does it need to be wired to an edge function before launch?

3. **Gold in focus rings:** Gold `#A08C5A` is used as the focus ring color on input fields in 15+ modals. This is the most widespread brand-token deviation. Should focus rings move to Navy, or is this an approved exception for interactive affordance?

4. **AddLocationModal "Jurisdiction" label:** Line 177 shows `"Jurisdiction / Health Dept"`. The underlying Supabase column is named `jurisdiction_slug`. Should the customer-facing label change to "County / Health Dept" while keeping the data model column name unchanged?

5. **RiskFreeStatusModal 60-day hardcode:** The 60-day window is hardcoded in the modal display (lines 63, 69) rather than derived from the eligibility API. Is the guarantee window locked at 60 days in ToS, or could it change per customer?

6. **WelcomeModal `onboarding_completed` latch:** Dismissing the WelcomeModal sets `onboarding_completed: true` before any onboarding work is done. Is this the intended behavior, or should the flag only be set after `evaluateOnboardingComplete()` confirms real completion?
