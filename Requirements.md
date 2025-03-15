# BedMade App Development Context

## App Overview
BedMade is a minimalist habit-tracking app focused exclusively on the daily habit of making your bed. The app uses a simple verification system to track users' bed-making streaks, providing a sense of accomplishment that starts each day on a positive note. The core experience revolves around a one-tap or photo verification system, streak tracking, and basic social elements to create motivation through community.

## Technical Stack
- **Frontend**: Expo/React Native for cross-platform mobile development
- **Backend**: Supabase for authentication, database, and storage
- **AI Services**: OpenAI API (gpt-4o) for bed verification

## App Structure

### Authentication State
- **Unauthenticated**: Login/signup screens visible
- **Authenticating**: Loading states during authentication processes
- **Authenticated**: Main app interface accessible
- **Error**: Authentication failure with appropriate messaging

### Theme State
- **Light Mode**: Default theme with morning-inspired light color palette
- **Dark Mode**: Optional darker theme triggered by system settings

## Screens and Navigation

### Onboarding Flow (Pre-Authentication)
**Screens:**
1. **Welcome Screen** - App introduction:
   - App logo and tagline
   - Brief value proposition 
   - "Get Started" button
   - "Already have an account? Sign In" link

2. **Sign Up Screen** - New user registration:
   - Email input field
   - Password input field
   - Confirm password field
   - Username field
   - "Sign Up with Email" button
   - "Sign Up with Google" button
   - Terms and conditions checkbox
   - Privacy policy link
   
3. **Sign In Screen** - Returning user login:
   - Email input field
   - Password input field
   - "Sign In" button
   - "Sign In with Google" button
   - "Forgot Password?" link
   
4. **Onboarding Tutorial** - First-time user education (3 screens):
   - Screen 1: "Make your bed daily" with illustration
   - Screen 2: "Verify with a quick photo" with camera demo
   - Screen 3: "Build your streak" with streak counter example
   - "Next" and "Skip" navigation buttons
   - Progress indicator dots

### Tab 1: Home (Primary Tab)
**Screens:**
1. **Today View** - Primary home screen showing:
   - Welcome Message (if user has not verified a bed yet)
   - Current streak counter (prominently displayed)
   - Best Streak counter (prominently displayed)
   - Today's status (made/not made) Badge
   - "Verify Bed" button
   - Early bird indicator (if verified before 8 AM)
   - Daily inspirational quote

   2. **Verification Screen** - Accessed from Today View:
   - When user clicks "Verify Bed" button, they are prompted to take a photo of their bed or upload a photo from their library
   - Camera interface with bed outline guide when user clicks "Verify Bed" button
   - Processing indicator during AI verification after user takes a photo or uploads a photo
   - Feedback on whether bed is made or not with a confidence score
   - If bed is not made, user is prompted to try again
   - If bed is made, user is congratulated and streak is updated
   - User is then redirected to Today View

3. **Success Screen** - After verification:
   - Large checkmark animation
   - Updated streak count
   - Positive reinforcement message
   - Return to Today View button

### Tab 2: Streak
**Screens:**
1. **Calendar View** - Visual representation of habit completion:
   - Monthly calendar with completion stamps
   - Color-coded days (completed, missed, today)
   - Current streak highlight
   - Monthly completion statistics
   
2. **Stats Screen** - Detailed analytics:
   - Longest streak
   - Current streak
   - Total beds made
   - Completion rate percentage
   - Early bird percentage (before 8 AM)
   - Average completion time

### Tab 3: Profile
**Screens:**
1. **User Profile** - Personal information and settings:
   - Username and optional profile picture
   - Notification settings
   - Account management
   - App preferences
   - Privacy settings
   - Logout option




## OpenAI Integration

### Bed Verification Feature
- **Model**: gpt-4o
- **Purpose**: Verify if a bed is properly made from user-submitted photos
- **Implementation**:
  1. Capture image through app camera interface or upload from gallery
  2. Pass image to OpenAI API with specific prompt instructions
  3. Process JSON response to determine verification result
  4. Give user feedback on whether bed is made or not with a confidence score
  5. Update streak counter based on verification result
  6. Use the same API key for all users    


- **Example Prompt**:
  ```
  You are a bed-making verification assistant. Analyze this image and determine if the bed appears to be properly made with the following criteria:
  1. Sheets and/or comforter are pulled up
  2. Surface is relatively flat and unwrinkled
  3. Pillows are arranged neatly (if visible)
  
  Respond with a JSON object:
  {
    "is_made": true|false,
    "confidence": 0-100,
    "feedback": "brief explanation"
  }
  ```

## User Flows

### First-time User Flow
1. Download and open app
2. View onboarding screens (3 simple steps)
3. Create account or sign in with third-party authentication
4. Set up notification preferences
5. Access Today View with prominent "Verify First Bed" button
6. Complete first verification
7. View success animation and explanation of streak system

