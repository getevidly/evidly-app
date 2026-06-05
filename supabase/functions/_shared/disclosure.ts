// Shared disclosure text and HMAC token utilities for Policy Lens authorization.

export const DISCLOSURE_VERSION = "draft-1";

// ── DRAFT DISCLOSURE ─────────────────────────────────────────
// PLACEHOLDER — pending review by California-licensed counsel.
// Do NOT present to end users as final language. The version
// string and text will be updated in a single edit here once
// legal review is complete.
// ─────────────────────────────────────────────────────────────
export const DISCLOSURE_TEXT = `DRAFT — THIRD-PARTY AUTHORIZATION (NOT YET ATTORNEY-REVIEWED)

By signing below, I authorize the insurance agent identified in this request to obtain and review my commercial property insurance policy on my behalf through the EvidLY platform. I understand that:

1. The agent will receive a copy of my current policy for the sole purpose of conducting a coverage review.
2. This authorization is limited to the specific policy identified in the associated intake form.
3. I may withdraw this authorization at any time by contacting EvidLY at support@getevidly.com.
4. This authorization expires 90 days from the date of signature.

This authorization does not grant the agent authority to modify, cancel, or bind any insurance policy on my behalf.

DRAFT — This language is a placeholder pending review by California-licensed counsel.`;

// ── HMAC token utilities ─────────────────────────────────────

const TOKEN_EXPIRY_SECONDS = 72 * 60 * 60; // 72 hours

function base64urlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64urlEncodeString(str: string): string {
  return base64urlEncode(new TextEncoder().encode(str));
}

function base64urlDecodeString(str: string): string {
  return new TextDecoder().decode(base64urlDecode(str));
}

async function getHmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("PL_AUTH_SIGN_SECRET");
  if (!secret) throw new Error("PL_AUTH_SIGN_SECRET not set");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Generate an HMAC-SHA256 signed token for a Policy Lens authorization.
 * Format: base64url(payload).base64url(signature)
 * Payload: { aid: authorization_id, exp: unix_seconds }
 */
export async function generateSignToken(
  authorizationId: string,
): Promise<string> {
  const payload = JSON.stringify({
    aid: authorizationId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS,
  });
  const payloadB64 = base64urlEncodeString(payload);
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64),
  );
  return `${payloadB64}.${base64urlEncode(sig)}`;
}

/**
 * Verify an HMAC-SHA256 signed token. Returns the decoded payload
 * or throws on invalid signature, expired token, or malformed input.
 * Uses crypto.subtle.verify which is inherently timing-safe.
 */
export async function verifySignToken(
  token: string,
): Promise<{ aid: string; exp: number }> {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Invalid token format");

  const [payloadB64, sigB64] = parts;
  const key = await getHmacKey();

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64urlDecode(sigB64),
    new TextEncoder().encode(payloadB64),
  );
  if (!valid) throw new Error("Invalid token signature");

  const payload = JSON.parse(base64urlDecodeString(payloadB64));
  if (!payload.aid || !payload.exp) throw new Error("Invalid token payload");
  if (payload.exp < Math.floor(Date.now() / 1000))
    throw new Error("Token expired");

  return { aid: payload.aid, exp: payload.exp };
}
