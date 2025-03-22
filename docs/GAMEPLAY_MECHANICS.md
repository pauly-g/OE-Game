# Order Editing - The Game: Comprehensive Game Mechanics & Architecture Documentation

## Core Gameplay Overview

"Order Editing - The Game" is a fast-paced arcade-style game where players handle customer order edits on a virtual conveyor belt. As a warehouse worker, your job is to collect various edits from stations around the warehouse and apply them to orders before they leave the conveyor belt.

## Game Objectives

- Apply the correct edits to each order box on the conveyor belt
- Complete as many orders as possible to maximize your score
- Unlock additional editing stations by completing orders
- Earn and use power-ups to handle peak order volumes
- Survive as long as possible without losing all your lives

## Core Mechanics

### Player Movement
- Player moves in four directions using arrow keys (↑, ↓, ←, →)
- Character animations change based on direction and movement state
- Player is constrained to the screen boundaries
- Collision detection prevents walking through stations
- Cannot walk onto the conveyor belt (blocked by collision detection)
- Can carry up to 3 different types of edits simultaneously
- Player movement speed is set to 4 (reduced from the original 8 for better control)

### Player Character

- Has distinctive animations for idle and movement in all four directions
- Applies edits to orders when standing near them and pressing spacebar
- Previous position tracking prevents both sliding and walking through stations
- Animation frame rate is 8 frames per second (125ms per frame)
- Character sprite has 6 frames for each animation sequence

### Edit Handling Mechanics

- **Picking Up Edits**: 
  - Press spacebar when near a station to pick up an edit
  - Each station provides a specific type of edit
  - Player can collect up to 3 different edits at a time (no duplicates)
  - The edit icons follow the player with appropriate offsets based on direction
  - Warning message displays when trying to pick up a duplicate edit type

- **Applying Edits to Orders**:
  - Press spacebar when near an order to apply the carried edit
  - Edits are used in a first-in-first-out (FIFO) queue
  - The next edit to be used is visually highlighted
  - If the edit is valid for the order, it will be applied with a visual checkmark
  - If the edit is invalid, a failure indicator (❌) appears but the edit isn't consumed
  - Wrong edits show a failure animation but aren't consumed
  - Discarded edits (when applied away from orders) dissipate with a particle effect

### Conveyor Belt

- Moves from left to right across the screen
- Speed increases gradually over time, up to a maximum
- Orders appear on the left side and exit on the right
- Player must apply edits before orders reach the right edge
- Contains directional arrows showing the flow of orders
- Initial conveyor speed is 0.5 (reduced from 2 for a gentler start)
- Maximum conveyor speed is 3 (reduced from 4 to maintain playability)
- Conveyor exerts a pushing force on the player, pushing them towards the right

## Game Elements

### Stations
- Each station produces a specific type of edit
- **Station Types**:
  1. **Address Edit (🏠)** - For updating delivery address information
  2. **Quantity Edit (🔢)** - For changing the quantity of items in an order
  3. **Discount Code (🏷️)** - For applying promotional discounts
  4. **Change Product (🔄)** - For swapping products in an order
  5. **Need Invoice (📄)** - For adding invoice documentation
  6. **Cancel Order (❌)** - For processing order cancellations

- **Station Unlocking Progression**:
  - Only the first station (Address Edit) is unlocked at the start of the game
  - A new station is unlocked every 5 successfully applied edits
  - Stations unlock in a fixed order (Address → Quantity → Discount → Product → Invoice → Cancel)
  - When a station unlocks, a notification appears on screen
  - Stations maintain their unlocked state throughout the game session
  - Newly unlocked stations appear with a fade-in and scale animation for emphasis

- **Station Collision**:
  - Stations have robust collision boundaries to prevent player from walking through
  - Collision detection uses precise player and station bounds
  - Tracking previous player position prevents sliding and clipping through stations
  - Player bounds for collision are 28x28 pixels
  - Station bounds are expanded by 4 pixels in each dimension for reliable collision detection

