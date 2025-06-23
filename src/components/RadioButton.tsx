import React, { useState, useEffect } from 'react';

interface RadioButtonProps {
  onClick: () => void;
  showRadio: boolean;
  wiggle?: boolean;
  newSongCount?: number;
}

const RadioButton: React.FC<RadioButtonProps> = ({ 
  onClick, 
  showRadio, 
  wiggle = false,
  newSongCount = 0
}) => {
  const [isWiggling, setIsWiggling] = useState(false);
  
  useEffect(() => {
    if (wiggle) {
      setIsWiggling(true);
      const timer = setTimeout(() => {
        setIsWiggling(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [wiggle]);

  return (
    <button
      onClick={onClick}
      className={`px-2 py-2 sm:px-4 sm:py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg border-2 border-indigo-500 transition-colors font-pixel text-xs sm:text-sm flex items-center gap-1 sm:gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] ${isWiggling ? 'animate-wiggle' : ''} relative min-w-0 whitespace-nowrap min-h-[44px] max-w-full`}
      aria-label={showRadio ? "Close Radio" : "Open Radio"}
      title={showRadio ? "Close Radio" : "Open Radio"}
    >
      <span className="truncate block w-full text-center leading-tight">
        {showRadio ? (
          <span className="block">
            <span className="sm:hidden">Close</span>
            <span className="hidden sm:inline">Close Radio</span>
          </span>
        ) : (
          <span className="block">
            <span className="sm:hidden text-[10px] leading-tight">OE Radio</span>
            <span className="hidden sm:inline">Order Editing Radio</span>
          </span>
        )}
      </span>
      
      {/* Badge for new songs */}
      {newSongCount > 0 && !showRadio && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {newSongCount}
        </span>
      )}
    </button>
  );
};

export default RadioButton; 