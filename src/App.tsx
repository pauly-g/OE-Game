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
 */
import React, { useEffect, useState, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { gameDebugger } from './game/utils/debug';
import { stationTracker } from './game/utils/stationTracker';
import Radio from './components/Radio';
import RadioButton from './components/RadioButton';
import SongNotification from './components/SongNotification';
import { tracks } from './data/musicData';

function App() {
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
  const radioRef = useRef<{ playTrack: (trackId: string) => void } | null>(null);

  // Reset stations on page load
  useEffect(() => {
    console.log('[App] Resetting stations on page load');
    stationTracker.resetStations();
    
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

  // Auto-play a random background song when the game starts
  useEffect(() => {
    // Find all background songs
    const backgroundSongs = tracks.filter(track => track.stationType === 'warehouse');
    if (backgroundSongs.length > 0) {
      // Select a random background song
      const randomIndex = Math.floor(Math.random() * backgroundSongs.length);
      const songToPlay = backgroundSongs[randomIndex];
      
      console.log(`[App] Auto-playing background song: ${songToPlay.title}`);
      
      // Use the radio component to play the background music with a longer delay to ensure it's ready
      setTimeout(() => {
        if (radioRef.current) {
          try {
            console.log('[App] Attempting to play background music:', songToPlay.title);
            radioRef.current.playTrack(songToPlay.id);
            console.log('[App] Background music started through radio component');
          } catch (error) {
            console.error('[App] Error playing background music:', error);
          }
        } else {
          console.warn('[App] Radio reference not available for autoplay');
        }
      }, 2000); // Increase delay to 2 seconds to ensure component is fully mounted
    } else {
      console.warn('[App] No background songs found for autoplay');
    }
  }, []);

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
  }, []); // Remove game from dependencies

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

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-start p-4">
      <h1 className="text-3xl font-bold mb-4 tracking-widest text-blue-400 arcade-font">Order Editing: The Game</h1>
      
      {/* Game container at full size regardless of radio player status */}
      <div id="game-container" className="w-full max-w-6xl aspect-video bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {!game && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
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

      {/* Song unlock notification */}
      <SongNotification 
        title={notification.title}
        artist={notification.artist}
        isVisible={notification.isVisible}
        onClose={closeNotification}
        onListen={handleListenNow}
      />
      
      {/* Instructions and Radio are placed below the game without affecting its size */}
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
        
        {/* Radio player (initially hidden) */}
        <Radio 
          isOpen={showRadio} 
          onClose={() => setShowRadio(false)} 
          ref={radioRef} 
        />
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

export default App;