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

  const steps = [
    {
      icon: 'photo-camera' as const,
      title: 'Quick Photo Verification',
      description: 'Snap a picture of your made bed to build your daily habit'
    },
    {
      icon: 'local-fire-department' as const,
      title: 'Build Your Streak',
      description: 'Stay motivated with daily streaks and achievements'
    },
    {
      icon: 'insights' as const,
      title: 'Track Your Progress',
      description: 'Watch your progress and see your improvement over time'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <View style={styles.contentContainer}>
        {/* Logo and Title */}
        <View style={styles.headerContainer}>
          <Surface style={styles.logoSurface}>
            <MaterialIcons name="bed" size={32} color="white" />
          </Surface>
          <Text style={styles.title}>BedMade</Text>
          <Text style={styles.subtitle}>
            Start your journey to better{'\n'}mornings and greater wellbeing
          </Text>
        </View>
        
        {/* Feature Cards */}
        <View style={styles.featuresContainer}>
          {steps.map((step, index) => (
            <Surface key={index} style={styles.featureCard}>
              <View style={[styles.featureIconContainer, { backgroundColor: index === 0 ? colors.primary : index === 1 ? colors.secondary : colors.accent }]}>
                <MaterialIcons name={step.icon} size={24} color="white" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{step.title}</Text>
                <Text style={styles.featureDescription}>{step.description}</Text>
              </View>
            </Surface>
          ))}
        </View>
      </View>
      
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <MaterialIcons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.signInContainer} onPress={handleSignIn}>
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInLink}>Sign In</Text>
          </Text>
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
    paddingTop: height * 0.04,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoSurface: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  featuresContainer: {
    marginTop: 24,
    flex: 1,
  },
  featureCard: {
    flexDirection: 'row',
    borderRadius: 20,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: 'white',
  },
  featureIconContainer: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 56,
  },
  featureContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  signInContainer: {
    alignItems: 'center',
    paddingVertical: 8,
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