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
 */
import Phaser from 'phaser';
import { gameDebugger } from '../utils/debug';

export class GameOverScene extends Phaser.Scene {
  private score: number = 0;
  private spaceKey!: Phaser.Input.Keyboard.Key;

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
      this.add.text(width * 0.5, height * 0.3, 'Game Over', {
        fontSize: '72px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
        fontStyle: 'bold',
        shadow: { color: '#000000', fill: true, offsetX: 2, offsetY: 2, blur: 8 }
      }).setOrigin(0.5).setDepth(1);

      // Display score with enhanced styling
      this.add.text(width * 0.5, height * 0.45, `Score: ${this.score}`, {
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: { color: '#000000', fill: true, offsetX: 2, offsetY: 2, blur: 8 }
      }).setOrigin(0.5).setDepth(1);

      // Add spacebar restart prompt with enhanced styling and visual cue
      const restartText = this.add.text(width * 0.5, height * 0.65, 'Press SPACE to Restart', {
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
    // Check for spacebar press to restart
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      gameDebugger.info('Spacebar pressed to restart game');
      
      // In a browser environment, dispatch custom events for music and stations
      // The non-null assertion is safe here as Phaser only runs in browser contexts
      const win = window as Window;
      
      // Dispatch custom events to ensure stations and music are properly handled
      try {
        gameDebugger.info('Dispatching gameRestartWithStations event');
        const stationsEvent = new CustomEvent('gameRestartWithStations', { 
          detail: { requireStationReset: true } 
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
      
      // Start the game scene regardless of event dispatch success
      this.scene.start('Level1Scene', { reset: true });
    }
  }
}