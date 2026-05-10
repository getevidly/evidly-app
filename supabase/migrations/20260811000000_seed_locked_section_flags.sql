-- ═══════════════════════════════════════════════════════════════════
-- Seed 14 feature flags for LOCKED sections + intel features
-- All OFF by default. Arthur flips ON individually after data
-- accuracy validation via Admin → Feature Flags.
--
-- Section-level flags:  programs, insights, tools
-- Intel feature flags:  in-ai, in-forecast, in-trends, in-bench,
--                       in-leader, in-reports, in-audit, in-iot,
--                       ju-intel, ju-signals, ju-regulatory
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO feature_flags
  (key, name, description, route, section, is_enabled, trigger_type, visible_to,
   disabled_message_title, disabled_message, sort_order)
VALUES
  -- ── Section-level flags (hide entire sidebar section) ──────────
  ('programs',      'Programs',                'Hidden until data accuracy validated', NULL,                           'programs',     false, 'always_on', 'all', 'Coming soon', 'This feature is being prepared. Check back soon.', 100),
  ('insights',      'Insights',                'Hidden until data accuracy validated', NULL,                           'insights',     false, 'always_on', 'all', 'Coming soon', 'This feature is being prepared. Check back soon.', 101),
  ('tools',         'Tools',                   'Hidden until data accuracy validated', NULL,                           'tools',        false, 'always_on', 'all', 'Coming soon', 'This feature is being prepared. Check back soon.', 102),

  -- ── Intel features (hide individual sidebar items) ─────────────
  ('in-ai',         'AI Insights',             'Hidden until data accuracy validated', '/ai-advisor',                  'insights',     false, 'always_on', 'all', 'Coming soon', 'This feature is being prepared. Check back soon.', 110),
  ('in-forecast',   'Inspection Forecast',     'Hidden until data accuracy validated', '/insights/inspection-forecast','insights',     false, 'always_on', 'all', 'Coming soon', 'This feature is being prepared. Check back soon.', 111),
  ('in-trends',     'Compliance Trends',       'Hidden until data accuracy validated', '/compliance-trends',           'insights',     false, 'always_on', 'all', 'Coming soon', 'This feature is being prepared. Check back soon.', 112),
  ('in-bench',      'Benchmarks',              'Hidden until data accuracy validated', '/benchmarks',                  'insights',     false, 'always_on', 'all', 'Coming soon', 'This feature is being prepared. Check back soon.', 113),
  ('in-leader',     'Team Leaderboard',        'Hidden until data accuracy validated', '/insights/leaderboard',        'insights',     false, 'always_on', 'all', 'Coming soon', 'This feature is being prepared. Check back soon.', 114),
  ('in-reports',    'Reporting',               'Hidden until data accuracy validated', '/reports',                     'insights',     false, 'always_on', 'all', 'Coming soon', 'This feature is being prepared. Check back soon.', 115),
  ('in-audit',      'Audit Log',               'Hidden until data accuracy validated', '/audit-trail',                 'insights',     false, 'always_on', 'all', 'Coming soon', 'This feature is being prepared. Check back soon.', 116),
  ('in-iot',        'IoT Dashboard',           'Hidden until data accuracy validated', '/iot-monitoring',              'insights',     false, 'always_on', 'all', 'Coming soon', 'This feature is being prepared. Check back soon.', 117),
  ('ju-intel',      'Jurisdiction Intelligence','Hidden until data accuracy validated', '/jurisdiction-intelligence',   'jurisdiction', false, 'always_on', 'all', 'Coming soon', 'This feature is being prepared. Check back soon.', 120),
  ('ju-signals',    'Jurisdiction Signals',     'Hidden until data accuracy validated', '/insights/signals',            'jurisdiction', false, 'always_on', 'all', 'Coming soon', 'This feature is being prepared. Check back soon.', 121),
  ('ju-regulatory', 'Regulatory Updates',      'Hidden until data accuracy validated', '/regulatory-alerts',           'jurisdiction', false, 'always_on', 'all', 'Coming soon', 'This feature is being prepared. Check back soon.', 122)
ON CONFLICT (key) DO NOTHING;
