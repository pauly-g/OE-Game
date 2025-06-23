import React, { useEffect, useState } from 'react';
import { isMobileDevice, isTouchDevice } from '../utils/mobileDetection';
import './MobileGameOverControls.css';

interface MobileGameOverControlsProps {
  isVisible?: boolean;
}

export const MobileGameOverControls: React.FC<MobileGameOverControlsProps> = ({ isVisible = true }) => {
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    // Only show controls on mobile devices
    const checkMobile = () => {
      const isMobile = isMobileDevice() || isTouchDevice();
      setShowControls(isMobile && isVisible);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [isVisible]);

  // Send keyboard events to the game
  const simulateKeyEvent = (key: string, type: 'keydown' | 'keyup') => {
    const event = new KeyboardEvent(type, {
      key: key,
      code: key,
      keyCode: key === ' ' ? 32 : 0,
      which: key === ' ' ? 32 : 0,
      bubbles: true,
      cancelable: true
    });
    
    document.dispatchEvent(event);
  };

  const handleRestart = () => {
    simulateKeyEvent(' ', 'keydown');
    setTimeout(() => {
      simulateKeyEvent(' ', 'keyup');
    }, 100);
  };

  if (!showControls) return null;

  return (
    <div className="mobile-gameover-controls">
      <button 
        className="mobile-restart-btn"
        onTouchStart={(e) => { e.preventDefault(); handleRestart(); }}
        onMouseDown={(e) => { e.preventDefault(); handleRestart(); }}
      >
        <span>🔄</span>
        <div>RESTART GAME</div>
      </button>
    </div>
  );
}; 