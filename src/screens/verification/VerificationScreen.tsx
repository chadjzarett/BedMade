import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { analyzeBedImage, isOpenAIApiKeySet } from '../../api/openai';
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

type VerificationScreenNavigationProp = StackNavigationProp<
  VerificationStackParamList,
  'Verification'
>;

// Wrapper component to use hooks for navigation
const VerificationScreen = () => {
  const navigation = useNavigation<VerificationScreenNavigationProp>();
  return <VerificationScreenClass navigation={navigation} />;
};

// Class component implementation
interface VerificationScreenProps {
  navigation: VerificationScreenNavigationProp;
}

interface VerificationScreenState {
  isProcessing: boolean;
  isServiceAvailable: boolean;
  hasCameraPermission: boolean | null;
}

class VerificationScreenClass extends React.Component<VerificationScreenProps, VerificationScreenState> {
  constructor(props: VerificationScreenProps) {
    super(props);
    this.state = {
      isProcessing: false,
      isServiceAvailable: true,
      hasCameraPermission: null
    };
  }

  componentDidMount() {
    this.checkServiceAndPermissions();
  }

  // Check if OpenAI service is available and request camera permissions
  checkServiceAndPermissions = async () => {
    try {
      // Check if OpenAI API key is set
      const isAvailable = await isOpenAIApiKeySet();
      this.setState({ isServiceAvailable: isAvailable });
      
      if (!isAvailable) {
        Alert.alert(
          'Service Unavailable',
          'The bed verification service is currently unavailable. Please try again later.',
          [
            {
              text: 'OK',
              onPress: () => this.props.navigation.navigate('HomeScreen')
            }
          ]
        );
      }

      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      this.setState({ hasCameraPermission: status === 'granted' });
    } catch (error) {
      console.error('Error checking service or permissions:', error);
      this.setState({ isServiceAvailable: false });
    }
  };

  // Open app settings to enable camera permissions
  openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  // Take a picture using the camera
  takePicture = async () => {
    try {
      // Check camera permissions first
      if (this.state.hasCameraPermission !== true) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'BedMade needs access to your camera to take photos of your bed for verification.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: this.openSettings }
            ]
          );
          return;
        }
        
        this.setState({ hasCameraPermission: true });
      }
      
      this.setState({ isProcessing: true });
      
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await this.processImage(result.assets[0].uri);
      } else {
        this.setState({ isProcessing: false });
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
      this.setState({ isProcessing: false });
    }
  };

  // Pick an image from the gallery
  pickImage = async () => {
    if (this.state.isProcessing) return;
    
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Permission Required',
          'BedMade needs access to your photo library to select photos of your bed for verification.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: this.openSettings }
          ]
        );
        return;
      }
      
      this.setState({ isProcessing: true });
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await this.processImage(result.assets[0].uri);
      } else {
        this.setState({ isProcessing: false });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      this.setState({ isProcessing: false });
    }
  };

  // Process the image using OpenAI API
  processImage = async (imageUri: string) => {
    try {
      const result = await analyzeBedImage(imageUri);
      
      if (!result.success) {
        Alert.alert('Error', result.message);
        this.setState({ isProcessing: false });
        return;
      }
      
      // Navigate to success screen with the result
      this.props.navigation.navigate('VerificationSuccess', {
        isMade: result.isMade,
        message: result.message,
        confidence: result.confidence
      });
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to analyze the image. Please try again.');
    } finally {
      this.setState({ isProcessing: false });
    }
  };

  // Render camera permission denied view
  renderPermissionDenied = () => (
    <View style={styles.permissionContainer}>
      <Surface style={styles.permissionCard}>
        <MaterialIcons name="no-photography" size={80} color={colors.error} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          BedMade needs access to your camera to take photos of your bed for verification.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={this.openSettings}>
          <MaterialIcons name="settings" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.permissionButtonText}>Open Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.permissionButton, styles.galleryButton]} 
          onPress={this.pickImage}
        >
          <MaterialIcons name="photo-library" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.permissionButtonText}>Use Photo Library Instead</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.permissionButton, styles.cancelButton]} 
          onPress={() => this.props.navigation.navigate('HomeScreen')}
        >
          <MaterialIcons name="home" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.permissionButtonText}>Return to Home</Text>
        </TouchableOpacity>
      </Surface>
    </View>
  );

  render() {
    const { isProcessing, isServiceAvailable, hasCameraPermission } = this.state;
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <View style={styles.greetingTextContainer}>
              <Text style={styles.title}>Verify Your Bed</Text>
              <Text style={styles.date}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => this.props.navigation.navigate('HomeScreen')}
            >
              <MaterialIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {hasCameraPermission === false ? (
          this.renderPermissionDenied()
        ) : (
          <View style={styles.content}>
            <Surface style={styles.modernCard}>
              <View style={styles.imageContainer}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="hotel" size={80} color={colors.primary} />
                </View>
                <Text style={styles.instructionTitle}>Ready to Verify?</Text>
                <Text style={styles.instructionText}>
                  Take a clear photo of your made bed to verify your daily task.
                </Text>
                <View style={styles.tipContainer}>
                  <MaterialIcons name="lightbulb" size={20} color="#F6A609" />
                  <Text style={styles.tipText}>
                    Tip: Make sure your bed is well-lit and the entire bed is visible in the frame.
                  </Text>
                </View>
              </View>

              {isProcessing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Processing your image...</Text>
                </View>
              ) : (
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={[styles.verifyButton, styles.primaryButton]}
                    onPress={this.takePicture}
                    disabled={!isServiceAvailable}
                  >
                    <MaterialIcons name="camera-alt" size={24} color="white" />
                    <Text style={styles.buttonText}>Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.verifyButton, styles.secondaryButton]}
                    onPress={this.pickImage}
                    disabled={!isServiceAvailable}
                  >
                    <MaterialIcons name="photo-library" size={24} color={colors.text.primary} />
                    <Text style={[styles.buttonText, styles.secondaryButtonText]}>Choose from Library</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Surface>
          </View>
        )}
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greetingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 5,
  },
  date: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  modernCard: {
    borderRadius: 20,
    backgroundColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  instructionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE4B8',
    width: '100%',
  },
  tipText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#B77C12',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text.secondary,
  },
  buttonContainer: {
    gap: 15,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text.primary,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  permissionContainer: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
  },
  permissionCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginVertical: 20,
  },
  permissionText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginVertical: 5,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  galleryButton: {
    backgroundColor: colors.accent,
  },
  cancelButton: {
    backgroundColor: colors.error,
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default VerificationScreen; 