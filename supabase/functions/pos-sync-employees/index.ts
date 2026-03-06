/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

// ============================================================
// pos-sync-employees — Pull employees from POS → staging table
// Employees are staged for admin review before activation.
// Admin reviews staged employees and invites them via user_invitations.
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, ok, err, type POSEmployee } from '../_shared/posUtils.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    const { connectionId } = await req.json();

    const { data: conn } = await supabase
      .from('integration_connections')
      .select('*, integrations(slug)')
      .eq('id', connectionId)
      .single();

    if (!conn) return err('Connection not found');

    const posType = conn.integrations?.slug?.replace(/-pos$/, '').replace('-ncr', '') || '';
    const creds = conn.config?.credentials;

    const employees = await fetchEmployees(posType, creds);

    // Log sync
    const logEntry = {
      integration_id:    conn.integration_id,
      sync_type:         'pull' as const,
      entity_type:       'employees',
      direction:         'inbound' as const,
      records_processed: employees.length,
      records_created:   0,
      records_updated:   0,
      records_failed:    0,
      status:            'running' as const,
      started_at:        new Date().toISOString(),
    };

    // Stage employees for admin review — don't auto-create accounts
    for (const emp of employees) {
      const { error } = await supabase.from('pos_employee_mappings').upsert({
        organization_id:   conn.org_id,
        pos_connection_id: connectionId,
        pos_employee_id:   emp.posEmployeeId,
        pos_type:          posType,
        first_name:        emp.firstName,
        last_name:         emp.lastName,
        email:             emp.email,
        role:              emp.role,
        is_active:         emp.isActive,
        staged_at:         new Date().toISOString(),
      }, { onConflict: 'pos_connection_id,pos_employee_id' });

      if (!error) logEntry.records_created++;
      else logEntry.records_failed++;
    }

    // Finalize sync log
    await supabase.from('integration_sync_log').insert({
      ...logEntry,
      status:       'completed',
      completed_at: new Date().toISOString(),
    });

    return ok({ staged: logEntry.records_created, total: employees.length });

  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : String(e));
  }
});

// ── PER-POS EMPLOYEE FETCH ────────────────────────────────────

async function fetchEmployees(posType: string, creds: Record<string, string>): Promise<POSEmployee[]> {
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
        'https://ws-api.toasttab.com/labor/v1/employees',
        { headers: { Authorization: `Bearer ${token}`,
                     'Toast-Restaurant-External-ID': creds['Restaurant GUID'] } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data || []).map((e: Record<string, unknown>) => ({
        posEmployeeId: e.guid as string,
        firstName:     (e.firstName || '') as string,
        lastName:      (e.lastName || '') as string,
        email:         e.email as string | undefined,
        phone:         e.phoneNumber as string | undefined,
        role:          (e.jobTitle || e.wageType) as string | undefined,
        isActive:      !e.deleted,
      }));
    }

    case 'square': {
      const res = await fetch('https://connect.squareup.com/v2/team-members/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds['Access Token']}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: { filter: { status: { members: ['ACTIVE'] } } } }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.team_members || []).map((m: Record<string, unknown>) => ({
        posEmployeeId: m.id as string,
        firstName:     (m.given_name || '') as string,
        lastName:      (m.family_name || '') as string,
        email:         m.email_address as string | undefined,
        phone:         m.phone_number as string | undefined,
        role:          m.status as string | undefined,
        isActive:      m.status === 'ACTIVE',
      }));
    }

    case 'clover': {
      const res = await fetch(
        `https://api.clover.com/v3/merchants/${creds['Merchant ID']}/employees`,
        { headers: { Authorization: `Bearer ${creds['API Key']}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.elements || []).map((e: Record<string, unknown>) => ({
        posEmployeeId: e.id as string,
        firstName:     (e.name as string || '').split(' ')[0] || '',
        lastName:      (e.name as string || '').split(' ').slice(1).join(' ') || '',
        email:         e.email as string | undefined,
        phone:         e.customId as string | undefined,
        role:          (e.role as string) || undefined,
        isActive:      !e.isDeleted,
      }));
    }

    case 'lightspeed': {
      const res = await fetch(
        'https://api.lightspeedhq.com/API/Employee.json',
        { headers: { Authorization: `Bearer ${creds['Client Secret']}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.Employee || []).map((e: Record<string, unknown>) => ({
        posEmployeeId: String(e.employeeID),
        firstName:     (e.firstName || '') as string,
        lastName:      (e.lastName || '') as string,
        email:         e.email as string | undefined,
        phone:         e.phone as string | undefined,
        role:          e.employeeRoleID as string | undefined,
        isActive:      !e.archived,
      }));
    }

    case 'aloha': {
      const res = await fetch('https://api.ncrcloud.com/security/role-grants', {
        headers: {
          Authorization: `apikey ${creds['API Key']}`,
          'nep-organization': creds['Site ID'],
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.roleGrants || []).map((r: Record<string, unknown>) => ({
        posEmployeeId: (r.username || r.id) as string,
        firstName:     ((r.fullName as string) || '').split(' ')[0] || '',
        lastName:      ((r.fullName as string) || '').split(' ').slice(1).join(' ') || '',
        email:         r.emailAddress as string | undefined,
        role:          (r.roleName || r.roleId) as string | undefined,
        isActive:      r.status === 'ACTIVE',
      }));
    }

    case 'revel': {
      const auth = btoa(`${creds['API Key']}:${creds['API Secret']}`);
      const res = await fetch(
        `https://${creds['Establishment']}.revelup.com/resources/Employee/`,
        { headers: { Authorization: `Basic ${auth}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.objects || []).map((e: Record<string, unknown>) => ({
        posEmployeeId: String(e.id),
        firstName:     (e.first_name || '') as string,
        lastName:      (e.last_name || '') as string,
        email:         e.email as string | undefined,
        phone:         e.phone as string | undefined,
        role:          (e.role_name || e.role) as string | undefined,
        isActive:      !e.is_deleted,
      }));
    }

    case 'spoton': {
      const res = await fetch('https://api.spoton.com/v1/employees', {
        headers: { Authorization: `Bearer ${creds['API Key']}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.employees || []).map((e: Record<string, unknown>) => ({
        posEmployeeId: e.id as string,
        firstName:     (e.first_name || '') as string,
        lastName:      (e.last_name || '') as string,
        email:         e.email as string | undefined,
        role:          e.role as string | undefined,
        isActive:      !!e.active,
      }));
    }

    case 'heartland': {
      // Heartland doesn't expose a standard employee API — return empty
      return [];
    }

    default:
      return [];
  }
}
