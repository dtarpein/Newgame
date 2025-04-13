/**
 * Inventory UI System
 * Handles displaying and interacting with player inventory
 */
class InventoryUI {
    constructor(game) {
        this.game = game;
        this.isOpen = false;
        this.currentTab = 'all';
        this.items = [];
        this.selectedItem = null;
        
        // UI Elements
        this.panel = document.getElementById('inventoryPanel');
        this.grid = document.getElementById('inventoryGrid');
        this.capacityEl = document.getElementById('inventoryCapacity');
        this.goldEl = document.getElementById('inventoryGold');
        this.detailsEl = document.getElementById('itemDetails');
        
        // Initialize UI event listeners
        this.initEventListeners();
    }
    
    /**
     * Initialize event listeners for inventory UI
     */
    initEventListeners() {
        // Tab buttons
        const tabButtons = document.querySelectorAll('.inventory-tabs .tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked tab
                button.classList.add('active');
                
                // Update current tab
                this.currentTab = button.dataset.tab;
                
                // Filter items based on tab
                this.filterItems();
            });
        });
        
        // Close button
        const closeButton = document.getElementById('closeInventoryBtn');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hide();
            });
        }
        
        // Keyboard shortcut (ESC to close)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.hide();
            }
            
            // I key to toggle inventory
            if (e.key === 'i') {
                this.toggle();
            }
        });
    }
    
    /**
     * Show inventory panel
     */
    show() {
        if (this.isOpen) return;
        
        // Play open sound
        if (this.game.audioManager) {
            this.game.audioManager.playUISound('inventory');
        }
        
        // Show panel
        this.panel.classList.remove('hidden');
        this.isOpen = true;
        
        // Update inventory state
        this.loadItems();
        
        // Set previous game state
        this.previousGameState = this.game.state;
        this.game.state = 'inventory';
    }
    
    /**
     * Hide inventory panel
     */
    hide() {
        if (!this.isOpen) return;
        
        // Play close sound
        if (this.game.audioManager) {
            this.game.audioManager.playUISound('close');
        }
        
        // Hide panel
        this.panel.classList.add('hidden');
        this.isOpen = false;
        
        // Clear details panel
        this.detailsEl.style.display = 'none';
        
        // Restore previous game state
        this.game.state = this.previousGameState || 'running';
    }
    
    /**
     * Toggle inventory panel
     */
    toggle() {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Load inventory items from player
     */
    loadItems() {
        // Clear current items
        this.items = [];
        
        // Load items from player
        if (this.game.player && this.game.player.inventory) {
            this.items = this.game.player.inventory;
            
            // Update capacity display
            this.capacityEl.textContent = `${this.items.length}/${this.game.player.maxInventorySlots || 20}`;
            
            // Update gold display
            this.goldEl.textContent = this.game.player.gold || 0;
            
            // Apply current filter
            this.filterItems();
        }
    }
    
    /**
     * Filter items based on current tab
     */
    filterItems() {
        // Clear grid
        this.grid.innerHTML = '';
        
        // Filter items
        let filteredItems = [];
        
        if (this.currentTab === 'all') {
            filteredItems = this.items;
        } else {
            filteredItems = this.items.filter(item => item.item_type === this.currentTab);
        }
        
        // Create item elements
        filteredItems.forEach(item => {
            this.createItemElement(item);
        });
    }
    
    /**
     * Create an item element in the grid
     */
    createItemElement(item) {
        const itemTemplate = document.getElementById('itemTemplate');
        if (!itemTemplate) return;
        
        const itemElement = itemTemplate.content.cloneNode(true).children[0];
        
        // Set item data
        itemElement.dataset.itemId = item.id;
        
        // Set item name with rarity color
        const nameElement = itemElement.querySelector('.item-name');
        nameElement.textContent = item.name;
        nameElement.style.color = this.getRarityColor(item.rarity);
        
        // Set icon based on item type/sprite
        const iconElement = itemElement.querySelector('.item-icon');
        
        // Use icon if available, otherwise use default based on type
        if (item.icon) {
            iconElement.style.backgroundImage = `url(${item.icon})`;
        } else {
            // Default icon positions based on item type
            const iconPositions = {
                'weapon': '0 0',
                'armor': '-40px 0',
                'consumable': '-80px 0',
                'quest': '-120px 0',
                'misc': '-160px 0'
            };
            
            iconElement.style.backgroundImage = `url('/static/assets/sprites/item_icons.png')`;
            iconElement.style.backgroundPosition = iconPositions[item.item_type] || '0 0';
        }
        
        // Add quantity badge if stackable
        if (item.quantity && item.quantity > 1) {
            const quantityBadge = document.createElement('div');
            quantityBadge.className = 'item-quantity';
            quantityBadge.textContent = item.quantity;
            itemElement.appendChild(quantityBadge);
        }
        
        // Add equipped indicator if equipped
        if (item.equipped) {
            const equippedIndicator = document.createElement('div');
            equippedIndicator.className = 'item-equipped';
            equippedIndicator.textContent = 'E';
            itemElement.appendChild(equippedIndicator);
        }
        
        // Add click handler
        itemElement.addEventListener('click', () => {
            this.showItemDetails(item);
        });
        
        // Add to grid
        this.grid.appendChild(itemElement);
    }
    
    /**
     * Show item details in the details panel
     */
    showItemDetails(item) {
        // Update selected item
        this.selectedItem = item;
        
        // Create details content
        let detailsHTML = `
            <h3 style="color: ${this.getRarityColor(item.rarity)};">${item.name}</h3>
            <p class="item-type">${this.formatItemType(item.item_type, item.subtype)} (${item.rarity})</p>
            <p class="item-description">${item.description || 'No description available.'}</p>
        `;
        
        // Add properties based on item type
        const properties = item.properties || {};
        
        if (item.item_type === 'weapon') {
            detailsHTML += `
                <div class="item-property">
                    <span class="property-name">Damage:</span>
                    <span class="property-value">${properties.damage || 0}</span>
                </div>
            `;
            
            // Add other weapon properties
            if (properties.crit_chance) {
                detailsHTML += `
                    <div class="item-property">
                        <span class="property-name">Critical Chance:</span>
                        <span class="property-value">${properties.crit_chance}%</span>
                    </div>
                `;
            }
            
            if (properties.attack_speed) {
                detailsHTML += `
                    <div class="item-property">
                        <span class="property-name">Attack Speed:</span>
                        <span class="property-value">${properties.attack_speed}</span>
                    </div>
                `;
            }
        } 
        else if (item.item_type === 'armor') {
            detailsHTML += `
                <div class="item-property">
                    <span class="property-name">Defense:</span>
                    <span class="property-value">${properties.defense || 0}</span>
                </div>
            `;
            
            // Add other armor properties
            if (properties.magic_resist) {
                detailsHTML += `
                    <div class="item-property">
                        <span class="property-name">Magic Resist:</span>
                        <span class="property-value">${properties.magic_resist}</span>
                    </div>
                `;
            }
        } 
        else if (item.item_type === 'consumable') {
            // Add effect description
            if (properties.restore_health) {
                detailsHTML += `
                    <div class="item-property">
                        <span class="property-name">Restores Health:</span>
                        <span class="property-value">${properties.restore_health}</span>
                    </div>
                `;
            }
            
            if (properties.restore_mana) {
                detailsHTML += `
                    <div class="item-property">
                        <span class="property-name">Restores Mana:</span>
                        <span class="property-value">${properties.restore_mana}</span>
                    </div>
                `;
            }
            
            if (properties.buff) {
                detailsHTML += `
                    <div class="item-property">
                        <span class="property-name">Buff:</span>
                        <span class="property-value">${properties.buff} (${properties.duration || 60}s)</span>
                    </div>
                `;
            }
        }
        
        // Add common properties
        if (properties.durability !== undefined && properties.max_durability !== undefined) {
            const durabilityPercent = (properties.durability / properties.max_durability) * 100;
            const durabilityColor = durabilityPercent < 20 ? '#e74c3c' : 
                                    durabilityPercent < 50 ? '#f39c12' : '#2ecc71';
            
            detailsHTML += `
                <div class="item-property">
                    <span class="property-name">Durability:</span>
                    <span class="property-value" style="color: ${durabilityColor};">
                        ${properties.durability}/${properties.max_durability}
                    </span>
                </div>
            `;
        }
        
        if (properties.level_req) {
            detailsHTML += `
                <div class="item-property">
                    <span class="property-name">Required Level:</span>
                    <span class="property-value">${properties.level_req}</span>
                </div>
            `;
        }
        
        // Add value
        detailsHTML += `
            <div class="item-property">
                <span class="property-name">Value:</span>
                <span class="property-value">${properties.value || 0} gold</span>
            </div>
        `;
        
        // Add action buttons
        detailsHTML += `<div class="item-actions">`;
        
        // Use button for usable items
        if (item.usable) {
            detailsHTML += `<button class="item-action-btn use-btn">Use</button>`;
        }
        
        // Equip/Unequip button for equipable items
        if (item.equipable) {
            if (item.equipped) {
                detailsHTML += `<button class="item-action-btn unequip-btn">Unequip</button>`;
            } else {
                detailsHTML += `<button class="item-action-btn equip-btn">Equip</button>`;
            }
        }
        
        // Drop button (except for quest items)
        if (item.item_type !== 'quest') {
            detailsHTML += `<button class="item-action-btn drop-btn">Drop</button>`;
        }
        
        detailsHTML += `</div>`;
        
        // Update details element
        this.detailsEl.innerHTML = detailsHTML;
        this.detailsEl.style.display = 'block';
        
        // Add event listeners to buttons
        this.setupActionButtons(item);
        
        // Play select sound
        if (this.game.audioManager) {
            this.game.audioManager.playUISound('click');
        }
    }
    
    /**
     * Set up action buttons for an item
     */
    setupActionButtons(item) {
        // Use button
        const useBtn = this.detailsEl.querySelector('.use-btn');
        if (useBtn) {
            useBtn.addEventListener('click', () => {
                this.useItem(item);
            });
        }
        
        // Equip button
        const equipBtn = this.detailsEl.querySelector('.equip-btn');
        if (equipBtn) {
            equipBtn.addEventListener('click', () => {
                this.equipItem(item);
            });
        }
        
        // Unequip button
        const unequipBtn = this.detailsEl.querySelector('.unequip-btn');
        if (unequipBtn) {
            unequipBtn.addEventListener('click', () => {
                this.unequipItem(item);
            });
        }
        
        // Drop button
        const dropBtn = this.detailsEl.querySelector('.drop-btn');
        if (dropBtn) {
            dropBtn.addEventListener('click', () => {
                this.dropItem(item);
            });
        }
    }
    
    /**
     * Use an item
     */
    useItem(item) {
        // Call item's use method
        if (this.game.player) {
            const result = this.game.player.useItem(item.id);
            
            if (result.success) {
                // Show result in game log
                this.game.addEvent(result.message);
                
                // Play sound
                if (this.game.audioManager) {
                    this.game.audioManager.playSound('potion_use');
                }
                
                // Reload inventory
                this.loadItems();
                
                // Clear details if item is gone
                if (result.consumed) {
                    this.detailsEl.style.display = 'none';
                }
            } else {
                // Show error
                this.game.addEvent(result.message);
                
                // Play error sound
                if (this.game.audioManager) {
                    this.game.audioManager.playUISound('error');
                }
            }
        }
    }
    
    /**
     * Equip an item
     */
    equipItem(item) {
        // Call item's equip method
        if (this.game.player) {
            const result = this.game.player.equipItem(item.id);
            
            if (result.success) {
                // Show result in game log
                this.game.addEvent(result.message);
                
                // Play sound
                if (this.game.audioManager) {
                    this.game.audioManager.playSound('item_equip');
                }
                
                // Reload inventory
                this.loadItems();
            } else {
                // Show error
                this.game.addEvent(result.message);
                
                // Play error sound
                if (this.game.audioManager) {
                    this.game.audioManager.playUISound('error');
                }
            }
        }
    }
    
    /**
     * Unequip an item
     */
    unequipItem(item) {
        // Call item's unequip method
        if (this.game.player) {
            const result = this.game.player.unequipItem(item.id);
            
            if (result.success) {
                // Show result in game log
                this.game.addEvent(result.message);
                
                // Play sound
                if (this.game.audioManager) {
                    this.game.audioManager.playSound('item_unequip');
                }
                
                // Reload inventory
                this.loadItems();
            } else {
                // Show error
                this.game.addEvent(result.message);
                
                // Play error sound
                if (this.game.audioManager) {
                    this.game.audioManager.playUISound('error');
                }
            }
        }
    }
    
    /**
     * Drop an item
     */
    dropItem(item) {
        // Confirm drop
        if (confirm(`Are you sure you want to drop ${item.name}?`)) {
            // Call player's drop method
            if (this.game.player) {
                const result = this.game.player.dropItem(item.id);
                
                if (result.success) {
                    // Show result in game log
                    this.game.addEvent(result.message);
                    
                    // Play sound
                    if (this.game.audioManager) {
                        this.game.audioManager.playSound('item_drop');
                    }
                    
                    // Reload inventory
                    this.loadItems();
                    
                    // Clear details
                    this.detailsEl.style.display = 'none';
                } else {
                    // Show error
                    this.game.addEvent(result.message);
                    
                    // Play error sound
                    if (this.game.audioManager) {
                        this.game.audioManager.playUISound('error');
                    }
                }
            }
        }
    }
    
    /**
     * Get color based on item rarity
     */
    getRarityColor(rarity) {
        const rarityColors = {
            'common': '#AAAAAA',
            'uncommon': '#00AA00',
            'rare': '#0055FF',
            'epic': '#AA00FF',
            'legendary': '#FFAA00'
        };
        
        return rarityColors[rarity] || rarityColors.common;
    }
    
    /**
     * Format item type and subtype for display
     */
    formatItemType(type, subtype) {
        let formattedType = type.charAt(0).toUpperCase() + type.slice(1);
        
        if (subtype) {
            formattedType += ` (${subtype.charAt(0).toUpperCase() + subtype.slice(1)})`;
        }
        
        return formattedType;
    }
}

// Export for use in main game
window.InventoryUI = InventoryUI;