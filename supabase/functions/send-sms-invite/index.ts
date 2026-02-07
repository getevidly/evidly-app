import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SmsInviteRequest {
  phone: string;
  inviteUrl: string;
  organizationName: string;
  role: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { phone, inviteUrl, organizationName, role }: SmsInviteRequest = await req.json();

    if (!phone || !inviteUrl || !organizationName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const message = `You've been invited to ${organizationName} on EvidLY as ${role}. Set up your account: ${inviteUrl}`;

    console.log(`[SMS] Would send invite to: ${phone}`);
    console.log(`[SMS] Organization: ${organizationName}`);
    console.log(`[SMS] Role: ${role}`);
    console.log(`[SMS] Message: ${message}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "SMS invitation logged (sending not configured)",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending SMS:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send SMS invitation",
      }),
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
