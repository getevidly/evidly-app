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
    <div className="py-3 px-6 text-sm flex items-center gap-2 border-b border-gray-200 bg-white">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-gray-400">›</span>}
          {item.href ? (
            <span onClick={() => navigate(item.href!)} className="text-[#1e4d6b] hover:underline cursor-pointer">{item.label}</span>
          ) : (
            <span className="text-gray-500">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
