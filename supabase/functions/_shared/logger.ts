// PII-scrubbing logger for Edge Functions
// Replaces direct console.* calls to prevent emails, phones, and IPs
// from appearing in Supabase Edge Function logs.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /\+?\d[\d\s\-().]{7,}\d/g;
const IP_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;

function scrub(value: unknown): string {
  if (value === undefined || value === null) return String(value);
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str
    .replace(EMAIL_RE, "[email]")
    .replace(PHONE_RE, "[phone]")
    .replace(IP_RE, "[ip]");
}

export const logger = {
  info: (prefix: string, ...args: unknown[]) =>
    console.log(prefix, ...args.map(scrub)),
  warn: (prefix: string, ...args: unknown[]) =>
    console.warn(prefix, ...args.map(scrub)),
  error: (prefix: string, ...args: unknown[]) =>
    console.error(prefix, ...args.map(scrub)),
};
