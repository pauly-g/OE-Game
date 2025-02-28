/**
 * Level 1 Scene - Main Game Logic
 * 
 * Changes:
 * - Initial setup: Basic game mechanics and UI
 * - Added animations for stations and improved their positioning
 * - Updated player pick up and drop edit logic
 * - Enhanced station interactions with new functionality
 * - Enhanced UI for edit handling including text, outline, and popup messages
 * - Enhanced station graphics with standardized dimensions and centering
 * - Fixed power-up switch interaction which couldn't be triggered due to typo
 * - Improved conveyer belt physics that pushes player towards right
 * - Added helper functions and dynamic text for clearer UI feedback
 * - Updated order generation logic with improved handling
 * - Adjusted collision detection for more precise interactions
 * - Enhanced unlockNextStation with an improved animation, announcement, and reset of count
 * - Flipped conveyor belt arrows to point to the right instead of left
 * - Added conveyor belt push physics to move player rightward
 * - Improved station collision handling to prevent walking through stations and fix sliding issues
 * - Centered stations across the screen with better visibility
 * - Fixed the issue with edits being destroyed by only destroying them when successfully applied to an order
 * - Added visual feedback for invalid edits
 * - Implemented a cleaner discard edit effect with particle animations
 * - Fixed space bar handling to properly pick up edits with a press and carry them until released
 * - Enhanced tryApplyEditToOrder and discardEdit methods to properly handle dropping edits
 * - Enhanced pickupEdit method with better visual feedback and logging
 * - Fixed player movement: added screen boundaries, improved station interaction, and prevented sliding
 * - Fixed the movement code to allow the player to move when carrying an edit and when near stations
 * - IMPORTANT: Player must always be able to move when carrying an edit and near stations
 * - IMPORTANT: Character animations depend on tracking the lastDirection and lastMoving properties
 * - IMPORTANT: Proper collision detection with stations prevents walking through and sliding issues
 * - Fixed station unlocking to only reveal one station at a time, every 5 completed orders
 * - Added tracking of previous player position to properly handle collisions
 * - Fixed collision handling to prevent both sliding and walking through stations
 */
import Phaser from 'phaser';
import { gameDebugger } from '../utils/debug';

interface Order {
  id: string;
  types: string[];
  completedEdits: string[];
  x: number;
  y: number;
  container: Phaser.GameObjects.Container;
  isComplete: boolean;
  width: number;
  height: number;
}

interface Station {
  type: string;
  container: Phaser.GameObjects.Container;
  isUnlocked: boolean;
  bounds: Phaser.Geom.Rectangle | null;
}

