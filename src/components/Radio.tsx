import React, { useState, useRef, useEffect } from 'react';
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
  volume: 0.7
};

// Create a global audio element that persists outside of React's lifecycle
let globalAudio: HTMLAudioElement | null = null;

interface RadioProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Radio: React.FC<RadioProps> = ({ isOpen, onClose }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'lyrics' | 'playlist'>('playlist');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const trackChangeListenerRef = useRef<(() => void) | null>(null);

  // Initialize global audio element if it doesn't exist
  useEffect(() => {
    if (!globalAudio) {
      globalAudio = new Audio();
      globalAudio.volume = globalAudioState.volume;
    }
    
    // Set up the audio reference
    audioRef.current = globalAudio;
    
    // Set up current track based on global state
    updateCurrentTrackFromGlobal();
    
    // Set up track change listener
    const handleTrackEnded = () => {
      // Find next track
      if (globalAudioState.currentTrackId) {
        const currentIndex = tracks.findIndex(t => t.id === globalAudioState.currentTrackId);
        let nextIndex = (currentIndex + 1) % tracks.length;
        
        // Find the next unlocked track
        let nextTrack = tracks[nextIndex];
        while (!stationTracker.isStationUnlocked(nextTrack.stationType)) {
          nextIndex = (nextIndex + 1) % tracks.length;
          // If we've checked all tracks and none are unlocked (except the current one),
          // just loop the current track
          if (nextIndex === currentIndex) {
            nextIndex = currentIndex;
            break;
          }
          nextTrack = tracks[nextIndex];
        }
        
        // Get the next track (this line was duplicated)
        nextTrack = tracks[nextIndex];
        
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
  
  // Helper function to update component state from global state
  const updateCurrentTrackFromGlobal = () => {
    if (globalAudioState.currentTrackId) {
      const track = tracks.find(t => t.id === globalAudioState.currentTrackId);
      if (track) {
        // Make sure the track is unlocked
        if (stationTracker.isStationUnlocked(track.stationType)) {
          setCurrentTrack(track);
        } else {
          // If the previously playing track is now locked, switch to the first track
          const firstTrack = tracks.find(t => stationTracker.isStationUnlocked(t.stationType));
          if (firstTrack) {
            setCurrentTrack(firstTrack);
            globalAudioState.currentTrackId = firstTrack.id;
            if (globalAudio) {
              globalAudio.src = firstTrack.src;
              globalAudio.currentTime = 0;
            }
          }
        }
      }
    } else if (tracks.length > 0) {
      // Set default track if none is playing (first unlocked track)
      const firstTrack = tracks.find(t => stationTracker.isStationUnlocked(t.stationType));
      if (firstTrack) {
        setCurrentTrack(firstTrack);
        globalAudioState.currentTrackId = firstTrack.id;
        if (globalAudio) {
          globalAudio.src = firstTrack.src;
          globalAudio.currentTime = globalAudioState.currentTime;
        }
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

  // Listen for station unlock events
  useEffect(() => {
    // Initialize stations
    stationTracker.initializeStations();
    console.log('[Radio] Initialized stationTracker');
    
    // Set up event listener for station unlocks
    const handleStationUnlock = (event: Event) => {
      console.log('[Radio] Received stationUnlocked event:', (event as CustomEvent).detail);
      // Force a re-render to update locked/unlocked status in playlist
      setShowPlaylist(prev => !prev);
      setShowPlaylist(prev => !prev);
    };
    
    window.addEventListener('stationUnlocked', handleStationUnlock);
    console.log('[Radio] Added stationUnlocked event listener');
    
    // Log current station state
    stationTracker.logUnlockedStations();
    
    // Cleanup
    return () => {
      window.removeEventListener('stationUnlocked', handleStationUnlock);
      console.log('[Radio] Removed stationUnlocked event listener');
    };
  }, []);

  // Testing function to unlock stations manually
  const debugUnlockStation = (stationType: string) => {
    console.log(`Manually unlocking station: ${stationType}`);
    stationTracker.forceUnlock(stationType);
    // Force re-render playlist
    setShowPlaylist(prev => !prev);
    setShowPlaylist(prev => !prev);
  };

  return (
    <>
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
            {/* Left side: Controls */}
            <div className="radio-controls">
              {/* Track info */}
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
                <div className="progress-bar" style={{ width: `${progress}%` }} />
              </div>

              {/* Playback controls */}
              <div className="control-panel">
                <button 
                  onClick={prevTrack}
                  className="radio-button"
                  title="Previous Track"
                >
                  ⏮️
                </button>
                <button 
                  onClick={togglePlay}
                  className="radio-button radio-button-primary"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                <button 
                  onClick={nextTrack}
                  className="radio-button"
                  title="Next Track"
                >
                  ⏭️
                </button>
                <button 
                  onClick={stopPlayback}
                  className="radio-button"
                  title="Stop"
                >
                  ⏹️
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
                  style={{ flex: 1 }}
                />
              </div>

              {/* Debug buttons */}
              <div style={{ marginTop: '10px' }}>
                <button 
                  onClick={() => stationTracker.logUnlockedStations()}
                  className="radio-button"
                  style={{ marginRight: '5px', fontSize: '8px' }}
                >
                  Log Stations
                </button>
                <button 
                  onClick={() => debugUnlockStation('quantity')}
                  className="radio-button"
                  style={{ marginRight: '5px', fontSize: '8px' }}
                >
                  Unlock Quantity
                </button>
                <button 
                  onClick={() => stationTracker.resetStations()}
                  className="radio-button"
                  style={{ fontSize: '8px' }}
                >
                  Reset
                </button>
              </div>

              {/* Tab buttons */}
              <div className="tab-buttons">
                <button 
                  className={`tab-button ${activeTab === 'playlist' ? 'active' : ''}`}
                  onClick={() => setTab('playlist')}
                >
                  PLAYLIST
                </button>
                <button 
                  className={`tab-button ${activeTab === 'lyrics' ? 'active' : ''}`}
                  onClick={() => setTab('lyrics')}
                >
                  LYRICS
                </button>
              </div>
            </div>

            {/* Right side: Display (Playlist or Lyrics) */}
            <div className="radio-display">
              {/* Playlist panel */}
              {showPlaylist && (
                <div className="playlist-panel">
                  {tracks.map(track => {
                    const isUnlocked = stationTracker.isStationUnlocked(track.stationType);
                    return (
                      <div 
                        key={track.id}
                        onClick={isUnlocked ? () => changeTrack(track) : undefined}
                        className={`playlist-item ${currentTrack?.id === track.id ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`}
                      >
                        {track.title}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Lyrics panel */}
              {showLyrics && (
                <div className="lyrics-panel">
                  {currentTrack.lyrics}
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
    </>
  );
};

export default Radio; 