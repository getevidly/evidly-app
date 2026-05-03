-- Migration: 3f — vw_haccp_evidence + vw_inspector_evidence
-- Tier 1 schema. Unifies temperature logs, CCP monitoring readings,
-- checklist completions, and corrective actions into a single evidence
-- row shape. vw_inspector_evidence enriches vw_haccp_evidence with
-- location + jurisdiction + framework context for the Inspector Package
-- report (consumed by 3g rebuild of handleExportInspectorPackage).

CREATE OR REPLACE VIEW vw_haccp_evidence AS
-- Temperature log readings
SELECT
  tl.id                                               AS evidence_id,
  'temperature_log'                                   AS evidence_type,
  te.organization_id                                  AS organization_id,
  tl.facility_id                                      AS location_id,
  tl.reading_time                                     AS occurred_at,
  tl.logged_by                                        AS actor_id,
  NULL::text                                          AS actor_name,
  COALESCE(te.name, 'Unknown equipment')              AS subject,
  CASE
    WHEN tl.required_min IS NOT NULL AND tl.required_max IS NOT NULL
      THEN tl.temperature::text || ' ' || COALESCE(te.unit, '°F')
        || ' (range ' || tl.required_min::text || '–' || tl.required_max::text
        || ' ' || COALESCE(te.unit, '°F') || ')'
    ELSE tl.temperature::text || ' ' || COALESCE(te.unit, '°F')
  END                                                 AS detail,
  CASE WHEN tl.temp_pass THEN 'PASS' ELSE 'FAIL' END  AS result,
  tl.temp_pass                                        AS result_passed,
  'temperature_logs'                                  AS source_table
FROM temperature_logs tl
LEFT JOIN temperature_equipment te ON te.id = tl.equipment_id

UNION ALL

-- CCP monitoring readings
SELECT
  hml.id                                              AS evidence_id,
  'ccp_monitoring'                                    AS evidence_type,
  hml.organization_id                                 AS organization_id,
  hml.facility_id                                     AS location_id,
  hml.monitored_at                                    AS occurred_at,
  hml.monitored_by                                    AS actor_id,
  hml.monitored_by_name                               AS actor_name,
  COALESCE(hccp.ccp_number || ': ' || hccp.hazard, 'CCP reading') AS subject,
  COALESCE(hml.reading_text,
    hml.reading_value::text || ' ' || COALESCE(hml.reading_unit, ''))
                                                      AS detail,
  CASE WHEN hml.is_within_limit THEN 'PASS' ELSE 'FAIL' END AS result,
  hml.is_within_limit                                 AS result_passed,
  'haccp_monitoring_logs'                             AS source_table
FROM haccp_monitoring_logs hml
LEFT JOIN haccp_critical_control_points hccp ON hccp.id = hml.ccp_id

UNION ALL

-- Checklist completions
SELECT
  ctc.id                                              AS evidence_id,
  'checklist_completion'                              AS evidence_type,
  ctc.organization_id                                 AS organization_id,
  ctc.location_id                                     AS location_id,
  COALESCE(ctc.completed_at, ctc.created_at)          AS occurred_at,
  ctc.completed_by                                    AS actor_id,
  NULL::text                                          AS actor_name,
  COALESCE(ct.name, 'Checklist completion')           AS subject,
  CASE
    WHEN ctc.score_percentage IS NOT NULL
      THEN ctc.score_percentage::text || '% ('
        || COALESCE(ctc.passed_items, 0)::text || '/'
        || COALESCE(ctc.total_items, 0)::text || ' items)'
    ELSE COALESCE(ctc.status, 'completed')
  END                                                 AS detail,
  CASE
    WHEN ctc.score_percentage >= 100 THEN 'PASS'
    WHEN ctc.score_percentage IS NULL THEN COALESCE(ctc.status, 'N/A')
    ELSE 'PARTIAL'
  END                                                 AS result,
  (ctc.score_percentage = 100)                        AS result_passed,
  'checklist_template_completions'                    AS source_table
FROM checklist_template_completions ctc
LEFT JOIN checklist_templates ct ON ct.id = ctc.template_id

UNION ALL

-- Corrective actions
SELECT
  hca.id                                              AS evidence_id,
  'corrective_action'                                 AS evidence_type,
  hca.organization_id                                 AS organization_id,
  hca.location_id                                     AS location_id,
  hca.created_at                                      AS occurred_at,
  NULL::uuid                                          AS actor_id,
  hca.action_by                                       AS actor_name,
  hca.plan_name || ' — ' || hca.ccp_number            AS subject,
  'Deviation: ' || hca.deviation
    || ' | Limit: ' || hca.critical_limit
    || ' | Recorded: ' || hca.recorded_value
    || ' | Action: ' || hca.action_taken              AS detail,
  UPPER(hca.status)                                   AS result,
  (LOWER(hca.status) IN ('resolved','verified','closed')) AS result_passed,
  'haccp_corrective_actions'                          AS source_table
FROM haccp_corrective_actions hca;


CREATE OR REPLACE VIEW vw_inspector_evidence AS
SELECT
  ev.evidence_id,
  ev.evidence_type,
  ev.organization_id,
  ev.location_id,
  ev.occurred_at,
  ev.actor_id,
  ev.actor_name,
  ev.subject,
  ev.detail,
  ev.result,
  ev.result_passed,
  ev.source_table,
  loc.name           AS location_name,
  loc.city           AS location_city,
  loc.state          AS location_state,
  lj.jurisdiction_id AS jurisdiction_id,
  j.agency_name      AS agency_name,
  j.regulatory_framework_id AS regulatory_framework_id,
  rf.name            AS framework_name,
  rf.code            AS framework_code
FROM vw_haccp_evidence ev
LEFT JOIN locations loc ON loc.id = ev.location_id
LEFT JOIN LATERAL (
  SELECT lj.jurisdiction_id
  FROM location_jurisdictions lj
  WHERE lj.location_id = ev.location_id
    AND lj.jurisdiction_layer = 'food_safety'
  ORDER BY lj.is_most_restrictive DESC NULLS LAST, lj.created_at ASC
  LIMIT 1
) lj ON true
LEFT JOIN jurisdictions j ON j.id = lj.jurisdiction_id
LEFT JOIN regulatory_frameworks rf ON rf.id = j.regulatory_framework_id;


GRANT SELECT ON vw_haccp_evidence TO authenticated;
GRANT SELECT ON vw_inspector_evidence TO authenticated;
