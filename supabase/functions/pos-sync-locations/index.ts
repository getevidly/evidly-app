/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

// ============================================================
// pos-sync-locations — Pull locations from POS → EvidLY
// Uses existing tables: integration_connections, integration_entity_map,
//                       integration_sync_log, locations
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, ok, err, detectCountyFromCity, type POSLocation } from '../_shared/posUtils.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    const { connectionId, posType, credentials: passedCreds } = await req.json();

    // Get connection + credentials
    const { data: conn } = await supabase
      .from('integration_connections')
      .select('*, integrations(slug)')
      .eq('id', connectionId)
      .single();

    if (!conn) return err('Connection not found');

    const creds = passedCreds || conn.config?.credentials;
    const type = posType || conn.integrations?.slug?.replace(/-pos$/, '') || '';

    // Mark as syncing
    await supabase.from('integration_connections')
      .update({ status: 'active' }).eq('id', connectionId);

    // Fetch locations from POS
    const locations = await fetchLocations(type, creds);

    const logEntry = {
      integration_id: conn.integration_id,
      sync_type:      'pull' as const,
      entity_type:    'locations',
      direction:      'inbound' as const,
      records_processed: locations.length,
      records_created:   0,
      records_updated:   0,
      records_failed:    0,
      status:            'running' as const,
      started_at:        new Date().toISOString(),
    };

    // Upsert each location into EvidLY
    for (const loc of locations) {
      const county = detectCountyFromCity(loc.city, loc.state);

      // Check if mapping already exists
      const { data: existing } = await supabase
        .from('integration_entity_map')
        .select('evidly_entity_id')
        .eq('integration_id', conn.integration_id)
        .eq('platform_entity_id', loc.posLocationId)
        .eq('evidly_entity_type', 'location')
        .single();

      if (!existing) {
        // Create new EvidLY location
        const { data: newLoc, error: locError } = await supabase
          .from('locations')
          .insert({
            organization_id: conn.org_id,
            name:            loc.name,
            address:         loc.address,
            city:            loc.city,
            state:           loc.state,
            zip:             loc.zip,
            phone:           loc.phone,
            county:          county,
            status:          loc.isActive ? 'active' : 'inactive',
            source:          type,
          })
          .select()
          .single();

        if (!locError && newLoc) {
          // Create entity mapping
          await supabase.from('integration_entity_map').insert({
            integration_id:       conn.integration_id,
            evidly_entity_type:   'location',
            evidly_entity_id:     newLoc.id,
            platform_entity_type: 'location',
            platform_entity_id:   loc.posLocationId,
            sync_direction:       'inbound',
            last_synced_at:       new Date().toISOString(),
          });
          logEntry.records_created++;
        } else {
          logEntry.records_failed++;
        }
      } else {
        // Update existing location
        await supabase.from('locations')
          .update({
            name:    loc.name,
            address: loc.address,
            status:  loc.isActive ? 'active' : 'inactive',
          })
          .eq('id', existing.evidly_entity_id);

        await supabase.from('integration_entity_map')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('integration_id', conn.integration_id)
          .eq('platform_entity_id', loc.posLocationId)
          .eq('evidly_entity_type', 'location');

        logEntry.records_updated++;
      }
    }

    // Log sync result
    await supabase.from('integration_sync_log').insert({
      ...logEntry,
      status:       'completed',
      completed_at: new Date().toISOString(),
    });

    // Update connection last_sync
    await supabase.from('integration_connections').update({
      last_sync_at: new Date().toISOString(),
    }).eq('id', connectionId);

    return ok({
      synced:  locations.length,
      created: logEntry.records_created,
      updated: logEntry.records_updated,
      failed:  logEntry.records_failed,
    });

  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : String(e));
  }
});

// ── PER-POS FETCH IMPLEMENTATIONS ─────────────────────────────

