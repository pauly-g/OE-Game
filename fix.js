// Path to the file
const fs = require('fs');
const path = require('path');

// Read the file
let content = fs.readFileSync('./src/game/scenes/Level1Scene.ts', 'utf8');

// Fix 1: Replace the createConveyorArrows function with a simpler version that just returns
content = content.replace(
  /private createConveyorArrows\(width: number, centerX: number, centerY: number\) {[\s\S]*?(?=private createStations\(\) {|update\(time: number, delta: number\) {)/m,
  `private createConveyorArrows(width: number, centerX: number, centerY: number) {
    // Simply return without creating any arrows
    return;
  }

`
);

// Fix 2: Update the conveyor belt speed to match order speed
content = content.replace(
  /this\.conveyorBelt\.tilePositionX -= 2;/g,
  'this.conveyorBelt.tilePositionX -= this.conveyorSpeed;'
);

// Write the changes back to the file
fs.writeFileSync('./src/game/scenes/Level1Scene.ts', content);

console.log('Successfully modified Level1Scene.ts');
