-- Reseed edge_function_registry to reflect the 218 actually-deployed functions.
-- Old registry had 18 rows, 17 of which were phantoms (not deployed).
-- Categories derived from naming convention; cron info pulled from cron.job.
-- Descriptions left NULL — can be backfilled manually later.

BEGIN;

TRUNCATE edge_function_registry;

INSERT INTO edge_function_registry
  (function_name, category, trigger_type, cron_schedule, cron_job_name, description, is_monitored, max_consecutive_failures)
SELECT
  d.fn,
  -- Derive category from function name prefix
  CASE
    WHEN d.fn = 'analyze-temperature-patterns' THEN 'monitoring'
    WHEN d.fn = 'assessment-notify'             THEN 'notification'
    WHEN d.fn = 'auto-request-documents'        THEN 'documents'
    WHEN d.fn = 'availability-reminders'        THEN 'notification'
    WHEN d.fn LIKE 'ai-%'           THEN 'ai'
    WHEN d.fn LIKE 'api-%'          THEN 'api'
    WHEN d.fn LIKE 'benchmark-%'    THEN 'benchmarking'
    WHEN d.fn LIKE 'calculate-%'    THEN 'scoring'
    WHEN d.fn LIKE 'canonical-%'    THEN 'intelligence'
    WHEN d.fn LIKE 'check-%'        THEN 'monitoring'
    WHEN d.fn LIKE 'classify-%'     THEN 'ai'
    WHEN d.fn LIKE 'cleanup-%'      THEN 'system'
    WHEN d.fn LIKE 'client-%'       THEN 'notification'
    WHEN d.fn LIKE 'cloud-%'        THEN 'integration'
    WHEN d.fn LIKE 'copilot-%'      THEN 'ai'
    WHEN d.fn LIKE 'correct-%'      THEN 'compliance'
    WHEN d.fn LIKE 'correlation-%'  THEN 'intelligence'
    WHEN d.fn LIKE 'crawl-%'        THEN 'intelligence'
    WHEN d.fn LIKE 'demo-%'         THEN 'demo'
    WHEN d.fn LIKE 'detect-%'       THEN 'monitoring'
    WHEN d.fn LIKE 'document-%'     THEN 'documents'
    WHEN d.fn LIKE 'draft-%'        THEN 'ai'
    WHEN d.fn LIKE 'enterprise-%'   THEN 'enterprise'
    WHEN d.fn LIKE 'evidence-%'     THEN 'compliance'
    WHEN d.fn LIKE 'evidly-%'       THEN 'system'
    WHEN d.fn LIKE 'extract-%'      THEN 'ai'
    WHEN d.fn LIKE 'form-%'         THEN 'system'
    WHEN d.fn LIKE 'generate-%'     THEN 'generation'
    WHEN d.fn LIKE 'get-%'          THEN 'system'
    WHEN d.fn LIKE 'hoodops-%'      THEN 'integration'
    WHEN d.fn LIKE 'insurance-%'    THEN 'compliance'
    WHEN d.fn LIKE 'integration-%'  THEN 'integration'
    WHEN d.fn LIKE 'intelligence-%' THEN 'intelligence'
    WHEN d.fn LIKE 'iot-%'          THEN 'iot'
    WHEN d.fn LIKE 'issue-%'        THEN 'documents'
    WHEN d.fn LIKE 'jurisdiction-%' THEN 'compliance'
    WHEN d.fn LIKE 'k2c-%'         THEN 'system'
    WHEN d.fn LIKE 'landing-%'      THEN 'system'
    WHEN d.fn LIKE 'monitor-%'      THEN 'monitoring'
    WHEN d.fn LIKE 'notify-%'       THEN 'notification'
    WHEN d.fn LIKE 'offline-%'      THEN 'offline'
    WHEN d.fn LIKE 'ops-%'          THEN 'intelligence'
    WHEN d.fn LIKE 'pl-%'           THEN 'policy_lens'
    WHEN d.fn LIKE 'platform-%'     THEN 'system'
    WHEN d.fn LIKE 'playbook-%'     THEN 'playbook'
    WHEN d.fn LIKE 'pos-%'          THEN 'pos'
    WHEN d.fn LIKE 'process-%'      THEN 'notification'
    WHEN d.fn LIKE 'resend-%'       THEN 'notification'
    WHEN d.fn LIKE 'rfp-%'          THEN 'sales'
    WHEN d.fn LIKE 'risk-%'         THEN 'compliance'
    WHEN d.fn LIKE 'route-%'        THEN 'notification'
    WHEN d.fn LIKE 'seal-%'         THEN 'compliance'
    WHEN d.fn LIKE 'security-%'     THEN 'system'
    WHEN d.fn LIKE 'send-%'         THEN 'notification'
    WHEN d.fn LIKE 'sensor-%'       THEN 'iot'
    WHEN d.fn LIKE 'shift-%'        THEN 'notification'
    WHEN d.fn LIKE 'snapshot-%'     THEN 'monitoring'
    WHEN d.fn LIKE 'stripe-%'       THEN 'billing'
    WHEN d.fn LIKE 'task-%'         THEN 'notification'
    WHEN d.fn LIKE 'training-%'     THEN 'training'
    WHEN d.fn LIKE 'trigger-%'      THEN 'intelligence'
    WHEN d.fn LIKE 'twilio-%'       THEN 'notification'
    WHEN d.fn LIKE 'validate-%'     THEN 'compliance'
    WHEN d.fn LIKE 'vendor-%'       THEN 'vendor'
    WHEN d.fn LIKE 'verify-%'       THEN 'compliance'
    WHEN d.fn LIKE 'violation-%'    THEN 'compliance'
    WHEN d.fn LIKE 'webhook-%'      THEN 'integration'
    ELSE 'uncategorized'
  END AS category,
  -- trigger_type: cron if a matching cron.job exists, else on_demand
  CASE WHEN c.jobname IS NOT NULL THEN 'cron' ELSE 'on_demand' END AS trigger_type,
  c.schedule  AS cron_schedule,
  c.jobname   AS cron_job_name,
  NULL        AS description,
  true        AS is_monitored,
  3           AS max_consecutive_failures
