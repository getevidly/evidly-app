import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, BarChart3, BookOpen, Bot, Brain, Bug, Building,
  Calendar, CheckCircle, CheckSquare, ChefHat, ClipboardList, Clock,
  DollarSign, Download, FileEdit, FileText, Flame, GraduationCap, Hammer,
  Handshake, HardHat, HelpCircle, Home, Key, KeyRound, Landmark, Lightbulb,
  Lock, LogOut, Mail, MapPin, Medal, MessageSquare, Mic, Package, Phone,
  Plug, Radio, Recycle, RefreshCw, Rocket, Scale, School, Search, Settings,
  Shield, SlidersHorizontal, Sparkles, Star, Store, Target, Thermometer,
  Timer, Trophy, TrendingUp, Truck, UtensilsCrossed, Users, Wand2, Wifi, Wrench, Zap,
} from 'lucide-react';
import { EvidlyIcon } from '../ui/EvidlyIcon';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';
import { SidebarUpgradeBadge } from '../SidebarUpgradeBadge';
import { useTranslation } from '../../contexts/LanguageContext';
import { useKitchenType } from '../../hooks/useKitchenType';
import {
  getHomeItemForRole,
  getRoleConfig,
  getSectionsForRole,
  checkTestMode,
  DEMO_ROLES,
  type NavItem,
  type SidebarSection,
} from '../../config/sidebarConfig';
import { useUnreadSignals } from '../../hooks/useUnreadSignals';
import { colors, typography } from '../../lib/designSystem';

// ── Emoji → Lucide Icon Map ─────────────────────────────
// Maps sidebar emoji strings to lucide-react components for a professional look.
// Falls back to rendering the raw emoji if no match is found.
const SIDEBAR_ICONS: Record<string, any> = {
  '✓': CheckSquare,
  '🌡️': Thermometer,
  '⚠️': AlertTriangle,
  '📋': ClipboardList,
  '🔍': Search,
  '🎯': Target,
  '📅': Calendar,
  '📊': BarChart3,
  '📝': FileEdit,
  '🔧': Wrench,
  '🔥': Flame,
  '👷': HardHat,
  '🛡️': Shield,
  '📈': TrendingUp,
  '🧠': Brain,
  '🤖': Bot,
  '🔒': Lock,
  '🏆': Trophy,
  '📡': Radio,
  '🏅': Medal,
  '✨': Sparkles,
  '⚖️': Scale,
  '🛠️': Hammer,
  '🤝': Handshake,
  '🏪': Store,
  '♻️': Recycle,
  '🏫': School,
  '💰': DollarSign,
  '📦': Package,
  '🚛': Truck,
  '📞': Phone,
  '🎤': Mic,
  '🔄': RefreshCw,
  '🎓': GraduationCap,
  '📚': BookOpen,
  '✅': CheckCircle,
  '⏰': Clock,
  '⏱️': Timer,
  '📄': FileText,
  '🏛️': Landmark,
  '📶': Wifi,
  '🔮': Wand2,
  '🔐': KeyRound,
  '🎛️': SlidersHorizontal,
  '📧': Mail,
  '💊': Activity,
  '🔑': Key,
  '🔌': Plug,
  '⚡': Zap,
  '🕷️': Bug,
  '🚀': Rocket,
  '💬': MessageSquare,
  '❓': HelpCircle,
  '⭐': Star,
  '🍽️': UtensilsCrossed,
  '⚙️': Settings,
  '📍': MapPin,
  '👥': Users,
  '🏠': Home,
  '🏢': Building,
  '👨‍🍳': ChefHat,
  '📥': Download,
  '💡': Lightbulb,
};

// ── Item descriptions (EN) ───────────────────────────────
// Fallback descriptions keyed by item id; config descriptions take precedence.

