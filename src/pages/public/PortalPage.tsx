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

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const CREAM = '#FAF7F0';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const PROVE = '#2E7D32';
const LINE = '#E5E0D8';

interface PortalRecord {
  recipient_name: string;
  cover_message: string | null;
  sent_at: string;
  expires_at: string;
  org_name: string;
}

interface PortalDocument {
  id: string;
  name: string;
  type: string | null;
  expiration_date: string | null;
  has_file: boolean;
}

type PortalStatus = 'loading' | 'valid' | 'expired' | 'revoked' | 'invalid' | 'error';

export function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<PortalStatus>('loading');
  const [record, setRecord] = useState<PortalRecord | null>(null);
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

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

  // ── Loading ───────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: GOLD,
            borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto',
          }} />
          <p style={{ marginTop: 16, color: TEXT_SEC, fontSize: 14 }}>Loading documents...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Error states ──────────────────────────────────────────────
  if (status === 'invalid' || status === 'error') {
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

  const expDateLabel = new Date(record.expires_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const sentDateLabel = new Date(record.sent_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div style={{ minHeight: '100vh', background: CREAM }}>
      {/* Header */}
      <div style={{
        background: NAVY, padding: '20px 40px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#fff' }}>
            EvidLY
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
            Compliance Documents from {record.org_name}
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          Expires {expDateLabel}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '32px auto', padding: '0 20px' }}>
        <div style={{
          background: '#fff', borderRadius: 14, padding: '36px 40px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          {/* Greeting */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Shared Documents
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: NAVY, margin: '0 0 6px' }}>
              Documents for {record.recipient_name}
            </h1>
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>
              Sent on {sentDateLabel}
            </div>
          </div>

          {/* Cover message */}
          {record.cover_message && (
            <div style={{
              padding: '16px 18px', background: CREAM, borderRadius: 10,
              border: `1px solid ${LINE}`, marginBottom: 24,
              fontSize: 13, color: NAVY, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {record.cover_message}
            </div>
          )}

          {/* Document list */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_SEC, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {documents.length} document{documents.length === 1 ? '' : 's'}
            </div>

            {documents.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>
                No documents attached to this link.
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0', borderTop: `1px solid ${LINE}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.name}
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 3, display: 'flex', gap: 12 }}>
                      {doc.type && <span>{doc.type}</span>}
                      {doc.expiration_date && (
                        <span>Expires {new Date(doc.expiration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      )}
                    </div>
                  </div>
                  {doc.has_file ? (
                    <button
                      type="button"
                      onClick={() => handleDownload(doc.id)}
                      disabled={downloading === doc.id}
                      style={{
                        padding: '8px 16px', background: PROVE, color: '#fff', border: 'none',
                        borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', opacity: downloading === doc.id ? 0.6 : 1,
                        flexShrink: 0, marginLeft: 12,
                      }}
                    >
                      {downloading === doc.id ? 'Loading...' : 'Download'}
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: TEXT_MUTED, flexShrink: 0, marginLeft: 12 }}>
                      No file
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 0 40px', fontSize: 11, color: TEXT_MUTED,
        }}>
          <span>Powered by EvidLY</span>
          <span>This link expires {expDateLabel}</span>
        </div>
      </div>
    </div>
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
