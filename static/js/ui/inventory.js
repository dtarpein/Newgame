// Inventory UI module for Realm Weaver
// This module handles the inventory interface

(function() {
    // Inventory state
    let inventoryData = {
        items: [],
        gold: 0,
        capacity: {
            used: 0,
            max: 20
        }
    };
    
    // DOM elements
    let inventoryPanel;
    let inventoryGrid;
    let capacityDisplay;
    let goldDisplay;
    let itemDetailsPanel;
    
    // Active tab
    let activeTab = 'all';
    
    // Initialize inventory UI
    function init() {
        // Get DOM elements
        inventoryPanel = document.getElementById('inventoryPanel');
        inventoryGrid = document.getElementById('inventoryGrid');
        capacityDisplay = document.getElementById('inventoryCapacity');
        goldDisplay = document.getElementById('inventoryGold');
        itemDetailsPanel = document.getElementById('itemDetails');
        
        // Set up event listeners
        setupEventListeners();
        
        // Load initial inventory data
        loadInventoryData();
        
        console.log('Inventory UI initialized');
        return true;
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Panel close button
        const closeButton = document.getElementById('closeInventoryBtn');
        if (closeButton) {
            closeButton.addEventListener('click', hideInventory);
        }
        
        // Tab buttons
        const tabButtons = document.querySelectorAll('.inventory-panel .tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.getAttribute('data-tab');
                setActiveTab(tab);
            });
        });
        
        // Key listener for inventory toggle
        document.addEventListener('keydown', function(event) {
            if (event.key === 'i') {
                toggleInventory();
            } else if (event.key === 'Escape' && isInventoryVisible()) {
                hideInventory();
            }
        });
    }
    
    // Load inventory data from server
    function loadInventoryData() {
        fetch('/api/character/inventory')
            .then(response => response.json())
            .then(data => {
                inventoryData.items = data;
                inventoryData.capacity.used = data.length;
                
                // Get gold from character
                fetch('/api/character/current')
                    .then(response => response.json())
                    .then(characterData => {
                        inventoryData.gold = characterData.gold || 0;
                        updateInventoryDisplay();
                    })
                    .catch(error => {
                        console.error('Error loading character data:', error);
                    });
            })
            .catch(error => {
                console.error('Error loading inventory data:', error);
            });
    }
    
    // Update inventory display
    function updateInventoryDisplay() {
        // Update capacity and gold
        if (capacityDisplay) {
            capacityDisplay.textContent = `${inventoryData.capacity.used}/${inventoryData.capacity.max}`;
        }
        
        if (goldDisplay) {
            goldDisplay.textContent = inventoryData.gold;
        }
        
        // Clear inventory grid
        if (inventoryGrid) {
            inventoryGrid.innerHTML = '';
            
            // Filter items by active tab
            const filteredItems = filterItemsByTab(inventoryData.items, activeTab);
            
            // Add items to grid
            filteredItems.forEach(item => {
                const itemElement = createItemElement(item);
                inventoryGrid.appendChild(itemElement);
            });
        }
    }
    
    // Filter items by tab
    function filterItemsByTab(items, tab) {
        if (tab === 'all') {
            return items;
        }
        
        return items.filter(item => {
            switch (tab) {
                case 'weapons':
                    return item.item_type === 'weapon';
                case 'armor':
                    return item.item_type === 'armor';
                case 'consumables':
                    return item.item_type === 'consumable';
                case 'quest':
                    return item.item_type === 'quest';
                case 'misc':
                    return !['weapon', 'armor', 'consumable', 'quest'].includes(item.item_type);
                default:
                    return true;
            }
        });
    }
    
    // Create item element
    function createItemElement(item) {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.setAttribute('data-item-id', item.id);
        itemElement.setAttribute('data-item-type', item.item_type);
        
        // Item icon
        const iconElement = document.createElement('div');
        iconElement.className = 'item-icon';
        // Set icon position based on item ID or other property
        iconElement.style.backgroundPosition = `${(item.id % 10) * -40}px ${Math.floor(item.id / 10) * -40}px`;
        
        // Item name
        const nameElement = document.createElement('div');
        nameElement.className = 'item-name';
        nameElement.textContent = item.name;
        
        // Add rarity indicator if available
        if (item.rarity) {
            itemElement.classList.add(`rarity-${item.rarity}`);
            
            // Add border color based on rarity
            switch (item.rarity) {
                case 'uncommon':
                    itemElement.style.borderColor = '#2e7d32';
                    break;
                case 'rare':
                    itemElement.style.borderColor = '#1565c0';
                    break;
                case 'epic':
                    itemElement.style.borderColor = '#6a1b9a';
                    break;
                case 'legendary':
                    itemElement.style.borderColor = '#ff6f00';
                    break;
            }
        }
        
        // Item actions
        const actionsElement = document.createElement('div');
        actionsElement.className = 'item-actions';
        
        // Action buttons based on item type
        if (item.item_type === 'consumable') {
            const useButton = document.createElement('button');
            useButton.className = 'item-action-btn use-btn';
            useButton.textContent = 'Use';
            useButton.setAttribute('data-action', 'use');
            useButton.addEventListener('click', (e) => {
                e.stopPropagation();
                useItem(item.id);
            });
            actionsElement.appendChild(useButton);
        } else if (item.item_type === 'weapon' || item.item_type === 'armor') {
            const equipButton = document.createElement('button');
            equipButton.className = 'item-action-btn use-btn';
            equipButton.textContent = 'Equip';
            equipButton.setAttribute('data-action', 'equip');
            equipButton.addEventListener('click', (e) => {
                e.stopPropagation();
                equipItem(item.id);
            });
            actionsElement.appendChild(equipButton);
        }
        
        // Info button for all items
        const infoButton = document.createElement('button');
        infoButton.className = 'item-action-btn info-btn';
        infoButton.textContent = 'Info';
        infoButton.setAttribute('data-action', 'info');
        infoButton.addEventListener('click', (e) => {
            e.stopPropagation();
            showItemDetails(item);
        });
        actionsElement.appendChild(infoButton);
        
        // Assemble item element
        itemElement.appendChild(iconElement);
        itemElement.appendChild(nameElement);
        itemElement.appendChild(actionsElement);
        
        // Add tooltip with item info
        const tooltipElement = document.createElement('div');
        tooltipElement.className = 'item-tooltip';
        
        const tooltipTitle = document.createElement('h4');
        tooltipTitle.textContent = item.name;
        tooltipElement.appendChild(tooltipTitle);
        
        if (item.rarity) {
            const rarityElement = document.createElement('p');
            rarityElement.className = `item-rarity ${item.rarity}`;
            rarityElement.textContent = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);
            tooltipElement.appendChild(rarityElement);
        }
        
        const descElement = document.createElement('p');
        descElement.textContent = item.description;
        tooltipElement.appendChild(descElement);
        
        // Add item properties if available
        if (item.properties) {
            let properties;
            
            try {
                // Try to parse JSON string
                properties = typeof item.properties === 'string' ? 
                    JSON.parse(item.properties) : item.properties;
            } catch (e) {
                properties = item.properties;
            }
            
            if (properties && typeof properties === 'object') {
                const propsElement = document.createElement('div');
                propsElement.className = 'item-properties';
                
                for (const [key, value] of Object.entries(properties)) {
                    if (key === 'value') {
                        const propElement = document.createElement('div');
                        propElement.className = 'item-property';
                        propElement.textContent = `Value: ${value} gold`;
                        propsElement.appendChild(propElement);
                    } else if (key === 'damage') {
                        const propElement = document.createElement('div');
                        propElement.className = 'item-property';
                        propElement.textContent = `Damage: ${value}`;
                        propsElement.appendChild(propElement);
                    } else if (key === 'defense') {
                        const propElement = document.createElement('div');
                        propElement.className = 'item-property';
                        propElement.textContent = `Defense: ${value}`;
                        propsElement.appendChild(propElement);
                    } else if (key === 'durability') {
                        const propElement = document.createElement('div');
                        propElement.className = 'item-property';
                        propElement.textContent = `Durability: ${value}/${properties.max_durability || value}`;
                        propsElement.appendChild(propElement);
                    } else if (key === 'restore_health') {
                        const propElement = document.createElement('div');
                        propElement.className = 'item-property';
                        propElement.textContent = `Restores ${value} Health`;
                        propsElement.appendChild(propElement);
                    } else if (key === 'restore_mana') {
                        const propElement = document.createElement('div');
                        propElement.className = 'item-property';
                        propElement.textContent = `Restores ${value} Mana`;
                        propsElement.appendChild(propElement);
                    }
                }
                
                tooltipElement.appendChild(propsElement);
            }
        }
        
        itemElement.appendChild(tooltipElement);
        
        // Add click handler for item
        itemElement.addEventListener('click', () => {
            showItemDetails(item);
        });
        
        return itemElement;
    }
    
    // Show item details panel
    function showItemDetails(item) {
        if (!itemDetailsPanel) return;
        
        // Clear details panel
        itemDetailsPanel.innerHTML = '';
        
        // Create item details content
        const titleElement = document.createElement('h3');
        titleElement.textContent = item.name;
        
        if (item.rarity) {
            const rarityElement = document.createElement('div');
            rarityElement.className = `item-rarity ${item.rarity}`;
            rarityElement.textContent = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);
            titleElement.appendChild(rarityElement);
        }
        
        const descElement = document.createElement('p');
        descElement.textContent = item.description;
        
        // Add item properties if available
        const propsElement = document.createElement('div');
        propsElement.className = 'item-properties';
        
        if (item.properties) {
            let properties;
            
            try {
                // Try to parse JSON string
                properties = typeof item.properties === 'string' ? 
                    JSON.parse(item.properties) : item.properties;
            } catch (e) {
                properties = item.properties;
            }
            
            if (properties && typeof properties === 'object') {
                for (const [key, value] of Object.entries(properties)) {
                    if (['value', 'damage', 'defense', 'durability', 'restore_health', 'restore_mana'].includes(key)) {
                        const propElement = document.createElement('div');
                        propElement.className = 'item-property';
                        
                        let propName, propValue;
                        
                        switch (key) {
                            case 'value':
                                propName = 'Value';
                                propValue = `${value} gold`;
                                break;
                            case 'damage':
                                propName = 'Damage';
                                propValue = value;
                                break;
                            case 'defense':
                                propName = 'Defense';
                                propValue = value;
                                break;
                            case 'durability':
                                propName = 'Durability';
                                propValue = `${value}/${properties.max_durability || value}`;
                                break;
                            case 'restore_health':
                                propName = 'Restores Health';
                                propValue = value;
                                break;
                            case 'restore_mana':
                                propName = 'Restores Mana';
                                propValue = value;
                                break;
                        }
                        
                        propElement.textContent = `${propName}: ${propValue}`;
                        propsElement.appendChild(propElement);
                    }
                }
            }
        }
        
        // Add action buttons
        const actionsElement = document.createElement('div');
        actionsElement.className = 'item-actions';
        
        // Add actions based on item type
        if (item.item_type === 'consumable') {
            const useButton = document.createElement('button');
            useButton.className = 'btn btn-primary';
            useButton.textContent = 'Use';
            useButton.addEventListener('click', () => {
                useItem(item.id);
            });
            actionsElement.appendChild(useButton);
        } else if (item.item_type === 'weapon' || item.item_type === 'armor') {
            const equipButton = document.createElement('button');
            equipButton.className = 'btn btn-primary';
            equipButton.textContent = 'Equip';
            equipButton.addEventListener('click', () => {
                equipItem(item.id);
            });
            actionsElement.appendChild(equipButton);
        }
        
        // Add drop button for all items
        const dropButton = document.createElement('button');
        dropButton.className = 'btn btn-danger';
        dropButton.textContent = 'Drop';
        dropButton.addEventListener('click', () => {
            dropItem(item.id);
        });
        actionsElement.appendChild(dropButton);
        
        // Assemble details panel
        itemDetailsPanel.appendChild(titleElement);
        itemDetailsPanel.appendChild(descElement);
        itemDetailsPanel.appendChild(propsElement);
        itemDetailsPanel.appendChild(actionsElement);
    }
    
    // Use item
    function useItem(itemId) {
        fetch(`/api/item/${itemId}/use`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show notification
                showNotification(data.message, 'success');
                
                // Refresh inventory after short delay
                setTimeout(() => {
                    loadInventoryData();
                }, 500);
            } else {
                showNotification(data.message || 'Failed to use item', 'error');
            }
        })
        .catch(error => {
            console.error('Error using item:', error);
            showNotification('Error using item', 'error');
        });
    }
    
    // Equip item
    function equipItem(itemId) {
        fetch(`/api/item/${itemId}/equip`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show notification
                showNotification(data.message, 'success');
                
                // Refresh inventory after short delay
                setTimeout(() => {
                    loadInventoryData();
                }, 500);
            } else {
                showNotification(data.message || 'Failed to equip item', 'error');
            }
        })
        .catch(error => {
            console.error('Error equipping item:', error);
            showNotification('Error equipping item', 'error');
        });
    }
    
    // Drop item
    function dropItem(itemId) {
        // Confirm before dropping
        if (!confirm('Are you sure you want to drop this item? This action cannot be undone.')) {
            return;
        }
        
        fetch(`/api/item/${itemId}/drop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show notification
                showNotification(data.message, 'success');
                
                // Refresh inventory after short delay
                setTimeout(() => {
                    loadInventoryData();
                }, 500);
            } else {
                showNotification(data.message || 'Failed to drop item', 'error');
            }
        })
        .catch(error => {
            console.error('Error dropping item:', error);
            showNotification('Error dropping item', 'error');
        });
    }
    
    // Set active tab
    function setActiveTab(tab) {
        activeTab = tab;
        
        // Update tab buttons
        const tabButtons = document.querySelectorAll('.inventory-panel .tab-button');
        tabButtons.forEach(button => {
            if (button.getAttribute('data-tab') === tab) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Update inventory display
        updateInventoryDisplay();
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        const notificationElement = document.createElement('div');
        notificationElement.className = `notification ${type}`;
        notificationElement.textContent = message;
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'close-notification';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            notificationElement.style.display = 'none';
        });
        
        notificationElement.appendChild(closeButton);
        
        // Add to notifications container
        const notificationsContainer = document.querySelector('.notifications');
        if (notificationsContainer) {
            notificationsContainer.appendChild(notificationElement);
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                notificationElement.style.opacity = '0';
                setTimeout(() => {
                    notificationElement.remove();
                }, 500);
            }, 5000);
        }
    }
    
    // Show inventory
    function showInventory() {
        if (inventoryPanel) {
            inventoryPanel.classList.remove('hidden');
            
            // Refresh inventory data
            loadInventoryData();
        }
    }
    
    // Hide inventory
    function hideInventory() {
        if (inventoryPanel) {
            inventoryPanel.classList.add('hidden');
        }
    }
    
    // Toggle inventory visibility
    function toggleInventory() {
        if (isInventoryVisible()) {
            hideInventory();
        } else {
            showInventory();
        }
    }
    
    // Check if inventory is visible
    function isInventoryVisible() {
        return inventoryPanel && !inventoryPanel.classList.contains('hidden');
    }
    
    // Expose public API
    window.GameInventory = {
        init,
        showInventory,
        hideInventory,
        toggleInventory,
        isInventoryVisible,
        loadInventoryData
    };
})();