const SIDEBAR_ITEM_DESCRIPTIONS_ES: Record<string, string> = {
  'dashboard':              "Su resumen de cumplimiento — puntuaciones, alertas y prioridades de hoy.",
  'checklists':             "Listas de tareas diarias para seguridad alimentaria, registros de temperatura y procedimientos de apertura/cierre.",
  'temperatures':           "Registro de temperatura manual, por QR o IoT para recepción, almacenamiento y cocción.",
  'incidents':              "Registre y dé seguimiento a incidentes de seguridad o cumplimiento con registros con marca de tiempo.",
  'documents':              "Certificados de cumplimiento, informes de inspección y documentación de permisos.",
  'self-inspection':        "Realice una auto-inspección usando los mismos criterios que aplica su departamento de salud.",
  'regulatory':             "Seguimiento de próximas ventanas de inspección, renovaciones de permisos y fechas límite regulatorias.",
  'reporting':              "Exporte resúmenes de cumplimiento, historial de inspecciones y paquetes de documentación.",
  'analytics':              "Datos de tendencias para puntuaciones de cumplimiento, frecuencia de incidentes y finalización de listas de verificación.",
  'benchmarks':             "Compare el rendimiento de cumplimiento entre ubicaciones, regiones o períodos de tiempo.",
  'self-diagnosis':         "Diagnostique problemas de equipo, obtenga pasos de resolución, adjunte video y notifique a su proveedor.",
  'all-equipment':          "Registro completo de equipos — todos los activos de cocina, historial de servicio y calendarios de mantenimiento.",
  'equipment':              "Registro de activos para todo el equipo de cocina con historial de servicio y fechas de mantenimiento.",
  'vendors':                "Proveedores de servicio asignados a sus ubicaciones — limpieza de campanas, gestión de grasa y más.",
  'locations':              "Agregue, edite o configure ubicaciones incluyendo mapeo de jurisdicción y requisitos de cumplimiento.",
  'team':                   "Gestione roles del personal, niveles de acceso y asignaciones de ubicación.",
  'audit-log':              "Registro inmutable con marca de tiempo de cada acción realizada en EvidLY.",
  'integrations':           "Conecte EvidLY a sus sistemas existentes — POS, RRHH o plataformas de gestión de instalaciones.",
  'billing':                "Administre su suscripción, método de pago e historial de facturas de EvidLY.",
  'settings':               "Preferencias de cuenta, configuración de notificaciones y configuración de la plataforma.",
  'help':                   "Documentación, soporte y opciones de contacto.",
  // New items
  'corrective-actions':     "Seguimiento y resolución de violaciones de cumplimiento con planes de acción correctiva documentados.",
  'vendor-certifications':  "Verificar y dar seguimiento a las certificaciones de cumplimiento de proveedores.",
  'violation-trends':       "Analizar patrones de violaciones a lo largo del tiempo para identificar problemas sistémicos.",
  'export-center':          "Exportar informes de cumplimiento y paquetes de documentación.",
  'iot-dashboard':          "Datos de sensores en tiempo real — monitoreo de temperatura y refrigeración.",
  'jurisdiction-intelligence': "Puntuación de cumplimiento específica por jurisdicción y requisitos regulatorios.",
  'score-table':            "Desglose detallado de puntuación de cumplimiento por pilar.",
  'report-issue':           "Reportar un incidente de personas, procesos o seguridad.",
  'allergen-tracking':      "Seguimiento de alérgenos en el menú y riesgos de contaminación cruzada.",
  'cooling-logs':           "Registrar tiempos y temperaturas de enfriamiento para alimentos cocidos.",
  'haccp':                  "Monitorear puntos críticos de control y cumplimiento del plan HACCP.",
  'receiving-log':          "Registrar entregas entrantes con verificaciones de temperatura y calidad.",
  'hood-exhaust':           "Mantenimiento de sistemas de campana y escape, calendarios de limpieza.",
  'hvac':                   "Mantenimiento de sistemas de calefacción, ventilación y aire acondicionado.",
  'ice-machines':           "Mantenimiento de máquinas de hielo y monitoreo de calidad del agua.",
  'refrigeration':          "Cámaras frías, congeladores y unidades de refrigeración.",
  'suppression-systems':    "Inspecciones y certificaciones de sistemas de supresión de incendios.",
  'certs-docs':             "Certificaciones de equipos y documentación de servicio.",
  'service-calendar':       "Mantenimiento programado y citas de servicio de proveedores.",
  'service-reporting':      "Informes de historial de servicio y cumplimiento de mantenimiento.",
  'intelligence':           "EvidLY Intelligence — detección de patrones entre ubicaciones, puntuación predictiva de riesgos y recomendaciones proactivas.",
  'iot-sensors':            "Agregar, configurar y gestionar sensores IoT de temperatura en sus ubicaciones.",
  'food-safety-overview':   "Puntuación de cumplimiento de seguridad alimentaria, puntos de control críticos y preparación para inspecciones.",
  'food-recovery':          "Seguimiento de desviación de residuos orgánicos, acuerdos de recuperación de alimentos y cumplimiento CalRecycle SB 1383.",
  'usda-production-records': "Registros de producción de comidas del Programa de Nutrición Infantil del USDA, cumplimiento de patrones de comida y seguimiento de etiquetas CN.",
  'command-center':          "Centro de comando de inteligencia — triaje de señales, planes de acción, actualizaciones de plataforma y monitoreo de rastreo.",
  'edge-functions':          "Monitoreo de salud, línea de tiempo de invocaciones, registros de errores e invocación manual de funciones Edge de Supabase.",
  'crawl-monitor':           "Salud del rastreo de inteligencia, tiempo de actividad de fuentes y registros de ejecución.",
};