async function fetchLocations(posType: string, creds: Record<string, string>): Promise<POSLocation[]> {
  switch (posType) {

    case 'toast': {
      const authRes = await fetch(
        'https://ws-api.toasttab.com/authentication/v1/authentication/login',
        { method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: creds['Client ID'],
            clientSecret: creds['Client Secret'],
            userAccessType: 'TOAST_MACHINE_CLIENT',
          }) }
      );
      const auth = await authRes.json();
      const token = auth.token?.accessToken;

      const res = await fetch(
        'https://ws-api.toasttab.com/restaurants/v1/groups',
        { headers: { Authorization: `Bearer ${token}`,
                     'Toast-Restaurant-External-ID': creds['Restaurant GUID'] } }
      );
      const data = await res.json();
      return (data || []).map((r: Record<string, unknown>) => ({
        posLocationId: r.guid as string,
        name:          (r.restaurantName || '') as string,
        address:       ((r.location as Record<string, unknown>)?.address1 || '') as string,
        city:          ((r.location as Record<string, unknown>)?.city || '') as string,
        state:         ((r.location as Record<string, unknown>)?.stateCode || 'CA') as string,
        zip:           ((r.location as Record<string, unknown>)?.zipCode || '') as string,
        phone:         ((r.location as Record<string, unknown>)?.phone) as string | undefined,
        timezone:      r.timeZone as string | undefined,
        isActive:      r.status !== 'DEACTIVATED',
      }));
    }

    case 'square': {
      const res = await fetch('https://connect.squareup.com/v2/locations', {
        headers: { Authorization: `Bearer ${creds['Access Token']}` }
      });
      const data = await res.json();
      return (data.locations || []).map((l: Record<string, unknown>) => {
        const addr = l.address as Record<string, string> | undefined;
        return {
          posLocationId: l.id as string,
          name:          (l.name || '') as string,
          address:       addr?.address_line_1 || '',
          city:          addr?.locality || '',
          state:         addr?.administrative_district_level_1 || 'CA',
          zip:           addr?.postal_code || '',
          phone:         l.phone_number as string | undefined,
          timezone:      l.timezone as string | undefined,
          isActive:      l.status === 'ACTIVE',
        };
      });
    }

    case 'clover': {
      const res = await fetch(
        `https://api.clover.com/v3/merchants/${creds['Merchant ID']}/branches`,
        { headers: { Authorization: `Bearer ${creds['API Key']}` } }
      );
      const data = await res.json();
      return (data.elements || []).map((b: Record<string, unknown>) => {
        const addr = b.address as Record<string, string> | undefined;
        return {
          posLocationId: b.id as string,
          name:          (b.name || '') as string,
          address:       addr?.address1 || '',
          city:          addr?.city || '',
          state:         addr?.state || 'CA',
          zip:           addr?.zip || '',
          phone:         b.phoneNumber as string | undefined,
          isActive:      true,
        };
      });
    }

    case 'lightspeed': {
      const res = await fetch(
        'https://api.lightspeedhq.com/API/Account/Current.json',
        { headers: { Authorization: `Bearer ${creds['Client Secret']}` } }
      );
      const data = await res.json();
      const account = data.Account || {};
      const addr = account.Address || {};
      return [{
        posLocationId: account.accountID || 'ls-1',
        name:          account.name || 'Lightspeed Location',
        address:       addr.address1 || '',
        city:          addr.city || '',
        state:         addr.state || 'CA',
        zip:           addr.zip || '',
        isActive:      true,
      }];
    }

    case 'aloha': {
      const res = await fetch('https://api.ncrcloud.com/site/sites', {
        headers: {
          Authorization: `apikey ${creds['API Key']}`,
          'nep-organization': creds['Site ID'],
        }
      });
      const data = await res.json();
      return (data.sites || []).map((s: Record<string, unknown>) => {
        const addr = s.address as Record<string, string> | undefined;
        return {
          posLocationId: (s.siteName || '') as string,
          name:          (s.siteDisplayName || s.siteName || '') as string,
          address:       addr?.addressLine1 || '',
          city:          addr?.city || '',
          state:         addr?.territory || 'CA',
          zip:           addr?.postalCode || '',
          isActive:      s.status === 'ACTIVE',
        };
      });
    }

    case 'revel': {
      const auth = btoa(`${creds['API Key']}:${creds['API Secret']}`);
      const res = await fetch(
        `https://${creds['Establishment']}.revelup.com/resources/Establishment/`,
        { headers: { Authorization: `Basic ${auth}` } }
      );
      const data = await res.json();
      return (data.objects || []).map((e: Record<string, unknown>) => ({
        posLocationId: String(e.id),
        name:          (e.name || '') as string,
        address:       (e.address || '') as string,
        city:          (e.city || '') as string,
        state:         (e.state || 'CA') as string,
        zip:           (e.zip || '') as string,
        phone:         e.phone as string | undefined,
        timezone:      e.timezone as string | undefined,
        isActive:      !e.deleted,
      }));
    }

    case 'spoton': {
      const res = await fetch('https://api.spoton.com/v1/venues', {
        headers: { Authorization: `Bearer ${creds['API Key']}` }
      });
      const data = await res.json();
      return (data.venues || []).map((v: Record<string, unknown>) => {
        const addr = v.address as Record<string, string> | undefined;
        return {
          posLocationId: v.id as string,
          name:          (v.name || '') as string,
          address:       addr?.street || '',
          city:          addr?.city || '',
          state:         addr?.state || 'CA',
          zip:           addr?.zip || '',
          isActive:      !!v.active,
        };
      });
    }

    case 'heartland': {
      const res = await fetch('https://api.heartlandpaymentsystems.com/v2/merchants', {
        headers: { Authorization: `Bearer ${creds['Secret Key']}` }
      });
      const data = await res.json();
      return (data.merchants || []).map((m: Record<string, unknown>) => {
        const addr = m.address as Record<string, string> | undefined;
        return {
          posLocationId: (m.merchantId || '') as string,
          name:          (m.merchantName || '') as string,
          address:       addr?.addressLine1 || '',
          city:          addr?.city || '',
          state:         addr?.state || 'CA',
          zip:           addr?.postalCode || '',
          isActive:      m.status === 'ACTIVE',
        };
      });
    }

    default:
      return [];
  }
}
