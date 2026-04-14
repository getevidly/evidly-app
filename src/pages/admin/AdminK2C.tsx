/**
 * K2C — Kitchen to Community donation tracking
 * Route: /admin/k2c
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import Button from '../../components/ui/Button';
import { StatCardRow } from '../../components/admin/StatCardRow';
import { useDemoGuard } from '../../hooks/useDemoGuard';

interface DonationRow {
  id: string;
  organization_id: string | null;
  account_name: string;
  county: string | null;
  amount_cents: number;
  meals_count: number;
  donation_period: string;
  created_at: string;
}

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div className="rounded-md animate-pulse bg-gray-200" style={{ width: w, height: h }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="text-center py-[60px] px-5 bg-cream border-2 border-dashed border-border_ui-warm rounded-xl m-4">
    <div className="text-[40px] mb-4">{icon}</div>
    <div className="text-base font-bold text-navy mb-2">{title}</div>
    <div className="text-[13px] text-slate_ui max-w-[400px] mx-auto">{subtitle}</div>
  </div>
);

export default function AdminK2C() {
  useDemoGuard();
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formName, setFormName] = useState('');
  const [formCounty, setFormCounty] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formMeals, setFormMeals] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDonations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('k2c_donations')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setDonations(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadDonations(); }, [loadDonations]);

  const totalMeals = donations.reduce((a, d) => a + (d.meals_count || 0), 0);
  const totalDollars = donations.reduce((a, d) => a + (d.amount_cents || 0), 0) / 100;
  const contribOrgs = new Set(donations.map(d => d.account_name)).size;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthMeals = donations
    .filter(d => (d.donation_period || '').startsWith(currentMonth))
    .reduce((a, d) => a + (d.meals_count || 0), 0);

  const addDonation = async () => {
    if (!formName || !formAmount || !formMeals) return;
    setSubmitting(true);
    const { error } = await supabase.from('k2c_donations').insert({
      account_name: formName,
      county: formCounty || null,
      amount_cents: Math.round(parseFloat(formAmount) * 100),
      meals_count: parseInt(formMeals),
      donation_period: new Date().toISOString().slice(0, 10),
    });
    if (error) {
      console.error(`K2C insert error: ${error.message}`);
    } else {
      setFormName('');
      setFormCounty('');
      setFormAmount('');
      setFormMeals('');
      await loadDonations();
    }
    setSubmitting(false);
  };

  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const exportCsv = () => {
    const header = ['Account', 'County', 'Amount', 'Meals', 'Period', 'Created'].map(escapeCSV).join(',') + '\n';
    const rows = donations.map(d =>
      [
        d.account_name,
        d.county || '',
        `$${(d.amount_cents / 100).toFixed(2)}`,
        d.meals_count,
        d.donation_period,
        new Date(d.created_at).toISOString(),
      ].map(escapeCSV).join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `k2c-donations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'K2C' }]} />
      <div className="flex items-center justify-between">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-navy m-0 font-['Outfit',sans-serif]">Kitchen to Community</h1>
          <p className="text-[13px] text-gray-500 mt-1 mb-0 font-['Inter',sans-serif]">Donation tracking — meals, amounts, contributing locations</p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportCsv}>Export CSV</Button>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-4 gap-3 items-stretch">
          {Array.from({ length: 4 }).map((_, i) => <div key={i}><Skeleton h={80} /></div>)}
        </div>
      ) : (
        <StatCardRow cards={[
          { label: 'Total Meals', value: totalMeals.toLocaleString(), valueColor: 'green' },
          { label: 'Total Donated', value: `$${totalDollars.toLocaleString()}`, valueColor: 'gold' },
          { label: 'Contributing Accounts', value: contribOrgs, valueColor: 'navy' },
          { label: 'This Month', value: `${thisMonthMeals.toLocaleString()} meals`, valueColor: 'navy' },
        ]} />
      )}

      {/* Running total banner */}
      <div className="bg-green-50 border border-green-200 rounded-[10px] py-4 px-6 text-center">
        <span className="text-[15px] text-emerald-600 font-bold">
          EvidLY has contributed {totalMeals.toLocaleString()} meals to California communities
        </span>
      </div>

      {/* Manual entry */}
      <div className="bg-white border border-border_ui-warm rounded-xl p-5">
        <h3 className="text-sm font-bold text-navy mb-3">Add Donation</h3>
        <div className="flex gap-2.5 flex-wrap items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
            <label className="text-[11px] text-slate_ui">Account Name</label>
            <input value={formName} onChange={e => setFormName(e.target.value)} className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] flex-1 min-w-[120px]" placeholder="Account name" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
            <label className="text-[11px] text-slate_ui">County</label>
            <input value={formCounty} onChange={e => setFormCounty(e.target.value)} className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] flex-1 min-w-[120px]" placeholder="County" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
            <label className="text-[11px] text-slate_ui">Amount ($)</label>
            <input value={formAmount} onChange={e => setFormAmount(e.target.value)} className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] flex-1 min-w-[120px]" placeholder="0.00" type="number" step="0.01" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
            <label className="text-[11px] text-slate_ui">Meals</label>
            <input value={formMeals} onChange={e => setFormMeals(e.target.value)} className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] flex-1 min-w-[120px]" placeholder="0" type="number" />
          </div>
          <Button variant="gold" size="sm" onClick={addDonation} disabled={submitting || !formName || !formAmount || !formMeals}
            className="whitespace-nowrap">
            {submitting ? 'Adding...' : 'Add Donation'}
          </Button>
        </div>
      </div>

      {/* Donations table */}
      <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : donations.length === 0 ? (
          <EmptyState icon="&#x1F37D;&#xFE0F;" title="$0 donated · 0 meals" subtitle="Will populate automatically when customers subscribe. Use the form above to add manual entries." />
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border_ui-warm">
                {['Account', 'County', 'Amount', 'Meals', 'Period', 'Created'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3.5 text-slate_ui font-semibold text-[11px] uppercase tracking-[0.5px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {donations.map(d => (
                <tr key={d.id} className="border-b border-border_ui-warm">
                  <td className="py-2.5 px-3.5 text-navy font-semibold">{d.account_name}</td>
                  <td className="py-2.5 px-3.5 text-slate_ui">{d.county || '—'}</td>
                  <td className="py-2.5 px-3.5 text-gold font-semibold">${(d.amount_cents / 100).toFixed(2)}</td>
                  <td className="py-2.5 px-3.5 text-emerald-600 font-semibold">{d.meals_count}</td>
                  <td className="py-2.5 px-3.5 text-slate_ui text-xs">{d.donation_period}</td>
                  <td className="py-2.5 px-3.5 text-slate_ui text-xs">{new Date(d.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
