/**
 * Clock in/out hooks with GPS for technician app
 *
 * Manages clock-in/out state and GPS location via expo-location.
 * Queries return stubbed empty data.
 * Mutations throw "Not implemented" until wired to Supabase.
 */

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface ClockStatus {
  isClockedIn: boolean;
  clockedInAt: string | null;
  currentDuration: number; // seconds
  location: GeoLocation | null;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Get the current clock-in status for the authenticated technician.
 *
 * TODO: Replace stub with Supabase query against `clock_events` table
 *       to find the most recent open clock-in event for the current user.
 * TODO: Wire currentDuration to a timer interval when clocked in.
 */
export function useClockStatus() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockedInAt, setClockedInAt] = useState<string | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [location, setLocation] = useState<GeoLocation | null>(null);

  useEffect(() => {
    // TODO: Supabase query — supabase.from('clock_events')
    //       .select('*').eq('user_id', currentUser.id).is('clock_out_at', null)
    //       .order('clock_in_at', { ascending: false }).limit(1).single()
    setIsClockedIn(false);
    setClockedInAt(null);
    setCurrentDuration(0);
    setLocation(null);
  }, []);

  // TODO: Set up interval to update currentDuration every second when clocked in
  useEffect(() => {
    if (!isClockedIn || !clockedInAt) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - new Date(clockedInAt).getTime()) / 1000,
      );
      setCurrentDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isClockedIn, clockedInAt]);

  return { isClockedIn, clockedInAt, currentDuration, location };
}

/**
 * Clock in at the current GPS location.
 *
 * TODO: Supabase insert into `clock_events` with clock_in_at, clock_in_location,
 *       and user_id.
 */
export function useClockIn() {
  const mutate = useCallback(
    async (params: { location: { lat: number; lng: number } }) => {
      // TODO: Wire to Supabase
      throw new Error('Not implemented');
    },
    [],
  );

  return { mutate };
}

/**
 * Clock out at the current GPS location.
 *
 * TODO: Supabase update on the open `clock_events` row, setting clock_out_at
 *       and clock_out_location.
 */
export function useClockOut() {
  const mutate = useCallback(
    async (params: { location: { lat: number; lng: number } }) => {
      // TODO: Wire to Supabase
      throw new Error('Not implemented');
    },
    [],
  );

  return { mutate };
}

/**
 * Get the current GPS location using expo-location.
 *
 * TODO: Replace stub with actual expo-location integration.
 *       - Request foreground permissions via Location.requestForegroundPermissionsAsync()
 *       - Get current position via Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
 */
export function useCurrentLocation() {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      // TODO: expo-location —
      //   const { status } = await Location.requestForegroundPermissionsAsync();
      //   if (status !== 'granted') { setError('Location permission denied'); return; }
      //   const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      //   setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      setLocation(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to get location');
    } finally {
      setLoading(false);
    }
  }, []);

  return { location, loading, error };
}
