/**
 * InspectorMode — MOBILE-EMOTIONAL-01
 *
 * Emergency "Inspector is here" screen that surfaces compliance documents
 * in one tap. Quick access cards link to real data pages.
 *
 * Route: /inspector-mode
 * Access: owner_operator, kitchen_manager, compliance_manager, chef
 */
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

const QUICK_ACCESS = [
  { label: 'Temperature Logs', icon: '🌡', url: '/temp-logs' },
  { label: 'Checklists', icon: '✅', url: '/checklists' },
  { label: 'Food Handler Cards', icon: '📋', url: '/documents?type=food_handler' },
  { label: 'CFPM Certificate', icon: '🏅', url: '/documents?type=cfpm' },
  { label: 'Hood Cleaning Cert', icon: '🔧', url: '/documents?type=kec_certificate' },
  { label: 'Corrective Actions', icon: '⚠️', url: '/corrective-actions' },
];

export function InspectorMode() {
  const navigate = useNavigate();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const handleExport = () => {
    guardAction('export', 'Compliance Package', () => {
      toast.success('Compliance package export started');
    });
  };

  return (
    <div style={{ background: NAVY, minHeight: '100vh' }} className="p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 mb-4 text-sm font-medium"
          style={{ color: 'rgba(250,247,240,0.6)' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Emergency header */}
        <div
          className="text-center rounded-lg mb-5"
          style={{
            background: '#991B1B',
            color: '#FAF7F0',
            padding: '14px 16px',
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
            🔍 Inspector Mode Active
          </p>
          <p style={{ fontSize: 12, margin: '4px 0 0', opacity: 0.8 }}>
            Showing your compliance documents
          </p>
        </div>

        {/* Quick access cards */}
        <div className="space-y-2.5 mb-5">
          {QUICK_ACCESS.map(item => (
            <Link
              key={item.label}
              to={item.url}
              className="flex items-center rounded-lg transition-colors"
              style={{
                background: 'rgba(255,255,255,0.08)',
                padding: '16px',
                color: '#FAF7F0',
                textDecoration: 'none',
                minHeight: 56,
              }}
            >
              <span style={{ fontSize: 24, marginRight: 12 }}>{item.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{item.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: 18, opacity: 0.5 }}>→</span>
            </Link>
          ))}
        </div>

        {/* Export compliance package */}
        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 rounded-lg font-bold transition-colors"
          style={{
            height: 56,
            background: GOLD,
            color: '#FAF7F0',
            border: 'none',
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          <Download size={18} />
          Export Full Compliance Package
        </button>

        {showUpgrade && (
          <DemoUpgradePrompt
            action={upgradeAction}
            feature={upgradeFeature}
            onClose={() => setShowUpgrade(false)}
          />
        )}
      </div>
    </div>
  );
}

export default InspectorMode;
