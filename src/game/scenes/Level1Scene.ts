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
import { stationTracker } from '../utils/stationTracker';

// Get the RESET_TRACKER_KEY from stationTracker
import { stationTracker } from '../utils/stationTracker';

// Add this constant definition for when we need to access it directly
const RESET_TRACKER_KEY = 'oe-game-tracker-reset';

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
  private lKey!: Phaser.Input.Keyboard.Key; // New l key for reducing lives cheat
  private tKey!: Phaser.Input.Keyboard.Key; // New t key for tutorial cheat
  private playerSpeed: number = 8; // Changed from 4 to 8 for faster movement
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
  private stationUnlockContainer!: Phaser.GameObjects.Container;
  private powerUpSwitch!: Phaser.GameObjects.Container;
  private powerUpLight!: Phaser.GameObjects.Rectangle;
  private powerUpLever!: Phaser.GameObjects.Rectangle;
  private powerUpAvailable: boolean = false;
  private powerUpCountdownText!: Phaser.GameObjects.Text;
  private powerUpProgress: number = 0; // Current progress towards next power-up
  private powerUpRequirement: number = 10; // Edits needed for first power-up
  private powerUpUsedCount: number = 0; // How many times power-up has been used
  private powerUpProgressBar!: Phaser.GameObjects.Rectangle;
  private powerUpProgressBackground!: Phaser.GameObjects.Rectangle;
  private conveyorBelt!: Phaser.GameObjects.Rectangle;
  private lastDirection: string = 'down';
  private lastMoving: boolean = false;
  private animationTime: number = 0;
  private currentAnimationFrame: number = 0; // Match the main branch value
  private animationFrameDuration: number = 125; // 8 frames per second = 125ms per frame
  private powerUpSwitchBounds!: Phaser.Geom.Rectangle;
  private powerUpReadyText!: Phaser.GameObjects.Text;
  private powerUpCircularText: Phaser.GameObjects.Container | null = null;
  private circularTextAngle: number = 0;
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

  private totalEditsCompleted: number = 0;
  private firstSongUnlocked: boolean = false;
  private inputsDisabled: boolean = false; // Track if keyboard inputs should be ignored
  
  // Tutorial System Properties
  private tutorialActive: boolean = false;
  private tutorialStep: number = 0;
  private tutorialOverlay!: Phaser.GameObjects.Container;
  private tutorialText!: Phaser.GameObjects.Text;
  private tutorialArrow?: Phaser.GameObjects.Graphics;
  private tutorialHighlight?: Phaser.GameObjects.Graphics;
  private hasTutorialOrder: boolean = false;
  private skipTutorialKey!: Phaser.Input.Keyboard.Key;
  private tutorialTargetOrder?: Order; // Track which order is being highlighted
  private isRestart: boolean = false; // Track if this is a restart vs new game

  // Add constants for difficulty scaling
  private readonly MAX_POWER_UPS: number = 3; // Maximum number of power-ups allowed
  private readonly BASE_CONVEYOR_SPEED: number = 0.5; // Starting conveyor speed
  private readonly SPEED_MULTIPLIER_PER_STATION: number = 1.08; // Even gentler exponential multiplier per station unlock

  // Add a function to create confetti particle effect
  private createConfettiEffect(x: number, y: number) {
    // Create a particle emitter for the confetti effect
    const emitter = this.add.particles(0, 0, 'pixel', {
      x: x,
      y: y,
      speed: { min: 200, max: 300 },
      angle: { min: 250, max: 290 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 2000,
      gravityY: 300,
      quantity: 1,
      frequency: 50, // ms between particles
      tint: [ 0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF ]
    });
    
    // Stop emission after 1 second
    this.time.delayedCall(1000, () => {
      emitter.stop();
      
      // Remove the emitter after particles fade
      this.time.delayedCall(2000, () => {
        emitter.destroy();
      });
    });
    
    return emitter;
  }

  constructor() {
    super({ key: 'Level1Scene' });
    console.log('Level1Scene constructor called');
    this.powerUpDuration = 30000; // 30 seconds of power-up time
    this.lives = 3;
  }

  init(data?: { reset: boolean, fullReset?: boolean }) {
    console.log('Level1Scene init called', data);
    
    const isFullReset = data?.fullReset === true;
    
    // Track if this is a restart (true) or fresh start (false)
    this.isRestart = data?.reset === true;
    console.log('Is restart:', this.isRestart);
    
    if (data?.reset) {
      console.log(`Game restarting - performing ${isFullReset ? 'FULL' : 'standard'} reset in Level1Scene init`);
      
      // Reset internal game state variables
      this.score = 0;
      this.lives = 3;
      this.ordersCompleted = 0;
      this.totalEditsApplied = 0;        // Reset edit count
      this.lastUnlockedAtEditCount = 0;  // Reset unlock counter
      this.manualOrdersCompleted = 0;
      this.failedOrders = 0;
      this.orders = [];                  // Clear existing orders
      this.carriedEdits = [];            // Clear carried edits
      this.powerUpActive = false;
      this.powerUpAvailable = false;
      this.powerUpProgress = 0;          // Reset power-up progress
      this.powerUpUsedCount = 0;         // Reset power-up usage count
      this.powerUpRequirement = 10;      // Reset to initial requirement
      this.nextOrderDelay = 5000;        // Reset order delay
      this.orderSpeedMultiplier = 1.0;   // Reset speed multiplier
      this.conveyorSpeed = 0.5;          // Reset conveyor speed
      this.recentComments = [];          // Clear recent comments
      this.activeBubbles.clear();        // Clear active bubbles
      
      // Handle station reset based on fullReset flag
      if (isFullReset) {
        console.log('Performing full station reset due to fullReset flag');
        
        // For a full reset, force localStorage cleanup
        localStorage.removeItem(RESET_TRACKER_KEY);
        localStorage.removeItem('oe-game-unlock-timestamp');
        localStorage.removeItem('oe-game-last-unlock');
        localStorage.removeItem('oe-game-reset-done');
        
        // Force reset of stations in localStorage
        stationTracker.resetStations();
        console.log('Station tracker reset called from Level1Scene init with fullReset');
        
        // Re-initialize stations based on the reset state
        stationTracker.initializeStations(); 
        console.log('Station tracker initialized after full reset');
        
        // Force any existing stations to be cleared and recreated
        this.stations = [];
      } else {
        // Standard reset
        console.log('Standard reset: Just resetting station tracker');
        
        // Force reset of stations in localStorage
        stationTracker.resetStations();
        console.log('Station tracker reset called from Level1Scene init');
        
        // Re-initialize stations based on the reset state
        stationTracker.initializeStations(); 
        console.log('Station tracker initialized after reset');
      }
      
      // Log the game state after reset
      console.log('Game reset complete in Level1Scene init');
    } else {
      console.log('Level1Scene init called without reset flag');
      // Ensure stations are initialized even if not resetting fully
      stationTracker.initializeStations(); 
    }
  }

  preload() {
    console.log('Level1Scene preload started');
    
    // COMMENTED OUT: Set up loading progress tracking - causing issues
    /*
    this.load.on('progress', (value: number) => {
      // Emit progress event for the loading screen
      const progressEvent = new CustomEvent('gameLoadProgress', {
        detail: { 
          progress: value, 
          text: `Loading assets... ${Math.round(value * 100)}%`
        }
      });
      window.dispatchEvent(progressEvent);
    });

    this.load.on('complete', () => {
      console.log('Level1Scene preload complete');
      // Emit completion event for the loading screen
      const completeEvent = new CustomEvent('gameLoadComplete');
      window.dispatchEvent(completeEvent);
    });
    */

    try {
      // COMMENTED OUT: Emit initial loading state
      /*
      const startEvent = new CustomEvent('gameLoadProgress', {
        detail: { progress: 0, text: 'Initializing game assets...' }
      });
      window.dispatchEvent(startEvent);
      */

      gameDebugger.info('Starting to load player animations');
      
      // Load player animations
      const directions = ['up', 'down', 'left', 'right'];
      directions.forEach(direction => {
        // Load all 4 frames for each animation (only 1-4 exist for idle down)
        const maxFrames = (direction === 'down') ? 4 : 6; // Only 4 frames for down direction
        for (let i = 1; i <= maxFrames; i++) {
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
      this.load.image('background', 'game/Background/Background2.jpg')
        .on('filecomplete', () => {
          gameDebugger.info('Background loaded');
        })
        .on('loaderror', (_key: string, _file: string, error: Error) => {
          console.error(`Failed to load background: ${error.message}`);
        });
        
      // Load conveyor belt assets
      this.load.image('conveyor-belt-tile', 'game/ConveyorBelt/conveyor-belt-tile.svg')
        .on('filecomplete', () => {
          gameDebugger.info('Conveyor belt tile loaded');
        })
        .on('loaderror', (_key: string, _file: string, error: Error) => {
          console.error(`Failed to load conveyor belt tile: ${error.message}`);
        });
        
      this.load.image('conveyor-arrow', 'game/ConveyorBelt/conveyor-arrow.svg')
        .on('filecomplete', () => {
          gameDebugger.info('Conveyor arrow loaded');
        })
        .on('loaderror', (_key: string, _file: string, error: Error) => {
          console.error(`Failed to load conveyor arrow: ${error.message}`);
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
      this.load.image('button-flash', 'game/Button/button-flash2.png');
      this.load.image('button-flash2', 'game/Button/button-flash2.png');
      
      // Load essential background music
      this.load.audio('backgroundMusic', 'game/Music/BG-Music/The Warehouse.mp3');
      this.load.audio('gameOverMusic', 'game/Music/BG-Music/Game Over.mp3');
      
      // Create a pixel texture for particles
      this.textures.generate('pixel', {
        data: ['1'],
        pixelWidth: 2,
        pixelHeight: 2
      });
      
      gameDebugger.info('Level1Scene preload setup completed');
    } catch (error) {
      console.error('Error in preload:', error);
      // COMMENTED OUT: Emit error event - causing loading issues
      /*
      const errorEvent = new CustomEvent('gameLoadProgress', {
        detail: { progress: 0, text: 'Error loading game assets' }
      });
      window.dispatchEvent(errorEvent);
      */
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
    console.log('Level1Scene create called');
    
    // --- Reset critical counters at the start of create --- 
    /* this.totalEditsApplied = 0;
    this.lastUnlockedAtEditCount = 0;
    console.log('[Level1Scene Create] Reset edit/unlock counters'); */
    // --- End Reset --- 
    
    try {
      // Listen for input disabling events from outside the game (leaderboard, etc)
      const handleInputDisabling = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent && customEvent.detail) {
          this.inputsDisabled = customEvent.detail.inputsDisabled;
          console.log(`[Level1Scene] Game inputs ${this.inputsDisabled ? 'disabled' : 'enabled'}`);
          
          // If forceReset flag is set, make sure player movement is restored
          if (customEvent.detail.forceReset && !this.inputsDisabled) {
            console.log('[Level1Scene] Force resetting player controls');
            // Ensure the player speed is properly set
            this.playerSpeed = 8;
            
            // Ensure cursor keys will work
            if (this.input && this.input.keyboard) {
              this.cursors = this.input.keyboard.createCursorKeys();
            }
          }
        }
      };
      
      // Add the event listener
      window.addEventListener('gameInputState', handleInputDisabling);
      
      // Store the listener so we can remove it in scene shutdown
      this.events.on('shutdown', () => {
        window.removeEventListener('gameInputState', handleInputDisabling);
      });
      
      // Define width and height for convenience
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      gameDebugger.info('Level1Scene create method started');
      
      // Reset the state when starting a new game
      if (!localStorage.getItem('oe-game-reset-done')) {
        stationTracker.resetStations();
        localStorage.setItem('oe-game-reset-done', 'true');
        console.log('[Level1Scene] Forced reset of stations on game start');
      }
      
      // Initialize the station tracker
      stationTracker.initializeStations();
      console.log('Initialized stationTracker in Level1Scene');
      
      // Force background music to play when scene is created
      try {
        gameDebugger.info('Level1Scene: Dispatching forcePlayMusic event');
        const musicEvent = new CustomEvent('forcePlayMusic', { 
          detail: { source: 'level1SceneCreate' } 
        });
        window.dispatchEvent(musicEvent);
      } catch (err) {
        gameDebugger.error('Error dispatching forcePlayMusic event:', err);
      }
    
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
      
      // Create the conveyor belt using the tileable texture
      if (this.textures.exists('conveyor-belt-tile')) {
        // Create a tiled sprite for the conveyor belt
        this.conveyorBelt = this.add.tileSprite(conveyorX, conveyorY, conveyorWidth, 40, 'conveyor-belt-tile') as any;
        this.conveyorBelt.setDepth(5);
        
        // Store the conveyor belt bounds for collision detection
        this.conveyorBounds = {
          top: conveyorY - 20,    // Top of conveyor
          bottom: conveyorY + 20, // Bottom of conveyor
          left: conveyorX - conveyorWidth/2,   // Left edge
          right: conveyorX + conveyorWidth/2   // Right edge
        };
      } else {
        // Fallback to the original rectangle implementation
        console.warn('Conveyor belt texture not loaded, using fallback rectangle');
        this.conveyorBelt = this.add.rectangle(conveyorX, conveyorY, conveyorWidth, 40, 0x444444)
          .setStrokeStyle(2, 0x666666);
      }
      
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
        
        // console.log(`Initial sprite texture set to: idle down 1`);
        
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
    this.lKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L); // Initialize l key
    this.tKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T); // Initialize t key for tutorial cheat
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
      
      // Sync tracker with the initial game state
      this.syncTrackerWithGameState();
      
      // Initialize tutorial system for new players
      this.initializeTutorial();
      
      // Dispatch event to start session tracking now that gameplay has begun
      try {
        const gameplayEvent = new CustomEvent('gameplayStarted', {
          detail: { timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(gameplayEvent);
        console.log('[Level1Scene] Dispatched gameplayStarted event for session tracking');
      } catch (error) {
        console.error('[Level1Scene] Error dispatching gameplayStarted event:', error);
      }
    } catch (error) {
      console.error('Error in create method:', error);
    }
  }

  private createUI(width: number, height: number) {
    // Create a wooden sign container for the score at the top center
    const scoreContainer = this.add.container(width * 0.5, 16);
    scoreContainer.setDepth(100); // Ensure it's above everything else
    
    // Create the wooden sign background for score (similar to station signs)
    const scoreWidth = 180; // Fixed width that can accommodate large scores
    const scoreHeight = 44; // Slightly taller than station signs
    
    // Score sign shadow for depth
    const scoreShadow = this.add.rectangle(3, 3, scoreWidth, scoreHeight, 0x000000)
      .setOrigin(0.5, 0.5)
      .setAlpha(0.3);
    
    // Score sign background 
    const scoreBackground = this.add.rectangle(0, 0, scoreWidth, scoreHeight, 0xC19A6B)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(3, 0x8B4513);
    
    // Add grain texture to the sign
    const scoreGrainTexture = this.add.grid(
      0, 0,
      scoreWidth, scoreHeight,
      8, 8, // Pixel grid size
      0, 0,
      0x8B4513, 0.1
    ).setOrigin(0.5, 0.5);
    
    // Create nails at the corners
    const nail1 = this.add.circle(-scoreWidth/2 + 10, -scoreHeight/2 + 10, 2, 0x808080);
    const nail2 = this.add.circle(scoreWidth/2 - 10, -scoreHeight/2 + 10, 2, 0x808080);
    const nail3 = this.add.circle(-scoreWidth/2 + 10, scoreHeight/2 - 10, 2, 0x808080);
    const nail4 = this.add.circle(scoreWidth/2 - 10, scoreHeight/2 - 10, 2, 0x808080);
    
    // Create the score text with improved visibility
    this.scoreText = this.add.text(0, 0, 'Score: 0', {
      fontFamily: 'monospace', // Match station sign font
      fontSize: '24px',
      color: '#000000', // Black text on wooden background
      stroke: '#000000',
      strokeThickness: 0.5,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Add all elements to the score container
    scoreContainer.add([
      scoreShadow, 
      scoreBackground, 
      scoreGrainTexture, 
      nail1, nail2, nail3, nail4, 
      this.scoreText
    ]);

    // Create wooden sign container for lives
    const livesContainer = this.add.container(80, 16);
    livesContainer.setDepth(100);
    
    // Create lives sign background (initial size for 3 lives)
    const livesWidth = 110;
    const livesHeight = 44;
    
    // Lives background shadow
    const livesShadow = this.add.rectangle(3, 3, livesWidth, livesHeight, 0x000000)
      .setOrigin(0.5, 0.5)
      .setAlpha(0.3);
    
    // Lives sign background
    const livesBackground = this.add.rectangle(0, 0, livesWidth, livesHeight, 0xC19A6B)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(3, 0x8B4513);
    
    // Lives grain texture
    const livesGrainTexture = this.add.grid(
      0, 0, 
      livesWidth, livesHeight,
      8, 8,
      0, 0,
      0x8B4513, 0.1
    ).setOrigin(0.5, 0.5);
    
    // Lives nail decorations
    const livesNail1 = this.add.circle(-livesWidth/2 + 10, -livesHeight/2 + 10, 2, 0x808080);
    const livesNail2 = this.add.circle(livesWidth/2 - 10, -livesHeight/2 + 10, 2, 0x808080);
    const livesNail3 = this.add.circle(-livesWidth/2 + 10, livesHeight/2 - 10, 2, 0x808080);
    const livesNail4 = this.add.circle(livesWidth/2 - 10, livesHeight/2 - 10, 2, 0x808080);
    
    // Add backgrounds to container first
    livesContainer.add([
      livesShadow,
      livesBackground,
      livesGrainTexture,
      livesNail1, livesNail2, livesNail3, livesNail4
    ]);
    
    // Now create the hearts container (as a child of the background)
    this.livesContainer = this.add.container(0, 0);
    livesContainer.add(this.livesContainer);
    
    // Initialize lives display
    this.updateLivesDisplay();

    this.powerUpText = this.add.text(width * 0.5, 50, '', {
      fontSize: '24px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setVisible(false);

    // Create a container for the station unlock notification
    this.stationUnlockContainer = this.add.container(width * 0.5, height * 0.4);
    this.stationUnlockContainer.setVisible(false);
    
    // Create pixel-art wood sign style notification (similar to station signs)
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
      fontSize: '22px', // Slightly smaller font
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);
    
    // Add all elements to container in correct layering order
    this.stationUnlockContainer.add([
      signShadow,
      signBackground,
      borderTop,
      borderBottom,
      borderLeft,
      borderRight,
      leftCap,
      rightCap,
      this.stationUnlockText
    ]);

    // Create power-up button (positioned to the right side of the screen)
    const buttonX = width * 0.76; // 76% from the left (removed the +100px)
    const buttonY = height * 0.52 + 50; // 52% from the top + 50px down
    this.createPowerUpSwitch(buttonX, buttonY);
  }

  private createPowerUpSwitch(x: number, y: number) {
    // Create power-up button sprite with correct scale and depth
    this.powerUpButtonSprite = this.add.sprite(x, y, 'button-idle');
    this.powerUpButtonSprite.setScale(0.15); // Make it much smaller - 1/3 of original size
    this.powerUpButtonSprite.setDepth(10);
    
    // Add input event handlers
    this.powerUpButtonSprite.setInteractive();
    
    // Initialize power-up button bounds based on the sprite
    const buttonBounds = this.powerUpButtonSprite.getBounds();
    this.powerUpSwitchBounds = new Phaser.Geom.Rectangle(
      buttonBounds.x,
      buttonBounds.y,
      buttonBounds.width,
      buttonBounds.height
    );
    
    // Create text for countdown (positioned properly)
    this.powerUpCountdownText = this.add.text(x, y - 30, '', {
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(11);
    
    // Create "Order Editing Power Ready!" text (initially invisible)
    this.powerUpReadyText = this.add.text(x, y - 60, 'Order Editing Power Ready!', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#00ff00', // Bright green
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(11).setVisible(false);
    
    // Create warning text (initially invisible)
    this.powerUpWarningText = this.add.text(x, y - 80, '', {
      fontSize: '18px',
      color: '#ff0000',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setAlpha(0).setDepth(11);

    // Create power-up progress bar background
    this.powerUpProgressBackground = this.add.rectangle(x, y + 50, 60, 8, 0x333333);
    this.powerUpProgressBackground.setDepth(9);
    this.powerUpProgressBackground.setStrokeStyle(1, 0xffffff);

    // Create power-up progress bar fill
    this.powerUpProgressBar = this.add.rectangle(x - 30, y + 50, 0, 6, 0x00ff00);
    this.powerUpProgressBar.setDepth(10);
    this.powerUpProgressBar.setOrigin(0, 0.5);
    
    // Add button click handlers
    this.powerUpButtonSprite.on('pointerdown', this.handlePowerUpButtonClick, this);
  }
  private createConveyorArrows(width: number, centerX: number, centerY: number) {
    // Simply return without creating any arrows
    return;
  }
  private createStations() {
    const stationTypes = ['address', 'quantity', 'discount', 'product', 'invoice', 'cancel'];
    
    // Calculate total width for all stations
    const spacing = 200; // Increased space between stations
    const totalWidth = (stationTypes.length - 1) * spacing;
    
    // Calculate starting X position to center all stations
    const startX = (this.cameras.main.width - totalWidth) / 2;
    const y = this.cameras.main.height * 0.2 + 20; // Move stations down by 20px

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
      
      // Set locked stations to be completely invisible (alpha 0 and visible false)
      if (!station.isUnlocked) {
        station.container.setAlpha(0);
        station.container.setVisible(false);
        sign.setAlpha(0);
        sign.setVisible(false);
      } else {
        // Ensure the first station is explicitly visible
        station.container.setAlpha(1);
        station.container.setVisible(true);
        station.container.setActive(true);
        sign.setAlpha(1);
        sign.setVisible(true);
        sign.setActive(true);
        console.log(`First station (${type}) initialized as visible`);
      }
      
      // Store the sign in the station object for later reference
      station.sign = sign;

      this.stations.push(station);
    });
    
    // Final log to confirm all stations are created correctly
    console.log('Stations created:', this.stations.map(s => ({
      type: s.type,
      unlocked: s.isUnlocked,
      visible: s.container.visible,
      alpha: s.container.alpha
    })));
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
      case 'invoice': return 'Invoice PDF';
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
      
      // Skip input handling if inputs are disabled by leaderboard or other UI elements
      if (this.inputsDisabled) {
        // Still update non-input related things like order positions, etc.
        this.updateOrderPositions(delta);
        this.updateButtonFlashing(delta);
        this.updateCircularText(delta);
        if (this.powerUpActive) {
          this.updatePowerUp(delta);
        }
        return;
      }
      
      // Input handling only happens when inputs are not disabled
      
      // Ensure player speed is always correct
      if (this.playerSpeed !== 8) {
        console.log('[Level1Scene] Correcting player speed from', this.playerSpeed, 'to 8');
        this.playerSpeed = 8;
      }
      
      // First find out if we're near a station for interaction
      const nearStation = this.isNearStation();
      
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
      
      // Animate the conveyor belt texture to make it look like it's moving
      if (this.conveyorBelt && 'tilePositionX' in this.conveyorBelt) {
        // Scroll the texture horizontally to create a movement effect
        this.conveyorBelt.tilePositionX -= this.conveyorSpeed; // Adjust speed as needed
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
      
      // Keep player within bounds
      if (this.player.x < 30) this.player.x = 30;
      if (this.player.x > this.cameras.main.width - 30) this.player.x = this.cameras.main.width - 30;
      if (this.player.y < 30) this.player.y = 30;
      if (this.player.y > this.cameras.main.height - 30) this.player.y = this.cameras.main.height - 30;

      // Create precise player bounds for collision detection
      const playerBounds = new Phaser.Geom.Rectangle(
        this.player.x - 14,
        this.player.y - 14,
        28,
        28
      );

      // Check collisions with stations - REMOVED to allow walking over stations
      
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
      
      // Check if player is stepping on the button
      this.checkPlayerOnButton();
      
      // Handle button flashing when power-up is available
      this.updateButtonFlashing(delta);
      
      // Update circular text animation if it exists
      this.updateCircularText(delta);
      
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
      
      if (Phaser.Input.Keyboard.JustDown(this.lKey)) {
        console.log('L key pressed - Reduce to one life');
        this.reduceToOneLifeCheat();
      }
      
      // Check for 't' key to force tutorial start (cheat)
      if (Phaser.Input.Keyboard.JustDown(this.tKey)) {
        console.log('Cheat code activated: Force Tutorial Start!');
        this.forceTutorialStartCheat();
      }
      
      // Update tutorial if active
      this.updateTutorial();
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
    if (!this.player || !this.powerUpSwitchBounds || !this.powerUpButtonSprite) return false;
    
    // Get player bounds
    const playerBounds = this.player.getBounds();
    
    // Get button bounds, but create a smaller one focused on the center/bottom of the button
    // This makes it harder to trigger from the top and requires more precise positioning
    const rawButtonBounds = this.powerUpButtonSprite.getBounds();
    const buttonBounds = new Phaser.Geom.Rectangle(
      rawButtonBounds.x + rawButtonBounds.width * 0.2,  // 20% inset from left
      rawButtonBounds.y + rawButtonBounds.height * 0.4, // 40% down from top (lower half)
      rawButtonBounds.width * 0.6,                      // 60% of original width
      rawButtonBounds.height * 0.6                      // 60% of original height
    );
    
    // Create an ultra-precise collision area at the very bottom of the player's feet
    const playerFeetBounds = new Phaser.Geom.Rectangle(
      playerBounds.x + playerBounds.width * 0.45,
      playerBounds.y + playerBounds.height - 2,
      playerBounds.width * 0.1,
      2
    );
    
    // Check for collision with the adjusted button bounds
    return Phaser.Geom.Rectangle.Overlaps(playerFeetBounds, buttonBounds);
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
      // Check max frames based on direction (down has only 4 frames)
      const maxFrames = (this.lastDirection === 'down') ? 4 : 6;
      if (this.currentAnimationFrame > maxFrames) {
        this.currentAnimationFrame = 1;
      }
      
      // Get the current animation prefix (idle or walk)
      const prefix = this.lastMoving ? 'walk' : 'idle';
      
      // Set the texture based on the current frame
      const textureKey = `${prefix} ${this.lastDirection} ${this.currentAnimationFrame}`;
      
      
      if (this.textures.exists(textureKey)) {
        this.player.setTexture(textureKey);
        // console.log(`Manual animation: ${textureKey}`);
      } else {
                  // console.warn(`Texture not found: ${textureKey}, using fallback`);
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
    
    // Add station-specific animation when edit is grabbed
    this.animateStationOnPickup(station);
    
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
  
  // Add a new method for station animations
  private animateStationOnPickup(station: Station) {
    // Get the station container which contains all visual elements
    const container = station.container;
    
    // Find the station icon (it's the last element in the container)
    const components = container.list;
    const icon = components[components.length - 1];
    
    // Create unique animations based on station type
    switch (station.type) {
      case 'address':
        // House icon: subtle bounce + small rotation
        this.tweens.add({
          targets: icon,
          y: { from: 0, to: -15 },
          angle: { from: 0, to: -5 },
          duration: 300,
          ease: 'Sine.Out',
          yoyo: true,
          onComplete: () => {
            // Reset to original state
            icon.setPosition(0, 0);
            icon.setAngle(0);
          }
        });
        break;
        
      case 'quantity':
        // Numbers icon: scale effect
        this.tweens.add({
          targets: icon,
          scale: { from: icon.scale, to: icon.scale * 1.2 },
          duration: 300,
          ease: 'Back.Out',
          yoyo: true,
          onComplete: () => {
            // Reset to original scale (1.2 is the original scale from createStations)
            icon.setScale(1.2);
          }
        });
        break;
        
      case 'discount':
        // Tag icon: swing left-right
        this.tweens.add({
          targets: icon,
          x: { from: 0, to: 10 },
          angle: { from: 0, to: 15 },
          duration: 400,
          ease: 'Sine.InOut',
          yoyo: true,
          onComplete: () => {
            // Reset position and angle
            icon.setPosition(0, 0);
            icon.setAngle(0);
          }
        });
        break;
        
      case 'product':
        // Change symbol: smooth rotation
        this.tweens.add({
          targets: icon,
          angle: { from: 0, to: 180 },
          duration: 400,
          ease: 'Cubic.InOut',
          onComplete: () => {
            // Reset rotation
            icon.setAngle(0);
          }
        });
        break;
        
      case 'invoice':
        // Document icon: slide up and down
        this.tweens.add({
          targets: icon,
          y: { from: 0, to: -20 },
          duration: 250,
          ease: 'Power2.Out',
          yoyo: true,
          onComplete: () => {
            // Reset position
            icon.setPosition(0, 0);
          }
        });
        break;
        
      case 'cancel':
        // X icon: scale and fade slightly
        this.tweens.add({
          targets: icon,
          scale: { from: icon.scale, to: icon.scale * 0.8 },
          alpha: { from: 1, to: 0.7 },
          duration: 200,
          ease: 'Quad.Out',
          yoyo: true,
          onComplete: () => {
            // Reset scale and alpha (1.2 is the original scale from createStations)
            icon.setScale(1.2);
            icon.setAlpha(1);
          }
        });
        break;
    }
    
    // Small animation for the entire station table
    const originalY = container.y;
    this.tweens.add({
      targets: container,
      y: { from: originalY, to: originalY - 5 },
      duration: 150,
      ease: 'Sine.Out',
      yoyo: true,
      onComplete: () => {
        // Ensure the container is reset to its original position
        container.y = originalY;
      }
    });
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
      
      // Update power-up progress with each individual edit (not just completed orders)
      if (!this.powerUpActive && !this.powerUpAvailable) {
        this.updatePowerUpProgressFromEdit();
      }
      
      // Unlock the first song after 2 edits
      if (this.totalEditsApplied === 2) {
        console.log('Unlocking first song after 2 edits');
        import('../utils/stationTracker').then(({ stationTracker }) => {
          stationTracker.unlockStation('first_song');
        }).catch(err => {
          console.error('Failed to import stationTracker:', err);
        });
      }
      
      // Check if we should unlock a new station (every 5 edits)
      if (this.totalEditsApplied >= 5 && (this.totalEditsApplied - this.lastUnlockedAtEditCount) >= 5) {
        console.log('Unlocking next station');
        this.unlockNextStation();
      }
      
      // Increase score
      this.updateScore(10);
      
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
              // console.log(`Order requires: ${order.types.join(', ')}`);
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
    
    // Heart emoji dimensions and positioning
    const heartWidth = 24;
    const spacing = 6;
    
    // Position hearts from left side (disappear from right when lost)
    // Start from the left edge of the container with padding
    const startX = -42; // Left edge of wooden sign with padding (moved another 3px right)
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
      
      // Get the background elements (shadow, background, texture)
      const shadow = parent.getAt(0) as Phaser.GameObjects.Rectangle;
      const background = parent.getAt(1) as Phaser.GameObjects.Rectangle; 
      const texture = parent.getAt(2) as Phaser.GameObjects.Grid;
      
      // Update the sizes
      shadow.width = newWidth;
      background.width = newWidth;
      texture.width = newWidth;
      
      // Update nail positions
      const nail1 = parent.getAt(3) as Phaser.GameObjects.Arc;
      const nail2 = parent.getAt(4) as Phaser.GameObjects.Arc;
      const nail3 = parent.getAt(5) as Phaser.GameObjects.Arc;
      const nail4 = parent.getAt(6) as Phaser.GameObjects.Arc;
      
      // Position nails at corners
      const halfWidth = newWidth / 2;
      const halfHeight = 44 / 2;
      nail1.x = -halfWidth + 10;
      nail1.y = -halfHeight + 10;
      nail2.x = halfWidth - 10;
      nail2.y = -halfHeight + 10;
      nail3.x = -halfWidth + 10;
      nail3.y = halfHeight - 10;
      nail4.x = halfWidth - 10;
      nail4.y = halfHeight - 10;
    }
  }

  private gameOver() {
    console.log('Game over!');
    
    // Clean up any active timers
    this.orderGenerationTimer?.remove();
    
    // Stop music playback when game is over
    try {
      // Create and dispatch a custom event to stop music
      const stopMusicEvent = new CustomEvent('stopMusic', {
        detail: { source: 'gameOver' }
      });
      window.dispatchEvent(stopMusicEvent);
      console.log('Game over - music stop event dispatched');
    } catch (error) {
      console.error('Error stopping music on game over:', error);
    }
    
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
    this.powerUpProgress = 0;
    this.powerUpRequirement = 10; // Reset to initial requirement
    this.powerUpUsedCount = 0; // Reset usage count
    
    // Reset progress bar
    if (this.powerUpProgressBar) {
      this.updatePowerUpProgressBar();
    }
    
    // Hide the power-up ready text when game is reset
    if (this.powerUpReadyText) {
      this.powerUpReadyText.setVisible(false);
    }
    
    // Reset station unlocking
    this.lastUnlockedAtEditCount = 0;
    
    // Clean up all existing containers except the lives container
    // This is important for proper recreation of all game elements
    this.children.getAll().forEach(child => {
      // Keep the lives container
      if (child instanceof Phaser.GameObjects.Container && child !== this.livesContainer) {
        child.destroy();
      }
    });
    
    // Reset the station tracker in localStorage
    console.log('Resetting station tracker in localStorage');
    stationTracker.resetStations();
    
    // IMPORTANT: Clear the existing stations array to force complete recreation
    this.stations = [];
    
    // Recreate the stations from scratch - this simulates what happens on page refresh
    this.createStations();
    
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
      // Track total edits for song unlocking
      this.totalEditsCompleted++;
      console.log(`Manual order completed: ${this.manualOrdersCompleted}/10 needed for power-up, Total edits: ${this.totalEditsCompleted}`);
      
      // Remove redundant unlock code - this is now handled in applyEditToOrder
      
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
    
    // Power-up progress is now tracked per individual edit, not per completed order
    // This change was made to provide more granular feedback to the player
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
              onComplete: () => {
                heartEmoji.destroy();
                this.updateScore(5); // Flat 5 points for completing an order
              }
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

  private cleanupPowerUpSprites() {
    console.log('Cleaning up existing power-up sprites');
    
    // Clean up Hamish sprite
    if (this.hamishSprite) {
      this.hamishSprite.destroy();
      this.hamishSprite = null;
    }
    
    // Clean up Kiril sprite  
    if (this.kirilSprite) {
      this.kirilSprite.destroy();
      this.kirilSprite = null;
    }
    
    // Clean up OE Logo sprite
    if (this.oeLogoSprite) {
      this.oeLogoSprite.destroy();
      this.oeLogoSprite = null;
    }
  }

  private deactivatePowerUp() {
    console.log('Deactivating power-up');
    
    // Reset power-up state
    this.powerUpActive = false;
    this.setButtonTexture('button-idle');
    this.powerUpCountdownText.setText('');
    
    // Hide the power-up ready text when deactivated
    if (this.powerUpReadyText) {
      this.powerUpReadyText.setVisible(false);
    }
    
    // Increment power-up usage count
    this.powerUpUsedCount++;
    console.log(`Power-up ended. Used ${this.powerUpUsedCount}/${this.MAX_POWER_UPS} times`);
    
    // Check if max power-ups reached - if so, hide the button permanently
    if (this.powerUpUsedCount >= this.MAX_POWER_UPS) {
      console.log('Maximum power-ups reached! Hiding button permanently.');
      
      // Hide all power-up related UI elements
      if (this.powerUpButtonSprite) {
        this.powerUpButtonSprite.setVisible(false);
        this.powerUpButtonSprite.setActive(false);
      }
      if (this.powerUpProgressBackground) {
        this.powerUpProgressBackground.setVisible(false);
      }
      if (this.powerUpProgressBar) {
        this.powerUpProgressBar.setVisible(false);
      }
      if (this.powerUpCountdownText) {
        this.powerUpCountdownText.setVisible(false);
      }
      
      // Show a message that power-ups are exhausted
      const exhaustedMessage = this.add.text(
        this.cameras.main.width / 2,
        100,
        'Power-ups Exhausted!',
        {
          fontSize: '24px',
          color: '#ff0000',
          stroke: '#000000',
          strokeThickness: 3,
          fontStyle: 'bold'
        }
      ).setOrigin(0.5).setDepth(100);
      
      // Fade out the message after 3 seconds
      this.tweens.add({
        targets: exhaustedMessage,
        alpha: 0,
        y: exhaustedMessage.y - 50,
        duration: 3000,
        onComplete: () => exhaustedMessage.destroy()
      });
      
      // Reset progress to prevent further accumulation
      this.powerUpProgress = 0;
      this.powerUpAvailable = false;
      
    } else {
      // Still have power-ups left - implement exponential difficulty
      const exponentialRequirement = Math.floor(10 * Math.pow(2, this.powerUpUsedCount));
      this.powerUpRequirement = Math.min(exponentialRequirement, 80); // Cap at 80 edits max
      this.powerUpProgress = 0; // Reset progress to 0 - no banking allowed
      
      // Update progress bar to show empty
      this.updatePowerUpProgressBar();
      
      console.log(`Next power-up requirement: ${this.powerUpRequirement} orders`);
    }
    
    // Reset the manual orders counter after power-up ends - this prevents banking
    this.manualOrdersCompleted = 0;
    
            // console.log('Debug sprite state before animations:');
        // console.log(`Hamish exists: ${!!this.hamishSprite}, active: ${this.hamishSprite?.active}`);
        // console.log(`Kiril exists: ${!!this.kirilSprite}, active: ${this.kirilSprite?.active}`);
        // console.log(`OE Logo exists: ${!!this.oeLogoSprite}, active: ${this.oeLogoSprite?.active}`);
    
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
      // Clean up any existing sprites first to prevent banking/duplicates
      this.cleanupPowerUpSprites();
      
      // Set button state
      this.powerUpActive = true;
      this.powerUpAvailable = false;
      this.powerUpTimer = this.powerUpDuration; // 30 seconds of power-up time
      
      // Visual feedback
      this.setButtonColor(0x0000ff); // Blue for active
      
      // Show countdown
      this.powerUpCountdownText.setText('30s');
      
      // REMOVED: Sprite creation moved to activatePowerUp() to prevent duplicates
      // This method is now legacy and should redirect to the main activation method
      
      // Play activation sound
      if (this.sound && this.sound.add) {
        try {
          const activateSound = this.sound.add('powerup', { volume: 0.7 });
          activateSound.play();
        } catch (error) {
          console.error('Could not play power-up sound:', error);
        }
      }
      
      // Animate the lever being pulled (if it exists)
      if (this.powerUpLever) {
        this.tweens.add({
          targets: this.powerUpLever,
          y: 10, // Move lever down
          angle: 45, // Rotate lever
          duration: 300,
          ease: 'Bounce.Out'
        });
      }
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
              // console.log(`Logo current position: ${this.oeLogoSprite.x}, ${this.oeLogoSprite.y}`);
      
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
      baseOffsetY = 35; // Much lower position (was 20) to be closer to hands
    } else if (this.lastDirection === 'right') {
      baseOffsetX = 20;
      baseOffsetY = 35; // Much lower position (was 20) to be closer to hands
    } else if (this.lastDirection === 'up') {
      baseOffsetX = 0;
      baseOffsetY = -20; // Keep the same position for up direction
    } else if (this.lastDirection === 'down') {
      baseOffsetX = 0;
      baseOffsetY = 40; // Keep the current position for down direction
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
    
    // Get button bounds, but create a smaller one focused on the center/bottom of the button
    // This makes it harder to trigger from the top and requires more precise positioning
    const rawButtonBounds = this.powerUpButtonSprite.getBounds();
    const buttonBounds = new Phaser.Geom.Rectangle(
      rawButtonBounds.x + rawButtonBounds.width * 0.2,  // 20% inset from left
      rawButtonBounds.y + rawButtonBounds.height * 0.4, // 40% down from top (lower half)
      rawButtonBounds.width * 0.6,                      // 60% of original width
      rawButtonBounds.height * 0.6                      // 60% of original height
    );
    
    // Create an ultra-precise collision area at the very bottom of the player's feet
    const playerFeetBounds = new Phaser.Geom.Rectangle(
      playerBounds.x + playerBounds.width * 0.45,
      playerBounds.y + playerBounds.height - 2,
      playerBounds.width * 0.1,
      2
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

  private updatePowerUpProgressFromEdit() {
    // Don't accumulate progress if max power-ups already used
    if (this.powerUpUsedCount >= this.MAX_POWER_UPS) {
      console.log(`🔧 EDIT APPLIED - Max power-ups (${this.MAX_POWER_UPS}) already used, no progress accumulated`);
      return;
    }
    
    this.powerUpProgress++;
    console.log(`🔧 EDIT APPLIED - Power-up progress: ${this.powerUpProgress}/${this.powerUpRequirement} (from individual edit)`);
    console.log(`🔧 Power-up states - Active: ${this.powerUpActive}, Available: ${this.powerUpAvailable}`);
    
    // Update progress bar with smooth animation
    this.updatePowerUpProgressBar();
    
    // Check if power-up should become available
    if (this.powerUpProgress >= this.powerUpRequirement) {
      console.log(`🔧 POWER-UP READY! Progress reached requirement.`);
      this.makePowerUpAvailable();
    }
  }

  private updatePowerUpProgress() {
    // This method is now deprecated - use updatePowerUpProgressFromEdit instead
    this.updatePowerUpProgressFromEdit();
  }

  private updatePowerUpProgressBar() {
    console.log(`📊 PROGRESS BAR UPDATE - Progress: ${this.powerUpProgress}/${this.powerUpRequirement}`);
    console.log(`📊 Progress bar exists: ${!!this.powerUpProgressBar}`);
    
    if (!this.powerUpProgressBar) {
      console.error(`❌ Progress bar not found! Cannot update.`);
      return;
    }
    
    const progressPercentage = Math.min(1, this.powerUpProgress / this.powerUpRequirement);
    const maxWidth = 60;
    const newWidth = progressPercentage * maxWidth;
    
    console.log(`📊 Percentage: ${Math.round(progressPercentage * 100)}%, Width: ${newWidth}/${maxWidth}`);
    console.log(`📊 Current bar width: ${this.powerUpProgressBar.width}`);
    
    // Animate the progress bar fill
    this.tweens.add({
      targets: this.powerUpProgressBar,
      width: newWidth,
      duration: 300,
      ease: 'Power2.out',
      onStart: () => {
        console.log(`📊 Progress bar animation started - target width: ${newWidth}`);
      },
      onUpdate: () => {
        // Keep the progress bar green throughout
        this.powerUpProgressBar.setFillStyle(0x00ff00); // Always green
      },
      onComplete: () => {
        console.log(`📊 Progress bar animation completed - final width: ${this.powerUpProgressBar.width}`);
      }
    });
  }

  private makePowerUpAvailable() {
    // Don't make power-up available if max usage reached
    if (this.powerUpUsedCount >= this.MAX_POWER_UPS) {
      console.log(`Power-up not made available - max usage (${this.MAX_POWER_UPS}) reached`);
      return;
    }
    
    // Make power-up available to player
    this.powerUpAvailable = true;
    
    // Reset animation state for flashing
    this.buttonFlashTimer = 0;
    this.buttonFlashState = false;
    this.setButtonTexture('button-idle');
    
    console.log(`Power-up is now available! (Used ${this.powerUpUsedCount} times before)`);
    
    // Create the circular text around the button (replacing the standard text)
    if (this.powerUpReadyText) {
      this.powerUpReadyText.setVisible(false); // Hide the regular text
    }
    
    // If we already have a circular text, destroy it first
    if (this.powerUpCircularText) {
      this.powerUpCircularText.destroy();
    }
    
    // Create new circular text
    if (this.powerUpButtonSprite) {
      this.powerUpCircularText = this.createCircularText(
        'Order Editing Power',
        this.powerUpButtonSprite.x,
        this.powerUpButtonSprite.y,
        70 // Radius around the button
      );
    }
    
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
    // Clean up any existing sprites first to prevent duplicates
    this.cleanupPowerUpSprites();
    
    // Set power-up to active
    this.powerUpActive = true;
    this.powerUpAvailable = false;
    this.powerUpTimer = 30000; // Extend power-up duration to 30 seconds (30000ms)
    this.powerUpFlashTimer = 0;
    
    // Hide the "POWER UP READY" text when activated
    if (this.powerUpReadyText) {
      this.powerUpReadyText.setVisible(false);
    }
    
    // Hide the circular text
    if (this.powerUpCircularText) {
      this.powerUpCircularText.destroy();
      this.powerUpCircularText = null;
    }
    
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
    
    // Show Hamish and Kiril images - ONLY CREATE ONCE
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
            
            // Update power-up progress with each auto-completed edit
            if (!this.powerUpAvailable) {
              this.updatePowerUpProgressFromEdit();
            }
            
            // Award 10 points for each auto-completed edit
            this.updateScore(10);
          }
          
          // Complete the order
          this.completeOrder(order);
        }
      }
    }
  }

  private generateOrder = () => {
    try {
              // console.log('Generating new order');
      
      // Count how many stations are unlocked
      const unlockedStations = this.stations.filter(station => station.isUnlocked);
              // console.log(`Unlocked stations: ${unlockedStations.map(s => s.type).join(', ')}`);
      
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
                  // console.log('Order in spawn area, delaying generation');
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
        // With 3 stations: NO MORE 1-edit orders, 60% for 2 edits, 40% for 3 edits
        editProbabilities = [0.0, 0.6, 0.4];
      } else if (unlockedStations.length === 4) {
        // With 4 stations: NO MORE 1-2 edit orders, 50% for 3 edits, 50% for 4 edits
        editProbabilities = [0.0, 0.0, 0.5, 0.5];
      } else {
        // With 5 stations: NO MORE 1-2 edit orders, 40% for 3 edits, 35% for 4 edits, 25% for 5 edits
        editProbabilities = [0.0, 0.0, 0.4, 0.35, 0.25];
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
      
              // console.log(`Available unique station types: ${uniqueStationTypes.join(', ')}`);
      
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
              // console.log(`Shuffled station types: ${shuffledTypes.join(', ')}`);
      
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
      
              // console.log(`Creating order with ${numEdits} edits: ${selectedTypes.join(', ')}`);
      
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
                  // console.log(`Using icon '${iconText}' for type '${type}'`);
        
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
              const positionInRow = index - itemsInTopRow;
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
          
          // Award 10 points for each auto-completed edit
          this.updateScore(10);
        }
        
        // Complete the order
        this.completeOrder(order);
      }
      
              // console.log(`Order created: ${order.id}`);
        // console.log(`Order requires edits: ${order.types.join(', ')}`);
        // console.log(`Order icon types: ${order.types.map(type => `${type}: ${this.getStationIcon(type)}`).join(', ')}`);
    } catch (error) {
      console.error('Error generating order:', error);
    }
  }

  // Power-up methods

  private unlockNextStation() {
    // Check how many stations are currently unlocked
    const unlockedCount = this.stations.filter(station => station.isUnlocked).length;
            // console.log(`Currently have ${unlockedCount} unlocked stations`);
    
    // Find the next station to unlock
    const nextStation = this.stations.find(station => !station.isUnlocked);
    
    if (!nextStation) {
      console.log('All stations already unlocked!');
      return;
    }
    
    console.log(`Unlocking station: ${nextStation.type}`);
    
    // Unlock the station
    nextStation.isUnlocked = true;
    
    // Ensure the station is visible immediately - critical fix for restart issues
    nextStation.container.setAlpha(1);
    nextStation.container.setVisible(true);
    nextStation.sign.setAlpha(1);
    nextStation.sign.setVisible(true);
    
    // Force immediate display update
    this.verifyStationVisibility();
    
    // EXPONENTIAL DIFFICULTY: Increase conveyor belt speed with each station unlock
    const unlockedStationsCount = this.stations.filter(station => station.isUnlocked).length;
    const newSpeed = this.BASE_CONVEYOR_SPEED * Math.pow(this.SPEED_MULTIPLIER_PER_STATION, unlockedStationsCount - 1);
    this.conveyorSpeed = Math.min(newSpeed, this.maxConveyorSpeed); // Cap at max speed
    
    console.log(`Station ${unlockedCount + 1} unlocked! Conveyor speed increased to: ${this.conveyorSpeed.toFixed(2)} (${unlockedStationsCount} stations total)`);
    
    // Update the station tracker to unlock the corresponding music track
    // Add logs and error handling
    try {
      console.log(`Calling stationTracker.unlockStation with type: ${nextStation.type}`);
      
      // First unlock attempt
      stationTracker.unlockStation(nextStation.type);
      
      // Update localStorage directly as a backup
      try {
        const stationsJSON = localStorage.getItem('oe-game-unlocked-stations');
        if (stationsJSON) {
          const stations = JSON.parse(stationsJSON);
          stations[nextStation.type] = true;
          localStorage.setItem('oe-game-unlocked-stations', JSON.stringify(stations));
          console.log(`Direct localStorage update for ${nextStation.type}`);
        }
      } catch (e) {
        console.error('Error updating localStorage directly:', e);
      }
      
      // Trigger again after a short delay
      setTimeout(() => {
        console.log(`Re-triggering unlock for ${nextStation.type}`);
        stationTracker.unlockStation(nextStation.type);
      }, 100);
      
    } catch (error) {
      console.error(`Error updating station tracker for ${nextStation.type}:`, error);
    }
    
    // Debug station status
    this.debugStationStatus();
    
    // Make sure the station is visible and animate it
    if (nextStation.container) {
      // Start with already visible but small scale
      nextStation.container.setAlpha(1);
      nextStation.container.setVisible(true);
      nextStation.container.setScale(0.7);
      
      // Flash the station to draw attention to it
      this.tweens.add({
        targets: nextStation.container,
        scale: { from: 0.7, to: 1 },
        ease: 'Back.Out',
        duration: 600,
        yoyo: false,
        onComplete: () => {
          // Ensure it stays visible after the animation
          nextStation.container.setAlpha(1);
          nextStation.container.setVisible(true);
          console.log(`Animation complete for station: ${nextStation.type}, alpha: ${nextStation.container.alpha}, visible: ${nextStation.container.visible}`);
        }
      });
      
      // Animate the sign with a slight delay for a more dramatic reveal
      nextStation.sign.setAlpha(1);
      nextStation.sign.setVisible(true);
      nextStation.sign.setScale(0.8);
      
      this.time.delayedCall(300, () => {
        this.tweens.add({
          targets: nextStation.sign,
          scale: { from: 0.8, to: 1 },
          ease: 'Back.Out',
          duration: 800,
          onComplete: () => {
            // Ensure sign stays visible
            nextStation.sign.setAlpha(1);
            nextStation.sign.setVisible(true);
          }
        });
      });
      
      // Display an announcement with the container instead of just text
      const stationName = this.getStationName(nextStation.type);
      const stationIcon = this.getStationIcon(nextStation.type);
      
      // Set text with more compact spacing so icons stay inside the board
      this.stationUnlockText.setText(`${stationIcon} New Station: "${stationName}" ${stationIcon}`);
      
      // Make notification visible
      this.stationUnlockContainer.setVisible(true);
      
      // Fade out the announcement after 5 seconds (extended time for screenshots)
      this.time.delayedCall(5000, () => {
        this.tweens.add({
          targets: this.stationUnlockContainer,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            this.stationUnlockContainer.setVisible(false);
            this.stationUnlockContainer.setAlpha(1);
          }
        });
      });
    }
    
    // Reset the counter
    this.lastUnlockedAtEditCount = this.totalEditsApplied;
    
    // Verify all station visibility one more time after everything
    this.time.delayedCall(1000, () => {
      this.verifyStationVisibility();
    });
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
    // Check if max power-ups already used
    if (this.powerUpUsedCount >= this.MAX_POWER_UPS) {
      this.showPowerUpWarning('No power-ups remaining!');
      return;
    }
    
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
    const nearStation = this.isNearStation();
    
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

    // Check collisions with stations - REMOVED to allow walking over stations
    
    // Update tracking of last direction and movement state
    if (direction !== this.lastDirection || (this.lastMoving !== isMoving)) {
      this.lastDirection = direction;
      this.lastMoving = isMoving;
    }
  }

  private verifyStationVisibility() {
    console.log('Verifying station visibility...');
    
    this.stations.forEach(station => {
      if (station.isUnlocked) {
        console.log(`Station ${station.type} should be visible. Current state:`, {
          container: station.container ? {
            alpha: station.container.alpha,
            visible: station.container.visible,
            active: station.container.active
          } : 'null',
          sign: station.sign ? {
            alpha: station.sign.alpha,
            visible: station.sign.visible,
            active: station.sign.active
          } : 'null'
        });
        
        // Ensure both container and sign exist
        if (station.container && station.sign) {
          // Check if the station should be visible but isn't fully visible
          const containerNeedsVisibilityFix = 
            station.container.alpha < 1 || 
            !station.container.visible || 
            !station.container.active;
            
          const signNeedsVisibilityFix = 
            station.sign.alpha < 1 || 
            !station.sign.visible || 
            !station.sign.active;
          
          if (containerNeedsVisibilityFix) {
            console.log(`Fixing container visibility for unlocked station: ${station.type}`);
            station.container.setAlpha(1);
            station.container.setVisible(true);
            station.container.setActive(true);
          }
          
          if (signNeedsVisibilityFix) {
            console.log(`Fixing sign visibility for unlocked station: ${station.type}`);
            station.sign.setAlpha(1);
            station.sign.setVisible(true);
            station.sign.setActive(true);
          }
        } else {
          console.error(`Station ${station.type} has missing container or sign!`);
        }
      } else {
        // For locked stations, ensure they're hidden
        if (station.container) {
          station.container.setAlpha(0);
          station.container.setVisible(false);
        }
        if (station.sign) {
          station.sign.setAlpha(0);
          station.sign.setVisible(false);
        }
      }
    });
    
    // Final verification log
    const visibilityStatus = this.stations.map(s => ({
      type: s.type, 
      unlocked: s.isUnlocked,
      visible: s.container?.visible && s.sign?.visible,
      alpha: s.container?.alpha
    }));
    console.log('Station visibility verification complete:', visibilityStatus);
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
    const signContainer = this.add.container(x, y - 85); // Position remains relative to the station
    
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
      
      // Make station visible if it wasn't before - apply same robust visibility fixes
      if (station.container) {
        // Set both alpha and visible properties
        station.container.setAlpha(1);
        station.container.setVisible(true);
        station.sign.setAlpha(1);
        station.sign.setVisible(true);
      }
    });
    
    // Update the count of when stations were last unlocked
    this.lastUnlockedAtEditCount = this.totalEditsApplied;
    
    // Show notification with the container with compact spacing
    this.stationUnlockText.setText(`🔓 All Stations Unlocked! 🔓`);
    
    // Make notification visible
    this.stationUnlockContainer.setVisible(true);
    
    // Fade out the notification after 5 seconds
    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: this.stationUnlockContainer,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.stationUnlockContainer.setVisible(false);
          this.stationUnlockContainer.setAlpha(1);
        }
      });
    });
    
    // Verify that all stations are visible immediately
    this.verifyStationVisibility();
    
    // And check again after a delay to be absolutely sure
    this.time.delayedCall(1000, () => {
      this.verifyStationVisibility();
    });
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

  private updateScore(points: number): void {
    // Update score, ensuring it never goes below 0
    this.score = Math.max(0, this.score + points);
    this.scoreText.setText(`Score: ${this.score}`);
  }

  // Debug utility to print station unlock status
  private debugStationStatus() {
    console.log('==== Station Unlock Status ====');
    this.stations.forEach(station => {
      console.log(`${station.type}: ${station.isUnlocked ? 'UNLOCKED' : 'LOCKED'}`);
    });
    console.log('============================');
    
    // Also log the tracker status
    console.log('==== Station Tracker Status ====');
    stationTracker.logUnlockedStations();
    console.log('============================');
  }

  // Special debug function to manually update tracker based on current game state
  private syncTrackerWithGameState() {
    console.log('Syncing tracker with game state...');
    this.stations.forEach(station => {
      if (station.isUnlocked) {
        stationTracker.unlockStation(station.type);
      }
    });
    console.log('Sync complete.');
  }

  private createCircularText(text: string, centerX: number, centerY: number, radius: number): Phaser.GameObjects.Container {
    // Create main container
    const container = this.add.container(centerX, centerY);
    container.setDepth(11);
    
    // Use shorter text
    const displayText = 'Order Editing Power';
    const characters = displayText.split('');
    
    // Calculate angle step - distribute only around 80% of the circle to create a gap
    const angleStep = (Math.PI * 1.6) / characters.length;
    // Start from the top, but offset to center the text arc
    const startAngle = -Math.PI/2 - (angleStep * characters.length / 2) + (Math.PI * 0.2);
    
    characters.forEach((char, index) => {
      const angle = startAngle + (index * angleStep);
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      const charText = this.add.text(x, y, char, {
        fontSize: '22px', // Slightly larger
        fontStyle: 'bold',
        color: '#00ff00',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);
      
      // Add glow effect with shadow
      charText.setShadow(0, 0, '#00ff00', 8, true, true);
      
      // Rotate each character to align with the curve
      charText.setRotation(angle + Math.PI/2);
      container.add(charText);
    });
    
    return container;
  }

  private updateCircularText(delta: number) {
    if (this.powerUpCircularText) {
      // Use a consistent, smooth rotation speed that's frame-rate independent
      // Slower rotation for a more elegant effect (0.0002 instead of 0.0005)
      this.circularTextAngle += 0.0002 * delta;
      
      // Get all text objects in the container
      const textObjects = this.powerUpCircularText.getAll();
      const displayText = 'Order Editing Power';
      const characters = displayText.length;
      
      // Calculate angle step with the gap - to match creation logic
      const angleStep = (Math.PI * 1.6) / characters;
      const startAngle = -Math.PI/2 - (angleStep * characters / 2) + (Math.PI * 0.2);
      
      const radius = 70; // Same radius used when creating
      
      // Update each character's position with smoother interpolation
      textObjects.forEach((obj, index) => {
        const text = obj as Phaser.GameObjects.Text;
        const angle = this.circularTextAngle + startAngle + (index * angleStep);
        
        // Use Math.round to prevent subpixel positioning (reduces flickering)
        const x = Math.round(radius * Math.cos(angle) * 10) / 10;
        const y = Math.round(radius * Math.sin(angle) * 10) / 10;
        
        text.setPosition(x, y);
        text.setRotation(angle + Math.PI/2);
        
        // Pulse the glow slightly based on position
        const glowIntensity = (Math.sin(this.circularTextAngle * 2 + index * 0.2) + 1) * 4 + 5; // Range 5-13
        text.setShadowBlur(glowIntensity);
      });
    }
  }

  // Cheat to reduce lives to one
  private reduceToOneLifeCheat() {
    // Only reduce lives if we have more than one
    if (this.lives > 1) {
      console.log(`Reducing lives from ${this.lives} to 1`);
      this.lives = 1;
      this.updateLivesDisplay();
      
      // Display a notification
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      const notificationText = this.add.text(
        width / 2,
        height / 2 - 50,
        '⚠️ One life left! ⚠️',
        {
          fontSize: '32px',
          color: '#FF0000',
          stroke: '#000000',
          strokeThickness: 4,
          fontStyle: 'bold'
        }
      ).setOrigin(0.5).setDepth(100);
      
      // Make it fade out
      this.tweens.add({
        targets: notificationText,
        alpha: { from: 1, to: 0 },
        duration: 2000,
        ease: 'Power2',
        onComplete: () => {
          notificationText.destroy();
        }
      });
    } else if (this.lives === 1) {
      // If already at one life, pressing L again will trigger an immediate game over
      console.log('Debug: Triggering immediate game over');
      
      // Display brief notification
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      const notificationText = this.add.text(
        width / 2,
        height / 2 - 50,
        '⚠️ Game Over! ⚠️',
        {
          fontSize: '32px',
          color: '#FF0000',
          stroke: '#000000',
          strokeThickness: 4,
          fontStyle: 'bold'
        }
      ).setOrigin(0.5).setDepth(100);
      
      // Reduce lives to zero and trigger game over after brief delay for notification
      this.time.delayedCall(800, () => {
        this.lives = 0;
        this.updateLivesDisplay();
        this.gameOver();
        notificationText.destroy();
      });
    } else {
      console.log('Already at zero lives');
    }
  }
  
  // Cheat to force tutorial start (even if already completed)
  private forceTutorialStartCheat() {
    console.log('Cheat: Forcing tutorial start');
    
    // Stop any existing tutorial first
    if (this.tutorialActive) {
      this.completeTutorial();
    }
    
    // Reset tutorial state
    this.tutorialActive = false;
    this.tutorialStep = 0;
    this.hasTutorialOrder = false;
    this.tutorialTargetOrder = undefined;
    
    // Show cheat activation message
    const cheatMessage = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 100,
      'CHEAT: Tutorial Starting!',
      {
        fontSize: '24px',
        color: '#00ff00',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5).setDepth(1000);
    
    // Start tutorial after a short delay to allow message to be seen
    this.time.delayedCall(1500, () => {
      // Set up skip tutorial key (in case it wasn't initialized)
      if (!this.skipTutorialKey) {
        this.skipTutorialKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      }
      
      this.startTutorial();
      cheatMessage.destroy();
    });
  }
  
  // Tutorial System Methods
  private initializeTutorial() {
    console.log('Initializing tutorial. Is restart:', this.isRestart);
    
    // If this is a restart (continuing from game over), never show tutorial
    if (this.isRestart) {
      console.log('This is a restart - skipping tutorial');
      return;
    }
    
    // Check if user is logged in and has tutorial completion in Firebase
    const checkFirebaseTutorial = () => {
      // Access Firebase user data through window global (set by App component)
      const userData = (window as any).firebaseUserData;
      if (userData && userData.tutorialCompleted) {
        console.log('Player has completed tutorial (Firebase), skipping...');
        return true;
      }
      return false;
    };
    
    const firebaseTutorialCompleted = checkFirebaseTutorial();
    
    // For logged-in users, respect Firebase completion status
    if (firebaseTutorialCompleted) {
      console.log('Logged-in user has completed tutorial, skipping...');
      return;
    }
    
    // For non-logged-in users, check localStorage (but only if not first time ever)
    const localTutorialCompleted = localStorage.getItem('oe-game-tutorial-completed') === 'true';
    const userData = (window as any).firebaseUserData;
    const isLoggedIn = userData && (window as any).firebaseUser;
    
    // If not logged in and has completed locally, skip
    if (!isLoggedIn && localTutorialCompleted) {
      console.log('Non-logged-in user has completed tutorial locally, skipping...');
      return;
    }
    
    // Start tutorial for new players (either new non-logged-in users or logged-in users who haven't completed it)
    console.log('Starting tutorial for new player');
    
    // Set up skip tutorial key
    this.skipTutorialKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    
    // Start tutorial after a brief delay
    this.time.delayedCall(1000, () => {
      this.startTutorial();
    });
  }
  
  private startTutorial() {
    console.log('Starting tutorial...');
    this.tutorialActive = true;
    this.tutorialStep = 0;
    
    // Create minimal tutorial overlay (no full screen cover)
    this.tutorialOverlay = this.add.container(0, 0);
    this.tutorialOverlay.setDepth(1000);
    
    // Create retro-style tutorial text box (much smaller, bottom only)
    const textBoxWidth = 600;
    const textBoxHeight = 80;
    const textBoxX = this.cameras.main.centerX;
    const textBoxY = this.cameras.main.height - 60;
    
    // Pixelated wooden sign style background (like station signs)
    const textShadow = this.add.rectangle(textBoxX + 3, textBoxY + 3, textBoxWidth, textBoxHeight, 0x000000, 0.6);
    const textBg = this.add.rectangle(textBoxX, textBoxY, textBoxWidth, textBoxHeight, 0xC19A6B)
      .setStrokeStyle(4, 0x8B4513);
    
    // Add pixelated border details
    const borderTop = this.add.rectangle(textBoxX, textBoxY - textBoxHeight/2, textBoxWidth, 4, 0x6B4C3B);
    const borderBottom = this.add.rectangle(textBoxX, textBoxY + textBoxHeight/2, textBoxWidth, 4, 0x6B4C3B);
    const borderLeft = this.add.rectangle(textBoxX - textBoxWidth/2, textBoxY, 4, textBoxHeight, 0x6B4C3B);
    const borderRight = this.add.rectangle(textBoxX + textBoxWidth/2, textBoxY, 4, textBoxHeight, 0x6B4C3B);
    
    // Corner nails for retro look
    const nailSize = 3;
    const nail1 = this.add.circle(textBoxX - textBoxWidth/2 + 15, textBoxY - textBoxHeight/2 + 15, nailSize, 0x808080);
    const nail2 = this.add.circle(textBoxX + textBoxWidth/2 - 15, textBoxY - textBoxHeight/2 + 15, nailSize, 0x808080);
    const nail3 = this.add.circle(textBoxX - textBoxWidth/2 + 15, textBoxY + textBoxHeight/2 - 15, nailSize, 0x808080);
    const nail4 = this.add.circle(textBoxX + textBoxWidth/2 - 15, textBoxY + textBoxHeight/2 - 15, nailSize, 0x808080);
    
    // Create tutorial text with retro font styling
    this.tutorialText = this.add.text(
      textBoxX,
      textBoxY,
      '',
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#000000',
        align: 'center',
        fontStyle: 'bold',
        wordWrap: { width: textBoxWidth - 40 }
      }
    ).setOrigin(0.5);
    
    this.tutorialOverlay.add([
      textShadow, textBg, borderTop, borderBottom, borderLeft, borderRight,
      nail1, nail2, nail3, nail4, this.tutorialText
    ]);
    
    // Start first tutorial step
    this.showTutorialStep();
  }
  
  private showTutorialStep() {
    // Clear previous highlights and arrows
    if (this.tutorialArrow) {
      this.tutorialArrow.destroy();
      this.tutorialArrow = undefined;
    }
    if (this.tutorialHighlight) {
      this.tutorialHighlight.destroy();
      this.tutorialHighlight = undefined;
    }
    
    switch (this.tutorialStep) {
      case 0:
        this.tutorialText.setText(
          'Welcome to Order Editing! Use ARROW KEYS to move around. (ESC to skip)'
        );
        break;
        
      case 1:
        this.tutorialText.setText(
          'Great! Walk near the ADDRESS station and press SPACE to pick up an edit.'
        );
        this.highlightStation('address');
        break;
        
      case 2:
        this.tutorialText.setText(
          'Excellent! Now find an order that needs ADDRESS edit and press SPACE to apply it!'
        );
        this.highlightFirstOrder();
        break;
        
      case 3:
        this.tutorialText.setText(
          'Perfect! Keep picking up edits and applying them to orders. Press SPACE to finish.'
        );
        break;
        
      case 4:
        this.completeTutorial();
        break;
    }
  }
  
  private highlightStation(stationType: string) {
    const station = this.stations.find(s => s.type === stationType && s.isUnlocked);
    if (!station) return;
    
    // Create subtle pixelated highlight around the station
    this.tutorialHighlight = this.add.graphics();
    this.tutorialHighlight.setDepth(999);
    
    const bounds = station.container.getBounds();
    // Use pixelated style highlight with retro colors
    this.tutorialHighlight.lineStyle(3, 0xFFFF00, 0.8); // Yellow like retro games
    this.tutorialHighlight.strokeRect(
      bounds.x - 8, 
      bounds.y - 8, 
      bounds.width + 16, 
      bounds.height + 16
    );
    
    // Add subtle pulsing animation
    this.tweens.add({
      targets: this.tutorialHighlight,
      alpha: { from: 0.8, to: 0.4 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });
    
    // Create retro arrow pointing to station
    this.createArrowToTarget(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  }
  
  private highlightFirstOrder() {
    if (this.orders.length === 0) return;
    
    const order = this.orders[0];
    this.tutorialTargetOrder = order; // Track this order for position updates
    
    // Create subtle pixelated highlight around the order
    this.tutorialHighlight = this.add.graphics();
    this.tutorialHighlight.setDepth(999);
    
    this.updateOrderHighlightPosition(); // Initial position
    
    // Add subtle pulsing animation
    this.tweens.add({
      targets: this.tutorialHighlight,
      alpha: { from: 0.8, to: 0.4 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });
    
    // Create retro arrow pointing to order
    this.createArrowToTarget(order.x, order.y);
  }
  
  private updateOrderHighlightPosition() {
    if (!this.tutorialHighlight || !this.tutorialTargetOrder) return;
    
    const order = this.tutorialTargetOrder;
    
    // Clear and redraw the highlight at the new position
    this.tutorialHighlight.clear();
    this.tutorialHighlight.lineStyle(3, 0xFF8800, 0.8);
    this.tutorialHighlight.strokeRect(
      order.x - order.width/2 - 8, 
      order.y - order.height/2 - 8, 
      order.width + 16, 
      order.height + 16
    );
  }
  
  private createArrowToTarget(targetX: number, targetY: number) {
    this.tutorialArrow = this.add.graphics();
    this.tutorialArrow.setDepth(1001);
    
    // Calculate arrow position (just above the target, much closer)
    const arrowX = targetX;
    const arrowY = targetY - 35;
    
    // Draw smaller, more subtle pixelated arrow pointing down
    this.tutorialArrow.fillStyle(0xFFFF00);
    this.tutorialArrow.fillRect(arrowX - 1, arrowY, 2, 12); // Thinner arrow shaft
    this.tutorialArrow.fillRect(arrowX - 5, arrowY + 8, 10, 2); // Smaller arrow head horizontal
    this.tutorialArrow.fillRect(arrowX - 3, arrowY + 10, 6, 2); // Smaller arrow head middle
    this.tutorialArrow.fillRect(arrowX - 1, arrowY + 12, 2, 2);  // Smaller arrow head tip
    
    // Very subtle bouncing animation (much smaller bounce)
    this.tweens.add({
      targets: this.tutorialArrow,
      y: arrowY + 2,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }
  
  private updateTutorial() {
    if (!this.tutorialActive) return;
    
    // Update moving elements (highlight and arrow) if we're in step 2
    if (this.tutorialStep === 2) {
      // Update highlight position to follow the order
      this.updateOrderHighlightPosition();
      
      // Update arrow position to follow the order
      if (this.tutorialArrow && this.tutorialTargetOrder) {
        const targetX = this.tutorialTargetOrder.x;
        const targetY = this.tutorialTargetOrder.y - 35;
        
        // Update arrow position smoothly
        this.tutorialArrow.x = targetX;
        this.tutorialArrow.y = targetY;
      }
    }
    
    // Check for skip tutorial
    if (Phaser.Input.Keyboard.JustDown(this.skipTutorialKey)) {
      this.completeTutorial();
      return;
    }
    
    // Check tutorial progress
    switch (this.tutorialStep) {
      case 0:
        // Check if player has moved
        if (this.lastDirection !== 'down' || this.lastMoving) {
          this.tutorialStep++;
          this.showTutorialStep();
        }
        break;
        
      case 1:
        // Check if player picked up an edit
        if (this.carriedEdits.length > 0) {
          this.tutorialStep++;
          this.showTutorialStep();
        }
        break;
        
      case 2:
        // Check if player applied an edit
        if (this.totalEditsApplied > 0) {
          this.tutorialStep++;
          this.showTutorialStep();
        }
        break;
        
      case 3:
        // Wait for space key to finish (check for just pressed, not just down)
        if (this.spaceKey.isDown && !this.lastSpaceState) {
          this.tutorialStep++;
          this.showTutorialStep();
        }
        break;
    }
  }
  
  private completeTutorial() {
    console.log('Tutorial completed!');
    
    // Clean up tutorial elements
    if (this.tutorialOverlay) {
      this.tutorialOverlay.destroy();
    }
    if (this.tutorialArrow) {
      this.tutorialArrow.destroy();
      this.tutorialArrow = undefined;
    }
    if (this.tutorialHighlight) {
      this.tutorialHighlight.destroy();
      this.tutorialHighlight = undefined;
    }
    
    // Clear tutorial target reference
    this.tutorialTargetOrder = undefined;
    
    // Mark tutorial as completed
    this.tutorialActive = false;
    localStorage.setItem('oe-game-tutorial-completed', 'true');
    
    // Store completion in Firebase if user is logged in
    this.storeTutorialCompletionInFirebase();
    
    // Show completion message
    const completionText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'Tutorial Complete!\nGood luck in the warehouse!',
      {
        fontSize: '24px',
        color: '#00ff00',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5).setDepth(1000);
    
    // Fade out completion message
    this.tweens.add({
      targets: completionText,
      alpha: 0,
      y: completionText.y - 50,
      duration: 3000,
      onComplete: () => completionText.destroy()
    });
  }
  
  private storeTutorialCompletionInFirebase() {
    try {
      // Access Firebase user data through window global (set by App component)
      const userData = (window as any).firebaseUserData;
      const firebaseUser = (window as any).firebaseUser;
      
      if (firebaseUser && userData) {
        // Call Firebase update function through window global
        const updateUserData = (window as any).updateFirebaseUserData;
        if (updateUserData) {
          updateUserData({
            ...userData,
            tutorialCompleted: true
          });
          console.log('Tutorial completion stored in Firebase');
        }
      }
    } catch (error) {
      console.log('Could not store tutorial completion in Firebase:', error);
      // This is not critical, so we don't throw - local storage will still work
    }
  }
}
