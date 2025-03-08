# Radio Feature Documentation

## Overview

The Radio feature allows players to listen to music while playing the game. It includes a music player with playback controls, a progress bar, timer, and a lyrics display.

## Implementation Details

### Directory Structure

```
src/
├── components/
│   ├── Radio.tsx         # Main Radio component with player UI and controls
│   ├── Radio.css         # Custom CSS for 8-bit styling
│   └── RadioButton.tsx   # Toggle button for showing/hiding the radio
├── data/
│   └── musicData.ts      # Track data including titles, artists, and lyrics
public/
└── game/
    └── Music/
        └── OE-Radio/
            ├── A Dress Issue.mp3
            ├── Quantity Blues.mp3
            ├── No Code.mp3
            ├── My Extra Large Mistake.mp3
            ├── Invoice of My Heart.mp3
            └── Cancel That Order (Please!).mp3
```

### Features

1. **Music Playback**
   - Play/pause functionality
   - Previous/next track navigation
   - Volume control
   - Track progress bar with seek functionality
   - Time display showing current position and total duration
   - Auto-advance to next track when current track ends

2. **Track Information**
   - Displays current track title and artist
   - Track list with clickable entries to change tracks

3. **Lyrics Display**
   - Toggle to show/hide lyrics
   - Scrollable lyrics text

4. **UI Integration**
   - Radio button positioned next to the instructions
   - Horizontally-oriented player that accordion-expands below the game screen
   - 8-bit retro styling to match the game aesthetic
   - Non-intrusive design that doesn't overlap with the game screen

## Usage

1. Click the "Warehouse Radio" button next to the instructions to open the player
2. Use the playback controls to manage music playback
3. Click the progress bar to seek to different parts of the track
4. Click "SHOW LYRICS" to display the lyrics for the current song
5. Click "SHOW TRACKS" to view and select from the track list
6. Adjust volume using the slider
7. Click the X button to close the player

## Technical Notes

- The Radio component is completely separate from the game's core functionality
- Music files are located in the `public/game/Music/OE-Radio` directory
- Track data and lyrics are stored in `musicData.ts` for easy management
- The audio element is controlled via React's `useRef` hook
- Song titles match the actual file names from the OE-Radio directory
- The player features a custom 8-bit styling using CSS
- The 'Press Start 2P' Google Font is used for authentic pixel typography

## Future Enhancements

- Implement shuffle and repeat functionality
- Add visualizer effect with 8-bit animations
- Add ability to create playlists
- Add keyboard shortcuts for media control 