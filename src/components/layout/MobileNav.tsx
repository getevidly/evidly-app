/**
 * MobileNav — the single mobile bottom navigation for the client shell.
 *
 * Replaces MobileTabBar, MobileBottomNav and QuickActionBar, and retires the
 * floating voice FAB that MobileTabBar carried. One bar, one More drawer,
 * one source of role truth (useRole().userRole).
 *
 * Five equal slots. Home and More are pinned at 1 and 5; 2-4 come from
 * getRoleSlots(), which is exported on its own so per-user tab overrides can
 * layer on top of it later without touching this component.
 */

import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Flame,
  UtensilsCrossed,
  FileText,
  ClipboardList,
  Thermometer,
  AlertTriangle,
  Wrench,
  MoreHorizontal,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRole, type UserRole } from '../../contexts/RoleContext';
import { useAuth } from '../../contexts/AuthContext';
import { useKeyboardOpen } from '../../hooks/useKeyboardOpen';
import { useKitchenType } from '../../hooks/useKitchenType';
import { getRoleConfig, type SidebarSection, type NavItem } from '../../config/sidebarConfig';

const EMBER = '#B24A2E';
const NAVY = '#1E2D4D';
const MUTED = '#6B7689';
const LINE = 'rgba(30,45,77,0.10)';

export const MOBILE_NAV_HEIGHT = 56;

// ── Slot catalog ────────────────────────────────────────────────
export interface NavSlot {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
}

const SLOTS: Record<string, NavSlot> = {
  home:       { id: 'home',       label: 'Home',       path: '/dashboard',      icon: Home },
  fire:       { id: 'fire',       label: 'Fire',       path: '/facility-safety', icon: Flame },
  food:       { id: 'food',       label: 'Food',       path: '/food-safety',    icon: UtensilsCrossed },
  facilities: { id: 'facilities', label: 'Facilities', path: '/equipment',      icon: Wrench },
  records:    { id: 'records',    label: 'Records',    path: '/documents',      icon: FileText },
  checklists: { id: 'checklists', label: 'Checklists', path: '/checklists',     icon: ClipboardList },
  temps:      { id: 'temps',      label: 'Temps',      path: '/temp-logs',      icon: Thermometer },
  report:     { id: 'report',     label: 'Report',     path: '/incidents',      icon: AlertTriangle },
};

/**
 * Records for facilities_manager lands on the fire-filtered record list —
 * the same param the dashboard's Fire Marshal asker chip uses.
 */
const FACILITIES_RECORDS_PATH = '/documents?asker=fire-marshal';

/**
 * Role -> the three middle slots. Home and More are added around these.
 *
 * SEAM: per-user tab customisation layers on top of this function. Keep the
 * return shape (an ordered array of exactly three slot keys) stable.
 */
export function getRoleSlots(role: UserRole): NavSlot[] {
  switch (role) {
    case 'owner_operator':
    case 'executive':
    case 'compliance_manager':
    case 'platform_admin':
      return [SLOTS.fire, SLOTS.food, SLOTS.records];
    case 'chef':
    case 'kitchen_manager':
      return [SLOTS.food, SLOTS.checklists, SLOTS.temps];
    case 'kitchen_staff':
      return [SLOTS.checklists, SLOTS.temps, SLOTS.report];
    case 'facilities_manager':
      return [SLOTS.fire, SLOTS.facilities, { ...SLOTS.records, path: FACILITIES_RECORDS_PATH }];
    default:
      // Safe default for any role the map does not name.
      return [SLOTS.checklists, SLOTS.temps, SLOTS.records];
  }
}

// ── More drawer grouping ────────────────────────────────────────
type DrawerGroup = 'Compliance' | 'Operation' | 'Account';

const SECTION_GROUP: Record<string, DrawerGroup> = {
  'food-safety': 'Compliance',
  'fire-safety': 'Compliance',
  programs: 'Compliance',
  jurisdiction: 'Compliance',
  operations: 'Operation',
  'shift-intelligence': 'Operation',
  vendors: 'Operation',
  insights: 'Operation',
  administration: 'Account',
  tools: 'Account',
};

const TOP_ITEM_GROUP: Record<string, DrawerGroup> = {
  '/documents': 'Compliance',
  '/policies': 'Compliance',
  '/policy-lens': 'Compliance',
  '/reports': 'Compliance',
  '/portfolio': 'Operation',
  '/calendar': 'Operation',
  '/kitchen-to-community': 'Operation',
};

