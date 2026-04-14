/**
 * Configure — Organizations, Locations, Users, Vendors management
 * Route: /admin/configure
 * All 4 tabs have ADD capability with modals saving to Supabase.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import OrgCombobox, { type OrgOption } from '../../components/admin/OrgCombobox';
import { useAuth } from '../../contexts/AuthContext';

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
  <div className="w-full rounded-md animate-pulse bg-[#E5E7EB]" style={{ height: h }} />
);

const statusBadgeClass = (status: string) => {
  const base = 'px-2 py-[2px] rounded text-[10px] font-bold';
  if (status === 'active') return `${base} bg-[#F0FFF4] text-[#059669]`;
  if (status === 'pending') return `${base} bg-[#FFFBEB] text-[#D97706]`;
  return `${base} bg-[#FEF2F2] text-[#DC2626]`;
};

const inputCls = 'w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-[13px] text-navy bg-white outline-none';

const labelCls = 'text-[11px] text-[#6B7F96] block mb-1';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-[14px] p-7 w-[95vw] max-w-[560px] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-bold text-navy">{title}</h3>
          <button onClick={onClose} className="bg-transparent border-none text-xl text-[#9CA3AF] cursor-pointer">{'×'}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Configure() {
  useDemoGuard();
  const { isDemoMode } = useDemo();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Configure</h1>
          <p className="text-[13px] text-[#6B7F96] mt-1">Manage organizations, locations, users, and vendors.</p>
        </div>
        <button onClick={openModal} className="px-5 py-2 bg-navy text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer">{addButtonLabel}</button>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-[2px] bg-[#F3F4F6] rounded-lg p-[3px]">
          {(['organizations', 'locations', 'users', 'vendors'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(''); }}
              className={`px-[18px] py-2 rounded-md border-none text-[13px] font-semibold cursor-pointer ${
                tab === t ? 'bg-white text-navy shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'bg-transparent text-[#9CA3AF]'
              }`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className={`${inputCls} !w-[220px]`} />
      </div>

      <div className="bg-white rounded-xl border border-[#E2D9C8] overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-3">
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
    <div className="text-center py-[60px] px-5 bg-[#FAF7F2] border-2 border-dashed border-[#E2D9C8] rounded-xl m-4">
      <div className="text-[40px] mb-4">{icon}</div>
      <div className="text-base font-bold text-navy mb-2">{title}</div>
      <div className="text-[13px] text-[#6B7F96] max-w-[400px] mx-auto mb-4">{subtitle}</div>
      <button onClick={onAction} className="px-5 py-2 bg-navy text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer">{actionLabel}</button>
    </div>
  );
}

const TH = ({ children }: { children: string }) => (
  <th className="text-left px-[14px] py-[10px] text-[#6B7F96] font-semibold text-[11px] uppercase">{children}</th>
);
const TD = ({ children, fw, fs }: { children: React.ReactNode; fw?: boolean; fs?: number }) => (
  <td className={`px-[14px] py-[10px] ${fw ? 'text-navy font-semibold' : 'text-[#6B7F96] font-normal'}`} style={fs ? { fontSize: fs } : { fontSize: 13 }}>{children}</td>
);

function OrgsTable({ orgs, search, onAdd, onSelect }: { orgs: Org[]; search: string; onAdd: () => void; onSelect: (o: Org) => void }) {
  const q = search.toLowerCase();
  const filtered = orgs.filter(o => !q || o.name.toLowerCase().includes(q));
  if (filtered.length === 0) return <EmptyAction icon="🏢" title="No organizations yet" subtitle="Add your first organization to get started." actionLabel="+ Add Organization" onAction={onAdd} />;
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead><tr className="border-b border-[#E2D9C8]"><TH>Name</TH><TH>Primary Contact</TH><TH>Phone</TH><TH>Plan</TH><TH>Locations</TH><TH>Status</TH></tr></thead>
      <tbody>{filtered.map(o => (
        <tr key={o.id} onClick={() => onSelect(o)} className="border-b border-[#E2D9C8] cursor-pointer hover:bg-[#F9FAFB]">
          <TD fw>{o.name}</TD>
          <td className="px-[14px] py-[10px]">
            <div className="text-[13px] text-navy">{o.primary_contact_name || '—'}</div>
            {o.primary_contact_email && <div className="text-[11px] text-[#6B7F96]">{o.primary_contact_email}</div>}
          </td>
          <TD fs={12}>{o.primary_contact_phone || o.main_phone || '—'}</TD>
          <TD>{o.plan || '—'}</TD><TD>{o.locations?.[0]?.count ?? 0}</TD>
          <td className="px-[14px] py-[10px]"><span className={statusBadgeClass(o.status)}>{o.status}</span></td>
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
    <table className="w-full border-collapse text-[13px]">
      <thead><tr className="border-b border-[#E2D9C8]"><TH>Name</TH><TH>Organization</TH><TH>Site Contact</TH><TH>Phone</TH><TH>County</TH><TH>Status</TH></tr></thead>
      <tbody>{filtered.map(l => (
        <tr key={l.id} onClick={() => onSelect(l)} className="border-b border-[#E2D9C8] cursor-pointer hover:bg-[#F9FAFB]">
          <TD fw>{l.name}</TD><TD>{l.organizations?.name || '—'}</TD>
          <TD fs={12}>{l.site_contact_name || l.manager_name || '—'}</TD>
          <TD fs={12}>{l.site_contact_phone || l.site_phone || l.manager_phone || '—'}</TD>
          <TD>{l.county || '—'}</TD>
          <td className="px-[14px] py-[10px]"><span className={statusBadgeClass(l.status)}>{l.status}</span></td>
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
    <table className="w-full border-collapse text-[13px]">
      <thead><tr className="border-b border-[#E2D9C8]"><TH>Name</TH><TH>Email</TH><TH>Role</TH><TH>Organization</TH><TH>Last Login</TH><TH>Created</TH></tr></thead>
      <tbody>{filtered.map(u => {
        const org = orgs.find(o => o.id === u.organization_id);
        return (
          <tr key={u.user_id} onClick={() => onSelect(u)} className="border-b border-[#E2D9C8] cursor-pointer hover:bg-[#F9FAFB]">
            <TD fw>{u.full_name || '—'}</TD><TD fs={12}>{u.email || '—'}</TD><TD>{u.role}</TD>
            <TD fs={12}>{org?.name || '—'}</TD>
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
  if (filtered.length === 0) return <EmptyAction icon="🔧" title="No vendors yet" subtitle="Add vendors to EvidLY below." actionLabel="+ Add Vendor" onAction={onAdd} />;
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead><tr className="border-b border-[#E2D9C8]"><TH>Company</TH><TH>Service</TH><TH>Primary Contact</TH><TH>Phone</TH><TH>Partner</TH><TH>Status</TH></tr></thead>
      <tbody>{filtered.map(v => (
        <tr key={v.id} onClick={() => onSelect(v)} className="border-b border-[#E2D9C8] cursor-pointer hover:bg-[#F9FAFB]">
          <TD fw>{v.company_name}</TD><TD>{v.service_type || '—'}</TD>
          <td className="px-[14px] py-[10px]">
            <div className="text-[13px] text-navy">{v.primary_contact_name || v.contact_name || '—'}</div>
            {(v.primary_contact_email || v.email) && <div className="text-[11px] text-[#6B7F96]">{v.primary_contact_email || v.email}</div>}
          </td>
          <TD fs={12}>{v.primary_contact_phone || v.phone || v.main_phone || '—'}</TD>
          <td className="px-[14px] py-[10px]">{v.is_partner ? <span className="text-[10px] font-bold text-[#059669] bg-[#F0FFF4] px-2 py-[2px] rounded">Partner</span> : '—'}</td>
          <td className="px-[14px] py-[10px]"><span className={statusBadgeClass(v.status)}>{v.status}</span></td>
        </tr>
      ))}</tbody>
    </table>
  );
}

// ══════════════ ADD MODALS ══════════════

function AddOrgModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { isDemoMode } = useDemo();
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
    if (isDemoMode) return;
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
      <div className="flex flex-col gap-[14px]">
        <div><label className={labelCls}>Organization Name *</label><input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Clean Kitchen Co." /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Type</label>
            <select className={`${inputCls} cursor-pointer`} value={type} onChange={e => setType(e.target.value)}>
              {['restaurant','healthcare','hospitality','institutional','k12_education','other'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Primary County</label>
            <select className={`${inputCls} cursor-pointer`} value={county} onChange={e => setCounty(e.target.value)}>
              <option value="">Select county...</option>
              {CA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Plan</label>
            <select className={`${inputCls} cursor-pointer`} value={plan} onChange={e => setPlan(e.target.value)}>
              <option value="founder">Founder ($99/mo)</option>
              <option value="standard">Standard ($199/mo)</option>
              <option value="enterprise">Enterprise (custom)</option>
            </select>
          </div>
          <div><label className={labelCls}>Status</label>
            <select className={`${inputCls} cursor-pointer`} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="pending">Pending</option><option value="active">Active</option><option value="trial">Trial</option>
            </select>
          </div>
          <div><label className={labelCls}>Main Phone</label><input className={inputCls} value={mainPhone} onChange={e => setMainPhone(e.target.value)} placeholder="(555) 000-0000" type="tel" /></div>
          <div><label className={labelCls}>Billing Email</label><input className={inputCls} value={billingEmail} onChange={e => setBillingEmail(e.target.value)} placeholder="billing@company.com" type="email" /></div>
        </div>
        {/* Primary Contact */}
        <div className="border-t border-[#E5E7EB] pt-[14px] mt-[2px]">
          <p className="text-xs font-bold text-navy mb-[10px]">Primary Contact</p>
          <div className="flex flex-col gap-[10px]">
            <input className={inputCls} value={pcName} onChange={e => setPcName(e.target.value)} placeholder="Full name" />
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} value={pcEmail} onChange={e => setPcEmail(e.target.value)} placeholder="Email address" type="email" />
              <input className={inputCls} value={pcPhone} onChange={e => setPcPhone(e.target.value)} placeholder="Phone number" type="tel" />
            </div>
          </div>
        </div>
        {/* Alternate Contact */}
        <div className="border-t border-[#E5E7EB] pt-[14px] mt-[2px]">
          <p className="text-xs font-bold text-navy mb-[10px]">Alternate Contact</p>
          <div className="flex flex-col gap-[10px]">
            <input className={inputCls} value={acName} onChange={e => setAcName(e.target.value)} placeholder="Full name" />
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} value={acEmail} onChange={e => setAcEmail(e.target.value)} placeholder="Email address" type="email" />
              <input className={inputCls} value={acPhone} onChange={e => setAcPhone(e.target.value)} placeholder="Phone number" type="tel" />
            </div>
          </div>
        </div>
        <div><label className={labelCls}>Notes</label><textarea className={`${inputCls} resize-y`} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." /></div>
        <div className="flex gap-[10px] justify-end mt-2">
          <button onClick={onClose} className="px-5 py-2 border border-[#E2D9C8] rounded-lg bg-white text-navy text-[13px] font-semibold cursor-pointer">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} className={`px-5 py-2 border-none rounded-lg text-white text-[13px] font-semibold ${saving || !name.trim() ? 'bg-[#E5E7EB] cursor-default' : 'bg-navy cursor-pointer'}`}>{saving ? 'Saving...' : 'Create Organization'}</button>
        </div>
      </div>
    </Modal>
  );
}

