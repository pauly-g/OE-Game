import React, { useState, useEffect } from 'react';

interface LoadingProgressProps {
  isLoading: boolean;
  progress: number;
  message?: string;
}

const LoadingProgress: React.FC<LoadingProgressProps> = ({ 
  isLoading, 
  progress, 
  message = "Loading Order Editing Game..." 
}) => {
  const [dots, setDots] = useState('');

  // Animate loading dots
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-lg p-8 border-2 border-purple-500 max-w-md w-full mx-4">
        {/* Game Logo/Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-yellow-400 mb-2">
            📦 Order Editing: The Game
          </h1>
          <p className="text-purple-300 text-sm">
            Prepare for warehouse chaos!
          </p>
        </div>

        {/* Loading Message */}
        <div className="text-center mb-4">
          <p className="text-white text-lg">
            {message}{dots}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(5, progress)}%` }}
            >
              <div className="h-full bg-white opacity-30 animate-pulse"></div>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-300 mt-2">
            <span>Loading assets...</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Loading Tips */}
        <div className="text-center">
          <p className="text-purple-300 text-sm">
            💡 Tip: Use arrow keys to move and SPACE to pickup/apply edits!
          </p>
        </div>

        {/* Animated Loading Indicator */}
        <div className="flex justify-center mt-4">
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s'
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingProgress; 