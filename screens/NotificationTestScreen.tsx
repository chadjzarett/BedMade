import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { testNotification, checkPermissions, registerForPushNotificationsAsync } from '../utils/notificationHelper';

export default function NotificationTestScreen() {
  const [pushToken, setPushToken] = React.useState<string | undefined>();

  React.useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setPushToken(token);
        console.log('Push token:', token);
      }
    });
  }, []);

  const handleTestNotification = async (type: 'EARLY_MORNING' | 'MID_MORNING' | 'LATE_MORNING' | 'STREAK_RECOVERY') => {
    await testNotification(type);
  };

  const handleCheckPermissions = async () => {
    const status = await checkPermissions();
    console.log('Current permission status:', status);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Push Notification Testing</Text>
      
      {pushToken && (
        <Text style={styles.token}>Push Token: {pushToken}</Text>
      )}

      <Button 
        mode="contained" 
        onPress={() => handleTestNotification('EARLY_MORNING')}
        style={styles.button}
      >
        Test Early Morning
      </Button>

      <Button 
        mode="contained" 
        onPress={() => handleTestNotification('MID_MORNING')}
        style={styles.button}
      >
        Test Mid Morning
      </Button>

      <Button 
        mode="contained" 
        onPress={() => handleTestNotification('LATE_MORNING')}
        style={styles.button}
      >
        Test Late Morning
      </Button>

      <Button 
        mode="contained" 
        onPress={() => handleTestNotification('STREAK_RECOVERY')}
        style={styles.button}
      >
        Test Streak Recovery
      </Button>

      <Button 
        mode="outlined" 
        onPress={handleCheckPermissions}
        style={styles.button}
      >
        Check Permissions
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  token: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  button: {
    marginVertical: 10,
  },
}); 