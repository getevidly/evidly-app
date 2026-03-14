/**
 * Push notification hooks for technician app
 *
 * Uses expo-notifications for device registration and notification handling.
 * Queries return stubbed empty data.
 * Mutations throw "Not implemented" until wired to Supabase.
 */

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  receivedAt: string;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Core notification state: push token, latest notification, and permission status.
 *
 * TODO: Wire to expo-notifications:
 *   - Notifications.getPermissionsAsync() / requestPermissionsAsync()
 *   - Notifications.getExpoPushTokenAsync() for the push token
 *   - Notifications.addNotificationReceivedListener() for incoming notifications
 */
export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<PushNotification | null>(
    null,
  );
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    // TODO: expo-notifications —
    //   1. Check/request permissions
    //   2. Get Expo push token
    //   3. Set up notification received listener
    //   4. Set up notification response listener (for taps)
    //
    // const { status } = await Notifications.getPermissionsAsync();
    // setHasPermission(status === 'granted');
    // if (status === 'granted') {
    //   const token = await Notifications.getExpoPushTokenAsync();
    //   setExpoPushToken(token.data);
    // }
    //
    // const subscription = Notifications.addNotificationReceivedListener(n => {
    //   setNotification({
    //     id: n.request.identifier,
    //     title: n.request.content.title ?? '',
    //     body: n.request.content.body ?? '',
    //     data: n.request.content.data ?? {},
    //     receivedAt: new Date().toISOString(),
    //   });
    // });
    //
    // return () => subscription.remove();

    setExpoPushToken(null);
    setNotification(null);
    setHasPermission(false);
  }, []);

  return { expoPushToken, notification, hasPermission };
}

/**
 * Register the device for push notifications.
 *
 * TODO: Request notification permissions if not already granted,
 *       obtain the Expo push token, and store it in Supabase
 *       (e.g., `device_push_tokens` table) linked to the current user.
 */
export function useRegisterForPushNotifications() {
  const mutate = useCallback(async () => {
    // TODO: Wire to expo-notifications + Supabase
    //   1. const { status } = await Notifications.requestPermissionsAsync();
    //   2. if (status !== 'granted') throw new Error('Permission denied');
    //   3. const token = await Notifications.getExpoPushTokenAsync();
    //   4. await supabase.from('device_push_tokens').upsert({
    //        user_id: currentUser.id,
    //        expo_push_token: token.data,
    //        platform: Platform.OS,
    //        updated_at: new Date().toISOString(),
    //      });
    throw new Error('Not implemented');
  }, []);

  return { mutate };
}
