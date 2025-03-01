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
  private cKey!: Phaser.Input.Keyboard.Key;
  private playerSpeed: number = 4; // Reduce from 8 to 4 for slower movement
  private carriedEdits: { type: string, icon: Phaser.GameObjects.Text }[] = [];
  private maxCarriedEdits: number = 3; // Maximum number of edits the player can carry at once
  private ordersCompleted: number = 0;
  private totalEditsApplied: number = 0;
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
      this.load.image('button-flash', 'game/Button/button-flash2.png');
      
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
      // Set up some game variables
      gameDebugger.info('Setting up game variables');
      
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
      quantity: '🔢', // Change from '#️⃣' to '🔢' which renders better
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
    
    // Add debugging to see what types are being used
    const icon = icons[type];
    if (!icon) {
      console.error(`No icon found for station type: ${type}`);
      return '❓'; // Fallback icon if type not found
    }
    console.log(`Returning icon '${icon}' for type '${type}'`);
    return icon;
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

      // Check for 'd' key to activate powerup (cheat)
      if (Phaser.Input.Keyboard.JustDown(this.dKey)) {
        console.log('Cheat code activated: Power-Up!');
        this.activatePowerUpCheat();
      }

      // Process power-up status
      if (this.powerUpActive) {
        this.updatePowerUp(delta);
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
      
      // Create a buffer zone around the conveyor belt
      const conveyorBufferTop = this.conveyorBelt.y - 40; // Increased buffer above conveyor from 20px to 40px
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
      
      // Check for 'c' key to activate powerup cheat
      if (Phaser.Input.Keyboard.JustDown(this.cKey)) {
        console.log('Cheat code activated: Power-Up!');
        this.activatePowerUpCheat();
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
    const checkmark = this.add.text(0, -15, '✓', {
      fontSize: '24px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 2
    });
    
    // Get the corresponding icon for positioning if available
    if (order.icons && order.icons[index]) {
      // Position the checkmark directly on top of the icon
      checkmark.x = order.icons[index].x;
      checkmark.y = order.icons[index].y - 15; // Position slightly above the icon
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
        } else {
          // For second row (centers 1 or 2 items)
          const itemsInLastRow = order.types.length - 3;
          if (itemsInLastRow === 1) {
            checkmark.x = 0; // Center the single item
          } else {
            checkmark.x = (col - 0.5) * spacing; // Center 2 items (-20, +20)
          }
        }
        
        checkmark.y = (row - 0.5) * spacing; // -20 for first row, +20 for second row
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
    
    console.log(`Completed order ${order.id}`);
    
    // Update counters
    this.ordersCompleted++;
    
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
    
    // Check if we should make power-up available after completing a certain number of orders
    if (this.ordersCompleted % 5 === 0 && !this.powerUpActive && !this.powerUpAvailable) {
      this.makePowerUpAvailable();
    }
  }

  // Update the order positions function to handle completed orders

  // Power-up methods

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
      const centerY = height;
      
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
  
  private deactivatePowerUp() {
    if (!this.powerUpActive) return;
    
    console.log('Power-Up expired!');
    
    // Reset button state
    this.powerUpActive = false;
    this.powerUpTimer = 0;
    this.powerUpCountdownText.setText('');
    
    // Visual feedback
    this.setButtonColor(0xff0000); // Red for inactive
    
    // Animate Hamish and Kiril sliding out
    if (this.hamishSprite && this.hamishSprite.active) {
      this.tweens.add({
        targets: this.hamishSprite,
        x: this.cameras.main.width + 100,
        duration: 500,
        ease: 'Sine.Out',
        onComplete: () => {
          if (this.hamishSprite) this.hamishSprite.destroy();
        }
      });
    }
    
    if (this.kirilSprite && this.kirilSprite.active) {
      this.tweens.add({
        targets: this.kirilSprite,
        x: -100,
        duration: 500,
        ease: 'Sine.Out',
        onComplete: () => {
          if (this.kirilSprite) this.kirilSprite.destroy();
        }
      });
    }
    
    // Animate the OELogo sliding out
    if (this.oeLogoSprite && this.oeLogoSprite.active) {
      this.tweens.add({
        targets: this.oeLogoSprite,
        y: this.cameras.main.height + 100,
        duration: 500,
        ease: 'Sine.Out',
        onComplete: () => {
          if (this.oeLogoSprite) this.oeLogoSprite.destroy();
        }
      });
    }
    
    // Play deactivation sound
    if (this.sound && this.sound.add) {
      try {
        const deactivateSound = this.sound.add('powerdown', { volume: 0.5 });
        deactivateSound.play();
      } catch (error) {
        console.error('Could not play power-down sound:', error);
      }
    }
    
    // Animate the lever returning
    this.tweens.add({
      targets: this.powerUpLever,
      y: 0, // Return to original position
      angle: 0, // Reset rotation
      duration: 300,
      ease: 'Sine.InOut'
    });
  }

  private activatePowerUpCheat() {
    console.log('Activating Power-Up Cheat!');
    
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
    const centerY = height;
    
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
      
      // Check if order went off screen
      if (order.x > this.cameras.main.width + 50) {
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
            '��',
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
      }
    }
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
      this.powerUpButtonSprite.setTexture('button-pressed');
      
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
        this.powerUpButtonSprite.setTexture('button-idle');
      }
    }
  }

  private updateButtonFlashing(delta: number) {
    if (!this.powerUpButtonSprite) return;
    
    // Only flash the button when power-up is available and not active
    if (this.powerUpAvailable && !this.powerUpActive) {
      // Accumulate time for flashing
      this.buttonFlashTimer += delta;
      
      // When we reach the flash interval, toggle the flash state
      if (this.buttonFlashTimer >= this.buttonFlashInterval) {
        this.buttonFlashTimer = 0; // Reset timer
        this.buttonFlashState = !this.buttonFlashState; // Toggle flash state
        
        // Change button texture based on flash state
        this.powerUpButtonSprite.setTexture(
          this.buttonFlashState ? 'button-flash' : 'button-idle'
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
    this.powerUpButtonSprite.setTexture('button-idle');
    
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

  private activatePowerUpCheat() {
    console.log("CHEAT: Making power-up available");
    
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

  private activatePowerUp() {
    // Set power-up to active
    this.powerUpActive = true;
    this.powerUpAvailable = false;
    this.powerUpTimer = 15000; // 15 seconds of power-up time
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
    
    // Show flash effects
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

  private handlePlayerMovement(delta: number) {
    if (!this.player || !this.cursors) return;
    
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
    if (this.cursors.left?.isDown) {
      this.player.x -= this.playerSpeed;
      direction = 'left';
      isMoving = true;
    } else if (this.cursors.right?.isDown) {
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

  private updatePowerUp(delta: number) {
    // If power up is active, update timer and auto-complete orders
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
      
      // Auto-complete any order that appears
      for (const order of this.orders) {
        if (!order.isComplete && !order.completedEdits.length) {
          // Auto-complete all edit types
          for (const editType of order.types) {
            if (!order.completedEdits.includes(editType)) {
              order.completedEdits.push(editType);
              this.markEditAsApplied(order, editType);
              this.totalEditsApplied++;
            }
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
      
      // Take the first numEdits types, without duplicates
      for (let i = 0; i < numEdits && i < shuffledTypes.length; i++) {
        // Only add this type (no need to check as shuffle ensures uniqueness)
        selectedTypes.push(shuffledTypes[i]);
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
      const bgWidth = numEdits <= 3 ? 90 + (numEdits * 10) : 130;
      const bgHeight = numEdits <= 3 ? 70 : 100;
      
      // Create cardboard box
      const boxColor = 0xd9c0a3; // Lighter cardboard brown color
      const background = this.add.rectangle(0, 0, bgWidth, bgHeight, boxColor, 1)
        .setStrokeStyle(2, 0xa0816c); // Softer brown for the edges
      
      // Add cardboard box flap at the top - more subtle
      const topFlap = this.add.rectangle(0, -bgHeight/2 + 6, bgWidth * 0.7, 10, boxColor)
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
        } else {
          // Grid layout
          const row = Math.floor(index / 2);
          const col = index % 2;
          const spacing = 40;
          
          // Calculate positions to center the grid
          // For first row (0, 1, 2)
          if (row === 0) {
            icon.x = (col - 1) * spacing; // -spacing, 0, +spacing
          } else {
            // For second row (centers 1 or 2 items)
            const itemsInLastRow = selectedTypes.length - 3;
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
        height: bgHeight,
        icons // Add icons to the order object
      };
      
      // Add to orders array
      this.orders.push(order);
      
      // If power up is active, mark this order as created during power-up
      if (this.powerUpActive) {
        order.createdDuringPowerUp = true;
      }
      
      console.log(`Order created: ${order.id}`);
      console.log(`Order requires edits: ${order.types.join(', ')}`);
      console.log(`Order icon types: ${order.types.map(type => `${type}: ${this.getStationIcon(type)}`).join(', ')}`);
    } catch (error) {
      console.error('Error generating order:', error);
    }
  }

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
      // Force the station to be fully visible
      nextStation.container.setAlpha(1);
      console.log(`Setting alpha to 1 for station: ${nextStation.type}`);
      
      // Flash the station to draw attention to it
      this.tweens.add({
        targets: nextStation.container,
        alpha: { from: 0.5, to: 1 },
        scale: { from: 0.8, to: 1 },
        ease: 'Sine.InOut',
        duration: 500,
        repeat: 3,
        yoyo: true,
        onComplete: () => {
          // Ensure it stays visible after the animation
          nextStation.container.setAlpha(1);
          console.log(`Animation complete for station: ${nextStation.type}, alpha: ${nextStation.container.alpha}`);
        }
      });
      
      // Add a celebratory animation around the station
      const celebrationEmoji = this.add.text(
        nextStation.container.x,
        nextStation.container.y - 50,
        '⭐',
        { fontSize: '36px', stroke: '#000000', strokeThickness: 2 }
      ).setOrigin(0.5);
      
      // Animate the celebration emoji
      this.tweens.add({
        targets: celebrationEmoji,
        y: '-=50',
        alpha: { from: 1, to: 0 },
        scale: { from: 1, to: 2 },
        duration: 1500,
        ease: 'Sine.Out',
        onComplete: () => celebrationEmoji.destroy()
      });
      
      // Show an announcement
      const announcement = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        `New Station Unlocked: ${this.getStationIcon(nextStation.type)} ${nextStation.type}!`,
        { 
          fontSize: '28px', 
          stroke: '#000000', 
          strokeThickness: 4,
          backgroundColor: '#FFF9C4',
          padding: { x: 20, y: 10 }
        }
      ).setOrigin(0.5).setDepth(110);
      
      // Add a background for the announcement
      const bgWidth = announcement.width + 40;
      const bgHeight = announcement.height + 20;
      const announcementBg = this.add.rectangle(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        bgWidth,
        bgHeight,
        0xFFF9C4,
        0.8
      ).setOrigin(0.5).setDepth(109).setStrokeStyle(4, 0x000000);
      
      // Animate the announcement
      this.tweens.add({
        targets: [announcement, announcementBg],
        alpha: { from: 1, to: 0 },
        scale: { from: 1, to: 1.2 },
        duration: 2000,
        delay: 1500,
        ease: 'Sine.InOut',
        onComplete: () => {
          announcement.destroy();
          announcementBg.destroy();
        }
      });
    }
    
    // Reset the counter for the next unlock
    this.lastUnlockedAtEditCount = this.totalEditsApplied;
  }
}
