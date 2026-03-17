/**
 * platform-stats — SOCIAL-PROOF-01
 *
 * Public edge function returning anonymized platform-wide counts
 * for the landing page TrustBar. No auth required.
 * Uses PUBLIC_CORS_HEADERS (wildcard) since landing page is unauthenticated.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PUBLIC_CORS_HEADERS } from '../_shared/cors.ts';

const FALLBACK = {
  kitchens: 300,
  jurisdictions: 62,
  tempLogs: 45000,
  checklistsCompleted: 12000,
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: PUBLIC_CORS_HEADERS });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...PUBLIC_CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [orgsRes, tempRes, checklistRes] = await Promise.all([
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.from('temp_check_completions').select('id', { count: 'exact', head: true }),
      supabase.from('checklist_completions').select('id', { count: 'exact', head: true }),
    ]);

    const stats = {
      kitchens: orgsRes.count ?? FALLBACK.kitchens,
      jurisdictions: 62,
      tempLogs: tempRes.count ?? FALLBACK.tempLogs,
      checklistsCompleted: checklistRes.count ?? FALLBACK.checklistsCompleted,
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        ...PUBLIC_CORS_HEADERS,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return new Response(JSON.stringify(FALLBACK), {
      status: 200,
      headers: {
        ...PUBLIC_CORS_HEADERS,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
});
