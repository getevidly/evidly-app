# Secrets Rotation Runbook

## When to Rotate

- **Immediately:** Suspected or confirmed exposure (git leak, contractor offboarding, breach)
- **Immediately:** Any team member with secret access departs
- **Every 90 days:** SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
- **Annually:** Stable tokens (RESEND_API_KEY, TWILIO credentials, ANTHROPIC_API_KEY)

---

## SUPABASE_SERVICE_ROLE_KEY

**Impact:** All Edge Functions stop working until updated. HIGH URGENCY.

1. Go to Supabase Dashboard > Settings > API
2. Click "Rotate service_role key" (old key immediately invalid)
3. Update in Supabase: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<new_key>`
4. Redeploy Edge Functions: `supabase functions deploy`
5. Verify Edge Functions operational (check function logs)
6. Verify vendor upload still works end-to-end

---

## VITE_SUPABASE_ANON_KEY

**Impact:** Frontend stops connecting to Supabase until redeployed. This key is PUBLIC (embedded in JS bundle) but scoped by RLS.

1. Go to Supabase Dashboard > Settings > API
2. Rotate the anon key
3. Update in Vercel: Settings > Environment Variables > VITE_SUPABASE_ANON_KEY (both Preview and Production)
4. Update `.env.local` for local development
5. Redeploy: `npx vercel --prod --yes`
6. Verify app loads and auth works

---

## CRON_SECRET

**Impact:** All cron Edge Functions reject requests until updated. Scheduled jobs (reminders, alerts) stop.

1. Generate new secret: `openssl rand -hex 32`
2. Update in Supabase: `supabase secrets set CRON_SECRET=<new_secret>`
3. Update cron job configuration (Supabase Dashboard > Edge Functions > Schedules) with new `x-cron-secret` header value
4. Redeploy Edge Functions: `supabase functions deploy`
5. Verify cron functions accept requests (check function invocation logs)

---

## RESEND_API_KEY

**Impact:** All email sending stops until updated. Vendor reminders, document alerts, notifications fail silently.

1. Generate new API key in Resend Dashboard (https://resend.com/api-keys)
2. Do NOT revoke old key yet
3. Update in Supabase: `supabase secrets set RESEND_API_KEY=<new_key>`
4. Redeploy Edge Functions: `supabase functions deploy`
5. Verify a test email sends (trigger a document alert or reminder)
6. Revoke old key in Resend Dashboard

---

## TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER

**Impact:** All SMS sending stops until updated. Vendor SMS reminders and overdue alerts fail silently.

1. Go to Twilio Console (https://console.twilio.com)
2. For AUTH_TOKEN: Click "Rotate" on the Auth Token (old token valid for 24h)
3. Update in Supabase:
   ```
   supabase secrets set TWILIO_ACCOUNT_SID=<sid>
   supabase secrets set TWILIO_AUTH_TOKEN=<new_token>
   supabase secrets set TWILIO_FROM_NUMBER=<number>
   ```
4. Redeploy Edge Functions: `supabase functions deploy`
5. Verify SMS delivery (trigger a test reminder)

---

## ANTHROPIC_API_KEY

**Impact:** AI features stop working (AI Advisor, copilot chat, document analysis, weekly digest). Non-critical for compliance operations.

1. Generate new key in Anthropic Console (https://console.anthropic.com/settings/keys)
2. Do NOT revoke old key yet
3. Update in Supabase: `supabase secrets set ANTHROPIC_API_KEY=<new_key>`
4. Redeploy Edge Functions: `supabase functions deploy`
5. Verify AI chat responds (test via AI Advisor page)
6. Revoke old key in Anthropic Console

---

## STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET

**Impact:** Billing stops working. New subscriptions, upgrades, and webhook processing fail.

1. Generate new keys in Stripe Dashboard (https://dashboard.stripe.com/apikeys)
2. For webhook secret: Create new webhook endpoint or rotate signing secret
3. Update in Supabase:
   ```
   supabase secrets set STRIPE_SECRET_KEY=<new_key>
   supabase secrets set STRIPE_WEBHOOK_SECRET=<new_secret>
   ```
4. Update in Vercel (if used client-side): VITE_STRIPE_PUBLISHABLE_KEY
5. Redeploy Edge Functions and frontend
6. Verify a test payment or webhook event processes

---

## VITE_RECAPTCHA_SITE_KEY

**Impact:** Login and vendor login forms stop validating reCAPTCHA. Users can still log in but without bot protection.

1. Generate new key pair at https://www.google.com/recaptcha/admin
2. Update SITE KEY in Vercel: VITE_RECAPTCHA_SITE_KEY
3. Update SECRET KEY in Supabase (if server-side validation exists)
4. Redeploy frontend: `npx vercel --prod --yes`
5. Verify login form shows reCAPTCHA and validates

---

## After Any Rotation

- [ ] Update `.env.example` with placeholder description (NEVER the actual value)
- [ ] Notify affected team members
- [ ] Log rotation in a secure internal record (date, secret name, reason, who rotated)
- [ ] Monitor Sentry for new errors in the 30 minutes after rotation
- [ ] Verify application health (load dashboard, test login, check Edge Function logs)
- [ ] If rotation was due to exposure: audit access logs for unauthorized usage during exposure window
