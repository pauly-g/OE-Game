import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getTopScores, getUserScoreRank, getScoresAroundUser, LeaderboardEntry } from '../firebase/leaderboard';
import { useAuth, UserData } from '../firebase/AuthContext';
import MockSignIn from './MockSignIn';
import '../styles/customScrollbar.css';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  userScore?: number;
  inGameFrame?: boolean; // For styling, true by default
}

// Add a new CSS class for the golden shimmer effect
const goldenShimmerStyle = `
  @keyframes shimmer {
    0%, 85%, 100% {
      background-position: 0% 0;
    }
    90% {
      background-position: 100% 0;
    }
  }
  
  /* Leaderboard container styling */
  .leaderboard-container {
    width: 100%;
    height: 100%;
    background-color: rgba(15, 23, 42, 0.95);
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    color: white;
    position: relative;
    overflow: auto;
    margin: 0 auto;
  }
  
  .in-game-frame {
    margin: 0 auto;
    width: 100%;
    height: 90%;
    top: 5%;
    left: 0;
    right: 0;
    position: absolute;
  }
  
  .leaderboard-header {
    display: flex;
    justify-content: center;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 2px solid #2563eb;
    margin-bottom: 24px;
    position: relative;
  }
  
  .leaderboard-header h2 {
    font-size: 1.8rem;
    font-weight: bold;
    color: #60a5fa;
    letter-spacing: 2px;
    text-align: center;
    font-family: 'pixelmix', monospace;
    text-shadow: 0 0 6px rgba(96, 165, 250, 0.7);
  }
  
  .leaderboard-controls {
    position: absolute;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: 28px;
    color: #60a5fa;
    cursor: pointer;
    padding: 0;
    margin: 0;
    line-height: 1;
    transition: color 0.2s ease;
  }
  
  .close-button:hover {
    color: #93c5fd;
  }
  
  .leaderboard-section {
    margin-bottom: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 100%;
  }
  
  .leaderboard-section h3 {
    font-size: 1.2rem;
    color: #93c5fd;
    margin-bottom: 12px;
    text-align: center;
    font-family: 'pixelmix', monospace;
  }
  
  /* Fix formatting issues */
  .scores-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    margin: 0 auto;
  }
  
  .scores-table thead {
    width: 100%;
  }
  
  .scores-table th, .scores-table td {
    padding: 8px 16px;
    border: none;
    text-align: left;
  }
  
  /* Ensure the entire table is centered */
  .scores-table, .scores-table thead, .scores-table tbody, .scores-table tr {
    width: 100%;
  }
  
  .scores-table th:first-child, .scores-table td:first-child {
    width: 15%;
  }
  
  .scores-table th:nth-child(2), .scores-table td:nth-child(2) {
    width: 35%;
  }
  
  .scores-table th:nth-child(3), .scores-table td:nth-child(3) {
    width: 35%;
  }
  
  .scores-table th:last-child, .scores-table td:last-child {
    width: 15%;
    text-align: right;
  }
  
  .scores-table tbody tr {
    background-color: rgba(30, 41, 59, 0.8);
  }
  
  .scores-table tbody tr:nth-child(even) {
    background-color: rgba(30, 41, 59, 0.6);
  }
  
  .scores-table .player-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .scores-table .player-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
  }
  
  .scores-table .current-user-badge {
    background-color: #3b82f6;
    color: white;
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 6px;
  }
  
  /* Loading spinner styling */
  .loading-spinner-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    text-align: center;
  }
  
  .loading-spinner {
    margin-bottom: 20px;
  }
  
  .loading-text {
    font-size: 1.2rem;
    color: #60a5fa;
    margin-bottom: 8px;
  }
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 3px solid rgba(96, 165, 250, 0.3);
    border-radius: 50%;
    border-top-color: #60a5fa;
    animation: spin 1s ease-in-out infinite;
  }

  /* Apply golden shimmer effect as an overlay to maintain layout */
  .golden-shimmer {
    position: relative;
    z-index: 0;
  }
  
  .golden-shimmer::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg, 
      rgba(36, 36, 36, 0.9) 0%,
      rgba(36, 36, 36, 0.9) 10%, 
      rgba(211, 175, 55, 0.4) 20%, 
      rgba(255, 223, 0, 0.5) 30%, 
      rgba(211, 175, 55, 0.4) 40%,
      rgba(36, 36, 36, 0.9) 50%,
      rgba(36, 36, 36, 0.9) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 10s infinite ease-in-out;
    box-shadow: 0 0 3px rgba(255, 215, 0, 0.2);
    border: 1px solid rgba(255, 215, 0, 0.2);
    z-index: -1;
    pointer-events: none;
  }
  
  .current-user-row {
    font-weight: 500;
  }
  
  /* Add styles for the non-high-score message overlay */
  .not-high-score-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }
  
  .not-high-score-message {
    background: #1e293b;
    border: 2px solid #3b82f6;
    border-radius: 8px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    text-align: center;
    color: white;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  }
  
  .not-high-score-message p {
    font-size: 1.1rem;
    line-height: 1.5;
    margin-bottom: 20px;
    color: #9ce5ff;
  }
  
  .not-high-score-message .buttons {
    display: flex;
    justify-content: center;
    gap: 16px;
  }
  
  .not-high-score-message button {
    background-color: #3b82f6;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    font-size: 1rem;
    transition: background-color 0.2s;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .not-high-score-message button:hover {
    background-color: #2563eb;
    transform: scale(1.05);
  }

  /* Leaderboard header controls */
  .leaderboard-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .refresh-button {
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    border: 1px solid #3b82f6;
    border-radius: 4px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .refresh-button:hover {
    background: rgba(59, 130, 246, 0.3);
    transform: rotate(180deg);
  }

  .refresh-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .loading-spinner-small {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top-color: #60a5fa;
    border-right-color: #60a5fa;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* User position styling */
  .user-position {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
  
  .user-rank {
    text-align: center;
    font-size: 1.1rem;
    color: #60a5fa;
    margin-bottom: 16px;
  }
  
  .user-rank span {
    font-weight: bold;
    color: #93c5fd;
  }
`;

