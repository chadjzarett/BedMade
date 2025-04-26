# Testing Push Notifications with Expo Go

## Project Overview
Test and implement push notifications for BedMade app using Expo Go, focusing on four key notification types based on user's daily goal time.

## Notification Types
```javascript
const NOTIFICATION_TYPES = {
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
```

## Implementation & Testing Plan

### Phase 1: Development Setup
- [ ] Install required packages
  ```bash
  npx expo install expo-notifications expo-device @react-native-async-storage/async-storage
  ```
- [ ] Configure app.json
- [ ] Set up physical iOS device with Expo Go
- [ ] Create test notification helper functions

### Phase 2: Basic Notification Testing
- [ ] Test permission request flow
- [ ] Verify basic notification delivery
- [ ] Test notification display in different app states
  - Foreground
  - Background
  - Killed state

### Phase 3: Message Content Implementation
- [ ] Implement each notification type
- [ ] Test emoji rendering
- [ ] Verify text formatting
- [ ] Check notification sound

### Phase 4: Time-Based Testing
- [ ] Test notifications based on user's goal time
- [ ] Verify scheduling logic
- [ ] Test timezone handling
- [ ] Validate recurring notifications

## Detailed Testing Steps

### 1. Initial Setup
```bash
# Start Expo development server
npx expo start

# In Expo Go app
1. Open Expo Go
2. Scan QR code
3. Accept notification permissions
```

### 2. Basic Notification Test
```javascript
// Test single notification
async function testNotification(type) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: NOTIFICATION_TYPES[type].title,
      body: NOTIFICATION_TYPES[type].body,
      sound: 'default'
    },
    trigger: { seconds: 5 }
  });
}
```

### 3. Goal-Based Testing
```javascript
// Test based on user's goal time
async function testGoalBasedNotification(goalTime) {
  // Implementation here
}
```

## Testing Checklist

### Permission Flow
- [ ] Initial permission prompt appears
- [ ] Permission denial handled correctly
- [ ] Permission grant enables notifications
- [ ] Settings redirect works

### Content Testing
- [ ] EARLY_MORNING notification displays correctly
- [ ] MID_MORNING notification displays correctly
- [ ] LATE_MORNING notification displays correctly
- [ ] STREAK_RECOVERY notification displays correctly

### Timing Tests
- [ ] Notifications arrive at correct times
- [ ] Goal time affects scheduling correctly
- [ ] Timezone changes handled properly

### Interaction Testing
- [ ] Tapping opens app correctly
- [ ] Multiple notifications stack properly
- [ ] Notifications clear appropriately

## Test Scenarios Matrix

| Scenario | Expected Behavior | Test Status |
|----------|------------------|-------------|
| Early Morning (6-8am) | Show EARLY_MORNING message | Not Started |
| Mid Morning (8-10am) | Show MID_MORNING message | Not Started |
| Late Morning (10-12pm) | Show LATE_MORNING message | Not Started |
| Missed Goal | Show STREAK_RECOVERY message | Not Started |

## Common Issues & Solutions

### Notification Not Appearing
- Check Expo Go permissions
- Verify device settings
- Confirm notification content

### Scheduling Issues
- Verify time settings
- Check trigger configuration
- Validate goal time logic

## Testing Tools

### Expo Push Tool
1. Visit https://expo.dev/notifications
2. Enter push token
3. Test each message type

### Debug Functions
```javascript
// Log scheduled notifications
async function logScheduledNotifications() {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  console.log('Scheduled:', notifications);
}

// Log permissions
async function checkPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  console.log('Permission status:', status);
}
```

## Project Timeline

### Week 1
- Day 1-2: Setup & Basic Implementation
- Day 3-4: Message Implementation
- Day 5: Initial Testing

### Week 2
- Day 1-2: Time-Based Testing
- Day 3: Bug Fixes
- Day 4-5: Final Testing & Documentation

## Success Criteria
- All notification types display correctly
- Proper timing based on goal time
- Correct emoji rendering
- Appropriate sound playback
- Proper handling of all app states
- Successful interaction handling

## Notes
- Testing requires physical iOS device
- Expo Go limitations:
  - No custom sounds
  - Some features unavailable
  - Development environment only

## Next Steps
1. Complete setup checklist
2. Run basic notification tests
3. Implement time-based logic
4. Complete test matrix
5. Document any issues
6. Prepare for production testing

Would you like me to elaborate on any specific part of the testing plan? 