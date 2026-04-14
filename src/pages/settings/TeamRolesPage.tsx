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

const cardClasses = 'bg-white border border-border_ui-cool rounded-xl shadow-[0_1px_3px_rgba(11,22,40,.06),0_1px_2px_rgba(11,22,40,.04)] p-6 mb-5';

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
        <div className={`${cardClasses} h-[300px]`}>
          <div className="bg-[#EEF1F7] rounded-lg h-5 w-[200px] mb-4" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#EEF1F7] rounded-lg h-3.5 w-4/5 mb-2.5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...FONT }}>
      {/* Permissions Matrix */}
      <div className={cardClasses}>
        <h2 className="flex items-center gap-2 text-base font-bold text-navy-deeper mb-4 mt-0">
          <Shield size={18} color={NAVY} /> Role Permissions
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#EEF1F7] border-b-2 border-border_ui-cool">
                <th className="text-left px-3.5 py-2.5 font-semibold text-navy-deeper min-w-[160px]">
                  Permission
                </th>
                {ROLES.map(role => (
                  <th key={role.key} className="text-center px-3 py-2.5 font-semibold text-navy-deeper min-w-[90px]">
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((row, idx) => (
                <tr key={row.permission} className="border-b border-border_ui-cool">
                  <td className="px-3.5 py-2.5 font-medium text-navy-deeper">
                    {row.label}
                  </td>
                  {ROLES.map(role => {
                    const isOwnerOnly = row.permission === 'billing_access' && role.key !== 'owner';
                    return (
                      <td key={role.key} className="text-center px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={row.roles[role.key]}
                          onChange={() => togglePermission(idx, role.key)}
                          disabled={isOwnerOnly}
                          className={`w-[18px] h-[18px] accent-navy-muted ${isOwnerOnly ? 'cursor-not-allowed opacity-40' : 'cursor-pointer opacity-100'}`}
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
      <div className={cardClasses}>
        <h2 className="text-base font-bold text-navy-deeper mb-3 mt-0">
          Default Role
        </h2>
        <p className="text-navy-mid text-[13px] mb-3 mt-0">
          New team members will be assigned this role when invited.
        </p>
        <select
          value={defaultRole}
          onChange={e => setDefaultRole(e.target.value as SettingsRole)}
          className="px-3 py-2 border border-border_ui-cool rounded-lg text-sm text-navy-deeper bg-white min-w-[200px]"
        >
          {ROLES.map(role => (
            <option key={role.key} value={role.key}>{role.label}</option>
          ))}
        </select>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 py-2.5 px-6 rounded-lg border-none bg-navy-muted text-white text-sm font-semibold ${saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer opacity-100'}`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
