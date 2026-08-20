-- Add last_crawled_at to facilities so the crawler can skip recently-processed rows
alter table public.facilities
  add column if not exists last_crawled_at timestamptz;
