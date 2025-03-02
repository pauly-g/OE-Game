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
 * - Fixed station unlocking to only reveal one station at a time, every 5 completed edits
 * - Added tracking of previous player position to properly handle collisions
 * - Fixed collision handling to prevent both sliding and walking through stations
 * - Fixed conveyor belt collision to prevent player from walking onto it
 */
import Phaser from 'phaser';
import { gameDebugger } from '../utils/debug';
import { SpeechBubble } from '../ui/SpeechBubble';
import { regularComments, powerUpComments } from '../data/BuyerComments';

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
  icons?: Phaser.GameObjects.Text[]; // Add icons property
  createdDuringPowerUp?: boolean; // Add createdDuringPowerUp property
  hasComment?: boolean; // Tracks if a comment has been shown for this order
}

interface Station {
  type: string;
  container: Phaser.GameObjects.Container;
  isUnlocked: boolean;
  bounds: Phaser.Geom.Rectangle | null;
  sign: Phaser.GameObjects.Container;
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
  private cKey!: Phaser.Input.Keyboard.Key;
  private fKey!: Phaser.Input.Keyboard.Key; // New f key for cheat code
  private playerSpeed: number = 4; // Reduce from 8 to 4 for slower movement
  private carriedEdits: { type: string, icon: Phaser.GameObjects.Text }[] = [];
  private maxCarriedEdits: number = 3; // Maximum number of edits the player can carry at once
  private ordersCompleted: number = 0;
  private totalEditsApplied: number = 0;
  private manualOrdersCompleted: number = 0; // Track manually completed orders
  private lastUnlockedAtEditCount: number = 0;
  private lives: number = 3;
  private livesContainer!: Phaser.GameObjects.Container;
  private failedOrders: number = 0;
  private lastSpaceState: boolean = false;
  private orderGenerationTimer: Phaser.Time.TimerEvent | null = null;
  private nextOrderDelay: number = 5000; // Longer initial delay (was 3000)
  private hamishSprite: Phaser.GameObjects.Sprite;
  private kirilSprite: Phaser.GameObjects.Sprite;
  private oeLogoSprite: Phaser.GameObjects.Sprite; // Add oeLogoSprite property
  private orderSpeedMultiplier: number = 1.0;
  private maxOrderSpeedMultiplier: number = 2.0;
  private conveyorSpeed: number = 0.5; // Much slower initial speed (was 2)
  private maxConveyorSpeed: number = 3; // Lower max speed (was 4)
  private debug: boolean = false;
  private powerUpActive: boolean = false;
  private powerUpTimer: number = 0;
  private powerUpDuration: number = 30000; // 30 seconds of power-up time
  private powerUpText!: Phaser.GameObjects.Text;
  private stationUnlockText!: Phaser.GameObjects.Text;
  private powerUpSwitch!: Phaser.GameObjects.Container;
  private powerUpLight!: Phaser.GameObjects.Rectangle;
  private powerUpLever!: Phaser.GameObjects.Rectangle;
  private powerUpAvailable: boolean = false;
  private powerUpCountdownText!: Phaser.GameObjects.Text;
  private conveyorBelt!: Phaser.GameObjects.Rectangle;
  private lastDirection: string = 'down';
  private lastMoving: boolean = false;
  private animationTime: number = 0;
  private currentAnimationFrame: number = 0; // Match the main branch value
  private animationFrameDuration: number = 125; // 8 frames per second = 125ms per frame
  private powerUpSwitchBounds!: Phaser.Geom.Rectangle;
  private lastFrameTime = 0;
  private buttonFlashTimer: number = 0;
  private buttonFlashInterval: number = 1000; // 1 second interval
  private buttonFlashState: boolean = false;
  private playerOnButton: boolean = false;
  private warningShowing: boolean = false;
  private orderMinSpacing: number = 40; // Minimum space between orders
  private playerCollisionVisualizer?: Phaser.GameObjects.Rectangle;
  private showDebugCollisions: boolean = false; // Set to true to see collision boundaries

  // Speech bubble related properties
  private activeBubbles: Map<string, SpeechBubble> = new Map();
  private screenWidthThreshold: number = 0; // Will be set in create method
  private commentsEnabled: boolean = true;
  private recentComments: string[] = []; // Track recently shown comments
  private maxRecentComments: number = 5; // How many recent comments to track

