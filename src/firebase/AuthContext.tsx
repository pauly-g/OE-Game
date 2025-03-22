import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  onAuthChange, 
  signInWithGoogle, 
  signOutUser, 
  getUserData, 
  UserData 
} from './auth';
import { submitScore } from './leaderboard';

// Interface for authentication context
interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  isLoading: boolean;
  signIn: (marketingOptIn: boolean) => Promise<UserData | null>;
  signOut: () => Promise<boolean>;
  submitUserScore: (score: number) => Promise<string | null>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user data from Firestore
        const data = await getUserData(user.uid);
        setUserData(data);
      } else {
        setUserData(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign in with Google
  const signIn = async (marketingOptIn: boolean = true) => {
    try {
      const userData = await signInWithGoogle(marketingOptIn);
      return userData;
    } catch (error) {
      console.error('Error in sign in:', error);
      return null;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await signOutUser();
      return true;
    } catch (error) {
      console.error('Error in sign out:', error);
      return false;
    }
  };

  // Submit score to leaderboard
  const submitUserScore = async (score: number) => {
    if (!currentUser) return null;
    
    return await submitScore(
      currentUser.uid, 
      score, 
      currentUser.displayName, 
      currentUser.photoURL
    );
  };

  // Context value
  const value = {
    currentUser,
    userData,
    isLoading,
    signIn,
    signOut,
    submitUserScore
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 