/**
 * PortalPage — C16a-1
 *
 * Public page for document portal link access.
 * Route: /portal/:token (no auth required)
 * Loads documents shared via SendToThirdPartyModal secure_token.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PortalRecordView } from '../../components/portal/PortalRecordView';

/* Palette for the loading and error screens. The record itself renders in
 * PortalRecordView, which carries the full briefing palette. */
const NAVY = '#1E2D4D';
const EMBER = '#B24A2E';
const CREAM = '#FAF7F0';
const TEXT_SEC = '#6B7F96';

interface PortalRecord {
  recipient_name: string;
  cover_message: string | null;
  sent_at: string;
  expires_at: string;
  org_name: string;
}

interface PortalSeal {
  hash: string;
  sealed_at: string;
  cert_number: string | null;
  service_date: string | null;
  next_due_date: string | null;
}

interface PortalDocument {
  id: string;
  name: string;
  type: string | null;
  expiration_date: string | null;
  has_file: boolean;
  /** Present only when the linked service record carries a real seal. */
  seal?: PortalSeal | null;
  /* Supplied by portal-access using the same description as the share email,
   * so a third party reads the same name here as in the mail. */
  display_name?: string;
  ref_line?: string;
  is_sealed?: boolean;
}

/** 'shared' = a link forwarded to a third party; 'client' = the original page. */
type PortalView = 'shared' | 'client';

type PortalStatus = 'loading' | 'valid' | 'expired' | 'revoked' | 'invalid' | 'error';

export function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<PortalStatus>('loading');
  const [record, setRecord] = useState<PortalRecord | null>(null);
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [view, setView] = useState<PortalView>('client');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Share — EvidLY sends server-side; this never opens a mail client.
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareState, setShareState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharedTo, setSharedTo] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    async function load() {
      try {
        const { data, error } = await supabase.functions.invoke('portal-access', {
          body: { token, action: 'load' },
        });

        if (error) { setStatus('error'); return; }

        const result = data as Record<string, unknown>;

        if (result.status === 'invalid') { setStatus('invalid'); return; }
        if (result.status === 'revoked') { setStatus('revoked'); return; }
        if (result.status === 'expired') {
          setExpiresAt(result.expires_at as string);
          setStatus('expired');
          return;
        }

        if (result.status === 'valid') {
          setRecord(result.record as PortalRecord);
          setDocuments(result.documents as PortalDocument[]);
          // Absent on an older response → the client page, unchanged.
          setView(result.view === 'shared' ? 'shared' : 'client');
          setStatus('valid');

          // Record the open (fire-and-forget)
          supabase.functions.invoke('portal-access', {
            body: { token, action: 'open' },
          });
        }
      } catch {
        setStatus('error');
      }
    }

    load();
  }, [token]);

  const handleDownload = useCallback(async (docId: string) => {
    if (!token || downloading) return;
    setDownloading(docId);

    try {
      const { data, error } = await supabase.functions.invoke('portal-access', {
        body: { token, action: 'download', document_id: docId },
      });

      if (error || !data || data.status !== 'ok') {
        alert('Could not download this document. Please try again.');
        return;
      }

      window.open(data.url, '_blank');
    } catch {
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  }, [token, downloading]);

  const handleShare = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || shareState === 'sending') return;

    const email = shareEmail.trim();
    if (!email) { setShareError('Please enter an email address.'); setShareState('error'); return; }

    setShareState('sending');
    setShareError(null);

    try {
      const { data, error } = await supabase.functions.invoke('portal-access', {
        body: { token, action: 'share', recipient_email: email },
      });

      // supabase-js reports a non-2xx as FunctionsHttpError with data === null;
      // the real message is on error.context.
      if (error) {
        let msg = 'Could not send. Please try again.';
        try {
          const body = await (error as { context?: Response }).context?.json?.();
          if (body?.error) msg = String(body.error);
        } catch { /* fall back to the generic message */ }
        setShareError(msg);
        setShareState('error');
        return;
      }

      if (data?.status !== 'shared') {
        setShareError('Could not send. Please try again.');
        setShareState('error');
        return;
      }

      setSharedTo(email);
      setShareEmail('');
      setShareState('sent');
    } catch {
      setShareError('Could not send. Please try again.');
      setShareState('error');
    }
  }, [token, shareEmail, shareState]);

  // ── Loading ───────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: EMBER,
            borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto',
          }} />
          <p style={{ marginTop: 16, color: TEXT_SEC, fontSize: 14 }}>Loading documents...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Error states ──────────────────────────────────────────────
  /* A failed invoke is NOT an invalid token. Collapsing the two hid a server
   * error behind "Invalid Link" and sent people checking the URL instead of
   * retrying. */
  if (status === 'error') {
    return <ErrorCard title="Something Went Wrong" message="We could not load this document link. Please try again in a moment, or contact the sender if it keeps happening." />;
  }

  if (status === 'invalid') {
    return <ErrorCard title="Invalid Link" message="This document link is invalid. Please check the URL or contact the sender for a new link." />;
  }

  if (status === 'revoked') {
    return <ErrorCard title="Link Revoked" message="This document link has been revoked by the sender. Contact them for a new link if needed." />;
  }

  if (status === 'expired') {
    const expDate = expiresAt
      ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'an earlier date';
    return <ErrorCard title="Link Expired" message={`This document link expired on ${expDate}. Contact the sender for a new link.`} />;
  }

  // ── Valid — render documents ──────────────────────────────────
  if (!record) return null;

  return (
    <PortalRecordView
      record={record}
      documents={documents}
      view={view}
      downloading={downloading}
      onDownload={handleDownload}
      shareOpen={shareOpen}
      shareEmail={shareEmail}
      shareState={shareState}
      shareError={shareError}
      sharedTo={sharedTo}
      onShareOpen={() => setShareOpen(true)}
      onShareEmailChange={setShareEmail}
      onShareSubmit={handleShare}
      onShareAgain={() => { setShareState('idle'); setShareOpen(true); }}
    />
  );
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '48px 40px', maxWidth: 440,
        textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22, color: '#DC2626' }}>
          !
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 8 }}>{title}</h1>
        <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.6 }}>{message}</p>
        <a href="https://app.getevidly.com" style={{
          display: 'inline-block', marginTop: 24, padding: '10px 24px',
          background: NAVY, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700,
          textDecoration: 'none',
        }}>
          Go to EvidLY
        </a>
      </div>
    </div>
  );
}
