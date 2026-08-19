alter table public.channel_cadences add column if not exists content_brands text;

update public.channel_cadences
  set label          = 'Websites',
      content_channel = 'Blog,Articles',
      content_brands  = 'EvidLY,Stovio Advisors',
      stage          = 'live'
  where label like 'Website%';
