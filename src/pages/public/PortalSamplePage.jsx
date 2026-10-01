/**
 * PortalSamplePage — /portal/sample
 *
 * The HoodOps demo's sample record page. Approved exception to ZERO FAKE DATA
 * (Arthur, 30 Sep 2026 — see CLAUDE.md): static sample data, labeled
 * "Sample Record", noindex, reads and writes no database rows, and its buttons
 * make no requests. It never calls portal-access or any other function or table.
 *
 * Optional query params override the sample text: vendor, business, location,
 * date (yyyy-MM-dd), cert. Plain text only, capped at 80 characters, rendered
 * through React. Missing or invalid values fall back to the defaults below.
 */

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PortalRecordView } from '../../components/portal/PortalRecordView';

const MAX_LEN = 80;

const DEFAULTS = {
  vendor: 'Ironwood Hood & Exhaust',
  business: 'Sample Restaurant',
  location: 'Sacramento, CA',
  cert: 'CERT-K-2026-0101',
};

/* Fixed, clearly-sample digest. Never a real seal. */
const SAMPLE_HASH = '5a3e9c1d7b2f48a6c0e9d4b17f3a2c8e6d1b5f9a0c4e7d2b8f6a1c3e5d7b9f20';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Plain text, no control characters, single-spaced, capped. Empty → fallback. */
function cleanText(value, fallback) {
  if (typeof value !== 'string') return fallback;
  // eslint-disable-next-line no-control-regex
  const text = value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_LEN).trim();
  return text || fallback;
}

/** Today's calendar date in Pacific time, as yyyy-MM-dd. */
function pacificToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/** yyyy-MM-dd plus a whole number of days (calendar arithmetic in UTC). */
function addDays(dateStr, days) {
  const m = DATE_RE.exec(dateStr);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  return d.toISOString().slice(0, 10);
}

/** A real calendar date in yyyy-MM-dd form, else null. */
function validDate(value) {
  if (typeof value !== 'string') return null;
  const m = DATE_RE.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** UTC offset of America/Los_Angeles on that date ("-07:00" or "-08:00"). */
function pacificOffset(dateStr) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', timeZoneName: 'shortOffset',
    }).formatToParts(new Date(`${dateStr}T20:00:00Z`));
    const tz = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    const m = /GMT([+-])(\d{1,2})/.exec(tz);
    if (m) return `${m[1]}${m[2].padStart(2, '0')}:00`;
  } catch { /* fall through to standard time */ }
  return '-08:00';
}

function buildSample(params) {
  const vendor = cleanText(params.get('vendor'), DEFAULTS.vendor);
  const business = cleanText(params.get('business'), DEFAULTS.business);
  const location = cleanText(params.get('location'), DEFAULTS.location);
  const cert = cleanText(params.get('cert'), DEFAULTS.cert);
  const serviceDate = validDate(params.get('date')) || addDays(pacificToday(), -14);

  // Sealed the afternoon of the service: 4:42 PM Pacific.
  const sealedAt = `${serviceDate}T16:42:00${pacificOffset(serviceDate)}`;
  const expiresAt = `${addDays(serviceDate, 90)}T16:42:00${pacificOffset(addDays(serviceDate, 90))}`;

  const record = {
    recipient_name: business,
    cover_message: `Kitchen Exhaust Cleaning by ${vendor} at ${business}, ${location}.`,
    sent_at: sealedAt,
    expires_at: expiresAt,
    org_name: business,
  };

  const documents = [{
    id: 'sample-kec-certificate',
    name: `Kitchen Exhaust Cleaning Certificate — ${vendor}`,
    display_name: 'Kitchen Exhaust Cleaning Certificate',
    type: 'certificate',
    expiration_date: null,
    has_file: true,
    is_sealed: true,
    seal: {
      hash: SAMPLE_HASH,
      sealed_at: sealedAt,
      cert_number: cert,
      service_date: serviceDate,
      next_due_date: null,
    },
  }];

  return { record, documents };
}

export default function PortalSamplePage() {
  const [params] = useSearchParams();
  const queryKey = params.toString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { record, documents } = useMemo(() => buildSample(params), [queryKey]);

  return (
    <>
      <Helmet>
        <title>Sample Record | EvidLY</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <PortalRecordView record={record} documents={documents} view="client" sample />
    </>
  );
}
