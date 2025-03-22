# Order Editing - The Game: Comprehensive Game Mechanics Documentation

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

## Technical Implementation

### Order Generation

```typescript
private generateOrder = () => {
  // Select random edit types from unlocked stations
  const stationTypes = this.stations
    .filter(station => station.isUnlocked)
    .map(station => station.type);
    
  // Ensure we don't have duplicates by using the Fisher-Yates shuffle
  const shuffledTypes = [...stationTypes].sort(() => Math.random() - 0.5);
  
  // Take the first numEdits types (no duplicates)
  const selectedTypes: string[] = [];
  for (let i = 0; i < numEdits && i < shuffledTypes.length; i++) {
    selectedTypes.push(shuffledTypes[i]);
  }
  
  // Dynamic box sizing based on the number of edits
  if (numEdits <= 2) {
    // Small boxes for 1-2 edits
    bgWidth = 110 + (numEdits * 10);
    bgHeight = 70;
  } else if (numEdits <= 4) {
    // Medium boxes for 3-4 edits
    bgWidth = 130 + ((numEdits - 2) * 15);
    bgHeight = numEdits === 3 ? 75 : 100;
  } else {
    // Large boxes for 5-6 edits
    bgWidth = 160 + ((numEdits - 4) * 20);
    bgHeight = 120;
  }
}
```

### Order Complexity System

```typescript
// Determine order complexity based on unlocked stations
const maxPossibleEdits = Math.min(5, unlockedStations.length);

// Probability table for the number of edits (example for 5 unlocked stations)
// Format: [1 edit, 2 edits, 3 edits, 4 edits, 5 edits]
let editProbabilities = [0.3, 0.25, 0.25, 0.15, 0.05];

// Determine number of edits using probability table
const random = Math.random();
let cumulativeProbability = 0;
let numEdits = 1;

for (let i = 0; i < editProbabilities.length; i++) {
  cumulativeProbability += editProbabilities[i];
  if (random <= cumulativeProbability) {
    numEdits = i + 1;
    break;
  }
}
```

### Edit Application System

```typescript
private applyEditToOrder(order: Order) {
  if (this.carriedEdits.length === 0) return false;
  
  // Get the first edit in the queue (FIFO)
  const edit = this.carriedEdits[0];
  
  // Check if the order requires this edit type and it hasn't been applied yet
  if (order.types.includes(edit.type) && !order.completedEdits.includes(edit.type)) {
    // Success! Apply the edit
    order.completedEdits.push(edit.type);
    
    // Create a checkmark to show this edit has been applied
    this.markEditAsApplied(order, edit.type);
    
    // Increment total edits applied (for unlocking stations)
    this.totalEditsApplied++;
    
    // Check if we should unlock a new station (every 5 edits)
    if (this.totalEditsApplied >= 5 && 
        (this.totalEditsApplied - this.lastUnlockedAtEditCount) >= 5) {
      this.unlockNextStation();
    }
    
    // Increase score
    this.score += 10;
    
    // Check if order is now complete
    if (order.completedEdits.length === order.types.length) {
      this.completeOrder(order);
    }
    
    // Remove the used edit
    this.removeFirstEdit();
    
    return true;
  } else {
    // Wrong edit type - show failure feedback
    // ...
  }
}
```

### Lives Display Implementation

```typescript
private updateLivesDisplay() {
  // Clear any existing heart icons
  this.livesContainer.removeAll(true);
  
  // Heart emoji dimensions and positioning
  const heartWidth = 24;
  const spacing = 6;
  
  // Position hearts from left side (disappear from right when lost)
  // Start from the left edge of the container with padding
  const startX = -42; // Left edge of wooden sign with padding
  const yOffset = -10; // Move hearts up by 10px
  
  for (let i = 0; i < this.lives; i++) {
    const heartX = startX + (i * (heartWidth + spacing));
    const heart = this.add.text(
      heartX,
      yOffset, // Apply vertical offset to move hearts up
      '❤️',
      { fontSize: '24px' }
    );
    this.livesContainer.add(heart);
  }
  
  // Get parent container (the wooden sign)
  const parent = this.livesContainer.parentContainer;
  
  // If we have more than 3 hearts, resize the background
  if (parent && this.lives > 3) {
    // Calculate the new width based on number of hearts
    const totalWidth = (this.lives * heartWidth) + ((this.lives - 1) * spacing);
    const newWidth = Math.max(110, totalWidth + 24); // Add padding
    
    // Update the sizes of container elements
    shadow.width = newWidth;
    background.width = newWidth;
    texture.width = newWidth;
    
    // Update nail positions at corners
  }
}
```

