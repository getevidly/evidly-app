import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { EvidlyLogo } from '../ui/EvidlyLogo';
import { EvidlyIcon } from '../ui/EvidlyIcon';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import { useBranding } from '../../contexts/BrandingContext';
import { SidebarUpgradeBadge } from '../SidebarUpgradeBadge';
import { useTranslation } from '../../contexts/LanguageContext';
import { locations as demoLocations } from '../../data/demoData';
import { DEMO_LOCATION_GRADE_OVERRIDES } from '../../data/demoJurisdictions';
import {
  getNavItemsForRole,
  checkTestMode,
  LOCATION_VISIBLE_ROLES,
  SIDEBAR_SECTIONS,
  UNGROUPED_IDS,
  type SidebarNavItem,
  type SidebarSubItem,
} from '../../config/sidebarConfig';
import { checkPermission } from '../../hooks/usePermission';

// ── Sidebar item descriptions (inline, no external import) ──

const SIDEBAR_ITEM_DESCRIPTIONS: Record<string, string> = {
  'dashboard':        "Your compliance overview — scores, alerts, and today's priorities.",
  'calendar':         "Weekly and monthly view of inspections, deadlines, and scheduled tasks.",
  'my-tasks':         "Your assigned action items, corrective actions, and follow-ups.",
  'checklists':       "Daily task lists for food safety, temperature logs, and opening/closing procedures.",
  'incidents':        "Log and track safety or compliance incidents with timestamped records.",
  'temperatures':     "Manual, QR, or IoT-based temperature recording for receiving, storage, and cooking.",
  'log-temp':         "Quick-log a temperature reading for your station.",
  'iot-monitoring':   "Live sensor data from connected temperature probes and equipment monitors.",
  'equipment':        "Asset register for all kitchen equipment with service history and maintenance dates.",
  'vendors':          "Service providers assigned to your locations — hood cleaning, grease management, and more.",
  'documents':        "Compliance certificates, inspection reports, and permit documentation.",
  'haccp':            "Hazard Analysis and Critical Control Points — food safety plans and monitoring records.",
  'photos':           "Photo evidence for inspections, incidents, and compliance documentation.",
  'training':         "Staff training courses, certifications, and compliance education tracking.",
  'compliance':       "Jurisdiction-verified scoring breakdown for food safety and fire safety across all locations.",
  'self-inspection':  "Run a self-inspection using the same criteria your health department applies.",
  'inspector':        "See your location through an inspector's eyes — the same view they use during walkthroughs.",
  'ai-copilot':       "AI-powered compliance assistant for answering questions and generating action plans.",
  'regulatory':       "Track upcoming inspection windows, permit renewals, and regulatory deadlines.",
  'reporting':        "Export compliance summaries, inspection history, and documentation packages.",
  'alerts':           "Active compliance alerts and notifications requiring attention across your locations.",
  'fire-safety':      "Fire suppression system status, inspections, and NFPA 96 compliance tracking.",
  'locations':        "Add, edit, or configure locations including jurisdiction mapping and scoring methodology.",
  'benchmarks':       "Compare compliance performance across locations, regions, or time periods.",
  'risk-score':       "Insurance risk assessment based on compliance posture, incident history, and equipment status.",
  'leaderboard':      "Location and team rankings by compliance performance and daily task completion.",
  'corp-intelligence': "Executive command center — AI-powered compliance intelligence, risk modeling, and financial impact analysis.",
  'marketplace':      "Browse and connect with verified compliance service vendors in your area.",
  'team':             "Manage staff roles, access levels, and location assignments.",
  'system-admin':     "Platform administration, client onboarding, and system configuration.",
  'settings':         "Account preferences, notification settings, and platform configuration.",
  'help':             "Documentation, support, and contact options.",
  'usage-analytics':  "Platform usage metrics, adoption rates, and engagement analytics.",
};