FROM unnest(ARRAY[
  'ai-chat',
  'ai-corrective-action-draft',
  'ai-document-analysis',
  'ai-estimate-submit',
  'ai-flag-suggest',
  'ai-pattern-analysis',
  'ai-photo-analysis',
  'ai-predictive-alerts',
  'ai-text-assist',
  'ai-voice-transcription',
  'ai-weekly-digest',
  'analyze-temperature-patterns',
  'api-marketplace-publish',
  'api-oauth-authorize',
  'api-oauth-token',
  'api-rate-limiter',
  'api-token-validate',
  'api-usage-aggregate',
  'api-v1-locations-certificates',
  'api-v1-locations-compliance',
  'api-v1-locations-schedule',
  'api-v1-locations-services',
  'api-v1-services-photos',
  'api-webhook-dispatch',
  'api-webhook-retry',
  'assessment-notify',
  'auto-request-documents',
  'availability-reminders',
  'benchmark-aggregate',
  'benchmark-badge-check',
  'benchmark-quarterly-report',
  'benchmark-snapshot',
  'calculate-compliance-score',
  'canonical-correlate',
  'check-equipment-alerts',
  'check-expiries',
  'check-onboarding-progress',
  'classify-document',
  'classify-signals',
  'cleanup-demo-tour',
  'client-invite-send',
  'cloud-file-import',
  'copilot-analyze',
  'correct-inspection-report',
  'correct-service-record',
  'correlation-engine',
  'crawl-monitor',
  'demo-account-convert',
  'demo-account-create',
  'detect-operational-drift',
  'document-expiry-status',
  'document-review-action',
  'document-scan',
  'draft-receiving-notes',
  'enterprise-alert-rollup',
  'enterprise-audit-export',
  'enterprise-report-generate',
  'enterprise-rollup-calculate',
  'enterprise-scim-users',
  'enterprise-sso-callback',
  'enterprise-tenant-provision',
  'evidence-pattern-detect',
  'evidly-referral-signup',
  'evidly-service-request',
  'extract-deficiencies-from-report',
  'form-submit',
  'generate-advisor-briefing',
  'generate-agreement-pdf',
  'generate-alerts',
  'generate-api-key',
  'generate-certificate',
  'generate-compliance-package',
  'generate-deficiency-plan',
  'generate-demo-template',
  'generate-haccp-from-checklists',
  'generate-job-report',
  'generate-kec-report',
  'generate-outreach',
  'generate-partner-demo',
  'generate-report',
  'generate-service-report',
  'generate-task-instances',
  'generate-weekly-drift-report',
  'get-jurisdictions',
  'hoodops-webhook',
  'insurance-export',
  'integration-conflict-resolver',
  'integration-data-mapper',
  'integration-health-check',
  'integration-oauth-callback',
  'integration-sync-engine',
  'intelligence-approve',
  'intelligence-auto-publish',
  'intelligence-bridge-proxy',
  'intelligence-collect',
  'intelligence-deliver',
  'intelligence-feed',
  'intelligence-webhook',
  'iot-process-reading',
  'iot-sensor-alerts',
  'iot-sensor-pull',
  'iot-sensor-webhook',
  'issue-fresh-request',
  'jurisdiction-drift-alert',
  'k2c-processor',
  'k2c-referral-invite',
  'landing-chat',
  'monitor-regulations',
  'notify-qa-review',
  'offline-conflict-resolver',
  'offline-device-manager',
  'offline-photo-batch-upload',
  'offline-sync-handler',
  'offline-sync-pull',
  'ops-intelligence-coach',
  'ops-intelligence-generate',
  'pl-admin',
  'pl-authorize-sign',
  'pl-authorize-status',
  'pl-build-findings',
  'pl-compliance-eval',
  'pl-compliance-eval-food',
  'pl-event',
  'pl-extract',
  'pl-get-findings',
  'pl-get-findings-insured',
  'pl-intake-finalize',
  'pl-intake-start',
  'pl-intake-start-inapp',
  'pl-invite',
  'pl-otp-verify',
  'pl-pse-eval',
  'pl-reconcile',
  'pl-verify-agent',
  'platform-metrics-refresh',
  'platform-stats',
  'playbook-ai-assistant',
  'playbook-auto-trigger',
  'playbook-completion-handler',
  'playbook-escalation-monitor',
  'playbook-food-loss-calculator',
  'playbook-report-generator',
  'pos-connect',
  'pos-sync-all',
  'pos-sync-employees',
  'pos-sync-locations',
  'process-service-reminders',
  'process-service-request',
  'resend-document-request',
  'resend-inbound-email',
  'resend-service-request',
  'resend-webhook',
  'rfp-classify',
  'rfp-crawl',
  'risk-free-eligibility-calc',
  'risk-score-api',
  'route-service-request',
  'seal-inspection-report',
  'seal-service-record',
  'security-headers-check',
  'send-daily-digest',
  'send-document-alerts',
  'send-document-request',
  'send-email',
  'send-inspection-package',
  'send-missing-doc-reminders',
  'send-portal-link',
  'send-reminders',
  'send-service-request-reminder',
  'send-sms-invite',
  'send-team-invite',
  'send-vendor-recommendation',
  'send-welcome-email',
  'sensor-alert-escalate',
  'sensor-compliance-aggregate',
  'sensor-defrost-detect',
  'sensor-device-health',
  'sensor-threshold-evaluate',
  'shift-handoff-notify',
  'snapshot-readiness',
  'stripe-create-checkout',
  'stripe-customer-portal',
  'stripe-webhook',
  'task-notifications',
  'training-ai-companion',
  'training-ai-quiz-gen',
  'training-analytics-aggregate',
  'training-auto-enroll',
  'training-certificate-gen',
  'training-completion-handler',
  'training-content-translate',
  'training-enroll',
  'training-progress-reminder',
  'training-quiz-score',
  'training-sb476-report',
  'trigger-crawl',
  'twilio-inbound-sms',
  'validate-vendor-document',
  'vendor-analytics-snapshot',
  'vendor-certification-evaluate',
  'vendor-connect-apply',
  'vendor-contact',
  'vendor-credential-check',
  'vendor-document-notify',
  'vendor-document-reminders',
  'vendor-lead-notify',
  'vendor-network-send-message',
  'vendor-notification-sender',
  'vendor-partner-outreach',
  'vendor-portal-reply',
  'vendor-recommendation-engine',
  'vendor-schedule-response',
  'vendor-secure-upload',
  'vendor-service-record-trigger',
  'verify-inspection-report',
  'verify-service-record',
  'violation-crawl',
  'webhook-dispatch'
]) AS d(fn)
-- LEFT JOIN cron.job to detect cron-triggered functions
-- Extract the function slug from the net.http_post URL in the cron command
LEFT JOIN LATERAL (
  SELECT
    cj.jobname,
    cj.schedule
  FROM cron.job cj
  WHERE cj.command LIKE '%/functions/v1/' || d.fn || '%'
  LIMIT 1
) c ON true;

COMMIT;
