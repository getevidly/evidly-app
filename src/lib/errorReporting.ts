import * as Sentry from '@sentry/react';

const PII_KEYS = new Set(['email', 'password', 'token', 'phone', 'address', 'ip']);

function sanitizeContext(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      PII_KEYS.has(k.toLowerCase()) ? '[redacted]' : v,
    ])
  );
}

export function reportError(error: Error, context?: Record<string, any>) {
  // Always log locally
  console.error('[EvidLY Error]', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href,
  });

  // Forward to Sentry (no-ops if Sentry not initialized)
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(sanitizeContext(context));
    }
    Sentry.captureException(error);
  });
}
