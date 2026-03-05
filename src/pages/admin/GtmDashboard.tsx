import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';

export default function GtmDashboard() {
  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <AdminBreadcrumb crumbs={[{ label: 'GTM Dashboard' }]} />
      <h1 className="text-2xl font-bold text-[#1E2D4D] mb-1">GTM Dashboard</h1>
      <p className="text-sm text-gray-500 mb-8">
        Go-to-market metrics — pipeline velocity, conversion rates, channel performance.
      </p>
      <div className="text-center py-20 text-gray-400">
        <p className="text-sm font-medium">Coming soon.</p>
        <p className="text-xs mt-1">GTM metrics will appear here once data sources are connected.</p>
      </div>
    </div>
  );
}
