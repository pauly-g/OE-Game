import React, { useState, useRef, useEffect } from 'react';
import { tracks, Track } from '../data/musicData';
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

  // Initialize global audio element if it doesn't exist
  useEffect(() => {
    if (!globalAudio) {
      globalAudio = new Audio();
      globalAudio.volume = globalAudioState.volume;
      
      // Add event listeners to global audio
      globalAudio.addEventListener('ended', () => {
        // Find next track
        if (globalAudioState.currentTrackId) {
          const currentIndex = tracks.findIndex(t => t.id === globalAudioState.currentTrackId);
          const nextIndex = (currentIndex + 1) % tracks.length;
          globalAudioState.currentTrackId = tracks[nextIndex].id;
          globalAudio!.src = tracks[nextIndex].src;
          globalAudio!.play().catch(console.error);
        }
      });
    }
    
    // Set up the audio reference
    audioRef.current = globalAudio;
    
    // Synchronize component state with global state
    if (globalAudioState.currentTrackId) {
      const track = tracks.find(t => t.id === globalAudioState.currentTrackId);
      if (track && track !== currentTrack) {
        setCurrentTrack(track);
      }
    } else if (tracks.length > 0 && !currentTrack) {
      // Set default track if none is playing
      setCurrentTrack(tracks[0]);
      globalAudioState.currentTrackId = tracks[0].id;
      if (globalAudio) {
        globalAudio.src = tracks[0].src;
      }
    }
    
    setIsPlaying(globalAudioState.isPlaying);
    setVolume(globalAudioState.volume);
    
    return () => {
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

  // Update audio source when currentTrack changes
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.src;
      audioRef.current.volume = volume;
      audioRef.current.load();
    }
  }, [currentTrack]);

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
                  {tracks.map(track => (
                    <div 
                      key={track.id}
                      onClick={() => changeTrack(track)}
                      className={`playlist-item ${currentTrack?.id === track.id ? 'active' : ''}`}
                    >
                      {track.title}
                    </div>
                  ))}
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