### Orders

- Appear as cardboard boxes with emoji icons showing required edits
- Move from left to right on the conveyor belt
- Orders maintain consistent 40px spacing on the conveyor belt
- Orders never require duplicate edit types
- Orders generation is controlled by a timer with adjustable delays

- **Order Edit Requirements**:
  - Each order requires 1-6 different types of edits
  - As more stations unlock, individual boxes may require multiple edits
  - Multi-edit boxes are interspersed with simpler boxes
  - As the game progresses, the frequency of multi-edit boxes increases
  - Order complexity increases with game progression using a probability system

- **Order Sizes**:
  - Orders have dynamic sizes based on the number of edits required:
    - 1-2 edits: Small box (110px + (numEdits * 10)px width × 70px height)
    - 3-4 edits: Medium box (130px + ((numEdits - 2) * 15)px width × 75-100px height)
    - 5-6 edits: Large box (160px + ((numEdits - 4) * 20)px width × 120px height)

- **Visual Representation**:
  - Orders with 1-3 edits display icons in a horizontal row
  - Orders with 4-6 edits display icons in a grid pattern
  - Checkmarks appear above corresponding icons when edits are applied
  - Multiple edits can be applied to the same order until all required edits are completed
  - Completed orders show a happy wiggle animation and checkmark
  - Failed orders display an angry emoji (😡) when exiting the screen
  - Completed orders show a heart emoji (❤️) when exiting

### Speech Bubbles and Comments

- Orders display speech bubbles with customer comments
- Comments are context-specific to the edit type required
- The system prevents repetition of recently shown comments (tracks last 5)
- Special comments appear during power-up mode
- Comments are designed to be humorous and fit the theme of each edit type
- Speech bubbles disappear when orders move beyond a certain point on the screen

## User Interface Elements

### Score Display
- Shows the current player score in the top center
- Features a wooden sign background for visual distinction
- Sign includes a shadow, grain texture, and nail decorations
- Wooden sign dimensions: 180px width × 44px height
- Score text is bold, black on wooden background for readability
- The sign has a darker border and realistic wood grain texture

### Lives Display
- Lives are displayed as hearts (❤️) in the top left corner
- Hearts are positioned horizontally with 6px spacing between them
- Hearts are positioned with careful alignment (-42px from left edge, -10px vertical offset)
- Lives container features a wooden sign background matching the score display style
- Sign includes shadow, grain texture, and nail decorations
- Wooden sign dimensions: 110px width for 3 lives, dynamically resizing for more lives
- Hearts disappear from right to left when lives are lost
- When collecting extra lives, the wooden background expands to accommodate

### Station Unlock Notifications
- Appears when a new station is unlocked
- Features a dark wood background (0x3A2921) with wood border (0x6B4C3B)
- Includes wooden end caps for a realistic sign appearance
- Text is white with black outline for readability
- Shows both the station name and its emoji icon
- Centered on screen (at 50% width, 40% height)
- Appears with full opacity and fades out after 5 seconds
- Dimensions: 500px width × 60px height with 4px border
- Notification persists for 5 seconds to ensure player notices it

### Power-Up Timer
- Countdown display showing seconds remaining on active power-up
- Appears above the power switch when power-up is active
- Counts down from 30 seconds to 0

### Power-Up Switch
- Located on the right side of the screen
- Features a lever that can be activated by the player
- Visual indication when player is near the switch (flashing)
- Shows a ready indicator when power-up is available
- Switch has precise collision bounds for interaction
- Button flashes with a 1-second interval when ready

## Game Progression

### Difficulty Scaling

The game difficulty increases in 5 stages based on time played:

1. **Stage 0 (Initial)**: Mostly simple 1-2 edit orders (30% chance of 1 edit)
2. **Stage 1 (1 min)**: Slightly harder distribution
3. **Stage 2 (2 min)**: More 3+ edit orders appear
4. **Stage 3 (3 min)**: Fewer simple orders, more complex ones
5. **Stage 4 (4 min)**: Mostly complex orders
6. **Stage 5 (5 min)**: Very challenging distribution (30% chance of 6 edits)

