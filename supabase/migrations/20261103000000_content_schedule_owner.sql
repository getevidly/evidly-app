-- Add owner column to content_schedule for assigning content pieces
alter table public.content_schedule add column if not exists owner text;
