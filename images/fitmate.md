# FitMate - Flutter Fitness App

A comprehensive fitness tracking application built with Flutter that helps users track their fitness journey through various features.

## Features

### Authentication
- **Splash Screen**: Logo-only screen shown when app starts
- **Welcome Screen**: Logo with Sign In/Sign Up buttons
- **Sign In Screen**: User authentication with email and password
- **Sign Up Screen**: User registration with form validation

### Main Navigation
- **Home Screen**: Dashboard with quick stats and recent activity
- **Bottom Navigation Bar**: 4 tabs (Home, Scan, Track, Profile)

### Core Features
- **Scan Food**: QR code/barcode scanning for food items with nutritional information
- **Track Run**: GPS-based running tracker with real-time stats
- **Manual Food Entry**: Manual logging of food items
- **AI Chat**: Chat with AI for fitness advice
- **Shorts**: Video content for fitness inspiration
- **Nearby Gyms**: Find gyms in your area

### Additional Screens
- **Scan Food History**: View all previously scanned food items
- **Profile Screen**: User profile with stats and settings

## Project Structure

```
lib/
├── main.dart                 # App entry point and routing
└── screens/
    ├── splash_screen.dart           # Initial logo screen
    ├── welcome_screen.dart          # Welcome with auth buttons
    ├── signin_screen.dart           # Sign in form
    ├── signup_screen.dart           # Sign up form
    ├── home_screen.dart             # Main dashboard
    ├── features_screen.dart         # Features grid
    ├── scan_food_screen.dart        # Food scanning interface
    ├── scan_food_history_screen.dart # Scan history
    ├── track_run_screen.dart        # Running tracker
    └── profile_screen.dart          # User profile
```

## Getting Started

1. Make sure you have Flutter installed on your system
2. Clone this repository
3. Navigate to the project directory
4. Run `flutter pub get` to install dependencies
5. Run `flutter run` to start the app

## Dependencies

- `flutter`: Flutter SDK
- `cupertino_icons`: iOS-style icons

## App Flow

1. **Splash Screen** (3 seconds) → **Welcome Screen**
2. **Welcome Screen** → **Sign In** or **Sign Up**
3. **Authentication** → **Home Screen** (with bottom navigation)
4. **Bottom Navigation**:
   - **Home**: Dashboard with stats and quick actions
   - **Scan**: Access to food scanning features
   - **Track**: Access to running tracking features
   - **Profile**: User profile and settings

## Features Status

- ✅ **Completed**: All UI screens and navigation
- 🚧 **In Development**: Camera integration, GPS tracking, data persistence
- 📋 **Planned**: AI chat, video content, gym finder

## Design

The app uses a modern Material Design approach with:
- Green color scheme for fitness theme
- Clean, card-based layouts
- Intuitive navigation patterns
- Responsive design for different screen sizes

## Future Enhancements

- Camera integration for food scanning
- GPS tracking for running
- Local database for data persistence
- Cloud synchronization
- Social features
- Advanced analytics
- Wearable device integration