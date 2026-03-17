# E2E-TEST-ADMIN-01 Manual Test Checklist

**Date:** _______________
**Tester:** _______________
**Environment:** https://app.getevidly.com

## Prerequisites

- [ ] Admin browser: logged in as `arthur@getevidly.com` (platform_admin)
- [ ] Operator browser: logged in as operator account (email: _______________)
- [ ] Kitchen Staff account available (email: _______________)
- [ ] HOODOPS_WEBHOOK_SECRET available from Supabase dashboard

---

## TEST 1 — Signal Pipeline (Admin to Operator)

### Create Draft
1. [ ] Admin: navigate to `/admin/intelligence-admin`
2. [ ] Click "+ New Signal"
3. [ ] Fill: Title = "E2E Test Signal -- [today's date]"
4. [ ] Fill: Summary = "This is an end-to-end test signal. Disregard."
5. [ ] Set Type = `game_plan`, Priority = `medium`
6. [ ] Click Save (draft, not publish)
7. [ ] Signal appears in queue

### Verify Hidden
8. [ ] Operator: navigate to `/insights/intelligence`
9. [ ] **VERIFY:** Test signal does NOT appear in feed

### Publish and Verify
10. [ ] Admin: find test signal in queue, click "Approve & Publish"
11. [ ] Operator: refresh `/insights/intelligence`
12. [ ] **VERIFY:** Signal appears in intelligence feed (within 60s)
13. [ ] **VERIFY:** Bell badge count incremented by 1
14. [ ] **VERIFY:** Dashboard banner does NOT appear (game_plan + medium = no banner)

### Critical Priority Banner
15. [ ] Admin: change signal priority to `critical`, republish
16. [ ] Operator: go to `/dashboard`
17. [ ] **VERIFY:** Dashboard banner appears for the signal

### Dismiss
18. [ ] Operator: click X to dismiss banner
19. [ ] **VERIFY:** Banner disappears
20. [ ] **VERIFY:** signal_reads table has entry (check Supabase)

### Delivery Status
21. [ ] Admin: go to Published tab
22. [ ] **VERIFY:** Signal shows delivery_status = "delivered"

### Cleanup
23. [ ] Admin: delete or unpublish the test signal

**RESULT:** PASS / FAIL
**Notes:** _______________________________________________________________

---

## TEST 2 — Feature Flags

### Disable Leaderboard
1. [ ] Admin: navigate to `/admin/feature-flags`
2. [ ] Find "Leaderboard" flag
3. [ ] Toggle it OFF
4. [ ] Operator: navigate to `/leaderboard`
5. [ ] **VERIFY:** FeatureGate renders (disabled variant visible)
6. [ ] **VERIFY:** Gate message is relevant (not blank, not error)

### Re-enable Leaderboard
7. [ ] Admin: toggle Leaderboard back ON
8. [ ] Operator: reload `/leaderboard`
9. [ ] **VERIFY:** Leaderboard renders normally (no gate)

### Countdown Gate
10. [ ] Admin: find "Insurance Risk" flag
11. [ ] Set trigger to `fixed_date` with a future date
12. [ ] Operator: navigate to `/insurance-risk`
13. [ ] **VERIFY:** Countdown timer gate visible with correct go-live date
14. [ ] Admin: revert Insurance Risk flag to `always_on`

**RESULT:** PASS / FAIL
**Notes:** _______________________________________________________________

---

## TEST 3 — User Management

### Suspend
1. [ ] Admin: navigate to `/admin/users`
2. [ ] Find operator account in list
3. [ ] Click Suspend button
4. [ ] Confirm in modal
5. [ ] Operator: try to access any page
6. [ ] **VERIFY:** Redirected to `/suspended`
7. [ ] **VERIFY:** Page shows "Account Suspended" message
8. [ ] **VERIFY:** Contact email (founders@getevidly.com) visible

### Unsuspend
9. [ ] Admin: click Unsuspend on the operator account
10. [ ] Operator: log in again
11. [ ] **VERIFY:** Login succeeds
12. [ ] **VERIFY:** No redirect to /suspended

### Audit Trail
13. [ ] Admin: navigate to `/admin/audit-log`
14. [ ] **VERIFY:** Suspend action logged (actor, timestamp, user_id)
15. [ ] **VERIFY:** Unsuspend action logged

**RESULT:** PASS / FAIL
**Notes:** _______________________________________________________________

---

## TEST 4 — Violation Outreach

### Page Load
1. [ ] Admin: navigate to `/admin/violation-outreach`
2. [ ] **VERIFY:** Page loads without error
3. [ ] **VERIFY:** Prospect queue OR empty state visible

### If Queue Has Prospects
4. [ ] **VERIFY:** Relevance scores visible on prospect cards
5. [ ] Click "Generate Letter" on top prospect
6. [ ] **VERIFY:** Letter generates within 10 seconds
7. [ ] Check Supabase: `SELECT * FROM outreach_touches ORDER BY created_at DESC LIMIT 1`
8. [ ] **VERIFY:** Record was created

