# BedMade Expo App

A mobile application that helps users build a habit of making their bed every day by tracking their streaks and providing motivation.

## Features

- **Home Tab**: View your current streak, best streak, today's bed status, and get daily inspiration
- **Streak Tab**: Track your progress over time
- **Profile Tab**: Manage your account and settings

## Requirements

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/BedMade_ExpoApp.git
cd BedMade_ExpoApp
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm start
# or
yarn start
```

4. Open the app on your device:
   - Use the Expo Go app on your iOS or Android device
   - Scan the QR code from the terminal
   - Or press 'i' for iOS simulator or 'a' for Android emulator

## Project Structure

```
BedMade_ExpoApp/
├── App.tsx              # Main App component
├── src/
│   ├── api/             # API services
│   ├── constants/       # App constants (colors, theme, etc.)
│   ├── context/         # React Context providers
│   ├── navigation/      # Navigation configuration
│   └── screens/         # App screens
│       ├── auth/        # Authentication screens
│       ├── home/        # Home tab screens
│       ├── streak/      # Streak tab screens
│       └── profile/     # Profile tab screens
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript configuration
```

## Technologies Used

- React Native
- Expo
- React Navigation
- React Native Paper
- TypeScript

## Tech Stack

- **Frontend**: Expo/React Native
- **Backend**: Supabase
- **AI Services**: OpenAI API (gpt-4o)

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd BedMade_ExpoApp
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
Create a `.env` file in the root directory with the following variables:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

4. Start the development server
```bash
npm start
```

5. Run on a device or emulator
```bash
npm run android
# or
npm run ios
# or
npm run web
```

## Project Structure

The project follows a structured organization:

- `src/`: Main source code directory
  - `navigation/`: Navigation configuration
  - `screens/`: Screen components
  - `components/`: Reusable UI components
  - `hooks/`: Custom React hooks
  - `context/`: React context providers
  - `api/`: API clients and services
  - `services/`: Business logic services
  - `utils/`: Utility functions
  - `constants/`: App constants
  - `types/`: TypeScript types/interfaces

## Features

- Email and social authentication
- Daily bed verification (photo and manual options)
- Streak tracking and calendar visualization
- Basic statistics
- Daily notifications
- User settings

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

## License

[MIT License](LICENSE) 