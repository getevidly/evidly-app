/**
 * Browser-side mirror of _shared/replyAddress.ts.
 * Used by future UI components to parse thread IDs from addresses.
 */

const REPLY_DOMAIN = "reply.getevidly.com";

export function buildReplyAddress(threadId: string): string {
  return `reply+${threadId}@${REPLY_DOMAIN}`;
}

export function parseReplyAddress(address: string): string | null {
  const match = address.match(/^reply\+([0-9a-f-]{36})@/i);
  return match ? match[1] : null;
}