### If Queue Is Empty
4a. [ ] **VERIFY:** Empty state renders cleanly
5a. [ ] **VERIFY:** No fake/placeholder data visible

**RESULT:** PASS / FAIL
**Notes:** _______________________________________________________________

---

## TEST 5 — HoodOps Webhook

### Send Test Webhook

Run this curl command (replace bracketed values):

```bash
curl -X POST https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/hoodops-webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: [HOODOPS_WEBHOOK_SECRET]" \
  -d '{
    "event_type": "service.completed",
    "event_id": "e2e-test-001",
    "service_type_code": "KEC",
    "vendor_id": "[VENDOR_UUID]",
    "location_id": "[LOCATION_UUID]",
    "org_id": "[ORG_UUID]",
    "service_date": "[TODAY_ISO]",
    "technician_name": "E2E Test Technician",
    "certificate_url": "https://example.com/test-cert.pdf",
    "notes": "E2E test service record -- delete after test"
  }'
```

### Verify
1. [ ] **VERIFY:** HTTP 200 returned
2. [ ] Check: `SELECT * FROM vendor_service_records WHERE event_id = 'e2e-test-001';`
3. [ ] **VERIFY:** Record exists
4. [ ] **VERIFY:** safeguard_type = 'hood_cleaning'
5. [ ] Operator: Facility Safety page -> PSE hood cleaning
6. [ ] **VERIFY:** Last service date updated
7. [ ] Check: `SELECT * FROM platform_audit_log WHERE action = 'edge_fn.hoodops_webhook' ORDER BY created_at DESC LIMIT 1;`
8. [ ] **VERIFY:** Webhook call logged

### Cleanup
9. [ ] Run: `DELETE FROM vendor_service_records WHERE event_id = 'e2e-test-001';`

**RESULT:** PASS / FAIL
**Notes:** _______________________________________________________________

---

## TEST 6 — Audit Log Completeness

### Entries Present (after Tests 1-5)
1. [ ] Admin: navigate to `/admin/audit-log`
2. [ ] **VERIFY:** Signal created action logged
3. [ ] **VERIFY:** Signal published action logged
4. [ ] **VERIFY:** Feature flag toggled OFF logged
5. [ ] **VERIFY:** Feature flag toggled ON logged
6. [ ] **VERIFY:** User suspended action logged
7. [ ] **VERIFY:** User unsuspended action logged
8. [ ] **VERIFY:** Webhook call logged
9. [ ] **VERIFY:** All entries show correct actor email, timestamp, resource

### Filters
10. [ ] Filter by actor: `arthur@getevidly.com`
11. [ ] **VERIFY:** Shows only Arthur's actions
12. [ ] Filter by action category: "Admin"
13. [ ] **VERIFY:** Shows flag + user actions
14. [ ] Filter by date range: today only
15. [ ] **VERIFY:** Shows only today's entries
16. [ ] Click to expand a row
17. [ ] **VERIFY:** old_value / new_value JSON diff renders

### CSV Export
18. [ ] Click "Export CSV"
19. [ ] **VERIFY:** CSV file downloads
20. [ ] **VERIFY:** CSV contains all visible columns
21. [ ] Refresh audit log
22. [ ] **VERIFY:** Export action itself appears in new audit log entry

**RESULT:** PASS / FAIL
**Notes:** _______________________________________________________________

---

## TEST 7 — MFA Enforcement

### Enrollment
1. [ ] Admin: create new platform_admin test account in `/admin/users`
   - Email: _______________
2. [ ] Open private/incognito browser window
3. [ ] Log in with test account
4. [ ] **VERIFY:** Immediately redirected to `/setup-mfa`
5. [ ] **VERIFY:** Cannot navigate to any other page
6. [ ] **VERIFY:** TOTP QR code displays
7. [ ] Scan QR code with authenticator app (Google Auth, Authy, etc.)
8. [ ] Enter 6-digit code and submit
9. [ ] **VERIFY:** Redirected to dashboard after enrollment
10. [ ] Check Supabase: `SELECT * FROM user_mfa_config WHERE user_id = '[TEST_USER_ID]';`
11. [ ] **VERIFY:** mfa_enabled = true

### Challenge
12. [ ] Log out of test account
13. [ ] Log back in with email + password
14. [ ] **VERIFY:** MFA challenge screen appears (6-digit code input)
15. [ ] Enter TOTP code from authenticator app
16. [ ] **VERIFY:** Access granted, redirected to dashboard

### Wrong Code
17. [ ] Log out and log back in
18. [ ] Enter wrong TOTP code (e.g., 000000)
19. [ ] **VERIFY:** Error message "Invalid code. Try again."
20. [ ] Enter correct code
21. [ ] **VERIFY:** Access granted

### Cleanup
22. [ ] Admin: delete test account

