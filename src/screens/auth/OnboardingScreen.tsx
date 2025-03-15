import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../constants/colors';

type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Onboarding: undefined;
};

type OnboardingScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Onboarding'>;

// Onboarding steps data
const onboardingSteps = [
  {
    title: 'Make your bed daily',
    description: 'Start your day with a simple accomplishment that sets a positive tone.',
    // We'll add actual images later
    image: null,
  },
  {
    title: 'Verify with a quick photo',
    description: 'Take a photo of your made bed to verify your daily habit.',
    image: null,
  },
  {
    title: 'Build your streak',
    description: 'Track your progress and build a consistent habit over time.',
    image: null,
  },
];

const { width } = Dimensions.get('window');

const OnboardingScreen = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Navigate to the main app
      // For now, we'll just go back to Welcome
      navigation.navigate('Welcome');
    }
  };

  const handleSkip = () => {
    // Skip to the main app
    // For now, we'll just go back to Welcome
    navigation.navigate('Welcome');
  };

  const renderStep = () => {
    const step = onboardingSteps[currentStep];
    return (
      <View style={styles.stepContainer}>
        <View style={styles.imageContainer}>
          {/* Placeholder for image */}
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>
              {currentStep === 0 ? '🛏️' : currentStep === 1 ? '📸' : '🔥'}
            </Text>
          </View>
        </View>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {renderStep()}

      <View style={styles.footer}>
        <View style={styles.paginationContainer}>
          {onboardingSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentStep && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentStep < onboardingSteps.length - 1 ? 'Next' : 'Get Started'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  skipContainer: {
    alignItems: 'flex-end',
    marginTop: 50,
    marginBottom: 20,
  },
  skipText: {
    color: colors.text.secondary,
    fontSize: 16,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    marginBottom: 40,
  },
  imagePlaceholder: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imagePlaceholderText: {
    fontSize: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  footer: {
    marginBottom: 50,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    marginHorizontal: 5,
  },
  paginationDotActive: {
    backgroundColor: colors.primary,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default OnboardingScreen; 