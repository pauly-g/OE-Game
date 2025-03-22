import React, { useState } from 'react';
import { useAuth } from '../firebase/AuthContext';

interface SignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

const SignInButton: React.FC<SignInButtonProps> = ({ 
  onSuccess, 
  onError,
  className = '' 
}) => {
  const [loading, setLoading] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(true);
  const { signIn } = useAuth();
  
  const handleSignIn = async () => {
    setShowConsent(true);
  };
  
  const handleConsentSubmit = async () => {
    setLoading(true);
    
    try {
      // Sign in with Google with marketing consent
      const result = await signIn(marketingConsent);
      
      if (result) {
        onSuccess?.();
      } else {
        onError?.('Failed to sign in. Please try again.');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      onError?.('An error occurred during sign in. Please try again.');
    } finally {
      setLoading(false);
      setShowConsent(false);
    }
  };
  
  const handleConsentCancel = () => {
    setShowConsent(false);
  };
  
  // If consent dialog is shown
  if (showConsent) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700 max-w-md">
        <h3 className="text-lg font-bold mb-3 text-white">Sign in to submit your score</h3>
        
        <p className="text-gray-300 mb-4">
          Sign in with Google to save your score to our leaderboard and see where you rank among other players.
        </p>
        
        <div className="mb-4">
          <label className="flex items-start cursor-pointer">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={() => setMarketingConsent(!marketingConsent)}
              className="mt-1 mr-2"
              required
            />
            <span className="text-gray-300 text-sm">
              I agree to receive marketing emails about Order Editing. This is required to use the leaderboard.
            </span>
          </label>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleConsentCancel}
            disabled={loading}
            className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors flex-1"
          >
            Cancel
          </button>
          
          <button
            onClick={handleConsentSubmit}
            disabled={loading || !marketingConsent}
            className={`py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex-1 
              ${(!marketingConsent) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              'Continue with Google'
            )}
          </button>
        </div>
        
        <p className="text-xs text-gray-400 mt-3">
          You must check the box to submit your score to the leaderboard.
        </p>
      </div>
    );
  }
  
  // Default button
  return (
    <button
      onClick={handleSignIn}
      disabled={loading}
      className={`flex items-center justify-center py-2 px-4 bg-white hover:bg-gray-100 text-gray-800 rounded-lg shadow transition-colors ${className}`}
    >
      {loading ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Signing in...
        </span>
      ) : (
        <>
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </>
      )}
    </button>
  );
};

export default SignInButton; 