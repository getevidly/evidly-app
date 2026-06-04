/*
 * Add `service_request_id` to calendar_events table.
 *
 * Purpose: Four write paths (useServiceRequests, useServiceRequestDetail,
 * process-service-request, vendor-schedule-response) insert service_request_id
 * when creating a calendar event from a service request. Column was never
 * migrated — all writes silently lost the FK linkage.
 *
 * Nullable UUID, FK to service_requests(id). CASCADE on delete so calendar
 * events are cleaned up when the originating request is removed.
 */

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS service_request_id uuid
    REFERENCES public.service_requests(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_calendar_events_service_request_id
  ON public.calendar_events(service_request_id);

COMMENT ON COLUMN public.calendar_events.service_request_id IS
  'FK to originating service request. Set by useServiceRequests, process-service-request, vendor-schedule-response.';

-- ── Migration tracker ─────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260603000001')
ON CONFLICT DO NOTHING;
