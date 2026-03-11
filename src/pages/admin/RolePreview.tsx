/**
 * RolePreview — Preview the platform as any user role
 * Route: /admin/role-preview
 * Admin only — display-only, no real auth changes
 */
import { useState } from 'react';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { getRoleConfig, DEMO_ROLES } from '../../config/sidebarConfig';
import type { UserRole } from '../../contexts/RoleContext';
import type { SidebarSection, NavItem } from '../../config/sidebarConfig';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E5E7EB';

// Exclude platform_admin from preview — that's the current user
const PREVIEW_ROLES = DEMO_ROLES.filter(r => r.role !== 'platform_admin');

type ViewMode = 'single' | 'side-by-side';

function RolePanel({ role, label }: { role: UserRole; label: string }) {
  const config = getRoleConfig(role);
  const home = config.home;
  const topLevel = config.topLevelItems || [];
  const sections = config.sections;

  return (
    <div style={{ flex: 1, minWidth: 0, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Preview banner */}
      <div style={{
        background: GOLD,
        color: '#fff',
        padding: '6px 16px',
        fontSize: 12,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: '0.05em',
      }}>
        PREVIEWING AS: {label} — READ ONLY
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Mini sidebar */}
        <div style={{
          width: 220,
          flexShrink: 0,
          background: '#07111F',
          padding: '16px 0',
          overflowY: 'auto',
          maxHeight: 600,
        }}>
          {/* Home item */}
          <div style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
            {home.icon} {home.label}
          </div>
          <div style={{ fontSize: 10, color: TEXT_MUTED, padding: '0 16px 12px', lineHeight: 1.5 }}>
            {home.description}
          </div>

          {/* Top-level items */}
          {topLevel.length > 0 && (
            <div style={{ borderTop: '1px solid #1E293B', padding: '8px 0' }}>
              {topLevel.map(item => (
                <NavItemRow key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* Sections */}
          {sections.map(sec => (
            <SectionBlock key={sec.id} section={sec} />
          ))}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, background: '#F4F6FA', padding: 24, overflowY: 'auto', maxHeight: 600 }}>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{label} Dashboard</div>
            <div style={{ fontSize: 12, color: TEXT_SEC, marginBottom: 20 }}>{home.description}</div>

            {/* Section summary */}
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Accessible Sections
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {sections.map(sec => (
                <div key={sec.id} style={{
                  padding: '10px 14px',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  background: '#FAFBFC',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 4 }}>
                    {sec.icon} {sec.label}
                  </div>
                  <div style={{ fontSize: 10, color: TEXT_MUTED }}>
                    {sec.items.length} item{sec.items.length !== 1 ? 's' : ''}
                    {sec.items.length > 0 && (
                      <span> — {sec.items.slice(0, 3).map(i => i.label).join(', ')}{sec.items.length > 3 ? '...' : ''}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Permission summary */}
            <div style={{ marginTop: 20, padding: '14px 16px', background: '#FDF8EE', border: `1px solid #E8D9B8`, borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Role Summary
              </div>
              <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6 }}>
                <div><strong>Sections:</strong> {sections.length}</div>
                <div><strong>Total nav items:</strong> {sections.reduce((sum, s) => sum + s.items.length, 0) + topLevel.length}</div>
                <div><strong>Top-level shortcuts:</strong> {topLevel.length > 0 ? topLevel.map(i => i.label).join(', ') : 'None'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionBlock({ section }: { section: SidebarSection }) {
  return (
    <div style={{ borderTop: '1px solid #1E293B' }}>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        padding: '10px 16px 4px',
      }}>
        {section.icon} {section.label}
      </div>
      {section.items.map(item => (
        <NavItemRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function NavItemRow({ item }: { item: NavItem }) {
  return (
    <div style={{
      padding: '5px 16px',
      fontSize: 11,
      color: '#94A3B8',
      cursor: 'default',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}>
      <span>{item.label}</span>
      {item.badge && (
        <span style={{
          fontSize: 8,
          fontWeight: 700,
          padding: '1px 5px',
          borderRadius: 8,
          background: 'rgba(160,140,90,0.2)',
          color: GOLD,
        }}>
          {item.badge}
        </span>
      )}
    </div>
  );
}

export default function RolePreview() {
  useDemoGuard();
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [leftRole, setLeftRole] = useState<UserRole>('owner_operator');
  const [rightRole, setRightRole] = useState<UserRole>('kitchen_staff');

  const leftLabel = PREVIEW_ROLES.find(r => r.role === leftRole)?.label || leftRole;
  const rightLabel = PREVIEW_ROLES.find(r => r.role === rightRole)?.label || rightRole;

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: 13,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    background: '#fff',
    color: NAVY,
    cursor: 'pointer',
    fontWeight: 500,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <AdminBreadcrumb crumbs={[{ label: 'Role Preview' }]} />

      {/* Header */}
      <div>
        <h1 style={{
          fontSize: 22,
          fontWeight: 800,
          color: NAVY,
          fontFamily: 'Syne, DM Sans, sans-serif',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          Role Preview
        </h1>
        <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
          Preview the platform as any user role — no real user required
        </p>
      </div>

      {/* Controls bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: '#fff',
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
      }}>
        {/* Left role selector */}
        <select
          value={leftRole}
          onChange={e => setLeftRole(e.target.value as UserRole)}
          style={selectStyle}
        >
          {PREVIEW_ROLES.map(r => (
            <option key={r.role} value={r.role}>{r.label}</option>
          ))}
        </select>

        {viewMode === 'side-by-side' && (
          <>
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>vs</span>
            <select
              value={rightRole}
              onChange={e => setRightRole(e.target.value as UserRole)}
              style={selectStyle}
            >
              {PREVIEW_ROLES.map(r => (
                <option key={r.role} value={r.role}>{r.label}</option>
              ))}
            </select>
          </>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 0, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
          {(['single', 'side-by-side'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: viewMode === mode ? 700 : 400,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === mode ? NAVY : '#fff',
                color: viewMode === mode ? '#fff' : TEXT_SEC,
                transition: 'all 0.15s',
              }}
            >
              {mode === 'single' ? 'Single View' : 'Side-by-Side'}
            </button>
          ))}
        </div>
      </div>

      {/* Preview area */}
      <div style={{ display: 'flex', gap: 16 }}>
        <RolePanel role={leftRole} label={leftLabel} />
        {viewMode === 'side-by-side' && (
          <RolePanel role={rightRole} label={rightLabel} />
        )}
      </div>
    </div>
  );
}
