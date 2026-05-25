BEGIN;

-- Correct equipment_type: walk-in/reach-in are cold_storage, not cold_holding
UPDATE temperature_equipment
  SET equipment_type = 'cold_storage'
  WHERE name IN ('Walk-in Cooler', 'Reach-in Cooler');

-- Re-map ccp_id to CCP-02 (Cold Storage) via the mapping function
UPDATE temperature_equipment te
SET ccp_id = ccp.id
FROM haccp_critical_control_points ccp
JOIN haccp_plans p ON ccp.plan_id = p.id
WHERE p.organization_id = te.organization_id
  AND p.status = 'active'
  AND p.name = 'Operational HACCP — California Retail Food Code'
  AND ccp.ccp_number = fn_map_equipment_type_to_ccp(te.equipment_type)
  AND te.name IN ('Walk-in Cooler', 'Reach-in Cooler');

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260525220000');

COMMIT;
