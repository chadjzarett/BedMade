import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Using the actual Supabase URL and key that were already in the file
const supabaseUrl = 'https://gltfjvpxqlycwotuzffe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsdGZqdnB4cWx5Y3dvdHV6ZmZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzE1NzgsImV4cCI6MjA1NjgwNzU3OH0.NkHR8XMd34u8M9r6dKeQDWbtTDnPnLv3bbrtYUAqmDE';

// Maximum size for SecureStore (2048 bytes)
const MAX_CHUNK_SIZE = 1800; // Using a slightly smaller size to be safe

// Auth storage keys used by Supabase
const AUTH_STORAGE_KEYS = [
  'supabase.auth.token',
  'supabase.auth.refreshToken',
  'supabase.auth.user',
  'supabase.auth.expires_at'
];

// Custom storage implementation using Expo's SecureStore with chunking for large values
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      // Check if we have chunks
      const numChunksStr = await SecureStore.getItemAsync(`${key}_chunks`);
      
      if (numChunksStr) {
        // We have chunks, need to reassemble
        const numChunks = parseInt(numChunksStr, 10);
        let value = '';
        
        for (let i = 0; i < numChunks; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
          if (chunk) {
            value += chunk;
          } else {
            console.warn(`Missing chunk ${i} for key ${key}`);
          }
        }
        
        return value;
      } else {
        // No chunks, just a regular value
        return SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error('Error retrieving from SecureStore:', error);
      return null;
    }
  },
  
  setItem: async (key: string, value: string) => {
    try {
      // Check if we need to chunk the value
      if (value.length > MAX_CHUNK_SIZE) {
        // Delete any existing chunks first
        await ExpoSecureStoreAdapter.removeItem(key);
        
        // Split the value into chunks
        const numChunks = Math.ceil(value.length / MAX_CHUNK_SIZE);
        
        // Store the number of chunks
        await SecureStore.setItemAsync(`${key}_chunks`, numChunks.toString());
        
        // Store each chunk
        for (let i = 0; i < numChunks; i++) {
          const start = i * MAX_CHUNK_SIZE;
          const end = Math.min(start + MAX_CHUNK_SIZE, value.length);
          const chunk = value.substring(start, end);
          
          await SecureStore.setItemAsync(`${key}_${i}`, chunk);
        }
      } else {
        // Value is small enough, store directly
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error('Error storing in SecureStore:', error);
    }
  },
  
  removeItem: async (key: string) => {
    try {
      // Check if we have chunks
      const numChunksStr = await SecureStore.getItemAsync(`${key}_chunks`);
      
      if (numChunksStr) {
        // We have chunks, delete them all
        const numChunks = parseInt(numChunksStr, 10);
        
        for (let i = 0; i < numChunks; i++) {
          await SecureStore.deleteItemAsync(`${key}_${i}`);
        }
        
        // Delete the chunks counter
        await SecureStore.deleteItemAsync(`${key}_chunks`);
      }
      
      // Delete the main key
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing from SecureStore:', error);
    }
  },
};

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export a function to get the current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Export a function to get the current session
export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Utility function to clear all auth data (useful for troubleshooting)
export const clearAuthData = async () => {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear all auth-related storage keys
    for (const key of AUTH_STORAGE_KEYS) {
      await ExpoSecureStoreAdapter.removeItem(key);
    }
    
    console.log('Auth data cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing auth data:', error);
    return false;
  }
}; 