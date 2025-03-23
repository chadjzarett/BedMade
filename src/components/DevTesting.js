import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { TestUtils } from '../tests/manualTests';

/**
 * Developer Testing Menu Component
 * 
 * This component provides a UI for running test scenarios without having to use the console.
 * IMPORTANT: Only include this component in DEV builds, not in production.
 */
const DevTesting = ({ visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runTest = async (testFn, description) => {
    setLoading(true);
    setResult(null);
    
    try {
      await testFn();
      setResult({
        success: true,
        message: `${description} successfully. Please reload the app to see the changes.`
      });
    } catch (error) {
      console.error('Test error:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🧪 Developer Testing Menu</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollContainer}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Daily Goal Settings</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={() => runTest(() => TestUtils.setDailyGoal('early'), 'Set goal to Early (6am-8am)')}
                >
                  <Text style={styles.buttonText}>Set Early Goal</Text>
                  <Text style={styles.buttonHint}>6am-8am</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={() => runTest(() => TestUtils.setDailyGoal('mid'), 'Set goal to Mid-morning (8am-10am)')}
                >
                  <Text style={styles.buttonText}>Set Mid Goal</Text>
                  <Text style={styles.buttonHint}>8am-10am</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={() => runTest(() => TestUtils.setDailyGoal('late'), 'Set goal to Late morning (10am-12pm)')}
                >
                  <Text style={styles.buttonText}>Set Late Goal</Text>
                  <Text style={styles.buttonHint}>10am-12pm</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Test Scenarios</Text>
              
              <TouchableOpacity 
                style={styles.scenarioButton} 
                onPress={() => runTest(TestUtils.scenarios.notVerifiedYet, 'Reset verification for today')}
              >
                <Text style={styles.scenarioButtonText}>Scenario 1: Not Verified Yet</Text>
                <Text style={styles.scenarioDescription}>
                  Deletes today's verification record
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.scenarioButton} 
                onPress={() => runTest(TestUtils.scenarios.goalMet, 'Set verification within goal time')}
              >
                <Text style={styles.scenarioButtonText}>Scenario 2: Goal Met</Text>
                <Text style={styles.scenarioDescription}>
                  Creates verification at 9:00 AM (for mid goal)
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.scenarioButton} 
                onPress={() => runTest(TestUtils.scenarios.goalMissed, 'Set verification outside goal time')}
              >
                <Text style={styles.scenarioButtonText}>Scenario 3: Goal Missed</Text>
                <Text style={styles.scenarioDescription}>
                  Creates verification at 11:00 AM (outside mid goal)
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.scenarioButton} 
                onPress={() => runTest(TestUtils.scenarios.earlyCompletion, 'Set early verification time')}
              >
                <Text style={styles.scenarioButtonText}>Scenario 4: Early Completion</Text>
                <Text style={styles.scenarioDescription}>
                  Creates verification at 7:00 AM (early for mid goal)
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.scenarioButton, styles.allScenariosButton]} 
                onPress={() => runTest(TestUtils.testAllScenarios, 'Setting up all test scenarios')}
              >
                <Text style={styles.scenarioButtonText}>Run All Scenario Tests</Text>
                <Text style={styles.scenarioDescription}>
                  Runs through all test scenarios in sequence
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Custom Verification</Text>
              
              <TouchableOpacity 
                style={styles.customButton} 
                onPress={() => {
                  const now = new Date();
                  runTest(() => TestUtils.mockVerification(now), `Created verification for current time (${now.toLocaleTimeString()})`);
                }}
              >
                <Text style={styles.buttonText}>Verify Now</Text>
              </TouchableOpacity>
              
              <View style={styles.buttonRow}>
                {[6, 7, 8, 9, 10, 11, 12].map(hour => (
                  <TouchableOpacity 
                    key={hour}
                    style={styles.timeButton} 
                    onPress={() => {
                      const time = new Date();
                      time.setHours(hour, 0, 0);
                      runTest(
                        () => TestUtils.mockVerification(time), 
                        `Created verification for ${hour}:00 AM`
                      );
                    }}
                  >
                    <Text style={styles.timeButtonText}>{hour}:00</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Running test...</Text>
            </View>
          )}
          
          {result && (
            <View style={[styles.resultContainer, result.success ? styles.successResult : styles.errorResult]}>
              <Text style={styles.resultText}>{result.message}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginTop: 60,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  scrollContainer: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    width: '30%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonHint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    marginTop: 4,
  },
  scenarioButton: {
    backgroundColor: '#5856D6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  scenarioButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  scenarioDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 6,
  },
  allScenariosButton: {
    backgroundColor: '#FF9500',
    marginTop: 8,
  },
  customButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  timeButton: {
    backgroundColor: '#8E8E93',
    borderRadius: 8,
    padding: 10,
    width: '13%',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 12,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(242, 242, 247, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#1C1C1E',
  },
  resultContainer: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  successResult: {
    backgroundColor: '#D4F5D4',
  },
  errorResult: {
    backgroundColor: '#FAD6D6',
  },
  resultText: {
    fontSize: 14,
    color: '#1C1C1E',
    textAlign: 'center',
  },
});

export default DevTesting; 