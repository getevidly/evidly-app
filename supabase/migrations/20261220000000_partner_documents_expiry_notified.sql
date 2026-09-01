-- ══════════════════════════════════════════════════════════════
-- Migration: partner_documents.last_expiry_notified_at
-- Purpose:   Send-dedup for the daily partner-expiry-scan.
--
--            A document sits inside the 30-day window for weeks. The
--            scan runs every day. Without a stamp the same vendor
--            would be emailed about the same document every morning
--            until they replaced it.
--
--            Shape follows vendor-document-reminders (20260819000000),
--            which stamps reminder_*_sent_at on the document row
--            itself rather than keeping a separate log table. That
--            engine uses one column per stage; this is the same
--            family collapsed to a single column with a rolling
--            7-day window, which is all this flow needs.
--
--            intelligence_digest_log (20261216000000) is the other
--            send-dedup precedent, but its semantics are once-ever
--            (UNIQUE on org+signal). An expiry nudge has to be able
--            to recur, so that table's shape does not fit.
--
--            Written only after the vendor's email is confirmed
--            sent — same rule as intelligence_digest_log. A failed
--            send stamps nothing and is retried the next morning.
--
--            Defensive: ADD COLUMN IF NOT EXISTS, safe to re-run.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.partner_documents
  ADD COLUMN IF NOT EXISTS last_expiry_notified_at TIMESTAMPTZ;
