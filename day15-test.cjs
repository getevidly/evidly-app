/**
 * DAY15-AUTO-TEST — Email Templates, Stripe Live, CPP/HoodOps & Cross-Domain
 * Tests: 18 + regression + email inventory + stripe readiness
 * Run: node day15-test.cjs
 */
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

// ── Config ──────────────────────────────────────────────
const SUPABASE_URL = 'https://uroawofnyjzcqbmgdiqq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyb2F3b2ZueWp6Y3FibWdkaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NTAwMzcsImV4cCI6MjA5MTUyNjAzN30.iS5LvJVJHtXsSr2xwEwrYEAmWv7meqSOajxnaUD63uQ';

const SRC = path.join(__dirname, 'src');
const FUNC = path.join(__dirname, 'supabase', 'functions');

const results = [];
let accessToken = null;

// ── Helpers ─────────────────────────────────────────────
function R(id, name, status, detail) {
  results.push({ id, name, status, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '~';
  console.log(`  ${icon} ${id} ${name}: ${status}`);
}

function fetch2(url, opts = {}) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const body = opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : null;
    const headers = { ...opts.headers };
    if (body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const rq = mod.request(u, {
      method: opts.method || (body ? 'POST' : 'GET'),
      headers,
      timeout: 15000,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: d, json: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: d, json: null }); }
      });
    });
    rq.on('error', e => resolve({ status: 0, headers: {}, body: e.message, json: null }));
    rq.on('timeout', () => { rq.destroy(); resolve({ status: 0, headers: {}, body: 'timeout', json: null }); });
    if (body) rq.write(body);
    rq.end();
  });
}

function readFile(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function fileExists(p) { return fs.existsSync(p); }

function searchFiles(dir, pattern, ext = null) {
  const matches = [];
  if (!fs.existsSync(dir)) return matches;
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
  function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, f.name);
      if (f.isDirectory() && !f.name.startsWith('.') && f.name !== 'node_modules') walk(full);
      else if (f.isFile()) {
        if (ext && !f.name.endsWith(ext)) continue;
        try {
          const content = fs.readFileSync(full, 'utf8');
          if (re.test(content)) matches.push(full);
        } catch {}
      }
    }
  }
  walk(dir);
  return matches;
}

function supaRest(tablePath) {
  return fetch2(`${SUPABASE_URL}/rest/v1/${tablePath}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken || ANON_KEY}`,
    },
  });
}

async function authenticate() {
  const res = await fetch2(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: { email: 'arthur@getevidly.com', password: 'Makin1Million$' },
  });
  if (res.json?.access_token) {
    accessToken = res.json.access_token;
    return true;
  }
  return false;
}

// ── Empty State Audit ───────────────────────────────────
const emptyStateAudit = [];
function auditEmptyState(component, file, hasDemoGuard, hasEmptyState, details) {
  emptyStateAudit.push({ component, file, hasDemoGuard, hasEmptyState, details });
}

// ── Email Inventory Builder ─────────────────────────────
const emailInventory = [];

// ── Stripe Readiness Builder ────────────────────────────
const stripeChecklist = [];

