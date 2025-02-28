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

  init(data: { score: number }) {
    gameDebugger.info('GameOverScene init called', data);
    this.score = data.score;
  }

  create() {
    gameDebugger.info('GameOverScene create started');
    try {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;

      // Setup spacebar to restart game
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

      // Create game over text
      this.add.text(width * 0.5, height * 0.3, 'Game Over', {
        fontSize: '64px',
        color: '#ffffff'
      }).setOrigin(0.5);

      // Display score
      this.add.text(width * 0.5, height * 0.45, `Score: ${this.score}`, {
        fontSize: '32px',
        color: '#ffffff'
      }).setOrigin(0.5);

      // Create restart button
      const restartButton = this.add.text(width * 0.5, height * 0.6, 'Click to Restart', {
        fontSize: '32px',
        color: '#ffffff'
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => restartButton.setColor('#ff0'))
        .on('pointerout', () => restartButton.setColor('#ffffff'))
        .on('pointerdown', () => {
          gameDebugger.info('Restart button clicked');
          this.scene.start('Level1Scene', { reset: true });
        });

      // Add text prompt for spacebar restart
      this.add.text(width * 0.5, height * 0.7, 'Press SPACE to Restart', {
        fontSize: '24px',
        color: '#ffffff'
      }).setOrigin(0.5);

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