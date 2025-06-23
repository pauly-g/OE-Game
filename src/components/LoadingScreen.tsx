import React, { useState, useEffect } from 'react';
import NetworkTroubleshooter from './NetworkTroubleshooter';
import './LoadingScreen.css';

interface LoadingScreenProps {
  isVisible: boolean;
  onLoadComplete?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isVisible, onLoadComplete }) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing game...');
  const [showTips, setShowTips] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [showNetworkTroubleshooter, setShowNetworkTroubleshooter] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const tips = [
    "Use arrow keys to move around the warehouse",
    "Press SPACE to grab and drop items",
    "Complete orders to unlock new radio stations",
    "Each station has different music genres",
    "Perfect edits give bonus points!",
    "Don't let too many orders fail - you only have 3 lives",
    "New stations unlock every 5 successful edits"
  ];

  useEffect(() => {
    if (!isVisible) return;

    // Show tips after 2 seconds
    const tipTimer = setTimeout(() => {
      setShowTips(true);
    }, 2000);

    // Cycle through tips
    const tipInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 3000);

    // Listen for Phaser loading events
    const handleLoadProgress = (event: CustomEvent) => {
      const { progress: loadProgress, text } = event.detail;
      setProgress(Math.round(loadProgress * 100));
      if (text) setLoadingText(text);
    };

    const handleLoadComplete = () => {
      setProgress(100);
      setLoadingText('Game ready!');
      setTimeout(() => {
        onLoadComplete?.();
      }, 500);
    };

    window.addEventListener('gameLoadProgress', handleLoadProgress as EventListener);
    window.addEventListener('gameLoadComplete', handleLoadComplete);

    // Simulate initial progress
    let simulatedProgress = 0;
    const progressInterval = setInterval(() => {
      simulatedProgress += Math.random() * 15;
      if (simulatedProgress > 90) {
        simulatedProgress = 90; // Stop at 90% until real loading completes
        clearInterval(progressInterval);
      }
      setProgress(Math.round(simulatedProgress));
    }, 200);

    // Set up timeout for loading issues
    const timeoutTimer = setTimeout(() => {
      if (progress < 100) {
        setLoadingTimeout(true);
        setLoadingText('Loading is taking longer than expected...');
      }
    }, 15000); // 15 seconds timeout

    // Show network troubleshooter after extended timeout
    const networkTimer = setTimeout(() => {
      if (progress < 100) {
        setShowNetworkTroubleshooter(true);
      }
    }, 30000); // 30 seconds timeout

    return () => {
      clearTimeout(tipTimer);
      clearInterval(tipInterval);
      clearInterval(progressInterval);
      clearTimeout(timeoutTimer);
      clearTimeout(networkTimer);
      window.removeEventListener('gameLoadProgress', handleLoadProgress as EventListener);
      window.removeEventListener('gameLoadComplete', handleLoadComplete);
    };
  }, [isVisible, onLoadComplete]);

  if (!isVisible) return null;

  return (
    <div className="loading-screen">
      <div className="loading-content">
        {/* Game Logo/Title */}
        <div className="game-title">
          <h1>Order Editing</h1>
          <h2>The Game</h2>
        </div>

        {/* Loading Progress */}
        <div className="loading-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-text">
            {progress}% - {loadingText}
          </div>
        </div>

        {/* Loading Animation */}
        <div className="loading-animation">
          <div className="warehouse-icon">📦</div>
          <div className="conveyor-belt">
            <div className="belt-item belt-item-1">📋</div>
            <div className="belt-item belt-item-2">✏️</div>
            <div className="belt-item belt-item-3">📋</div>
          </div>
        </div>

        {/* Tips Section */}
        {showTips && (
          <div className="loading-tips">
            <div className="tip-icon">💡</div>
            <div className="tip-text">
              {tips[currentTip]}
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="connection-status">
          <div className={`status-indicator ${loadingTimeout ? 'warning' : 'online'}`}>
            <div className="status-dot"></div>
            <span>
              {loadingTimeout ? 'Connection may be slow or blocked' : 'Game assets loading...'}
            </span>
          </div>
          {loadingTimeout && (
            <button
              onClick={() => setShowNetworkTroubleshooter(true)}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
            >
              Need Help?
            </button>
          )}
        </div>
      </div>
      
      {/* Network Troubleshooter */}
      <NetworkTroubleshooter 
        isVisible={showNetworkTroubleshooter}
        onClose={() => setShowNetworkTroubleshooter(false)}
      />
    </div>
  );
};

export default LoadingScreen; 