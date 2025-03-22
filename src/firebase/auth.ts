import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './config';

// Interface for user data
export interface UserData {
  userId: string;
  email: string | null;
  marketingOptIn: boolean;
  displayName: string | null;
  photoURL: string | null;
}

// Function to sign in with Google
export const signInWithGoogle = async (marketingOptIn: boolean = true): Promise<UserData | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Save user profile to Firestore with marketing opt-in
    await saveUserProfile(user, marketingOptIn);
    
    return {
      userId: user.uid,
      email: user.email,
      marketingOptIn,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return null;
  }
};

// Function to sign out
export const signOutUser = async (): Promise<boolean> => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    return false;
  }
};

// Function to save user profile to Firestore
export const saveUserProfile = async (user: User, marketingOptIn: boolean): Promise<void> => {
  const userRef = doc(db, 'users', user.uid);
  
  // Check if user document already exists
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    // Create new user profile
    await setDoc(userRef, {
      userId: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      marketingOptIn: marketingOptIn,
      createdAt: new Date()
    });
  } else {
    // Update existing user profile
    // Note: We don't override the marketing preference if it already exists
    const userData = userDoc.data();
    await setDoc(userRef, {
      ...userData,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastSignIn: new Date()
    }, { merge: true });
  }
};

// Function to get current user from auth state
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Function to get user data from Firestore
export const getUserData = async (userId: string): Promise<UserData | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        userId: userData.userId,
        email: userData.email,
        marketingOptIn: userData.marketingOptIn || false,
        displayName: userData.displayName,
        photoURL: userData.photoURL
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Function to listen to auth state changes
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
}; 