**RESULT:** PASS / FAIL
**Notes:** _______________________________________________________________

---

## TEST 8 — Session Timeout

### Setup (Optional: reduce timeout for testing)
```sql
UPDATE session_policy SET idle_timeout_minutes = 2 WHERE role = 'platform_admin';
```

### Warning Modal
1. [ ] Log in as platform_admin
2. [ ] Go to `/admin/dashboard`
3. [ ] Stop all mouse/keyboard activity
4. [ ] Wait for warning period (25 min with default, or ~1:45 with 2min timeout)
5. [ ] **VERIFY:** Warning modal appears with "Session expiring soon"
6. [ ] **VERIFY:** Countdown timer shows minutes:seconds
7. [ ] Click "Stay signed in"
8. [ ] **VERIFY:** Modal closes
9. [ ] **VERIFY:** Timer resets (no immediate re-warning)

### Auto Logout
10. [ ] Go idle again, let warning appear
11. [ ] Do NOT click "Stay signed in"
12. [ ] Wait for countdown to reach 0:00
13. [ ] **VERIFY:** Auto logout occurs
14. [ ] **VERIFY:** Redirected to `/admin-login` (NOT `/login`)
15. [ ] Check: `SELECT * FROM platform_audit_log WHERE action LIKE '%session%' ORDER BY created_at DESC LIMIT 1;`
16. [ ] **VERIFY:** Session expiry logged

### Cleanup
```sql
UPDATE session_policy SET idle_timeout_minutes = 15 WHERE role = 'platform_admin';
```

**RESULT:** PASS / FAIL
**Notes:** _______________________________________________________________

---

## TEST 9 — Role Gates

### Kitchen Staff
1. [ ] Log in as Kitchen Staff account
2. [ ] **VERIFY:** Admin nav items NOT visible (Sales Pipeline, Demo Generator, etc.)
3. [ ] Navigate to `/admin/users`
4. [ ] **VERIFY:** Redirected away (to /dashboard or /login)
5. [ ] Check dashboard
6. [ ] **VERIFY:** Workforce Risk pillar NOT visible
7. [ ] **VERIFY:** CIC scores NOT visible anywhere

### Facilities Role (if available)
8. [ ] Log in as Facilities role account
9. [ ] Go to `/insights/intelligence`
10. [ ] **VERIFY:** Only facility/fire safety signals visible
11. [ ] **VERIFY:** Food safety signals NOT visible

### Owner/Operator
12. [ ] Log in as owner_operator
13. [ ] **VERIFY:** Full operator dashboard visible
14. [ ] **VERIFY:** Admin nav NOT visible
15. [ ] **VERIFY:** Workforce Risk visible
16. [ ] **VERIFY:** CIC scores NOT visible (carrier-facing only)

**RESULT:** PASS / FAIL
**Notes:** _______________________________________________________________

---

## TEST 10 — AI Costs Dashboard

### Tab Load
1. [ ] Admin: navigate to `/admin/intelligence-admin`
2. [ ] Click "$ AI Costs" tab
3. [ ] **VERIFY:** Tab loads without error
4. [ ] **VERIFY:** KPI cards visible:
   - [ ] Today's Spend
   - [ ] Monthly Spend
   - [ ] Budget %
   - [ ] Avg Cost/Signal

### Classify a Signal
5. [ ] Switch to All/queue tab
6. [ ] Find an unclassified signal (look for "Classify" button)
7. [ ] Click "Classify"
8. [ ] **VERIFY:** Loading spinner shows "Classifying..."
9. [ ] **VERIFY:** Classification completes (risk badges appear)
10. [ ] Switch back to AI Costs tab
11. [ ] **VERIFY:** New entry in classification log table
12. [ ] **VERIFY:** Token counts and cost shown
13. [ ] **VERIFY:** Today's Spend KPI updated

### CSV Export
14. [ ] Click "Export CSV" on classification log
15. [ ] **VERIFY:** CSV downloads with all columns

**RESULT:** PASS / FAIL
**Notes:** _______________________________________________________________

---

## FINAL RESULTS

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Signal Pipeline | PASS / FAIL | |
| 2 | Feature Flags | PASS / FAIL | |
| 3 | User Management | PASS / FAIL | |
| 4 | Violation Outreach | PASS / FAIL | |
| 5 | HoodOps Webhook | PASS / FAIL | |
| 6 | Audit Log | PASS / FAIL | |
| 7 | MFA Enforcement | PASS / FAIL | |
| 8 | Session Timeout | PASS / FAIL | |
| 9 | Role Gates | PASS / FAIL | |
| 10 | AI Costs Dashboard | PASS / FAIL | |

**TOTAL: ___/10 PASS**

**FAILURES:**

| Test | What Failed | Error/Behavior |
|------|-------------|----------------|
| | | |

**LAUNCH READINESS:** READY / NOT READY

**Signed:** _______________
**Date:** _______________
