import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Linking, Alert } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../constants/colors';
import { supabase } from '../../api/supabase';
import { MaterialIcons } from '@expo/vector-icons';

type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Onboarding: undefined;
};

type SignUpScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'SignUp'>;

const SignUpScreen = () => {
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [confirmSecureTextEntry, setConfirmSecureTextEntry] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSignUp = async () => {
    // Validate inputs
    if (!email || !password || !confirmPassword || !username) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!termsAccepted) {
      setError('Please accept the terms and conditions');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) throw error;

      // Navigate to onboarding or show success message
      navigation.navigate('Onboarding');
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    navigation.navigate('SignIn');
  };

  const handleTermsPress = () => {
    // You would replace this URL with your actual terms and conditions URL
    const termsUrl = 'https://bedmade.app/terms';
    Linking.canOpenURL(termsUrl).then(supported => {
      if (supported) {
        Linking.openURL(termsUrl);
      } else {
        Alert.alert('Error', 'Cannot open the terms and conditions page');
      }
    });
  };

  const handlePrivacyPress = () => {
    // You would replace this URL with your actual privacy policy URL
    const privacyUrl = 'https://bedmade.app/privacy';
    Linking.canOpenURL(privacyUrl).then(supported => {
      if (supported) {
        Linking.openURL(privacyUrl);
      } else {
        Alert.alert('Error', 'Cannot open the privacy policy page');
      }
    });
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join BedMade and start your journey</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              placeholderTextColor="#666666"
              autoCapitalize="none"
              mode="flat"
              underlineStyle={{ display: 'none' }}
              theme={{ colors: { primary: 'transparent' } }}
            />
          </View>

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

          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
              placeholderTextColor="#666666"
              secureTextEntry={confirmSecureTextEntry}
              mode="flat"
              underlineStyle={{ display: 'none' }}
              theme={{ colors: { primary: 'transparent' } }}
              right={
                <TextInput.Icon
                  icon={() => (
                    <MaterialIcons 
                      name={confirmSecureTextEntry ? "visibility-off" : "visibility"} 
                      size={24} 
                      color="#666666"
                    />
                  )}
                  onPress={() => setConfirmSecureTextEntry(!confirmSecureTextEntry)}
                />
              }
            />
          </View>

          <View style={styles.termsContainer}>
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkedBox]}>
                {termsAccepted && (
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink} onPress={handleTermsPress}>Terms and Conditions</Text> and{' '}
                <Text style={styles.termsLink} onPress={handlePrivacyPress}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.signUpButton}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleSignIn}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
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
  termsContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#4285F4',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: '#4285F4',
  },
  termsText: {
    flex: 1,
    fontSize: 15,
    color: '#666666',
  },
  termsLink: {
    color: '#4285F4',
  },
  signUpButton: {
    backgroundColor: '#4285F4',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signInText: {
    color: '#666666',
    fontSize: 15,
  },
  signInLink: {
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
});

export default SignUpScreen; 