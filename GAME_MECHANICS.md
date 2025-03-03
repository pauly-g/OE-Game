# Order Editing - The Game: Game Mechanics Documentation

## Core Gameplay Overview

"Order Editing - The Game" is a fast-paced arcade-style game where players handle customer order edits on a virtual conveyor belt. As a warehouse worker, your job is to collect various edits from stations around the warehouse and apply them to orders before they leave the conveyor belt.

## Game Objectives

- Apply the correct edits to each order box on the conveyor belt
- Complete as many orders as possible to maximize your score
- Unlock additional editing stations by completing orders
- Earn and use power-ups to handle peak order volumes
- Survive as long as possible without losing all your lives

## Game Elements

### Player Character

- Controlled with arrow keys (↑, ↓, ←, →)
- Can carry up to 3 different types of edits simultaneously
- Applies edits to orders when standing near them and pressing spacebar
- Cannot walk onto the conveyor belt (blocked by collision detection)
- Has distinctive animations for idle and movement in all four directions

### Conveyor Belt

- Moves from left to right across the screen
- Speed increases gradually over time, up to a maximum
- Orders appear on the left side and exit on the right
- Player must apply edits before orders reach the right edge

### Orders

- Appear as cardboard boxes with emoji icons showing required edits
- Each order requires 1-6 different types of edits
- Orders have dynamic sizes based on the number of edits required:
  - 1-2 edits: Small box
  - 3-4 edits: Medium box
  - 5-6 edits: Large box
- Orders maintain consistent 40px spacing on the conveyor belt
- Orders never require duplicate edit types

### Edit Stations

There are six types of edit stations, which unlock progressively:

1. **Address Edit (🏠)**
   - For updating delivery address information

2. **Quantity Edit (🔢)**
   - For changing the quantity of items in an order

3. **Discount Code (🏷️)**
   - For applying promotional discounts

4. **Change Product (🔄)**
   - For swapping products in an order

5. **Need Invoice (📄)**
   - For adding invoice documentation

6. **Cancel Order (❌)**
   - For processing order cancellations

### Edit Handling System

- Each station provides a specific type of edit
- Player can collect up to 3 different edits at a time (no duplicates)
- Edits are used in a first-in-first-out (FIFO) queue
- The next edit to be used is visually highlighted
- When an edit is applied to an order, it's removed from the player's queue
- Wrong edits show a failure indicator (❌) but aren't consumed

### Speech Bubbles and Comments

- Orders display speech bubbles with customer comments
- Comments are context-specific to the edit type required
- The system prevents repetition of recently shown comments
- Special comments appear during power-up mode

## Game Progression

### Station Unlocking

- Game starts with only the first station (Address Edit) unlocked
- Every 5 successfully applied edits unlocks a new station
- Stations unlock in a fixed order (Address → Quantity → Discount → Product → Invoice → Cancel)
- A notification appears when a new station is unlocked

### Difficulty Scaling

The game difficulty increases in 5 stages based on time played:

1. **Stage 0 (Initial)**: Mostly simple 1-2 edit orders (30% chance of 1 edit)
2. **Stage 1 (1 min)**: Slightly harder distribution
3. **Stage 2 (2 min)**: More 3+ edit orders appear
4. **Stage 3 (3 min)**: Fewer simple orders, more complex ones
5. **Stage 4 (4 min)**: Mostly complex orders
6. **Stage 5 (5 min)**: Very challenging distribution (30% chance of 6 edits)

As time progresses, the conveyor belt speed also gradually increases up to a maximum value.

## Scoring System

- Base points for applying an edit: 10 points
- Completion bonus: 25 points × number of edits in the order
- Higher scores come from completing complex multi-edit orders

## Lives and Failure

- Player starts with 3 lives
- A life is lost when an order reaches the end of the conveyor belt without all edits applied
- The game ends when all lives are lost

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

## User Interface Elements

- **Score Display**: Shows current player score in the top corner
- **Lives Indicator**: Visual hearts showing remaining lives
- **Power-Up Timer**: Countdown display during active power-up
- **Station Signs**: Text labels identifying each edit station
- **Station Unlock Notification**: Announces newly unlocked stations

## Game Architecture

The game is built using Phaser 3 with TypeScript, consisting of several key components:

1. **Level1Scene**: Main gameplay scene with player, orders, stations, and core mechanics
2. **GameOverScene**: Displays final score and restart option when the game ends
3. **SpeechBubble**: UI component for showing customer comments
4. **BuyerComments**: Data storage for various comment types

The structure follows a component-based architecture with clear separation of concerns between game logic, UI, and data.

## Conclusion

"Order Editing - The Game" combines arcade action with warehouse order management in a unique gaming experience. The progressive difficulty, power-up system, and visual feedback create an engaging gameplay loop that challenges players to improve their efficiency and strategic thinking over time.

The modular code design allows for easy extension of gameplay features, such as adding new edit types or enhancing the power-up system in future updates.
