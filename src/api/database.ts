import { supabase } from './supabase';
import { getLocalDateString, getTodayLocalDateString, getYesterdayLocalDateString } from '../utils/dateUtils';

/**
 * Gets the current streak values for debugging purposes
 */
export const getStreakValues = async (): Promise<{
  success: boolean;
  currentStreak?: number;
  longestStreak?: number;
  lastMadeDate?: string | null;
  error?: string;
}> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const userId = user.id;

    // Get the user's profile data
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('current_streak, longest_streak, last_made_date')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile data:', profileError);
      return {
        success: false,
        error: 'Failed to fetch profile data'
      };
    }

    return {
      success: true,
      currentStreak: profileData.current_streak,
      longestStreak: profileData.longest_streak,
      lastMadeDate: profileData.last_made_date
    };
  } catch (error) {
    console.error('Error in getStreakValues:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Resets the streak count to 1 for testing purposes
 */
export const resetStreakCount = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const userId = user.id;

    // Update the user's profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        current_streak: 1,
        longest_streak: 1
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error resetting streak count:', updateError);
      return {
        success: false,
        error: 'Failed to reset streak count'
      };
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('Error in resetStreakCount:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Updates the database after a successful bed verification
 * This function:
 * 1. Creates a daily record for the verification
 * 2. Updates the user's profile with streak information
 * 3. Returns the updated streak information
 */
export const updateVerificationData = async (isMade: boolean): Promise<{
  success: boolean;
  currentStreak: number;
  bestStreak: number;
  isEarlyBird: boolean;
  error?: string;
}> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        currentStreak: 0,
        bestStreak: 0,
        isEarlyBird: false,
        error: 'User not authenticated'
      };
    }

    const userId = user.id;
    const now = new Date();
    
    // Use local date instead of UTC
    const today = getTodayLocalDateString();
    const isEarlyBird = now.getHours() < 8; // Before 8 AM is considered early bird

    // Check if the user exists in the users table
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    // If user doesn't exist in the users table, create it
    if (userError && userError.code === 'PGRST116') { // PGRST116 is "not found" error
      // Create a new user record
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: user.email,
          username: user.email?.split('@')[0] || 'User',
          created_at: now.toISOString(),
          last_login: now.toISOString()
        });

      if (createUserError) {
        console.error('Error creating user record:', createUserError);
        return {
          success: false,
          currentStreak: 0,
          bestStreak: 0,
          isEarlyBird: false,
          error: 'Failed to create user record'
        };
      }
    } else if (userError) {
      console.error('Error checking user existence:', userError);
    }

    // Get the current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No active session found');
      return {
        success: false,
        currentStreak: 0,
        bestStreak: 0,
        isEarlyBird: false,
        error: 'No active session'
      };
    }

    // Check if there's already a record for today
    const { data: existingRecord, error: recordQueryError } = await supabase
      .from('daily_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (recordQueryError && recordQueryError.code !== 'PGRST116') {
      console.error('Error checking existing record:', recordQueryError);
    }

    // If there's no record for today or the bed status has changed, create/update the record
    if (!existingRecord || existingRecord.made !== isMade) {
      let recordError;
      
      try {
        if (existingRecord) {
          // Update existing record
          console.log('Updating existing record for today');
          const { error } = await supabase
            .from('daily_records')
            .update({
              made: isMade,
              made_time: now.toISOString(),
              verified_by_photo: true
            })
            .eq('id', existingRecord.id);
          
          recordError = error;
        } else {
          // Insert new record
          console.log('Creating new record for today');
          
          // First, make sure the user exists in the users table
          const { data: userData, error: userCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();
            
          if (userCheckError && userCheckError.code === 'PGRST116') {
            // User doesn't exist, create it
            const { error: createUserError } = await supabase
              .from('users')
              .insert({
                id: userId,
                email: user.email,
                username: user.email?.split('@')[0] || 'User',
                created_at: now.toISOString(),
                last_login: now.toISOString()
              });
              
            if (createUserError) {
              console.error('Error creating user record:', createUserError);
              recordError = createUserError;
            }
          }
          
          if (!recordError) {
            // Now insert the daily record
            const { error } = await supabase
              .from('daily_records')
              .insert({
                user_id: userId,
                date: today,
                made: isMade,
                made_time: now.toISOString(),
                verified_by_photo: true
              });
            
            recordError = error;
          }
        }
      } catch (e) {
        console.error('Exception during record update/insert:', e);
        recordError = { message: 'Exception during record update/insert' };
      }

      if (recordError) {
        console.error('Error updating daily record:', recordError);
        
        // If this is a row-level security policy violation, continue with the function
        if (recordError.code === '42501') {
          console.log('Row-level security policy violation for daily_records table.');
          console.log('Continuing with streak calculation despite record update failure.');
          
          // Set a flag to indicate the record wasn't saved but we're continuing
          const recordSaved = false;
          
          // If this is a new verification for today, we'll count it in our calculations
          // even though we couldn't save it to the database
          if (!existingRecord && isMade) {
            console.log('Counting this verification in streak calculation despite database error');
          }
        } else {
          // For other errors, return with failure
          return {
            success: false,
            currentStreak: 0,
            bestStreak: 0,
            isEarlyBird: false,
            error: 'Failed to update daily record: ' + (recordError.message || JSON.stringify(recordError))
          };
        }
      }
    } else {
      console.log('Record for today already exists with the same status, skipping update');
    }

    // Get the user's profile data
    const { data: profileDataResult, error: profileError } = await supabase
      .from('user_profiles')
      .select('current_streak, longest_streak, last_made_date, total_days')
      .eq('id', userId)
      .single();
    
    // Initialize profileData variable that can be reassigned
    let profileData = profileDataResult;
    let totalDays = profileData?.total_days || 0;

    // If profile doesn't exist or there's an error, calculate values from records
    if (profileError) {
      console.log('Profile error in updateVerificationData:', profileError);
      
      // Get recent verification records to calculate streak values
      const { data: existingRecords } = await supabase
        .from('daily_records')
        .select('date, made')
        .eq('user_id', userId)
        .eq('made', true)
        .order('date', { ascending: false });
        
      if (existingRecords && existingRecords.length > 0) {
        totalDays = existingRecords.length + (isMade && !existingRecord ? 1 : 0);
      } else {
        totalDays = isMade ? 1 : 0;
      }
      
      // Set default values
      profileData = {
        current_streak: 0,
        longest_streak: 0,
        last_made_date: null,
        total_days: totalDays
      };
      
      console.log('Using calculated profile values:', profileData);
    }

    // Calculate the new streak values
    let currentStreak = profileData?.current_streak || 0;
    let bestStreak = profileData?.longest_streak || 0;

    // If the bed is made, update the streak
    if (isMade) {
      // Get recent verification records to calculate streak
      const { data: recentRecords, error: recentError } = await supabase
        .from('daily_records')
        .select('date, made')
        .eq('user_id', userId)
        .eq('made', true)
        .order('date', { ascending: false })
        .limit(30);  // Get last 30 days to be safe

      // Handle error fetching records
      if (recentError) {
        console.error('Error fetching daily records:', recentError);
        console.log('Will use default streak values due to error fetching records');
      }

      // Calculate streak values from daily records
      let streak = 0;
      
      if (recentRecords && recentRecords.length > 0) {
        // Sort dates in descending order
        const sortedDates = recentRecords
          .map(record => record.date)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        // Add today's date to the sorted dates if it's not already there
        // This handles the case where we couldn't save today's record due to RLS
        if (isMade && sortedDates.indexOf(today) === -1) {
          console.log('Adding today to streak calculation even though record save failed');
          sortedDates.unshift(today);
        }

        if (sortedDates.length > 0) {
          // Initialize streak with first day
          streak = 1;
          
          // Count consecutive days
          for (let i = 1; i < sortedDates.length; i++) {
            const currentDate = new Date(sortedDates[i]);
            const previousDate = new Date(sortedDates[i - 1]);
            
            // Check if dates are consecutive
            const diffTime = previousDate.getTime() - currentDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              streak++;
            } else {
              break;
            }
          }
          
          currentStreak = streak;
        } else {
          // First verification
          currentStreak = 1;
        }
        
        // Update best streak if current streak is higher
        if (currentStreak > bestStreak) {
          bestStreak = currentStreak;
        }
      }
    } else {
      // If bed is not made, reset the current streak
      currentStreak = 0;
    }

    console.log('After calculation - Current streak:', currentStreak, 'Best streak:', bestStreak);

    // Update the user's profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        current_streak: currentStreak,
        longest_streak: bestStreak,
        total_days: totalDays,
        last_made_date: isMade ? today : profileData?.last_made_date
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      
      // If this is a row-level security policy violation, try to upsert instead
      if (updateError.code === '42501') {
        console.log('Row-level security policy violation when updating profile.');
        console.log('Returning calculated streak values despite database error');
        
        // Return the calculated values even if we couldn't update the database
        return {
          success: true,
          currentStreak,
          bestStreak,
          isEarlyBird,
          error: 'Using calculated values (database update failed due to RLS policy)'
        };
      }
      
      // For other errors, still return the calculated values but mark as partial success
      return {
        success: true,
        currentStreak,
        bestStreak,
        isEarlyBird,
        error: 'Using calculated values (database update failed)'
      };
    }

    return {
      success: true,
      currentStreak,
      bestStreak,
      isEarlyBird
    };
  } catch (error) {
    console.error('Error in updateVerificationData:', error);
    return {
      success: false,
      currentStreak: 0,
      bestStreak: 0,
      isEarlyBird: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Clears all daily records for the current user for testing purposes
 */
export const clearDailyRecords = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const userId = user.id;

    // Delete all daily records for the user
    const { error } = await supabase
      .from('daily_records')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing daily records:', error);
      return {
        success: false,
        error: 'Failed to clear daily records'
      };
    }

    // Reset the user's profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        current_streak: 0,
        longest_streak: 0,
        total_days: 0,
        last_made_date: null
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error resetting profile:', updateError);
      return {
        success: false,
        error: 'Failed to reset profile'
      };
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('Error in clearDailyRecords:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Gets the user's profile data from the database
 */
export const getUserProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const userId = user.id;
    console.log('Getting profile for user ID:', userId);

    // First, check if the user exists in the auth.users view
    const { data: authUser, error: authError } = await supabase
      .from('auth_users_view')  // This should be a view that exposes auth.users safely
      .select('id')
      .eq('id', userId)
      .single();
    
    if (authError) {
      console.log('User not found in auth_users_view, this might be expected:', authError);
      // Continue anyway, as the view might not exist or be accessible
    } else {
      console.log('User found in auth system:', authUser);
    }

    // Make sure the user exists in the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, username, created_at')
      .eq('id', userId)
      .single();
      
    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create it
      console.log('User not found in users table, creating...');
      const now = new Date();
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: user.email,
          username: user.email?.split('@')[0] || 'User',
          created_at: now.toISOString(),
          last_login: now.toISOString()
        });
        
      if (createUserError) {
        console.error('Error creating user record:', createUserError);
      } else {
        console.log('User created successfully');
      }
    } else if (userError) {
      console.error('Error checking user existence:', userError);
    } else {
      console.log('User found in users table:', userData);
    }

    // Try to get the user's profile data directly
    try {
      // Get the user's profile data
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profileError && profileData) {
        console.log('Profile found:', profileData);
        return {
          success: true,
          profile: profileData
        };
      }

      // If we get here, there was an error or no profile was found
      console.log('Profile error or not found:', profileError);
      
      // Get recent verification records to calculate streak
      const { data: recentRecords, error: recentError } = await supabase
        .from('daily_records')
        .select('date, made')
        .eq('user_id', userId)
        .eq('made', true)
        .order('date', { ascending: false })
        .limit(30);  // Get last 30 days to be safe

      // Handle error fetching records
      if (recentError) {
        console.error('Error fetching daily records:', recentError);
        console.log('Will use default streak values due to error fetching records');
      }

      // Calculate streak values from daily records
      let currentStreak = 0;
      let longestStreak = 0;
      let lastMadeDate = null;
      let totalDays = 0;

      if (recentRecords && recentRecords.length > 0) {
        // Sort dates in descending order
        const sortedDates = recentRecords
          .map(record => record.date)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        totalDays = recentRecords.length;
        lastMadeDate = sortedDates[0];
        
        // Initialize streak count
        let streak = 1;
        const today = getTodayLocalDateString();
        
        // If verified today, start checking from yesterday
        const startDate = sortedDates[0] === today ? 1 : 0;
        
        // Count consecutive days
        for (let i = startDate; i < sortedDates.length - 1; i++) {
          const currentDate = new Date(sortedDates[i]);
          const previousDate = new Date(sortedDates[i + 1]);
          
          // Check if dates are consecutive
          const diffTime = currentDate.getTime() - previousDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            streak++;
          } else {
            break;
          }
        }
        
        currentStreak = streak;
        longestStreak = Math.max(streak, longestStreak);
      }

      console.log('Calculated streak values from records:', { currentStreak, longestStreak, totalDays });

      // Create a default profile with calculated values
      const defaultProfile = {
        id: userId,
        display_name: user.email?.split('@')[0] || 'User',
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_made_date: lastMadeDate,
        daily_goal: 'early',
        total_days: totalDays
      };
      
      // Try to create a new profile record
      console.log('Creating new user profile...');
      try {
        // First try an insert operation (for new profiles)
        const { data: insertData, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            display_name: user.email?.split('@')[0] || 'User',
            current_streak: currentStreak,
            longest_streak: longestStreak,
            last_made_date: lastMadeDate,
            daily_goal: 'early',
            total_days: totalDays
          })
          .select();
          
        if (insertError) {
          console.log('Insert failed, trying upsert instead:', insertError);
          
          // If insert fails, try an upsert operation
          const { data: upsertData, error: upsertError } = await supabase
            .from('user_profiles')
            .upsert({
              id: userId,
              display_name: user.email?.split('@')[0] || 'User',
              current_streak: currentStreak,
              longest_streak: longestStreak,
              last_made_date: lastMadeDate,
              daily_goal: 'early',
              total_days: totalDays
            })
            .select();
            
          if (upsertError) {
            console.error('Upsert also failed:', upsertError);
            console.log('Using calculated values without saving to database');
          } else if (upsertData && upsertData.length > 0) {
            console.log('Profile upserted successfully:', upsertData[0]);
            return {
              success: true,
              profile: upsertData[0],
              message: 'Profile created via upsert'
            };
          }
        } else if (insertData && insertData.length > 0) {
          console.log('Profile inserted successfully:', insertData[0]);
          return {
            success: true,
            profile: insertData[0],
            message: 'Profile created via insert'
          };
        }
      } catch (dbError) {
        console.error('Database error during profile creation:', dbError);
      }
      
      // If we get here, we couldn't create the profile in the database
      // Return the calculated profile anyway
      return {
        success: true,
        profile: defaultProfile,
        message: 'Using calculated profile values (could not save to database)'
      };
    } catch (error) {
      console.error('Error in profile retrieval/calculation:', error);
      
      // Return a minimal default profile as a last resort
      return {
        success: true,
        profile: {
          id: userId,
          display_name: user.email?.split('@')[0] || 'User',
          current_streak: 0,
          longest_streak: 0,
          last_made_date: null,
          daily_goal: 'early',
          total_days: 0
        },
        message: 'Using minimal default profile due to error'
      };
    }
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    
    // Return a minimal default profile even in case of unexpected errors
    return {
      success: true,
      profile: {
        current_streak: 0,
        longest_streak: 0,
        daily_goal: 'early',
        total_days: 0
      },
      message: 'Using minimal default profile due to unexpected error'
    };
  }
}; 