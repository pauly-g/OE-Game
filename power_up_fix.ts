  private isNearPowerUpSwitch(): boolean {
    if (!this.player || !this.powerUpSwitchBounds) return false;
    
    const playerBounds = new Phaser.Geom.Rectangle(
      this.player.x - 20,
      this.player.y - 30,
      40, 
      60
    );
    
    return Phaser.Geom.Rectangle.Overlaps(playerBounds, this.powerUpSwitchBounds);
  }

  // Add this to the update method after the spacebar handling
  // Handle spacebar for power-up switch
  if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
    if (this.isNearPowerUpSwitch() && this.powerUpAvailable && !this.powerUpActive) {
      this.activatePowerUpSwitch();
    }
  }
