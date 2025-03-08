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
  }
};

// Get the current unlock state of all stations
const getUnlockedStations = (): Record<string, boolean> => {
  initializeStations();
  const stationsJSON = localStorage.getItem(UNLOCKED_STATIONS_KEY);
  return stationsJSON ? JSON.parse(stationsJSON) : {};
};

// Check if a specific station type is unlocked
const isStationUnlocked = (stationType: string): boolean => {
  const stations = getUnlockedStations();
  return !!stations[stationType];
};

// Mark a station as unlocked
const unlockStation = (stationType: string): void => {
  const stations = getUnlockedStations();
  stations[stationType] = true;
  localStorage.setItem(UNLOCKED_STATIONS_KEY, JSON.stringify(stations));
  
  // Create a custom event to notify any listening components
  const event = new CustomEvent('stationUnlocked', { detail: { stationType } });
  window.dispatchEvent(event);
};

// Reset all stations (mainly for testing)
const resetStations = (): void => {
  localStorage.removeItem(UNLOCKED_STATIONS_KEY);
  initializeStations();
};

export const stationTracker = {
  initializeStations,
  getUnlockedStations,
  isStationUnlocked,
  unlockStation,
  resetStations
}; 