// ── Section tooltip descriptions (ES) ────────────────────

const SECTION_DESCRIPTIONS_ES: Record<string, { title: string; description: string }> = {
  'daily':           { title: 'Operaciones Diarias', description: 'Todo lo que su equipo hace cada día para mantener el cumplimiento — listas de verificación, registros de temperatura y reporte de incidentes.' },
  'compliance':      { title: 'Cumplimiento', description: 'Documentación, registros de inspección, certificados de permisos, herramientas de auto-inspección e informes.' },
  'insights':        { title: 'Perspectivas', description: 'Análisis impulsado por IA — inteligencia de negocio, puntuaciones jurisdiccionales y tendencias de cumplimiento.' },
  'intelligence':    { title: 'Perspectivas', description: 'Análisis impulsado por IA de su portafolio de cumplimiento — perspectivas, modelado de escenarios y pronóstico de riesgos.' },
  'tools':           { title: 'Herramientas', description: 'Utilidades prácticas — diagnóstico de equipos y notificación a proveedores.' },
  'administration':  { title: 'Administración', description: 'Configuración de ubicaciones, gestión de equipos, integraciones y configuración de cuenta.' },
  'help':            { title: 'Ayuda', description: 'Documentación de ayuda, recursos de capacitación y soporte directo.' },
  'tasks':           { title: 'Tareas', description: 'Listas de verificación y registros de temperatura asignados para hoy.' },
  'food-safety':     { title: 'Seguridad Alimentaria', description: 'Registros de temperatura, puntos críticos HACCP, seguimiento de alérgenos y recepción de alimentos.' },
  'team':            { title: 'Equipo', description: 'Listas de verificación y seguimiento de incidentes para su equipo de cocina.' },
  'equipment':       { title: 'Equipos', description: 'Categorías de equipos — campanas, HVAC, máquinas de hielo, refrigeración y sistemas de supresión.' },
  'service':         { title: 'Servicio', description: 'Certificaciones, diagnóstico, programación de servicio, reportes y gestión de proveedores.' },
  'support':         { title: 'Soporte', description: 'Documentación de ayuda, recursos de capacitación y soporte directo.' },
  'calendar-section': { title: 'Calendario', description: 'Inspecciones, renovaciones de permisos, citas de servicio y fechas límite de cumplimiento.' },
  'food-recovery':   { title: 'Recuperación de Alimentos', description: 'Seguimiento de desviación de residuos orgánicos, acuerdos de recuperación de alimentos y cumplimiento CalRecycle SB 1383.' },
  'usda-k12':        { title: 'USDA K-12', description: 'Registros de producción de comidas del Programa de Nutrición Infantil del USDA y cumplimiento de patrones de comida.' },
  'system':          { title: 'Sistema', description: 'Monitoreo de funciones Edge, estado de rastreo y diagnósticos de infraestructura.' },
};

