/**
 * Main App Component
 * 
 * Changes:
 * - Initial setup: Basic React component structure
 * - Added Phaser game integration
 * - Implemented game container with styling
 * - Added game instructions
 * - Set up dark theme with Tailwind CSS
 * - Added toggleable instructions menu
 * - Optimized for desktop 16:9 displays
 * - Improved layout to maximize game size without scrolling
 * - Updated UI to overlay on game canvas
 * - Optimized for laptop displays
 * - Fixed game initialization and loading
 * - Added error handling for game creation
 * - Fixed game initialization to prevent double scene creation
 * - Added cleanup on unmount
 * - Fixed asset loading paths
 * - Integrated debug utility for enhanced error logging
 * - Fixed debugger variable name to avoid using reserved keyword
 * - Added Radio component for music playback
 * - Added radio button wiggle and unlock notifications
 * - Added auto-play functionality to play a random background song when the game starts
 * - Added code to stop the background music when playing unlocked songs
 * - Removed debug button and BG music button, using Radio for all music playback
 * - Updated background music to use Chilled, Frantic, and Relaxed songs
 * - Simplified background music autoplay using Radio component's autoplay feature
 * - Added Firebase authentication and leaderboard integration
 * - Updated leaderboard to be a full-screen view with integrated sign-in
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { gameDebugger } from './game/utils/debug';
import { stationTracker } from './game/utils/stationTracker';
import Radio from './components/Radio';
import RadioButton from './components/RadioButton';
import SongNotification from './components/SongNotification';
import Leaderboard from './components/Leaderboard';
import { tracks } from './data/musicData';
import { AuthProvider, useAuth } from './firebase/AuthContext';
import UserProfileCorner from './components/UserProfileCorner';
import Toast from './components/Toast';
import ScorePopup from './components/ScorePopup';
import { MobileControls } from './components/MobileControls';
import { MobileOrientationNotice } from './components/MobileOrientationNotice';
import { startGameSession, handleMarketingConsent, handleGameCompletion, handleHighScore } from './utils/gameHubSpotIntegration';
import { isMobileDevice } from './utils/mobileDetection';
import './styles/main.css';

// Keep track of unseen songs (maintained in memory only, no localStorage changes)
const unseenSongs = new Set();

// Main App component wrapper with AuthProvider
function AppWithAuth() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// App content that uses authentication
function AppContent() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [game, setGame] = useState<Phaser.Game | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [errorLogs, setErrorLogs] = useState<Array<{level: string, message: string, timestamp?: Date, data?: any}>>([]);
  const [showRadio, setShowRadio] = useState(false);
  const [radioWiggle, setRadioWiggle] = useState(false);
  const [newSongCount, setNewSongCount] = useState(0);
  const [notification, setNotification] = useState({
    isVisible: false,
    title: '',
    artist: ''
  });
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [currentScore, setCurrentScore] = useState<number | undefined>(undefined);
  const [leaderboardInGameFrame, setLeaderboardInGameFrame] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    type: 'info',
    message: ''
  });
  const [scorePopup, setScorePopup] = useState({
    isVisible: false,
    type: 'info' as 'success' | 'error' | 'info',
    title: '',
    message: ''
  });
  
  const radioRef = useRef<{ playTrack: (trackId: string) => void } | null>(null);
  // Reference to track which scores have been submitted to prevent duplicates
  const scoreSubmittedRef = useRef<Record<string, boolean>>({});
  
  const { currentUser, submitUserScore, isLoading, userData, getUserBestScore } = useAuth();

  // Create a unique key for score tracking that includes user ID
  const getScoreKey = useCallback((score: number, userId?: string) => {
    return `${userId || 'anonymous'}_${score}_${Date.now()}`;
  }, []);

  // Create a simple key for deduplication (without timestamp)
  const getDeduplicationKey = useCallback((score: number, userId?: string) => {
    return `${userId || 'anonymous'}_${score}`;
  }, []);

  // Reset stations on page load
  useEffect(() => {
    console.log('[App] Resetting stations on page load');
    stationTracker.resetStations();
    
    // Initialize global flag for leaderboard state
    (window as any).isLeaderboardOpen = false;
    
    // Add global debug function
    (window as any).resetStations = () => {
      console.log('[Debug] Manually resetting stations');
      stationTracker.resetStations();
      alert('Stations reset complete!');
    };
    
    return () => {
      // Cleanup
      delete (window as any).resetStations;
    };
  }, []);

  // Clear score tracking when user changes
  useEffect(() => {
    if (currentUser) {
      console.log('[App] User changed, clearing score tracking');
      scoreSubmittedRef.current = {};
    }
  }, [currentUser?.uid]);

  // Enable debug mode
  useEffect(() => {
    gameDebugger.enable();
    
    // Set up interval to refresh logs in UI
    const intervalId = setInterval(() => {
      if (showDebug) {
        setErrorLogs(gameDebugger.getLogs().filter(log => log.level === 'ERROR'));
      }
    }, 1000);
    
    return () => {
      clearInterval(intervalId);
      gameDebugger.disable();
    };
  }, [showDebug]);

  // Listen for station unlock events
  useEffect(() => {
    const handleStationUnlock = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.stationType) {
        const { stationType } = customEvent.detail;
        console.log(`[App] Station unlocked: ${stationType}`);
        
        // Find the track associated with this station
        const unlockedTrack = tracks.find(track => track.stationType === stationType);
        if (unlockedTrack) {
          // Trigger wiggle animation
          setRadioWiggle(true);
          
          // Show notification
          setNotification({
            isVisible: true,
            title: unlockedTrack.title,
            artist: unlockedTrack.artist
          });
          
          // Add to unseen songs and update count
          unseenSongs.add(stationType);
          setNewSongCount(unseenSongs.size);
        }
      }
    };
    
    // Listen for the stationUnlocked event
    window.addEventListener('stationUnlocked', handleStationUnlock);
    
    return () => {
      window.removeEventListener('stationUnlocked', handleStationUnlock);
    };
  }, []);

  // Reset wiggle animation after it plays
  useEffect(() => {
    if (radioWiggle) {
      const timer = setTimeout(() => {
        setRadioWiggle(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [radioWiggle]);

  useEffect(() => {
    // Prevent double initialization
    if (game) return;

    try {
      // Make sure the game container exists
      const gameContainer = document.getElementById('game-container');
      if (!gameContainer) {
        gameDebugger.error('Game container not found!');
        return;
      }

      gameDebugger.info('Game container found, initializing game...');

      // Update asset paths to be relative to public directory
      const config = {
        ...gameConfig,
        parent: 'game-container',
        loader: {
          ...gameConfig.loader,
          path: '/'  // Use '/' to properly separate baseURL from asset paths
        }
      };

      gameDebugger.info('Initializing game with config', config);
      const newGame = new Phaser.Game(config);
      setGame(newGame);
      
      // Don't start session tracking here - wait for actual gameplay to begin
      // startGameSession();

      // Override browser tab pause behavior
      const originalHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
      const originalVisibilityState = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
      
      // Override document.hidden to always return false
      Object.defineProperty(document, 'hidden', {
        get: () => false,
        configurable: true
      });
      
      // Override document.visibilityState to always return 'visible'
      Object.defineProperty(document, 'visibilityState', {
        get: () => 'visible',
        configurable: true
      });
      
      console.log('[App] Overrode document visibility properties to prevent game pause');

      // Add error handler for the game
      window.addEventListener('error', (e) => {
        gameDebugger.error('Game Error:', e);
      });

      return () => {
        if (newGame) {
          gameDebugger.info('Destroying game instance');
          newGame.destroy(true);
          setGame(null);
        }
      };
    } catch (error) {
      gameDebugger.error('Failed to initialize game:', error);
      console.error('Failed to initialize game:', error);
    }
  }, []);

  // Listen for game events to manage background music
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !game) {
        // If space is pressed and game is not initialized, might be a game restart
        window.dispatchEvent(new CustomEvent('gameRestart'));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [game]);

  // Handle game restart with spacebar to ensure both music and stations work
  useEffect(() => {
    const handleGameRestart = (event: KeyboardEvent) => {
      // If leaderboard is open, don't allow space bar to restart the game
      if (showLeaderboard) {
        return;
      }
      
      // Check if we're at the game over screen - this is when space restarts the game
      // We can check if there's a game over message visible in the DOM
      const gameOverMessage = document.querySelector('.game-over-message');
      
      if (event.code === 'Space' && gameOverMessage) {
        console.log('[App] Game restart detected via spacebar at game over screen');
        
        // First dispatch event to reset stations properly
        const stationsEvent = new CustomEvent('gameRestartWithStations', { 
          detail: { requireStationReset: true } 
        });
        console.log('[App] Dispatching gameRestartWithStations event');
        window.dispatchEvent(stationsEvent);
        
        // Then after a small delay, trigger music play
        setTimeout(() => {
          const musicEvent = new CustomEvent('forcePlayMusic', { 
            detail: { source: 'gameRestart' } 
          });
          console.log('[App] Dispatching forcePlayMusic event');
          window.dispatchEvent(musicEvent);
        }, 300);
      }
    };
    
    window.addEventListener('keydown', handleGameRestart);
    
    // Add explicit reset stations event listener for game over restarts
    const handleResetStations = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[App] Received resetStations event, source:', 
                 customEvent.detail?.source || 'unknown', 
                 'complete:', customEvent.detail?.complete || false);
      
      // Force a complete station reset
      console.log('[App] Forcibly resetting station tracker from App component');
      stationTracker.resetStations();
      
      // If complete reset requested, also reset related app state
      if (customEvent.detail?.complete) {
        console.log('[App] Performing complete reset of app state');
        setCurrentScore(undefined);
        setToastMessage({ type: 'info', message: '' });
        
        // Reset UI state if needed
        if (showLeaderboard) {
          console.log('[App] Closing leaderboard due to game reset');
          setShowLeaderboard(false);
        }
        
        // Reset notification state
        setNotification({
          title: '',
          artist: '',
          isVisible: false
        });
      }
    };
    
    // Add new listener for music reset
    const handleResetMusic = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[App] Received resetMusic event, source:', 
                 customEvent.detail?.source || 'unknown');
      
      // Dispatch an event to fully reset the radio component
      const radioResetEvent = new CustomEvent('radioReset', {
        detail: { source: customEvent.detail?.source || 'App' }
      });
      console.log('[App] Dispatching radioReset event to reset Radio component state');
      window.dispatchEvent(radioResetEvent);
      
      // After a short delay, trigger music restart
      setTimeout(() => {
        // Force play the warehouse music as a fallback
        const musicEvent = new CustomEvent('forcePlayMusic', { 
          detail: { 
            source: 'resetMusic',
            trackId: 'warehouse_default' // Default track ID if available
          } 
        });
        console.log('[App] Dispatching forcePlayMusic event after reset');
        window.dispatchEvent(musicEvent);
      }, 200);
    };

    window.addEventListener('resetStations', handleResetStations);
    window.addEventListener('resetMusic', handleResetMusic);

    return () => {
      window.removeEventListener('keydown', handleGameRestart);
      window.removeEventListener('resetStations', handleResetStations);
      window.removeEventListener('resetMusic', handleResetMusic);
    };
  }, [showLeaderboard]);

  // Add debug helpers for music playback and station sync
  useEffect(() => {
    const handleDebugKeydown = (event: KeyboardEvent) => {
      // If leaderboard is open, don't process any keyboard shortcuts
      if ((window as any).isLeaderboardOpen === true) {
        return;
      }
      
      // Special debug keys
      if (event.code === 'KeyM') {
        console.log('[App] DEBUG: Manually triggering music playback with M key');
        const musicEvent = new CustomEvent('forcePlayMusic', { 
          detail: { source: 'manualDebug' } 
        });
        window.dispatchEvent(musicEvent);
      }
      
      if (event.code === 'KeyS') {
        console.log('[App] DEBUG: Manually triggering station reset with S key');
        const stationsEvent = new CustomEvent('gameRestartWithStations', { 
          detail: { requireStationReset: true } 
        });
        window.dispatchEvent(stationsEvent);
      }
    };
    
    window.addEventListener('keydown', handleDebugKeydown);
    
    return () => {
      window.removeEventListener('keydown', handleDebugKeydown);
    };
  }, []);

  // Listen for game events
  useEffect(() => {
    const handleGameRestart = () => {
      // Clear unseen songs when game restarts
      unseenSongs.clear();
      setNewSongCount(0);
    };
    
    window.addEventListener('gameRestart', handleGameRestart);
    
    return () => {
      window.removeEventListener('gameRestart', handleGameRestart);
    };
  }, []);

  // Reset badges when radio is opened
  useEffect(() => {
    if (showRadio && newSongCount > 0) {
      unseenSongs.clear();
      setNewSongCount(0);
    }
  }, [showRadio, newSongCount]);

  // Function to check auth before submitting score
  const handleCheckAuth = async (score: number, checkHighScoreOnly = false) => {
    console.log('[App] handleCheckAuth called with score:', score);
    console.log('[App] Current user authentication status:', !!currentUser);
    console.log('[App] checkHighScoreOnly:', checkHighScoreOnly);
    console.log('[App] Call stack:', new Error().stack?.split('\n').slice(0, 10).join('\n'));
    
    // Add global deduplication to prevent concurrent calls for the same score/user combination  
    const processingKey = `${score}-${currentUser?.uid}-${checkHighScoreOnly}`;
    console.log(`[App] 🔍 DEDUPLICATION CHECK:`);
    console.log(`[App] Generated processing key: "${processingKey}"`);
    console.log(`[App] Current window.processingScore: "${(window as any).processingScore}"`);
    console.log(`[App] Keys match: ${(window as any).processingScore === processingKey}`);
    
    if ((window as any).processingScore === processingKey) {
      console.log(`[App] ❌ DUPLICATE CALL DETECTED - skipping`);
      console.log(`[App] Call stack:`, new Error().stack);
      return;
    }
    
    console.log(`[App] ✅ NEW CALL - setting processing key`);
    (window as any).processingScore = processingKey;
    
    // Validate score - ensure it's a non-negative number (0 is valid)
    if (score === undefined || score === null || isNaN(score) || score < 0) {
      console.error(`[App] Invalid score value: ${score}. Score must be a non-negative number.`);
      // Clear processing flag
      (window as any).processingScore = null;
      return;
    }
    
    // Check if this score has already been submitted
    if (scoreSubmittedRef.current[getScoreKey(score, currentUser?.uid)]) {
      console.log(`[App] Score ${score} already submitted, preventing duplicate submission`);
      // Clear processing flag
      (window as any).processingScore = null;
      return;
    }
    
    // Clean up old score submissions - keep only recent scores to prevent memory leaks
    // This helps ensure the scoreSubmittedRef doesn't grow indefinitely
    const scoreKeys = Object.keys(scoreSubmittedRef.current);
    if (scoreKeys.length > 10) { // Only keep the 10 most recent scores
      // Sort numerically and take the oldest ones
      const oldestScores = scoreKeys
        .map(Number)
        .sort((a, b) => a - b)
        .slice(0, scoreKeys.length - 10);
      
      // Remove the oldest scores from the tracking object
      oldestScores.forEach(oldScore => {
        delete scoreSubmittedRef.current[oldScore];
      });
      
      console.log(`[App] Cleaned up ${oldestScores.length} old score entries from tracking`);
    }
    
    try {
      // If user is authenticated with company and marketing consent, check if score is a high score before submitting
      if (currentUser && userData && userData.company && userData.marketingOptIn) {
        console.log('[App] User authenticated, checking if high score');
        
        // Check if this score was already submitted to Firebase
        const scoreKey = getScoreKey(score, currentUser?.uid);
        const alreadySubmittedToFirebase = scoreSubmittedRef.current[scoreKey];
        
        if (!alreadySubmittedToFirebase) {
          // Mark this score as being processed only if we're actually submitting
          scoreSubmittedRef.current[scoreKey] = true;
        }
        
        if (checkHighScoreOnly) {
          // Get user's best score to compare
          try {
            const bestScore = await getUserBestScore();
            
            console.log('[App] HIGH SCORE COMPARISON:', {
              currentScore: score,
              bestScore: bestScore?.score,
              bestScoreExists: !!bestScore,
              isHigher: !bestScore || score > bestScore.score,
              willSubmit: !bestScore || score > bestScore.score
            });
            
            // Only submit if it's a new high score
            if (!bestScore || score > bestScore.score) {
              console.log('[App] New high score! Submitting to leaderboard');
              
              // Only actually submit if we haven't already submitted this score
              if (!alreadySubmittedToFirebase) {
                const result = await submitUserScore(score);
                console.log('[App] High score submission result:', result);
                
                // Send high score data to HubSpot
                if (result.success && currentUser?.email) {
                  console.log('[App] Sending high score to HubSpot');
                  // Use pending marketing consent if available, otherwise fall back to userData
                  const marketingConsent = (window as any).pendingMarketingConsent !== undefined 
                    ? (window as any).pendingMarketingConsent 
                    : userData?.marketingOptIn || false;
                  console.log('[App] Using marketing consent:', marketingConsent);
                  
                  handleHighScore(
                    currentUser.email,
                    score,
                    marketingConsent
                  ).catch(error => {
                    console.error('[App] Failed to send high score to HubSpot:', error);
                  });
                  
                  // Clear the pending marketing consent after use
                  (window as any).pendingMarketingConsent = undefined;
                }
                
                // Don't show popup - leaderboard will handle all score messages
                console.log('[App] Score submission completed, leaderboard will handle messaging');
                
                // Notify the leaderboard that a score was just submitted
                // This will trigger a refresh of the leaderboard data
                const scoreSubmittedEvent = new CustomEvent('scoreSubmitted', {
                  detail: { 
                    score: score,
                    timestamp: new Date(),
                    success: result.success,
                    isHighScore: result.isHighScore,
                    message: result.message
                  }
                });
                console.log('[App] Dispatching scoreSubmitted event:', scoreSubmittedEvent.detail);
                window.dispatchEvent(scoreSubmittedEvent);
                
                // Wait a short time for Firebase to update
                await new Promise(resolve => setTimeout(resolve, 500));
              } else {
                console.log('[App] High score already submitted, just showing success message');
                // Still show the success message even if already submitted
                const scoreSubmittedEvent = new CustomEvent('scoreSubmitted', {
                  detail: { 
                    score: score,
                    timestamp: new Date(),
                    success: true,
                    isHighScore: true,
                    message: `🎉 Congratulations! New high score: ${score}!`
                  }
                });
                console.log('[App] Dispatching high score message event:', scoreSubmittedEvent.detail);
                window.dispatchEvent(scoreSubmittedEvent);
              }
            } else {
              console.log('[App] Not a high score, creating failure event for leaderboard');
              console.log('[App] Current score:', score, 'Best score:', bestScore?.score);
              
              // Send game completion data to HubSpot (even if not high score)
              if (currentUser?.email) {
                console.log('[App] Sending game completion to HubSpot');
                // Use pending marketing consent if available, otherwise fall back to userData
                const marketingConsent = (window as any).pendingMarketingConsent !== undefined 
                  ? (window as any).pendingMarketingConsent 
                  : userData?.marketingOptIn || false;
                console.log('[App] Using marketing consent for game completion:', marketingConsent);
                
                handleGameCompletion(
                  currentUser.email,
                  score,
                  marketingConsent
                ).catch(error => {
                  console.error('[App] Failed to send game completion to HubSpot:', error);
                });
                
                // Clear the pending marketing consent after use
                (window as any).pendingMarketingConsent = undefined;
              }
              
              // Only mark as submitted if we haven't already marked it
              if (!alreadySubmittedToFirebase) {
                scoreSubmittedRef.current[getScoreKey(score, currentUser?.uid)] = true;
              }
              
              console.log('[App] Showing not-high-score message');
              
              // Dispatch event so leaderboard can show "not a high score" message
              const message = `Sorry, your score of ${score} is not higher than your previous best score of ${bestScore?.score || 'unknown'}. Try again!`;
              const eventDetail = { 
                score: score,
                timestamp: new Date(),
                success: false,
                isHighScore: false,
                message: message
              };
              const scoreSubmittedEvent = new CustomEvent('scoreSubmitted', {
                detail: eventDetail
              });
              console.log('[App] *** DISPATCHING NOT-HIGH-SCORE EVENT ***');
              console.log('[App] Event detail:', JSON.stringify(eventDetail, null, 2));
              console.log('[App] Processing key was:', (window as any).processingScore);
              console.log('[App] Current timestamp:', new Date().toISOString());
              console.log('[App] About to dispatch event...');
              window.dispatchEvent(scoreSubmittedEvent);
              console.log('[App] Event dispatched successfully');
            }
          } catch (error) {
            console.error('[App] Error checking high score:', error);
            // If error occurs during check, just try to submit the score
            const result = await submitUserScore(score);
            console.log('[App] Score submission result after error:', result);
            
            // Don't show popup - leaderboard will handle all score messages
            console.log('[App] Score submission after error completed, leaderboard will handle messaging');
            
            // Notify about submission
            const scoreSubmittedEvent = new CustomEvent('scoreSubmitted', {
              detail: { 
                score: score,
                timestamp: new Date(),
                success: result.success,
                isHighScore: result.isHighScore,
                message: result.message
              }
            });
            window.dispatchEvent(scoreSubmittedEvent);
          }
        } else {
          // Direct submission (not checking high score)
          console.log('[App] Direct score submission requested');
          const result = await submitUserScore(score);
          console.log('[App] Score submission result:', result);
          
          // Don't show popup - leaderboard will handle all score messages
          console.log('[App] Direct score submission completed, leaderboard will handle messaging');
          
          // Notify about submission
          const scoreSubmittedEvent = new CustomEvent('scoreSubmitted', {
            detail: { 
              score: score,
              timestamp: new Date(),
              success: result.success,
              isHighScore: result.isHighScore,
              message: result.message
            }
          });
          window.dispatchEvent(scoreSubmittedEvent);
        }
      } else {
        // Not logged in, we'll check high score after they sign in
        console.log('[App] User not authenticated, score will be checked after sign-in');
        // Store the score so it can be submitted after authentication
        setCurrentScore(score);
        // Show sign-in form if not authenticated
        setShowAuth(true);
      }
    } catch (error) {
      console.error('[App] Error in handleCheckAuth:', error);
      // Keep critical error notification for unexpected errors
      setToastMessage({
        type: 'error',
        message: 'An unexpected error occurred when submitting your score'
      });
    } finally {
      // Clear processing flag immediately after event dispatch
      console.log(`[App] 🧹 CLEARING processing key: "${(window as any).processingScore}"`);
      (window as any).processingScore = null;
      console.log(`[App] Processing key cleared`);
    }
  };

  // Handle game over event
  const handleGameOver = useCallback((score: number) => {
    console.log('[App] Game over with score:', score);
    setCurrentScore(score);
    
    // The game over dialog is implemented in GameOverScene
    // Score submission is handled in handleCheckAuth
  }, [setCurrentScore]);

  // Handle score submission from GameOverScene
  const handleSubmitScore = useCallback((score: number, checkHighScoreOnly = false) => {
    console.log('[App] User requested to submit score:', score);
    handleCheckAuth(score, checkHighScoreOnly);
  }, [handleCheckAuth]);

  // Centralized Logic Handler: Runs when the component opens with a score
  useEffect(() => {
    // Handle authentication status check from GameOverScene
    const handleAuthStatusCheck = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { score } = customEvent.detail;
      
      console.log('[App] Received authStatusCheck event, score:', score);
      
      // Always record the score
      handleGameOver(score);
      
      // Check if score was already submitted to prevent duplicate submissions
      if (scoreSubmittedRef.current[getScoreKey(score, currentUser?.uid)]) {
        console.log(`[App] Score ${score} already submitted, preventing duplicate submission`);
        return;
      }
      
      // Only proceed with submission if the user is fully authenticated AND has company AND accepted marketing
      if (currentUser && userData && userData.company && userData.marketingOptIn) {
        console.log('[App] User is fully authenticated with company and marketing consent, checking if high score');
        // Check if high score and submit if it is
        handleSubmitScore(score, true); // true = check if high score first
      } else {
        console.log('[App] User not fully ready for submission (missing auth/company/marketing), waiting for leaderboard view');
        // Just store the score for later use after authentication/company/marketing setup
        setCurrentScore(score);
      }
    };
    
    // Handle game over - check if high score and submit if it is
    const handleGameOverEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { score, checkHighScoreOnly } = customEvent.detail;
      
      console.log('[App] Received checkGameAuth event, score:', score);
      
      // Check if score was already submitted to prevent duplicate submissions
      if (scoreSubmittedRef.current[getScoreKey(score, currentUser?.uid)]) {
        console.log(`[App] Score ${score} already submitted, preventing duplicate submission`);
        return;
      }
      
      // Record the score
      handleGameOver(score);
      
      // If user is fully authenticated with company and marketing consent, proceed with submission
      if (currentUser && userData && userData.company && userData.marketingOptIn) {
        // Check if high score and submit if it is
        handleSubmitScore(score, checkHighScoreOnly || false);
      } else {
        // Just store the score for later
        setCurrentScore(score);
      }
    };
    
    // Handle showing the leaderboard
    const handleShowLeaderboard = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[App] Received showGameLeaderboard event', customEvent.detail);
      
      // Debounce rapid clicks - only allow one leaderboard open per 1 second
      const now = Date.now();
      const lastOpen = (window as any).lastLeaderboardOpen || 0;
      const timeSinceLastOpen = now - lastOpen;
      
      if (lastOpen !== 0 && timeSinceLastOpen < 1000) {
        console.log('[App] Debouncing rapid leaderboard open request, time since last:', timeSinceLastOpen);
        return;
      }
      
      console.log('[App] Allowing leaderboard open, time since last:', timeSinceLastOpen);
      (window as any).lastLeaderboardOpen = now;
      
      // Extract score and submission flag from event if available
      let eventScore: number | undefined;
      let submittingScore = false;
      
      if (customEvent.detail) {
        if (customEvent.detail.score !== undefined) {
          eventScore = customEvent.detail.score;
          setCurrentScore(eventScore);
        }
        
        // Extract submission flag if present
        if (customEvent.detail.submittingScore !== undefined) {
          submittingScore = customEvent.detail.submittingScore;
        }
      }
      
      // Always set leaderboard state to open, regardless of submission status
      console.log('[App] Showing leaderboard');
      setShowLeaderboard(true);
      (window as any).isLeaderboardOpen = true;
      
      // Check authentication status
      if (!currentUser) {
        console.log('[App] User not authenticated, will show sign-in form');
        setShowAuth(true);
      } else if (currentUser && userData && userData.company && userData.marketingOptIn && eventScore !== undefined) {
        // User is fully authenticated and we have a score - check if it should be submitted
        console.log('[App] User is authenticated, checking if score should be submitted:', eventScore);
        
        // Check if score was already submitted to prevent duplicate submissions
        const deduplicationKey = getDeduplicationKey(eventScore, currentUser?.uid);
        console.log('[App] Checking if score already submitted:', {
          score: eventScore,
          userId: currentUser?.uid,
          deduplicationKey,
          alreadySubmitted: scoreSubmittedRef.current[deduplicationKey]
        });
        
        if (!scoreSubmittedRef.current[deduplicationKey]) {
          console.log('[App] Score not yet submitted, marking as submitted to prevent duplicates');
          
          // Mark as submitted immediately to prevent duplicate calls
          scoreSubmittedRef.current[deduplicationKey] = true;
          
          console.log('[App] Score marked as submitted, proceeding with submission');
          
          // Add a small delay to ensure leaderboard is open and listening for events
          setTimeout(() => {
            handleSubmitScore(eventScore, true); // true = check if high score first
          }, 100);
        } else {
          console.log('[App] Score already submitted, skipping duplicate submission check');
        }
      }
      
      // Send an event to notify the Leaderboard component that it's been opened
      const leaderboardEvent = new CustomEvent('leaderboardOpen', { 
        detail: { 
          score: eventScore,
          submittingScore: submittingScore,
          checkSubmissionStatus: true,
          requireAuth: !currentUser // Flag to indicate auth is required
        } 
      });
      window.dispatchEvent(leaderboardEvent);
    };
    
    // Handle user sign-in completion from leaderboard
    // Handle actual game start for session tracking
    const handleGameplayStart = (event: Event) => {
      console.log('[App] Actual gameplay started - beginning session tracking');
      startGameSession();
    };

    const handleUserSignedIn = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { score, name, company, marketingOptInAccepted } = customEvent.detail;
      
      console.log('[App] User signed in from leaderboard, submitting score:', score, 'Marketing consent:', marketingOptInAccepted);
      
      // Check if score was already submitted to prevent duplicate submissions
      if (scoreSubmittedRef.current[getScoreKey(score, currentUser?.uid)]) {
        console.log(`[App] Score ${score} already submitted, preventing duplicate submission`);
        return;
      }
      
      // Store the marketing consent for use in score submission
      (window as any).pendingMarketingConsent = marketingOptInAccepted;
      
      try {
        // Send marketing consent to HubSpot if accepted and wait for completion
        if (marketingOptInAccepted && currentUser?.email) {
          console.log('[App] Sending marketing consent to HubSpot and waiting for completion...');
          await handleMarketingConsent(
            currentUser.email,
            name || currentUser.displayName?.split(' ')[0],
            name ? name.split(' ').slice(1).join(' ') : currentUser.displayName?.split(' ').slice(1).join(' '),
            company,
            true
          );
          console.log('[App] Marketing consent successfully sent to HubSpot');
        }
        
        // Add a small delay to ensure Firebase user data is fully updated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Submit the score now that user has signed in and marketing consent is processed
        if (score !== undefined) {
          console.log('[App] Now submitting score after marketing consent processing...');
          handleSubmitScore(score, true); // true = check if high score first
        }
      } catch (error) {
        console.error('[App] Error during user sign-in process:', error);
        // Still try to submit the score even if marketing consent fails
        if (score !== undefined) {
          console.log('[App] Submitting score despite marketing consent error...');
          handleSubmitScore(score, true);
        }
      }
    };

    window.addEventListener('authStatusCheck', handleAuthStatusCheck);
    window.addEventListener('checkGameAuth', handleGameOverEvent);
    window.addEventListener('showGameLeaderboard', handleShowLeaderboard);
    window.addEventListener('userSignedIn', handleUserSignedIn);
    window.addEventListener('gameplayStarted', handleGameplayStart);
    
    return () => {
      window.removeEventListener('authStatusCheck', handleAuthStatusCheck);
      window.removeEventListener('checkGameAuth', handleGameOverEvent);
      window.removeEventListener('showGameLeaderboard', handleShowLeaderboard);
      window.removeEventListener('userSignedIn', handleUserSignedIn);
      window.removeEventListener('gameplayStarted', handleGameplayStart);
    };
  }, [handleGameOver, handleSubmitScore, setCurrentScore, setShowLeaderboard, currentUser, userData, setShowAuth]);

  const downloadLogs = () => {
    gameDebugger.downloadLogs();
  };

  const toggleRadio = () => {
    setShowRadio(!showRadio);
  };

  const closeNotification = () => {
    setNotification(prev => ({...prev, isVisible: false}));
  };

  const handleListenNow = () => {
    // Find the track to play by title
    const trackTitle = notification.title;
    console.log(`[App] Looking for track to play: "${trackTitle}"`);
    
    // Debug - check if first_song is unlocked in stationTracker
    console.log('[App] DEBUG - Checking stationTracker status:');
    stationTracker.logUnlockedStations();
    
    // Find the track to play by title
    const trackToPlay = tracks.find(track => {
      return track.title.toLowerCase() === trackTitle.toLowerCase();
    });
    
    if (trackToPlay) {
      console.log(`[App] Found track to play: ${trackToPlay.title} (ID: ${trackToPlay.id}, Type: ${trackToPlay.stationType})`);
      
      // Check if this track is unlocked explicitly
      const isUnlocked = stationTracker.isStationUnlocked(trackToPlay.stationType);
      console.log(`[App] Is track ${trackToPlay.title} with type ${trackToPlay.stationType} unlocked: ${isUnlocked}`);
      
      // Call the direct function on the Radio component if it's available
      if (radioRef.current) {
        console.log(`[App] Calling direct playTrack function on Radio component`);
        radioRef.current.playTrack(trackToPlay.id);
      } else {
        console.error('[App] Radio component reference is not available');
      }
    } else {
      console.error(`[App] Could not find track with title: "${trackTitle}"`);
      console.log('Available tracks:', tracks.map(t => `"${t.title}"`).join(', '));
    }
    
    // Close the notification
    closeNotification();
  };

  // Handle closing the leaderboard - make sure we return focus to the game
  const handleCloseLeaderboard = () => {
    setShowLeaderboard(false);
    
    // Set global flag for game to check
    (window as any).isLeaderboardOpen = false;
    
    // Dispatch event to notify game scenes that inputs should be enabled
    // Use a short timeout to ensure the event is processed after the state changes
    setTimeout(() => {
      const inputEvent = new CustomEvent('gameInputState', { 
        detail: { inputsDisabled: false }
      });
      window.dispatchEvent(inputEvent);
      
      // Force a second event after a brief delay to ensure it's received
      setTimeout(() => {
        const secondEvent = new CustomEvent('gameInputState', { 
          detail: { inputsDisabled: false, forceReset: true }
        });
        window.dispatchEvent(secondEvent);
      }, 100);
    }, 50);
    
    // Return focus to the game container
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-start p-4">
      {/* Mobile Orientation Notice - shows on mobile portrait mode */}
      <MobileOrientationNotice />
      
      <div className="w-full max-w-6xl flex justify-center items-center mb-4 relative">
        {!isMobileDevice() && (
          <h1 className="text-3xl font-bold tracking-widest text-blue-400 arcade-font text-center">Order Editing: The Game</h1>
        )}
        <div className={`absolute ${isMobileDevice() ? 'right-0 top-0 z-50' : 'right-0 top-0'}`}>
          <UserProfileCorner />
        </div>
      </div>
      
      {/* Toast notifications */}
      {toastMessage.message && (
        <Toast 
          message={toastMessage.message}
          type={toastMessage.type as 'success' | 'error' | 'info'}
          onClose={() => setToastMessage({ type: 'info', message: '' })}
        />
      )}
      
      {/* Score popup notifications */}
      <ScorePopup
        isVisible={scorePopup.isVisible}
        type={scorePopup.type}
        title={scorePopup.title}
        message={scorePopup.message}
        onClose={() => setScorePopup({ isVisible: false, type: 'info', title: '', message: '' })}
      />
      
      {/* Game container at full size regardless of radio player status */}
      <div id="game-container" className="w-full max-w-6xl aspect-video bg-gray-800 rounded-lg shadow-lg overflow-hidden relative">
        {!game && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Leaderboard component positioned within the game container */}
        {showLeaderboard && (
          <div className="absolute inset-0 z-50">
            <Leaderboard 
              isOpen={showLeaderboard} 
              onClose={handleCloseLeaderboard}
              userScore={currentScore}
              inGameFrame={true}
            />
          </div>
        )}
        
        {/* Mobile Controls - only visible on mobile devices */}
        <MobileControls isVisible={game !== null && !showLeaderboard} />
      </div>

      {/* Button row - hide desktop instructions on mobile, center radio button */}
      <div className={`mt-4 flex gap-2 ${isMobileDevice() ? 'justify-center w-full px-2' : ''}`}>
        {!isMobileDevice() && (
          <div className="bg-[rgba(23,29,40,0.9)] rounded-[30px] px-4 py-2 flex items-center gap-6 font-pixel text-sm">
            <div className="flex items-center gap-2">
              <span>Move</span>
              <div className="flex gap-1">
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5L5 12H19L12 5Z" fill="white"/>
                  </svg>
                </div>
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 19L5 12H19L12 19Z" fill="white"/>
                  </svg>
                </div>
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12L12 5L12 19L5 12Z" fill="white"/>
                  </svg>
                </div>
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 12L12 5L12 19L19 12Z" fill="white"/>
                  </svg>
                </div>
              </div>
            </div>
            <div className="h-6 w-[1px] bg-white/20"></div>
            <div className="flex items-center gap-2">
              <span>Grab/Edit</span>
              <div 
                className="relative min-w-[44px] h-6 bg-white/15 border-2 border-white/80 rounded-md cursor-pointer flex items-center justify-center px-2"
                onClick={() => {
                  setShowInstructions(!showInstructions);
                }}
              >
                <div className="text-xs text-white">SPACE</div>
              </div>
            </div>
          </div>
        )}
        
        <div className={`${isMobileDevice() ? 'w-full flex justify-center' : ''}`}>
          <RadioButton 
            onClick={toggleRadio} 
            showRadio={showRadio} 
            wiggle={radioWiggle}
            newSongCount={newSongCount}
          />
        </div>
        
        {showDebug && (
          <button
            onClick={downloadLogs}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
          >
            Download Logs
          </button>
        )}
      </div>
      
      {/* Radio component in its own container outside the button row */}
      <div className="w-full max-w-6xl mt-2">
        <Radio 
          isOpen={showRadio} 
          onClose={() => setShowRadio(false)} 
          ref={radioRef}
          autoplay={true}
        />
      </div>
      
      {/* Song unlock notification */}
      <SongNotification 
        title={notification.title}
        artist={notification.artist}
        isVisible={notification.isVisible}
        onClose={closeNotification}
        onListen={handleListenNow}
      />
      
      {/* Instructions placed below the game without affecting its size */}
      <div className="w-full max-w-6xl">
        {showInstructions && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-bold mb-2">How to Play:</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Use arrow keys to move your character</li>
              <li>Press SPACE to pick up and drop edits</li>
              <li>Collect edits from stations and apply them to orders on the conveyor belt</li>
              <li>Complete orders to score points</li>
              <li>You have 3 lives - don't let too many orders fail!</li>
              <li>New stations unlock after every 5 successful edits</li>
            </ul>
          </div>
        )}
      </div>
      
      {showDebug && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg max-w-6xl w-full max-h-60 overflow-auto">
          <h2 className="text-xl font-bold mb-2">Error Logs:</h2>
          {errorLogs.length === 0 ? (
            <p className="text-green-400">No errors detected 👍</p>
          ) : (
            <ul className="list-none space-y-2 text-red-400">
              {errorLogs.map((log, index) => (
                <li key={index} className="border-b border-gray-700 pb-1">
                  <span className="font-mono">[{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'unknown'}]</span> {log.message}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-gray-400">Press Ctrl+D to download all logs at any time</p>
        </div>
      )}
    </div>
  );
}

// Export the wrapped component
export default AppWithAuth;