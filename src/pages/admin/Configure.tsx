/**
 * Configure — Organizations, Locations, Users, Vendors management
 * Route: /admin/configure
 * All 4 tabs have ADD capability with modals saving to Supabase.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import OrgCombobox, { type OrgOption } from '../../components/admin/OrgCombobox';
import { useAuth } from '../../contexts/AuthContext';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';

type Tab = 'organizations' | 'locations' | 'users' | 'vendors';

interface Org { id: string; name: string; plan: string | null; status: string; industry_type: string | null; created_at: string; locations?: { count: number }[];
  primary_contact_name?: string | null; primary_contact_email?: string | null; primary_contact_phone?: string | null;
  alternate_contact_name?: string | null; alternate_contact_email?: string | null; alternate_contact_phone?: string | null;
  main_phone?: string | null; billing_email?: string | null; }
interface Location { id: string; name: string; county: string | null; address: string | null; city: string | null; status: string; created_at: string; organization_id?: string | null; organizations?: { name: string } | null;
  site_contact_name?: string | null; site_contact_email?: string | null; site_contact_phone?: string | null;
  site_phone?: string | null; manager_name?: string | null; manager_phone?: string | null; }
interface UserProfile { user_id: string; full_name: string | null; email: string | null; role: string; organization_id: string | null; last_sign_in_at: string | null; created_at: string; phone?: string | null; }
interface Vendor { id: string; company_name: string; service_type: string | null; email: string | null; phone: string | null; status: string; created_at: string; is_partner?: boolean;
  primary_contact_name?: string | null; primary_contact_email?: string | null; primary_contact_phone?: string | null;
  alternate_contact_name?: string | null; alternate_contact_email?: string | null; alternate_contact_phone?: string | null;
  main_phone?: string | null; website?: string | null; contact_name?: string | null; }

const CA_COUNTIES = [
  'Alameda','Alpine','Amador','Butte','Calaveras','Colusa','Contra Costa','Del Norte',
  'El Dorado','Fresno','Glenn','Humboldt','Imperial','Inyo','Kern','Kings','Lake',
  'Lassen','Los Angeles','Madera','Marin','Mariposa','Mendocino','Merced','Modoc',
  'Mono','Monterey','Napa','Nevada','Orange','Placer','Plumas','Riverside',
  'Sacramento','San Benito','San Bernardino','San Diego','San Francisco','San Joaquin',
  'San Luis Obispo','San Mateo','Santa Barbara','Santa Clara','Santa Cruz','Shasta',
  'Sierra','Siskiyou','Solano','Sonoma','Stanislaus','Sutter','Tehama','Trinity',
  'Tulare','Tuolumne','Ventura','Yolo','Yuba',
];

const ROLES = ['owner_operator','executive','kitchen_manager','compliance_manager','chef','facilities_manager','kitchen_staff','platform_admin'];
const SERVICE_TYPES = ['Hood Cleaning','Fire Suppression','Pest Control','Grease Disposal','Oil Management','Equipment Repair','HVAC','Plumbing','Electrical','Other'];
const CERTIFICATIONS = ['IKECA','NFPA','EPA','State Licensed','Insured','Bonded'];

const Skeleton = ({ h = 20 }: { h?: number }) => (
  <div style={{ width: '100%', height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const statusBadge = (status: string) => ({
  padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 as const,
  background: status === 'active' ? '#F0FFF4' : status === 'pending' ? '#FFFBEB' : '#FEF2F2',
  color: status === 'active' ? '#059669' : status === 'pending' ? '#D97706' : '#DC2626',
});

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8,
  fontSize: 13, color: NAVY, background: '#fff', outline: 'none',
};

const labelStyle: React.CSSProperties = { fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: '95vw', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: TEXT_MUTED, cursor: 'pointer' }}>{'\u00D7'}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Configure() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('organizations');
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [locs, setLocs] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Detail drawer
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [selectedLoc, setSelectedLoc] = useState<Location | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Modal states
  const [addOrgOpen, setAddOrgOpen] = useState(false);
  const [addLocOpen, setAddLocOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addVendorOpen, setAddVendorOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (tab === 'organizations') {
      const { data } = await supabase.from('organizations').select('*, locations(count)').order('created_at', { ascending: false });
      if (data) setOrgs(data);
    } else if (tab === 'locations') {
      const [locRes, orgRes] = await Promise.all([
        supabase.from('locations').select('*, organizations(name)').order('created_at', { ascending: false }),
        supabase.from('organizations').select('id, name').order('name'),
      ]);
      if (locRes.data) setLocs(locRes.data);
      if (orgRes.data) setOrgs(orgRes.data as any);
    } else if (tab === 'users') {
      const [userRes, orgRes] = await Promise.all([
        supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('organizations').select('id, name').order('name'),
      ]);
      if (userRes.data) setUsers(userRes.data);
      if (orgRes.data) setOrgs(orgRes.data as any);
    } else if (tab === 'vendors') {
      const { data } = await supabase.from('vendors').select('*').order('created_at', { ascending: false });
      if (data) setVendors(data);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { loadData(); }, [loadData]);

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: tab === t ? '#FFFFFF' : 'transparent', color: tab === t ? NAVY : TEXT_MUTED,
    boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
  });

  const addButtonLabel = tab === 'organizations' ? '+ Add Organization'
    : tab === 'locations' ? '+ Add Location'
    : tab === 'users' ? '+ Invite User'
    : '+ Add Vendor';

  const openModal = () => {
    if (tab === 'organizations') setAddOrgOpen(true);
    else if (tab === 'locations') setAddLocOpen(true);
    else if (tab === 'users') setAddUserOpen(true);
    else setAddVendorOpen(true);
  };

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Configure' }]} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Configure</h1>
          <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>Manage organizations, locations, users, and vendors.</p>
        </div>
        <button onClick={openModal} style={{
          padding: '8px 20px', background: NAVY, color: '#fff', border: 'none',
          borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>{addButtonLabel}</button>
      </div>

      {/* Tabs + search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 2, background: '#F3F4F6', borderRadius: 8, padding: 3 }}>
          {(['organizations', 'locations', 'users', 'vendors'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(''); }} style={tabStyle(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...inputStyle, width: 220 }} />
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : tab === 'organizations' ? (
          <OrgsTable orgs={orgs} search={search} onAdd={() => setAddOrgOpen(true)} onSelect={setSelectedOrg} />
        ) : tab === 'locations' ? (
          <LocsTable locs={locs} search={search} onAdd={() => setAddLocOpen(true)} onSelect={setSelectedLoc} />
        ) : tab === 'users' ? (
          <UsersTable users={users} orgs={orgs} search={search} onAdd={() => setAddUserOpen(true)} onSelect={setSelectedUser} />
        ) : (
          <VendorsTable vendors={vendors} search={search} onAdd={() => setAddVendorOpen(true)} onSelect={setSelectedVendor} />
        )}
      </div>

      {/* Modals */}
      {addOrgOpen && <AddOrgModal onClose={() => setAddOrgOpen(false)} onSaved={loadData} />}
      {addLocOpen && <AddLocModal orgs={orgs} onClose={() => setAddLocOpen(false)} onSaved={loadData} />}
      {addUserOpen && <AddUserModal orgs={orgs} onClose={() => setAddUserOpen(false)} onSaved={loadData} userEmail={user?.email} />}
      {addVendorOpen && <AddVendorModal onClose={() => setAddVendorOpen(false)} onSaved={loadData} />}

      {/* Detail drawers */}
      {selectedOrg && <OrgDrawer org={selectedOrg} onClose={() => setSelectedOrg(null)} onRefresh={loadData} />}
      {selectedLoc && <LocDrawer loc={selectedLoc} onClose={() => setSelectedLoc(null)} onRefresh={loadData} />}
      {selectedUser && <UserDrawer user={selectedUser} orgs={orgs} onClose={() => setSelectedUser(null)} onRefresh={loadData} />}
      {selectedVendor && <VendorDrawer vendor={selectedVendor} onClose={() => setSelectedVendor(null)} onRefresh={loadData} />}
    </div>
  );
}

