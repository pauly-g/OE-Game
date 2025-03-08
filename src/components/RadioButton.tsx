import React from 'react';

interface RadioButtonProps {
  onClick: () => void;
  showRadio: boolean;
}

const RadioButton: React.FC<RadioButtonProps> = ({ onClick, showRadio }) => {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
      aria-label={showRadio ? "Close Radio" : "Open Radio"}
      title={showRadio ? "Close Radio" : "Open Radio"}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h18M6 11h12M9 15h6M12 19V3" />
      </svg>
      {showRadio ? 'Close Radio' : 'Warehouse Radio'}
    </button>
  );
};

export default RadioButton; 