const GROUP_ORDER: DrawerGroup[] = ['Compliance', 'Operation', 'Account'];

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { signOut } = useAuth();
  const isKeyboardOpen = useKeyboardOpen();
  const { kitchenType } = useKitchenType();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const middle = getRoleSlots(userRole);
  const tabs = [SLOTS.home, ...middle];

  // Every destination for this role that is not already one of the five tabs.
  const groups = useMemo(() => {
    const config = getRoleConfig(userRole, kitchenType);
    const onBar = new Set(tabs.map(t => t.path.split('?')[0]));

    const buckets: Record<DrawerGroup, { section: string; items: NavItem[] }[]> = {
      Compliance: [], Operation: [], Account: [],
    };

    for (const item of config.topLevelItems || []) {
      if (onBar.has(item.path.split('?')[0])) continue;
      const g = TOP_ITEM_GROUP[item.path] || 'Operation';
      let bucket = buckets[g].find(b => b.section === '');
      if (!bucket) { bucket = { section: '', items: [] }; buckets[g].push(bucket); }
      bucket.items.push(item);
    }

    for (const section of config.sections as SidebarSection[]) {
      const items = section.items.filter(i => !onBar.has(i.path.split('?')[0]));
      if (items.length === 0) continue;
      const g = SECTION_GROUP[section.id] || 'Operation';
      buckets[g].push({ section: section.label, items });
    }

    return buckets;
  }, [userRole, kitchenType, tabs]);

  // Onboarding is a full-screen flow — no bar.
  if (location.pathname === '/onboarding') return null;
  if (isKeyboardOpen) return null;

  const isActive = (path: string) => {
    const base = path.split('?')[0];
    return location.pathname === base || location.pathname.startsWith(base + '/');
  };

  const go = (path: string) => { setDrawerOpen(false); navigate(path); };

  const handleSignOut = async () => {
    setDrawerOpen(false);
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* More drawer */}
      <div
        className={`fixed left-0 right-0 bottom-0 bg-white rounded-t-3xl z-[61] lg:hidden transition-transform duration-300 ease-out ${
          drawerOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
        style={{ maxHeight: '78vh', boxShadow: '0 -8px 32px rgba(11,22,40,0.16)' }}
        role="dialog"
        aria-modal="true"
        aria-label="More destinations"
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${LINE}` }}>
          <h2 className="text-[15px] font-semibold" style={{ color: NAVY }}>More</h2>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close"
            className="w-11 h-11 flex items-center justify-center rounded-full active:bg-[#1E2D4D]/5"
          >
            <X className="h-5 w-5" style={{ color: MUTED }} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-2" style={{ maxHeight: 'calc(78vh - 124px)' }}>
          {GROUP_ORDER.map(group => {
            const blocks = groups[group];
            if (!blocks || blocks.length === 0) return null;
            return (
              <div key={group} className="mb-4">
                <div
                  className="text-[10px] tracking-[0.15em] font-semibold py-2"
                  style={{ color: MUTED, fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
                >
                  {group.toUpperCase()}
                </div>
                {blocks.map((block, bi) => (
                  <div key={group + '-' + bi} className="mb-1.5">
                    {block.section && (
                      <div className="text-[11px] font-semibold px-1 pb-1" style={{ color: 'rgba(30,45,77,0.45)' }}>
                        {block.section}
                      </div>
                    )}
                    {block.items.map(item => (
                      <button
                        key={item.id + item.path}
                        onClick={() => go(item.path)}
                        className="w-full flex items-center gap-3 px-2 rounded-lg active:bg-[#1E2D4D]/5"
                        style={{ minHeight: 44 }}
                      >
                        <span className="flex-1 text-left text-[14px]" style={{ color: NAVY }}>{item.label}</span>
                        <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'rgba(30,45,77,0.25)' }} />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3" style={{ borderTop: `1px solid ${LINE}`, paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 rounded-lg text-[14px] font-medium"
            style={{ minHeight: 44, color: '#A04040' }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* The bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white z-[55] lg:hidden"
        style={{
          borderTop: `1px solid ${LINE}`,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-label="Primary"
      >
        <div className="grid grid-cols-5" style={{ height: MOBILE_NAV_HEIGHT }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => go(tab.path)}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center justify-center gap-0.5 active:bg-[#FAF7F0]"
                style={{ minHeight: MOBILE_NAV_HEIGHT }}
              >
                <Icon className="h-5 w-5" style={{ color: active ? EMBER : MUTED }} />
                <span
                  className="text-[11px]"
                  style={{ color: active ? EMBER : MUTED, fontWeight: active ? 600 : 500 }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setDrawerOpen(v => !v)}
            aria-expanded={drawerOpen}
            className="flex flex-col items-center justify-center gap-0.5 active:bg-[#FAF7F0]"
            style={{ minHeight: MOBILE_NAV_HEIGHT }}
          >
            <MoreHorizontal className="h-5 w-5" style={{ color: drawerOpen ? EMBER : MUTED }} />
            <span
              className="text-[11px]"
              style={{ color: drawerOpen ? EMBER : MUTED, fontWeight: drawerOpen ? 600 : 500 }}
            >
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
