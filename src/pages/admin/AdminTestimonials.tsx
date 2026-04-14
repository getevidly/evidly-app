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
    <div className="max-w-[1100px] mx-auto px-6 pt-6 pb-16">
      <AdminBreadcrumb crumbs={[{ label: 'Growth', path: '/admin' }, { label: 'Testimonials' }]} />

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy mb-1 font-['DM_Sans',sans-serif]">
            Testimonials
          </h1>
          <p className="text-[13px] text-[#6B7F96]">
            Manage operator testimonials displayed on ScoreTable county pages
          </p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <KpiTile label="Total" value={String(total)} />
        <KpiTile label="Pending Review" value={String(pending)} valueColor={pending > 0 ? 'warning' : undefined} />
        <KpiTile label="Approved" value={String(approved)} valueColor="green" />
        <KpiTile label="Featured" value={String(featured)} valueColor="gold" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'approved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`py-1.5 px-3.5 rounded-md text-xs font-semibold cursor-pointer capitalize ${
              filter === f
                ? 'border border-navy bg-navy text-white'
                : 'border border-[#E5E0D8] bg-white text-navy'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-10 text-center text-[#6B7F96] text-[13px]">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#E5E0D8]">
          <p className="text-[32px] mb-2">&#x1F4AC;</p>
          <p className="text-sm font-bold text-navy mb-1">
            No testimonials yet
          </p>
          <p className="text-xs text-[#6B7F96]">
            Testimonials are collected from operators after their first inspection with EvidLY
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E0D8] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#E5E0D8]">
                <th className="text-left py-2.5 px-3.5 text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.04em]">Quote</th>
                <th className="text-left py-2.5 px-3.5 text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.04em]">Author</th>
                <th className="text-left py-2.5 px-3.5 text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.04em]">County</th>
                <th className="text-left py-2.5 px-3.5 text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.04em]">Status</th>
                <th className="text-right py-2.5 px-3.5 text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.04em]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-[#E5E0D8]">
                  <td className="py-2.5 px-3.5 text-xs max-w-[300px] text-navy">
                    <p className="m-0 leading-relaxed text-xs">
                      "{t.quote.length > 120 ? t.quote.slice(0, 120) + '...' : t.quote}"
                    </p>
                  </td>
                  <td className="py-2.5 px-3.5 text-xs">
                    <p className="m-0 font-semibold text-navy text-xs">{t.author_name || '—'}</p>
                    <p className="m-0 text-[#6B7F96] text-[11px]">{t.org_name || ''}</p>
                  </td>
                  <td className="py-2.5 px-3.5 text-xs text-[#6B7F96]">
                    {t.county ? t.county.charAt(0).toUpperCase() + t.county.slice(1) : '—'}
                    {t.city ? ` · ${t.city}` : ''}
                  </td>
                  <td className="py-2.5 px-3.5 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 py-0.5 px-2 rounded text-[10px] font-bold ${
                        t.approved ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-[#fffbeb] text-[#d97706]'
                      }`}
                    >
                      {t.approved ? 'Approved' : 'Pending'}
                    </span>
                    {t.featured && (
                      <span className="inline-flex ml-1 py-0.5 px-2 rounded text-[10px] font-bold bg-[#fffbeb] text-gold">
                        &#x2605; Featured
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3.5 text-xs text-right">
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => handleApproveToggle(t)}
                        className={`py-1 px-2.5 rounded border border-[#E5E0D8] bg-white text-[11px] font-semibold cursor-pointer ${
                          t.approved ? 'text-[#d97706]' : 'text-[#16a34a]'
                        }`}
                      >
                        {t.approved ? 'Unapprove' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleFeatureToggle(t)}
                        className="py-1 px-2.5 rounded border border-[#E5E0D8] bg-white text-gold text-[11px] font-semibold cursor-pointer"
                      >
                        {t.featured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="py-1 px-2.5 rounded border border-[#fecaca] bg-white text-[#dc2626] text-[11px] font-semibold cursor-pointer"
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
