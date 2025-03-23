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
import React, { useEffect, useState, useRef } from 'react';
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
  const [notification, setNotification] = useState({
    isVisible: false,
    title: '',
    artist: ''
  });
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [currentScore, setCurrentScore] = useState<number | undefined>(undefined);
  const [leaderboardInGameFrame, setLeaderboardInGameFrame] = useState(true);
  
  const radioRef = useRef<{ playTrack: (trackId: string) => void } | null>(null);
  const { currentUser, submitUserScore, isLoading } = useAuth();

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
          path: ''  // Use empty string instead of '/'
        }
      };

      gameDebugger.info('Initializing game with config', config);
      const newGame = new Phaser.Game(config);
      setGame(newGame);

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

  // Ensure music plays after page load/refresh using the most direct approach possible
  useEffect(() => {
    const playMusic = () => {
      console.log('[App] Direct attempt to force music play');
      
      // Try to use the special forceMusicPlay function if available
      if (typeof (window as any).forceMusicPlay === 'function') {
        console.log('[App] Using global forceMusicPlay function');
        (window as any).forceMusicPlay();
        return;
      }
      
      // Fallback approach if forceMusicPlay is not available
      console.log('[App] Fallback to forcePlayMusic event');
      const playEvent = new CustomEvent('forcePlayMusic', { 
        detail: { source: 'appFallbackMethod' } 
      });
      window.dispatchEvent(playEvent);
    };

    // First try immediate check on component mount
    console.log('[App] App component mounted, trying to force play music');
    
    // Try immediately
    playMusic();
    
    // Also try after slight delays to ensure Radio component is mounted
    setTimeout(playMusic, 500);
    setTimeout(playMusic, 1500);
    setTimeout(playMusic, 3000);
    
    // Also listen for window load event
    window.addEventListener('load', playMusic);
    
    // Use visibility change as another trigger
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[App] Page became visible, trying to play music');
        playMusic();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('load', playMusic);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
                 customEvent.detail?.source || 'unknown');
      
      // Force a complete station reset
      console.log('[App] Forcibly resetting station tracker from App component');
      stationTracker.resetStations();
    };
    
    window.addEventListener('resetStations', handleResetStations);
    
    return () => {
      window.removeEventListener('keydown', handleGameRestart);
      window.removeEventListener('resetStations', handleResetStations);
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

  // Handle leaderboard events from GameOverScene
  useEffect(() => {
    // Check authentication status
    const handleCheckAuth = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { score, sceneInstance } = customEvent.detail;
      
      console.log('[App] Received checkGameAuth event, score:', score);
      setCurrentScore(score);
      
      // Check if the user is authenticated
      const isAuthenticated = !!currentUser;
      let scoreSubmitted = false;
      
      // Auto-submit score if user is authenticated
      if (isAuthenticated && score !== undefined) {
        try {
          const result = await submitUserScore(score);
          scoreSubmitted = !!result;
          console.log('[App] Score submission result:', result);
        } catch (error) {
          console.error('[App] Error submitting score:', error);
        }
      }
      
      // Send authentication status back to the game
      const authResponseEvent = new CustomEvent('gameAuthResponse', {
        detail: {
          isAuthenticated,
          scoreSubmitted
        }
      });
      
      window.dispatchEvent(authResponseEvent);
    };
    
    // Show the leaderboard
    const handleShowLeaderboard = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { score, inGameFrame = true } = customEvent.detail;
      
      console.log('[App] Received showGameLeaderboard event, score:', score, 'inGameFrame:', inGameFrame);
      setCurrentScore(score);
      // Store the inGameFrame preference in state
      setLeaderboardInGameFrame(inGameFrame);
      setShowLeaderboard(true);
      
      // Set global flag for game to check
      (window as any).isLeaderboardOpen = true;
      
      // Dispatch event to notify game scenes that inputs should be disabled
      const inputEvent = new CustomEvent('gameInputState', { 
        detail: { inputsDisabled: true }
      });
      window.dispatchEvent(inputEvent);
    };
    
    window.addEventListener('checkGameAuth', handleCheckAuth);
    window.addEventListener('showGameLeaderboard', handleShowLeaderboard);
    
    return () => {
      window.removeEventListener('checkGameAuth', handleCheckAuth);
      window.removeEventListener('showGameLeaderboard', handleShowLeaderboard);
    };
  }, [currentUser, submitUserScore]);

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
      <h1 className="text-3xl font-bold mb-4 tracking-widest text-blue-400 arcade-font">Order Editing: The Game</h1>
      
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
      </div>

      {/* Button row - Radio component removed from here */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors font-pixel text-sm"
        >
          {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
        </button>
        
        {showDebug && (
          <button
            onClick={downloadLogs}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
          >
            Download Logs
          </button>
        )}
        
        <RadioButton onClick={toggleRadio} showRadio={showRadio} wiggle={radioWiggle} />
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