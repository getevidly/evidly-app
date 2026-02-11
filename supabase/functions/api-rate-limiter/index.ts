/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TIER_LIMITS: Record<string, { rpm: number; rpd: number; burst: number }> = {
  starter: { rpm: 60, rpd: 10000, burst: 10 },
  professional: { rpm: 300, rpd: 100000, burst: 50 },
  enterprise: { rpm: 1000, rpd: 1000000, burst: 200 },
};

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const { application_id, rate_limit_tier } = await req.json();

  const limits = TIER_LIMITS[rate_limit_tier] || TIER_LIMITS.starter;
  const now = new Date();
  const oneMinAgo = new Date(now.getTime() - 60000).toISOString();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // Count requests in last minute (sliding window)
  const { count: minuteCount } = await supabase
    .from('api_request_log')
    .select('*', { count: 'exact', head: true })
    .eq('application_id', application_id)
    .gte('created_at', oneMinAgo);

  // Count requests today
  const { count: dayCount } = await supabase
    .from('api_request_log')
    .select('*', { count: 'exact', head: true })
    .eq('application_id', application_id)
    .gte('created_at', startOfDay);

  const currentMinute = minuteCount ?? 0;
  const currentDay = dayCount ?? 0;

  const allowed = currentMinute < limits.rpm && currentDay < limits.rpd;

  return new Response(JSON.stringify({
    allowed,
    limits: { rpm: limits.rpm, rpd: limits.rpd },
    current: { minute: currentMinute, day: currentDay },
    headers: {
      'X-RateLimit-Limit': limits.rpm,
      'X-RateLimit-Remaining': Math.max(0, limits.rpm - currentMinute),
      'X-RateLimit-Reset': Math.ceil(now.getTime() / 60000) * 60,
    },
  }), { headers: { 'Content-Type': 'application/json' } });
});
