import React, { useEffect, useState, useRef } from 'react';
import { isMobileDevice, isTouchDevice } from '../utils/mobileDetection';
import './MobileControls.css';

interface MobileControlsProps {
  isVisible?: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ isVisible = true }) => {
  const [showControls, setShowControls] = useState(false);
  const [activeDirection, setActiveDirection] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  
  // Refs for continuous input
  const directionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDirectionPressedRef = useRef(false);

  useEffect(() => {
    // Only show controls on mobile devices and Chrome DevTools mobile emulation
    const checkMobile = () => {
      const isMobile = isMobileDevice();
      const shouldShow = isMobile && isVisible;
      setShowControls(shouldShow);
    };
    
    checkMobile();
    
    return () => {
      if (directionIntervalRef.current) {
        clearInterval(directionIntervalRef.current);
      }
    };
  }, [isVisible]);

  // Send keyboard events to the game
  const simulateKeyEvent = (key: string, type: 'keydown' | 'keyup') => {
    const event = new KeyboardEvent(type, {
      key: key,
      code: key,
      keyCode: getKeyCode(key),
      which: getKeyCode(key),
      bubbles: true,
      cancelable: true
    });
    
    document.dispatchEvent(event);
  };

  const getKeyCode = (key: string): number => {
    const keyCodes: { [key: string]: number } = {
      'ArrowUp': 38,
      'ArrowDown': 40,
      'ArrowLeft': 37,
      'ArrowRight': 39,
      ' ': 32, // Space
      'KeyD': 68,
      'KeyC': 67,
      'KeyF': 70
    };
    return keyCodes[key] || 0;
  };

  // Direction pad handlers
  const handleDirectionStart = (direction: string) => {
    if (isDirectionPressedRef.current) return;
    
    setActiveDirection(direction);
    isDirectionPressedRef.current = true;
    
    const key = `Arrow${direction}`;
    simulateKeyEvent(key, 'keydown');
    
    // Start continuous input for smooth movement
    directionIntervalRef.current = setInterval(() => {
      simulateKeyEvent(key, 'keydown');
    }, 16); // ~60fps
  };

  const handleDirectionEnd = () => {
    if (!isDirectionPressedRef.current) return;
    
    if (directionIntervalRef.current) {
      clearInterval(directionIntervalRef.current);
      directionIntervalRef.current = null;
    }
    
    if (activeDirection) {
      const key = `Arrow${activeDirection}`;
      simulateKeyEvent(key, 'keyup');
    }
    
    setActiveDirection(null);
    isDirectionPressedRef.current = false;
  };

  // Action button handlers
  const handleActionPress = (action: string) => {
    setActiveAction(action);
    let key = '';
    
    switch (action) {
      case 'pickup':
        key = ' '; // Space
        break;
      case 'powerup':
        key = 'KeyD';
        break;
      case 'cheat':
        key = 'KeyC';
        break;
      case 'unlock':
        key = 'KeyF';
        break;
    }
    
    if (key) {
      simulateKeyEvent(key, 'keydown');
      setTimeout(() => {
        simulateKeyEvent(key, 'keyup');
        setActiveAction(null);
      }, 100);
    }
  };

  // Radio control handlers
  const handleRadioAction = (action: string) => {
    switch (action) {
      case 'toggle':
        // Dispatch custom event to toggle radio
        const toggleEvent = new CustomEvent('mobileRadioToggle');
        window.dispatchEvent(toggleEvent);
        break;
      case 'next':
        const nextEvent = new CustomEvent('mobileRadioNext');
        window.dispatchEvent(nextEvent);
        break;
      case 'prev':
        const prevEvent = new CustomEvent('mobileRadioPrev');
        window.dispatchEvent(prevEvent);
        break;
    }
  };

  if (!showControls) return null;

  return (
    <div className="mobile-controls-overlay">
      {/* Movement Controls - Left side */}
      <div className="mobile-controls-left">
        <div className="direction-pad">
          <div className="d-pad-center">
            {/* Up */}
            <button 
              className={`d-pad-btn d-pad-up ${activeDirection === 'Up' ? 'active' : ''}`}
              onTouchStart={(e) => { e.preventDefault(); handleDirectionStart('Up'); }}
              onTouchEnd={(e) => { e.preventDefault(); handleDirectionEnd(); }}
              onMouseDown={(e) => { e.preventDefault(); handleDirectionStart('Up'); }}
              onMouseUp={(e) => { e.preventDefault(); handleDirectionEnd(); }}
              onMouseLeave={(e) => { e.preventDefault(); handleDirectionEnd(); }}
            >
              ▲
            </button>
            
            {/* Left */}
            <button 
              className={`d-pad-btn d-pad-left ${activeDirection === 'Left' ? 'active' : ''}`}
              onTouchStart={(e) => { e.preventDefault(); handleDirectionStart('Left'); }}
              onTouchEnd={(e) => { e.preventDefault(); handleDirectionEnd(); }}
              onMouseDown={(e) => { e.preventDefault(); handleDirectionStart('Left'); }}
              onMouseUp={(e) => { e.preventDefault(); handleDirectionEnd(); }}
              onMouseLeave={(e) => { e.preventDefault(); handleDirectionEnd(); }}
            >
              ◀
            </button>
            
            {/* Right */}
            <button 
              className={`d-pad-btn d-pad-right ${activeDirection === 'Right' ? 'active' : ''}`}
              onTouchStart={(e) => { e.preventDefault(); handleDirectionStart('Right'); }}
              onTouchEnd={(e) => { e.preventDefault(); handleDirectionEnd(); }}
              onMouseDown={(e) => { e.preventDefault(); handleDirectionStart('Right'); }}
              onMouseUp={(e) => { e.preventDefault(); handleDirectionEnd(); }}
              onMouseLeave={(e) => { e.preventDefault(); handleDirectionEnd(); }}
            >
              ▶
            </button>
            
            {/* Down */}
            <button 
              className={`d-pad-btn d-pad-down ${activeDirection === 'Down' ? 'active' : ''}`}
              onTouchStart={(e) => { e.preventDefault(); handleDirectionStart('Down'); }}
              onTouchEnd={(e) => { e.preventDefault(); handleDirectionEnd(); }}
              onMouseDown={(e) => { e.preventDefault(); handleDirectionStart('Down'); }}
              onMouseUp={(e) => { e.preventDefault(); handleDirectionEnd(); }}
              onMouseLeave={(e) => { e.preventDefault(); handleDirectionEnd(); }}
            >
              ▼
            </button>
          </div>
        </div>
        
        <div className="control-label">MOVE</div>
      </div>

      {/* Action Controls - Right side */}
      <div className="mobile-controls-right">
        <div className="action-buttons">
          <button 
            className={`action-btn pickup-btn ${activeAction === 'pickup' ? 'active' : ''}`}
            onTouchStart={(e) => { e.preventDefault(); handleActionPress('pickup'); }}
            onMouseDown={(e) => { e.preventDefault(); handleActionPress('pickup'); }}
          >
            <span>SPACE</span>
            <small>Pickup/Apply</small>
          </button>
        </div>
        
        <div className="control-label">ACTION</div>
      </div>

      {/* Debug controls (hidden by default) */}
      <div className="mobile-controls-debug" style={{ display: 'none' }}>
        <button 
          className="debug-btn"
          onTouchStart={(e) => { e.preventDefault(); handleActionPress('cheat'); }}
          onMouseDown={(e) => { e.preventDefault(); handleActionPress('cheat'); }}
        >
          C
        </button>
        
        <button 
          className="debug-btn"
          onTouchStart={(e) => { e.preventDefault(); handleActionPress('unlock'); }}
          onMouseDown={(e) => { e.preventDefault(); handleActionPress('unlock'); }}
        >
          F
        </button>
      </div>
    </div>
  );
}; 