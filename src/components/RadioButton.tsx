import React from 'react';

interface RadioButtonProps {
  onClick: () => void;
  showRadio: boolean;
}

const RadioButton: React.FC<RadioButtonProps> = ({ onClick, showRadio }) => {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 
        ${showRadio ? 'bg-indigo-600' : 'bg-indigo-500 hover:bg-indigo-600'} 
        text-white 
        rounded-lg 
        transition-colors
        font-pixel
        border-2 border-indigo-300
        shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]
        active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]
        active:translate-y-[2px]
        active:translate-x-[2px]
        flex items-center gap-2
      `}
      aria-label={showRadio ? "Close Radio" : "Open Radio"}
      title={showRadio ? "Close Radio" : "Open Radio"}
    >
      {/* 8-bit radio icon */}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="bevel">
        <rect x="2" y="8" width="20" height="12" rx="2" />
        <path d="M8 12h.01" />
        <path d="M12 12h.01" />
        <path d="M16 12h.01" />
        <path d="M6 19v3" />
        <path d="M18 19v3" />
        <rect x="6" y="3" width="12" height="5" rx="1" />
      </svg>
      {showRadio ? 'Close Radio' : 'Warehouse Radio'}
    </button>
  );
};

export default RadioButton; 