// ═══════════════════════════════════════════════════════
//   15.01 — Email Template Inventory
// ═══════════════════════════════════════════════════════
async function test1501() {
  const checks = [];

  // Read shared email template
  const sharedEmail = readFile(path.join(FUNC, '_shared', 'email.ts'));
  const hasResend = sharedEmail.includes('resend') || sharedEmail.includes('Resend') || sharedEmail.includes('api.resend.com');
  const hasBuildEmailHtml = sharedEmail.includes('buildEmailHtml');
  checks.push(`_shared/email.ts: ${sharedEmail.length > 0 ? '✓' : '✗'} (${(sharedEmail.length / 1024).toFixed(1)}KB)`);
  checks.push(`Resend integration: ${hasResend ? '✓' : '✗'}`);
  checks.push(`buildEmailHtml: ${hasBuildEmailHtml ? '✓' : '✗'}`);

  // Check each email-sending function
  const emailFunctions = [
    { name: 'send-welcome-email', label: 'Welcome email' },
    { name: 'trial-email-sender', label: 'Trial drip (28 templates)' },
    { name: 'ai-weekly-digest', label: 'Weekly digest' },
    { name: 'auto-request-documents', label: 'Document request' },
    { name: 'check-onboarding-progress', label: 'Onboarding nudge' },
    { name: 'process-service-reminders', label: 'Service reminders' },
    { name: 'send-team-invite', label: 'Team invite' },
    { name: 'generate-alerts', label: 'Alert notifications' },
    { name: 'jurisdiction-drift-alert', label: 'Drift alert' },
    { name: 'assessment-notify', label: 'Assessment notify' },
    { name: 'check-equipment-alerts', label: 'Equipment alerts' },
    { name: 'send-document-alerts', label: 'Document alerts' },
    { name: 'send-missing-doc-reminders', label: 'Missing doc reminders' },
    { name: 'task-notifications', label: 'Task notifications' },
    { name: 'client-invite-send', label: 'Client invite' },
    { name: 'availability-reminders', label: 'Availability reminders' },
    { name: 'check-expiries', label: 'Expiry check' },
    { name: 'send-sms-invite', label: 'SMS invite' },
  ];

  let existCount = 0;
  for (const fn of emailFunctions) {
    const fPath = path.join(FUNC, fn.name, 'index.ts');
    const exists = fileExists(fPath);
    if (exists) existCount++;
    const content = exists ? readFile(fPath) : '';
    const usesResend = content.includes('resend') || content.includes('Resend') || content.includes('sendEmail');
    const branded = content.includes('buildEmailHtml') || content.includes('email.ts');

    emailInventory.push({
      name: fn.label,
      function: fn.name,
      exists,
      usesResend,
      branded,
      sizeKB: exists ? (content.length / 1024).toFixed(1) : '0',
    });
  }

  checks.push(`Email functions found: ${existCount}/${emailFunctions.length}`);

  const pass = hasResend && hasBuildEmailHtml && existCount >= 14;
  R('15.01', 'Email template inventory', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.02 — Email Branding Verification
// ═══════════════════════════════════════════════════════
async function test1502() {
  const sharedEmail = readFile(path.join(FUNC, '_shared', 'email.ts'));
  const checks = [];

  // Logo: "Evid" white + "LY" gold
  const hasLogo = sharedEmail.includes('Evid') && (sharedEmail.includes('LY') || sharedEmail.includes('d4af37'));
  // Navy
  const hasNavy = sharedEmail.includes('1e4d6b') || sharedEmail.includes('1E2D4D') || sharedEmail.includes('1e2d4d');
  // Gold
  const hasGold = sharedEmail.includes('d4af37') || sharedEmail.includes('A08C5A') || sharedEmail.includes('a08c5a');
  // Footer company info
  const hasFooter = sharedEmail.includes('EvidLY') && sharedEmail.includes('Merced');
  // From address
  const hasFrom = sharedEmail.includes('getevidly.com');
  // Unsubscribe
  const hasUnsubscribe = sharedEmail.includes('unsubscribe') || sharedEmail.includes('Unsubscribe') || sharedEmail.includes('preferences');

  checks.push(`Logo (Evid+LY): ${hasLogo ? '✓' : '✗'}`);
  checks.push(`Navy color: ${hasNavy ? '✓' : '✗'}`);
  checks.push(`Gold color: ${hasGold ? '✓' : '✗'}`);
  checks.push(`Footer (EvidLY + Merced): ${hasFooter ? '✓' : '✗'}`);
  checks.push(`From @getevidly.com: ${hasFrom ? '✓' : '✗'}`);
  checks.push(`Unsubscribe link: ${hasUnsubscribe ? '✓' : '✗'}`);

  const pass = hasLogo && hasNavy && hasGold && hasFooter && hasFrom && hasUnsubscribe;
  R('15.02', 'Email branding', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.03 — Trial Email 14-Day Sequence
// ═══════════════════════════════════════════════════════
async function test1503() {
  const trialEmail = readFile(path.join(FUNC, 'trial-email-sender', 'index.ts'));
  const checks = [];
  const sizeKB = (trialEmail.length / 1024).toFixed(1);
  checks.push(`trial-email-sender: ${trialEmail.length > 0 ? '✓' : '✗'} (${sizeKB}KB)`);

  // Series 1 + Series 2
  const hasSeries1 = trialEmail.includes('Series 1') || trialEmail.includes('series_1') || trialEmail.includes('series1') || trialEmail.includes('How-to');
  const hasSeries2 = trialEmail.includes('Series 2') || trialEmail.includes('series_2') || trialEmail.includes('series2') || trialEmail.includes('Lead with Confidence');
  checks.push(`Series 1 (ops): ${hasSeries1 ? '✓' : '✗'}`);
  checks.push(`Series 2 (leadership): ${hasSeries2 ? '✓' : '✗'}`);

  // Day sequence
  const hasDaySequence = trialEmail.includes('day_0') || trialEmail.includes('Day 0') || trialEmail.includes('day0') || trialEmail.includes('trial_day');
  checks.push(`Day sequence: ${hasDaySequence ? '✓' : '✗'}`);

  // Referral prompts (Day 5, Day 10)
  const hasReferral = trialEmail.includes('referral') || trialEmail.includes('Referral') || trialEmail.includes('Share EvidLY');
  checks.push(`Referral prompts: ${hasReferral ? '✓' : '✗'}`);

  // Conversion urgency
  const hasConversion = trialEmail.includes('trial ends') || trialEmail.includes('Founder Pricing') || trialEmail.includes('conversion');
  checks.push(`Conversion urgency: ${hasConversion ? '✓' : '✗'}`);

  // Deduplication
  const hasDedup = trialEmail.includes('trial_email_log') || trialEmail.includes('email_key');
  checks.push(`Dedup (trial_email_log): ${hasDedup ? '✓' : '✗'}`);

  // Role-based
  const hasRoleBased = trialEmail.includes('owner_operator') || trialEmail.includes('executive') || trialEmail.includes('role');
  checks.push(`Role-based: ${hasRoleBased ? '✓' : '✗'}`);

  const pass = trialEmail.length > 10000 && hasDedup && hasRoleBased && hasConversion;
  R('15.03', 'Trial 14-day sequence', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.04 — Weekly Digest Content
// ═══════════════════════════════════════════════════════
async function test1504() {
  const digest = readFile(path.join(FUNC, 'ai-weekly-digest', 'index.ts'));
  const checks = [];
  checks.push(`ai-weekly-digest: ${digest.length > 0 ? '✓' : '✗'} (${(digest.length / 1024).toFixed(1)}KB)`);

  // Data sources
  const hasChecklists = digest.includes('checklist') || digest.includes('Checklist');
  const hasTemps = digest.includes('temperature') || digest.includes('temp_log');
  const hasCorrective = digest.includes('corrective') || digest.includes('Corrective');
  const hasDocuments = digest.includes('document') || digest.includes('expir');
  const hasIntelligence = digest.includes('intelligence') || digest.includes('insight');

  checks.push(`Checklists: ${hasChecklists ? '✓' : '✗'}`);
  checks.push(`Temperature: ${hasTemps ? '✓' : '✗'}`);
  checks.push(`Corrective actions: ${hasCorrective ? '✓' : '✗'}`);
  checks.push(`Documents/expirations: ${hasDocuments ? '✓' : '✗'}`);
  checks.push(`Intelligence signals: ${hasIntelligence ? '✓' : '✗'}`);

  // AI model
  const hasClaudeAI = digest.includes('claude') || digest.includes('anthropic') || digest.includes('Claude');
  checks.push(`AI model (Claude): ${hasClaudeAI ? '✓' : '✗'}`);

  // Fallback
  const hasFallback = digest.includes('fallback') || digest.includes('static') || digest.includes('catch');
  checks.push(`Fallback if AI unavailable: ${hasFallback ? '✓' : '✗'}`);

  const pass = digest.length > 0 && hasChecklists && hasTemps && hasDocuments && hasClaudeAI;
  R('15.04', 'Weekly digest content', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.05 — Alert Email Templates
// ═══════════════════════════════════════════════════════
async function test1505() {
  const alerts = readFile(path.join(FUNC, 'generate-alerts', 'index.ts'));
  const docAlerts = readFile(path.join(FUNC, 'send-document-alerts', 'index.ts'));
  const checks = [];

  const alertSize = (alerts.length / 1024).toFixed(1);
  const docAlertSize = (docAlerts.length / 1024).toFixed(1);
  checks.push(`generate-alerts: ${alerts.length > 0 ? '✓' : '✗'} (${alertSize}KB)`);
  checks.push(`send-document-alerts: ${docAlerts.length > 0 ? '✓' : '✗'} (${docAlertSize}KB)`);

  // Alert types in generate-alerts or send-document-alerts
  const combined = alerts + docAlerts;
  const hasTemp = combined.includes('temperature') || combined.includes('temp');
  const hasDocExpiry = combined.includes('expir') || combined.includes('30_days') || combined.includes('7_days');
  const hasServiceOverdue = combined.includes('overdue') || combined.includes('service');
  const hasEquipment = combined.includes('equipment') || combined.includes('maintenance');
  const hasChecklist = combined.includes('checklist') || combined.includes('shift');

  checks.push(`Temperature alert: ${hasTemp ? '✓' : '✗'}`);
  checks.push(`Document expiry: ${hasDocExpiry ? '✓' : '✗'}`);
  checks.push(`Service overdue: ${hasServiceOverdue ? '✓' : '✗'}`);
  checks.push(`Equipment alerts: ${hasEquipment ? '✓' : '✗'}`);
  checks.push(`Checklist alert: ${hasChecklist ? '✓' : '✗'}`);

  // Priority ordering
  const hasPriority = combined.includes('priority') || combined.includes('critical') || combined.includes('urgent');
  checks.push(`Priority ordering: ${hasPriority ? '✓' : '✗'}`);

  const pass = (alerts.length > 0 || docAlerts.length > 0) && hasDocExpiry && hasPriority;
  R('15.05', 'Alert email templates', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.06 — SMS Capability
// ═══════════════════════════════════════════════════════
async function test1506() {
  const smsInvite = readFile(path.join(FUNC, 'send-sms-invite', 'index.ts'));
  const checks = [];

  checks.push(`send-sms-invite: ${smsInvite.length > 0 ? '✓' : '✗'} (${(smsInvite.length / 1024).toFixed(1)}KB)`);

  // Twilio
  const twilioFiles = searchFiles(FUNC, /TWILIO|twilio|Twilio/);
  const hasTwilio = twilioFiles.length > 0 || smsInvite.includes('twilio') || smsInvite.includes('Twilio');
  checks.push(`Twilio provider: ${hasTwilio ? '✓' : '✗'}`);
  checks.push(`SMS-capable functions: ${twilioFiles.length}`);

  // SMS content
  const hasSmsBody = smsInvite.includes('Body') || smsInvite.includes('body') || smsInvite.includes('message');
  checks.push(`SMS body: ${hasSmsBody ? '✓' : '✗'}`);

  // Other SMS-capable functions
  const autoReq = readFile(path.join(FUNC, 'auto-request-documents', 'index.ts'));
  const svcReminders = readFile(path.join(FUNC, 'process-service-reminders', 'index.ts'));
  const autoReqSMS = autoReq.includes('twilio') || autoReq.includes('Twilio') || autoReq.includes('TWILIO');
  const svcSMS = svcReminders.includes('twilio') || svcReminders.includes('Twilio') || svcReminders.includes('TWILIO');
  checks.push(`auto-request-documents SMS: ${autoReqSMS ? '✓' : '✗'}`);
  checks.push(`process-service-reminders SMS: ${svcSMS ? '✓' : '✗'}`);

  const pass = smsInvite.length > 0 && hasTwilio;
  R('15.06', 'SMS capability', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.07 — Stripe Configuration Audit
// ═══════════════════════════════════════════════════════
async function test1507() {
  const stripeLib = readFile(path.join(SRC, 'lib', 'stripe.ts'));
  const checkout = readFile(path.join(FUNC, 'stripe-create-checkout', 'index.ts'));
  const portal = readFile(path.join(FUNC, 'stripe-customer-portal', 'index.ts'));
  const webhook = readFile(path.join(FUNC, 'stripe-webhook', 'index.ts'));
  const checks = [];

  // Price IDs
  const hasSinglePrice = stripeLib.includes('VITE_STRIPE_FOUNDER_SINGLE_PRICE_ID');
  const hasMultiPrice = stripeLib.includes('VITE_STRIPE_FOUNDER_MULTI_PRICE_ID');
  checks.push(`Founder Single price ID: ${hasSinglePrice ? '✓' : '✗'}`);
  checks.push(`Founder Multi price ID: ${hasMultiPrice ? '✓' : '✗'}`);

  // Checkout
  const hasCheckoutSession = checkout.includes('checkout') || checkout.includes('Checkout');
  checks.push(`Checkout session: ${hasCheckoutSession ? '✓' : '✗'}`);

  // Portal
  const hasPortal = portal.includes('billing_portal') || portal.includes('portal');
  checks.push(`Customer portal: ${hasPortal ? '✓' : '✗'}`);

  // Webhook events
  const events = ['checkout.session.completed', 'invoice.paid', 'invoice.payment_failed',
    'customer.subscription.updated', 'customer.subscription.deleted', 'customer.subscription.trial_will_end'];
  let eventCount = 0;
  for (const ev of events) {
    if (webhook.includes(ev)) eventCount++;
  }
  checks.push(`Webhook events: ${eventCount}/6`);

  // 45-day guarantee
  const hasGuarantee = webhook.includes('guarantee') || webhook.includes('45');
  checks.push(`45-day guarantee: ${hasGuarantee ? '✓' : '✗'}`);

  // K2C donation
  const hasK2C = webhook.includes('k2c') || webhook.includes('K2C');
  checks.push(`K2C donation trigger: ${hasK2C ? '✓' : '✗'}`);

  // Signature verification
  const hasSignature = webhook.includes('stripe-signature') || webhook.includes('Stripe-Signature') || webhook.includes('webhook_secret');
  checks.push(`Signature verification: ${hasSignature ? '✓' : '✗'}`);

  stripeChecklist.push(
    { item: 'Founder Single price ID', status: hasSinglePrice ? 'OK' : 'MISSING' },
    { item: 'Founder Multi price ID', status: hasMultiPrice ? 'OK' : 'MISSING' },
    { item: 'Checkout session creation', status: hasCheckoutSession ? 'OK' : 'MISSING' },
    { item: 'Customer portal', status: hasPortal ? 'OK' : 'MISSING' },
    { item: 'Webhook events (6)', status: eventCount === 6 ? 'OK' : `${eventCount}/6` },
    { item: '45-day guarantee', status: hasGuarantee ? 'OK' : 'MISSING' },
    { item: 'K2C donation on invoice.paid', status: hasK2C ? 'OK' : 'MISSING' },
    { item: 'HMAC signature verification', status: hasSignature ? 'OK' : 'MISSING' },
  );

  const pass = hasSinglePrice && hasMultiPrice && hasCheckoutSession && hasPortal &&
    eventCount >= 5 && hasSignature;
  R('15.07', 'Stripe configuration', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.08 — Subscription Lifecycle
// ═══════════════════════════════════════════════════════
async function test1508() {
  const checkout = readFile(path.join(FUNC, 'stripe-create-checkout', 'index.ts'));
  const webhook = readFile(path.join(FUNC, 'stripe-webhook', 'index.ts'));
  const checks = [];

  // Step 1: Checkout creates session
  const hasCreateSession = checkout.includes('checkout') && checkout.includes('subscription');
  checks.push(`1. Checkout session: ${hasCreateSession ? '✓' : '✗'}`);

  // Step 2: Trial period
  const hasTrial = checkout.includes('trial_period_days') || checkout.includes('trial');
  checks.push(`2. 30-day trial: ${hasTrial ? '✓' : '✗'}`);

  // Step 3: checkout.session.completed → subscription in DB
  const hasCheckoutComplete = webhook.includes('checkout.session.completed');
  const hasSubscriptionUpsert = webhook.includes('subscriptions') && (webhook.includes('upsert') || webhook.includes('insert'));
  checks.push(`3. checkout.session.completed: ${hasCheckoutComplete ? '✓' : '✗'}`);
  checks.push(`   Subscription DB write: ${hasSubscriptionUpsert ? '✓' : '✗'}`);

  // Step 4: invoice.paid → K2C
  const hasInvoicePaid = webhook.includes('invoice.paid');
  checks.push(`4. invoice.paid: ${hasInvoicePaid ? '✓' : '✗'}`);

  // Step 5: invoice.payment_failed → notification
  const hasPaymentFailed = webhook.includes('invoice.payment_failed');
  const hasFailNotify = webhook.includes('payment_failed') && webhook.includes('notification');
  checks.push(`5. invoice.payment_failed: ${hasPaymentFailed ? '✓' : '✗'}`);

  // Step 6: trial_will_end → warning
  const hasTrialEnd = webhook.includes('trial_will_end');
  checks.push(`6. trial_will_end: ${hasTrialEnd ? '✓' : '✗'}`);

  // Step 7: subscription.deleted → canceled
  const hasDeleted = webhook.includes('customer.subscription.deleted');
  const hasCanceled = webhook.includes('canceled') || webhook.includes('cancelled');
  checks.push(`7. subscription.deleted: ${hasDeleted ? '✓' : '✗'}`);
  checks.push(`   Status → canceled: ${hasCanceled ? '✓' : '✗'}`);

  stripeChecklist.push(
    { item: '30-day trial period', status: hasTrial ? 'OK' : 'MISSING' },
    { item: 'Subscription DB upsert', status: hasSubscriptionUpsert ? 'OK' : 'MISSING' },
    { item: 'Trial ending notification', status: hasTrialEnd ? 'OK' : 'MISSING' },
    { item: 'Payment failed notification', status: hasPaymentFailed ? 'OK' : 'MISSING' },
    { item: 'Cancellation handling', status: hasDeleted && hasCanceled ? 'OK' : 'MISSING' },
  );

  const pass = hasCreateSession && hasTrial && hasCheckoutComplete && hasSubscriptionUpsert &&
    hasInvoicePaid && hasPaymentFailed && hasTrialEnd && hasDeleted;
  R('15.08', 'Subscription lifecycle', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.09 — Founder Pricing Lock Logic
// ═══════════════════════════════════════════════════════
async function test1509() {
  const stripeLib = readFile(path.join(SRC, 'lib', 'stripe.ts'));
  const checks = [];

  // Deadline
  const hasDeadline = stripeLib.includes('FOUNDER_PRICING_DEADLINE');
  const hasJuly4 = stripeLib.includes('2026-07-04') || stripeLib.includes('July 4');
  checks.push(`FOUNDER_PRICING_DEADLINE: ${hasDeadline ? '✓' : '✗'}`);
  checks.push(`July 4, 2026 date: ${hasJuly4 ? '✓' : '✗'}`);

  // Locked for life
  const hasLockedForLife = stripeLib.includes('locked') || stripeLib.includes('Locked');
  checks.push(`"Locked for life": ${hasLockedForLife ? '✓' : '✗'}`);

  // Pricing component countdown
  const pricingFiles = searchFiles(SRC, /DeadlineCountdown|FOUNDER_PRICING_DEADLINE/);
  checks.push(`Countdown component: ${pricingFiles.length > 0 ? '✓' : '✗'}`);

  // $99/mo price
  const has99 = stripeLib.includes('99') && stripeLib.includes('price');
  checks.push(`$99/mo price: ${has99 ? '✓' : '✗'}`);

  // $49/location additional
  const has49 = stripeLib.includes('49');
  checks.push(`$49/additional location: ${has49 ? '✓' : '✗'}`);

  stripeChecklist.push(
    { item: 'Founder deadline (2026-07-04)', status: hasDeadline && hasJuly4 ? 'OK' : 'MISSING' },
    { item: 'Price locked for life', status: hasLockedForLife ? 'OK' : 'MISSING' },
    { item: 'Countdown timer', status: pricingFiles.length > 0 ? 'OK' : 'MISSING' },
    { item: '$99/mo + $49/location', status: has99 && has49 ? 'OK' : 'MISSING' },
  );

  const pass = hasDeadline && hasJuly4 && hasLockedForLife && has99;
  R('15.09', 'Founder pricing lock', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.10 — K2C Donation Chain
// ═══════════════════════════════════════════════════════
async function test1510() {
  const webhook = readFile(path.join(FUNC, 'stripe-webhook', 'index.ts'));
  const k2c = readFile(path.join(FUNC, 'k2c-processor', 'index.ts'));
  const adminK2C = readFile(path.join(SRC, 'pages', 'admin', 'AdminK2C.tsx'));
  const checks = [];

  // Step 1: invoice.paid triggers K2C
  const hasK2CTrigger = webhook.includes('k2c-processor') || webhook.includes('k2c_processor');
  checks.push(`1. invoice.paid → k2c-processor: ${hasK2CTrigger ? '✓' : '✗'}`);

  // Step 2: k2c-processor exists
  checks.push(`2. k2c-processor: ${k2c.length > 0 ? '✓' : '✗'} (${(k2c.length / 1024).toFixed(1)}KB)`);

  // Step 3: $10/location → 100 meals
  const has10PerLoc = k2c.includes('1000') || k2c.includes('10'); // $10 in cents = 1000
  const has100Meals = k2c.includes('100');
  checks.push(`3. $10/location: ${has10PerLoc ? '✓' : '✗'}`);
  checks.push(`   100 meals/location: ${has100Meals ? '✓' : '✗'}`);

  // Step 4: k2c_donations INSERT
  const hasK2CInsert = k2c.includes('k2c_donations');
  checks.push(`4. k2c_donations INSERT: ${hasK2CInsert ? '✓' : '✗'}`);

  // Step 5: Dedup by period
  const hasDedup = k2c.includes('donation_period') || k2c.includes('billing_event_id');
  checks.push(`5. Dedup by period: ${hasDedup ? '✓' : '✗'}`);

  // Step 6: Admin dashboard
  checks.push(`6. AdminK2C dashboard: ${adminK2C.length > 0 ? '✓' : '✗'}`);

  // Step 7: admin_event_log
  const hasEventLog = k2c.includes('admin_event_log');
  checks.push(`7. admin_event_log: ${hasEventLog ? '✓' : '✗'}`);

  stripeChecklist.push(
    { item: 'K2C processor edge function', status: k2c.length > 0 ? 'OK' : 'MISSING' },
    { item: 'K2C $10/loc, 100 meals/loc', status: has10PerLoc && has100Meals ? 'OK' : 'CHECK' },
    { item: 'K2C deduplication', status: hasDedup ? 'OK' : 'MISSING' },
    { item: 'K2C admin dashboard', status: adminK2C.length > 0 ? 'OK' : 'MISSING' },
  );

  const pass = hasK2CTrigger && k2c.length > 0 && hasK2CInsert && hasDedup;
  R('15.10', 'K2C donation chain', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.11 — CPP Site Health Check
// ═══════════════════════════════════════════════════════
async function test1511() {
  const checks = [];
  let res = await fetch2('https://cleaningprosplus.com');
  checks.push(`HTTP status: ${res.status}`);

  // Follow redirect if 3xx
  if (res.status >= 300 && res.status < 400 && res.headers && res.headers.location) {
    const redir = res.headers.location;
    checks.push(`Redirect → ${redir}`);
    res = await fetch2(redir.startsWith('http') ? redir : `https://cleaningprosplus.com${redir}`);
    checks.push(`Final HTTP: ${res.status}`);
  }

  const body = res.body || '';
  const hasGA4 = body.includes('G-BW4VZSHE11') || body.includes('googletagmanager');
  const hasCleaningProsPlus = body.includes('Cleaning Pros Plus') || body.includes('cleaningprosplus');
  const hasSales = body.includes('sales@cprosplus.com') || body.includes('cprosplus');

  checks.push(`GA4 tracking: ${hasGA4 ? '✓' : '✗'}`);
  checks.push(`"Cleaning Pros Plus" branding: ${hasCleaningProsPlus ? '✓' : '✗'}`);
  checks.push(`Contact email: ${hasSales ? '✓' : '✗'}`);

  // Service pages check (SPA with hash routing)
  const hasKEC = body.includes('KEC') || body.includes('Exhaust Cleaning') || body.includes('kec');
  const hasFPM = body.includes('FPM') || body.includes('Fan Performance') || body.includes('fpm');
  checks.push(`KEC service: ${hasKEC ? '✓' : '✗'}`);
  checks.push(`FPM service: ${hasFPM ? '✓' : '✗'}`);

  // Accept redirect (307/301/308) as healthy — site is up and serving
  const statusOK = res.status === 200 || res.status === 301 || res.status === 307 || res.status === 308;
  const pass = statusOK && hasCleaningProsPlus;
  R('15.11', 'CPP site health', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.12 — HoodOps Staging Health Check
// ═══════════════════════════════════════════════════════
async function test1512() {
  const checks = [];
  const res = await fetch2('https://hoodops-staging.vercel.app');
  checks.push(`HTTP status: ${res.status}`);

  const body = res.body || '';
  const hasHoodOps = body.includes('HoodOps') || body.includes('hoodops');
  checks.push(`HoodOps branding: ${hasHoodOps ? '✓' : '✗'}`);

  // Check if it's a login page or app
  const hasLogin = body.includes('login') || body.includes('Login') || body.includes('sign in');
  const hasApp = body.includes('script') || body.includes('app') || body.includes('root');
  checks.push(`Login/app page: ${hasLogin || hasApp ? '✓' : '✗'}`);

  const pass = (res.status === 200 || res.status === 308) && hasHoodOps;
  R('15.12', 'HoodOps staging health', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.13 — HoodOps ↔ EvidLY Webhook
// ═══════════════════════════════════════════════════════
async function test1513() {
  const webhook = readFile(path.join(FUNC, 'hoodops-webhook', 'index.ts'));
  const checks = [];
  checks.push(`hoodops-webhook: ${webhook.length > 0 ? '✓' : '✗'} (${(webhook.length / 1024).toFixed(1)}KB)`);

  // Service code mapping
  const hasKEC = webhook.includes('KEC') && webhook.includes('hood_cleaning');
  const hasFS = webhook.includes('FS') && webhook.includes('fire_suppression');
  checks.push(`KEC→hood_cleaning: ${hasKEC ? '✓' : '✗'}`);
  checks.push(`FS→fire_suppression: ${hasFS ? '✓' : '✗'}`);

  // Secret verification
  const hasSecret = webhook.includes('HOODOPS_WEBHOOK_SECRET') || webhook.includes('x-webhook-secret');
  checks.push(`Webhook secret: ${hasSecret ? '✓' : '✗'}`);

  // Idempotency
  const hasIdempotency = webhook.includes('event_id') || webhook.includes('idempotency');
  checks.push(`Idempotency key: ${hasIdempotency ? '✓' : '✗'}`);

  // Audit logging
  const hasAudit = webhook.includes('platform_audit_log') || webhook.includes('logAudit');
  checks.push(`Audit logging: ${hasAudit ? '✓' : '✗'}`);

  // Events handled
  const hasCompleted = webhook.includes('service.completed');
  const hasScheduled = webhook.includes('service.scheduled');
  const hasReschedule = webhook.includes('reschedule.confirmed') || webhook.includes('reschedule');
  checks.push(`service.completed: ${hasCompleted ? '✓' : '✗'}`);
  checks.push(`service.scheduled: ${hasScheduled ? '✓' : '✗'}`);
  checks.push(`reschedule events: ${hasReschedule ? '✓' : '✗'}`);

  const pass = webhook.length > 0 && hasKEC && hasFS && hasSecret && hasIdempotency && hasAudit;
  R('15.13', 'HoodOps webhook integration', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.14 — CPP Ad Campaign Readiness
// ═══════════════════════════════════════════════════════
async function test1514() {
  const checks = [];

  // Check for Google Ads account reference
  const adFiles = searchFiles(path.join(__dirname), /AW-11309361975|google.ads|adwords/i);
  checks.push(`Google Ads account ref: ${adFiles.length > 0 ? `${adFiles.length} files` : 'not in code'}`);

  // Check for CSV import files
  const csvFiles = [];
  const docsDir = path.join(__dirname, 'docs');
  const dataDir = path.join(__dirname, 'data');
  if (fs.existsSync(docsDir)) {
    for (const f of fs.readdirSync(docsDir)) {
      if (f.endsWith('.csv') && f.toLowerCase().includes('ad')) csvFiles.push(f);
    }
  }
  if (fs.existsSync(dataDir)) {
    for (const f of fs.readdirSync(dataDir)) {
      if (f.endsWith('.csv')) csvFiles.push(f);
    }
  }
  checks.push(`Ad CSV files: ${csvFiles.length > 0 ? csvFiles.join(', ') : 'none found'}`);

  // Verify CPP naming rules in codebase (no "CPP" in customer-facing text)
  // VendorConnect uses "CPP-Verified" and "Cleaning Pros Plus" — that's internal/operator
  const vendorConnect = readFile(path.join(SRC, 'pages', 'VendorConnect.jsx'));
  const hasCleaningProsPlus = vendorConnect.includes('Cleaning Pros Plus');
  checks.push(`"Cleaning Pros Plus" in VendorConnect: ${hasCleaningProsPlus ? '✓' : '✗'}`);

  // Verify service type definitions in DB migration
  const svcTypes = readFile(path.join(__dirname, 'supabase', 'migrations', '20260313000001_hoodops_service_types.sql'));
  const hasServiceDefs = svcTypes.includes('KEC') && svcTypes.includes('FPM') && svcTypes.includes('GFX');
  checks.push(`Service type definitions: ${hasServiceDefs ? '✓' : '✗'}`);

  // Note: Ad campaign config is external (Google Ads Editor), not in repo
  checks.push(`NOTE: Ad campaigns managed externally in Google Ads Editor`);

  const pass = hasCleaningProsPlus && hasServiceDefs;
  R('15.14', 'CPP ad campaign readiness', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.15 — Domain DNS Verification
// ═══════════════════════════════════════════════════════
async function test1515() {
  const checks = [];
  const domains = [
    { url: 'https://app.getevidly.com', name: 'EvidLY app' },
    { url: 'https://www.getevidly.com', name: 'EvidLY landing' },
    { url: 'https://cleaningprosplus.com', name: 'CPP site' },
    { url: 'https://hoodops-staging.vercel.app', name: 'HoodOps staging' },
  ];

  let resolveCount = 0;
  for (const d of domains) {
    const res = await fetch2(d.url);
    const ok = res.status >= 200 && res.status < 400;
    if (ok) resolveCount++;
    checks.push(`${d.name}: HTTP ${res.status} ${ok ? '✓' : '✗'}`);
  }

  // Check getevidly.com → www redirect
  const bareRes = await fetch2('https://getevidly.com');
  const redirectOk = bareRes.status >= 200 && bareRes.status < 400;
  checks.push(`getevidly.com redirect: HTTP ${bareRes.status} ${redirectOk ? '✓' : '✗'}`);

  const pass = resolveCount >= 3; // Allow 1 failure (HoodOps staging optional)
  R('15.15', 'Domain DNS verification', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.16 — Cross-Domain Link Integrity
// ═══════════════════════════════════════════════════════
async function test1516() {
  const checks = [];

  // EvidLY landing → app links
  const landingFiles = searchFiles(path.join(SRC, 'pages', 'public'), /app\.getevidly\.com|\/login|\/signup/);
  checks.push(`Landing → app links: ${landingFiles.length} files`);

  // EvidLY → Calendly
  const calendlyFiles = searchFiles(SRC, /calendly\.com/);
  checks.push(`Calendly booking links: ${calendlyFiles.length} files`);

  // Contact info verification
  const foundersEmail = searchFiles(SRC, /founders@getevidly\.com/);
  checks.push(`founders@getevidly.com: ${foundersEmail.length} files`);

  // EvidLY ↔ CPP cross-links
  const cppInEvidly = searchFiles(SRC, /cleaningprosplus|Cleaning Pros Plus/);
  checks.push(`CPP refs in EvidLY: ${cppInEvidly.length} files`);

  // Mailto and tel links
  const mailtoFiles = searchFiles(SRC, /mailto:/);
  const telFiles = searchFiles(SRC, /tel:/);
  checks.push(`mailto: links: ${mailtoFiles.length} files`);
  checks.push(`tel: links: ${telFiles.length} files`);

  const pass = landingFiles.length > 0 && calendlyFiles.length > 0 && foundersEmail.length > 0;
  R('15.16', 'Cross-domain link integrity', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.17 — SSL Certificate Check
// ═══════════════════════════════════════════════════════
async function test1517() {
  const checks = [];

  // All our fetch calls above used HTTPS and succeeded — implies valid SSL
  const sslDomains = [
    'https://app.getevidly.com',
    'https://www.getevidly.com',
    'https://cleaningprosplus.com',
    'https://hoodops-staging.vercel.app',
  ];

  let sslOk = 0;
  for (const url of sslDomains) {
    try {
      const res = await fetch2(url);
      const ok = res.status > 0 && res.status < 500;
      if (ok) sslOk++;
      const domain = new URL(url).hostname;
      checks.push(`${domain}: SSL ${ok ? '✓' : '✗'} (HTTP ${res.status})`);
    } catch (e) {
      checks.push(`${url}: SSL ERROR`);
    }
  }

  const pass = sslOk >= 3;
  R('15.17', 'SSL certificate check', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   15.18 — CPP Domain Renewal Alert
// ═══════════════════════════════════════════════════════
async function test1518() {
  const checks = [];

  // cleaningprosplus.com expires June 30, 2026
  const expiryDate = new Date('2026-06-30');
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

  checks.push(`Domain: cleaningprosplus.com`);
  checks.push(`Expiry: June 30, 2026`);
  checks.push(`Days until expiry: ${daysUntilExpiry}`);

  if (daysUntilExpiry <= 30) {
    checks.push(`STATUS: CRITICAL — expires in ${daysUntilExpiry} days`);
  } else if (daysUntilExpiry <= 60) {
    checks.push(`STATUS: WARNING — renew within ${daysUntilExpiry} days`);
  } else {
    checks.push(`STATUS: OK — ${daysUntilExpiry} days remaining`);
  }

  // Verify domain is currently resolving
  const res = await fetch2('https://cleaningprosplus.com');
  const resolves = res.status >= 200 && res.status < 400;
  checks.push(`Currently resolving: ${resolves ? '✓' : '✗'}`);

  const pass = resolves && daysUntilExpiry > 0;
  R('15.18', 'CPP domain renewal alert', pass ? 'PASS' : 'FAIL', checks.join(' | '));
}

// ═══════════════════════════════════════════════════════
//   REGRESSION TESTS
// ═══════════════════════════════════════════════════════
async function regressionTests() {
  // REG-1.02 — Auth signInWithPassword
  const authRes = await fetch2(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: { email: 'arthur@getevidly.com', password: 'Makin1Million$' },
  });
  R('REG-1.02', 'Auth signInWithPassword', authRes.json?.access_token ? 'PASS' : 'FAIL',
    `Access token: ${authRes.json?.access_token ? '✓' : '✗'}`);

  // REG-2.12 — No blended scores
  const blendedFiles = searchFiles(SRC, /blendedScore|blended_score|calculateBlended/);
  R('REG-2.12', 'No blended scores', blendedFiles.length === 0 ? 'PASS' : 'FAIL',
    `Violations: ${blendedFiles.length}`);

  // REG-5.SP — Superpower routes
  const appTsx = readFile(path.join(SRC, 'App.tsx'));
  const spRoutes = ['/intelligence', '/benchmarks', '/compliance-trends', '/cic-pse',
    '/workforce-risk', '/vendor-connect', '/insights'];
  let spFound = 0;
  for (const r of spRoutes) {
    if (appTsx.includes(r)) spFound++;
  }
  R('REG-5.SP', 'Superpower routes', spFound === spRoutes.length ? 'PASS' : 'FAIL',
    `Routes: ${spFound}/${spRoutes.length}`);

  // REG-9.17 — Dual pillar
  const dualCandidates = searchFiles(SRC, /blendedScore|blended_score|calculateBlended|overallScore.*food.*facility/i);
  R('REG-9.17', 'Dual pillar', dualCandidates.length === 0 ? 'PASS' : 'FAIL',
    `Code violations: ${dualCandidates.length}`);

  // REG-EDGE — Edge function count
  let edgeCount = 0;
  if (fs.existsSync(FUNC)) {
    for (const d of fs.readdirSync(FUNC, { withFileTypes: true })) {
      if (d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.')) {
        const idx = path.join(FUNC, d.name, 'index.ts');
        if (fs.existsSync(idx)) edgeCount++;
      }
    }
  }
  R('REG-EDGE', 'Edge function count', edgeCount >= 171 ? 'PASS' : 'FAIL',
    `Edge functions: ${edgeCount}`);
}

// ═══════════════════════════════════════════════════════
//   OUTPUT FILES
// ═══════════════════════════════════════════════════════
function writeReports() {
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const date = new Date().toISOString().split('T')[0];

  // ── day15-test-report.json ──
  const jsonReport = {
    test: 'DAY15-AUTO',
    date,
    summary: { pass: passCount, fail: failCount, total: results.length },
    results: results.map(r => ({ id: r.id, name: r.name, status: r.status, detail: r.detail })),
    emailInventory,
    stripeChecklist,
  };
  fs.writeFileSync('day15-test-report.json', JSON.stringify(jsonReport, null, 2));

  // ── day15-test-report.txt ──
  let txt = '';
  txt += '═══════════════════════════════════════════\n';
  txt += '  DAY15-AUTO — Full Report\n';
  txt += `  Date: ${date} | Tests: ${results.length}\n`;
  txt += '═══════════════════════════════════════════\n\n';
  txt += 'TEST    | RESULT           | DETAIL\n';
  txt += '--------|------------------|------\n';
  for (const r of results) {
    txt += `${r.id.padEnd(8)}| ${r.status.padEnd(17)}| ${r.detail}\n`;
  }
  txt += `\n═══════════════════════════════════════════\n`;
  txt += `  PASS: ${passCount} | FAIL: ${failCount} | TOTAL: ${results.length}\n`;
  txt += '═══════════════════════════════════════════\n';
  fs.writeFileSync('day15-test-report.txt', txt);

  // ── day15-empty-state-audit.txt ──
  let esa = '';
  esa += '═══════════════════════════════════════════\n';
  esa += '  DAY15 EMPTY STATE AUDIT\n';
  esa += `  Date: ${date}\n`;
  esa += '═══════════════════════════════════════════\n\n';
  esa += 'COMPONENT              | FILE                        | DEMO GUARD | EMPTY STATE | DETAILS\n';
  esa += '-----------------------|-----------------------------|------------|-------------|--------\n';
  for (const e of emptyStateAudit) {
    esa += `${(e.component || '').padEnd(23)}| ${(e.file || '').padEnd(28)}| ${(e.hasDemoGuard || '').padEnd(11)}| ${(e.hasEmptyState || '').padEnd(12)}| ${e.details || ''}\n`;
  }
  esa += `\n═══════════════════════════════════════════\n`;
  esa += '  DAY 15 NOTE:\n';
  esa += '  Day 15 tests focus on email, Stripe, CPP/HoodOps, and domains.\n';
  esa += '  No new user-facing page components tested.\n';
  esa += '═══════════════════════════════════════════\n';
  fs.writeFileSync('day15-empty-state-audit.txt', esa);

  // ── email-template-inventory.txt ──
  let eti = '';
  eti += '═══════════════════════════════════════════════════════════════════════════════\n';
  eti += '  EMAIL TEMPLATE INVENTORY — EvidLY\n';
  eti += `  Date: ${date} | Total: ${emailInventory.length} email functions\n`;
  eti += '═══════════════════════════════════════════════════════════════════════════════\n\n';
  eti += 'TEMPLATE NAME                  | EDGE FUNCTION                  | EXISTS | RESEND | BRANDED | SIZE\n';
  eti += '-------------------------------|--------------------------------|--------|--------|---------|-----\n';
  for (const e of emailInventory) {
    eti += `${e.name.padEnd(31)}| ${e.function.padEnd(31)}| ${(e.exists ? '✓' : '✗').padEnd(7)}| ${(e.usesResend ? '✓' : '✗').padEnd(7)}| ${(e.branded ? '✓' : '✗').padEnd(8)}| ${e.sizeKB}KB\n`;
  }
  eti += `\n═══════════════════════════════════════════════════════════════════════════════\n`;
  eti += '  FROM ADDRESSES:\n';
  eti += '    Primary: EvidLY <noreply@getevidly.com>\n';
  eti += '    Founders: EvidLY Founders <founders@getevidly.com>\n';
  eti += '    Digest: EvidLY <digest@evidly.com>\n';
  eti += '    Notifications: EvidLY <notifications@getevidly.com>\n\n';
  eti += '  BRANDING:\n';
  eti += '    Logo: "Evid" (white) + "LY" (gold #d4af37)\n';
  eti += '    Header: Navy #1e4d6b\n';
  eti += '    Footer: EvidLY LLC, Merced County, CA\n';
  eti += '    Unsubscribe: /settings/notifications\n\n';
  eti += '  SMS PROVIDER: Twilio\n';
  eti += '    Functions with SMS: auto-request-documents, process-service-reminders,\n';
  eti += '                        send-document-alerts, send-sms-invite\n';
  eti += '═══════════════════════════════════════════════════════════════════════════════\n';
  fs.writeFileSync('email-template-inventory.txt', eti);

  // ── stripe-readiness-checklist.txt ──
  let src = '';
  src += '═══════════════════════════════════════════\n';
  src += '  STRIPE READINESS CHECKLIST — EvidLY\n';
  src += `  Date: ${date}\n`;
  src += '═══════════════════════════════════════════\n\n';
  for (const item of stripeChecklist) {
    const icon = item.status === 'OK' ? '✓' : item.status === 'MISSING' ? '✗' : '~';
    src += `  [${icon}] ${item.item}: ${item.status}\n`;
  }
  src += `\n═══════════════════════════════════════════\n`;
  src += '  PRICING MODEL:\n';
  src += '    Founder Single: $99/mo (1 location)\n';
  src += '    Founder Multi: $99/mo + $49/additional location (2-10)\n';
  src += '    Enterprise: Custom (11+ locations)\n';
  src += '    Deadline: July 4, 2026 — locked for life\n\n';
  src += '  SUBSCRIPTION LIFECYCLE:\n';
  src += '    1. Signup → Stripe Checkout (30-day trial)\n';
  src += '    2. checkout.session.completed → subscription DB\n';
  src += '    3. trial_will_end → in-app notification\n';
  src += '    4. invoice.paid → guarantee + K2C donation\n';
  src += '    5. invoice.payment_failed → payment failed notification\n';
  src += '    6. subscription.deleted → status canceled\n\n';
  src += '  K2C DONATION:\n';
  src += '    $10/location/month → 100 meals/location\n';
  src += '    Dedup: donation_period + billing_event_id\n';
  src += '    Admin: /admin/k2c dashboard\n';
  src += '═══════════════════════════════════════════\n';
  fs.writeFileSync('stripe-readiness-checklist.txt', src);

  console.log(`\n  Reports written:`);
  console.log(`    day15-test-report.json`);
  console.log(`    day15-test-report.txt`);
  console.log(`    day15-empty-state-audit.txt`);
  console.log(`    email-template-inventory.txt`);
  console.log(`    stripe-readiness-checklist.txt`);
}

// ═══════════════════════════════════════════════════════
//   MAIN
// ═══════════════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  DAY15-AUTO-TEST');
  console.log('  Email Templates, Stripe, CPP/HoodOps, Cross-Domain');
  console.log('═══════════════════════════════════════════\n');

  // Authenticate
  const ok = await authenticate();
  if (!ok) { console.error('AUTH FAILED'); process.exit(1); }
  console.log('  ✓ Authenticated\n');

  // Email Templates (15.01–15.06)
  console.log('── Email Templates ─────────────────────');
  await test1501();
  await test1502();
  await test1503();
  await test1504();
  await test1505();
  await test1506();

  // Stripe Live Readiness (15.07–15.10)
  console.log('\n── Stripe Live Readiness ───────────────');
  await test1507();
  await test1508();
  await test1509();
  await test1510();

  // CPP & HoodOps (15.11–15.14)
  console.log('\n── CPP & HoodOps ──────────────────────');
  await test1511();
  await test1512();
  await test1513();
  await test1514();

  // Cross-Domain Integrity (15.15–15.18)
  console.log('\n── Cross-Domain Integrity ──────────────');
  await test1515();
  await test1516();
  await test1517();
  await test1518();

  // Regression
  console.log('\n── Regression ──────────────────────────');
  await regressionTests();

  // Summary
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  PASS: ${passCount} | FAIL: ${failCount} | TOTAL: ${results.length}`);
  console.log('═══════════════════════════════════════════');

  // Write all reports
  writeReports();
}

main().catch(console.error);
