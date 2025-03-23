#!/bin/bash

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== Running BedMade App Test Scenarios =====${NC}"
echo -e "${YELLOW}This script will test all goal verification scenarios.${NC}"
echo ""

# Check if Jest is installed
echo "Checking dependencies..."
if ! command -v jest &> /dev/null; then
    echo -e "${RED}Jest is not installed. Installing...${NC}"
    npm install --save-dev jest @testing-library/react-native @testing-library/react-hooks
fi

# Make sure we have the testing libraries
npm install --save-dev @testing-library/react-native @testing-library/react-hooks jest-expo react-test-renderer

# Create babel config if it doesn't exist
if [ ! -f babel.config.js ]; then
    echo "Creating babel.config.js..."
    echo "module.exports = {
  presets: ['babel-preset-expo'],
};" > babel.config.js
fi

# Create jest config if it doesn't exist
if [ ! -f jest.config.js ]; then
    echo "Creating jest.config.js..."
    echo "module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  setupFiles: ['./jest.setup.js']
};" > jest.config.js
fi

# Create jest setup file if it doesn't exist
if [ ! -f jest.setup.js ]; then
    echo "Creating jest.setup.js..."
    echo "// Setup jest environment
import 'react-native-gesture-handler/jestSetup';

// Mock the AsyncStorage module
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Add other mocks as needed
jest.mock('expo-linear-gradient', () => 'LinearGradient');

// Mock Animated
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock the safe area context
jest.mock('react-native-safe-area-context', () => {
  const inset = {top: 0, right: 0, bottom: 0, left: 0};
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
  };
});

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock MaterialIcons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    MaterialIcons: () => <View />,
  };
});" > jest.setup.js
fi

echo -e "${GREEN}Dependencies and configurations ready.${NC}"
echo ""

echo -e "${YELLOW}Running tests for all four scenarios:${NC}"
echo "1. User hasn't made bed yet today"
echo "2. User made bed and successfully met their goal"
echo "3. User made bed but missed their goal"
echo "4. User did not make the bed and missed the day"
echo ""

# Run the tests
npx jest src/tests/HomeScreenTests.js --verbose

if [ $? -eq 0 ]; then
    echo -e "${GREEN}All tests passed successfully!${NC}"
    echo ""
    echo -e "${GREEN}Test summary:${NC}"
    echo "✓ User hasn't made bed yet today - Verified that 'Ready for Today?' and verification button show correctly"
    echo "✓ User made bed and successfully met their goal - Verified goal achievement badges and messages"
    echo "✓ User made bed but missed their goal - Verified 'Goal Missed' badge and morning tip"
    echo "✓ User did not make the bed and missed the day - Verified streak count is reset"
else
    echo -e "${RED}Some tests failed. Check the output above for details.${NC}"
fi

echo ""
echo -e "${YELLOW}===== Test Run Complete =====${NC}" 