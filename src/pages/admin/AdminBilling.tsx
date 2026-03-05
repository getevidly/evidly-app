/**
 * Billing — MRR, subscriptions, invoices, revenue projections
 * Route: /admin/billing
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const BG = '#0F1629';
const CARD = '#1A2540';
const GOLD = '#A08C5A';
const TEXT = '#F0EBE0';
const TEXT_DIM = '#8A9AB8';
const TEXT_MUTED = '#4A5C7A';
const BORDER = '#1E2D4D';

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
  <div style={{ width: w, height: h, background: BORDER, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px', color: TEXT_MUTED }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_DIM, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: TEXT_MUTED, maxWidth: 400, margin: '0 auto' }}>{subtitle}</div>
  </div>
);

export default function AdminBilling() {
  const navigate = useNavigate();
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

  const KpiCard = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 20px', flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || TEXT }}>{value}</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '32px 40px', fontFamily: 'Inter, sans-serif' }}>
      <button onClick={() => navigate('/admin')} style={{ marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', color: GOLD, fontSize: 13 }}>&larr; Admin</button>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0, marginBottom: 24 }}>Billing</h1>

      {/* KPIs */}
      {loading ? (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ flex: 1 }}><Skeleton h={70} /></div>)}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <KpiCard label="MRR" value={`$${mrr.toLocaleString()}`} color={GOLD} />
          <KpiCard label="ARR" value={`$${arr.toLocaleString()}`} color={GOLD} />
          <KpiCard label="Active" value={activeSubs} color="#34D399" />
          <KpiCard label="Avg / Location" value={`$${avgPerLoc.toFixed(0)}`} />
          <KpiCard label="Trial" value={trialSubs} />
          <KpiCard label="Locations" value={totalLocations} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: '#0A0F1E', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {(['subscriptions', 'invoices', 'projections'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: tab === t ? CARD : 'transparent', color: tab === t ? TEXT : TEXT_MUTED }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'subscriptions' && (
        <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
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
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_DIM, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map(s => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '10px 14px', color: TEXT, fontWeight: 600 }}>{s.organizations?.name || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM }}>{s.plan}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM }}>{s.locations_count}</td>
                    <td style={{ padding: '10px 14px', color: GOLD, fontWeight: 600 }}>${(s.mrr_cents / 100).toFixed(0)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: s.status === 'active' ? '#0f3326' : '#3b2f10',
                        color: s.status === 'active' ? '#34D399' : '#FBBF24' }}>{s.status}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{s.billing_cycle || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'invoices' && (
        <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {invoices.length === 0 ? (
            <EmptyState icon="🧾" title="No invoices yet" subtitle="Invoices will appear here as billing cycles complete." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Organization', 'Date', 'Amount', 'Status', 'Plan'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_DIM, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '10px 14px', color: TEXT, fontWeight: 600 }}>{inv.organizations?.name || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 14px', color: GOLD, fontWeight: 600 }}>${(inv.amount_cents / 100).toFixed(2)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: inv.status === 'paid' ? '#0f3326' : '#3b1414',
                        color: inv.status === 'paid' ? '#34D399' : '#F87171' }}>{inv.status}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM }}>{inv.plan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'projections' && (
        <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 24 }}>
          <h3 style={{ color: TEXT, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Revenue Projections</h3>
          <p style={{ color: TEXT_DIM, fontSize: 12, marginBottom: 20 }}>Forward-looking estimates based on pricing model</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { tier: 'At 100 Accounts', conservative: '$15,000', moderate: '$22,500', strong: '$30,000' },
              { tier: 'At 500 Accounts', conservative: '$75,000', moderate: '$112,500', strong: '$150,000' },
              { tier: 'At 1,000 Accounts', conservative: '$150,000', moderate: '$225,000', strong: '$300,000' },
            ].map(row => (
              <div key={row.tier} style={{ background: '#0A0F1E', borderRadius: 8, padding: 16, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 12 }}>{row.tier}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: TEXT_DIM }}>Conservative</span>
                    <span style={{ color: TEXT }}>{row.conservative}/mo</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: TEXT_DIM }}>Moderate</span>
                    <span style={{ color: GOLD }}>{row.moderate}/mo</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: TEXT_DIM }}>Strong</span>
                    <span style={{ color: '#34D399' }}>{row.strong}/mo</span>
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
