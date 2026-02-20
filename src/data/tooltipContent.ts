import type { UserRole } from '../contexts/RoleContext';

export type TooltipSection =
  | 'overallScore'
  | 'fireSafety'
  | 'urgentItems'
  | 'todaysProgress'
  | 'locationCards'
  | 'locationScoreCard'
  | 'checklistCard'
  | 'incidentCard'
  | 'equipmentCard'
  | 'vendorCard'
  | 'reportsCard'
  | 'jurisdictionCard'
  | 'teamCard'
  | 'auditLogCard'
  | 'alertBanner'
  | 'bottomBarActions'
  | 'scheduleCalendar';

export const tooltipContent: Record<TooltipSection, Record<UserRole, string>> = {
  // ── TOOLTIPS-1 (original 5 sections) ──────────────────────
  overallScore: {
    owner_operator:
      'Your combined food safety and fire safety score across all locations, weighted by each jurisdiction\'s verified methodology. This is what regulators and auditors see.',
    executive:
      'Aggregate compliance posture across your portfolio. Drill into individual locations to identify where risk is concentrated.',
    compliance_manager:
      'Jurisdiction-weighted score combining food safety violations and fire safety pass/fail status. Reflects your current standing under active enforcement methodology.',
    chef:
      'Your location\'s current compliance score. Completing daily checklists and addressing flagged items moves this number in real time.',
    facilities_manager:
      'Your fire safety systems directly impact this score. All four systems — Permit, Hood, Extinguisher, and Ansul — must pass at every location.',
    kitchen_manager:
      'Your location\'s current compliance score. Completing daily checklists and addressing flagged items moves this number in real time.',
    kitchen_staff:
      'This shows how your location is doing on health and safety. Complete your assigned tasks to keep it green.',
  },
  fireSafety: {
    owner_operator:
      'Pass/Fail status per NFPA 96 (2024) for each Authority Having Jurisdiction. One red bar at any location is a compliance failure.',
    executive:
      'Fire safety is binary — Pass or Fail. A single failed system exposes the entire location to permit suspension or closure.',
    compliance_manager:
      'Verified against NFPA 96 (2024) Table 12.4. Each AHJ is mapped to your specific location — no generic defaults.',
    chef:
      'All four systems must show green for your location to pass fire inspection. Contact your Facilities Manager if any bar is red.',
    facilities_manager:
      'Your primary dashboard. Permit = operational permit current. Hood = last cleaning within NFPA 96 interval. Ext = extinguisher inspected. Ansul = suppression system serviced.',
    kitchen_manager:
      'All four systems must show green for your location to pass fire inspection. Contact your Facilities Manager if any bar is red.',
    kitchen_staff:
      'Green means your kitchen\'s fire safety systems are current. If you see red, tell your manager immediately.',
  },
  urgentItems: {
    owner_operator:
      'High-priority items across all locations requiring immediate action. These carry the greatest regulatory and liability risk.',
    executive:
      'Unresolved critical items by location. Each open item represents potential inspection failure or enforcement action.',
    compliance_manager:
      'Violations and documentation gaps flagged as high-priority under your active jurisdiction\'s enforcement criteria.',
    chef:
      'Tasks and checklist items flagged as urgent for your location today. Resolve these before your next service period.',
    facilities_manager:
      'Overdue maintenance, expired permits, or failed system checks. These must be resolved before your next inspection window.',
    kitchen_manager:
      'Tasks and checklist items flagged as urgent for your location today. Resolve these before your next service period.',
    kitchen_staff:
      'These are your most important tasks right now. Complete them first before moving on to other assignments.',
  },
  todaysProgress: {
    owner_operator:
      'Daily checklist completion rate across all locations. Resets at midnight local time.',
    executive:
      'Operational compliance activity for today. Consistent daily completion correlates with higher inspection scores.',
    compliance_manager:
      'Today\'s checklist submissions versus required tasks. Gaps here create documentation risk during audits.',
    chef:
      'Your team\'s progress on today\'s assigned checklists. Tap any item to complete or flag for follow-up.',
    facilities_manager:
      'Equipment checks and maintenance tasks scheduled for today. Incomplete items carry forward as overdue.',
    kitchen_manager:
      'Your team\'s progress on today\'s assigned checklists. Tap any item to complete or flag for follow-up.',
    kitchen_staff:
      'Here\'s what\'s on your list for today. Check off each task as you complete it.',
  },
  locationCards: {
    owner_operator:
      'Each card reflects that location\'s active jurisdiction, verified scoring methodology, and current compliance posture.',
    executive:
      'Location-level snapshot. Click any card to see inspection history, score trends, and open items.',
    compliance_manager:
      'Jurisdiction and scoring methodology are verified per location — no assumptions. Click to view enforcement agency details and scoring weights.',
    chef:
      'Your location\'s current standing. Click to view today\'s checklists, open items, and recent inspection results.',
    facilities_manager:
      'Shows fire AHJ, permit status, and equipment compliance per location. Click to manage assets and maintenance schedules.',
    kitchen_manager:
      'Your location\'s current standing. Click to view today\'s checklists, open items, and recent inspection results.',
    kitchen_staff:
      'This is your location. Tap to see your tasks for today.',
  },

  // ── TOOLTIPS-2 (11 new sections) ──────────────────────────

  locationScoreCard: {
    owner_operator:
      'This location\'s combined food and fire compliance score under its active jurisdiction. Tap to drill into inspection history and open items.',
    executive:
      'Location-level compliance posture. Each location is scored under its own jurisdiction methodology \u2014 scores are not directly comparable across counties.',
    compliance_manager:
      'Jurisdiction-weighted score for this location. Reflects current standing under the active enforcement methodology \u2014 not a generic or estimated score.',
    chef:
      'Your kitchen\'s current compliance score. Completing daily checklists and addressing flagged items improves this in real time.',
    facilities_manager:
      'Fire safety systems contribute directly to this score. All four \u2014 Permit, Hood, Ext, Ansul \u2014 must pass.',
    kitchen_manager:
      'Your location\'s compliance score. Tap to see what\'s driving it and what tasks will move it.',
    kitchen_staff:
      'This is how your kitchen is doing. Green is good \u2014 complete your tasks to keep it that way.',
  },
  checklistCard: {
    owner_operator:
      'Daily operational checklists across all locations. Completion rates feed into compliance documentation and inspection readiness.',
    executive:
      'Aggregate checklist completion rate. Consistent daily completion is the leading indicator of inspection performance.',
    compliance_manager:
      'Checklist submissions create the audit trail regulators review during inspections. Gaps here are documentation risk.',
    chef:
      'Your team\'s daily task list. Each completed checklist item is logged and timestamped for compliance records.',
    facilities_manager:
      'Equipment and safety checks scheduled for today. Incomplete items carry forward as overdue and affect your compliance score.',
    kitchen_manager:
      'Today\'s checklists for your location. Tap to assign, complete, or flag items for follow-up.',
    kitchen_staff:
      'Your tasks for today. Check off each one as you go \u2014 your manager can see your progress.',
  },
  incidentCard: {
    owner_operator:
      'Logged incidents across all locations. Each incident creates a compliance record \u2014 unresolved incidents are flagged during inspections.',
    executive:
      'Open incident count by location. High frequency or long resolution times are leading indicators of inspection risk.',
    compliance_manager:
      'Incident records are part of your regulatory documentation. Ensure each has a resolution timestamp and corrective action logged.',
    chef:
      'Incidents logged in your kitchen. Report anything unusual \u2014 unlogged incidents create compliance gaps.',
    facilities_manager:
      'Equipment failures, safety events, and maintenance incidents. Document and resolve before your next inspection window.',
    kitchen_manager:
      'Incidents at your location. Log new incidents and track open items to resolution.',
    kitchen_staff:
      'If something goes wrong in the kitchen, log it here. Your manager will follow up.',
  },
  equipmentCard: {
    owner_operator:
      'Equipment assets across all locations with maintenance status. Overdue service on fire suppression or hood systems creates compliance risk.',
    executive:
      'Asset health summary by location. Deferred maintenance on critical equipment is a liability and a fire safety compliance issue.',
    compliance_manager:
      'Equipment service records are reviewed during fire safety and health inspections. Ensure all service dates are current and documented.',
    chef:
      'Kitchen equipment assigned to your location. Flag anything that needs repair \u2014 overdue equipment affects inspection scores.',
    facilities_manager:
      'Your primary asset register. Tracks service intervals, vendor assignments, and next-due dates per NFPA 96 (2024) requirements.',
    kitchen_manager:
      'Equipment at your location and its current service status. Tap to log a maintenance request or view service history.',
    kitchen_staff:
      'If a piece of equipment isn\'t working right, tap here to report it.',
  },
  vendorCard: {
    owner_operator:
      'Vendors servicing your locations \u2014 hood cleaning, grease management, fire suppression, and more. Service records feed directly into compliance documentation.',
    executive:
      'Vendor relationships and contract status by location. Lapsed service contracts are a compliance exposure.',
    compliance_manager:
      'Vendor service certificates and dates are required documentation for fire safety inspections. Verify all are current.',
    chef:
      'The service vendors scheduled for your location. You\'ll be notified before scheduled visits.',
    facilities_manager:
      'Manage vendor assignments, service schedules, and certificate tracking. Service gaps trigger compliance alerts.',
    kitchen_manager:
      'Vendors scheduled to service your location. Confirm access and log completed visits here.',
    kitchen_staff:
      'Vendors may be on-site for scheduled maintenance. Your manager will let you know in advance.',
  },
  reportsCard: {
    owner_operator:
      'Compliance reports across all locations \u2014 inspection history, score trends, and documentation exports for audits or lender review.',
    executive:
      'Portfolio-level compliance reporting. Export for board review, lender diligence, or insurance purposes.',
    compliance_manager:
      'Regulatory documentation exports, inspection summaries, and violation history. Your primary audit defense materials.',
    chef:
      'Reports for your location are available here. Your manager controls what you can view and export.',
    facilities_manager:
      'Fire safety service reports, equipment maintenance logs, and AHJ correspondence \u2014 all exportable for inspection prep.',
    kitchen_manager:
      'Location-level compliance reports. Export inspection history or checklist completion records as needed.',
    kitchen_staff:
      'You don\'t have access to reports. Ask your manager if you need documentation.',
  },
  jurisdictionCard: {
    owner_operator:
      'Each location is mapped to its actual enforcement jurisdiction. Scores reflect that agency\'s verified methodology \u2014 not a generic standard.',
    executive:
      'Confirms which regulatory body governs each location and how they score. Different counties grade differently \u2014 this shows the rules for each.',
    compliance_manager:
      'Verified jurisdiction data for this location \u2014 enforcement agency, scoring methodology, and contact information. Nothing assumed.',
    chef:
      'This shows which county health department and fire department oversees your kitchen.',
    facilities_manager:
      'Your fire AHJ details \u2014 the authority that issues your operational permit and conducts fire safety inspections.',
    kitchen_manager:
      'The regulatory agencies that inspect your location and what they look for.',
    kitchen_staff:
      'This shows who inspects your kitchen and what the rules are.',
  },
  teamCard: {
    owner_operator:
      'Staff assignments and role access across all locations. Control who can view, edit, or export compliance data.',
    executive:
      'Staffing overview by location. Team gaps can be a compliance risk if critical roles are unfilled.',
    compliance_manager:
      'Team member roles and their system access. Ensure the right people have the right permissions.',
    chef:
      'Your kitchen team and their assigned tasks. Contact your manager to update team assignments.',
    facilities_manager:
      'Maintenance staff and vendor contacts assigned to your locations.',
    kitchen_manager:
      'Manage your team\'s roles, task assignments, and system access here.',
    kitchen_staff:
      'Your team and their contact information.',
  },
  auditLogCard: {
    owner_operator:
      'A timestamped record of every action taken in your compliance system \u2014 who did what and when. Immutable and exportable for regulatory review.',
    executive:
      'Audit trail for compliance activity across the portfolio. Demonstrates due diligence during inspections or litigation.',
    compliance_manager:
      'The full activity log for your locations. Regulators may request this during inspections \u2014 ensure it is complete.',
    chef:
      'A log of compliance activity in your kitchen. This is read-only.',
    facilities_manager:
      'Equipment service actions, vendor visits, and maintenance logs \u2014 all timestamped here.',
    kitchen_manager:
      'A record of checklist completions, incident logs, and team actions at your location.',
    kitchen_staff:
      'You don\'t have access to the audit log.',
  },
  alertBanner: {
    owner_operator:
      'Active alerts across all locations. Critical alerts require immediate action and affect your compliance standing.',
    executive:
      'Portfolio-level alerts. Critical items represent inspection or enforcement risk.',
    compliance_manager:
      'Regulatory alerts and upcoming inspection deadlines. Critical items must be addressed before your next inspection window.',
    chef:
      'Alerts for your kitchen. Red alerts need attention now \u2014 check with your manager.',
    facilities_manager:
      'Equipment and permit alerts. Red alerts may indicate a failing system or lapsed certification.',
    kitchen_manager:
      'Alerts for your location. Assign critical items to your team and track resolution here.',
    kitchen_staff:
      'If you see a red alert, tell your manager right away.',
  },
  bottomBarActions: {
    owner_operator:
      'Quick actions for your most common tasks \u2014 scan a QR code, log an incident, or start a checklist.',
    executive:
      'Quick access to your most-used views.',
    compliance_manager:
      'Shortcuts to your most frequent compliance tasks.',
    chef:
      'Your daily quick actions \u2014 start a checklist, log an incident, or scan a QR code.',
    facilities_manager:
      'Quick access to equipment checks and maintenance logging.',
    kitchen_manager:
      'One-tap access to today\'s checklists, QR scan, and incident logging for your team.',
    kitchen_staff:
      'Your daily actions \u2014 tap to start a checklist, scan a station QR code, or report an issue.',
  },
  scheduleCalendar: {
    owner_operator:
      'Upcoming maintenance deadlines, vendor visits, permit renewals, and inspection windows across all locations.',
    executive:
      'Portfolio-level schedule of inspections, permit renewals, and vendor service windows.',
    compliance_manager:
      'Inspection calendar, permit renewal deadlines, and self-inspection schedules by location.',
    chef:
      'Upcoming vendor visits and equipment maintenance scheduled for your kitchen.',
    facilities_manager:
      'Upcoming maintenance deadlines, vendor visits, permit renewals, and inspection windows across all locations.',
    kitchen_manager:
      'Scheduled vendor visits and equipment maintenance that may affect kitchen operations.',
    kitchen_staff:
      'Scheduled events that may affect your shift \u2014 vendor visits and equipment maintenance.',
  },
};

