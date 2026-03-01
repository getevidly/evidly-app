import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ShieldX } from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { ReportCard } from '../components/reports/ReportCard';
import { getReportsForRole, CATEGORY_LABELS, type ReportCategory } from '../config/reportConfig';
import { BODY_TEXT, MUTED } from '../components/dashboard/shared/constants';

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
          <ShieldX className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Reports Not Available</h2>
          <p className="text-gray-600 text-center max-w-md">
            Reports are available to managers and above. Contact your manager for access.
          </p>
        </div>
      </div>
    );
  }

  // Live mode — empty state
  if (!isDemoMode) {
    return (
      <div className="space-y-6 p-1" style={F}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: BODY_TEXT }}>Reports</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>See where things stand across your kitchen operations</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <FileText className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No reports available yet</h2>
          <p className="text-gray-500 text-center max-w-md">
            Add locations and complete checklists to generate reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1" style={F}>
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: BODY_TEXT }}>Reports</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>
          See where things stand across your kitchen operations
        </p>
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
