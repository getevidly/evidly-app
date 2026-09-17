/**
 * PublicVerification — /verify/:code
 *
 * Public, no login. Anyone holding a certificate can confirm it is genuine.
 *
 * Two levels of claim, kept deliberately distinct:
 *   Lookup only  — "a sealed certificate exists with this number"
 *   Document drop — "THIS file matches its seal", the real tamper check
 *
 * The second recomputes the seal hash server-side over the uploaded bytes. A
 * single altered byte changes the digest, so a modified PDF fails.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const NAVY = '#1E2D4D';
const EMBER = '#B24A2E';
const CREAM = '#FAF7F0';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const LINE = '#E5E0D8';
const SEAL_GREEN = '#2E7D32';
const WARN = '#B42318';

const BODY = "'Inter', Arial, sans-serif";
const MONO_STACK = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

const MONO_CAPTION = {
  fontFamily: MONO_STACK,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase' as const,
};

interface VerifyRecord {
  cert_number: string;
  content_hash: string;
  sealed_at: string;
  service_date: string | null;
  next_due_date: string | null;
  vendor_name: string | null;
  safeguard_type: string | null;
  service_type_code: string | null;
  superseded: boolean;
  superseded_by_cert_number: string | null;
}

interface VerifyResponse {
  found: boolean;
  checked_document?: boolean;
  match?: boolean;
  record?: VerifyRecord;
  error?: string;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

const SAFEGUARD_LABELS: Record<string, string> = {
  hood_cleaning: 'Kitchen Exhaust Cleaning',
  fire_suppression: 'Fire Suppression System',
  fire_extinguisher: 'Fire Extinguisher Service',
};

export default function PublicVerification() {
  const { code } = useParams<{ code: string }>();

  const [certInput, setCertInput] = useState(code || '');
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const runLookup = useCallback(async (certNumber: string) => {
    const n = certNumber.trim();
    if (!n) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('verify-certificate', {
        body: { cert_number: n },
      });
      if (fnErr) { setError('Verification is temporarily unavailable. Please try again.'); return; }
      setResult(data as VerifyResponse);
    } catch {
      setError('Verification is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // A code in the URL verifies on arrival.
  useEffect(() => { if (code) runLookup(code); }, [code, runLookup]);

  const checkDocument = useCallback(async (file: File) => {
    const n = (certInput || code || '').trim();
    if (!n) { setError('Enter the certificate number first.'); return; }

    setChecking(true);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const pdf_base64 = btoa(bin);

      const { data, error: fnErr } = await supabase.functions.invoke('verify-certificate', {
        body: { cert_number: n, pdf_base64 },
      });
      if (fnErr) { setError('Could not check that file. Please try again.'); return; }
      setResult(data as VerifyResponse);
    } catch {
      setError('Could not read that file.');
    } finally {
      setChecking(false);
    }
  }, [certInput, code]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) checkDocument(file);
  }, [checkDocument]);

  const record = result?.record;
  const matched = result?.checked_document === true && result?.match === true;
  const mismatched = result?.checked_document === true && result?.match === false;

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: BODY }}>

      {/* Header */}
      <div style={{ background: NAVY, padding: '22px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em' }}>
          <span style={{ color: EMBER }}>E</span>
          <span style={{ color: '#FFFFFF' }}>vid</span>
          <span style={{ color: EMBER }}>LY</span>
        </div>
        <div style={{ ...MONO_CAPTION, color: '#A8B4C8', marginTop: 6 }}>
          Certificate Verification
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '36px 20px 64px' }}>

        <h1 style={{
          fontSize: 24, lineHeight: 1.25, fontWeight: 800, color: NAVY,
          margin: '0 0 8px', letterSpacing: '-0.02em',
        }}>
          Verify a compliance certificate.
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: TEXT_SEC, margin: '0 0 24px' }}>
          Enter the certificate number to confirm a sealed record exists, then drop the
          PDF itself to confirm the document has not been altered.
        </p>

        {/* Cert number */}
        <form
          onSubmit={(e) => { e.preventDefault(); runLookup(certInput); }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}
        >
          <input
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            placeholder="CERT-K-2026-0011"
            style={{
              flex: '1 1 240px', minWidth: 0, padding: '11px 13px', borderRadius: 8,
              border: `1px solid ${LINE}`, background: '#FFFFFF', color: NAVY,
              fontSize: 14, fontFamily: MONO_STACK,
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '11px 22px', background: NAVY, color: '#FFFFFF', border: 'none',
              borderRadius: 8, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Checking…' : 'Verify'}
          </button>
        </form>

        {error && (
          <div style={{
            fontSize: 13, color: WARN, background: '#FEF3F2', border: '1px solid #FECDCA',
            borderRadius: 8, padding: '11px 13px', marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {/* Not found */}
        {result && !result.found && (
          <div style={{
            background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 12,
            padding: '22px 20px', marginBottom: 24,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
              No sealed certificate found for this number.
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: TEXT_SEC }}>
              Check the number as printed on the certificate. If it is correct, the record
              may not have been sealed by EvidLY.
            </div>
          </div>
        )}

        {/* Found */}
        {record && (
          <div style={{
            background: '#FFFFFF',
            border: `1px solid ${mismatched ? '#FECDCA' : LINE}`,
            borderTop: `4px solid ${mismatched ? WARN : matched ? SEAL_GREEN : NAVY}`,
            borderRadius: 12, padding: '22px 20px', marginBottom: 24,
          }}>

            {matched && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...MONO_CAPTION, color: SEAL_GREEN, marginBottom: 6 }}>Verified</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: SEAL_GREEN, lineHeight: 1.35 }}>
                  This Certificate Is Authentic and Has Not Been Altered
                </div>
              </div>
            )}

            {mismatched && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...MONO_CAPTION, color: WARN, marginBottom: 6 }}>Does Not Match</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: WARN, lineHeight: 1.35 }}>
                  This Document Does Not Match Its Seal — It May Have Been Altered
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.6, color: TEXT_SEC, marginTop: 8 }}>
                  A sealed record exists for {record.cert_number}, but the file you provided is
                  not the document that was sealed. Request the original from whoever issued it.
                </div>
              </div>
            )}

            {!result?.checked_document && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...MONO_CAPTION, color: NAVY, marginBottom: 6 }}>Sealed Record Found</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, lineHeight: 1.4 }}>
                  A sealed certificate exists with this number.
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.6, color: TEXT_SEC, marginTop: 6 }}>
                  To confirm your copy is the sealed document, drop the PDF below.
                </div>
              </div>
            )}

            {record.superseded && (
              <div style={{
                fontSize: 13, lineHeight: 1.6, color: '#92400E', background: '#FEF3C7',
                border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px', marginBottom: 16,
              }}>
                This certificate has been superseded by a corrected record
                {record.superseded_by_cert_number ? ` (${record.superseded_by_cert_number})` : ''}.
                Use the current certificate for compliance purposes.
              </div>
            )}

            <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 14, display: 'grid', gap: 10 }}>
              <Row label="Certificate" value={record.cert_number} mono />
              <Row label="Service" value={
                (record.safeguard_type && SAFEGUARD_LABELS[record.safeguard_type]) ||
                record.service_type_code || '—'
              } />
              <Row label="Service Company" value={record.vendor_name || '—'} />
              <Row label="Serviced" value={formatDate(record.service_date)} />
              {record.next_due_date && <Row label="Next Service Due" value={formatDate(record.next_due_date)} />}
              <Row label="Sealed" value={formatDate(record.sealed_at)} />
              <Row label="Seal Hash" value={record.content_hash} mono wrap />
            </div>
          </div>
        )}

        {/* Document drop */}
        {result?.found && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragOver ? EMBER : LINE}`,
              background: dragOver ? '#FBF3EF' : '#FFFFFF',
              borderRadius: 12, padding: '26px 20px', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
              Verify the document
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: TEXT_SEC, marginBottom: 14 }}>
              Drop your certificate PDF here to confirm it{'’'}s authentic and unaltered.
              The file is checked against its seal and is not stored.
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) checkDocument(f); }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={checking}
              style={{
                padding: '11px 22px', background: EMBER, color: '#FFFFFF', border: 'none',
                borderRadius: 8, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
                cursor: checking ? 'default' : 'pointer', opacity: checking ? 0.6 : 1,
              }}
            >
              {checking ? 'Checking the document…' : 'Choose a PDF'}
            </button>
          </div>
        )}

        <div style={{ marginTop: 40, fontSize: 11, lineHeight: 1.6, color: TEXT_MUTED, textAlign: 'center' }}>
          Powered by EvidLY, a Cleaning Pros Plus, LLC company.
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, wrap }: {
  label: string; value: string; mono?: boolean; wrap?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' }}>
      <div style={{ ...MONO_CAPTION, color: TEXT_MUTED, flex: '0 0 140px' }}>{label}</div>
      <div style={{
        flex: '1 1 200px', minWidth: 0, fontSize: 13.5, color: NAVY, fontWeight: 500,
        fontFamily: mono ? MONO_STACK : 'inherit',
        wordBreak: wrap ? 'break-all' : 'normal',
      }}>
        {value}
      </div>
    </div>
  );
}
