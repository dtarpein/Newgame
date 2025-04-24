// Input handling module for Realm Weaver
// This module handles keyboard and mouse input for the game

(function() {
    // Key state tracking
    const keyState = {};
    
    // Initialize input handling
    function init() {
        // Add event listeners for keyboard
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        console.log('Input system initialized');
        return true;
    }
    
    // Handle key down event
    function handleKeyDown(event) {
        keyState[event.key] = true;
        
        // Handle movement keys
        switch(event.key) {
            case 'ArrowUp':
            case 'w':
                movePlayer(0, -1);
                event.preventDefault();
                break;
            case 'ArrowDown':
            case 's':
                movePlayer(0, 1);
                event.preventDefault();
                break;
            case 'ArrowLeft':
            case 'a':
                movePlayer(-1, 0);
                event.preventDefault();
                break;
            case 'ArrowRight':
            case 'd':
                movePlayer(1, 0);
                event.preventDefault();
                break;
            case 'm':
                // Toggle map
                if (typeof Game !== 'undefined' && Game.toggleMap) {
                    Game.toggleMap();
                }
                break;
            case 'e':
                // Interact
                if (typeof Game !== 'undefined' && Game.interact) {
                    Game.interact();
                }
                break;
            case 'r':
                // Rest
                if (typeof Game !== 'undefined' && Game.restCharacter) {
                    Game.restCharacter();
                }
                break;
            case ' ':
                // Explore
                if (typeof Game !== 'undefined' && Game.startExploration) {
                    Game.startExploration();
                }
                event.preventDefault();
                break;
        }
    }
    
    // Handle key up event
    function handleKeyUp(event) {
        keyState[event.key] = false;
    }
    
    // Move player character
    function movePlayer(dx, dy) {
        // Check if Game object exists
        if (typeof Game === 'undefined') {
            console.error('Game object not found');
            return;
        }
        
        // Get current position
        const position = { ...Game.state.characterPosition };
        
        // Calculate new position
        position.x += dx;
        position.y += dy;
        
        // Update character facing direction
        if (dx > 0) {
            Game.state.entities[0].sprite.facing = 'right';
        } else if (dx < 0) {
            Game.state.entities[0].sprite.facing = 'left';
        } else if (dy > 0) {
            Game.state.entities[0].sprite.facing = 'down';
        } else if (dy < 0) {
            Game.state.entities[0].sprite.facing = 'up';
        }
        
        // Check for collisions
        if (!checkCollision(position)) {
            // Update position if no collisions
            Game.state.characterPosition = position;
            Game.state.entities[0].position = position;
            
            // Send position update to server
            updatePositionOnServer(position);
        }
    }
    
    // Check for collisions
    function checkCollision(position) {
        // Check map boundaries
        if (position.x < 0 || position.y < 0 || 
            position.x >= Game.state.mapData.width || 
            position.y >= Game.state.mapData.height) {
            return true;
        }
        
        // Check terrain collisions
        const tile = Game.state.mapData.tiles[position.y][position.x];
        const blockedTiles = ['water', 'mountain', 'wall'];
        
        if (blockedTiles.includes(tile)) {
            return true;
        }
        
        // Check entity collisions (NPCs, etc.)
        for (const entity of Game.state.entities) {
            if (entity.id !== 'player' && 
                entity.position.x === position.x && 
                entity.position.y === position.y) {
                return true;
            }
        }
        
        return false;
    }
    
    // Update position on server
    function updatePositionOnServer(position) {
        // Check if we have the region ID
        if (!Game.state.regionData || !Game.state.regionData.id) {
            return;
        }
        
        // Send position update
        fetch('/api/move', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                x: position.x,
                y: position.y,
                region_id: Game.state.regionData.id
            })
        })
        .then(response => response.json())
        .then(data => {
            // Check for new discoveries
            if (data.discoveries && data.discoveries.length > 0) {
                data.discoveries.forEach(discovery => {
                    // Add discovery message to event log
                    if (typeof Game !== 'undefined' && 
                        typeof Game.addEventMessage === 'function') {
                        Game.addEventMessage(`Discovered: ${discovery.name}`);
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error updating position:', error);
        });
    }
    
    // Check if a key is currently pressed
    function isKeyPressed(key) {
        return keyState[key] === true;
    }
    
    // Expose public API
    window.GameInput = {
        init,
        isKeyPressed
    };
})();