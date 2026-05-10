/**
 * Push notification registration and handling hook.
 *
 * - Requests notification permission on mount
 * - Gets the Expo push token (FCM on Android)
 * - Upserts the token to push_subscriptions table
 * - Handles foreground notification display
 * - Navigates to the inventory screen when a notification is tapped
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

/** EAS project ID — must match the one in app.json > extra.eas.projectId */
const EAS_PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId ?? 'bef729e4-9b9d-4766-808d-9e0267fea2f9';

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

    // Get the Expo push token — projectId binds the token to our EAS project
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });

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

  /**
   * Handle notification tap — navigate to the inventory screen.
   * The FCM data payload contains: inventory_item_id, household_id, notification_type
   */
  const handleNotificationTap = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as
        | { inventory_item_id?: string; notification_type?: string }
        | undefined;

      if (data?.inventory_item_id) {
        // Navigate to inventory screen — the item will be visible in the list
        router.navigate('/(app)/inventory');
      }
    },
    []
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
      handleNotificationTap
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [registerForPushNotifications, upsertToken, handleNotificationTap]);

  return {
    expoPushToken,
    permissionGranted,
  };
}
