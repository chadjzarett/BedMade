# Push Notification Implementation Guide - Expo SDK

## Prerequisites
- Expo project initialized
- expo-notifications package installed
- Backend server (Node.js/Express recommended)

## Installation

```bash
npx expo install expo-notifications
npx expo install expo-device
```

## Implementation Steps

### 1. Configure app.json
Add the following to your app.json:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./local/path/to/your/app-icon.png",
          "color": "#ffffff",
          "sounds": ["./local/path/to/your/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

### 2. Frontend Implementation

#### 2.1 Notification Handler Setup (App.js)

```javascript
import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync();

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => {
        // Handle notification here
        console.log(notification);
      }
    );

    // Listen for user interaction with notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        // Handle notification response here
        console.log(response);
      }
    );

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return (
    // Your app components
  );
}
```

#### 2.2 Permission and Token Management

```javascript
async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id' // Get this from app.json or app.config.js
    })).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}
```

### 3. Backend Implementation (Node.js/Express)

```javascript
const express = require('express');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();
const app = express();
app.use(express.json());

// Store tokens (In production, use a database)
const savedPushTokens = [];

// Add push token to array
app.post('/token', (req, res) => {
  const { token } = req.body;
  if (!savedPushTokens.includes(token)) {
    savedPushTokens.push(token);
  }
  res.send({ message: 'Token stored.' });
});

// Send push notification
async function sendPushNotification(token, title, body) {
  if (!Expo.isExpoPushToken(token)) {
    console.error(`Push token ${token} is not a valid Expo push token`);
    return;
  }

  const messages = [{
    to: token,
    sound: 'default',
    title: title,
    body: body,
    data: { withSome: 'data' },
  }];

  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (let chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    return tickets;
  } catch (error) {
    console.error(error);
  }
}

// Endpoint to trigger bed-making reminder
app.post('/send-reminder', async (req, res) => {
  const { token } = req.body;
  try {
    const tickets = await sendPushNotification(
      token,
      "Time to Make Your Bed! 🛏️",
      "Start your day right with a made bed!"
    );
    res.send({ message: 'Notification sent', tickets });
  } catch (error) {
    res.status(500).send({ error: 'Failed to send notification' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 4. Notification Messages Configuration

```javascript
const NOTIFICATION_TYPES = {
  EARLY_MORNING: {
    title: 'BedMade Morning Reminder',
    body: 'Rise and shine! 🌞 Time to start your day with a win. Make your bed in one tap and keep your streak going strong!'
  },
  MID_MORNING: {
    title: 'BedMade Mid Reminder',
    body: 'Good morning! ☀️ Your bed is waiting for its daily makeover. Quick tap to verify and maintain your perfect streak!'
  },
  LATE_MORNING: {
    title: 'BedMade Late Morning Reminder',
    body: 'Almost midday! 🕙 Don\'t forget your daily bed-making ritual. It takes just 30 seconds to continue your streak. Tap to verify!'
  },
  STREAK_RECOVERY: {
    title: 'BedMade Streak Alert',
    body: 'Still time to keep that streak alive! ⏱️ You can save your streak if you make your bed before midnight. One quick verification is all you need - tap now!'
  }
};

const TIME_WINDOWS = {
  EARLY_MORNING: { hour: 7, minute: 0 },
  MID_MORNING: { hour: 9, minute: 0 },
  LATE_MORNING: { hour: 11, minute: 0 },
  STREAK_RECOVERY: { hour: 13, minute: 0 }
};
```

### 5. Enhanced Schedule Implementation

```javascript
// Schedule all notifications based on user's goal time
async function scheduleAllBedMakingReminders(userGoalTime) {
  // Cancel any existing notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  // Calculate notification times based on user's goal time
  const notifications = calculateNotificationTimes(userGoalTime);
  
  // Schedule each notification
  for (const [type, time] of Object.entries(notifications)) {
    await scheduleNotification(type, time);
  }
}

// Calculate appropriate notification times based on user's goal time
function calculateNotificationTimes(userGoalTime) {
  const goalHour = parseInt(userGoalTime.split(':')[0]);
  const goalMinute = parseInt(userGoalTime.split(':')[1]);
  
  return {
    EARLY_MORNING: {
      hour: Math.max(goalHour - 1, 6), // No earlier than 6 AM
      minute: goalMinute
    },
    MID_MORNING: {
      hour: goalHour + 2,
      minute: goalMinute
    },
    LATE_MORNING: {
      hour: Math.min(goalHour + 4, 11), // No later than 11 AM
      minute: goalMinute
    },
    STREAK_RECOVERY: {
      hour: 20, // Fixed at 8 PM
      minute: 0
    }
  };
}

// Schedule individual notification
async function scheduleNotification(type, time) {
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
        repeats: true
      }
    });
  } catch (error) {
    console.error(`Error scheduling ${type} notification:`, error);
  }
}

