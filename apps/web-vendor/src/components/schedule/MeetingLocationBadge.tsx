import React from 'react';
import { MapPin } from 'lucide-react';

interface MeetingLocationBadgeProps {
  meetingLocation: string | null;
  jobAddress: string;
}

export function MeetingLocationBadge({ meetingLocation, jobAddress }: MeetingLocationBadgeProps) {
  // Don't show badge if meeting location is null/empty or matches job address
  if (!meetingLocation || meetingLocation === jobAddress) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
      <MapPin className="w-3 h-3" />
      Different meeting point
    </span>
  );
}
