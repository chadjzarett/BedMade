import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { getOpenAIApiKey, setOpenAIApiKey, isOpenAIApiKeySet } from '../../api/openai';
import { supabase } from '../../api/supabase';

const SettingsScreen = () => {
  const [apiKey, setApiKey] = useState('');
  const [isKeySet, setIsKeySet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [email, setEmail] = useState('');

  // Load the API key and user email on component mount
  useEffect(() => {
    loadApiKey();
    loadUserEmail();
  }, []);

  // Load the API key from secure storage
  const loadApiKey = async () => {
    try {
      const key = await getOpenAIApiKey();
      if (key) {
        // Mask the API key for display
        setApiKey('•'.repeat(key.length));
        setIsKeySet(true);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  // Load the user's email
  const loadUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
      }
    } catch (error) {
      console.error('Error loading user email:', error);
    }
  };

  // Save the API key to secure storage
  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }

    setIsLoading(true);
    try {
      const success = await setOpenAIApiKey(apiKey);
      if (success) {
        Alert.alert('Success', 'API key saved successfully');
        setIsKeySet(true);
        setShowApiKey(false);
      } else {
        Alert.alert('Error', 'Failed to save API key');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      Alert.alert('Error', 'An error occurred while saving the API key');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear the API key
  const clearApiKey = async () => {
    Alert.alert(
      'Clear API Key',
      'Are you sure you want to remove your OpenAI API key?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await setOpenAIApiKey('');
              setApiKey('');
              setIsKeySet(false);
              Alert.alert('Success', 'API key removed successfully');
            } catch (error) {
              console.error('Error clearing API key:', error);
              Alert.alert('Error', 'Failed to remove API key');
            }
          }
        }
      ]
    );
  };

  // Toggle showing the API key
  const toggleShowApiKey = async () => {
    if (!showApiKey && isKeySet) {
      const key = await getOpenAIApiKey();
      setApiKey(key || '');
    } else if (isKeySet) {
      setApiKey('•'.repeat((await getOpenAIApiKey() || '').length));
    }
    setShowApiKey(!showApiKey);
  };

  // Sign out the user
  const signOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
            
            <TouchableOpacity style={styles.button} onPress={signOut}>
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* API Key Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OpenAI API Key</Text>
          <View style={styles.sectionContent}>
            <Text style={styles.description}>
              An OpenAI API key is required to use the bed verification feature. 
              You can get your API key from the OpenAI website.
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Enter your OpenAI API key"
                placeholderTextColor={colors.text.placeholder}
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={toggleShowApiKey}>
                <MaterialIcons
                  name={showApiKey ? 'visibility-off' : 'visibility'}
                  size={24}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={saveApiKey}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Save API Key</Text>
              </TouchableOpacity>
              
              {isKeySet && (
                <TouchableOpacity
                  style={[styles.button, styles.clearButton]}
                  onPress={clearApiKey}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>Clear API Key</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.sectionContent}>
            <Text style={styles.description}>
              BedMade App v1.0.0
            </Text>
            <Text style={styles.description}>
              Build a habit of making your bed every day.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 10,
  },
  sectionContent: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    color: colors.text.primary,
    backgroundColor: colors.input,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  clearButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
});

export default SettingsScreen; 