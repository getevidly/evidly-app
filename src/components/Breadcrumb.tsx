import React from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

// Manual breadcrumb — disabled in favor of AutoBreadcrumb in Layout.
// Kept as a no-op so existing imports don't break.
export const Breadcrumb: React.FC<BreadcrumbProps> = () => null;
