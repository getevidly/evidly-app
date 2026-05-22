-- Feature flag: Documents PRP Layout (Predict / Reduce / Prove)
-- Enabled for platform_admin only (Arthur validation). Flip visible_to = 'all' for GA.
INSERT INTO feature_flags (key, name, is_enabled, trigger_type, visible_to, disabled_message_title, disabled_message)
VALUES (
  'documents_prp_layout_v1',
  'Documents PRP Layout',
  true,
  'always_on',
  'admin_only',
  'PRP Layout Upgrade',
  'The enhanced Predict / Reduce / Prove layout for the Documents page.'
)
ON CONFLICT (key) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  visible_to = EXCLUDED.visible_to;
