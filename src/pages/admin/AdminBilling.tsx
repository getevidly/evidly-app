/**
 * Billing — MRR, subscriptions, invoices, revenue projections
 * Route: /admin/billing
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';

interface SubscriptionRow {
  id: string;
  organization_id: string;
  plan: string;
  status: string;
  mrr_cents: number;
  locations_count: number;
  billing_cycle: string;
  created_at: string;
  organizations?: { name: string; created_at: string } | null;
}

interface InvoiceRow {
  id: string;
  organization_id: string;
  invoice_date: string;
  amount_cents: number;
  status: string;
  plan: string;
  organizations?: { name: string } | null;
}

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div style={{ width: w, height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FAF7F2', border: '2px dashed #E2D9C8', borderRadius: 12, margin: 16 }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: TEXT_SEC, maxWidth: 400, margin: '0 auto' }}>{subtitle}</div>
  </div>
);

export default function AdminBilling() {
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'subscriptions' | 'invoices' | 'projections'>('subscriptions');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [subRes, invRes] = await Promise.all([
      supabase.from('billing_subscriptions').select('*, organizations(name, created_at)').order('mrr_cents', { ascending: false }),
      supabase.from('billing_invoices').select('*, organizations(name)').order('invoice_date', { ascending: false }).limit(50),
    ]);
    if (subRes.data) setSubs(subRes.data);
    if (invRes.data) setInvoices(invRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const mrr = subs.reduce((a, s) => a + (s.mrr_cents || 0), 0) / 100;
  const arr = mrr * 12;
  const activeSubs = subs.filter(s => s.status === 'active').length;
  const trialSubs = subs.filter(s => s.status === 'trial').length;
  const totalLocations = subs.reduce((a, s) => a + (s.locations_count || 0), 0);
  const avgPerLoc = totalLocations > 0 ? mrr / totalLocations : 0;


  const statusBadge = (status: string, type: 'sub' | 'inv' = 'sub') => {
    const isGood = type === 'sub' ? status === 'active' : status === 'paid';
    return {
      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 as const,
      background: isGood ? '#F0FFF4' : '#FEF2F2',
      color: isGood ? '#059669' : '#DC2626',
    };
  };

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Billing' }]} />
      <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Billing</h1>

      {/* KPIs */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, alignItems: 'stretch' }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i}><Skeleton h={80} /></div>)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, alignItems: 'stretch' }}>
          <KpiTile label="MRR" value={`$${mrr.toLocaleString()}`} valueColor="gold" />
          <KpiTile label="ARR" value={`$${arr.toLocaleString()}`} valueColor="gold" />
          <KpiTile label="Active" value={activeSubs} valueColor="navy" />
          <KpiTile label="Avg / Location" value={`$${avgPerLoc.toFixed(0)}`} valueColor="gold" />
          <KpiTile label="Trial" value={trialSubs} valueColor="navy" />
          <KpiTile label="Locations" value={totalLocations} valueColor="navy" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#F3F4F6', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {(['subscriptions', 'invoices', 'projections'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: tab === t ? '#FFFFFF' : 'transparent', color: tab === t ? NAVY : TEXT_MUTED,
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'subscriptions' && (
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
            </div>
          ) : subs.length === 0 ? (
            <EmptyState icon="💳" title="No subscriptions yet" subtitle="MRR will appear here when the first customer subscribes." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Organization', 'Plan', 'Locations', 'MRR', 'Status', 'Billing', 'Since'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map(s => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '10px 14px', color: NAVY, fontWeight: 600 }}>{s.organizations?.name || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_SEC }}>{s.plan}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_SEC }}>{s.locations_count}</td>
                    <td style={{ padding: '10px 14px', color: GOLD, fontWeight: 600 }}>${(s.mrr_cents / 100).toFixed(0)}</td>
                    <td style={{ padding: '10px 14px' }}><span style={statusBadge(s.status)}>{s.status}</span></td>
                    <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{s.billing_cycle || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'invoices' && (
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {invoices.length === 0 ? (
            <EmptyState icon="🧾" title="No invoices yet" subtitle="Invoices will appear here as billing cycles complete." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Organization', 'Date', 'Amount', 'Status', 'Plan'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '10px 14px', color: NAVY, fontWeight: 600 }}>{inv.organizations?.name || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 14px', color: GOLD, fontWeight: 600 }}>${(inv.amount_cents / 100).toFixed(2)}</td>
                    <td style={{ padding: '10px 14px' }}><span style={statusBadge(inv.status, 'inv')}>{inv.status}</span></td>
                    <td style={{ padding: '10px 14px', color: TEXT_SEC }}>{inv.plan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'projections' && (
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, padding: 24 }}>
          <h3 style={{ color: NAVY, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Revenue Projections</h3>
          <p style={{ color: TEXT_SEC, fontSize: 12, marginBottom: 20 }}>Forward-looking estimates based on pricing model</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { tier: 'At 100 Accounts', conservative: '$15,000', moderate: '$22,500', strong: '$30,000' },
              { tier: 'At 500 Accounts', conservative: '$75,000', moderate: '$112,500', strong: '$150,000' },
              { tier: 'At 1,000 Accounts', conservative: '$150,000', moderate: '$225,000', strong: '$300,000' },
            ].map(row => (
              <div key={row.tier} style={{ background: '#F9FAFB', borderRadius: 8, padding: 16, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 12 }}>{row.tier}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: TEXT_SEC }}>Conservative</span>
                    <span style={{ color: NAVY }}>{row.conservative}/mo</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: TEXT_SEC }}>Moderate</span>
                    <span style={{ color: GOLD }}>{row.moderate}/mo</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: TEXT_SEC }}>Strong</span>
                    <span style={{ color: '#059669' }}>{row.strong}/mo</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 16, fontStyle: 'italic' }}>
            Projections based on $150-300/location/month pricing. Current MRR: ${mrr.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
