import React, { useState, useRef, useEffect } from 'react';
import { tracks, Track } from '../data/musicData';

interface RadioProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Radio: React.FC<RadioProps> = ({ isOpen, onClose }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Update audio source when currentTrack changes
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.src;
      audioRef.current.volume = volume;
      audioRef.current.load();
    }
  }, [currentTrack]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 rounded-lg shadow-lg p-4 w-80 z-50 border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-blue-400">Warehouse Radio</h2>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {currentTrack && (
        <>
          <div className="mb-4">
            <div className="text-white font-semibold">{currentTrack.title}</div>
            <div className="text-gray-400 text-sm">{currentTrack.artist}</div>
          </div>

          <audio 
            ref={audioRef} 
            onEnded={nextTrack}
          />

          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={prevTrack}
              className="bg-gray-700 hover:bg-gray-600 rounded-full p-2"
            >
              ⏮️
            </button>
            <button 
              onClick={togglePlay}
              className="bg-blue-500 hover:bg-blue-600 rounded-full p-3 w-12 h-12 flex items-center justify-center"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button 
              onClick={nextTrack}
              className="bg-gray-700 hover:bg-gray-600 rounded-full p-2"
            >
              ⏭️
            </button>
          </div>

          <div className="mb-4">
            <label htmlFor="volume" className="block text-sm text-gray-400 mb-1">Volume</label>
            <input 
              type="range" 
              id="volume"
              min="0" 
              max="1" 
              step="0.01" 
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex justify-between items-center">
            <button 
              onClick={toggleLyrics}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {showLyrics ? 'Hide Lyrics' : 'Show Lyrics'}
            </button>
          </div>

          {showLyrics && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg max-h-48 overflow-y-auto">
              <h3 className="text-sm font-semibold mb-2">Lyrics</h3>
              <p className="text-sm whitespace-pre-line">{currentTrack.lyrics}</p>
            </div>
          )}
        </>
      )}

      <div className="mt-4">
        <h3 className="text-sm font-semibold mb-2">Track List</h3>
        <ul className="space-y-1">
          {tracks.map(track => (
            <li 
              key={track.id}
              onClick={() => changeTrack(track)}
              className={`
                text-sm p-2 rounded cursor-pointer
                ${currentTrack?.id === track.id ? 'bg-blue-900 text-white' : 'hover:bg-gray-700'}
              `}
            >
              {track.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Radio; 