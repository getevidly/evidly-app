/**
 * SealedDocument — /sealed/:token
 *
 * Public, no login. One sealed HoodOps report or certificate, behind a link
 * that does not expire. Display fields come from get_sealed_document(token),
 * a SECURITY DEFINER function; the PDF comes from portal-access 'sealed_pdf',
 * which signs only this token's file for five minutes, fetched on each click.
 *
 * States what was sealed and when. No verdict about the kitchen.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Same palette as PortalPage.
const NAVY = '#1E2D4D';
const EMBER = '#B24A2E';
const CREAM = '#FAF7F0';
const TEXT_SEC = '#6B7F96';
const LINE = '#E5E0D8';

const TYPE_LABELS = {
  report: 'Report of Service',
  cert: 'Certificate of Service',
};

/* service_date is a DATE ("YYYY-MM-DD"). Read the parts and render in UTC so
 * the stored day is the displayed day in every zone. */
function formatDate(value) {
  if (!value) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  const d = m
    ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
    : new Date(value);
  return d.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

/* sealed_at is the instant of sealing — shown in the viewer's zone, named. */
function formatSealedAt(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

function pdfFileName(doc) {
  const base = (TYPE_LABELS[doc?.document_type] || 'Sealed Document').replace(/ /g, '-');
  return doc?.cert_number ? `${base}-${doc.cert_number}.pdf` : `${base}.pdf`;
}

export default function SealedDocument() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | valid | not_found | error
  const [doc, setDoc] = useState(null);
  const [busy, setBusy] = useState(null); // 'view' | 'download' | null
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      const { data, error } = await supabase.rpc('get_sealed_document', { p_token: token || '' });
      if (cancelled) return;
      if (error) {
        console.error('[SealedDocument] lookup failed');
        setStatus('error');
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setStatus('not_found');
        return;
      }
      setDoc(row);
      setStatus('valid');
    })();
    return () => { cancelled = true; };
  }, [token]);

  const openPdf = useCallback(async (mode) => {
    setBusy(mode);
    setPdfError(false);
    try {
      const { data, error } = await supabase.functions.invoke('portal-access', {
        body: { token, action: 'sealed_pdf' },
      });
      if (error || !data?.url) {
        setPdfError(true);
        return;
      }
      // The signed URL is a storage file, not an app route.
      window.location.assign(
        mode === 'download'
          ? `${data.url}&download=${encodeURIComponent(pdfFileName(doc))}`
          : data.url,
      );
    } catch {
      setPdfError(true);
    } finally {
      setBusy(null);
    }
  }, [token, doc]);

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: EMBER,
            borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto',
          }} />
          <p style={{ marginTop: 16, color: TEXT_SEC, fontSize: 14 }}>Loading Sealed Record...</p>
          <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return <MessageCard title="Something Went Wrong" message="We could not load this record. Please try again in a moment." />;
  }

  if (status === 'not_found' || !doc) {
    return <MessageCard title="Record Not Found" message="This link does not match a sealed record. Check the link, or ask the sender for a new one." />;
  }

  const typeLabel = TYPE_LABELS[doc.document_type] || 'Sealed Document';
  const verifyTo = doc.cert_number ? `/verify/${encodeURIComponent(doc.cert_number)}` : '/verify';

  const rows = [
    ['Document Type', typeLabel],
    ['Kitchen', doc.kitchen_name || '—'],
    ['Location', [doc.location_name, doc.location_address].filter(Boolean).join(' · ') || '—'],
    ['Service Date', formatDate(doc.service_date)],
    ['Sealed', formatSealedAt(doc.sealed_at)],
  ];
  if (doc.cert_number) rows.push(['Certificate Number', doc.cert_number]);

  const buttonStyle = (primary) => ({
    padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
    cursor: busy ? 'default' : 'pointer',
    border: primary ? 'none' : `1px solid ${NAVY}`,
    background: primary ? NAVY : '#fff',
    color: primary ? '#fff' : NAVY,
    opacity: busy ? 0.7 : 1,
  });

  return (
    <div style={{ minHeight: '100vh', background: CREAM, padding: '32px 16px' }}>
      <div style={{
        maxWidth: 560, margin: '0 auto', background: '#fff', borderRadius: 16,
        overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ background: NAVY, padding: '24px 28px' }}>
          <p style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: '0.5px' }}>EvidLY</p>
          <h1 style={{ margin: '6px 0 0', color: '#fff', fontSize: 17, fontWeight: 600 }}>{typeLabel}</h1>
          <p style={{ margin: '4px 0 0', color: '#C9D4E4', fontSize: 13 }}>Sealed Record</p>
        </div>

        <div style={{ padding: '20px 28px 8px' }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: `1px solid ${LINE}` }}>
              <div style={{ width: 150, flexShrink: 0, fontSize: 12, fontWeight: 600, color: TEXT_SEC }}>{label}</div>
              <div style={{ fontSize: 14, color: NAVY, wordBreak: 'break-word' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 28px 24px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button type="button" disabled={!!busy} onClick={() => openPdf('view')} style={buttonStyle(true)}>
            {busy === 'view' ? 'Opening...' : 'View PDF'}
          </button>
          <button type="button" disabled={!!busy} onClick={() => openPdf('download')} style={buttonStyle(false)}>
            {busy === 'download' ? 'Preparing...' : 'Download PDF'}
          </button>
          <Link to={verifyTo} style={{ fontSize: 13, fontWeight: 600, color: EMBER, marginLeft: 4 }}>
            Verify This Record
          </Link>
        </div>
        {pdfError && (
          <p style={{ margin: '-12px 28px 20px', fontSize: 13, color: '#B42318' }}>
            The PDF could not be opened. Please try again.
          </p>
        )}

        <div style={{ borderTop: `1px solid ${LINE}`, padding: '14px 28px' }}>
          <p style={{ margin: 0, color: TEXT_SEC, fontSize: 11, lineHeight: 1.6 }}>
            EvidLY · This record is sealed: its file and details are locked and carry a
            cryptographic hash taken at sealing. Questions: support@getevidly.com
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageCard({ title, message }) {
  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '48px 40px', maxWidth: 440,
        textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 8 }}>{title}</h1>
        <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.6 }}>{message}</p>
      </div>
    </div>
  );
}
