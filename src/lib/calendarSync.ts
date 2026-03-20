// ── Calendar Sync — SERVICE-REQUEST-01 ─────────────────────────────
// URL-based calendar integration for MVP.
// Generates Google Calendar / Outlook URLs and .ics file downloads.

import type { CalendarEventInput } from '../types/serviceRequest';

/**
 * Format date for Google Calendar URL (YYYYMMDDTHHmmSSZ)
 */
function toGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Generate a Google Calendar "add event" URL.
 * Opens in a new tab — no OAuth required.
 */
export function getGoogleCalendarUrl(event: CalendarEventInput): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toGoogleDate(event.startDate)}/${toGoogleDate(event.endDate)}`,
  });
  if (event.description) params.set('details', event.description);
  if (event.location) params.set('location', event.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate an Outlook web "add event" URL.
 * Opens in a new tab — no OAuth required.
 */
export function getOutlookCalendarUrl(event: CalendarEventInput): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
  });
  if (event.description) params.set('body', event.description);
  if (event.location) params.set('location', event.location);

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate an .ics file string and trigger download.
 */
export function downloadIcsFile(event: CalendarEventInput): void {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@getevidly.com`;
  const now = toGoogleDate(new Date());

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EvidLY//Service Request//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toGoogleDate(event.startDate)}`,
    `DTEND:${toGoogleDate(event.endDate)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : '',
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Escape text for iCalendar format.
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Build a CalendarEventInput from a confirmed service request.
 */
export function buildCalendarEvent(params: {
  serviceType: string;
  vendorName: string;
  confirmedDatetime: string;
  locationName?: string;
  durationMinutes?: number;
}): CalendarEventInput {
  const start = new Date(params.confirmedDatetime);
  const end = new Date(start.getTime() + (params.durationMinutes || 120) * 60000);

  return {
    title: `${params.serviceType} — ${params.vendorName}`,
    description: `Vendor service scheduled via EvidLY.\nVendor: ${params.vendorName}\nService: ${params.serviceType}`,
    startDate: start,
    endDate: end,
    location: params.locationName,
  };
}