// ── TOOLTIPS — Spanish translations ─────────────────────────

export const tooltipContentEs: Record<TooltipSection, Record<UserRole, string>> = {
  // ── TOOLTIPS-1 (original 5 sections) ──────────────────────
  overallScore: {
    owner_operator:
      'Su puntuación combinada de seguridad alimentaria y seguridad contra incendios en todas las ubicaciones, ponderada por la metodología verificada de cada jurisdicción. Esto es lo que los reguladores y auditores ven.',
    executive:
      'Postura de cumplimiento agregada en todo su portafolio. Profundice en ubicaciones individuales para identificar dónde se concentra el riesgo.',
    compliance_manager:
      'Puntuación ponderada por jurisdicción que combina violaciones de seguridad alimentaria y estado de aprobación/fallo de seguridad contra incendios. Refleja su situación actual bajo la metodología de aplicación activa.',
    chef:
      'La puntuación de cumplimiento actual de su ubicación. Completar las listas de verificación diarias y abordar los elementos señalados mueve este número en tiempo real.',
    facilities_manager:
      'Sus sistemas de seguridad contra incendios impactan directamente esta puntuación. Los cuatro sistemas — Permiso, Campana, Extintor y Ansul — deben aprobar en cada ubicación.',
    kitchen_manager:
      'La puntuación de cumplimiento actual de su ubicación. Completar las listas de verificación diarias y abordar los elementos señalados mueve este número en tiempo real.',
    kitchen_staff:
      'Esto muestra cómo le va a su ubicación en salud y seguridad. Complete sus tareas asignadas para mantenerlo en verde.',
  },
  fireSafety: {
    owner_operator:
      'Estado de Aprobado/Reprobado según NFPA 96 (2024) para cada Authority Having Jurisdiction. Una barra roja en cualquier ubicación es una falla de cumplimiento.',
    executive:
      'La seguridad contra incendios es binaria — Aprobado o Reprobado. Un solo sistema fallido expone toda la ubicación a suspensión o cierre del permiso.',
    compliance_manager:
      'Verificado contra NFPA 96 (2024) Tabla 12.4. Cada AHJ está mapeado a su ubicación específica — sin valores genéricos predeterminados.',
    chef:
      'Los cuatro sistemas deben mostrar verde para que su ubicación apruebe la inspección de incendios. Contacte a su Gerente de Instalaciones si alguna barra está en rojo.',
    facilities_manager:
      'Su panel principal. Permiso = permiso operativo vigente. Campana = última limpieza dentro del intervalo NFPA 96. Ext = extintor inspeccionado. Ansul = sistema de supresión con servicio.',
    kitchen_manager:
      'Los cuatro sistemas deben mostrar verde para que su ubicación apruebe la inspección de incendios. Contacte a su Gerente de Instalaciones si alguna barra está en rojo.',
    kitchen_staff:
      'Verde significa que los sistemas de seguridad contra incendios de su cocina están al día. Si ve rojo, informe a su gerente de inmediato.',
  },
  urgentItems: {
    owner_operator:
      'Elementos de alta prioridad en todas las ubicaciones que requieren acción inmediata. Estos conllevan el mayor riesgo regulatorio y de responsabilidad.',
    executive:
      'Elementos críticos sin resolver por ubicación. Cada elemento abierto representa un posible fallo de inspección o acción de cumplimiento.',
    compliance_manager:
      'Violaciones y brechas documentales señaladas como alta prioridad bajo los criterios de aplicación de su jurisdicción activa.',
    chef:
      'Tareas y elementos de lista de verificación señalados como urgentes para su ubicación hoy. Resuélvalos antes de su próximo período de servicio.',
    facilities_manager:
      'Mantenimiento atrasado, permisos vencidos o verificaciones de sistema fallidas. Estos deben resolverse antes de su próxima ventana de inspección.',
    kitchen_manager:
      'Tareas y elementos de lista de verificación señalados como urgentes para su ubicación hoy. Resuélvalos antes de su próximo período de servicio.',
    kitchen_staff:
      'Estas son sus tareas más importantes en este momento. Complételas primero antes de pasar a otras asignaciones.',
  },
  todaysProgress: {
    owner_operator:
      'Tasa de finalización de listas de verificación diarias en todas las ubicaciones. Se reinicia a medianoche hora local.',
    executive:
      'Actividad de cumplimiento operativo para hoy. La finalización diaria consistente se correlaciona con puntuaciones de inspección más altas.',
    compliance_manager:
      'Envíos de listas de verificación de hoy versus tareas requeridas. Las brechas aquí crean riesgo documental durante auditorías.',
    chef:
      'El progreso de su equipo en las listas de verificación asignadas hoy. Toque cualquier elemento para completar o señalar para seguimiento.',
    facilities_manager:
      'Verificaciones de equipo y tareas de mantenimiento programadas para hoy. Los elementos incompletos se transfieren como atrasados.',
    kitchen_manager:
      'El progreso de su equipo en las listas de verificación asignadas hoy. Toque cualquier elemento para completar o señalar para seguimiento.',
    kitchen_staff:
      'Esto es lo que tiene en su lista para hoy. Marque cada tarea a medida que la complete.',
  },
  locationCards: {
    owner_operator:
      'Cada tarjeta refleja la jurisdicción activa de esa ubicación, la metodología de puntuación verificada y la postura de cumplimiento actual.',
    executive:
      'Vista rápida a nivel de ubicación. Haga clic en cualquier tarjeta para ver el historial de inspecciones, tendencias de puntuación y elementos abiertos.',
    compliance_manager:
      'La jurisdicción y metodología de puntuación están verificadas por ubicación — sin suposiciones. Haga clic para ver detalles de la agencia de aplicación y pesos de puntuación.',
    chef:
      'La situación actual de su ubicación. Haga clic para ver las listas de verificación de hoy, elementos abiertos y resultados de inspección recientes.',
    facilities_manager:
      'Muestra el AHJ de incendios, estado de permisos y cumplimiento de equipos por ubicación. Haga clic para gestionar activos y programas de mantenimiento.',
    kitchen_manager:
      'La situación actual de su ubicación. Haga clic para ver las listas de verificación de hoy, elementos abiertos y resultados de inspección recientes.',
    kitchen_staff:
      'Esta es su ubicación. Toque para ver sus tareas de hoy.',
  },

  // ── TOOLTIPS-2 (11 new sections) ──────────────────────────

  locationScoreCard: {
    owner_operator:
      'La puntuación combinada de cumplimiento alimentario e incendios de esta ubicación bajo su jurisdicción activa. Toque para profundizar en el historial de inspecciones y elementos abiertos.',
    executive:
      'Postura de cumplimiento a nivel de ubicación. Cada ubicación se puntúa bajo la metodología de su propia jurisdicción — las puntuaciones no son directamente comparables entre condados.',
    compliance_manager:
      'Puntuación ponderada por jurisdicción para esta ubicación. Refleja la situación actual bajo la metodología de aplicación activa — no una puntuación genérica o estimada.',
    chef:
      'La puntuación de cumplimiento actual de su cocina. Completar las listas de verificación diarias y abordar los elementos señalados la mejora en tiempo real.',
    facilities_manager:
      'Los sistemas de seguridad contra incendios contribuyen directamente a esta puntuación. Los cuatro — Permiso, Campana, Ext, Ansul — deben aprobar.',
    kitchen_manager:
      'La puntuación de cumplimiento de su ubicación. Toque para ver qué la impulsa y qué tareas la moverán.',
    kitchen_staff:
      'Así le va a su cocina. Verde es bueno — complete sus tareas para mantenerlo así.',
  },
  checklistCard: {
    owner_operator:
      'Listas de verificación operativas diarias en todas las ubicaciones. Las tasas de finalización alimentan la documentación de cumplimiento y la preparación para inspecciones.',
    executive:
      'Tasa agregada de finalización de listas de verificación. La finalización diaria consistente es el indicador principal del rendimiento en inspecciones.',
    compliance_manager:
      'Los envíos de listas de verificación crean el rastro de auditoría que los reguladores revisan durante las inspecciones. Las brechas aquí son riesgo documental.',
    chef:
      'La lista de tareas diarias de su equipo. Cada elemento de lista de verificación completado se registra con marca de tiempo para los registros de cumplimiento.',
    facilities_manager:
      'Verificaciones de equipo y seguridad programadas para hoy. Los elementos incompletos se transfieren como atrasados y afectan su puntuación de cumplimiento.',
    kitchen_manager:
      'Las listas de verificación de hoy para su ubicación. Toque para asignar, completar o señalar elementos para seguimiento.',
    kitchen_staff:
      'Sus tareas para hoy. Marque cada una a medida que avanza — su gerente puede ver su progreso.',
  },
  incidentCard: {
    owner_operator:
      'Incidentes registrados en todas las ubicaciones. Cada incidente crea un registro de cumplimiento — los incidentes sin resolver se señalan durante las inspecciones.',
    executive:
      'Conteo de incidentes abiertos por ubicación. La alta frecuencia o los largos tiempos de resolución son indicadores principales de riesgo de inspección.',
    compliance_manager:
      'Los registros de incidentes son parte de su documentación regulatoria. Asegúrese de que cada uno tenga una marca de tiempo de resolución y una acción correctiva registrada.',
    chef:
      'Incidentes registrados en su cocina. Reporte cualquier cosa inusual — los incidentes no registrados crean brechas de cumplimiento.',
    facilities_manager:
      'Fallas de equipo, eventos de seguridad e incidentes de mantenimiento. Documente y resuelva antes de su próxima ventana de inspección.',
    kitchen_manager:
      'Incidentes en su ubicación. Registre nuevos incidentes y dé seguimiento a los elementos abiertos hasta su resolución.',
    kitchen_staff:
      'Si algo sale mal en la cocina, regístrelo aquí. Su gerente dará seguimiento.',
  },
  equipmentCard: {
    owner_operator:
      'Activos de equipo en todas las ubicaciones con estado de mantenimiento. El servicio atrasado en sistemas de supresión de incendios o campanas crea riesgo de cumplimiento.',
    executive:
      'Resumen de salud de activos por ubicación. El mantenimiento diferido en equipos críticos es un problema de responsabilidad y cumplimiento de seguridad contra incendios.',
    compliance_manager:
      'Los registros de servicio de equipos se revisan durante las inspecciones de seguridad contra incendios y salud. Asegúrese de que todas las fechas de servicio estén actualizadas y documentadas.',
    chef:
      'Equipo de cocina asignado a su ubicación. Señale cualquier cosa que necesite reparación — el equipo atrasado afecta las puntuaciones de inspección.',
    facilities_manager:
      'Su registro principal de activos. Rastrea intervalos de servicio, asignaciones de proveedores y fechas de vencimiento según los requisitos de NFPA 96 (2024).',
    kitchen_manager:
      'Equipo en su ubicación y su estado de servicio actual. Toque para registrar una solicitud de mantenimiento o ver el historial de servicio.',
    kitchen_staff:
      'Si un equipo no funciona correctamente, toque aquí para reportarlo.',
  },
  vendorCard: {
    owner_operator:
      'Proveedores que dan servicio a sus ubicaciones — limpieza de campanas, gestión de grasa, supresión de incendios y más. Los registros de servicio alimentan directamente la documentación de cumplimiento.',
    executive:
      'Relaciones con proveedores y estado de contratos por ubicación. Los contratos de servicio vencidos son una exposición de cumplimiento.',
    compliance_manager:
      'Los certificados y fechas de servicio de proveedores son documentación requerida para inspecciones de seguridad contra incendios. Verifique que todos estén vigentes.',
    chef:
      'Los proveedores de servicio programados para su ubicación. Se le notificará antes de las visitas programadas.',
    facilities_manager:
      'Gestione asignaciones de proveedores, programas de servicio y seguimiento de certificados. Las brechas de servicio activan alertas de cumplimiento.',
    kitchen_manager:
      'Proveedores programados para dar servicio a su ubicación. Confirme acceso y registre visitas completadas aquí.',
    kitchen_staff:
      'Los proveedores pueden estar en el sitio para mantenimiento programado. Su gerente le informará con anticipación.',
  },
  reportsCard: {
    owner_operator:
      'Informes de cumplimiento en todas las ubicaciones — historial de inspecciones, tendencias de puntuación y exportaciones de documentación para auditorías o revisión de prestamistas.',
    executive:
      'Informes de cumplimiento a nivel de portafolio. Exporte para revisión de junta directiva, diligencia de prestamistas o propósitos de seguros.',
    compliance_manager:
      'Exportaciones de documentación regulatoria, resúmenes de inspección e historial de violaciones. Sus materiales principales de defensa de auditoría.',
    chef:
      'Los informes de su ubicación están disponibles aquí. Su gerente controla lo que puede ver y exportar.',
    facilities_manager:
      'Informes de servicio de seguridad contra incendios, registros de mantenimiento de equipos y correspondencia con AHJ — todo exportable para preparación de inspecciones.',
    kitchen_manager:
      'Informes de cumplimiento a nivel de ubicación. Exporte historial de inspecciones o registros de finalización de listas de verificación según sea necesario.',
    kitchen_staff:
      'No tiene acceso a informes. Consulte a su gerente si necesita documentación.',
  },
  jurisdictionCard: {
    owner_operator:
      'Cada ubicación está mapeada a su jurisdicción de aplicación real. Las puntuaciones reflejan la metodología verificada de esa agencia — no un estándar genérico.',
    executive:
      'Confirma qué organismo regulador gobierna cada ubicación y cómo puntúan. Diferentes condados califican de manera diferente — esto muestra las reglas para cada uno.',
    compliance_manager:
      'Datos de jurisdicción verificados para esta ubicación — agencia de aplicación, metodología de puntuación e información de contacto. Nada asumido.',
    chef:
      'Esto muestra qué departamento de salud del condado y departamento de bomberos supervisa su cocina.',
    facilities_manager:
      'Los detalles de su AHJ de incendios — la autoridad que emite su permiso operativo y realiza inspecciones de seguridad contra incendios.',
    kitchen_manager:
      'Las agencias regulatorias que inspeccionan su ubicación y lo que buscan.',
    kitchen_staff:
      'Esto muestra quién inspecciona su cocina y cuáles son las reglas.',
  },
  teamCard: {
    owner_operator:
      'Asignaciones de personal y acceso por rol en todas las ubicaciones. Controle quién puede ver, editar o exportar datos de cumplimiento.',
    executive:
      'Vista general de personal por ubicación. Las brechas en el equipo pueden ser un riesgo de cumplimiento si los roles críticos están vacantes.',
    compliance_manager:
      'Roles de los miembros del equipo y su acceso al sistema. Asegúrese de que las personas correctas tengan los permisos correctos.',
    chef:
      'Su equipo de cocina y sus tareas asignadas. Contacte a su gerente para actualizar las asignaciones del equipo.',
    facilities_manager:
      'Personal de mantenimiento y contactos de proveedores asignados a sus ubicaciones.',
    kitchen_manager:
      'Gestione los roles de su equipo, asignaciones de tareas y acceso al sistema aquí.',
    kitchen_staff:
      'Su equipo y su información de contacto.',
  },
  auditLogCard: {
    owner_operator:
      'Un registro con marca de tiempo de cada acción realizada en su sistema de cumplimiento — quién hizo qué y cuándo. Inmutable y exportable para revisión regulatoria.',
    executive:
      'Rastro de auditoría para la actividad de cumplimiento en todo el portafolio. Demuestra la debida diligencia durante inspecciones o litigios.',
    compliance_manager:
      'El registro completo de actividad para sus ubicaciones. Los reguladores pueden solicitar esto durante las inspecciones — asegúrese de que esté completo.',
    chef:
      'Un registro de actividad de cumplimiento en su cocina. Esto es solo lectura.',
    facilities_manager:
      'Acciones de servicio de equipos, visitas de proveedores y registros de mantenimiento — todo con marca de tiempo aquí.',
    kitchen_manager:
      'Un registro de finalizaciones de listas de verificación, registros de incidentes y acciones del equipo en su ubicación.',
    kitchen_staff:
      'No tiene acceso al registro de auditoría.',
  },
  alertBanner: {
    owner_operator:
      'Alertas activas en todas las ubicaciones. Las alertas críticas requieren acción inmediata y afectan su posición de cumplimiento.',
    executive:
      'Alertas a nivel de portafolio. Los elementos críticos representan riesgo de inspección o aplicación.',
    compliance_manager:
      'Alertas regulatorias y fechas límite de inspección próximas. Los elementos críticos deben abordarse antes de su próxima ventana de inspección.',
    chef:
      'Alertas para su cocina. Las alertas rojas necesitan atención ahora — consulte con su gerente.',
    facilities_manager:
      'Alertas de equipos y permisos. Las alertas rojas pueden indicar un sistema fallido o una certificación vencida.',
    kitchen_manager:
      'Alertas para su ubicación. Asigne elementos críticos a su equipo y dé seguimiento a la resolución aquí.',
    kitchen_staff:
      'Si ve una alerta roja, informe a su gerente de inmediato.',
  },
  bottomBarActions: {
    owner_operator:
      'Acciones rápidas para sus tareas más comunes — escanear un código QR, registrar un incidente o iniciar una lista de verificación.',
    executive:
      'Acceso rápido a sus vistas más utilizadas.',
    compliance_manager:
      'Atajos a sus tareas de cumplimiento más frecuentes.',
    chef:
      'Sus acciones rápidas diarias — iniciar una lista de verificación, registrar un incidente o escanear un código QR.',
    facilities_manager:
      'Acceso rápido a verificaciones de equipo y registro de mantenimiento.',
    kitchen_manager:
      'Acceso de un toque a las listas de verificación de hoy, escaneo QR y registro de incidentes para su equipo.',
    kitchen_staff:
      'Sus acciones diarias — toque para iniciar una lista de verificación, escanear un código QR de estación o reportar un problema.',
  },
  scheduleCalendar: {
    owner_operator:
      'Próximas fechas límite de mantenimiento, visitas de proveedores, renovaciones de permisos y ventanas de inspección en todas las ubicaciones.',
    executive:
      'Calendario a nivel de portafolio de inspecciones, renovaciones de permisos y ventanas de servicio de proveedores.',
    compliance_manager:
      'Calendario de inspecciones, fechas límite de renovación de permisos y programas de auto-inspección por ubicación.',
    chef:
      'Próximas visitas de proveedores y mantenimiento de equipos programados para su cocina.',
    facilities_manager:
      'Próximas fechas límite de mantenimiento, visitas de proveedores, renovaciones de permisos y ventanas de inspección en todas las ubicaciones.',
    kitchen_manager:
      'Visitas de proveedores programadas y mantenimiento de equipos que pueden afectar las operaciones de cocina.',
    kitchen_staff:
      'Eventos programados que pueden afectar su turno — visitas de proveedores y mantenimiento de equipos.',
  },
};

