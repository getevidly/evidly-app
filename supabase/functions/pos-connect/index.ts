/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

// ============================================================
// pos-connect — Validate POS credentials & initiate connection
// Supports: Toast, Square, Clover, Lightspeed, Aloha (NCR),
//           Revel, SpotOn, Heartland
// Uses existing integration_connections table.
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, ok, err } from '../_shared/posUtils.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    const { posType, credentials, organizationId } = await req.json();

    if (!posType || !credentials || !organizationId) {
      return err('Missing required fields: posType, credentials, organizationId');
    }

    // 1. Validate credentials by making a test API call
    const validation = await validateCredentials(posType, credentials);
    if (!validation.success) return err(`Invalid credentials: ${validation.error}`);

    // 2. Look up integration catalog entry
    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('slug', posType + '-pos')
      .single();

    // Fallback: try without -pos suffix (e.g. 'aloha-ncr')
    let integrationId = integration?.id;
    if (!integrationId) {
      const slugMap: Record<string, string> = {
        toast: 'toast-pos', square: 'square-pos', clover: 'clover-pos',
        aloha: 'aloha-ncr', lightspeed: 'lightspeed-pos', revel: 'revel-pos',
        spoton: 'spoton-pos', heartland: 'heartland-pos',
      };
      const { data: alt } = await supabase
        .from('integrations')
        .select('id')
        .eq('slug', slugMap[posType] || posType)
        .single();
      integrationId = alt?.id;
    }

    if (!integrationId) {
      return err(`Unknown POS type: ${posType}`);
    }

    // 3. Upsert connection record
    const { data: conn, error: connError } = await supabase
      .from('integration_connections')
      .upsert({
        org_id:          organizationId,
        integration_id:  integrationId,
        status:          'active',
        config:          { credentials, display_name: validation.displayName },
        connected_at:    new Date().toISOString(),
      }, { onConflict: 'org_id,integration_id' })
      .select()
      .single();

    if (connError) throw connError;

    // 4. Trigger initial location sync
    await supabase.functions.invoke('pos-sync-locations', {
      body: { connectionId: conn.id, posType, credentials }
    });

    return ok({ connectionId: conn.id, displayName: validation.displayName });

  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : String(e));
  }
});

// ── Validate credentials per POS type ────────────────────────

async function validateCredentials(posType: string, creds: Record<string, string>) {
  try {
    switch (posType) {

      case 'toast': {
        const res = await fetch(
          'https://ws-sandbox.toasttab.com/authentication/v1/authentication/login',
          { method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: creds['Client ID'],
              clientSecret: creds['Client Secret'],
              userAccessType: 'TOAST_MACHINE_CLIENT',
            }) }
        );
        if (!res.ok) return { success: false, error: 'Invalid Toast credentials' };
        return { success: true, displayName: 'Toast POS' };
      }

      case 'square': {
        const res = await fetch('https://connect.squareup.com/v2/merchants/me', {
          headers: { Authorization: `Bearer ${creds['Access Token']}` }
        });
        if (!res.ok) return { success: false, error: 'Invalid Square credentials' };
        const data = await res.json();
        return { success: true, displayName: data.merchant?.business_name || 'Square' };
      }

      case 'clover': {
        const res = await fetch(
          `https://api.clover.com/v3/merchants/${creds['Merchant ID']}`,
          { headers: { Authorization: `Bearer ${creds['API Key']}` } }
        );
        if (!res.ok) return { success: false, error: 'Invalid Clover credentials' };
        const data = await res.json();
        return { success: true, displayName: data.name || 'Clover' };
      }

      case 'lightspeed': {
        const res = await fetch('https://api.lightspeedhq.com/account.json', {
          headers: { Authorization: `Bearer ${creds['Client Secret']}` }
        });
        if (!res.ok) return { success: false, error: 'Invalid Lightspeed credentials' };
        return { success: true, displayName: 'Lightspeed Restaurant' };
      }

      case 'aloha': {
        const res = await fetch('https://api.ncrcloud.com/site/sites', {
          headers: {
            Authorization: `apikey ${creds['API Key']}`,
            'nep-organization': creds['Site ID'],
          }
        });
        if (!res.ok) return { success: false, error: 'Invalid Aloha/NCR credentials' };
        return { success: true, displayName: 'Aloha (NCR)' };
      }

      case 'revel': {
        const auth = btoa(`${creds['API Key']}:${creds['API Secret']}`);
        const res = await fetch(
          `https://${creds['Establishment']}.revelup.com/resources/Establishment/`,
          { headers: { Authorization: `Basic ${auth}` } }
        );
        if (!res.ok) return { success: false, error: 'Invalid Revel credentials' };
        return { success: true, displayName: 'Revel Systems' };
      }

      case 'spoton': {
        const res = await fetch('https://api.spoton.com/v1/venues', {
          headers: { Authorization: `Bearer ${creds['API Key']}` }
        });
        if (!res.ok) return { success: false, error: 'Invalid SpotOn credentials' };
        return { success: true, displayName: 'SpotOn' };
      }

      case 'heartland': {
        const res = await fetch('https://api.heartlandpaymentsystems.com/v2/merchants', {
          headers: { Authorization: `Bearer ${creds['Secret Key']}` }
        });
        if (!res.ok) return { success: false, error: 'Invalid Heartland credentials' };
        return { success: true, displayName: 'Heartland' };
      }

      default:
        return { success: true, displayName: posType };
    }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
