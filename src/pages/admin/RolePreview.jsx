import { useState, Suspense, lazy } from 'react';
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink, ChevronRight, Copy, Check } from 'lucide-react';
import { RoleOverrideProvider } from '../../contexts/RoleContext';
import { DemoOverrideProvider } from '../../contexts/DemoContext';
import { Layout } from '../../components/layout/Layout';

const PreviewDashboard = lazy(() => import('../../pages/Dashboard').then(m => ({ default: m.Dashboard })));

const ROLES = [
  { value: 'owner_operator', label: 'Owner / Operator', description: 'Full access — all locations, all reports, billing' },
  { value: 'executive', label: 'Executive', description: 'Read-only portfolio view, no configuration' },
  { value: 'compliance_manager', label: 'Compliance Manager', description: 'Compliance data, inspection records, violations' },
  { value: 'facilities_manager', label: 'Facilities Manager', description: 'Equipment, fire safety, vendor records' },
  { value: 'chef', label: 'Chef', description: 'Food safety, temp logs, HACCP checklists' },
  { value: 'kitchen_manager', label: 'Kitchen Manager', description: 'Daily ops, staff tasks, checklists' },
  { value: 'kitchen_staff', label: 'Kitchen Staff', description: 'Assigned checklists and temp logs only' },
];

const DEVICES = [
  { id: 'desktop', icon: Monitor, label: 'Desktop', width: '100%' },
  { id: 'tablet', icon: Tablet, label: 'Tablet', width: '768px' },
  { id: 'mobile', icon: Smartphone, label: 'Mobile', width: '390px' },
];

function PreviewContent({ role, renderKey }) {
  return (
    <DemoOverrideProvider>
      <RoleOverrideProvider role={role}>
        {/* transform: scale(1) creates a containing block for position:fixed children
            so the Sidebar stays within the preview area instead of overlaying the viewport */}
        <div style={{ position: 'relative', width: '100%', height: '100%', transform: 'scale(1)', overflow: 'hidden' }}>
          <Layout>
            <Suspense fallback={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#A08C5A', borderRadius: '50%', margin: '0 auto' }} />
                  <p style={{ marginTop: 12, fontSize: 13, color: '#6B7280' }}>Loading preview…</p>
                </div>
              </div>
            }>
              <PreviewDashboard key={`${role}-${renderKey}`} />
            </Suspense>
          </Layout>
        </div>
      </RoleOverrideProvider>
    </DemoOverrideProvider>
  );
}

