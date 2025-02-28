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
        fontSize: '64px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(1);

      // Display score
      this.add.text(width * 0.5, height * 0.45, `Score: ${this.score}`, {
        fontSize: '32px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(1);

      // Create restart button
      const restartButton = this.add.text(width * 0.5, height * 0.6, 'Click to Restart', {
        fontSize: '32px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold',
        backgroundColor: '#00000080',
        padding: { x: 20, y: 10 }
      })
        .setOrigin(0.5)
        .setDepth(1)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => restartButton.setColor('#ffff00'))
        .on('pointerout', () => restartButton.setColor('#ffffff'))
        .on('pointerdown', () => {
          gameDebugger.info('Restart button clicked');
          this.scene.start('Level1Scene', { reset: true });
        });

      // Add text prompt for spacebar restart
      this.add.text(width * 0.5, height * 0.7, 'Press SPACE to Restart', {
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5).setDepth(1);

      gameDebugger.info('GameOverScene create completed');
    } catch (error) {
      gameDebugger.error('Error in GameOverScene create:', error);
    }
  }

  update() {
    // Check for spacebar press to restart
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      gameDebugger.info('Spacebar pressed to restart game');
      this.scene.start('Level1Scene', { reset: true });
    }
  }
}