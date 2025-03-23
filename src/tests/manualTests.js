/**
 * BedMade App - Manual Testing Utilities
 * 
 * This file contains utility functions to help manually test the goal verification logic.
 * These functions can be called from the console to simulate different scenarios.
 */

import { supabase } from '../api/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Set the current daily goal for testing
 * @param {string} goalType - 'early', 'mid', or 'late'
 */
export const setDailyGoal = async (goalType) => {
  if (!['early', 'mid', 'late'].includes(goalType)) {
    console.error('Invalid goal type. Must be "early", "mid", or "late"');
    return;
  }
  
  try {
    // Save to AsyncStorage
    await AsyncStorage.setItem('userDailyGoal', goalType);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    if (user) {
      // Update in database
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ daily_goal: goalType })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
    }
    
    console.log(`✅ Daily goal set to: ${goalType}`);
    console.log('Please reload the app to see changes');
  } catch (error) {
    console.error('Failed to set daily goal:', error);
  }
};

/**
 * Create a mock bed verification for testing
 * @param {Date} madeTime - The time the bed was made
 * @param {boolean} made - Whether the bed was made or not
 */
export const mockVerification = async (madeTime = new Date(), made = true) => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    if (!user) {
      console.error('No authenticated user found');
      return;
    }
    
    // Format the date for the database (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    // Check if we already have a record for today
    const { data: existingRecord, error: fetchError } = await supabase
      .from('daily_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();
      
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }
    
    let result;
    
    // If we have an existing record, update it
    if (existingRecord) {
      const { data, error } = await supabase
        .from('daily_records')
        .update({
          made,
          made_time: madeTime.toISOString()
        })
        .eq('id', existingRecord.id)
        .select();
        
      if (error) throw error;
      result = data;
      
      console.log(`✅ Updated existing record for ${today}`);
    } 
    // Otherwise, create a new record
    else {
      const { data, error } = await supabase
        .from('daily_records')
        .insert({
          user_id: user.id,
          date: today,
          made,
          made_time: madeTime.toISOString()
        })
        .select();
        
      if (error) throw error;
      result = data;
      
      console.log(`✅ Created new record for ${today}`);
    }
    
    console.log('Verification details:', {
      date: today,
      made,
      made_time: madeTime.toLocaleString(),
      record: result
    });
    
    console.log('Please reload the app to see changes');
  } catch (error) {
    console.error('Failed to mock verification:', error);
  }
};

/**
 * Delete today's record to simulate not having verified the bed yet
 */
export const resetTodayVerification = async () => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    if (!user) {
      console.error('No authenticated user found');
      return;
    }
    
    // Format the date for the database (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    // Delete today's record
    const { error } = await supabase
      .from('daily_records')
      .delete()
      .eq('user_id', user.id)
      .eq('date', today);
      
    if (error) throw error;
    
    console.log(`✅ Deleted verification record for ${today}`);
    console.log('Please reload the app to see changes');
  } catch (error) {
    console.error('Failed to reset verification:', error);
  }
};

/**
 * Test utility to mock all four scenarios for the HomeScreen
 */
export const testAllScenarios = async () => {
  try {
    console.log('🧪 Testing all four scenarios...');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    if (!user) {
      console.error('No authenticated user found');
      return;
    }
    
    // Format the date for the database (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Set the goal to 'mid' (8am-10am)
    await setDailyGoal('mid');
    console.log('\nℹ️  Goal set to "mid" (8am-10am)');
    
    // 2. Reset today's verification - Scenario 1: Not verified yet
    await resetTodayVerification();
    console.log('\n✅ Scenario 1: User has not made bed yet today');
    console.log('   Verification record deleted. Reload app to see "Ready for Today?" prompt.');
    
    // 3. Create a verification within goal time - Scenario 2: Goal met
    const withinGoalTime = new Date();
    withinGoalTime.setHours(9, 0, 0); // 9:00 AM
    await mockVerification(withinGoalTime, true);
    console.log('\n✅ Scenario 2: User made bed and successfully met their goal');
    console.log('   Verification set to 9:00 AM (within goal time). Reload app to see "Goal Achieved" badge.');
    
    // 4. Create a verification outside goal time - Scenario 3: Goal missed
    const outsideGoalTime = new Date();
    outsideGoalTime.setHours(11, 0, 0); // 11:00 AM
    await mockVerification(outsideGoalTime, true);
    console.log('\n✅ Scenario 3: User made bed but missed their goal');
    console.log('   Verification set to 11:00 AM (outside goal time). Reload app to see "Goal Missed" badge.');
    
    // 5. Simulate missing a day - Scenario 4: Day missed
    // Delete today's record and create a record for 2 days ago
    await resetTodayVerification();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoDate = twoDaysAgo.toISOString().split('T')[0];
    
    // Check if we have a record for 2 days ago
    const { data: existingRecord, error: fetchError } = await supabase
      .from('daily_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', twoDaysAgoDate)
      .single();
      
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }
    
    // Create or update record for 2 days ago
    if (existingRecord) {
      await supabase
        .from('daily_records')
        .update({
          made: true,
          made_time: twoDaysAgo.toISOString()
        })
        .eq('id', existingRecord.id);
    } else {
      await supabase
        .from('daily_records')
        .insert({
          user_id: user.id,
          date: twoDaysAgoDate,
          made: true,
          made_time: twoDaysAgo.toISOString()
        });
    }
    
    // Delete yesterday's record to ensure the streak is broken
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    await supabase
      .from('daily_records')
      .delete()
      .eq('user_id', user.id)
      .eq('date', yesterdayDate);
    
    console.log('\n✅ Scenario 4: User did not make the bed and missed the day');
    console.log(`   Created record for ${twoDaysAgoDate} and deleted record for ${yesterdayDate}.`);
    console.log('   Reload app to see streak reset to 0.');
    
    console.log('\n🧪 All scenarios set up. Please reload the app to test each scenario.');
    console.log('Note: You\'ll need to reload the app after each scenario change to see the updated UI.');
  } catch (error) {
    console.error('Error testing scenarios:', error);
  }
};

// Export the test utilities
export const TestUtils = {
  setDailyGoal,
  mockVerification,
  resetTodayVerification,
  testAllScenarios,
  
  // Helper functions for specific scenarios
  scenarios: {
    notVerifiedYet: () => resetTodayVerification(),
    goalMet: () => {
      const withinGoalTime = new Date();
      withinGoalTime.setHours(9, 0, 0); // 9:00 AM for mid goal
      console.log('Setting verification time to 9:00 AM to test goal met scenario');
      return mockVerification(withinGoalTime, true);
    },
    goalMissed: () => {
      const outsideGoalTime = new Date();
      outsideGoalTime.setHours(11, 0, 0); // 11:00 AM (outside mid goal)
      console.log('Setting verification time to 11:00 AM to test goal missed scenario');
      return mockVerification(outsideGoalTime, true);
    },
    earlyCompletion: () => {
      const earlyTime = new Date();
      earlyTime.setHours(7, 0, 0); // 7:00 AM (early for mid goal)
      console.log('Setting verification time to 7:00 AM to test early completion scenario');
      return mockVerification(earlyTime, true);
    }
  }
}; 