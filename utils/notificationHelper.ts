import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification types from push-testing.md
export const NOTIFICATION_TYPES = {
  EARLY_MORNING: {
    title: 'BedMade Morning Reminder',
    body: 'Rise and shine! 🌞 Time to start your day with a win. Make your bed in one tap and keep your streak going strong!'
  },
  MID_MORNING: {
    title: 'BedMade Reminder',
    body: 'Good morning! ☀️ Your bed is waiting for its daily makeover. Quick tap to verify and maintain your perfect streak!'
  },
  LATE_MORNING: {
    title: 'BedMade Last Call',
    body: 'Almost midday! 🕙 Don\'t forget your daily bed-making ritual. It takes just 30 seconds to continue your streak. Tap to verify!'
  },
  STREAK_RECOVERY: {
    title: 'BedMade Streak Alert',
    body: 'Still time to keep that streak alive! ⏱️ You can save your streak if you make your bed before midnight. One quick verification is all you need - tap now!'
  }
};

// Register for push notifications
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'ios') {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    token = (await Notifications.getExpoPushTokenAsync()).data;
  }

  return token;
}

// Test notification function
export async function testNotification(type: keyof typeof NOTIFICATION_TYPES) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: NOTIFICATION_TYPES[type].title,
      body: NOTIFICATION_TYPES[type].body,
      sound: 'default'
    },
    trigger: null // This will show the notification immediately
  });
}

// Log scheduled notifications
export async function logScheduledNotifications() {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  console.log('Scheduled notifications:', notifications);
}

// Check notification permissions
export async function checkPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  console.log('Notification permission status:', status);
  return status;
} 