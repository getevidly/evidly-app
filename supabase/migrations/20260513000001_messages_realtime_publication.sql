-- Add message_threads and messages to Supabase Realtime publication.
-- Enables client-side postgres_changes subscriptions for live message delivery.
ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
