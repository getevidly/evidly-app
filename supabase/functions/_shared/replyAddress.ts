/**
 * _shared/replyAddress.ts — INBOUND-COMMS-01
 *
 * Builds and parses dynamic reply-to addresses.
 * Format: reply+{threadId}@reply.getevidly.com
 */

const REPLY_DOMAIN = "reply.getevidly.com";

/** Build a reply-to address for a given thread ID. */
export function buildReplyAddress(threadId: string): string {
  return `reply+${threadId}@${REPLY_DOMAIN}`;
}

/** Extract thread ID from an inbound reply-to address. Returns null if not parseable. */
export function parseReplyAddress(address: string): string | null {
  const match = address.match(/^reply\+([0-9a-f-]{36})@/i);
  return match ? match[1] : null;
}
