/**
 * Push notification registration and handling hook.
 *
 * - Requests notification permission on mount
 * - Gets the Expo push token (FCM on Android)
 * - Upserts the token to push_subscriptions table
 * - Handles foreground notification display
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const { user, householdId } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener> | undefined>(undefined);
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | undefined>(undefined);

  const registerForPushNotifications = useCallback(async () => {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Check existing permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      setPermissionGranted(false);
      return null;
    }

    setPermissionGranted(true);

    // Get the Expo push token (maps to FCM on Android)
    const tokenData = await Notifications.getExpoPushTokenAsync();

    return tokenData.data;
  }, []);

  const upsertToken = useCallback(
    async (token: string) => {
      if (!user || !householdId) return;

      const platform = Platform.OS === 'android' ? 'android' : 'web';

      // Upsert: insert or update on conflict (user_id, household_id, token)
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          household_id: householdId,
          platform,
          token,
        },
        {
          onConflict: 'user_id,household_id,token',
        }
      );

      if (error) {
        console.error('Failed to save push token:', error);
      }
    },
    [user, householdId]
  );

  useEffect(() => {
    // Register and save token
    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
        upsertToken(token);
      }
    });

    // Listen for incoming notifications (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    // Listen for notification interactions (tap)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        // TODO: Navigate to relevant inventory item
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [registerForPushNotifications, upsertToken]);

  return {
    expoPushToken,
    permissionGranted,
  };
}
