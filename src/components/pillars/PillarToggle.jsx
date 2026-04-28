import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';

/**
 * Mounted pillar routes — both food and fire are active as of Sprint 5d-1b.
 */
export const MOUNTED_PILLAR_ROUTES = { food: true, fire: true };

const CROSS_PILLAR_ROLES = ['owner_operator', 'executive', 'compliance_manager'];

const PILLAR_PREFIXES = [
  { key: 'food', label: 'Food Safety', prefix: '/food-safety' },
  { key: 'fire', label: 'Fire Safety', prefix: '/fire-safety' },
];

export default function PillarToggle() {
  const { userRole } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [hoveredKey, setHoveredKey] = useState(null);

  // Only render for cross-pillar roles
  if (!CROSS_PILLAR_ROLES.includes(userRole)) return null;

  // Determine which segments to show based on mounted routes
  const segments = PILLAR_PREFIXES.filter(
    (p) => MOUNTED_PILLAR_ROUTES[p.key],
  );

  // If only one segment is mounted, don't render the toggle
  if (segments.length < 2) return null;

  // Determine active pillar from pathname
  const activePillar = segments.find((s) =>
    location.pathname.startsWith(s.prefix + '/') || location.pathname === s.prefix,
  )?.key || 'food';

  const handleClick = (targetKey) => {
    if (targetKey === activePillar) return;

    const targetSegment = segments.find((s) => s.key === targetKey);
    if (!targetSegment) return;

    const currentSegment = segments.find((s) => s.key === activePillar);
    if (!currentSegment) return;

    // Extract the sub-path (e.g., /analysis) from the current pathname
    let subPath = '';
    if (location.pathname.startsWith(currentSegment.prefix + '/')) {
      subPath = location.pathname.slice(currentSegment.prefix.length);
    }

    // Build target URL preserving location query param
    const targetPath = targetSegment.prefix + subPath;
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
          const isHovered = hoveredKey === seg.key && !isActive;

          let bgColor = '#FAF7F0';
          let textColor = '#1E2D4D';
          if (isActive) {
            bgColor = '#1E2D4D';
            textColor = '#FAF7F0';
          } else if (isHovered) {
            bgColor = '#A08C5A';
            textColor = '#FAF7F0';
          }

          return (
            <button
              key={seg.key}
              onClick={() => handleClick(seg.key)}
              onMouseEnter={() => setHoveredKey(seg.key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                cursor: isActive ? 'default' : 'pointer',
                backgroundColor: bgColor,
                color: textColor,
                transition: 'background-color 150ms, color 150ms',
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
