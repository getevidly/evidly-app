/**
 * MarketingAccounts — Prospecting Accounts
 *
 * Route: /admin/marketing/accounts
 * Access: salesOnly (SalesGuard)
 */
import AdminBreadcrumb from '../../../components/admin/AdminBreadcrumb';

export default function MarketingAccounts() {
  return (
    <div>
      <AdminBreadcrumb
        items={[
          { label: 'Admin', path: '/admin' },
          { label: 'Marketing', path: '/admin/marketing/accounts' },
          { label: 'Accounts' },
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
        Prospecting Accounts
      </h1>
      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, color: '#6B7280' }}>
        Coming in build.
      </p>
    </div>
  );
}
