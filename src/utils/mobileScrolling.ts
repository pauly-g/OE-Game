import { isMobileDevice } from './mobileDetection';

export const enableMobileScrolling = (element: HTMLElement | null) => {
  if (!element || !isMobileDevice()) {
    return;
  }

  // Force enable scrolling on mobile devices
  element.style.overflowY = 'auto';
  (element.style as any).webkitOverflowScrolling = 'touch';
  (element.style as any).overscrollBehavior = 'contain';
  element.style.height = 'auto';
  element.style.maxHeight = '80vh'; // Ensure it doesn't take full screen
  
  // Add touch event handlers for better mobile scrolling
  let startY = 0;
  let isScrolling = false;

  const handleTouchStart = (e: TouchEvent) => {
    startY = e.touches[0].clientY;
    isScrolling = false;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isScrolling) {
      const currentY = e.touches[0].clientY;
      const deltaY = Math.abs(currentY - startY);
      
      // If moving more than 5px vertically, consider it scrolling
      if (deltaY > 5) {
        isScrolling = true;
      }
    }
    
    // Only prevent default if we need to, and only for scrolling within bounds
    if (isScrolling) {
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      
      // Allow scrolling within the element bounds
      if (scrollTop > 0 && scrollTop < scrollHeight - clientHeight) {
        e.stopPropagation();
      }
    }
  };

  const handleTouchEnd = () => {
    isScrolling = false;
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchmove', handleTouchMove, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });

  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
  };
};

export const enableMobileScrollingById = (elementId: string) => {
  const element = document.getElementById(elementId);
  return enableMobileScrolling(element);
};

export const enableMobileScrollingByClass = (className: string) => {
  const elements = document.getElementsByClassName(className);
  const cleanupFunctions: (() => void)[] = [];
  
  for (let i = 0; i < elements.length; i++) {
    const cleanup = enableMobileScrolling(elements[i] as HTMLElement);
    if (cleanup) {
      cleanupFunctions.push(cleanup);
    }
  }
  
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
}; 