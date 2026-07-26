-- Fix notify_on_signal_publish(): remove reference to NEW.summary
-- which does not exist on intelligence_signals in prod.
--
-- The column "summary" was never added (schema_align migration not applied).
-- Every publish attempt throws: 42703 "record 'new' has no field 'summary'"
--
-- Fix: drop NEW.summary from the COALESCE chain. NEW.ai_summary and
-- NEW.content_summary both exist; content_summary is populated on all rows.
--
-- CREATE OR REPLACE only — the trigger on_signal_published is NOT
-- dropped or recreated, so there is no window without a trigger.

CREATE OR REPLACE FUNCTION public.notify_on_signal_publish()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only fire when is_published flips from false/null to true
  IF NEW.is_published = true AND (OLD.is_published IS DISTINCT FROM true) THEN
    INSERT INTO notifications (
      organization_id, signal_id, type, title, body, action_url, cic_pillar, priority
    )
    SELECT
      o.id,
      NEW.id,
      'intelligence_signal',
      NEW.title,
      COALESCE(NEW.ai_summary, NEW.content_summary),
      '/insights/intelligence',
      NEW.cic_pillar,
      CASE
        WHEN COALESCE(NEW.revenue_risk_level,'none')   = 'critical'
          OR COALESCE(NEW.liability_risk_level,'none')  = 'critical'
          OR COALESCE(NEW.ai_urgency,'medium')          = 'critical'
          THEN 'critical'
        WHEN COALESCE(NEW.revenue_risk_level,'none')   = 'high'
          OR COALESCE(NEW.liability_risk_level,'none')  = 'high'
          OR COALESCE(NEW.ai_urgency,'medium')          = 'high'
          THEN 'high'
        WHEN COALESCE(NEW.cost_risk_level,'none')      = 'high'
          OR COALESCE(NEW.operational_risk_level,'none') = 'high'
          THEN 'medium'
        ELSE 'low'
      END
    FROM organizations o
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.signal_id = NEW.id AND n.organization_id = o.id
    );
  END IF;
  RETURN NEW;
END;
$function$;
