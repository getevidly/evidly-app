import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Document {
  id: string;
  title: string;
  expiration_date: string;
  organization_id: string;
  category: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
        .select("id, full_name, organizations(name)")
        .eq("organization_id", doc.organization_id)
        .in("role", ["owner", "admin", "manager"]);

      if (!orgUsers || orgUsers.length === 0) continue;

      const { data: authUsers } = await supabase.auth.admin.listUsers();

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
            user.organizations?.name || "your organization",
            doc.title,
            daysUntilExpiry,
            alertType,
            expirationDate
          );

          alertsSent.push({
            email: authUser.email,
            document: doc.title,
            type: alertType,
            via: shouldSendSMS ? ['email', 'sms'] : ['email'],
          });
        }
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
      JSON.stringify({ error: error.message }),
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
  expirationDate: Date
) {
  const messages = {
    "30_days": {
      subject: `${documentName} expires in 30 days - Action needed`,
      urgency: "Notice",
    },
    "14_days": {
      subject: `${documentName} expires in 14 days - Urgent`,
      urgency: "Urgent",
    },
    "7_days": {
      subject: `${documentName} expires in 7 days - CRITICAL`,
      urgency: "Critical",
    },
    "1_day": {
      subject: `${documentName} expires TOMORROW - IMMEDIATE ACTION REQUIRED`,
      urgency: "IMMEDIATE",
    },
    expired: {
      subject: `${documentName} EXPIRED TODAY - IMMEDIATE ACTION REQUIRED`,
      urgency: "EXPIRED",
    },
    overdue: {
      subject: `${documentName} is OVERDUE - Immediate renewal required`,
      urgency: "OVERDUE",
    },
  };

  const message = messages[alertType as keyof typeof messages];

  console.log(`[EMAIL] Would send document alert to: ${email}`);
  console.log(`[EMAIL] Organization: ${orgName}`);
  console.log(`[EMAIL] Document: ${documentName}`);
  console.log(`[EMAIL] Days until expiry: ${daysUntilExpiry}`);
  console.log(`[EMAIL] Alert type: ${alertType}`);
  console.log(`[EMAIL] Subject: ${message.subject}`);
}