// ── TOOLTIPS-2: Sidebar item tooltips (role-neutral) ────────

export interface SidebarTooltipItem {
  label: string;
  description: string;
}

export const sidebarTooltipContent: Record<string, SidebarTooltipItem> = {
  // Ungrouped
  'dashboard':        { label: 'Dashboard',           description: 'Your compliance overview \u2014 scores, alerts, and daily progress at a glance.' },
  'my-tasks':         { label: 'My Tasks',            description: 'Your assigned checklists, temp logs, and action items for today.' },
  'calendar':         { label: 'Calendar',            description: 'Upcoming inspections, vendor visits, permit renewals, and team schedules.' },

  // Daily Operations
  'checklists':       { label: 'Checklists',          description: 'Daily task lists for food safety, temperature logs, and opening/closing procedures.' },
  'temperatures':     { label: 'Temperatures',        description: 'Manual, QR, or IoT-based temperature recording for receiving, storage, and cooking.' },
  'log-temp':         { label: 'Log Temp',            description: 'Quick-log a temperature reading for your station.' },
  'iot-monitoring':   { label: 'IoT Monitoring',      description: 'Live sensor data from connected temperature probes and equipment monitors.' },
  'fire-safety':      { label: 'Fire Safety',         description: 'NFPA 96 compliance status \u2014 permits, hood cleaning, extinguishers, and suppression systems.' },
  'incidents':        { label: 'Incidents',           description: 'Log and track safety or compliance incidents. Each entry creates a timestamped compliance record.' },

  // Records & Assets
  'documents':        { label: 'Documents',           description: 'Compliance certificates, inspection reports, and permit documentation for all locations.' },
  'equipment':        { label: 'Equipment',           description: 'Asset register for all kitchen equipment with service history and next-due maintenance dates.' },
  'haccp':            { label: 'HACCP',               description: 'Hazard Analysis and Critical Control Points \u2014 food safety plans and monitoring records.' },
  'vendors':          { label: 'Vendors',             description: 'Service providers assigned to your locations \u2014 hood cleaning, grease management, fire suppression, and more.' },
  'photos':           { label: 'Photos',              description: 'Photo evidence for inspections, incidents, and compliance documentation.' },
  'training':         { label: 'Training',            description: 'Staff training courses, certifications, and compliance education tracking.' },

  // Compliance & Insights
  'compliance':       { label: 'Compliance Overview',  description: 'Jurisdiction-verified scoring breakdown for food safety and fire safety across all locations.' },
  'self-inspection':  { label: 'Self-Inspection',     description: 'Run a self-inspection using the same criteria your health department or fire AHJ applies.' },
  'inspector':        { label: 'Inspector View',      description: 'See your location through an inspector\'s eyes \u2014 the same view they use during walkthroughs.' },
  'ai-copilot':       { label: 'AI Copilot',          description: 'AI-powered compliance assistant for answering questions and generating action plans.' },
  'regulatory':       { label: 'Regulatory Updates',  description: 'Track upcoming inspection windows, permit renewals, and regulatory changes by jurisdiction.' },
  'reporting':        { label: 'Reporting',           description: 'Export compliance summaries, inspection history, and documentation packages for audits.' },
  'alerts':           { label: 'Alerts',              description: 'Active compliance alerts and notifications requiring attention across your locations.' },

  // Enterprise
  'locations':        { label: 'Locations',           description: 'Add, edit, or configure locations including jurisdiction mapping and scoring methodology.' },
  'benchmarks':       { label: 'Benchmarks',          description: 'Compare compliance performance across locations, regions, or time periods.' },
  'risk-score':       { label: 'Risk Score',          description: 'Insurance risk assessment based on compliance posture, incident history, and equipment status.' },
  'leaderboard':      { label: 'Leaderboard',         description: 'Location and team rankings by compliance performance and daily task completion.' },
  'marketplace':      { label: 'Marketplace',         description: 'Browse and connect with verified compliance service vendors in your area.' },

  // Admin
  'team':             { label: 'Team',                description: 'Manage staff roles, access levels, and location assignments.' },
  'system-admin':     { label: 'System Admin',        description: 'Platform administration, client onboarding, and system configuration.' },
  'settings':         { label: 'Settings',            description: 'Account preferences, notification settings, and platform configuration.' },
  'help':             { label: 'Help & Support',      description: 'Documentation, tutorials, and contact support for assistance.' },
  'usage-analytics':  { label: 'Usage Analytics',     description: 'Platform usage metrics, adoption rates, and engagement analytics.' },
};

