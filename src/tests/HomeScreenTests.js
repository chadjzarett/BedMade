import { renderHook, act } from '@testing-library/react-hooks';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import React from 'react';
import HomeScreen from '../screens/home/HomeScreen';
import { supabase } from '../api/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock('../api/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('expo-linear-gradient', () => 'LinearGradient');

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

// Helper to setup common test mocks
const setupMocks = (scenario) => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Mock auth response
  supabase.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null,
  });
  
  // Mock AsyncStorage
  AsyncStorage.getItem.mockImplementation((key) => {
    if (key === 'userDailyGoal') {
      return Promise.resolve('mid'); // Default to mid-morning goal (8am-10am)
    }
    return Promise.resolve(null);
  });
  
  // Setup common mock for database calls
  const mockFrom = jest.fn();
  const mockSelect = jest.fn();
  const mockEq = jest.fn();
  const mockOrder = jest.fn();
  const mockSingle = jest.fn();
  const mockFilter = jest.fn();
  
  mockFrom.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder });
  mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder });
  mockOrder.mockReturnValue({ eq: mockEq });
  mockSingle.mockReturnValue(Promise.resolve({ data: null, error: null }));
  
  supabase.from.mockImplementation((table) => {
    if (table === 'user_profiles') {
      mockSingle.mockResolvedValue({
        data: { id: mockUser.id, daily_goal: 'mid' },
        error: null,
      });
    } else if (table === 'daily_records') {
      // Configure based on scenario
      switch(scenario) {
        case 'not_made_yet':
          // No record for today
          mockSingle.mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          });
          break;
        case 'made_goal_met':
          // Bed made within goal time
          mockSingle.mockResolvedValue({
            data: {
              id: 'record-id',
              user_id: mockUser.id,
              date: new Date().toISOString().split('T')[0],
              made: true,
              made_time: new Date(new Date().setHours(9, 0, 0)).toISOString() // 9:00 AM (within mid goal)
            },
            error: null,
          });
          break;
        case 'made_goal_missed':
          // Bed made outside goal time
          mockSingle.mockResolvedValue({
            data: {
              id: 'record-id',
              user_id: mockUser.id,
              date: new Date().toISOString().split('T')[0],
              made: true,
              made_time: new Date(new Date().setHours(11, 0, 0)).toISOString() // 11:00 AM (outside mid goal)
            },
            error: null,
          });
          break;
        case 'day_missed':
          // Previous day's record exists but no record for today
          mockSingle.mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          });
          // Mock records to simulate a missed day
          mockOrder.mockImplementation(() => ({
            filter: mockFilter,
          }));
          mockFilter.mockResolvedValue({
            data: [
              {
                date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
                made: true
              }
            ],
            error: null
          });
          break;
      }
    }
    
    return mockFrom();
  });
  
  return {
    mockFrom,
    mockSelect,
    mockEq,
    mockOrder,
    mockSingle,
  };
};

describe('HomeScreen', () => {
  test('Scenario 1: User has not made bed yet today', async () => {
    setupMocks('not_made_yet');
    
    const { getByText, queryByText } = render(<HomeScreen />);
    
    await waitFor(() => {
      // Verify the correct UI elements are shown
      expect(getByText('Ready for Today?')).toBeTruthy();
      expect(getByText('Verify Your Bed')).toBeTruthy();
      
      // These elements should NOT be present
      expect(queryByText('Bed Made')).toBeNull();
      expect(queryByText('Goal Achieved')).toBeNull();
      expect(queryByText('Goal Missed')).toBeNull();
    });
  });
  
  test('Scenario 2: User made bed and successfully met their goal', async () => {
    setupMocks('made_goal_met');
    
    const { getByText, queryByText } = render(<HomeScreen />);
    
    await waitFor(() => {
      // Verify the correct UI elements are shown
      expect(getByText('Bed Made')).toBeTruthy();
      expect(getByText('Goal Achieved')).toBeTruthy();
      expect(getByText('Daily Goal Completed!')).toBeTruthy();
      
      // These elements should NOT be present
      expect(queryByText('Goal Missed')).toBeNull();
      expect(queryByText('Morning Goal Tip')).toBeNull();
    });
  });
  
  test('Scenario 3: User made bed but missed their goal', async () => {
    setupMocks('made_goal_missed');
    
    const { getByText, queryByText } = render(<HomeScreen />);
    
    await waitFor(() => {
      // Verify the correct UI elements are shown
      expect(getByText('Bed Made')).toBeTruthy();
      expect(getByText('Goal Missed')).toBeTruthy();
      expect(getByText('Morning Goal Tip')).toBeTruthy();
      
      // These elements should NOT be present
      expect(queryByText('Goal Achieved')).toBeNull();
      expect(queryByText('Daily Goal Completed!')).toBeNull();
    });
  });
  
  test('Scenario 4: User missed a day', async () => {
    setupMocks('day_missed');
    
    const { getByText, queryByText } = render(<HomeScreen />);
    
    await waitFor(() => {
      // Verify the correct UI elements are shown
      expect(getByText('Ready for Today?')).toBeTruthy();
      
      // Current streak should be 0 since a day was missed
      expect(getByText('0')).toBeTruthy();
      
      // These elements should NOT be present
      expect(queryByText('Bed Made')).toBeNull();
    });
  });
}); 