import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, googleProvider, db } from './config';
import { submitScore, getUserBestScore as fetchUserBestScore } from './leaderboard';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';

// Interface for user data stored in Firestore
export interface UserData {
  userId: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  company: string | null;
  createdAt: any;
  lastLogin: any;
  marketingOptIn: boolean;
}

// Interface for authentication context
interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<UserData | null>;
  signOutUser: () => Promise<void>;
  submitUserScore: (score: number) => Promise<{success: boolean, message: string, isHighScore: boolean}>;
  updateUserCompany: (company: string) => Promise<boolean>;
  updateMarketingOptIn: (optIn: boolean) => Promise<boolean>;
  refreshUserData: () => Promise<UserData | null>;
  getUserBestScore: () => Promise<{score: number, timestamp: Date} | null>;
}

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component for the AuthContext
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Effect to handle authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? 'User authenticated' : 'No user');
      setCurrentUser(user);
      
      if (user) {
        const userData = await fetchUserData(user.uid);
        setUserData(userData);
      } else {
        setUserData(null);
      }
      
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Function to fetch user data from Firestore
  const fetchUserData = async (userId: string): Promise<UserData | null> => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        console.log('Fetched user data:', data);
        return {
          userId,
          displayName: data.displayName,
          email: data.email,
          photoURL: data.photoURL,
          company: data.company || null,
          createdAt: data.createdAt,
          lastLogin: data.lastLogin,
          marketingOptIn: data.marketingOptIn || false
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Function to refresh user data
  const refreshUserData = async (): Promise<UserData | null> => {
    if (!currentUser) return null;
    
    try {
      const userData = await fetchUserData(currentUser.uid);
      setUserData(userData);
      return userData;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return null;
    }
  };

  // Function to sign in with Google
  const signInWithGoogle = async (): Promise<UserData | null> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if the user already exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        // Update last login time
        await setDoc(userRef, {
          lastLogin: serverTimestamp()
        }, { merge: true });
      } else {
        // Create new user document
        await setDoc(userRef, {
          userId: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          company: null, // Will be set later
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          marketingOptIn: true // Default to true, can be changed
        });
      }
      
      // Fetch the complete user data
      const userData = await fetchUserData(user.uid);
      setUserData(userData);
      
      return userData;
    } catch (error) {
      console.error('Google sign-in error:', error);
      return null;
    }
  };

  // Function to sign out
  const signOutUser = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Function to update user's company
  const updateUserCompany = async (company: string): Promise<boolean> => {
    if (!currentUser) return false;
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        company,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // Update local userData
      setUserData(prev => prev ? { ...prev, company } : null);
      
      return true;
    } catch (error) {
      console.error('Error updating company:', error);
      return false;
    }
  };

  // Function to update user's marketing opt-in status
  const updateMarketingOptIn = async (optIn: boolean): Promise<boolean> => {
    if (!currentUser) return false;
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        marketingOptIn: optIn,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // Update local userData
      setUserData(prev => prev ? { ...prev, marketingOptIn: optIn } : null);
      
      return true;
    } catch (error) {
      console.error('Error updating marketing opt-in status:', error);
      return false;
    }
  };

  // Function to get user's best score
  const getUserBestScore = async (): Promise<{score: number, timestamp: Date} | null> => {
    if (!currentUser) return null;
    
    try {
      const bestScore = await fetchUserBestScore(currentUser.uid);
      if (bestScore) {
        return {
          score: bestScore.score,
          timestamp: bestScore.timestamp
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting user best score:', error);
      return null;
    }
  };

  // Function to submit user's score to leaderboard
  const submitUserScore = async (score: number): Promise<{success: boolean, message: string, isHighScore: boolean}> => {
    if (!currentUser || !userData) {
      console.error('Cannot submit score: No authenticated user');
      return {success: false, message: 'You must be signed in to submit a score', isHighScore: false};
    }
    
    console.log('[FIREBASE] Submitting score for authenticated user:', score, 'User ID:', currentUser.uid);
    
    try {
      // First check if this is a high score before submitting
      const bestScore = await fetchUserBestScore(currentUser.uid);
      
      // If we found a previous score and the new score is not strictly higher, don't submit
      if (bestScore && score <= bestScore.score) {
        console.log('[FIREBASE] Not a high score:', score, 'vs previous best:', bestScore.score);
        return {
          success: false, 
          message: `Sorry, your new score is not a new personal best. Try again!`, 
          isHighScore: false
        };
      }
      
      // Double check the company value
      const companyToUse = userData?.company && userData.company.trim() !== '' ? 
        userData.company : (await fetchUserData(currentUser.uid))?.company || '';
      
      console.log('[FIREBASE] Company value being used:', companyToUse || 'No company set');
      
      // Submit score to leaderboard with user data
      console.log('[FIREBASE] Submitting high score to Firebase:', {
        userId: currentUser.uid,
        score,
        displayName: userData.displayName || currentUser.displayName,
        photoURL: userData.photoURL || currentUser.photoURL,
        company: companyToUse || 'No company set'
      });
      
      const result = await submitScore(
        currentUser.uid,
        score,
        userData.displayName || currentUser.displayName,
        userData.photoURL || currentUser.photoURL,
        companyToUse || 'No company set' // Use our verified company value
      );
      
      // If submitScore returns null, the score wasn't submitted (either not a high score or error)
      if (!result) {
        // Check if it's because it wasn't a high score
        if (bestScore && score <= bestScore.score) {
          return {
            success: false, 
            message: `Sorry, your new score is not a new personal best. Try again!`, 
            isHighScore: false
          };
        } else {
          // Some other error happened
          return {
            success: false, 
            message: 'Failed to submit score. Please try again.', 
            isHighScore: false
          };
        }
      }
      
      // Get the previous best score for the success message
      let message = 'New high score!';
      
      if (bestScore) {
        message = `New high score! You beat your previous best of ${bestScore.score}!`;
      }
      
      return {
        success: true, 
        message, 
        isHighScore: true
      };
    } catch (error) {
      console.error('[FIREBASE] Error submitting score:', error);
      return {
        success: false, 
        message: 'An error occurred while submitting your score', 
        isHighScore: false
      };
    }
  };

  // Context value with all functions and state
  const value = {
    currentUser,
    userData,
    isLoading,
    signInWithGoogle,
    signOutUser,
    submitUserScore,
    updateUserCompany,
    updateMarketingOptIn,
    refreshUserData,
    getUserBestScore
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 