function AddLocModal({ orgs, onClose, onSaved }: { orgs: Org[]; onClose: () => void; onSaved: () => void }) {
  const { isDemoMode } = useDemo();
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
    if (isDemoMode) return;
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
      <div className="flex flex-col gap-[14px]">
        <div><label className={labelCls}>Location Name *</label><input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Downtown Fresno" /></div>
        <OrgCombobox label="Organization" orgs={orgs} value={selectedOrg} onChange={setSelectedOrg} placeholder="Search or create org..." />
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Address</label><input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" /></div>
          <div><label className={labelCls}>City</label><input className={inputCls} value={city} onChange={e => setCity(e.target.value)} placeholder="Fresno" /></div>
          <div><label className={labelCls}>County</label>
            <select className={`${inputCls} cursor-pointer`} value={county} onChange={e => setCounty(e.target.value)}>
              <option value="">Select county...</option>
              {CA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>ZIP</label><input className={inputCls} value={zip} onChange={e => setZip(e.target.value)} placeholder="93721" /></div>
          <div><label className={labelCls}>Status</label>
            <select className={`${inputCls} cursor-pointer`} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="pending">Pending</option><option value="active">Active</option>
            </select>
          </div>
        </div>
        {/* Site Contact */}
        <div className="border-t border-[#E5E7EB] pt-[14px] mt-[2px]">
          <p className="text-xs font-bold text-navy mb-[10px]">Site Contact</p>
          <div className="flex flex-col gap-[10px]">
            <input className={inputCls} value={scName} onChange={e => setScName(e.target.value)} placeholder="Full name" />
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} value={scEmail} onChange={e => setScEmail(e.target.value)} placeholder="Email address" type="email" />
              <input className={inputCls} value={scPhone} onChange={e => setScPhone(e.target.value)} placeholder="Phone number" type="tel" />
            </div>
          </div>
        </div>
        {/* Manager */}
        <div className="border-t border-[#E5E7EB] pt-[14px] mt-[2px]">
          <p className="text-xs font-bold text-navy mb-[10px]">Manager</p>
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} value={mgrName} onChange={e => setMgrName(e.target.value)} placeholder="Manager name" />
            <input className={inputCls} value={mgrPhone} onChange={e => setMgrPhone(e.target.value)} placeholder="Manager phone" type="tel" />
          </div>
        </div>
        <div><label className={labelCls}>Site Phone (main line)</label><input className={inputCls} value={sitePhone} onChange={e => setSitePhone(e.target.value)} placeholder="(555) 000-0000" type="tel" /></div>
        <div className="flex gap-[10px] justify-end mt-2">
          <button onClick={onClose} className="px-5 py-2 border border-[#E2D9C8] rounded-lg bg-white text-navy text-[13px] font-semibold cursor-pointer">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} className={`px-5 py-2 border-none rounded-lg text-white text-[13px] font-semibold ${saving || !name.trim() ? 'bg-[#E5E7EB] cursor-default' : 'bg-navy cursor-pointer'}`}>{saving ? 'Saving...' : 'Create Location'}</button>
        </div>
      </div>
    </Modal>
  );
}

