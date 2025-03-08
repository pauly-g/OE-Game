# Radio Feature Documentation

## Overview

The Radio feature allows players to listen to music while playing the game. It includes a Winamp-inspired music player with playback controls, animated equalizer, progress bar, timer, and a lyrics display. The music continues to play even when the player UI is closed.

## Implementation Details

### Directory Structure

```
src/
├── components/
│   ├── Radio.tsx         # Main Radio component with player UI and controls
│   ├── Radio.css         # Custom CSS for Winamp-inspired styling
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
   - Play/pause/stop functionality
   - Previous/next track navigation
   - Volume control
   - Animated equalizer visualizer when music is playing
   - Track progress bar with seek functionality
   - Time display showing current position and total duration
   - Auto-advance to next track when current track ends
   - **Music continues playing when UI is closed**

2. **Track Information**
   - Displays current track title and artist in Winamp-style LCD display
   - Playlist with clickable entries to change tracks

3. **Tabbed Interface**
   - PLAYLIST tab for track selection
   - LYRICS tab for viewing song lyrics

4. **Mini Player**
   - When the main UI is closed but music is playing, a mini-player appears
   - Allows quick control of playback without opening the full interface

5. **UI Integration**
   - Radio button positioned next to the instructions
   - Winamp-inspired design with retro LCD displays
   - Continues playing when closed (background audio)
   - Full-width player with plenty of vertical space to avoid cutoff issues

## Usage

1. Click the "Warehouse Radio" button next to the game instructions to open the player
2. Use the playback controls to manage music playback (play/pause/stop/next/previous)
3. The equalizer animation indicates when music is playing
4. Click the progress bar to seek to different parts of the track
5. Use the PLAYLIST and LYRICS tabs to switch between views
6. Adjust volume using the slider
7. Close the player with the X button - music continues playing
8. Use the mini-player that appears when the main UI is closed to control playback

## Technical Notes

- The Radio component is completely separate from the game's core functionality
- Music files are located in the `public/game/Music/OE-Radio` directory
- Track data and lyrics are stored in `musicData.ts` for easy management
- The audio element is handled separately from the UI to allow background playback
- The player features a Winamp-inspired UI with custom styling
- The 'VT323' Google Font is used for authentic LCD-style text display
- The audio element continues playing even when the UI is closed (background audio)

## Future Enhancements

- Implement shuffle and repeat functionality
- Add spectrum analyzer visualization
- Add ability to create and save playlists
- Add keyboard shortcuts for media control
- Implement more Winamp features like an equalizer control 