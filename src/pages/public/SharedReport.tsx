/**
 * SharedReport — Public report view via share token
 *
 * Route: /report/:token
 * Access: Public (no auth required, token-based access)
 *
 * Loads a report by its share_token from internal_reports table.
 * Displays a branded read-only view of the report content.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';

interface SharedReportData {
  id: string;
  report_type: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  content_json: Record<string, unknown>;
  share_expires: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  internal_weekly: 'Weekly Operations Report',
  internal_monthly: 'Monthly Review',
  internal_quarterly: 'Quarterly Business Review',
  client_compliance: 'Compliance Summary',
  client_executive: 'Executive Brief',
  client_insurance: 'Insurance Report',
  client_vendor: 'Vendor Performance Report',
  client_regulatory: 'Regulatory Update',
  client_training: 'Training Report',
  partner_portfolio: 'Portfolio Overview',
  partner_risk: 'Risk Assessment',
  partner_performance: 'Performance Metrics',
  investor_mrr: 'MRR Report',
  investor_growth: 'Growth Metrics',
  investor_product: 'Product Update',
};

export function SharedReport() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<SharedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!token) {
        setError('No report token provided.');
        setLoading(false);
        return;
      }

      const { data, error: err } = await supabase
        .from('internal_reports')
        .select('id, report_type, title, period_start, period_end, status, content_json, share_expires, created_at')
        .eq('share_token', token)
        .in('status', ['ready', 'published'])
        .single();

      if (err || !data) {
        setError('This report link is invalid or has expired.');
        setLoading(false);
        return;
      }

      // Check expiration
      if (data.share_expires && new Date(data.share_expires) < new Date()) {
        setError('This report link has expired. Please request a new link from your EvidLY team.');
        setLoading(false);
        return;
      }

      setReport(data);
      setLoading(false);
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF7F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: GOLD,
            borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto',
          }} />
          <p style={{ marginTop: 16, color: TEXT_SEC, fontSize: 14 }}>Loading report...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF7F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          background: '#fff', borderRadius: 16, padding: '48px 40px', maxWidth: 440,
          textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{'🔒'}</div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 8 }}>Report Unavailable</h1>
          <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.6 }}>{error}</p>
          <a href="/" style={{
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

  if (!report) return null;

  const typeLabel = TYPE_LABELS[report.report_type] || report.report_type;

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F0' }}>
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
            Shared Report
          </div>
        </div>
        {report.share_expires && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            Expires {new Date(report.share_expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>

      {/* Report content */}
      <div style={{ maxWidth: 800, margin: '32px auto', padding: '0 24px' }}>
        <div style={{
          background: '#fff', borderRadius: 14, padding: '36px 40px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          {/* Report header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {typeLabel}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, marginBottom: 8 }}>
              {report.title}
            </h1>
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>
              {report.period_start && report.period_end
                ? `Period: ${new Date(report.period_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} – ${new Date(report.period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : `Generated ${new Date(report.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
            </div>
          </div>

          {/* Report body — placeholder for generated content */}
          <div style={{
            padding: '32px 24px', background: '#FAFAF8', borderRadius: 10,
            border: '1.5px dashed #E5E0D8', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{'📊'}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
              Report Content
            </div>
            <div style={{ fontSize: 12, color: TEXT_SEC, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
              In production, this section renders the full report with charts, tables, and analysis
              generated by the generate-report edge function.
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 32, paddingTop: 20, borderTop: '1px solid #E5E0D8',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>
              Generated by EvidLY Intelligence
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>
              Confidential {'—'} Do not distribute
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
