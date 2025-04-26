import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../constants/colors';
import { supabase, clearAuthData } from '../../api/supabase';
import { MaterialIcons } from '@expo/vector-icons';

type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Onboarding: undefined;
  ForgotPassword: undefined;
};

type SignInScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'SignIn'>;

const SignInScreen = () => {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Navigation will be handled by the auth state change listener
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Check if the error might be related to SecureStore
      if (error.message?.includes('storage') || error.message?.includes('store')) {
        // Show an alert with option to clear auth data
        Alert.alert(
          'Authentication Error',
          'There was an issue with your stored credentials. Would you like to clear the stored data and try again?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Clear Data',
              onPress: async () => {
                await clearAuthData();
                setError('Stored credentials cleared. Please try signing in again.');
              },
            },
          ]
        );
      } else {
        setError(error.message || 'An error occurred during sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  const handleClearStoredData = async () => {
    setLoading(true);
    try {
      await clearAuthData();
      Alert.alert('Success', 'All stored authentication data has been cleared.');
    } catch (error) {
      console.error('Error clearing data:', error);
      Alert.alert('Error', 'Failed to clear stored data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <MaterialIcons name="bed" size={40} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Welcome back to BedMade</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholderTextColor="#666666"
              autoCapitalize="none"
              keyboardType="email-address"
              mode="flat"
              underlineStyle={{ display: 'none' }}
              theme={{ colors: { primary: 'transparent' } }}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholderTextColor="#666666"
              secureTextEntry={secureTextEntry}
              mode="flat"
              underlineStyle={{ display: 'none' }}
              theme={{ colors: { primary: 'transparent' } }}
              right={
                <TextInput.Icon
                  icon={() => (
                    <MaterialIcons 
                      name={secureTextEntry ? "visibility-off" : "visibility"} 
                      size={24} 
                      color="#666666"
                    />
                  )}
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                />
              }
            />
          </View>

          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.signInButton}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>

          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.troubleshootContainer}
            onPress={handleClearStoredData}
          >
            <Text style={styles.troubleshootText}>Having trouble? Clear stored data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: '#4285F4',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#666666',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    backgroundColor: 'transparent',
    height: 56,
    fontSize: 17,
    paddingHorizontal: 16,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#4285F4',
    fontSize: 15,
  },
  signInButton: {
    backgroundColor: '#4285F4',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signUpText: {
    color: '#666666',
    fontSize: 15,
  },
  signUpLink: {
    color: '#4285F4',
    fontSize: 15,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 4,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  troubleshootContainer: {
    alignItems: 'center',
    marginTop: 24,
    padding: 8,
  },
  troubleshootText: {
    color: '#666666',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});

export default SignInScreen; 