const Leaderboard: React.FC<LeaderboardProps> = ({ 
  isOpen, 
  onClose, 
  userScore, 
  inGameFrame = true 
}) => {
  // State for leaderboard data
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [nearbyScores, setNearbyScores] = useState<{
    above: LeaderboardEntry[];
    below: LeaderboardEntry[];
  }>({ above: [], below: [] });
  
  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState<boolean>(false);
  const [debug, setDebug] = useState<string>('');
  // Track the most recent score submission
  const [mostRecentScoreId, setMostRecentScoreId] = useState<string | null>(null);
  // Add state for non-high-score message
  const [showNotHighScoreMessage, setShowNotHighScoreMessage] = useState<boolean>(false);
  const [notHighScoreMessage, setNotHighScoreMessage] = useState<string>('');
  const [showLeaderboardAfterError, setShowLeaderboardAfterError] = useState(false);
  // Add a separate loading state for score submission
  const [submittingScore, setSubmittingScore] = useState<boolean>(false);
  const [submissionComplete, setSubmissionComplete] = useState<boolean>(false);
  // Track which scores have been submitted to prevent double submissions
  const [submittedScores, setSubmittedScores] = useState<Record<number, boolean>>({});
  // Store user's best score data (object containing score and timestamp)
  const [currentBestScoreData, setCurrentBestScoreData] = useState<{ score: number; timestamp: Date } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Guard for submission
  const processedScoreRef = useRef<boolean>(false); // Use ref for the flag

  // Authentication context
  const { 
    currentUser, 
    userData, 
    submitUserScore,
    updateUserCompany,
    refreshUserData,
    getUserBestScore,
    updateMarketingOptIn
  } = useAuth();

  // Function to fetch all leaderboard data, using a specific score for rank/nearby
  const fetchLeaderboardData = useCallback(async (scoreForRank?: number) => {
    console.log('[Leaderboard] Starting fetchLeaderboardData call', { scoreForRank });
    setLoading(true);
    setError(null);
    setUserRank(null); // Reset rank/nearby scores before fetching
    setNearbyScores({ above: [], below: [] });

    try {
      // Fetch top scores
      console.log('[Leaderboard] Fetching top scores...');
      const scores = await getTopScores(10);
      console.log('[Leaderboard] Received top scores:', scores);
      setTopScores(scores);

      // If a specific score is provided for ranking, get rank and nearby scores
      if (scoreForRank !== undefined && currentUser) {
          console.log('[Leaderboard] Fetching rank for score:', scoreForRank);
          try {
              // Fetch rank using the provided score
              const rank = await getUserScoreRank(scoreForRank);
              console.log('[Leaderboard] Got user rank:', rank);
              setUserRank(rank);

              // If user rank is beyond top 10, get nearby scores based on the same score
              if (rank > 10) {
                  console.log('[Leaderboard] Fetching nearby scores for rank:', rank, 'using score:', scoreForRank);
                  try {
                      // Pass the scoreForRank to getScoresAroundUser
                      const nearby = await getScoresAroundUser(scoreForRank, 3);
                      console.log('[Leaderboard] Got nearby scores:', nearby);
                      setNearbyScores(nearby);
                  } catch (nearbyErr) {
                      console.error('[Leaderboard] Error getting nearby scores:', nearbyErr);
                  }
              }
          } catch (rankErr) {
              console.error('[Leaderboard] Error getting user rank:', rankErr);
          }
      } else if (!currentUser && userScore !== undefined) {
          console.log('[Leaderboard] User not logged in, skipping rank/nearby fetch for now.');
      } else {
          console.log('[Leaderboard] No specific score provided for rank or user not logged in, skipping rank/nearby fetch.');
      }
      console.log('[Leaderboard] Data fetching complete, setting loading to false');
    } catch (err) {
      console.error('[Leaderboard] Error fetching leaderboard data:', err);
      setError('Failed to load leaderboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]); // Add currentUser dependency

  // Centralized Logic Handler: Runs when the component opens with a score
  useEffect(() => {
    if (isOpen && userScore !== undefined) {
      console.log('[Leaderboard] Component opened with score:', userScore);
      // Reset submission guard and processing flag when opening
      setIsSubmitting(false);
      processedScoreRef.current = false; // Reset ref value
      (window as any).isLeaderboardOpen = true;
      setLoading(true); // Start loading
      setError(null);
      setShowSignIn(false); // Reset sign-in state
      setShowNotHighScoreMessage(false); // Reset message state
      setCurrentBestScoreData(null); // Reset best score state

      const handleScoreLogic = async () => {
        // Prevent multiple simultaneous submissions
        if (isSubmitting) {
          console.log('[Leaderboard] Submission already in progress, skipping...');
          return;
        }

        if (currentUser) {
          console.log('[Leaderboard] User is logged in. Checking if score was already submitted...');
          try {
            const bestScoreData = await getUserBestScore();
            setCurrentBestScoreData(bestScoreData); // Store the best score data object

            const bestScoreValue = bestScoreData?.score; // Get the numeric score value

            // Check if this score might be a new high score that wasn't submitted yet
            if (bestScoreValue === undefined || userScore > bestScoreValue) {
              console.log('[Leaderboard] Potential new high score detected. Checking if already submitted...');
              
              // Wait a short time to allow App.tsx submission to complete
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Re-fetch best score to see if it was updated by App.tsx
              const updatedBestScore = await getUserBestScore();
              const updatedBestValue = updatedBestScore?.score;
              
              if (updatedBestValue === undefined || userScore > updatedBestValue) {
                console.log('[Leaderboard] Score was not submitted by App.tsx. Submitting now...');
                setIsSubmitting(true);
                
                let loadingMsg = showLoadingMessage('Submitting your high score...');
                const result = await submitUserScore(userScore);
                removeLoadingMessage(loadingMsg);

                if (result.success) {
                  setMostRecentScoreId(currentUser.uid);
                  console.log('[Leaderboard] High score submitted successfully from Leaderboard.');
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  await fetchLeaderboardData(userScore);
                  setNotHighScoreMessage(`Congratulations! Your score (${userScore}) is your new personal best and has been submitted!`);
                  setShowNotHighScoreMessage(true);
                } else {
                  console.error('[Leaderboard] Failed to submit high score:', result.message);
                  setError(`Failed to submit high score: ${result.message || 'Please try again.'}`);
                  await fetchLeaderboardData(updatedBestValue ?? undefined);
                }
                setIsSubmitting(false);
              } else {
                console.log('[Leaderboard] Score was already submitted by App.tsx. Just fetching leaderboard...');
                await fetchLeaderboardData(updatedBestValue);
                setNotHighScoreMessage(`Congratulations! Your score (${userScore}) is your new personal best and has been submitted!`);
                setShowNotHighScoreMessage(true);
              }
            } else {
              console.log('[Leaderboard] Score is not a high score.');
              await fetchLeaderboardData(bestScoreValue);
              setNotHighScoreMessage(`Your score (${userScore}) was not higher than your personal best of ${bestScoreValue}. Keep trying!`);
              setShowNotHighScoreMessage(true);
            }
          } catch (err) {
            console.error('[Leaderboard] Error checking/submitting score:', err);
            setError('Error processing your score. Please try again.');
            fetchLeaderboardData();
          }
        } else {
          console.log('[Leaderboard] User not logged in. Prompting sign-in to submit high score.');
          setShowSignIn(true);
          setLoading(false); // Stop loading as we wait for user interaction
        }
      };

      // Only run the score processing logic ONCE per opening with a score
      if (!processedScoreRef.current) {
        processedScoreRef.current = true; // Set flag immediately using ref
        handleScoreLogic();
      } else {
        console.log('[Leaderboard] Score logic already processed for this opening, skipping.');
        // If logic was already run, ensure we are not stuck in loading if sign-in isn't shown
        if (!showSignIn) {
            setLoading(false);
        }
      }

    } else if (!isOpen) {
        // Reset when closed
        (window as any).isLeaderboardOpen = false;
        processedScoreRef.current = false; // Reset ref value when closed
        // Reset states if needed when component is closed
        setLoading(true);
        setError(null);
        setShowSignIn(false);
        setShowNotHighScoreMessage(false);
        setTopScores([]);
        setUserRank(null);
        setNearbyScores({ above: [], below: [] });
    }
  }, [isOpen, userScore, currentUser, getUserBestScore, submitUserScore, fetchLeaderboardData]);

  // Helper functions for loading messages
  const showLoadingMessage = (text: string) => {
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
    loadingMsg.id = `loading-msg-${Date.now()}`; // Unique ID
    loadingMsg.innerHTML = `
      <div class="bg-gray-800 p-8 rounded-lg text-white text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p class="mt-4">${text}</p>
      </div>
    `;
    document.body.appendChild(loadingMsg);
    return loadingMsg;
  };

  const removeLoadingMessage = (element: HTMLElement | null) => {
    // Check by ID for more robustness
    const existingMsg = element ? document.getElementById(element.id) : null;
    if (existingMsg && document.body.contains(existingMsg)) {
      console.log(`[Leaderboard] Removing loading message: ${element?.id}`);
      document.body.removeChild(existingMsg);
    }
  };

  // Add event listener for leaderboard open event (Removed redundant logic)
  useEffect(() => {
    // Set up event listeners
    const handleScoreSubmitted = (e: CustomEvent) => {
        console.log('[Leaderboard] Score submitted event received (potentially from outside)', e.detail);
        // If a score was successfully submitted elsewhere, refresh the view
        if (e.detail && e.detail.success && isOpen) {
            console.log('[Leaderboard] Refreshing leaderboard due to external score submission event');
            fetchLeaderboardData(e.detail.score); // Fetch using the submitted score
        }
    };

    window.addEventListener('scoreSubmitted', handleScoreSubmitted as EventListener);

    return () => {
      window.removeEventListener('scoreSubmitted', handleScoreSubmitted as EventListener);
    };
  }, [isOpen, fetchLeaderboardData]); // Added dependencies

  // Handle mock sign-in (Adjusted score submission logic)
  const handleMockSignIn = async (name: string, company: string, marketingOptInAccepted: boolean) => {
    // Prevent multiple simultaneous submissions
    if (isSubmitting) {
      console.log('[Leaderboard] Submission already in progress via sign-in, skipping...');
      return;
    }

    try {
      console.log('[Leaderboard] Sign-in form submitted with:', { name, company, marketingOptInAccepted });

      if (!marketingOptInAccepted) {
          setError("Marketing opt-in is required to submit your score.");
          setShowSignIn(true); // Keep sign-in open
          return; // Stop processing
      }

      setIsSubmitting(true); // Set submission guard
      setShowSignIn(false); // Hide sign-in form immediately

      // Mock sign-in doesn't actually create a user, so we simulate actions.
      // In a real scenario, you'd call Firebase auth here.

      // Assume sign-in successful. Now handle the score.
      if (userScore !== undefined) {
        console.log('[Leaderboard] Processing score submission after sign-in:', userScore);
        let loadingMsg = showLoadingMessage('Submitting your score...');

        // Use the real submitUserScore function
        const result = await submitUserScore(userScore);
        removeLoadingMessage(loadingMsg);

        if (result.success) {
          console.log('[Leaderboard] Score submission successful after sign-in.');

          // Dispatch event to notify other parts of the app
          const scoreSubmittedEvent = new CustomEvent('scoreSubmitted', {
            detail: { score: userScore, timestamp: new Date(), success: true }
          });
          window.dispatchEvent(scoreSubmittedEvent);

          // Wait briefly for Firebase update
          await new Promise(resolve => setTimeout(resolve, 1500));
          // Fetch leaderboard data using the submitted score
          await fetchLeaderboardData(userScore);

          // Show appropriate message based on whether it was a high score
          if (result.isHighScore) {
            setNotHighScoreMessage(`Congratulations! Your score (${userScore}) is your new personal best and has been submitted!`);
          } else {
            setNotHighScoreMessage(`Your score (${userScore}) has been submitted to the leaderboard!`);
          }
          setShowNotHighScoreMessage(true);
        } else {
          console.error('[Leaderboard] Score submission failed after sign-in:', result.message);
          setError(`Failed to submit score: ${result.message || 'Please try again.'}`);
          await fetchLeaderboardData(); // Fetch generic top 10 on error
        }
      } else {
          // Signed in without a score to submit, just fetch top 10
          await fetchLeaderboardData();
          // No message needed here
      }
    } catch (error) {
      console.error('[Leaderboard] Error during mock sign-in/submission:', error);
      setError('An error occurred during sign-in/submission. Please try again.');
      fetchLeaderboardData(); // Fetch generic top 10 on error
    } finally {
      setIsSubmitting(false); // Release submission guard
    }
  };

  // Handle dismissing the not-high-score message
  const dismissNotHighScoreMessage = () => {
    setShowNotHighScoreMessage(false);
  };

  // Close the leaderboard and re-enable game inputs
  const handleClose = () => {
    // Create and dispatch custom event to re-enable game inputs
    const inputEvent = new CustomEvent('gameInputState', { 
      detail: { inputsDisabled: false, forceReset: true }
    });
    window.dispatchEvent(inputEvent);
    
    // Set global flag to indicate leaderboard is closed
    (window as any).isLeaderboardOpen = false;
    
    // Call the original onClose callback
    onClose();
  };

  // Helper function to reset error and show leaderboard
  const dismissErrorAndShowLeaderboard = async () => {
    try {
      setError(null);
      setShowLeaderboardAfterError(false);
      
      console.log('[Leaderboard] Attempting to fetch leaderboard data after error dismissal');
      // Fetch using the current best score if available, otherwise the userScore, or fallback to generic fetch
      await fetchLeaderboardData(currentBestScoreData?.score ?? userScore ?? undefined);
      console.log('[Leaderboard] Successfully fetched leaderboard data after error dismissal');
    } catch (error) {
      console.error('[Leaderboard] Error fetching leaderboard data after error dismissal:', error);
      setError('Failed to refresh leaderboard data. Please try again.');
      setShowLeaderboardAfterError(true); // Keep error state if fetch fails again
    }
  };

  // Reset component state when receiving a new score or when component is closed
  useEffect(() => {
    // If the component is closed, reset states on next open
    if (!isOpen) {
      setSubmissionComplete(false);
      setSubmittingScore(false);
      // Don't reset submittedScores here to maintain which scores were already submitted
    }
    
    // If user score changes, reset submission states
    return () => {
      if (!isOpen) {
        // Clear submitted scores when component is unmounted to avoid stale data on next game
        setSubmittedScores({});
      }
    };
  }, [isOpen, userScore]);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      // Clear all timeouts and state
      setTopScores([]);
      setUserRank(null);
      setNearbyScores({ above: [], below: [] });
      setLoading(false);
      setError(null);
      setShowSignIn(false);
      setShowNotHighScoreMessage(false);
      setNotHighScoreMessage('');
      setShowLeaderboardAfterError(false);
      setSubmittingScore(false);
      setSubmissionComplete(false);
      
      // Reset global flag
      (window as any).isLeaderboardOpen = false;
      
      console.log('[Leaderboard] Component unmounted, resources cleaned up');
    };
  }, []);

  // Render the leaderboard content with loading state
  const renderLeaderboardContent = () => {
    if (loading && !showSignIn) {
      return (
        <div className="loading-spinner-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <p className="loading-text">Loading leaderboard data...</p>
          <p className="text-sm text-gray-400 mt-2">Retrieving latest scores</p>
        </div>
      );
    }
    
    if (error && !showSignIn) {
      return (
        <div className="error-container flex flex-col items-center justify-center h-full text-red-400">
          <p className="text-xl mb-4">Error:</p>
          <p className="mb-6">{error}</p>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
            onClick={dismissErrorAndShowLeaderboard}
          >
            Try Again
          </button>
        </div>
      );
    }

    // Log entries to help with debugging
    console.log('Current user:', currentUser?.uid);
    console.log('Top scores to render:', topScores);
    
    // Track if we've already found the user's highest score
    let foundHighestUserScore = false;
    
    return (
      <>
        {/* Inject the shimmer animation CSS */}
        <style>{goldenShimmerStyle}</style>
        
        {/* Top Scores Table */}
        <div className="leaderboard-section">
          <h3>TOP 10 SCORES</h3>
          <table className="scores-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Company</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {topScores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="no-scores">No scores available yet</td>
                </tr>
              ) : (
                topScores.map((entry, index) => {
                  // Check if this entry belongs to the current user
                  const isCurrentUser = currentUser && entry.userId === currentUser.uid;
                  
                  // This is the user's highest score if it's their first occurrence in the list
                  // since scores are already sorted in descending order
                  const isHighestUserScore = isCurrentUser && !foundHighestUserScore;
                  
                  // Mark that we've found the highest score for this user
                  if (isHighestUserScore) {
                    foundHighestUserScore = true;
                  }
                  
                  console.log(`Entry ${index}: userId=${entry.userId}, isCurrentUser=${isCurrentUser}, company=${entry.company}`);
                  
                  return (
                    <tr 
                      key={entry.id} 
                      className={`
                        ${isCurrentUser ? "current-user-row" : ""}
                        ${isHighestUserScore ? "golden-shimmer" : ""}
                      `}
                    >
                      <td>#{index + 1}</td>
                      <td>
                        <div className="player-info">
                          {entry.photoURL && (
                            <img 
                              src={entry.photoURL} 
                              alt="" 
                              className="player-avatar"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                console.error("Failed to load leaderboard avatar:", e);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <span>{entry.displayName || 'Anonymous'}</span>
                          {isCurrentUser && (
                            <span className="current-user-badge">YOU</span>
                          )}
                        </div>
                      </td>
                      <td>{entry.company ? entry.company : '-'}</td>
                      <td className="score-value">{entry.score}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Check if the user is already in the top scores list */}
        {(() => {
          const isUserInTopScores = currentUser && topScores.some(entry => entry.userId === currentUser.uid);
          console.log('Is user in top scores?', isUserInTopScores);
          return null;
        })()}
        
        {/* User's Position Section (if not in top 10) */}
        {userScore !== undefined && userRank !== null && userRank > 10 && currentUser && !topScores.some(entry => currentUser && entry.userId === currentUser.uid) && (
          <div className="leaderboard-section user-position mt-8">
            <h3>YOUR POSITION</h3>
            <p className="user-rank">
              Your rank for score {currentBestScoreData?.score && userScore <= currentBestScoreData.score ? currentBestScoreData.score : userScore}: <span>#{userRank}</span>
            </p>
            
            <table className="scores-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Company</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {/* Reset the flag as we're now in a different section */}
                {(() => { foundHighestUserScore = false; return null; })()}
                
                {/* Scores above user */}
                {nearbyScores.above.map((entry, index) => {
                  const isCurrentUser = currentUser && entry.userId === currentUser.uid;
                  
                  return (
                    <tr 
                      key={`above-${entry.id}`}
                      className={isCurrentUser ? "current-user-row" : ""}
                    >
                      <td>#{userRank - nearbyScores.above.length + index}</td>
                      <td>
                        <div className="player-info">
                          {entry.photoURL && (
                            <img 
                              src={entry.photoURL} 
                              alt="" 
                              className="player-avatar"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                console.error("Failed to load leaderboard avatar:", e);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <span>{entry.displayName || 'Anonymous'}</span>
                          {isCurrentUser && (
                            <span className="current-user-badge">YOU</span>
                          )}
                        </div>
                      </td>
                      <td>{entry.company || '-'}</td>
                      <td className="score-value">{entry.score}</td>
                    </tr>
                  );
                })}
                
                {/* User's score row - Ensure it shows the correct score (best or new) */}
                 <tr className={`current-user-row ${currentBestScoreData?.score && userScore > currentBestScoreData.score ? 'golden-shimmer' : ''}`}>
                    <td>#{userRank}</td>
                    <td>
                        <div className="player-info">
                        {currentUser?.photoURL && (
                            <img
                            src={currentUser.photoURL}
                            alt=""
                            className="player-avatar"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                console.error("Failed to load leaderboard avatar:", e);
                                e.currentTarget.style.display = 'none';
                            }}
                            />
                        )}
                        <span>{currentUser?.displayName || 'You'}</span>
                        <span className="current-user-badge">YOU</span>
                        </div>
                    </td>
                    <td>{userData?.company || '-'}</td>
                    {/* Show the score that determined the rank */}
                    <td className="score-value">{currentBestScoreData?.score && userScore <= currentBestScoreData.score ? currentBestScoreData.score : userScore}</td>
                </tr>
                
                {/* Scores below user */}
                {nearbyScores.below.map((entry, index) => {
                  const isCurrentUser = currentUser && entry.userId === currentUser.uid;
                  
                  return (
                    <tr 
                      key={`below-${entry.id}`}
                      className={isCurrentUser ? "current-user-row" : ""}
                    >
                      <td>#{userRank + index + 1}</td>
                      <td>
                        <div className="player-info">
                          {entry.photoURL && (
                            <img 
                              src={entry.photoURL} 
                              alt="" 
                              className="player-avatar"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                console.error("Failed to load leaderboard avatar:", e);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <span>{entry.displayName || 'Anonymous'}</span>
                          {isCurrentUser && (
                            <span className="current-user-badge">YOU</span>
                          )}
                        </div>
                      </td>
                      <td>{entry.company || '-'}</td>
                      <td className="score-value">{entry.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  return (
    <div className={`leaderboard-container ${inGameFrame ? 'in-game-frame' : ''} custom-scrollbar`}>
      <div className="leaderboard-header">
        <h2>GLOBAL LEADERBOARD</h2>
        <div className="leaderboard-controls">
          <button 
            className="refresh-button" 
            onClick={() => fetchLeaderboardData(userScore)}
            disabled={loading}
            aria-label="Refresh leaderboard"
          >
            {loading ? (
              <span className="loading-spinner-small"></span>
            ) : (
              '↻'
            )}
          </button>
          <button 
            className="close-button" 
            onClick={handleClose}
            aria-label="Close leaderboard"
          >
            ×
          </button>
        </div>
      </div>
      
      {/* Show sign-in form if user needs to authenticate */}
      {showSignIn ? (
        <MockSignIn 
          onSuccess={handleMockSignIn} 
          onClose={handleClose}
          score={userScore || 0}
        />
      ) : (
        // Show the main leaderboard content
        renderLeaderboardContent()
      )}

      {/* Display submission status */}
      {submittingScore && (
        <div className="submission-status">
          <div className="spinner"></div>
          <p>Submitting your score...</p>
        </div>
      )}
      
      {/* Show not high score message as overlay */}
      {showNotHighScoreMessage && (
        <div className="not-high-score-overlay">
          <div className="not-high-score-message">
            <p>{notHighScoreMessage}</p>
            <div className="buttons">
              <button onClick={dismissNotHighScoreMessage}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show error as overlay */}
      {showLeaderboardAfterError && (
        <div className="error-container">
          <div className="error-message">{error}</div>
          <button 
            className="retry-button" 
            onClick={dismissErrorAndShowLeaderboard}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;