// App configuration constants
import { OPENAI_API_KEY } from '@env';

export const APP_NAME = 'BedMade';
export const APP_VERSION = '1.0.0';

// Feature flags
export const FEATURES = {
  PHOTO_VERIFICATION: true,
  MANUAL_VERIFICATION: true,
  NOTIFICATIONS: true,
};

// Timing constants
export const TIMING = {
  EARLY_BIRD_HOUR: 8, // Before 8 AM is considered "early bird"
  DEFAULT_NOTIFICATION_TIME: '07:00', // Default time for daily notifications
  VERIFICATION_COUNTDOWN_SECONDS: 30, // Countdown timer for verification
};

// API endpoints and keys (to be replaced with actual values)
export const API = {
  OPENAI_API_KEY: OPENAI_API_KEY || 'sk-proj-1234567890abcdef',
  OPENAI_MODEL: 'gpt-4o', // OpenAI model to use
};

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PROFILE: 'user_profile',
  SETTINGS: 'user_settings',
  OPENAI_API_KEY: 'openai_api_key', // Add a storage key for the OpenAI API key
};

// Navigation routes
export const ROUTES = {
  // Auth routes
  WELCOME: 'Welcome',
  SIGN_IN: 'SignIn',
  SIGN_UP: 'SignUp',
  ONBOARDING: 'Onboarding',
  
  // Main app routes
  HOME: 'Home',
  VERIFICATION: 'Verification',
  SUCCESS: 'Success',
  STREAK: 'Streak',
  CALENDAR: 'Calendar',
  STATS: 'Stats',
  PROFILE: 'Profile',
}; 