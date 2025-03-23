import * as React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Animated } from 'react-native';
import { Text, Button, Surface, Badge, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { supabase } from '../../api/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getTodayLocalDateString } from '../../utils/dateUtils';
import { getUserProfile } from '../../api/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DevTesting from '../../components/DevTesting';

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
  const [showDevMenu, setShowDevMenu] = React.useState(false);

  // Add animation values with proper staggered timing
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;
  
  // Additional animated values for staggered animations
  const fadeAnimStatus = React.useRef(new Animated.Value(0)).current;
  const slideAnimStatus = React.useRef(new Animated.Value(20)).current;
  
  const fadeAnimStreaks = React.useRef(new Animated.Value(0)).current;
  const slideAnimStreaks = React.useRef(new Animated.Value(20)).current;
  
  const fadeAnimQuote = React.useRef(new Animated.Value(0)).current;
  const slideAnimQuote = React.useRef(new Animated.Value(20)).current;
  
  React.useEffect(() => {
    // Run entrance animation when component mounts with staggered timing
    Animated.stagger(100, [
      // First greeting section
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        })
      ]),
      
      // Status card with 100ms delay
      Animated.parallel([
        Animated.timing(fadeAnimStatus, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnimStatus, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        })
      ]),
      
      // Streaks section with 200ms delay
      Animated.parallel([
        Animated.timing(fadeAnimStreaks, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnimStreaks, {
          toValue: 0, 
          duration: 800,
          useNativeDriver: true,
        })
      ]),
      
      // Quote section with 300ms delay
      Animated.parallel([
        Animated.timing(fadeAnimQuote, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnimQuote, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    ]).start();
  }, []);

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
      
      // STEP 1: ALWAYS LOAD THE DAILY GOAL FIRST
      // This is important to prevent timing issues where isWithinGoal checks are made with null goal
      let finalGoal: string | null = null;
      
      // Only load the daily goal if we haven't already loaded it
      if (!hasLoadedGoalRef.current) {
        console.log('Loading daily goal (not loaded yet)');
        // First, load the daily goal from all sources
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
        
        // Set the final goal value immediately - this is the important change
        console.log('Setting final daily goal to:', finalGoal);
        setDailyGoal(finalGoal);
        
        // Mark that we've loaded the goal
        hasLoadedGoalRef.current = true;
      } else {
        console.log('Skipping daily goal load, already loaded. Current value:', dailyGoal);
        finalGoal = dailyGoal; // Use the existing dailyGoal value
      }
      
      // STEP 2: AFTER GOAL IS LOADED, CHECK VERIFICATION STATUS
      // Get today's verification record
      const { data: todayRecord, error: recordError } = await supabase
        .from('daily_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      // Log the entire today's record for debugging
      console.log('Raw today\'s record:', JSON.stringify(todayRecord, null, 2));
      console.log('Current goal setting:', finalGoal); // Use finalGoal here, not dailyGoal

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
          console.log('Made time parsed from database:', {
            originalTimeString: todayRecord.made_time,
            parsedTime: madeTime.toLocaleString(),
            hours: madeTime.getHours(),
            minutes: madeTime.getMinutes(),
            currentGoal: finalGoal // Use finalGoal here instead of dailyGoal
          });
          
          setVerificationTime(formatVerificationTime(madeTime));
          
          // Check time status with the finalGoal value that we've loaded
          let timeStatus = { isWithinGoal: false, isEarly: false };
          if (finalGoal) {
            timeStatus = checkIsWithinGoalTime(madeTime, finalGoal);
            console.log('Time status check:', {
              madeTime: madeTime.toLocaleString(),
              dailyGoal: finalGoal,
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

      // STEP 3: CALCULATE STREAKS AND OTHER DATA
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

        // Check if the most recent verification is more than 1 day old
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Find the most recent date where bed was made
        let mostRecentMadeDate = null;
        for (let i = sortedDates.length - 1; i >= 0; i--) {
          const [dateStr, isMade] = sortedDates[i];
          if (isMade) {
            mostRecentMadeDate = new Date(dateStr);
            mostRecentMadeDate.setHours(0, 0, 0, 0);
            break;
          }
        }
        
        let breakStreak = false;
        
        if (mostRecentMadeDate) {
          const daysSinceLastEntry = Math.floor((today.getTime() - mostRecentMadeDate.getTime()) / (1000 * 60 * 60 * 24));
          console.log('Days since last entry:', daysSinceLastEntry);
          
          // If the last entry is more than 1 day old, the streak is broken
          if (daysSinceLastEntry > 1) {
            console.log('Streak broken - last entry was more than 1 day ago');
            breakStreak = true;
            currentStreakCount = 0;
            streakCount = 0;
          }
        }
        
        // Calculate best streak regardless of current streak status
        // We need to calculate this even if current streak is broken
        let tempStreakCount = 0;
        
        // Calculate best streak from all historical data
        for (let i = 0; i < sortedDates.length; i++) {
          const [currentDate, isMade] = sortedDates[i];
          
          if (isMade) {
            if (tempStreakCount === 0) {
              tempStreakCount = 1;
            } else {
              // Check if dates are consecutive
              const prevDate = new Date(sortedDates[i - 1][0]);
              const currDate = new Date(currentDate);
              const diffTime = currDate.getTime() - prevDate.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays === 1) {
                tempStreakCount++;
              } else {
                tempStreakCount = 1; // Reset to 1 since current day is made
              }
            }
            
            // Update best streak if temp streak is higher
            if (tempStreakCount > bestStreakCount) {
              bestStreakCount = tempStreakCount;
            }
          } else {
            tempStreakCount = 0;
          }
        }
        
        // Only calculate current streak if it's not already broken
        if (!breakStreak) {
          // Calculate current streak with consecutive date check
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
            } else {
              streakCount = 0;
            }
          }

          // The current streak is the final streak count if it's still active
          currentStreakCount = streakCount;
        }

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
          dailyGoal: finalGoal,
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

  // Handle dev menu toggle for testing
  const handleDevMenuToggle = () => {
    if (__DEV__) {
      setShowDevMenu(true);
    }
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
    console.log('Checking if within goal time:', { 
      verificationDate: verificationDate.toLocaleString(), 
      goalType,
      verificationHour: verificationDate.getHours(),
      verificationMinute: verificationDate.getMinutes()
    });
    
    const hour = verificationDate.getHours();
    const minute = verificationDate.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    console.log('Time in minutes:', timeInMinutes);
    
    let result = { isWithinGoal: false, isEarly: false };
    
    // Enhanced time check with better logging
    switch (goalType) {
      case 'early':
        // 6am-8am
        const earlyStart = 6 * 60;  // 6:00 AM in minutes
        const earlyEnd = 8 * 60;    // 8:00 AM in minutes
        result = {
          isWithinGoal: timeInMinutes >= earlyStart && timeInMinutes < earlyEnd,
          isEarly: timeInMinutes < earlyStart
        };
        console.log(`Early goal check: ${earlyStart}(6am) <= ${timeInMinutes} < ${earlyEnd}(8am), result=${result.isWithinGoal}`);
        break;
      case 'mid':
        // 8am-10am
        const midStart = 8 * 60;   // 8:00 AM in minutes
        const midEnd = 10 * 60;    // 10:00 AM in minutes
        result = {
          isWithinGoal: timeInMinutes >= midStart && timeInMinutes < midEnd,
          isEarly: timeInMinutes < midStart
        };
        console.log(`Mid goal check: ${midStart}(8am) <= ${timeInMinutes} < ${midEnd}(10am), result=${result.isWithinGoal}`);
        break;
      case 'late':
        // 10am-12pm
        const lateStart = 10 * 60;  // 10:00 AM in minutes
        const lateEnd = 12 * 60;    // 12:00 PM in minutes
        result = {
          isWithinGoal: timeInMinutes >= lateStart && timeInMinutes < lateEnd,
          isEarly: timeInMinutes < lateStart
        };
        console.log(`Late goal check: ${lateStart}(10am) <= ${timeInMinutes} < ${lateEnd}(12pm), result=${result.isWithinGoal}`);
        break;
      default:
        console.log('Unknown goal type:', goalType);
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

  // Helper to get a friendly goal time string
  const getGoalTimeString = (goalType: string | null): string => {
    if (!goalType) return '8:00 AM';
    
    switch (goalType) {
      case 'early':
        return '8:00 AM';
      case 'mid':
        return '10:00 AM';
      case 'late':
        return '12:00 PM';
      default:
        return '8:00 AM';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {__DEV__ && <DevTesting visible={showDevMenu} onClose={() => setShowDevMenu(false)} />}
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Section with Animation */}
        <Animated.View 
          style={[
            styles.section, 
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
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
                onLongPress={handleDevMenuToggle}
                delayLongPress={500}
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
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>
                Debug: isNewUser={isNewUser ? 'true' : 'false'}, totalBedsMade={totalBedsMade}, hasVerifiedBed={hasVerifiedBed ? 'true' : 'false'}
              </Text>
              <View style={styles.debugButtonsContainer}>
                <TouchableOpacity onPress={forceRefresh} style={styles.debugButton}>
                  <Text style={styles.debugButtonText}>Force Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={debugGoalValues} style={styles.debugButton}>
                  <Text style={styles.debugButtonText}>Debug Goals</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDevMenuToggle} style={styles.debugButton}>
                  <Text style={styles.debugButtonText}>Test Menu</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Today's Status Card */}
        <Animated.View 
          style={[
            styles.section, 
            { 
              opacity: fadeAnimStatus, 
              transform: [{ translateY: slideAnimStatus }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Today's Status</Text>
          <Surface style={styles.statusCard}>
            {hasVerifiedBed ? (
              <View style={styles.statusContainer}>
                <View style={styles.statusHeader}>
                  <View style={styles.iosIconWrapper}>
                    <LinearGradient
                      colors={['#32D74B', '#28BD3E']}
                      style={styles.iosIconBackground}
                    >
                      <MaterialIcons name="check" size={28} color="white" />
                    </LinearGradient>
                  </View>
                  <View style={styles.statusTitleContainer}>
                    <Text style={styles.statusTitle}>Bed Made</Text>
                    <View style={styles.badgeContainer}>
                      {verificationTime && (
                        <View style={[
                          styles.verifiedAtContainer,
                          isEarlyCompletion && styles.earlyVerifiedContainer,
                          isWithinGoal && !isEarlyCompletion && styles.onTimeVerifiedContainer,
                          !isWithinGoal && !isEarlyCompletion && styles.lateVerifiedContainer
                        ]}>
                          <MaterialIcons 
                            name="schedule" 
                            size={11} 
                            color={isEarlyCompletion ? "#5856D6" : isWithinGoal ? "#34C759" : "#6E6E73"} 
                          />
                          <Text style={[
                            styles.verifiedAtText,
                            isEarlyCompletion && styles.earlyVerifiedText,
                            isWithinGoal && !isEarlyCompletion && styles.onTimeVerifiedText,
                            !isWithinGoal && !isEarlyCompletion && styles.lateVerifiedText
                          ]}>
                            {verificationTime}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {isEarlyCompletion && (
                    <View style={styles.earlyCompletionBadge}>
                      <MaterialIcons name="star" size={14} color="#FFFFFF" />
                      <Text style={styles.earlyCompletionBadgeText}>Superstar!</Text>
                    </View>
                  )}
                  
                  {isWithinGoal && !isEarlyCompletion && (
                    <View style={styles.goalAchievedBadge}>
                      <MaterialIcons name="check-circle" size={14} color="#FFFFFF" />
                      <Text style={styles.goalAchievedBadgeText}>Goal Achieved</Text>
                    </View>
                  )}
                  
                  {dailyGoal && !isWithinGoal && !isEarlyCompletion && (
                    <View style={styles.missedGoalBadge}>
                      <MaterialIcons name="warning" size={14} color="#FF3B30" />
                      <Text style={styles.missedGoalBadgeText}>Goal Missed</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.statusContent}>
                  <Text style={styles.statusMessage}>
                    {isEarlyCompletion 
                      ? "Outstanding! You beat your goal time and started your day with a win!"
                      : isWithinGoal 
                        ? `Great job hitting your ${DAILY_GOAL_INFO[dailyGoal as keyof typeof DAILY_GOAL_INFO]?.timeRange || 'morning'} goal!`
                        : "Better late than never! Your bed is made and that's what matters most."}
                  </Text>
                  
                  {/* Add debug info in dev mode */}
                  {__DEV__ && (
                    <View style={{marginVertical: 8, backgroundColor: '#f0f0f0', padding: 8, borderRadius: 4}}>
                      <Text style={{fontSize: 12, color: '#666'}}>
                        Debug: goalType={dailyGoal}, isWithinGoal={isWithinGoal ? 'true' : 'false'}, 
                        isEarlyCompletion={isEarlyCompletion ? 'true' : 'false'}, 
                        verificationTime={verificationTime}
                      </Text>
                    </View>
                  )}
                  
                  {/* Add congratulatory animation or badge for goal achievement */}
                  {isWithinGoal && !isEarlyCompletion && (
                    <Surface style={styles.achievementCard}>
                      <View style={styles.achievementContent}>
                        <View style={styles.achievementHeader}>
                          <View style={styles.achievementIconContainer}>
                            <MaterialIcons name="emoji-events" size={24} color="#FFD700" />
                          </View>
                          <View style={styles.achievementTextContainer}>
                            <Text style={styles.achievementTitle}>Daily Goal Completed!</Text>
                            <Text style={styles.achievementSubtitle}>
                              Making your bed during your goal time helps build a consistent routine.
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Surface>
                  )}
                  
                  {/* Add special content for early completion */}
                  {isEarlyCompletion && (
                    <Surface style={styles.earlyAchievementCard}>
                      <View style={styles.achievementContent}>
                        <View style={styles.achievementHeader}>
                          <View style={styles.earlyAchievementIconContainer}>
                            <MaterialIcons name="star" size={24} color="#FFFFFF" />
                          </View>
                          <View style={styles.achievementTextContainer}>
                            <Text style={styles.earlyAchievementTitle}>Early Bird Bonus!</Text>
                            <Text style={styles.earlyAchievementSubtitle}>
                              You're off to an amazing start today. Keep up the momentum!
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Surface>
                  )}
                </View>
                
                {/* Morning Goal Tip Section - Only show when bed is made but goal is missed */}
                {dailyGoal && !isWithinGoal && !isEarlyCompletion && (
                  <Surface style={styles.morningTipCard}>
                    <View style={styles.morningTipContent}>
                      <View style={styles.checkboxContainer}>
                        <MaterialIcons name="lightbulb" size={28} color="#FF3B30" />
                      </View>
                      <View style={styles.tipContentContainer}>
                        <View style={styles.morningTipBadge}>
                          <Text style={styles.morningTipBadgeText}>Morning Goal Tip</Text>
                        </View>
                        <Text style={styles.morningTipText}>
                          Try making your bed earlier tomorrow to maintain a consistent routine.
                        </Text>
                      </View>
                    </View>
                  </Surface>
                )}
              </View>
            ) : (
              <View style={styles.statusContainer}>
                <View style={styles.statusHeader}>
                  {!dailyGoal || !isPastGoalTime(dailyGoal) ? (
                    <View style={styles.iosIconWrapper}>
                      <LinearGradient
                        colors={['#007AFF', '#0055D6']}
                        style={styles.iosIconBackground}
                      >
                        <MaterialIcons name="hotel" size={24} color="white" />
                      </LinearGradient>
                    </View>
                  ) : (
                    <View style={styles.iosIconWrapper}>
                      <LinearGradient
                        colors={['#FF9500', '#F08300']}
                        style={styles.iosIconBackground}
                      >
                        <MaterialIcons name="access-time" size={24} color="white" />
                      </LinearGradient>
                    </View>
                  )}
                  
                  <View style={styles.statusTitleContainer}>
                    <Text style={styles.statusTitle}>
                      {!dailyGoal || !isPastGoalTime(dailyGoal) 
                        ? "Ready for Today?" 
                        : "Time Check"}
                    </Text>
                    
                    {dailyGoal && !isPastGoalTime(dailyGoal) && (
                      <View style={styles.goalInfoBadge}>
                        <MaterialIcons 
                          name={DAILY_GOAL_INFO[dailyGoal as keyof typeof DAILY_GOAL_INFO]?.icon || 'access-time'} 
                          size={12} 
                          color={DAILY_GOAL_INFO[dailyGoal as keyof typeof DAILY_GOAL_INFO]?.color || '#007AFF'} 
                        />
                        <Text style={styles.goalInfoText}>
                          {DAILY_GOAL_INFO[dailyGoal as keyof typeof DAILY_GOAL_INFO]?.timeRange}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {dailyGoal && isPastGoalTime(dailyGoal) && (
                    <View style={styles.lateStatusBadge}>
                      <MaterialIcons name="warning" size={12} color="#FF9500" />
                      <Text style={styles.lateStatusBadgeText}>Goal time passed</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.statusContent}>
                  {dailyGoal && !isPastGoalTime(dailyGoal) ? (
                    <Text style={styles.statusMessage}>
                      Make your bed during your {DAILY_GOAL_INFO[dailyGoal as keyof typeof DAILY_GOAL_INFO]?.timeRange || 'morning'} goal time to build a consistent habit!
                    </Text>
                  ) : (
                    <Text style={styles.statusMessage}>
                      It's past your goal time, but you can still complete today's challenge!
                    </Text>
                  )}
                  
                  {currentStreak > 1 && (
                    <View style={styles.streakInfoContainer}>
                      <View style={styles.streakInfoIcon}>
                        <MaterialIcons name="local-fire-department" size={20} color="#FFF" />
                      </View>
                      <View style={styles.streakInfoContent}>
                        <Text style={styles.streakInfoTitle}>
                          {currentStreak} Day Streak Active
                        </Text>
                        <Text style={styles.streakInfoDescription}>
                          Verify your bed today before midnight to maintain your streak!
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.verifyButton}
                    onPress={handleVerifyBed}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={dailyGoal && isPastGoalTime(dailyGoal) 
                        ? ['#FF9500', '#F08300'] 
                        : ['#007AFF', '#0055D6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.buttonBackground}
                    >
                      <MaterialIcons 
                        name={dailyGoal && isPastGoalTime(dailyGoal) ? "hotel" : "camera-alt"} 
                        size={18} 
                        color="white" 
                      />
                      <Text style={styles.buttonText}>
                        {dailyGoal && isPastGoalTime(dailyGoal) 
                          ? "Make Your Bed Now"
                          : "Verify Your Bed"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Surface>
        </Animated.View>

        {/* Streak Section - Only show for non-new users */}
        {!isNewUser && (
          <Animated.View 
            style={[
              styles.section, 
              { 
                opacity: fadeAnimStreaks, 
                transform: [{ translateY: slideAnimStreaks }],
                marginBottom: 16
              }
            ]}
          >
            <View style={styles.sectionHeaderContainer}>
              <View style={styles.statsHeaderLeft}>
                <MaterialIcons name="local-fire-department" size={16} color="#FF9500" style={{ marginRight: 5 }} />
                <Text style={styles.sectionHeader}>YOUR STREAKS</Text>
              </View>
            </View>
            <View style={styles.streakCardsContainer}>
              {/* Current Streak */}
              <Surface style={styles.streakCard}>
                <View style={styles.streakContent}>
                  <View style={styles.streakInfo}>
                    <Text style={styles.streakLabel}>Current Streak</Text>
                    <Text style={styles.streakValue}>{currentStreak}</Text>
                    <Text style={styles.streakUnit}>days</Text>
                  </View>
                  <View style={[styles.streakIconContainer, { backgroundColor: '#007AFF' }]}>
                    <MaterialIcons name="local-fire-department" size={26} color="white" />
                  </View>
                </View>
              </Surface>
              
              {/* Longest Streak */}
              <Surface style={styles.streakCard}>
                <View style={styles.streakContent}>
                  <View style={styles.streakInfo}>
                    <Text style={styles.streakLabel}>Longest Streak</Text>
                    <Text style={styles.streakValue}>{bestStreak}</Text>
                    <Text style={styles.streakUnit}>days</Text>
                  </View>
                  <View style={[styles.streakIconContainer, { backgroundColor: '#FF9500' }]}>
                    <MaterialIcons name="emoji-events" size={26} color="white" />
                  </View>
                </View>
              </Surface>
            </View>
          </Animated.View>
        )}

        {/* Quote Section - Only show for non-new users - COMPACT VERSION */}
        {!isNewUser && (
          <Animated.View 
            style={[
              { 
                opacity: fadeAnimQuote, 
                transform: [{ translateY: slideAnimQuote }],
                marginBottom: 32,
                marginTop: 8
              }
            ]}
          >
            <Surface style={styles.compactQuoteCard}>
              <MaterialIcons name="format-quote" size={24} color={colors.primary} style={styles.quoteIcon} />
              <Text style={styles.quoteText}>{dailyQuote.text}</Text>
              <Text style={styles.quoteAuthor}>— {dailyQuote.author}</Text>
            </Surface>
          </Animated.View>
        )}

        {/* New User Benefits Section - Only show for new users */}
        {isNewUser && (
          <Animated.View 
            style={[
              styles.section, 
              { 
                opacity: fadeAnimStreaks, 
                transform: [{ translateY: slideAnimStreaks }],
                marginBottom: 32
              }
            ]}
          >
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
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
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
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 5,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 16,
    color: '#6B7280',
    letterSpacing: 0.1,
  },
  debugContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  debugText: {
    color: 'gray', 
    fontSize: 12
  },
  debugButtonsContainer: {
    flexDirection: 'row', 
    marginTop: 5,
    gap: 10
  },
  debugButton: {
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
  },
  debugButtonText: {
    color: '#3B82F6', 
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  avatarContainer: {
    marginLeft: 16,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  statusCard: {
    borderRadius: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  statusContainer: {
    padding: 0,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  iosIconWrapper: {
    marginRight: 12,
  },
  iosIconBackground: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusTitleContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'white',
    marginLeft: 3,
    letterSpacing: -0.2,
  },
  missedBadge: {
    backgroundColor: '#FFEFEF',
    borderWidth: 1,
    borderColor: '#FFCCCB',
  },
  missedBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FF3B30',
    marginLeft: 3,
    letterSpacing: -0.2,
  },
  lateBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FF9500',
    letterSpacing: -0.2,
  },
  earlyBadge: {
    backgroundColor: '#5856D6',
  },
  goalBadge: {
    backgroundColor: '#34C759',
  },
  missedGoalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEFEF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCCCB',
    marginLeft: 8,
  },
  missedGoalBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 4,
    letterSpacing: -0.2,
  },
  goalInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignSelf: 'flex-start',
  },
  goalInfoText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#3A3A3C',
    marginLeft: 4,
    letterSpacing: -0.2,
  },
  lateStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7E9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFEAD0',
    marginLeft: 8,
  },
  lateStatusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 4,
    letterSpacing: -0.2,
  },
  statusContent: {
    padding: 16,
    paddingTop: 8,
  },
  statusMessage: {
    fontSize: 14,
    lineHeight: 19,
    color: '#3A3A3C',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
    letterSpacing: -0.2,
  },
  earlyTimeBadge: {
    backgroundColor: '#E5F1FF',
    borderWidth: 1,
    borderColor: '#CCE4FF',
  },
  earlyTimeBadgeText: {
    color: '#007AFF',
  },
  onTimeTimeBadge: {
    backgroundColor: '#E5F9ED',
    borderWidth: 1,
    borderColor: '#CCECD9',
  },
  onTimeTimeBadgeText: {
    color: '#34C759',
  },
  lateTimeBadge: {
    backgroundColor: '#FFEFEF',
    borderWidth: 1,
    borderColor: '#FFCCCB',
  },
  lateTimeBadgeText: {
    color: '#FF3B30',
  },
  streakInfoContainer: {
    backgroundColor: '#FFF9EB',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  streakInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  streakInfoContent: {
    flex: 1,
  },
  streakInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  streakInfoDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  verifyButton: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.1,
  },
  streakCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  streakCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    padding: 16,
  },
  streakContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakInfo: {
    flex: 1,
  },
  streakLabel: {
    fontSize: 13,
    color: '#6E6E73',
    fontWeight: '500',
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.5,
  },
  streakUnit: {
    fontSize: 12,
    color: '#6E6E73',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  streakIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73',
    letterSpacing: 0.5,
  },
  statsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quoteCard: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: 'white',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  compactQuoteCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'white',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  quoteIcon: {
    marginBottom: 8,
    alignSelf: 'flex-start',
    opacity: 0.2,
  },
  quoteText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 22,
    fontWeight: '500',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#6B7280',
    alignSelf: 'flex-end',
    fontWeight: '500',
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
  goalMissedContainer: {
    backgroundColor: '#FFF9EB',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  goalMissedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalMissedContent: {
    flex: 1,
  },
  goalMissedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  goalMissedDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  // Morning Goal Tip styles
  morningTipCard: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#F8F8FA',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  morningTipContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    marginRight: 14,
    marginTop: 8,
  },
  tipContentContainer: {
    flex: 1,
  },
  morningTipBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF3B30',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  morningTipBadgeText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  morningTipText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#4F4F4F',
    lineHeight: 20,
  },
  verifiedAtContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  earlyVerifiedContainer: {
    backgroundColor: '#F0EFFF',
    borderColor: '#E2E1FF',
  },
  onTimeVerifiedContainer: {
    backgroundColor: '#F0FFF5',
    borderColor: '#D4F5D4',
  },
  lateVerifiedContainer: {
    backgroundColor: '#F2F2F7',
    borderColor: '#E5E5EA',
  },
  verifiedAtText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6E6E73',
    marginLeft: 3,
    letterSpacing: -0.2,
  },
  earlyVerifiedText: {
    color: '#5856D6',
  },
  onTimeVerifiedText: {
    color: '#34C759',
  },
  lateVerifiedText: {
    color: '#6E6E73',
  },
  earlyCompletionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5856D6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 8,
  },
  earlyCompletionBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
    letterSpacing: -0.2,
  },
  goalAchievedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 8,
  },
  goalAchievedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
    letterSpacing: -0.2,
  },
  achievementCard: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  achievementContent: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementTextContainer: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  achievementSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 19,
  },
  earlyAchievementCard: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: '#F2EFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#5856D6',
  },
  earlyAchievementIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5856D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  earlyAchievementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  earlyAchievementSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 19,
  },
});

export default HomeScreen; 