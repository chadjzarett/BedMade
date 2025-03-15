import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Navigation } from './src/navigation';
import { colors } from './src/constants/colors';

// Create a simple theme without importing from theme.ts to avoid type errors
const theme = {
  colors: {
    primary: colors.primary,
    accent: colors.accent,
    background: colors.background,
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style="auto" />
        <Navigation />
      </PaperProvider>
    </SafeAreaProvider>
  );
} 