function AddUserModal({ orgs, onClose, onSaved, userEmail }: { orgs: Org[]; onClose: () => void; onSaved: () => void; userEmail?: string }) {
  const { isDemoMode } = useDemo();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('kitchen_staff');
  const [selectedOrg, setSelectedOrg] = useState<OrgOption | null>(null);
  const [saving, setSaving] = useState(false);

  const handleInvite = async () => {
    if (isDemoMode) return;
    if (!email.trim()) return;
    setSaving(true);
    await supabase.from('admin_event_log').insert({ level: 'INFO', category: 'configure', message: `User invited: ${email} (${role})` });
    setSaving(false); onSaved(); onClose();
  };

  return (
    <Modal title="Invite User" onClose={onClose}>
      <div className="flex flex-col gap-[14px]">
        <div><label className={labelCls}>Email *</label><input className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" type="email" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Full Name</label><input className={inputCls} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" /></div>
          <div><label className={labelCls}>Phone Number</label><input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" type="tel" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Role</label>
            <select className={`${inputCls} cursor-pointer`} value={role} onChange={e => setRole(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <OrgCombobox label="Organization" orgs={orgs} value={selectedOrg} onChange={setSelectedOrg} placeholder="Search or create..." />
        </div>
        <div className="flex gap-[10px] justify-end mt-2">
          <button onClick={onClose} className="px-5 py-2 border border-[#E2D9C8] rounded-lg bg-white text-navy text-[13px] font-semibold cursor-pointer">Cancel</button>
          <button onClick={handleInvite} disabled={!email.trim() || saving} className={`px-5 py-2 border-none rounded-lg text-white text-[13px] font-semibold ${saving || !email.trim() ? 'bg-[#E5E7EB] cursor-default' : 'bg-navy cursor-pointer'}`}>{saving ? 'Sending...' : 'Send Invitation'}</button>
        </div>
      </div>
    </Modal>
  );
}

function AddVendorModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { isDemoMode } = useDemo();
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
    if (isDemoMode) return;
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
      <div className="flex flex-col gap-[14px]">
        <div><label className={labelCls}>Company Name *</label><input className={inputCls} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="ACE Hood Cleaning" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Service Type</label>
            <select className={`${inputCls} cursor-pointer`} value={serviceType} onChange={e => setServiceType(e.target.value)}>
              {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Status</label>
            <select className={`${inputCls} cursor-pointer`} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="pending">Pending</option><option value="active">Active</option>
            </select>
          </div>
          <div><label className={labelCls}>Website</label><input className={inputCls} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://vendor.com" /></div>
          <div><label className={labelCls}>Main Phone</label><input className={inputCls} value={mainPhone} onChange={e => setMainPhone(e.target.value)} placeholder="(555) 000-0000" type="tel" /></div>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" checked={isPartner} onChange={e => setIsPartner(e.target.checked)} />
            <label className="text-xs text-navy font-semibold cursor-pointer">EvidLY Partner</label>
          </div>
        </div>
        {/* Primary Contact */}
        <div className="border-t border-[#E5E7EB] pt-[14px] mt-[2px]">
          <p className="text-xs font-bold text-navy mb-[10px]">Primary Contact</p>
          <div className="flex flex-col gap-[10px]">
            <input className={inputCls} value={pcName} onChange={e => setPcName(e.target.value)} placeholder="Full name" />
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} value={pcEmail} onChange={e => setPcEmail(e.target.value)} placeholder="Email address" type="email" />
              <input className={inputCls} value={pcPhone} onChange={e => setPcPhone(e.target.value)} placeholder="Phone number" type="tel" />
            </div>
          </div>
        </div>
        {/* Alternate Contact */}
        <div className="border-t border-[#E5E7EB] pt-[14px] mt-[2px]">
          <p className="text-xs font-bold text-navy mb-[10px]">Alternate Contact</p>
          <div className="flex flex-col gap-[10px]">
            <input className={inputCls} value={acName} onChange={e => setAcName(e.target.value)} placeholder="Full name" />
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} value={acEmail} onChange={e => setAcEmail(e.target.value)} placeholder="Email address" type="email" />
              <input className={inputCls} value={acPhone} onChange={e => setAcPhone(e.target.value)} placeholder="Phone number" type="tel" />
            </div>
          </div>
        </div>

        <div><label className={labelCls}>Counties Served</label>
          <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto p-2 border border-[#E2D9C8] rounded-lg">
            {['Fresno','Los Angeles','Merced','Sacramento','San Diego','San Francisco','Stanislaus'].map(c => (
              <button key={c} type="button" onClick={() => toggleCounty(c)}
                className={`px-2 py-[2px] rounded-xl text-[10px] font-semibold cursor-pointer ${
                  counties.includes(c) ? 'border border-gold bg-[#FAF7F2] text-gold' : 'border border-[#E5E0D8] bg-white text-[#9CA3AF]'
                }`}>{c}</button>
            ))}
          </div>
        </div>

        <div><label className={labelCls}>Certifications</label>
          <div className="flex flex-wrap gap-1.5">
            {CERTIFICATIONS.map(c => (
              <button key={c} type="button" onClick={() => toggleCert(c)}
                className={`px-[10px] py-[3px] rounded-xl text-[10px] font-semibold cursor-pointer ${
                  certs.includes(c) ? 'border border-[#059669] bg-[#F0FFF4] text-[#059669]' : 'border border-[#E5E0D8] bg-white text-[#9CA3AF]'
                }`}>{c}</button>
            ))}
          </div>
        </div>

        <div><label className={labelCls}>Notes</label><textarea className={`${inputCls} resize-y`} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." /></div>
        <div className="flex gap-[10px] justify-end mt-2">
          <button onClick={onClose} className="px-5 py-2 border border-[#E2D9C8] rounded-lg bg-white text-navy text-[13px] font-semibold cursor-pointer">Cancel</button>
          <button onClick={handleSave} disabled={!companyName.trim() || saving} className={`px-5 py-2 border-none rounded-lg text-white text-[13px] font-semibold ${saving || !companyName.trim() ? 'bg-[#E5E7EB] cursor-default' : 'bg-navy cursor-pointer'}`}>{saving ? 'Saving...' : 'Create Vendor'}</button>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════ DETAIL DRAWERS ══════════════

function DrawerTabBar({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex border-b border-[#E2D9C8] px-6 shrink-0 overflow-x-auto">
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)}
          className={`px-[14px] py-[10px] text-[13px] font-semibold border-none bg-transparent cursor-pointer -mb-px whitespace-nowrap ${
            active === t ? 'border-b-2 border-navy text-navy' : 'border-b-2 border-transparent text-[#9CA3AF]'
          }`}>{t}</button>
      ))}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-[#F3F4F6]">
      <span className="text-xs text-[#6B7F96] font-semibold">{label}</span>
      <span className="text-[13px] text-navy font-medium text-right max-w-[60%]">{value || '—'}</span>
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
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-[580px] max-w-[100vw] bg-white z-50 shadow-[-4px_0_24px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E2D9C8] shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-navy m-0">{org.name}</h2>
              <div className="flex gap-1.5 mt-1.5">
                <span className={statusBadgeClass(org.status)}>{org.status}</span>
                {org.plan && <span className="px-2 py-[2px] rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB]">{org.plan}</span>}
                {org.industry_type && <span className="px-2 py-[2px] rounded text-[10px] font-semibold bg-[#F3F4F6] text-[#6B7F96]">{org.industry_type.replace(/_/g, ' ')}</span>}
              </div>
            </div>
            <button onClick={onClose} className="bg-transparent border-none text-[22px] text-[#9CA3AF] cursor-pointer">{'×'}</button>
          </div>
        </div>
        <DrawerTabBar tabs={['Overview', 'Locations', 'Users', 'Vendors', 'Tickets', 'Activity']} active={tab} onChange={setTab} />
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'Overview' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-[10px]">
                <div className="bg-[#F9FAFB] rounded-lg px-[14px] py-3 text-center">
                  <div className="text-xl font-extrabold text-navy">{locs.length}</div>
                  <div className="text-[11px] text-[#6B7F96]">Locations</div>
                </div>
                <div className="bg-[#F9FAFB] rounded-lg px-[14px] py-3 text-center">
                  <div className="text-xl font-extrabold text-navy">{users.length}</div>
                  <div className="text-[11px] text-[#6B7F96]">Users</div>
                </div>
                <div className="bg-[#F9FAFB] rounded-lg px-[14px] py-3 text-center">
                  <div className="text-xl font-extrabold text-navy">{tickets.filter(t => t.status === 'open').length}</div>
                  <div className="text-[11px] text-[#6B7F96]">Open Tickets</div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy mb-2">Primary Contact</h4>
                <DetailRow label="Name" value={org.primary_contact_name} />
                <DetailRow label="Email" value={org.primary_contact_email} />
                <DetailRow label="Phone" value={org.primary_contact_phone} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy mb-2">Alternate Contact</h4>
                <DetailRow label="Name" value={org.alternate_contact_name} />
                <DetailRow label="Email" value={org.alternate_contact_email} />
                <DetailRow label="Phone" value={org.alternate_contact_phone} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy mb-2">Details</h4>
                <DetailRow label="Main Phone" value={org.main_phone} />
                <DetailRow label="Billing Email" value={org.billing_email} />
                <DetailRow label="Created" value={new Date(org.created_at).toLocaleDateString()} />
              </div>
            </div>
          )}
          {tab === 'Locations' && (
            relLoading ? <Skeleton h={100} /> : locs.length === 0 ? (
              <div className="text-center p-[30px] text-[#9CA3AF] text-[13px]">No locations found.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {locs.map(l => (
                  <div key={l.id} className="bg-[#F9FAFB] border border-[#E2D9C8] rounded-lg px-[14px] py-[10px]">
                    <div className="font-semibold text-navy text-[13px]">{l.name}</div>
                    <div className="text-xs text-[#6B7F96]">{[l.address, l.city, l.county].filter(Boolean).join(', ') || 'No address'}</div>
                    <span className={`${statusBadgeClass(l.status)} mt-1 inline-block`}>{l.status}</span>
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'Users' && (
            relLoading ? <Skeleton h={100} /> : users.length === 0 ? (
              <div className="text-center p-[30px] text-[#9CA3AF] text-[13px]">No users found.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {users.map((u: any) => (
                  <div key={u.user_id} className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] rounded-md border border-[#E2D9C8]">
                    <div>
                      <div className="font-semibold text-navy text-[13px]">{u.full_name || u.email}</div>
                      <div className="text-[11px] text-[#6B7F96]">{u.email}</div>
                    </div>
                    <span className="px-2 py-[2px] rounded text-[10px] font-bold bg-[#F3F4F6] text-[#6B7F96]">{u.role?.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'Vendors' && (
            relLoading ? <Skeleton h={100} /> : orgVendors.length === 0 ? (
              <div className="text-center p-[30px] text-[#9CA3AF] text-[13px]">No vendors found.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {orgVendors.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] rounded-md border border-[#E2D9C8]">
                    <div>
                      <div className="font-semibold text-navy text-[13px]">{v.company_name}</div>
                      <div className="text-[11px] text-[#6B7F96]">{v.service_type || 'No service type'}</div>
                    </div>
                    <div className="flex gap-1">
                      {v.is_partner && <span className="px-2 py-[2px] rounded text-[10px] font-bold bg-[#F0FFF4] text-[#059669]">Partner</span>}
                      <span className={statusBadgeClass(v.status)}>{v.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'Tickets' && (
            relLoading ? <Skeleton h={100} /> : tickets.length === 0 ? (
              <div className="text-center p-[30px] text-[#9CA3AF] text-[13px]">No tickets found.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {tickets.map((t: any) => {
                  const sc = { open: { bg: '#EFF6FF', text: '#2563EB' }, in_progress: { bg: '#FFFBEB', text: '#D97706' }, resolved: { bg: '#F0FFF4', text: '#059669' }, closed: { bg: '#F3F4F6', text: '#6B7280' } }[t.status as string] || { bg: '#F3F4F6', text: '#6B7280' };
                  return (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] rounded-md border border-[#E2D9C8]">
                      <div>
                        <div className="font-semibold text-navy text-[13px]">{t.subject}</div>
                        <div className="text-[11px] text-[#6B7F96]">{t.ticket_number} &middot; {new Date(t.created_at).toLocaleDateString()}</div>
                      </div>
                      <span className="px-2 py-[2px] rounded text-[10px] font-bold" style={{ background: sc.bg, color: sc.text }}>{t.status}</span>
                    </div>
                  );
                })}
              </div>
            )
          )}
          {tab === 'Activity' && (
            relLoading ? <Skeleton h={100} /> : events.length === 0 ? (
              <div className="text-center p-[30px] text-[#9CA3AF] text-[13px]">No activity recorded.</div>
            ) : (
              <div className="flex flex-col gap-1">
                {events.map((ev: any) => (
                  <div key={ev.id} className="py-1.5 border-b border-[#F3F4F6] text-xs">
                    <span className="text-[#6B7F96]">{new Date(ev.event_time).toLocaleString()}</span>
                    <span className="ml-2 text-navy">{ev.message}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        <div className="px-6 py-[14px] border-t border-[#E2D9C8] shrink-0 flex gap-[10px]">
          <FooterBtn label="Edit Organization" color="#fff" bg="#1E2D4D" onClick={() => alert(`Edit "${org.name}" requires direct database access. Use Supabase Dashboard → Table Editor → organizations.`)} />
          <FooterBtn label="View Billing" color="#1E2D4D" bg="#F9FAFB" border="1px solid #E2D9C8" onClick={() => { onClose(); window.location.assign('/admin/billing'); }} />
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
          supabase.from('jurisdictions').select('agency_name, county, scoring_type, grading_type, inspection_frequency, fire_ahj_name, fire_ahj_type')
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
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-[580px] max-w-[100vw] bg-white z-50 shadow-[-4px_0_24px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E2D9C8] shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-navy m-0">{loc.name}</h2>
              <div className="flex gap-1.5 mt-1.5">
                <span className={statusBadgeClass(loc.status)}>{loc.status}</span>
                {loc.county && <span className="px-2 py-[2px] rounded text-[10px] font-semibold bg-[#F3F4F6] text-[#6B7F96]">{loc.county} County</span>}
              </div>
            </div>
            <button onClick={onClose} className="bg-transparent border-none text-[22px] text-[#9CA3AF] cursor-pointer">{'×'}</button>
          </div>
        </div>
        <DrawerTabBar tabs={['Overview', 'Compliance', 'Users', 'Tickets', 'Activity']} active={tab} onChange={setTab} />
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'Overview' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-[10px]">
                <div className="bg-[#F9FAFB] rounded-lg px-[14px] py-3 text-center">
                  <div className="text-xl font-extrabold text-navy">{users.length}</div>
                  <div className="text-[11px] text-[#6B7F96]">Users</div>
                </div>
                <div className="bg-[#F9FAFB] rounded-lg px-[14px] py-3 text-center">
                  <div className="text-xl font-extrabold text-navy">{tickets.filter(t => t.status === 'open').length}</div>
                  <div className="text-[11px] text-[#6B7F96]">Open Tickets</div>
                </div>
                <div className="bg-[#F9FAFB] rounded-lg px-[14px] py-3 text-center">
                  <div className={`text-xl font-extrabold ${jurisdiction ? 'text-[#059669]' : 'text-[#9CA3AF]'}`}>{jurisdiction ? '✓' : '—'}</div>
                  <div className="text-[11px] text-[#6B7F96]">Jurisdiction</div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy mb-2">Address</h4>
                <DetailRow label="Street" value={loc.address} />
                <DetailRow label="City" value={loc.city} />
                <DetailRow label="County" value={loc.county} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy mb-2">Organization</h4>
                <DetailRow label="Org Name" value={loc.organizations?.name} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy mb-2">Site Contact</h4>
                <DetailRow label="Name" value={loc.site_contact_name} />
                <DetailRow label="Email" value={loc.site_contact_email} />
                <DetailRow label="Phone" value={loc.site_contact_phone} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy mb-2">Manager</h4>
                <DetailRow label="Name" value={loc.manager_name} />
                <DetailRow label="Phone" value={loc.manager_phone} />
              </div>
              <DetailRow label="Site Phone" value={loc.site_phone} />
              <DetailRow label="Created" value={new Date(loc.created_at).toLocaleDateString()} />
            </div>
          )}
          {tab === 'Compliance' && (
            relLoading ? <Skeleton h={100} /> : !jurisdiction ? (
              <div className="text-center p-[30px] text-[#9CA3AF] text-[13px]">
                {loc.county ? `No jurisdiction config found for ${loc.county} County.` : 'No county assigned to this location.'}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="text-xs font-bold text-navy mb-2">Food Safety Jurisdiction</h4>
                  <DetailRow label="Authority" value={jurisdiction.agency_name} />
                  <DetailRow label="County" value={jurisdiction.county} />
                  <DetailRow label="Scoring Method" value={jurisdiction.scoring_type?.replace(/_/g, ' ')} />
                  <DetailRow label="Grading Method" value={jurisdiction.grading_type?.replace(/_/g, ' ')} />
                  <DetailRow label="Inspection Frequency" value={jurisdiction.inspection_frequency} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-navy mb-2">Fire Safety AHJ</h4>
                  <DetailRow label="Fire AHJ" value={jurisdiction.fire_ahj_name} />
                  <DetailRow label="AHJ Type" value={jurisdiction.fire_ahj_type?.replace(/_/g, ' ')} />
                </div>
              </div>
            )
          )}
          {tab === 'Users' && (
            relLoading ? <Skeleton h={100} /> : users.length === 0 ? (
              <div className="text-center p-[30px] text-[#9CA3AF] text-[13px]">No users found for this organization.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {users.map((u: any) => (
                  <div key={u.user_id} className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] rounded-md border border-[#E2D9C8]">
                    <div>
                      <div className="font-semibold text-navy text-[13px]">{u.full_name || u.email}</div>
                      <div className="text-[11px] text-[#6B7F96]">{u.email}</div>
                    </div>
                    <span className="px-2 py-[2px] rounded text-[10px] font-bold bg-[#F3F4F6] text-[#6B7F96]">{u.role?.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'Tickets' && (
            relLoading ? <Skeleton h={100} /> : tickets.length === 0 ? (
              <div className="text-center p-[30px] text-[#9CA3AF] text-[13px]">No tickets found.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {tickets.map((t: any) => {
                  const sc = { open: { bg: '#EFF6FF', text: '#2563EB' }, in_progress: { bg: '#FFFBEB', text: '#D97706' }, resolved: { bg: '#F0FFF4', text: '#059669' }, closed: { bg: '#F3F4F6', text: '#6B7280' } }[t.status as string] || { bg: '#F3F4F6', text: '#6B7280' };
                  return (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] rounded-md border border-[#E2D9C8]">
                      <div>
                        <div className="font-semibold text-navy text-[13px]">{t.subject}</div>
                        <div className="text-[11px] text-[#6B7F96]">{t.ticket_number} &middot; {new Date(t.created_at).toLocaleDateString()}</div>
                      </div>
                      <span className="px-2 py-[2px] rounded text-[10px] font-bold" style={{ background: sc.bg, color: sc.text }}>{t.status}</span>
                    </div>
                  );
                })}
              </div>
            )
          )}
          {tab === 'Activity' && (
            events.length === 0 ? (
              <div className="text-center p-[30px] text-[#9CA3AF] text-[13px]">No activity recorded.</div>
            ) : (
              <div className="flex flex-col gap-1">
                {events.map((ev: any) => (
                  <div key={ev.id} className="py-1.5 border-b border-[#F3F4F6] text-xs">
                    <span className="text-[#6B7F96]">{new Date(ev.event_time).toLocaleString()}</span>
                    <span className="ml-2 text-navy">{ev.message}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        <div className="px-6 py-[14px] border-t border-[#E2D9C8] shrink-0 flex gap-[10px]">
          <FooterBtn label="Edit Location" color="#fff" bg="#1E2D4D" onClick={() => alert(`Edit "${loc.name}" requires direct database access. Use Supabase Dashboard → Table Editor → locations.`)} />
          <FooterBtn label="View Organization" color="#1E2D4D" bg="#F9FAFB" border="1px solid #E2D9C8" onClick={() => alert('Navigate to Configure → Organizations tab to view organization details.')} />
        </div>
      </div>
    </>
  );
}

// ── User Drawer ──

function UserDrawer({ user, orgs, onClose, onRefresh }: { user: UserProfile; orgs: Org[]; onClose: () => void; onRefresh: () => void }) {
  const { isDemoMode } = useDemo();
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
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-[580px] max-w-[100vw] bg-white z-50 shadow-[-4px_0_24px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E2D9C8] shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-navy m-0">{user.full_name || user.email}</h2>
              <div className="text-[13px] text-[#6B7F96] mt-[2px]">{user.email}</div>
              <div className="flex gap-1.5 mt-1.5">
                <span className="px-2 py-[2px] rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB]">{user.role.replace(/_/g, ' ')}</span>
                {org && <span className="px-2 py-[2px] rounded text-[10px] font-semibold bg-[#F3F4F6] text-[#6B7F96]">{org.name}</span>}
              </div>
            </div>
            <button onClick={onClose} className="bg-transparent border-none text-[22px] text-[#9CA3AF] cursor-pointer">{'×'}</button>
          </div>
        </div>
        <DrawerTabBar tabs={['Profile', 'Tickets', 'Activity']} active={tab} onChange={setTab} />
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'Profile' && (
            <div className="flex flex-col gap-3">
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
              <div className="text-center p-[30px] text-[#9CA3AF] text-[13px]">No tickets found.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {tickets.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] rounded-md border border-[#E2D9C8]">
                    <div>
                      <div className="font-semibold text-navy text-[13px]">{t.subject}</div>
                      <div className="text-[11px] text-[#6B7F96]">{t.ticket_number}</div>
                    </div>
                    <span className="px-2 py-[2px] rounded text-[10px] font-bold bg-[#F3F4F6] text-[#6B7F96]">{t.status}</span>
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'Activity' && (
            events.length === 0 ? (
              <div className="text-center p-[30px] text-[#9CA3AF] text-[13px]">No activity recorded.</div>
            ) : (
              <div className="flex flex-col gap-1">
                {events.map((ev: any) => (
                  <div key={ev.id} className="py-1.5 border-b border-[#F3F4F6] text-xs">
                    <span className="text-[#6B7F96]">{new Date(ev.event_time).toLocaleString()}</span>
                    <span className="ml-2 text-navy">{ev.message}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        <div className="px-6 py-[14px] border-t border-[#E2D9C8] shrink-0 flex gap-[10px]">
          <FooterBtn label="Edit User" color="#fff" bg="#1E2D4D" onClick={() => alert('Edit User profile requires admin edge function. Use Supabase Dashboard to modify user records.')} />
          <FooterBtn label="Emulate" color="#1E2D4D" bg="#FAF7F2" border="1px solid #E2D9C8" onClick={() => { onClose(); window.location.assign('/admin/emulate'); }} />
          <FooterBtn label="Reset Password" color="#6B7F96" bg="#F9FAFB" border="1px solid #E2D9C8" onClick={async () => { if (isDemoMode) return; if (user.email && confirm(`Send password reset email to ${user.email}?`)) { const { error } = await supabase.auth.resetPasswordForEmail(user.email); alert(error ? `Error: ${error.message}` : `Password reset email sent to ${user.email}.`); } }} />
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
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-[580px] max-w-[100vw] bg-white z-50 shadow-[-4px_0_24px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E2D9C8] shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-navy m-0">{vendor.company_name}</h2>
              <div className="flex gap-1.5 mt-1.5">
                <span className={statusBadgeClass(vendor.status)}>{vendor.status}</span>
                {vendor.service_type && <span className="px-2 py-[2px] rounded text-[10px] font-semibold bg-[#F3F4F6] text-[#6B7F96]">{vendor.service_type}</span>}
                {vendor.is_partner && <span className="px-2 py-[2px] rounded text-[10px] font-bold bg-[#F0FFF4] text-[#059669]">Partner</span>}
              </div>
            </div>
            <button onClick={onClose} className="bg-transparent border-none text-[22px] text-[#9CA3AF] cursor-pointer">{'×'}</button>
          </div>
        </div>
        <DrawerTabBar tabs={['Profile', 'Locations Served', 'Activity']} active={tab} onChange={setTab} />
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'Profile' && (
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="text-xs font-bold text-navy mb-2">Company Info</h4>
                <DetailRow label="Website" value={vendor.website} />
                <DetailRow label="Main Phone" value={vendor.main_phone || vendor.phone} />
                <DetailRow label="Service Type" value={vendor.service_type} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy mb-2">Primary Contact</h4>
                <DetailRow label="Name" value={vendor.primary_contact_name || vendor.contact_name} />
                <DetailRow label="Email" value={vendor.primary_contact_email || vendor.email} />
                <DetailRow label="Phone" value={vendor.primary_contact_phone} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy mb-2">Alternate Contact</h4>
                <DetailRow label="Name" value={vendor.alternate_contact_name} />
                <DetailRow label="Email" value={vendor.alternate_contact_email} />
                <DetailRow label="Phone" value={vendor.alternate_contact_phone} />
              </div>
              <DetailRow label="Created" value={new Date(vendor.created_at).toLocaleDateString()} />
            </div>
          )}
          {tab === 'Locations Served' && (
            relLoading ? <Skeleton h={100} /> : servedLocations.length === 0 ? (
              <div className="text-center p-[30px] text-[#9CA3AF] text-[13px]">No locations in the system yet.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {servedLocations.map((l: any) => (
                  <div key={l.id} className="bg-[#F9FAFB] border border-[#E2D9C8] rounded-lg px-[14px] py-[10px]">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-navy text-[13px]">{l.name}</div>
                        <div className="text-[11px] text-[#6B7F96]">{[l.city, l.county].filter(Boolean).join(', ') || 'No address'} &middot; {(l.organizations as any)?.name || ''}</div>
                      </div>
                      <span className={statusBadgeClass(l.status)}>{l.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'Activity' && (
            events.length === 0 ? (
              <div className="text-center p-[30px] text-[#9CA3AF] text-[13px]">No activity recorded.</div>
            ) : (
              <div className="flex flex-col gap-1">
                {events.map((ev: any) => (
                  <div key={ev.id} className="py-1.5 border-b border-[#F3F4F6] text-xs">
                    <span className="text-[#6B7F96]">{new Date(ev.event_time).toLocaleString()}</span>
                    <span className="ml-2 text-navy">{ev.message}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        <div className="px-6 py-[14px] border-t border-[#E2D9C8] shrink-0 flex gap-[10px]">
          <FooterBtn label="Edit Vendor" color="#fff" bg="#1E2D4D" onClick={() => alert(`Edit "${vendor.company_name}" requires direct database access. Use Supabase Dashboard → Table Editor → vendors.`)} />
          <FooterBtn label="Send Portal Invite" color="#1E2D4D" bg="#FAF7F2" border="1px solid #E2D9C8" onClick={() => alert(`Portal invite for ${vendor.company_name} requires the vendor portal invitation edge function.`)} />
          <FooterBtn label="Deactivate" color="#DC2626" bg="#FEF2F2" border="1px solid #FECACA" onClick={() => alert(`Deactivate "${vendor.company_name}" requires admin edge function. Use Supabase Dashboard to update vendor status.`)} />
        </div>
      </div>
    </>
  );
}
