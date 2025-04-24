// Physics module for Realm Weaver
// This module handles physics calculations and collision detection

(function() {
    // Physics configuration
    const config = {
        tileSize: 32,
        gravity: 0, // No gravity in top-down game
        friction: 0.8,
        maxVelocity: 10
    };
    
    // Initialize physics system
    function init(options) {
        // Apply custom options
        if (options) {
            Object.assign(config, options);
        }
        
        console.log('Physics system initialized');
        return true;
    }
    
    // Update physics for an entity
    function updateEntity(entity, deltaTime) {
        // Skip if entity has no physics component
        if (!entity.physics) {
            return;
        }
        
        // Default physics properties if not set
        if (!entity.physics.velocity) {
            entity.physics.velocity = { x: 0, y: 0 };
        }
        
        if (!entity.physics.acceleration) {
            entity.physics.acceleration = { x: 0, y: 0 };
        }
        
        if (entity.physics.mass === undefined) {
            entity.physics.mass = 1;
        }
        
        // Update velocity based on acceleration
        entity.physics.velocity.x += entity.physics.acceleration.x * deltaTime;
        entity.physics.velocity.y += entity.physics.acceleration.y * deltaTime;
        
        // Apply friction
        entity.physics.velocity.x *= config.friction;
        entity.physics.velocity.y *= config.friction;
        
        // Apply gravity if enabled
        if (config.gravity !== 0) {
            entity.physics.velocity.y += config.gravity * deltaTime;
        }
        
        // Limit velocity to max speed
        const speed = Math.sqrt(
            entity.physics.velocity.x * entity.physics.velocity.x + 
            entity.physics.velocity.y * entity.physics.velocity.y
        );
        
        if (speed > config.maxVelocity) {
            const ratio = config.maxVelocity / speed;
            entity.physics.velocity.x *= ratio;
            entity.physics.velocity.y *= ratio;
        }
        
        // Calculate new position
        const newPosition = {
            x: entity.position.x + entity.physics.velocity.x * deltaTime,
            y: entity.position.y + entity.physics.velocity.y * deltaTime
        };
        
        // Check for collisions
        const collisionInfo = checkCollisions(entity, newPosition);
        
        if (collisionInfo.collided) {
            // Handle collision response
            handleCollisionResponse(entity, collisionInfo);
        } else {
            // Update position if no collisions
            entity.position = newPosition;
        }
        
        // Reset acceleration
        entity.physics.acceleration.x = 0;
        entity.physics.acceleration.y = 0;
    }
    
    // Apply force to entity
    function applyForce(entity, force) {
        // Skip if entity has no physics component
        if (!entity.physics) {
            return;
        }
        
        // F = ma, so a = F/m
        const acceleration = {
            x: force.x / entity.physics.mass,
            y: force.y / entity.physics.mass
        };
        
        // Add to current acceleration
        entity.physics.acceleration.x += acceleration.x;
        entity.physics.acceleration.y += acceleration.y;
    }
    
    // Apply impulse (immediate velocity change)
    function applyImpulse(entity, impulse) {
        // Skip if entity has no physics component
        if (!entity.physics) {
            return;
        }
        
        // Add to current velocity
        entity.physics.velocity.x += impulse.x / entity.physics.mass;
        entity.physics.velocity.y += impulse.y / entity.physics.mass;
    }
    
    // Check for collisions
    function checkCollisions(entity, newPosition) {
        const result = {
            collided: false,
            position: { ...newPosition },
            entities: []
        };
        
        // Skip if entity has no collision component
        if (!entity.collision) {
            return result;
        }
        
        // Check map boundaries if Game object exists
        if (typeof Game !== 'undefined' && Game.state && Game.state.mapData) {
            const mapWidth = Game.state.mapData.width * config.tileSize;
            const mapHeight = Game.state.mapData.height * config.tileSize;
            
            // Create bounds for the entity
            const bounds = {
                left: newPosition.x,
                right: newPosition.x + (entity.collision.width || config.tileSize),
                top: newPosition.y,
                bottom: newPosition.y + (entity.collision.height || config.tileSize)
            };
            
            // Check map boundaries
            if (bounds.left < 0 || bounds.right > mapWidth || 
                bounds.top < 0 || bounds.bottom > mapHeight) {
                result.collided = true;
                
                // Adjust position to stay within bounds
                if (bounds.left < 0) result.position.x = 0;
                if (bounds.right > mapWidth) result.position.x = mapWidth - (entity.collision.width || config.tileSize);
                if (bounds.top < 0) result.position.y = 0;
                if (bounds.bottom > mapHeight) result.position.y = mapHeight - (entity.collision.height || config.tileSize);
            }
            
            // Check tile collisions
            if (Game.state.mapData.tiles) {
                // Get tile coordinates for each corner of the entity
                const tileCoords = [
                    { x: Math.floor(bounds.left / config.tileSize), y: Math.floor(bounds.top / config.tileSize) },
                    { x: Math.floor(bounds.right / config.tileSize), y: Math.floor(bounds.top / config.tileSize) },
                    { x: Math.floor(bounds.left / config.tileSize), y: Math.floor(bounds.bottom / config.tileSize) },
                    { x: Math.floor(bounds.right / config.tileSize), y: Math.floor(bounds.bottom / config.tileSize) }
                ];
                
                // Check each tile
                for (const coord of tileCoords) {
                    // Skip if outside map
                    if (coord.x < 0 || coord.y < 0 || 
                        coord.x >= Game.state.mapData.width || 
                        coord.y >= Game.state.mapData.height) {
                        continue;
                    }
                    
                    const tile = Game.state.mapData.tiles[coord.y][coord.x];
                    const blockedTiles = ['water', 'mountain', 'wall'];
                    
                    if (blockedTiles.includes(tile)) {
                        result.collided = true;
                        
                        // TODO: Implement proper tile collision response
                        // For now, just revert to original position
                        result.position = { ...entity.position };
                        break;
                    }
                }
            }
        }
        
        // Check entity collisions if GameEntities exists
        if (typeof GameEntities !== 'undefined') {
            const entities = GameEntities.getAllEntities();
            
            for (const otherEntity of entities) {
                // Skip self
                if (otherEntity.id === entity.id) {
                    continue;
                }
                
                // Skip entities without collision
                if (!otherEntity.collision || !otherEntity.position) {
                    continue;
                }
                
                // Create bounds for both entities
                const entityBounds = {
                    left: newPosition.x,
                    right: newPosition.x + (entity.collision.width || config.tileSize),
                    top: newPosition.y,
                    bottom: newPosition.y + (entity.collision.height || config.tileSize)
                };
                
                const otherBounds = {
                    left: otherEntity.position.x,
                    right: otherEntity.position.x + (otherEntity.collision.width || config.tileSize),
                    top: otherEntity.position.y,
                    bottom: otherEntity.position.y + (otherEntity.collision.height || config.tileSize)
                };
                
                // Check for intersection
                if (entityBounds.left < otherBounds.right && entityBounds.right > otherBounds.left &&
                    entityBounds.top < otherBounds.bottom && entityBounds.bottom > otherBounds.top) {
                    result.collided = true;
                    result.entities.push(otherEntity);
                    
                    // TODO: Implement proper entity collision response
                    // For now, just revert to original position
                    result.position = { ...entity.position };
                    break;
                }
            }
        }
        
        return result;
    }
    
    // Handle collision response
    function handleCollisionResponse(entity, collisionInfo) {
        // Update position based on collision
        entity.position = { ...collisionInfo.position };
        
        // If no physics, just update position
        if (!entity.physics) {
            return;
        }
        
        // Basic collision response - reverse velocity components
        if (collisionInfo.position.x !== entity.position.x + entity.physics.velocity.x) {
            entity.physics.velocity.x *= -0.5; // Bounce with dampening
        }
        
        if (collisionInfo.position.y !== entity.position.y + entity.physics.velocity.y) {
            entity.physics.velocity.y *= -0.5; // Bounce with dampening
        }
        
        // Trigger collision events
        if (entity.onCollision && collisionInfo.entities.length > 0) {
            for (const otherEntity of collisionInfo.entities) {
                entity.onCollision(otherEntity);
            }
        }
    }
    
    // Calculate distance between two points
    function distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Expose public API
    window.GamePhysics = {
        init,
        updateEntity,
        applyForce,
        applyImpulse,
        checkCollisions,
        distance
    };
})();