import * as React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, Button, Surface, Badge, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { supabase } from '../../api/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { getTodayLocalDateString } from '../../utils/dateUtils';
import { getUserProfile } from '../../api/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the daily goal options
const DAILY_GOAL_INFO = {
  early: { 
    label: 'Espresso Shot (6am-8am)', 
    icon: 'wb-sunny' as const, 
    color: '#FF9500',
    timeRange: '6am-8am',
    description: 'Quick caffeine jolt to start your day!'
  },
  mid: { 
    label: 'Double Latte (8am-10am)', 
    icon: 'access-time' as const, 
    color: '#34C759',
    timeRange: '8am-10am',
    description: 'A leisurely morning routine'
  },
  late: { 
    label: 'Third Cup Kicking In (10am-12pm)', 
    icon: 'watch-later' as const, 
    color: '#007AFF',
    timeRange: '10am-12pm',
    description: 'For the late risers who need multiple cups!'
  },
};

// Define the navigation prop types
type HomeStackParamList = {
  HomeScreen: undefined;
  Verification: undefined;
  VerificationSuccess: {
    isMade: boolean;
    message: string;
    confidence?: number;
  };
  Profile: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'HomeScreen'>;

const HomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  
  // Add a ref to track if we've already loaded the goal
  const hasLoadedGoalRef = React.useRef(false);
  
  // States for the home screen
  const [hasVerifiedBed, setHasVerifiedBed] = React.useState(false);
  const [isEarlyBird, setIsEarlyBird] = React.useState(false);
  const [currentStreak, setCurrentStreak] = React.useState(0);
  const [bestStreak, setBestStreak] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [dailyGoal, setDailyGoal] = React.useState<string | null>(null);
  const [verificationTime, setVerificationTime] = React.useState<string | null>(null);
  const [isWithinGoal, setIsWithinGoal] = React.useState(false);
  const [dailyQuote, setDailyQuote] = React.useState({
    text: "The state of your bed reflects the state of your head.",
    author: "Naval Ravikant"
  });
  // Add a state to track if user is new (no beds made yet)
  const [isNewUser, setIsNewUser] = React.useState(false);
  // Add a state to track total beds made
  const [totalBedsMade, setTotalBedsMade] = React.useState(0);
  // Add a refresh key to force re-renders when needed
  const [refreshKey, setRefreshKey] = React.useState(0);
  // Add state for early completion
  const [isEarlyCompletion, setIsEarlyCompletion] = React.useState(false);
  // Add state for avatar URL
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  // Force refresh function for testing
  const forceRefresh = () => {
    console.log('Forcing refresh of HomeScreen');
    setRefreshKey(prevKey => prevKey + 1);
    hasLoadedGoalRef.current = false; // Reset the ref to force goal reload
    loadUserData();
  };

  // Debug function to check goal values
  const debugGoalValues = async () => {
    try {
      console.log('=== DEBUG GOAL VALUES ===');
      console.log('Current state dailyGoal:', dailyGoal);
      console.log('hasLoadedGoalRef:', hasLoadedGoalRef.current);
      
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
      
      console.log('========================');
    } catch (error) {
      console.error('Error in debugGoalValues:', error);
    }
  };

  // Load user data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('HomeScreen focused - reloading user data');
      console.log('Current dailyGoal before focus reload:', dailyGoal);
      // Always reload data when screen comes into focus
      hasLoadedGoalRef.current = false; // Reset the ref to force goal reload
      loadUserData();
      return () => {
        // Cleanup function
        console.log('HomeScreen lost focus, dailyGoal value:', dailyGoal);
      }; 
    }, [refreshKey]) // Remove dailyGoal from dependencies to prevent circular updates
  );

  // Load user data on component mount
  React.useEffect(() => {
    console.log('HomeScreen mounted - initial data load');
    console.log('Initial dailyGoal value:', dailyGoal);
    hasLoadedGoalRef.current = false; // Reset the ref to force goal reload
    loadUserData();
    
    // Add effect to log when dailyGoal changes
    return () => {
      console.log('HomeScreen unmounted, final dailyGoal value:', dailyGoal);
    };
  }, [refreshKey]); // Add refreshKey to dependencies to ensure it refreshes when needed

  // Add an effect to listen for AsyncStorage changes
  React.useEffect(() => {
    // Function to check AsyncStorage for goal changes
    const checkForGoalChanges = async () => {
      try {
        const storedGoal = await AsyncStorage.getItem('userDailyGoal');
        if (storedGoal && storedGoal !== dailyGoal && ['early', 'mid', 'late'].includes(storedGoal)) {
          console.log('Detected goal change in AsyncStorage:', storedGoal, 'Current:', dailyGoal);
          
          // Update local state
          setDailyGoal(storedGoal);
          
          // Also sync to database to ensure consistency
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            console.log('Syncing AsyncStorage goal change to database:', storedGoal);
            const { error } = await supabase
              .from('user_profiles')
              .update({ daily_goal: storedGoal })
              .eq('id', user.id);
              
            if (error) {
              console.error('Error syncing AsyncStorage goal to database:', error);
            } else {
              console.log('Successfully synced AsyncStorage goal to database');
            }
          }
        }
      } catch (error) {
        console.error('Error checking AsyncStorage for goal changes:', error);
      }
    };

    // Set up an interval to check for changes - use a longer interval to reduce overhead
    const intervalId = setInterval(checkForGoalChanges, 2000); // Check every 2 seconds
    
    // Also check immediately on mount or when dailyGoal changes
    checkForGoalChanges();
    
    // Clean up the interval on unmount
    return () => clearInterval(intervalId);
  }, [dailyGoal]);

  // Function to manually update the daily goal
  const updateDailyGoal = async (newGoal: string) => {
    if (['early', 'mid', 'late'].includes(newGoal)) {
      console.log('Manually updating daily goal to:', newGoal);
      setDailyGoal(newGoal);
      hasLoadedGoalRef.current = true; // Mark as loaded to prevent overwriting
      
      try {
        await AsyncStorage.setItem('userDailyGoal', newGoal);
        console.log('Saved new goal to AsyncStorage');
        
        // Also update the database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('user_profiles')
            .update({ daily_goal: newGoal })
            .eq('id', user.id);
            
          if (error) {
            console.error('Error updating goal in database:', error);
          } else {
            console.log('Successfully updated goal in database');
          }
        }
      } catch (error) {
        console.error('Error saving goal to AsyncStorage:', error);
      }
    }
  };

  // Load user data from Supabase
  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        setLoading(false);
        return;
      }

      console.log('Loading data for user:', user.id);

      // Get today's date in YYYY-MM-DD format using local timezone
      const today = getTodayLocalDateString();
      console.log('Today\'s date (local):', today);
      
      // Get the profile data (needed for both goal setting and streak calculation)
      const profileResult = await getUserProfile();
      const profile = profileResult.profile;
      
      // Only load the daily goal if we haven't already loaded it
      if (!hasLoadedGoalRef.current) {
        console.log('Loading daily goal (not loaded yet)');
        // First, load the daily goal from all sources
        let finalGoal: string | null = null;
        let asyncStorageGoal: string | null = null;
        
        // 1. Try AsyncStorage first for immediate value
        try {
          asyncStorageGoal = await AsyncStorage.getItem('userDailyGoal');
          if (asyncStorageGoal && ['early', 'mid', 'late'].includes(asyncStorageGoal)) {
            console.log('Found valid daily goal in AsyncStorage:', asyncStorageGoal);
            finalGoal = asyncStorageGoal;
          }
        } catch (storageError) {
          console.error('Error reading daily goal from AsyncStorage:', storageError);
        }
        
        // 2. If we have a valid AsyncStorage value, make sure it's synced to the database
        if (finalGoal && profile?.daily_goal !== finalGoal) {
          console.log('AsyncStorage goal differs from database goal. AsyncStorage:', finalGoal, 'Database:', profile?.daily_goal);
          console.log('Syncing AsyncStorage goal to database...');
          
          try {
            const { error } = await supabase
              .from('user_profiles')
              .update({ daily_goal: finalGoal })
              .eq('id', user.id);
              
            if (error) {
              console.error('Error syncing AsyncStorage goal to database:', error);
            } else {
              console.log('Successfully synced AsyncStorage goal to database');
            }
          } catch (error) {
            console.error('Exception syncing AsyncStorage goal to database:', error);
          }
        }
        // 3. If we don't have a valid AsyncStorage value, try the database value
        else if (!finalGoal && profile?.daily_goal) {
          let dbGoal = profile.daily_goal;
          if (dbGoal === 'morning') {
            dbGoal = 'early';
          }
          if (['early', 'mid', 'late'].includes(dbGoal)) {
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
        
        // 4. Only default to 'early' if we have no valid value from any source
        if (!finalGoal) {
          console.log('No valid daily goal found, defaulting to early');
          finalGoal = 'early';
          
          // Save the default to both storage locations
          try {
            await AsyncStorage.setItem('userDailyGoal', 'early');
            if (user) {
              await supabase
                .from('user_profiles')
                .update({ daily_goal: 'early' })
                .eq('id', user.id);
            }
          } catch (error) {
            console.error('Error saving default goal:', error);
          }
        }
        
        // Set the final goal value
        console.log('Setting final daily goal to:', finalGoal);
        setDailyGoal(finalGoal);
        
        // Mark that we've loaded the goal
        hasLoadedGoalRef.current = true;
      } else {
        console.log('Skipping daily goal load, already loaded. Current value:', dailyGoal);
      }
      
      // Get today's verification record
      const { data: todayRecord, error: recordError } = await supabase
        .from('daily_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      // Log the entire today's record for debugging
      console.log('Raw today\'s record:', JSON.stringify(todayRecord, null, 2));

      let verifiedToday = false;

      if (recordError) {
        if (recordError.code === 'PGRST116') {
          console.log('No record found for today, this is normal if user hasn\'t verified yet');
          setHasVerifiedBed(false);
          setVerificationTime(null);
          setIsWithinGoal(false);
          setIsEarlyCompletion(false);
        } else {
          console.error('Error fetching today\'s record:', recordError);
          setHasVerifiedBed(false);
          setVerificationTime(null);
          setIsWithinGoal(false);
          setIsEarlyCompletion(false);
        }
      } else {
        verifiedToday = todayRecord?.made === true;
        console.log('Today\'s verification status:', {
          record_id: todayRecord?.id,
          date: todayRecord?.date,
          made: todayRecord?.made,
          made_time: todayRecord?.made_time,
          verifiedToday,
          raw_record: todayRecord
        });
        
        setHasVerifiedBed(verifiedToday);
        
        if (verifiedToday && todayRecord?.made_time) {
          const madeTime = new Date(todayRecord.made_time);
          setVerificationTime(formatVerificationTime(madeTime));
          
          // Check time status if we have a daily goal
          let timeStatus = { isWithinGoal: false, isEarly: false };
          if (dailyGoal) {
            timeStatus = checkIsWithinGoalTime(madeTime, dailyGoal);
            console.log('Time status check:', {
              madeTime: madeTime.toLocaleString(),
              dailyGoal,
              timeStatus
            });
            setIsWithinGoal(timeStatus.isWithinGoal);
            setIsEarlyCompletion(timeStatus.isEarly);
          }
          
          const isEarly = madeTime.getHours() < 8;
          setIsEarlyBird(isEarly);
          console.log('Bed verification details:', {
            madeTime: madeTime.toLocaleString(),
            isEarlyBird: isEarly,
            isWithinGoal: timeStatus.isWithinGoal,
            isEarlyCompletion: timeStatus.isEarly
          });
        } else {
          setVerificationTime(null);
          setIsWithinGoal(false);
          setIsEarlyBird(false);
          setIsEarlyCompletion(false);
        }
      }

      // Get all verification records to calculate streaks correctly
      const { data: recordsData, error: recordsError } = await supabase
        .from('daily_records')
        .select('date, made')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (recordsError) {
        console.error('Error fetching records:', recordsError);
      }

      // Calculate streaks with consecutive date check
      let streakCount = 0;
      let currentStreakCount = 0;
      let bestStreakCount = 0;

      if (recordsData && recordsData.length > 0) {
        // Create a map of dates to verification status
        const verificationMap = new Map();
        recordsData.forEach(record => {
          verificationMap.set(record.date, record.made);
        });

        // Convert to sorted array of entries
        const sortedDates = Array.from(verificationMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]));

        console.log('Sorted verification dates:', sortedDates);

        // Calculate streaks with consecutive date check
        for (let i = 0; i < sortedDates.length; i++) {
          const [currentDate, isMade] = sortedDates[i];
          
          if (isMade) {
            if (streakCount === 0) {
              streakCount = 1;
            } else {
              // Check if dates are consecutive
              const prevDate = new Date(sortedDates[i - 1][0]);
              const currDate = new Date(currentDate);
              const diffTime = currDate.getTime() - prevDate.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays === 1) {
                streakCount++;
              } else {
                streakCount = 1; // Reset to 1 since current day is made
              }
            }
            
            // Update best streak if current streak is higher
            if (streakCount > bestStreakCount) {
              bestStreakCount = streakCount;
            }
          } else {
            streakCount = 0;
          }
        }

        // The current streak is the final streak count if it's still active
        currentStreakCount = streakCount;

        console.log('Calculated streak values:', {
          currentStreak: currentStreakCount,
          bestStreak: bestStreakCount,
          streakCount
        });
      }
      
      // Load locally stored profile picture
      const localProfilePicture = await AsyncStorage.getItem('localProfilePicture');
      setAvatarUrl(localProfilePicture);
      
      if (profile) {
        console.log('Raw profile data:', profile);
        
        // Use calculated streak values instead of profile values
        setCurrentStreak(currentStreakCount);
        setBestStreak(bestStreakCount);
        
        // Set total beds made based on the actual records count, not just the profile value
        const totalMade = recordsData?.filter(record => record.made)?.length || 0;
        setTotalBedsMade(totalMade);
        
        // Check if user is new based on verification records, not just profile
        // A user is new if they have no verification records where made=true
        const newUserStatus = totalMade === 0 && !verifiedToday;
        setIsNewUser(newUserStatus);
        
        console.log('Updated state with calculated data:', {
          currentStreak: currentStreakCount,
          bestStreak: bestStreakCount,
          dailyGoal: dailyGoal,
          totalBedsMade: totalMade,
          isNewUser: newUserStatus,
          hasVerifiedToday: verifiedToday
        });
      } else {
        console.error('No profile data available');
        // If no profile, consider as new user but still respect verification status
        setIsNewUser(!verifiedToday);
        setTotalBedsMade(0);
      }
      
      console.log('Data loading complete');
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle verify bed button press
  const handleVerifyBed = () => {
    // Check if we already verified today before navigating
    if (hasVerifiedBed) {
      console.log('Bed already verified today, not navigating to verification screen');
      return;
    }
    
    // Navigate to the verification screen
    console.log('Navigating to verification screen');
    navigation.navigate('Verification');
  };

  // Add a function to navigate to the Profile tab
  const navigateToProfile = () => {
    // Navigate to the Profile tab
    navigation.navigate('Profile' as any);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const isPastGoalTime = (goalType: string | null): boolean => {
    if (!goalType) return false;
    
    const now = new Date();
    const hour = now.getHours();
    
    switch (goalType) {
      case 'early':
        return hour >= 8;  // Past 8 AM
      case 'mid':
        return hour >= 10; // Past 10 AM
      case 'late':
        return hour >= 12; // Past 12 PM
      default:
        return false;
    }
  };

  // Update the checkIsWithinGoalTime function to handle early completions
  const checkIsWithinGoalTime = (verificationDate: Date, goalType: string): { isWithinGoal: boolean; isEarly: boolean } => {
    console.log('Checking if within goal time:', { verificationDate, goalType });
    
    const hour = verificationDate.getHours();
    const minute = verificationDate.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    console.log('Time in minutes:', timeInMinutes);
    
    let result = { isWithinGoal: false, isEarly: false };
    
    switch (goalType) {
      case 'early':
        result = {
          isWithinGoal: timeInMinutes >= 6 * 60 && timeInMinutes < 8 * 60,
          isEarly: timeInMinutes < 6 * 60
        };
        break;
      case 'mid':
        result = {
          isWithinGoal: timeInMinutes >= 8 * 60 && timeInMinutes < 10 * 60,
          isEarly: timeInMinutes < 8 * 60
        };
        break;
      case 'late':
        result = {
          isWithinGoal: timeInMinutes >= 10 * 60 && timeInMinutes < 12 * 60,
          isEarly: timeInMinutes < 10 * 60
        };
        break;
      default:
        result = { isWithinGoal: false, isEarly: false };
    }
    
    console.log('Time status result:', result);
    return result;
  };

  // Add a function to format verification time
  const formatVerificationTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Update the formatTimeDifference function to correctly calculate time differences
  const formatTimeDifference = (verificationTime: string | null, goalType: string): string => {
    if (!verificationTime) return '';
    
    const madeTime = new Date(verificationTime);
    const hour = madeTime.getHours();
    const minute = madeTime.getMinutes();
    const madeTimeInMinutes = (hour * 60) + minute;
    
    let goalStartHour;
    switch (goalType) {
      case 'early':
        goalStartHour = 6;
        break;
      case 'mid':
        goalStartHour = 8;
        break;
      case 'late':
        goalStartHour = 10;
        break;
      default:
        return '';
    }
    
    const goalTimeInMinutes = goalStartHour * 60;
    const diffInMinutes = Math.abs(goalTimeInMinutes - madeTimeInMinutes); // Take absolute value
    
    if (diffInMinutes >= 120) { // 2 or more hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hours`;
    } else if (diffInMinutes >= 60) { // 1-2 hours
      return "1 hour";
    } else {
      return `${diffInMinutes} minutes`;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Greeting Section */}
        <View style={styles.section}>
          <View style={styles.greetingContainer}>
            <View style={styles.greetingTextContainer}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.date}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
            {avatarUrl && (
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={() => navigation.navigate('Profile' as any)}
              >
                <Image 
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                />
              </TouchableOpacity>
            )}
          </View>
          {/* Debug text to show if user is considered new */}
          {__DEV__ && (
            <View>
              <Text style={{ color: 'gray', fontSize: 12 }}>
                Debug: isNewUser={isNewUser ? 'true' : 'false'}, totalBedsMade={totalBedsMade}, hasVerifiedBed={hasVerifiedBed ? 'true' : 'false'}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 5 }}>
                <TouchableOpacity onPress={forceRefresh} style={{ marginRight: 10 }}>
                  <Text style={{ color: 'blue', fontSize: 12 }}>Force Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={debugGoalValues}>
                  <Text style={{ color: 'green', fontSize: 12 }}>Debug Goals</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Status Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Status</Text>
          <Surface style={styles.modernStatusCard}>
            {hasVerifiedBed ? (
              <View style={styles.verifiedStatusContainer}>
                <View style={styles.modernStatusIconContainer}>
                  <MaterialIcons name="check-circle" size={48} color="#34C759" />
                </View>
                <View style={styles.statusTextContainer}>
                  <View style={styles.statusHeaderContainer}>
                    <Text style={styles.modernStatusTitle}>Bed Made</Text>
                    {isEarlyCompletion && (
                      <View style={[styles.goalStatusBadge, styles.earlyCompletionBadge]}>
                        <MaterialIcons name="star" size={14} color="#FFD700" />
                        <Text style={[styles.goalStatusText, styles.earlyCompletionText]}>
                          Superstar!
                        </Text>
                      </View>
                    )}
                    {isWithinGoal && !isEarlyCompletion && (
                      <View style={[styles.goalStatusBadge, styles.withinGoalBadge]}>
                        <MaterialIcons name="check" size={14} color="white" />
                        <Text style={[styles.goalStatusText, styles.withinGoalText]}>
                          Goal Achieved
                        </Text>
                      </View>
                    )}
                    {dailyGoal && !isWithinGoal && !isEarlyCompletion && (
                      <View style={[styles.goalStatusBadge, styles.missedGoalBadge]}>
                        <MaterialIcons name="warning" size={14} color="#FF3B30" />
                        <Text style={[styles.goalStatusText, styles.missedGoalText]}>
                          Goal Missed
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.modernStatusMessage}>
                    {isEarlyCompletion 
                      ? "Outstanding! You beat your goal time and started your day with a win!"
                      : isWithinGoal 
                        ? `Great job hitting your ${DAILY_GOAL_INFO[dailyGoal as keyof typeof DAILY_GOAL_INFO]?.timeRange || 'morning'} goal!`
                        : "Better late than never! Your bed is made and that's what matters most."}
                  </Text>
                  <View style={styles.badgeContainer}>
                    {verificationTime && (
                      <View style={[
                        styles.modernTimeBadge,
                        isEarlyCompletion && styles.earlyTimeBadge,
                        isWithinGoal && !isEarlyCompletion && styles.withinGoalTimeBadge,
                        !isWithinGoal && !isEarlyCompletion && styles.missedTimeBadge
                      ]}>
                        <MaterialIcons 
                          name="access-time" 
                          size={14} 
                          color={isEarlyCompletion ? "#3498DB" : isWithinGoal ? "#34C759" : "#FF3B30"} 
                        />
                        <Text style={[
                          styles.modernTimeBadgeText,
                          isEarlyCompletion && styles.earlyTimeBadgeText,
                          isWithinGoal && !isEarlyCompletion && styles.withinGoalTimeBadgeText,
                          !isWithinGoal && !isEarlyCompletion && styles.missedTimeBadgeText
                        ]}>
                          Verified at {verificationTime}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.unverifiedStatusContainer}>
                {!dailyGoal || !isPastGoalTime(dailyGoal) ? (
                  <View style={styles.modernStatusIconContainer}>
                    <MaterialIcons name="hotel" size={32} color={colors.primary} />
                  </View>
                ) : null}
                <View style={styles.statusTextContainer}>
                  {dailyGoal && !isPastGoalTime(dailyGoal) && (
                    <View style={styles.statusHeaderContainer}>
                      <Text style={styles.unverifiedStatusTitle}>Ready for Today?</Text>
                    </View>
                  )}
                  
                  {dailyGoal && isPastGoalTime(dailyGoal) && (
                    <View style={styles.timeCheckContainer}>
                      <View style={[styles.timeCheckIconContainer, styles.timeCheckIconContainerLate]}>
                        <MaterialIcons name="access-time" size={28} color="#FF3B30" />
                      </View>
                      <View style={styles.timeCheckContent}>
                        <Text style={styles.timeCheckTitle}>Time Check</Text>
                        <Text style={styles.timeCheckText}>
                          Goal time passed, but you can still complete today's challenge!
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Daily Goal Badge - Show when not past goal time */}
                  {dailyGoal && !isPastGoalTime(dailyGoal) && (
                    <View style={styles.goalBadgeContainer}>
                      <View style={styles.dailyGoalBadge}>
                        <MaterialIcons 
                          name={DAILY_GOAL_INFO[dailyGoal as keyof typeof DAILY_GOAL_INFO]?.icon || 'access-time'} 
                          size={16} 
                          color={DAILY_GOAL_INFO[dailyGoal as keyof typeof DAILY_GOAL_INFO]?.color || colors.primary} 
                        />
                        <Text style={styles.dailyGoalText}>
                          Today's Goal: {DAILY_GOAL_INFO[dailyGoal as keyof typeof DAILY_GOAL_INFO]?.timeRange}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Motivational message - Only show when not past goal time */}
                  {dailyGoal && !isPastGoalTime(dailyGoal) && (
                    <Text style={styles.verificationPromptText}>
                      Make your bed during your {DAILY_GOAL_INFO[dailyGoal as keyof typeof DAILY_GOAL_INFO]?.timeRange || 'morning'} goal time to build a consistent habit!
                    </Text>
                  )}
                  
                  {currentStreak > 1 && (
                    <View style={styles.streakMiniContainer}>
                      <MaterialIcons name="local-fire-department" size={16} color="#FF9500" />
                      <Text style={styles.streakMiniText}>
                        {currentStreak} day streak! Keep it going!
                      </Text>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={[
                      styles.modernVerifyButton,
                      dailyGoal && isPastGoalTime(dailyGoal) && styles.modernLateVerifyButton
                    ]}
                    onPress={handleVerifyBed}
                  >
                    <MaterialIcons name="camera-alt" size={20} color="white" />
                    <Text style={styles.modernVerifyButtonText}>
                      Verify Your Bed
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Surface>
        </View>

        {/* Streak Section - Only show for non-new users */}
        {!isNewUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Streaks</Text>
            <View style={styles.streakCardsContainer}>
              {/* Current Streak Card */}
              <Surface style={styles.modernStreakCard}>
                <Text style={styles.modernStreakValue}>{currentStreak}</Text>
                <View style={styles.modernStreakLabelContainer}>
                  <MaterialIcons name="local-fire-department" size={20} color={colors.primary} style={styles.modernStreakIcon} />
                  <Text style={styles.modernStreakLabel}>Current</Text>
                </View>
              </Surface>

              {/* Best Streak Card */}
              <Surface style={styles.modernStreakCard}>
                <Text style={styles.modernStreakValue}>{bestStreak}</Text>
                <View style={styles.modernStreakLabelContainer}>
                  <MaterialIcons name="star" size={20} color="#3498DB" style={styles.modernStreakIcon} />
                  <Text style={styles.modernStreakLabel}>Best</Text>
                </View>
              </Surface>
            </View>
          </View>
        )}

        {/* New User Benefits Section - Only show for new users */}
        {isNewUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why Make Your Bed?</Text>
            <Surface style={styles.enhancedBenefitsCard}>
              <View style={styles.benefitItem}>
                <MaterialIcons name="check-circle" size={24} color={colors.success} />
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>Start your day with an accomplishment</Text>
                  <Text style={styles.benefitSubtext}>Small wins build momentum for bigger tasks</Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <MaterialIcons name="check-circle" size={24} color={colors.success} />
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>Build positive habits that last</Text>
                  <Text style={styles.benefitSubtext}>One simple daily ritual leads to other good habits</Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <MaterialIcons name="check-circle" size={24} color={colors.success} />
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>Create a more peaceful living space</Text>
                  <Text style={styles.benefitSubtext}>A tidy bed contributes to a calmer environment</Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <MaterialIcons name="check-circle" size={24} color={colors.success} />
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>Improve your mental well-being</Text>
                  <Text style={styles.benefitSubtext}>Orderly spaces reduce stress and anxiety</Text>
                </View>
              </View>
            </Surface>
          </View>
        )}

        {/* Quote Section - Only show for non-new users */}
        {!isNewUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Brew of Inspiration</Text>
            <Surface style={styles.enhancedQuoteCard}>
              <View style={[styles.quoteIconContainer, { backgroundColor: '#000000' }]}>
                <MaterialIcons name="format-quote" size={24} color="white" />
              </View>
              <View style={styles.quoteContent}>
                <Text style={styles.quoteText}>{dailyQuote.text}</Text>
                <Text style={styles.quoteAuthor}>— {dailyQuote.author}</Text>
              </View>
            </Surface>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7', // Light gray background like in the image
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerIcon: {
    position: 'absolute',
    right: 15,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 20,
  },
  greetingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 5,
  },
  date: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 10,
  },
  statusCard: {
    borderRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  madeBadge: {
    backgroundColor: colors.success,
  },
  notMadeBadge: {
    backgroundColor: colors.error,
  },
  verifyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  verifyText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  verifyButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  verifiedContainer: {
    padding: 20,
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  earlyBirdContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF9C4',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  earlyBirdText: {
    color: '#F57F17',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  streakCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modernStreakCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  modernStreakValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  modernStreakLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernStreakIcon: {
    marginRight: 6,
  },
  modernStreakLabel: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  enhancedQuoteCard: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quoteIconContainer: {
    backgroundColor: colors.primary,
    padding: 16,
    alignItems: 'flex-start',
  },
  quoteContent: {
    padding: 16,
    backgroundColor: 'white',
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: colors.text.primary,
    marginBottom: 12,
    lineHeight: 24,
  },
  quoteAuthor: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'right',
    fontWeight: '500',
  },
  modernStatusCard: {
    borderRadius: 20,
    backgroundColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    padding: 20,
  },
  modernStatusIconContainer: {
    backgroundColor: '#F5F7FA',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modernStatusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  modernStatusMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  modernTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    marginRight: 8,
    flex: 0,
  },
  modernTimeBadgeText: {
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  modernLateVerificationBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF1F0',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  modernLateVerificationIconContainer: {
    backgroundColor: '#FFE5E5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modernLateVerificationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 6,
  },
  modernLateVerificationText: {
    fontSize: 15,
    color: '#FF3B30',
    lineHeight: 22,
    opacity: 0.9,
  },
  modernVerifyButton: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modernVerifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  modernLateVerifyButton: {
    backgroundColor: '#000000',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  verifiedStatusContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusTextContainer: {
    flex: 1,
  },
  statusHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  goalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: -2,
  },
  goalStatusText: {
    fontWeight: '500',
    fontSize: 12,
    marginLeft: 4,
  },
  withinGoalBadge: {
    backgroundColor: '#34C759',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notWithinGoalBadge: {
    backgroundColor: '#FFF3E0',
  },
  withinGoalText: {
    color: 'white',
    fontWeight: '600',
  },
  notWithinGoalText: {
    color: '#FFA726',
  },
  unverifiedStatusContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  newUserTextContainer: {
    paddingLeft: 8, // Add a bit of padding when there's no icon
  },
  newUserTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  newUserMessage: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 16,
    lineHeight: 22,
  },
  earlyVerificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  earlyVerificationText: {
    color: '#F57C00',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  lateVerificationBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF1F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  lateVerificationIconContainer: {
    backgroundColor: '#FFE5E5',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  lateVerificationIconOverlay: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'white',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  lateVerificationContent: {
    flex: 1,
  },
  lateVerificationTitle: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  lateVerificationText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    opacity: 0.9,
  },
  lateVerifyButton: {
    backgroundColor: '#FF3B30',
  },
  setGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  setGoalButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
    marginRight: 8,
    flex: 1,
  },
  enhancedBenefitsCard: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: 'white',
    padding: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  benefitTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  benefitSubtext: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 17,
  },
  newUserVerifyButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  newUserVerifyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  earlyCompletionBadge: {
    backgroundColor: '#8E44AD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    marginTop: -2,
  },
  earlyCompletionText: {
    color: 'white',
    fontWeight: '700',
  },
  earlyTimeBadge: {
    backgroundColor: '#E8F5FF',
    borderWidth: 1,
    borderColor: '#3498DB',
  },
  earlyTimeBadgeText: {
    color: '#3498DB',
    fontWeight: '700',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  avatarContainer: {
    marginLeft: 16,
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  missedGoalBadge: {
    backgroundColor: '#FFEBEB',
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: -2,
  },
  missedGoalText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  goalBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyGoalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E5E9F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dailyGoalText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 6,
  },
  verificationPromptText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  withinGoalTimeBadge: {
    backgroundColor: '#E8F8EF',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  withinGoalTimeBadgeText: {
    color: '#34C759',
    fontWeight: '700',
  },
  goalInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    flex: 0,
  },
  goalInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginLeft: 6,
  },
  streakMiniContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#FFF8E1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  streakMiniText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 6,
  },
  streakReminderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFF8E1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
    justifyContent: 'center',
  },
  streakReminderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 6,
  },
  unverifiedStatusTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  timeCheckContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timeCheckIconContainer: {
    backgroundColor: '#F5F5F7',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timeCheckIconContainerLate: {
    backgroundColor: '#FFEBEB', // Light red background
  },
  timeCheckContent: {
    flex: 1,
  },
  timeCheckTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  timeCheckText: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
    marginBottom: 0,
  },
  missedTimeBadge: {
    backgroundColor: '#FFEBEB',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  missedTimeBadgeText: {
    color: '#FF3B30',
    fontWeight: '700',
  },
});

export default HomeScreen; 