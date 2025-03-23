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
      this.load.image('gameOverBG', 'game/Background/GameOverBG.png');
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
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      
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
        
        // Simple click feedback (slight scale down and up, no continuous animation)
        this.tweens.add({
          targets: leaderboardContainer,
          scale: { from: 1.0, to: 0.95 },
          duration: 100,
          yoyo: true,
          onComplete: () => {
            // Return to original scale
            this.tweens.add({
              targets: leaderboardContainer,
              scale: 1.0,
              duration: 100
            });
          }
        });
        
        // Dispatch event to show leaderboard WITHIN the game frame, not as a fullscreen page
        const win = window as Window;
        const showLeaderboardEvent = new CustomEvent('showGameLeaderboard', { 
          detail: { 
            score: this.score,
            inGameFrame: true // Flag to indicate leaderboard should stay within game frame
          } 
        });
        
        win.dispatchEvent(showLeaderboardEvent);
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
        this.scene.start('Level1Scene');
        
        // Dispatch restart event
        const restartEvent = new CustomEvent('gameRestart', {
          detail: { source: 'gameOver' }
        });
        window.dispatchEvent(restartEvent);
        
        // Create and dispatch a custom event to reset stations
        try {
          const resetStationsEvent = new CustomEvent('resetStations');
          window.dispatchEvent(resetStationsEvent);
          gameDebugger.info('Reset stations event dispatched');
        } catch (error) {
          gameDebugger.error('Error dispatching station reset event:', error);
        }
      } else {
        gameDebugger.info('Space key pressed but ignored - leaderboard is open');
      }
    }
  }
}