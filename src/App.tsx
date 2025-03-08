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
 */
import React, { useEffect, useState } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { gameDebugger } from './game/utils/debug';
import Radio from './components/Radio';
import RadioButton from './components/RadioButton';

function App() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [game, setGame] = useState<Phaser.Game | null>(null);
  const [errorLogs, setErrorLogs] = useState<Array<{level: string, message: string, timestamp?: Date, data?: any}>>([]);
  const [showRadio, setShowRadio] = useState(false);

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

  const toggleDebug = () => {
    setShowDebug(!showDebug);
    if (!showDebug) {
      setErrorLogs(gameDebugger.getLogs().filter(log => log.level === 'ERROR'));
    }
  };

  const downloadLogs = () => {
    gameDebugger.downloadLogs();
  };

  const toggleRadio = () => {
    setShowRadio(!showRadio);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4 tracking-widest text-blue-400 arcade-font">Order Editing: The Game</h1>
      
      <div id="game-container" className="relative w-full max-w-6xl aspect-video bg-gray-800 rounded-lg shadow-lg overflow-hidden">
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
        
        <RadioButton onClick={toggleRadio} showRadio={showRadio} />
      </div>

      {showInstructions && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg max-w-2xl">
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
      
      {/* Always render the Radio component, but toggle its isOpen prop */}
      <Radio isOpen={showRadio} onClose={() => setShowRadio(false)} />
      
      {showDebug && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg max-w-2xl w-full max-h-60 overflow-auto">
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