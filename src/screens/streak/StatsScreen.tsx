import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Surface } from 'react-native-paper';
import { colors } from '../../constants/colors';
import { supabase } from '../../api/supabase';
import { getUserProfile } from '../../api/database';

// Define types for achievements
type Achievement = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon_name: string;
  requirement_type: string;
  requirement_value: number;
  display_order: number;
};

type UserAchievement = {
  id: string;
  achievement_id: string;
  earned_at: string;
};

// Helper function to get achievement colors
const getAchievementColor = (code: string): string => {
  switch (code) {
    case 'FIRST_BED':
      return '#34C759'; // Green
    case 'STREAK_3':
      return '#007AFF'; // Blue
    case 'STREAK_7':
      return '#5856D6'; // Purple
    case 'STREAK_14':
      return '#FF9500'; // Orange
    case 'STREAK_30':
      return '#FF3B30'; // Red
    case 'EARLY_BIRD':
      return '#FFD700'; // Gold
    default:
      return '#34C759';
  }
};

// Define the navigation prop types
type StreakStackParamList = {
  Calendar: undefined;
  Stats: undefined;
};

type StatsScreenNavigationProp = StackNavigationProp<StreakStackParamList, 'Stats'>;

const StatsScreen = () => {
  const navigation = useNavigation<StatsScreenNavigationProp>();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    longestStreak: 0,
    currentStreak: 0,
    totalBedsMade: 0,
    completionRate: 0,
    earlyBirdRate: 0,
    averageTime: '8:00 AM',
  });
  const [achievements, setAchievements] = React.useState<{
    all: Achievement[];
    earned: UserAchievement[];
  }>({
    all: [],
    earned: [],
  });
  const [registrationDate, setRegistrationDate] = React.useState<string | null>(null);

  // Load user's stats when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserStats();
      return () => {}; // Cleanup function
    }, [])
  );

  // Load user stats from Supabase
  const loadUserStats = async () => {
    try {
      setLoading(true);
      
      console.log('Loading user stats...');
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        setLoading(false);
        return;
      }

      // Fetch all achievements and user's earned achievements
      const [{ data: allAchievements }, { data: userAchievements }] = await Promise.all([
        supabase.from('achievements').select('*').order('display_order', { ascending: true }),
        supabase.from('user_achievements').select('*').eq('user_id', user.id)
      ]);

      if (allAchievements && userAchievements) {
        setAchievements({
          all: allAchievements as Achievement[],
          earned: userAchievements as UserAchievement[],
        });
      }

      console.log('Loading stats for user:', user.id);

      // Get the user's verification records
      console.log('Fetching verification records...');
      const { data: recordsData, error: recordsError } = await supabase
        .from('daily_records')
        .select('*')
        .eq('user_id', user.id);

      if (recordsError) {
        console.error('Error fetching records data:', recordsError);
      } else {
        console.log(`Found ${recordsData?.length || 0} verification records`);
        
        // Process the records data
        const totalRecords = recordsData?.length || 0;
        const totalMade = recordsData?.filter(record => record.made)?.length || 0;
        const earlyBirdCount = recordsData?.filter(record => {
          if (!record.made || !record.made_time) return false;
          const madeTime = new Date(record.made_time);
          return madeTime.getHours() < 8;
        })?.length || 0;
        
        // Calculate statistics
        const completionRate = totalRecords > 0 ? (totalMade / totalRecords) * 100 : 0;
        const earlyBirdRate = totalMade > 0 ? (earlyBirdCount / totalMade) * 100 : 0;
        
        // Calculate average time
        let totalMinutes = 0;
        let timeCount = 0;
        
        recordsData?.forEach(record => {
          if (record.made && record.made_time) {
            const madeTime = new Date(record.made_time);
            totalMinutes += madeTime.getHours() * 60 + madeTime.getMinutes();
            timeCount++;
          }
        });
        
        const averageMinutes = timeCount > 0 ? totalMinutes / timeCount : 8 * 60; // Default to 8:00 AM
        const averageHours = Math.floor(averageMinutes / 60);
        const averageMinutesRemainder = Math.round(averageMinutes % 60);
        const period = averageHours >= 12 ? 'PM' : 'AM';
        const hours12 = averageHours % 12 || 12; // Convert 0 to 12 for 12 AM
        const averageTime = `${hours12}:${averageMinutesRemainder.toString().padStart(2, '0')} ${period}`;

        // Calculate streak values from daily records
        let currentStreak = 0;
        let longestStreak = 0;
        
        if (recordsData && recordsData.length > 0) {
          // Get unique dates where bed was made, sorted in descending order
          const uniqueDates = [...new Set(
            recordsData
              .filter(record => record.made)
              .map(record => record.date.split('T')[0]) // Get just the date part
          )].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

          console.log('Unique verification dates:', uniqueDates);
          
          // Calculate current streak
          let streak = 1;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Check if the most recent date is today or yesterday
          const mostRecentDate = new Date(uniqueDates[0]);
          mostRecentDate.setHours(0, 0, 0, 0);
          const daysSinceLastEntry = Math.floor((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // If the last entry is more than 1 day old, the current streak is broken
          if (daysSinceLastEntry > 1) {
            console.log('Streak broken - last entry was more than 1 day ago');
            currentStreak = 0;
          } else {
            // Calculate streak by checking consecutive days
            for (let i = 0; i < uniqueDates.length - 1; i++) {
              const currentDate = new Date(uniqueDates[i]);
              const previousDate = new Date(uniqueDates[i + 1]);
              currentDate.setHours(0, 0, 0, 0);
              previousDate.setHours(0, 0, 0, 0);
              
              const diffTime = currentDate.getTime() - previousDate.getTime();
              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays === 1) {
                streak++;
              } else {
                break;
              }
            }
            currentStreak = streak;
          }
          
          // Calculate longest streak by checking all periods
          let tempStreak = 1;
          let maxStreak = 1;
          
          for (let i = 0; i < uniqueDates.length - 1; i++) {
            const currentDate = new Date(uniqueDates[i]);
            const nextDate = new Date(uniqueDates[i + 1]);
            currentDate.setHours(0, 0, 0, 0);
            nextDate.setHours(0, 0, 0, 0);
            
            const diffTime = currentDate.getTime() - nextDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              tempStreak++;
              maxStreak = Math.max(maxStreak, tempStreak);
            } else {
              tempStreak = 1;
            }
          }
          
          longestStreak = Math.max(maxStreak, currentStreak);
          console.log('Calculated streak values:', { 
            currentStreak, 
            longestStreak, 
            daysSinceLastEntry,
            mostRecentDate: mostRecentDate.toISOString(),
            today: today.toISOString()
          });
        }
        
        const statsData = {
          longestStreak,
          currentStreak,
          totalBedsMade: totalMade,
          completionRate: Math.round(completionRate),
          earlyBirdRate: Math.round(earlyBirdRate),
          averageTime: averageTime,
        };
        
        console.log('Setting stats:', statsData);
        setStats(statsData);
        
        // Check and save any achievements that should be earned
        if (allAchievements && userAchievements) {
          checkAndSaveAchievements(
            user.id, 
            allAchievements as Achievement[], 
            userAchievements as UserAchievement[],
            statsData
          );
        }
      }

      // Get user registration date
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('created_at')
        .eq('id', user.id)
        .single();

      if (userData?.created_at) {
        const date = new Date(userData.created_at);
        setRegistrationDate(date.toLocaleDateString('en-US', { 
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }));
      }

      console.log('Stats loading complete');
      setLoading(false);
    } catch (error) {
      console.error('Error loading user stats:', error);
      setLoading(false);
    }
  };

  // Check and save achievements that should be earned but aren't in the database
  const checkAndSaveAchievements = async (
    userId: string, 
    allAchievements: Achievement[], 
    earnedAchievements: UserAchievement[],
    stats: {
      currentStreak: number;
      longestStreak: number;
      totalBedsMade: number;
      completionRate: number;
      earlyBirdRate: number;
      averageTime: string;
    }
  ) => {
    try {
      const achievementsToSave: { user_id: string; achievement_id: string; earned_at: string }[] = [];
      // Keep track of achievements that should be earned for visual display
      const visuallyEarnedAchievements: UserAchievement[] = [...earnedAchievements];
      
      // Check for first bed achievement
      if (stats.totalBedsMade > 0) {
        const firstBedAchievement = allAchievements.find(a => a.code === 'FIRST_BED');
        if (firstBedAchievement && !earnedAchievements.some(earned => earned.achievement_id === firstBedAchievement.id)) {
          console.log('User should earn FIRST_BED achievement');
          const newAchievement = {
            user_id: userId,
            achievement_id: firstBedAchievement.id,
            earned_at: new Date().toISOString()
          };
          achievementsToSave.push(newAchievement);
          
          // Add to visual achievements
          visuallyEarnedAchievements.push({
            id: `temp_${firstBedAchievement.id}`,
            achievement_id: firstBedAchievement.id,
            earned_at: new Date().toISOString()
          });
        }
      }
      
      // Check for early bird achievement
      if (stats.earlyBirdRate > 0) {
        const earlyBirdAchievement = allAchievements.find(a => a.code === 'EARLY_BIRD');
        if (earlyBirdAchievement && !earnedAchievements.some(earned => earned.achievement_id === earlyBirdAchievement.id)) {
          console.log('User should earn EARLY_BIRD achievement (early bird rate: ' + stats.earlyBirdRate + '%)');
          const newAchievement = {
            user_id: userId,
            achievement_id: earlyBirdAchievement.id,
            earned_at: new Date().toISOString()
          };
          achievementsToSave.push(newAchievement);
          
          // Add to visual achievements
          visuallyEarnedAchievements.push({
            id: `temp_${earlyBirdAchievement.id}`,
            achievement_id: earlyBirdAchievement.id,
            earned_at: new Date().toISOString()
          });
        }
      }
      
      // Check for streak achievements
      allAchievements.forEach(achievement => {
        if (achievement.code.startsWith('STREAK_') && 
            !earnedAchievements.some(earned => earned.achievement_id === achievement.id)) {
          const requiredStreak = parseInt(achievement.code.split('_')[1], 10);
          if (stats.currentStreak >= requiredStreak || stats.longestStreak >= requiredStreak) {
            console.log(`User should earn ${achievement.code} achievement (required: ${requiredStreak}, current: ${stats.currentStreak}, longest: ${stats.longestStreak})`);
            const newAchievement = {
              user_id: userId,
              achievement_id: achievement.id,
              earned_at: new Date().toISOString()
            };
            achievementsToSave.push(newAchievement);
            
            // Add to visual achievements
            visuallyEarnedAchievements.push({
              id: `temp_${achievement.id}`,
              achievement_id: achievement.id,
              earned_at: new Date().toISOString()
            });
          } else {
            console.log(`User does not qualify for ${achievement.code} achievement yet (required: ${requiredStreak}, current: ${stats.currentStreak}, longest: ${stats.longestStreak})`);
          }
        }
      });
      
      // Update the UI with visually earned achievements regardless of database save
      if (visuallyEarnedAchievements.length > earnedAchievements.length) {
        console.log('Updating UI with new achievements:', 
          visuallyEarnedAchievements.filter(a => !earnedAchievements.some(e => e.achievement_id === a.achievement_id))
            .map(a => allAchievements.find(ach => ach.id === a.achievement_id)?.code)
        );
        setAchievements(prev => ({
          ...prev,
          earned: visuallyEarnedAchievements
        }));
      }
      
      // Save achievements to database if any need to be saved
      if (achievementsToSave.length > 0) {
        console.log(`Saving ${achievementsToSave.length} new achievements to database:`, 
          achievementsToSave.map(a => allAchievements.find(ach => ach.id === a.achievement_id)?.code)
        );
        
        // First attempt: Try to insert directly
        const { data, error } = await supabase
          .from('user_achievements')
          .insert(achievementsToSave);
          
        if (error) {
          console.error('Error saving achievements:', error);
          
          // If this is a row-level security policy violation, try an alternative approach
          if (error.code === '42501') {
            console.log('Row-level security policy violation for user_achievements table.');
            console.log('Attempting alternative save method...');
            
            // Try to save each achievement individually using RPC
            for (const achievement of achievementsToSave) {
              try {
                // Check if this achievement already exists (to avoid duplicates)
                const { data: existingAchievement } = await supabase
                  .from('user_achievements')
                  .select('id')
                  .eq('user_id', achievement.user_id)
                  .eq('achievement_id', achievement.achievement_id)
                  .maybeSingle();
                
                if (!existingAchievement) {
                  // Try to insert using RPC function that bypasses RLS
                  const { data: rpcResult, error: rpcError } = await supabase
                    .rpc('insert_user_achievement', {
                      p_user_id: achievement.user_id,
                      p_achievement_id: achievement.achievement_id,
                      p_earned_at: achievement.earned_at
                    });
                  
                  if (rpcError) {
                    console.error(`Failed to save achievement ${allAchievements.find(a => a.id === achievement.achievement_id)?.code} via RPC:`, rpcError);
                    
                    // Fallback to direct insert if RPC fails
                    const { error: directError } = await supabase
                      .from('user_achievements')
                      .insert(achievement);
                      
                    if (directError) {
                      console.error(`Failed to save achievement ${allAchievements.find(a => a.id === achievement.achievement_id)?.code} via direct insert:`, directError);
                    } else {
                      console.log(`Successfully saved achievement ${allAchievements.find(a => a.id === achievement.achievement_id)?.code} via direct insert`);
                    }
                  } else {
                    console.log(`Successfully saved achievement ${allAchievements.find(a => a.id === achievement.achievement_id)?.code} via RPC`);
                  }
                } else {
                  console.log(`Achievement ${allAchievements.find(a => a.id === achievement.achievement_id)?.code} already exists, skipping`);
                }
              } catch (e) {
                console.error(`Exception saving achievement ${allAchievements.find(a => a.id === achievement.achievement_id)?.code}:`, e);
              }
            }
            
            // Even if we couldn't save to the database, we're still showing the achievements visually
            console.log('Using visual achievements despite database errors');
            
            // Try to refresh the achievements list after our attempts
            try {
              const { data: refreshedAchievements } = await supabase
                .from('user_achievements')
                .select('*')
                .eq('user_id', userId);
                
              if (refreshedAchievements && refreshedAchievements.length > earnedAchievements.length) {
                console.log('Successfully refreshed achievements after alternative save methods');
                setAchievements(prev => ({
                  ...prev,
                  earned: refreshedAchievements as UserAchievement[]
                }));
              }
            } catch (refreshError) {
              console.error('Error refreshing achievements:', refreshError);
            }
          }
        } else {
          console.log('Successfully saved achievements');
          // Refresh achievements list
          const { data: updatedAchievements } = await supabase
            .from('user_achievements')
            .select('*')
            .eq('user_id', userId);
            
          if (updatedAchievements) {
            setAchievements(prev => ({
              ...prev,
              earned: updatedAchievements as UserAchievement[]
            }));
          }
        }
      } else {
        console.log('No new achievements to save');
      }
    } catch (error) {
      console.error('Error checking and saving achievements:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Stats Overview</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Journey Started Card - Moved to top */}
            {registrationDate && (
              <Surface style={[styles.modernCard, styles.journeyCard]}>
                <View style={styles.journeyContainer}>
                  <View style={styles.journeyIconContainer}>
                    <MaterialIcons name="flag" size={26} color="#5856D6" />
                  </View>
                  <View style={styles.journeyContent}>
                    <Text style={styles.journeyTitle}>Journey Started</Text>
                    <Text style={styles.journeyDate}>{registrationDate}</Text>
                  </View>
                </View>
              </Surface>
            )}

            {/* Stats Header with Refresh */}
            <View style={[styles.sectionHeaderContainer, { marginTop: 12 }]}>
              <View style={styles.statsHeaderLeft}>
                <MaterialIcons name="insert-chart" size={16} color="#007AFF" style={{ marginRight: 5 }} />
                <Text style={styles.sectionHeader}>DETAILED STATS</Text>
              </View>
              <TouchableOpacity
                style={styles.refreshIconButton}
                onPress={loadUserStats}
              >
                <MaterialIcons name="refresh" size={20} color="#007AFF" />
                <View style={styles.refreshIndicator} />
              </TouchableOpacity>
            </View>

            {/* Stats Grid - Apple-style grid of stats */}
            <Surface style={styles.statsCardContainer}>
              <View style={styles.statsGrid}>
                {/* Total Beds Made */}
                <View style={styles.statItem}>
                  <View style={[styles.statIconBadge, { backgroundColor: '#E9F7FF' }]}>
                    <MaterialIcons name="hotel" size={25} color="#007AFF" />
                  </View>
                  <Text style={styles.statLabel}>Total Beds</Text>
                  <Text style={styles.statValue}>{stats.totalBedsMade}</Text>
                </View>
                
                {/* Completion Rate */}
                <View style={styles.statItem}>
                  <View style={[styles.statIconBadge, { backgroundColor: '#E9FFF0' }]}>
                    <MaterialIcons name="pie-chart" size={25} color="#34C759" />
                  </View>
                  <Text style={styles.statLabel}>Completion</Text>
                  <Text style={styles.statValue}>{stats.completionRate}%</Text>
                </View>
                
                {/* Early Bird Rate */}
                <View style={styles.statItem}>
                  <View style={[styles.statIconBadge, { backgroundColor: '#FFF7E9' }]}>
                    <MaterialIcons name="wb-sunny" size={25} color="#FF9500" />
                  </View>
                  <Text style={styles.statLabel}>Early Bird</Text>
                  <Text style={styles.statValue}>{stats.earlyBirdRate}%</Text>
                </View>
                
                {/* Average Time */}
                <View style={styles.statItem}>
                  <View style={[styles.statIconBadge, { backgroundColor: '#F2E9FF' }]}>
                    <MaterialIcons name="access-time" size={25} color="#5856D6" />
                  </View>
                  <Text style={styles.statLabel}>Avg. Time</Text>
                  <Text style={styles.statValue}>{stats.averageTime}</Text>
                </View>
              </View>
            </Surface>

            {/* Current & Longest Streak Cards - REPLACED WITH RECENT BADGES */}
            <Surface style={styles.modernCard}>
              <View style={styles.recentBadgesContainer}>
                <View style={styles.recentBadgesHeader}>
                  <Text style={styles.recentBadgesTitle}>Recent Badges</Text>
                  <Text style={styles.recentBadgesSubtitle}>Last 7 Days</Text>
                </View>
                {/* Show recent badges earned in the last 7 days */}
                {achievements.earned.filter(earned => {
                  // Check if earned in the last 7 days
                  const earnedDate = new Date(earned.earned_at);
                  const now = new Date();
                  const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
                  return earnedDate >= sevenDaysAgo;
                }).length > 0 ? (
                  <View style={styles.badgesGrid}>
                    {achievements.earned
                      .filter(earned => {
                        // Filter achievements earned in the last 7 days
                        const earnedDate = new Date(earned.earned_at);
                        const now = new Date();
                        const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
                        return earnedDate >= sevenDaysAgo;
                      })
                      .slice(0, 3) // Take at most 3 recent badges
                      .map(earned => {
                        const achievement = achievements.all.find(a => a.id === earned.achievement_id);
                        if (!achievement) return null;
                        
                        return (
                          <View key={earned.id} style={styles.badgeItem}>
                            <View style={[
                              styles.badgeIconCircle,
                              { backgroundColor: getAchievementColor(achievement.code) + '15' }
                            ]}>
                              <MaterialIcons 
                                name={achievement.icon_name as any} 
                                size={28} 
                                color={getAchievementColor(achievement.code)} 
                              />
                            </View>
                            <Text style={styles.badgeLabel}>{achievement.name}</Text>
                          </View>
                        );
                      })
                    }
                  </View>
                ) : (
                  <View style={styles.noBadgesContainer}>
                    <Text style={styles.noBadgesText}>No recent badges</Text>
                  </View>
                )}
              </View>
            </Surface>

            {/* Achievements Section */}
            <View style={styles.sectionHeaderContainer}>
              <View style={styles.achievementHeaderLeft}>
                <MaterialIcons name="emoji-events" size={16} color="#FFD700" style={{ marginRight: 5 }} />
                <Text style={styles.sectionHeader}>ACHIEVEMENTS</Text>
              </View>
              <Text style={styles.achievementCount}>
                {achievements.earned.length + 
                  // Count first bed achievement if it should be earned but isn't in the database
                  (stats.totalBedsMade > 0 && !achievements.earned.some(
                    earned => achievements.all.find(a => a.id === earned.achievement_id)?.code === 'FIRST_BED'
                  ) ? 1 : 0) + 
                  // Count early bird achievement if it should be earned but isn't in the database
                  (stats.earlyBirdRate > 0 && !achievements.earned.some(
                    earned => achievements.all.find(a => a.id === earned.achievement_id)?.code === 'EARLY_BIRD'
                  ) ? 1 : 0) +
                  // Count streak achievements that should be earned but aren't in the database
                  achievements.all.filter(achievement => {
                    // Skip if already earned
                    if (achievements.earned.some(earned => earned.achievement_id === achievement.id)) {
                      return false;
                    }
                    
                    // Check if this is a streak achievement
                    if (achievement.code.startsWith('STREAK_')) {
                      const requiredStreak = parseInt(achievement.code.split('_')[1], 10);
                      return stats.currentStreak >= requiredStreak || stats.longestStreak >= requiredStreak;
                    }
                    
                    return false;
                  }).length
                } of {achievements.all.length} earned
              </Text>
            </View>

            <Surface style={styles.modernCard}>
              <View style={styles.achievementsContainer}>
                {achievements.all.map((achievement) => {
                  const isEarned = achievements.earned.some(
                    earned => earned.achievement_id === achievement.id
                  );
                  
                  // Check if this is a streak-based achievement that should be earned
                  const isStreakAchievement = achievement.code.startsWith('STREAK_');
                  let shouldEarnStreakAchievement = false;
                  
                  if (isStreakAchievement && !isEarned) {
                    // Extract the required streak number from the achievement code
                    const requiredStreak = parseInt(achievement.code.split('_')[1], 10);
                    // Check if current streak meets the requirement
                    shouldEarnStreakAchievement = stats.currentStreak >= requiredStreak || stats.longestStreak >= requiredStreak;
                    
                    if (shouldEarnStreakAchievement) {
                      console.log(`User should earn ${achievement.code} achievement (required: ${requiredStreak}, current: ${stats.currentStreak}, longest: ${stats.longestStreak})`);
                    }
                  }
                  
                  const isFirstBed = achievement.code === 'FIRST_BED';
                  const isEarlyBird = achievement.code === 'EARLY_BIRD';
                  const shouldShowEarned = isEarned || 
                    (isFirstBed && stats.totalBedsMade > 0) || 
                    (isEarlyBird && stats.earlyBirdRate > 0) ||
                    shouldEarnStreakAchievement;
                  
                  return (
                    <View key={achievement.id} style={styles.achievementCard}>
                      <View
                        style={[
                          styles.achievementIconCircle,
                          {
                            backgroundColor: shouldShowEarned ? getAchievementColor(achievement.code) : '#E0E0E0',
                            opacity: shouldShowEarned ? 1 : 0.5,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={achievement.icon_name as any}
                          size={24}
                          color={shouldShowEarned ? 'white' : '#999'}
                        />
                      </View>
                      <View style={styles.achievementContent}>
                        <Text
                          style={[
                            styles.achievementName,
                            { color: shouldShowEarned ? colors.text.primary : colors.text.disabled },
                          ]}
                          numberOfLines={1}
                        >
                          {achievement.name}
                        </Text>
                        <Text
                          style={[
                            styles.achievementDescription,
                            { color: shouldShowEarned ? colors.text.secondary : colors.text.disabled },
                          ]}
                          numberOfLines={2}
                        >
                          {achievement.description}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Surface>
          </>
        )}
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73',
    letterSpacing: 0.5,
  },
  modernCard: {
    borderRadius: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  statsCardContainer: {
    borderRadius: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statItem: {
    width: '50%',
    padding: 12,
    alignItems: 'center',
  },
  statIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#6E6E73',
    fontWeight: '500',
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1D1D1F',
    letterSpacing: -0.2,
  },
  refreshIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  refreshIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
    marginLeft: 4,
  },
  streakCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
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
  achievementsContainer: {
    padding: 8,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  achievementIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  achievementContent: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  achievementHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementCount: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  statsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  journeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  journeyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  journeyContent: {
    flex: 1,
  },
  journeyTitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  journeyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  journeyCard: {
    borderRadius: 16,
    marginBottom: 16,
  },
  recentBadgesContainer: {
    padding: 16,
  },
  recentBadgesHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentBadgesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  recentBadgesSubtitle: {
    fontSize: 12,
    color: '#6E6E73',
    fontWeight: '500',
  },
  badgesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  badgeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  noBadgesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  noBadgesText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6E6E73',
  },
});

export default StatsScreen; 