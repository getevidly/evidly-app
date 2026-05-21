/**
 * FacilityServicesBucket — C14 dispatcher
 *
 * Facilities_manager only — facility service categories with schedule status.
 */

import { useRole } from '../../../contexts/RoleContext';
import { useFacilityServices } from '../../../hooks/useFacilityServices';
import { FacilityServiceCard } from './FacilityServiceCard';

export function FacilityServicesBucket() {
  const { userRole } = useRole();
  const { categories, loading } = useFacilityServices();

  if (userRole !== 'facilities_manager') return null;

  if (loading) {
    return (
      <div>
        <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Facility services</span>
        </div>
        <div className="fs-grid">
          <div className="fs-card">
            <div className="skeleton" style={{ width: '100%', height: 50, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Facility services</span>
      </div>
      <div className="fs-grid">
        {categories.length === 0 ? (
          <div className="fs-card" style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
            <p style={{ color: 'var(--muted)', fontSize: 13, padding: '16px 0' }}>
              No facility service types configured.
            </p>
          </div>
        ) : (
          categories.map(c => (
            <FacilityServiceCard key={c.service_type_code} category={c} />
          ))
        )}
      </div>
    </div>
  );
}
