import React, { useEffect, useState } from 'react';
import { isMobileDevice, isTouchDevice } from '../utils/mobileDetection';
import './MobileOrientationNotice.css';

export const MobileOrientationNotice: React.FC = () => {
  const [showNotice, setShowNotice] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = isMobileDevice();
      const isPortraitMode = window.innerHeight > window.innerWidth;
      
      setIsPortrait(isPortraitMode);
      // Only show on actual mobile devices
      setShowNotice(isMobile && isPortraitMode);
    };

    checkOrientation();
    // Only listen for orientation change on mobile devices
    if (isMobileDevice()) {
      window.addEventListener('orientationchange', () => {
        // Delay to allow orientation change to complete
        setTimeout(checkOrientation, 100);
      });
    }

    return () => {
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!showNotice) return null;

  return (
    <div className="mobile-orientation-notice">
      <div className="orientation-content">
        <div className="phone-icon">
          📱 → 📱
        </div>
        <h3>Better Experience in Landscape!</h3>
        <p>
          For the best gaming experience, please rotate your device to landscape mode.
        </p>
        <div className="rotation-hint">
          <div className="arrow">↻</div>
          <span>Rotate your device</span>
        </div>
        <button 
          className="continue-anyway-btn"
          onClick={() => setShowNotice(false)}
        >
          Continue in Portrait
        </button>
      </div>
    </div>
  );
}; 