const SIDEBAR_ITEM_DESCRIPTIONS_ES: Record<string, string> = {
  'dashboard':        "Su resumen de cumplimiento — puntuaciones, alertas y prioridades de hoy.",
  'calendar':         "Vista semanal y mensual de inspecciones, fechas límite y tareas programadas.",
  'my-tasks':         "Sus elementos de acción asignados, acciones correctivas y seguimientos.",
  'checklists':       "Listas de tareas diarias para seguridad alimentaria, registros de temperatura y procedimientos de apertura/cierre.",
  'incidents':        "Registre y dé seguimiento a incidentes de seguridad o cumplimiento con registros con marca de tiempo.",
  'temperatures':     "Registro de temperatura manual, por QR o IoT para recepción, almacenamiento y cocción.",
  'log-temp':         "Registre rápidamente una lectura de temperatura para su estación.",
  'iot-monitoring':   "Datos en vivo de sensores de sondas de temperatura y monitores de equipo conectados.",
  'equipment':        "Registro de activos para todo el equipo de cocina con historial de servicio y fechas de mantenimiento.",
  'vendors':          "Proveedores de servicio asignados a sus ubicaciones — limpieza de campanas, gestión de grasa y más.",
  'documents':        "Certificados de cumplimiento, informes de inspección y documentación de permisos.",
  'haccp':            "HACCP — planes de seguridad alimentaria y registros de monitoreo de puntos críticos de control.",
  'photos':           "Evidencia fotográfica para inspecciones, incidentes y documentación de cumplimiento.",
  'training':         "Cursos de capacitación del personal, certificaciones y seguimiento de educación en cumplimiento.",
  'compliance':       "Desglose de puntuación verificado por jurisdicción para seguridad alimentaria y contra incendios en todas las ubicaciones.",
  'self-inspection':  "Realice una auto-inspección usando los mismos criterios que aplica su departamento de salud.",
  'inspector':        "Vea su ubicación a través de los ojos de un inspector — la misma vista que usan durante los recorridos.",
  'ai-copilot':       "Asistente de cumplimiento impulsado por IA para responder preguntas y generar planes de acción.",
  'regulatory':       "Seguimiento de próximas ventanas de inspección, renovaciones de permisos y fechas límite regulatorias.",
  'reporting':        "Exporte resúmenes de cumplimiento, historial de inspecciones y paquetes de documentación.",
  'alerts':           "Alertas activas de cumplimiento y notificaciones que requieren atención en sus ubicaciones.",
  'fire-safety':      "Estado de sistemas de supresión de incendios, inspecciones y seguimiento de cumplimiento NFPA 96.",
  'locations':        "Agregue, edite o configure ubicaciones incluyendo mapeo de jurisdicción y metodología de puntuación.",
  'benchmarks':       "Compare el rendimiento de cumplimiento entre ubicaciones, regiones o períodos de tiempo.",
  'risk-score':       "Evaluación de riesgo de seguros basada en postura de cumplimiento, historial de incidentes y estado de equipos.",
  'leaderboard':      "Rankings de ubicaciones y equipos por rendimiento de cumplimiento y finalización de tareas diarias.",
  'corp-intelligence': "Centro de mando ejecutivo — inteligencia de cumplimiento con IA, modelado de riesgos y análisis de impacto financiero.",
  'marketplace':      "Explore y conéctese con proveedores de servicios de cumplimiento verificados en su área.",
  'team':             "Gestione roles del personal, niveles de acceso y asignaciones de ubicación.",
  'system-admin':     "Administración de la plataforma, incorporación de clientes y configuración del sistema.",
  'settings':         "Preferencias de cuenta, configuración de notificaciones y configuración de la plataforma.",
  'help':             "Documentación, soporte y opciones de contacto.",
  'usage-analytics':  "Métricas de uso de la plataforma, tasas de adopción y analítica de participación.",
};

// ── NavTooltip wrapper (fixed positioning to bypass overflow clipping) ──

const NavTooltip: React.FC<{
  itemKey: string;
  label: string;
  children: React.ReactNode;
}> = ({ itemKey, label, children }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = React.useRef<HTMLDivElement>(null);
  const { locale } = useTranslation();
  const descriptions = locale === 'es' ? SIDEBAR_ITEM_DESCRIPTIONS_ES : SIDEBAR_ITEM_DESCRIPTIONS;
  const desc = descriptions[itemKey];
  if (!desc) return <>{children}</>;

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top + rect.height / 2, left: rect.right + 12 });
    }
    setShow(true);
  };

  return (
    <div
      ref={ref}
      style={{ position: 'relative', width: '100%' }}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translateY(-50%)',
            zIndex: 99999,
            width: 220,
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '8px 12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            pointerEvents: 'none' as const,
          }}
        >
          <p style={{ margin: 0, marginBottom: 4, fontSize: 12, fontWeight: 600, color: '#ffffff' }}>
            {label}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            {desc}
          </p>
        </div>
      )}
    </div>
  );
};

