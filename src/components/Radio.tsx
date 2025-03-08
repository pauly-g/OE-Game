import React, { useState, useRef, useEffect } from 'react';
import { tracks, Track } from '../data/musicData';
import './Radio.css';

interface RadioProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Radio: React.FC<RadioProps> = ({ isOpen, onClose }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showTrackList, setShowTrackList] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  // Set the first track as default when component mounts
  useEffect(() => {
    if (tracks.length > 0 && !currentTrack) {
      setCurrentTrack(tracks[0]);
    }
  }, []);

  // Handle play/pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }
    setIsPlaying(!isPlaying);
  };

  // Handle track change
  const changeTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(false);
    setCurrentTime(0);
    setProgress(0);
    
    // Let the useEffect handle play after source is updated
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
        });
        setIsPlaying(true);
      }
    }, 0);
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
    }
  };

  // Toggle lyrics display
  const toggleLyrics = () => {
    setShowLyrics(!showLyrics);
  };

  // Toggle track list display
  const toggleTrackList = () => {
    setShowTrackList(!showTrackList);
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    
    const progressContainer = e.currentTarget;
    const clickPosition = e.clientX - progressContainer.getBoundingClientRect().left;
    const clickPercentage = clickPosition / progressContainer.offsetWidth;
    const newTime = clickPercentage * duration;
    
    audioRef.current.currentTime = newTime;
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

  if (!isOpen) return null;

  return (
    <div className="mt-4 w-full max-w-6xl mx-auto radio-container rounded-lg overflow-hidden transform transition-all">
      {/* Main player section */}
      <div className="p-3 radio-header flex items-center justify-between">
        <div className="text-lg font-bold text-white pixel-art">🎶 WAREHOUSE RADIO</div>
        <button 
          onClick={onClose}
          className="text-gray-300 hover:text-white"
        >
          ✕
        </button>
      </div>

      {currentTrack && (
        <>
          <audio 
            ref={audioRef} 
            onEnded={nextTrack}
            onLoadedMetadata={handleMetadataLoaded}
          />

          <div className="p-4">
            {/* Now playing info */}
            <div className="flex justify-between items-center mb-3">
              <div className="text-white pixel-art">
                <div className="text-md">{currentTrack.title}</div>
                <div className="text-xs text-gray-400">{currentTrack.artist}</div>
              </div>
              <div className="text-white text-xs pixel-art">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Progress bar */}
            <div 
              className="progress-container w-full mb-4 cursor-pointer"
              onClick={handleProgressClick}
            >
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={prevTrack}
                  className="radio-button p-2 rounded"
                >
                  ⏮️
                </button>
                <button 
                  onClick={togglePlay}
                  className="radio-button radio-button-primary p-2 rounded w-12 h-12 flex items-center justify-center"
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                <button 
                  onClick={nextTrack}
                  className="radio-button p-2 rounded"
                >
                  ⏭️
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-white pixel-art">VOL</div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={volume}
                  onChange={handleVolumeChange}
                  className="pixel-slider w-20"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button 
                onClick={toggleLyrics}
                className="text-sm text-white bg-indigo-700 px-3 py-1 rounded hover:bg-indigo-600"
              >
                {showLyrics ? 'HIDE LYRICS' : 'SHOW LYRICS'}
              </button>
              <button 
                onClick={toggleTrackList}
                className="text-sm text-white bg-indigo-700 px-3 py-1 rounded hover:bg-indigo-600"
              >
                {showTrackList ? 'HIDE TRACKS' : 'SHOW TRACKS'}
              </button>
            </div>

            {/* Lyrics panel */}
            {showLyrics && (
              <div className="mt-4 p-3 bg-gray-700 rounded-lg max-h-32 overflow-y-auto">
                <h3 className="text-sm font-semibold mb-2 text-white">Lyrics</h3>
                <p className="text-sm whitespace-pre-line text-gray-300">{currentTrack.lyrics}</p>
              </div>
            )}

            {/* Track list panel */}
            {showTrackList && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-2 text-white">Track List</h3>
                <div className="radio-track-list overflow-y-auto p-2 rounded">
                  {tracks.map(track => (
                    <div 
                      key={track.id}
                      onClick={() => changeTrack(track)}
                      className={`
                        text-sm p-2 rounded cursor-pointer
                        ${currentTrack?.id === track.id ? 'bg-indigo-900 text-white' : 'hover:bg-gray-700 text-gray-300'}
                      `}
                    >
                      {track.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Radio; 