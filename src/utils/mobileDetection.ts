/**
 * Mobile Detection Utilities
 */

export const isMobileDevice = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for mobile device indicators in user agent
  const isMobileUA = /mobile|android|iphone|ipad|phone|tablet|blackberry|iemobile|opera mini/i.test(userAgent);
  
  // Check if screen is mobile-sized
  const isMobileScreen = window.innerWidth <= 1024;
  
  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Special check for Chrome DevTools - when emulating mobile, certain properties change
  const isDevToolsEmulation = (
    // Chrome DevTools often sets maxTouchPoints when emulating mobile
    navigator.maxTouchPoints > 0 ||
    // Small screen size typical of mobile
    (window.innerWidth <= 932 && window.innerHeight <= 430) ||
    // User agent contains mobile keywords
    isMobileUA
  );
  
  // Return true if any mobile indicator is present
  return isMobileUA || isDevToolsEmulation || (isMobileScreen && hasTouch);
};

export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const getScreenSize = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024
  };
}; 