/**
 * Physics System
 * Handles collision detection and resolution
 */
class PhysicsSystem {
    constructor(game) {
        this.game = game;
        this.gravity = 0;
        this.entities = [];
        this.staticObjects = [];
        this.collisionGroups = {};
        this.broadphaseGrid = new SpatialGrid(32, 2000, 2000);
    }
    
    /**
     * Initialize physics system
     */
    init() {
        // Set up collision groups
        this.collisionGroups = {
            player: {
                collidesWith: ['solid', 'item', 'npc', 'enemy', 'trigger'],
                callback: this.handlePlayerCollision.bind(this)
            },
            enemy: {
                collidesWith: ['solid', 'player', 'npc'],
                callback: this.handleEnemyCollision.bind(this)
            },
            npc: {
                collidesWith: ['solid', 'player'],
                callback: this.handleNPCCollision.bind(this)
            },
            item: {
                collidesWith: ['player'],
                callback: this.handleItemCollision.bind(this)
            },
            projectile: {
                collidesWith: ['solid', 'player', 'enemy', 'npc'],
                callback: this.handleProjectileCollision.bind(this)
            },
            trigger: {
                collidesWith: ['player'],
                callback: this.handleTriggerCollision.bind(this)
            },
            solid: {
                collidesWith: ['player', 'enemy', 'npc', 'projectile'],
                callback: null
            }
        };
    }
    
    /**
     * Add entity to physics system
     */
    addEntity(entity, group) {
        entity.physicsGroup = group || 'solid';
        this.entities.push(entity);
        this.broadphaseGrid.insert(entity);
    }
    