export default function RolePreview() {
  const [selectedRole, setSelectedRole] = useState('owner_operator');
  const [device, setDevice] = useState('desktop');
  const [copied, setCopied] = useState(false);
  const [sideByMode, setSideByMode] = useState(false);
  const [sideByRole, setSideByRole] = useState('kitchen_staff');
  const [renderKey, setRenderKey] = useState(0);

  const buildUrl = (role) => {
    return `${window.location.origin}/dashboard?__rolePreview=${role}`;
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(buildUrl(selectedRole));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => setRenderKey(k => k + 1);

  const currentDevice = DEVICES.find(d => d.id === device);
  const currentRoleInfo = ROLES.find(r => r.value === selectedRole);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F9FAFB', margin: '-36px -44px', width: 'calc(100% + 88px)' }}>

      {/* Top Control Bar */}
      <div style={{
        background: '#1E2D4D',
        color: '#fff',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0,
        borderBottom: '2px solid #A08C5A',
        flexWrap: 'wrap',
      }}>
        {/* Role Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#A08C5A', textTransform: 'uppercase' }}>
            Role
          </span>
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            style={{
              background: '#0F1F35',
              color: '#fff',
              border: '1px solid #374151',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: '#9CA3AF', maxWidth: 220 }}>
            {currentRoleInfo?.description}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Side-by-Side Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Side-by-side</span>
          <button
            onClick={() => setSideByMode(!sideByMode)}
            style={{
              background: sideByMode ? '#A08C5A' : '#374151',
              border: 'none',
              borderRadius: 20,
              width: 36,
              height: 20,
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute',
              top: 2,
              left: sideByMode ? 18 : 2,
              width: 16,
              height: 16,
              background: '#fff',
              borderRadius: '50%',
              transition: 'left 0.2s',
            }} />
          </button>
          {sideByMode && (
            <select
              value={sideByRole}
              onChange={e => setSideByRole(e.target.value)}
              style={{
                background: '#0F1F35',
                color: '#fff',
                border: '1px solid #374151',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {ROLES.filter(r => r.value !== selectedRole).map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Device Toggles */}
        <div style={{ display: 'flex', gap: 4, background: '#0F1F35', borderRadius: 8, padding: 3 }}>
          {DEVICES.map(d => {
            const Icon = d.icon;
            return (
              <button
                key={d.id}
                onClick={() => setDevice(d.id)}
                title={d.label}
                style={{
                  background: device === d.id ? '#A08C5A' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 8px',
                  cursor: 'pointer',
                  color: device === d.id ? '#fff' : '#9CA3AF',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Icon size={15} />
              </button>
            );
          })}
        </div>

        {/* Refresh + Copy URL + Open Tab */}
        <button
          onClick={handleRefresh}
          title="Refresh preview"
          style={{ background: 'transparent', border: '1px solid #374151', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}
        >
          <RefreshCw size={14} />
        </button>

        <button
          onClick={handleCopyUrl}
          title="Copy preview URL"
          style={{ background: 'transparent', border: '1px solid #374151', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          {copied ? <Check size={14} color="#4ADE80" /> : <Copy size={14} />}
          <span style={{ fontSize: 11 }}>{copied ? 'Copied' : 'Copy URL'}</span>
        </button>

        <a
          href={buildUrl(selectedRole)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: 'transparent', border: '1px solid #374151', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', fontSize: 11 }}
        >
          <ExternalLink size={14} />
          Open tab
        </a>
      </div>

      {/* Role Description Banner */}
      <div style={{
        background: '#FFF8E7',
        borderBottom: '1px solid #F3D47A',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        color: '#92400E',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700 }}>ROLE PREVIEW MODE</span>
        <ChevronRight size={12} />
        <span>Previewing as <strong>{currentRoleInfo?.label}</strong> — {currentRoleInfo?.description}. Dashboard renders directly with role-specific data.</span>
        {sideByMode && (
          <>
            <span style={{ marginLeft: 16, color: '#4B5563' }}>|</span>
            <span style={{ marginLeft: 16 }}>Side-by-side: <strong>{ROLES.find(r => r.value === sideByRole)?.label}</strong></span>
          </>
        )}
      </div>

      {/* Preview Area */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        background: '#E5E7EB',
        gap: sideByMode ? 8 : 0,
        padding: sideByMode ? '8px' : 0,
      }}>
        {/* Primary preview */}
        <div style={{
          width: sideByMode ? '50%' : currentDevice?.width,
          height: '100%',
          background: '#fff',
          boxShadow: sideByMode ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
          borderRadius: sideByMode ? 8 : 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s',
        }}>
          {sideByMode && (
            <div style={{ background: '#1E2D4D', color: '#A08C5A', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '6px', letterSpacing: '0.06em', flexShrink: 0 }}>
              {currentRoleInfo?.label.toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <PreviewContent role={selectedRole} renderKey={renderKey} />
          </div>
        </div>

        {/* Side-by-side secondary preview */}
        {sideByMode && (
          <div style={{
            width: '50%',
            height: '100%',
            background: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            borderRadius: 8,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ background: '#1E2D4D', color: '#A08C5A', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '6px', letterSpacing: '0.06em', flexShrink: 0 }}>
              {ROLES.find(r => r.value === sideByRole)?.label.toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <PreviewContent role={sideByRole} renderKey={renderKey} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
