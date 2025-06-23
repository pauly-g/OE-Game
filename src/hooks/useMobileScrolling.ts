import { useState, useRef, useCallback } from 'react';
import { isMobileDevice } from '../utils/mobileDetection';

export const useMobileScrolling = (containerHeight: number = 500) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const touchStartY = useRef<number>(0);
  const lastScrollTop = useRef<number>(0);
  const isMobile = isMobileDevice();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    touchStartY.current = e.touches[0].clientY;
    lastScrollTop.current = scrollTop;
  }, [isMobile, scrollTop]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    // Don't call preventDefault() - it causes errors with passive listeners
    
    const touch = e.touches[0];
    const deltaY = touchStartY.current - touch.clientY;
    
    // Calculate max scroll - ensure we can scroll to see all content
    const maxScroll = Math.max(0, contentHeight - containerHeight + 150); // Increased buffer to 150px
    const newScrollTop = Math.max(0, Math.min(maxScroll, lastScrollTop.current + deltaY));
    
    // Debug logging
    if (Math.abs(deltaY) > 5) { // Only log when there's significant movement
      console.log('Mobile scroll:', {
        contentHeight,
        containerHeight,
        maxScroll,
        currentScroll: newScrollTop,
        deltaY
      });
    }
    
    setScrollTop(newScrollTop);
  }, [isMobile, contentHeight, containerHeight]);

  const handleTouchEnd = useCallback(() => {
    // Optional: Add momentum scrolling here if needed
  }, []);

  const setContentHeightCallback = useCallback((height: number) => {
    console.log('Setting content height:', height);
    setContentHeight(height);
  }, []);

  const resetScroll = useCallback(() => {
    setScrollTop(0);
  }, []);

  return {
    scrollTop,
    isMobile,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    setContentHeight: setContentHeightCallback,
    resetScroll,
  };
}; 