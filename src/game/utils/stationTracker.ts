/**
 * Station Tracker Utility
 * 
 * This utility provides functions to track which stations are unlocked
 * and allows the Radio component to check if a station (and its associated track)
 * is available to the player.
 */

// LocalStorage key for saving station unlock states
const UNLOCKED_STATIONS_KEY = 'oe-game-unlocked-stations';

// Initialize with the first station (address) always unlocked
const initializeStations = (): void => {
  const existingStations = localStorage.getItem(UNLOCKED_STATIONS_KEY);
  
  if (!existingStations) {
    // Set initial state with first station unlocked
    const initialState = {
      address: true,  // First station - always unlocked
      quantity: false,
      discount: false,
      product: false,
      invoice: false,
      cancel: false
    };
    localStorage.setItem(UNLOCKED_STATIONS_KEY, JSON.stringify(initialState));
    console.log('[StationTracker] Initialized stations:', initialState);
  } else {
    console.log('[StationTracker] Using existing station state:', JSON.parse(existingStations));
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
  const stations = getUnlockedStations();
  const isUnlocked = !!stations[stationType];
  console.log(`[StationTracker] Checking if ${stationType} is unlocked:`, isUnlocked);
  return isUnlocked;
};

// Mark a station as unlocked
const unlockStation = (stationType: string): void => {
  console.log(`[StationTracker] Unlocking station: ${stationType}`);
  const stations = getUnlockedStations();
  stations[stationType] = true;
  localStorage.setItem(UNLOCKED_STATIONS_KEY, JSON.stringify(stations));
  console.log('[StationTracker] Updated station state:', stations);
  
  // Create a custom event to notify any listening components
  const event = new CustomEvent('stationUnlocked', { detail: { stationType } });
  window.dispatchEvent(event);
  console.log('[StationTracker] Dispatched stationUnlocked event for', stationType);
};

// Reset all stations (mainly for testing)
const resetStations = (): void => {
  localStorage.removeItem(UNLOCKED_STATIONS_KEY);
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