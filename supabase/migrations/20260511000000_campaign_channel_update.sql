-- CAMPAIGNS-FIX-01: Add google, google_ads, social, sms to channel CHECK constraint
-- Keeps all existing values for backward compat with old campaign rows

ALTER TABLE marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_channel_check;

ALTER TABLE marketing_campaigns ADD CONSTRAINT marketing_campaigns_channel_check
  CHECK (channel IN (
    'google','google_ads','email','social','direct','sms',
    'linkedin','cold_call','event','referral','seo','paid_ads','partner','other'
  ));
