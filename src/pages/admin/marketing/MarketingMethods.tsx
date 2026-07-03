/**
 * MarketingMethods — Prospecting Methods
 *
 * Route: /admin/marketing/methods
 * Access: salesOnly (SalesGuard)
 */
import AdminBreadcrumb from '../../../components/admin/AdminBreadcrumb';

export default function MarketingMethods() {
  return (
    <div>
      <AdminBreadcrumb
        items={[
          { label: 'Admin', path: '/admin' },
          { label: 'Marketing', path: '/admin/marketing/accounts' },
          { label: 'Methods' },
        ]}
      />
      <h1
        style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 24,
          fontWeight: 700,
          color: '#0B1628',
          marginBottom: 8,
        }}
      >
        Prospecting Methods
      </h1>
      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: '#6B7280' }}>
        Coming in build.
      </p>
    </div>
  );
}
