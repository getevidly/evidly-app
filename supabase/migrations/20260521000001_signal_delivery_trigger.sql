-- AUDIT-FIX-04 / FIX 3: DB trigger for signal delivery
--
-- Fires when is_published flips from false → true on intelligence_signals.
-- Calls the intelligence-deliver edge function via pg_net.
--
-- If pg_net is not available, this trigger is a no-op — use Supabase Realtime
-- broadcast from the intelligence-deliver edge function instead.

-- Guard: only create if pg_net extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION notify_signal_published()
      RETURNS TRIGGER AS $trigger$
      BEGIN
        IF OLD.is_published = false AND NEW.is_published = true THEN
          PERFORM net.http_post(
            url := current_setting('app.supabase_url', true) || '/functions/v1/intelligence-deliver',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
            ),
            body := jsonb_build_object(
              'signal_id', NEW.id,
              'signal_type', NEW.signal_type,
              'org_id', NEW.org_id,
              'priority', NEW.priority
            )
          );
        END IF;
        RETURN NEW;
      END;
      $trigger$ LANGUAGE plpgsql SECURITY DEFINER;
    $fn$;

    DROP TRIGGER IF EXISTS on_signal_published ON intelligence_signals;
    CREATE TRIGGER on_signal_published
      AFTER UPDATE ON intelligence_signals
      FOR EACH ROW
      EXECUTE FUNCTION notify_signal_published();

    RAISE NOTICE 'signal_delivery_trigger: pg_net trigger created';
  ELSE
    RAISE NOTICE 'signal_delivery_trigger: pg_net not available — use Realtime broadcast from edge function instead';
  END IF;
END;
$$;
