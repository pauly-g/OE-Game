# Leaderboard Feature Documentation

## Overview

The leaderboard feature enhances "Order Editing - The Game" by adding a competitive element that allows players to submit their scores to a global leaderboard. This document outlines the architecture, implementation details, and usage of the leaderboard feature.

## Features

1. **Google Authentication**
   - Players sign in with Google to submit scores
   - Required marketing opt-in during first-time sign-up
   - Secure authentication flow using Firebase

2. **Score Submission**
   - Authenticated users automatically submit scores at game end
   - Scores stored with player information in Firebase Firestore
   - Score entries include timestamp for tracking and tie-breaking
   - Only high scores (better than user's previous best) are stored
   - Specialized feedback for non-high score submissions
   - Automated collection creation with placeholder documents

3. **Leaderboard Display**
   - Shows top 10 global scores
   - For players not in the top 10, displays their rank with 3 scores above and below
   - Highlights the player's own score for easy identification
   - User's highest score emphasized with subtle golden shimmer animation
   - Retro-styled visuals with consistent table formatting

## Directory Structure

```
src/
├── firebase/
│   ├── config.ts              # Firebase configuration
│   ├── auth.ts                # Authentication functions
│   ├── leaderboard.ts         # Leaderboard data functions
│   └── AuthContext.tsx        # React context for auth state
├── components/
│   ├── Leaderboard.tsx        # Leaderboard UI component
│   └── SignInButton.tsx       # Google sign-in button component
├── game/scenes/
│   └── GameOverScene.ts       # Integration with game over screen
└── App.tsx                    # Main app with Firebase integration
```

## Implementation Details

### Firebase Integration

The leaderboard uses Firebase for authentication and data storage:

1. **Firebase Authentication**: Handles Google sign-in securely
2. **Firestore Database**: Stores leaderboard entries and user profiles
3. **Security Rules**: Ensures users can only submit their own scores

### Authentication Flow

1. Player clicks "Sign in with Google" from the game over screen
2. Marketing opt-in dialog appears (required for sign-up)
3. After sign-in, the score is automatically submitted
4. Player returned to game over screen with confirmation of submission

### Data Structure

**Leaderboard Collection**:
```typescript
interface LeaderboardEntry {
  id?: string;
  userId: string;
  score: number;
  timestamp: Date;
  displayName?: string;
  photoURL?: string;
}
```

**Users Collection**:
```typescript
interface UserData {
  userId: string;
  email: string;
  marketingOptIn: boolean;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  lastSignIn?: Date;
}
```

### Score Submission Logic

1. When a game ends, the GameOverScene checks if the user is authenticated
2. If authenticated, score is automatically submitted to Firestore
3. If not authenticated, player is prompted to sign in
4. After sign-in, score is submitted and leaderboard displayed
5. Submission process includes:
   - Checking if the score is higher than the user's previous best
   - Creating a placeholder document to ensure leaderboard collection exists
   - Using Firestore transactions to ensure atomic operations
   - Enhanced error handling for index-related Firestore errors
   - Retrying failed submissions with detailed logging
   - User-friendly notifications based on submission result
6. Game restart behavior:
   - When a game is restarted via spacebar, the leaderboard UI is automatically closed
   - Any pending score submissions are completed before restart
   - The leaderboard component respects the game's reset state to maintain UI consistency
   - Notifications about submission results are cleared on restart

### Notification System

1. Two types of notifications for score submissions:
   - Standard toast messages at the top of the screen for general updates
   - Specialized retro-styled modal for non-high score submissions
2. Non-high score notification includes:
   - Centered arcade-style dialog box
   - Pixel font styling with appropriate color scheme
   - "SCORE RESULT" heading and clear message
   - Blue gradient borders matching the game's aesthetic
   - "CONTINUE" button to dismiss the notification
3. Toast notifications provide feedback for:
   - Successful high score submissions
   - Authentication status
   - Network/database errors
   - General game updates

### Leaderboard Display Logic

1. Always shows top 10 global scores
2. For players not in top 10:
   - Shows their position (e.g., #42)
   - Shows 3 scores above and 3 below their score
   - Highlights their score in the list
3. Visual enhancements:
   - User's highest score highlighted with subtle golden shimmer effect
   - Consistent table formatting with fixed-width columns
   - Mobile-responsive design with appropriate spacing and padding
   - Alternating row colors for improved readability
   - Avatar images with fallback handling

## Event System

Communication between the Phaser game and React components is handled through custom events:

1. `checkGameAuth`: Triggered by GameOverScene to check authentication status
2. `gameAuthResponse`: Sent from React to game with auth status and score submission result
3. `showGameLeaderboard`: Opens the leaderboard UI from the game
4. `gameSignInRequest`: Initiates the sign-in process from the game

## Security Considerations

1. Firestore security rules ensure users can only:
   - Submit scores with their own userId
   - Access their own user profile data
   
2. Public read access is allowed for leaderboard data to enable anonymous viewing

## Testing

To test the leaderboard feature:

1. Play a game to completion
2. At the game over screen, click "Sign in with Google"
3. Complete the sign-in process
4. Verify your score appears in the leaderboard
5. Play again with the same account to see if your scores compare correctly

## Troubleshooting

1. **Score not appearing in leaderboard**:
   - Check browser console for errors
   - Verify Firebase configuration
   - Ensure Firestore rules allow writing to leaderboard collection
   - Confirm that the leaderboard collection exists in Firebase
   - Review Firebase console for any required index status (may take time to build)

2. **Authentication issues**:
   - Verify Google sign-in is enabled in Firebase console
   - Check if domain is whitelisted in Firebase Authentication settings

3. **Local development issues**:
   - Ensure Firebase configuration is correctly set in `src/firebase/config.ts`
   - Try using Firebase emulators for local testing

4. **Firebase collection initialization**:
   - The code now automatically creates a placeholder document if the leaderboard collection doesn't exist
   - Look for the "System" placeholder record with score -1 to confirm collection was properly initialized
   - This placeholder ensures collection existence and enables querying against it

5. **Firestore index errors**:
   - Watch for console messages about missing indexes
   - Create composite indexes as needed:
     - For `leaderboard` collection with field paths `userId` (asc) and `score` (desc)
     - For score-based filtering and ranking
   - After creating indexes, wait for them to be fully built (can take several minutes)
   - Check index status in Firebase console "Indexes" tab

6. **Error handling and debugging**:
   - All Firebase operations include detailed logging with "[FIREBASE]" or "[Leaderboard]" prefixes
   - Transaction errors are clearly identified and include operation context
   - Check the browser console logs for debugging information
   - The code contains retry mechanisms for transient errors
   - The leaderboard UI properly closes during game restart to prevent UI state conflicts

# Firebase Configuration - KEEP THESE SECRET!
REACT_APP_FIREBASE_API_KEY=AIzaSyCLZpaAHMViePnpqDh3V7cgMzqp4UBV308
REACT_APP_FIREBASE_AUTH_DOMAIN=order-editing-game.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=order-editing-game
REACT_APP_FIREBASE_STORAGE_BUCKET=order-editing-game.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=732746877933
REACT_APP_FIREBASE_APP_ID=1:732746877933:web:0dda30a4693f913ac235e4
REACT_APP_FIREBASE_MEASUREMENT_ID=G-BYQ10MKT0B 