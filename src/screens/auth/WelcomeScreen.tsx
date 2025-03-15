import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../constants/colors';
import { MaterialIcons } from '@expo/vector-icons';
import { Surface } from 'react-native-paper';

// Define the auth stack param list with string literals instead of computed properties
type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Onboarding: undefined;
};

type WelcomeScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Welcome'>;

const WelcomeScreen = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  const handleGetStarted = () => {
    navigation.navigate('SignUp');
  };

  const handleSignIn = () => {
    navigation.navigate('SignIn');
  };

  // Steps for how it works section
  const steps = [
    {
      icon: 'photo-camera' as const,
      title: 'Take a quick photo',
      description: 'Snap a picture of your made bed to verify your daily habit'
    },
    {
      icon: 'local-fire-department' as const,
      title: 'Build your streak',
      description: 'Maintain your streak by making your bed every day'
    },
    {
      icon: 'insights' as const,
      title: 'Track your progress',
      description: 'View detailed statistics and see your improvement over time'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <View style={styles.contentContainer}>
        {/* Logo and Title */}
        <View style={styles.headerContainer}>
          <Surface style={styles.logoSurface}>
            <Text style={styles.logoText}>BM</Text>
          </Surface>
          <Text style={styles.title}>BedMade</Text>
          <Text style={styles.subtitle}>Start your journey to better mornings</Text>
        </View>
        
        {/* Feature Cards */}
        <View style={styles.featuresContainer}>
          {steps.map((step, index) => (
            <Surface key={index} style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <MaterialIcons name={step.icon} size={24} color="white" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{step.title}</Text>
                <Text style={styles.featureDescription}>{step.description}</Text>
              </View>
            </Surface>
          ))}
        </View>
        
        {/* Value Proposition */}
        <View style={styles.valueContainer}>
          <Text style={styles.valueText}>
            A simple habit that leads to better productivity, positivity, and peace of mind.
          </Text>
        </View>
      </View>
      
      <View style={styles.bottomContainer}>
        {/* Get Started Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <MaterialIcons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Sign In Link - Fixed at bottom */}
        <TouchableOpacity style={styles.signInContainer} onPress={handleSignIn}>
          <Text style={styles.signInText}>Already have an account? <Text style={styles.signInLink}>Sign In</Text></Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: height * 0.05,
    marginBottom: 24,
  },
  logoSurface: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  logoText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  featureIconContainer: {
    backgroundColor: colors.primary,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 56,
  },
  featureContent: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  valueContainer: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  valueText: {
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  signInContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  signInText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  signInLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default WelcomeScreen; 