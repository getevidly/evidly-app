import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { EvidlyIcon } from '../ui/EvidlyIcon';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';
import { SidebarUpgradeBadge } from '../SidebarUpgradeBadge';
import { useTranslation } from '../../contexts/LanguageContext';
import {
  getHomeItemForRole,
  getRoleConfig,
  getSectionsForRole,
  checkTestMode,
  DEMO_ROLES,
  type NavItem,
  type SidebarSection,
} from '../../config/sidebarConfig';

// ── Item descriptions (EN) ───────────────────────────────
// Fallback descriptions keyed by item id; config descriptions take precedence.

const SIDEBAR_ITEM_DESCRIPTIONS_ES: Record<string, string> = {
  'dashboard':              "Su resumen de cumplimiento \u2014 puntuaciones, alertas y prioridades de hoy.",
  'checklists':             "Listas de tareas diarias para seguridad alimentaria, registros de temperatura y procedimientos de apertura/cierre.",
  'temperatures':           "Registro de temperatura manual, por QR o IoT para recepci\u00F3n, almacenamiento y cocci\u00F3n.",
  'incidents':              "Registre y d\u00E9 seguimiento a incidentes de seguridad o cumplimiento con registros con marca de tiempo.",
  'documents':              "Certificados de cumplimiento, informes de inspecci\u00F3n y documentaci\u00F3n de permisos.",
  'self-inspection':        "Realice una auto-inspecci\u00F3n usando los mismos criterios que aplica su departamento de salud.",
  'regulatory':             "Seguimiento de pr\u00F3ximas ventanas de inspecci\u00F3n, renovaciones de permisos y fechas l\u00EDmite regulatorias.",
  'reporting':              "Exporte res\u00FAmenes de cumplimiento, historial de inspecciones y paquetes de documentaci\u00F3n.",
  'business-intelligence':  "Centro de mando ejecutivo \u2014 inteligencia de cumplimiento con IA, modelado de riesgos y an\u00E1lisis de impacto financiero.",
  'analytics':              "Datos de tendencias para puntuaciones de cumplimiento, frecuencia de incidentes y finalizaci\u00F3n de listas de verificaci\u00F3n.",
  'benchmarks':             "Compare el rendimiento de cumplimiento entre ubicaciones, regiones o per\u00EDodos de tiempo.",
  'self-diagnosis':         "Diagnostique problemas de equipo, obtenga pasos de resoluci\u00F3n, adjunte video y notifique a su proveedor.",
  'all-equipment':          "Registro completo de equipos \u2014 todos los activos de cocina, historial de servicio y calendarios de mantenimiento.",
  'equipment':              "Registro de activos para todo el equipo de cocina con historial de servicio y fechas de mantenimiento.",
  'vendors':                "Proveedores de servicio asignados a sus ubicaciones \u2014 limpieza de campanas, gesti\u00F3n de grasa y m\u00E1s.",
  'locations':              "Agregue, edite o configure ubicaciones incluyendo mapeo de jurisdicci\u00F3n y requisitos de cumplimiento.",
  'team':                   "Gestione roles del personal, niveles de acceso y asignaciones de ubicaci\u00F3n.",
  'audit-log':              "Registro inmutable con marca de tiempo de cada acci\u00F3n realizada en EvidLY.",
  'integrations':           "Conecte EvidLY a sus sistemas existentes \u2014 POS, RRHH o plataformas de gesti\u00F3n de instalaciones.",
  'billing':                "Administre su suscripci\u00F3n, m\u00E9todo de pago e historial de facturas de EvidLY.",
  'settings':               "Preferencias de cuenta, configuraci\u00F3n de notificaciones y configuraci\u00F3n de la plataforma.",
  'help':                   "Documentaci\u00F3n, soporte y opciones de contacto.",
  // New items
  'corrective-actions':     "Seguimiento y resoluci\u00F3n de violaciones de cumplimiento con planes de acci\u00F3n correctiva documentados.",
  'vendor-certifications':  "Verificar y dar seguimiento a las certificaciones de cumplimiento de proveedores.",
  'violation-trends':       "Analizar patrones de violaciones a lo largo del tiempo para identificar problemas sist\u00E9micos.",
  'export-center':          "Exportar informes de cumplimiento y paquetes de documentaci\u00F3n.",
  'iot-dashboard':          "Datos de sensores en tiempo real \u2014 monitoreo de temperatura y refrigeraci\u00F3n.",
  'jurisdiction-intelligence': "Puntuaci\u00F3n de cumplimiento espec\u00EDfica por jurisdicci\u00F3n y requisitos regulatorios.",
  'score-table':            "Desglose detallado de puntuaci\u00F3n de cumplimiento por pilar.",
  'report-issue':           "Reportar un incidente de personas, procesos o seguridad.",
  'allergen-tracking':      "Seguimiento de al\u00E9rgenos en el men\u00FA y riesgos de contaminaci\u00F3n cruzada.",
  'cooling-logs':           "Registrar tiempos y temperaturas de enfriamiento para alimentos cocidos.",
  'haccp':                  "Monitorear puntos cr\u00EDticos de control y cumplimiento del plan HACCP.",
  'receiving-log':          "Registrar entregas entrantes con verificaciones de temperatura y calidad.",
  'hood-exhaust':           "Mantenimiento de sistemas de campana y escape, calendarios de limpieza.",
  'hvac':                   "Mantenimiento de sistemas de calefacci\u00F3n, ventilaci\u00F3n y aire acondicionado.",
  'ice-machines':           "Mantenimiento de m\u00E1quinas de hielo y monitoreo de calidad del agua.",
  'refrigeration':          "C\u00E1maras fr\u00EDas, congeladores y unidades de refrigeraci\u00F3n.",
  'suppression-systems':    "Inspecciones y certificaciones de sistemas de supresi\u00F3n de incendios.",
  'certs-docs':             "Certificaciones de equipos y documentaci\u00F3n de servicio.",
  'service-calendar':       "Mantenimiento programado y citas de servicio de proveedores.",
  'service-reporting':      "Informes de historial de servicio y cumplimiento de mantenimiento.",
  'intelligence':           "EvidLY Intelligence — detección de patrones entre ubicaciones, puntuación predictiva de riesgos y recomendaciones proactivas.",
  'iot-sensors':            "Agregar, configurar y gestionar sensores IoT de temperatura en sus ubicaciones.",
  'food-safety-overview':   "Puntuación de cumplimiento de seguridad alimentaria, puntos de control críticos y preparación para inspecciones.",
};

