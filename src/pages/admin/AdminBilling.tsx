/**
 * Billing — MRR, subscriptions, invoices, revenue projections
 * Route: /admin/billing
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import Button from '../../components/ui/Button';
import { KpiTile } from '../../components/admin/KpiTile';

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
  <div className="bg-gray-200 rounded-md animate-pulse" style={{ width: w, height: h }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="text-center py-[60px] px-5 bg-cream-warm border-2 border-dashed border-border_ui-warm rounded-xl m-4">
    <div className="text-[40px] mb-4">{icon}</div>
    <div className="text-base font-bold text-navy mb-2">{title}</div>
    <div className="text-[13px] text-slate_ui max-w-[400px] mx-auto">{subtitle}</div>
  </div>
);

export default function AdminBilling() {
  useDemoGuard();
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'subscriptions' | 'invoices' | 'projections'>('subscriptions');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [subRes, invRes] = await Promise.all([
      supabase.from('billing_subscriptions').select('*, organizations(name, created_at)').order('mrr_cents', { ascending: false }),
      supabase.from('billing_invoices').select('*, organizations(name)').order('invoice_date', { ascending: false }).limit(50),
    ]);
    if (subRes.error || invRes.error) {
      setError(subRes.error?.message || invRes.error?.message || 'Failed to load data');
    }
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
    return `inline-block px-2 py-0.5 rounded text-[10px] font-bold ${isGood ? 'bg-green-50 text-emerald-600' : 'bg-red-50 text-red-600'}`;
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">Failed to load data</p>
        <Button variant="primary" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Billing' }]} />
      <h1 className="text-2xl font-bold tracking-tight text-navy">Billing</h1>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-6 gap-3 items-stretch">
          {Array.from({ length: 6 }).map((_, i) => <div key={i}><Skeleton h={80} /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-3 items-stretch">
          <KpiTile label="MRR" value={`$${mrr.toLocaleString()}`} valueColor="gold" />
          <KpiTile label="ARR" value={`$${arr.toLocaleString()}`} valueColor="gold" />
          <KpiTile label="Active" value={activeSubs} valueColor="navy" />
          <KpiTile label="Avg / Location" value={`$${avgPerLoc.toFixed(0)}`} valueColor="gold" />
          <KpiTile label="Trial" value={trialSubs} valueColor="navy" />
          <KpiTile label="Locations" value={totalLocations} valueColor="navy" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 bg-gray-100 rounded-lg p-[3px] w-fit">
        {(['subscriptions', 'invoices', 'projections'] as const).map(t => (
          <Button key={t} variant="ghost" size="sm" onClick={() => setTab(t)}
            className={tab === t ? 'bg-white text-navy shadow-sm' : 'bg-transparent text-gray-400'}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {tab === 'subscriptions' && (
        <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
            </div>
          ) : subs.length === 0 ? (
            <EmptyState icon="&#128179;" title="No subscriptions yet" subtitle="MRR will appear here when the first customer subscribes." />
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border_ui-warm">
                  {['Organization', 'Plan', 'Locations', 'MRR', 'Status', 'Billing', 'Since'].map(h => (
                    <th key={h} className="text-left px-3.5 py-2.5 text-slate_ui font-semibold text-[11px] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map(s => (
                  <tr key={s.id} className="border-b border-border_ui-warm">
                    <td className="px-3.5 py-2.5 text-navy font-semibold">{s.organizations?.name || '\u2014'}</td>
                    <td className="px-3.5 py-2.5 text-slate_ui">{s.plan}</td>
                    <td className="px-3.5 py-2.5 text-slate_ui">{s.locations_count}</td>
                    <td className="px-3.5 py-2.5 text-gold font-semibold">${(s.mrr_cents / 100).toFixed(0)}</td>
                    <td className="px-3.5 py-2.5"><span className={statusBadge(s.status)}>{s.status}</span></td>
                    <td className="px-3.5 py-2.5 text-slate_ui text-xs">{s.billing_cycle || '\u2014'}</td>
                    <td className="px-3.5 py-2.5 text-slate_ui text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'invoices' && (
        <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
          {invoices.length === 0 ? (
            <EmptyState icon="&#129534;" title="No invoices yet" subtitle="Invoices will appear here as billing cycles complete." />
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border_ui-warm">
                  {['Organization', 'Date', 'Amount', 'Status', 'Plan'].map(h => (
                    <th key={h} className="text-left px-3.5 py-2.5 text-slate_ui font-semibold text-[11px] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-border_ui-warm">
                    <td className="px-3.5 py-2.5 text-navy font-semibold">{inv.organizations?.name || '\u2014'}</td>
                    <td className="px-3.5 py-2.5 text-slate_ui text-xs">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                    <td className="px-3.5 py-2.5 text-gold font-semibold">${(inv.amount_cents / 100).toFixed(2)}</td>
                    <td className="px-3.5 py-2.5"><span className={statusBadge(inv.status, 'inv')}>{inv.status}</span></td>
                    <td className="px-3.5 py-2.5 text-slate_ui">{inv.plan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'projections' && (
        <div className="bg-white rounded-xl border border-border_ui-warm p-6">
          <h3 className="text-navy text-base font-bold mb-1">Revenue Projections</h3>
          <p className="text-slate_ui text-xs mb-5">Forward-looking estimates based on pricing model</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { tier: 'At 100 Accounts', conservative: '$15,000', moderate: '$22,500', strong: '$30,000' },
              { tier: 'At 500 Accounts', conservative: '$75,000', moderate: '$112,500', strong: '$150,000' },
              { tier: 'At 1,000 Accounts', conservative: '$150,000', moderate: '$225,000', strong: '$300,000' },
            ].map(row => (
              <div key={row.tier} className="bg-gray-50 rounded-lg p-4 border border-border_ui-warm">
                <div className="text-[13px] font-bold text-navy mb-3">{row.tier}</div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate_ui">Conservative</span>
                    <span className="text-navy">{row.conservative}/mo</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate_ui">Moderate</span>
                    <span className="text-gold">{row.moderate}/mo</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate_ui">Strong</span>
                    <span className="text-emerald-600">{row.strong}/mo</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-[11px] mt-4 italic">
            Projections based on $150-300/location/month pricing. Current MRR: ${mrr.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
