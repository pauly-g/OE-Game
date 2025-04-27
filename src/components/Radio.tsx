import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom';
import { tracks, Track } from '../data/musicData';
import { stationTracker } from '../game/utils/stationTracker';
import './Radio.css';

// Create a global audio state to persist across component remounts
interface GlobalAudioState {
  currentTrackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
}

// Initialize global state
const globalAudioState: GlobalAudioState = {
  currentTrackId: null,
  isPlaying: false,
  currentTime: 0,
  volume: 1.0
};

// Create a global audio element that persists outside of React's lifecycle
let globalAudio: HTMLAudioElement | null = null;

interface RadioProps {
  isOpen: boolean;
  onClose: () => void;
  autoplay?: boolean;  // Add ability to autoplay on mount
}

// Export the type for the ref
export interface RadioHandle {
  playTrack: (trackId: string) => void;
}

// Convert to use forwardRef
export const Radio = forwardRef<RadioHandle, RadioProps>(({ isOpen, onClose, autoplay = false }, ref) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [volume, setVolume] = useState(1.0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'lyrics' | 'playlist'>('playlist');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const trackChangeListenerRef = useRef<(() => void) | null>(null);
  
  // Keep track of game container for mini-player
  const [gameContainer, setGameContainer] = useState<HTMLElement | null>(null);
  
  // Initialize global audio element if it doesn't exist
  useEffect(() => {
    console.log('[Radio] Initializing audio element, global audio exists?', globalAudio ? 'YES' : 'NO');
    
    if (!globalAudio) {
      console.log('[Radio] Creating new global audio element');
      globalAudio = new Audio();
      globalAudio.volume = 1.0; // Maximum volume
      
      // Test audio creation
      if (globalAudio) {
        console.log('[Radio] Successfully created global audio element');
      } else {
        console.error('[Radio] Failed to create global audio element');
      }
    }
    
    // Set up the audio reference
    audioRef.current = globalAudio;
    console.log('[Radio] Audio reference set, current ref:', audioRef.current);
    
    // Set up current track based on global state
    updateCurrentTrackFromGlobal();
    
    // Try playing a test sound to ensure audio is working
    const testAudio = () => {
      if (audioRef.current) {
        console.log('[Radio] Testing audio capabilities...');
        const originalSrc = audioRef.current.src;
        const originalVolume = audioRef.current.volume;
        
        try {
          // Save current state
          // Use full volume for test to ensure we can hear it
          audioRef.current.volume = 1.0; 
          
          // Play a short audio to check if audio works
          const playPromise = audioRef.current.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('[Radio] Audio test successful - browser allows playback');
                
                // Stop the test after a moment
                setTimeout(() => {
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.volume = originalVolume;
                    console.log('[Radio] Audio test complete');
                  }
                }, 50);
              })
              .catch(error => {
                // This is normal - browsers require user interaction before playing audio
                console.log('[Radio] Audio test expected error (browser requires user interaction):', error);
              });
          }
        } catch (error) {
          console.error('[Radio] Error testing audio:', error);
        }
      }
    };
    
    // Check audio capabilities
    testAudio();
    
    // Set up track change listener
    const handleTrackEnded = () => {
      console.log('[Radio] Track ended, finding next track');
      
      // Get only unlocked tracks
      const unlockedTracks = tracks.filter(t => stationTracker.isStationUnlocked(t.stationType));
      
      if (unlockedTracks.length === 0) {
        console.log('[Radio] No unlocked tracks available');
        return;
      }
      
      // Find next track
      if (globalAudioState.currentTrackId) {
        const currentIndex = unlockedTracks.findIndex(t => t.id === globalAudioState.currentTrackId);
        const nextIndex = (currentIndex + 1) % unlockedTracks.length;
        
        // Get the next track
        const nextTrack = unlockedTracks[nextIndex];
        console.log('[Radio] Playing next track:', nextTrack.title);
        
        // Update global state
        globalAudioState.currentTrackId = nextTrack.id;
        if (globalAudio) {
          globalAudio.src = nextTrack.src;
          globalAudio.play().catch(console.error);
          globalAudioState.isPlaying = true;
        }
        
        // Update component state
        setCurrentTrack(nextTrack);
        setIsPlaying(true);
        setProgress(0);
        setCurrentTime(0);
      }
    };
    
    // Add event listener for track ended
    if (globalAudio) {
      globalAudio.addEventListener('ended', handleTrackEnded);
      trackChangeListenerRef.current = handleTrackEnded;
    }
    
    // Clean up on unmount
    return () => {
      if (globalAudio && trackChangeListenerRef.current) {
        globalAudio.removeEventListener('ended', trackChangeListenerRef.current);
      }
      
      // Save current state when component unmounts
      if (currentTrack) {
        globalAudioState.currentTrackId = currentTrack.id;
      }
      globalAudioState.isPlaying = isPlaying;
      globalAudioState.volume = volume;
      if (audioRef.current) {
        globalAudioState.currentTime = audioRef.current.currentTime;
      }
    };
  }, []);
  
  // Add a dedicated audio start function with retry capability
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelays = [100, 500, 1000, 2000, 3000]; // Exponential backoff
    
    const forceMusicPlay = () => {
      console.log('[Radio] CRITICAL: Force music play attempt #' + (retryCount + 1));
      
      // Check if audio is already playing
      const isAudioPlaying = globalAudio && 
        !globalAudio.paused && 
        globalAudio.currentTime > 0 && 
        !globalAudio.ended &&
        globalAudio.src !== '';
    
      if (isAudioPlaying) {
        console.log('[Radio] Audio already playing, canceling force play attempt');
        return true; // Success - already playing
      }
      
      // Find warehouse songs (the three we want)
      const warehouseSongs = tracks.filter(track => 
        track.stationType === 'warehouse' && 
        ['Chilled', 'Frantic', 'Relaxed'].includes(track.title)
      );
      
      if (warehouseSongs.length === 0) {
        console.error('[Radio] No warehouse songs found, cannot autoplay');
        return false;
      }
      
      // Select a random song
      const randomIndex = Math.floor(Math.random() * warehouseSongs.length);
      const songToPlay = warehouseSongs[randomIndex];
      
      console.log(`[Radio] Attempting to force play: ${songToPlay.title}`);
      
      // Stop any current playback
      if (globalAudio && !globalAudio.paused) {
        console.log('[Radio] Stopping current audio before force play');
        globalAudio.pause();
        globalAudio.currentTime = 0;
      }
      
      // Create a new audio element if needed
      if (!globalAudio) {
        console.log('[Radio] Creating new global audio element for force play');
        globalAudio = new Audio();
        audioRef.current = globalAudio;
      }
      
      try {
        // Prepare the audio
        globalAudio.src = songToPlay.src;
        globalAudio.volume = 1.0;
        globalAudio.load();
        
        // Update state
        globalAudioState.currentTrackId = songToPlay.id;
        setCurrentTrack(songToPlay);
        
        // Try to play immediately
        const playPromise = globalAudio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('[Radio] Force play successful!');
              setIsPlaying(true);
              globalAudioState.isPlaying = true;
              
              // Mark success in localStorage for debugging
              try {
                localStorage.setItem('musicAutoplaySuccess', 'true');
                localStorage.setItem('musicAutoplayTime', new Date().toString());
                localStorage.setItem('musicAutoplaySong', songToPlay.title);
              } catch (e) {
                console.error('[Radio] Error writing to localStorage:', e);
              }
              
              // Dispatch event to notify other components that radio is playing
              try {
                console.log('[Radio] Dispatching radioPlayStarted event from forcePlayMusic');
                const radioEvent = new CustomEvent('radioPlayStarted', {
                  detail: { trackId: songToPlay.id, title: songToPlay.title }
                });
                window.dispatchEvent(radioEvent);
              } catch (error) {
                console.error('[Radio] Error dispatching radioPlayStarted event:', error);
              }
              
              return true;
            })
            .catch(error => {
              console.error('[Radio] Force play attempt failed:', error);
              
              // Schedule retry if we haven't exceeded max retries
              if (retryCount < maxRetries) {
                const delay = retryDelays[retryCount];
                console.log(`[Radio] Scheduling retry #${retryCount + 1} in ${delay}ms`);
                setTimeout(() => {
                  retryCount++;
                  forceMusicPlay();
                }, delay);
              } else {
                console.error('[Radio] Max retries exceeded, giving up on autoplay');
              }
              
              return false;
            });
        }
      } catch (error) {
        console.error('[Radio] Error during force play attempt:', error);
        return false;
      }
      
      return true;
    };
    
    // Register the function globally for direct access
    (window as any).forceMusicPlay = forceMusicPlay;
    
    // Try initial autoplay when the component mounts, with staggered retries
    // This is our most aggressive approach
    setTimeout(forceMusicPlay, 300);
    setTimeout(forceMusicPlay, 1000);
    setTimeout(forceMusicPlay, 3000);
    
    // Also listen for the page load event
    const handleLoad = () => {
      console.log('[Radio] Window load event detected, trying force play');
      forceMusicPlay();
    };
    
    window.addEventListener('load', handleLoad);
    
    // Try after browser determines page is fully loaded
    if (document.readyState === 'complete') {
      console.log('[Radio] Document already complete, trying force play');
      forceMusicPlay();
    } else {
      document.addEventListener('readystatechange', () => {
        if (document.readyState === 'complete') {
          console.log('[Radio] Document just completed, trying force play');
          forceMusicPlay();
        }
      });
    }
    
    // Check if this is a refresh by looking at document referrer
    // If referrer is same as current page, it's likely a refresh
    const isRefresh = document.referrer === document.location.href;
    if (isRefresh) {
      console.log('[Radio] Detected page refresh via referrer, trying force play');
      forceMusicPlay();
    }
    
    return () => {
      window.removeEventListener('load', handleLoad);
      delete (window as any).forceMusicPlay;
    };
  }, []);

  // Set up page visibility and load event listeners to handle page refresh
  useEffect(() => {
    // Function to handle playback of a random background song
    const playRandomBackgroundSong = (source = 'visibility_change') => {
      console.log(`[Radio] Playing random background song from source: ${source}`);
      
      // Don't start a new track if we're already playing something and not at a game over or paused state
      if (globalAudio && !globalAudio.paused && 
          globalAudio.currentTime > 0 && 
          !globalAudio.ended && 
          globalAudio.src !== '') {
        console.log('[Radio] Audio already playing, skipping random background song');
        return;
      }
      
      // Find all background songs
      const backgroundSongs = tracks.filter(track => 
        track.stationType === 'warehouse' && 
        ['Chilled', 'Frantic', 'Relaxed'].includes(track.title)
      );
      
      if (backgroundSongs.length > 0) {
        try {
          // First stop any currently playing audio to prevent duplicate playback
          if (globalAudio && !globalAudio.paused) {
            console.log('[Radio] Stopping current playback before playing new background song');
            globalAudio.pause();
            globalAudio.currentTime = 0;
          }
          
          // Select a random background song
          const randomIndex = Math.floor(Math.random() * backgroundSongs.length);
          const songToPlay = backgroundSongs[randomIndex];
          
          console.log(`[Radio] Selected background song: ${songToPlay.title} from source: ${source}`);
          
          // Create a new audio element if needed
          if (!globalAudio) {
            console.log('[Radio] Creating new global audio element');
            globalAudio = new Audio();
            audioRef.current = globalAudio;
          }
          
          // Set up the audio
          globalAudio.src = songToPlay.src;
          globalAudio.volume = 1.0;
          globalAudio.load();
          
          // Update state
          globalAudioState.currentTrackId = songToPlay.id;
          setCurrentTrack(songToPlay);
          
          // Play with a small delay to ensure loading
          setTimeout(() => {
            if (globalAudio) {
              globalAudio.play()
                .then(() => {
                  console.log('[Radio] Successfully played audio');
                  setIsPlaying(true);
                  globalAudioState.isPlaying = true;
                  
                  // Dispatch event to notify other components that radio is playing
                  try {
                    console.log('[Radio] Dispatching radioPlayStarted event from playRandomBackgroundSong');
                    const radioEvent = new CustomEvent('radioPlayStarted', {
                      detail: { trackId: songToPlay.id, title: songToPlay.title }
                    });
                    window.dispatchEvent(radioEvent);
                  } catch (error) {
                    console.error('[Radio] Error dispatching radioPlayStarted event:', error);
                  }
                })
                .catch(error => {
                  console.error('[Radio] Error playing audio:', error);
                  // Retry once after a delay
                  setTimeout(() => {
                    if (globalAudio) {
                      globalAudio.play().catch(e => 
                        console.error('[Radio] Retry also failed:', e)
                      );
                    }
                  }, 1000);
                });
            }
          }, 100);
        } catch (error) {
          console.error('[Radio] Error in playRandomBackgroundSong:', error);
        }
      }
    };

    // Handle page load event
    const handleLoad = () => {
      console.log('[Radio] Window load event detected');
      playRandomBackgroundSong('page_load');
    };

    // Handle visibility change (page refresh)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Radio] Page became visible');
        
        // Instead of playing a random song, check if we need to resume the current one
        if (globalAudio && globalAudioState.currentTrackId) {
          console.log('[Radio] Resuming current track instead of starting a new one');
          
          // If the audio was playing before, resume it
          if (globalAudioState.isPlaying) {
            globalAudio.play()
              .then(() => {
                console.log('[Radio] Successfully resumed audio after tab visibility change');
                setIsPlaying(true);
                
                // Dispatch event to notify other components that radio is playing
                try {
                  console.log('[Radio] Dispatching radioPlayStarted event from resume');
                  const radioEvent = new CustomEvent('radioPlayStarted', {
                    detail: { 
                      trackId: currentTrack?.id || 'unknown', 
                      title: currentTrack?.title || 'Unknown Track' 
                    }
                  });
                  window.dispatchEvent(radioEvent);
                } catch (error) {
                  console.error('[Radio] Error dispatching radioPlayStarted event:', error);
                }
              })
              .catch(error => {
                console.error('[Radio] Error resuming audio:', error);
                // Fall back to playing a random song if resume fails
                playRandomBackgroundSong('visibility_change_fallback');
              });
          }
        } else {
          // If no track was playing, start a random one as before
          playRandomBackgroundSong('visibility_change');
        }
      } else if (document.visibilityState === 'hidden') {
        // When tab becomes hidden, store the current playback state
        if (globalAudio) {
          globalAudioState.isPlaying = !globalAudio.paused;
          globalAudioState.currentTime = globalAudio.currentTime;
          console.log('[Radio] Page hidden, saved playback state:', globalAudioState);
        }
      }
    };

    // Set up event listeners
    window.addEventListener('load', handleLoad);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Try to play immediately on mount
    playRandomBackgroundSong('component_mount');

    // Cleanup
    return () => {
      window.removeEventListener('load', handleLoad);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Set up event listeners for station unlocks, storage changes, etc.
  useEffect(() => {
    // Check for newly unlocked stations
    const checkForUnlocks = () => {
      // Log the current state for debugging
      const stations = stationTracker.logUnlockedStations();
      console.log('[Radio] Current stations:', stations);
      
      // Check for any newly unlocked stations that need notifications
      const unlockedStations = Object.entries(stations)
        .filter(([stationType, isUnlocked]) => isUnlocked)
        .map(([stationType]) => stationType);
        
      console.log('[Radio] Unlocked stations:', unlockedStations);
    };
    
    // Handle station unlock events
    const handleStationUnlock = (event: Event) => {
      console.log('[Radio] Station unlock event received');
      checkForUnlocks();
      
      // Force UI update to reflect new unlocked tracks
      setShowPlaylist(showPlaylist);
    };
    
    // Handle storage changes (for cross-tab sync)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && event.key.includes('station-tracker')) {
        console.log('[Radio] Storage change detected for station-tracker, refreshing state');
        checkForUnlocks();
        
        // Force UI update to reflect new unlocked tracks
        setShowPlaylist(showPlaylist);
      }
    };
    
    // Handle playTrack events from outside the component
    const handlePlayTrack = (event: Event) => {
      try {
        const customEvent = event as CustomEvent;
        console.log('[Radio] Received playTrack event:', customEvent);
        
        if (customEvent.detail && customEvent.detail.trackId) {
          const trackId = customEvent.detail.trackId;
          const playWithoutOpening = customEvent.detail.playWithoutOpening || false;
          
          console.log(`[Radio] Playing track ${trackId}, without opening UI: ${playWithoutOpening}`);
          
          // Find the track in our list
          const trackToPlay = tracks.find(track => track.id === trackId);
          console.log('[Radio] Found track?', trackToPlay ? 'YES' : 'NO', trackToPlay);
          
          if (trackToPlay) {
            // Check if this track is unlocked
            const isUnlocked = stationTracker.isStationUnlocked(trackToPlay.stationType);
            console.log(`[Radio] Is track ${trackToPlay.title} unlocked? ${isUnlocked}`);
            
            if (isUnlocked) {
              console.log(`[Radio] Track ${trackToPlay.title} is unlocked, playing it`);
              
              // Dispatch stopAllAudio event to ensure other audio is stopped
              console.log('[Radio] Dispatching stopAllAudio event before playing track');
              const stopEvent = new CustomEvent('stopAllAudio', {
                detail: { source: 'radioPlayTrack', trackTitle: trackToPlay.title }
              });
              window.dispatchEvent(stopEvent);
              
              // Small delay to ensure other audio has stopped
              setTimeout(() => {
                // Continue with existing code to play the track
                console.log('[Radio] Setting audio source to:', trackToPlay.src);
                audioRef.current!.src = trackToPlay.src;
                audioRef.current!.load();
                // Set volume to full
                audioRef.current!.volume = 1.0;
                globalAudioState.volume = 1.0;
                setVolume(1.0);
                globalAudioState.currentTrackId = trackToPlay.id;
                
                // Force play after a brief moment to ensure audio is loaded
                console.log('[Radio] Setting up playback timeout');
                setTimeout(() => {
                  console.log('[Radio] Timeout triggered, attempting to play');
                  if (audioRef.current) {
                    console.log('[Radio] Audio reference still exists, calling play()');
                    const playPromise = audioRef.current.play();
                    
                    if (playPromise !== undefined) {
                      playPromise
                        .then(() => {
                          console.log(`[Radio] Successfully started playback of ${trackToPlay.title}`);
                          setIsPlaying(true);
                          globalAudioState.isPlaying = true;
                          
                          // Dispatch event to notify other components that radio is playing
                          try {
                            console.log('[Radio] Dispatching radioPlayStarted event');
                            const radioEvent = new CustomEvent('radioPlayStarted', {
                              detail: { trackId: trackToPlay.id, title: trackToPlay.title }
                            });
                            window.dispatchEvent(radioEvent);
                          } catch (error) {
                            console.error('[Radio] Error dispatching radioPlayStarted event:', error);
                          }
                          
                          // If we're supposed to show the UI (not playWithoutOpening), and it's not already open
                          if (!playWithoutOpening && !isOpen) {
                            // Could potentially trigger UI opening here if needed, but we don't for now
                            console.log('[Radio] Keeping UI closed as requested');
                          }
                        })
                        .catch(error => {
                          console.error(`[Radio] Error playing ${trackToPlay.title}:`, error);
                        });
                    } else {
                      console.log('[Radio] Play promise is undefined, which may indicate a browser restriction');
                    }
                  } else {
                    console.error('[Radio] Audio reference lost during timeout');
                  }
                }, 100);
              }, 100);
            } else {
              console.log(`[Radio] Track ${trackToPlay.title} is not unlocked yet.`);
            }
          } else {
            console.error('[Radio] Could not find track with ID:', trackId);
            console.log('Available tracks:', tracks.map(t => `${t.id}: ${t.title}`).join(', '));
          }
        } else {
          console.error('[Radio] Invalid playTrack event, missing track ID:', customEvent);
        }
      } catch (error) {
        console.error('[Radio] Error handling playTrack event:', error);
      }
    };
    
    // Force play music handler - this is the most direct way to ensure music plays
    const handleForcePlayMusic = (event: Event) => {
      const customEvent = event as CustomEvent;
      const source = customEvent.detail?.source || 'unknown';
      console.log(`[Radio] Received forcePlayMusic event from source: ${source}`);
      
      // Call our dedicated force play function that handles retries
      if (typeof (window as any).forceMusicPlay === 'function') {
        console.log('[Radio] Delegating to forceMusicPlay function');
        (window as any).forceMusicPlay();
      } else {
        console.error('[Radio] forceMusicPlay function not available');
        
        // Fallback to original implementation - this shouldn't normally happen
        const backgroundSongs = tracks.filter(track => 
          track.stationType === 'warehouse' && 
          ['Chilled', 'Frantic', 'Relaxed'].includes(track.title)
        );
        
        if (backgroundSongs.length > 0) {
          try {
            // Stop any current audio if playing
            if (globalAudio && !globalAudio.paused) {
              console.log('[Radio] Stopping current audio before playing new track');
              globalAudio.pause();
              globalAudio.currentTime = 0;
            }
            
            // Select a random background song
            const randomIndex = Math.floor(Math.random() * backgroundSongs.length);
            const songToPlay = backgroundSongs[randomIndex];
            
            console.log('[Radio] Force playing warehouse song:', songToPlay.title);
            
            if (globalAudio) {
              globalAudio.src = songToPlay.src;
              globalAudio.load();
              globalAudioState.currentTrackId = songToPlay.id;
              setCurrentTrack(songToPlay);
              globalAudio.volume = 1.0;
              
              globalAudio.play()
                .then(() => {
                  console.log('[Radio] Successfully played audio');
                  setIsPlaying(true);
                  globalAudioState.isPlaying = true;
                  
                  // Dispatch event to notify other components that radio is playing
                  try {
                    console.log('[Radio] Dispatching radioPlayStarted event from forcePlayMusic');
                    const radioEvent = new CustomEvent('radioPlayStarted', {
                      detail: { trackId: songToPlay.id, title: songToPlay.title }
                    });
                    window.dispatchEvent(radioEvent);
                  } catch (error) {
                    console.error('[Radio] Error dispatching radioPlayStarted event:', error);
                  }
                })
                .catch(error => {
                  console.error('[Radio] Error playing audio:', error);
                });
            }
          } catch (error) {
            console.error('[Radio] Error in forcePlayMusic handler:', error);
          }
        }
      }
    };
    
    // Handle game restart that needs stations to appear correctly
    const handleGameRestartWithStations = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[Radio] Received gameRestartWithStations event', customEvent.detail);
      
      // Check if we need to force full recreation
      const forceRecreate = customEvent.detail?.forceRecreate;
      
      if (forceRecreate) {
        console.log('[Radio] Forcing complete station recreation');
        // Reset everything first
        stationTracker.resetStations();
      }
      
      // Force stations to be re-initialized from storage
      stationTracker.initializeStations();
      
      // Force UI updates for playlist
      setShowPlaylist(false);
      setTimeout(() => setShowPlaylist(true), 50);
      
      // Update the current track
      updateCurrentTrackFromGlobal();
      
      // Re-check for unlocks to make sure everything is in sync
      const stations = stationTracker.logUnlockedStations();
      console.log('[Radio] Stations after game restart:', stations);
    };
    
    // Handle stop music event (from game over or other sources)
    const handleStopMusic = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[Radio] Received stopMusic event, source:', 
                 customEvent.detail?.source || 'unknown');
                 
      // Stop any currently playing audio
      if (globalAudio) {
        if (!globalAudio.paused) {
          console.log('[Radio] Stopping music playback');
          globalAudio.pause();
          globalAudio.currentTime = 0;
        }
        
        // Update state
        globalAudioState.isPlaying = false;
        setIsPlaying(false);
      }
    };
    
    // Handle radio playing status check
    const handleIsRadioPlaying = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[Radio] Received isRadioPlaying status check');
      
      if (customEvent.detail && typeof customEvent.detail.callback === 'function') {
        const isCurrentlyPlaying = isPlaying && globalAudio && !globalAudio.paused;
        console.log('[Radio] Reporting radio playing status:', isCurrentlyPlaying);
        
        // Return status via callback
        customEvent.detail.callback(isCurrentlyPlaying);
      }
    };
    
    // Register all event listeners
    window.addEventListener('stationUnlocked', handleStationUnlock);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('playTrack', handlePlayTrack);
    window.addEventListener('forcePlayMusic', handleForcePlayMusic);
    window.addEventListener('gameRestartWithStations', handleGameRestartWithStations);
    window.addEventListener('stopMusic', handleStopMusic);
    window.addEventListener('isRadioPlaying', handleIsRadioPlaying);

    // Clean up listeners on unmount
    return () => {
      window.removeEventListener('stationUnlocked', handleStationUnlock);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('playTrack', handlePlayTrack);
      window.removeEventListener('forcePlayMusic', handleForcePlayMusic);
      window.removeEventListener('gameRestartWithStations', handleGameRestartWithStations);
      window.removeEventListener('stopMusic', handleStopMusic);
      window.removeEventListener('isRadioPlaying', handleIsRadioPlaying);
    };
  }, [showPlaylist, isOpen, isPlaying]);

  // Helper function to update component state from global state
  const updateCurrentTrackFromGlobal = () => {
    // Force log station status to debug
    const stationStatus = stationTracker.logUnlockedStations();
    console.log('[Radio] Station status during track update:', stationStatus);
    
    // Get only unlocked tracks - with special debug logging for 'quantity' station
    console.log('[Radio] Checking if quantity station is unlocked:', stationStatus.quantity);
    
    const unlockedTracks = tracks.filter(t => {
      const isUnlocked = stationTracker.isStationUnlocked(t.stationType);
      console.log(`[Radio] Track ${t.title} with type ${t.stationType} is unlocked: ${isUnlocked}`);
      return isUnlocked;
    });
    
    console.log('[Radio] Available unlocked tracks:', unlockedTracks.map(t => t.title));
    
    if (globalAudioState.currentTrackId) {
      const track = tracks.find(t => t.id === globalAudioState.currentTrackId);
      if (track) {
        // Double check that the track is unlocked with explicit logging
        const isUnlocked = stationTracker.isStationUnlocked(track.stationType);
        console.log(`[Radio] Current track ${track.title} with type ${track.stationType} is unlocked: ${isUnlocked}`);
        
        if (isUnlocked) {
          console.log('[Radio] Selected previously playing track:', track.title);
          setCurrentTrack(track);
        } else {
          // If the previously playing track is now locked, switch to the first track
          const firstUnlockedTrack = unlockedTracks[0];
          if (firstUnlockedTrack) {
            console.log('[Radio] Previous track locked, switching to:', firstUnlockedTrack.title);
            setCurrentTrack(firstUnlockedTrack);
            globalAudioState.currentTrackId = firstUnlockedTrack.id;
            if (globalAudio) {
              globalAudio.src = firstUnlockedTrack.src;
              globalAudio.currentTime = 0;
            }
          }
        }
      }
    } else if (unlockedTracks.length > 0) {
      // Set default track if none is playing (first unlocked track)
      const firstUnlockedTrack = unlockedTracks[0];
      console.log('[Radio] No track playing, setting to first unlocked:', firstUnlockedTrack.title);
      setCurrentTrack(firstUnlockedTrack);
      globalAudioState.currentTrackId = firstUnlockedTrack.id;
      if (globalAudio) {
        globalAudio.src = firstUnlockedTrack.src;
        globalAudio.currentTime = 0;
      }
    }
    
    // Synchronize other state
    setIsPlaying(globalAudioState.isPlaying);
    setVolume(globalAudioState.volume);
    if (globalAudio) {
      setDuration(globalAudio.duration || 0);
      setCurrentTime(globalAudio.currentTime);
      
      // Add metadata loaded event to update duration
      const handleMetadataLoaded = () => {
        setDuration(globalAudio!.duration || 0);
      };
      
      globalAudio.addEventListener('loadedmetadata', handleMetadataLoaded);
      
      // Clean up
      return () => {
        globalAudio?.removeEventListener('loadedmetadata', handleMetadataLoaded);
      };
    }
  };

  // Poll for updates to ensure UI stays in sync with audio
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (globalAudio && globalAudioState.currentTrackId) {
        // Check if track changed externally
        const currentTrackId = currentTrack?.id || null;
        if (globalAudioState.currentTrackId !== currentTrackId) {
          const newTrack = tracks.find(t => t.id === globalAudioState.currentTrackId);
          if (newTrack) {
            setCurrentTrack(newTrack);
          }
        }
        
        // Update playing state
        setIsPlaying(globalAudioState.isPlaying);
        
        // Update time and progress if playing
        if (globalAudioState.isPlaying) {
          setCurrentTime(globalAudio.currentTime);
          if (globalAudio.duration) {
            setProgress((globalAudio.currentTime / globalAudio.duration) * 100);
          }
        }
      }
    }, 500); // Poll every 500ms
    
    return () => clearInterval(syncInterval);
  }, [currentTrack]);

  // Handle play/pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      globalAudioState.isPlaying = false;
      setIsPlaying(false);
    } else {
      // Dispatch stopAllAudio event to ensure other audio is stopped
      try {
        console.log('[Radio] Dispatching stopAllAudio event before resuming playback');
        const stopEvent = new CustomEvent('stopAllAudio', {
          detail: { 
            source: 'radioTogglePlay',
            trackTitle: currentTrack?.title || 'Unknown Track'
          }
        });
        window.dispatchEvent(stopEvent);
        
        // Small delay to ensure other audio has stopped
        setTimeout(() => {
          audioRef.current?.play().catch(error => {
            console.error('Error playing audio:', error);
          }).then(() => {
            // Only dispatch event if play was successful (not caught in catch)
            if (audioRef.current) {
              try {
                console.log('[Radio] Dispatching radioPlayStarted event from togglePlay');
                const radioEvent = new CustomEvent('radioPlayStarted', {
                  detail: { 
                    trackId: currentTrack?.id || 'unknown', 
                    title: currentTrack?.title || 'Unknown Track',
                    explicit: true
                  }
                });
                window.dispatchEvent(radioEvent);
              } catch (error) {
                console.error('[Radio] Error dispatching radioPlayStarted event:', error);
              }
            }
          });
          globalAudioState.isPlaying = true;
          setIsPlaying(true);
        }, 100);
      } catch (error) {
        console.error('[Radio] Error during togglePlay:', error);
        
        // Fallback to direct play if anything fails
        audioRef.current.play().catch(console.error);
        globalAudioState.isPlaying = true;
        setIsPlaying(true);
      }
    }
  };

  // Handle track change
  const changeTrack = (track: Track) => {
    // Check if this track's station is unlocked
    if (!stationTracker.isStationUnlocked(track.stationType)) {
      // Track is locked, don't allow playback
      console.log(`Cannot play locked track: ${track.title}`);
      return;
    }
    
    // First, dispatch an event to stop ALL other audio in the game
    // This will ensure Game Over music or any other audio is stopped
    try {
      console.log('[Radio] Dispatching stopAllAudio event before playing track');
      const stopEvent = new CustomEvent('stopAllAudio', {
        detail: { source: 'radioChangeTrack', trackTitle: track.title }
      });
      window.dispatchEvent(stopEvent);
      
      // Small delay to ensure audio has stopped before starting new track
      setTimeout(() => {
        setCurrentTrack(track);
        setIsPlaying(false);
        setCurrentTime(0);
        setProgress(0);
        
        if (audioRef.current) {
          audioRef.current.src = track.src;
          audioRef.current.load();
          globalAudioState.currentTrackId = track.id;
          
          // Let the useEffect handle play after source is updated
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.play().catch(error => {
                console.error('Error playing audio:', error);
              });
              setIsPlaying(true);
              globalAudioState.isPlaying = true;
              
              // Also dispatch radioPlayStarted event to ensure handlers are triggered
              const radioEvent = new CustomEvent('radioPlayStarted', {
                detail: { trackId: track.id, title: track.title, explicit: true }
              });
              window.dispatchEvent(radioEvent);
            }
          }, 100);
        }
      }, 100); // Small delay for cleanup
    } catch (error) {
      console.error('[Radio] Error during changeTrack:', error);
    }
  };

  // Handle next track
  const nextTrack = () => {
    if (!currentTrack) return;
    
    const currentIndex = tracks.findIndex(track => track.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % tracks.length;
    changeTrack(tracks[nextIndex]);
  };

  // Handle previous track
  const prevTrack = () => {
    if (!currentTrack) return;
    
    const currentIndex = tracks.findIndex(track => track.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    changeTrack(tracks[prevIndex]);
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      globalAudioState.volume = newVolume;
    }
  };

  // Set active tab
  const setTab = (tab: 'lyrics' | 'playlist') => {
    setActiveTab(tab);
    if (tab === 'lyrics') {
      setShowLyrics(true);
      setShowPlaylist(false);
    } else {
      setShowLyrics(false);
      setShowPlaylist(true);
    }
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    
    const progressContainer = e.currentTarget;
    const rect = progressContainer.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const clickPercentage = clickPosition / rect.width;
    const newTime = clickPercentage * duration;
    
    audioRef.current.currentTime = newTime;
    globalAudioState.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(clickPercentage * 100);
  };

  // Update audio progress
  const updateProgress = () => {
    if (!audioRef.current) return;
    
    const currentTime = audioRef.current.currentTime;
    const duration = audioRef.current.duration || 0;
    const progressPercent = (currentTime / duration) * 100;
    
    setCurrentTime(currentTime);
    setProgress(progressPercent);
  };

  // Start progress timer
  const startProgressTimer = () => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
    }
    
    const timerId = window.setInterval(updateProgress, 100);
    progressTimerRef.current = timerId;
  };

  // Format time as MM:SS
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Start/stop progress timer based on isPlaying
  useEffect(() => {
    if (isPlaying) {
      startProgressTimer();
    } else if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
    }
    
    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
    };
  }, [isPlaying]);

  // Handle audio metadata loaded
  const handleMetadataLoaded = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  // Render equalizer bars
  const renderEqualizer = () => {
    return (
      <div className="equalizer">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="equalizer-bar" style={{ 
            animationPlayState: isPlaying ? 'running' : 'paused' 
          }} />
        ))}
      </div>
    );
  };

  // Function to stop music playback
  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      globalAudioState.isPlaying = false;
    }
  };

  // Expose methods to the parent through the ref
  useImperativeHandle(ref, () => ({
    playTrack: (trackId: string) => {
      console.log(`[Radio Ref] Direct playTrack call received with ID: ${trackId}`);
      
      // Find the track in our list
      const trackToPlay = tracks.find(track => track.id === trackId);
      console.log('[Radio Ref] Found track?', trackToPlay ? 'YES' : 'NO', trackToPlay);
      
      if (trackToPlay) {
        // Check if this track is unlocked
        const isUnlocked = stationTracker.isStationUnlocked(trackToPlay.stationType);
        console.log(`[Radio Ref] Is track "${trackToPlay.title}" unlocked?`, isUnlocked ? 'YES' : 'NO');
        console.log(`[Radio Ref] Full station status:`, stationTracker.logUnlockedStations());
        
        if (isUnlocked) {
          // First, dispatch an event to stop ALL other audio
          console.log('[Radio Ref] Dispatching stopAllAudio event before playing track');
          try {
            const stopEvent = new CustomEvent('stopAllAudio', {
              detail: { 
                source: 'radioRefPlayTrack',
                trackTitle: trackToPlay.title 
              }
            });
            window.dispatchEvent(stopEvent);
            
            // Continue with a slight delay to ensure other audio stops
            setTimeout(() => {
              console.log(`[Radio Ref] Playing track: ${trackToPlay.title}`);
              
              // ALWAYS stop current playback before starting a new track
              if (audioRef.current) {
                console.log('[Radio Ref] Stopping any current playback');
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
              }
              
              // Explicitly create a new audio element if needed
              if (!audioRef.current) {
                console.log('[Radio Ref] Creating new audio element');
                globalAudio = new Audio();
                audioRef.current = globalAudio;
              }
              
              // Set the track
              console.log('[Radio Ref] Setting current track to:', trackToPlay.title);
              setCurrentTrack(trackToPlay);
              
              // Ensure audio is ready and configure for playback
              if (audioRef.current) {
                console.log('[Radio Ref] Setting audio source to:', trackToPlay.src);
                audioRef.current.src = trackToPlay.src;
                audioRef.current.volume = 1.0; // Ensure maximum volume
                audioRef.current.preload = 'auto'; // Force preloading
                audioRef.current.load();
                
                // Update all state
                globalAudioState.currentTrackId = trackToPlay.id;
                globalAudioState.volume = 1.0;
                globalAudioState.isPlaying = true;
                setVolume(1.0);
                
                // Add event listeners to track loading progress
                const loadStartListener = () => console.log('[Radio Ref] Audio loadstart event triggered');
                const loadedDataListener = () => console.log('[Radio Ref] Audio loadeddata event triggered');
                const canPlayListener = () => console.log('[Radio Ref] Audio canplay event triggered');
                
                audioRef.current.addEventListener('loadstart', loadStartListener);
                audioRef.current.addEventListener('loadeddata', loadedDataListener);
                audioRef.current.addEventListener('canplay', canPlayListener);
                
                // Try to play immediately, then again after a delay for safety
                const attemptPlay = () => {
                  if (!audioRef.current) return;
                  
                  console.log('[Radio Ref] Attempting to play audio');
                  console.log('[Radio Ref] Audio readyState:', audioRef.current.readyState);
                  
                  try {
                    const playPromise = audioRef.current.play();
                    
                    if (playPromise !== undefined) {
                      playPromise
                        .then(() => {
                          console.log(`[Radio Ref] Successfully started playback of ${trackToPlay.title}`);
                          setIsPlaying(true);
                          
                          // Dispatch event to notify other components that radio is playing
                          try {
                            console.log('[Radio Ref] Dispatching radioPlayStarted event');
                            const radioEvent = new CustomEvent('radioPlayStarted', {
                              detail: { trackId: trackToPlay.id, title: trackToPlay.title }
                            });
                            window.dispatchEvent(radioEvent);
                          } catch (error) {
                            console.error('[Radio Ref] Error dispatching radioPlayStarted event:', error);
                          }
                        })
                        .catch(error => {
                          console.error(`[Radio Ref] Error playing ${trackToPlay.title}:`, error);
                          
                          // Try one more time after a longer delay if the first attempt fails
                          setTimeout(() => {
                            console.log('[Radio Ref] Retry after error...');
                            if (audioRef.current) {
                              audioRef.current.play()
                                .then(() => {
                                  console.log('[Radio Ref] Retry successful');
                                  setIsPlaying(true);
                                })
                                .catch(retryError => {
                                  console.error('[Radio Ref] Retry failed:', retryError);
                                });
                            }
                          }, 500);
                        });
                    } else {
                      console.log('[Radio Ref] Play promise is undefined');
                    }
                  } catch (error) {
                    console.error('[Radio Ref] Exception during play():', error);
                  }
                };
                
                // Try immediately 
                attemptPlay();
                
                // Also try after a delay to ensure audio is loaded
                setTimeout(() => {
                  console.log('[Radio Ref] Delayed play attempt');
                  attemptPlay();
                  
                  // Remove event listeners to avoid memory leaks
                  if (audioRef.current) {
                    audioRef.current.removeEventListener('loadstart', loadStartListener);
                    audioRef.current.removeEventListener('loadeddata', loadedDataListener);
                    audioRef.current.removeEventListener('canplay', canPlayListener);
                  }
                }, 300);
              } else {
                console.error('[Radio Ref] No audio reference available');
              }
            }, 100);
          } catch (error) {
            console.error('[Radio Ref] Error dispatching stopAllAudio event:', error);
            
            // Continue with direct play as fallback
            console.log(`[Radio Ref] Playing track (fallback): ${trackToPlay.title}`);
            
            // Restore original code as fallback
            if (audioRef.current) {
              console.log('[Radio Ref] Stopping any current playback (fallback)');
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }

            // Explicitly create a new audio element if needed
            if (!audioRef.current) {
              console.log('[Radio Ref] Creating new audio element (fallback)');
              globalAudio = new Audio();
              audioRef.current = globalAudio;
            }

            // Set the track
            console.log('[Radio Ref] Setting current track to:', trackToPlay.title);
            setCurrentTrack(trackToPlay);

            // Ensure audio is ready and configure for playback
            if (audioRef.current) {
              console.log('[Radio Ref] Setting audio source to:', trackToPlay.src);
              audioRef.current.src = trackToPlay.src;
              audioRef.current.volume = 1.0; // Ensure maximum volume
              audioRef.current.preload = 'auto'; // Force preloading
              audioRef.current.load();
              
              // Update all state
              globalAudioState.currentTrackId = trackToPlay.id;
              globalAudioState.volume = 1.0;
              globalAudioState.isPlaying = true;
              setVolume(1.0);
              
              // Try to play immediately
              const attemptPlay = () => {
                if (!audioRef.current) return;
                
                audioRef.current.play()
                .then(() => {
                  console.log(`[Radio Ref] Successfully started playback of ${trackToPlay.title}`);
                  setIsPlaying(true);
                  
                  // Dispatch radioPlayStarted event
                  try {
                    const radioEvent = new CustomEvent('radioPlayStarted', {
                      detail: { trackId: trackToPlay.id, title: trackToPlay.title, explicit: true }
                    });
                    window.dispatchEvent(radioEvent);
                  } catch (error) {
                    console.error('[Radio Ref] Error dispatching event:', error);
                  }
                })
                .catch(console.error);
              };
              
              attemptPlay();
              setTimeout(attemptPlay, 300); // Try again after a delay
            }
          }
        } else {
          console.error(`[Radio Ref] Track ${trackToPlay.title} is not unlocked yet.`);
        }
      } else {
        console.error('[Radio Ref] Could not find track with ID:', trackId);
        console.log('Available tracks:', tracks.map(t => `${t.id}: ${t.title}`).join(', '));
      }
    }
  }));

  // Find game container on mount
  useEffect(() => {
    const container = document.getElementById('game-container');
    if (container) {
      setGameContainer(container);
    }
  }, []);

  return (
    <div className={`radio-player ${isOpen ? 'open' : ''}`}>
      <div className="radio-content">
        {/* Main player UI - only shown when isOpen is true */}
        {isOpen && currentTrack && (
          <div className="radio-container">
            <div className="radio-header">
              <div className="radio-header-title">
                <span>ORDER EDITING RADIO</span>
                {isPlaying && renderEqualizer()}
              </div>
              <button 
                onClick={onClose}
                className="radio-button"
              >
                ✕
              </button>
            </div>

            <div className="radio-body">
              {/* Left side: Controls - made more compact */}
              <div className="radio-controls">
                {/* Track info with more compact layout */}
                <div className="track-info-container">
                  <div className="track-title">{currentTrack.title}</div>
                  <div className="track-artist">{currentTrack.artist}</div>
                  <div className="time-display">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>

                {/* Progress bar */}
                <div 
                  className="progress-container"
                  onClick={handleProgressClick}
                >
                  <div 
                    className="progress-bar"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>

                {/* Playback controls in a more condensed layout */}
                <div className="control-panel">
                  <button 
                    onClick={prevTrack}
                    className="radio-button"
                    disabled={tracks.findIndex(t => t.id === currentTrack.id) === 0}
                  >
                    ⏮
                  </button>
                  <button 
                    onClick={togglePlay}
                    className="radio-button radio-button-primary"
                  >
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <button 
                    onClick={stopPlayback}
                    className="radio-button"
                  >
                    ⏹
                  </button>
                  <button 
                    onClick={nextTrack}
                    className="radio-button"
                    disabled={tracks.findIndex(t => t.id === currentTrack.id) === tracks.filter(t => stationTracker.isStationUnlocked(t.stationType)).length - 1}
                  >
                    ⏭
                  </button>
                  
                  {/* Volume control now inside the control panel */}
                  <div className="volume-control">
                    <span>VOL</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={volume}
                      onChange={handleVolumeChange}
                      className="pixel-slider"
                    />
                  </div>
                </div>

              </div>

              {/* Right side: Display - playlist/lyrics */}
              <div className="radio-display">
                {/* Tab buttons */}
                <div className="tab-buttons">
                  <button 
                    className={`tab-button ${activeTab === 'playlist' ? 'active' : ''}`}
                    onClick={() => setTab('playlist')}
                  >
                    Playlist
                  </button>
                  <button 
                    className={`tab-button ${activeTab === 'lyrics' ? 'active' : ''}`}
                    onClick={() => setTab('lyrics')}
                  >
                    Lyrics
                  </button>
                </div>
                
                {/* Playlist */}
                {showPlaylist && (
                  <div className="playlist-panel">
                    {/* Display free songs (warehouse type) */}
                    {tracks.filter(track => track.stationType === 'warehouse').map(track => {
                      const isActive = currentTrack?.id === track.id;
                      
                      return (
                        <div 
                          key={track.id}
                          className={`playlist-item ${isActive ? 'active' : ''}`}
                          onClick={() => changeTrack(track)}
                        >
                          {track.title}
                        </div>
                      );
                    })}
                    
                    {/* Unlockable Songs Header */}
                    <div className="playlist-section-header">UNLOCKABLE SONGS</div>
                    
                    {/* Display unlockable songs (non-warehouse type) */}
                    {tracks.filter(track => track.stationType !== 'warehouse').map(track => {
                      const isLocked = !stationTracker.isStationUnlocked(track.stationType);
                      const isActive = currentTrack?.id === track.id;
                      
                      return (
                        <div 
                          key={track.id}
                          className={`playlist-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : 'unlocked'}`}
                          onClick={() => !isLocked && changeTrack(track)}
                        >
                          {isLocked && <span className="lock-icon">🔒 </span>}
                          {isLocked ? "Fix more orders to unlock this song!" : track.title}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Lyrics panel */}
                {activeTab === 'lyrics' && (
                  <div className="lyrics-panel" style={{ overflowY: 'auto', maxHeight: '100%' }}>
                    {currentTrack?.lyrics.split('\n').map((line, index, array) => {
                      // Check if this line or the next line has a section header like [Chorus], [Verse], etc.
                      const isHeader = line.match(/^\[.*\]/) !== null;
                      const isEmptyLine = line.trim() === '';
                      const nextLineIsHeader = index < array.length - 1 && array[index + 1].match(/^\[.*\]/) !== null;
                      
                      // Add extra margin before section headers or if the next line is a header
                      const style = {
                        margin: '0',
                        ...(isEmptyLine ? { height: '1em' } : {}),
                        ...(isHeader ? { marginTop: '1.5em', fontWeight: 'bold' } : {}),
                        ...(nextLineIsHeader && !isEmptyLine ? { marginBottom: '1.5em' } : {})
                      };
                      
                      return <p key={index} style={style}>{line}</p>;
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 
        Mini player is only rendered when not open and a track is playing
        We use React's portal API to render it into the button container
      */}
      {!isOpen && isPlaying && currentTrack && document.querySelector('.mt-4.flex.gap-2') && 
        ReactDOM.createPortal(
          <div className="mini-player">
            <button 
              onClick={togglePlay}
              className="radio-button radio-button-primary"
              title="Pause"
            >
              ⏸️
            </button>
            <div 
              className="mini-track-info"
              onClick={() => onClose()}  
              title="Open Player"
              style={{ cursor: 'pointer' }}
            >
              <div className="scrolling-text-container">
                <div className="scrolling-text">
                  {currentTrack.title} - {currentTrack.artist} &nbsp;&nbsp;&nbsp;&nbsp;
                  {currentTrack.title} - {currentTrack.artist}
                </div>
              </div>
            </div>
          </div>,
          document.querySelector('.mt-4.flex.gap-2') as Element
        )
      }
    </div>
  );
});

export default Radio; 