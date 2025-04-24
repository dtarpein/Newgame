// Entity management module for Realm Weaver
// This module handles game entities like NPCs, items, and interactive objects

(function() {
    // Entity collection
    let entities = [];
    
    // Initialize entity system
    function init() {
        console.log('Entity system initialized');
        return true;
    }
    
    // Create a new entity
    function createEntity(entityData) {
        // Generate unique ID if not provided
        if (!entityData.id) {
            entityData.id = 'entity_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }
        
        // Add to collection
        entities.push(entityData);
        
        return entityData.id;
    }
    
    // Get entity by ID
    function getEntity(entityId) {
        return entities.find(entity => entity.id === entityId);
    }
    
    // Update entity properties
    function updateEntity(entityId, properties) {
        const entity = getEntity(entityId);
        
        if (!entity) {
            return false;
        }
        
        // Update properties
        Object.assign(entity, properties);
        
        return true;
    }
    
    // Remove entity
    function removeEntity(entityId) {
        const index = entities.findIndex(entity => entity.id === entityId);
        
        if (index === -1) {
            return false;
        }
        
        entities.splice(index, 1);
        return true;
    }
    
    // Get all entities
    function getAllEntities() {
        return [...entities];
    }
    
    // Get entities by type
    function getEntitiesByType(type) {
        return entities.filter(entity => entity.type === type);
    }
    
    // Get entities in radius
    function getEntitiesInRadius(x, y, radius) {
        return entities.filter(entity => {
            const dx = entity.position.x - x;
            const dy = entity.position.y - y;
            const distSquared = dx * dx + dy * dy;
            
            return distSquared <= radius * radius;
        });
    }
    
    // Update all entities
    function updateEntities(deltaTime) {
        entities.forEach(entity => {
            // Skip entities without behavior
            if (!entity.behavior) {
                return;
            }
            
            // Execute entity behavior
            switch (entity.behavior.type) {
                case 'wander':
                    updateWanderBehavior(entity, deltaTime);
                    break;
                case 'follow':
                    updateFollowBehavior(entity, deltaTime);
                    break;
                case 'patrol':
                    updatePatrolBehavior(entity, deltaTime);
                    break;
            }
        });
    }
    
    // Update wander behavior
    function updateWanderBehavior(entity, deltaTime) {
        if (!entity.behavior.timer) {
            entity.behavior.timer = 0;
            entity.behavior.moveInterval = entity.behavior.moveInterval || 3000;
            entity.behavior.direction = { x: 0, y: 0 };
        }
        
        entity.behavior.timer += deltaTime;
        
        // Change direction randomly
        if (entity.behavior.timer >= entity.behavior.moveInterval) {
            entity.behavior.timer = 0;
            
            // 25% chance to stand still
            if (Math.random() < 0.25) {
                entity.behavior.direction = { x: 0, y: 0 };
            } else {
                // Random direction
                const directions = [
                    { x: 0, y: -1 }, // Up
                    { x: 1, y: 0 },  // Right
                    { x: 0, y: 1 },  // Down
                    { x: -1, y: 0 }  // Left
                ];
                
                entity.behavior.direction = directions[Math.floor(Math.random() * directions.length)];
            }
            
            // Update facing direction
            if (entity.behavior.direction.x > 0) {
                entity.sprite.facing = 'right';
            } else if (entity.behavior.direction.x < 0) {
                entity.sprite.facing = 'left';
            } else if (entity.behavior.direction.y > 0) {
                entity.sprite.facing = 'down';
            } else if (entity.behavior.direction.y < 0) {
                entity.sprite.facing = 'up';
            }
        }
        
        // Move entity if has direction
        if (entity.behavior.direction.x !== 0 || entity.behavior.direction.y !== 0) {
            const newPosition = {
                x: entity.position.x + entity.behavior.direction.x,
                y: entity.position.y + entity.behavior.direction.y
            };
            
            // Check for collisions
            if (!checkCollision(newPosition, entity.id)) {
                entity.position = newPosition;
            } else {
                // Reset direction if collided
                entity.behavior.direction = { x: 0, y: 0 };
            }
        }
    }
    
    // Update follow behavior
    function updateFollowBehavior(entity, deltaTime) {
        if (!entity.behavior.target) {
            return;
        }
        
        // Find target entity
        const targetEntity = getEntity(entity.behavior.target);
        
        if (!targetEntity) {
            return;
        }
        
        // Check if already at target
        const dx = targetEntity.position.x - entity.position.x;
        const dy = targetEntity.position.y - entity.position.y;
        const distSquared = dx * dx + dy * dy;
        
        // If already at target or too far, do nothing
        if (distSquared === 0 || distSquared > entity.behavior.maxDistance * entity.behavior.maxDistance) {
            return;
        }
        
        // Move towards target
        let moveX = 0;
        let moveY = 0;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            moveX = dx > 0 ? 1 : -1;
        } else {
            moveY = dy > 0 ? 1 : -1;
        }
        
        // Update facing direction
        if (moveX > 0) {
            entity.sprite.facing = 'right';
        } else if (moveX < 0) {
            entity.sprite.facing = 'left';
        } else if (moveY > 0) {
            entity.sprite.facing = 'down';
        } else if (moveY < 0) {
            entity.sprite.facing = 'up';
        }
        
        // Update position
        const newPosition = {
            x: entity.position.x + moveX,
            y: entity.position.y + moveY
        };
        
        // Check for collisions
        if (!checkCollision(newPosition, entity.id)) {
            entity.position = newPosition;
        }
    }
    
    // Update patrol behavior
    function updatePatrolBehavior(entity, deltaTime) {
        if (!entity.behavior.waypoints || entity.behavior.waypoints.length === 0) {
            return;
        }
        
        // Initialize patrol data if not exists
        if (entity.behavior.currentWaypoint === undefined) {
            entity.behavior.currentWaypoint = 0;
            entity.behavior.waitTimer = 0;
        }
        
        // Get current waypoint
        const waypoint = entity.behavior.waypoints[entity.behavior.currentWaypoint];
        
        // Check if at waypoint
        if (entity.position.x === waypoint.x && entity.position.y === waypoint.y) {
            // Wait at waypoint
            if (entity.behavior.waitTimer < entity.behavior.waitTime) {
                entity.behavior.waitTimer += deltaTime;
                return;
            }
            
            // Move to next waypoint
            entity.behavior.currentWaypoint = (entity.behavior.currentWaypoint + 1) % entity.behavior.waypoints.length;
            entity.behavior.waitTimer = 0;
            return;
        }
        
        // Move towards waypoint
        const dx = waypoint.x - entity.position.x;
        const dy = waypoint.y - entity.position.y;
        
        let moveX = 0;
        let moveY = 0;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            moveX = dx > 0 ? 1 : -1;
        } else {
            moveY = dy > 0 ? 1 : -1;
        }
        
        // Update facing direction
        if (moveX > 0) {
            entity.sprite.facing = 'right';
        } else if (moveX < 0) {
            entity.sprite.facing = 'left';
        } else if (moveY > 0) {
            entity.sprite.facing = 'down';
        } else if (moveY < 0) {
            entity.sprite.facing = 'up';
        }
        
        // Update position
        const newPosition = {
            x: entity.position.x + moveX,
            y: entity.position.y + moveY
        };
        
        // Check for collisions
        if (!checkCollision(newPosition, entity.id)) {
            entity.position = newPosition;
        }
    }
    
    // Check for collisions
    function checkCollision(position, ignoreEntityId) {
        // Check map boundaries if Game object exists
        if (typeof Game !== 'undefined' && Game.state && Game.state.mapData) {
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
        }
        
        // Check entity collisions
        for (const entity of entities) {
            if (entity.id !== ignoreEntityId && 
                entity.position && 
                entity.position.x === position.x && 
                entity.position.y === position.y) {
                return true;
            }
        }
        
        return false;
    }
    
    // Expose public API
    window.GameEntities = {
        init,
        createEntity,
        getEntity,
        updateEntity,
        removeEntity,
        getAllEntities,
        getEntitiesByType,
        getEntitiesInRadius,
        updateEntities
    };
})();