As time progresses:
- Conveyor belt speed gradually increases up to a maximum value (from 0.5 to 3)
- Time between new orders decreases (starting at 5000ms and decreasing to 1500ms minimum)
- Orders move faster across the screen (orderSpeedMultiplier increases from 1.0 to 2.0)
- Each station unlock increases game difficulty slightly

### Lives System
- Player starts with 3 lives, displayed as hearts in the top left corner
- Lives are lost when orders move off the screen before being completed
- The game ends when all lives are lost
- Additional lives can be gained using the F key cheat

## Scoring System

- Base points for applying an edit: 10 points
- Completion bonus: 25 points × number of edits in the order
- Higher scores come from completing complex multi-edit orders
- Score is displayed prominently in the wooden sign at the top center

## Visual Feedback

### Order Status Indicators

- **Pending Edits**: Displayed as emoji icons in the order box
- **Applied Edits**: Marked with green checkmarks (✅)
- **Completed Order**: Shows a checkmark and performs a happy wiggle animation
- **Failed Order**: Displays an angry emoji (😡) when exiting the screen
- **Completed Order Exiting**: Shows a heart emoji (❤️) when exiting the screen

### Player Feedback

- **Wrong Edit**: Red X symbol (❌) with shake animation
- **Max Carried Edits**: Warning message when trying to exceed the 3-edit limit
- **Duplicate Edit**: Warning message when trying to pick up the same edit type twice
- **Power-Up Ready**: Flashing lever and "Ready!" text
- **Order Complete**: Happy wiggle animation and checkmark

## Power-Up System

- Power-ups become available after completing 10 orders manually
- A power switch appears that can be activated by the player
- When active, power-ups last for 30 seconds and:
  - Auto-complete new orders as they appear
  - Auto-complete existing orders on the conveyor belt
  - Display a countdown timer showing remaining time
- Power-up switch is positioned at 76% from the left and 52% from the top + 50px
- Power-up system tracks which orders were created during power-up mode

## Radio Feature

The game includes a music player radio system with the following features:

- **Order Editing Radio**: Replaces the original "Warehouse Radio" name
- **Music Unlocking**: New music tracks unlock as game stations unlock
- **Track Variety**:
  - Background music tracks (always available)
  - Thematic songs for each station type (unlocked progressively)
- **Player Interface**:
  - 8-bit Winamp-inspired horizontal player
  - Play/pause/stop controls
  - Volume slider
  - Track progress bar
  - Animated equalizer visualizer
  - Playlist and lyrics tabs
- **Persistence**:
  - Music continues playing when UI is closed
  - Music state is preserved across component remounts
  - Unlocked stations are tracked in localStorage
- **Integration**:
  - Radio button in the main UI
  - Notification system for newly unlocked songs
  - Station tracker syncs game progress with radio availability

## Cheat Codes

For testing and demonstration purposes:

- **D key**: Activates the power-up
- **C key**: Unlocks all stations immediately
- **F key**: Adds a life

## Game Over Screen
- Game over screen displays when player loses all lives
- **Restart Options**:
  - Click the "Click to Restart" button to start a new game
  - Press the spacebar to quickly restart the game
- Final score is displayed on the game over screen

## Game Architecture & Technical Implementation

### Technology Stack
- **Frontend Framework**: Built with React.js for the UI container and game wrapper
- **Game Engine**: Phaser 3 - A powerful HTML5 game framework
- **Programming Language**: TypeScript for type safety and better code organization
- **Build System**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS for responsive design outside the game canvas

### Architectural Patterns
- **Component-Based Architecture**: Game elements are organized into reusable components
- **Scene Management**: Phaser's scene system for managing different game states 
- **Event-Driven Communication**: Custom events for cross-component messaging
- **Singleton Utilities**: Shared services like `stationTracker` and `gameDebugger`
- **State Management**: Combination of Phaser's internal state and React state for UI

