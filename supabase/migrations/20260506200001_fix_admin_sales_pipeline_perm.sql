-- Fix: admin role should NOT have sales_pipeline access
-- Only super_admin and sales roles can access sales/marketing pages.
UPDATE evidly_role_permissions
SET perm_sales_pipeline = false
WHERE role_name = 'admin';
