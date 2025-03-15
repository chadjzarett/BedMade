import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { updateVerificationData } from '../../api/database';
import { Surface } from 'react-native-paper';

// Define the navigation prop types
type VerificationStackParamList = {
  HomeScreen: undefined;
  Verification: undefined;
  VerificationSuccess: {
    isMade: boolean;
    message: string;
    confidence?: number;
  };
};

type VerificationSuccessScreenNavigationProp = StackNavigationProp<
  VerificationStackParamList,
  'VerificationSuccess'
>;

type VerificationSuccessScreenRouteProp = RouteProp<
  VerificationStackParamList,
  'VerificationSuccess'
>;

const VerificationSuccessScreen = () => {
  const navigation = useNavigation<VerificationSuccessScreenNavigationProp>();
  const route = useRoute<VerificationSuccessScreenRouteProp>();
  
  const { isMade, message, confidence } = route.params;
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [streakInfo, setStreakInfo] = React.useState({
    currentStreak: 0,
    bestStreak: 0,
    isEarlyBird: false
  });
  
  // Update database when component mounts
  React.useEffect(() => {
    const updateDatabase = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Updating verification data with isMade:', isMade);
        
        const result = await updateVerificationData(isMade);
        
        if (result.success) {
          console.log('Verification data updated successfully:', result);
          setStreakInfo({
            currentStreak: result.currentStreak,
            bestStreak: result.bestStreak,
            isEarlyBird: result.isEarlyBird
          });
        } else {
          console.error('Error updating verification data:', result.error);
          setError(result.error || 'Failed to update verification data');
        }
      } catch (error) {
        console.error('Error in updateDatabase:', error);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    updateDatabase();
  }, [isMade]);
  
  // Format confidence as a percentage between 0-100%
  const formatConfidence = (value?: number): string => {
    if (value === undefined) return '';
    
    // Ensure the value is between 0 and 1, then convert to percentage
    const normalizedValue = Math.min(Math.max(value, 0), 1);
    return `${Math.round(normalizedValue * 100)}%`;
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('HomeScreen')}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Verification Result</Text>
      </View>
      
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Surface style={styles.loadingCard} elevation={2}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Updating your streak...</Text>
            </Surface>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Surface style={styles.errorCard} elevation={2}>
              <MaterialIcons name="error-outline" size={48} color={colors.error} />
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, styles.retryButton]}
                onPress={() => {
                  setLoading(true);
                  setError(null);
                  updateVerificationData(isMade)
                    .then(result => {
                      if (result.success) {
                        setStreakInfo({
                          currentStreak: result.currentStreak,
                          bestStreak: result.bestStreak,
                          isEarlyBird: result.isEarlyBird
                        });
                      } else {
                        setError(result.error || 'Failed to update verification data');
                      }
                    })
                    .catch(err => {
                      console.error('Error retrying verification:', err);
                      setError('An unexpected error occurred');
                    })
                    .finally(() => setLoading(false));
                }}
              >
                <MaterialIcons name="refresh" size={20} color="white" />
                <Text style={styles.buttonText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, styles.homeButtonSmall]}
                onPress={() => navigation.navigate('HomeScreen')}
              >
                <MaterialIcons name="home" size={20} color={colors.text.primary} />
                <Text style={styles.secondaryButtonText}>Return to Home</Text>
              </TouchableOpacity>
            </Surface>
          </View>
        ) : (
          <View style={[styles.scrollContainer, !isMade && styles.failureScrollContainer]}>
            <View style={styles.resultContainer}>
              <Surface style={styles.enhancedStatusCard} elevation={2}>
                <View style={[
                  styles.verifiedStatusContainer,
                  isMade && styles.successStatusContainer
                ]}>
                  <View style={[
                    styles.statusIconContainer,
                    isMade && styles.successIconContainer
                  ]}>
                    {isMade ? (
                      <MaterialIcons name="check-circle" size={80} color={colors.success} />
                    ) : (
                      <MaterialIcons name="cancel" size={80} color={colors.error} />
                    )}
                  </View>
                  <View style={styles.statusTextContainer}>
                    <Text style={[
                      styles.statusTitle, 
                      isMade ? styles.successText : styles.errorText,
                      isMade && styles.successTitle
                    ]}>
                      {isMade ? 'Bed is Made!' : 'Bed is Not Made'}
                    </Text>
                    <Text style={[styles.statusMessage, isMade ? styles.successMessage : styles.errorMessage]}>
                      {message}
                    </Text>
                    {confidence !== undefined && (
                      <View style={styles.confidenceBadge}>
                        <MaterialIcons name="analytics" size={16} color="#757575" />
                        <Text style={styles.confidenceText}>
                          Confidence: {formatConfidence(confidence)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Surface>
              
              {isMade && (
                <Surface style={styles.enhancedStreakCard} elevation={2}>
                  <View style={styles.streakCardHeader}>
                    <MaterialIcons name="local-fire-department" size={24} color="white" />
                    <Text style={styles.streakCardTitle}>Your Streaks</Text>
                  </View>
                  <View style={styles.streakCardContent}>
                    <View style={styles.streakItem}>
                      <MaterialIcons name="trending-up" size={28} color="#FF6B00" />
                      <Text style={styles.streakValue}>{streakInfo.currentStreak}</Text>
                      <Text style={styles.streakLabel}>Current Streak</Text>
                    </View>
                    <View style={styles.streakDivider} />
                    <View style={styles.streakItem}>
                      <MaterialIcons name="emoji-events" size={28} color="#FFD700" />
                      <Text style={styles.streakValue}>{streakInfo.bestStreak}</Text>
                      <Text style={styles.streakLabel}>Best Streak</Text>
                    </View>
                  </View>
                </Surface>
              )}
              
              {isMade && streakInfo.isEarlyBird && (
                <Surface style={styles.earlyBirdCard} elevation={2}>
                  <View style={styles.earlyBirdContainer}>
                    <MaterialIcons name="wb-sunny" size={16} color="#F57F17" />
                    <Text style={styles.earlyBirdText}>Early Bird! Verified before 8 AM</Text>
                  </View>
                </Surface>
              )}

              {!isMade && (
                <View style={styles.failureButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={() => navigation.navigate('Verification')}
                  >
                    <MaterialIcons name="refresh" size={20} color="white" />
                    <Text style={styles.buttonText}>Try Again</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={() => navigation.navigate('HomeScreen')}
                  >
                    <MaterialIcons name="home" size={20} color={colors.text.primary} />
                    <Text style={styles.secondaryButtonText}>Return to Home</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            {isMade && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, styles.homeButton]}
                onPress={() => navigation.navigate('HomeScreen')}
              >
                <MaterialIcons name="home" size={20} color="white" />
                <Text style={styles.buttonText}>Return to Home</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 100,
  },
  failureScrollContainer: {
    justifyContent: 'flex-start',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'white',
    width: '90%',
    maxWidth: 400,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  resultContainer: {
    padding: 16,
    gap: 16,
  },
  enhancedStatusCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  verifiedStatusContainer: {
    flexDirection: 'column',
    padding: 24,
    alignItems: 'center',
  },
  successStatusContainer: {
    padding: 32,
  },
  statusIconContainer: {
    marginBottom: 20,
    justifyContent: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  statusTextContainer: {
    alignItems: 'center',
    width: '100%',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 28,
  },
  successText: {
    color: colors.success,
  },
  errorText: {
    color: colors.error,
  },
  statusMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  successMessage: {
    fontSize: 16,
    lineHeight: 24,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: 8,
  },
  confidenceText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
    fontWeight: '600',
  },
  enhancedStreakCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  streakCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.primary,
  },
  streakCardTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  streakCardContent: {
    flexDirection: 'row',
    padding: 20,
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 16,
  },
  streakValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginVertical: 8,
  },
  streakLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  earlyBirdCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  earlyBirdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    padding: 16,
  },
  earlyBirdText: {
    color: '#F57F17',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  failureButtonsContainer: {
    marginTop: 24,
    gap: 16,
    paddingBottom: 40,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  homeButton: {
    marginTop: 24,
    marginBottom: 40,
    alignSelf: 'center',
    width: '80%',
    maxWidth: 300,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'white',
    width: '90%',
    maxWidth: 400,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    marginBottom: 16,
    width: '100%',
  },
  homeButtonSmall: {
    width: '100%',
  },
});

export default VerificationSuccessScreen; 