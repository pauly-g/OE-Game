import React, { useEffect, useState } from 'react';

type ToastProps = {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose?: () => void;
  duration?: number;
};

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  onClose, 
  duration = 5000 
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }

    setVisible(true);
    
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message || !visible) return null;

  // Check if this is a "not a high score" message to use retro styling
  const isNotHighScoreMessage = message.includes("not a new high score") || 
                               message.includes("not a new personal best") ||
                               message.includes("not submitted (not a high");

  // For "not a high score" messages, use retro styling in center of screen
  if (isNotHighScoreMessage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-gray-900 border-4 border-blue-500 p-6 rounded-lg text-center max-w-md">
          <div className="w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 mb-4" />
          
          <h2 className="text-yellow-400 text-2xl mb-4 font-pixel tracking-wider">SCORE RESULT</h2>
          
          <p className="text-white font-pixel mb-6 leading-relaxed tracking-wide">
            {message.replace("Score not submitted", "").replace("Sorry, your", "Your")}
          </p>
          
          <div className="w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 mt-2 mb-4" />
          
          <button 
            onClick={() => {
              setVisible(false);
              if (onClose) onClose();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-pixel tracking-wider"
          >
            CONTINUE
          </button>
        </div>
      </div>
    );
  }

  // For other messages, use the standard toast at the top
  // Define color based on type
  const backgroundColor = type === 'success' 
    ? 'bg-green-500' 
    : type === 'error' 
      ? 'bg-red-500' 
      : 'bg-blue-500';

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded shadow-lg ${backgroundColor} text-white min-w-[300px] text-center`}>
      <div className="flex items-center justify-between">
        <span className="font-medium">{message}</span>
        <button 
          onClick={() => {
            setVisible(false);
            if (onClose) onClose();
          }}
          className="ml-4 text-white focus:outline-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast; 