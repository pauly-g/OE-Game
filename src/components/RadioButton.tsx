import React from 'react';

interface RadioButtonProps {
  onClick: () => void;
  showRadio: boolean;
}

const RadioButton: React.FC<RadioButtonProps> = ({ onClick, showRadio }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg z-40"
      aria-label={showRadio ? "Close Radio" : "Open Radio"}
      title={showRadio ? "Close Radio" : "Open Radio"}
    >
      {/* Radio icon */}
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2"></circle>
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path>
      </svg>
    </button>
  );
};

export default RadioButton; 