// ── Section tooltip descriptions (ES) ────────────────────

const SECTION_DESCRIPTIONS_ES: Record<string, { title: string; description: string }> = {
  'daily':           { title: 'Operaciones Diarias', description: 'Todo lo que su equipo hace cada d\u00EDa para mantener el cumplimiento \u2014 listas de verificaci\u00F3n, registros de temperatura y reporte de incidentes.' },
  'compliance':      { title: 'Cumplimiento', description: 'Documentaci\u00F3n, registros de inspecci\u00F3n, certificados de permisos, herramientas de auto-inspecci\u00F3n e informes.' },
  'insights':        { title: 'Perspectivas', description: 'An\u00E1lisis impulsado por IA \u2014 inteligencia de negocio, puntuaciones jurisdiccionales y tendencias de cumplimiento.' },
  'intelligence':    { title: 'Perspectivas', description: 'An\u00E1lisis impulsado por IA de su portafolio de cumplimiento \u2014 perspectivas, modelado de escenarios y pron\u00F3stico de riesgos.' },
  'tools':           { title: 'Herramientas', description: 'Utilidades pr\u00E1cticas \u2014 diagn\u00F3stico de equipos y notificaci\u00F3n a proveedores.' },
  'administration':  { title: 'Administraci\u00F3n', description: 'Configuraci\u00F3n de ubicaciones, gesti\u00F3n de equipos, integraciones y configuraci\u00F3n de cuenta.' },
  'help':            { title: 'Ayuda', description: 'Documentaci\u00F3n de ayuda, recursos de capacitaci\u00F3n y soporte directo.' },
  'tasks':           { title: 'Tareas', description: 'Listas de verificaci\u00F3n y registros de temperatura asignados para hoy.' },
  'food-safety':     { title: 'Seguridad Alimentaria', description: 'Registros de temperatura, puntos cr\u00EDticos HACCP, seguimiento de al\u00E9rgenos y recepci\u00F3n de alimentos.' },
  'team':            { title: 'Equipo', description: 'Listas de verificaci\u00F3n y seguimiento de incidentes para su equipo de cocina.' },
  'equipment':       { title: 'Equipos', description: 'Categor\u00EDas de equipos \u2014 campanas, HVAC, m\u00E1quinas de hielo, refrigeraci\u00F3n y sistemas de supresi\u00F3n.' },
  'service':         { title: 'Servicio', description: 'Certificaciones, diagn\u00F3stico, programaci\u00F3n de servicio, reportes y gesti\u00F3n de proveedores.' },
  'support':         { title: 'Soporte', description: 'Documentaci\u00F3n de ayuda, recursos de capacitaci\u00F3n y soporte directo.' },
  'calendar-section': { title: 'Calendario', description: 'Inspecciones, renovaciones de permisos, citas de servicio y fechas l\u00EDmite de cumplimiento.' },
};

