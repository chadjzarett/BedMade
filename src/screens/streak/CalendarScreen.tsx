import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Surface } from 'react-native-paper';
import { colors } from '../../constants/colors';
import { supabase } from '../../api/supabase';
import { getLocalDateString } from '../../utils/dateUtils';

// Define the navigation prop types
type StreakStackParamList = {
  Calendar: undefined;
  Stats: undefined;
};

type CalendarScreenNavigationProp = StackNavigationProp<StreakStackParamList, 'Calendar'>;

// Add a new constant for the amber color
const AMBER_COLOR = '#F5A623'; // Amber color for bed made but goal missed

const CalendarScreen = () => {
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const [markedDates, setMarkedDates] = React.useState({});
  const [selectedMonth, setSelectedMonth] = React.useState(new Date());
  const [loading, setLoading] = React.useState(true);
  const [completionRate, setCompletionRate] = React.useState(0);
  const [currentStreak, setCurrentStreak] = React.useState(0);
  const [bestStreak, setBestStreak] = React.useState(0);

  // Load user's verification data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadVerificationData();
      return () => {}; // Cleanup function
    }, [selectedMonth])
  );

  // Load verification data from Supabase
  const loadVerificationData = async () => {
    try {
      setLoading(true);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user's registration date
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('created_at')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        return;
      }

      // Get user's daily goal preference
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('daily_goal')
        .eq('id', user.id)
        .single();
        
      let userDailyGoal = 'early'; // Default to early if not found
      if (!profileError && profileData?.daily_goal) {
        userDailyGoal = profileData.daily_goal;
      }
      console.log('User daily goal preference:', userDailyGoal);

      // Parse the registration date and remove time component for consistent comparison
      const registrationDateTime = new Date(userData.created_at);
      // Set the time to the start of the day for the registration date
      registrationDateTime.setHours(0, 0, 0, 0);
      const userRegistrationDate = getLocalDateString(registrationDateTime);
      console.log('Raw registration timestamp:', userData.created_at);
      console.log('Parsed registration date (start of day):', registrationDateTime);
      console.log('Formatted registration date for comparison:', userRegistrationDate);

      // Get the first and last day of the selected month using local time
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const firstDay = getLocalDateString(new Date(year, month, 1));
      const lastDay = getLocalDateString(new Date(year, month + 1, 0));

      console.log('Loading verification data for range:', firstDay, 'to', lastDay);

      // Get the user's verification data for the selected month
      const { data, error } = await supabase
        .from('daily_records')
        .select('date, made, made_time')
        .eq('user_id', user.id)
        .gte('date', firstDay)
        .lte('date', lastDay);

      if (error) {
        console.error('Error fetching verification data:', error);
      } else {
        // Create marked dates object for the calendar
        const marked: { [key: string]: any } = {};
        let completedDays = 0;
        let totalDaysToConsider = 0;
        
        // Get today's date for comparison
        const today = new Date();
        const todayStr = getLocalDateString(today);
        
        // Get the number of days in the month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        console.log('Found records:', data);
        
        // For the current month, only consider days up to today
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        const lastDayToConsider = isCurrentMonth ? today.getDate() : daysInMonth;
        
        // Create a map of all verification records
        const verificationMap = new Map();
        data?.forEach(record => {
          // Determine if goal was achieved based on made_time and user's daily goal
          let goalAchieved = true; // Default to true if we can't determine
          
          if (record.made && record.made_time) {
            const madeTime = new Date(record.made_time);
            const hour = madeTime.getHours();
            const minute = madeTime.getMinutes();
            const timeInMinutes = hour * 60 + minute;
            
            // Determine if the goal was achieved based on the user's daily goal preference
            switch (userDailyGoal) {
              case 'early':
                // 6am-8am goal
                goalAchieved = timeInMinutes >= 6 * 60 && timeInMinutes < 8 * 60;
                break;
              case 'mid':
                // 8am-10am goal
                goalAchieved = timeInMinutes >= 8 * 60 && timeInMinutes < 10 * 60;
                break;
              case 'late':
                // 10am-12pm goal
                goalAchieved = timeInMinutes >= 10 * 60 && timeInMinutes < 12 * 60;
                break;
              default:
                // Default to early goal
                goalAchieved = timeInMinutes >= 6 * 60 && timeInMinutes < 8 * 60;
            }
            
            // Also consider early completion as goal achieved
            if (!goalAchieved) {
              switch (userDailyGoal) {
                case 'early':
                  // Before 6am is early for early goal
                  goalAchieved = timeInMinutes < 6 * 60;
                  break;
                case 'mid':
                  // Before 8am is early for mid goal
                  goalAchieved = timeInMinutes < 8 * 60;
                  break;
                case 'late':
                  // Before 10am is early for late goal
                  goalAchieved = timeInMinutes < 10 * 60;
                  break;
              }
            }
          }
          
          // Store both made status and calculated goal achievement status
          verificationMap.set(record.date, { 
            made: record.made, 
            goalAchieved: goalAchieved,
            madeTime: record.made_time
          });
          console.log(`Record found for ${record.date}: made = ${record.made}, calculated goalAchieved = ${goalAchieved}`);
        });
        
        // Iterate through all days up to today/end of month
        for (let day = 1; day <= lastDayToConsider; day++) {
          const currentDate = new Date(year, month, day);
          currentDate.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison
          const dateStr = getLocalDateString(currentDate);
          
          // Debug log for date comparisons
          if (day === 1 || day === lastDayToConsider || dateStr === userRegistrationDate) {
            console.log(`Comparing date ${dateStr}:`);
            console.log(`- Current date timestamp:`, currentDate.getTime());
            console.log(`- Registration date timestamp:`, registrationDateTime.getTime());
            console.log(`- Is after or equal to registration:`, currentDate.getTime() >= registrationDateTime.getTime());
            console.log(`- Is before or equal to today:`, dateStr <= todayStr);
          }
          
          // Only count days between registration date and today
          if (currentDate.getTime() >= registrationDateTime.getTime() && dateStr <= todayStr) {
            totalDaysToConsider++;
            
            // If we have a verification record, use it
            if (verificationMap.has(dateStr)) {
              const record = verificationMap.get(dateStr);
              const isMade = record.made;
              const isGoalAchieved = record.goalAchieved;
              
              console.log(`Marking ${dateStr}: isMade = ${isMade}, isGoalAchieved = ${isGoalAchieved}`);
              
              if (isMade) {
                // Determine color based on whether goal was achieved
                const selectedColor = isGoalAchieved ? colors.success : AMBER_COLOR;
                
                marked[dateStr] = {
                  selected: true,
                  marked: true,
                  selectedColor: selectedColor,
                };
                
                completedDays++;
              } else {
                // Not made
                marked[dateStr] = {
                  selected: true,
                  marked: true,
                  selectedColor: colors.error,
                };
              }
            } else if (dateStr < todayStr) {
              // For past dates with no record (after registration), mark as not made
              console.log(`No record found for past date ${dateStr}, marking as not made`);
              marked[dateStr] = {
                selected: true,
                marked: true,
                selectedColor: colors.error,
              };
            }
          }
        }
        
        // Calculate completion rate based on actual days that should have been verified
        const rate = totalDaysToConsider > 0 ? (completedDays / totalDaysToConsider) * 100 : 0;
        console.log(`Completion rate: ${completedDays} completed out of ${totalDaysToConsider} days = ${rate}%`);
        setCompletionRate(Math.round(rate));
        
        // Mark today if it's the current month
        if (isCurrentMonth && !marked[todayStr]) {
          marked[todayStr] = {
            selected: true,
            selectedColor: colors.primary,
          };
        }
        
        // Add special marking for registration date
        marked[userRegistrationDate] = {
          ...marked[userRegistrationDate],
          startingDay: true,
          customStyles: {
            container: {
              borderWidth: 2,
              borderColor: '#5856D6',
              borderStyle: 'dashed',
            },
            text: {
              color: '#5856D6',
              fontWeight: 'bold',
            }
          }
        };
        
        console.log('Marked dates:', marked);
        setMarkedDates(marked);

        // Calculate current and best streak
        let currentStreakCount = 0;
        let bestStreakCount = 0;
        let streakCount = 0;
        
        // Convert verificationMap to array and sort by date
        const sortedDates = Array.from(verificationMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]));
        
        // Calculate streaks
        sortedDates.forEach(([dateStr, record]) => {
          if (record.made) {
            streakCount++;
            if (streakCount > bestStreakCount) {
              bestStreakCount = streakCount;
            }
          } else {
            streakCount = 0;
          }
        });
        
        // If the streak is still active at the end, it's our current streak
        if (streakCount > 0) {
          currentStreakCount = streakCount;
        }

        setCurrentStreak(currentStreakCount);
        setBestStreak(bestStreakCount);
      }
    } catch (error) {
      console.error('Error loading verification data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle month change
  const handleMonthChange = (month: DateData) => {
    setSelectedMonth(new Date(month.year, month.month - 1, 1));
  };

  // Navigate to stats screen
  const goToStats = () => {
    navigation.navigate('Stats');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Streak Calendar</Text>
      </View>

      <View style={styles.content}>
        <Surface style={styles.modernCard}>
          <Calendar
            style={styles.calendar}
            theme={{
              calendarBackground: 'white',
              textSectionTitleColor: colors.text.primary,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: colors.primary,
              dayTextColor: colors.text.primary,
              textDisabledColor: colors.text.disabled,
              monthTextColor: colors.text.primary,
              arrowColor: colors.primary,
              'stylesheet.calendar.header': {
                dayTextAtIndex0: {
                  color: colors.text.primary,
                },
                dayTextAtIndex6: {
                  color: colors.text.primary,
                },
              },
              'stylesheet.day.basic': {
                base: {
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              },
            }}
            markingType="custom"
            markedDates={markedDates}
            onMonthChange={handleMonthChange}
            enableSwipeMonths={true}
          />
        </Surface>

        <Surface style={styles.modernCard}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completionRate}%</Text>
              <Text style={styles.statLabel}>Completion Rate</Text>
            </View>
            
            <TouchableOpacity style={styles.modernStatsButton} onPress={goToStats}>
              <Text style={styles.statsButtonText}>View Detailed Stats</Text>
              <MaterialIcons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </Surface>

        <Surface style={[styles.modernCard, styles.legendCard]}>
          <Text style={styles.legendTitle}>CALENDAR LEGEND</Text>
          <View style={styles.legendGrid}>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
                <Text style={styles.legendText}>Bed Made (Goal Met)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Today</Text>
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: AMBER_COLOR }]} />
                <Text style={styles.legendText}>Bed Made (Goal Missed)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, styles.journeyStartedDot]} />
                <Text style={styles.legendText}>Journey Started</Text>
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors.error }]} />
                <Text style={styles.legendText}>Bed Not Made</Text>
              </View>
              <View style={styles.legendItem}>
                {/* Empty item for balance */}
              </View>
            </View>
          </View>
        </Surface>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
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
    paddingBottom: 30,
  },
  modernCard: {
    borderRadius: 20,
    backgroundColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  calendar: {
    borderRadius: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  modernStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsButtonText: {
    color: 'white',
    marginRight: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  legendCard: {
    padding: 16,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  legendGrid: {
    flexDirection: 'column',
  },
  legendRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    minHeight: 24,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  legendText: {
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: '500',
    flexShrink: 1,
  },
  journeyStartedDot: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#5856D6',
    borderStyle: 'dashed',
  },
});

export default CalendarScreen; 