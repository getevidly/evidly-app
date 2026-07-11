import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createServiceClient, corsHeaders } from '../_shared/authClient.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const svc = createServiceClient();

  try {
    // ── 1. Verify caller is platform_admin ──────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user: caller }, error: authError } = await svc.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (caller.app_metadata?.platform_admin !== true) {
      return new Response(JSON.stringify({ error: 'Platform admin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Parse payload ───────────────────────────────────────────
    const body = await req.json();
    const {
      companyName,
      slug,
      planKey = 'starter',
      serviceArea,
      timeZone = 'America/Los_Angeles',
      billingInterval = 'monthly',
      ownerFirstName,
      ownerLastName,
      ownerEmail,
      ownerPhone,
      mode = 'invite', // 'invite' | 'password'
      password,
    } = body;

    if (!companyName || !slug || !ownerEmail || !ownerFirstName || !ownerLastName) {
      return new Response(JSON.stringify({
        error: 'companyName, slug, ownerFirstName, ownerLastName, and ownerEmail are required',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'password' && !password) {
      return new Response(JSON.stringify({ error: 'password is required when mode is "password"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Call provision_tenant RPC ────────────────────────────
    const { data: rpcData, error: provisionError } = await svc.rpc('provision_tenant', {
      p_name: companyName,
      p_slug: slug,
      p_plan_key: planKey,
      p_service_area: serviceArea || null,
      p_email: ownerEmail,
      p_time_zone: timeZone,
      p_billing_interval: billingInterval,
    });

    if (provisionError) {
      return new Response(JSON.stringify({
        error: `provision_tenant failed: ${provisionError.message}`,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // provision_tenant returns a scalar uuid; PostgREST may hand it back as the value,
    // an array, or a single-key object. Normalize, then validate.
    let vendorId =
      typeof rpcData === 'string' ? rpcData
      : Array.isArray(rpcData) ? (typeof rpcData[0] === 'string' ? rpcData[0] : rpcData[0]?.provision_tenant)
      : (rpcData?.provision_tenant ?? rpcData?.id ?? null);

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!vendorId || !uuidRe.test(vendorId)) {
      return new Response(JSON.stringify({
        error: `provision_tenant returned an unexpected result`,
        raw: rpcData,
        step_failed: 'provision_rpc_result',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Create owner auth user ──────────────────────────────
    const ownerName = `${ownerFirstName.trim()} ${ownerLastName.trim()}`;
    const authPassword = mode === 'password' ? password : crypto.randomUUID();

    const { data: authData, error: createUserError } = await svc.auth.admin.createUser({
      email: ownerEmail,
      password: authPassword,
      email_confirm: true,
      app_metadata: { vendor_id: vendorId, platform_admin: false },
      user_metadata: { name: ownerName, role: 'owner', vendor_id: vendorId },
    });

    if (createUserError || !authData?.user) {
      return new Response(JSON.stringify({
        error: `Auth user creation failed: ${createUserError?.message || 'unknown'}`,
        vendor_id: vendorId,
        step_failed: 'create_auth_user',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ownerId = authData.user.id;

    // ── 4. Insert public.users row ─────────────────────────────
    const { error: usersInsertError } = await svc.from('users').insert({
      id: ownerId,
      vendor_id: vendorId,
      email: ownerEmail,
      name: ownerName,
      phone: ownerPhone || null,
      role: 'owner',
      password_hash: 'managed-by-supabase-auth',
      is_active: true,
    });

    if (usersInsertError) {
      // Auth user created but users row failed — report, don't silently lose the vendor
      return new Response(JSON.stringify({
        error: `users insert failed: ${usersInsertError.message}`,
        vendor_id: vendorId,
        owner_auth_id: ownerId,
        step_failed: 'insert_users_row',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 5. Send invite email (if mode === 'invite') ────────────
    let inviteEmailSent = false;

    if (mode === 'invite') {
      try {
        const appUrl = Deno.env.get('APP_URL') || 'https://hoodops-staging.vercel.app';
        const { data: recoveryData } = await svc.auth.admin.generateLink({
          type: 'recovery',
          email: ownerEmail,
          options: { redirectTo: `${appUrl}/reset-password` },
        });
        const recoveryLink = recoveryData?.properties?.action_link;

        if (recoveryLink) {
          const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
          if (RESEND_API_KEY) {
            const resp = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'HoodOps <notifications@gethoodops.com>',
                to: [ownerEmail],
                subject: `Welcome to HoodOps — set your password`,
                html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#0D2B3A;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">HoodOps</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1a1a1a;">Welcome, ${ownerFirstName}!</h2>
          <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
            Your <strong>${companyName}</strong> account on HoodOps is ready. Click below to set a password and sign in.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="${recoveryLink}" style="display:inline-block;background:#E67E22;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:8px;">Set Password</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#999;line-height:1.5;">This link expires in 1 hour. After that, use &ldquo;Forgot password&rdquo; on the sign-in page.</p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#fafafa;border-top:1px solid #eee;text-align:center;">
          <p style="margin:0;font-size:12px;color:#bbb;">Powered by HoodOps</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
              }),
            });
            inviteEmailSent = resp.ok;
            if (!resp.ok) {
              console.error('[provision-tenant] invite email failed:', resp.status, await resp.text().catch(() => ''));
            }
          }
        }
      } catch (emailErr: any) {
        console.error('[provision-tenant] invite email error:', emailErr);
        // Non-fatal — account is created, email just didn't send
      }
    }

    // ── Done ────────────────────────────────────────────────────
    return new Response(JSON.stringify({
      vendor_id: vendorId,
      owner_id: ownerId,
      owner_email: ownerEmail,
      mode,
      invite_email_sent: mode === 'invite' ? inviteEmailSent : undefined,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[provision-tenant] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
