-- Insert calendar PRP layout feature flag (admin-only, disabled by default)
INSERT INTO feature_flags (key, name, is_enabled, trigger_type, visible_to, disabled_message_title, disabled_message)
VALUES (
  'calendar_prp_layout_v1',
  'Calendar PRP Layout',
  false,
  'always_on',
  'admin_only',
  'Calendar PRP Layout',
  'Predict / Reduce / Prove framing for the Calendar page.'
)
ON CONFLICT (key) DO NOTHING;