// ── Jurisdiction status dot color ─────────────────────────

function getStatusDotColor(locUrlId: string): string {
  const overrideKey = `demo-loc-${locUrlId}`;
  const override = DEMO_LOCATION_GRADE_OVERRIDES[overrideKey];
  if (!override) return '#6b7280'; // gray for unknown
  const foodStatus = override.foodSafety.status;
  if (foodStatus === 'failing') return '#dc2626';
  if (foodStatus === 'at_risk') return '#d97706';
  if (foodStatus === 'passing') return '#16a34a';
  return '#6b7280';
}

const STORAGE_KEY = 'evidly-sidebar-collapsed';

// ── Nav item id → i18n key mapping ──
const NAV_I18N: Record<string, string> = {
  'dashboard': 'nav.dashboard',
  'my-tasks': 'nav.myTasks',
  'calendar': 'nav.calendar',
  'checklists': 'nav.checklists',
  'temperatures': 'nav.temperatures',
  'log-temp': 'nav.logTemp',
  'iot-monitoring': 'nav.iotMonitoring',
  'fire-safety': 'nav.fireSafety',
  'incidents': 'nav.incidents',
  'documents': 'nav.documents',
  'equipment': 'nav.equipment',
  'haccp': 'nav.haccp',
  'vendors': 'nav.vendors',
  'photos': 'nav.photos',
  'training': 'nav.training',
  'compliance': 'nav.complianceOverview',
  'self-inspection': 'nav.selfAudit',
  'inspector': 'nav.inspectorView',
  'ai-copilot': 'nav.aiCopilot',
  'regulatory': 'nav.regulatoryUpdates',
  'reporting': 'nav.reporting',
  'alerts': 'nav.alerts',
  'locations': 'nav.locations',
  'benchmarks': 'nav.benchmarks',
  'risk-score': 'nav.riskScore',
  'leaderboard': 'nav.leaderboard',
  'marketplace': 'nav.marketplace',
  'team': 'nav.team',
  'system-admin': 'nav.systemAdmin',
  'settings': 'nav.settings',
  'help': 'nav.helpSupport',
  'usage-analytics': 'nav.usageAnalytics',
};

// ── Section id → i18n key mapping ──
const SECTION_I18N: Record<string, string> = {
  'operations': 'nav.sectionDailyOps',
  'records': 'nav.sectionRecords',
  'compliance': 'nav.sectionComplInsights',
  'enterprise': 'nav.sectionEnterprise',
  'admin': 'nav.sectionAdmin',
};

