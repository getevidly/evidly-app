/**
 * AdminOrgs — Organization management
 *
 * AUDIT-FIX-07 / A-5
 * Route: /admin/orgs
 * Access: platform_admin only (RequireAdmin)
 *
 * List, view, and edit organization settings.
 * All changes logged to platform_audit_log.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';
import { toast } from 'sonner';

const PLAN_OPTIONS = ['founder', 'standard', 'enterprise'];
const PLAN_LABELS: Record<string, string> = {
  founder: 'Founder',
  standard: 'Standard',
  enterprise: 'Enterprise',
};

const INDUSTRY_OPTIONS = [
  'restaurant', 'hotel', 'hospital', 'school', 'catering',
  'food_truck', 'corporate_dining', 'senior_living', 'government',
];

const TIMEZONE_OPTIONS = [
  'America/Los_Angeles', 'America/Denver', 'America/Chicago',
  'America/New_York', 'America/Anchorage', 'Pacific/Honolulu',
];

interface OrgRow {
  id: string;
  name: string;
  industry_type: string | null;
  plan: string | null;
  status: string | null;
  timezone: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function AdminOrgs() {
  useDemoGuard();
  const { user } = useAuth();

  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<OrgRow>>({});
  const [saving, setSaving] = useState(false);

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, industry_type, plan, status, timezone, notes, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrgs((data || []) as OrgRow[]);
    } catch {
      setOrgs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  const filtered = orgs.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.name.toLowerCase().includes(q) || (o.industry_type || '').toLowerCase().includes(q);
  });

  const startEdit = (org: OrgRow) => {
    setEditingId(org.id);
    setEditForm({
      name: org.name,
      industry_type: org.industry_type || '',
      plan: org.plan || 'founder',
      timezone: org.timezone || 'America/Los_Angeles',
      notes: org.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const org = orgs.find(o => o.id === editingId);
      const updates: Record<string, any> = {};
      if (editForm.name && editForm.name !== org?.name) updates.name = editForm.name;
      if (editForm.industry_type !== org?.industry_type) updates.industry_type = editForm.industry_type || null;
      if (editForm.plan !== org?.plan) updates.plan = editForm.plan || null;
      if (editForm.timezone !== org?.timezone) updates.timezone = editForm.timezone || null;
      if (editForm.notes !== org?.notes) updates.notes = editForm.notes || null;

      if (Object.keys(updates).length === 0) {
        setSaving(false);
        setEditingId(null);
        return;
      }

      updates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', editingId);
      if (error) throw error;

      // Audit log
      await supabase.from('platform_audit_log').insert({
        actor_id: user?.id,
        actor_email: user?.email,
        action: 'admin.org_updated',
        resource_type: 'organization',
        resource_id: editingId,
        old_value: org ? { name: org.name, industry_type: org.industry_type, plan: org.plan, timezone: org.timezone, notes: org.notes } : null,
        new_value: updates,
      }).catch(() => {});

      toast.success('Organization updated');
      setEditingId(null);
      await loadOrgs();
    } catch (err: any) {
      toast.error(`Save failed: ${err?.message || 'Unknown error'}`);
    }
    setSaving(false);
  };

  const totalOrgs = orgs.length;
  const activeOrgs = orgs.filter(o => o.status !== 'suspended').length;
  const planCounts = orgs.reduce<Record<string, number>>((acc, o) => {
    const p = o.plan || 'unknown';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Organizations' }]} />

      <div>
        <h1 className="text-[22px] font-extrabold text-navy">Organizations</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          View and manage organization settings, plans, and preferences
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile label="Total Orgs" value={totalOrgs} />
        <KpiTile label="Active" value={activeOrgs} />
        <KpiTile label="Founder" value={planCounts['founder'] || 0} />
        <KpiTile label="Enterprise" value={planCounts['enterprise'] || 0} />
      </div>

      {/* Search */}
      <div>
        <input
          className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-[280px]"
          placeholder="Search by name or industry..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Org list */}
      <div className="flex flex-col gap-2">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-[13px]">Loading organizations...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-[13px]">No organizations match filters</div>
        ) : filtered.map(org => {
          const isEditing = editingId === org.id;
          return (
            <div key={org.id} className="bg-white border border-border_ui-warm rounded-[10px] py-4 px-5">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Name */}
                  {isEditing ? (
                    <input
                      value={editForm.name || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="py-[7px] px-[10px] text-[15px] font-bold border border-border_ui-warm rounded-md outline-none text-navy bg-white mb-2 w-full"
                    />
                  ) : (
                    <div className="text-[15px] font-bold text-navy mb-1">
                      {org.name}
                    </div>
                  )}

                  {/* Badges */}
                  {!isEditing && (
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {org.plan && (
                        <span className={`text-[10px] font-bold py-0.5 px-2 rounded-[10px] ${
                          org.plan === 'enterprise' ? 'bg-blue-50 text-blue-700' :
                          org.plan === 'founder' ? 'bg-amber-100 text-amber-600' :
                          'bg-gray-50 text-slate_ui'
                        }`}>
                          {PLAN_LABELS[org.plan] || org.plan}
                        </span>
                      )}
                      {org.industry_type && (
                        <span className="text-[10px] font-semibold py-0.5 px-2 rounded-[10px] bg-gray-50 text-slate_ui border border-border_ui-warm">
                          {org.industry_type.replace(/_/g, ' ')}
                        </span>
                      )}
                      {org.timezone && (
                        <span className="text-[10px] font-semibold text-gray-400">
                          {org.timezone.replace('America/', '')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Edit form */}
                  {isEditing && (
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate_ui block mb-1">Industry Type</label>
                        <select
                          value={editForm.industry_type || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, industry_type: e.target.value }))}
                          className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                        >
                          <option value="">Not set</option>
                          {INDUSTRY_OPTIONS.map(i => <option key={i} value={i}>{i.replace(/_/g, ' ')}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate_ui block mb-1">Plan Tier</label>
                        <select
                          value={editForm.plan || 'founder'}
                          onChange={e => setEditForm(prev => ({ ...prev, plan: e.target.value }))}
                          className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                        >
                          {PLAN_OPTIONS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate_ui block mb-1">Timezone</label>
                        <select
                          value={editForm.timezone || 'America/Los_Angeles'}
                          onChange={e => setEditForm(prev => ({ ...prev, timezone: e.target.value }))}
                          className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                        >
                          {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz.replace('America/', '').replace('Pacific/', '')}</option>)}
                        </select>
                      </div>
                      <div className="col-span-full">
                        <label className="text-[11px] font-semibold text-slate_ui block mb-1">Notes</label>
                        <textarea
                          value={editForm.notes || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                          rows={2}
                          className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full resize-y"
                          placeholder="Internal notes..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Meta */}
                  {!isEditing && (
                    <div className="text-[11px] text-gray-400">
                      Created: {org.created_at ? new Date(org.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      {org.updated_at && <> · Updated: {new Date(org.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>}
                      {org.notes && <> · {org.notes}</>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className={`py-1.5 px-3.5 text-xs font-semibold border-none rounded-md cursor-pointer ${
                          saving ? 'bg-gray-200 text-gray-400' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="py-1.5 px-3.5 text-xs font-semibold border-none rounded-md cursor-pointer bg-[#F0F4F8] text-slate_ui"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(org)}
                      className="py-1.5 px-3.5 text-xs font-semibold border-none rounded-md cursor-pointer bg-blue-50 text-blue-600"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
