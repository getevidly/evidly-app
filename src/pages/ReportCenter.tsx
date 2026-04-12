import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, Download } from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { ReportCard } from '../components/reports/ReportCard';
import { getReportsForRole, CATEGORY_LABELS, type ReportCategory } from '../config/reportConfig';
import { BODY_TEXT, MUTED } from '../components/dashboard/shared/constants';
import { exportCompliancePackage } from '../lib/compliancePackagePdf';

const F: React.CSSProperties = { fontFamily: "'DM Sans', 'Inter', sans-serif" };
const CATEGORIES: ReportCategory[] = ['overview', 'compliance', 'operations', 'team', 'community'];

export function ReportCenter() {
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { isDemoMode } = useDemo();
  const { showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const reports = getReportsForRole(userRole);

  // Kitchen staff — no access
  if (userRole === 'kitchen_staff') {
    return (
      <div className="p-6" style={F}>
        <div className="mt-8 flex flex-col items-center justify-center py-12">
          <ShieldX className="h-16 w-16 text-[#1E2D4D]/30 mb-4" />
          <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Reports Not Available</h2>
          <p className="text-[#1E2D4D]/70 text-center max-w-md">
            Reports are available to managers and above. Contact your manager for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1" style={F}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: BODY_TEXT }}>Reports</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>
            See where things stand across your kitchen operations
          </p>
        </div>
        <button
          onClick={() => exportCompliancePackage()}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
          style={{ background: '#1E2D4D', color: '#fff' }}
        >
          <Download size={14} /> Export Compliance Package
        </button>
      </div>

      {/* Report cards grouped by category */}
      {CATEGORIES.map(cat => {
        const catReports = reports.filter(r => r.category === cat);
        if (catReports.length === 0) return null;
        return (
          <section key={cat}>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: MUTED }}>
              {CATEGORY_LABELS[cat]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catReports.map(r => (
                <ReportCard
                  key={r.slug}
                  config={r}
                  hasData={isDemoMode}
                  onClick={() => navigate(`/reports/${r.slug}`)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          feature={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}

export default ReportCenter;