// ══════════════ TABLE COMPONENTS ══════════════

function EmptyAction({ icon, title, subtitle, actionLabel, onAction }: {
  icon: string; title: string; subtitle: string; actionLabel: string; onAction: () => void;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FAF7F2', border: '2px dashed #E2D9C8', borderRadius: 12, margin: 16 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: TEXT_SEC, maxWidth: 400, margin: '0 auto', marginBottom: 16 }}>{subtitle}</div>
      <button onClick={onAction} style={{
        padding: '8px 20px', background: NAVY, color: '#fff', border: 'none',
        borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
      }}>{actionLabel}</button>
    </div>
  );
}

const TH = ({ children }: { children: string }) => (
  <th style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{children}</th>
);
const TD = ({ children, fw, fs }: { children: React.ReactNode; fw?: boolean; fs?: number }) => (
  <td style={{ padding: '10px 14px', color: fw ? NAVY : TEXT_SEC, fontWeight: fw ? 600 : 400, fontSize: fs || 13 }}>{children}</td>
);

function OrgsTable({ orgs, search, onAdd, onSelect }: { orgs: Org[]; search: string; onAdd: () => void; onSelect: (o: Org) => void }) {
  const q = search.toLowerCase();
  const filtered = orgs.filter(o => !q || o.name.toLowerCase().includes(q));
  if (filtered.length === 0) return <EmptyAction icon="🏢" title="No organizations yet" subtitle="Add your first organization to get started." actionLabel="+ Add Organization" onAction={onAdd} />;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}><TH>Name</TH><TH>Primary Contact</TH><TH>Phone</TH><TH>Plan</TH><TH>Locations</TH><TH>Status</TH></tr></thead>
      <tbody>{filtered.map(o => (
        <tr key={o.id} onClick={() => onSelect(o)} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <TD fw>{o.name}</TD>
          <td style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: 13, color: NAVY }}>{o.primary_contact_name || '\u2014'}</div>
            {o.primary_contact_email && <div style={{ fontSize: 11, color: TEXT_SEC }}>{o.primary_contact_email}</div>}
          </td>
          <TD fs={12}>{o.primary_contact_phone || o.main_phone || '\u2014'}</TD>
          <TD>{o.plan || '\u2014'}</TD><TD>{o.locations?.[0]?.count ?? 0}</TD>
          <td style={{ padding: '10px 14px' }}><span style={statusBadge(o.status)}>{o.status}</span></td>
        </tr>
      ))}</tbody>
    </table>
  );
}

function LocsTable({ locs, search, onAdd, onSelect }: { locs: Location[]; search: string; onAdd: () => void; onSelect: (l: Location) => void }) {
  const q = search.toLowerCase();
  const filtered = locs.filter(l => !q || l.name.toLowerCase().includes(q) || (l.county || '').toLowerCase().includes(q));
  if (filtered.length === 0) return <EmptyAction icon="📍" title="No locations yet" subtitle="Add a location to begin configuring sites." actionLabel="+ Add Location" onAction={onAdd} />;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}><TH>Name</TH><TH>Organization</TH><TH>Site Contact</TH><TH>Phone</TH><TH>County</TH><TH>Status</TH></tr></thead>
      <tbody>{filtered.map(l => (
        <tr key={l.id} onClick={() => onSelect(l)} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <TD fw>{l.name}</TD><TD>{l.organizations?.name || '\u2014'}</TD>
          <TD fs={12}>{l.site_contact_name || l.manager_name || '\u2014'}</TD>
          <TD fs={12}>{l.site_contact_phone || l.site_phone || l.manager_phone || '\u2014'}</TD>
          <TD>{l.county || '\u2014'}</TD>
          <td style={{ padding: '10px 14px' }}><span style={statusBadge(l.status)}>{l.status}</span></td>
        </tr>
      ))}</tbody>
    </table>
  );
}

function UsersTable({ users, orgs, search, onAdd, onSelect }: { users: UserProfile[]; orgs: Org[]; search: string; onAdd: () => void; onSelect: (u: UserProfile) => void }) {
  const q = search.toLowerCase();
  const filtered = users.filter(u => !q || (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  if (filtered.length === 0) return <EmptyAction icon="👥" title="No users yet" subtitle="Invite or provision users to get started." actionLabel="+ Invite User" onAction={onAdd} />;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}><TH>Name</TH><TH>Email</TH><TH>Role</TH><TH>Organization</TH><TH>Last Login</TH><TH>Created</TH></tr></thead>
      <tbody>{filtered.map(u => {
        const org = orgs.find(o => o.id === u.organization_id);
        return (
          <tr key={u.user_id} onClick={() => onSelect(u)} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <TD fw>{u.full_name || '\u2014'}</TD><TD fs={12}>{u.email || '\u2014'}</TD><TD>{u.role}</TD>
            <TD fs={12}>{org?.name || '\u2014'}</TD>
            <TD fs={12}>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'Never'}</TD>
            <TD fs={12}>{new Date(u.created_at).toLocaleDateString()}</TD>
          </tr>
        );
      })}</tbody>
    </table>
  );
}