    /**
     * Remove entity from physics system
     */
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index !== -1) {
            this.entities.splice(index, 1);
            this.broadphaseGrid.remove(entity);
        }
    }
    
    /**
     * Add static object to physics system
     */
    addStaticObject(object, group) {
        object.physicsGroup = group || 'solid';
        this.staticObjects.push(object);
        this.broadphaseGrid.insert(object);
    }
    
    /**
     * Remove static object from physics system
     */
    removeStaticObject(object) {
        const index = this.staticObjects.indexOf(object);
        if (index !== -1) {
            this.staticObjects.splice(index, 1);
            this.broadphaseGrid.remove(object);
        }
    }
    
    /**
     * Update physics for all entities
     */
    update(deltaTime) {
        // Update spatial grid
        this.broadphaseGrid.clear();
        
        // Insert all entities and static objects
        for (const entity of this.entities) {
            this.broadphaseGrid.insert(entity);
        }
        
        for (const obj of this.staticObjects) {
            this.broadphaseGrid.insert(obj);
        }
        
        // Process movement and collisions for each entity
        for (const entity of this.entities) {
            if (!entity.active) continue;
            
            // Apply gravity if enabled for this entity
            if (entity.gravity && this.gravity !== 0) {
                entity.velocityY += this.gravity * (deltaTime / 1000);
            }
            
            // Store original position
            const originalX = entity.x;
            const originalY = entity.y;
            
            // Apply velocity
            if (entity.velocityX !== 0 || entity.velocityY !== 0) {
                entity.x += entity.velocityX * (deltaTime / 16);
                entity.y += entity.velocityY * (deltaTime / 16);
                
                // Check and resolve collisions
                this.checkCollisions(entity, originalX, originalY);
            }
            
            // Apply friction
            if (entity.friction !== undefined && entity.friction !== 1) {
                entity.velocityX *= Math.pow(entity.friction, deltaTime / 16);
                entity.velocityY *= Math.pow(entity.friction, deltaTime / 16);
                
                // Stop very small movement
                if (Math.abs(entity.velocityX) < 0.01) entity.velocityX = 0;
                if (Math.abs(entity.velocityY) < 0.01) entity.velocityY = 0;
            }
        }
    }
    
    /**
     * Check and resolve collisions for an entity
     */
    checkCollisions(entity, originalX, originalY) {
        if (!entity.solid || !entity.physicsGroup) return;
        
        // Get collision group
        const group = this.collisionGroups[entity.physicsGroup];
        if (!group) return;
        
        // Get potentially colliding objects using spatial grid
        const potentialCollisions = this.broadphaseGrid.retrieve(entity);
        
        // Check each potential collision
        for (const other of potentialCollisions) {
            // Skip self
            if (other === entity) continue;
            
            // Skip if other object is not in a collidable group
            if (!other.physicsGroup || !group.collidesWith.includes(other.physicsGroup)) {
                continue;
            }
            
            // Skip if not solid
            if (!other.solid) continue;
            
            // Perform collision check
            const collision = this.checkCollision(entity, other);
            
            if (collision.collided) {
                // Resolve collision
                this.resolveCollision(entity, other, collision, originalX, originalY);
                
                // Trigger collision callbacks
                if (group.callback) {
                    group.callback(entity, other, collision);
                }
                
                const otherGroup = this.collisionGroups[other.physicsGroup];
                if (otherGroup && otherGroup.callback) {
                    otherGroup.callback(other, entity, collision);
                }
            }
        }
    }
    
    /**
     * Check if two objects are colliding
     */
    checkCollision(a, b) {
        // Basic AABB collision detection
        const aRight = a.x + a.width;
        const aBottom = a.y + a.height;
        const bRight = b.x + b.width;
        const bBottom = b.y + b.height;
        
        // Check for intersection
        if (a.x < bRight && aRight > b.x && a.y < bBottom && aBottom > b.y) {
            // Calculate overlap amounts
            const overlapX = Math.min(aRight - b.x, bRight - a.x);
            const overlapY = Math.min(aBottom - b.y, bBottom - a.y);
            
            return {
                collided: true,
                overlapX: overlapX,
                overlapY: overlapY,
                fromLeft: aRight - b.x <= bRight - a.x,
                fromTop: aBottom - b.y <= bBottom - a.y
            };
        }
        
        return { collided: false };
    }
    
    /**
     * Resolve collision between two objects
     */
    resolveCollision(entity, other, collision, originalX, originalY) {
        // Don't resolve if other object is not solid
        if (!other.solid) return;
        
        // Decide which axis to separate on (smallest overlap)
        if (collision.overlapX < collision.overlapY) {
            // Separate on X axis
            if (collision.fromLeft) {
                entity.x = other.x - entity.width;
            } else {
                entity.x = other.x + other.width;
            }
            
            // Stop horizontal velocity
            entity.velocityX = 0;
        } else {
            // Separate on Y axis
            if (collision.fromTop) {
                entity.y = other.y - entity.height;
                
                // Set grounded flag if resolving downward collision
                if (entity.velocityY > 0) {
                    entity.grounded = true;
                }
            } else {
                entity.y = other.y + other.height;
                
                // Reset upward velocity if hitting ceiling
                if (entity.velocityY < 0) {
                    entity.velocityY = 0;
                }
            }
            
            // Stop vertical velocity
            entity.velocityY = 0;
        }
    }
    
    /**
     * Handle player collision with other objects
     */
    handlePlayerCollision(player, other, collision) {
        if (other.physicsGroup === 'item' && other.onCollect) {
            other.onCollect(player, this.game);
        } else if (other.physicsGroup === 'trigger' && other.onTrigger) {
            other.onTrigger(player, this.game);
        } else if (other.physicsGroup === 'enemy' && player.takeDamage) {
            // Handle enemy damage (with cooldown)
            if (!player.damageImmunity || player.damageImmunity <= 0) {
                const damage = other.contactDamage || 1;
                player.takeDamage(damage, other);
                
                // Set damage immunity
                player.damageImmunity = 1000; // 1 second immunity
                
                // Knockback
                const knockbackX = player.x - other.x;
                const knockbackY = player.y - other.y;
                const knockbackLength = Math.sqrt(knockbackX * knockbackX + knockbackY * knockbackY);
                const knockbackSpeed = 5;
                
                if (knockbackLength > 0) {
                    player.velocityX = (knockbackX / knockbackLength) * knockbackSpeed;
                    player.velocityY = (knockbackY / knockbackLength) * knockbackSpeed;
                }
            }
        }
    }
    
    /**
     * Handle enemy collision with other objects
     */
    handleEnemyCollision(enemy, other, collision) {
        // React to collision with player
        if (other.physicsGroup === 'player' && enemy.onPlayerContact) {
            enemy.onPlayerContact(other, this.game);
        }
    }
    
    /**
     * Handle NPC collision with other objects
     */
    handleNPCCollision(npc, other, collision) {
        // React to collision with player or other NPCs
    }
    
    /**
     * Handle item collision with player
     */
    handleItemCollision(item, other, collision) {
        // Auto-collect items that touch player
        if (other.physicsGroup === 'player' && item.onCollect) {
            item.onCollect(other, this.game);
        }
    }
    
    /**
     * Handle projectile collision with objects
     */
    handleProjectileCollision(projectile, other, collision) {
        // Damage enemies/player and trigger effects
        if ((other.physicsGroup === 'enemy' || other.physicsGroup === 'player') && 
            other.takeDamage && projectile.damage) {
            
            other.takeDamage(projectile.damage, projectile.owner);
            
            // Apply effects
            if (projectile.effects) {
                for (const effect of projectile.effects) {
                    if (other.addEffect) {
                        other.addEffect(effect.type, effect.duration, effect.strength);
                    }
                }
            }
            
            // Destroy projectile on hit
            if (projectile.destroyOnHit !== false) {
                projectile.active = false;
                this.removeEntity(projectile);
                
                // Create hit effect if specified
                if (projectile.hitEffect && this.game.renderer) {
                    this.game.renderer.createParticleSystem({
                        x: projectile.x,
                        y: projectile.y,
                        particleCount: 10,
                        lifetime: 500,
                        color: projectile.hitEffect.color || '#FFFFFF',
                        size: { min: 1, max: 3 },
                        speed: { min: 1, max: 3 }
                    });
                }
            }
        }
        
        // Destroy projectile on terrain hit
        if (other.physicsGroup === 'solid' && projectile.destroyOnTerrain !== false) {
            projectile.active = false;
            this.removeEntity(projectile);
            
            // Create hit effect if specified
            if (projectile.terrainHitEffect && this.game.renderer) {
                this.game.renderer.createParticleSystem({
                    x: projectile.x,
                    y: projectile.y,
                    particleCount: 5,
                    lifetime: 300,
                    color: projectile.terrainHitEffect.color || '#888888',
                    size: { min: 1, max: 2 },
                    speed: { min: 0.5, max: 2 }
                });
            }
        }
    }
    
    /**
     * Handle trigger area collision with player
     */
    handleTriggerCollision(trigger, other, collision) {
        if (other.physicsGroup === 'player' && trigger.onTrigger) {
            trigger.onTrigger(other, this.game);
        }
    }
    
    /**
     * Cast a ray in the physics world
     */
    rayCast(startX, startY, dirX, dirY, maxDistance) {
        // Normalize direction vector
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        if (length === 0) return null;
        
        dirX /= length;
        dirY /= length;
        
        // Set up ray parameters
        const rayStepSize = 2;
        const maxSteps = maxDistance / rayStepSize;
        
        // Current ray position
        let currentX = startX;
        let currentY = startY;
        
        // Step ray through the world
        for (let i = 0; i < maxSteps; i++) {
            // Update ray position
            currentX += dirX * rayStepSize;
            currentY += dirY * rayStepSize;
            
            // Distance traveled
            const distanceTraveled = i * rayStepSize;
            
            // Create a test point with small size
            const testPoint = {
                x: currentX - 1,
                y: currentY - 1,
                width: 2,
                height: 2
            };
            
            // Get potential collisions
            const potentialHits = this.broadphaseGrid.retrieve(testPoint);
            
            // Check for collision with each object
            for (const object of potentialHits) {
                // Skip if object isn't solid
                if (!object.solid) continue;
                
                // AABB collision test
                if (currentX >= object.x && currentX <= object.x + object.width &&
                    currentY >= object.y && currentY <= object.y + object.height) {
                    
                    // Calculate precise hit point
                    return {
                        hit: true,
                        object: object,
                        distance: distanceTraveled,
                        x: currentX,
                        y: currentY,
                        normal: this.calculateSurfaceNormal(object, currentX, currentY)
                    };
                }
            }
            
            // Check if we've reached max distance
            if (distanceTraveled >= maxDistance) {
                break;
            }
        }
        
        // No hit found
        return {
            hit: false,
            distance: maxDistance,
            x: startX + dirX * maxDistance,
            y: startY + dirY * maxDistance
        };
    }
    
    /**
     * Calculate surface normal at hit point
     */
    calculateSurfaceNormal(object, hitX, hitY) {
        // Find closest edge of the object
        const centerX = object.x + object.width / 2;
        const centerY = object.y + object.height / 2;
        
        // Vector from center to hit point
        const dx = hitX - centerX;
        const dy = hitY - centerY;
        
        // Scale to half-dimensions of object
        const sx = dx / (object.width / 2);
        const sy = dy / (object.height / 2);
        
        // Determine which edge is closest
        if (Math.abs(sx) > Math.abs(sy)) {
            // Hit left or right edge
            return { x: sx > 0 ? 1 : -1, y: 0 };
        } else {
            // Hit top or bottom edge
            return { x: 0, y: sy > 0 ? 1 : -1 };
        }
    }
}

