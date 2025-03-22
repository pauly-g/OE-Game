import React, { useState, useEffect } from 'react';

interface RadioButtonProps {
  onClick: () => void;
  showRadio: boolean;
  wiggle?: boolean;
}

const RadioButton: React.FC<RadioButtonProps> = ({ onClick, showRadio, wiggle = false }) => {
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
      className={`px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg border-2 border-indigo-500 transition-colors font-pixel text-sm flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] ${isWiggling ? 'animate-wiggle' : ''}`}
      aria-label={showRadio ? "Close Radio" : "Open Radio"}
      title={showRadio ? "Close Radio" : "Open Radio"}
    >
      {showRadio ? 'Close Radio' : 'Warehouse Radio'}
    </button>
  );
};

export default RadioButton; 