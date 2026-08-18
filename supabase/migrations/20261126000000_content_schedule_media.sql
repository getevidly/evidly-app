-- Add media_type and media_url columns for linked media assets.

alter table public.content_schedule
  add column if not exists media_type text not null default 'none'
  check (media_type in ('none','image','video','file'));

alter table public.content_schedule
  add column if not exists media_url text;
