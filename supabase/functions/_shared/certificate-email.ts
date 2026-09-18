/**
 * Warm outreach step 2 — the certificate email.
 *
 * Returns a COMPLETE HTML document. It is NOT passed through buildEmailHtml:
 * it carries its own header and footer, and wrapping would render both twice.
 */

export interface CertificateEmailParams {
  orgName: string;
  county: string;
  certNumber: string;
  servicedLabel: string;
  nextDueLabel: string;
  daysOut: number;
  shortHash: string;
  portalUrl: string;
  joinUrl: string;
  verifyUrl: string;
  unsubUrl: string;
  certThumbUrl?: string | null;
}

export const CERTIFICATE_EMAIL_SUBJECT =
  'Your hood cleaning certificate is on file and sealed';

const SANS =
  "'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'IBM Plex Mono',Consolas,Menlo,monospace";

function esc(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Fire 5 · Food 13 · Business 6 · Vendor 15 = 39 segments, one of them held. */
const STRIP_GROUPS: { name: string; count: number; label: string; tint: string }[] = [
  { name: 'Fire', count: 5, label: '#B24A2E', tint: '#EBCFC6' },
  { name: 'Food', count: 13, label: '#3E6B8A', tint: '#CBD8E1' },
  { name: 'Business', count: 6, label: '#D8A93A', tint: '#F3E6C2' },
  { name: 'Vendor', count: 15, label: '#7C8EA3', tint: '#DADFE6' },
];

const TOTAL_SEGMENTS = 39;
/** The hood certificate — the one record already on file. */
const HELD_COLOR = '#2E9E7A';

function buildStrip(): string {
  const cells = STRIP_GROUPS.map((g, gi) => {
    const width = ((g.count / TOTAL_SEGMENTS) * 100).toFixed(2);
    const padding = gi === STRIP_GROUPS.length - 1 ? '0' : '0 6px 0 0';

    let segs = '';
    for (let i = 0; i < g.count; i++) {
      const bg = gi === 0 && i === 0 ? HELD_COLOR : g.tint;
      segs +=
        `<td bgcolor="${bg}" height="18" style="background:${bg};height:18px;font-size:0;line-height:0;border-right:2px solid #FFFFFF;">&nbsp;</td>`;
    }

    return `<td width="${width}%" valign="top" style="width:${width}%;padding:${padding};">` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${segs}</tr></table>` +
      `<div style="margin-top:6px;font-family:${MONO};font-size:10.5px;line-height:15px;font-weight:600;color:${g.label};white-space:nowrap;">${g.name} ${g.count}</div>` +
      `</td>`;
  }).join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;"><tr>${cells}</tr></table>`;
}

export function buildCertificateEmail(p: CertificateEmailParams): string {
  const orgName = esc(p.orgName);
  const county = esc(p.county);
  const certNumber = esc(p.certNumber);

  const { servicedLabel, nextDueLabel, daysOut, shortHash, portalUrl, joinUrl, verifyUrl, unsubUrl } = p;

  const stripHtml = buildStrip();

  const thumbCell = p.certThumbUrl
    ? `<td width="120" valign="top" align="right" style="width:120px;padding-left:14px;"><a href="${portalUrl}"><img src="${p.certThumbUrl}" width="120" height="93" alt="Your sealed certificate" style="display:block;border:0;border-radius:3px;"></a></td>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${CERTIFICATE_EMAIL_SUBJECT}</title>
<style>
:root{color-scheme:light only}
@media (max-width:620px){
  .col{display:block!important;width:100%!important;padding:14px 0 0 0!important}
  .pad{padding-left:22px!important;padding-right:22px!important}
  .h1{font-size:23px!important;line-height:29px!important}
}
</style>
</head>
<body bgcolor="#FAF7F0" style="margin:0;padding:0;background:#FAF7F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAF7F0" style="background:#FAF7F0;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;" bgcolor="#FFFFFF">
  <!-- Header -->
  <tr>
    <td class="pad" bgcolor="#1E2D4D" style="background:#1E2D4D;padding:22px 32px 20px 32px;">
      <div style="font-family:'Montserrat','Arial Black',Arial,sans-serif;font-weight:800;font-size:24px;line-height:28px;">
        <span style="color:#B24A2E;">E</span><span style="color:#FFFFFF;">vid</span><span style="color:#B24A2E;">LY</span>
      </div>
      <div style="margin-top:6px;font-family:${MONO};font-size:10.5px;line-height:16px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#A8B4C8;">Commercial Kitchen Risk Management</div>
    </td>
  </tr>
  <!-- Intro -->
  <tr>
    <td class="pad" bgcolor="#FFFFFF" style="background:#FFFFFF;padding:28px 32px 0 32px;">
      <div style="font-family:${MONO};font-size:10.5px;line-height:16px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#B24A2E;">${orgName} &middot; ${county} County</div>
      <div class="h1" style="margin-top:10px;font-family:${SANS};font-size:26px;line-height:32px;font-weight:700;color:#1E2D4D;">Your hood cleaning certificate is on file and sealed.</div>
    </td>
  </tr>
  <!-- Cert card -->
  <tr>
    <td class="pad" bgcolor="#FFFFFF" style="background:#FFFFFF;padding:22px 32px 0 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1E2D4D" style="background:#1E2D4D;border-radius:8px;">
        <tr>
          <td bgcolor="#1E2D4D" style="background:#1E2D4D;border-radius:8px;padding:24px 24px 22px 24px;">
            <div style="font-family:${MONO};font-size:10.5px;line-height:16px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#5DCAA5;">&#128274;&nbsp; On file and sealed</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
              <tr>
                <td valign="top">
                  <div style="font-family:${SANS};font-size:19px;line-height:25px;font-weight:700;color:#FFFFFF;">Kitchen Exhaust Cleaning Certificate</div>
                  <div style="margin-top:2px;font-family:${SANS};font-size:12.5px;line-height:18px;color:#A8B4C8;">NFPA 96 (2024) &middot; ${certNumber}</div>
                </td>
                ${thumbCell}
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;border-top:1px solid #34456A;">
              <tr>
                <td class="col" width="30%" valign="top" style="padding:16px 8px 0 0;">
                  <div style="font-family:${MONO};font-size:9.5px;line-height:14px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#8494AC;">Serviced</div>
                  <div style="margin-top:4px;font-family:${SANS};font-size:14px;line-height:20px;font-weight:600;color:#FFFFFF;">${servicedLabel}</div>
                </td>
                <td class="col" width="35%" valign="top" style="padding:16px 8px 0 0;">
                  <div style="font-family:${MONO};font-size:9.5px;line-height:14px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#8494AC;">Next Service Due</div>
                  <div style="margin-top:4px;font-family:${SANS};font-size:14px;line-height:20px;font-weight:600;color:#EF9F27;">${nextDueLabel}</div>
                </td>
                <td class="col" width="35%" valign="top" style="padding:16px 0 0 0;">
                  <div style="font-family:${MONO};font-size:9.5px;line-height:14px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#8494AC;">EvidLY Is Tracking It</div>
                  <div style="margin-top:4px;font-family:${SANS};font-size:14px;line-height:20px;font-weight:600;color:#5DCAA5;">${daysOut} days out</div>
                </td>
              </tr>
            </table>
            <div style="margin-top:16px;font-family:${MONO};font-size:11px;line-height:16px;color:#8494AC;">Tamper-evident &middot; ${shortHash} &middot; <a href="${verifyUrl}" style="color:#5DCAA5;text-decoration:underline;">Verify it yourself</a></div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
              <tr>
                <td bgcolor="#B24A2E" style="background:#B24A2E;border-radius:6px;">
                  <a href="${portalUrl}?share=1" style="display:inline-block;padding:12px 18px;font-family:${SANS};font-size:14px;line-height:18px;font-weight:700;color:#FFFFFF;text-decoration:none;">Send to a Third Party</a>
                </td>
                <td width="10" style="width:10px;font-size:0;line-height:0;">&nbsp;</td>
                <td bgcolor="#1E2D4D" style="background:#1E2D4D;border:1px solid #6F7E99;border-radius:6px;">
                  <a href="${portalUrl}" style="display:inline-block;padding:11px 18px;font-family:${SANS};font-size:14px;line-height:18px;font-weight:700;color:#FFFFFF;text-decoration:none;">Download</a>
                </td>
              </tr>
            </table>
            <div style="margin-top:14px;font-family:${SANS};font-size:12.5px;line-height:19px;color:#A8B4C8;">Send the sealed record straight to your insurer, landlord, or fire marshal &mdash; they can verify it hasn&rsquo;t been altered.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- What comes next -->
  <tr>
    <td class="pad" bgcolor="#FFFFFF" style="background:#FFFFFF;padding:30px 32px 0 32px;">
      <div style="font-family:${MONO};font-size:10.5px;line-height:16px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#B24A2E;">What Comes Next</div>
      <div style="margin-top:8px;font-family:${SANS};font-size:19px;line-height:26px;font-weight:700;color:#1E2D4D;">One of 39 records your kitchen keeps current &mdash; sealed, dated, and tracked.</div>
      ${stripHtml}
      <div style="margin-top:10px;font-family:${SANS};font-size:12.5px;line-height:19px;color:#6B7F96;"><span style="color:#2E9E7A;font-weight:700;">&#9632;</span>&nbsp; What EvidLY holds for you today: 1 of 39. Not a compliance score.</div>
      <div style="margin-top:10px;font-family:${SANS};font-size:14px;line-height:22px;color:#6B7F96;">A ${county} County kitchen maintains 39 records across fire safety, food safety, business, and vendors. We just showed you what one looks like on file.</div>
    </td>
  </tr>
  <!-- Close + single CTA -->
  <tr>
    <td class="pad" bgcolor="#FFFFFF" style="background:#FFFFFF;padding:26px 32px 32px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="border-top:3px solid #B24A2E;font-size:0;line-height:0;height:0;">&nbsp;</td></tr>
      </table>
      <div style="margin-top:20px;font-family:${SANS};font-size:17px;line-height:24px;font-weight:700;color:#1E2D4D;">Having them and having them available are not the same thing.</div>
      <div style="margin-top:6px;font-family:${SANS};font-size:14px;line-height:21px;color:#6B7F96;">See what all 39 look like on the EvidLY dashboard.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
        <tr>
          <td bgcolor="#B24A2E" style="background:#B24A2E;border-radius:6px;">
            <a href="${joinUrl}" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-size:14px;line-height:18px;font-weight:700;color:#FFFFFF;text-decoration:none;">See the Dashboard</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- Footer -->
  <tr>
    <td class="pad" bgcolor="#FAF7F0" align="center" style="background:#FAF7F0;padding:20px 32px 24px 32px;border-top:1px solid #E5E0D8;">
      <div style="font-family:${SANS};font-size:11px;line-height:18px;color:#8A8F99;">
        Powered by EvidLY, a Cleaning Pros Plus, LLC company.<br>
        Cleaning Pros Plus, LLC &middot; 2324 M Street #2711 &middot; Merced, CA 95344<br>
        <a href="${unsubUrl}" style="color:#8A8F99;text-decoration:underline;">Unsubscribe</a>
      </div>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
