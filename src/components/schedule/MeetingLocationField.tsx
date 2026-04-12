import React from 'react';
import { MapPin, Navigation, CheckSquare, ExternalLink } from 'lucide-react';
import { NAVY, CARD_BG, CARD_BORDER, TEXT_TERTIARY } from '../dashboard/shared/constants';

interface MeetingLocationFieldProps {
  value: string | null;
  notes: string | null;
  sameAsJob: boolean;
  jobAddress: string;
  onChange: (location: string | null, notes: string | null, sameAsJob: boolean) => void;
  readOnly?: boolean;
}

export function MeetingLocationField({
  value,
  notes,
  sameAsJob,
  jobAddress,
  onChange,
  readOnly = false
}: MeetingLocationFieldProps) {
  const effectiveLocation = sameAsJob ? jobAddress : value;
  const isDifferentLocation = effectiveLocation && effectiveLocation !== jobAddress;

  const handleSameAsJobToggle = (checked: boolean) => {
    if (checked) {
      onChange(jobAddress, notes, true);
    } else {
      onChange(value, notes, false);
    }
  };

  const handleLocationChange = (newLocation: string) => {
    onChange(newLocation || null, notes, false);
  };

  const handleNotesChange = (newNotes: string) => {
    onChange(effectiveLocation, newNotes || null, sameAsJob);
  };

  if (readOnly) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 mt-0.5" style={{ color: NAVY }} />
          <div className="flex-1">
            <div className="text-sm font-medium" style={{ color: NAVY }}>
              Meeting Location
            </div>
            <div className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>
              {effectiveLocation || 'Not specified'}
            </div>
            {isDifferentLocation && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                  <MapPin className="w-3 h-3" />
                  Different meeting point
                </span>
              </div>
            )}
            {effectiveLocation && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(effectiveLocation)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-sm hover:underline"
                style={{ color: NAVY }}
              >
                <Navigation className="w-4 h-4" />
                Get Directions
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {notes && (
          <div className="pl-8">
            <div className="text-xs font-medium mb-1" style={{ color: TEXT_TERTIARY }}>
              Meeting Notes
            </div>
            <div className="text-sm" style={{ color: NAVY }}>
              {notes}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Same as Job Checkbox */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={sameAsJob}
          onChange={(e) => handleSameAsJobToggle(e.target.checked)}
          className="w-4 h-4 rounded border-[#1E2D4D]/15 focus:ring-2 focus:ring-offset-2"
          style={{
            accentColor: NAVY,
            color: NAVY
          }}
        />
        <div className="flex items-center gap-1.5 text-sm" style={{ color: NAVY }}>
          <CheckSquare className="w-4 h-4" />
          Same as job location
        </div>
      </label>

      {/* Meeting Address Input */}
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: NAVY }}>
          <MapPin className="w-4 h-4 inline-block mr-1.5" />
          Meeting Address
        </label>
        <input
          type="text"
          value={effectiveLocation || ''}
          onChange={(e) => handleLocationChange(e.target.value)}
          disabled={sameAsJob}
          placeholder="Enter meeting address"
          className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus:ring-offset-2"
          style={{
            backgroundColor: sameAsJob ? '#f9fafb' : CARD_BG,
            borderColor: CARD_BORDER,
            color: NAVY
          }}
        />
        {isDifferentLocation && (
          <div className="mt-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
              <MapPin className="w-3 h-3" />
              Different meeting point
            </span>
            {effectiveLocation && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(effectiveLocation)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs hover:underline"
                style={{ color: NAVY }}
              >
                <Navigation className="w-3.5 h-3.5" />
                Get Directions
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Meeting Notes Textarea */}
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: NAVY }}>
          Meeting Notes
        </label>
        <textarea
          value={notes || ''}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add any special instructions for the meeting point..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus:ring-offset-2"
          style={{
            backgroundColor: CARD_BG,
            borderColor: CARD_BORDER,
            color: NAVY
          }}
        />
      </div>
    </div>
  );
}
