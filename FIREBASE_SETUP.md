# Firebase Setup for Order Editing - The Game

This document provides instructions for setting up Firebase for the leaderboard feature in "Order Editing - The Game".

## Prerequisites

- A Google account
- Node.js and npm installed (v14+ recommended)
- Git for version control

## Steps to Set Up Firebase

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "Order Editing Game")
4. Choose whether to enable Google Analytics (recommended)
5. Follow the prompts to complete project creation

### 2. Register Your Web App

1. In the Firebase console, select your project
2. Click the web icon (</>) to add a web app
3. Register your app with a nickname (e.g., "Order Editing Game Web")
4. Check "Also set up Firebase Hosting" if you plan to deploy via Firebase
5. Click "Register app"

### 3. Copy Firebase Configuration

After registering your app, you'll see a configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

Copy this configuration to `src/firebase/config.ts`, replacing the placeholder values.

### 4. Enable Authentication

1. In the Firebase console, navigate to "Authentication"
2. Click "Get started"
3. Enable "Google" as a sign-in provider
4. Configure the OAuth consent screen if prompted
5. Add your domain to the authorized domains list (for production)

### 5. Set Up Firestore Database

1. In the Firebase console, navigate to "Firestore Database"
2. Click "Create database"
3. Start in either production or test mode (you can change this later)
4. Choose a location for your database
5. Click "Enable"

### 6. Deploy Firestore Security Rules

1. Copy the contents of `firestore.rules` from this project
2. In the Firebase console, navigate to "Firestore Database" > "Rules"
3. Replace the default rules with the ones from your project
4. Click "Publish"

## Local Development

After completing the setup, you can run the application locally:

```bash
npm install
npm run dev
```

## Production Deployment

For production deployment, we recommend using Vercel as specified in the PRD:

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Add your Firebase configuration as environment variables in Vercel
4. Deploy

## Security Considerations

- Never commit your Firebase configuration to public repositories
- Use environment variables for production deployments
- Ensure Firestore rules are properly configured to protect user data
- Enable Firebase Authentication security features like email verification 