### Core Components

#### Game Scenes
1. **Level1Scene**: 
   - Main gameplay scene that handles player movement, collision detection, and game logic
   - Implements conveyor belt mechanics, order processing, and station interactions
   - Manages UI elements like score display, lives indicator, and power-up controls
   - Handles difficulty progression and game state

2. **GameOverScene**: 
   - Displays final score and restart option
   - Handles game reset and event dispatching for proper restart flow
   - Integrates with station and music systems for clean state transitions

#### React Components
1. **App**: Container component that initializes the Phaser game and manages top-level UI
2. **Radio**: Music player with playlist, controls, and visualizer
3. **RadioButton**: Toggle for the Radio component
4. **SongNotification**: Notification for newly unlocked songs

#### Utility Classes
1. **StationTracker**: Manages unlocked stations across game sessions with localStorage persistence
2. **GameDebugger**: Logging and debugging utilities for easier development
3. **SpeechBubble**: UI component for displaying customer comments

### Component Communication
- **Direct Method Calls**: For components with direct references
- **Custom Events**: For loosely coupled cross-component communication:
  - `stationUnlocked`: Triggered when a new station is unlocked
  - `gameRestartWithStations`: Ensures stations are properly reset on game restart
  - `forcePlayMusic`: Controls music playback from different contexts
  - `resetStations`: Forces a complete station reset

### Data Flow
1. Player interactions are captured by Phaser input handlers
2. Game state changes are managed within Phaser scenes
3. Key game events dispatch custom browser events
4. React components listen for relevant events and update UI accordingly
5. Persistent data is stored in localStorage and loaded on game initialization

### Performance Considerations
- Sprite animations use optimized frame rates (8fps) to balance smoothness and performance
- Phaser's built-in object pooling for frequently created/destroyed objects
- Batched UI updates to minimize DOM operations
- Efficient collision detection with simplified bounds

### Technical Challenges Solved
- **Cross-Component State Synchronization**: Using custom events to keep game state, station unlocks, and music player in sync
- **Game Restart Flow**: Handling proper state reset without page refresh
- **Responsive Layout**: Maintaining game aspect ratio across different screen sizes
- **Audio Management**: Persisting audio playback state between component remounts

The architecture is designed to be modular and extensible, making it easy to add new features or modify existing ones without significant refactoring.

## Common Issues and Fixes

### Player Movement Issues
- **Problem**: Player gets stuck or moves unexpectedly
- **Fix**: Ensure the `lastDirection` and `lastMoving` properties are properly tracked in the update method
- **Key code**: 
```typescript
if (direction !== this.lastDirection || (this.lastMoving !== isMoving)) {
  this.lastDirection = direction;
  this.lastMoving = isMoving;
}
```

### Station Collision Handling
- **Problem**: Player collision with stations doesn't work correctly
- **Solutions**: 
  1. **Save previous position** before applying any movement
  2. **Use precise collision boxes** (28x28 for player, slightly expanded for stations)
  3. **Restore previous position completely** when collision is detected
  4. **Add debug logging** to track collision issues
  
### Visual Content Positioning
- **Problem**: UI elements not aligned correctly
- **Solution**: Use careful positioning with pixel precision
- **Example**: Hearts in the lives display are positioned with exact pixel values (-42px from left edge, -10px vertical offset)

### Radio Play Issues
- **Problem**: Music doesn't continue when radio UI is closed
- **Solution**: Global audio state outside React lifecycle
- **Approach**: Use a global audio element and state that persists across component remounts

## Conclusion

"Order Editing - The Game" combines arcade action with warehouse order management in a unique gaming experience. The progressive difficulty, power-up system, and visual feedback create an engaging gameplay loop that challenges players to improve their efficiency and strategic thinking over time.

The modular code design allows for easy extension of gameplay features, such as adding new edit types or enhancing the power-up system in future updates. The integration of the radio feature adds musical depth to the game experience while providing rewards for game progress.
