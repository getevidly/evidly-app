// Shared Twilio SMS utility for EvidLY edge functions
// Uses Twilio REST API: https://www.twilio.com/docs/sms/api/message-resource#create-a-message-resource

export interface SendSmsParams {
  to: string;
  body: string;
}

/**
 * Send an SMS via Twilio. Non-blocking: logs errors but does not throw.
 * Returns the Twilio message SID or null on failure.
 */
export async function sendSms(params: SendSmsParams): Promise<string | null> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("[SMS] Twilio credentials not set — skipping send to", params.to);
    return null;
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: params.to,
          From: fromNumber,
          Body: params.body,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error(`[SMS] Twilio error ${res.status} to ${params.to}:`, data);
      return null;
    }
    console.log(`[SMS] Sent to ${params.to}`, data.sid);
    return data.sid;
  } catch (err) {
    console.error(`[SMS] Failed to send to ${params.to}:`, err);
    return null;
  }
}