### Station Unlock Notification System

```typescript
// Create a container for the station unlock notification
this.stationUnlockContainer = this.add.container(width * 0.5, height * 0.4);
this.stationUnlockContainer.setVisible(false);

// Create shadow for depth
const signShadow = this.add.rectangle(4, 4, 500, 60, 0x000000, 0.4).setOrigin(0.5);

// Create dark wood background
const signBackground = this.add.rectangle(0, 0, 500, 60, 0x3A2921).setOrigin(0.5);

// Create wood border (top, right, bottom, left)
const borderTop = this.add.rectangle(0, -30, 500, 4, 0x6B4C3B).setOrigin(0.5, 0.5);
const borderBottom = this.add.rectangle(0, 30, 500, 4, 0x6B4C3B).setOrigin(0.5, 0.5);
const borderLeft = this.add.rectangle(-250, 0, 4, 60, 0x6B4C3B).setOrigin(0.5, 0.5);
const borderRight = this.add.rectangle(250, 0, 4, 60, 0x6B4C3B).setOrigin(0.5, 0.5);

// Create simple end caps for the wooden sign
const leftCap = this.add.rectangle(-250, 0, 12, 40, 0x5C3C2E).setOrigin(0.5, 0.5);
const rightCap = this.add.rectangle(250, 0, 12, 40, 0x5C3C2E).setOrigin(0.5, 0.5);

// Create the text with proper setup
this.stationUnlockText = this.add.text(0, 0, '', {
  fontSize: '22px',
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 2,
  align: 'center'
}).setOrigin(0.5);
```

### Order Completion and Animations

```typescript
private completeOrder(order: Order) {
  // Mark as complete
  order.isComplete = true;
  
  // Happy wiggle animation
  this.tweens.add({
    targets: order.container,
    angle: { from: -5, to: 5 },
    duration: 120,
    ease: 'Sine.InOut',
    repeat: 3,
    yoyo: true,
    onComplete: () => {
      order.container.angle = 0;
    }
  });
  
  // Show completion indicator
  const completionEmoji = this.add.text(
    order.container.x,
    order.container.y - 40,
    '✅',
    { fontSize: '36px', stroke: '#000000', strokeThickness: 2 }
  ).setOrigin(0.5);
  
  // Add it to the container so it moves with the order
  order.container.add(completionEmoji);
}
```

### Player-Station Collision Detection

```typescript
// Track previous position before any movement occurs
const prevX = this.player.x;
const prevY = this.player.y;

// Allow player movement with arrow keys...

// Create precise player bounds for collision detection
const playerBounds = new Phaser.Geom.Rectangle(
  this.player.x - 14,
  this.player.y - 14,
  28,
  28
);

// Check for station collisions
for (const station of this.stations) {
  if (station && station.isUnlocked && station.bounds) {
    const stationBounds = new Phaser.Geom.Rectangle(
      station.bounds.x, station.bounds.y, 
      station.bounds.width, station.bounds.height
    );
    
    // Expand station bounds slightly for more reliable collision detection
    stationBounds.width += 4;
    stationBounds.height += 4;
    stationBounds.x -= 2;
    stationBounds.y -= 2;
    
    if (Phaser.Geom.Rectangle.Overlaps(playerBounds, stationBounds)) {
      // Collision detected - restore previous position
      collision = true;
      break;
    }
  }
}

// If collision occurred, restore previous position
if (collision) {
  this.player.x = prevX;
  this.player.y = prevY;
}
```

### Player Animation System

```typescript
// The updatePlayerAnimation method handles animation frames
private updatePlayerAnimation(time: number) {
  // Animation rate: 8 frames per second = 125ms per frame
  const frameDelay = 125; 
  
  if (time - this.lastFrameTime > frameDelay) {
    // Advance to next frame (looping from 6 back to 1)
    this.currentFrame = this.currentFrame >= 6 ? 1 : this.currentFrame + 1;
    this.lastFrameTime = time;
    
    // Update the texture with the new frame
    this.setPlayerDirectionTexture(this.lastDirection, this.lastMoving);
  }
}
```

### Power-Up System Implementation

