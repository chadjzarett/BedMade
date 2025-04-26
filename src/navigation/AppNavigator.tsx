import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

// Import screens
import HomeScreen from '../screens/home/HomeScreen';
import CalendarScreen from '../screens/streak/CalendarScreen';
import StatsScreen from '../screens/streak/StatsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import VerificationScreen from '../screens/verification/VerificationScreen';
import VerificationSuccessScreen from '../screens/verification/VerificationSuccessScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const CalendarStack = createStackNavigator();
const StatsStack = createStackNavigator();
const ProfileStack = createStackNavigator();

// Home stack with verification screens
const HomeStackNavigator = () => {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <HomeStack.Screen name="HomeScreen" component={HomeScreen} />
      <HomeStack.Screen name="Verification" component={VerificationScreen} />
      <HomeStack.Screen name="VerificationSuccess" component={VerificationSuccessScreen} />
    </HomeStack.Navigator>
  );
};

// Calendar stack
const CalendarStackNavigator = () => {
  return (
    <CalendarStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <CalendarStack.Screen name="CalendarScreen" component={CalendarScreen} />
    </CalendarStack.Navigator>
  );
};

// Stats stack
const StatsStackNavigator = () => {
  return (
    <StatsStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <StatsStack.Screen name="StatsScreen" component={StatsScreen} />
    </StatsStack.Navigator>
  );
};

// Profile stack
const ProfileStackNavigator = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <ProfileStack.Screen name="ProfileScreen" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    </ProfileStack.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Today') {
            iconName = 'dashboard';
          } else if (route.name === 'Calendar') {
            iconName = 'event';
          } else if (route.name === 'Stats') {
            iconName = 'insights';
          } else if (route.name === 'Profile') {
            iconName = 'account-circle';
          }

          return (
            <MaterialIcons 
              name={iconName as any} 
              size={24}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 85 : 60,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          paddingBottom: 4,
        },
      })}
    >
      <Tab.Screen 
        name="Today" 
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Today',
        }}
      />
      <Tab.Screen 
        name="Calendar" 
        component={CalendarStackNavigator}
        options={{
          tabBarLabel: 'Calendar',
        }}
      />
      <Tab.Screen 
        name="Stats" 
        component={StatsStackNavigator}
        options={{
          tabBarLabel: 'Stats',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator; 