function VendorsTable({ vendors, search, onAdd, onSelect }: { vendors: Vendor[]; search: string; onAdd: () => void; onSelect: (v: Vendor) => void }) {
  const q = search.toLowerCase();
  const filtered = vendors.filter(v => !q || v.company_name.toLowerCase().includes(q) || (v.service_type || '').toLowerCase().includes(q));
  if (filtered.length === 0) return <EmptyAction icon="🔧" title="No vendors yet" subtitle="Add vendors to the platform below." actionLabel="+ Add Vendor" onAction={onAdd} />;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}><TH>Company</TH><TH>Service</TH><TH>Primary Contact</TH><TH>Phone</TH><TH>Partner</TH><TH>Status</TH></tr></thead>
      <tbody>{filtered.map(v => (
        <tr key={v.id} onClick={() => onSelect(v)} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <TD fw>{v.company_name}</TD><TD>{v.service_type || '\u2014'}</TD>
          <td style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: 13, color: NAVY }}>{v.primary_contact_name || v.contact_name || '\u2014'}</div>
            {(v.primary_contact_email || v.email) && <div style={{ fontSize: 11, color: TEXT_SEC }}>{v.primary_contact_email || v.email}</div>}
          </td>
          <TD fs={12}>{v.primary_contact_phone || v.phone || v.main_phone || '\u2014'}</TD>
          <td style={{ padding: '10px 14px' }}>{v.is_partner ? <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#F0FFF4', padding: '2px 8px', borderRadius: 4 }}>Partner</span> : '\u2014'}</td>
          <td style={{ padding: '10px 14px' }}><span style={statusBadge(v.status)}>{v.status}</span></td>
        </tr>
      ))}</tbody>
    </table>
  );
}

// ══════════════ ADD MODALS ══════════════

function AddOrgModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('restaurant');
  const [county, setCounty] = useState('');
  const [plan, setPlan] = useState('founder');
  const [status, setStatus] = useState('pending');
  const [mainPhone, setMainPhone] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [pcName, setPcName] = useState('');
  const [pcEmail, setPcEmail] = useState('');
  const [pcPhone, setPcPhone] = useState('');
  const [acName, setAcName] = useState('');
  const [acEmail, setAcEmail] = useState('');
  const [acPhone, setAcPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('organizations').insert({
      name: name.trim(), industry_type: type, primary_county: county || null,
      plan, status, notes: notes || null,
      main_phone: mainPhone || null, billing_email: billingEmail || null,
      primary_contact_name: pcName || null, primary_contact_email: pcEmail || null, primary_contact_phone: pcPhone || null,
      alternate_contact_name: acName || null, alternate_contact_email: acEmail || null, alternate_contact_phone: acPhone || null,
    });
    if (error) { console.error(error.message); setSaving(false); return; }
    await supabase.from('admin_event_log').insert({ level: 'INFO', category: 'configure', message: `Org created: "${name.trim()}" (${plan})` });
    onSaved(); onClose();
  };

  return (
    <Modal title="Add Organization" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={labelStyle}>Organization Name *</label><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Clean Kitchen Co." /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Type</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={type} onChange={e => setType(e.target.value)}>
              {['restaurant','healthcare','hospitality','institutional','k12_education','other'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Primary County</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={county} onChange={e => setCounty(e.target.value)}>
              <option value="">Select county...</option>
              {CA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Plan</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={plan} onChange={e => setPlan(e.target.value)}>
              <option value="founder">Founder ($99/mo)</option>
              <option value="standard">Standard ($199/mo)</option>
              <option value="enterprise">Enterprise (custom)</option>
            </select>
          </div>
          <div><label style={labelStyle}>Status</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="pending">Pending</option><option value="active">Active</option><option value="trial">Trial</option>
            </select>
          </div>
          <div><label style={labelStyle}>Main Phone</label><input style={inputStyle} value={mainPhone} onChange={e => setMainPhone(e.target.value)} placeholder="(555) 000-0000" type="tel" /></div>
          <div><label style={labelStyle}>Billing Email</label><input style={inputStyle} value={billingEmail} onChange={e => setBillingEmail(e.target.value)} placeholder="billing@company.com" type="email" /></div>
        </div>
        {/* Primary Contact */}
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginTop: 2 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Primary Contact</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input style={inputStyle} value={pcName} onChange={e => setPcName(e.target.value)} placeholder="Full name" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input style={inputStyle} value={pcEmail} onChange={e => setPcEmail(e.target.value)} placeholder="Email address" type="email" />
              <input style={inputStyle} value={pcPhone} onChange={e => setPcPhone(e.target.value)} placeholder="Phone number" type="tel" />
            </div>
          </div>
        </div>
        {/* Alternate Contact */}
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginTop: 2 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Alternate Contact</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input style={inputStyle} value={acName} onChange={e => setAcName(e.target.value)} placeholder="Full name" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input style={inputStyle} value={acEmail} onChange={e => setAcEmail(e.target.value)} placeholder="Email address" type="email" />
              <input style={inputStyle} value={acPhone} onChange={e => setAcPhone(e.target.value)} placeholder="Phone number" type="tel" />
            </div>
          </div>
        </div>
        <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." /></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 20px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', color: NAVY, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} style={{ padding: '8px 20px', background: saving || !name.trim() ? '#E5E7EB' : NAVY, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>{saving ? 'Saving...' : 'Create Organization'}</button>
        </div>
      </div>
    </Modal>
  );
}

function AddLocModal({ orgs, onClose, onSaved }: { orgs: Org[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<OrgOption | null>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [zip, setZip] = useState('');
  const [status, setStatus] = useState('pending');
  const [scName, setScName] = useState('');
  const [scEmail, setScEmail] = useState('');
  const [scPhone, setScPhone] = useState('');
  const [mgrName, setMgrName] = useState('');
  const [mgrPhone, setMgrPhone] = useState('');
  const [sitePhone, setSitePhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    let orgId = selectedOrg?.id || null;
    if (selectedOrg?.isNew) {
      const { data: newOrg, error: orgErr } = await supabase.from('organizations').insert({ name: selectedOrg.name, status: 'pending' }).select('id').single();
      if (orgErr) { console.error(orgErr.message); setSaving(false); return; }
      orgId = newOrg.id;
    }
    const { error } = await supabase.from('locations').insert({
      name: name.trim(), organization_id: orgId, address: address || null,
      city: city || null, state: 'CA', zip: zip || null, county: county || null, status,
      site_contact_name: scName || null, site_contact_email: scEmail || null, site_contact_phone: scPhone || null,
      site_phone: sitePhone || null, manager_name: mgrName || null, manager_phone: mgrPhone || null,
    });
    if (error) { console.error(error.message); setSaving(false); return; }
    await supabase.from('admin_event_log').insert({ level: 'INFO', category: 'configure', message: `Location created: "${name.trim()}" (${county || 'N/A'})` });
    onSaved(); onClose();
  };

  return (
    <Modal title="Add Location" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={labelStyle}>Location Name *</label><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Downtown Fresno" /></div>
        <OrgCombobox label="Organization" orgs={orgs} value={selectedOrg} onChange={setSelectedOrg} placeholder="Search or create org..." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Address</label><input style={inputStyle} value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" /></div>
          <div><label style={labelStyle}>City</label><input style={inputStyle} value={city} onChange={e => setCity(e.target.value)} placeholder="Fresno" /></div>
          <div><label style={labelStyle}>County</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={county} onChange={e => setCounty(e.target.value)}>
              <option value="">Select county...</option>
              {CA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>ZIP</label><input style={inputStyle} value={zip} onChange={e => setZip(e.target.value)} placeholder="93721" /></div>
          <div><label style={labelStyle}>Status</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="pending">Pending</option><option value="active">Active</option>
            </select>
          </div>
        </div>
        {/* Site Contact */}
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginTop: 2 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Site Contact</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input style={inputStyle} value={scName} onChange={e => setScName(e.target.value)} placeholder="Full name" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input style={inputStyle} value={scEmail} onChange={e => setScEmail(e.target.value)} placeholder="Email address" type="email" />
              <input style={inputStyle} value={scPhone} onChange={e => setScPhone(e.target.value)} placeholder="Phone number" type="tel" />
            </div>
          </div>
        </div>
        {/* Manager */}
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginTop: 2 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Manager</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input style={inputStyle} value={mgrName} onChange={e => setMgrName(e.target.value)} placeholder="Manager name" />
            <input style={inputStyle} value={mgrPhone} onChange={e => setMgrPhone(e.target.value)} placeholder="Manager phone" type="tel" />
          </div>
        </div>
        <div><label style={labelStyle}>Site Phone (main line)</label><input style={inputStyle} value={sitePhone} onChange={e => setSitePhone(e.target.value)} placeholder="(555) 000-0000" type="tel" /></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 20px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', color: NAVY, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} style={{ padding: '8px 20px', background: saving || !name.trim() ? '#E5E7EB' : NAVY, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>{saving ? 'Saving...' : 'Create Location'}</button>
        </div>
      </div>
    </Modal>
  );
}

function AddUserModal({ orgs, onClose, onSaved, userEmail }: { orgs: Org[]; onClose: () => void; onSaved: () => void; userEmail?: string }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('kitchen_staff');
  const [selectedOrg, setSelectedOrg] = useState<OrgOption | null>(null);
  const [saving, setSaving] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSaving(true);
    await supabase.from('admin_event_log').insert({ level: 'INFO', category: 'configure', message: `User invited: ${email} (${role})` });
    setSaving(false); onSaved(); onClose();
  };

  return (
    <Modal title="Invite User" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={labelStyle}>Email *</label><input style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" type="email" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Full Name</label><input style={inputStyle} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" /></div>
          <div><label style={labelStyle}>Phone Number</label><input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" type="tel" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Role</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={role} onChange={e => setRole(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <OrgCombobox label="Organization" orgs={orgs} value={selectedOrg} onChange={setSelectedOrg} placeholder="Search or create..." />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 20px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', color: NAVY, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleInvite} disabled={!email.trim() || saving} style={{ padding: '8px 20px', background: saving || !email.trim() ? '#E5E7EB' : NAVY, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>{saving ? 'Sending...' : 'Send Invitation'}</button>
        </div>
      </div>
    </Modal>
  );
}

function AddVendorModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [companyName, setCompanyName] = useState('');
  const [serviceType, setServiceType] = useState('Hood Cleaning');
  const [website, setWebsite] = useState('');
  const [mainPhone, setMainPhone] = useState('');
  const [counties, setCounties] = useState<string[]>([]);
  const [certs, setCerts] = useState<string[]>([]);
  const [isPartner, setIsPartner] = useState(false);
  const [status, setStatus] = useState('pending');
  const [pcName, setPcName] = useState('');
  const [pcEmail, setPcEmail] = useState('');
  const [pcPhone, setPcPhone] = useState('');
  const [acName, setAcName] = useState('');
  const [acEmail, setAcEmail] = useState('');
  const [acPhone, setAcPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleCounty = (c: string) => setCounties(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  const toggleCert = (c: string) => setCerts(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  const handleSave = async () => {
    if (!companyName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('vendors').insert({
      company_name: companyName.trim(), service_type: serviceType,
      website: website || null, main_phone: mainPhone || null,
      primary_contact_name: pcName || null, primary_contact_email: pcEmail || null, primary_contact_phone: pcPhone || null,
      alternate_contact_name: acName || null, alternate_contact_email: acEmail || null, alternate_contact_phone: acPhone || null,
      // Keep legacy fields populated for backward compat
      contact_name: pcName || null, email: pcEmail || null, phone: pcPhone || mainPhone || null,
      counties_served: counties.length > 0 ? counties : null,
      certifications: certs.length > 0 ? certs : null,
      is_partner: isPartner, status, notes: notes || null,
    });
    if (error) { console.error(error.message); setSaving(false); return; }
    await supabase.from('admin_event_log').insert({ level: 'INFO', category: 'configure', message: `Vendor created: "${companyName.trim()}" (${serviceType})` });
    onSaved(); onClose();
  };

  return (
    <Modal title="Add Vendor" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={labelStyle}>Company Name *</label><input style={inputStyle} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="ACE Hood Cleaning" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Service Type</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={serviceType} onChange={e => setServiceType(e.target.value)}>
              {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Status</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="pending">Pending</option><option value="active">Active</option>
            </select>
          </div>
          <div><label style={labelStyle}>Website</label><input style={inputStyle} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://vendor.com" /></div>
          <div><label style={labelStyle}>Main Phone</label><input style={inputStyle} value={mainPhone} onChange={e => setMainPhone(e.target.value)} placeholder="(555) 000-0000" type="tel" /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
            <input type="checkbox" checked={isPartner} onChange={e => setIsPartner(e.target.checked)} />
            <label style={{ fontSize: 12, color: NAVY, fontWeight: 600, cursor: 'pointer' }}>EvidLY Partner</label>
          </div>
        </div>
        {/* Primary Contact */}
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginTop: 2 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Primary Contact</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input style={inputStyle} value={pcName} onChange={e => setPcName(e.target.value)} placeholder="Full name" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input style={inputStyle} value={pcEmail} onChange={e => setPcEmail(e.target.value)} placeholder="Email address" type="email" />
              <input style={inputStyle} value={pcPhone} onChange={e => setPcPhone(e.target.value)} placeholder="Phone number" type="tel" />
            </div>
          </div>
        </div>
        {/* Alternate Contact */}
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginTop: 2 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Alternate Contact</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input style={inputStyle} value={acName} onChange={e => setAcName(e.target.value)} placeholder="Full name" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input style={inputStyle} value={acEmail} onChange={e => setAcEmail(e.target.value)} placeholder="Email address" type="email" />
              <input style={inputStyle} value={acPhone} onChange={e => setAcPhone(e.target.value)} placeholder="Phone number" type="tel" />
            </div>
          </div>
        </div>

        <div><label style={labelStyle}>Counties Served</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 100, overflowY: 'auto', padding: 8, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
            {['Fresno','Los Angeles','Merced','Sacramento','San Diego','San Francisco','Stanislaus'].map(c => (
              <button key={c} type="button" onClick={() => toggleCounty(c)} style={{
                padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                border: counties.includes(c) ? '1px solid #A08C5A' : '1px solid #E5E0D8',
                background: counties.includes(c) ? '#FAF7F2' : '#fff',
                color: counties.includes(c) ? '#A08C5A' : TEXT_MUTED,
              }}>{c}</button>
            ))}
          </div>
        </div>

        <div><label style={labelStyle}>Certifications</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CERTIFICATIONS.map(c => (
              <button key={c} type="button" onClick={() => toggleCert(c)} style={{
                padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                border: certs.includes(c) ? '1px solid #059669' : '1px solid #E5E0D8',
                background: certs.includes(c) ? '#F0FFF4' : '#fff',
                color: certs.includes(c) ? '#059669' : TEXT_MUTED,
              }}>{c}</button>
            ))}
          </div>
        </div>

        <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." /></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 20px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', color: NAVY, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={!companyName.trim() || saving} style={{ padding: '8px 20px', background: saving || !companyName.trim() ? '#E5E7EB' : NAVY, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>{saving ? 'Saving...' : 'Create Vendor'}</button>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════ DETAIL DRAWERS ══════════════

const drawerOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 40 };
const drawerPanel: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, bottom: 0, width: 580, maxWidth: '100vw',
  background: '#FFFFFF', zIndex: 50, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
const drawerHeader: React.CSSProperties = { padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 };
const drawerBody: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '20px 24px' };
const drawerFooter: React.CSSProperties = { padding: '14px 24px', borderTop: `1px solid ${BORDER}`, flexShrink: 0, display: 'flex', gap: 10 };

function DrawerTabBar({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, padding: '0 24px', flexShrink: 0, overflowX: 'auto' }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          padding: '10px 14px', fontSize: 13, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
          borderBottom: active === t ? `2px solid ${NAVY}` : '2px solid transparent', marginBottom: -1,
          color: active === t ? NAVY : TEXT_MUTED, whiteSpace: 'nowrap',
        }}>{t}</button>
      ))}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: 12, color: TEXT_SEC, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: NAVY, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value || '\u2014'}</span>
    </div>
  );
}

