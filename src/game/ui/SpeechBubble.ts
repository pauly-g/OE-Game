import * as Phaser from 'phaser';

/**
 * Configuration options for creating a speech bubble
 */
export interface SpeechBubbleConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  text: string;
  style?: Phaser.Types.GameObjects.Text.TextStyle;
  padding?: number;
  backgroundColor?: number;
  borderColor?: number;
  borderWidth?: number;
  pointerPosition?: 'left' | 'center' | 'right';
  lifespan?: number;
}

/**
 * SpeechBubble creates a stylish, responsive speech bubble
 * that automatically resizes based on text content
 */
export class SpeechBubble {
  public container: Phaser.GameObjects.Container;
  public text: Phaser.GameObjects.Text;
  private background: Phaser.GameObjects.Graphics;
  private pointer: Phaser.GameObjects.Graphics;
  private timer: Phaser.Time.TimerEvent | null = null;
  
  constructor(config: SpeechBubbleConfig) {
    // Create container to hold all components
    this.container = config.scene.add.container(config.x, config.y);
    
    // Create text with system monospace font
    this.text = config.scene.add.text(0, 0, config.text, {
      fontSize: '16px',
      fontFamily: 'Courier, monospace',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 200, useAdvancedWrap: true },
      ...config.style
    });
    this.text.setOrigin(0.5);
    
    // Calculate bubble dimensions based on text
    const padding = config.padding || 10;
    const width = this.text.width + padding * 2;
    const height = this.text.height + padding * 2;
    
    // Draw bubble background
    this.background = config.scene.add.graphics();
    const backgroundColor = config.backgroundColor !== undefined ? config.backgroundColor : 0x2d2d2d;
    const borderColor = config.borderColor !== undefined ? config.borderColor : 0x4a4a4a;
    const borderWidth = config.borderWidth !== undefined ? config.borderWidth : 2;
    
    // Fill background with rounded corners
    this.background.fillStyle(backgroundColor, 1);
    this.background.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    
    // Add border with rounded corners
    this.background.lineStyle(borderWidth, borderColor, 1);
    this.background.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    
    // Create a pointer (small triangle) at the bottom of the bubble
    this.pointer = config.scene.add.graphics();
    this.pointer.fillStyle(backgroundColor, 1);
    
    // Default pointer position is center
    const pointerPosition = config.pointerPosition || 'center';
    let pointerX = 0;
    
    if (pointerPosition === 'left') {
      pointerX = -width / 4;
    } else if (pointerPosition === 'right') {
      pointerX = width / 4;
    }
    
    // Draw the pointer triangle
    this.pointer.fillTriangle(
      pointerX, height / 2,
      pointerX - 10, height / 2 - 10,
      pointerX + 10, height / 2 - 10
    );
    
    // Add a border to the pointer
    this.pointer.lineStyle(borderWidth, borderColor, 1);
    this.pointer.beginPath();
    this.pointer.moveTo(pointerX, height / 2);
    this.pointer.lineTo(pointerX - 10, height / 2 - 10);
    this.pointer.lineTo(pointerX + 10, height / 2 - 10);
    this.pointer.closePath();
    this.pointer.strokePath();
    
    // Add components to container
    this.container.add([this.background, this.text, this.pointer]);
    
    // Set depth to ensure it appears above orders
    this.container.setDepth(50);
    
    // Set up auto-destruction if lifespan is provided
    if (config.lifespan) {
      this.timer = config.scene.time.delayedCall(config.lifespan, () => {
        this.destroy();
      });
    }
  }
  
  /**
   * Updates the speech bubble position to follow an order
   */
  public update(orderX: number, orderY: number): void {
    if (this.container) {
      this.container.x = orderX;
      this.container.y = orderY;
    }
  }
  
  /**
   * Destroys the speech bubble with a fade-out animation
   */
  public destroy(): void {
    if (this.container && this.container.scene) {
      // Cancel any existing tweens
      this.container.scene.tweens.killTweensOf(this.container);
      
      // Create exit animation
      this.container.scene.tweens.add({
        targets: this.container,
        alpha: { from: 1, to: 0 },
        scale: { from: 1, to: 0.8 },
        duration: 300,
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (this.timer) {
            this.timer.remove();
            this.timer = null;
          }
          
          if (this.container) {
            this.container.destroy();
          }
        }
      });
    } else {
      // Timer cleanup
      if (this.timer) {
        this.timer.remove();
        this.timer = null;
      }
    }
  }
}
