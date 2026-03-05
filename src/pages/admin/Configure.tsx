/**
 * Configure — Organizations, Locations, Users, Vendors management
 * Route: /admin/configure
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

type Tab = 'organizations' | 'locations' | 'users' | 'vendors';

interface Org {
  id: string;
  name: string;
  plan: string | null;
  status: string;
  industry_type: string | null;
  created_at: string;
  locations?: { count: number }[];
}

interface Location {
  id: string;
  name: string;
  county: string | null;
  address: string | null;
  status: string;
  created_at: string;
  organizations?: { name: string } | null;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  organization_id: string | null;
  last_sign_in_at: string | null;
  created_at: string;
}

interface Vendor {
  id: string;
  company_name: string;
  service_type: string | null;
  email: string | null;
  phone: string | null;
  status: string;
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

export default function Configure() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('organizations');
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [locs, setLocs] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (tab === 'organizations') {
      const { data } = await supabase.from('organizations').select('*, locations(count)').order('created_at', { ascending: false });
      if (data) setOrgs(data);
    } else if (tab === 'locations') {
      const { data } = await supabase.from('locations').select('*, organizations(name)').order('created_at', { ascending: false });
      if (data) setLocs(data);
    } else if (tab === 'users') {
      const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
      if (data) setUsers(data);
    } else if (tab === 'vendors') {
      const { data } = await supabase.from('vendors').select('*').order('created_at', { ascending: false });
      if (data) setVendors(data);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { loadData(); }, [loadData]);

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: tab === t ? CARD : 'transparent', color: tab === t ? TEXT : TEXT_MUTED,
  });

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '32px 40px', fontFamily: 'Inter, sans-serif' }}>
      <button onClick={() => navigate('/admin')} style={{ marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', color: GOLD, fontSize: 13 }}>&larr; Admin</button>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0, marginBottom: 24 }}>Configure</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: '#0A0F1E', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {(['organizations', 'locations', 'users', 'vendors'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : tab === 'organizations' ? (
          orgs.length === 0 ? (
            <EmptyState icon="🏢" title="No organizations yet" subtitle="Organizations will appear here when customers sign up." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Name', 'Plan', 'Locations', 'Status', 'Type', 'Created'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_DIM, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgs.map(o => (
                  <tr key={o.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '10px 14px', color: TEXT, fontWeight: 600 }}>{o.name}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM }}>{o.plan || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM }}>{o.locations?.[0]?.count ?? 0}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: o.status === 'active' ? '#0f3326' : '#3b2f10',
                        color: o.status === 'active' ? '#34D399' : '#FBBF24' }}>{o.status}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{o.industry_type || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : tab === 'locations' ? (
          locs.length === 0 ? (
            <EmptyState icon="📍" title="No locations yet" subtitle="Locations will appear here when customers add their sites." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Name', 'Organization', 'County', 'Address', 'Status', 'Created'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_DIM, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locs.map(l => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '10px 14px', color: TEXT, fontWeight: 600 }}>{l.name}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM }}>{l.organizations?.name || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM }}>{l.county || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{l.address || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: l.status === 'active' ? '#0f3326' : '#3b2f10',
                        color: l.status === 'active' ? '#34D399' : '#FBBF24' }}>{l.status}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{new Date(l.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : tab === 'users' ? (
          users.length === 0 ? (
            <EmptyState icon="👥" title="No users yet" subtitle="Users will appear here when customers create accounts." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Name', 'Email', 'Role', 'Last Sign In', 'Created'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_DIM, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.user_id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '10px 14px', color: TEXT, fontWeight: 600 }}>{u.full_name || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{u.email || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM }}>{u.role}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'Never'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          vendors.length === 0 ? (
            <EmptyState icon="🔧" title="No vendors yet" subtitle="Vendors will appear here when customers add their service providers." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Company', 'Service Type', 'Email', 'Phone', 'Status', 'Created'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_DIM, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '10px 14px', color: TEXT, fontWeight: 600 }}>{v.company_name}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM }}>{v.service_type || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{v.email || '—'}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{v.phone || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: v.status === 'active' ? '#0f3326' : '#3b2f10',
                        color: v.status === 'active' ? '#34D399' : '#FBBF24' }}>{v.status}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{new Date(v.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
