import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import { NFPAReminder } from '../components/ui/NFPAReminder';
import { ServiceCostPanel, type ServiceState } from '../components/intelligence/ServiceCostPanel';
import { CostOfInactionEngine } from '../components/intelligence/CostOfInactionEngine';
import OwnerOperatorDashboard from '../components/dashboard/OwnerOperatorDashboard';
import ExecutiveDashboard from '../components/dashboard/ExecutiveDashboard';
import ComplianceManagerDashboard from '../components/dashboard/ComplianceManagerDashboard';
import KitchenManagerDashboard from '../components/dashboard/KitchenManagerDashboard';
import KitchenStaffTaskList from '../components/dashboard/KitchenStaffTaskList';
import FacilitiesDashboardNew from '../components/dashboard/FacilitiesDashboardNew';

// ── Self-Diagnosis Quick-Action Card ─────────────────────

const SelfDiagCard: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div
    onClick={onStart}
    style={{
      background: 'linear-gradient(135deg, #FEFDF8, #FEFCF4)',
      border: '1px solid rgba(160,140,90,.35)',
      borderLeft: '4px solid var(--gold)',
      borderRadius: '12px',
      padding: '18px 20px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
      transition: 'border-color 0.15s',
      boxShadow: '0 1px 3px rgba(160,140,90,.1)',
    }}
    onMouseEnter={e => (e.currentTarget.style.borderColor = '#C4A96E')}
    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(160,140,90,.35)')}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <span style={{ fontSize: '28px' }}>{'\uD83D\uDD27'}</span>
      <div>
        <p style={{
          color: 'var(--text-primary)', fontSize: '15px', fontWeight: 800,
          margin: 0, fontFamily: 'system-ui',
        }}>
          Kitchen Problem?
        </p>
        <p style={{
          color: 'var(--text-secondary)', fontSize: '12px', margin: '3px 0 0',
          fontFamily: 'system-ui',
        }}>
          Troubleshoot equipment {'\u00b7'} Notify your vendor {'\u00b7'} Attach photos & video {'\u2014'} in under 2 minutes
        </p>
      </div>
    </div>
    <div style={{
      background: '#A08C5A',
      borderRadius: '8px',
      padding: '8px 16px',
      whiteSpace: 'nowrap' as const,
      flexShrink: 0,
    }}>
      <span style={{
        color: '#ffffff', fontSize: '12px',
        fontWeight: 700, fontFamily: 'system-ui',
      }}>
        Start Diagnosis {'\u2192'}
      </span>
    </div>
  </div>
);

// ── Dashboard ────────────────────────────────────────────

export function Dashboard() {
  const { userRole } = useRole();
  const navigate = useNavigate();
  const [serviceStates, setServiceStates] = useState<ServiceState[]>([]);

  const isStaff = userRole === 'kitchen_staff';

  // Role-specific dashboard content
  const renderDashboard = () => {
    switch (userRole) {
      case 'owner_operator':
        return <OwnerOperatorDashboard />;
      case 'executive':
        return <ExecutiveDashboard />;
      case 'compliance_manager':
        return <ComplianceManagerDashboard />;
      case 'chef':
        return <KitchenManagerDashboard />;
      case 'facilities_manager':
        return <FacilitiesDashboardNew />;
      case 'kitchen_manager':
        return <KitchenManagerDashboard />;
      case 'kitchen_staff':
        return <KitchenStaffTaskList />;
      default:
        return <OwnerOperatorDashboard />;
    }
  };

  return (
    <div>
      {/* ── ABOVE THE FOLD — always visible on login ── */}
      <div style={{ background: 'var(--bg-main)', padding: '20px 24px 4px' }}>
        <div className="max-w-5xl mx-auto">

          {/* 1. NFPA Monthly Reminder — not for staff */}
          {!isStaff && <NFPAReminder />}

          {/* 2. Self-Diagnosis Quick Action — all roles */}
          <SelfDiagCard onStart={() => navigate('/self-diagnosis')} />

          {/* 3. Service ROI — CPP Passive Sales — not for staff */}
          {!isStaff && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: '16px',
              }}>
                <div>
                  <p style={{
                    color: 'var(--text-primary)', fontSize: '14px', fontWeight: 800,
                    margin: 0, fontFamily: 'system-ui',
                  }}>
                    {'\u26A1'} Service Cost & Risk Calculator
                  </p>
                  <p style={{
                    color: 'var(--text-secondary)', fontSize: '11px', margin: '3px 0 0',
                    fontFamily: 'system-ui',
                  }}>
                    Enter your operation details to calculate your actual dollar exposure
                  </p>
                </div>
                <span style={{
                  background: '#A08C5A20', border: '1px solid #A08C5A60',
                  borderRadius: '6px', padding: '3px 10px',
                  color: '#A08C5A', fontSize: '10px', fontWeight: 700,
                  fontFamily: 'system-ui',
                }}>
                  CPP Partner
                </span>
              </div>
              <ServiceCostPanel onStateChange={setServiceStates} />
              <CostOfInactionEngine serviceStates={serviceStates} />
            </div>
          )}
        </div>
      </div>

      {/* ── EXISTING DASHBOARD CONTENT BELOW ── */}
      {renderDashboard()}
    </div>
  );
}