// ── Sidebar component ───────────────────────────────────

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { isDemoMode, presenterMode, togglePresenterMode } = useDemo();
  const { branding } = useBranding();
  const { t } = useTranslation();

  const isTestMode = useMemo(() => checkTestMode(), []);
  const isEvidlyAdmin = false;
  const navItems = useMemo(() => {
    const roleFiltered = getNavItemsForRole(userRole, isEvidlyAdmin);
    // Permission system runs alongside role check (identical results in demo mode)
    return roleFiltered.filter(item => checkPermission(userRole, `sidebar.${item.id}`));
  }, [userRole, isEvidlyAdmin]);
  const navItemMap = useMemo(() => new Map(navItems.map(item => [item.id, item])), [navItems]);

  // ── Sub-item expansion state ──
  const [expandedNavItem, setExpandedNavItem] = useState<string | null>(null);

  // ── Collapsible section state ──
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // ── Ungrouped items (always visible at top) ──
  const ungroupedItems = useMemo(() =>
    UNGROUPED_IDS.map(id => navItemMap.get(id)).filter(Boolean) as SidebarNavItem[],
    [navItemMap]
  );

  // ── Sections with role-filtered items ──
  const sections = useMemo(() =>
    SIDEBAR_SECTIONS
      .map(section => ({
        ...section,
        items: section.itemIds
          .map(id => navItemMap.get(id))
          .filter(Boolean) as SidebarNavItem[],
      }))
      .filter(section => section.items.length > 0),
    [navItemMap]
  );

  // Location section visibility
  const showLocations = LOCATION_VISIBLE_ROLES.includes(userRole);
  const visibleLocations = useMemo(() => {
    if (!showLocations) return [];
    if (userRole === 'kitchen_staff') {
      return demoLocations.filter(loc => loc.urlId === 'downtown');
    }
    return demoLocations;
  }, [showLocations, userRole]);

  // Expose test API for Playwright
  useEffect(() => {
    if (isTestMode) {
      (window as any).__evidly_test = {
        getVisibleNavItems: () => navItems.map(i => i.id),
        getCurrentRole: () => userRole,
        getNavItemCount: () => navItems.length,
      };
      console.log(`[EvidLY Test] Sidebar rendered for role: ${userRole}`);
      console.log(`[EvidLY Test] Visible items (${navItems.length}): ${navItems.map(i => i.id).join(', ')}`);
    }
    return () => {
      if (isTestMode) {
        delete (window as any).__evidly_test;
      }
    };
  }, [isTestMode, navItems, userRole]);

  // ── Render a sub-item ──
  const renderSubItem = (sub: SidebarSubItem) => {
    const active = location.pathname === sub.route || location.pathname + location.search === sub.route;
    return (
      <div
        key={sub.id}
        onClick={() => navigate(sub.route)}
        className={`flex items-center pl-10 pr-3 py-1.5 text-[13px] font-medium rounded-md transition-colors duration-150 cursor-pointer ${
          active
            ? 'text-[#d4af37] bg-[#163a52]'
            : 'text-gray-300 hover:bg-[#163a52] hover:text-white'
        }`}
      >
        <span className="truncate">{sub.label}</span>
      </div>
    );
  };

  // ── Render a single nav item ──
  const renderNavItem = (item: SidebarNavItem) => {
    const active = location.pathname === item.route;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedNavItem === item.id;
    const testId = isTestMode ? `nav-${item.id}` : undefined;
    const i18nKey = NAV_I18N[item.id];
    const displayLabel = i18nKey ? t(i18nKey) : item.label;

    return (
      <NavTooltip key={item.id} itemKey={item.id} label={displayLabel}>
        <div>
          <div
            onClick={() => {
              if (hasSubItems) {
                setExpandedNavItem(isExpanded ? null : item.id);
              }
              navigate(item.route);
            }}
            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 cursor-pointer ${
              active
                ? 'text-[#d4af37] bg-[#163a52]'
                : 'text-gray-200 hover:bg-[#163a52] hover:text-white'
            }`}
            style={active ? { boxShadow: 'inset 3px 0 0 #d4af37' } : undefined}
            {...(testId ? { 'data-testid': testId } : {})}
          >
            <item.icon
              className={`mr-3 flex-shrink-0 h-[18px] w-[18px] ${
                active ? 'text-[#d4af37]' : 'text-gray-300 group-hover:text-white'
              }`}
            />
            <span className="flex-1 truncate">{displayLabel}</span>
            {hasSubItems && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedNavItem(isExpanded ? null : item.id);
                }}
                className="ml-1 p-0.5 rounded hover:bg-white/10 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                )}
              </span>
            )}
          </div>
          {hasSubItems && isExpanded && item.subItems!.map(sub => renderSubItem(sub))}
        </div>
      </NavTooltip>
    );
  };

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col z-[9999]">
      <div className="flex flex-col h-full" style={{ backgroundColor: branding.colors.sidebarBg }}>
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-6 py-5">
          {branding.brandName === 'EvidLY' ? (
            <>
              <EvidlyIcon size={36} />
              <div className="ml-3">
                <EvidlyLogo width={140} showTagline={false} />
              </div>
            </>
          ) : (
            <>
              <EvidlyIcon size={36} />
              <div className="ml-3">
                <span className="text-base font-bold leading-tight" style={{ color: branding.colors.sidebarText }}>
                  {branding.brandName}
                </span>
                <p className="text-[10px] text-gray-400 -mt-0.5 tracking-wide">{branding.tagline}</p>
              </div>
            </>
          )}
        </div>

        {/* Presenter mode badge */}
        {presenterMode && (
          <button
            onClick={togglePresenterMode}
            className="mx-3 mb-2 px-2 py-1.5 rounded-md text-xs font-bold text-center transition-opacity hover:opacity-80 cursor-pointer"
            style={{ backgroundColor: '#d4af37', color: '#1e4d6b' }}
            title="Click to deactivate presenter mode"
          >
            PRESENTER MODE
          </button>
        )}

        {/* Test mode badge */}
        {isTestMode && (
          <div className="mx-3 mb-2 px-2 py-1.5 rounded-md text-xs font-bold text-center bg-orange-500 text-white">
            TEST MODE
          </div>
        )}

        {/* Collapsible sidebar navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4" data-tour="sidebar-nav">
          {/* Ungrouped items (Dashboard, Calendar, My Tasks) */}
          {ungroupedItems.map(item => renderNavItem(item))}

          {ungroupedItems.length > 0 && sections.length > 0 && (
            <div className="my-2 border-t border-white/10 mx-1" />
          )}

          {/* Collapsible sections */}
          {sections.map(section => {
            const isCollapsed = !!collapsed[section.id];
            const sectionKey = SECTION_I18N[section.id];
            const sectionLabel = sectionKey ? t(sectionKey) : section.label;
            return (
              <div key={section.id} className="mb-1">
                {/* Section header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 mt-1 group cursor-pointer"
                >
                  <span
                    className="text-[10px] uppercase font-semibold tracking-wider"
                    style={{ color: '#94a3b8' }}
                  >
                    {sectionLabel}
                  </span>
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" style={{ color: '#94a3b8' }} />
                  ) : (
                    <ChevronDown className="h-3 w-3" style={{ color: '#94a3b8' }} />
                  )}
                </button>

                {/* Section items */}
                {!isCollapsed && section.items.map(item => renderNavItem(item))}
              </div>
            );
          })}
        </nav>

        {/* Locations — pinned to bottom, role-based visibility */}
        {showLocations && visibleLocations.length > 0 && (
          <div className="flex-shrink-0 border-t border-white/10 px-3 py-3">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">{t('nav.sectionLocations')}</span>
              {userRole === 'owner_operator' && (
                <span
                  onClick={() => navigate('/org-hierarchy')}
                  className="text-[10px] text-gray-500 hover:text-[#d4af37] cursor-pointer transition-colors"
                >
                  {t('nav.editLocations')}
                </span>
              )}
            </div>
            {visibleLocations.map(loc => {
              const dotColor = getStatusDotColor(loc.urlId);
              const params = new URLSearchParams(window.location.search);
              const currentLoc = params.get('location');
              const isActive = currentLoc === loc.urlId;
              return (
                <div
                  key={loc.id}
                  onClick={() => navigate(`/dashboard?location=${loc.urlId}`)}
                  className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer transition-colors duration-150 ${
                    isActive ? 'bg-[#163a52] text-white' : 'text-gray-300 hover:bg-[#163a52] hover:text-white'
                  }`}
                  {...(isTestMode ? { 'data-testid': `nav-location-${loc.urlId}` } : {})}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mr-2"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="text-xs font-medium truncate">{loc.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Touchpoint 5: Refer a Kitchen link */}
        <div className="flex-shrink-0 border-t border-white/10 px-4 py-2">
          <button
            onClick={() => navigate('/referrals')}
            style={{ fontSize: '11px', color: '#A08C5A', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
          >
            🍽️ {t('nav.referKitchen')}
          </button>
        </div>

        {/* Powered by EvidLY badge (white-label only) */}
        {branding.poweredByVisible && (
          <div className="flex-shrink-0 border-t border-white/10 px-4 py-2">
            <a
              href="https://evidly.com?ref=powered-by"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-300 transition-colors"
            >
              <EvidlyIcon size={14} />
              <span>Powered by <span className="font-semibold text-gray-300">EvidLY</span></span>
            </a>
          </div>
        )}

        {/* Demo upgrade badge */}
        <SidebarUpgradeBadge />
      </div>
    </div>
  );
}
