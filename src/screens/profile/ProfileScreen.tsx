import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Platform, Linking, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { supabase } from '../../api/supabase';
import { resetStreakCount, clearDailyRecords, getUserProfile, getStreakValues } from '../../api/database';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

interface ProfileScreenProps {
  navigation: any;
}

interface ProfileScreenState {
  loading: boolean;
  userData: UserData;
  uploadingImage: boolean;
}

class ProfileScreen extends React.Component<ProfileScreenProps, ProfileScreenState> {
  private _unsubscribe?: () => void;

  constructor(props: ProfileScreenProps) {
    super(props);
    this.state = {
      loading: true,
      uploadingImage: false,
      userData: {
        email: '',
        username: '',
        currentStreak: 0,
        bestStreak: 0,
        lastVerificationDate: null,
        profilePicture: null,
        dailyGoal: null,
      }
    };
  }

  componentDidMount() {
    this.loadUserData();
    // Add focus listener to reload data when screen comes into focus
    this._unsubscribe = this.props.navigation.addListener('focus', () => {
      this.loadUserData();
    });
  }

  componentWillUnmount() {
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  }

  // Load user data from Supabase
  loadUserData = async () => {
    try {
      this.setState({ loading: true });
      
      console.log('Loading user profile data...');
      
      const profileResult = await getUserProfile();
      const profile = profileResult.profile;
      
      if (profileResult.message) {
        console.log('Profile message:', profileResult.message);
      }
      
      if (!profile) {
        console.error('No profile data available');
        this.setState({ loading: false });
        return;
      }
      
      console.log('Using profile data:', profile);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        this.setState({ loading: false });
        return;
      }

      // Load locally stored profile picture
      const localProfilePicture = await AsyncStorage.getItem('localProfilePicture');
      
      // First try to get the daily goal from AsyncStorage (prioritize this)
      let finalGoal: string | null = null;
      
      try {
        const storedDailyGoal = await AsyncStorage.getItem('userDailyGoal');
        console.log('AsyncStorage daily goal:', storedDailyGoal);
        
        if (storedDailyGoal && ['early', 'mid', 'late'].includes(storedDailyGoal)) {
          console.log('Using AsyncStorage daily goal:', storedDailyGoal);
          finalGoal = storedDailyGoal;
          
          // If database value doesn't match AsyncStorage, update the database
          if (profile.daily_goal !== finalGoal) {
            console.log('Syncing AsyncStorage goal to database. AsyncStorage:', finalGoal, 'Database:', profile.daily_goal);
            
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({ daily_goal: finalGoal })
              .eq('id', user.id);
              
            if (updateError) {
              console.error('Error syncing daily goal to database:', updateError);
            } else {
              console.log('Successfully synced AsyncStorage daily goal to database');
            }
          }
        }
      } catch (storageError) {
        console.error('Error reading daily goal from AsyncStorage:', storageError);
      }
      
      // If AsyncStorage doesn't have a valid value, try the database
      if (!finalGoal) {
        let dbGoal = profile.daily_goal;
        console.log('Database daily goal:', dbGoal);
        
        // If database value is 'morning', normalize it to 'early'
        if (dbGoal === 'morning') {
          dbGoal = 'early';
        }
        
        if (dbGoal && ['early', 'mid', 'late'].includes(dbGoal)) {
          console.log('Using database daily goal:', dbGoal);
          finalGoal = dbGoal;
          
          // Sync to AsyncStorage
          try {
            await AsyncStorage.setItem('userDailyGoal', dbGoal);
            console.log('Synced database goal to AsyncStorage');
          } catch (error) {
            console.error('Error syncing goal to AsyncStorage:', error);
          }
        }
      }
      
      // Only default to 'early' if we have no valid value from either source
      if (!finalGoal || !['early', 'mid', 'late'].includes(finalGoal)) {
        console.log('No valid daily goal found, defaulting to early');
        finalGoal = 'early';
        
        // Save the default to both storage locations
        try {
          await AsyncStorage.setItem('userDailyGoal', 'early');
          await supabase
            .from('user_profiles')
            .update({ daily_goal: 'early' })
            .eq('id', user.id);
        } catch (error) {
          console.error('Error saving default goal:', error);
        }
      }
      
      console.log('Final daily goal value:', finalGoal);
      
      this.setState({
        userData: {
          email: user?.email || '',
          username: profile.display_name || user?.email?.split('@')[0] || 'User',
          currentStreak: profile.current_streak || 0,
          bestStreak: profile.longest_streak || 0,
          lastVerificationDate: profile.last_made_date || null,
          profilePicture: localProfilePicture || null,
          dailyGoal: finalGoal,
        }
      });
      
      console.log('Updated state with profile data:', { dailyGoal: finalGoal });
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      this.setState({ loading: false });
    }
  };

  // Pick an image from the gallery
  pickImage = async () => {
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await this.uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Upload profile picture to Supabase storage
  uploadProfilePicture = async (uri: string) => {
    try {
      this.setState({ uploadingImage: true });
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to upload a profile picture.');
        return;
      }
      
      // Convert image to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Upload to Supabase Storage
      const fileName = `profile-${user.id}-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, blob);
      
      if (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Error', 'Failed to upload image. Please try again.');
        return;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);
      
      // Update user profile with the new image URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_picture: publicUrl })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Error updating profile:', updateError);
        Alert.alert('Error', 'Failed to update profile. Please try again.');
        return;
      }
      
      // Update local state
      this.setState(prevState => ({
        userData: {
          ...prevState.userData,
          profilePicture: publicUrl
        }
      }));
      
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error in uploadProfilePicture:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      this.setState({ uploadingImage: false });
    }
  };

  // Set daily goal
  setDailyGoal = async (goalId: string) => {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to set a daily goal.');
        return;
      }
      
      console.log('Setting daily goal to:', goalId);
      
      // Validate the goal ID
      if (!['early', 'mid', 'late'].includes(goalId)) {
        console.error('Invalid goal ID:', goalId);
        return;
      }
      
      // First update AsyncStorage for immediate feedback
      try {
        await AsyncStorage.setItem('userDailyGoal', goalId);
        console.log('Daily goal saved to AsyncStorage:', goalId);
      } catch (storageError) {
        console.error('Error saving daily goal to AsyncStorage:', storageError);
      }
      
      // Update local state for immediate UI feedback
      this.setState(prevState => ({
        userData: {
          ...prevState.userData,
          dailyGoal: goalId
        }
      }), () => {
        console.log('Updated state with new daily goal:', goalId);
      });
      
      // Then update the database
      const { error } = await supabase
        .from('user_profiles')
        .update({ daily_goal: goalId })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error updating daily goal in database:', error);
        Alert.alert('Error', 'Failed to update daily goal. Please try again.');
        
        // Revert AsyncStorage and state if database update fails
        try {
          const previousGoal = this.state.userData.dailyGoal || 'early';
          console.log('Reverting to previous goal:', previousGoal);
          await AsyncStorage.setItem('userDailyGoal', previousGoal);
          this.setState(prevState => ({
            userData: {
              ...prevState.userData,
              dailyGoal: previousGoal
            }
          }));
        } catch (revertError) {
          console.error('Error reverting daily goal:', revertError);
        }
        return;
      }
      
      console.log('Daily goal updated successfully in all storage locations:', goalId);
      
      // Verify the update was successful
      try {
        const storedGoal = await AsyncStorage.getItem('userDailyGoal');
        console.log('Verification - AsyncStorage goal after update:', storedGoal);
        
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('daily_goal')
          .eq('id', user.id)
          .single();
          
        console.log('Verification - Database goal after update:', profile?.daily_goal);
      } catch (verifyError) {
        console.error('Error verifying goal update:', verifyError);
      }
      
    } catch (error) {
      console.error('Error setting daily goal:', error);
      Alert.alert('Error', 'Failed to set daily goal. Please try again.');
    }
  };

  // Format the last verification date
  formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate days since last verification
  getDaysSinceLastVerification = () => {
    if (!this.state.userData.lastVerificationDate) return 'N/A';
    
    const lastDate = new Date(this.state.userData.lastVerificationDate);
    const today = new Date();
    
    // Reset hours to compare just the dates
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays === 0 ? 'Today' : `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  // Sign out the user
  handleSignOut = async () => {
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
  handleResetStreak = async () => {
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
                this.loadUserData(); // Reload user data to update the UI
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
  handleCheckStreakValues = async () => {
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
  handleClearDailyRecords = async () => {
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
                this.loadUserData(); // Reload user data to update the UI
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

  // Debug function to check goal values
  debugGoalValues = async () => {
    try {
      console.log('=== DEBUG GOAL VALUES (ProfileScreen) ===');
      console.log('Current state dailyGoal:', this.state.userData.dailyGoal);
      
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
        `State: ${this.state.userData.dailyGoal}\nAsyncStorage: ${asyncGoal}\nDatabase: ${await this.getDatabaseGoal()}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error in debugGoalValues:', error);
    }
  };
  
  // Helper to get database goal
  getDatabaseGoal = async (): Promise<string> => {
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

  handleEditProfile = () => {
    this.props.navigation.navigate('EditProfile');
  };

  render() {
    const { loading, userData, uploadingImage } = this.state;

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
                <View style={styles.avatarContainer}>
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
                </View>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={this.handleEditProfile}
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
                  onPress={() => this.setDailyGoal(option.id)}
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
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          
          {/* Account Section */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.menuItem} onPress={this.handleSignOut}>
              <View style={styles.menuItemLeft}>
                <MaterialIcons name="logout" size={24} color={colors.error} style={styles.menuIcon} />
                <Text style={[styles.menuItemText, { color: colors.error }]}>Sign Out</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={this.handleResetStreak}>
              <View style={styles.menuItemLeft}>
                <MaterialIcons name="refresh" size={24} color={colors.text.primary} style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Reset Streak</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={this.handleCheckStreakValues}>
              <View style={styles.menuItemLeft}>
                <MaterialIcons name="analytics" size={24} color={colors.text.primary} style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Check Streak Values</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={this.handleClearDailyRecords}>
              <View style={styles.menuItemLeft}>
                <MaterialIcons name="delete" size={24} color={colors.text.primary} style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Clear Daily Records</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
            
            {__DEV__ && (
              <TouchableOpacity style={styles.menuItem} onPress={this.debugGoalValues}>
                <View style={styles.menuItemLeft}>
                  <MaterialIcons name="bug-report" size={24} color={colors.text.primary} style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Debug Goal Values</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
          
          {/* App Info */}
          <View style={styles.appInfoContainer}>
            <Text style={styles.appInfoText}>BedMade v1.0.0</Text>
            <Text style={styles.appInfoText}>© 2025 BedMade Inc.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

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

// Wrap the class component with a functional component to use the navigation hook
const ProfileScreenWithNavigation = () => {
  const navigation = useNavigation();
  return <ProfileScreen navigation={navigation} />;
};

export default ProfileScreenWithNavigation; 