function FooterBtn({ label, color, bg, border, onClick }: { label: string; color: string; bg: string; border?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: 8, border: border || 'none', background: bg,
      color, fontSize: 12, fontWeight: 700, cursor: 'pointer',
    }}>{label}</button>
  );
}

// ── Organization Drawer ──

function OrgDrawer({ org, onClose, onRefresh }: { org: Org; onClose: () => void; onRefresh: () => void }) {
  const [tab, setTab] = useState('Overview');
  const [locs, setLocs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [orgVendors, setOrgVendors] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [relLoading, setRelLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setRelLoading(true);
      const [locRes, userRes, ticketRes, vendorRes, eventRes] = await Promise.all([
        supabase.from('locations').select('id, name, county, address, city, status').eq('organization_id', org.id).order('name'),
        supabase.from('user_profiles').select('user_id, full_name, email, role, last_sign_in_at').eq('organization_id', org.id).order('full_name'),
        supabase.from('support_tickets').select('id, ticket_number, subject, priority, status, created_at').eq('org_id', org.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('vendors').select('id, company_name, service_type, status, is_partner').order('company_name'),
        supabase.from('admin_event_log').select('id, event_time, level, message').ilike('message', `%${org.name}%`).order('event_time', { ascending: false }).limit(30),
      ]);
      if (locRes.data) setLocs(locRes.data);
      if (userRes.data) setUsers(userRes.data);
      if (ticketRes.data) setTickets(ticketRes.data);
      if (vendorRes.data) setOrgVendors(vendorRes.data);
      if (eventRes.data) setEvents(eventRes.data);
      setRelLoading(false);
    })();
  }, [org.id, org.name]);

  return (
    <>
      <div style={drawerOverlay} onClick={onClose} />
      <div style={drawerPanel}>
        <div style={drawerHeader}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>{org.name}</h2>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <span style={statusBadge(org.status)}>{org.status}</span>
                {org.plan && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#EFF6FF', color: '#2563EB' }}>{org.plan}</span>}
                {org.industry_type && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#F3F4F6', color: TEXT_SEC }}>{org.industry_type.replace(/_/g, ' ')}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: TEXT_MUTED, cursor: 'pointer' }}>{'\u00D7'}</button>
          </div>
        </div>
        <DrawerTabBar tabs={['Overview', 'Locations', 'Users', 'Vendors', 'Tickets', 'Activity']} active={tab} onChange={setTab} />
        <div style={drawerBody}>
          {tab === 'Overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>{locs.length}</div>
                  <div style={{ fontSize: 11, color: TEXT_SEC }}>Locations</div>
                </div>
                <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>{users.length}</div>
                  <div style={{ fontSize: 11, color: TEXT_SEC }}>Users</div>
                </div>
                <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>{tickets.filter(t => t.status === 'open').length}</div>
                  <div style={{ fontSize: 11, color: TEXT_SEC }}>Open Tickets</div>
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Primary Contact</h4>
                <DetailRow label="Name" value={org.primary_contact_name} />
                <DetailRow label="Email" value={org.primary_contact_email} />
                <DetailRow label="Phone" value={org.primary_contact_phone} />
              </div>
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Alternate Contact</h4>
                <DetailRow label="Name" value={org.alternate_contact_name} />
                <DetailRow label="Email" value={org.alternate_contact_email} />
                <DetailRow label="Phone" value={org.alternate_contact_phone} />
              </div>
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Details</h4>
                <DetailRow label="Main Phone" value={org.main_phone} />
                <DetailRow label="Billing Email" value={org.billing_email} />
                <DetailRow label="Created" value={new Date(org.created_at).toLocaleDateString()} />
              </div>
            </div>
          )}
          {tab === 'Locations' && (
            relLoading ? <Skeleton h={100} /> : locs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>No locations found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {locs.map(l => (
                  <div key={l.id} style={{ background: '#F9FAFB', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, color: NAVY, fontSize: 13 }}>{l.name}</div>
                    <div style={{ fontSize: 12, color: TEXT_SEC }}>{[l.address, l.city, l.county].filter(Boolean).join(', ') || 'No address'}</div>
                    <span style={{ ...statusBadge(l.status), marginTop: 4, display: 'inline-block' }}>{l.status}</span>
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'Users' && (
            relLoading ? <Skeleton h={100} /> : users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>No users found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {users.map((u: any) => (
                  <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F9FAFB', borderRadius: 6, border: `1px solid ${BORDER}` }}>
                    <div>
                      <div style={{ fontWeight: 600, color: NAVY, fontSize: 13 }}>{u.full_name || u.email}</div>
                      <div style={{ fontSize: 11, color: TEXT_SEC }}>{u.email}</div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#F3F4F6', color: TEXT_SEC }}>{u.role?.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'Vendors' && (
            relLoading ? <Skeleton h={100} /> : orgVendors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>No vendors found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {orgVendors.map((v: any) => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F9FAFB', borderRadius: 6, border: `1px solid ${BORDER}` }}>
                    <div>
                      <div style={{ fontWeight: 600, color: NAVY, fontSize: 13 }}>{v.company_name}</div>
                      <div style={{ fontSize: 11, color: TEXT_SEC }}>{v.service_type || 'No service type'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {v.is_partner && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#F0FFF4', color: '#059669' }}>Partner</span>}
                      <span style={statusBadge(v.status)}>{v.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'Tickets' && (
            relLoading ? <Skeleton h={100} /> : tickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>No tickets found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tickets.map((t: any) => {
                  const sc = { open: { bg: '#EFF6FF', text: '#2563EB' }, in_progress: { bg: '#FFFBEB', text: '#D97706' }, resolved: { bg: '#F0FFF4', text: '#059669' }, closed: { bg: '#F3F4F6', text: '#6B7280' } }[t.status as string] || { bg: '#F3F4F6', text: '#6B7280' };
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F9FAFB', borderRadius: 6, border: `1px solid ${BORDER}` }}>
                      <div>
                        <div style={{ fontWeight: 600, color: NAVY, fontSize: 13 }}>{t.subject}</div>
                        <div style={{ fontSize: 11, color: TEXT_SEC }}>{t.ticket_number} &middot; {new Date(t.created_at).toLocaleDateString()}</div>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.text }}>{t.status}</span>
                    </div>
                  );
                })}
              </div>
            )
          )}
          {tab === 'Activity' && (
            relLoading ? <Skeleton h={100} /> : events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>No activity recorded.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {events.map((ev: any) => (
                  <div key={ev.id} style={{ padding: '6px 0', borderBottom: '1px solid #F3F4F6', fontSize: 12 }}>
                    <span style={{ color: TEXT_SEC }}>{new Date(ev.event_time).toLocaleString()}</span>
                    <span style={{ marginLeft: 8, color: NAVY }}>{ev.message}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        <div style={drawerFooter}>
          <FooterBtn label="Edit Organization" color="#fff" bg={NAVY} onClick={() => alert(`Edit "${org.name}" requires direct database access. Use Supabase Dashboard → Table Editor → organizations.`)} />
          <FooterBtn label="View Billing" color={NAVY} bg="#F9FAFB" border={`1px solid ${BORDER}`} onClick={() => { onClose(); window.location.assign('/admin/billing'); }} />
        </div>
      </div>
    </>
  );
}

// ── Location Drawer ──

function LocDrawer({ loc, onClose, onRefresh }: { loc: Location; onClose: () => void; onRefresh: () => void }) {
  const [tab, setTab] = useState('Overview');
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [jurisdiction, setJurisdiction] = useState<any>(null);
  const [relLoading, setRelLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setRelLoading(true);
      const queries: Promise<any>[] = [
        supabase.from('admin_event_log').select('id, event_time, level, message')
          .ilike('message', `%${loc.name}%`).order('event_time', { ascending: false }).limit(30),
      ];
      if (loc.organization_id) {
        queries.push(
          supabase.from('user_profiles').select('user_id, full_name, email, role, last_sign_in_at')
            .eq('organization_id', loc.organization_id).order('full_name'),
          supabase.from('support_tickets').select('id, ticket_number, subject, priority, status, created_at')
            .eq('org_id', loc.organization_id).order('created_at', { ascending: false }).limit(20),
        );
      }
      if (loc.county) {
        queries.push(
          supabase.from('jurisdictions').select('name, county, scoring_method, grading_method, inspection_frequency, fire_ahj_name, fire_ahj_type')
            .eq('county', loc.county).maybeSingle(),
        );
      }
      const results = await Promise.all(queries);
      if (results[0]?.data) setEvents(results[0].data);
      if (loc.organization_id) {
        if (results[1]?.data) setUsers(results[1].data);
        if (results[2]?.data) setTickets(results[2].data);
        if (loc.county && results[3]?.data) setJurisdiction(results[3].data);
      } else if (loc.county && results[1]?.data) {
        setJurisdiction(results[1].data);
      }
      setRelLoading(false);
    })();
  }, [loc.name, loc.organization_id, loc.county]);

  return (
    <>
      <div style={drawerOverlay} onClick={onClose} />
      <div style={drawerPanel}>
        <div style={drawerHeader}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>{loc.name}</h2>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <span style={statusBadge(loc.status)}>{loc.status}</span>
                {loc.county && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#F3F4F6', color: TEXT_SEC }}>{loc.county} County</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: TEXT_MUTED, cursor: 'pointer' }}>{'\u00D7'}</button>
          </div>
        </div>
        <DrawerTabBar tabs={['Overview', 'Compliance', 'Users', 'Tickets', 'Activity']} active={tab} onChange={setTab} />
        <div style={drawerBody}>
          {tab === 'Overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>{users.length}</div>
                  <div style={{ fontSize: 11, color: TEXT_SEC }}>Users</div>
                </div>
                <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>{tickets.filter(t => t.status === 'open').length}</div>
                  <div style={{ fontSize: 11, color: TEXT_SEC }}>Open Tickets</div>
                </div>
                <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: jurisdiction ? '#059669' : TEXT_MUTED }}>{jurisdiction ? '✓' : '—'}</div>
                  <div style={{ fontSize: 11, color: TEXT_SEC }}>Jurisdiction</div>
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Address</h4>
                <DetailRow label="Street" value={loc.address} />
                <DetailRow label="City" value={loc.city} />
                <DetailRow label="County" value={loc.county} />
              </div>
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Organization</h4>
                <DetailRow label="Org Name" value={loc.organizations?.name} />
              </div>
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Site Contact</h4>
                <DetailRow label="Name" value={loc.site_contact_name} />
                <DetailRow label="Email" value={loc.site_contact_email} />
                <DetailRow label="Phone" value={loc.site_contact_phone} />
              </div>
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Manager</h4>
                <DetailRow label="Name" value={loc.manager_name} />
                <DetailRow label="Phone" value={loc.manager_phone} />
              </div>
              <DetailRow label="Site Phone" value={loc.site_phone} />
              <DetailRow label="Created" value={new Date(loc.created_at).toLocaleDateString()} />
            </div>
          )}
          {tab === 'Compliance' && (
            relLoading ? <Skeleton h={100} /> : !jurisdiction ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>
                {loc.county ? `No jurisdiction config found for ${loc.county} County.` : 'No county assigned to this location.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Food Safety Jurisdiction</h4>
                  <DetailRow label="Authority" value={jurisdiction.name} />
                  <DetailRow label="County" value={jurisdiction.county} />
                  <DetailRow label="Scoring Method" value={jurisdiction.scoring_method?.replace(/_/g, ' ')} />
                  <DetailRow label="Grading Method" value={jurisdiction.grading_method?.replace(/_/g, ' ')} />
                  <DetailRow label="Inspection Frequency" value={jurisdiction.inspection_frequency} />
                </div>
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Fire Safety AHJ</h4>
                  <DetailRow label="Fire AHJ" value={jurisdiction.fire_ahj_name} />
                  <DetailRow label="AHJ Type" value={jurisdiction.fire_ahj_type?.replace(/_/g, ' ')} />
                </div>
              </div>
            )
          )}
          {tab === 'Users' && (
            relLoading ? <Skeleton h={100} /> : users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>No users found for this organization.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {users.map((u: any) => (
                  <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F9FAFB', borderRadius: 6, border: `1px solid ${BORDER}` }}>
                    <div>
                      <div style={{ fontWeight: 600, color: NAVY, fontSize: 13 }}>{u.full_name || u.email}</div>
                      <div style={{ fontSize: 11, color: TEXT_SEC }}>{u.email}</div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#F3F4F6', color: TEXT_SEC }}>{u.role?.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'Tickets' && (
            relLoading ? <Skeleton h={100} /> : tickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>No tickets found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tickets.map((t: any) => {
                  const sc = { open: { bg: '#EFF6FF', text: '#2563EB' }, in_progress: { bg: '#FFFBEB', text: '#D97706' }, resolved: { bg: '#F0FFF4', text: '#059669' }, closed: { bg: '#F3F4F6', text: '#6B7280' } }[t.status as string] || { bg: '#F3F4F6', text: '#6B7280' };
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F9FAFB', borderRadius: 6, border: `1px solid ${BORDER}` }}>
                      <div>
                        <div style={{ fontWeight: 600, color: NAVY, fontSize: 13 }}>{t.subject}</div>
                        <div style={{ fontSize: 11, color: TEXT_SEC }}>{t.ticket_number} &middot; {new Date(t.created_at).toLocaleDateString()}</div>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.text }}>{t.status}</span>
                    </div>
                  );
                })}
              </div>
            )
          )}
          {tab === 'Activity' && (
            events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>No activity recorded.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {events.map((ev: any) => (
                  <div key={ev.id} style={{ padding: '6px 0', borderBottom: '1px solid #F3F4F6', fontSize: 12 }}>
                    <span style={{ color: TEXT_SEC }}>{new Date(ev.event_time).toLocaleString()}</span>
                    <span style={{ marginLeft: 8, color: NAVY }}>{ev.message}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        <div style={drawerFooter}>
          <FooterBtn label="Edit Location" color="#fff" bg={NAVY} onClick={() => alert(`Edit "${loc.name}" requires direct database access. Use Supabase Dashboard → Table Editor → locations.`)} />
          <FooterBtn label="View Organization" color={NAVY} bg="#F9FAFB" border={`1px solid ${BORDER}`} onClick={() => alert('Navigate to Configure → Organizations tab to view organization details.')} />
        </div>
      </div>
    </>
  );
}

// ── User Drawer ──

function UserDrawer({ user, orgs, onClose, onRefresh }: { user: UserProfile; orgs: Org[]; onClose: () => void; onRefresh: () => void }) {
  const [tab, setTab] = useState('Profile');
  const [events, setEvents] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  const org = orgs.find(o => o.id === user.organization_id);

  useEffect(() => {
    (async () => {
      const [eventRes, ticketRes] = await Promise.all([
        supabase.from('admin_event_log').select('id, event_time, level, message').ilike('message', `%${user.email}%`).order('event_time', { ascending: false }).limit(30),
        supabase.from('support_tickets').select('id, ticket_number, subject, priority, status, created_at').eq('contact_email', user.email).order('created_at', { ascending: false }).limit(20),
      ]);
      if (eventRes.data) setEvents(eventRes.data);
      if (ticketRes.data) setTickets(ticketRes.data);
    })();
  }, [user.email]);

  return (
    <>
      <div style={drawerOverlay} onClick={onClose} />
      <div style={drawerPanel}>
        <div style={drawerHeader}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>{user.full_name || user.email}</h2>
              <div style={{ fontSize: 13, color: TEXT_SEC, marginTop: 2 }}>{user.email}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#EFF6FF', color: '#2563EB' }}>{user.role.replace(/_/g, ' ')}</span>
                {org && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#F3F4F6', color: TEXT_SEC }}>{org.name}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: TEXT_MUTED, cursor: 'pointer' }}>{'\u00D7'}</button>
          </div>
        </div>
        <DrawerTabBar tabs={['Profile', 'Tickets', 'Activity']} active={tab} onChange={setTab} />
        <div style={drawerBody}>
          {tab === 'Profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <DetailRow label="Full Name" value={user.full_name} />
              <DetailRow label="Email" value={user.email} />
              <DetailRow label="Phone" value={user.phone} />
              <DetailRow label="Role" value={user.role.replace(/_/g, ' ')} />
              <DetailRow label="Organization" value={org?.name} />
              <DetailRow label="Last Login" value={user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'} />
              <DetailRow label="Created" value={new Date(user.created_at).toLocaleDateString()} />
            </div>
          )}
          {tab === 'Tickets' && (
            tickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>No tickets found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tickets.map((t: any) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F9FAFB', borderRadius: 6, border: `1px solid ${BORDER}` }}>
                    <div>
                      <div style={{ fontWeight: 600, color: NAVY, fontSize: 13 }}>{t.subject}</div>
                      <div style={{ fontSize: 11, color: TEXT_SEC }}>{t.ticket_number}</div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#F3F4F6', color: TEXT_SEC }}>{t.status}</span>
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'Activity' && (
            events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>No activity recorded.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {events.map((ev: any) => (
                  <div key={ev.id} style={{ padding: '6px 0', borderBottom: '1px solid #F3F4F6', fontSize: 12 }}>
                    <span style={{ color: TEXT_SEC }}>{new Date(ev.event_time).toLocaleString()}</span>
                    <span style={{ marginLeft: 8, color: NAVY }}>{ev.message}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        <div style={drawerFooter}>
          <FooterBtn label="Edit User" color="#fff" bg={NAVY} onClick={() => alert('Edit User profile requires admin edge function. Use Supabase Dashboard to modify user records.')} />
          <FooterBtn label="Emulate" color={NAVY} bg="#FAF7F2" border={`1px solid ${BORDER}`} onClick={() => { onClose(); window.location.assign('/admin/emulate'); }} />
          <FooterBtn label="Reset Password" color={TEXT_SEC} bg="#F9FAFB" border={`1px solid ${BORDER}`} onClick={async () => { if (user.email && confirm(`Send password reset email to ${user.email}?`)) { const { error } = await supabase.auth.resetPasswordForEmail(user.email); alert(error ? `Error: ${error.message}` : `Password reset email sent to ${user.email}.`); } }} />
        </div>
      </div>
    </>
  );
}

// ── Vendor Drawer ──

function VendorDrawer({ vendor, onClose, onRefresh }: { vendor: Vendor; onClose: () => void; onRefresh: () => void }) {
  const [tab, setTab] = useState('Profile');
  const [events, setEvents] = useState<any[]>([]);
  const [servedLocations, setServedLocations] = useState<any[]>([]);
  const [relLoading, setRelLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setRelLoading(true);
      const [eventRes, locRes] = await Promise.all([
        supabase.from('admin_event_log').select('id, event_time, level, message')
          .ilike('message', `%${vendor.company_name}%`).order('event_time', { ascending: false }).limit(30),
        supabase.from('locations').select('id, name, county, city, status, organizations(name)').order('name'),
      ]);
      if (eventRes.data) setEvents(eventRes.data);
      if (locRes.data) setServedLocations(locRes.data);
      setRelLoading(false);
    })();
  }, [vendor.company_name]);

  return (
    <>
      <div style={drawerOverlay} onClick={onClose} />
      <div style={drawerPanel}>
        <div style={drawerHeader}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>{vendor.company_name}</h2>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <span style={statusBadge(vendor.status)}>{vendor.status}</span>
                {vendor.service_type && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#F3F4F6', color: TEXT_SEC }}>{vendor.service_type}</span>}
                {vendor.is_partner && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#F0FFF4', color: '#059669' }}>Partner</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: TEXT_MUTED, cursor: 'pointer' }}>{'\u00D7'}</button>
          </div>
        </div>
        <DrawerTabBar tabs={['Profile', 'Locations Served', 'Activity']} active={tab} onChange={setTab} />
        <div style={drawerBody}>
          {tab === 'Profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Company Info</h4>
                <DetailRow label="Website" value={vendor.website} />
                <DetailRow label="Main Phone" value={vendor.main_phone || vendor.phone} />
                <DetailRow label="Service Type" value={vendor.service_type} />
              </div>
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Primary Contact</h4>
                <DetailRow label="Name" value={vendor.primary_contact_name || vendor.contact_name} />
                <DetailRow label="Email" value={vendor.primary_contact_email || vendor.email} />
                <DetailRow label="Phone" value={vendor.primary_contact_phone} />
              </div>
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Alternate Contact</h4>
                <DetailRow label="Name" value={vendor.alternate_contact_name} />
                <DetailRow label="Email" value={vendor.alternate_contact_email} />
                <DetailRow label="Phone" value={vendor.alternate_contact_phone} />
              </div>
              <DetailRow label="Created" value={new Date(vendor.created_at).toLocaleDateString()} />
            </div>
          )}
          {tab === 'Locations Served' && (
            relLoading ? <Skeleton h={100} /> : servedLocations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>No locations in the system yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {servedLocations.map((l: any) => (
                  <div key={l.id} style={{ background: '#F9FAFB', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: NAVY, fontSize: 13 }}>{l.name}</div>
                        <div style={{ fontSize: 11, color: TEXT_SEC }}>{[l.city, l.county].filter(Boolean).join(', ') || 'No address'} &middot; {(l.organizations as any)?.name || ''}</div>
                      </div>
                      <span style={statusBadge(l.status)}>{l.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'Activity' && (
            events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, fontSize: 13 }}>No activity recorded.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {events.map((ev: any) => (
                  <div key={ev.id} style={{ padding: '6px 0', borderBottom: '1px solid #F3F4F6', fontSize: 12 }}>
                    <span style={{ color: TEXT_SEC }}>{new Date(ev.event_time).toLocaleString()}</span>
                    <span style={{ marginLeft: 8, color: NAVY }}>{ev.message}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        <div style={drawerFooter}>
          <FooterBtn label="Edit Vendor" color="#fff" bg={NAVY} onClick={() => alert(`Edit "${vendor.company_name}" requires direct database access. Use Supabase Dashboard → Table Editor → vendors.`)} />
          <FooterBtn label="Send Portal Invite" color={NAVY} bg="#FAF7F2" border={`1px solid ${BORDER}`} onClick={() => alert(`Portal invite for ${vendor.company_name} requires the vendor portal invitation edge function.`)} />
          <FooterBtn label="Deactivate" color="#DC2626" bg="#FEF2F2" border="1px solid #FECACA" onClick={() => alert(`Deactivate "${vendor.company_name}" requires admin edge function. Use Supabase Dashboard to update vendor status.`)} />
        </div>
      </div>
    </>
  );
}
