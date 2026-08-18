-- Add post_as column: who publishes each post (personal vs company account).

alter table public.content_schedule
  add column if not exists post_as text not null default 'company'
  check (post_as in ('personal','company'));
