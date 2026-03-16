import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { agreement_id } = await req.json();
    if (!agreement_id) {
      return new Response(JSON.stringify({ error: 'agreement_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch agreement with related data
    const { data: agreement, error: agreementError } = await supabase
      .from('service_agreements')
      .select('*, agreement_templates(*)')
      .eq('id', agreement_id)
      .single();

    if (agreementError || !agreement) {
      throw new Error('Agreement not found');
    }

    // Fetch organization info
    const { data: org } = await supabase
      .from('organizations')
      .select('name, address, city, state, zip')
      .eq('id', agreement.organization_id)
      .single();

    // Fetch vendor info
    const { data: vendor } = await supabase
      .from('vendors')
      .select('company_name, address, city, state, zip, phone, email, logo_url')
      .eq('id', agreement.vendor_id)
      .single();

    // Generate agreement HTML
    const html = generateAgreementHtml(agreement, org, vendor);

    // Log activity
    await supabase.from('agreement_activities').insert({
      agreement_id,
      activity_type: 'pdf_generated',
      description: 'Agreement PDF generated',
    });

    return new Response(JSON.stringify({
      success: true,
      html,
      agreement_number: agreement.agreement_number,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function renderServicesTable(services: any[]): string {
  if (!services || services.length === 0) return '<p>No services specified.</p>';
  
  let rows = services.map((s: any) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #D1D9E6;">${s.service_type || ''}</td>
      <td style="padding: 8px; border: 1px solid #D1D9E6; text-align: center;">${s.frequency || ''}</td>
      <td style="padding: 8px; border: 1px solid #D1D9E6; text-align: center;">${s.locations || 'All'}</td>
      <td style="padding: 8px; border: 1px solid #D1D9E6; text-align: right;">${s.price_per_service ? formatCurrency(s.price_per_service) : '—'}</td>
    </tr>
  `).join('');

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background: #F4F6FA;">
          <th style="padding: 8px; border: 1px solid #D1D9E6; text-align: left;">Service</th>
          <th style="padding: 8px; border: 1px solid #D1D9E6; text-align: center;">Frequency</th>
          <th style="padding: 8px; border: 1px solid #D1D9E6; text-align: center;">Locations</th>
          <th style="padding: 8px; border: 1px solid #D1D9E6; text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderSignatureBlock(agreement: any): string {
  const isSigned = !!agreement.signed_at;
  
  return `
    <div style="display: flex; gap: 48px; margin-top: 32px;">
      <div style="flex: 1;">
        <p style="font-weight: 600; margin-bottom: 8px;">Service Provider</p>
        <div style="border-bottom: 2px solid #0B1628; height: 40px; margin-bottom: 4px;"></div>
        <p style="font-size: 12px; color: #6B7F96;">HoodOps — Cleaning Pros Plus LLC</p>
        <p style="font-size: 12px; color: #6B7F96;">Date: _______________</p>
      </div>
      <div style="flex: 1;">
        <p style="font-weight: 600; margin-bottom: 8px;">Customer</p>
        ${isSigned ? `
          <div style="border-bottom: 2px solid #0B1628; height: 40px; margin-bottom: 4px; display: flex; align-items: flex-end;">
            <span style="font-style: italic; font-size: 18px;">${agreement.signer_name || ''}</span>
          </div>
          <p style="font-size: 12px; color: #6B7F96;">${agreement.signer_name || ''}, ${agreement.signer_title || ''}</p>
          <p style="font-size: 12px; color: #6B7F96;">Date: ${formatDate(agreement.signed_at)}</p>
        ` : `
          <div style="border-bottom: 2px solid #0B1628; height: 40px; margin-bottom: 4px;"></div>
          <p style="font-size: 12px; color: #6B7F96;">Name: _______________</p>
          <p style="font-size: 12px; color: #6B7F96;">Title: _______________</p>
          <p style="font-size: 12px; color: #6B7F96;">Date: _______________</p>
        `}
      </div>
    </div>
  `;
}

function generateAgreementHtml(agreement: any, org: any, vendor: any): string {
  const services = agreement.services || [];
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0B1628; margin: 0; padding: 40px; font-size: 14px; line-height: 1.6; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e4d6b; padding-bottom: 16px; margin-bottom: 24px; }
    .company-name { font-size: 24px; font-weight: 700; color: #1e4d6b; }
    .company-info { font-size: 12px; color: #6B7F96; text-align: right; }
    .agreement-title { text-align: center; font-size: 20px; font-weight: 700; margin: 24px 0; color: #1e4d6b; }
    .agreement-number { text-align: center; font-size: 14px; color: #6B7F96; margin-bottom: 24px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 16px; font-weight: 600; color: #1e4d6b; border-bottom: 1px solid #D1D9E6; padding-bottom: 4px; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .info-label { font-weight: 600; font-size: 12px; color: #6B7F96; }
    .info-value { font-size: 14px; }
    .terms { font-size: 13px; line-height: 1.8; }
    .footer { border-top: 1px solid #D1D9E6; padding-top: 12px; margin-top: 40px; font-size: 11px; color: #6B7F96; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${vendor?.company_name || 'HoodOps'}</div>
      <div style="font-size: 12px; color: #6B7F96;">Kitchen Exhaust & Fire Safety Services</div>
    </div>
    <div class="company-info">
      ${vendor?.address || ''}<br>
      ${vendor?.city || ''}, ${vendor?.state || ''} ${vendor?.zip || ''}<br>
      ${vendor?.phone || '(209) 636-6116'}<br>
      ${vendor?.email || ''}
    </div>
  </div>

  <div class="agreement-title">SERVICE AGREEMENT</div>
  <div class="agreement-number">Agreement #${agreement.agreement_number}</div>

  <div class="section">
    <div class="section-title">Parties</div>
    <div class="info-grid">
      <div>
        <div class="info-label">Service Provider</div>
        <div class="info-value">${vendor?.company_name || 'HoodOps'}</div>
      </div>
      <div>
        <div class="info-label">Customer</div>
        <div class="info-value">${org?.name || ''}</div>
        <div style="font-size: 12px; color: #6B7F96;">${org?.address || ''}, ${org?.city || ''}, ${org?.state || ''} ${org?.zip || ''}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Services</div>
    ${renderServicesTable(services)}
  </div>

  <div class="section">
    <div class="section-title">Term & Pricing</div>
    <div class="info-grid">
      <div>
        <div class="info-label">Start Date</div>
        <div class="info-value">${formatDate(agreement.start_date)}</div>
      </div>
      <div>
        <div class="info-label">End Date</div>
        <div class="info-value">${formatDate(agreement.end_date)}</div>
      </div>
      <div>
        <div class="info-label">Term</div>
        <div class="info-value">${agreement.term_months} months</div>
      </div>
      <div>
        <div class="info-label">Auto-Renew</div>
        <div class="info-value">${agreement.auto_renew ? 'Yes' : 'No'}</div>
      </div>
      <div>
        <div class="info-label">Monthly Amount</div>
        <div class="info-value">${agreement.monthly_amount ? formatCurrency(agreement.monthly_amount) : '—'}</div>
      </div>
      <div>
        <div class="info-label">Annual Amount</div>
        <div class="info-value">${agreement.annual_amount ? formatCurrency(agreement.annual_amount) : '—'}</div>
      </div>
      <div>
        <div class="info-label">Payment Terms</div>
        <div class="info-value">${(agreement.payment_terms || 'net_30').replace('_', ' ').toUpperCase()}</div>
      </div>
      <div>
        <div class="info-label">Cancellation Notice</div>
        <div class="info-value">${agreement.cancellation_notice_days || 30} days</div>
      </div>
    </div>
    ${agreement.discount_percent > 0 ? `<p style="margin-top: 8px;"><strong>Discount:</strong> ${agreement.discount_percent}% ${agreement.discount_reason ? `(${agreement.discount_reason})` : ''}</p>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Terms & Conditions</div>
    <div class="terms">
      ${agreement.agreement_templates?.terms_and_conditions || `
        <p>1. <strong>Scope of Services.</strong> Service Provider agrees to perform the services listed above at the frequency specified for each covered location.</p>
        <p>2. <strong>Payment.</strong> Customer agrees to pay all invoices within the specified payment terms. Late payments may incur a 1.5% monthly service charge.</p>
        <p>3. <strong>Access.</strong> Customer shall provide reasonable access to all kitchen exhaust systems and related equipment during scheduled service visits.</p>
        <p>4. <strong>Cancellation.</strong> Either party may cancel this agreement with ${agreement.cancellation_notice_days || 30} days written notice.</p>
        <p>5. <strong>Insurance.</strong> Service Provider maintains general liability insurance and workers' compensation coverage.</p>
        <p>6. <strong>Compliance.</strong> All services performed in accordance with NFPA 96, local fire codes, and health department regulations.</p>
      `}
    </div>
  </div>

  ${renderSignatureBlock(agreement)}

  <div class="footer">
    ${vendor?.company_name || 'HoodOps'} — ${vendor?.phone || '(209) 636-6116'} — Agreement #${agreement.agreement_number}
  </div>
</body>
</html>`;
}
