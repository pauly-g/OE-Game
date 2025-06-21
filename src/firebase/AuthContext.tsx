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
      
      console.log('[AUTH] Google sign-in successful:', {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      });
      
      // Check if the user already exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        console.log('[AUTH] Updating existing user document');
        // Update existing user with any new information and last login time
        await setDoc(userRef, {
          displayName: user.displayName, // Update in case it changed
          email: user.email, // Update in case it changed
          photoURL: user.photoURL, // Update in case it changed
          lastLogin: serverTimestamp()
        }, { merge: true });
      } else {
        console.log('[AUTH] Creating new user document');
        // Create new user document with all available data
        await setDoc(userRef, {
          userId: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          company: null, // Will be set later
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          marketingOptIn: false // Default to false, user must explicitly opt in
        });
      }
      
      // Fetch the complete user data
      const userData = await fetchUserData(user.uid);
      setUserData(userData);
      
      console.log('[AUTH] Final user data:', userData);
      
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
      console.log('[AUTH] Updating user company to:', company);
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        company,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log('[AUTH] Company updated in Firestore successfully');
      
      // Update local userData immediately
      setUserData(prev => {
        const updated = prev ? { ...prev, company } : null;
        console.log('[AUTH] Updated local userData:', updated);
        return updated;
      });
      
      // Also refresh from Firestore to ensure consistency
      const refreshedData = await fetchUserData(currentUser.uid);
      if (refreshedData) {
        setUserData(refreshedData);
        console.log('[AUTH] Refreshed userData from Firestore:', refreshedData);
      }
      
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
    if (!currentUser) {
      console.error('Cannot submit score: No authenticated user');
      return {success: false, message: 'You must be signed in to submit a score', isHighScore: false};
    }
    
    console.log('[FIREBASE] Submitting score for authenticated user:', score, 'User ID:', currentUser.uid);
    
    try {
      // First check if this is a high score before submitting
      const bestScore = await fetchUserBestScore(currentUser.uid);
      
      // If we found a previous score and the new score is not strictly higher, don't submit
      // BUT always accept first-time submissions (when bestScore is null)
      if (bestScore && score <= bestScore.score) {
        console.log('[FIREBASE] Not a high score:', score, 'vs previous best:', bestScore.score);
        return {
          success: false, 
          message: `Sorry, your new score is not a new personal best. Try again!`, 
          isHighScore: false
        };
      }
      
      // For first-time submission, log that we're accepting it
      if (!bestScore) {
        console.log(`[FIREBASE] First-time score submission: ${score}. Accepting score.`);
      } else {
        console.log(`[FIREBASE] New high score: ${score} beats previous ${bestScore.score}`);
      }
      
      // CRITICAL: Always refresh user data before submission to get the latest company info
      console.log('[FIREBASE] Refreshing user data before score submission...');
      const freshUserData = await refreshUserData();
      
      // Get the most up-to-date user data or use fallbacks
      let finalDisplayName = freshUserData?.displayName || currentUser.displayName || 'Anonymous Player';
      let finalPhotoURL = freshUserData?.photoURL || currentUser.photoURL || null;
      let finalCompany = freshUserData?.company || 'Unknown Company';
      
      // If we still don't have fresh data, try fetching directly
      if (!freshUserData) {
        console.log('[FIREBASE] No fresh userData, attempting direct fetch...');
        const directFetchData = await fetchUserData(currentUser.uid);
        if (directFetchData) {
          finalDisplayName = directFetchData.displayName || finalDisplayName;
          finalPhotoURL = directFetchData.photoURL || finalPhotoURL;
          finalCompany = directFetchData.company || finalCompany;
        }
      }
      
      console.log('[FIREBASE] Final values being used for submission:', {
        userId: currentUser.uid,
        score,
        displayName: finalDisplayName,
        photoURL: finalPhotoURL,
        company: finalCompany
      });
      
      // Submit score to leaderboard with user data
      const result = await submitScore(
        currentUser.uid,
        score,
        finalDisplayName,
        finalPhotoURL,
        finalCompany
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