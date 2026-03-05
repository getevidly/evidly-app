import { useNavigate } from 'react-router-dom';

interface Crumb {
  label: string;
  path?: string;
}

interface AdminBreadcrumbProps {
  crumbs: Crumb[];
}

export default function AdminBreadcrumb({ crumbs }: AdminBreadcrumbProps) {
  const navigate = useNavigate();
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 12, color: '#9CA3AF', marginBottom: 20,
    }}>
      <span
        onClick={() => navigate('/admin')}
        style={{ cursor: 'pointer', color: '#A08C5A', fontWeight: 600 }}
        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
      >
        Admin
      </span>
      {crumbs.map((crumb, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#D1D5DB' }}>{'\u203A'}</span>
          {crumb.path && i < crumbs.length - 1 ? (
            <span
              onClick={() => navigate(crumb.path!)}
              style={{ cursor: 'pointer', color: '#6B7280' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#1E2D4D')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
            >
              {crumb.label}
            </span>
          ) : (
            <span style={{ color: '#1E2D4D', fontWeight: 600 }}>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
