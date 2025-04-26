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
 */
import Phaser from 'phaser';
import { gameDebugger } from '../utils/debug';

export class GameOverScene extends Phaser.Scene {
  private score: number = 0;
  private spaceKey: Phaser.Input.Keyboard.Key;
  private leaderboardButton: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameOverScene' });
    gameDebugger.info('GameOverScene constructor called');
    
    // Initialize with dummy values that will be properly set in create()
    // This fixes the "Property has no initializer and is not definitely assigned" error
    this.spaceKey = {} as Phaser.Input.Keyboard.Key;
    this.leaderboardButton = {} as Phaser.GameObjects.Text;
  }

  preload() {
    gameDebugger.info('GameOverScene preload started');
    try {
      // Load game over background image
      this.load.image('gameOverBG', 'game/Background/GameOverBG2.png');
      gameDebugger.info('GameOverScene preload completed');
    } catch (error) {
      gameDebugger.error('Error in GameOverScene preload:', error);
    }
  }

  init(data: { score: number }) {
    gameDebugger.info('GameOverScene init called', data);
    this.score = data.score;
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
      
      // Add the game over background image back
      const background = this.add.image(width / 2, height / 2, 'gameOverBG');
      
      // Scale the background to cover the screen while maintaining aspect ratio
      const scaleX = width / background.width;
      const scaleY = height / background.height;
      const scale = Math.max(scaleX, scaleY);
      background.setScale(scale).setDepth(0);
      
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
      
      // Set up click handler for the container
      leaderboardContainer.on('pointerdown', () => {
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
        
        // Only dispatch event to show leaderboard (no score submission)
        const showLeaderboardEvent = new CustomEvent('showGameLeaderboard', { 
          detail: { 
            score: this.score,
            inGameFrame: true,
            submittingScore: false  // Don't submit score, just view leaderboard
          } 
        });
        window.dispatchEvent(showLeaderboardEvent);
        
        // Reset button state after a short delay
        setTimeout(() => {
          if (this.scene.isActive()) {
            signBackground.setFillStyle(0x4A3629);
          }
        }, 200);
      });
      
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
}