/**
 * Spatial grid for broad-phase collision detection
 */
class SpatialGrid {
    constructor(cellSize, width, height) {
        this.cellSize = cellSize;
        this.width = width;
        this.height = height;
        this.grid = {};
    }
    
    /**
     * Get cell index for a position
     */
    getCellIndex(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }
    
    /**
     * Insert an object into the grid
     */
    insert(object) {
        // Calculate grid cells covered by object
        const startX = Math.floor(object.x / this.cellSize);
        const startY = Math.floor(object.y / this.cellSize);
        const endX = Math.floor((object.x + object.width) / this.cellSize);
        const endY = Math.floor((object.y + object.height) / this.cellSize);
        
        // Insert into each covered cell
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const index = `${x},${y}`;
                
                if (!this.grid[index]) {
                    this.grid[index] = [];
                }
                
                // Avoid duplicates
                if (!this.grid[index].includes(object)) {
                    this.grid[index].push(object);
                }
            }
        }
    }
    
    /**
     * Remove an object from the grid
     */
    remove(object) {
        // Calculate grid cells covered by object
        const startX = Math.floor(object.x / this.cellSize);
        const startY = Math.floor(object.y / this.cellSize);
        const endX = Math.floor((object.x + object.width) / this.cellSize);
        const endY = Math.floor((object.y + object.height) / this.cellSize);
        
        // Remove from each covered cell
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const index = `${x},${y}`;
                
                if (this.grid[index]) {
                    const cellIndex = this.grid[index].indexOf(object);
                    if (cellIndex !== -1) {
                        this.grid[index].splice(cellIndex, 1);
                    }
                }
            }
        }
    }
    
    /**
     * Retrieve all objects potentially colliding with given object
     */
    retrieve(object) {
        const result = new Set();
        
        // Calculate grid cells covered by object
        const startX = Math.floor(object.x / this.cellSize);
        const startY = Math.floor(object.y / this.cellSize);
        const endX = Math.floor((object.x + object.width) / this.cellSize);
        const endY = Math.floor((object.y + object.height) / this.cellSize);
        
        // Collect all objects from covered cells
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const index = `${x},${y}`;
                
                if (this.grid[index]) {
                    for (const obj of this.grid[index]) {
                        result.add(obj);
                    }
                }
            }
        }
        
        // Convert Set to Array before returning
        return Array.from(result);
    }
    
    /**
     * Clear all objects from the grid
     */
    clear() {
        this.grid = {};
    }
}