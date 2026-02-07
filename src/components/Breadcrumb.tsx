import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const navigate = useNavigate();
  return (
    <div style={{ padding: '12px 24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ color: '#94a3b8' }}>›</span>}
          {item.href ? (
            <span onClick={() => { navigate(item.href!); }} style={{ cursor: 'pointer', color: '#1e4d6b' }}>{item.label}</span>
          ) : (
            <span style={{ color: '#64748b' }}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
