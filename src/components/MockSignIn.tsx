import React, { useState, useEffect } from 'react';
import { validateUserSubmission, containsProfanity } from '../utils/profanityFilter';
import { useAuth } from '../firebase/AuthContext';
import googleLogo from '/google-logo.png';

// Create a global testing function to test the profanity filter from the browser console
if (typeof window !== 'undefined') {
  (window as any).testProfanityFilter = (text: string) => {
    console.log(`Testing text: "${text}"`);
    const result = containsProfanity(text);
    console.log(`Result: ${result ? '❌ PROFANITY DETECTED' : '✅ TEXT IS CLEAN'}`);
    return result;
  };
}

interface MockSignInProps {
  onSuccess: (name: string, company: string) => void;
  onClose: () => void;
  score: number;
}

const MockSignIn: React.FC<MockSignInProps> = ({ onSuccess, onClose, score }) => {
  const { currentUser, userData, signInWithGoogle, updateUserCompany, updateMarketingOptIn } = useAuth();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // If user is already signed in, pre-fill name and company if available
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.displayName || '');
      if (userData?.company) {
        setCompany(userData.company);
      }
      if (userData?.marketingOptIn !== undefined) {
        setMarketingOptIn(userData.marketingOptIn);
      }
      
      // Log what we're doing for debugging
      console.log('User signed in, pre-filling form data:', { 
        name: currentUser.displayName, 
        company: userData?.company,
        marketingOptIn: userData?.marketingOptIn 
      });
    }
  }, [currentUser, userData]);

  // When component mounts, send an event to disable global game key inputs
  useEffect(() => {
    // Create and dispatch custom event to fully disable game inputs
    const inputEvent = new CustomEvent('gameInputState', { 
      detail: { inputsDisabled: true }
    });
    window.dispatchEvent(inputEvent);
    
    return () => {
      // If form is closed without submission, re-enable game inputs
      const inputEvent = new CustomEvent('gameInputState', { 
        detail: { inputsDisabled: false }
      });
      window.dispatchEvent(inputEvent);
    };
  }, []);

  // Enhanced method to handle closing the form
  const handleFormClose = () => {
    // Re-enable game inputs with a small delay to ensure state updates properly
    setTimeout(() => {
      const inputEvent = new CustomEvent('gameInputState', { 
        detail: { inputsDisabled: false, forceReset: true }
      });
      window.dispatchEvent(inputEvent);
    }, 50);
    
    // Call the original onClose callback
    onClose();
  };

  // Validate company name - no URLs allowed
  const validateCompanyName = (company: string): boolean => {
    // Empty check
    if (!company.trim()) {
      setError('Please enter your company name');
      return false;
    }
    
    // Check for URLs (basic check for http, www, etc.)
    const urlPattern = /(https?:\/\/|www\.)/i;
    if (urlPattern.test(company)) {
      setError('Company name cannot contain web addresses');
      return false;
    }
    
    // Check for profanity
    if (containsProfanity(company)) {
      setError('Please enter an appropriate company name');
      return false;
    }
    
    return true;
  };

  // Validate inputs
  const isFormValid = () => {
    setError(null);
    
    if (!name.trim()) {
      setError('Please enter your name');
      return false;
    }
    
    if (!validateCompanyName(company)) {
      return false;
    }
    
    if (!marketingOptIn) {
      setError('You must opt in to marketing emails to submit your score');
      return false;
    }
    
    return true;
  };

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signInWithGoogle();
      
      if (result) {
        setName(result.displayName || '');
        setCompany(result.company || '');
        
        console.log('Google sign-in successful, showing company form:', { 
          user: result.displayName, 
          company: result.company,
          currentUser: !!currentUser 
        });
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('An error occurred during sign-in');
    } finally {
      setIsLoading(false);
    }
  };

  // Log state changes for debugging
  useEffect(() => {
    console.log('MockSignIn state:', { 
      isSignedIn: !!currentUser, 
      hasName: !!name, 
      hasCompany: !!company,
      formSubmitted
    });
  }, [currentUser, name, company, formSubmitted]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Always update company and marketing opt-in when user is signed in
      if (currentUser) {
        console.log('Updating user data before score submission:', {
          company: company.trim(), // Ensure we're not submitting whitespace
          marketingOptIn
        });
        
        // Update company name
        const companyUpdateResult = await updateUserCompany(company.trim());
        if (!companyUpdateResult) {
          console.error('Failed to update company name');
        } else {
          console.log('Company name updated successfully:', company.trim());
        }
        
        // Update marketing opt-in status
        const marketingUpdateResult = await updateMarketingOptIn(marketingOptIn);
        if (!marketingUpdateResult) {
          console.error('Failed to update marketing opt-in status');
        } else {
          console.log('Marketing opt-in status updated successfully:', marketingOptIn);
        }
        
        // Wait a moment to ensure Firestore updates
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setFormSubmitted(true);
        onSuccess(name, company.trim());
        return;
      }
      
      // This case shouldn't happen since we require Google sign-in
      setError('Please sign in with Google first');
    } catch (error) {
      console.error('Form submission error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Stop key events from propagating to game
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Always stop propagation to prevent game actions from happening
    e.stopPropagation();
    
    // Check if the event is from a text input
    const isTextInput = (
      (e.target as HTMLElement).tagName === 'INPUT' && 
      ['text', 'email', 'password'].includes((e.target as HTMLInputElement).type)
    );
    
    // Handle arrow keys - always prevent default to avoid page scrolling
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    } 
    // Handle spacebar - allow in text inputs
    else if ([' ', 'Spacebar'].includes(e.key) && !isTextInput) {
      e.preventDefault();
    } 
    // Handle game cheat keys - only prevent default when not in text input
    else if (['d', 'D', 'c', 'C', 'f', 'F', 'l', 'L'].includes(e.key) && !isTextInput) {
      e.preventDefault();
    }
  };

  // Handle clicking outside the form by attaching event listeners
  useEffect(() => {
    // Create and dispatch custom event to disable game inputs while form is open
    const inputEvent = new CustomEvent('gameInputState', { 
      detail: { inputsDisabled: true }
    });
    window.dispatchEvent(inputEvent);
    
    // Re-enable game inputs when component unmounts
    return () => {
      const resetEvent = new CustomEvent('gameInputState', { 
        detail: { inputsDisabled: false, forceReset: true }
      });
      window.dispatchEvent(resetEvent);
    };
  }, []);

  // Additional debugging for profile image
  useEffect(() => {
    // Add a special debug log that will show all state related to the profile
    console.log('=============== PROFILE DEBUG ===============');
    console.log('Current User:', currentUser);
    console.log('Photo URL:', currentUser?.photoURL);
    console.log('Display Name:', currentUser?.displayName);
    console.log('User Data:', userData);
    
    if (currentUser && currentUser.photoURL) {
      console.log('User profile image URL:', currentUser.photoURL);
      
      // Preload the image before rendering to ensure it's available
      const img = new Image();
      img.onload = () => console.log('Profile image loaded successfully:', currentUser.photoURL);
      img.onerror = (err) => {
        console.error('Failed to load profile image:', err);
        // Try with referrer policy
        const img2 = new Image();
        img2.referrerPolicy = 'no-referrer';
        img2.src = currentUser.photoURL;
      };
      img.referrerPolicy = 'no-referrer';
      img.src = currentUser.photoURL;
    } else {
      console.log('No profile image URL available:', currentUser);
    }
  }, [currentUser, userData]);

  // If the user isn't logged in, show Google sign-in button
  if (!currentUser) {
    return (
      <div className="w-full max-w-md mx-auto bg-gray-800 rounded-lg p-6 shadow-lg text-white text-center" style={{ fontFamily: 'pixelmix, monospace' }}>
        <h2 className="text-2xl font-bold mb-6">SUBMIT YOUR SCORE</h2>
        
        {score > 0 && (
          <div className="mb-6">
            <p className="text-lg">Your Score: <span className="font-bold text-yellow-400">{score}</span></p>
          </div>
        )}
        
        <p className="mb-6">Sign in with Google to submit your score</p>
        
        {error && (
          <div className="mb-4 text-red-400 text-sm">{error}</div>
        )}
        
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="flex items-center justify-center w-full py-2 px-4 bg-white text-gray-800 rounded-md hover:bg-gray-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
          onKeyDown={handleKeyDown}
        >
          {isLoading ? (
            <span className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-800 mr-2"></div>
              Signing in...
            </span>
          ) : (
            <>
              <img src={googleLogo} alt="Google Logo" className="w-5 h-5 mr-2" />
              Sign in with Google
            </>
          )}
        </button>
      </div>
    );
  }

  // Show the company form if signed in
  if (currentUser && !formSubmitted) {
    return (
      <div className="w-full max-w-md mx-auto bg-gray-800 rounded-lg p-6 shadow-lg text-white" style={{ fontFamily: 'pixelmix, monospace' }}>
        <h2 className="text-2xl font-bold mb-6 text-center">SUBMIT YOUR SCORE</h2>
        
        {score > 0 && (
          <div className="text-center mb-6">
            <p className="text-lg">Your Score: <span className="font-bold text-yellow-400">{score}</span></p>
          </div>
        )}
        
        {/* Display user profile at the top if available */}
        {currentUser && (
          <div className="flex items-center justify-center mb-6">
            <div className="profile-image-container" style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #3b82f6', marginRight: '0' }}>
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    console.error("Failed to load profile image in component:", e);
                    // Just hide the image and show nothing
                    e.currentTarget.style.display = 'none';
                    // Try to show a fallback
                    try {
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        // Create a div with the initial
                        const fallback = document.createElement('div');
                        fallback.className = 'w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl';
                        // Safe way to get initial
                        const initial = (currentUser.displayName || '').charAt(0) || 'U';
                        fallback.textContent = initial;
                        // Clear parent and append the fallback
                        parent.innerHTML = '';
                        parent.appendChild(fallback);
                      }
                    } catch (err) {
                      console.error('Error creating fallback image:', err);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-xl">
                  {currentUser.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="ml-4">
              <p className="font-semibold">{currentUser.displayName}</p>
              <p className="text-sm text-gray-400">{currentUser.email}</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="text-center">
          <div className="mb-4 text-left">
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name (from Google)</label>
            <input
              type="text"
              id="name"
              value={name}
              disabled={true}
              className="w-full p-2 bg-gray-700 rounded-md text-white disabled:opacity-70 cursor-not-allowed text-center"
              placeholder="Your name"
              onKeyDown={handleKeyDown}
            />
            <p className="text-xs text-gray-400 mt-1 text-center">Name is pulled from your Google account</p>
          </div>
          
          <div className="mb-6 text-left">
            <label htmlFor="company" className="block text-sm font-medium mb-1">Company Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={isLoading}
              className="w-full p-2 bg-gray-700 rounded-md text-white text-center"
              placeholder="Enter your company name"
              required
              onKeyDown={handleKeyDown}
            />
            <p className="text-xs text-gray-400 mt-1 text-center">No web addresses allowed</p>
          </div>
          
          <div className="mb-6 flex justify-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mr-2 h-4 w-4"
                onKeyDown={handleKeyDown}
              />
              <span className="text-sm">I agree to receive marketing emails about this game</span>
            </label>
          </div>
          <p className="text-xs text-red-400 mt-1 text-center">{!marketingOptIn ? 'Required to submit your score' : ''}</p>
          
          {error && (
            <div className="mb-4 text-red-400 text-sm text-center">{error}</div>
          )}
          
          <div className="flex justify-center gap-4 mt-6">
            <button
              type="button"
              onClick={handleFormClose}
              disabled={isLoading}
              className="py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              onKeyDown={handleKeyDown}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isLoading || !marketingOptIn}
              className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
              onKeyDown={handleKeyDown}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Submitting...
                </span>
              ) : 'Submit Score'}
            </button>
          </div>
        </form>
      </div>
    );
  }
  
  // Show thank you message after submission
  if (formSubmitted) {
    return (
      <div className="w-full max-w-md mx-auto bg-gray-800 rounded-lg p-6 shadow-lg text-white text-center" style={{ fontFamily: 'pixelmix, monospace' }}>
        <div className="mb-6 text-center">
          <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <h2 className="text-2xl font-bold mt-4">Thank You!</h2>
          <p className="mt-2">Your score has been submitted successfully.</p>
          <p className="mt-4 text-lg">Score: <span className="font-bold text-yellow-400">{score}</span></p>
        </div>
      </div>
    );
  }
};

export default MockSignIn; 