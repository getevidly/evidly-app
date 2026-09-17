/**
 * OrgPicker — lets a platform_admin point the record pages at another org.
 *
 * Renders nothing for everyone else, so the record pages can drop it into their
 * header unconditionally.
 */

import { useScopedOrgContext } from '../../contexts/ScopedOrgContext';
import { useAuth } from '../../contexts/AuthContext';

export default function OrgPicker() {
  const { orgs, scopedOrgId, setScopedOrgId, isPlatformAdmin, isScoped, loading } = useScopedOrgContext();
  const { profile } = useAuth();

  if (!isPlatformAdmin || loading || orgs.length === 0) return null;

  const ownOrgId = profile?.organization_id;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <label htmlFor="scoped-org" style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
        Viewing Organization
      </label>
      <select
        id="scoped-org"
        value={scopedOrgId || ''}
        onChange={(e) => setScopedOrgId(e.target.value === ownOrgId ? null : e.target.value)}
        style={{
          fontSize: 13, padding: '6px 10px', borderRadius: 8,
          border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A',
          cursor: 'pointer',
        }}
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}{o.id === ownOrgId ? ' (Your Organization)' : ''}
          </option>
        ))}
      </select>
      {isScoped && (
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
          background: '#FEF3C7', color: '#92400E',
        }}>
          Admin View
        </span>
      )}
    </div>
  );
}