  constructor() {
    super({ key: 'Level1Scene' });
    console.log('Level1Scene constructor called');
    this.powerUpDuration = 30000; // 30 seconds of power-up time
    this.lives = 3;
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
              console.error(`Failed to load ${key}: ${error.message}`);
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
              console.error(`Failed to load ${key}: ${error.message}`);
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
          console.error(`Failed to load background: ${error.message}`);
        });

      // Load power-up and cheat sounds
      this.sound.add('powerup');
      this.sound.add('powerdown');
      
      // Load Hamish and Kiril images
      this.load.image('hamish', 'game/Hamish and Kiril/Hamish.png');
      this.load.image('kiril', 'game/Hamish and Kiril/Kiril.png');
      this.load.image('oelogo', 'game/Hamish and Kiril/OELogoHiRes.png');
      
      // Load power-up button images
      this.load.image('button-idle', 'game/Button/button.png');
      this.load.image('button-pressed', 'game/Button/button pressed.png');
      this.load.image('button-active', 'game/Button/button-active.png');
      this.load.image('button active-flash', 'game/Button/button active-flash.png');
      this.load.image('button-flash', 'game/Button/button-flash.png');
      this.load.image('button-flash2', 'game/Button/button-flash2.png');
      
      gameDebugger.info('Level1Scene preload completed');
    } catch (error) {
      console.error('Error in preload:', error);
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
          console.log(`Removed existing animation: ${key}`);
        }
      });
      
      // Log all available texture keys to verify they're loaded properly
      const textureKeys = this.textures.getTextureKeys();
      console.log(`Available textures (${textureKeys.length} total)`);
      
      // Log the first few textures to confirm they're named correctly
      textureKeys.slice(0, 20).forEach(key => {
        console.log(`- Texture: ${key}`);
      });
      
      // We're no longer creating animations since we're manually cycling through textures
      console.log('Using manual texture animation instead of Phaser animations');
      
    } catch (error) {
      console.error('Error in animation setup:', error);
    }
  }

  create() {
    console.log('Level1Scene create started');
    gameDebugger.info('Starting create method in Level1Scene');
    
    try {
      // Get screen dimensions
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Calculate screen width threshold for comments (1/3 of the screen width)
      this.screenWidthThreshold = width / 3;
      
      // Initialize game state
      this.score = 0;
      this.lives = 3;
      
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

      // Create player animations first
      this.createPlayerAnimations();

      // Create player sprite after ensuring textures exist
      if (this.textures.exists('idle down 1')) {
        this.player = this.add.sprite(width * 0.5, height * 0.55, 'idle down 1');
        this.player.setScale(4.0); // Increase the player scale to be taller than orders
        this.player.setDepth(20); // Set depth to be behind orders but in front of most elements
        
        this.lastDirection = 'down'; // Set initial direction
        this.lastMoving = false;
        this.currentAnimationFrame = 1;
        this.animationTime = 0;
        
        // Log available textures for debugging
        const textureKeys = this.textures.getTextureKeys();
        console.log(`Available textures: ${textureKeys.length} textures loaded`);
        
        console.log(`Initial sprite texture set to: idle down 1`);
        
        // Play idle animation
        this.player.anims.play(`idle-${this.lastDirection}`);
      } else {
        console.error('Player sprite texture "idle down 1" not loaded');
        // Create a fallback rectangle for the player
        this.player = this.add.rectangle(width * 0.5, height * 0.5, 32, 32, 0xff0000) as unknown as Phaser.GameObjects.Sprite;
        this.player.setScale(4.0); // Increase fallback player size too
        this.player.setDepth(20); // Set consistent depth
      }

      // Create stations before UI elements
      this.createStations();

      // Set up input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
      this.fKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F); // Initialize f key
      this.lastSpaceState = false;
      
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
      
      // Verify that all unlocked stations are visible
      this.verifyStationVisibility();
    } catch (error) {
      console.error('Error in create method:', error);
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
    this.updateLivesDisplay();

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

    // Create power-up button (positioned to the right side of the screen)
    const buttonX = width * 0.76; // 76% from the left (right side)
    const buttonY = height * 0.52; // 52% from the top (middle-ish)
    this.createPowerUpSwitch(buttonX, buttonY);
  }

  private createPowerUpSwitch(x: number, y: number) {
    // Create power-up button sprite with correct scale and depth
    this.powerUpButtonSprite = this.add.sprite(x, y, 'button-idle');
    this.powerUpButtonSprite.setScale(0.15); // Make it much smaller - 1/3 of original size
    this.powerUpButtonSprite.setDepth(10);
    
    // Add input event handlers
    this.powerUpButtonSprite.setInteractive();
    
    // Create text for countdown (positioned properly)
    this.powerUpCountdownText = this.add.text(x, y - 30, '', {
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(11);
    
    // Create warning text (initially invisible)
    this.powerUpWarningText = this.add.text(x, y - 80, '', {
      fontSize: '18px',
      color: '#ff0000',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setAlpha(0).setDepth(11);
    
    // Add button click handlers
    this.powerUpButtonSprite.on('pointerdown', this.handlePowerUpButtonClick, this);
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
    const stationTypes = ['address', 'quantity', 'discount', 'product', 'invoice', 'cancel'];
    
    // Calculate total width for all stations
    const spacing = 200; // Increased space between stations
    const totalWidth = (stationTypes.length - 1) * spacing;
    
    // Calculate starting X position to center all stations
    const startX = (this.cameras.main.width - totalWidth) / 2;
    const y = this.cameras.main.height * 0.2;

    // Define consistent size for all stations
    const tableSize = 120; // Size of the table
    const iconScale = 1.2; // Make emoji slightly larger

    stationTypes.forEach((type, index) => {
      const stationX = startX + (index * spacing);
      const station: Station = {
        type,
        container: this.add.container(stationX, y),
        isUnlocked: index === 0, // Only first station starts unlocked
        bounds: null,
        sign: null // Initialize sign property
      };

      // Create table top with a nicer appearance - will be the same for all stations
      // 1. Create the main tabletop with rounded corners and a light wood color
      const tableTop = this.add.rectangle(0, 0, tableSize, tableSize, 0xDEB887)
        .setStrokeStyle(3, 0xA0522D)
        .setOrigin(0.5)
        .setAlpha(0.9);
      
      // 2. Add some texture/detail to make it look more like a table
      const tableEdge = this.add.rectangle(0, 0, tableSize - 14, tableSize - 14, 0xB8860B)
        .setStrokeStyle(2, 0x8B4513)
        .setOrigin(0.5)
        .setAlpha(0.7);
      
      // 3. Add a small shadow underneath
      const tableShadow = this.add.rectangle(4, 4, tableSize, tableSize, 0x000000)
        .setOrigin(0.5)
        .setAlpha(0.2);

      // Create the station icon (emoji) with enhanced visibility
      const icon = this.add.text(0, 0, this.getStationIcon(type), {
        fontSize: '48px',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 5, stroke: true, fill: true }
      }).setOrigin(0.5).setScale(iconScale);

      // Add everything to the container - order matters for layering
      station.container.add([tableShadow, tableTop, tableEdge, icon]);
      
      // Create bounds for collision detection
      station.bounds = new Phaser.Geom.Rectangle(
        station.container.x - tableSize/2,
        station.container.y - tableSize/2,
        tableSize, 
        tableSize
      );
      
      // Create and add the station sign
      const sign = this.createStationSign(stationX, y, type);
      
      // Hide locked stations completely (alpha 0)
      if (!station.isUnlocked) {
        station.container.setAlpha(0);
        sign.setAlpha(0); // Also hide the sign
      }
      
      // Store the sign in the station object for later reference
      station.sign = sign;

      this.stations.push(station);
    });
  }

  private getStationIcon(type: string): string {
    switch (type) {
      case 'address': return '🏠'; // House for address
      case 'quantity': return '🔢'; // Numbers for quantity
      case 'discount': return '🏷️'; // Tag for discount
      case 'product': return '🔄'; // Change symbol for product change
      case 'invoice': return '📄'; // Document/paper for invoice
      case 'cancel': return '❌'; // X for cancel
      default: return '❓'; // Question mark as fallback
    }
  }

  private getStationName(type: string): string {
    switch (type) {
      case 'address': return 'Address Edit';
      case 'quantity': return 'Quantity Edit';
      case 'discount': return 'Add Discount';
      case 'product': return 'Change Product';
      case 'invoice': return 'Invoice Edit';
      case 'cancel': return 'Cancel Order';
      default: return 'Unknown Station';
    }
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
        console.error('Cursors not initialized in update method');
        return;
      }

      // Process power-up status
      if (this.powerUpActive) {
        this.updatePowerUp(delta);
      }

      // Activate power-up after 10 edits
      if (!this.powerUpAvailable && !this.powerUpActive && this.manualOrdersCompleted >= 10) {
        console.log(`Power-up now available after ${this.manualOrdersCompleted} manual orders completed`);
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
      
      // Create a buffer zone around the conveyor belt
      const conveyorBufferTop = this.conveyorBelt.y - 90; // Significantly increased buffer to keep player's shadow from touching
      const conveyorBufferBottom = this.conveyorBelt.y + 20; // 20px buffer below conveyor
      
      // Check for movement keys and update player position
      // But don't allow movement onto the conveyor belt
      let newX = this.player.x;
      let newY = this.player.y;
      let movementBlocked = false;
      
      if (this.cursors.left.isDown) {
        newX -= this.playerSpeed;
        direction = 'left';
        isMoving = true;
      } else if (this.cursors.right.isDown) {
        newX += this.playerSpeed;
        direction = 'right';
        isMoving = true;
      }
      
      if (this.cursors.up.isDown) {
        newY -= this.playerSpeed;
        direction = 'up';
        isMoving = true;
      } else if (this.cursors.down.isDown) {
        newY += this.playerSpeed; 
        direction = 'down';
        isMoving = true;
      }
      
      // Check if the player's new position would put them on the conveyor belt
      const futurePlayerY = newY;
      
      // Block movement if player would cross the conveyor buffer zone
      if (futurePlayerY <= conveyorBufferTop && futurePlayerY >= prevY && prevY > conveyorBufferTop) {
        // Player trying to move up onto conveyor belt - block it
        newY = conveyorBufferTop + 1; // Keep them just below the buffer
        movementBlocked = true;
      } else if (futurePlayerY >= conveyorBufferBottom && futurePlayerY <= prevY && prevY < conveyorBufferBottom) {
        // Player trying to move down onto conveyor belt - block it
        newY = conveyorBufferBottom - 1; // Keep them just above the buffer
        movementBlocked = true;
      }
      
      // If the player is already within the forbidden zone, push them out
      if (futurePlayerY > conveyorBufferTop && futurePlayerY < conveyorBufferBottom) {
        // Determine which side they're closer to
        if (Math.abs(futurePlayerY - conveyorBufferTop) < Math.abs(futurePlayerY - conveyorBufferBottom)) {
          newY = conveyorBufferTop + 1; // Put them just below the top buffer
        } else {
          newY = conveyorBufferBottom - 1; // Put them just above the bottom buffer
        }
        movementBlocked = true;
      }
      
      // Update player position
      this.player.x = newX;
      this.player.y = newY;
      
      // Visualize player collision area (for debugging)
      if (this.showDebugCollisions) {
        if (!this.playerCollisionVisualizer) {
          this.playerCollisionVisualizer = this.add.rectangle(
            this.player.x, 
            this.player.y + 20, // Position at player's feet
            60, // Width of collision box
            40, // Height of collision box
            0xff0000, // Red color
            0.5 // Semi-transparent
          ).setDepth(100);
        } else {
          this.playerCollisionVisualizer.x = this.player.x;
          this.playerCollisionVisualizer.y = this.player.y + 20;
        }
      }
      
      // Keep player within bounds
      if (this.player.x < 30) this.player.x = 30;
      if (this.player.x > this.cameras.main.width - 30) this.player.x = this.cameras.main.width - 30;
      if (this.player.y < 30) this.player.y = 30;
      if (this.player.y > this.cameras.main.height - 30) this.player.y = this.cameras.main.height - 30;

      // Check collisions with stations
      this.stations.forEach(station => {
        if (station.isUnlocked) {
          const stationBounds = new Phaser.Geom.Rectangle(
            station.container.x - 50,
            station.container.y - 50,
            100, 
            100
          );
          
          const playerBounds = new Phaser.Geom.Rectangle(
            this.player!.x - 20,
            this.player!.y - 30,
            40, 
            60
          );
          
          if (Phaser.Geom.Rectangle.Overlaps(playerBounds, stationBounds)) {
            // Determine which side of the station the player is coming from
            const dx = this.player!.x - station.container.x;
            const dy = this.player!.y - station.container.y;
            
            // Calculate distances to each edge of the station
            const distToLeft = Math.abs(dx + 50);
            const distToRight = Math.abs(dx - 50);
            const distToTop = Math.abs(dy + 50);
            const distToBottom = Math.abs(dy - 50);
            
            // Find the minimum distance to determine which side the player is on
            const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
            
            // Add a small buffer to prevent sticking/sliding
            const buffer = 5;
            
            // Apply appropriate displacement with increased push distance
            if (minDist === distToLeft) {
              this.player!.x = station.container.x - 80; // Increased push distance to 80
            } else if (minDist === distToRight) {
              this.player!.x = station.container.x + 80; // Increased push distance to 80
            } else if (minDist === distToTop) {
              this.player!.y = station.container.y - 80; // Increased push distance to 80
            } else if (minDist === distToBottom) {
              this.player!.y = station.container.y + 80; // Increased push distance to 80
              
              // Add additional check for bottom collision to prevent sliding
              if (this.cursors.left?.isDown || this.cursors.right?.isDown) {
                // If player is trying to move horizontally while colliding with bottom,
                // push them slightly further down to avoid the collision zone
                this.player!.y += buffer;
              }
            }
            
            // Add extra push when trying to move directly into a station
            if (minDist === distToLeft && this.cursors.right.isDown) {
              this.player!.x -= buffer; // Push little extra left when trying to move right
            } else if (minDist === distToRight && this.cursors.left.isDown) {
              this.player!.x += buffer; // Push little extra right when trying to move left
            } else if (minDist === distToTop && this.cursors.down.isDown) {
              this.player!.y -= buffer; // Push little extra up when trying to move down
            } else if (minDist === distToBottom && this.cursors.up.isDown) {
              this.player!.y += buffer; // Push little extra down when trying to move up
            }
          }
        }
      });
      
      // Update animation based on direction and movement
      if (direction !== this.lastDirection || (this.lastMoving !== isMoving)) {
        this.lastDirection = direction;
        this.lastMoving = isMoving;
      }

      // Update player animation manually
      this.updatePlayerAnimation(time, delta);

      // Update current carrying edit position
      if (this.carriedEdits.length > 0) {
        this.updateCarriedEditsPosition();
      }

      // Handle conveyor belt movement for orders
      this.updateOrderPositions(delta);

      // Handle space bar for edit actions
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        console.log("Spacebar pressed. Near station:", nearStation?.type);
        console.log("Current carried edits:", this.carriedEdits.length);
        
        // First check if we're trying to apply an edit to an order
        if (this.carriedEdits.length > 0 && this.tryApplyEditsToOrder()) {
          // Successfully applied, do nothing else
          console.log("Applied edit to order");
        }
        // Then check if we're near a station to collect an edit
        else if (nearStation) {
          console.log("Near station and spacebar pressed");
          // Always try to pick up an edit when near a station
          this.pickupEdit(nearStation);
        }
        // Then check if we're near the power-up switch
        else if (this.isNearPowerUpSwitch()) {
          console.log("Near power switch");
          // Near power-up switch, activate it
          this.activatePowerUpSwitch();
        }
        // Otherwise, if we have edits, discard the first one
        else if (this.carriedEdits.length > 0) {
          console.log("Discarding first edit");
          // Not near a station or order, discard the first edit
          this.removeFirstEdit();
        }
      }
      
      // Handle player movement and animation
      this.handlePlayerMovement(delta);
      
      // Check if player is stepping on the button
      this.checkPlayerOnButton();
      
      // Handle button flashing when power-up is available
      this.updateButtonFlashing(delta);
      
      // Check for 'd' key to activate powerup (cheat)
      if (Phaser.Input.Keyboard.JustDown(this.dKey)) {
        console.log('Cheat code activated: Power-Up!');
        this.activatePowerUpCheat();
      }

      // Check for 'c' key to activate powerup cheat
      if (Phaser.Input.Keyboard.JustDown(this.cKey)) {
        console.log('Cheat code activated: Power-Up!');
        this.activatePowerUpCheat();
      }
      
      // Check for 'f' key to unlock all stations (cheat)
      if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
        console.log('Cheat code activated: Unlock All Stations!');
        this.unlockAllStationsCheat();
      }
    } catch (error) {
      console.error('Error in update:', error);
    }
  }

  private isNearStation(): Station | null {
    if (!this.player) return null;
    
    // Create a larger detection area around the player for easier interaction
    const playerBounds = new Phaser.Geom.Rectangle(
      this.player.x - 50, // Larger detection area
      this.player.y - 50, // Larger detection area
      100, 100           // Increased from 60, 60
    );
    
    // Check each unlocked station
    for (const station of this.stations) {
      if (station.isUnlocked) {
        const stationBounds = new Phaser.Geom.Rectangle(
          station.container.x - 60,
          station.container.y - 60,
          120, 120
        );
        
        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, stationBounds)) {
          // Log that we're near a station for debugging
          console.log(`Near station: ${station.type}`);
          return station;
        }
      }
    }
    
    return null;
  }

  private isNearPowerUpSwitch(): boolean {
    if (!this.player || !this.powerUpSwitchBounds) return false;
    
    const playerBounds = new Phaser.Geom.Rectangle(
      this.player.x - 20,
      this.player.y - 30,
      40, 
      60
    );
    
    return Phaser.Geom.Rectangle.Overlaps(playerBounds, this.powerUpSwitchBounds);
  }

  private updatePlayerAnimation(time: number, delta: number) {
    if (!this.player) return;
    
    // Add time to the animation timer
    this.animationTime += delta;
    
    // When we reach the frame duration, advance to the next frame
    if (this.animationTime >= this.animationFrameDuration) {
      // Reset the timer
      this.animationTime = 0;
      
      // Advance to the next frame
      this.currentAnimationFrame++;
      if (this.currentAnimationFrame > 6) {
        this.currentAnimationFrame = 1;
      }
      
      // Get the current animation prefix (idle or walk)
      const prefix = this.lastMoving ? 'walk' : 'idle';
      
      // Set the texture based on the current frame
      const textureKey = `${prefix} ${this.lastDirection} ${this.currentAnimationFrame}`;
      
      if (this.textures.exists(textureKey)) {
        this.player.setTexture(textureKey);
        console.log(`Manual animation: ${textureKey}`);
      } else {
        console.warn(`Texture not found: ${textureKey}, using fallback`);
        // Fall back to frame 1
        const fallbackKey = `${prefix} ${this.lastDirection} 1`;
        if (this.textures.exists(fallbackKey)) {
          this.player.setTexture(fallbackKey);
        }
      }
    }
  }

  private pickupEdit(station: Station) {
    console.log(`Picking up edit from station: ${station.type}`);
    console.log(`Current carried edits: ${this.carriedEdits.length}`);
    
    // Check if we're already carrying this type of edit
    if (this.carriedEdits.some(edit => edit.type === station.type)) {
      // Show message that duplicate edits aren't allowed
      const duplicateEditMessage = this.add.text(
        this.player.x, 
        this.player.y - 40, 
        `Already have ${station.type}!`, 
        {
          fontSize: '16px',
          color: '#FF0000',
          stroke: '#000000',
          strokeThickness: 2
        }
      ).setOrigin(0.5).setDepth(110);
      
      // Fade out and remove the message
      this.tweens.add({
        targets: duplicateEditMessage,
        alpha: 0,
        y: duplicateEditMessage.y - 20,
        duration: 1000,
        onComplete: () => duplicateEditMessage.destroy()
      });
      
      return;
    }
    
    // Check if we're already at max capacity
    if (this.carriedEdits.length >= this.maxCarriedEdits) {
      // Show message to user that they can't pick up more edits
      const maxEditMessage = this.add.text(
        this.player.x, 
        this.player.y - 40, 
        `Max ${this.maxCarriedEdits} edits!`, 
        {
          fontSize: '16px',
          color: '#FF0000',
          stroke: '#000000',
          strokeThickness: 2
        }
      ).setOrigin(0.5).setDepth(110);
      
      // Fade out and remove the message
      this.tweens.add({
        targets: maxEditMessage,
        alpha: 0,
        y: maxEditMessage.y - 20,
        duration: 1000,
        onComplete: () => maxEditMessage.destroy()
      });
      
      return;
    }
    
    // Create an icon representing the edit type
    const editIcon = this.add.text(
      this.player.x,
      this.player.y - 30,
      this.getStationIcon(station.type),
      {
        fontSize: '24px',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5).setDepth(100);
    
    // Save the carried edit
    this.carriedEdits.push({
      type: station.type,
      icon: editIcon
    });
    
    console.log(`After pickup, carried edits: ${this.carriedEdits.length}`);
    
    // Position the edit icons correctly
    this.updateCarriedEditsPosition();
    
    // Add an animation for the pickup
    this.tweens.add({
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

  private discardEdits() {
    if (this.carriedEdits.length === 0) return;
    
    // Create a quick fade-out effect
    this.tweens.add({
      targets: this.carriedEdits.map(edit => edit.icon),
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.carriedEdits.forEach(edit => edit.icon.destroy());
        this.carriedEdits = [];
      }
    });
  }

  private tryApplyEditsToOrder(): boolean {
    if (this.carriedEdits.length === 0) return false;
    
    console.log('Trying to apply edit to order');
    
    // Increase detection range for player-order overlap
    const playerBounds = new Phaser.Geom.Rectangle(
      this.player.x - 60, // Increased from 40
      this.player.y - 60, // Increased from 40
      120, 120           // Increased from 80, 80
    );
    
    let applied = false;
    
    // Loop through all orders to check for overlap
    for (const order of this.orders) {
      // Also increase order bounds
      const orderBounds = new Phaser.Geom.Rectangle(
        order.x - 60,    // Increased from 50
        order.y - 60,    // Increased from 50
        120, 120        // Increased from 100, 100
      );
      
      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, orderBounds)) {
        console.log('Found overlapping order, applying edit');
        this.applyEditToOrder(order);
        applied = true;
        break;
      }
    }
    
    return applied;
  }

  private applyEditToOrder(order: Order) {
    if (this.carriedEdits.length === 0) return false;
    
    // Get the first edit in the queue
    const edit = this.carriedEdits[0];
    
    // Add debugging to see what's happening
    console.log(`Attempting to apply edit ${edit.type} to order requiring: ${order.types.join(', ')}`);
    console.log(`Order completed edits: ${order.completedEdits.join(', ')}`);
    
    // Check if the order requires this edit type and it hasn't been applied yet
    if (order.types.includes(edit.type) && !order.completedEdits.includes(edit.type)) {
      // Success! Apply the edit
      order.completedEdits.push(edit.type);
      
      // Create a checkmark to show this edit has been applied
      this.markEditAsApplied(order, edit.type);
      
      console.log(`Successfully applied ${edit.type} edit to order ${order.id}`);
      
      // Increment total edits applied (for unlocking stations)
      this.totalEditsApplied++;
      console.log(`Total edits applied: ${this.totalEditsApplied}, Last unlocked at: ${this.lastUnlockedAtEditCount}`);
      
      // Check if we should unlock a new station (every 5 edits)
      if (this.totalEditsApplied >= 5 && (this.totalEditsApplied - this.lastUnlockedAtEditCount) >= 5) {
        console.log('Unlocking next station');
        this.unlockNextStation();
      }
      
      // Increase score
      this.score += 10;
      this.scoreText.setText(`Score: ${this.score}`);
      
      // Check if order is now complete
      if (order.completedEdits.length === order.types.length) {
        this.completeOrder(order);
      }
      
      // Remove the used edit
      this.removeFirstEdit();
      
      return true;
    } else {
      // Failure - wrong edit type
      console.log('Wrong edit type!');
      console.log(`Edit type: ${edit.type}`);
      console.log(`Order requires: ${order.types.join(', ')}`);
      console.log(`Already completed: ${order.completedEdits.join(', ')}`);
      
      // Show a red X or failure indicator
      const failureText = this.add.text(
        this.player.x, 
        this.player.y - 50, 
        edit.type + ' ❌', 
        { fontSize: '24px', color: '#ff0000', stroke: '#000000', strokeThickness: 3 }
      ).setOrigin(0.5);
      
      // Shake the order briefly
      this.tweens.add({
        targets: order.container,
        x: { from: order.x, to: order.x + 5 },
        duration: 50,
        yoyo: true,
        repeat: 3
      });
      
      // Fade out and remove the failure text
      this.tweens.add({
        targets: failureText,
        alpha: 0,
        y: failureText.y - 30,
        duration: 800,
        onComplete: () => failureText.destroy()
      });
      
      return false;
    }
  }
  
  // New method to remove just the first edit
  private removeFirstEdit() {
    if (this.carriedEdits.length === 0) return;
    
    const editToRemove = this.carriedEdits.shift();
    
    // Create a quick fade-out effect
    this.tweens.add({
      targets: editToRemove.icon,
      alpha: 0,
      scale: { from: 1, to: 0 },
      duration: 300,
      onComplete: () => {
        editToRemove.icon.destroy();
        // Update positions of remaining edits
        this.updateCarriedEditsPosition();
      }
    });
  }

  private markEditAsApplied(order: Order, editType: string) {
    if (!order || !order.container) return;
    
    // Find the index of this edit type in the order's types array
    const index = order.types.indexOf(editType);
    if (index === -1) return;
    
    // Create a checkmark to show this edit has been applied
    const checkmark = this.add.text(0, 0, '✓', {
      fontSize: '32px', // Increased from 24px
      color: '#00ff00', // Keep the same bright green
      stroke: '#000000',
      strokeThickness: 3, // Increased from 2
      fontStyle: 'bold', // Added bold style
      shadow: { // Added shadow for better visibility
        offsetX: 2,
        offsetY: 2,
        color: '#000',
        blur: 3,
        stroke: true,
        fill: true
      }
    }).setOrigin(0.5);
    
    // Get the corresponding icon for positioning if available
    if (order.icons && order.icons[index]) {
      // Position the checkmark directly on top of the icon
      checkmark.x = order.icons[index].x;
      checkmark.y = order.icons[index].y - 20; // Position slightly higher above the icon (adjusted for larger size)
    } else {
      // Position based on layout (horizontal or grid)
      if (order.types.length <= 3) {
        // Horizontal layout
        if (order.types.length === 1) {
          // Single icon centered
          checkmark.x = 0;
        } else {
          // Multiple icons spaced evenly
          const totalSpace = 80; // Total space to distribute icons
          const spacing = totalSpace / (order.types.length - 1);
          checkmark.x = -totalSpace/2 + index * spacing;
          checkmark.y = 0; // Centered vertically
        }
      } else {
        // Grid layout
        const row = Math.floor(index / 2);
        const col = index % 2;
        const spacing = 40;
        
        // Calculate positions to center the grid
        // For first row (0, 1, 2)
        if (row === 0) {
          checkmark.x = (col - 1) * spacing; // -spacing, 0, +spacing
          checkmark.y = -spacing/2; // Add vertical positioning
        } else {
          // For second row (centers 1 or 2 items)
          const itemsInLastRow = order.types.length - 3;
          if (itemsInLastRow === 1) {
            checkmark.x = 0; // Center the single item
          } else {
            checkmark.x = (col - 0.5) * spacing; // Center 2 items (-20, +20)
          }
          checkmark.y = (row - 0.5) * spacing; // -20 for first row, +20 for second row
        }
      }
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

  private updateLivesDisplay() {
    // Clear any existing heart icons
    this.livesContainer.removeAll(true);
    
    // Add heart icons based on current lives
    for (let i = 0; i < this.lives; i++) {
      const heart = this.add.text(
        i * 30, // Space hearts horizontally
        0,
        '❤️',
        { fontSize: '24px' }
      );
      this.livesContainer.add(heart);
    }
  }

  private gameOver() {
    console.log('Game over!');
    
    // Clean up any active timers
    this.orderGenerationTimer?.remove();
    
    // Transition to the GameOverScene with the final score
    this.scene.start('GameOverScene', { score: this.score });
  }

  private reset() {
    console.log('Resetting Level1Scene');
    
    // Reset game state
    this.orders = [];
    this.score = 0;
    this.lives = 3;
    this.ordersCompleted = 0;
    this.totalEditsApplied = 0;
    this.manualOrdersCompleted = 0;
    this.failedOrders = 0;
    this.carriedEdits = [];
    
    // Reset difficulty settings
    this.orderSpeedMultiplier = 1.0;
    this.conveyorSpeed = 0.5;
    this.nextOrderDelay = 5000;
    
    // Reset powerups
    this.powerUpActive = false;
    this.powerUpTimer = 0;
    this.powerUpAvailable = false;
    
    // Reset station unlocking
    this.lastUnlockedAtEditCount = 0;
    
    // Reset stations (except the first one)
    if (this.stations && this.stations.length > 0) {
      this.stations.forEach((station, index) => {
        station.isUnlocked = index === 0; // Only first station starts unlocked
        station.container.setAlpha(index === 0 ? 1 : 0);
        station.sign.setAlpha(index === 0 ? 1 : 0); // Also reset the sign
      });
    }
    
    // Clean up any existing orders
    this.children.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Container && child !== this.livesContainer) {
        child.destroy();
      }
    });
    
    console.log('Level1Scene reset completed');
  }

  private completeOrder(order: Order) {
    if (!order) return;
    
    console.log(`Completed order ${order.id} - Created during power-up: ${order.createdDuringPowerUp ? 'YES' : 'NO'}`);
    
    // Update counters
    this.ordersCompleted++;
    
    // Only increment manual orders if this wasn't created during a power-up
    if (!order.createdDuringPowerUp) {
      this.manualOrdersCompleted++;
      console.log(`Manual order completed: ${this.manualOrdersCompleted}/10 needed for power-up`);
      
      // Add a tiny jump animation for manually completed orders
      this.tweens.add({
        targets: order.container,
        y: order.container.y - 10,
        duration: 100,
        ease: 'Sine.Out',
        yoyo: true,
        onComplete: () => {
          // Reset position to normal after animation completes
          order.container.y = order.y;
        }
      });
    } else {
      console.log(`Power-up auto-completed order (not counting towards manual total)`);
    }
    
    // Add completion bonus
    const bonus = 25 * order.types.length; // More edits = bigger bonus
    this.score += bonus;
    this.scoreText.setText(`Score: ${this.score}`);
    
    // Mark order as complete but don't remove it
    order.isComplete = true;
    
    // Show completion indicator above the order
    const completionEmoji = this.add.text(
      order.container.x,
      order.container.y - 40,
      '✅',
      { fontSize: '36px', stroke: '#000000', strokeThickness: 2 }
    ).setOrigin(0.5);
    
    // Add it to the container so it moves with the order
    order.container.add(completionEmoji);
    
    // Add a little animation to the emoji
    this.tweens.add({
      targets: completionEmoji,
      y: '-=20',
      alpha: { from: 1, to: 0.8 },
      scale: { from: 1, to: 1.3 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    
    // Only count manually completed orders (not created during power-up) towards power-up progress
    // This ensures that power-ups only apply to new orders and players earn power-ups through manual edits
    if (!order.createdDuringPowerUp && this.manualOrdersCompleted % 5 === 0 && !this.powerUpActive && !this.powerUpAvailable) {
      this.makePowerUpAvailable();
    }
  }

  // Update the order positions function to show comments
  private updateOrderPositions(delta: number) {
    // Move orders along conveyor belt
    for (let i = this.orders.length - 1; i >= 0; i--) {
      const order = this.orders[i];
      
      // Move all orders to the right (including completed ones)
      order.x += this.conveyorSpeed;
      
      // Update container position
      if (order.container) {
        order.container.x = order.x;
      }
      
      // Try-catch block to handle any speech bubble errors
      try {
        // Check if order has crossed the threshold to show comment and doesn't already have a comment
        if (this.commentsEnabled && !order.hasComment && 
            order.x > this.screenWidthThreshold && 
            !this.activeBubbles.has(order.id)) {
          // Set hasComment before showing to prevent multiple attempts if showing fails
          order.hasComment = true;
          this.showOrderComment(order);
        }
        
        // Update existing bubble positions if we have the speech bubble
        if (this.activeBubbles.has(order.id)) {
          const bubble = this.activeBubbles.get(order.id);
          if (bubble) {
            try {
              bubble.update(order.x, order.y + 80); // Position below the order
            } catch (err) {
              console.error("Error updating bubble position:", err);
              // If update fails, try to remove the bubble safely
              this.activeBubbles.delete(order.id);
            }
          }
        }
      } catch (error) {
        console.error("Error handling speech bubbles in updateOrderPositions:", error);
      }
      
      // Check if order went off screen
      if (order.x > this.cameras.main.width + 50) {
        // Try-catch to handle any errors during cleanup
        try {
          // Remove any active speech bubbles for this order
          if (this.activeBubbles.has(order.id)) {
            const bubble = this.activeBubbles.get(order.id);
            if (bubble) {
              bubble.destroy();
            }
            this.activeBubbles.delete(order.id);
          }
          
          // Additional logging to help debug
          console.log(`Order ${order.id} went off screen, removing...`);
          
          // Rest of the existing off-screen handling code
          if (!order.isComplete && this.lives > 0) {
            // Incomplete order - remove a life
            this.lives--;
            this.failedOrders++;
            
            // Update life indicators
            this.updateLivesDisplay();
            
            // Visual feedback for failed order - angry emoji floating up
            const failEmoji = this.add.text(
              order.x - 100,
              order.y,
              '😡',
              { fontSize: '36px', stroke: '#000000', strokeThickness: 2 }
            ).setOrigin(0.5);
            
            // Animate the angry emoji floating up
            this.tweens.add({
              targets: failEmoji,
              y: '-=150',
              alpha: { from: 1, to: 0 },
              scale: { from: 1, to: 1.5 },
              duration: 1500,
              ease: 'Sine.Out',
              onComplete: () => failEmoji.destroy()
            });
            
            // If all lives are gone, it's game over
            if (this.lives <= 0) {
              this.gameOver();
            }
          } else if (order.isComplete) {
            // Completed order - just animate a heart emoji floating away
            const heartEmoji = this.add.text(
              order.x - 100,
              order.y,
              '❤️',
              { fontSize: '36px', stroke: '#000000', strokeThickness: 2 }
            ).setOrigin(0.5);
            
            // Animate the heart emoji floating up
            this.tweens.add({
              targets: heartEmoji,
              y: '-=150',
              alpha: { from: 1, to: 0 },
              scale: { from: 1, to: 1.5 },
              duration: 1500,
              ease: 'Sine.Out',
              onComplete: () => heartEmoji.destroy()
            });
          }
          
          // Remove the order in both cases
          this.removeOrder(i);
        } catch (error) {
          console.error("Error handling order removal:", error);
        }
      }
    }
  }

  // Power-up methods

  private deactivatePowerUp() {
    console.log('Deactivating power-up');
    
    // Reset power-up state
    this.powerUpActive = false;
    this.setButtonTexture('button-idle');
    this.powerUpCountdownText.setText('');
    
    // Reset the manual orders counter after power-up ends
    this.manualOrdersCompleted = 0;
    console.log('Reset manual orders counter to 0 after power-up ended');
    
    console.log('Debug sprite state before animations:');
    console.log(`Hamish exists: ${!!this.hamishSprite}, active: ${this.hamishSprite?.active}`);
    console.log(`Kiril exists: ${!!this.kirilSprite}, active: ${this.kirilSprite?.active}`);
    console.log(`OE Logo exists: ${!!this.oeLogoSprite}, active: ${this.oeLogoSprite?.active}`);
    
    // Animate Hamish and Kiril sliding out
    if (this.hamishSprite && this.hamishSprite.active) {
      console.log('Animating Hamish out to the right');
      this.tweens.add({
        targets: this.hamishSprite,
        x: this.cameras.main.width + 100,
        duration: 500,
        ease: 'Back.in',
        onComplete: () => {
          console.log('Hamish animation complete, destroying sprite');
          if (this.hamishSprite) this.hamishSprite.destroy();
          this.hamishSprite = null;
        }
      });
    }
    
    if (this.kirilSprite && this.kirilSprite.active) {
      console.log('Animating Kiril out to the left');
      this.tweens.add({
        targets: this.kirilSprite,
        x: -100,
        duration: 500,
        ease: 'Back.in',
        onComplete: () => {
          console.log('Kiril animation complete, destroying sprite');
          if (this.kirilSprite) this.kirilSprite.destroy();
          this.kirilSprite = null;
        }
      });
    }
    
    // Animate the OELogo sliding out
    if (this.oeLogoSprite && this.oeLogoSprite.active) {
      console.log('Animating OE Logo down');
      this.tweens.add({
        targets: this.oeLogoSprite,
        y: this.cameras.main.height + 100,
        duration: 800,
        ease: 'Back.in',
        onComplete: () => {
          console.log('OE Logo animation complete, destroying sprite');
          if (this.oeLogoSprite) this.oeLogoSprite.destroy();
          this.oeLogoSprite = null;
        }
      });
    }
  }

  private activatePowerUpSwitch() {
    if (!this.powerUpAvailable || this.powerUpActive) return;
    
    console.log('Activating Power-Up!');
    
    try {
      // Set button state
      this.powerUpActive = true;
      this.powerUpAvailable = false;
      this.powerUpTimer = this.powerUpDuration; // 30 seconds of power-up time
      
      // Visual feedback
      this.setButtonColor(0x0000ff); // Blue for active
      
      // Show countdown
      this.powerUpCountdownText.setText('30s');
      
      // Show Hamish and Kiril images
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Create Hamish sprite at bottom right (off-screen)
      this.hamishSprite = this.add.sprite(width + 100, height, 'hamish');
      this.hamishSprite.setScale(0.25); // Make it smaller
      this.hamishSprite.setOrigin(1, 1); // Bottom right corner
      this.hamishSprite.setDepth(100); // Set high depth to be in foreground
      
      // Create Kiril sprite at bottom left (off-screen)
      this.kirilSprite = this.add.sprite(-100, height, 'kiril');
      this.kirilSprite.setScale(0.225); // 10% smaller than Hamish
      this.kirilSprite.setOrigin(0, 1); // Bottom left corner
      this.kirilSprite.setDepth(100); // Set high depth to be in foreground
      
      // Add OELogo in the middle
      const centerX = width / 2;
      
      // Create the logo sprite (starts below the screen)
      this.oeLogoSprite = this.add.sprite(centerX, height + 100, 'oelogo');
      this.oeLogoSprite.setScale(0.9); // 300% bigger than before (was 0.3)
      this.oeLogoSprite.setOrigin(0.5, 0.5);
      this.oeLogoSprite.setDepth(99); // Just behind Hamish and Kiril
      
      // First tween: Slide up from below
      this.tweens.add({
        targets: this.oeLogoSprite,
        y: height - 200, // Position it higher to be clearly visible
        duration: 800,
        ease: 'Back.out',
        onComplete: () => {
          // Start bouncing animation after sliding up
          this.startLogoBouncingAnimation();
        }
      });
      
      // Play activation sound
      if (this.sound && this.sound.add) {
        try {
          const activateSound = this.sound.add('powerup', { volume: 0.7 });
          activateSound.play();
        } catch (error) {
          console.error('Could not play power-up sound:', error);
        }
      }
      
      // Animate the lever being pulled
      this.tweens.add({
        targets: this.powerUpLever,
        y: 10, // Move lever down
        angle: 45, // Rotate lever
        duration: 300,
        ease: 'Bounce.Out'
      });
      
      // Animate Hamish and Kiril sliding in
      this.tweens.add({
        targets: this.hamishSprite,
        x: width,
        duration: 500,
        ease: 'Back.out'
      });
      
      this.tweens.add({
        targets: this.kirilSprite,
        x: 0,
        duration: 500,
        ease: 'Back.out'
      });
    } catch (error) {
      console.error('Error in activatePowerUpSwitch:', error);
      // Reset state in case of error
      this.powerUpActive = false;
      this.powerUpAvailable = true;
    }
  }
  
  private activatePowerUpCheat() {
    console.log("CHEAT: Making power-up available");
    
    // Set manual orders to 10 to trigger power-up availability
    this.manualOrdersCompleted = 10;
    
    // Only activate if power-up is not already available or active
    if (!this.powerUpAvailable && !this.powerUpActive) {
      this.makePowerUpAvailable();
      
      // Show a message to indicate cheat was activated
      const cheatMessage = this.add.text(
        this.cameras.main.width / 2,
        100,
        "CHEAT: Power-up Available!",
        {
          fontSize: '20px',
          color: '#ffff00',
          stroke: '#000000',
          strokeThickness: 3
        }
      ).setOrigin(0.5).setDepth(100);
      
      // Fade out the message
      this.tweens.add({
        targets: cheatMessage,
        alpha: 0,
        y: 80,
        duration: 1500,
        onComplete: () => cheatMessage.destroy()
      });
    }
  }

  private startLogoBouncingAnimation() {
    console.log('Starting logo wiggle animation');
    
    // Safety check
    if (!this.oeLogoSprite || !this.oeLogoSprite.active) {
      console.error('OE Logo sprite not found or not active');
      return;
    }
    
    try {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      console.log(`Screen dimensions: ${width}x${height}`);
      console.log(`Logo current position: ${this.oeLogoSprite.x}, ${this.oeLogoSprite.y}`);
      
      // Set up a timer to wiggle every 5 seconds
      this.time.addEvent({
        delay: 10000, // 10 seconds
        loop: true,
        callback: () => {
          // Only wiggle if the power-up is still active
          if (this.powerUpActive && this.oeLogoSprite && this.oeLogoSprite.active) {
            this.wiggleLogo();
          }
        }
      });
      
      // Do an initial wiggle right away
      this.wiggleLogo();
      
      console.log('Wiggle timer started successfully');
    } catch (error) {
      console.error('Error in startLogoBouncingAnimation:', error);
    }
  }
  
  private wiggleLogo() {
    if (!this.oeLogoSprite || !this.oeLogoSprite.active) return;
    
    // Create a short wiggle animation
    this.tweens.add({
      targets: this.oeLogoSprite,
      angle: { from: -2, to: 2 },
      duration: 100,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.InOut',
      onComplete: () => {
        // Reset rotation at the end
        if (this.oeLogoSprite && this.oeLogoSprite.active) {
          this.oeLogoSprite.setAngle(0);
        }
      }
    });
  }

  private updateCarriedEditsPosition() {
    if (this.carriedEdits.length === 0) return;
    
    // Base position offset depending on direction
    let baseOffsetX = 0;
    let baseOffsetY = -25; 
    
    // Adjust based on player direction
    if (this.lastDirection === 'left') {
      baseOffsetX = -20;
      baseOffsetY = -5;
    } else if (this.lastDirection === 'right') {
      baseOffsetX = 20;
      baseOffsetY = -5;
    } else if (this.lastDirection === 'up') {
      baseOffsetX = 0;
      baseOffsetY = -20;
    } else if (this.lastDirection === 'down') {
      baseOffsetX = 0;
      baseOffsetY = 20;
    }
    
    // Arrange edits in a small arc above the player
    for (let i = 0; i < this.carriedEdits.length; i++) {
      const edit = this.carriedEdits[i];
      
      // Horizontal spread based on how many edits we have
      let offsetX = 0;
      
      // If multiple edits, spread them out
      if (this.carriedEdits.length > 1) {
        // Calculate spacing based on number of edits
        const spacing = 20; // Space between each edit
        const totalWidth = (this.carriedEdits.length - 1) * spacing;
        offsetX = -totalWidth / 2 + i * spacing;
      }
      
      // Set position
      edit.icon.x = this.player.x + baseOffsetX + offsetX;
      edit.icon.y = this.player.y + baseOffsetY;
      
      // First edit in the array (oldest) is slightly bigger and has a highlight to indicate it's next to be used
      if (i === 0) {
        edit.icon.setScale(1.2);
        
        // Add a subtle pulsing effect to the next-to-use edit
        if (!this.tweens.isTweening(edit.icon)) {
          this.tweens.add({
            targets: edit.icon,
            scale: { from: 1.2, to: 1.3 },
            alpha: { from: 1, to: 0.8 },
            ease: 'Sine.InOut',
            duration: 500,
            yoyo: true,
            repeat: -1
          });
        }
      } else {
        edit.icon.setScale(1.0);
        // Remove any existing tweens on non-first edits
        this.tweens.killTweensOf(edit.icon);
        edit.icon.setAlpha(1.0);
      }
    }
    
    // Make sure the edits are always on top
    this.carriedEdits.forEach(edit => edit.icon.setDepth(100));
  }

  private checkMissedOrders(delta: number) {
    // Check if any orders have gone off-screen
    for (let i = this.orders.length - 1; i >= 0; i--) {
      const order = this.orders[i];
      
      // Check if order has gone off-screen
      if (order.x > this.cameras.main.width + 50) {
        // Remove the order
        this.removeOrder(i);
      }
    }
  }

  private checkPlayerOnButton() {
    if (!this.player || !this.powerUpButtonSprite) return;
    
    // Get bounds for pixel-perfect collision detection
    const playerBounds = this.player.getBounds();
    const buttonBounds = this.powerUpButtonSprite.getBounds();
    
    // Create a smaller collision area from player's feet
    const playerFeetBounds = new Phaser.Geom.Rectangle(
      playerBounds.x + playerBounds.width * 0.35, // Center portion of player
      playerBounds.y + playerBounds.height * 0.8, // Bottom portion (feet)
      playerBounds.width * 0.3, // Narrower than full player
      playerBounds.height * 0.2 // Just the feet
    );
    
    // If player's feet overlap with button
    const isOverlapping = Phaser.Geom.Rectangle.Overlaps(playerFeetBounds, buttonBounds);
    
    // Track whether the player has just entered the button area
    const wasOverlapping = this.playerOnButton;
    this.playerOnButton = isOverlapping;
    
    // First case: Player just stepped on the button AND power-up is available
    if (isOverlapping && !wasOverlapping && this.powerUpAvailable && !this.powerUpActive) {
      console.log("Player stepping on button, power-up available - activating!");
      // Activate the power-up
      this.handlePowerUpButtonClick();
      return;
    }
    
    // Visual feedback based on power-up state
    if (isOverlapping) {
      // Set button to pressed state regardless of power-up availability
      this.setButtonTexture('button-pressed');
      
      // Only show warning if power-up is not available and not active
      if (!this.powerUpAvailable && !this.powerUpActive && !this.warningShowing) {
        this.warningShowing = true;
        this.showPowerUpWarning('Power-up not ready!');
        
        // Reset warning flag after a short delay
        this.time.delayedCall(1000, () => {
          this.warningShowing = false;
        });
      }
    } else if (!this.powerUpActive) { 
      // Reset to idle or flashing state based on availability
      if (this.powerUpAvailable) {
        // Don't reset texture here to allow flashing animation to continue
      } else {
        // Not available, so use idle texture
        this.setButtonTexture('button-idle');
      }
    }
  }

  private updateButtonFlashing(delta: number) {
    if (!this.powerUpButtonSprite) return;
    
    // Accumulate time for flashing
    this.buttonFlashTimer += delta;
    
    // When we reach the flash interval, toggle the flash state
    if (this.buttonFlashTimer >= this.buttonFlashInterval) {
      this.buttonFlashTimer = 0; // Reset timer
      this.buttonFlashState = !this.buttonFlashState; // Toggle flash state
      
      // Different flashing states based on power-up status
      if (this.powerUpAvailable && !this.powerUpActive) {
        // Power-up is available but not active - flash between idle and flash2
        this.setButtonTexture(
          this.buttonFlashState ? 'button-flash2' : 'button-idle'
        );
      } else if (this.powerUpActive) {
        // Power-up is active - flash between active and active-flash
        this.setButtonTexture(
          this.buttonFlashState ? 'button active-flash' : 'button-active'
        );
      }
    }
  }

  private makePowerUpAvailable() {
    // Make power-up available to player
    this.powerUpAvailable = true;
    
    // Reset animation state for flashing
    this.buttonFlashTimer = 0;
    this.buttonFlashState = false;
    this.setButtonTexture('button-idle');
    
    console.log("Power-up is now available!");
    
    // Start power-up button flashing/animation
    if (this.powerUpButtonSprite) {
      this.tweens.add({
        targets: this.powerUpButtonSprite,
        scale: { from: 0.15, to: 0.165 }, // Adjusted scaling for smaller base size
        duration: 600,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private activatePowerUp() {
    // Set power-up to active
    this.powerUpActive = true;
    this.powerUpAvailable = false;
    this.powerUpTimer = 30000; // Extend power-up duration to 30 seconds (30000ms)
    this.powerUpFlashTimer = 0;
    
    console.log("Power-up activated!");
    
    // Create activation animation
    this.tweens.add({
      targets: this.powerUpButtonSprite,
      scale: { from: 0.15, to: 0.17 }, // Adjusted for smaller button size
      duration: 200,
      onStart: () => {
        this.powerUpButtonSprite.setTexture('button-pressed');
      },
      onComplete: () => {
        this.powerUpButtonSprite.setTexture('button-active');
      }
    });
    
    // Show Hamish and Kiril images
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Create Hamish sprite at bottom right (off-screen)
    this.hamishSprite = this.add.sprite(width + 100, height, 'hamish');
    this.hamishSprite.setScale(0.25); // Make it smaller
    this.hamishSprite.setOrigin(1, 1); // Bottom right corner
    this.hamishSprite.setDepth(100); // Set high depth to be in foreground
    
    // Create Kiril sprite at bottom left (off-screen)
    this.kirilSprite = this.add.sprite(-100, height, 'kiril');
    this.kirilSprite.setScale(0.225); // 10% smaller than Hamish
    this.kirilSprite.setOrigin(0, 1); // Bottom left corner
    this.kirilSprite.setDepth(100); // Set high depth to be in foreground
    
    // Add OELogo in the middle
    const centerX = width / 2;
    
    // Create the logo sprite (starts below the screen)
    this.oeLogoSprite = this.add.sprite(centerX, height + 100, 'oelogo');
    this.oeLogoSprite.setScale(0.9); // 300% bigger than before (was 0.3)
    this.oeLogoSprite.setOrigin(0.5, 0.5);
    this.oeLogoSprite.setDepth(5); // Below Hamish and Kiril but above other elements
    
    // First tween: Slide up from below
    this.tweens.add({
      targets: this.oeLogoSprite,
      y: height - 200, // Position it higher to be clearly visible
      duration: 800,
      ease: 'Back.out',
      onComplete: () => {
        // Start bouncing animation after sliding up
        this.startLogoBouncingAnimation();
      }
    });
    
    // Play activation sound
    if (this.sound && this.sound.add) {
      try {
        const activateSound = this.sound.add('powerup', { volume: 0.7 });
        activateSound.play();
      } catch (error) {
        console.error('Could not play power-up sound:', error);
      }
    }
    
    // Animate Hamish and Kiril sliding in
    this.tweens.add({
      targets: this.hamishSprite,
      x: width,
      duration: 500,
      ease: 'Back.out'
    });
    
    this.tweens.add({
      targets: this.kirilSprite,
      x: 0,
      duration: 500,
      ease: 'Back.out'
    });
  }
  
  private updatePowerUp(delta: number) {
    if (this.powerUpActive) {
      this.powerUpTimer -= delta;
      const secondsLeft = Math.ceil(this.powerUpTimer / 1000);
      this.powerUpCountdownText.setText(`${secondsLeft}s`);
      
      // Check if power-up has expired
      if (this.powerUpTimer <= 0) {
        this.deactivatePowerUp();
      }
      
      // Only auto-complete orders that were created during the power-up
      // Do not auto-complete existing orders that were on the belt before power-up activation
      for (const order of this.orders) {
        if (!order.isComplete && order.createdDuringPowerUp && !order.completedEdits.length) {
          // Auto-complete all edit types
          for (const editType of order.types) {
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

  private generateOrder = () => {
    try {
      console.log('Generating new order');
      
      // Count how many stations are unlocked
      const unlockedStations = this.stations.filter(station => station.isUnlocked);
      console.log(`Unlocked stations: ${unlockedStations.map(s => s.type).join(', ')}`);
      
      if (unlockedStations.length === 0) {
        console.log('No unlocked stations available, cannot generate order');
        return;
      }
      
      // Check if there's an existing order too close to the spawn point
      const orderX = -50; // Start offscreen to the left
      const spawnBuffer = 150; // Check area around spawn point
      
      // Find if there's an order in the spawn buffer zone
      const ordersNearSpawn = this.orders.filter(order => 
        order.x > orderX - this.orderMinSpacing && order.x < spawnBuffer
      );
      
      if (ordersNearSpawn.length > 0) {
        console.log('Order in spawn area, delaying generation');
        this.time.delayedCall(500, this.generateOrder, [], this);
        return;
      }
      
      // Determine where to place the order on the conveyor belt
      const orderY = this.conveyorBelt.y - 40; // Position above the conveyor
      
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
      // First, ensure we have unique station types
      const stationTypesSet = new Set(unlockedStations.map(station => station.type));
      const uniqueStationTypes = Array.from(stationTypesSet);
      const selectedTypes: string[] = [];
      
      console.log(`Available unique station types: ${uniqueStationTypes.join(', ')}`);
      
      // Fisher-Yates shuffle algorithm for true randomness
      function fisherYatesShuffle(array: any[]): any[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      }
      
      // Shuffle the types using Fisher-Yates for proper randomization
      const shuffledTypes = fisherYatesShuffle(uniqueStationTypes);
      console.log(`Shuffled station types: ${shuffledTypes.join(', ')}`);
      
      // Take the first numEdits types, with explicit duplicate checking
      for (let i = 0; i < numEdits && i < shuffledTypes.length; i++) {
        const typeToAdd = shuffledTypes[i];
        
        // Double-check that we're not adding a duplicate (should never happen with this algorithm, but being safe)
        if (!selectedTypes.includes(typeToAdd)) {
          selectedTypes.push(typeToAdd);
        }
      }
      
      // If we couldn't get enough types (not enough unique stations), 
      // reduce the number of edits to match available types
      if (selectedTypes.length < numEdits) {
        numEdits = selectedTypes.length;
      }
      
      console.log(`Creating order with ${numEdits} edits: ${selectedTypes.join(', ')}`);
      
      // Create container for the order
      const container = this.add.container(orderX, orderY);
      container.setSize(160, 120);
      container.setDepth(25); // Set order depth higher than player (20) but lower than Hamish/Kiril (100)
      
      // Create cardboard box - size depends on number of edits
      let bgWidth, bgHeight;
      
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
      
      // Create cardboard box
      const bgColor = 0xd9c0a3; // Lighter cardboard brown color
      const background = this.add.rectangle(0, 0, bgWidth, bgHeight, bgColor, 1)
        .setStrokeStyle(2, 0xa0816c); // Softer brown for the edges
      
      // Add cardboard box flap at the top - more subtle
      const topFlap = this.add.rectangle(0, -bgHeight/2 + 6, bgWidth * 0.7, 10, bgColor)
        .setStrokeStyle(1, 0xa0816c);
        
      // Add box tape - smaller and less visible
      const tape = this.add.rectangle(0, 0, bgWidth * 0.3, 4, 0xefefef);
      
      container.add([background, topFlap, tape]);
      
      // Create icons for each required edit
      const icons = selectedTypes.map((type, index) => {
        // Verify that this icon exists
        const iconText = this.getStationIcon(type);
        console.log(`Using icon '${iconText}' for type '${type}'`);
        
        const icon = this.add.text(0, 0, iconText, {
          fontSize: '28px',
          stroke: '#000000',
          strokeThickness: 2
        }).setOrigin(0.5);
        
        // Position based on layout (horizontal or grid)
        if (numEdits <= 3) {
          // Horizontal layout
          if (numEdits === 1) {
            // Single icon centered
            icon.x = 0;
          } else {
            // Multiple icons spaced evenly
            const totalSpace = 80; // Total space to distribute icons
            const spacing = totalSpace / (numEdits - 1);
            icon.x = -totalSpace/2 + index * spacing;
            icon.y = 0; // Centered vertically
          }
        } else if (numEdits <= 6) {
          // Grid layout for 4-6 edits
          const itemsPerRow = numEdits <= 4 ? 2 : 3; // For 5-6 edits, use 3 items in top row
          const horizontalSpacing = 40;
          const verticalSpacing = 40;
          
          if (numEdits <= 4) {
            // 2x2 grid for 4 edits
            const row = Math.floor(index / 2);
            const col = index % 2;
            icon.x = (col - 0.5) * horizontalSpacing; // -20, 0, +20
            icon.y = (row - 0.5) * verticalSpacing; // -20, 0, +20
          } else {
            // 5-6 edits: 3 in top row, remainder in bottom row
            const itemsInTopRow = 3;
            const itemsInBottomRow = numEdits - itemsInTopRow;
            
            // Determine if this icon is in the top or bottom row
            const isInTopRow = index < itemsInTopRow;
            
            if (isInTopRow) {
              // Top row with 3 items
              icon.x = (index - 1) * horizontalSpacing; // -40, 0, +40
              icon.y = -verticalSpacing/2; // Add vertical positioning
            } else {
              // Bottom row with 1-3 items (centered)
              let positionInRow = index - itemsInTopRow;
              let bottomRowOffset = 0;
              
              if (itemsInBottomRow === 1) {
                bottomRowOffset = 0; // Single item centered
              } else if (itemsInBottomRow === 2) {
                bottomRowOffset = (positionInRow - 0.5) * horizontalSpacing; // -20, +20
              } else {
                bottomRowOffset = (positionInRow - 1) * horizontalSpacing; // -40, 0, +40
              }
              
              icon.x = bottomRowOffset;
              icon.y = verticalSpacing/2;
            }
          }
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
        height: bgHeight,
        icons, // Add icons to the order object
        hasComment: false // Initialize hasComment property to false
      };
      
      // Add to orders array
      this.orders.push(order);
      
      // If power up is active, mark this order as created during power-up and auto-complete it
      if (this.powerUpActive) {
        order.createdDuringPowerUp = true;
        
        // Auto-complete all edit types
        for (const editType of order.types) {
          order.completedEdits.push(editType);
          this.markEditAsApplied(order, editType);
          this.totalEditsApplied++;
        }
        
        // Complete the order
        this.completeOrder(order);
      }
      
      console.log(`Order created: ${order.id}`);
      console.log(`Order requires edits: ${order.types.join(', ')}`);
      console.log(`Order icon types: ${order.types.map(type => `${type}: ${this.getStationIcon(type)}`).join(', ')}`);
    } catch (error) {
      console.error('Error generating order:', error);
    }
  }

  // Power-up methods

  private unlockNextStation() {
    // Check how many stations are currently unlocked
    const unlockedCount = this.stations.filter(station => station.isUnlocked).length;
    console.log(`Currently have ${unlockedCount} unlocked stations`);
    
    // Find the next station to unlock
    const nextStation = this.stations.find(station => !station.isUnlocked);
    
    if (!nextStation) {
      console.log('All stations already unlocked!');
      return;
    }
    
    console.log(`Unlocking station: ${nextStation.type}`);
    
    // Unlock the station
    nextStation.isUnlocked = true;
    
    // Make sure the station is visible
    if (nextStation.container) {
      // Start with alpha 0
      nextStation.container.setAlpha(0);
      nextStation.sign.setAlpha(0); // Also set sign to invisible
      
      // Flash the station to draw attention to it
      this.tweens.add({
        targets: nextStation.container,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.7, to: 1 },
        ease: 'Back.Out',
        duration: 600,
        yoyo: false,
        onComplete: () => {
          // Ensure it stays visible after the animation
          nextStation.container.setAlpha(1);
          console.log(`Animation complete for station: ${nextStation.type}, alpha: ${nextStation.container.alpha}`);
        }
      });
      
      // Animate the sign with a slight delay for a more dramatic reveal
      this.time.delayedCall(300, () => {
        this.tweens.add({
          targets: nextStation.sign,
          alpha: { from: 0, to: 1 },
          scale: { from: 0.8, to: 1 },
          ease: 'Back.Out',
          duration: 800,
          onComplete: () => {
            // Ensure sign stays visible
            nextStation.sign.setAlpha(1);
          }
        });
      });
      
      // Display an announcement text about the new station
      this.stationUnlockText.setText(`${this.getStationIcon(nextStation.type)} New station unlocked! ${this.getStationIcon(nextStation.type)}`);
      this.stationUnlockText.setVisible(true);
      
      // Fade out the announcement after a delay
      this.time.delayedCall(3000, () => {
        this.tweens.add({
          targets: this.stationUnlockText,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            this.stationUnlockText.setVisible(false);
            this.stationUnlockText.setAlpha(1);
          }
        });
      });
    }
    
    // Reset the counter
    this.lastUnlockedAtEditCount = this.totalEditsApplied;
    
    // Verify all station visibility after unlocking
    this.verifyStationVisibility();
  }

  // Helper to set button texture while maintaining scale
  private setButtonTexture(textureName: string) {
    if (!this.powerUpButtonSprite) return;
    
    // Store current scale
    const currentScale = {
      x: this.powerUpButtonSprite.scaleX,
      y: this.powerUpButtonSprite.scaleY
    };
    
    // Change texture
    this.powerUpButtonSprite.setTexture(textureName);
    
    // Restore scale to maintain same size
    this.powerUpButtonSprite.setScale(currentScale.x, currentScale.y);
  }

  private showPowerUpWarning(message: string) {
    // Only show if we have a warning text object
    if (!this.powerUpWarningText) return;
    
    // Set warning message
    this.powerUpWarningText.setText(message);
    this.powerUpWarningText.setAlpha(1);
    
    // Fade out the warning after a short delay
    this.tweens.add({
      targets: this.powerUpWarningText,
      alpha: 0,
      y: this.powerUpWarningText.y - 20, 
      duration: 1500,
      onComplete: () => {
        // Reset position after fading out
        this.powerUpWarningText.y += 20;
      }
    });
  }

  private handlePowerUpButtonClick() {
    // Only allow pressing the button if a power-up is available
    if (!this.powerUpAvailable || this.powerUpActive) {
      // Show warning if power-up is not available
      this.showPowerUpWarning('Power-up not ready!');
      return;
    }
    
    // Show the "Activate Order Editing" notification
    this.showActivationNotification();
    
    // Simply change texture without animation
    this.powerUpButtonSprite.setTexture('button-pressed');
    
    // Short delay before activating power-up
    this.time.delayedCall(200, () => {
      this.powerUpButtonSprite.setTexture('button-idle');
      this.activatePowerUp();
    });
  }
  
  private showActivationNotification() {
    // Create the notification text
    const notification = this.add.text(
      this.powerUpButtonSprite.x,
      this.powerUpButtonSprite.y - 40, // Position above the button
      'Activate Order Editing!', 
      { 
        fontSize: '18px', 
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(110);
    
    // Add a subtle glow effect
    notification.setShadow(0, 0, '#ff9900', 5);
    
    // Animate the notification floating up and fading out
    this.tweens.add({
      targets: notification,
      y: notification.y - 50, // Float upward
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 1.2 },
      duration: 1500,
      ease: 'Sine.Out',
      onComplete: () => notification.destroy()
    });
  }

  private handlePlayerMovement(delta: number) {
    if (!this.player || !this.cursors) return;
    
    let isMoving = false;
    let direction = this.lastDirection;

    // Only check if near station for spacebar interactions, not to restrict movement
    let nearStation = this.isNearStation();
    
    // Save the previous player position before any movement
    const prevX = this.player.x;
    const prevY = this.player.y;
    
    // Create a buffer zone around the conveyor belt
    const conveyorBufferTop = this.conveyorBelt.y - 90; // Significantly increased buffer to keep player's shadow from touching
    const conveyorBufferBottom = this.conveyorBelt.y + 20; // 20px buffer below conveyor
    
    // Check for movement keys and update player position
    // But don't allow movement onto the conveyor belt
    let newX = this.player.x;
    let newY = this.player.y;
    let movementBlocked = false;
    
    if (this.cursors.left?.isDown) {
      newX -= this.playerSpeed;
      direction = 'left';
      isMoving = true;
    } else if (this.cursors.right.isDown) {
      newX += this.playerSpeed;
      direction = 'right';
      isMoving = true;
    }
    
    if (this.cursors.up.isDown) {
      newY -= this.playerSpeed;
      direction = 'up';
      isMoving = true;
    } else if (this.cursors.down.isDown) {
      newY += this.playerSpeed; 
      direction = 'down';
      isMoving = true;
    }
    
    // Check if the player's new position would put them on the conveyor belt
    const futurePlayerY = newY;
    
    // Block movement if player would cross the conveyor buffer zone
    if (futurePlayerY <= conveyorBufferTop && futurePlayerY >= prevY && prevY > conveyorBufferTop) {
      // Player trying to move up onto conveyor belt - block it
      newY = conveyorBufferTop + 1; // Keep them just below the buffer
      movementBlocked = true;
    } else if (futurePlayerY >= conveyorBufferBottom && futurePlayerY <= prevY && prevY < conveyorBufferBottom) {
      // Player trying to move down onto conveyor belt - block it
      newY = conveyorBufferBottom - 1; // Keep them just above the buffer
      movementBlocked = true;
    }
    
    // If the player is already within the forbidden zone, push them out
    if (futurePlayerY > conveyorBufferTop && futurePlayerY < conveyorBufferBottom) {
      // Determine which side they're closer to
      if (Math.abs(futurePlayerY - conveyorBufferTop) < Math.abs(futurePlayerY - conveyorBufferBottom)) {
        newY = conveyorBufferTop + 1; // Put them just below the top buffer
      } else {
        newY = conveyorBufferBottom - 1; // Put them just above the bottom buffer
      }
      movementBlocked = true;
    }
    
    // Update player position
    this.player.x = newX;
    this.player.y = newY;
    
    // Keep player within bounds
    if (this.player.x < 30) this.player.x = 30;
    if (this.player.x > this.cameras.main.width - 30) this.player.x = this.cameras.main.width - 30;
    if (this.player.y < 30) this.player.y = 30;
    if (this.player.y > this.cameras.main.height - 30) this.player.y = this.cameras.main.height - 30;

    // Check collisions with stations
    this.stations.forEach(station => {
      if (station.isUnlocked) {
        const stationBounds = new Phaser.Geom.Rectangle(
          station.container.x - 50,
          station.container.y - 50,
          100, 
          100
        );
        
        const playerBounds = new Phaser.Geom.Rectangle(
          this.player!.x - 20,
          this.player!.y - 30,
          40, 
          60
        );
        
        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, stationBounds)) {
          // Determine which side of the station the player is coming from
          const dx = this.player!.x - station.container.x;
          const dy = this.player!.y - station.container.y;
          
          // Calculate distances to each edge of the station
          const distToLeft = Math.abs(dx + 50);
          const distToRight = Math.abs(dx - 50);
          const distToTop = Math.abs(dy + 50);
          const distToBottom = Math.abs(dy - 50);
          
          // Find the minimum distance to determine which side the player is on
          const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
          
          // Add a small buffer to prevent sticking/sliding
          const buffer = 5;
          
          // Apply appropriate displacement with increased push distance
          if (minDist === distToLeft) {
            this.player!.x = station.container.x - 80; // Increased push distance to 80
          } else if (minDist === distToRight) {
            this.player!.x = station.container.x + 80; // Increased push distance to 80
          } else if (minDist === distToTop) {
            this.player!.y = station.container.y - 80; // Increased push distance to 80
          } else if (minDist === distToBottom) {
            this.player!.y = station.container.y + 80; // Increased push distance to 80
            
            // Add additional check for bottom collision to prevent sliding
            if (this.cursors.left?.isDown || this.cursors.right?.isDown) {
              // If player is trying to move horizontally while colliding with bottom,
              // push them slightly further down to avoid the collision zone
              this.player!.y += buffer;
            }
          }
          
          // Add extra push when trying to move directly into a station
          if (minDist === distToLeft && this.cursors.right.isDown) {
            this.player!.x -= buffer; // Push little extra left when trying to move right
          } else if (minDist === distToRight && this.cursors.left.isDown) {
            this.player!.x += buffer; // Push little extra right when trying to move left
          } else if (minDist === distToTop && this.cursors.down.isDown) {
            this.player!.y -= buffer; // Push little extra up when trying to move down
          } else if (minDist === distToBottom && this.cursors.up.isDown) {
            this.player!.y += buffer; // Push little extra down when trying to move up
          }
        }
      }
    });
    
    // Update tracking of last direction and movement state
    if (direction !== this.lastDirection || (this.lastMoving !== isMoving)) {
      this.lastDirection = direction;
      this.lastMoving = isMoving;
    }
  }

  private verifyStationVisibility() {
    console.log('Verifying station visibility...');
    
    this.stations.forEach(station => {
      if (station.isUnlocked && station.container) {
        // Check if the station should be visible but isn't
        if (station.container.alpha < 1) {
          console.log(`Fixing visibility for unlocked station: ${station.type}`);
          station.container.setAlpha(1);
        }
        
        // Make sure the container is visible
        if (!station.container.visible) {
          console.log(`Setting visible=true for unlocked station: ${station.type}`);
          station.container.setVisible(true);
        }
      }
    });
    
    // Special check for quantity station
    const quantityStation = this.stations.find(s => s.type === 'quantity');
    if (quantityStation && quantityStation.isUnlocked) {
      console.log(`Quantity station status: unlocked=${quantityStation.isUnlocked}, alpha=${quantityStation.container.alpha}, visible=${quantityStation.container.visible}`);
    }
  }

  private checkForUnlock() {
    // Check if we've met the threshold for unlocking a new station
    const unlockedCount = this.stations.filter(station => station.isUnlocked).length;
    
    // If we already have all stations unlocked, no need to check
    if (unlockedCount >= this.stations.length) {
      return;
    }
    
    // If we've passed the threshold for the next unlock
    if (this.totalEditsApplied >= this.lastUnlockedAtEditCount + 5) {
      console.log('Threshold met to unlock next station: ${this.totalEditsApplied} edits applied');
      
      this.unlockNextStation();
    }
  }

  // Helper function to create a pixel art style sign
  private createStationSign(x: number, y: number, type: string): Phaser.GameObjects.Container {
    // Create a container for the sign - position higher above the station to create more space
    const signContainer = this.add.container(x, y - 85); // Increased distance from y - 50 to y - 85
    
    // Get the station name from the type
    const text = this.getStationName(type);
    
    // Create the sign background (wooden plank)
    const signWidth = Math.max(text.length * 14, 80); // Adjust width based on text length
    const signHeight = 40;
    
    // Sign shadow
    const signShadow = this.add.rectangle(2, 2, signWidth, signHeight, 0x000000)
      .setOrigin(0.5, 0.5)
      .setAlpha(0.3);
    
    // Main sign board with pixel art style
    const sign = this.add.rectangle(0, 0, signWidth, signHeight, 0xC19A6B)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(2, 0x8B4513);
    
    // Add grain texture to the sign to give it a pixel art feel
    const grainTexture = this.add.grid(
      0, 0,
      signWidth, signHeight,
      8, 8, // Pixel grid size
      0, 0,
      0x8B4513, 0.1
    ).setOrigin(0.5, 0.5);
    
    // Create nails at the corners for decorative effect
    const nail1 = this.add.circle(-signWidth/2 + 8, -signHeight/2 + 8, 2, 0x808080);
    const nail2 = this.add.circle(signWidth/2 - 8, -signHeight/2 + 8, 2, 0x808080);
    const nail3 = this.add.circle(-signWidth/2 + 8, signHeight/2 - 8, 2, 0x808080);
    const nail4 = this.add.circle(signWidth/2 - 8, signHeight/2 - 8, 2, 0x808080);
    
    // Format the text to make it look nicer
    const formattedText = text.charAt(0).toUpperCase() + text.slice(1);
    
    // Add the text to the sign
    const signText = this.add.text(0, 0, formattedText, {
      fontFamily: 'monospace', // Pixel font style
      fontSize: '20px',
      color: '#000000',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 0.5
    }).setOrigin(0.5, 0.5);
    
    // Add all elements to the container - removed post from this list
    signContainer.add([signShadow, sign, grainTexture, nail1, nail2, nail3, nail4, signText]);
    
    // Set the depth to ensure it's visible but doesn't interfere with other elements
    signContainer.setDepth(15); // Set to a depth that makes it visible but not too prominent
    
    return signContainer;
  }

  // Cheat function to unlock all stations
  private unlockAllStationsCheat() {
    // Unlock all stations
    this.stations.forEach(station => {
      station.isUnlocked = true;
      
      // Make station visible if it wasn't before
      if (station.container) {
        station.container.setAlpha(1);
        station.sign.setAlpha(1);
      }
    });
    
    // Update the count of when stations were last unlocked
    this.lastUnlockedAtEditCount = this.totalEditsApplied;
    
    // Show notification
    this.stationUnlockText.setText('🔓 All stations unlocked! 🔓');
    this.stationUnlockText.setVisible(true);
    
    // Fade out the notification after a delay
    this.tweens.add({
      targets: this.stationUnlockText,
      alpha: 0,
      duration: 2000,
      delay: 1500,
      onComplete: () => {
        this.stationUnlockText.setVisible(false);
        this.stationUnlockText.setAlpha(1);
      }
    });
    
    // Verify that all stations are visible
    this.verifyStationVisibility();
  }

  /**
   * Shows a comment for an order based on its edit type requirements
   */
  private showOrderComment(order: Order): void {
    console.log(`Showing comment for order ${order.id}`);
    
    // Skip comments for auto-completed orders if needed
    if (order.createdDuringPowerUp) {
      this.showPowerUpComment(order);
      return;
    }
    
    // For normal orders, pick a comment related to one of its required edits
    this.showRegularComment(order);
  }

  /**
   * Shows a regular comment for an order
   */
  private showRegularComment(order: Order): void {
    // Get a random edit type from the order's requirements
    const randomEditType = this.getRandomEditType(order.types);
    
    if (randomEditType && regularComments[randomEditType]) {
      const commentsForType = regularComments[randomEditType];
      
      // Filter out recently shown comments
      const availableComments = commentsForType.filter(
        comment => !this.recentComments.includes(comment.text)
      );
      
      // If all comments have been recently shown, use the full list
      const commentPool = availableComments.length > 0 ? availableComments : commentsForType;
      
      const randomIndex = Math.floor(Math.random() * commentPool.length);
      const comment = commentPool[randomIndex];
      
      // Add to recent comments list
      this.addToRecentComments(comment.text);
      
      this.createSpeechBubble(order, comment.text);
    }
  }

  /**
   * Shows a power-up related comment for an order
   */
  private showPowerUpComment(order: Order): void {
    // Filter power-up comments that match the order's edit types
    const matchingComments = powerUpComments.filter(comment => 
      order.types.includes(comment.editType) || comment.editType === 'general'
    );
    
    if (matchingComments.length === 0) {
      // Fall back to general comments if no matching ones
      const generalComments = powerUpComments.filter(comment => comment.editType === 'general');
      
      if (generalComments.length > 0) {
        // Filter out recently shown comments
        const availableComments = generalComments.filter(
          comment => !this.recentComments.includes(comment.text)
        );
        
        // If all comments have been recently shown, use the full list
        const commentPool = availableComments.length > 0 ? availableComments : generalComments;
        
        const randomIndex = Math.floor(Math.random() * commentPool.length);
        const commentText = commentPool[randomIndex].text;
        
        // Add to recent comments list
        this.addToRecentComments(commentText);
        
        this.createSpeechBubble(order, commentText);
      }
      
      return;
    }
    
    // Filter out recently shown comments
    const availableComments = matchingComments.filter(
      comment => !this.recentComments.includes(comment.text)
    );
    
    // If all comments have been recently shown, use the full list
    const commentPool = availableComments.length > 0 ? availableComments : matchingComments;
    
    // Select a random matching comment
    const randomIndex = Math.floor(Math.random() * commentPool.length);
    const commentText = commentPool[randomIndex].text;
    
    // Add to recent comments list
    this.addToRecentComments(commentText);
    
    this.createSpeechBubble(order, commentText);
  }

  /**
   * Gets a random edit type from the order's requirements
   */
  private getRandomEditType(editTypes: string[]): string | null {
    if (editTypes.length === 0) return null;
    
    // Simple random selection is more reliable here
    const randomIndex = Math.floor(Math.random() * editTypes.length);
    return editTypes[randomIndex];
  }

  /**
   * Adds a comment to the recent comments list and removes oldest if needed
   */
  private addToRecentComments(comment: string): void {
    // Add new comment to the list
    this.recentComments.push(comment);
    
    // Keep only the most recent 5 comments
    if (this.recentComments.length > this.maxRecentComments) {
      this.recentComments.shift(); // Remove oldest comment
    }
  }

  /**
   * Creates a speech bubble for an order
   */
  private createSpeechBubble(order: Order, text: string): void {
    console.log(`Creating speech bubble for order ${order.id}: "${text}"`);
    
    // Check if this order already has a bubble
    if (this.activeBubbles.has(order.id)) {
      console.log(`Order ${order.id} already has a speech bubble, skipping`);
      return;
    }
    
    // If we already have 2 active bubbles, remove the oldest one first
    if (this.activeBubbles.size >= 2) {
      console.log("Already showing 2 bubbles, removing oldest");
      const oldestOrderId = Array.from(this.activeBubbles.keys())[0];
      if (oldestOrderId) {
        const oldestBubble = this.activeBubbles.get(oldestOrderId);
        if (oldestBubble) {
          oldestBubble.destroy();
        }
        this.activeBubbles.delete(oldestOrderId);
      }
    }
    
    // Create bubble with the SpeechBubble class
    const bubble = new SpeechBubble({
      scene: this,
      x: order.x,
      y: order.y + 80, // Position below the order
      text: text,
      padding: 12,
      backgroundColor: order.createdDuringPowerUp ? 0x7358a7 : 0x4a6481, // Different color for power-up orders
      borderColor: order.createdDuringPowerUp ? 0xff8bf7 : 0x8bf7ff,
      borderWidth: 3,
      pointerPosition: 'center',
      lifespan: 0 // We'll manage the lifespan ourselves
    });
    
    // Store reference to manage lifecycle
    this.activeBubbles.set(order.id, bubble);
    
    // Add a small pop-in animation
    bubble.container.setScale(0.1);
    this.tweens.add({
      targets: bubble.container,
      scale: 1,
      duration: 300,
      ease: 'Back.Out'
    });
    
    // Remove from tracking after a delay
    this.time.delayedCall(5000, () => {
      if (this.activeBubbles.has(order.id)) {
        const storedBubble = this.activeBubbles.get(order.id);
        if (storedBubble) {
          storedBubble.destroy();
          this.activeBubbles.delete(order.id);
        }
      }
    });
  }
}
