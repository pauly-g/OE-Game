  private completeOrder(order: Order) {
    if (!order) return;
    
    console.log(`Completed order ${order.id}`);
    
    // Update counters
    this.ordersCompleted++;
    
    // Add completion bonus
    const bonus = 25 * order.types.length; // More edits = bigger bonus
    this.score += bonus;
    this.scoreText.setText(`Score: ${this.score}`);
    
    // Mark order as complete but don't remove it
    order.isComplete = true;
    
    // Show completion indicator above the order
    const completionEmoji = this.add.text(
      order.container.x,
      order.container.y - 40,
      '❤️',
      { fontSize: '36px', stroke: '#000000', strokeThickness: 2 }
    ).setOrigin(0.5);
    
    // Add it to the container so it moves with the order
    order.container.add(completionEmoji);
    
    // Add a little animation to the emoji
    this.tweens.add({
      targets: completionEmoji,
      y: '-=20',
      alpha: { from: 1, to: 0.8 },
      scale: { from: 1, to: 1.3 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
  }

  // Update the order positions function to handle completed orders
  private updateOrderPositions(delta: number) {
    // Move orders along conveyor belt
    for (let i = this.orders.length - 1; i >= 0; i--) {
      const order = this.orders[i];
      
      // Move all orders to the right (including completed ones)
      order.x += this.conveyorSpeed;
      
      // Update container position
      if (order.container) {
        order.container.x = order.x;
      }
      
      // Check if order went off screen
      if (order.x > this.cameras.main.width + 50) {
        if (!order.isComplete && this.lives > 0) {
          // Incomplete order - remove a life
          this.lives--;
          this.failedOrders++;
          
          // Update life indicators
          this.updateLivesDisplay();
          
          // Visual feedback for failed order - angry emoji floating up
          const failEmoji = this.add.text(
            order.x - 100,
            order.y,
            '��',
            { fontSize: '36px', stroke: '#000000', strokeThickness: 2 }
          ).setOrigin(0.5);
          
          // Animate the angry emoji floating up
          this.tweens.add({
            targets: failEmoji,
            y: '-=150',
            alpha: { from: 1, to: 0 },
            scale: { from: 1, to: 1.5 },
            duration: 1500,
            ease: 'Sine.Out',
            onComplete: () => failEmoji.destroy()
          });
          
          // If all lives are gone, it's game over
          if (this.lives <= 0) {
            this.gameOver();
          }
        } else if (order.isComplete) {
          // Completed order - just animate a heart emoji floating away
          const heartEmoji = this.add.text(
            order.x - 100,
            order.y,
            '❤️',
            { fontSize: '36px', stroke: '#000000', strokeThickness: 2 }
          ).setOrigin(0.5);
          
          // Animate the heart emoji floating up
          this.tweens.add({
            targets: heartEmoji,
            y: '-=150',
            alpha: { from: 1, to: 0 },
            scale: { from: 1, to: 1.5 },
            duration: 1500,
            ease: 'Sine.Out',
            onComplete: () => heartEmoji.destroy()
          });
        }
        
        // Remove the order in both cases
        this.removeOrder(i);
      }
    }
  }