// ── Nav item id \u2192 i18n key mapping ──

const NAV_I18N: Record<string, string> = {
  'dashboard': 'nav.dashboard',
  'checklists': 'nav.checklists',
  'temperatures': 'nav.temperatures',
  'incidents': 'nav.incidents',
  'documents': 'nav.documents',
  'self-inspection': 'nav.selfAudit',
  'regulatory': 'nav.regulatoryUpdates',
  'reporting': 'nav.reporting',
  'business-intelligence': 'nav.businessIntelligence',
  'benchmarks': 'nav.benchmarks',
  'self-diagnosis': 'nav.selfDiagnosis',
  'all-equipment': 'nav.allEquipment',
  'equipment': 'nav.equipment',
  'vendors': 'nav.vendors',
  'locations': 'nav.locations',
  'team': 'nav.team',
  'settings': 'nav.settings',
  'help': 'nav.helpSupport',
  // New items
  'corrective-actions': 'nav.correctiveActions',
  'vendor-certifications': 'nav.vendorCertifications',
  'violation-trends': 'nav.violationTrends',
  'export-center': 'nav.exportCenter',
  'iot-dashboard': 'nav.iotDashboard',
  'jurisdiction-intelligence': 'nav.jurisdictionIntelligence',
  'score-table': 'nav.scoreTable',
  'report-issue': 'nav.reportIssue',
  'allergen-tracking': 'nav.allergenTracking',
  'cooling-logs': 'nav.coolingLogs',
  'haccp': 'nav.haccp',
  'receiving-log': 'nav.receivingLog',
  'audit-log': 'nav.auditLog',
  'billing': 'nav.billing',
  'hood-exhaust': 'nav.hoodExhaust',
  'hvac': 'nav.hvac',
  'ice-machines': 'nav.iceMachines',
  'refrigeration': 'nav.refrigeration',
  'suppression-systems': 'nav.suppressionSystems',
  'certs-docs': 'nav.certsDocs',
  'service-calendar': 'nav.serviceCalendar',
  'service-reporting': 'nav.serviceReporting',
  'analytics': 'nav.analytics',
  'intelligence': 'nav.intelligence',
  'iot-sensors': 'nav.iotSensors',
  'food-safety-overview': 'nav.foodSafetyOverview',
};

// ── SectionTooltip ───────────────────────────────────────