// Usage example
async function setupUserNotifications(goalTime) {
  try {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      await scheduleAllBedMakingReminders(goalTime);
      // Save token to backend
      await saveTokenToBackend(token);
    }
  } catch (error) {
    console.error('Error setting up notifications:', error);
  }
}
```

### 6. Notification Management

```javascript
// Get all scheduled notifications
async function getScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// Update notification schedule based on user preferences
async function updateNotificationSchedule(newGoalTime) {
  await scheduleAllBedMakingReminders(newGoalTime);
}

// Pause notifications temporarily
async function pauseNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Resume notifications
async function resumeNotifications(goalTime) {
  await scheduleAllBedMakingReminders(goalTime);
}
```

### 7. Backend Implementation Updates

```javascript
// Updated send notification function to handle different message types
async function sendPushNotification(token, type, customMessage = null) {
  if (!Expo.isExpoPushToken(token)) {
    console.error(`Push token ${token} is not a valid Expo push token`);
    return;
  }

  const notificationContent = customMessage || NOTIFICATION_TYPES[type];

  const messages = [{
    to: token,
    sound: 'default',
    title: notificationContent.title,
    body: notificationContent.body,
    data: { type },
  }];

  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (let chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    return tickets;
  } catch (error) {
    console.error(error);
  }
}

// New endpoint to handle notification type selection
app.post('/send-reminder/:type', async (req, res) => {
  const { token } = req.body;
  const { type } = req.params;

  if (!NOTIFICATION_TYPES[type]) {
    return res.status(400).send({ error: 'Invalid notification type' });
  }

  try {
    const tickets = await sendPushNotification(token, type);
    res.send({ message: 'Notification sent', tickets });
  } catch (error) {
    res.status(500).send({ error: 'Failed to send notification' });
  }
});
```

## Testing

1. Use physical devices (notifications won't work on simulators)
2. Test different app states:
   - Foreground
   - Background
   - Killed/Terminated
3. Test scheduling scenarios
4. Verify notification permissions
5. Test notification interactions

## Error Handling

```javascript
// Error handling for token registration
try {
  const token = await registerForPushNotificationsAsync();
  // Save token to backend
} catch (error) {
  console.error('Error registering for push notifications:', error);
}

// Error handling for notification scheduling
try {
  await scheduleBedMakingReminder(8, 0); // Schedule for 8:00 AM
} catch (error) {
  console.error('Error scheduling notification:', error);
}
```

## Best Practices

1. **User Experience**
   - Request permissions at appropriate time
   - Explain benefits of notifications
   - Allow users to manage notification preferences
   - Don't over-notify

2. **Technical**
   - Store tokens securely
   - Implement retry logic for failed notifications
   - Handle token updates/refreshes
   - Clean up invalid tokens

3. **Performance**
   - Batch notifications when possible
   - Implement proper error handling
   - Monitor notification delivery rates
   - Handle offline scenarios

## User Consent and Notification Settings

### 1. Add to ProfileScreen.tsx
```javascript
// Add to userData interface
interface UserData {
  // ... existing fields ...
  notificationsEnabled: boolean;
}

