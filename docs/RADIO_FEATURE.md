# Radio Feature Documentation

## Overview

The Radio feature allows players to listen to music while playing the game. It includes a music player with playback controls and a lyrics display.

## Implementation Details

### Directory Structure

```
src/
├── components/
│   ├── Radio.tsx         # Main Radio component with player UI and controls
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
   - Auto-advance to next track when current track ends

2. **Track Information**
   - Displays current track title and artist
   - Track list with clickable entries to change tracks

3. **Lyrics Display**
   - Toggle to show/hide lyrics
   - Scrollable lyrics text

4. **UI Integration**
   - Floating radio button in the bottom-right corner
   - Non-intrusive overlay design that doesn't interfere with gameplay
   - Clean, modern design consistent with the game's aesthetic

## Usage

1. Click the radio icon button in the bottom-right corner to open the radio player
2. Use the playback controls to manage music playback
3. Click "Show Lyrics" to display the lyrics for the current track
4. Select a track from the list to change the current song
5. Adjust volume using the slider
6. Click the X button or the radio icon again to close the player

## Technical Notes

- The Radio component is completely separate from the game's core functionality
- Music files are located in the `public/game/Music/OE-Radio` directory
- Track data and lyrics are stored in `musicData.ts` for easy management
- The audio element is controlled via React's `useRef` hook
- Song titles match the actual file names from the OE-Radio directory

## Future Enhancements

- Add progress bar for current track
- Implement shuffle and repeat functionality
- Add more tracks and categories
- Implement audio visualization
- Add ability to create playlists 