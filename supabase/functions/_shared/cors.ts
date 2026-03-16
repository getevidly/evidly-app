/**
 * Centralized CORS utility for all EvidLY edge functions.
 *
 * Domain-restricted: only allows requests from getevidly.com domains.
 * Public endpoints should import PUBLIC_CORS_HEADERS instead.
 */

const ALLOWED_ORIGINS = [
  'https://app.getevidly.com',
  'https://www.getevidly.com',
  'https://getevidly.com',
];

// Allow localhost in development
if (Deno.env.get('ENVIRONMENT') !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:3000');
}

/**
 * Returns CORS headers restricted to getevidly.com domains.
 * Falls back to the primary domain if the request origin is not allowed.
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = ALLOWED_ORIGINS.includes(requestOrigin ?? '')
    ? requestOrigin!
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-webhook-secret',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Wildcard CORS headers for intentionally public endpoints.
 * Only use for: landing-chat, evidly-referral-signup, assessment-notify, checkup-notify
 */
export const PUBLIC_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
