// Firebase Configuration
// Note: This is a placeholder configuration that needs to be updated with real values
// after Firebase project is created

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCLZpaAHMViePnpqDh3V7cgMzqp4UBV308",
  authDomain: "order-editing-game.firebaseapp.com",
  projectId: "order-editing-game",
  storageBucket: "order-editing-game.appspot.com",
  messagingSenderId: "732746877933",
  appId: "1:732746877933:web:0dda30a4693f913ac235e4",
  measurementId: "G-BYQ10MKT0B"
};

// Log configuration status
console.log('Firebase configuration loaded');

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
// Set persistence to avoid frequent re-authentication
setPersistence(auth, browserLocalPersistence)
  .catch(error => {
    console.error("Firebase persistence error:", error);
  });

const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Configure Google Auth provider with security enhancements
googleProvider.setCustomParameters({
  prompt: 'select_account' // Force account selection
});

// Global error handler for Firebase operations
export const handleFirebaseError = (error: unknown, operation: string) => {
  console.error(`Firebase ${operation} error:`, error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  return { success: false, error: errorMessage };
};

export { auth, db, googleProvider }; 