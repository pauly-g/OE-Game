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
  private playerSpeed: number = 8;
  private carriedEdit: { type: string, icon: Phaser.GameObjects.Text } | null = null;
  private ordersCompleted: number = 0;
  private totalEditsApplied: number = 0;
  private lastUnlockedAtEditCount: number = 0;
  private lives: number = 3;
  private livesContainer!: Phaser.GameObjects.Container;
  private failedOrders: number = 0;
  private lastSpaceState: boolean = false;
  private orderGenerationTimer: Phaser.Time.TimerEvent | null = null;
  private nextOrderDelay: number = 5000; // Longer initial delay (was 3000)
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
  private lastDirection: 'up' | 'down' | 'left' | 'right' = 'down';
  private powerUpSwitchBounds!: Phaser.Geom.Rectangle;
  private lastMoving: boolean = false;
  private currentFrame = 1;
  private lastFrameTime = 0;

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
        this.player = this.add.sprite(width * 0.5, height * 0.5, 'idle down 1');
        this.player.setScale(2.7);
        this.lastDirection = 'down'; // Set initial direction
        this.lastMoving = false;
        this.currentFrame = 1;
        this.lastFrameTime = 0;
        
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
        this.player.setScale(2.7);
      }

      // Create stations before UI elements
      this.createStations();

      // Set up input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
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
        console.error('Cursors not initialized in update method');
        return;
      }

      // Check for 'd' key to activate powerup (cheat)
      if (Phaser.Input.Keyboard.JustDown(this.dKey)) {
        console.log('Cheat code activated: Power-Up!');
        this.activatePowerUpSwitch();
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
              this.player!.x = station.container.x - 75; // Push player further left
            } else if (minDist === distToRight) {
              this.player!.x = station.container.x + 75; // Push player further right
            } else if (minDist === distToTop) {
              this.player!.y = station.container.y - 75; // Push player further up
            } else if (minDist === distToBottom) {
              this.player!.y = station.container.y + 75; // Push player further down
              
              // Add additional check for bottom collision to prevent sliding
              if (this.cursors.left?.isDown || this.cursors.right?.isDown) {
                // If player is trying to move horizontally while colliding with bottom,
                // push them slightly further down to avoid the collision zone
                this.player!.y += buffer;
              }
            }
          }
        }
      });
      
      // Update animation based on direction and movement
      if (direction !== this.lastDirection || (this.lastMoving !== isMoving)) {
        this.lastDirection = direction;
        this.lastMoving = isMoving;
        
        // Play animation based on direction and movement state
        if (this.player) {
          const prefix = isMoving ? 'walk' : 'idle';
          const animKey = `${prefix}-${direction}`;
          
          // Check if animation exists before playing
          if (this.anims.exists(animKey)) {
            console.log(`Playing animation: ${animKey}`);
            this.player.anims.play(animKey, true);
          } else {
            console.error(`Animation not found: ${animKey}`);
            // Use fallback texture
            const textureKey = `${prefix} ${direction} 1`;
            if (this.textures.exists(textureKey)) {
              this.player.setTexture(textureKey);
            }
          }
        }
      }

      // Update current carrying edit position
      if (this.carriedEdit) {
        this.updateCarriedEditPosition();
      }

      // Handle conveyor belt movement for orders
      this.updateOrderPositions(delta);

      // Handle space bar for edit actions
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        if (this.carriedEdit) {
          // Try to apply edit to order first if carrying one
          if (this.tryApplyEditToOrder()) {
            // Successfully applied, do nothing else
          } else if (nearStation) {
            // Near a station but edit not applied, try to interact with station
            this.discardEdit();
          } else if (this.isNearPowerUpSwitch()) {
            // Near power-up switch, activate it
            this.activatePowerUpSwitch();
          } else {
            // Not near a station and edit not applied, just drop it
            this.discardEdit();
          }
        } else if (nearStation) {
          // Pickup edit if near a station and not carrying anything
          this.pickupEdit(nearStation);
        } else if (this.isNearPowerUpSwitch()) {
          // Near power-up switch, activate it
          this.activatePowerUpSwitch();
        }
      }
    } catch (error) {
      console.error('Error in update:', error);
    }
  }

  private isNearStation(): Station | null {
    if (!this.player) return null;
    
    const playerBounds = new Phaser.Geom.Rectangle(
      this.player.x - 40, 
      this.player.y - 40,
      80, 80
    );
    
    // Check each unlocked station
    for (const station of this.stations) {
      if (station.isUnlocked) {
        const stationBounds = new Phaser.Geom.Rectangle(
          station.container.x - 60,  // Slightly larger detection area than the collision box
          station.container.y - 60,
          120, 120
        );
        
        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, stationBounds)) {
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

  // Add missing methods for player animation and free life handling
  private updatePlayerAnimation(time: number) {
    if (!this.player) return;
    
    // Animation rate: 8 frames per second = 125ms per frame
    const frameDelay = 125; 
    
    if (time - this.lastFrameTime > frameDelay) {
      // Advance to next frame (looping from 6 back to 1)
      this.currentFrame = this.currentFrame >= 6 ? 1 : this.currentFrame + 1;
      this.lastFrameTime = time;
    }
  }

  private pickupEdit(station: Station) {
    if (this.carriedEdit) {
      console.log('Already carrying an edit, cannot pick up another');
      return;
    }
    
    console.log(`Picking up ${station.type} edit`);
    
    // Create edit icon and attach to player
    const editIcon = this.add.text(0, 0, this.getStationIcon(station.type), {
      fontSize: '24px',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    
    // Store reference to edit
    this.carriedEdit = {
      type: station.type,
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
    
    // Position the edit closer to the player based on direction
    let offsetX = 0;
    let offsetY = -25; // Default, shorter distance above player
    
    if (this.lastDirection === 'left') {
      offsetX = -20; // Closer to the player (was -30)
      offsetY = -5;  // Slightly above to avoid collision with objects
    } else if (this.lastDirection === 'right') {
      offsetX = 20;  // Closer to the player (was 30)
      offsetY = -5;  // Slightly above to avoid collision with objects
    } else if (this.lastDirection === 'up') {
      offsetX = 0;
      offsetY = -20; // Closer to the player (was -30)
    } else if (this.lastDirection === 'down') {
      offsetX = 0;
      offsetY = 20;  // Closer to the player (was 30)
    }
    
    this.carriedEdit.icon.x = this.player.x + offsetX;
    this.carriedEdit.icon.y = this.player.y + offsetY;
    
    // Make sure the edit is always on top
    this.carriedEdit.icon.setDepth(100);
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

  private tryApplyEditToOrder(): boolean {
    if (!this.carriedEdit) return false;
    
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
      
      // Check if we should unlock a new station (every 5 edits)
      if (this.totalEditsApplied >= 5 && (this.totalEditsApplied - this.lastUnlockedAtEditCount) >= 5) {
        this.unlockNextStation();
        this.lastUnlockedAtEditCount = this.totalEditsApplied;
      }
      
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
      
      // Auto-complete any existing orders that were created before power-up
      for (const order of this.orders) {
        if (!order.isComplete && !order.createdDuringPowerUp) {
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
      console.log('Generating new order');
      
      // Count how many stations are unlocked
      const unlockedStations = this.stations.filter(station => station.isUnlocked);
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
      
      // Take the first numEdits types
      for (let i = 0; i < numEdits; i++) {
        selectedTypes.push(shuffledTypes[i % shuffledTypes.length]);
      }
      
      console.log(`Creating order with ${numEdits} edits: ${selectedTypes.join(', ')}`);
      
      // Create container for the order
      const container = this.add.container(orderX, orderY);
      
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
        const icon = this.add.text(0, 0, this.getStationIcon(type), {
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
          }
          icon.y = 0; // Centered vertically
        } else {
          // Grid layout
          const row = Math.floor(index / 3);
          const col = index % 3;
          const spacing = 30;
          
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
        height: bgHeight,
        icons // Add icons to the order object
      };
      
      // Add to orders array
      this.orders.push(order);
      
      // If power up is active, auto-complete this order immediately
      if (this.powerUpActive) {
        order.createdDuringPowerUp = true;
        // Get all edit types that need to be completed
        const editsToApply = [...order.types];
        
        // Apply all edits at once
        for (const editType of editsToApply) {
          order.completedEdits.push(editType);
          this.markEditAsApplied(order, editType);
          this.totalEditsApplied++;
        }
        
        // Complete the order
        this.completeOrder(order);
      }
      
      console.log(`Order created: ${order.id}`);
    } catch (error) {
      console.error('Error generating order:', error);
    }
  }

  private unlockNextStation() {
    // Find the first locked station
    const nextLockedStation = this.stations.find(station => !station.isUnlocked);
    
    if (nextLockedStation) {
      console.log(`Unlocking station: ${nextLockedStation.type}`);
      
      // Unlock the station
      nextLockedStation.isUnlocked = true;
      
      // Make it visible with animation
      nextLockedStation.container.setAlpha(0);
      this.tweens.add({
        targets: nextLockedStation.container,
        alpha: 1,
        duration: 1000,
        ease: 'Power2'
      });
      
      // Show announcement
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      const announcement = this.add.text(
        width * 0.5,
        height * 0.3,
        `New Station Unlocked: ${this.getStationIcon(nextLockedStation.type)} ${nextLockedStation.type}!`,
        {
          fontSize: '28px',
          color: '#ffff00',
          stroke: '#000000',
          strokeThickness: 3
        }
      ).setOrigin(0.5);
      
      // Animate announcement
      this.tweens.add({
        targets: announcement,
        scale: { from: 0.5, to: 1.5 },
        alpha: { from: 1, to: 0 },
        y: '-=50',
        duration: 2000,
        onComplete: () => announcement.destroy()
      });
      
      // Update the last unlocked order count
      this.lastUnlockedAtEditCount = this.totalEditsApplied;
      
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
      
      // Update order generation timer with new delay
      if (this.orderGenerationTimer) {
        this.orderGenerationTimer.reset({
          delay: this.nextOrderDelay,
          callback: this.generateOrder,
          callbackScope: this,
          loop: true
        });
      }
    } else {
      console.log('All stations are already unlocked');
    }
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
    this.carriedEdit = null;
    
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
  }

  // Update the order positions function to handle completed orders

  // Power-up methods

  private activatePowerUpSwitch() {
    if (!this.powerUpAvailable || this.powerUpActive) return;
    
    console.log('Activating Power-Up!');
    
    // Set button state
    this.powerUpActive = true;
    this.powerUpAvailable = false;
    this.powerUpTimer = this.powerUpDuration; // 30 seconds of power-up time
    
    // Visual feedback
    this.setButtonColor(0x0000ff); // Blue for active
    
    // Show countdown
    this.powerUpCountdownText.setText('30s');
    
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
}
