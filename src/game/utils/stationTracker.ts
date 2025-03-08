/**
 * Station Tracker Utility
 * 
 * This utility provides functions to track which stations are unlocked
 * and allows the Radio component to check if a station (and its associated track)
 * is available to the player.
 */

// LocalStorage key for saving station unlock states
const UNLOCKED_STATIONS_KEY = 'oe-game-unlocked-stations';
const RESET_TRACKER_KEY = 'oe-game-tracker-reset';

// Initialize the set of unlocked stations
const initializeStations = (): void => {
  // Check if we've done a reset during this page load
  const hasReset = localStorage.getItem(RESET_TRACKER_KEY);
  
  if (!hasReset) {
    // If this is a fresh page load, explicitly reset all stations first
    localStorage.removeItem(UNLOCKED_STATIONS_KEY);
    console.log('[StationTracker] Fresh page load - resetting all stations');
    
    // Mark that we've done the reset this session
    localStorage.setItem(RESET_TRACKER_KEY, Date.now().toString());
  }

  // Now initialize with only the first station unlocked
  const existingStations = localStorage.getItem(UNLOCKED_STATIONS_KEY);
  if (!existingStations) {
    const initial = {
      address: false, // Changed to false - address station should start locked
      quantity: false,
      discount: false,
      product: false,
      invoice: false,
      cancel: false
    };
    localStorage.setItem(UNLOCKED_STATIONS_KEY, JSON.stringify(initial));
    console.log('[StationTracker] Initialized all stations as locked');
  }
};

// Get the current unlock state of all stations
const getUnlockedStations = (): Record<string, boolean> => {
  initializeStations();
  const stationsJSON = localStorage.getItem(UNLOCKED_STATIONS_KEY);
  const stations = stationsJSON ? JSON.parse(stationsJSON) : {};
  return stations;
};

// Check if a specific station type is unlocked
const isStationUnlocked = (stationType: string): boolean => {
  // Always unlock warehouse station
  if (stationType === 'warehouse') {
    return true;
  }
  
  // For all other stations, check the unlocked status
  const stations = getUnlockedStations();
  const isUnlocked = !!stations[stationType];
  console.log(`[StationTracker] Checking if ${stationType} is unlocked:`, isUnlocked);
  return isUnlocked;
};

// Mark a station as unlocked
const unlockStation = (stationType: string): void => {
  console.log(`[StationTracker] Unlocking station: ${stationType}`);
  const stations = getUnlockedStations();
  
  // Check if already unlocked
  if (stations[stationType] === true) {
    console.log(`[StationTracker] Station ${stationType} already unlocked`);
    return;
  }
  
  // Update the state
  stations[stationType] = true;
  localStorage.setItem(UNLOCKED_STATIONS_KEY, JSON.stringify(stations));
  console.log('[StationTracker] Updated station state:', stations);
  
  // Create a custom event to notify any listening components
  try {
    const eventDetail = { stationType, timestamp: Date.now() };
    const event = new CustomEvent('stationUnlocked', { 
      detail: eventDetail,
      bubbles: true  // Make sure event bubbles up
    });
    
    console.log('[StationTracker] Dispatching event with detail:', eventDetail);
    window.dispatchEvent(event);
    console.log('[StationTracker] Event dispatched');
    
    // Trigger a storage event for cross-component communication
    const tempKey = 'oe-game-last-unlock';
    localStorage.setItem(tempKey, `${stationType}:${Date.now()}`);
    
    // Also update a timestamp to ensure the event is noticed
    localStorage.setItem('oe-game-unlock-timestamp', Date.now().toString());
    
    console.log(`[StationTracker] Additional storage events triggered for ${stationType}`);
  } catch (error) {
    console.error('[StationTracker] Error dispatching event:', error);
  }
};

// Reset all stations (mainly for testing)
const resetStations = (): void => {
  localStorage.removeItem(UNLOCKED_STATIONS_KEY);
  // Also clear the reset tracker so next page load will trigger a reset
  localStorage.removeItem(RESET_TRACKER_KEY);
  console.log('[StationTracker] Reset all stations');
  initializeStations();
};

// Force unlock a station (for testing)
const forceUnlock = (stationType: string): void => {
  console.log(`[StationTracker] Force unlocking station: ${stationType}`);
  unlockStation(stationType);
};

// Debug: List all unlocked stations
const logUnlockedStations = (): Record<string, boolean> => {
  const stations = getUnlockedStations();
  console.log('[StationTracker] Current unlocked stations:', stations);
  return stations;
};

export const stationTracker = {
  initializeStations,
  getUnlockedStations,
  isStationUnlocked,
  unlockStation,
  resetStations,
  forceUnlock,
  logUnlockedStations
}; 