const SectionTooltip: React.FC<{
  title: string;
  description: string;
  items: { label: string; description: string; path: string }[];
  visible: boolean;
  anchorRect: { top: number; left: number; right: number } | null;
  onItemClick: (path: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ title, description, items, visible, anchorRect, onItemClick, onMouseEnter, onMouseLeave }) => {
  if (!visible || !anchorRect) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: anchorRect.top,
        left: anchorRect.right + 8,
        width: 260,
        background: '#1a2d4a',
        border: '1px solid #2d4a6e',
        borderRadius: 10,
        padding: '12px 14px',
        zIndex: 99999,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <p style={{
        color: '#A08C5A', fontSize: 12, fontWeight: 800,
        margin: '0 0 6px', fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {title}
      </p>
      <p style={{
        color: '#94a3b8', fontSize: 11, margin: '0 0 10px',
        fontFamily: 'system-ui', lineHeight: 1.5,
      }}>
        {description}
      </p>
      <div style={{ borderTop: '1px solid #2d4a6e', paddingTop: 8 }}>
        {items.map((item, i) => (
          <div
            key={i}
            role="button"
            tabIndex={0}
            onClick={() => onItemClick(item.path)}
            onKeyDown={(e) => { if (e.key === 'Enter') onItemClick(item.path); }}
            style={{ marginBottom: 4, cursor: 'pointer', padding: '4px 6px', borderRadius: 6, transition: 'background 0.1s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#243d5e'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <p style={{ color: '#ffffff', fontSize: 11, fontWeight: 600, margin: '0 0 1px', fontFamily: 'system-ui' }}>
              {item.label}
            </p>
            <p style={{ color: '#7a8ba3', fontSize: 10, margin: 0, fontFamily: 'system-ui', lineHeight: 1.4 }}>
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── ItemTooltip ──────────────────────────────────────────

const ItemTooltip: React.FC<{
  label: string;
  description: string;
  anchorRect: { top: number; height: number; right: number } | null;
}> = ({ label, description, anchorRect }) => {
  if (!anchorRect) return null;
  return (
    <div style={{
      position: 'fixed',
      top: anchorRect.top + anchorRect.height / 2,
      left: anchorRect.right + 8,
      transform: 'translateY(-50%)',
      width: 220,
      background: '#1a2d4a',
      border: '1px solid #2d4a6e',
      borderRadius: 8,
      padding: '10px 12px',
      zIndex: 99999,
      pointerEvents: 'none',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }}>
      <p style={{ color: '#ffffff', fontSize: 12, fontWeight: 700, margin: '0 0 4px', fontFamily: 'system-ui' }}>
        {label}
      </p>
      <p style={{ color: '#94a3b8', fontSize: 11, margin: 0, lineHeight: 1.5, fontFamily: 'system-ui' }}>
        {description}
      </p>
    </div>
  );
};

// ── SidebarNavItem ───────────────────────────────────────

const SidebarNavItem: React.FC<{
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  displayLabel: string;
  displayDescription: string;
  testId?: string;
}> = ({ item, isActive, onClick, displayLabel, displayDescription, testId }) => {
  const [hovered, setHovered] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; height: number; right: number } | null>(null);

  const handleEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setRect({ top: r.top, height: r.height, right: r.right });
    }
    setHovered(true);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 16px',
          background: isActive ? '#1e3a5f' : 'transparent',
          borderLeft: isActive ? '3px solid #A08C5A' : '3px solid transparent',
          borderTop: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          borderRadius: 0,
          cursor: 'pointer',
          textAlign: 'left' as const,
          transition: 'background 0.1s',
          fontFamily: 'system-ui',
        }}
        {...(testId ? { 'data-testid': testId } : {})}
      >
        <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
        <span style={{
          color: isActive ? '#ffffff' : '#94a3b8',
          fontSize: 12,
          fontWeight: isActive ? 600 : 400,
          fontFamily: 'system-ui',
        }}>
          {displayLabel}
        </span>
        {item.badge && (
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            fontFamily: 'system-ui',
            color: '#ffffff',
            backgroundColor: '#A08C5A',
            padding: '1px 6px',
            borderRadius: 9,
            lineHeight: '16px',
            letterSpacing: '0.5px',
            flexShrink: 0,
            marginLeft: 'auto',
          }}>
            {item.badge}
          </span>
        )}
      </button>

      {hovered && (
        <ItemTooltip
          label={displayLabel}
          description={displayDescription}
          anchorRect={rect}
        />
      )}
    </div>
  );
};

const COLLAPSED_SECTIONS_KEY = 'evidly-sidebar-sections';

// ── Sidebar component ───────────────────────────────────

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { isDemoMode, presenterMode, togglePresenterMode } = useDemo();
  const { signOut } = useAuth();
  const { branding } = useBranding();
  const { t, locale } = useTranslation();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isTestMode = useMemo(() => checkTestMode(), []);

  // ── Per-role configuration ──
  const roleConfig = useMemo(() => getRoleConfig(userRole), [userRole]);
  const homeItem = useMemo(() => getHomeItemForRole(userRole), [userRole]);
  const sections = roleConfig.sections;

  // ── Flat list of visible item IDs for test API ──
  const visibleItemIds = useMemo(() => {
    const ids = [homeItem.id];
    sections.forEach(s => s.items.forEach(i => ids.push(i.id)));
    return ids;
  }, [homeItem, sections]);

  // ── Collapsible section state ──
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsed(prev => {
      const isCurrentlyCollapsed = prev[sectionId] !== false;
      const next = { ...prev, [sectionId]: isCurrentlyCollapsed ? false : true };
      try { localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // ── Section tooltip hover state ──
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const [sectionRect, setSectionRect] = useState<{ top: number; left: number; right: number } | null>(null);
  const tooltipTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSectionEnter = (sectionId: string) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    const el = sectionRefs.current[sectionId];
    if (el) {
      const r = el.getBoundingClientRect();
      setSectionRect({ top: r.top, left: r.left, right: r.right });
    }
    setHoveredSection(sectionId);
  };

  const handleSectionLeave = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setHoveredSection(null);
    }, 400);
  };

  const handleTooltipEnter = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
  };

  const handleTooltipLeave = () => {
    setHoveredSection(null);
  };

  // ── Description helper (locale-aware) ──
  const getDescription = useCallback((item: NavItem): string => {
    if (locale === 'es') {
      return SIDEBAR_ITEM_DESCRIPTIONS_ES[item.id] || item.description;
    }
    return item.description;
  }, [locale]);

  // ── Home label helper (uses per-role Spanish label) ──
  const getHomeLabel = useCallback((): string => {
    if (locale === 'es') return roleConfig.home.labelEs;
    return roleConfig.home.label;
  }, [locale, roleConfig]);

  const getHomeDescription = useCallback((): string => {
    if (locale === 'es') return roleConfig.home.descriptionEs;
    return roleConfig.home.description;
  }, [locale, roleConfig]);

  const getSectionTooltip = useCallback((section: SidebarSection): { title: string; description: string } => {
    if (locale === 'es') {
      const es = SECTION_DESCRIPTIONS_ES[section.id];
      if (es) return es;
    }
    return { title: section.tooltipTitle, description: section.tooltipDescription };
  }, [locale]);

  // ── Label helper (i18n) ──
  const getLabel = useCallback((item: NavItem): string => {
    const key = NAV_I18N[item.id];
    return key ? t(key) : item.label;
  }, [t]);

  // Expose test API for Playwright
  useEffect(() => {
    if (isTestMode) {
      (window as any).__evidly_test = {
        getVisibleNavItems: () => visibleItemIds,
        getCurrentRole: () => userRole,
        getNavItemCount: () => visibleItemIds.length,
      };
    }
    return () => {
      if (isTestMode) {
        delete (window as any).__evidly_test;
      }
    };
  }, [isTestMode, visibleItemIds, userRole]);

  // Auto-expand section containing the active route
  useEffect(() => {
    setCollapsed(prev => {
      let changed = false;
      const next = { ...prev };
      for (const s of sections) {
        if (next[s.id] !== false && s.items.some(item => location.pathname === item.path)) {
          next[s.id] = false;
          changed = true;
        }
      }
      if (changed) {
        try { localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(next)); } catch {}
        return next;
      }
      return prev;
    });
  }, [location.pathname, sections]);

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col z-[9999]">
      <div className="flex flex-col h-full" style={{ backgroundColor: branding.colors.sidebarBg }}>
        {/* Logo */}
        <div className="flex-shrink-0 px-6 py-5">
          {branding.brandName === 'EvidLY' ? (
            <span style={{ fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 800, fontSize: '24px', lineHeight: 1 }}>
              <span style={{ color: '#A08C5A' }}>E</span><span style={{ color: '#FFFFFF' }}>vid</span><span style={{ color: '#A08C5A' }}>LY</span>
            </span>
          ) : (
            <span className="text-base font-bold leading-tight" style={{ color: branding.colors.sidebarText }}>
              {branding.brandName}
            </span>
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4" data-tour="sidebar-nav">

          {/* Home — ungrouped at top, per-role label */}
          <SidebarNavItem
            item={homeItem}
            isActive={location.pathname === homeItem.path}
            onClick={() => navigate(homeItem.path)}
            displayLabel={getHomeLabel()}
            displayDescription={getHomeDescription()}
            testId={isTestMode ? 'nav-dashboard' : undefined}
          />

          {/* Divider after dashboard */}
          <div className="my-2 border-t border-white/10 mx-1" />

          {/* Sections */}
          {sections.map(section => {
            const isCollapsed = collapsed[section.id] !== false;
            const tooltipData = getSectionTooltip(section);
            const hasActiveChild = section.items.some(
              item => location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            ) || (section.path != null && location.pathname === section.path);
            return (
              <div key={section.id} className="mb-1">
                {/* Section header */}
                <div
                  ref={el => { sectionRefs.current[section.id] = el; }}
                  style={{ position: 'relative' }}
                  onMouseEnter={() => handleSectionEnter(section.id)}
                  onMouseLeave={handleSectionLeave}
                >
                  {section.path && section.items.length === 0 ? (
                    /* Flat navigation link — no toggle, no sub-items */
                    <button
                      type="button"
                      onClick={() => navigate(section.path!)}
                      className="w-full flex items-center px-3 py-1.5 mt-1 cursor-pointer"
                      style={{ background: 'none', border: 'none' }}
                    >
                      <span style={{
                        color: location.pathname === section.path ? '#ffffff' : '#A08C5A',
                        fontSize: 9, fontWeight: 800,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '1.2px', fontFamily: 'system-ui',
                      }}>
                        {section.label}
                      </span>
                    </button>
                  ) : section.path ? (
                    /* Navigable section — label navigates, arrow toggles */
                    <div className="w-full flex items-center justify-between px-3 py-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => navigate(section.path!)}
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          color: hasActiveChild ? '#ffffff' : '#A08C5A',
                          fontSize: 9, fontWeight: 800,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '1.2px', fontFamily: 'system-ui',
                        }}
                      >
                        {section.label}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }}
                        style={{
                          background: 'none', border: 'none', padding: '2px 0 2px 8px',
                          cursor: 'pointer', color: '#A08C5A', fontSize: 10,
                          display: 'inline-block',
                          transition: 'transform 0.15s ease',
                          transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                        }}
                      >
                        {'\u25B6'}
                      </button>
                    </div>
                  ) : (
                    /* Grouping section — full row toggles */
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between px-3 py-1.5 mt-1 cursor-pointer"
                      style={{ background: 'none', border: 'none' }}
                    >
                      <span style={{
                        color: hasActiveChild ? '#ffffff' : '#A08C5A',
                        fontSize: 9, fontWeight: 800,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '1.2px', fontFamily: 'system-ui',
                      }}>
                        {section.label}
                      </span>
                      <span style={{
                        color: '#A08C5A', fontSize: 10,
                        display: 'inline-block',
                        transition: 'transform 0.15s ease',
                        transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                      }}>
                        {'\u25B6'}
                      </span>
                    </button>
                  )}

                  <SectionTooltip
                    title={tooltipData.title}
                    description={tooltipData.description}
                    items={section.items.map(i => ({
                      label: getLabel(i),
                      description: getDescription(i),
                      path: i.path,
                    }))}
                    visible={hoveredSection === section.id}
                    anchorRect={sectionRect}
                    onItemClick={(path) => { navigate(path); setHoveredSection(null); }}
                    onMouseEnter={handleTooltipEnter}
                    onMouseLeave={handleTooltipLeave}
                  />
                </div>

                {/* Section items */}
                {!isCollapsed && section.items.map(item => (
                  <SidebarNavItem
                    key={item.id}
                    item={item}
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                    displayLabel={getLabel(item)}
                    displayDescription={getDescription(item)}
                    testId={isTestMode ? `nav-${item.id}` : undefined}
                  />
                ))}
              </div>
            );
          })}
        </nav>

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

        {/* Logout button — pinned to bottom */}
        <div className="flex-shrink-0 border-t border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut size={16} />
              <span className="text-sm">Log Out</span>
            </button>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              fontFamily: 'system-ui, sans-serif',
              color: '#94a3b8',
              backgroundColor: 'rgba(148, 163, 184, 0.1)',
              padding: '2px 8px',
              borderRadius: 10,
              lineHeight: '18px',
              whiteSpace: 'nowrap' as const,
            }}>
              {DEMO_ROLES.find(r => r.role === userRole)?.label || 'Owner / Operator'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
