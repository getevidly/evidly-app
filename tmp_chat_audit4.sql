-- Column inventory
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='message_threads' ORDER BY ordinal_position;
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' ORDER BY ordinal_position;
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='message_attachments' ORDER BY ordinal_position;
-- Realtime publication
SELECT pubname, tablename FROM pg_publication_tables WHERE tablename IN ('message_threads','messages','message_attachments');
