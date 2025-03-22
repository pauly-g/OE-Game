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

### Player Character

- Has distinctive animations for idle and movement in all four directions
- Applies edits to orders when standing near them and pressing spacebar
- Previous position tracking prevents both sliding and walking through stations

### Edit Handling Mechanics

- **Picking Up Edits**: 
  - Press spacebar when near a station to pick up an edit
  - Each station provides a specific type of edit
  - Player can collect up to 3 different edits at a time (no duplicates)
  - The edit icons follow the player with appropriate offsets based on direction

- **Applying Edits to Orders**:
  - Press spacebar when near an order to apply the carried edit
  - Edits are used in a first-in-first-out (FIFO) queue
  - The next edit to be used is visually highlighted
  - If the edit is valid for the order, it will be applied with a visual checkmark
  - If the edit is invalid, a failure indicator (❌) appears but the edit isn't consumed
  - Wrong edits show a failure animation but aren't consumed

### Conveyor Belt

- Moves from left to right across the screen
- Speed increases gradually over time, up to a maximum
- Orders appear on the left side and exit on the right
- Player must apply edits before orders reach the right edge
- Contains directional arrows showing the flow of orders

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

- **Station Collision**:
  - Stations have robust collision boundaries to prevent player from walking through
  - Collision detection uses precise player and station bounds
  - Tracking previous player position prevents sliding and clipping through stations

### Orders

- Appear as cardboard boxes with emoji icons showing required edits
- Move from left to right on the conveyor belt
- Orders maintain consistent 40px spacing on the conveyor belt
- Orders never require duplicate edit types

- **Order Edit Requirements**:
  - Each order requires 1-6 different types of edits
  - As more stations unlock, individual boxes may require multiple edits
  - Multi-edit boxes are interspersed with simpler boxes
  - As the game progresses, the frequency of multi-edit boxes increases

- **Order Sizes**:
  - Orders have dynamic sizes based on the number of edits required:
    - 1-2 edits: Small box
    - 3-4 edits: Medium box
    - 5-6 edits: Large box

- **Visual Representation**:
  - Orders with 1-3 edits display icons in a horizontal row
  - Orders with 4-6 edits display icons in a grid pattern
  - Checkmarks appear above corresponding icons when edits are applied
  - Multiple edits can be applied to the same order until all required edits are completed

### Speech Bubbles and Comments

- Orders display speech bubbles with customer comments
- Comments are context-specific to the edit type required
- The system prevents repetition of recently shown comments
- Special comments appear during power-up mode

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
- Conveyor belt speed gradually increases up to a maximum value
- Time between new orders decreases
- Orders move faster across the screen

### Lives System
- Player starts with 3 lives, displayed as hearts in the top left corner
- Lives are lost when orders move off the screen before being completed
- The game ends when all lives are lost
- Additional lives can be gained using the F key cheat

## Scoring System

- Base points for applying an edit: 10 points
- Completion bonus: 25 points × number of edits in the order
- Higher scores come from completing complex multi-edit orders

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

## Power-Up System

- Power-ups become available after completing 10 orders manually
- A power switch appears that can be activated by the player
- When active, power-ups last for 30 seconds and:
  - Auto-complete new orders as they appear
  - Auto-complete existing orders on the conveyor belt
  - Display a countdown timer showing remaining time

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

## Game Architecture

The game is built using Phaser 3 with TypeScript, consisting of several key components:

1. **Level1Scene**: Main gameplay scene with player, orders, stations, and core mechanics
2. **GameOverScene**: Displays final score and restart option when the game ends
3. **SpeechBubble**: UI component for showing customer comments
4. **BuyerComments**: Data storage for various comment types

## User Interface Elements

- **Score Display**: Shows current player score in the top corner
- **Lives Indicator**: Visual hearts showing remaining lives
- **Power-Up Timer**: Countdown display during active power-up
- **Station Signs**: Text labels identifying each edit station
- **Station Unlock Notification**: Announces newly unlocked stations

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

## Conclusion

"Order Editing - The Game" combines arcade action with warehouse order management in a unique gaming experience. The progressive difficulty, power-up system, and visual feedback create an engaging gameplay loop that challenges players to improve their efficiency and strategic thinking over time.

The modular code design allows for easy extension of gameplay features, such as adding new edit types or enhancing the power-up system in future updates.
