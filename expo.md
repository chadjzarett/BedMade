# Expo Development Guide

## EAS CLI Setup and Development Build

### 1. Install EAS CLI
First ensure EAS CLI is installed:
```bash
npm install -g eas-cli
```

### 2. Login to Expo Account
Login to your Expo account:
```bash
eas login
```

### 3. Create Development Build
Create a development build for testing:
```bash
eas build --profile development --platform ios
```

These commands will help you create and push a new development build to expo.dev for testing. The development profile is configured for internal testing and includes the development client, which is perfect for verifying changes like app icons before moving to TestFlight or production.

## Running the Development Server

If the app is installed but not loading the app UI, you need to run the Expo development server:

```bash
npx expo start
```

This will start the development server and allow you to load the app UI on your device. 