/**
 * HubCard — Reusable card for hub/category landing pages.
 *
 * Displays a sidebar NavItem as a clickable card with emoji icon,
 * label, description, and optional badge.
 */

import { useNavigate } from 'react-router-dom';
import type { NavItem } from '../../config/sidebarConfig';

interface HubCardProps {
  item: NavItem;
}

export function HubCard({ item }: HubCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(item.path)}
      className="group relative flex flex-col text-left p-5 rounded-xl border transition-all duration-200 hover:shadow-md"
      style={{
        backgroundColor: 'var(--bg-card, #FFFFFF)',
        borderColor: 'var(--border, #D1D9E6)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#d4af37';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border, #D1D9E6)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* Badge */}
      {item.badge && (
        <span
          className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
          style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)', color: '#A08C5A' }}
        >
          {item.badge}
        </span>
      )}

      {/* Icon */}
      <span className="text-2xl mb-3" role="img" aria-hidden="true">
        {item.icon}
      </span>

      {/* Label */}
      <h3
        className="text-sm font-semibold mb-1.5 group-hover:text-[#1e4d6b] transition-colors"
        style={{ color: 'var(--text-primary, #0B1628)' }}
      >
        {item.label}
      </h3>

      {/* Description */}
      <p
        className="text-xs leading-relaxed line-clamp-3"
        style={{ color: 'var(--text-secondary, #3D5068)' }}
      >
        {item.description}
      </p>
    </button>
  );
}
