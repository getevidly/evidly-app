-- ============================================================
-- Add YouTube and Direct Mail to marketing_channels
-- ============================================================
-- Appends two new channels after the existing 16 (sort_order 17-18).
-- Uses ON CONFLICT (slug) so re-running is safe.
-- ============================================================

INSERT INTO marketing_channels (
  slug, name, label, category, prp_band,
  cadence, tool, kpi, target, notes,
  priority, is_new, flag,
  activation_start_month, activation_end_month,
  sort_order, is_active
) VALUES
  ('youtube',
   'YouTube', 'YouTube', 'Social', 'PREDICT',
   '1 / wk', 'YouTube Studio', 'Subscribers + watch hours', '1K subs by M12',
   'Long-form proof content — inspection walkthroughs, compliance explainers.',
   false, true, NULL, 0, 11, 17, true),

  ('direct_mail',
   'Direct Mail', 'Direct Mail', 'Owned / Nurture', 'REDUCE',
   'Monthly', 'Print + USPS', 'Response rate', '2% response',
   'Targeted mailers to high-value operator segments.',
   false, true, NULL, 0, 11, 18, true)

ON CONFLICT (slug) DO UPDATE SET
  name                    = EXCLUDED.name,
  label                   = EXCLUDED.label,
  category                = EXCLUDED.category,
  prp_band                = EXCLUDED.prp_band,
  cadence                 = EXCLUDED.cadence,
  tool                    = EXCLUDED.tool,
  kpi                     = EXCLUDED.kpi,
  target                  = EXCLUDED.target,
  notes                   = EXCLUDED.notes,
  priority                = EXCLUDED.priority,
  is_new                  = EXCLUDED.is_new,
  flag                    = EXCLUDED.flag,
  activation_start_month  = EXCLUDED.activation_start_month,
  activation_end_month    = EXCLUDED.activation_end_month,
  sort_order              = EXCLUDED.sort_order,
  is_active               = true,
  updated_at              = now();