### Daily User Flow
1. Receive morning notification
2. Open app directly to Today View
3. Press "Verify Bed" button
4. Complete verification (photo or manual)
5. View success screen and updated streak
6. Exit app until next day

## Design Guidelines

### Color Palette
- Primary: #4361ee (Morning Blue)
- Secondary: #3a0ca3 (Deep Purple)
- Accent: #ffd60a (Sunrise Yellow)
- Background: #f8f9fa (Light Gray)
- Success: #38b000 (Fresh Green)
- Error: #ef476f (Soft Red)


### Typography
- Headers: Inter Bold
- Body: Inter Regular
- Buttons: Inter Medium
- Use React Native Paper or a custom typography system

### UI Components
- Use Expo/React Native components with React Native Paper
- Custom components limited to:
  - Streak counter
  - Calendar view
  - Verification camera interface
  - Success animations

## Project Structure

### Directory Organization
```
bed-made/
├── App.js                      # App entry point
├── app.json                    # Expo configuration
├── assets/                     # Static assets
│   ├── fonts/
│   ├── images/
│   └── animations/             # Lottie animations
├── src/
│   ├── navigation/             # React Navigation setup
│   │   ├── AppNavigator.js     # Main tab navigation
│   │   ├── AuthNavigator.js    # Auth flow navigation
│   │   └── index.js            # Navigation exports
│   ├── screens/                # Screen components
│   │   ├── auth/
│   │   │   ├── WelcomeScreen.js
│   │   │   ├── SignInScreen.js
│   │   │   ├── SignUpScreen.js
│   │   │   └── OnboardingScreen.js
│   │   ├── home/
│   │   │   ├── TodayScreen.js
│   │   │   ├── VerificationScreen.js
│   │   │   └── SuccessScreen.js
│   │   ├── streak/
│   │   │   ├── CalendarScreen.js
│   │   │   └── StatsScreen.js
│   │   └── profile/
│   │       └── ProfileScreen.js
│   ├── components/             # Reusable components
│   │   ├── common/             # Shared UI components
│   │   │   ├── Button.js
│   │   │   ├── Card.js
│   │   │   ├── TextInput.js
│   │   │   └── LoadingOverlay.js
│   │   ├── home/               # Home-specific components
│   │   │   ├── StreakCounter.js
│   │   │   └── VerifyButton.js
│   │   ├── streak/             # Streak-specific components
│   │   │   └── CalendarDay.js
│   │   └── profile/            # Profile-specific components
│   │       └── SettingsRow.js
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useCamera.js
│   │   └── useStreak.js
│   ├── context/                # React context providers
│   │   ├── AuthContext.js
│   │   └── ThemeContext.js
│   ├── api/                    # API clients and services
│   │   ├── supabase.js         # Supabase client setup
│   │   ├── openai.js           # OpenAI API client
│   │   └── storage.js          # File storage utilities
│   ├── services/               # Business logic services
│   │   ├── authService.js
│   │   ├── streakService.js
│   │   ├── verificationService.js
│   │   └── notificationService.js
│   ├── utils/                  # Utility functions
│   │   ├── dateUtils.js
│   │   ├── imageUtils.js
│   │   └── validationUtils.js
│   ├── constants/              # App constants
│   │   ├── colors.js
│   │   ├── theme.js
│   │   └── config.js
│   └── types/                  # TypeScript types/interfaces
│       ├── user.ts
│       ├── streak.ts
│       └── record.ts
├── package.json                # Dependencies
└── babel.config.js             # Babel configuration
```

### Architecture Pattern
- **Functional Components with Hooks**: Modern React development pattern
- **Context API**: For global state management (authentication, theme)
- **Custom Hooks**: For reusable stateful logic
- **Service Layer**: Abstract API and business logic

### Development Approach
1. **Component-Based Architecture**: Build UI from reusable components
2. **Container/Presentational Pattern**: Separate logic from UI components
3. **Custom Hooks**: Extract and reuse stateful logic
4. **Context API**: For global state that many components need access to
5. **Expo APIs**: Leverage Expo ecosystem for device features

### React Native/Expo Best Practices
1. Use functional components with hooks instead of class components
2. Implement proper state management with React hooks
3. Create custom hooks for reusable logic
4. Use React Navigation for screen management
5. Implement proper error boundaries and loading states
6. Use React Native Paper or similar UI library for consistent components
7. Optimize list rendering with FlatList and SectionList
8. Properly handle keyboard behavior and screen resizing

## OpenAI API Implementation Notes
- Use the Axios library for API requests
- API calls should include proper error handling and timeout management
- Implement rate limiting protection
- Cache API responses when appropriate
- Use gpt-4o model (as gpt-4o-vision-preview is deprecated)
- Include fallback verification method if API is unavailable

