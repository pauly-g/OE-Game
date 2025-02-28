  private activatePowerUpSwitch() {
    if (!this.powerUpAvailable || this.powerUpActive) return;
    
    console.log('Activating Power-Up!');
    
    // Set button state
    this.powerUpActive = true;
    this.powerUpAvailable = false;
    this.powerUpTimer = 15000; // 15 seconds of power-up time
    
    // Visual feedback
    this.setButtonColor(0x0000ff); // Blue for active
    
    // Show countdown
    this.powerUpCountdownText.setText('15s');
    
    // Apply power-up effects
    this.conveyorSpeed = 0.1; // Slow down the conveyor belt dramatically
    
    // Play activation sound
    if (this.sound && this.sound.add) {
      try {
        const activateSound = this.sound.add('powerup', { volume: 0.7 });
        activateSound.play();
      } catch (error) {
        console.error('Could not play power-up sound:', error);
      }
    }
    
    // Animate the lever being pulled
    this.tweens.add({
      targets: this.powerUpLever,
      y: 10, // Move lever down
      angle: 45, // Rotate lever
      duration: 300,
      ease: 'Bounce.Out'
    });
  }
  
  private deactivatePowerUp() {
    if (!this.powerUpActive) return;
    
    console.log('Power-Up expired!');
    
    // Reset button state
    this.powerUpActive = false;
    this.powerUpTimer = 0;
    this.powerUpCountdownText.setText('');
    
    // Visual feedback
    this.setButtonColor(0xff0000); // Red for inactive
    
    // Reset conveyor speed to normal (with current difficulty)
    this.conveyorSpeed = Math.min(
      this.maxConveyorSpeed,
      0.5 + (this.totalEditsApplied / 20) * 0.1
    );
    
    // Play deactivation sound
    if (this.sound && this.sound.add) {
      try {
        const deactivateSound = this.sound.add('powerdown', { volume: 0.5 });
        deactivateSound.play();
      } catch (error) {
        console.error('Could not play power-down sound:', error);
      }
    }
    
    // Animate the lever returning
    this.tweens.add({
      targets: this.powerUpLever,
      y: 0, // Return to original position
      angle: 0, // Reset rotation
      duration: 300,
      ease: 'Sine.InOut'
    });
  }
