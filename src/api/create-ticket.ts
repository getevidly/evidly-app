/**
 * Zendesk Ticket API integration
 * Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#create-ticket
 *
 * Replace ZENDESK_SUBDOMAIN, ZENDESK_API_TOKEN, and ZENDESK_EMAIL
 * with real credentials in production.
 */

const ZENDESK_SUBDOMAIN = 'evidly'; // e.g. evidly.zendesk.com
const ZENDESK_EMAIL = 'support@getevidly.com';
const ZENDESK_API_TOKEN = 'REPLACE_WITH_REAL_TOKEN';

interface TicketPayload {
  subject: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  requesterName: string;
  requesterEmail: string;
}

interface ZendeskTicketResponse {
  ticket: {
    id: number;
    url: string;
    subject: string;
    status: string;
  };
}

export async function createZendeskTicket(payload: TicketPayload): Promise<ZendeskTicketResponse> {
  const url = `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/tickets.json`;

  const body = {
    ticket: {
      subject: payload.subject,
      comment: {
        body: payload.description,
      },
      priority: payload.priority,
      tags: [payload.category],
      requester: {
        name: payload.requesterName,
        email: payload.requesterEmail,
      },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`)}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Zendesk API error: ${response.status}`);
  }

  return response.json();
}
