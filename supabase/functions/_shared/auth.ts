/**
 * Shared API authentication helpers for EvidLY read-only API endpoints.
 */

/** Validate an API key from the X-API-Key header */
export function validateApiKey(req: Request): boolean {
  const apiKey = req.headers.get('X-API-Key');
  if (!apiKey) return false;
  const validKeys = Deno.env.get('EVIDLY_API_KEYS')?.split(',') || [];
  return validKeys.includes(apiKey);
}

/** Standard unauthorized response */
export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized — invalid or missing API key' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Standard CORS headers for API responses */
export function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  };
}
