/**
 * FoodSafetyHub — Category landing page for Food Safety.
 *
 * Dynamically builds cards from the current role's food-safety
 * sidebar section config via getRoleConfig().
 */

import { useRole } from '../contexts/RoleContext';
import { useOrgType } from '../hooks/useOrgType';
import { getRoleConfig } from '../config/sidebarConfig';
import { HubCard } from '../components/hub/HubCard';
import { useDemoGuard } from '../hooks/useDemoGuard';

export function FoodSafetyHub() {
  useDemoGuard();
  const { userRole } = useRole();
  const { orgType } = useOrgType();
  const config = getRoleConfig(userRole, orgType);
  const section = config.sections.find(s => s.id === 'food-safety');
  const items = section?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--text-primary, #0B1628)' }}
        >
          Food Safety
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: 'var(--text-secondary, #3D5068)' }}
        >
          Checklists, temperature monitoring, HACCP plans, corrective actions, and food safety scoring.
        </p>
      </div>

      {/* Cards grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <HubCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl border p-12 text-center"
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            borderColor: 'var(--border, #D1D9E6)',
          }}
        >
          <span className="text-4xl mb-3 block">🍽️</span>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary, #3D5068)' }}>
            No food safety tools are assigned to your role.
          </p>
        </div>
      )}
    </div>
  );
}
