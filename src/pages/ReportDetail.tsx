import { lazy, Suspense } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { getReportBySlug } from '../config/reportConfig';
import { BODY_TEXT, MUTED } from '../components/dashboard/shared/constants';

const F: React.CSSProperties = { fontFamily: "'DM Sans', 'Inter', sans-serif" };

// Lazy-loaded report components
const REPORT_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  'executive-summary': lazy(() => import('../components/reports/ExecutiveSummary')),
  'inspection-readiness': lazy(() => import('../components/reports/InspectionReadiness')),
  'vendor-service-summary': lazy(() => import('../components/reports/VendorServiceSummary')),
  'document-status': lazy(() => import('../components/reports/DocumentStatus')),
  'equipment-service-history': lazy(() => import('../components/reports/EquipmentServiceHistory')),
  'temperature-log-summary': lazy(() => import('../components/reports/TemperatureLogSummary')),
  'haccp-summary': lazy(() => import('../components/reports/HACCPSummary')),
  'insurance-documentation': lazy(() => import('../components/reports/InsuranceDocumentation')),
  'training-certification': lazy(() => import('../components/reports/TrainingCertification')),
  'grease-trap-fog': lazy(() => import('../components/reports/GreaseTrapFOG')),
  'kitchen-to-community': lazy(() => import('../components/reports/KitchenToCommunityImpact')),
  'location-comparison': lazy(() => import('../components/reports/LocationComparison')),
};

export function ReportDetail() {
  const { reportType } = useParams<{ reportType: string }>();
  const { userRole } = useRole();
  const navigate = useNavigate();

  const config = getReportBySlug(reportType || '');

  if (!config) {
    return <Navigate to="/reports" replace />;
  }

  // Role check
  if (userRole !== 'platform_admin' && !config.allowedRoles.includes(userRole)) {
    return <Navigate to="/reports" replace />;
  }

  const ReportComponent = REPORT_COMPONENTS[config.slug];
  if (!ReportComponent) {
    return <Navigate to="/reports" replace />;
  }

  return (
    <div className="space-y-4 p-1" style={F}>
      {/* Back navigation */}
      <button
        type="button"
        onClick={() => navigate('/reports')}
        className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
        style={{ color: MUTED }}
      >
        <ArrowLeft size={14} />
        Back to Reports
      </button>

      {/* Report title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: BODY_TEXT }}>
          {config.title}
        </h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>{config.subtitle}</p>
      </div>

      {/* Report content */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        }
      >
        <ReportComponent config={config} />
      </Suspense>
    </div>
  );
}

export default ReportDetail;