// ── Nav item id → i18n key mapping ──

const NAV_I18N: Record<string, string> = {
  'dashboard': 'nav.dashboard',
  'checklists': 'nav.checklists',
  'temperatures': 'nav.temperatures',
  'incidents': 'nav.incidents',
  'documents': 'nav.documents',
  'self-inspection': 'nav.selfAudit',
  'regulatory': 'nav.regulatoryUpdates',
  'reporting': 'nav.reporting',
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
        color: colors.gold, fontSize: 12, fontWeight: 800,
        margin: '0 0 6px', fontFamily: typography.family.body, textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {title}
      </p>
      <p style={{
        color: colors.textMuted, fontSize: 11, margin: '0 0 10px',
        fontFamily: typography.family.body, lineHeight: 1.5,
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
            <p style={{ color: '#ffffff', fontSize: 11, fontWeight: 600, margin: '0 0 1px', fontFamily: typography.family.body }}>
              {item.label}
            </p>
            <p style={{ color: '#7a8ba3', fontSize: 10, margin: 0, fontFamily: typography.family.body, lineHeight: 1.4 }}>
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
      <p style={{ color: '#ffffff', fontSize: 12, fontWeight: 700, margin: '0 0 4px', fontFamily: typography.family.body }}>
        {label}
      </p>
      <p style={{ color: colors.textMuted, fontSize: 11, margin: 0, lineHeight: 1.5, fontFamily: typography.family.body }}>
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

  const IconComponent = SIDEBAR_ICONS[item.icon];

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
          fontFamily: typography.family.body,
        }}
        {...(testId ? { 'data-testid': testId } : {})}
      >
        {IconComponent
          ? <IconComponent className="h-4 w-4 flex-shrink-0" style={{ color: isActive ? '#ffffff' : '#94a3b8' }} />
          : <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
        }
        <span style={{
          color: isActive ? '#ffffff' : '#94a3b8',
          fontSize: 12,
          fontWeight: isActive ? 600 : 400,
          fontFamily: typography.family.body,
        }}>
          {displayLabel}
        </span>
        {item.badge && (
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            fontFamily: typography.family.body,
            color: '#ffffff',
            backgroundColor: colors.gold,
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
  const { kitchenType } = useKitchenType();
  const { unreadCount: intelUnread } = useUnreadSignals();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isTestMode = useMemo(() => checkTestMode(), []);

  // ── Per-role configuration (with org-type overlays) ──
  const roleConfig = useMemo(() => getRoleConfig(userRole, kitchenType), [userRole, kitchenType]);
  const homeItem = useMemo(() => getHomeItemForRole(userRole), [userRole]);
  const topLevelItems = roleConfig.topLevelItems ?? [];
  const sections = roleConfig.sections;

  // ── Flat list of visible item IDs for test API ──
  const visibleItemIds = useMemo(() => {
    const ids = [homeItem.id];
    topLevelItems.forEach(i => ids.push(i.id));
    sections.forEach(s => s.items.forEach(i => ids.push(i.id)));
    return ids;
  }, [homeItem, topLevelItems, sections]);

  // ── Collapsible section state (accordion — one section at a time) ──
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default: all sections collapsed (auto-expand effect opens the active one)
    return {};
  });

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsed(prev => {
      const isCurrentlyCollapsed = prev[sectionId] !== false;
      // Accordion: collapse every section, then open the clicked one (if it was collapsed)
      const next: Record<string, boolean> = {};
      for (const s of sections) {
        next[s.id] = true; // collapse all
      }
      next[sectionId] = isCurrentlyCollapsed ? false : true;
      try { localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [sections]);

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

  // Auto-expand section containing the active route (accordion: collapse others)
  useEffect(() => {
    setCollapsed(prev => {
      const activeSection = sections.find(s => s.items.some(item => location.pathname === item.path));
      if (!activeSection || prev[activeSection.id] === false) return prev;
      // Collapse all, expand only the active section
      const next: Record<string, boolean> = {};
      for (const s of sections) {
        next[s.id] = s.id === activeSection.id ? false : true;
      }
      try { localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [location.pathname, sections]);

  return (
    <div data-sidebar data-testid="sidebar" className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col z-[9999]">
      <div className="flex flex-col h-full" style={{ backgroundColor: branding.colors.sidebarBg }}>
        {/* Logo */}
        <div className="flex-shrink-0 px-6 py-5">
          {branding.brandName === 'EvidLY' ? (
            <span style={{ fontFamily: typography.family.logo, fontWeight: 800, fontSize: '24px', lineHeight: 1 }}>
              <span style={{ color: colors.gold }}>E</span><span style={{ color: colors.white }}>vid</span><span style={{ color: colors.gold }}>LY</span>
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
            style={{ backgroundColor: colors.gold, color: colors.navy }}
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
          <div data-tour="tour-dashboard">
            <SidebarNavItem
              item={homeItem}
              isActive={location.pathname === homeItem.path}
              onClick={() => navigate(homeItem.path)}
              displayLabel={getHomeLabel()}
              displayDescription={getHomeDescription()}
              testId={isTestMode ? 'nav-dashboard' : undefined}
            />
          </div>

          {/* Top-level items (e.g. Calendar) — direct links below Dashboard */}
          {topLevelItems.map(item => (
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
                  data-tour={`tour-section-${section.id}`}
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
                        color: location.pathname === section.path ? '#ffffff' : colors.gold,
                        fontSize: 9, fontWeight: 800,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '1.2px', fontFamily: typography.family.body,
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
                          color: hasActiveChild ? '#ffffff' : colors.gold,
                          fontSize: 9, fontWeight: 800,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '1.2px', fontFamily: typography.family.body,
                        }}
                      >
                        {section.label}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }}
                        style={{
                          background: 'none', border: 'none', padding: '2px 0 2px 8px',
                          cursor: 'pointer', color: colors.gold, fontSize: 10,
                          display: 'inline-block',
                          transition: 'transform 0.15s ease',
                          transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                        }}
                      >
                        {'▶'}
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
                        color: hasActiveChild ? '#ffffff' : colors.gold,
                        fontSize: 9, fontWeight: 800,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '1.2px', fontFamily: typography.family.body,
                      }}>
                        {section.label}
                      </span>
                      <span style={{
                        color: colors.gold, fontSize: 10,
                        display: 'inline-block',
                        transition: 'transform 0.15s ease',
                        transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                      }}>
                        {'▶'}
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
                {!isCollapsed && section.items.map(item => {
                  // Inject unread badge on Intelligence Feed
                  const effectiveItem = item.id === 'client-intelligence' && intelUnread > 0
                    ? { ...item, badge: String(intelUnread) }
                    : item;
                  return (
                    <SidebarNavItem
                      key={item.id}
                      item={effectiveItem}
                      isActive={location.pathname === item.path}
                      onClick={() => navigate(item.path)}
                      displayLabel={getLabel(item)}
                      displayDescription={getDescription(item)}
                      testId={isTestMode ? `nav-${item.id}` : undefined}
                    />
                  );
                })}
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
              className="flex items-center gap-1.5 text-xs text-[#1E2D4D]/30 hover:text-[#1E2D4D]/30 transition-colors"
            >
              <EvidlyIcon size={14} />
              <span>Powered by <span className="font-semibold text-[#1E2D4D]/30">EvidLY</span></span>
            </a>
          </div>
        )}

        {/* Demo upgrade badge */}
        <SidebarUpgradeBadge />

        {/* Logout button — pinned to bottom */}
        <div className="flex-shrink-0 border-t border-white/10" data-tour="tour-logout">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 text-[#1E2D4D]/30 hover:text-white transition-colors"
            >
              <LogOut size={16} />
              <span className="text-sm">Log Out</span>
            </button>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              fontFamily: typography.family.body,
              color: colors.textMuted,
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
