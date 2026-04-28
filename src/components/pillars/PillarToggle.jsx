import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';

/**
 * Mounted pillar routes — flip fire: true in Sprint 5d-1b
 * when /fire-safety/* routes are added to the router.
 */
export const MOUNTED_PILLAR_ROUTES = { food: true, fire: false };

const CROSS_PILLAR_ROLES = ['owner_operator', 'executive', 'compliance_manager'];

export default function PillarToggle() {
  const { userRole } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Only render for cross-pillar roles
  if (!CROSS_PILLAR_ROLES.includes(userRole)) return null;

  // Determine which segments to show
  const segments = [];
  if (MOUNTED_PILLAR_ROUTES.food) segments.push({ key: 'food', label: 'Food Safety', prefix: '/food-safety' });
  if (MOUNTED_PILLAR_ROUTES.fire) segments.push({ key: 'fire', label: 'Fire Safety', prefix: '/fire-safety' });

  // If only one segment is mounted, don't render the toggle
  if (segments.length < 2) return null;

  // Determine active pillar from pathname
  const activePillar = location.pathname.startsWith('/fire-safety') ? 'fire' : 'food';

  const handleClick = (targetKey) => {
    if (targetKey === activePillar) return;

    const targetSegment = segments.find(s => s.key === targetKey);
    if (!targetSegment) return;

    // Extract the page name from current path (e.g., /food-safety/analysis → analysis)
    const currentPrefix = segments.find(s => s.key === activePillar)?.prefix || '';
    const pagePath = location.pathname.replace(currentPrefix, '');

    // Build target URL preserving location query param
    const targetPath = targetSegment.prefix + pagePath;
    const params = new URLSearchParams();
    const locationParam = searchParams.get('location');
    if (locationParam) params.set('location', locationParam);

    const queryString = params.toString();
    navigate(targetPath + (queryString ? '?' + queryString : ''));
  };

  return (
    <div className="mb-4">
      <div
        style={{
          display: 'inline-flex',
          border: '1px solid #1E2D4D',
          borderRadius: '9999px',
          backgroundColor: '#FAF7F0',
          overflow: 'hidden',
        }}
      >
        {segments.map((seg) => {
          const isActive = seg.key === activePillar;
          return (
            <button
              key={seg.key}
              onClick={() => handleClick(seg.key)}
              style={{
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                cursor: isActive ? 'default' : 'pointer',
                backgroundColor: isActive ? '#1E2D4D' : '#FAF7F0',
                color: isActive ? '#FAF7F0' : '#1E2D4D',
                transition: 'background-color 150ms, color 150ms',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#A08C5A';
                if (!isActive) e.currentTarget.style.color = '#FAF7F0';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#FAF7F0';
                if (!isActive) e.currentTarget.style.color = '#1E2D4D';
              }}
            >
              {seg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