export class Level1Scene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private orders: Order[] = [];
  private stations: Station[] = [];
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private dKey!: Phaser.Input.Keyboard.Key;
  private playerSpeed: number = 8;
  private carriedEdit: { type: string, icon: Phaser.GameObjects.Text } | null = null;
  private ordersCompleted: number = 0;
  private totalEditsApplied: number = 0;
  private freeLifeEditsThresholds: number[] = [15, 65, 165];
  private freeLifeCollected: boolean[] = [false, false, false];
  private freeLifeSprite: Phaser.GameObjects.Sprite | null = null;
  private lives: number = 3;
  private livesContainer!: Phaser.GameObjects.Container;
  private failedOrders: number = 0;
  private lastSpaceState: boolean = false;
  private orderGenerationTimer: Phaser.Time.TimerEvent | null = null;
  private nextOrderDelay: number = 3000;
  private orderSpeedMultiplier: number = 1.0;
  private maxOrderSpeedMultiplier: number = 2.0;
  private conveyorSpeed: number = 2;
  private maxConveyorSpeed: number = 4;
  private debug: boolean = false;
  private powerUpActive: boolean = false;
  private powerUpTimer: number = 0;
  private powerUpDuration: number = 30000;
  private powerUpText!: Phaser.GameObjects.Text;
  private stationUnlockText!: Phaser.GameObjects.Text;
  private powerUpSwitch!: Phaser.GameObjects.Container;
  private powerUpLight!: Phaser.GameObjects.Rectangle;
  private powerUpLever!: Phaser.GameObjects.Rectangle;
  private powerUpAvailable: boolean = false;
  private powerUpCountdownText!: Phaser.GameObjects.Text;
  private conveyorBelt!: Phaser.GameObjects.Rectangle;
  private lastDirection: 'up' | 'down' | 'left' | 'right' = 'down';
  private powerUpSwitchBounds!: Phaser.Geom.Rectangle;
  private lastMoving: boolean = false;
  private currentFrame = 1;
  private lastFrameTime = 0;
  private lastUnlockedAtOrderCount: number = 0;

  constructor() {
    super({ key: 'Level1Scene' });
    console.log('Level1Scene constructor called');
  }

  init(data?: { reset: boolean }) {
    console.log('Level1Scene init called', data);
    if (data?.reset) {
      this.reset();
    }
  }

  preload() {
    console.log('Level1Scene preload started');
    try {
      gameDebugger.info('Starting to load player animations');
      // Load player animations
      const directions = ['up', 'down', 'left', 'right'];
      directions.forEach(direction => {
        // Load all 6 frames for each animation
        for (let i = 1; i <= 6; i++) {
          // Load idle animations with proper spaces in filenames
          const idleKey = `idle ${direction} ${i}`;
          this.load.image(idleKey, `game/Sprite Images/idle ${direction} ${i}.png`)
            .on('filecomplete', () => {
              gameDebugger.info(`Loaded ${idleKey}`);
            })
            .on('loaderror', (key: string, _file: string, error: Error) => {
              gameDebugger.error(`Failed to load ${key}: ${error.message}`);
              // Load fallback sprite if main sprite fails
              this.load.image(idleKey, 'game/Sprite Images/fallback.png');
            });
          
          // Load walk animations with proper spaces in filenames
          const walkKey = `walk ${direction} ${i}`;
          this.load.image(walkKey, `game/Sprite Images/walk ${direction} ${i}.png`)
            .on('filecomplete', () => {
              gameDebugger.info(`Loaded ${walkKey}`);
            })
            .on('loaderror', (key: string, _file: string, error: Error) => {
              gameDebugger.error(`Failed to load ${key}: ${error.message}`);
              // Load fallback sprite if main sprite fails
              this.load.image(walkKey, 'game/Sprite Images/fallback.png');
            });
        }
      });

      // Load background
      this.load.image('background', 'game/Background/Background.webp')
        .on('filecomplete', () => {
          gameDebugger.info('Background loaded');
        })
        .on('loaderror', (_key: string, _file: string, error: Error) => {
          gameDebugger.error(`Failed to load background: ${error.message}`);
        });
        
      // Load free life sprite
      this.load.image('freelife', 'game/misc-assets/freelife.png')
        .on('filecomplete', () => {
          gameDebugger.info('Free life sprite loaded');
        })
        .on('loaderror', (_key: string, _file: string, error: Error) => {
          gameDebugger.error(`Failed to load free life sprite: ${error.message}`);
        });

      gameDebugger.info('Level1Scene preload completed');
    } catch (error) {
      gameDebugger.error('Error in preload:', error);
    }
  }

  private createPlayerAnimations() {
    try {
      console.log('Creating player animations');
      const directions = ['up', 'down', 'left', 'right'];
      
      // Clear any existing animations first
      this.anims.getAnimationNames().forEach(key => {
        if (key.startsWith('idle') || key.startsWith('walk')) {
          this.anims.remove(key);
        }
      });
      
      directions.forEach(direction => {
        // Create idle animation
        const idleKey = `idle-${direction}`;
        this.anims.create({
          key: idleKey,
          frames: [
            { key: `idle ${direction} 1` },
            { key: `idle ${direction} 2` },
            { key: `idle ${direction} 3` },
            { key: `idle ${direction} 4` },
            { key: `idle ${direction} 5` },
            { key: `idle ${direction} 6` }
          ],
          frameRate: 8,
          repeat: -1
        });

        // Create walk animation
        const walkKey = `walk-${direction}`;
        this.anims.create({
          key: walkKey,
          frames: [
            { key: `walk ${direction} 1` },
            { key: `walk ${direction} 2` },
            { key: `walk ${direction} 3` },
            { key: `walk ${direction} 4` },
            { key: `walk ${direction} 5` },
            { key: `walk ${direction} 6` }
          ],
          frameRate: 8,
          repeat: -1
        });
      });
      
      console.log('Player animations created successfully');
      
      // Log all available animations for debugging
      const animationKeys = this.anims.getAnimationNames();
      console.log('Available animations:', animationKeys);
      
    } catch (error) {
      console.error('Error creating player animations:', error);
    }
  }

  create() {
    console.log('Level1Scene create started');
    try {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Add background image if loaded
      if (this.textures.exists('background')) {
        const background = this.add.image(width / 2, height / 2, 'background');
        background.setDisplaySize(width, height);
        background.setDepth(-1);
      } else {
        console.warn('Background texture not loaded, using fallback color');
        this.cameras.main.setBackgroundColor('#1a202c');
      }

      // Create full-width conveyor belt
      const conveyorWidth = width * 0.95;
      const conveyorX = width * 0.5;
      const conveyorY = height * 0.85;
      this.conveyorBelt = this.add.rectangle(conveyorX, conveyorY, conveyorWidth, 40, 0x444444)
        .setStrokeStyle(2, 0x666666);
      this.createConveyorArrows(conveyorWidth, conveyorX, conveyorY);

      // Create player sprite after ensuring textures exist
      if (this.textures.exists('idle down 1')) {
        this.player = this.add.sprite(width * 0.5, height * 0.5, 'idle down 1');
        this.player.setScale(2.7);
        this.lastDirection = 'down'; // Set initial direction
        this.lastMoving = false;
        this.currentFrame = 1;
        this.lastFrameTime = 0;
        
        // Log available textures for debugging
        const textureKeys = this.textures.getTextureKeys();
        gameDebugger.info(`Available textures: ${textureKeys.length} textures loaded`);
        
        gameDebugger.info(`Initial sprite texture set to: idle down 1`);
      } else {
        console.error('Player sprite texture "idle down 1" not loaded');
        // Create a fallback rectangle for the player
        this.player = this.add.rectangle(width * 0.5, height * 0.5, 32, 32, 0xff0000) as unknown as Phaser.GameObjects.Sprite;
        this.player.setScale(2.7);
      }

      // Create stations before UI elements
      this.createStations();

      // Set up input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

      // Create UI elements
      this.createUI(width, height);

      // Start order generation
      this.orderGenerationTimer = this.time.addEvent({
        delay: this.nextOrderDelay,
        callback: this.generateOrder,
        callbackScope: this,
        loop: true
      });

      console.log('Level1Scene create completed');
    } catch (error) {
      console.error('Error in create:', error);
    }
  }

  private createUI(width: number, height: number) {
    this.scoreText = this.add.text(width - 20, 16, 'Score: 0', {
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(1, 0);

    // Create heart icons for lives instead of text
    this.livesContainer = this.add.container(25, 16);
    for (let i = 0; i < this.lives; i++) {
      const heartIcon = this.add.text(0, 0, '❤️', {
        fontSize: '28px'
      }).setOrigin(0.5, 0);
      this.livesContainer.add(heartIcon);
    }

    this.powerUpText = this.add.text(width * 0.5, 50, '', {
      fontSize: '24px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setVisible(false);

    this.stationUnlockText = this.add.text(width * 0.5, height * 0.4, '', {
      fontSize: '32px',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setVisible(false);

    // Create power-up switch in middle of screen
    this.createPowerUpSwitch(width * 0.9, height * 0.5);
  }

  private createPowerUpSwitch(x: number, y: number) {
    // Position in middle of screen
    this.powerUpSwitch = this.add.container(x, y);
    
    const base = this.add.rectangle(0, 0, 40, 40, 0xff0000)
      .setStrokeStyle(2, 0x666666);
    
    this.powerUpLever = this.add.rectangle(0, 0, 30, 30, 0xff0000)
      .setStrokeStyle(2, 0xff3333);
    
    this.powerUpLight = this.add.rectangle(0, 0, 10, 10, 0xff0000)
      .setStrokeStyle(2, 0xff3333);
    
    const text = this.add.text(0, 25, 'POWER', {
      fontSize: '12px',
      color: '#ffff00',
      align: 'center'
    }).setOrigin(0.5);

    this.powerUpCountdownText = this.add.text(0, -25, '', {
      fontSize: '16px',
      color: '#00ff00',
      align: 'center'
    }).setOrigin(0.5);
    
    // Set initial colors
    this.setButtonColor(0xff0000);
    
    this.powerUpSwitch.add([base, this.powerUpLever, this.powerUpLight, text, this.powerUpCountdownText]);
    
    this.powerUpSwitchBounds = new Phaser.Geom.Rectangle(
      this.powerUpSwitch.x - 20,
      this.powerUpSwitch.y - 20,
      40,
      40
    );
  }

  private setButtonColor(color: number) {
    if (!this.powerUpSwitch || !this.powerUpSwitch.list) return;
    
    const components = this.powerUpSwitch.list.filter(item => item instanceof Phaser.GameObjects.Rectangle);
    if (components.length < 3) return;
    
    components.forEach(component => {
      (component as Phaser.GameObjects.Rectangle).setFillStyle(color);
    });
  }

  private createConveyorArrows(width: number, centerX: number, centerY: number) {
    const arrowWidth = 30;
    const arrowHeight = 20;
    const arrowSpacing = 60;
    const numArrows = Math.floor(width / arrowSpacing);
    const startX = centerX - width/2 + arrowSpacing/2;

    for (let i = 0; i < numArrows; i++) {
      const arrow = this.add.triangle(
        startX + i * arrowSpacing, 
        centerY, 
        0, arrowHeight/2, 
        arrowWidth, 0,     
        0, -arrowHeight/2, 
        0x666666
      );

      this.tweens.add({
        targets: arrow,
        x: arrow.x + arrowSpacing,
        duration: 1000,
        ease: 'Linear',
        repeat: -1,
        onRepeat: () => {
          arrow.x = startX + i * arrowSpacing;
        }
      });
    }
  }

  private createStations() {
    const stationTypes = ['address', 'quantity', 'payment', 'discount', 'product', 'cancel'];
    
    // Calculate total width for all stations
    const spacing = 200; // Increased space between stations
    const totalWidth = (stationTypes.length - 1) * spacing;
    
    // Calculate starting X position to center all stations
    const startX = (this.cameras.main.width - totalWidth) / 2;
    const y = this.cameras.main.height * 0.2;

    stationTypes.forEach((type, index) => {
      const station: Station = {
        type,
        container: this.add.container(startX + (index * spacing), y),
        isUnlocked: index === 0, // Only first station starts unlocked
        bounds: null
      };

      const icon = this.add.text(0, 0, this.getStationIcon(type), {
        fontSize: '48px'  // Increase font size from 32px to 48px
      }).setOrigin(0.5);

      const base = this.add.rectangle(0, 0, 100, 100, 0x888888)  // Increase size from 60x60 to 100x100 and lighten color
        .setStrokeStyle(4, 0xaaaaaa);  // Thicker border with lighter color

      station.container.add([base, icon]);
      
      // Create bounds for collision detection
      station.bounds = new Phaser.Geom.Rectangle(
        station.container.x - 50,
        station.container.y - 50,
        100, 
        100
      );
      
      // Hide locked stations completely (alpha 0)
      if (!station.isUnlocked) {
        station.container.setAlpha(0);
      }

      this.stations.push(station);
    });
  }

  private getStationIcon(type: Station['type']): string {
    const icons = {
      address: '🏠',
      quantity: '#️⃣',
      payment: '💳',
      discount: '🏷️',
      product: '📦',
      cancel: '❌',
      emoji: '😊',
      grammar: '📝',
      color: '🎨',
      wording: '💬',
      styling: '👗'
    };
    return icons[type];
  }

  private removeOrder(index: number) {
    const order = this.orders[index];
    order.container.destroy();
    this.orders.splice(index, 1);
  }

  update(time: number, delta: number) {
    try {
      if (!this.player) return;

      // Add check for cursors
      if (!this.cursors) {
        gameDebugger.error('Cursors not initialized in update method');
        return;
      }

      // Check for 'd' key to activate powerup (cheat)
      if (Phaser.Input.Keyboard.JustDown(this.dKey)) {
        gameDebugger.info('Power-up cheat activated with D key');
        this.activatePowerUpSwitch();
      }

      // Process power-up status
      if (this.powerUpActive) {
        this.powerUpTimer -= delta;
        if (this.powerUpTimer <= 0) {
          this.deactivatePowerUp();
        } else {
          this.powerUpCountdownText.setText(`${Math.ceil(this.powerUpTimer / 1000)}s`);
        }
      }

      // Activate power-up after 10 edits
      if (!this.powerUpAvailable && !this.powerUpActive && this.ordersCompleted >= 10) {
        this.powerUpAvailable = true;
        this.setButtonColor(0x00ff00);
      }

      // Process player movement
      let isMoving = false;
      let direction = this.lastDirection;

      // Only check if near station for spacebar interactions, not to restrict movement
      let nearStation = this.isNearStation();
      
      // Save the previous player position before any movement
      const prevX = this.player.x;
      const prevY = this.player.y;
      
      // Check if player is on conveyor belt
      let onConveyorBelt = false;
      
      if (this.conveyorBelt && 
          this.player.y > this.conveyorBelt.y - 30 && 
          this.player.y < this.conveyorBelt.y + 30) {
        onConveyorBelt = true;
        // Move player to the right when on conveyor belt
        this.player.x += this.conveyorSpeed; // Conveyor speed that increases over time
        direction = 'right';
        isMoving = true;
      }

      // Always allow movement regardless of whether near a station or carrying an edit
      if (this.cursors.left.isDown) {
        this.player.x -= this.playerSpeed;
        direction = 'left';
        isMoving = true;
      } else if (this.cursors.right.isDown) {
        this.player.x += this.playerSpeed;
        direction = 'right';
        isMoving = true;
      }

      if (this.cursors.up.isDown) {
        this.player.y -= this.playerSpeed;
        direction = 'up';
        isMoving = true;
      } else if (this.cursors.down.isDown) {
        this.player.y += this.playerSpeed;
        direction = 'down';
        isMoving = true;
      }

      // Keep player within screen bounds
      if (this.player.x < 16) this.player.x = 16;
      if (this.player.x > this.cameras.main.width - 16) this.player.x = this.cameras.main.width - 16;
      if (this.player.y < 16) this.player.y = 16;
      if (this.player.y > this.cameras.main.height - 16) this.player.y = this.cameras.main.height - 16;

      // Only update direction if it changed or movement state changed
      if (direction !== this.lastDirection || (this.lastMoving !== isMoving)) {
        this.lastDirection = direction;
        this.lastMoving = isMoving;
      }

      // Update the animation regardless of movement changes
      this.updatePlayerAnimation(time);

      // Update orders
      this.updateOrders();

      // Update power-up state
      this.updatePowerUp();
      
      // Check for station unlock - only unlock new stations every 5 completed orders
      if (this.ordersCompleted > 0 && this.ordersCompleted % 5 === 0) {
        // Get the highest unlocked station index
        const highestUnlockedIndex = this.stations.reduce((highest, station, index) => {
          return station.isUnlocked ? index : highest;
        }, -1);
        
        // Only unlock if there are more stations to unlock and we haven't already unlocked for this milestone
        const nextToUnlock = highestUnlockedIndex + 1;
        if (
          nextToUnlock < this.stations.length && 
          !this.stations[nextToUnlock].isUnlocked &&
          this.lastUnlockedAtOrderCount !== this.ordersCompleted
        ) {
          this.unlockNextStation();
          this.lastUnlockedAtOrderCount = this.ordersCompleted;
        }
      }

      let collision = false;
      
      // Check for station collisions - create a more precise player bounds
      const playerBounds = new Phaser.Geom.Rectangle(
        this.player.x - 14,  // Made collision box slightly smaller (from 16 to 14)
        this.player.y - 14,  // to make collisions more accurate
        28,                  // Width (was 32)
        28                   // Height (was 32)
      );

      // Check for station collisions
      if (this.stations && this.stations.length > 0) {
        for (const station of this.stations) {
          if (station && station.isUnlocked && station.bounds) {
            // Use a tighter collision box for stations to prevent walking through them
            const stationBounds = new Phaser.Geom.Rectangle(
              station.bounds.x,
              station.bounds.y,
              station.bounds.width,
              station.bounds.height
            );
            
            // Expand the station bounds slightly to ensure we catch all collisions
            stationBounds.width += 4;
            stationBounds.height += 4;
            stationBounds.x -= 2;
            stationBounds.y -= 2;
            
            if (Phaser.Geom.Rectangle.Overlaps(playerBounds, stationBounds)) {
              // Calculate which side of the station the player is coming from
              const dx = this.player.x - (stationBounds.x + stationBounds.width / 2);
              const dy = this.player.y - (stationBounds.y + stationBounds.height / 2);
              
              // Calculate normalized direction factors (between -1 and 1)
              const normDx = dx / Math.max(Math.abs(dx), 0.1);
              const normDy = dy / Math.max(Math.abs(dy), 0.1);
              
              // Add a small buffer to prevent getting stuck against walls
              const bufferDistance = 2;
              
              // Always push out based on the closest edge and never slide
              if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal collision is dominant
                this.player.x = prevX + normDx * bufferDistance;
              } else {
                // Vertical collision is dominant
                this.player.y = prevY + normDy * bufferDistance;
              }
              
              collision = true;
              
              // Add debug information to help diagnose collision issues
              gameDebugger.debug(`Collision with ${station.type} station`);
              
              break;
            }
          }
        }
      }

      // Check for free life collection
      this.checkFreeLifeCollection(playerBounds);

      // Check for powerUpSwitchBounds
      if (this.powerUpSwitchBounds && Phaser.Geom.Rectangle.Overlaps(playerBounds, this.powerUpSwitchBounds)) {
        collision = true;
      }

      // Check for conveyorBelt
      if (!this.conveyorBelt) {
        gameDebugger.error('Conveyor belt not initialized in update method');
      } else {
        const conveyorBounds = new Phaser.Geom.Rectangle(
          this.conveyorBelt.x - this.conveyorBelt.width / 2,
          this.conveyorBelt.y - this.conveyorBelt.height / 2,
          this.conveyorBelt.width,
          this.conveyorBelt.height
        );

        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, conveyorBounds)) {
          collision = true;
        }
      }

      if (collision) {
        // Fully restore previous position - this prevents walking through stations
        this.player.x = prevX;
        this.player.y = prevY;
      }

      // Check for spaceKey
      if (!this.spaceKey) {
        gameDebugger.error('Space key not initialized in update method');
        return;
      }

      // Handle spacebar press for edit pickup/drop and free life collection
      const spacePressed = Phaser.Input.Keyboard.JustDown(this.spaceKey);
      if (spacePressed) {
        // Check if player is near free life
        if (this.freeLifeSprite && this.isNearFreeLife()) {
          this.collectFreeLife();
        } else if (this.carriedEdit && nearStation) {
          // Handle station interaction if carrying an edit
          this.tryApplyEditToOrder();
        } else if (this.carriedEdit) {
          // Drop edit if carrying one
          this.discardEdit();
        } else if (nearStation) {
          // Pickup edit if near a station
          this.pickupEdit(nearStation.type);
        }
      }
    } catch (error) {
      console.error('Error in update:', error);
    }
  }

  // Add missing methods for player animation and free life handling
  private updatePlayerAnimation(time: number) {
    if (!this.player) return;
    
    // Animation rate: 8 frames per second = 125ms per frame
    const frameDelay = 125; 
    
    if (time - this.lastFrameTime > frameDelay) {
      // Advance to next frame (looping from 6 back to 1)
      this.currentFrame = this.currentFrame >= 6 ? 1 : this.currentFrame + 1;
      this.lastFrameTime = time;
      
      // Set the texture directly based on direction, movement state, and current frame
      const prefix = this.lastMoving ? 'walk' : 'idle';
      const textureKey = `${prefix} ${this.lastDirection} ${this.currentFrame}`;
      
      if (this.textures.exists(textureKey)) {
        this.player.setTexture(textureKey);
        console.log(`Setting player texture to: ${textureKey}`); // Use console.log for visibility
      } else {
        // Try to use a fallback texture
        console.warn(`Texture not found: ${textureKey}, trying fallback`);
        
        // Try first frame as fallback
        const fallbackKey = `${prefix} ${this.lastDirection} 1`;
        if (this.textures.exists(fallbackKey)) {
          this.player.setTexture(fallbackKey);
          console.log(`Using fallback texture: ${fallbackKey}`);
        } else {
          console.error(`No textures found for ${prefix} ${this.lastDirection}`);
          // Force-set to a known texture we loaded in preload as absolute fallback
          this.player.setTexture('idle down 1');
        }
      }
    }
  }

  private checkFreeLifeCollection(playerBounds: Phaser.Geom.Rectangle) {
    // Check if we should spawn a free life based on total edits applied
    for (let i = 0; i < this.freeLifeEditsThresholds.length; i++) {
      if (this.totalEditsApplied >= this.freeLifeEditsThresholds[i] && !this.freeLifeCollected[i]) {
        // If we don't have a free life sprite yet, create one
        if (!this.freeLifeSprite) {
          this.spawnFreeLife();
        }
        break;
      }
    }

    // If there's a free life on screen, check if player is near it
    if (this.freeLifeSprite) {
      // Create bounds for the free life sprite
      const freeLifeBounds = new Phaser.Geom.Rectangle(
        this.freeLifeSprite.x - 15,
        this.freeLifeSprite.y - 15,
        30,
        30
      );

      // Animate the free life (hover effect)
      this.freeLifeSprite.y += Math.sin(this.time.now / 300) * 0.5;
      
      // Move free life along conveyor belt
      if (this.freeLifeSprite.x > this.cameras.main.width + 20) {
        // If it goes offscreen, remove it and mark as collected
        this.freeLifeSprite.destroy();
        this.freeLifeSprite = null;
        
        // Find which threshold this was for
        for (let i = 0; i < this.freeLifeEditsThresholds.length; i++) {
          if (!this.freeLifeCollected[i]) {
            this.freeLifeCollected[i] = true;
            break;
          }
        }
      } else {
        // Move the free life along the conveyor belt
        this.freeLifeSprite.x += this.conveyorSpeed / 2;
      }
    }
  }

  private isNearFreeLife(): boolean {
    if (!this.player || !this.freeLifeSprite) return false;
    
    const playerBounds = new Phaser.Geom.Rectangle(
      this.player.x - 40,
      this.player.y - 40,
      80, 80
    );
    
    const freeLifeBounds = new Phaser.Geom.Rectangle(
      this.freeLifeSprite.x - 25,
      this.freeLifeSprite.y - 25,
      50, 50
    );
    
    return Phaser.Geom.Rectangle.Overlaps(playerBounds, freeLifeBounds);
  }

  private collectFreeLife() {
    if (!this.freeLifeSprite) return;
    
    // Find which milestone this corresponds to
    const milestone = this.getFreeLifeMilestone();
    if (milestone === -1) return;
    
    // Mark it as collected
    this.freeLifeCollected[milestone] = true;
    
    // Add a life if not at max
    if (this.lives < 3) {
      this.lives++;
      this.updateLivesDisplay();
    }
    
    // Add score
    this.score += 50;
    this.scoreText.setText(`Score: ${this.score}`);
    
    // Create particle effect
    const particles = this.add.particles(this.freeLifeSprite.x, this.freeLifeSprite.y);
    const emitter = particles.createEmitter({
      speed: { min: 50, max: 150 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      blendMode: 'ADD'
    });
    
    // Emit particles
    emitter.explode(15, this.freeLifeSprite.x, this.freeLifeSprite.y);
    
    // Create celebratory hearts and sparkles
    for (let i = 0; i < 5; i++) {
      const x = this.freeLifeSprite.x + Math.random() * 60 - 30;
      const y = this.freeLifeSprite.y + Math.random() * 60 - 30;
      
      const symbol = Math.random() > 0.5 ? '❤️' : '✨';
      
      const text = this.add.text(x, y, symbol, {
        fontSize: '24px'
      });
      
      this.tweens.add({
        targets: text,
        y: y - 80,
        alpha: 0,
        duration: 1000,
        onComplete: () => text.destroy()
      });
    }
    
    // Remove free life sprite
    this.freeLifeSprite.destroy();
    this.freeLifeSprite = null;
    
    gameDebugger.info(`Collected free life at milestone ${milestone}`);
    
    // Check if we can spawn the next free life
    this.time.delayedCall(1000, () => this.checkFreeLifeSpawn());
  }

  private pickupEdit(type: string) {
    if (this.carriedEdit) {
      gameDebugger.debug('Already carrying an edit, cannot pick up another');
      return;
    }
    
    gameDebugger.info(`Picking up ${type} edit`);
    
    // Create edit icon and attach to player
    const editIcon = this.add.text(0, 0, this.getStationIcon(type), {
      fontSize: '24px',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    
    // Store reference to edit
    this.carriedEdit = {
      type,
      icon: editIcon
    };
    
    // Position edit icon above player's head
    this.updateCarriedEditPosition();
    
    // Add pickup feedback
    this.add.tween({
      targets: editIcon,
      scale: { from: 0, to: 1 },
      duration: 200,
      ease: 'Bounce.Out'
    });
    
    // Add sound effect if sound system exists
    if (this.sound && this.sound.add) {
      try {
        const pickupSound = this.sound.add('pickup', { volume: 0.5 });
        pickupSound.play();
      } catch (error) {
        console.error('Could not play pickup sound:', error);
      }
    }
  }

  private updateCarriedEditPosition() {
    if (!this.carriedEdit) return;
    
    // Position the edit based on direction
    let offsetX = 0;
    let offsetY = -40; // Default above player
    
    if (this.lastDirection === 'left') {
      offsetX = -30;
      offsetY = 0;
    } else if (this.lastDirection === 'right') {
      offsetX = 30;
      offsetY = 0;
    } else if (this.lastDirection === 'up') {
      offsetX = 0;
      offsetY = -30;
    } else if (this.lastDirection === 'down') {
      offsetX = 0;
      offsetY = 30;
    }
    
    this.carriedEdit.icon.x = this.player.x + offsetX;
    this.carriedEdit.icon.y = this.player.y + offsetY;
  }

  private discardEdit() {
    if (!this.carriedEdit) return;
    
    // Create a quick fade-out effect
    this.tweens.add({
      targets: this.carriedEdit.icon,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.carriedEdit.icon.destroy();
        this.carriedEdit = null;
      }
    });
  }

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

  private applyEditToOrder(order: Order) {
    if (!this.carriedEdit) return;
    
    // Check if the order requires this edit type and it hasn't been applied yet
    if (
      order.types.includes(this.carriedEdit.type) && 
      !order.completedEdits.includes(this.carriedEdit.type)
    ) {
      // Success! Apply the edit
      order.completedEdits.push(this.carriedEdit.type);
      
      // Create a checkmark or visual indicator on the order
      this.markEditAsApplied(order, this.carriedEdit.type);
      
      // Increment total edits applied (for free life spawning)
      this.totalEditsApplied++;
      
      // Increase score
      this.score += 10;
      this.scoreText.setText(`Score: ${this.score}`);
      
      // Check if order is now complete
      if (order.completedEdits.length === order.types.length) {
        this.completeOrder(order);
      }
      
      // Play success sound
      // this.sound.play('success');
    } else {
      // Wrong edit or already applied - just discard it
      // Play failure sound
      // this.sound.play('failure');
    }
    
    // Discard the edit regardless
    this.discardEdit();
  }

  private markEditAsApplied(order: Order, editType: string) {
    if (!order || !order.container) return;
    
    // Find the index of this edit type in the order's types array
    const index = order.types.indexOf(editType);
    if (index === -1) return;
    
    // Create a checkmark to show this edit has been applied
    const checkmark = this.add.text(0, 0, '✓', {
      fontSize: '24px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 2
    });
    
    // Position based on layout (horizontal or grid)
    if (order.types.length <= 3) {
      // Horizontal layout
      const spacing = 30;
      checkmark.x = (index + 1) * spacing - order.width / 2;
      checkmark.y = -order.height / 2 - 10;
    } else {
      // Grid layout
      const row = Math.floor(index / 3);
      const col = index % 3;
      const spacing = 30;
      
      checkmark.x = (col + 1) * spacing - order.width / 2;
      checkmark.y = row * spacing - order.height / 2 - 10;
    }
    
    // Add to container
    order.container.add(checkmark);
    
    // Add a little animation
    this.add.tween({
      targets: checkmark,
      scale: { from: 0, to: 1 },
      duration: 200,
      ease: 'Back.Out'
    });
  }

  private completeOrder(order: Order) {
    if (!order) return;
    
    gameDebugger.info(`Completed order ${order.id}`);
    
    // Update counters
    this.ordersCompleted++;
    
    // Add completion bonus
    const bonus = 25 * order.types.length; // More edits = bigger bonus
    this.score += bonus;
    this.scoreText.setText(`Score: ${this.score}`);
    
    // Visual feedback for order completion
    const completionText = this.add.text(
      order.x,
      order.y,
      '✨ COMPLETE! ✨',
      { fontSize: '28px', color: '#ffff00', stroke: '#000000', strokeThickness: 4 }
    ).setOrigin(0.5);
    
    // Animate the completion text
    this.add.tween({
      targets: completionText,
      scale: { from: 0.5, to: 1.5 },
      alpha: { from: 1, to: 0 },
      y: '-=50',
      duration: 1000,
      onComplete: () => completionText.destroy()
    });
    
    // Mark order as complete and schedule removal
    order.isComplete = true;
    
    // Remove the order after a short delay
    this.time.delayedCall(1000, () => {
      // Find the index of this order
      const index = this.orders.findIndex(o => o.id === order.id);
      if (index !== -1) {
        this.removeOrder(index);
      }
    });
  }

  private updateOrders() {
    // Move orders along conveyor belt
    for (let i = 0; i < this.orders.length; i++) {
      const order = this.orders[i];
      if (!order.isComplete) {
        // Move to the right
        order.x += this.conveyorSpeed;
        
        // Update container position
        if (order.container) {
          order.container.x = order.x;
        }
        
        // Check if order went off screen
        if (order.x > this.cameras.main.width + 50) {
          // Order failed - remove a life if we have any
          if (this.lives > 0) {
            this.lives--;
            this.failedOrders++;
            
            // Update life indicators
            this.updateLivesDisplay();
            
            // Visual feedback for failed order
            const failText = this.add.text(
              order.x - 100, // Position it a bit to the left so it's visible
              order.y,
              'ORDER FAILED!',
              { fontSize: '28px', color: '#ff0000', stroke: '#000000', strokeThickness: 4 }
            ).setOrigin(0.5);
            
            // Animate the fail text
            this.add.tween({
              targets: failText,
              scale: { from: 0.5, to: 1.5 },
              alpha: { from: 1, to: 0 },
              duration: 1000,
              onComplete: () => failText.destroy()
            });
            
            // Game over check
            if (this.lives <= 0) {
              this.gameOver();
            }
          }
          
          // Remove the order
          this.removeOrder(i);
          i--; // Adjust index since we removed an item
        }
      }
    }
  }

  private updateLivesDisplay() {
    // Clear existing hearts
    this.livesContainer.removeAll();
    
    // Add hearts or X based on current lives
    for (let i = 0; i < 3; i++) {
      const x = i * 30;
      const heart = this.add.text(x, 0, i < this.lives ? '❤️' : '❌', {
        fontSize: '24px'
      });
      this.livesContainer.add(heart);
    }
  }

  private gameOver() {
    gameDebugger.info('Game over!');
    
    // Create game over text
    const gameOverText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'GAME OVER',
      { fontSize: '64px', color: '#ff0000', stroke: '#000000', strokeThickness: 6 }
    ).setOrigin(0.5);
    
    // Add final score
    const finalScoreText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 80,
      `Final Score: ${this.score}`,
      { fontSize: '32px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }
    ).setOrigin(0.5);
    
    // Add restart instructions
    const restartText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 140,
      'Press R to Restart',
      { fontSize: '24px', color: '#ffff00', stroke: '#000000', strokeThickness: 3 }
    ).setOrigin(0.5);
    
    // Add restart key
    const rKey = this.input.keyboard.addKey('R');
    rKey.on('down', () => {
      this.scene.restart({ reset: true });
    });
    
    // Pause game logic
    this.orderGenerationTimer?.remove();
  }

  private updatePowerUp() {
    // If power up is active, auto-complete any orders
    if (this.powerUpActive) {
      for (const order of this.orders) {
        if (!order.isComplete) {
          // Get all edit types that haven't been completed yet
          const remainingEdits = order.types.filter(
            type => !order.completedEdits.includes(type)
          );
          
          // Apply all remaining edits at once
          if (remainingEdits.length > 0) {
            for (const editType of remainingEdits) {
              order.completedEdits.push(editType);
              this.markEditAsApplied(order, editType);
              this.totalEditsApplied++;
            }
            
            // Complete the order
            this.completeOrder(order);
          }
        }
      }
    }
  }

  private generateOrder = () => {
    try {
      gameDebugger.info('Generating new order');
      
      // Count how many stations are unlocked
      const unlockedStations = this.stations.filter(station => station.isUnlocked);
      if (unlockedStations.length === 0) {
        gameDebugger.warn('No unlocked stations available, cannot generate order');
        return;
      }
      
      // Determine where to place the order on the conveyor belt
      const orderY = this.conveyorBelt.y - 40; // Position above the conveyor
      const orderX = -50; // Start offscreen to the left
      
      // Determine order complexity based on unlocked stations
      const maxPossibleEdits = Math.min(5, unlockedStations.length);
      
      // Probability table for the number of edits
      // Format: [1 edit, 2 edits, 3 edits, 4 edits, 5 edits]
      // Adjust probabilities based on progress
      let editProbabilities: number[] = [];
      
      // Start simple, then gradually increase complexity
      if (unlockedStations.length === 1) {
        // With only 1 station, all orders require 1 edit
        editProbabilities = [1.0];
      } else if (unlockedStations.length === 2) {
        // With 2 stations, 70% chance of 1 edit, 30% chance of 2 edits
        editProbabilities = [0.7, 0.3];
      } else if (unlockedStations.length === 3) {
        // With 3 stations: 50% for 1 edit, 30% for 2 edits, 20% for 3 edits
        editProbabilities = [0.5, 0.3, 0.2];
      } else if (unlockedStations.length === 4) {
        // With 4 stations: 40% for 1 edit, 30% for 2 edits, 20% for 3 edits, 10% for 4 edits
        editProbabilities = [0.4, 0.3, 0.2, 0.1];
      } else {
        // With 5 stations: 30% for 1 edit, 25% for 2 edits, 25% for 3 edits, 15% for 4 edits, 5% for 5 edits
        editProbabilities = [0.3, 0.25, 0.25, 0.15, 0.05];
      }
      
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
      
      // Make sure we don't exceed our max possible edits
      numEdits = Math.min(numEdits, maxPossibleEdits);
      
      // Select random edit types from unlocked stations
      const stationTypes = unlockedStations.map(station => station.type);
      const selectedTypes: string[] = [];
      
      // Shuffle the types to ensure randomness
      const shuffledTypes = [...stationTypes].sort(() => Math.random() - 0.5);
      
      // Take the first numEdits types
      for (let i = 0; i < numEdits; i++) {
        selectedTypes.push(shuffledTypes[i % shuffledTypes.length]);
      }
      
      gameDebugger.info(`Creating order with ${numEdits} edits: ${selectedTypes.join(', ')}`);
      
      // Create container for the order
      const container = this.add.container(orderX, orderY);
      
      // Create cardboard box - size depends on number of edits
      const bgWidth = numEdits <= 3 ? 90 + (numEdits * 10) : 130;
      const bgHeight = numEdits <= 3 ? 70 : 100;
      
      // Create cardboard box
      const boxColor = 0xc19a6b; // Cardboard brown color
      const background = this.add.rectangle(0, 0, bgWidth, bgHeight, boxColor, 1)
        .setStrokeStyle(3, 0x8b5a2b); // Darker brown for the edges
      
      // Add cardboard box flap at the top
      const topFlap = this.add.rectangle(0, -bgHeight/2 + 8, bgWidth * 0.8, 14, boxColor)
        .setStrokeStyle(2, 0x8b5a2b);
        
      // Add box tape
      const tape = this.add.rectangle(0, 0, bgWidth * 0.5, 8, 0xf5f5dc);
      
      container.add([background, topFlap, tape]);
      
      // Create icons for each required edit
      const icons = selectedTypes.map((type, index) => {
        const icon = this.add.text(0, 0, this.getStationIcon(type), {
          fontSize: '28px',
          stroke: '#000000',
          strokeThickness: 2
        }).setOrigin(0.5);
        
        // Position based on layout (horizontal or grid)
        if (numEdits <= 3) {
          // Horizontal layout - evenly space icons
          if (numEdits === 1) {
            // Single icon centered
            icon.x = 0;
          } else {
            // Multiple icons spaced evenly
            const totalSpace = 80; // Total space to distribute icons
            const spacing = totalSpace / (numEdits - 1);
            icon.x = -totalSpace/2 + index * spacing;
          }
          icon.y = 0; // Centered vertically
        } else {
          // Grid layout (3 in first row, rest in second row)
          const spacing = 40;
          const row = Math.floor(index / 3);
          const col = index % 3;
          
          // Calculate positions to center the grid
          // For first row (0, 1, 2)
          if (row === 0) {
            icon.x = (col - 1) * spacing; // -spacing, 0, +spacing
          } else {
            // For second row (centers 1 or 2 items)
            const itemsInLastRow = numEdits - 3;
            if (itemsInLastRow === 1) {
              icon.x = 0; // Center the single item
            } else {
              icon.x = (col - 0.5) * spacing; // Center 2 items (-20, +20)
            }
          }
          
          icon.y = (row - 0.5) * spacing; // -20 for first row, +20 for second row
        }
        
        return icon;
      });
      
      // Add all icons to the container
      container.add(icons);
      
      // Create order object
      const order: Order = {
        id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        types: selectedTypes,
        completedEdits: [],
        x: orderX,
        y: orderY,
        container,
        isComplete: false,
        width: bgWidth,
        height: bgHeight
      };
      
      // Add to orders array
      this.orders.push(order);
      
      gameDebugger.info(`Order created: ${order.id}`);
    } catch (error) {
      console.error('Error generating order:', error);
    }
  }
}