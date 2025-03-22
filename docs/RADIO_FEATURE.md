# Radio Feature Documentation

## Overview

The Radio feature allows players to listen to music while playing the game. It includes a horizontal Winamp-inspired music player with 8-bit styling, playback controls on the left, and a playlist/lyrics display on the right. The music continues to play even when the player UI is closed.

## Implementation Details

### Directory Structure

```
src/
├── components/
│   ├── Radio.tsx         # Main Radio component with player UI and controls
│   ├── Radio.css         # Custom CSS for 8-bit Winamp styling
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

2. **Horizontal Layout**
   - Controls on the left side (playback controls, volume, track info)
   - Display panel on the right side (playlist or lyrics)
   - Tabs to switch between playlist and lyrics view

3. **8-Bit Styling**
   - "Press Start 2P" pixel font throughout the interface
   - Pixel-perfect buttons and controls
   - Retro green-on-black LCD-style displays
   - 8-bit inspired color scheme

4. **Mini Player**
   - When the main UI is closed but music is playing, a mini-player appears
   - Allows quick control of playback without opening the full interface

5. **UI Integration**
   - Radio button positioned next to the instructions
   - Player appears below the game without affecting the game's display
   - Doesn't shrink or resize the main game when open

## Usage

1. Click the "Order Editing Radio" button next to the game instructions to open the player
2. Use the playback controls on the left to manage music playback
3. The equalizer animation indicates when music is playing
4. Click the progress bar to seek to different parts of the track
5. Use the PLAYLIST and LYRICS tabs to switch between views in the right panel
6. Adjust volume using the slider
7. Close the player with the X button - music continues playing
8. Use the mini-player that appears when the main UI is closed to control playback

## Technical Notes

- The Radio component is completely separate from the game's core functionality
- Music files are located in the `public/game/Music/OE-Radio` directory
- Track data and lyrics are stored in `musicData.ts` for easy management
- The audio element is handled separately from the UI to allow background playback
- The player uses the "Press Start 2P" Google Font for authentic 8-bit typography
- The audio element continues playing even when the UI is closed (background audio)
- The player's layout is designed to be more horizontal than vertical

## Future Enhancements

- Implement shuffle and repeat functionality
- Add spectrum analyzer visualization
- Add ability to create and save playlists
- Add keyboard shortcuts for media control
- Implement more Winamp features like an equalizer control 