## Expo/React Native Dependencies
- **expo-camera**: For bed verification photo capture
- **expo-image-picker**: For selecting photos from gallery
- **expo-notifications**: For daily reminders
- **expo-file-system**: For file handling
- **expo-secure-store**: For secure token storage
- **@react-navigation/native**: For navigation between screens
- **@react-navigation/bottom-tabs**: For tab navigation
- **@react-navigation/stack**: For stack navigation
- **@supabase/supabase-js**: Supabase client
- **axios**: For API requests
- **react-native-paper**: UI component library
- **react-native-calendars**: For streak calendar view
- **lottie-react-native**: For engaging animations
- **react-native-svg**: For custom graphics and illustrations
- **date-fns**: For date manipulation and formatting

## Constraints and Boundaries

### Explicitly Supported Features
- Email and social authentication
- Daily bed verification (photo and manual options)
- Streak tracking and calendar visualization
- Basic statistics
- Daily notifications
- User settings

### Explicitly Unsupported Features
- In-app messaging
- Social media feeds
- Location-based features
- In-app purchases
- Complex gamification systems
- Video content
- Web version (mobile apps only)

### Technical Constraints
- Use Expo managed workflow
- Minimum supported OS: iOS 13, Android 7
- Portrait orientation only
- Offline functionality required
- Maximum app size: 50MB
- No third-party analytics services

## Development Phases

### Phase 1: MVP (Current Focus)
- User authentication with Supabase
- Basic UI implementation
- Manual verification system
- Streak tracking fundamentals
- Settings screen with notification preferences

### Phase 2: Enhanced Features
- AI-powered photo verification with OpenAI integration
- Calendar view implementation
- Detailed statistics
- Improved notifications

### Phase 3: Social Elements
- Anonymous global counter
- Achievement sharing capabilities
- Friend connections (maximum 5)

## Testing Requirements
- Unit tests with Jest for business logic
- Component tests with React Native Testing Library
- E2E tests with Detox
- Manual testing on both iOS and Android
- Offline capability verification

## Documentation Requirements
- Inline code comments with JSDoc format
- README with setup instructions
- API documentation for Supabase and OpenAI endpoints
- User guide for testers

---
## Viral Growth Enhancements
To boost the app's viral potential:

- Shareable Achievement Cards: Create beautiful, minimal achievement cards that users would want to share
- Milestone Celebrations: Add special animations at 7, 30, and 100 day streaks
- Community Milestones: Celebrate when the community collectively reaches major milestones
- Friend Challenges: Allow users to create small groups for weekly completion challenges
- Referral Mechanism: Offer additional streak savers for each friend who joins and maintains a 7-day streak


*Note to AI Agent: This document contains the complete specifications for the BedMade app. Do not introduce additional features, UI elements, or technical components beyond what is explicitly defined here. The app should maintain its minimalist approach focusing exclusively on the bed-making verification and streak tracking functionalities using the specified technical stack: Expo/React Native, Supabase, and OpenAI API (gpt-4o).*


For your bed-making habit tracker app, you’ll want a color palette that feels clean, calming, and motivational. Here are a few palettes to test:

### Color Palette
 # Calm & Minimalist (Good for Habit Formation & Focus)
    -  Background: Soft White (#F8F9FA) 
    -  Primary Accent: Light Blue (#A7C7E7) 
    •    Secondary Accent: Muted Gray (#B0B3B8) 
    •    Success Color: Sage Green (#A8C686)
    •    CTA Buttons: Deep Blue (#2D5F73)

2. Energizing & Motivational (Good for Encouraging Daily Action)
    •    Background: Light Beige (#FAF3E0)
    •    Primary Accent: Bright Orange (#FF7F50)
    •    Secondary Accent: Teal (#008080)
    •    Success Color: Warm Yellow (#FFD700)
    •    CTA Buttons: Navy Blue (#1F3A93)

3. Serene & Relaxing (Good for Sleep & Wellness Themes)
    •    Background: Soft Lavender (#E6E6FA)
    •    Primary Accent: Dusty Blue (#8EA6C8)
    •    Secondary Accent: Pale Pink (#FFD1DC)
    •    Success Color: Forest Green (#2E8B57)
    •    CTA Buttons: Deep Purple (#4B0082)

4. Modern & Techy (For a Sleek, Data-Driven Look)
    •    Background: Cool Gray (#F5F5F5)
    •    Primary Accent: Electric Blue (#007BFF)
    •    Secondary Accent: Dark Gray (#3D3D3D)
    •    Success Color: Neon Green (#00FF7F)
    •    CTA Buttons: Charcoal Black (#232323)

Would you like mockups of any of these?