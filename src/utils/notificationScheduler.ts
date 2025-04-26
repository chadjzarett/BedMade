import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTIFICATION_TYPES } from './notificationHelper';

type NotificationType = 'BEFORE_GOAL' | 'AT_GOAL' | 'AFTER_GOAL' | 'STREAK_RECOVERY';

interface NotificationPreferences {
  beforeGoal: boolean;
  atGoal: boolean;
  afterGoal: boolean;
}

// Calculate notification times based on user's goal time
function calculateNotificationTimes(goalTime: string) {
  const [goalHour, goalMinute] = goalTime.split(':').map(Number);
  
  return {
    BEFORE_GOAL: {
      hour: Math.max(goalHour - 1, 6), // 1 hour before goal time, but no earlier than 6 AM
      minute: goalMinute
    },
    AT_GOAL: {
      hour: goalHour,
      minute: goalMinute
    },
    AFTER_GOAL: {
      hour: goalHour + 1, // 1 hour after goal time
      minute: goalMinute
    },
    STREAK_RECOVERY: {
      hour: 20, // Fixed at 8 PM
      minute: 0
    }
  };
}

// Schedule a single notification
async function scheduleNotification(type: keyof typeof NOTIFICATION_TYPES, time: { hour: number; minute: number }) {
  const notificationContent = NOTIFICATION_TYPES[type];
  
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationContent.title,
        body: notificationContent.body,
        sound: 'default',
        data: { type }
      },
      trigger: {
        hour: time.hour,
        minute: time.minute,
        repeats: true,
        channelId: 'bedmade-reminders'
      }
    });
  } catch (error) {
    console.error(`Error scheduling ${type} notification:`, error);
    throw error;
  }
}

// Get user's notification preferences
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const preferences = await AsyncStorage.getItem('notificationPreferences');
    if (preferences) {
      return JSON.parse(preferences);
    }
    // Default preferences
    return {
      beforeGoal: true,
      atGoal: true,
      afterGoal: true
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return {
      beforeGoal: true,
      atGoal: true,
      afterGoal: true
    };
  }
}

// Save user's notification preferences
export async function saveNotificationPreferences(preferences: NotificationPreferences) {
  try {
    await AsyncStorage.setItem('notificationPreferences', JSON.stringify(preferences));
    return true;
  } catch (error) {
    console.error('Error saving notification preferences:', error);
    throw error;
  }
}

// Schedule all notifications based on user's goal time and preferences
export const scheduleAllBedMakingReminders = async (goalType: string, isTestMode: boolean = false) => {
  try {
    // Skip scheduling in dev builds unless explicitly testing
    if (__DEV__ && !isTestMode) {
      console.log('Skipping notification scheduling in dev build');
      return;
    }

    // Cancel existing notifications before scheduling new ones
    await cancelAllNotifications();
    
    // Calculate notification times based on goal type
    const notificationTimes = calculateNotificationTimes(goalType);
    
    // Schedule each notification
    for (const [type, time] of Object.entries(notificationTimes)) {
      await scheduleNotification(type as NotificationType, time);
    }
    
    // Save the scheduled times to AsyncStorage
    await AsyncStorage.setItem('lastScheduledNotifications', JSON.stringify({
      goalType,
      times: notificationTimes,
      scheduledAt: new Date().toISOString()
    }));
    
    console.log('Successfully scheduled all notifications for goal type:', goalType);
  } catch (error) {
    console.error('Error scheduling notifications:', error);
    throw error;
  }
};

// Get all scheduled notifications
export async function getScheduledNotifications() {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    throw error;
  }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem('scheduledNotificationTimes');
    return true;
  } catch (error) {
    console.error('Error canceling notifications:', error);
    throw error;
  }
}

// Update notification schedule based on new goal time
export async function updateNotificationSchedule(newGoalTime: string) {
  try {
    await scheduleAllBedMakingReminders(newGoalTime);
    return true;
  } catch (error) {
    console.error('Error updating notification schedule:', error);
    throw error;
  }
}

// Check if notifications are enabled
export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem('notificationsEnabled');
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking notification status:', error);
    return false;
  }
}

// Get the last scheduled notification times
export async function getLastScheduledTimes() {
  try {
    const times = await AsyncStorage.getItem('scheduledNotificationTimes');
    return times ? JSON.parse(times) : null;
  } catch (error) {
    console.error('Error getting last scheduled times:', error);
    return null;
  }
} 