import React, { useEffect } from 'react';

interface SongNotificationProps {
  title: string;
  artist: string;
  isVisible: boolean;
  onClose: () => void;
  onListen: () => void;
}

const SongNotification: React.FC<SongNotificationProps> = ({ 
  title, 
  artist, 
  isVisible, 
  onClose,
  onListen
}) => {
  // Auto-close the notification after 5 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-5 right-5 bg-indigo-800 text-white p-4 rounded-lg shadow-lg z-50 max-w-xs border-2 border-indigo-600">
      <div className="flex justify-between items-start mb-2">
        <div className="font-pixel text-lg text-indigo-300">New Song Unlocked!</div>
        <button 
          onClick={onClose}
          className="text-indigo-300 hover:text-white"
        >
          ✕
        </button>
      </div>
      <div className="font-bold text-lg">{title}</div>
      <div className="text-indigo-200">{artist}</div>
      <button
        onClick={onListen}
        className="mt-3 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm w-full"
      >
        Listen Now
      </button>
    </div>
  );
};

export default SongNotification; 