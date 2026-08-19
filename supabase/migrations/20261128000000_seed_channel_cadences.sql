insert into public.channel_cadences (channel_key, label, source_value, stage) values
  ('cold_calling',      'Cold Calling',            'cold_call', 'live'),
  ('in_person',         'In-Person Prospecting',   'in_person', 'live'),
  ('trade_shows',       'Trade Shows',             'show',      'live'),
  ('email_outreach',    'Email Outreach',          null, 'development'),
  ('linkedin_social',   'LinkedIn & Social',       null, 'development'),
  ('referrals',         'Referrals',               null, 'development'),
  ('partner',           'Trusted Partner Alliance',null, 'development'),
  ('direct_mail',       'Direct Mail',             null, 'development'),
  ('google_ads',        'Google Ads',              null, 'development'),
  ('website_seo',       'Website / SEO',           null, 'development'),
  ('survey',            'Survey',                  null, 'development'),
  ('other',             'Other',                   null, 'development')
on conflict (channel_key) do nothing;

-- cadence_type defaults 'none', target_count null, is_active true — Arthur sets each
-- channel's cadence + target from the Channel Cadences UI.
