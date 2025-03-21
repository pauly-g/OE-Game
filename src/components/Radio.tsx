import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
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
        let nextIndex = (currentIndex + 1) % unlockedTracks.length;
        
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
  
  // Set up autoplay function when the component mounts
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps - Intentionally exclude changeTrack to avoid re-renders
    if (autoplay) {
      console.log('[Radio] Autoplay enabled, attempting to start background music');
      // Find all background songs (warehouse type)
      const backgroundSongs = tracks.filter(track => track.stationType === 'warehouse');
      
      if (backgroundSongs.length > 0) {
        console.log('[Radio] Found background songs for autoplay:', backgroundSongs.map(t => t.title).join(', '));
        // Delayed start to ensure component is fully initialized
        setTimeout(() => {
          try {
            // Check if music is already playing
            const isAudioPlaying = globalAudio && 
                                  !globalAudio.paused && 
                                  globalAudio.currentTime > 0 && 
                                  !globalAudio.ended &&
                                  globalAudio.src !== '';
                                  
            if (!isAudioPlaying) {
              // First stop any existing playback to prevent duplicated audio
              if (globalAudio && !globalAudio.paused) {
                console.log('[Radio] Stopping any current audio before autoplay');
                globalAudio.pause();
                globalAudio.currentTime = 0;
              }
              
              const randomIndex = Math.floor(Math.random() * backgroundSongs.length);
              const songToPlay = backgroundSongs[randomIndex];
              console.log('[Radio] Auto-playing background song:', songToPlay.title);
              
              // Use changeTrack to properly set up audio
              changeTrack(songToPlay);
            } else {
              console.log('[Radio] Audio already playing, not starting autoplay');
            }
          } catch (error) {
            console.error('[Radio] Error during autoplay:', error);
          }
        }, 1500);
      } else {
        console.warn('[Radio] No background songs found for autoplay');
      }
    }
  }, [autoplay]);

  // Set up page visibility and load event listeners to handle page refresh
  useEffect(() => {
    // Function to handle playback of a random background song
    const playRandomBackgroundSong = () => {
      console.log('[Radio] Playing random background song after refresh');
      
      // Find all background songs
      const backgroundSongs = tracks.filter(track => track.stationType === 'warehouse');
      if (backgroundSongs.length > 0) {
        try {
          // Stop any currently playing audio first to prevent duplicate playback
          if (globalAudio && !globalAudio.paused) {
            console.log('[Radio] Stopping current playback before playing new background song');
            globalAudio.pause();
            globalAudio.currentTime = 0;
          }
          
          // Select a random background song
          const randomIndex = Math.floor(Math.random() * backgroundSongs.length);
          const songToPlay = backgroundSongs[randomIndex];
          
          console.log(`[Radio] Selected background song: ${songToPlay.title}`);
          
          // Use a timeout to ensure DOM is ready
          setTimeout(() => {
            console.log('[Radio] Starting background song');
            // Always play the song - don't check if audio is playing
            changeTrack(songToPlay);
          }, 500);
        } catch (error) {
          console.error('[Radio] Error playing random background song:', error);
        }
      }
    };
    
    // Handle visibility changes (page refresh)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Radio] Page became visible (possible refresh detected)');
        
        // More aggressive check - if document just became visible, play music
        setTimeout(() => {
          // Always try to play music when page visibility changes
          playRandomBackgroundSong();
        }, 500);
      }
    };
    
    // Handle window load event
    const handleLoadEvent = () => {
      console.log('[Radio] Window load event - checking if we need to start music');
      setTimeout(() => {
        playRandomBackgroundSong();
      }, 1000);
    };
    
    // Handle page refreshed event
    const handlePageRefreshed = () => {
      console.log('[Radio] Received pageRefreshed event, playing background music');
      playRandomBackgroundSong();
    };
    
    // Set up event listeners for refresh scenarios
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('load', handleLoadEvent);
    window.addEventListener('pageRefreshed', handlePageRefreshed);
    
    // Clean up on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('load', handleLoadEvent);
      window.removeEventListener('pageRefreshed', handlePageRefreshed);
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
              
              // Stop current playback if necessary
              if (audioRef.current && isPlaying) {
                console.log('[Radio] Pausing current playback before switching tracks');
                audioRef.current.pause();
              }
              
              // Set the track
              console.log('[Radio] Setting current track to:', trackToPlay.title);
              setCurrentTrack(trackToPlay);
              
              // Ensure audio is ready and start playback immediately
              if (audioRef.current) {
                console.log('[Radio] Setting audio source to:', trackToPlay.src);
                audioRef.current.src = trackToPlay.src;
                audioRef.current.load();
                // Set volume to full
                audioRef.current.volume = 1.0;
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
              } else {
                console.error('[Radio] No audio reference available');
              }
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
      console.log('[Radio] Received forcePlayMusic event, source:', 
                 customEvent.detail?.source || 'unknown');
      
      // Find all background songs (warehouse type)
      const backgroundSongs = tracks.filter(track => track.stationType === 'warehouse');
      
      if (backgroundSongs.length > 0) {
        try {
          // First stop any current audio if playing to prevent duplicated music
          if (globalAudio) {
            if (!globalAudio.paused) {
              console.log('[Radio] Stopping any current audio before playing new track');
              globalAudio.pause();
              globalAudio.currentTime = 0;
            }
            
            // Select a random background song from the warehouse type
            const randomIndex = Math.floor(Math.random() * backgroundSongs.length);
            const songToPlay = backgroundSongs[randomIndex];
            
            console.log('[Radio] Force playing warehouse song:', songToPlay.title);
            
            // Set the source and prepare the audio
            globalAudio.src = songToPlay.src;
            globalAudio.load();
            
            // Play with a delay to ensure the audio context is ready
            setTimeout(() => {
              if (globalAudio) {
                console.log('[Radio] Attempting to directly play audio');
                
                // Set global state and component state
                globalAudioState.currentTrackId = songToPlay.id;
                setCurrentTrack(songToPlay);
                
                // Play with high volume
                globalAudio.volume = 1.0;
                
                const playPromise = globalAudio.play();
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                      console.log('[Radio] Successfully force played audio');
                      setIsPlaying(true);
                      globalAudioState.isPlaying = true;
                    })
                    .catch(error => {
                      console.error('[Radio] Error playing forced audio:', error);
                    });
                }
              }
            }, 100);
          }
        } catch (error) {
          console.error('[Radio] Error in forcePlayMusic handler:', error);
        }
      }
    };
    
    // Handle game restart that needs stations to appear correctly
    const handleGameRestartWithStations = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[Radio] Received gameRestartWithStations event');
      
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
    
    // Set up all event listeners
    window.addEventListener('stationUnlocked', handleStationUnlock);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('playTrack', handlePlayTrack);
    window.addEventListener('forcePlayMusic', handleForcePlayMusic);
    window.addEventListener('gameRestartWithStations', handleGameRestartWithStations);
    window.addEventListener('stopMusic', handleStopMusic);
    
    // Check for unlocks immediately
    checkForUnlocks();
    
    // Set up periodic checks for unlocks
    const intervalId = setInterval(checkForUnlocks, 3000);
    
    // Return cleanup function
    return () => {
      // Clean up all event listeners
      window.removeEventListener('stationUnlocked', handleStationUnlock);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('playTrack', handlePlayTrack);
      window.removeEventListener('forcePlayMusic', handleForcePlayMusic);
      window.removeEventListener('gameRestartWithStations', handleGameRestartWithStations);
      window.removeEventListener('stopMusic', handleStopMusic);
      clearInterval(intervalId);
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
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
      });
      globalAudioState.isPlaying = true;
    }
    setIsPlaying(!isPlaying);
  };

  // Handle track change
  const changeTrack = (track: Track) => {
    // Check if this track's station is unlocked
    if (!stationTracker.isStationUnlocked(track.stationType)) {
      // Track is locked, don't allow playback
      console.log(`Cannot play locked track: ${track.title}`);
      return;
    }
    
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
        }
      }, 0);
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
        } else {
          console.error(`[Radio Ref] Track ${trackToPlay.title} is not unlocked yet.`);
        }
      } else {
        console.error('[Radio Ref] Could not find track with ID:', trackId);
        console.log('Available tracks:', tracks.map(t => `${t.id}: ${t.title}`).join(', '));
      }
    }
  }));

  return (
    <div className={`radio-player ${isOpen ? 'open' : ''}`}>
      <div className="radio-content">
        {/* Main player UI - only shown when isOpen is true */}
        {isOpen && currentTrack && (
          <div className="radio-container">
            <div className="radio-header">
              <div className="radio-header-title">
                <span>🎵</span>
                <span>WAREHOUSE RADIO</span>
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
                </div>

                {/* Volume control */}
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
                    {tracks.map(track => {
                      // Only use stationTracker to determine if a song is locked, ignore track.locked property
                      const isLocked = !stationTracker.isStationUnlocked(track.stationType);
                      const isActive = currentTrack?.id === track.id;
                      
                      return (
                        <div 
                          key={track.id}
                          className={`playlist-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
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
                  <div className="lyrics-panel">
                    {currentTrack?.lyrics.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mini player when main UI is closed but music is playing */}
        {!isOpen && isPlaying && currentTrack && (
          <div className="mini-player">
            <button 
              onClick={togglePlay}
              className="radio-button radio-button-primary"
              title="Pause"
            >
              ⏸️
            </button>
            <div className="mini-track-info">
              {currentTrack.title} - {currentTrack.artist}
            </div>
            <button
              onClick={() => onClose()}
              className="radio-button"
              title="Open Player"
            >
              🔽
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default Radio; 