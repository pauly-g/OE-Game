  private markEditAsApplied(order: Order, editType: string) {
    if (!order || !order.container) return;
    
    // Find the index of this edit type in the order's types array
    const index = order.types.indexOf(editType);
    if (index === -1) return;
    
    // Create a checkmark to show this edit has been applied
    const checkmark = this.add.text(0, 0, '✓', {
      fontSize: '24px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    
    // Find the right position based on the layout type
    if (order.icons && order.icons[index]) {
      // If we have a reference to the icon, place directly above it
      const icon = order.icons[index];
      checkmark.x = icon.x;
      checkmark.y = icon.y - 25;
    } else {
      // Fallback to the old positioning if no icons reference
      if (order.types.length <= 3) {
        // Horizontal layout
        const spacing = 30;
        checkmark.x = (index - order.types.length/2 + 0.5) * spacing;
        checkmark.y = -25;
      } else {
        // Grid layout
        const row = Math.floor(index / 3);
        const col = index % 3;
        const spacing = 30;
        
        if (row === 0) {
          checkmark.x = (col - 1) * spacing;
        } else {
          const itemsInLastRow = order.types.length - 3;
          if (itemsInLastRow === 1) {
            checkmark.x = 0;
          } else {
            checkmark.x = (col - 0.5) * spacing;
          }
        }
        checkmark.y = (row - 1) * spacing - 5;
      }
    }
    
    // Add to order container and animate
    order.container.add(checkmark);
    
    this.tweens.add({
      targets: checkmark,
      scale: { from: 1.5, to: 1 },
      duration: 300,
      ease: 'Back.easeOut'
    });
  }
