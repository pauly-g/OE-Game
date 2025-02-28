# Order Editing - The Game: Gameplay Mechanics Documentation

## Core Mechanics

### Player Movement
- Player moves in four directions using arrow keys
- Character animations change based on direction and movement state
- Player is constrained to the screen boundaries
- Collision detection prevents walking through stations
- Player can move freely while carrying an edit and near stations

### Edit Handling Mechanics
- **Picking Up Edits**: 
  - Press spacebar when near a station to pick up an edit
  - The edit icon follows the player with appropriate offsets based on direction
  - Player can move freely while carrying an edit

- **Applying Edits to Orders**:
  - Press spacebar when near an order to apply the carried edit
  - If the edit is valid for the order, it will be applied with a visual checkmark
  - If the edit is invalid or applied away from an order, it will dissipate with a particle effect

### Stations
- Each station produces a specific type of edit
- **Station Unlocking Progression**:
  - Only one station is unlocked and visible at the start of the game
  - A new station is unlocked every 5 completed orders (not including power-up auto-completed orders)
  - When a station unlocks, a notification appears on screen
  - Stations maintain their unlocked state throughout the game session
- **Station Collision**:
  - Stations have robust collision boundaries to prevent player from walking through
  - Collision detection uses precise player and station bounds
  - Tracking previous player position prevents both sliding and walking through stations

### Orders
- Orders move from left to right on the conveyor belt
- **Order Edit Requirements**:
  - Each order requires a specific number of edits to be considered complete
  - At the start, orders require only 1 edit each
  - As more stations unlock, individual boxes may require multiple edits:
    - After 2nd station: Some boxes require 2 different edits
    - After 3rd station: Some boxes require 3 different edits
    - After 4th station: Some boxes require 4 different edits
    - After 5th station: Some boxes may require up to 5 different edits
  - Multi-edit boxes are interspersed with simpler boxes
  - As the game progresses, the frequency of multi-edit boxes increases
  - **Visual Representation**:
    - Orders with 1-3 edits display icons in a horizontal row
    - Orders with 4-5 edits display icons in a grid pattern
    - Checkmarks appear above corresponding icons when edits are applied
    - Multiple edits can be applied to the same order until all required edits are completed
- Completing orders increases score and potentially unlocks new stations
- **Difficulty Progression**:
  - Conveyor belt speed gradually increases as stations unlock
  - Time between new orders decreases as stations unlock
  - Orders move faster across the screen as you progress

### Lives System
- Player starts with 3 lives, displayed as hearts in the top left corner
- Lives are lost when orders move off the screen before being completed
- Additional lives can be gained by collecting Free Life power-ups
  - Free Life power-ups appear on the conveyor belt at specific milestones:
    - First one appears after 15 edits
    - Second one appears after 65 edits
    - Third one appears after 165 edits (maximum of 3 per game)
  - Player must get close to the Free Life power-up and press space to collect it
  - Collecting a Free Life creates a confetti and heart emoji celebration effect

### Game Over Screen
- Game over screen displays when player fails to complete orders in time
- **Restart Options**:
  - Click the "Click to Restart" button to start a new game
  - Press the spacebar to quickly restart the game
- Final score is displayed on the game over screen

## Technical Implementation Details

### Key Components in Level1Scene.ts

#### Edit Pickup System
```typescript
// The tryPickupFromStation method handles checking if player is near a station
private tryPickupFromStation() {
  const playerBounds = new Phaser.Geom.Rectangle(
    this.player.x - 40,
    this.player.y - 40,
    80, 80
  );
  
  let pickedUp = false;
  
  for (const station of this.stations) {
    if (!station.isUnlocked) continue;
    
    if (Phaser.Geom.Rectangle.Overlaps(playerBounds, station.bounds)) {
      // We're near a station - pick up the edit
      this.pickupEdit(station);
      pickedUp = true;
      break;
    }
  }
  
  return pickedUp;
}
```

#### Edit Application System
```typescript
// The tryApplyEditToOrder method handles dropping edits onto orders
private tryApplyEditToOrder() {
  if (!this.carriedEdit) return;
  
  const playerBounds = new Phaser.Geom.Rectangle(
    this.player.x - 40,
    this.player.y - 40,
    80, 80
  );
  
  let applied = false;
  
  for (const order of this.orders) {
    const orderBounds = new Phaser.Geom.Rectangle(
      order.x - 50,
      order.y - 50,
      100, 100
    );
    
    if (Phaser.Geom.Rectangle.Overlaps(playerBounds, orderBounds)) {
      this.applyEditToOrder(order);
      applied = true;
      break;
    }
  }
  
  if (!applied) {
    this.discardEdit();
  }
}
```

#### Player Animation System
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

### Collision Detection System

#### Player-Station Collision Detection
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
- **Key implementation**:
```typescript
// If collision detected, restore previous position completely
if (collision) {
  this.player.x = prevX;
  this.player.y = prevY;
}
```

### Debugging Game Issues
- **Problem**: Difficulty tracking down issues in the game logic
- **Solution**: Use the GameDebugger utility with appropriate log levels
- **Key implementation**:
```typescript
// For general information
gameDebugger.info('Order completed');

// For debug information
gameDebugger.debug('Collision detected with station');

// For warnings
gameDebugger.warn('Order nearly expired');

// For errors
gameDebugger.error('Failed to load asset');
```

## Development Reference

### Important File Locations
- `src/game/scenes/Level1Scene.ts`: Main gameplay logic
- `src/game/utils/debug.ts`: Debug utilities
- `public/assets/`: Game assets (sprites, audio, etc.)

### Key Methods for Edit Mechanics
- `tryPickupFromStation()`: Handles edit pickup from stations
- `pickupEdit()`: Creates and attaches the edit to the player
- `tryApplyEditToOrder()`: Checks if player can apply edit to an order
- `applyEditToOrder()`: Applies edit to an order if valid
- `discardEdit()`: Creates particles when an edit is discarded
