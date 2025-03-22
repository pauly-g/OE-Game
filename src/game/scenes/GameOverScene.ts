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
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private leaderboardButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameOverScene' });
    gameDebugger.info('GameOverScene constructor called');
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
    gameDebugger.info('GameOverScene create started');
    try {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;

      // Add the game over background
      const background = this.add.image(width / 2, height / 2, 'gameOverBG');
      
      // Scale the background to cover the screen while maintaining aspect ratio
      const scaleX = width / background.width;
      const scaleY = height / background.height;
      const scale = Math.max(scaleX, scaleY);
      background.setScale(scale).setDepth(0);

      // Setup spacebar to restart game
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

      // Create game over text
      this.add.text(width * 0.5, height * 0.25, 'Game Over', {
        fontSize: '72px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
        fontStyle: 'bold',
        shadow: { color: '#000000', fill: true, offsetX: 2, offsetY: 2, blur: 8 }
      }).setOrigin(0.5).setDepth(1);

      // Display score with enhanced styling
      this.add.text(width * 0.5, height * 0.4, `Score: ${this.score}`, {
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: { color: '#000000', fill: true, offsetX: 2, offsetY: 2, blur: 8 }
      }).setOrigin(0.5).setDepth(1);

      // Add enhanced leaderboard button with more prominence
      this.leaderboardButton = this.add.text(width * 0.5, height * 0.6, '📊 VIEW LEADERBOARD 📊', {
        fontSize: '38px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
        backgroundColor: '#4f46e7', // Brighter purple/blue
        padding: { x: 24, y: 12 },
        shadow: { color: '#000000', fill: true, offsetX: 3, offsetY: 3, blur: 8 }
      }).setOrigin(0.5).setDepth(1).setInteractive({ useHandCursor: true });
      
      // Add a glow effect to the leaderboard button (with null check to fix linter error)
      if (this.leaderboardButton.preFX) {
        const glowFX = this.leaderboardButton.preFX!.addGlow(0x3355ff, 0, 0, false, 0.1, 16);
        
        // Animate the glow effect
        this.tweens.add({
          targets: glowFX,
          outerStrength: { from: 1, to: 4 },
          duration: 1500,
          ease: 'Sine.InOut',
          yoyo: true,
          repeat: -1
        });
      }
      
      // Add continuous pulsing animation to leaderboard button to make it stand out
      this.tweens.add({
        targets: this.leaderboardButton,
        scale: { from: 1.0, to: 1.1 },
        duration: 1200,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1
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

      // Set up button click handlers
      this.setupButtonHandlers();

      gameDebugger.info('GameOverScene create completed');
    } catch (error) {
      gameDebugger.error('Error in GameOverScene create:', error);
    }
  }

  private setupButtonHandlers() {
    // Leaderboard button handler
    this.leaderboardButton.on('pointerdown', () => {
      gameDebugger.info('Leaderboard button clicked');
      
      // Make the button pulse on click with a faster, more dramatic effect
      this.tweens.add({
        targets: this.leaderboardButton,
        scale: { from: 1.1, to: 0.9 },
        duration: 100,
        yoyo: true,
        onComplete: () => {
          // Return to original animation state after click
          this.tweens.add({
            targets: this.leaderboardButton,
            scale: 1.1,
            duration: 300,
            ease: 'Back.Out'
          });
        }
      });
      
      // Dispatch event to show leaderboard
      const win = window as Window;
      const showLeaderboardEvent = new CustomEvent('showGameLeaderboard', { 
        detail: { 
          score: this.score
        } 
      });
      
      win.dispatchEvent(showLeaderboardEvent);
    });
    
    // Hover effects
    this.leaderboardButton.on('pointerover', () => {
      this.leaderboardButton.setStyle({ backgroundColor: '#635bf7' }); // Lighter purple
      this.tweens.add({
        targets: this.leaderboardButton,
        scale: 1.2,
        duration: 200,
        ease: 'Back.Out'
      });
    });
    
    this.leaderboardButton.on('pointerout', () => {
      this.leaderboardButton.setStyle({ backgroundColor: '#4f46e7' }); // Back to normal
      this.tweens.add({
        targets: this.leaderboardButton,
        scale: 1.1,
        duration: 200,
        ease: 'Back.In'
      });
    });
  }

  update() {
    // Check for spacebar press to restart
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      gameDebugger.info('Spacebar pressed to restart game');
      
      // In a browser environment, dispatch custom events for music and stations
      // The non-null assertion is safe here as Phaser only runs in browser contexts
      const win = window as Window;
      
      // Force an explicit reset of all stations in localStorage before starting the scene
      try {
        gameDebugger.info('Forcibly resetting station tracker');
        // Access station tracker directly to reset stations
        const resetEvent = new CustomEvent('resetStations', { 
          detail: { source: 'gameOverRestart' } 
        });
        win.dispatchEvent(resetEvent);
      } catch (err) {
        gameDebugger.error('Error resetting stations:', err);
      }
      
      // Dispatch custom events to ensure stations and music are properly handled
      try {
        gameDebugger.info('Dispatching gameRestartWithStations event');
        const stationsEvent = new CustomEvent('gameRestartWithStations', { 
          detail: { requireStationReset: true, forceRecreate: true } 
        });
        win.dispatchEvent(stationsEvent);
        
        // Also dispatch event to force music playback after a short delay
        setTimeout(() => {
          try {
            gameDebugger.info('Dispatching forcePlayMusic event');
            const musicEvent = new CustomEvent('forcePlayMusic', { 
              detail: { source: 'gameOverSceneRestart' } 
            });
            win.dispatchEvent(musicEvent);
          } catch (err) {
            gameDebugger.error('Error dispatching forcePlayMusic event:', err);
          }
        }, 300);
      } catch (err) {
        gameDebugger.error('Error dispatching gameRestartWithStations event:', err);
      }
      
      // Add a short delay to ensure events are processed before starting the scene
      setTimeout(() => {
        gameDebugger.info('Starting Level1Scene with reset=true from GameOverScene');
        this.scene.start('Level1Scene', { reset: true, forceRecreate: true });
      }, 50);
    }
  }
}