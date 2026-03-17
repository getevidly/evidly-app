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

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';

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


const inputStyle: React.CSSProperties = {
  padding: '7px 10px', fontSize: 13, border: `1px solid ${BORDER}`,
  borderRadius: 6, outline: 'none', color: NAVY, background: '#fff',
};

const btnStyle = (bg: string, fg: string): React.CSSProperties => ({
  padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none',
  borderRadius: 6, cursor: 'pointer', background: bg, color: fg,
});

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
        <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>Organizations</h1>
        <p style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>
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
          style={{ ...inputStyle, width: 280 }}
          placeholder="Search by name or industry..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Org list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>Loading organizations...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>No organizations match filters</div>
        ) : filtered.map(org => {
          const isEditing = editingId === org.id;
          return (
            <div key={org.id} style={{
              background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10,
              padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  {/* Name */}
                  {isEditing ? (
                    <input
                      value={editForm.name || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      style={{ ...inputStyle, fontSize: 15, fontWeight: 700, marginBottom: 8, width: '100%' }}
                    />
                  ) : (
                    <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
                      {org.name}
                    </div>
                  )}

                  {/* Badges */}
                  {!isEditing && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {org.plan && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                          background: org.plan === 'enterprise' ? '#EFF6FF' : org.plan === 'founder' ? '#FEF3C7' : '#F9FAFB',
                          color: org.plan === 'enterprise' ? '#1D4ED8' : org.plan === 'founder' ? '#D97706' : TEXT_SEC,
                        }}>
                          {PLAN_LABELS[org.plan] || org.plan}
                        </span>
                      )}
                      {org.industry_type && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                          background: '#F9FAFB', color: TEXT_SEC, border: `1px solid ${BORDER}`,
                        }}>
                          {org.industry_type.replace(/_/g, ' ')}
                        </span>
                      )}
                      {org.timezone && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED }}>
                          {org.timezone.replace('America/', '')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Edit form */}
                  {isEditing && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Industry Type</label>
                        <select
                          value={editForm.industry_type || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, industry_type: e.target.value }))}
                          style={{ ...inputStyle, width: '100%' }}
                        >
                          <option value="">Not set</option>
                          {INDUSTRY_OPTIONS.map(i => <option key={i} value={i}>{i.replace(/_/g, ' ')}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Plan Tier</label>
                        <select
                          value={editForm.plan || 'founder'}
                          onChange={e => setEditForm(prev => ({ ...prev, plan: e.target.value }))}
                          style={{ ...inputStyle, width: '100%' }}
                        >
                          {PLAN_OPTIONS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Timezone</label>
                        <select
                          value={editForm.timezone || 'America/Los_Angeles'}
                          onChange={e => setEditForm(prev => ({ ...prev, timezone: e.target.value }))}
                          style={{ ...inputStyle, width: '100%' }}
                        >
                          {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz.replace('America/', '').replace('Pacific/', '')}</option>)}
                        </select>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Notes</label>
                        <textarea
                          value={editForm.notes || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                          rows={2}
                          style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
                          placeholder="Internal notes..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Meta */}
                  {!isEditing && (
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                      Created: {org.created_at ? new Date(org.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      {org.updated_at && <> · Updated: {new Date(org.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>}
                      {org.notes && <> · {org.notes}</>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {isEditing ? (
                    <>
                      <button onClick={saveEdit} disabled={saving} style={btnStyle(saving ? '#E5E7EB' : '#059669', saving ? TEXT_MUTED : '#fff')}>
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={cancelEdit} style={btnStyle('#F0F4F8', TEXT_SEC)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(org)} style={btnStyle('#EFF6FF', '#2563EB')}>
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
