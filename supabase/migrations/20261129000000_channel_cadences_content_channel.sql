-- 1. New column: when set, this channel's actual is counted from content_schedule
--    (posts published this period with channel_label = content_channel), NOT sales_pipeline.
alter table public.channel_cadences add column content_channel text;

-- 2. Reshape the existing "LinkedIn & Social" row into LinkedIn (keep its cadence/
--    target/owner/stage that Arthur already set), point it at content_schedule.
update public.channel_cadences
  set label = 'LinkedIn', content_channel = 'LinkedIn'
  where channel_key = 'linkedin_social';

-- 3. Add the other social channels, each tracked from content_schedule. Stage 'live'
--    (they have a real source now); cadence/target left unset for Arthur to fill.
--    content_channel values match content_schedule.channel_label exactly.
insert into public.channel_cadences (channel_key, label, source_value, stage, content_channel) values
  ('facebook',  'Facebook',  null, 'live', 'Facebook'),
  ('instagram', 'Instagram', null, 'live', 'Instagram'),
  ('x',         'X',         null, 'live', 'X'),
  ('youtube',   'YouTube',   null, 'live', 'YouTube')
on conflict (channel_key) do nothing;
