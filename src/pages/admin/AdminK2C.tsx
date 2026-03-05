/**
 * K2C — Kitchen to Community donation tracking
 * Route: /admin/k2c
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
  <div style={{ width: w, height: h, background: BORDER, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px', color: TEXT_MUTED }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_DIM, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: TEXT_MUTED, maxWidth: 400, margin: '0 auto' }}>{subtitle}</div>
  </div>
);

export default function AdminK2C() {
  const navigate = useNavigate();
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
      alert(`Error: ${error.message}`);
    } else {
      setFormName('');
      setFormCounty('');
      setFormAmount('');
      setFormMeals('');
      await loadDonations();
    }
    setSubmitting(false);
  };

  const exportCsv = () => {
    const header = 'Account,County,Amount,Meals,Period,Created\n';
    const rows = donations.map(d =>
      `"${d.account_name}","${d.county || ''}","$${(d.amount_cents / 100).toFixed(2)}",${d.meals_count},"${d.donation_period}","${new Date(d.created_at).toISOString()}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `k2c-donations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const KpiCard = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 20px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || TEXT }}>{value}</div>
    </div>
  );

  const inputStyle: React.CSSProperties = { padding: '8px 12px', background: '#0A0F1E', border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 13, flex: 1, minWidth: 120 };

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '32px 40px', fontFamily: 'Inter, sans-serif' }}>
      <button onClick={() => navigate('/admin')} style={{ marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', color: GOLD, fontSize: 13 }}>&larr; Admin</button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0 }}>Kitchen to Community</h1>
          <p style={{ fontSize: 13, color: TEXT_DIM, marginTop: 4 }}>Donation tracking &mdash; meals, amounts, contributing locations</p>
        </div>
        <button onClick={exportCsv} style={{ padding: '6px 14px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT_DIM, fontSize: 12, cursor: 'pointer' }}>Export CSV</button>
      </div>

      {/* KPIs */}
      {loading ? (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ flex: 1 }}><Skeleton h={70} /></div>)}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <KpiCard label="Total Meals" value={totalMeals.toLocaleString()} color="#34D399" />
          <KpiCard label="Total Donated" value={`$${totalDollars.toLocaleString()}`} color={GOLD} />
          <KpiCard label="Contributing Accounts" value={contribOrgs} />
          <KpiCard label="This Month" value={`${thisMonthMeals.toLocaleString()} meals`} />
        </div>
      )}

      {/* Running total banner */}
      <div style={{ background: '#0f3326', border: '1px solid #1a5940', borderRadius: 10, padding: '16px 24px', marginBottom: 24, textAlign: 'center' }}>
        <span style={{ fontSize: 15, color: '#34D399', fontWeight: 700 }}>
          EvidLY has contributed {totalMeals.toLocaleString()} meals to California communities
        </span>
      </div>

      {/* Manual entry */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Add Donation</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 11, color: TEXT_DIM }}>Account Name</label>
            <input value={formName} onChange={e => setFormName(e.target.value)} style={inputStyle} placeholder="Account name" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 11, color: TEXT_DIM }}>County</label>
            <input value={formCounty} onChange={e => setFormCounty(e.target.value)} style={inputStyle} placeholder="County" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 100 }}>
            <label style={{ fontSize: 11, color: TEXT_DIM }}>Amount ($)</label>
            <input value={formAmount} onChange={e => setFormAmount(e.target.value)} style={inputStyle} placeholder="0.00" type="number" step="0.01" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 100 }}>
            <label style={{ fontSize: 11, color: TEXT_DIM }}>Meals</label>
            <input value={formMeals} onChange={e => setFormMeals(e.target.value)} style={inputStyle} placeholder="0" type="number" />
          </div>
          <button onClick={addDonation} disabled={submitting || !formName || !formAmount || !formMeals}
            style={{ padding: '8px 20px', background: submitting ? BORDER : GOLD, border: 'none', borderRadius: 6, color: '#1E2D4D', fontSize: 13, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
            {submitting ? 'Adding...' : 'Add Donation'}
          </button>
        </div>
      </div>

      {/* Donations table */}
      <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : donations.length === 0 ? (
          <EmptyState icon="🍽️" title="$0 donated · 0 meals" subtitle="Will populate automatically when customers subscribe. Use the form above to add manual entries." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Account', 'County', 'Amount', 'Meals', 'Period', 'Created'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_DIM, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {donations.map(d => (
                <tr key={d.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '10px 14px', color: TEXT, fontWeight: 600 }}>{d.account_name}</td>
                  <td style={{ padding: '10px 14px', color: TEXT_DIM }}>{d.county || '—'}</td>
                  <td style={{ padding: '10px 14px', color: GOLD, fontWeight: 600 }}>${(d.amount_cents / 100).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', color: '#34D399', fontWeight: 600 }}>{d.meals_count}</td>
                  <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{d.donation_period}</td>
                  <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{new Date(d.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
