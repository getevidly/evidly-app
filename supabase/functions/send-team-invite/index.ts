import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InviteRequest {
  email: string;
  inviteUrl: string;
  role: string;
  inviterName: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, inviteUrl, role, inviterName }: InviteRequest = await req.json();

    console.log(`[EMAIL] Would send team invite to: ${email}`);
    console.log(`[EMAIL] Inviter: ${inviterName}`);
    console.log(`[EMAIL] Role: ${role}`);
    console.log(`[EMAIL] Invite URL: ${inviteUrl}`);
    console.log(`[EMAIL] Subject: You've been invited to join EvidLY as ${role}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation logged (email sending not configured)",
        inviteUrl
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending invite email:", error);
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