```typescript
private updatePowerUp(delta: number) {
  if (this.powerUpActive) {
    // Decrement timer
    this.powerUpTimer -= delta;
    
    // Update countdown text
    const secondsLeft = Math.ceil(this.powerUpTimer / 1000);
    this.powerUpCountdownText.setText(`${secondsLeft}s`);
    
    // Check if power-up has expired
    if (this.powerUpTimer <= 0) {
      this.deactivatePowerUp();
    }
    
    // Auto-complete any existing orders that were created before power-up
    for (const order of this.orders) {
      if (!order.isComplete && !order.createdDuringPowerUp) {
        // Auto-complete logic...
      }
    }
  }
}
```

### Progressive Difficulty System

```typescript
// When unlocking a new station
private unlockNextStation() {
  // Increase game difficulty slightly
  this.orderSpeedMultiplier = Math.min(
    this.maxOrderSpeedMultiplier,
    this.orderSpeedMultiplier + 0.15
  );
  this.conveyorSpeed = Math.min(
    this.maxConveyorSpeed,
    this.conveyorSpeed + 0.25
  );
  this.nextOrderDelay = Math.max(1500, this.nextOrderDelay - 250);
}

// In the update method
// Move orders based on their speed multiplier
order.x += 0.5 * this.orderSpeedMultiplier;

// Conveyor belt pushes the player with increasing force
this.player.x += this.conveyorSpeed;
```

### Station Tracker System

```typescript
// Station Tracker for managing unlocked stations and radio integration
const isStationUnlocked = (stationType: string): boolean => {
  // Always unlock warehouse station
  if (stationType === 'warehouse') {
    return true;
  }
  
  // For all other stations, check the unlocked status
  const stations = getUnlockedStations();
  const isUnlocked = !!stations[stationType];
  return isUnlocked;
};

// Mark a station as unlocked
const unlockStation = (stationType: string): void => {
  const stations = getUnlockedStations();
  
  // Check if already unlocked
  if (stations[stationType] === true) {
    return;
  }
  
  // Update the state
  stations[stationType] = true;
  localStorage.setItem(UNLOCKED_STATIONS_KEY, JSON.stringify(stations));
  
  // Create a custom event to notify radio component
  const event = new CustomEvent('stationUnlocked', { 
    detail: { stationType, timestamp: Date.now() },
    bubbles: true
  });
  
  window.dispatchEvent(event);
}
```

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

## Game Architecture

The game is built using Phaser 3 with TypeScript, consisting of several key components:

1. **Level1Scene**: Main gameplay scene with player, orders, stations, and core mechanics
2. **GameOverScene**: Displays final score and restart option when the game ends
3. **SpeechBubble**: UI component for showing customer comments
4. **Radio**: Music player with unlockable tracks tied to station progress
5. **StationTracker**: Utility for tracking unlocked stations across components

## User Interface Elements

- **Score Display**: Shows current player score in the top corner with wooden sign styling
- **Lives Indicator**: Visual hearts showing remaining lives inside wooden sign container
- **Power-Up Timer**: Countdown display during active power-up
- **Station Signs**: Text labels identifying each edit station
- **Station Unlock Notification**: Announces newly unlocked stations with distinctive wood sign styling
- **Radio Button**: Toggle for displaying/hiding the music player interface

## Development Reference

### Important File Locations
- `src/game/scenes/Level1Scene.ts`: Main gameplay logic
- `src/game/utils/debug.ts`: Debug utilities
- `src/game/utils/stationTracker.ts`: Station unlocking and persistence
- `src/components/Radio.tsx`: Music player implementation
- `src/data/musicData.ts`: Track definitions and lyrics
- `public/assets/`: Game assets (sprites, audio, etc.)

### Key Methods for Edit Mechanics
- `tryPickupFromStation()`: Handles edit pickup from stations
- `pickupEdit()`: Creates and attaches the edit to the player
- `tryApplyEditToOrder()`: Checks if player can apply edit to an order
- `applyEditToOrder()`: Applies edit to an order if valid
- `discardEdit()`: Creates particles when an edit is discarded
- `updateLivesDisplay()`: Updates the hearts display with current lives count
- `unlockNextStation()`: Handles station unlocking and notification display
- `createPowerUpSwitch()`: Creates the power-up button with appropriate bounds

## Conclusion

"Order Editing - The Game" combines arcade action with warehouse order management in a unique gaming experience. The progressive difficulty, power-up system, and visual feedback create an engaging gameplay loop that challenges players to improve their efficiency and strategic thinking over time.

The modular code design allows for easy extension of gameplay features, such as adding new edit types or enhancing the power-up system in future updates. The integration of the radio feature adds musical depth to the game experience while providing rewards for game progress.
