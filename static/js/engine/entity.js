/**
 * Complete the NPC class
 */

// Complete updateWanderBehavior method
updateWanderBehavior(deltaTime, game) {
    // Decrement walk timer
    this.walkTimer -= deltaTime;
    
    if (this.walkTimer <= 0) {
        // Decide whether to walk or stand
        if (Math.random() < 0.3) {
            // Stand idle
            this.velocityX = 0;
            this.velocityY = 0;
            this.setAnimation('idle');
            this.walkTimer = 1000 + Math.random() * 2000; // 1-3 seconds of standing
        } else {
            // Walk in a random direction
            const angle = Math.random() * Math.PI * 2;
            this.walkDirection = {
                x: Math.cos(angle),
                y: Math.sin(angle)
            };
            
            // Set walking animation
            this.setAnimation('walk');
            
            // Set direction based on movement
            if (Math.abs(this.walkDirection.x) > Math.abs(this.walkDirection.y)) {
                this.direction = this.walkDirection.x > 0 ? 'right' : 'left';
            } else {
                this.direction = this.walkDirection.y > 0 ? 'down' : 'up';
            }
            
            // Set duration for this walking session
            this.walkDuration = 500 + Math.random() * 1500; // 0.5-2 seconds of walking
            this.walkTimer = this.walkDuration;
        }
    }
    
    // Apply movement if walking
    if (this.walkTimer > 0 && this.currentAnimation === 'walk') {
        this.velocityX = this.walkDirection.x * this.speed;
        this.velocityY = this.walkDirection.y * this.speed;
        
        // Check if NPC is stuck (e.g., against a wall)
        // If barely moving but should be walking, reset timer to get a new direction faster
        if (Math.abs(this.velocityX) < 0.1 && Math.abs(this.velocityY) < 0.1) {
            this.walkTimer = Math.min(100, this.walkTimer);
        }
    }
    
    // Check boundaries to ensure NPC doesn't wander too far
    const wanderDistance = this.behaviorParams.wanderDistance || 150;
    const origin = this.behaviorParams.origin || { x: this.x, y: this.y };
    
    const dx = this.x - origin.x;
    const dy = this.y - origin.y;
    const distanceFromOrigin = Math.sqrt(dx * dx + dy * dy);
    
    if (distanceFromOrigin > wanderDistance) {
        // Turn back toward origin
        const angle = Math.atan2(origin.y - this.y, origin.x - this.x);
        this.walkDirection = {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
        this.velocityX = this.walkDirection.x * this.speed;
        this.velocityY = this.walkDirection.y * this.speed;
        this.setAnimation('walk');
    }
}

/**
 * Update follow behavior - follow a target entity
 */
updateFollowBehavior(deltaTime, game) {
    const target = game.getEntityById(this.behaviorParams.targetId);
    
    if (!target) {
        // Target not found, stand idle
        this.velocityX = 0;
        this.velocityY = 0;
        this.setAnimation('idle');
        return;
    }
    
    // Calculate direction to target
    const dx = target.x + target.width/2 - (this.x + this.width/2);
    const dy = target.y + target.height/2 - (this.y + this.height/2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Define follow and stop distances
    const followDistance = this.behaviorParams.followDistance || 150;
    const stopDistance = this.behaviorParams.stopDistance || 40;
    
    if (distance > followDistance) {
        // Too far, stop following
        this.velocityX = 0;
        this.velocityY = 0;
        this.setAnimation('idle');
    } else if (distance > stopDistance) {
        // Follow target
        const angle = Math.atan2(dy, dx);
        this.walkDirection = {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
        this.velocityX = this.walkDirection.x * this.speed;
        this.velocityY = this.walkDirection.y * this.speed;
        this.setAnimation('walk');
        
        // Set direction based on movement
        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? 'right' : 'left';
        } else {
            this.direction = dy > 0 ? 'down' : 'up';
        }
    } else {
        // Close enough, stop
        this.velocityX = 0;
        this.velocityY = 0;
        this.setAnimation('idle');
        
        // Face the target
        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? 'right' : 'left';
        } else {
            this.direction = dy > 0 ? 'down' : 'up';
        }
    }
}

/**
 * Update patrol behavior - move between waypoints
 */
updatePatrolBehavior(deltaTime, game) {
    // Get waypoints
    const waypoints = this.behaviorParams.waypoints || [];
    if (waypoints.length === 0) {
        // No waypoints, stand idle
        this.velocityX = 0;
        this.velocityY = 0;
        this.setAnimation('idle');
        return;
    }
    
    // Initialize current waypoint index if not set
    if (this.currentWaypoint === undefined) {
        this.currentWaypoint = 0;
    }
    
    // Get current target waypoint
    const target = waypoints[this.currentWaypoint];
    
    // Calculate direction to waypoint
    const dx = target.x - (this.x + this.width/2);
    const dy = target.y - (this.y + this.height/2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Define the distance threshold to consider a waypoint reached
    const waypointReachedDistance = this.behaviorParams.waypointReachedDistance || 10;
    
    if (distance <= waypointReachedDistance) {
        // Waypoint reached, move to next waypoint
        this.currentWaypoint = (this.currentWaypoint + 1) % waypoints.length;
        
        // Check if we should pause at this waypoint
        if (target.pauseDuration) {
            this.velocityX = 0;
            this.velocityY = 0;
            this.setAnimation('idle');
            
            // Set timer for pause
            this.walkTimer = target.pauseDuration;
            
            // Save info that we're pausing
            this.patrolPausing = true;
            return;
        }
    }
    
    // Check if we're in a patrol pause
    if (this.patrolPausing) {
        this.walkTimer -= deltaTime;
        if (this.walkTimer <= 0) {
            this.patrolPausing = false;
        } else {
            // Still pausing
            return;
        }
    }
    
    // Move toward current waypoint
    if (distance > waypointReachedDistance) {
        const angle = Math.atan2(dy, dx);
        this.walkDirection = {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
        this.velocityX = this.walkDirection.x * this.speed;
        this.velocityY = this.walkDirection.y * this.speed;
        this.setAnimation('walk');
        
        // Set direction based on movement
        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? 'right' : 'left';
        } else {
            this.direction = dy > 0 ? 'down' : 'up';
        }
    }
}

/**
 * Handle interaction with NPC
 */
onInteract(player, game) {
    // Show talking animation
    this.setAnimation('talk');
    this.isTalking = true;
    
    // Face toward the player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        this.direction = dx > 0 ? 'right' : 'left';
    } else {
        this.direction = dy > 0 ? 'down' : 'up';
    }
    
    // If NPC is a quest giver, handle quest interaction
    if (this.questGiver && this.quest) {
        this.handleQuestInteraction(player, game);
        return;
    }
    
    // If NPC is a shopkeeper, open shop
    if (this.shopkeeper) {
        this.openShop(player, game);
        return;
    }
    
    // Handle normal dialogue
    if (this.dialogues.length > 0) {
        // Get current dialogue
        const dialogue = this.dialogues[this.currentDialogue];
        
        // Display dialogue
        game.showDialogue({
            speaker: this.name,
            text: dialogue.text,
            options: dialogue.options,
            onComplete: () => {
                // Move to next dialogue if there are no options
                if (!dialogue.options || dialogue.options.length === 0) {
                    this.currentDialogue = (this.currentDialogue + 1) % this.dialogues.length;
                }
                
                // Return to idle animation
                setTimeout(() => {
                    this.setAnimation('idle');
                    this.isTalking = false;
                }, 500);
            }
        });
    }
}

/**
 * Handle shop interaction
 */
openShop(player, game) {
    game.showShop({
        shopkeeper: this,
        items: this.inventory,
        onClose: () => {
            setTimeout(() => {
                this.setAnimation('idle');
                this.isTalking = false;
            }, 500);
        }
    });
}

/**
 * Handle quest interaction
 */
handleQuestInteraction(player, game) {
    const quest = this.quest;
    
    // Check if player already has this quest
    const playerHasQuest = player.hasQuest(quest.id);
    
    if (!playerHasQuest) {
        // Offer quest
        game.showDialogue({
            speaker: this.name,
            text: quest.description,
            options: [
                { text: "Accept", action: () => player.acceptQuest(quest) },
                { text: "Decline", action: () => {} }
            ],
            onComplete: () => {
                setTimeout(() => {
                    this.setAnimation('idle');
                    this.isTalking = false;
                }, 500);
            }
        });
    } else {
        // Check if quest is completed
        const isCompleted = player.isQuestCompleted(quest.id);
        
        if (isCompleted) {
            // Quest completed dialogue
            game.showDialogue({
                speaker: this.name,
                text: quest.completionText,
                onComplete: () => {
                    // Give rewards
                    player.completeQuest(quest.id);
                    
                    setTimeout(() => {
                        this.setAnimation('idle');
                        this.isTalking = false;
                    }, 500);
                }
            });
        } else {
            // Quest in progress dialogue
            game.showDialogue({
                speaker: this.name,
                text: quest.inProgressText,
                onComplete: () => {
                    setTimeout(() => {
                        this.setAnimation('idle');
                        this.isTalking = false;
                    }, 500);
                }
            });
        }
    }
}

/**
 * Enemy entity class
 */
class Enemy extends Entity {
    constructor(options = {}) {
        super(Object.assign({
            name: 'Enemy',
            type: 'enemy',
            sprite: 'enemy',
            width: 32,
            height: 32,
            animations: {
                idle: { frames: 1, row: 0 },
                walk: { frames: 4, row: 1 },
                attack: { frames: 3, row: 2 },
                hurt: { frames: 1, row: 3 },
                die: { frames: 4, row: 4 }
            }
        }, options));
        
        // Enemy specific properties
        this.health = options.health || 50;
        this.maxHealth = options.maxHealth || 50;
        this.damage = options.damage || 10;
        this.attackRange = options.attackRange || 25;
        this.detectionRange = options.detectionRange || 200;
        this.attackCooldown = 0;
        this.attackSpeed = options.attackSpeed || 1000; // ms
        this.state = 'idle'; // idle, chase, attack, hurt, die
        this.aggroTarget = null;
        this.loot = options.loot || [];
        this.experienceValue = options.experienceValue || 10;
        this.dead = false;
    }
    
    /**
     * Update enemy
     */
    update(deltaTime, game) {
        if (this.dead) return;
        
        // Update cooldowns
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // Update state machine
        switch (this.state) {
            case 'idle':
                this.updateIdleState(deltaTime, game);
                break;
            case 'chase':
                this.updateChaseState(deltaTime, game);
                break;
            case 'attack':
                this.updateAttackState(deltaTime, game);
                break;
            case 'hurt':
                // Do nothing in hurt state, animation will trigger state change
                break;
            case 'die':
                // Do nothing in die state
                break;
        }
        
        // Call parent update for physics and animation
        super.update(deltaTime, game);
    }
    
    /**
     * Update idle state - look for targets
     */
    updateIdleState(deltaTime, game) {
        // Look for player to aggro
        const player = game.renderer.layers.entities.find(e => e.isPlayer);
        if (player) {
            const dx = player.x + player.width/2 - (this.x + this.width/2);
            const dy = player.y + player.height/2 - (this.y + this.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.detectionRange) {
                // Player detected, switch to chase state
                this.aggroTarget = player;
                this.setState('chase');
                return;
            }
        }
        
        // Random movement if no target
        this.walkTimer = this.walkTimer || 0;
        this.walkTimer -= deltaTime;
        
        if (this.walkTimer <= 0) {
            if (Math.random() < 0.3) {
                // Stand still
                this.velocityX = 0;
                this.velocityY = 0;
                this.setAnimation('idle');
                this.walkTimer = 1000 + Math.random() * 2000;
            } else {
                // Random walk
                const angle = Math.random() * Math.PI * 2;
                const dirX = Math.cos(angle);
                const dirY = Math.sin(angle);
                
                this.velocityX = dirX * this.speed * 0.5; // Slower in idle mode
                this.velocityY = dirY * this.speed * 0.5;
                this.setAnimation('walk');
                this.walkTimer = 500 + Math.random() * 1000;
            }
        }
    }
    
    /**
     * Update chase state - pursue target
     */
    updateChaseState(deltaTime, game) {
        // Check if target still exists
        const target = this.aggroTarget;
        if (!target || !target.active || target.health <= 0) {
            this.aggroTarget = null;
            this.setState('idle');
            return;
        }
        
        // Calculate distance to target
        const dx = target.x + target.width/2 - (this.x + this.width/2);
        const dy = target.y + target.height/2 - (this.y + this.height/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if target is still in detection range
        if (distance > this.detectionRange * 1.5) {
            // Lost target, go back to idle
            this.aggroTarget = null;
            this.setState('idle');
            return;
        }
        
        // Check if in attack range
        if (distance <= this.attackRange) {
            this.setState('attack');
            return;
        }
        
        // Move toward target
        const angle = Math.atan2(dy, dx);
        this.velocityX = Math.cos(angle) * this.speed;
        this.velocityY = Math.sin(angle) * this.speed;
        this.setAnimation('walk');
        
        // Set direction based on movement
        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? 'right' : 'left';
        } else {
            this.direction = dy > 0 ? 'down' : 'up';
        }
    }
    
    /**
     * Update attack state
     */
    updateAttackState(deltaTime, game) {
        // Reset velocity
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Check if target still exists
        const target = this.aggroTarget;
        if (!target || !target.active || target.health <= 0) {
            this.aggroTarget = null;
            this.setState('idle');
            return;
        }
        
        // Calculate distance to target
        const dx = target.x + target.width/2 - (this.x + this.width/2);
        const dy = target.y + target.height/2 - (this.y + this.height/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Set direction toward target
        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? 'right' : 'left';
        } else {
            this.direction = dy > 0 ? 'down' : 'up';
        }
        
        // Check if target moved out of attack range
        if (distance > this.attackRange) {
            this.setState('chase');
            return;
        }
        
        // Attack if cooldown expired
        if (this.attackCooldown <= 0) {
            this.setAnimation('attack');
            this.attackCooldown = this.attackSpeed;
            
            // Deal damage to target
            if (target.takeDamage) {
                target.takeDamage(this.damage, this);
            }
        } else {
            // Check if attack animation finished
            if (this.currentAnimation !== 'attack') {
                this.setAnimation('idle');
            }
        }
    }
    
    /**
     * Change enemy state
     */
    setState(newState) {
        this.state = newState;
        
        switch (newState) {
            case 'idle':
                this.setAnimation('idle');
                break;
            case 'chase':
                this.setAnimation('walk');
                break;
            case 'attack':
                this.setAnimation('attack');
                break;
            case 'hurt':
                this.setAnimation('hurt');
                // Auto-transition back to chase after hurt animation
                setTimeout(() => {
                    if (this.state === 'hurt') {
                        this.setState('chase');
                    }
                }, 300);
                break;
            case 'die':
                this.setAnimation('die');
                this.dead = true;
                this.solid = false;
                break;
        }
    }
    
    /**
     * Take damage
     */
    takeDamage(amount, source) {
        if (this.dead) return 0;
        
        this.health = Math.max(0, this.health - amount);
        
        // Set aggro on damage source if it's an entity
        if (source && source.id) {
            this.aggroTarget = source;
        }
        
        // Change state based on health
        if (this.health <= 0) {
            this.setState('die');
            this.onDeath(source);
        } else {
            this.setState('hurt');
        }
        
        return this.health;
    }
    
    /**
     * Handle enemy death
     */
    onDeath(killer) {
        // Drop loot
        this.dropLoot();
        
        // Give experience to killer if it's a player
        if (killer && killer.isPlayer && killer.addExperience) {
            killer.addExperience(this.experienceValue);
        }
        
        // Remove enemy after death animation
        setTimeout(() => {
            // Send event for enemy death
            const event = new CustomEvent('enemy-death', {
                detail: { enemy: this, killer: killer }
            });
            document.dispatchEvent(event);
            
            // Mark for removal
            this.active = false;
        }, 1000); // Adjust based on death animation length
    }
    
    /**
     * Drop loot on death
     */
    dropLoot() {
        // Implement loot dropping logic
        // This would typically create item objects at the enemy's position
    }
}

/**
 * Item entity class (for items in the world)
 */
class Item extends Entity {
    constructor(options = {}) {
        super(Object.assign({
            name: 'Item',
            type: 'item',
            sprite: 'objects',
            width: 24,
            height: 24,
            interactable: true,
            solid: false
        }, options));
        
        // Item specific properties
        this.itemType = options.itemType || 'misc'; // weapon, armor, potion, misc
        this.value = options.value || 0;
        this.stackable = options.stackable !== undefined ? options.stackable : false;
        this.quantity = options.quantity || 1;
        this.description = options.description || '';
        this.stats = options.stats || {};
        this.consumable = options.consumable || false;
        this.useEffect = options.useEffect || null;
        this.equipSlot = options.equipSlot || null;
        this.pickupSound = options.pickupSound || 'pickup';
        
        // Visual effects for items
        this.floatHeight = 0;
        this.floatSpeed = 0.001;
    }
    
    /**
     * Update item entity
     */
    update(deltaTime, game) {
        super.update(deltaTime, game);
        
        // Floating animation
        this.floatHeight = (Math.sin(performance.now() * this.floatSpeed) + 1) * 3;
    }
    
    /**
     * Render with floating effect
     */
    render(ctx, deltaTime) {
        // Save original y position
        const originalY = this.y;
        
        // Apply floating offset
        this.y -= this.floatHeight;
        
        // Let the renderer do the actual drawing
        // (this custom render method will be called by the renderer)
        
        // Restore original position
        this.y = originalY;
    }
    
    /**
     * Handle interaction (pickup)
     */
    onInteract(player, game) {
        // Add item to player inventory
        if (player.addItem) {
            const itemData = {
                id: this.id,
                name: this.name,
                itemType: this.itemType,
                value: this.value,
                stackable: this.stackable,
                quantity: this.quantity,
                description: this.description,
                stats: {...this.stats},
                consumable: this.consumable,
                useEffect: this.useEffect,
                equipSlot: this.equipSlot,
                spriteX: this.spriteX,
                spriteY: this.spriteY
            };
            
            player.addItem(itemData);
            
            // Play pickup sound
            game.playSound(this.pickupSound);
            
            // Remove item from world
            this.active = false;
            
            // Send event for item pickup
            const event = new CustomEvent('item-pickup', {
                detail: { item: this, player: player }
            });
            document.dispatchEvent(event);
        }
    }
}

/**
 * Projectile entity class
 */
class Projectile extends Entity {
    constructor(options = {}) {
        super(Object.assign({
            name: 'Projectile',
            type: 'projectile',
            sprite: 'effects',
            width: 16,
            height: 16,
            solid: false
        }, options));
        
        // Projectile specific properties
        this.sourceId = options.sourceId || null;
        this.damage = options.damage || 10;
        this.speed = options.speed || 5;
        this.direction = options.direction || { x: 1, y: 0 };
        this.lifetime = options.lifetime || 2000; // milliseconds
        this.piercing = options.piercing || false;
        this.hitEntities = [];
        this.hitEffect = options.hitEffect || null;
        this.trailEffect = options.trailEffect || null;
        this.trailFrequency = options.trailFrequency || 100; // ms
        this.lastTrailTime = 0;
    }
    
    /**
     * Update projectile
     */
    update(deltaTime, game) {
        // Apply movement based on direction and speed
        this.velocityX = this.direction.x * this.speed;
        this.velocityY = this.direction.y * this.speed;
        
        // Update lifetime
        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) {
            this.destroy(game);
            return;
        }
        
        // Create trail effect
        if (this.trailEffect && performance.now() - this.lastTrailTime > this.trailFrequency) {
            this.createTrailEffect(game);
            this.lastTrailTime = performance.now();
        }
        
        // Call parent update for physics
        super.update(deltaTime, game);
        
        // Check for collisions with entities
        this.checkHitEntities(game);
        
        // Check for collisions with terrain
        this.checkTerrainCollisions(game);
    }
    
    /**
     * Check for collisions with entities
     */
    checkHitEntities(game) {
        for (const entity of game.renderer.layers.entities) {
            // Skip non-solid, inactive entities or entities already hit
            if (!entity.solid || !entity.active || this.hitEntities.includes(entity.id)) {
                continue;
            }
            
            // Skip source entity
            if (entity.id === this.sourceId) {
                continue;
            }
            
            // Skip entities of same type as source (if friendly fire is off)
            const sourceEntity = game.getEntityById(this.sourceId);
            if (sourceEntity && sourceEntity.type === entity.type && !this.friendlyFire) {
                continue;
            }
            
            // Check collision
            const dx = entity.x + entity.width/2 - (this.x + this.width/2);
            const dy = entity.y + entity.height/2 - (this.y + this.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = (this.width + entity.width) / 3; // Smaller hitbox for projectiles
            
            if (distance < minDistance) {
                // Hit entity
                this.hitEntity(entity, game);
                
                // If not piercing, destroy after first hit
                if (!this.piercing) {
                    this.destroy(game);
                    return;
                } else {
                    // Mark entity as hit to prevent multiple hits
                    this.hitEntities.push(entity.id);
                }
            }
        }
    }
    
    /**
     * Handle hitting an entity
     */
    hitEntity(entity, game) {
        // Apply damage if entity can take damage
        if (entity.takeDamage) {
            entity.takeDamage(this.damage, game.getEntityById(this.sourceId));
        }
        
        // Create hit effect if specified
        if (this.hitEffect) {
            this.createHitEffect(game, entity.x + entity.width/2, entity.y + entity.height/2);
        }
    }
    
    /**
     * Create hit effect particles
     */
    createHitEffect(game, x, y) {
        // Create particle effect at hit location
        game.renderer.createParticleSystem({
            x: x,
            y: y,
            particleCount: 10,
            lifetime: 300,
            color: this.hitEffect.color || 'rgba(255, 200, 50, 1)',
            size: { min: 2, max: 5 },
            speed: { min: 1, max: 3 },
            gravity: 0.1
        });
    }
    
    /**
     * Create trail effect particles
     */
    createTrailEffect(game) {
        // Create particle effect along projectile path
        game.renderer.createParticleSystem({
            x: this.x + this.width/2,
            y: this.y + this.height/2,
            particleCount: 3,
            lifetime: 300,
            color: this.trailEffect.color || 'rgba(255, 200, 50, 0.7)',
            size: { min: 1, max: 3 },
            speed: { min: 0.2, max: 0.5 },
            gravity: 0
        });
    }
    
    /**
     * Check collision with terrain
     */
    checkTerrainCollisions(game) {
        const tileSize = game.renderer.tileSize;
        const tileMap = game.renderer.layers.terrain;
        
        if (!tileMap || !tileMap.length) return;
        
        // Get tile at projectile center
        const tileX = Math.floor((this.x + this.width/2) / tileSize);
        const tileY = Math.floor((this.y + this.height/2) / tileSize);
        
        // Skip out of bounds
        if (tileY < 0 || tileY >= tileMap.length || tileX < 0 || tileX >= tileMap[0].length) {
            return;
        }
        
        const tile = tileMap[tileY][tileX];
        
        // Check if tile is solid
        if (this.isSolidTile(tile)) {
            // Create hit effect if specified
            if (this.hitEffect) {
                this.createHitEffect(
                    game, 
                    tileX * tileSize + tileSize/2, 
                    tileY * tileSize + tileSize/2
                );
            }
            
            // Destroy projectile on terrain hit
            this.destroy(game);
        }
    }
    
    /**
     * Destroy projectile
     */
    destroy(game) {
        this.active = false;
    }
}

/**
 * Interactive object class (doors, chests, levers, etc.)
 */
class InteractiveObject extends Entity {
    constructor(options = {}) {
        super(Object.assign({
            name: 'Object',
            type: 'object',
            sprite: 'objects',
            width: 32,
            height: 32,
            interactable: true
        }, options));
        
        // Interactive object properties
        this.state = options.state || 'closed'; // closed, open, locked, etc.
        this.stateSprites = options.stateSprites || {
            closed: { x: 0, y: 0 },
            open: { x: 32, y: 0 },
            locked: { x: 64, y: 0 }
        };
        this.requiresKey = options.requiresKey || false;
        this.keyId = options.keyId || null;
        this.toggleable = options.toggleable !== undefined ? options.toggleable : true;
        this.activateSound = options.activateSound || 'activate';
        this.lockedSound = options.lockedSound || 'locked';
        this.content = options.content || [];
        this.triggerId = options.triggerId || null;
        this.dialogues = options.dialogues || [];
        this.currentDialogue = 0;
    }
    
    /**
     * Update object sprite based on state
     */
    update(deltaTime, game) {
        super.update(deltaTime, game);
        
        // Update sprite based on state
        const stateSprite = this.stateSprites[this.state];
        if (stateSprite) {
            this.spriteX = stateSprite.x;
            this.spriteY = stateSprite.y;
        }
    }
    
    /**
     * Handle interaction with object
     */
    onInteract(player, game) {
        switch (this.type) {
            case 'door':
                this.handleDoorInteraction(player, game);
                break;
            case 'chest':
                this.handleChestInteraction(player, game);
                break;
            case 'lever':
            case 'switch':
                this.handleSwitchInteraction(player, game);
                break;
            case 'sign':
                this.handleSignInteraction(player, game);
                break;
            default:
                // Generic interaction
                if (this.state === 'locked' && this.requiresKey) {
                    // Check if player has the key
                    const hasKey = player.inventory.some(item => item.id === this.keyId);
                    
                    if (hasKey) {
                        // Use the key
                        player.removeItem(this.keyId);
                        this.state = 'closed';
                        game.playSound(this.activateSound);
                    } else {
                        // Show locked message
                        game.showMessage("It's locked. You need a key.");
                        game.playSound(this.lockedSound);
                    }
                } else if (this.state === 'closed') {
                    // Open the object
                    this.state = 'open';
                    game.playSound(this.activateSound);
                    
                    // Trigger any associated event
                    if (this.triggerId) {
                        game.triggerEvent(this.triggerId, this);
                    }
                } else if (this.state === 'open' && this.toggleable) {
                    // Close the object
                    this.state = 'closed';
                    game.playSound(this.activateSound);
                }
                break;
        }
    }
    
    /**
     * Handle door interaction
     */
    handleDoorInteraction(player, game) {
        if (this.state === 'locked' && this.requiresKey) {
            // Check if player has the key
            const hasKey = player.inventory.some(item => item.id === this.keyId);
            
            if (hasKey) {
                // Use the key
                player.removeItem(this.keyId);
                this.state = 'closed';
                game.playSound(this.activateSound);
            } else {
                // Show locked message
                game.showMessage("The door is locked. You need a key.");
                game.playSound(this.lockedSound);
            }
        } else if (this.state === 'closed') {
            // Open the door
            this.state = 'open';
            this.solid = false; // Door no longer blocks movement
            game.playSound(this.activateSound);
            
            // Trigger any associated event
            if (this.triggerId) {
                game.triggerEvent(this.triggerId, this);
            }
        } else if (this.state === 'open' && this.toggleable) {
            // Close the door
            this.state = 'closed';
            this.solid = true; // Door blocks movement
            game.playSound(this.activateSound);
        }
    }
    
    /**
     * Handle chest interaction
     */
    handleChestInteraction(player, game) {
        if (this.state === 'locked' && this.requiresKey) {
            // Check if player has the key
            const hasKey = player.inventory.some(item => item.id === this.keyId);
            
            if (hasKey) {
                // Use the key
                player.removeItem(this.keyId);
                this.state = 'closed';
                game.playSound(this.activateSound);
            } else {
                // Show locked message
                game.showMessage("The chest is locked. You need a key.");
                game.playSound(this.lockedSound);
            }
        } else if (this.state === 'closed') {
            // Open the chest
            this.state = 'open';
            game.playSound(this.activateSound);
            
            // Give content to player
            if (this.content.length > 0) {
                let message = "You found:";
                
                for (const item of this.content) {
                    player.addItem(item);
                    message += `\n- ${item.name}`;
                }
                
                game.showMessage(message);
                
                // Empty the chest
                this.content = [];
            }
            
            // Trigger any associated event
            if (this.triggerId) {
                game.triggerEvent(this.triggerId, this);
            }
        }
    }
    
    /**
     * Handle switch/lever interaction
     */
    handleSwitchInteraction(player, game) {
        // Toggle switch state
        this.state = this.state === 'closed' ? 'open' : 'closed';
        game.playSound(this.activateSound);
        
        // Trigger associated event
        if (this.triggerId) {
            game.triggerEvent(this.triggerId, this);
        }
    }
    
    /**
     * Handle sign interaction
     */
    handleSignInteraction(player, game) {
        // Show sign text
        if (this.dialogues.length > 0) {
            // Get current dialogue
            const dialogue = this.dialogues[this.currentDialogue];
            
            // Display dialogue without speaker
            game.showDialogue({
                text: dialogue.text,
                options: dialogue.options,
                onComplete: () => {
                    // Move to next dialogue if there are no options
                    if (!dialogue.options || dialogue.options.length === 0) {
                        this.currentDialogue = (this.currentDialogue + 1) % this.dialogues.length;
                    }
                }
            });
        }
    }
}