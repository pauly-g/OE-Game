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
  company?: string | null;
}

// Mock user data for development/testing
export const MOCK_USER: User = {
  uid: 'mock-user-123',
  email: 'player@example.com',
  displayName: 'Test Player',
  photoURL: 'https://ui-avatars.com/api/?name=Test+Player&background=random',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => Promise.resolve(),
  getIdToken: async () => Promise.resolve('mock-token'),
  getIdTokenResult: async () => Promise.resolve({
    token: 'mock-token',
    signInProvider: 'google.com',
    signInSecondFactor: null,
    expirationTime: '',
    issuedAtTime: '',
    authTime: '',
    claims: {}
  }),
  reload: async () => Promise.resolve(),
  toJSON: () => ({ uid: 'mock-user-123' }),
  providerId: 'google.com',
  phoneNumber: null
};

// Mock authenticated state and user profile information
let mockAuthenticated = false;
let mockUserName = 'Test Player';
let mockUserCompany = 'Cursor Inc';
const authStateListeners: ((user: User | null) => void)[] = [];

// Mock sign in with custom details
export const mockSignInWithNameCompany = async (name: string, company: string): Promise<UserData | null> => {
  try {
    console.log('MOCK: Signing in with name:', name, 'company:', company);
    
    // Store the provided values
    mockUserName = name;
    mockUserCompany = company;
    
    // Update the mock user
    const updatedUser = {
      ...MOCK_USER,
      displayName: name,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    };
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Set mock auth state
    mockAuthenticated = true;
    
    // Notify listeners
    console.log('MOCK: Notifying auth state listeners with updated user');
    authStateListeners.forEach(listener => listener(updatedUser));
    
    const userData = {
      userId: updatedUser.uid,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      photoURL: updatedUser.photoURL,
      company: company,
      marketingOptIn: true
    };
    
    console.log('MOCK: Returning user data:', userData);
    
    // Return mock user data
    return userData;
  } catch (error) {
    console.error('Error in mock sign in with name/company:', error);
    return null;
  }
};

// Function to sign in with Google - MOCK VERSION
export const signInWithGoogle = async (marketingOptIn: boolean = true): Promise<UserData | null> => {
  try {
    // In real implementation, this would call Firebase
    // For now, we're just returning mock data
    console.log('MOCK: Signing in with Google (marketingOptIn:', marketingOptIn, ')');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Set mock auth state
    mockAuthenticated = true;
    
    // Notify listeners
    const mockUserToUse = {
      ...MOCK_USER,
      displayName: mockUserName, // Use stored name
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(mockUserName)}&background=random`
    };
    
    authStateListeners.forEach(listener => listener(mockUserToUse));
    
    // Return mock user data
    return {
      userId: mockUserToUse.uid,
      email: mockUserToUse.email,
      marketingOptIn,
      displayName: mockUserToUse.displayName,
      photoURL: mockUserToUse.photoURL,
      company: mockUserCompany // Use stored company
    };
  } catch (error) {
    console.error('Error in mock sign in:', error);
    return null;
  }
};

// Function to sign out - MOCK VERSION
export const signOutUser = async (): Promise<boolean> => {
  try {
    // In real implementation, this would call Firebase
    console.log('MOCK: Signing out');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Set mock auth state
    mockAuthenticated = false;
    
    // Notify listeners
    authStateListeners.forEach(listener => listener(null));
    
    return true;
  } catch (error) {
    console.error('Error in mock sign out:', error);
    return false;
  }
};

// Function to save user profile to Firestore - MOCK VERSION
export const saveUserProfile = async (user: User, marketingOptIn: boolean): Promise<void> => {
  // In real implementation, this would save to Firestore
  console.log('MOCK: Saving user profile', { 
    userId: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    marketingOptIn
  });
};

// Function to get current user from auth state - MOCK VERSION
export const getCurrentUser = (): User | null => {
  return mockAuthenticated ? MOCK_USER : null;
};

// Function to get user data from Firestore - MOCK VERSION
export const getUserData = async (userId: string): Promise<UserData | null> => {
  try {
    // In real implementation, this would fetch from Firestore
    console.log('MOCK: Getting user data for', userId);
    
    if (mockAuthenticated && userId === MOCK_USER.uid) {
      return {
        userId: MOCK_USER.uid,
        email: MOCK_USER.email,
        marketingOptIn: true,
        displayName: MOCK_USER.displayName,
        photoURL: MOCK_USER.photoURL
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting mock user data:', error);
    return null;
  }
};

// Function to listen to auth state changes - MOCK VERSION
export const onAuthChange = (callback: (user: User | null) => void) => {
  // Add the callback to our listeners
  authStateListeners.push(callback);
  
  // Initial callback with current state
  callback(mockAuthenticated ? MOCK_USER : null);
  
  // Return unsubscribe function
  return () => {
    const index = authStateListeners.indexOf(callback);
    if (index > -1) {
      authStateListeners.splice(index, 1);
    }
  };
}; 