  private updatePowerUp(delta: number) {
    // If power up is active, update timer and auto-complete orders
    if (this.powerUpActive) {
      // Decrement timer
      this.powerUpTimer -= delta;
      
      // Update countdown text
      const secondsLeft = Math.ceil(this.powerUpTimer / 1000);
      this.powerUpCountdownText.setText(`${secondsLeft}s`);
      
      // Check if power-up has expired
      if (this.powerUpTimer <= 0) {
        this.deactivatePowerUp();
      }
      
      // Auto-complete any orders
      for (const order of this.orders) {
        if (!order.isComplete) {
          // Get all edit types that haven't been completed yet
          const remainingEdits = order.types.filter(
            type => !order.completedEdits.includes(type)
          );
          
          // Apply all remaining edits at once
          if (remainingEdits.length > 0) {
            for (const editType of remainingEdits) {
              order.completedEdits.push(editType);
              this.markEditAsApplied(order, editType);
              this.totalEditsApplied++;
            }
            
            // Complete the order
            this.completeOrder(order);
          }
        }
      }
    }
  }
