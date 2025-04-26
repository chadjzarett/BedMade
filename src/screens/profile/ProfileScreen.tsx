import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Platform, Linking, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { supabase } from '../../api/supabase';
import { resetStreakCount, clearDailyRecords, getUserProfile, getStreakValues, updateStreakValues } from '../../api/database';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Switch } from 'react-native-paper';
import { scheduleAllBedMakingReminders, cancelAllNotifications, getNotificationPreferences, saveNotificationPreferences } from '../../utils/notificationScheduler';
import { List, Surface } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import Constants from 'expo-constants';

// Define daily goal time options
const DAILY_GOAL_OPTIONS = [
  { 
    id: 'early', 
    label: 'Espresso Shot (6am-8am)', 
    icon: 'local-cafe' as const,
    color: '#2C2F48', 
    description: 'Quick caffeine jolt to start your day!' 
  },
  { 
    id: 'mid', 
    label: 'Double Latte (8am-10am)', 
    icon: 'free-breakfast' as const,
    color: '#2C2F48', 
    description: 'A leisurely morning routine' 
  },
  { 
    id: 'late', 
    label: 'Third Cup Kicking In (10am-12pm)', 
    icon: 'emoji-food-beverage' as const,
    color: '#2C2F48', 
    description: 'For the late risers who need multiple cups!' 
  }
];

interface UserData {
  email: string;
  username: string;
  currentStreak: number;
  bestStreak: number;
  lastVerificationDate: string | null;
  profilePicture: string | null;
  dailyGoal: string | null;
  notificationsEnabled: boolean;
  notificationPreferences: {
    beforeGoal: boolean;
    atGoal: boolean;
    afterGoal: boolean;
  };
}

type RootStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
};

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    email: '',
    username: '',
    currentStreak: 0,
    bestStreak: 0,
    lastVerificationDate: null,
    profilePicture: null,
    dailyGoal: 'early',
    notificationsEnabled: false,
    notificationPreferences: {
      beforeGoal: true,
      atGoal: true,
      afterGoal: true
    }
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Add refs for tap counting
  const profileTapCountRef = React.useRef(0);
  const profileTapTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Load user data function
  const loadUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Use getUserProfile to get complete profile data
        const profileResult = await getUserProfile();
        const profile = profileResult.profile;
        
        if (profile) {
          // Load locally stored profile picture
          const localProfilePicture = await AsyncStorage.getItem('localProfilePicture');
          
          // Load notification preferences from AsyncStorage as fallback
          const localNotificationPrefs = await AsyncStorage.getItem('notificationPreferences');
          const notificationPrefs = localNotificationPrefs 
            ? JSON.parse(localNotificationPrefs) 
            : { beforeGoal: true, atGoal: true, afterGoal: true };
          
          setUserData(prevData => ({
            ...prevData,
            email: user.email || '',
            username: profile.display_name || user.email?.split('@')[0] || 'User',
            profilePicture: localProfilePicture || profile.profile_picture || null,
            dailyGoal: profile.daily_goal,
            currentStreak: profile.current_streak || 0,
            bestStreak: profile.longest_streak || 0,
            lastVerificationDate: profile.last_made_date || null,
            notificationsEnabled: profile.notifications_enabled || false,
            notificationPreferences: {
              beforeGoal: profile.notification_before_goal !== undefined ? profile.notification_before_goal : notificationPrefs.beforeGoal,
              atGoal: profile.notification_at_goal !== undefined ? profile.notification_at_goal : notificationPrefs.atGoal,
              afterGoal: profile.notification_after_goal !== undefined ? profile.notification_after_goal : notificationPrefs.afterGoal
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and focus
  useEffect(() => {
    loadUserData();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
    });

    return unsubscribe;
  }, [navigation]);

  // Load debug menu state on mount
  useEffect(() => {
    const loadDebugMenuState = async () => {
      try {
        const savedState = await AsyncStorage.getItem('debugMenuEnabled');
        if (savedState !== null) {
          setShowDevMenu(savedState === 'true');
        }
      } catch (error) {
        console.error('Error loading debug menu state:', error);
      }
    };

    if (__DEV__) {
      loadDebugMenuState();
    }
  }, []);

  // Pick an image from the gallery
  const pickImage = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to select a profile picture.',
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
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Upload profile picture to Supabase Storage
  const uploadProfilePicture = async (uri: string) => {
    try {
      setUploadingImage(true);
      console.log('Starting profile picture upload process for URI:', uri);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        Alert.alert('Error', 'You must be logged in to upload a profile picture.');
        return;
      }
      
      console.log('User authenticated, proceeding with upload');
      
      // Create a unique file name for the profile picture
      const fileExt = uri.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;
      
      // Convert the image URI to a blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Upload the image to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: true
        });
        
      if (uploadError) {
        console.error('Error uploading to Supabase Storage:', uploadError);
        Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
        return;
      }
      
      // Get the public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // Save the public URL to AsyncStorage as backup
      await AsyncStorage.setItem('localProfilePicture', publicUrl);
      
      // Update user profile with the public URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_picture: publicUrl })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Error updating profile in database:', updateError);
        Alert.alert('Error', 'Failed to update profile. Please try again.');
        return;
      }
      
      // Update local state
      setUserData(prevUserData => ({
        ...prevUserData,
        profilePicture: publicUrl
      }));
      
      console.log('Profile picture update completed successfully');
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error in uploadProfilePicture:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Set daily goal
  const handleDailyGoalChange = async (goalId: string) => {
    try {
      await AsyncStorage.setItem('userDailyGoal', goalId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ daily_goal: goalId })
          .eq('id', user.id);
      }
      
      setUserData(prevData => ({
        ...prevData,
        dailyGoal: goalId
      }));

      // Only schedule notifications in production builds unless explicitly testing
      if (!__DEV__ && userData.notificationsEnabled) {
        const goalTime = goalId === 'early' ? '07:00' : 
                        goalId === 'mid' ? '09:00' : '11:00';
        await scheduleAllBedMakingReminders(goalTime);
      }
    } catch (error) {
      console.error('Error updating daily goal:', error);
      Alert.alert('Error', 'Failed to update daily goal. Please try again.');
    }
  };

  // Format the last verification date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate days since last verification
  const getDaysSinceLastVerification = () => {
    if (!userData.lastVerificationDate) return 'N/A';
    
    const lastDate = new Date(userData.lastVerificationDate);
    const today = new Date();
    
    // Reset hours to compare just the dates
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays === 0 ? 'Today' : `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  // Sign out the user
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  // Reset streak count for testing
  const handleResetStreak = async () => {
    Alert.alert(
      'Reset Streak',
      'Are you sure you want to reset your streak count to 1? This is for testing purposes only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await resetStreakCount();
              if (result.success) {
                Alert.alert('Success', 'Streak count reset to 1');
                loadUserData(); // Reload user data to update the UI
              } else {
                Alert.alert('Error', result.error || 'Failed to reset streak count');
              }
            } catch (error) {
              console.error('Error resetting streak count:', error);
              Alert.alert('Error', 'Failed to reset streak count');
            }
          }
        }
      ]
    );
  };

  // Check streak values for debugging
  const handleCheckStreakValues = async () => {
    try {
      const result = await getStreakValues();
      if (result.success) {
        Alert.alert(
          'Current Streak Values',
          `Current Streak: ${result.currentStreak}\nLongest Streak: ${result.longestStreak}\nLast Made Date: ${result.lastMadeDate || 'None'}`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to get streak values');
      }
    } catch (error) {
      console.error('Error checking streak values:', error);
      Alert.alert('Error', 'Failed to check streak values');
    }
  };

  // Clear all daily records for testing
  const handleClearDailyRecords = async () => {
    Alert.alert(
      'Clear All Records',
      'Are you sure you want to clear all your daily records? This will reset your streak and all verification history. This is for testing purposes only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await clearDailyRecords();
              if (result.success) {
                Alert.alert('Success', 'All daily records cleared');
                loadUserData(); // Reload user data to update the UI
              } else {
                Alert.alert('Error', result.error || 'Failed to clear daily records');
              }
            } catch (error) {
              console.error('Error clearing daily records:', error);
              Alert.alert('Error', 'Failed to clear daily records');
            }
          }
        }
      ]
    );
  };

  // Restore streak values for recovery
  const handleRestoreStreak = async () => {
    Alert.prompt(
      'Restore Streak Values',
      'Enter your previous streak values (comma-separated):\nCurrent Streak,Longest Streak',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async (text) => {
            if (!text) return;
            
            try {
              const [currentStreak, longestStreak] = text.split(',').map(val => parseInt(val.trim(), 10));
              
              if (isNaN(currentStreak) || isNaN(longestStreak)) {
                Alert.alert('Error', 'Please enter valid numbers');
                return;
              }
              
              const result = await updateStreakValues(currentStreak, longestStreak);
              if (result.success) {
                Alert.alert('Success', `Streak values restored to ${currentStreak} (current) and ${longestStreak} (longest)`);
                loadUserData(); // Reload user data to update the UI
              } else {
                Alert.alert('Error', result.error || 'Failed to restore streak values');
              }
            } catch (error) {
              console.error('Error restoring streak values:', error);
              Alert.alert('Error', 'Failed to restore streak values');
            }
          }
        }
      ],
      'plain-text',
      '16,16'
    );
  };

  // Debug function to check goal values
  const debugGoalValues = async () => {
    try {
      console.log('=== DEBUG GOAL VALUES (ProfileScreen) ===');
      console.log('Current state dailyGoal:', userData.dailyGoal);
      
      // Check AsyncStorage
      const asyncGoal = await AsyncStorage.getItem('userDailyGoal');
      console.log('AsyncStorage goal:', asyncGoal);
      
      // Check database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('daily_goal')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching profile for debug:', error);
        } else {
          console.log('Database goal:', profile?.daily_goal);
        }
      }
      
      console.log('========================================');
      
      // Show alert with the values
      Alert.alert(
        'Daily Goal Values',
        `State: ${userData.dailyGoal}\nAsyncStorage: ${asyncGoal}\nDatabase: ${await getDatabaseGoal()}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error in debugGoalValues:', error);
    }
  };
  
  // Helper to get database goal
  const getDatabaseGoal = async (): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('daily_goal')
          .eq('id', user.id)
          .single();
          
        if (error) {
          return 'Error fetching';
        } else {
          return profile?.daily_goal || 'Not set';
        }
      }
      return 'No user';
    } catch (error) {
      return 'Exception';
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

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

        // Schedule notifications based on current goal time
        const goalTime = userData.dailyGoal === 'early' ? '07:00' : 
                        userData.dailyGoal === 'mid' ? '09:00' : '11:00';
        await scheduleAllBedMakingReminders(goalTime);
      } else {
        // Cancel all scheduled notifications when disabling
        await cancelAllNotifications();
      }

      // Save setting to AsyncStorage as backup
      await AsyncStorage.setItem('notificationsEnabled', value.toString());
      
      // Update user profile in database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ notifications_enabled: value })
          .eq('id', user.id);
      }

      setUserData(prevUserData => ({
        ...prevUserData,
        notificationsEnabled: value
      }));
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const toggleNotificationPreference = async (preference: keyof typeof userData.notificationPreferences) => {
    try {
      const newPreferences = {
        ...userData.notificationPreferences,
        [preference]: !userData.notificationPreferences[preference]
      };

      // Save preferences to AsyncStorage as backup
      await saveNotificationPreferences(newPreferences);

      // Update state
      setUserData(prevUserData => ({
        ...prevUserData,
        notificationPreferences: newPreferences
      }));

      // Update user profile in database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Map the preference to the database column name
        const dbColumnMap: Record<string, string> = {
          beforeGoal: 'notification_before_goal',
          atGoal: 'notification_at_goal',
          afterGoal: 'notification_after_goal'
        };
        
        const dbColumn = dbColumnMap[preference];
        if (dbColumn) {
          await supabase
            .from('user_profiles')
            .update({ [dbColumn]: newPreferences[preference] })
            .eq('id', user.id);
        }
      }

      // Reschedule notifications if they are enabled
      if (userData.notificationsEnabled) {
        const goalTime = userData.dailyGoal === 'early' ? '07:00' : 
                        userData.dailyGoal === 'mid' ? '09:00' : '11:00';
        await scheduleAllBedMakingReminders(goalTime);
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      Alert.alert('Error', 'Failed to update notification preferences');
    }
  };

  const handleProfilePictureTap = () => {
    profileTapCountRef.current++;
    console.log(`Profile picture tapped: ${profileTapCountRef.current} times`);
    
    // Clear any existing timeout
    if (profileTapTimeoutRef.current) {
      clearTimeout(profileTapTimeoutRef.current);
    }
    
    // Set a new timeout to reset the tap count after 3 seconds
    profileTapTimeoutRef.current = setTimeout(() => {
      console.log('Tap count reset due to timeout');
      profileTapCountRef.current = 0;
    }, 3000);
    
    // If tapped 5 times, toggle debug menu
    if (profileTapCountRef.current >= 5) {
      console.log('5 taps detected, toggling debug menu');
      toggleDebugMenu();
      profileTapCountRef.current = 0;
    }
  };

  const toggleDebugMenu = async () => {
    const newDebugMenuState = !showDevMenu;
    console.log(`Toggling debug menu: ${showDevMenu} -> ${newDebugMenuState}`);
    
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem('debugMenuEnabled', newDebugMenuState.toString());
      
      // Update state and force a re-render
      setShowDevMenu(newDebugMenuState);
      
      // Show feedback
      Alert.alert(
        newDebugMenuState ? 'Debug Menu Enabled' : 'Debug Menu Disabled',
        newDebugMenuState 
          ? 'Developer options are now available in the Account section.' 
          : 'Developer options have been hidden.'
      );
    } catch (error) {
      console.error('Error toggling debug menu:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        <View style={styles.userCard}>
          <View style={styles.userInfoContainer}>
            <View style={styles.avatarSection}>
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={handleProfilePictureTap}
              >
                {userData.profilePicture ? (
                  <Image 
                    source={{ uri: userData.profilePicture }} 
                    style={styles.avatarImage} 
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {userData.username.charAt(0).toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleEditProfile}
              >
                <MaterialIcons name="edit" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.userDetails}>
              <View style={styles.userDetailRow}>
                <Text style={styles.userLabel}>Username:</Text>
                <Text style={styles.userText} numberOfLines={1}>{userData.username}</Text>
              </View>
              <View style={styles.userDetailRow}>
                <Text style={styles.userLabel}>Email:</Text>
                <Text style={styles.userText} numberOfLines={1}>{userData.email}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section Header */}
        <Text style={styles.sectionHeader}>DAILY GOAL</Text>
        
        {/* Daily Goal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionDescription}>
            Set your preferred time to make your bed each day
          </Text>
          
          {DAILY_GOAL_OPTIONS.map(option => {
            const isSelected = userData.dailyGoal === option.id;
            console.log(`Option ${option.id}: isSelected=${isSelected}, userData.dailyGoal=${userData.dailyGoal}`);
            return (
              <TouchableOpacity 
                key={option.id}
                style={[
                  styles.goalOption,
                  isSelected && styles.selectedGoalOption
                ]}
                onPress={() => handleDailyGoalChange(option.id)}
              >
                <View style={[styles.goalIconContainer, { backgroundColor: option.color }]}>
                  <MaterialIcons name={option.icon} size={24} color="white" />
                </View>
                <View style={styles.goalTextContainer}>
                  <Text style={styles.goalText}>{option.label}</Text>
                  <Text style={styles.goalDescription}>{option.description}</Text>
                </View>
                {isSelected && (
                  <View style={styles.checkContainer}>
                    <MaterialIcons name="check" size={18} color="#FFFFFF" style={styles.checkIcon} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section Header */}
        <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
        
        {/* Notifications Section */}
        <View style={styles.section}>
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
              value={userData.notificationsEnabled}
              onValueChange={toggleNotifications}
              color={colors.primary}
            />
          </View>

          {userData.notificationsEnabled && (
            <>
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <MaterialIcons 
                    name="alarm" 
                    size={24} 
                    color={colors.text.primary} 
                    style={styles.menuIcon} 
                  />
                  <Text style={styles.menuItemText}>Reminder Before Goal Time</Text>
                </View>
                <Switch
                  value={userData.notificationPreferences.beforeGoal}
                  onValueChange={() => toggleNotificationPreference('beforeGoal')}
                  color={colors.primary}
                />
              </View>

              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <MaterialIcons 
                    name="schedule" 
                    size={24} 
                    color={colors.text.primary} 
                    style={styles.menuIcon} 
                  />
                  <Text style={styles.menuItemText}>Reminder At Goal Time</Text>
                </View>
                <Switch
                  value={userData.notificationPreferences.atGoal}
                  onValueChange={() => toggleNotificationPreference('atGoal')}
                  color={colors.primary}
                />
              </View>

              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <MaterialIcons 
                    name="warning" 
                    size={24} 
                    color={colors.text.primary} 
                    style={styles.menuIcon} 
                  />
                  <Text style={styles.menuItemText}>Reminder After Missing Goal</Text>
                </View>
                <Switch
                  value={userData.notificationPreferences.afterGoal}
                  onValueChange={() => toggleNotificationPreference('afterGoal')}
                  color={colors.primary}
                />
              </View>
            </>
          )}
        </View>

        {/* Section Header */}
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        
        {/* Account Section */}
        <View style={styles.section}>
          {__DEV__ && showDevMenu && (
            <>
              <List.Subheader style={styles.sectionHeader}>Debug Options</List.Subheader>
              <Surface style={styles.section}>
                <List.Item
                  title="Test Notifications"
                  description="Send test notifications for current goal time"
                  left={props => <List.Icon {...props} icon="bell-ring" />}
                  onPress={async () => {
                    try {
                      await scheduleAllBedMakingReminders(userData.dailyGoal || 'early', true);
                      Alert.alert(
                        'Test Notifications',
                        'Test notifications have been scheduled for your current goal time.',
                        [{ text: 'OK' }]
                      );
                    } catch (error) {
                      console.error('Error testing notifications:', error);
                      Alert.alert(
                        'Error',
                        'Failed to schedule test notifications. Check console for details.',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                />
              </Surface>
            </>
          )}
          
          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <View style={styles.menuItemLeft}>
              <MaterialIcons name="logout" size={24} color={colors.error} style={styles.menuIcon} />
              <Text style={[styles.menuItemText, { color: colors.error }]}>Sign Out</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          
          {showDevMenu && (
            <>
              <TouchableOpacity style={styles.menuItem} onPress={handleResetStreak}>
                <View style={styles.menuItemLeft}>
                  <MaterialIcons name="refresh" size={24} color={colors.text.primary} style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Reset Streak</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem} onPress={handleCheckStreakValues}>
                <View style={styles.menuItemLeft}>
                  <MaterialIcons name="analytics" size={24} color={colors.text.primary} style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Check Streak Values</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem} onPress={handleClearDailyRecords}>
                <View style={styles.menuItemLeft}>
                  <MaterialIcons name="delete" size={24} color={colors.text.primary} style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Clear Daily Records</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem} onPress={handleRestoreStreak}>
                <View style={styles.menuItemLeft}>
                  <MaterialIcons name="restore" size={24} color={colors.text.primary} style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Restore Streak Values</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
              
              {__DEV__ && (
                <TouchableOpacity style={styles.menuItem} onPress={debugGoalValues}>
                  <View style={styles.menuItemLeft}>
                    <MaterialIcons name="bug-report" size={24} color={colors.text.primary} style={styles.menuIcon} />
                    <Text style={styles.menuItemText}>Debug Goal Values</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        
        {/* App Info */}
        <View style={styles.appInfoContainer}>
          <Text style={styles.appInfoText}>BedMade v{Constants.expoConfig?.version || '1.0.1'}</Text>
          <Text style={styles.appInfoText}>© 2025 BedMade Inc.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSection: {
    position: 'relative',
    marginRight: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  editButton: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: 'white',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  userDetails: {
    flex: 1,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userLabel: {
    fontSize: 15,
    color: colors.text.secondary,
    marginRight: 8,
    width: 78,
  },
  userText: {
    fontSize: 15,
    color: colors.text.primary,
    flex: 1,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6E6E73',
    marginBottom: 10,
    marginTop: 10,
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  section: {
    marginBottom: 25,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 15,
    paddingHorizontal: 4,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2F48',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  selectedGoalOption: {
    backgroundColor: '#373B57',
  },
  goalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  goalTextContainer: {
    flex: 1,
  },
  goalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 13,
    color: '#A0A0B0',
    lineHeight: 18,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  checkIcon: {
    // No margin needed here
  },
  menuItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 15,
  },
  menuItemText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  appInfoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  appInfoText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: colors.text.primary,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginLeft: 10,
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtonTextSave: {
    color: 'white',
  },
});

export default ProfileScreen; 