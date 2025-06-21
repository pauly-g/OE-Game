import React from 'react';

interface ScorePopupProps {
  isVisible: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

const ScorePopup: React.FC<ScorePopupProps> = ({ 
  isVisible, 
  type, 
  title, 
  message, 
  onClose 
}) => {
  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          borderColor: '#10B981', // green-500
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          titleColor: '#10B981',
          iconColor: '#10B981',
          icon: '🎉'
        };
      case 'error':
        return {
          borderColor: '#EF4444', // red-500
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          titleColor: '#EF4444',
          iconColor: '#EF4444',
          icon: '😔'
        };
      case 'info':
        return {
          borderColor: '#3B82F6', // blue-500
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          titleColor: '#3B82F6',
          iconColor: '#3B82F6',
          icon: 'ℹ️'
        };
      default:
        return {
          borderColor: '#6B7280', // gray-500
          backgroundColor: 'rgba(107, 114, 128, 0.1)',
          titleColor: '#6B7280',
          iconColor: '#6B7280',
          icon: 'ℹ️'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div 
        className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border-2 shadow-2xl"
        style={{ 
          borderColor: styles.borderColor,
          backgroundColor: styles.backgroundColor 
        }}
      >
        <div className="flex items-center justify-center mb-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
            style={{ 
              backgroundColor: styles.backgroundColor,
              border: `2px solid ${styles.borderColor}` 
            }}
          >
            {styles.icon}
          </div>
        </div>
        
        <h3 
          className="text-xl font-bold text-center mb-3"
          style={{ color: styles.titleColor }}
        >
          {title}
        </h3>
        
        <p className="text-white text-center mb-6 leading-relaxed">
          {message}
        </p>
        
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: styles.borderColor,
              color: 'white'
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScorePopup; 