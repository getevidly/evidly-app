import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { sendSms } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Verify cron secret
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (expectedSecret && cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "https://app.getevidly.com";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: documents } = await supabase
      .from("documents")
      .select("*")
      .not("expiration_date", "is", null);

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ message: "No documents with expiration dates found" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const now = new Date();
    const alertsSent = [];

    for (const doc of documents) {
      const expirationDate = new Date(doc.expiration_date);
      const daysUntilExpiry = Math.floor(
        (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let alertType = null;
      let sendVia: string[] = ['email'];

      if (daysUntilExpiry < 0) {
        alertType = "overdue";
        sendVia = ['email', 'sms'];
      } else if (daysUntilExpiry === 0) {
        alertType = "expired";
        sendVia = ['email', 'sms'];
      } else if (daysUntilExpiry === 1) {
        alertType = "1_day";
        sendVia = ['email', 'sms'];
      } else if (daysUntilExpiry === 7) {
        alertType = "7_days";
        sendVia = ['email', 'sms'];
      } else if (daysUntilExpiry === 14) {
        alertType = "14_days";
        sendVia = ['email'];
      } else if (daysUntilExpiry === 30) {
        alertType = "30_days";
        sendVia = ['email'];
      }

      if (!alertType) continue;

      const { data: existingAlert } = await supabase
        .from("document_alerts")
        .select("id")
        .eq("document_id", doc.id)
        .eq("alert_type", alertType)
        .gte("sent_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existingAlert) continue;

      const { data: orgUsers } = await supabase
        .from("user_profiles")
        .select("id, full_name, phone, organizations(name)")
        .eq("organization_id", doc.organization_id)
        .in("role", ["owner", "admin", "manager"]);

      if (!orgUsers || orgUsers.length === 0) continue;

      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const orgName = (orgUsers[0] as any).organizations?.name || "your organization";

      for (const user of orgUsers) {
        const authUser = authUsers.users.find((u) => u.id === user.id);
        if (!authUser?.email) continue;

        const { data: settings } = await supabase
          .from("notification_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        const shouldSendEmail = !settings || settings.email_enabled;
        const shouldSendSMS = settings?.sms_enabled && sendVia.includes('sms');

        if (shouldSendEmail) {
          await sendAlertEmail(
            authUser.email,
            user.full_name || "there",
            orgName,
            doc.title,
            daysUntilExpiry,
            alertType,
            expirationDate,
            appUrl
          );
        }

        if (shouldSendSMS && (user as any).phone) {
          await sendAlertSms(
            (user as any).phone,
            orgName,
            doc.title,
            daysUntilExpiry,
            alertType
          );
        }

        alertsSent.push({
          email: authUser.email,
          document: doc.title,
          type: alertType,
          via: shouldSendSMS ? ['email', 'sms'] : ['email'],
        });
      }

      await supabase.from("document_alerts").insert({
        document_id: doc.id,
        organization_id: doc.organization_id,
        document_name: doc.title,
        expiration_date: doc.expiration_date,
        alert_type: alertType,
        sent_via: sendVia,
      });
    }

    return new Response(
      JSON.stringify({ success: true, alertsSent }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending document alerts:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function sendAlertEmail(
  email: string,
  name: string,
  orgName: string,
  documentName: string,
  daysUntilExpiry: number,
  alertType: string,
  expirationDate: Date,
  appUrl: string
) {
  const formattedDate = expirationDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const templates: Record<string, { subject: string; bodyHtml: string; urgency?: { text: string; color: string } }> = {
    "30_days": {
      subject: `${documentName} expires in 30 days - Action needed`,
      bodyHtml: `
        <p>A document for <strong>${orgName}</strong> is approaching its expiration date:</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-weight: 600; margin: 0 0 4px 0;">${documentName}</p>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Expires: ${formattedDate}</p>
        </div>
        <p>Plan ahead to renew this document before it expires.</p>
      `,
    },
    "14_days": {
      subject: `${documentName} expires in 14 days - Urgent`,
      bodyHtml: `
        <p>A document for <strong>${orgName}</strong> will expire in <strong>14 days</strong>:</p>
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-weight: 600; margin: 0 0 4px 0; color: #92400e;">${documentName}</p>
          <p style="color: #92400e; font-size: 14px; margin: 0;">Expires: ${formattedDate}</p>
        </div>
        <p>Begin the renewal process now to avoid a compliance gap.</p>
      `,
      urgency: { text: "Urgent — Expiring Soon", color: "#f59e0b" },
    },
    "7_days": {
      subject: `${documentName} expires in 7 days - CRITICAL`,
      bodyHtml: `
        <p>A critical document for <strong>${orgName}</strong> expires in <strong>7 days</strong>:</p>
        <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-weight: 600; margin: 0 0 4px 0; color: #991b1b;">${documentName}</p>
          <p style="color: #991b1b; font-size: 14px; margin: 0;">Expires: ${formattedDate}</p>
        </div>
        <p>Immediate action required to maintain compliance.</p>
      `,
      urgency: { text: "Critical — 7 Days Remaining", color: "#dc2626" },
    },
    "1_day": {
      subject: `${documentName} expires TOMORROW - IMMEDIATE ACTION REQUIRED`,
      bodyHtml: `
        <p>A document for <strong>${orgName}</strong> expires <strong>tomorrow</strong>:</p>
        <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-weight: 600; margin: 0 0 4px 0; color: #991b1b;">${documentName}</p>
          <p style="color: #991b1b; font-size: 14px; margin: 0;">Expires: ${formattedDate}</p>
        </div>
      `,
      urgency: { text: "Expires Tomorrow — Act Now", color: "#dc2626" },
    },
    expired: {
      subject: `${documentName} EXPIRED TODAY - IMMEDIATE ACTION REQUIRED`,
      bodyHtml: `
        <p>A required document for <strong>${orgName}</strong> has <strong>expired today</strong>:</p>
        <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-weight: 600; margin: 0 0 4px 0; color: #991b1b;">${documentName}</p>
          <p style="color: #991b1b; font-size: 14px; margin: 0;">Expired: ${formattedDate}</p>
        </div>
        <p style="color: #dc2626; font-weight: 600;">Your compliance score is affected until this document is renewed.</p>
      `,
      urgency: { text: "EXPIRED — Compliance at Risk", color: "#dc2626" },
    },
    overdue: {
      subject: `${documentName} is OVERDUE - Immediate renewal required`,
      bodyHtml: `
        <p>A required document for <strong>${orgName}</strong> is <strong>overdue by ${Math.abs(daysUntilExpiry)} days</strong>:</p>
        <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-weight: 600; margin: 0 0 4px 0; color: #991b1b;">${documentName}</p>
          <p style="color: #991b1b; font-size: 14px; margin: 0;">Was due: ${formattedDate} (${Math.abs(daysUntilExpiry)} days overdue)</p>
        </div>
        <p style="color: #dc2626; font-weight: 600;">Operating without this document may have regulatory consequences.</p>
      `,
      urgency: { text: "OVERDUE — Immediate Action Required", color: "#7f1d1d" },
    },
  };

  const template = templates[alertType] || templates["30_days"];

  const html = buildEmailHtml({
    recipientName: name,
    bodyHtml: template.bodyHtml,
    ctaText: "View Documents →",
    ctaUrl: `${appUrl}/documents`,
    urgencyBanner: template.urgency,
    footerNote: "You can manage notification preferences in Settings.",
  });

  await sendEmail({ to: email, subject: template.subject, html });
}

async function sendAlertSms(
  phone: string,
  orgName: string,
  documentName: string,
  daysUntilExpiry: number,
  alertType: string
) {
  const urgencyMap: Record<string, string> = {
    "7_days": `URGENT: ${documentName} for ${orgName} expires in 7 days. Renew now to stay compliant. -EvidLY`,
    "1_day": `CRITICAL: ${documentName} for ${orgName} expires TOMORROW. Immediate action required. -EvidLY`,
    expired: `ALERT: ${documentName} for ${orgName} EXPIRED TODAY. Renew immediately. -EvidLY`,
    overdue: `ALERT: ${documentName} for ${orgName} is ${Math.abs(daysUntilExpiry)} days overdue. Renew immediately. -EvidLY`,
  };

  const body = urgencyMap[alertType];
  if (body) {
    await sendSms({ to: phone, body });
  }
}