// Add to notification settings section in ProfileScreen
const NotificationSettings = () => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Load notification settings from AsyncStorage
    const loadSettings = async () => {
      const enabled = await AsyncStorage.getItem('notificationsEnabled');
      setIsEnabled(enabled === 'true');
    };
    loadSettings();
  }, []);

  const toggleNotifications = async (value: boolean) => {
    try {
      if (value) {
        // Request permission when enabling
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive BedMade reminders.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                }
              }
            ]
          );
          return;
        }
      } else {
        // Cancel all scheduled notifications when disabling
        await Notifications.cancelAllScheduledNotificationsAsync();
      }

      // Save setting to AsyncStorage
      await AsyncStorage.setItem('notificationsEnabled', value.toString());
      setIsEnabled(value);

      // Update user profile in database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ notifications_enabled: value })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
      <View style={styles.menuItem}>
        <View style={styles.menuItemLeft}>
          <MaterialIcons 
            name="notifications" 
            size={24} 
            color={colors.text.primary} 
            style={styles.menuIcon} 
          />
          <Text style={styles.menuItemText}>Enable Notifications</Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={toggleNotifications}
          trackColor={{ false: '#767577', true: colors.primary }}
          thumbColor={isEnabled ? '#ffffff' : '#f4f3f4'}
        />
      </View>
    </View>
  );
};
```

### 2. Database Schema Update
Add notification preferences to user_profiles table:
```sql
ALTER TABLE user_profiles
ADD COLUMN notifications_enabled BOOLEAN DEFAULT false;
```

### 3. Permission Requirements

1. **iOS Requirements**
   - Add to app.json:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./local/path/to/your/app-icon.png",
          "color": "#ffffff",
          "sounds": ["./local/path/to/your/notification-sound.wav"]
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"],
        "NSCalendarsUsageDescription": "This app needs access to send you bed-making reminders at your preferred time."
      }
    }
  }
}
```

2. **Android Requirements**
   - No additional configuration needed beyond existing setup

### 4. User Consent Flow

1. **Initial App Launch**
   - Don't request notification permissions immediately
   - Wait for user to enable notifications in settings
   - Explain benefits before requesting permission

2. **Permission Request Timing**
   - Request when user enables notifications toggle
   - Request when user sets first daily goal
   - Provide clear explanation of notification purpose

3. **Permission Denied Handling**
   - Show instructions to enable in device settings
   - Provide easy access to device settings
   - Remember user's preference

4. **Re-requesting Permissions**
   - If previously denied, direct to device settings
   - Show reminder of benefits
   - Don't repeatedly request if denied

### 5. Notification Settings Management

1. **User Control**
   - Allow enabling/disabling all notifications
   - Persist settings across app launches
   - Sync settings with backend

2. **Settings Storage**
   - Store in AsyncStorage for quick access
   - Backup in database for cross-device sync
   - Handle offline changes

3. **Settings Updates**
   - Cancel scheduled notifications when disabled
   - Reschedule when re-enabled
   - Update all connected devices

## Limitations

1. Free tier limited to 10,000 notifications per month
2. Some features require paid plans
3. Must use physical device for testing
4. iOS requires additional setup for certain features

## Additional Best Practices for Multiple Notifications

1. **Notification Spacing**
   - Ensure sufficient time between notifications
   - Respect user's quiet hours
   - Don't send more than one notification within 30 minutes

2. **User Preferences**
   - Allow users to customize which notifications they receive
   - Provide options to adjust notification timing
   - Remember user's notification history

3. **Adaptive Scheduling**
   - Adjust notification timing based on user interaction
   - Skip notifications if user has already completed the task
   - Consider time zone changes

## Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Push Notification Tool](https://expo.dev/notifications)
- [Expo Server SDK Documentation](https://github.com/expo/expo-server-sdk-node) 


# iOS Push Notification Implementation Plan - Expo SDK

## Phase 1: Initial Setup & Configuration

### 1. Development Environment Setup
- [ ] Verify Expo SDK version compatibility
- [ ] Install required dependencies
  - expo-notifications
  - expo-device
  - @react-native-async-storage/async-storage
- [ ] Configure Apple Developer Account access
- [ ] Set up iOS development certificates

### 2. iOS Configuration
- [ ] Configure app.json for iOS notifications
  - Add notification entitlements
  - Configure background modes
  - Set up notification categories
- [ ] Create and configure Apple Push Notification Service (APNS) certificates
- [ ] Set up provisioning profiles in Apple Developer Portal
- [ ] Configure notification icons and sounds

## Phase 2: Permission Management

### 1. Permission Request System
- [ ] Design permission request flow
  - Initial app launch strategy
  - First-time user experience
  - Permission request timing
- [ ] Create permission request UI components
  - Explanation screen/modal
  - Benefits description
  - Permission request button
- [ ] Implement permission status tracking
  - AsyncStorage implementation
  - Database tracking
  - Status synchronization

### 2. Permission Handler Implementation
- [ ] Create permission request functions
- [ ] Implement permission status checks
- [ ] Design permission denial handling
- [ ] Create settings redirect functionality
- [ ] Implement permission status listeners

## Phase 3: Notification Configuration

### 1. User Preferences Setup
- [ ] Design notification preferences UI
  - Enable/disable toggle
  - Time selection interface
  - Frequency options
- [ ] Create notification settings storage
  - Local storage structure
  - Database schema updates
  - Settings sync mechanism

### 2. Notification Types Configuration
- [ ] Define notification categories
  - Early morning reminder
  - Mid-morning reminder
  - Late morning reminder
  - Streak recovery reminder
- [ ] Configure notification sounds
- [ ] Set up notification actions
- [ ] Create notification templates

## Phase 4: Backend Integration

### 1. Server Setup
- [ ] Configure Expo push notification service
- [ ] Set up notification scheduling system
- [ ] Create token management system
  - Token storage
  - Token refresh handling
  - Token validation

### 2. API Implementation
- [ ] Create notification sending endpoints
- [ ] Implement scheduling endpoints
- [ ] Set up token registration system
- [ ] Create notification tracking system

## Phase 5: Frontend Implementation

### 1. Notification Handling
- [ ] Implement foreground notification handling
- [ ] Configure background notification handling
- [ ] Set up notification interaction handling
- [ ] Create notification response system

### 2. User Interface
- [ ] Add notification settings to profile screen
- [ ] Create notification history view
- [ ] Implement notification preference controls
- [ ] Add notification status indicators

## Phase 6: Testing & Validation

### 1. Testing Setup
- [ ] Create test plans for:
  - Permission flows
  - Notification delivery
  - User interactions
  - Background behavior
- [ ] Set up test devices
- [ ] Configure test environments

### 2. Testing Scenarios
- [ ] Test permission flows
  - Initial requests
  - Denial handling
  - Re-requesting permissions
- [ ] Test notification delivery
  - Different app states
  - Various time zones
  - Network conditions
- [ ] Test user interactions
  - Notification responses
  - Settings changes
  - Preference updates

## Phase 7: Error Handling & Monitoring

### 1. Error Management
- [ ] Implement error handling for:
  - Permission failures
  - Notification failures
  - Token issues
  - Network problems
- [ ] Create error recovery strategies
- [ ] Set up error logging system

### 2. Monitoring System
- [ ] Set up notification delivery tracking
- [ ] Implement analytics for:
  - Permission rates
  - Interaction rates
  - Delivery success rates
- [ ] Create monitoring dashboard

## Phase 8: Documentation & Deployment

### 1. Documentation
- [ ] Create technical documentation
- [ ] Write user guides
- [ ] Document troubleshooting procedures
- [ ] Create maintenance guides

### 2. Deployment Preparation
- [ ] Create deployment checklist
- [ ] Prepare App Store submission
- [ ] Plan phased rollout
- [ ] Create rollback procedures

## Success Criteria

1. **Technical Requirements**
   - Successfully request and receive permissions
   - Reliable notification delivery
   - Proper handling of all app states
   - Efficient token management

2. **User Experience**
   - Clear permission requests
   - Intuitive notification settings
   - Reliable notification delivery
   - Proper interaction handling

3. **Performance Metrics**
   - >90% notification delivery rate
   - <1s notification response time
   - <1% error rate
   - >80% permission acceptance rate

## Timeline Estimation

- Phase 1: 2 days
- Phase 2: 3 days
- Phase 3: 2 days
- Phase 4: 3 days
- Phase 5: 3 days
- Phase 6: 2 days
- Phase 7: 2 days
- Phase 8: 1 day

Total Estimated Time: 18 days

## Dependencies & Requirements

1. **Technical Requirements**
   - Expo SDK version ≥ 48
   - iOS 13 or later
   - Apple Developer Account
   - Valid APNS certificates

2. **Development Requirements**
   - iOS development environment
   - Physical iOS test devices
   - Test Apple Developer account
   - Backend server environment