// ── TOOLTIPS-2: Sidebar item tooltips — Spanish ─────────────

export const sidebarTooltipContentEs: Record<string, SidebarTooltipItem> = {
  // Sin grupo
  'dashboard':        { label: 'Panel',               description: 'Su resumen de cumplimiento — puntuaciones, alertas y progreso diario de un vistazo.' },
  'my-tasks':         { label: 'Mis Tareas',           description: 'Sus listas de verificación asignadas, registros de temperatura y elementos de acción para hoy.' },
  'calendar':         { label: 'Calendario',           description: 'Próximas inspecciones, visitas de proveedores, renovaciones de permisos y horarios del equipo.' },

  // Operaciones Diarias
  'checklists':       { label: 'Listas de Verificación', description: 'Listas de tareas diarias para seguridad alimentaria, registros de temperatura y procedimientos de apertura/cierre.' },
  'temperatures':     { label: 'Temperaturas',         description: 'Registro de temperatura manual, por QR o IoT para recepción, almacenamiento y cocción.' },
  'log-temp':         { label: 'Registrar Temp',       description: 'Registre rápidamente una lectura de temperatura para su estación.' },
  'iot-monitoring':   { label: 'Monitoreo IoT',        description: 'Datos en vivo de sensores de sondas de temperatura y monitores de equipo conectados.' },
  'fire-safety':      { label: 'Seguridad Contra Incendios', description: 'Estado de cumplimiento NFPA 96 — permisos, limpieza de campanas, extintores y sistemas de supresión.' },
  'incidents':        { label: 'Incidentes',           description: 'Registre y dé seguimiento a incidentes de seguridad o cumplimiento. Cada entrada crea un registro de cumplimiento con marca de tiempo.' },

  // Registros y Activos
  'documents':        { label: 'Documentos',           description: 'Certificados de cumplimiento, informes de inspección y documentación de permisos para todas las ubicaciones.' },
  'equipment':        { label: 'Equipos',              description: 'Registro de activos para todo el equipo de cocina con historial de servicio y fechas de próximo mantenimiento.' },
  'haccp':            { label: 'HACCP',                description: 'HACCP — planes de seguridad alimentaria y registros de monitoreo de puntos críticos de control.' },
  'vendors':          { label: 'Proveedores',          description: 'Proveedores de servicio asignados a sus ubicaciones — limpieza de campanas, gestión de grasa, supresión de incendios y más.' },
  'photos':           { label: 'Fotos',                description: 'Evidencia fotográfica para inspecciones, incidentes y documentación de cumplimiento.' },
  'training':         { label: 'Capacitación',         description: 'Cursos de capacitación del personal, certificaciones y seguimiento de educación en cumplimiento.' },

  // Cumplimiento e Información
  'compliance':       { label: 'Resumen de Cumplimiento', description: 'Desglose de puntuación verificado por jurisdicción para seguridad alimentaria y contra incendios en todas las ubicaciones.' },
  'self-inspection':  { label: 'Auto-Inspección',      description: 'Realice una auto-inspección usando los mismos criterios que aplica su departamento de salud o AHJ de incendios.' },
  'inspector':        { label: 'Vista del Inspector',   description: 'Vea su ubicación a través de los ojos de un inspector — la misma vista que usan durante los recorridos.' },
  'ai-copilot':       { label: 'Copiloto IA',          description: 'Asistente de cumplimiento impulsado por IA para responder preguntas y generar planes de acción.' },
  'regulatory':       { label: 'Actualizaciones Regulatorias', description: 'Seguimiento de próximas ventanas de inspección, renovaciones de permisos y cambios regulatorios por jurisdicción.' },
  'reporting':        { label: 'Informes',             description: 'Exporte resúmenes de cumplimiento, historial de inspecciones y paquetes de documentación para auditorías.' },
  'alerts':           { label: 'Alertas',              description: 'Alertas activas de cumplimiento y notificaciones que requieren atención en sus ubicaciones.' },

  // Empresa
  'locations':        { label: 'Ubicaciones',          description: 'Agregue, edite o configure ubicaciones incluyendo mapeo de jurisdicción y metodología de puntuación.' },
  'benchmarks':       { label: 'Comparativas',         description: 'Compare el rendimiento de cumplimiento entre ubicaciones, regiones o períodos de tiempo.' },
  'risk-score':       { label: 'Puntuación de Riesgo', description: 'Evaluación de riesgo de seguros basada en postura de cumplimiento, historial de incidentes y estado de equipos.' },
  'leaderboard':      { label: 'Clasificación',        description: 'Rankings de ubicaciones y equipos por rendimiento de cumplimiento y finalización de tareas diarias.' },
  'marketplace':      { label: 'Mercado',              description: 'Explore y conéctese con proveedores de servicios de cumplimiento verificados en su área.' },

  // Administración
  'team':             { label: 'Equipo',               description: 'Gestione roles del personal, niveles de acceso y asignaciones de ubicación.' },
  'system-admin':     { label: 'Admin del Sistema',    description: 'Administración de la plataforma, incorporación de clientes y configuración del sistema.' },
  'settings':         { label: 'Configuración',        description: 'Preferencias de cuenta, configuración de notificaciones y configuración de la plataforma.' },
  'help':             { label: 'Ayuda y Soporte',      description: 'Documentación, tutoriales y contacto de soporte para asistencia.' },
  'usage-analytics':  { label: 'Analítica de Uso',     description: 'Métricas de uso de la plataforma, tasas de adopción y analítica de participación.' },
};
