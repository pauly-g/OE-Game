/**
 * Game Over Scene
 * 
 * Changes:
 * - Initial setup: Basic game over scene
 * - Added score display and restart functionality
 * - Fixed scene initialization
 * - Added error handling
 * - Enhanced error logging and debugging
 * - Enhanced GameOverScene with debug logging
 * - Fixed debugger variable name to avoid using reserved keyword
 * - Added spacebar support to restart the game
 * - Added preload method to load GameOverBG image and display it as background
 * - Updated text styling to ensure it's readable against the background
 * - Added leaderboard integration with event dispatching
 * - Fixed linter error with null check on button
 * - Enhanced leaderboard button visibility and removed sign-in button
 * - Fixed linter error with preFX null check
 * - Simplified auth flow with leaderboard as full screen
 * - Added Game Over music that plays when the scene starts
 */
import Phaser from 'phaser';
import { gameDebugger } from '../utils/debug';

export class GameOverScene extends Phaser.Scene {
  private score: number = 0;
  private spaceKey: Phaser.Input.Keyboard.Key;
  private leaderboardButton: Phaser.GameObjects.Text;
  private gameOverMusic: HTMLAudioElement | null = null;
  private isRadioPlaying: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
    gameDebugger.info('GameOverScene constructor called');
    
    // Initialize with dummy values that will be properly set in create()
    // This fixes the "Property has no initializer and is not definitely assigned" error
    this.spaceKey = {} as Phaser.Input.Keyboard.Key;
    this.leaderboardButton = {} as Phaser.GameObjects.Text;
  }

  preload() {
    console.log('[GameOverScene] PRELOAD METHOD CALLED');
    gameDebugger.info('GameOverScene preload started');
    try {
      // Add event listeners to catch loading errors
      this.load.on('loaderror', (file: any) => {
        console.error('[GameOverScene] Load error for file:', file);
        gameDebugger.error('Load error for file:', file);
      });
      
      this.load.on('filecomplete', (key: string) => {
        console.log('[GameOverScene] File loaded successfully:', key);
        gameDebugger.info('File loaded successfully:', key);
      });
      
      // Load game over background image with a new, unique key to bust cache
      console.log('[GameOverScene] Loading image with path: game/Background/GameOverBG.png');
      console.log('[GameOverScene] Loader baseURL:', this.load.baseURL);
      console.log('[GameOverScene] Loader path:', this.load.path);
      this.load.image('gameOverBG_new', 'game/Background/GameOverBG.png');
      
      // Note: We'll load the audio directly in create() using HTML Audio
      
      gameDebugger.info('GameOverScene preload completed');
    } catch (error) {
      gameDebugger.error('Error in GameOverScene preload:', error);
    }
  }

  init(data: { score: number }) {
    gameDebugger.info('GameOverScene init called', data);
    this.score = data.score;
    
    // Reset audio state in init to ensure it works every time
    this.isRadioPlaying = false;
    if (this.gameOverMusic) {
      this.gameOverMusic.pause();
      this.gameOverMusic = null;
    }
  }

  create() {
    try {
      gameDebugger.info('GameOverScene create started');
      
      // Define width and height for convenience
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Set up key bindings
      if (this.input.keyboard) {
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      } else {
        gameDebugger.error('Keyboard input not available in GameOverScene create');
      }
      
      // Check if user is authenticated by dispatching a check event
      // We'll let App.tsx handle the actual authentication check and score submission
      gameDebugger.info('GameOverScene dispatching authStatusCheck event');
      const authCheckEvent = new CustomEvent('authStatusCheck', {
        detail: {
          score: this.score,
          sceneInstance: this
        }
      });
      window.dispatchEvent(authCheckEvent);
      
      // Try to load the image directly if it doesn't exist
      console.log('[GameOverScene] Checking if texture exists:', this.textures.exists('gameOverBG_new'));
      gameDebugger.info('Texture exists check:', this.textures.exists('gameOverBG_new'));
      
      if (!this.textures.exists('gameOverBG_new')) {
        console.error('[GameOverScene] Texture gameOverBG_new does not exist! Loading it now...');
        gameDebugger.error('Texture gameOverBG_new does not exist! Loading it now...');
        
                 // Load the image directly in create method
         this.load.image('gameOverBG_new', 'game/Background/GameOverBG.png');
        
        // Set up a one-time complete handler for this specific load
        this.load.once('complete', () => {
          console.log('[GameOverScene] Image loaded in create method, adding to scene');
          if (this.textures.exists('gameOverBG_new')) {
            const background = this.add.image(width / 2, height / 2, 'gameOverBG_new');
            const scaleX = width / background.width;
            const scaleY = height / background.height;
            const scale = Math.max(scaleX, scaleY);
            background.setScale(scale).setDepth(0);
          } else {
            console.error('[GameOverScene] Still no texture after loading!');
            const background = this.add.rectangle(width / 2, height / 2, width, height, 0x333333);
            background.setDepth(0);
          }
        });
        
        // Start the load
        this.load.start();
        
        // For now, show a placeholder
        const background = this.add.rectangle(width / 2, height / 2, width, height, 0x333333);
        background.setDepth(0);
      } else {
        const background = this.add.image(width / 2, height / 2, 'gameOverBG_new');
        
        // Scale the background to cover the screen while maintaining aspect ratio
        const scaleX = width / background.width;
        const scaleY = height / background.height;
        const scale = Math.max(scaleX, scaleY);
        background.setScale(scale).setDepth(0);
      }
      
      // Add semi-transparent overlay to ensure text is readable
      this.add.rectangle(0, 0, width, height, 0x000000, 0.4).setOrigin(0, 0).setDepth(0.5);
      
      // Game Over title
      this.add.text(width * 0.5, height * 0.3, 'GAME OVER', {
        fontSize: '64px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
        fontStyle: 'bold',
        shadow: { color: '#000000', fill: true, offsetX: 2, offsetY: 2, blur: 8 }
      }).setOrigin(0.5).setDepth(1);
      
      // Final score text
      this.add.text(width * 0.5, height * 0.4, `Final Score: ${this.score}`, {
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: { color: '#000000', fill: true, offsetX: 2, offsetY: 2, blur: 8 }
      }).setOrigin(0.5).setDepth(1);

      // Check if radio is playing first - preventing the game over music from starting
      // if the user already has the radio playing
      try {
        // Use a custom event to query radio status
        const radioCheckEvent = new CustomEvent('isRadioPlaying', { 
          detail: {
            callback: (isPlaying: boolean) => {
              console.log('[GameOverScene] Radio playing status check returned:', isPlaying);
              this.isRadioPlaying = isPlaying;
              
              // Only play game over music if radio is not playing
              if (!this.isRadioPlaying) {
                // Play game over music now that we know radio status
                this.playGameOverMusic();
              } else {
                console.log('[GameOverScene] Not playing game over music because radio is already playing');
              }
            }
          }
        });
        
        // Dispatch the event to check radio status
        window.dispatchEvent(radioCheckEvent);
      } catch (error) {
        console.error('[GameOverScene] Error checking radio status:', error);
        
        // Fallback - just play game over music if we can't check radio
        this.playGameOverMusic();
      }
      
      // Set up event listener for radio play events - ensure it's removed first to prevent duplicates
      window.removeEventListener('radioPlayStarted', this.handleRadioPlayStarted); 
      console.log('[GameOverScene] Setting up radioPlayStarted event listener');
      window.addEventListener('radioPlayStarted', this.handleRadioPlayStarted);

      // Create a wooden sign container for the leaderboard button
      const leaderboardContainer = this.add.container(width * 0.5, height * 0.6);
      
      // Create shadow for depth
      const signShadow = this.add.rectangle(4, 4, 400, 60, 0x000000, 0.4).setOrigin(0.5);
      
      // Create wood background with darker color (darker than previous but still visible)
      const signBackground = this.add.rectangle(0, 0, 400, 60, 0x4A3629).setOrigin(0.5);
      
      // Create wood border with adjusted color 
      const borderTop = this.add.rectangle(0, -30, 400, 4, 0x755C49).setOrigin(0.5, 0.5);
      const borderBottom = this.add.rectangle(0, 30, 400, 4, 0x755C49).setOrigin(0.5, 0.5);
      const borderLeft = this.add.rectangle(-200, 0, 4, 60, 0x755C49).setOrigin(0.5, 0.5);
      const borderRight = this.add.rectangle(200, 0, 4, 60, 0x755C49).setOrigin(0.5, 0.5);
      
      // Create simple end caps for the wooden sign with adjusted color
      const leftCap = this.add.rectangle(-200, 0, 12, 40, 0x614A3C).setOrigin(0.5, 0.5);
      const rightCap = this.add.rectangle(200, 0, 12, 40, 0x614A3C).setOrigin(0.5, 0.5);
      
      // Create the leaderboard button text with bright appearance
      this.leaderboardButton = this.add.text(0, 0, 'VIEW LEADERBOARD', {
        fontSize: '30px',
        color: '#FFFFFF', 
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold',
        align: 'center'
      }).setOrigin(0.5).setDepth(1);
      
      // Add all elements to container in correct layering order
      leaderboardContainer.add([
        signShadow,
        signBackground,
        borderTop,
        borderBottom,
        borderLeft,
        borderRight,
        leftCap,
        rightCap,
        this.leaderboardButton
      ]);
      
      // Give the container a slight glow to make it stand out
      leaderboardContainer.setDepth(1);
      
      // Make the container interactive
      leaderboardContainer.setInteractive(new Phaser.Geom.Rectangle(-200, -30, 400, 60), Phaser.Geom.Rectangle.Contains);
      
      // Set up click handler for the container - add mobile touch support
      const handleLeaderboardClick = () => {
        gameDebugger.info('Leaderboard button clicked');
        
        // Simple click feedback (slight scale down)
        this.tweens.add({
          targets: leaderboardContainer,
          scale: { from: 1.0, to: 0.95 },
          duration: 100,
          yoyo: true,
          ease: 'Power1'
        });
        
        // Darker background for visual feedback
        signBackground.setFillStyle(0x3A2619);
        
        // Only dispatch event to show leaderboard (explicitly set submittingScore to false)
        const showLeaderboardEvent = new CustomEvent('showGameLeaderboard', { 
          detail: { 
            score: this.score,
            inGameFrame: true,
            submittingScore: false  // Explicitly set to false to prevent duplicate submission
          } 
        });
        window.dispatchEvent(showLeaderboardEvent);
        
        // Reset button state after a short delay
        setTimeout(() => {
          if (this.scene.isActive()) {
            signBackground.setFillStyle(0x4A3629);
          }
        }, 200);
      };
      
      // Add both pointer and touch event handlers for better mobile support
      leaderboardContainer.on('pointerdown', handleLeaderboardClick);
      leaderboardContainer.on('pointerup', handleLeaderboardClick); // Additional mobile support
      
      // Simple hover effects - brighter feedback
      leaderboardContainer.on('pointerover', () => {
        // Lighten the wood color more significantly on hover
        signBackground.setFillStyle(0x5A4639);
        this.leaderboardButton.setStyle({ fontSize: '31px' }); // Slightly grow text
      });
      
      leaderboardContainer.on('pointerout', () => {
        // Return to normal wood color
        signBackground.setFillStyle(0x4A3629);
        this.leaderboardButton.setStyle({ fontSize: '30px' }); // Return to normal size
      });

      // Add spacebar restart prompt with enhanced styling and visual cue
      const restartText = this.add.text(width * 0.5, height * 0.82, 'Press SPACE to Restart', {
        fontSize: '36px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
        backgroundColor: '#00000080',
        padding: { x: 25, y: 15 },
        shadow: { color: '#000000', fill: true, offsetX: 2, offsetY: 2, blur: 8 }
      }).setOrigin(0.5).setDepth(1);
      
      // Add a pulsing animation to the spacebar text to draw attention
      this.tweens.add({
        targets: restartText,
        scale: { from: 1.0, to: 1.1 },
        alpha: { from: 1, to: 0.8 },
        duration: 800,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1
      });

      // Also listen for stopAllAudio events
      console.log('[GameOverScene] Setting up stopAllAudio event listener');
      window.addEventListener('stopAllAudio', this.handleStopAllAudio);

      gameDebugger.info('GameOverScene create completed');
    } catch (error) {
      gameDebugger.error('Error in GameOverScene create:', error);
    }
  }

  update() {
    // Check for spacebar press to restart game with null check to fix linter error
    if (this.spaceKey && this.spaceKey.isDown !== undefined && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      // Check if leaderboard is open
      const isLeaderboardOpen = (window as any).isLeaderboardOpen === true;
      
      // Only proceed if leaderboard is not open
      if (!isLeaderboardOpen) {
        gameDebugger.info('Space key pressed in GameOverScene - restarting game');
        
        try {
          // 1. First, dispatch a comprehensive reset event that will be caught by App.tsx
          const fullResetEvent = new CustomEvent('gameRestartWithStations', { 
            detail: { 
              requireStationReset: true,
              forceRecreate: true,
              source: 'gameOverSpacebar'
            } 
          });
          window.dispatchEvent(fullResetEvent);
          gameDebugger.info('Full reset event dispatched (gameRestartWithStations)');
          
          // 2. Then explicitly reset stations in stationTracker
          const resetStationsEvent = new CustomEvent('resetStations', {
            detail: { source: 'gameOverSpacebar', complete: true }
          });
          window.dispatchEvent(resetStationsEvent);
          gameDebugger.info('Reset stations event dispatched');
          
          // 3. Dispatch event to reset any music/radio state
          const resetMusicEvent = new CustomEvent('resetMusic', {
            detail: { source: 'gameOverSpacebar' }
          });
          window.dispatchEvent(resetMusicEvent);
          gameDebugger.info('Reset music event dispatched');
          
          // 4. Small delay to ensure events are processed before scene transition
          setTimeout(() => {
            // 5. Pass reset flag to Level1Scene
            this.scene.start('Level1Scene', { reset: true, fullReset: true }); 
            gameDebugger.info('Level1Scene started with full reset flags');
            
            // 6. Finally dispatch the standard restart event
            const restartEvent = new CustomEvent('gameRestart', {
              detail: { source: 'gameOver', fullReset: true }
            });
            window.dispatchEvent(restartEvent);
            gameDebugger.info('Standard gameRestart event dispatched');
          }, 50); // Small delay to ensure events are processed in order
        } catch (error) {
          gameDebugger.error('Error in spacebar restart sequence:', error);
          // Fallback to basic restart if the enhanced sequence fails
          this.scene.start('Level1Scene', { reset: true });
        }
      } else {
        gameDebugger.info('Space key pressed but ignored - leaderboard is open');
      }
    }
  }

  // Play the game over music if it's not already playing
  private playGameOverMusic() {
    try {
      console.log('[GameOverScene] Attempting to play game over music with HTML Audio');
      
      // Always reset the audio element for each game over
      if (this.gameOverMusic) {
        this.gameOverMusic.pause();
        this.gameOverMusic.remove(); // Remove event listeners
        this.gameOverMusic = null;
      }
      
      // Create a new HTML Audio element
      this.gameOverMusic = new Audio('game/Music/BG-Music/Game Over.mp3');
      this.gameOverMusic.volume = 0.7;
      
      // Add event listeners for debugging
      this.gameOverMusic.addEventListener('canplaythrough', () => {
        console.log('[GameOverScene] Audio can play through');
      });
      
      this.gameOverMusic.addEventListener('playing', () => {
        console.log('[GameOverScene] Audio has started playing');
      });
      
      this.gameOverMusic.addEventListener('error', (e) => {
        console.error('[GameOverScene] Audio error:', e);
      });
      
      // For mobile devices, attempt to play immediately but handle rejection gracefully
      const playPromise = this.gameOverMusic.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[GameOverScene] Playing game over music with HTML Audio');
          })
          .catch((error) => {
            console.log('[GameOverScene] Auto-play prevented (likely mobile), will try on user interaction:', error);
            
            // Set up one-time event listener for user interaction to enable audio
            const enableAudioOnTouch = () => {
              if (this.gameOverMusic && this.scene.isActive()) {
                console.log('[GameOverScene] Attempting to play game over music after user interaction');
                this.gameOverMusic.play()
                  .then(() => {
                    console.log('[GameOverScene] Game over music started after user interaction');
                  })
                  .catch((err) => {
                    console.error('[GameOverScene] Failed to play game over music even after user interaction:', err);
                  });
              }
              // Remove the event listener after first use
              window.removeEventListener('pointerdown', enableAudioOnTouch);
              window.removeEventListener('touchstart', enableAudioOnTouch);
            };
            
            // Listen for any user interaction to enable audio
            window.addEventListener('pointerdown', enableAudioOnTouch, { once: true });
            window.addEventListener('touchstart', enableAudioOnTouch, { once: true });
          });
      } else {
        console.log('[GameOverScene] Play promise not supported, audio may not work on this browser');
      }
    } catch (error) {
      console.error('[GameOverScene] Error in playGameOverMusic:', error);
    }
  }
  
  // Handle radio play events - stop game over music when radio plays
  private handleRadioPlayStarted = (event: Event) => {
    console.log('[GameOverScene] Radio play detected, stopping game over music');
    this.isRadioPlaying = true;
    
    // Enhanced stopping logic
    if (this.gameOverMusic) {
      try {
        // Stop the music completely
        this.gameOverMusic.pause();
        this.gameOverMusic.currentTime = 0;
        console.log('[GameOverScene] Game over music stopped due to radio play');
      } catch (error) {
        console.error('[GameOverScene] Error stopping game over music:', error);
      }
    }
  }
  
  // Add this new handler method
  private handleStopAllAudio = (event: Event) => {
    const customEvent = event as CustomEvent;
    console.log('[GameOverScene] Received stopAllAudio event:', customEvent.detail);
    
    // Force stop any game over music immediately
    if (this.gameOverMusic) {
      console.log('[GameOverScene] Forcibly stopping game over music due to stopAllAudio event');
      try {
        this.gameOverMusic.pause();
        this.gameOverMusic.currentTime = 0;
        this.isRadioPlaying = true; // Prevent it from starting again
      } catch (error) {
        console.error('[GameOverScene] Error stopping game over music:', error);
      }
    }
  };
  
  // Clean up when scene is shut down
  shutdown() {
    gameDebugger.info('GameOverScene shutdown');
    
    // Make sure to remove the event listener
    try {
      window.removeEventListener('radioPlayStarted', this.handleRadioPlayStarted);
      window.removeEventListener('stopAllAudio', this.handleStopAllAudio);
    } catch (error) {
      console.error('[GameOverScene] Error removing event listeners:', error);
    }
    
    // Clean up audio element
    if (this.gameOverMusic) {
      try {
        this.gameOverMusic.pause();
        this.gameOverMusic = null;
      } catch (error) {
        console.error('[GameOverScene] Error cleaning up audio element:', error);
      }
    }
  }
}