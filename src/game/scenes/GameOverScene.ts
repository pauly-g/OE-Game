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
 */
import Phaser from 'phaser';
import { gameDebugger } from '../utils/debug';

export class GameOverScene extends Phaser.Scene {
  private score: number = 0;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private leaderboardButton!: Phaser.GameObjects.Text;
  private signInButton!: Phaser.GameObjects.Text;
  private scoreSubmitStatus!: Phaser.GameObjects.Text;

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

      // Add status text for score submission (initially hidden)
      this.scoreSubmitStatus = this.add.text(width * 0.5, height * 0.48, '', {
        fontSize: '24px',
        color: '#4ade80', // Green color for success
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'italic',
        shadow: { color: '#000000', fill: true, offsetX: 1, offsetY: 1, blur: 4 }
      }).setOrigin(0.5).setDepth(1).setVisible(false);

      // Add leaderboard button
      this.leaderboardButton = this.add.text(width * 0.5, height * 0.58, 'View Leaderboard', {
        fontSize: '32px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        backgroundColor: '#3b82f680',
        padding: { x: 20, y: 10 },
        shadow: { color: '#000000', fill: true, offsetX: 2, offsetY: 2, blur: 6 }
      }).setOrigin(0.5).setDepth(1).setInteractive({ useHandCursor: true });

      // Add sign in button if needed (we'll check auth state and show conditionally)
      this.signInButton = this.add.text(width * 0.5, height * 0.7, 'Sign in with Google to submit score', {
        fontSize: '28px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        backgroundColor: '#ea438580', // Google red
        padding: { x: 20, y: 10 },
        shadow: { color: '#000000', fill: true, offsetX: 2, offsetY: 2, blur: 6 }
      }).setOrigin(0.5).setDepth(1).setInteractive({ useHandCursor: true });

      // Check if user is authenticated and dispatch event to check
      this.dispatchAuthCheckEvent();

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

  private dispatchAuthCheckEvent() {
    // Dispatch event to check if user is authenticated
    const win = window as Window;
    const checkAuthEvent = new CustomEvent('checkGameAuth', { 
      detail: { 
        score: this.score,
        sceneInstance: this 
      } 
    });
    
    gameDebugger.info('Dispatching checkGameAuth event');
    win.dispatchEvent(checkAuthEvent);
    
    // Listen for auth response events
    win.addEventListener('gameAuthResponse', this.handleAuthResponse);
  }

  private handleAuthResponse = (event: Event) => {
    const customEvent = event as CustomEvent;
    const { isAuthenticated, scoreSubmitted } = customEvent.detail;
    
    gameDebugger.info('Received gameAuthResponse:', customEvent.detail);
    
    // Hide sign in button if user is authenticated
    this.signInButton.setVisible(!isAuthenticated);
    
    // Show score submitted confirmation if applicable
    if (scoreSubmitted) {
      this.scoreSubmitStatus.setText('Score submitted to leaderboard!');
      this.scoreSubmitStatus.setVisible(true);
    }
  }

  private setupButtonHandlers() {
    // Leaderboard button handler
    this.leaderboardButton.on('pointerdown', () => {
      gameDebugger.info('Leaderboard button clicked');
      
      // Make the button pulse on click
      this.tweens.add({
        targets: this.leaderboardButton,
        scale: { from: 1, to: 1.1 },
        duration: 100,
        yoyo: true
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
      this.leaderboardButton.setStyle({ backgroundColor: '#4f46e580' }); // Lighter blue
    });
    
    this.leaderboardButton.on('pointerout', () => {
      this.leaderboardButton.setStyle({ backgroundColor: '#3b82f680' }); // Back to normal
    });
    
    // Sign in button handler
    this.signInButton.on('pointerdown', () => {
      gameDebugger.info('Sign in button clicked');
      
      // Make the button pulse on click
      this.tweens.add({
        targets: this.signInButton,
        scale: { from: 1, to: 1.1 },
        duration: 100,
        yoyo: true
      });
      
      // Dispatch event to trigger sign in
      const win = window as Window;
      const signInEvent = new CustomEvent('gameSignInRequest', { 
        detail: { 
          score: this.score,
          sceneInstance: this 
        } 
      });
      
      win.dispatchEvent(signInEvent);
    });
    
    // Hover effects
    this.signInButton.on('pointerover', () => {
      this.signInButton.setStyle({ backgroundColor: '#f0584580' }); // Lighter red
    });
    
    this.signInButton.on('pointerout', () => {
      this.signInButton.setStyle({ backgroundColor: '#ea438580' }); // Back to normal
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
      
      // Remove auth response event listener
      win.removeEventListener('gameAuthResponse', this.handleAuthResponse);
      
      // Add a short delay to ensure events are processed before starting the scene
      setTimeout(() => {
        gameDebugger.info('Starting Level1Scene with reset=true from GameOverScene');
        this.scene.start('Level1Scene', { reset: true, forceRecreate: true });
      }, 50);
    }
  }
}