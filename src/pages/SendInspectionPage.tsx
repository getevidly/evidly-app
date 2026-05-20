import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrgSummary } from '../hooks/useOrgSummary';
import { usePageTitle } from '../hooks/usePageTitle';
import { supabase } from '../lib/supabase';

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${pluralForm}`;
}

export function SendInspectionPage() {
  usePageTitle('Send Inspection Package');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const { orgName, locationCount } = useOrgSummary();

  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-populated data
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [firstLocationId, setFirstLocationId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    async function load() {
      try {
        const today = new Date().toISOString().split('T')[0];

        const [docsRes, locRes] = await Promise.all([
          supabase
            .from('documents')
            .select('id, expiration_date')
            .eq('organization_id', orgId)
            .eq('status', 'active'),
          supabase
            .from('locations')
            .select('id')
            .eq('organization_id', orgId)
            .eq('status', 'active')
            .order('created_at', { ascending: true })
            .limit(1),
        ]);

        if (cancelled) return;

        const currentDocs = (docsRes.data || []).filter(
          (d: { expiration_date: string | null }) => !d.expiration_date || d.expiration_date >= today
        );
        setDocumentIds(currentDocs.map((d: { id: string }) => d.id));
        setEvidenceCount(currentDocs.length);
        setFirstLocationId(locRes.data?.[0]?.id || null);
      } catch {
        // Non-blocking — form will show disabled state
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId]);

  const canSubmit = !submitting && !dataLoading && documentIds.length > 0 && firstLocationId &&
    recipientEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail) &&
    recipientName.trim();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !orgId || !firstLocationId) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-inspection-package', {
        body: {
          org_id: orgId,
          // TODO: Multi-location portfolio sends land in C13 — current behavior sends from first location only
          location_id: firstLocationId,
          package_type: 'inspection',
          recipient_email: recipientEmail.trim(),
          recipient_name: recipientName.trim(),
          recipient_type: 'inspector',
          message: message.trim() || null,
          document_ids: documentIds,
          // TODO: surface as toggle in later commit
          include_score_report: false,
          include_temp_summary: false,
        },
      });

      if (error) throw new Error(error.message || 'Failed to send package');
      if (data?.error) throw new Error(data.error);

      navigate('/dashboard', { state: { sendSuccess: { recipient_email: recipientEmail.trim() } } });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to send package');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Link
        to="/dashboard"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', textDecoration: 'none', marginBottom: 16 }}
      >
        <i className="ti ti-arrow-left" style={{ fontSize: 14 }} />
        Back to dashboard
      </Link>

      <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--navy)', margin: '0 0 20px' }}>
        Send inspection package
      </h1>

      <div className="insp-pkg" style={{ marginBottom: 0 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '16px 20px' }}>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 16px' }}>
              {orgName}{locationCount > 0 ? ` · ${plural(locationCount, 'location', 'locations')}` : ''} · {plural(evidenceCount, 'evidence item', 'evidence items')}
            </p>

            {evidenceCount === 0 && !dataLoading && (
              <div style={{ background: 'var(--reduce-bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--reduce-dark)' }}>
                Add documents before sending — <Link to="/documents" style={{ color: 'var(--reduce-dark)', fontWeight: 500 }}>go to Documents</Link>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--navy)', marginBottom: 4 }}>
                Recipient email <span style={{ color: '#A32D2D' }}>*</span>
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid var(--line)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--navy)', marginBottom: 4 }}>
                Recipient name <span style={{ color: '#A32D2D' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid var(--line)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--navy)', marginBottom: 4 }}>
                Reason (optional)
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="e.g. Annual health inspection — San Joaquin County"
                rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid var(--line)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            {formError && (
              <p style={{ fontSize: 12, color: '#A32D2D', marginBottom: 14 }}>{formError}</p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                className="insp-btn primary"
                disabled={!canSubmit}
                style={{ padding: '9px 18px', fontSize: 13 }}
              >
                <i className="ti ti-send" />
                {submitting ? 'Sending...' : 'Send package'}
              </button>
              <Link to="/dashboard" className="insp-btn" style={{ textDecoration: 'none' }}>
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
