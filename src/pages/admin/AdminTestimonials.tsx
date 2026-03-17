/**
 * AdminTestimonials — SOCIAL-PROOF-01
 * Route: /admin/testimonials
 *
 * Admin page for managing operator testimonials.
 * Approve, reject, feature, and delete testimonials collected
 * from post-inspection prompts.
 */
import { useState, useEffect, useCallback } from 'react';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';
import {
  fetchAllTestimonials,
  toggleTestimonialApproval,
  toggleTestimonialFeatured,
  deleteTestimonial,
  type Testimonial,
} from '../../lib/testimonialSystem';
import { toast } from 'sonner';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const BORDER = '#E5E0D8';

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 14px',
  fontSize: 11,
  fontWeight: 700,
  color: '#4A5568',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};
const tdStyle: React.CSSProperties = { padding: '10px 14px', fontSize: 12 };

export default function AdminTestimonials() {
  useDemoGuard();
  const [data, setData] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await fetchAllTestimonials();
    setData(rows);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = data.length;
  const pending = data.filter(t => !t.approved).length;
  const approved = data.filter(t => t.approved).length;
  const featured = data.filter(t => t.featured).length;

  const filtered = data.filter(t => {
    if (filter === 'pending') return !t.approved;
    if (filter === 'approved') return t.approved;
    return true;
  });

  const handleApproveToggle = async (t: Testimonial) => {
    const ok = await toggleTestimonialApproval(t.id, !t.approved);
    if (ok) {
      toast.success(t.approved ? 'Testimonial unapproved' : 'Testimonial approved');
      load();
    } else {
      toast.error('Failed to update');
    }
  };

  const handleFeatureToggle = async (t: Testimonial) => {
    const ok = await toggleTestimonialFeatured(t.id, !t.featured);
    if (ok) {
      toast.success(t.featured ? 'Unset featured' : 'Set as featured');
      load();
    } else {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (t: Testimonial) => {
    if (!confirm('Delete this testimonial?')) return;
    const ok = await deleteTestimonial(t.id);
    if (ok) {
      toast.success('Testimonial deleted');
      load();
    } else {
      toast.error('Failed to delete');
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 64px' }}>
      <AdminBreadcrumb crumbs={[{ label: 'Growth', path: '/admin' }, { label: 'Testimonials' }]} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 4px', fontFamily: "'DM Sans', sans-serif" }}>
            Testimonials
          </h1>
          <p style={{ fontSize: 13, color: TEXT_SEC, margin: 0 }}>
            Manage operator testimonials displayed on ScoreTable county pages
          </p>
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <KpiTile label="Total" value={String(total)} />
        <KpiTile label="Pending Review" value={String(pending)} valueColor={pending > 0 ? 'warning' : undefined} />
        <KpiTile label="Approved" value={String(approved)} valueColor="green" />
        <KpiTile label="Featured" value={String(featured)} valueColor="gold" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'pending', 'approved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: `1px solid ${filter === f ? NAVY : BORDER}`,
              background: filter === f ? NAVY : '#fff',
              color: filter === f ? '#fff' : NAVY,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: TEXT_SEC, fontSize: 13 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            background: '#fff',
            borderRadius: 12,
            border: `1px solid ${BORDER}`,
          }}
        >
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>💬</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: '0 0 4px' }}>
            No testimonials yet
          </p>
          <p style={{ fontSize: 12, color: TEXT_SEC, margin: 0 }}>
            Testimonials are collected from operators after their first inspection with EvidLY
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th style={thStyle}>Quote</th>
                <th style={thStyle}>Author</th>
                <th style={thStyle}>County</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ ...tdStyle, maxWidth: 300, color: NAVY }}>
                    <p style={{ margin: 0, lineHeight: 1.5, fontSize: 12 }}>
                      "{t.quote.length > 120 ? t.quote.slice(0, 120) + '...' : t.quote}"
                    </p>
                  </td>
                  <td style={tdStyle}>
                    <p style={{ margin: 0, fontWeight: 600, color: NAVY, fontSize: 12 }}>{t.author_name || '—'}</p>
                    <p style={{ margin: 0, color: TEXT_SEC, fontSize: 11 }}>{t.org_name || ''}</p>
                  </td>
                  <td style={{ ...tdStyle, color: TEXT_SEC }}>
                    {t.county ? t.county.charAt(0).toUpperCase() + t.county.slice(1) : '—'}
                    {t.city ? ` · ${t.city}` : ''}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        background: t.approved ? '#f0fdf4' : '#fffbeb',
                        color: t.approved ? '#16a34a' : '#d97706',
                      }}
                    >
                      {t.approved ? 'Approved' : 'Pending'}
                    </span>
                    {t.featured && (
                      <span
                        style={{
                          display: 'inline-flex',
                          marginLeft: 4,
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          background: '#fffbeb',
                          color: GOLD,
                        }}
                      >
                        ★ Featured
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleApproveToggle(t)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          border: `1px solid ${BORDER}`,
                          background: '#fff',
                          color: t.approved ? '#d97706' : '#16a34a',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {t.approved ? 'Unapprove' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleFeatureToggle(t)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          border: `1px solid ${BORDER}`,
                          background: '#fff',
                          color: GOLD,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {t.featured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          border: '1px solid #fecaca',
                          background: '#fff',
                          color: '#dc2626',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
