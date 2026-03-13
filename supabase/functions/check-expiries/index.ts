/**
 * check-expiries — Daily cron job to check for expiring items.
 * Checks: vehicle registration, vehicle inspection, insurance policies, roadside assistance.
 * Sends notifications to admins/owners for items expiring within 30 days.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPIRY_WINDOW_DAYS = 30;

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = new Date();
  const cutoff = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const alerts: { type: string; entity: string; expiry_date: string; vendor_id: string }[] = [];

  // 1. Vehicle registrations expiring
  const { data: regExpiring } = await supabase
    .from('vehicles')
    .select('id, name, registration_expiry, vendor_id')
    .gte('registration_expiry', today)
    .lte('registration_expiry', cutoff)
    .eq('status', 'active');

  for (const v of regExpiring || []) {
    alerts.push({
      type: 'vehicle_registration',
      entity: v.name,
      expiry_date: v.registration_expiry,
      vendor_id: v.vendor_id,
    });
  }

  // 2. Vehicle inspections due
  const { data: inspDue } = await supabase
    .from('vehicles')
    .select('id, name, next_inspection_due, vendor_id')
    .gte('next_inspection_due', today)
    .lte('next_inspection_due', cutoff)
    .eq('status', 'active');

  for (const v of inspDue || []) {
    alerts.push({
      type: 'vehicle_inspection',
      entity: v.name,
      expiry_date: v.next_inspection_due,
      vendor_id: v.vendor_id,
    });
  }

  // 3. Vehicle insurance expiring
  const { data: vehInsExpiring } = await supabase
    .from('vehicle_insurance')
    .select('id, policy_type, insurance_company, expiry_date, vendor_id')
    .gte('expiry_date', today)
    .lte('expiry_date', cutoff)
    .eq('is_active', true);

  for (const p of vehInsExpiring || []) {
    alerts.push({
      type: 'vehicle_insurance',
      entity: `${p.insurance_company} (${p.policy_type})`,
      expiry_date: p.expiry_date,
      vendor_id: p.vendor_id,
    });
  }

  // 4. Company insurance expiring
  const { data: compInsExpiring } = await supabase
    .from('company_insurance')
    .select('id, policy_type, insurance_company, expiry_date, vendor_id')
    .gte('expiry_date', today)
    .lte('expiry_date', cutoff)
    .eq('is_active', true);

  for (const p of compInsExpiring || []) {
    alerts.push({
      type: 'company_insurance',
      entity: `${p.insurance_company} (${p.policy_type})`,
      expiry_date: p.expiry_date,
      vendor_id: p.vendor_id,
    });
  }

  // 5. Roadside assistance expiring
  const { data: roadsideExpiring } = await supabase
    .from('roadside_assistance')
    .select('id, provider_name, expiry_date, vendor_id')
    .gte('expiry_date', today)
    .lte('expiry_date', cutoff)
    .eq('is_active', true);

  for (const r of roadsideExpiring || []) {
    alerts.push({
      type: 'roadside_assistance',
      entity: r.provider_name,
      expiry_date: r.expiry_date,
      vendor_id: r.vendor_id,
    });
  }

  // Log alerts (in production, these would create notification records)
  if (alerts.length > 0) {
    console.log(`[check-expiries] Found ${alerts.length} items expiring within ${EXPIRY_WINDOW_DAYS} days`);
    for (const a of alerts) {
      console.log(`  - ${a.type}: ${a.entity} expires ${a.expiry_date}`);
    }
  } else {
    console.log('[check-expiries] No items expiring soon.');
  }

  return new Response(JSON.stringify({
    checked_at: now.toISOString(),
    alerts_count: alerts.length,
    alerts,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
