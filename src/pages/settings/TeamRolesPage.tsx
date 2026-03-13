import { useState, useEffect } from 'react';
import { Shield, Save, Loader2 } from 'lucide-react';
import { useRolePermissions, useUpdateRolePermissions, type SettingsRole, type RolePermissionRow } from '../../hooks/api/useSettings';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, TEXT_TERTIARY, NAVY, FONT,
} from '../../components/dashboard/shared/constants';

const ROLES: { key: SettingsRole; label: string }[] = [
  { key: 'owner', label: 'Owner' },
  { key: 'admin', label: 'Admin' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'technician', label: 'Technician' },
  { key: 'office', label: 'Office' },
];

const DEFAULT_PERMISSIONS: RolePermissionRow[] = [
  { permission: 'view_jobs', label: 'View Jobs', roles: { owner: true, admin: true, supervisor: true, technician: true, office: true } },
  { permission: 'edit_jobs', label: 'Edit Jobs', roles: { owner: true, admin: true, supervisor: true, technician: false, office: false } },
  { permission: 'view_customers', label: 'View Customers', roles: { owner: true, admin: true, supervisor: true, technician: false, office: true } },
  { permission: 'edit_customers', label: 'Edit Customers', roles: { owner: true, admin: true, supervisor: false, technician: false, office: false } },
  { permission: 'approve_timecards', label: 'Approve Timecards', roles: { owner: true, admin: true, supervisor: true, technician: false, office: false } },
  { permission: 'view_reports', label: 'View Reports', roles: { owner: true, admin: true, supervisor: true, technician: false, office: true } },
  { permission: 'manage_team', label: 'Manage Team', roles: { owner: true, admin: true, supervisor: false, technician: false, office: false } },
  { permission: 'billing_access', label: 'Billing Access', roles: { owner: true, admin: false, supervisor: false, technician: false, office: false } },
];

const cardStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 12,
  boxShadow: CARD_SHADOW,
  padding: 24,
  marginBottom: 20,
};

export function TeamRolesPage() {
  const { data: serverPerms, isLoading } = useRolePermissions();
  const { mutate: updatePerms, isLoading: saving } = useUpdateRolePermissions();

  const [permissions, setPermissions] = useState<RolePermissionRow[]>(DEFAULT_PERMISSIONS);
  const [defaultRole, setDefaultRole] = useState<SettingsRole>('technician');

  useEffect(() => {
    if (serverPerms && serverPerms.length > 0) {
      setPermissions(serverPerms);
    }
  }, [serverPerms]);

  const togglePermission = (permIdx: number, role: SettingsRole) => {
    setPermissions(prev => prev.map((row, i) => {
      if (i !== permIdx) return row;
      return { ...row, roles: { ...row.roles, [role]: !row.roles[role] } };
    }));
  };

  const handleSave = async () => {
    try {
      await updatePerms(permissions);
      alert('Permissions saved successfully');
    } catch {
      alert('Failed to save permissions');
    }
  };

  if (isLoading) {
    return (
      <div style={{ ...FONT }}>
        <div style={{ ...cardStyle, height: 300 }}>
          <div style={{ background: PANEL_BG, borderRadius: 8, height: 20, width: 200, marginBottom: 16 }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ background: PANEL_BG, borderRadius: 8, height: 14, width: '80%', marginBottom: 10 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...FONT }}>
      {/* Permissions Matrix */}
      <div style={cardStyle}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: '0 0 16px' }}>
          <Shield size={18} color={NAVY} /> Role Permissions
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: PANEL_BG, borderBottom: `2px solid ${CARD_BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT, minWidth: 160 }}>
                  Permission
                </th>
                {ROLES.map(role => (
                  <th key={role.key} style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 600, color: BODY_TEXT, minWidth: 90 }}>
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((row, idx) => (
                <tr key={row.permission} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: BODY_TEXT }}>
                    {row.label}
                  </td>
                  {ROLES.map(role => {
                    const isOwnerOnly = row.permission === 'billing_access' && role.key !== 'owner';
                    return (
                      <td key={role.key} style={{ textAlign: 'center', padding: '10px 12px' }}>
                        <input
                          type="checkbox"
                          checked={row.roles[role.key]}
                          onChange={() => togglePermission(idx, role.key)}
                          disabled={isOwnerOnly}
                          style={{
                            width: 18,
                            height: 18,
                            accentColor: NAVY,
                            cursor: isOwnerOnly ? 'not-allowed' : 'pointer',
                            opacity: isOwnerOnly ? 0.4 : 1,
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Default Role */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: '0 0 12px' }}>
          Default Role
        </h2>
        <p style={{ color: MUTED, fontSize: 13, margin: '0 0 12px' }}>
          New team members will be assigned this role when invited.
        </p>
        <select
          value={defaultRole}
          onChange={e => setDefaultRole(e.target.value as SettingsRole)}
          style={{
            padding: '8px 12px',
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 8,
            fontSize: 14,
            color: BODY_TEXT,
            background: '#fff',
            minWidth: 200,
          }}
        >
          {ROLES.map(role => (
            <option key={role.key} value={role.key}>{role.label}</option>
          ))}
        </select>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 24px',
            borderRadius: 8,
            border: 'none',
            background: NAVY,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
