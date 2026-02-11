/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type Strategy = 'evidly_wins' | 'external_wins' | 'newest_wins' | 'manual';

interface ConflictRequest {
  integration_id: string;
  entity_type: string;
  evidly_record: Record<string, unknown>;
  external_record: Record<string, unknown>;
  evidly_updated_at: string;
  external_updated_at: string;
  strategy?: Strategy;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const body: ConflictRequest = await req.json();
  const strategy = body.strategy || 'newest_wins';

  // Detect conflicting fields
  const conflicts: { field: string; evidly_value: unknown; external_value: unknown }[] = [];
  const allKeys = new Set([...Object.keys(body.evidly_record), ...Object.keys(body.external_record)]);

  for (const key of allKeys) {
    const ev = body.evidly_record[key];
    const ex = body.external_record[key];
    if (JSON.stringify(ev) !== JSON.stringify(ex) && ev !== undefined && ex !== undefined) {
      conflicts.push({ field: key, evidly_value: ev, external_value: ex });
    }
  }

  if (conflicts.length === 0) {
    return new Response(JSON.stringify({ resolved: true, strategy: 'no_conflict', merged: body.evidly_record }), { headers: { 'Content-Type': 'application/json' } });
  }

  let merged: Record<string, unknown>;

  switch (strategy) {
    case 'evidly_wins':
      merged = { ...body.external_record, ...body.evidly_record };
      break;
    case 'external_wins':
      merged = { ...body.evidly_record, ...body.external_record };
      break;
    case 'newest_wins': {
      const evidlyNewer = new Date(body.evidly_updated_at) >= new Date(body.external_updated_at);
      merged = evidlyNewer
        ? { ...body.external_record, ...body.evidly_record }
        : { ...body.evidly_record, ...body.external_record };
      break;
    }
    case 'manual':
      return new Response(JSON.stringify({
        resolved: false,
        strategy: 'manual',
        conflicts,
        message: 'Manual resolution required',
      }), { headers: { 'Content-Type': 'application/json' } });
    default:
      merged = { ...body.external_record, ...body.evidly_record };
  }

  return new Response(JSON.stringify({
    resolved: true,
    strategy,
    conflicts_detected: conflicts.length,
    conflicts,
    merged,
  }), { headers: { 'Content-Type': 'application/json' } });
});
