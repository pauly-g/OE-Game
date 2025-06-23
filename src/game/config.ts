/**
 * Game Configuration
 * 
 * Changes:
 * - Initial setup: Basic game configuration
 * - Updated resolution to 1280x720 for better laptop compatibility
 * - Added transparent background for sprites
 * - Fixed sprite transparency and pixel art rendering
 * - Added error handling for asset loading
 * - Fixed game initialization
 * - Fixed asset loading paths
 * - Added base URL for assets
 */
import Phaser from 'phaser';
import { Level1Scene } from './scenes/Level1Scene';
import { GameOverScene } from './scenes/GameOverScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a202c',
  transparent: false,
  pixelArt: true,
  disableContextMenu: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
    min: {
      width: 320,  // Allow mobile devices (was 1024)
      height: 240  // Allow mobile devices (was 576)
    },
    max: {
      width: 1920,
      height: 1080
    }
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  audio: {
    noAudio: true
  },
  scene: [Level1Scene, GameOverScene],
  loader: {
    baseURL: window.location.origin,
    maxParallelDownloads: 32,
    crossOrigin: 'anonymous'
  },
  render: {
    pixelArt: true,
    antialias: false
  }
};