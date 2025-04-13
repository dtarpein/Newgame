/**
 * Game Renderer
 * Handles all canvas rendering operations
 */
class GameRenderer {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Renderer settings
        this.tileSize = options.tileSize || 32;
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1,
            targetX: 0,
            targetY: 0,
            targetZoom: 1,
            speed: 0.1
        };
        
        // Layers for rendering different elements
        this.layers = {
            background: [],   // Static background elements
            terrain: [],      // Map tiles
            objects: [],      // Interactive objects
            entities: [],     // Characters, NPCs, enemies
            weather: [],      // Weather effects
            particles: [],    // Particle effects
            ui: []            // UI elements drawn on canvas
        };
        
        // Resource management
        this.sprites = {};
        this.animations = {};
        this.tileset = null;
        this.tilesetLoaded = false;
        
        // Performance tracking
        this.lastRenderTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // Resize handler to maintain proper scaling
        window.addEventListener('resize', this._handleResize.bind(this));
        this._handleResize();
        
        // Animation frame ID for cancellation
        this.animationFrameId = null;
    }
    
    /**
     * Initialize the renderer and load resources
     */
    init() {
        // Load resources (tilesets, sprites, etc.)
        this._loadResources();
        
        // Start the render loop
        this.startRenderLoop();
        
        return this;
    }
    
    /**
     * Load required image resources
     */
    _loadResources() {
        // Load tileset
        this.tileset = new Image();
        this.tileset.src = '/static/assets/tiles/tileset.png';
        this.tileset.onload = () => {
            this.tilesetLoaded = true;
            console.log("Tileset loaded");
        };
        
        // Load character sprites
        const characterSprite = new Image();
        characterSprite.src = '/static/assets/sprites/character.png';
        characterSprite.onload = () => {
            this.sprites.character = characterSprite;
            console.log("Character sprite loaded");
        };
        
        // Load NPC sprites
        const npcSprite = new Image();
        npcSprite.src = '/static/assets/sprites/npc.png';
        npcSprite.onload = () => {
            this.sprites.npc = npcSprite;
            console.log("NPC sprite loaded");
        };
        
        // Load object sprites
        const objectsSprite = new Image();
        objectsSprite.src = '/static/assets/sprites/objects.png';
        objectsSprite.onload = () => {
            this.sprites.objects = objectsSprite;
            console.log("Objects sprite loaded");
        };
        
        // Load weather effect sprites
        const weatherSprite = new Image();
        weatherSprite.src = '/static/assets/sprites/weather.png';
        weatherSprite.onload = () => {
            this.sprites.weather = weatherSprite;
            console.log("Weather sprite loaded");
        };
        
        // Load UI elements
        const uiSprite = new Image();
        uiSprite.src = '/static/assets/sprites/ui.png';
        uiSprite.onload = () => {
            this.sprites.ui = uiSprite;
            console.log("UI sprite loaded");
        };
    }
    
    /**
     * Start the rendering loop
     */
    startRenderLoop() {
        const loop = (timestamp) => {
            // Calculate delta time for smooth animations
            const deltaTime = timestamp - this.lastRenderTime;
            this.lastRenderTime = timestamp;
            
            // Update FPS counter
            this.frameCount++;
            if (timestamp - this.lastFpsUpdate >= 1000) {
                this.fps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsUpdate));
                this.lastFpsUpdate = timestamp;
                this.frameCount = 0;
            }
            
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Update camera position with smooth interpolation
            this._updateCamera(deltaTime);
            
            // Render all layers
            this._renderLayers(deltaTime);
            
            // Draw FPS counter if debug mode
            if (window.DEBUG_MODE) {
                this._drawFpsCounter();
            }
            
            // Continue the loop
            this.animationFrameId = requestAnimationFrame(loop);
        };
        
        // Start the loop
        this.animationFrameId = requestAnimationFrame(loop);
    }
    
    /**
     * Stop the rendering loop
     */
    stopRenderLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    /**
     * Smoothly update camera position
     */
    _updateCamera(deltaTime) {
        // Smooth camera movement using interpolation
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.speed;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.speed;
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * this.camera.speed;
    }
    
    /**
     * Set camera target position
     */
    setCameraTarget(x, y, immediate = false) {
        this.camera.targetX = x;
        this.camera.targetY = y;
        
        if (immediate) {
            this.camera.x = x;
            this.camera.y = y;
        }
    }
    
    /**
     * Set camera zoom level
     */
    setCameraZoom(zoom, immediate = false) {
        this.camera.targetZoom = Math.max(0.5, Math.min(2, zoom));
        
        if (immediate) {
            this.camera.zoom = this.camera.targetZoom;
        }
    }
    
    /**
     * Handle window resize
     */
    _handleResize() {
        // Adjust canvas size to fit container while maintaining aspect ratio
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
    }
    
    /**
     * Render all layers in order
     */
    _renderLayers(deltaTime) {
        // Apply camera transformations
        this.ctx.save();
        
        // Translate and scale based on camera
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Render each layer in order
        this._renderBackground(deltaTime);
        this._renderTerrain(deltaTime);
        this._renderObjects(deltaTime);
        this._renderEntities(deltaTime);
        this._renderParticles(deltaTime);
        this._renderWeather(deltaTime);
        
        // Restore context for UI layer
        this.ctx.restore();
        
        // Render UI without camera transformations
        this._renderUI(deltaTime);
    }
    
    /**
     * Render the background layer
     */
    _renderBackground(deltaTime) {
        // Implement background rendering (sky, distant mountains, etc.)
        // This layer is typically static or has very slow parallax scrolling
    }
    
    /**
     * Render the terrain layer (map tiles)
     */
    _renderTerrain(deltaTime) {
        if (!this.tilesetLoaded || !this.layers.terrain.length) {
            return;
        }
        
        const tileMap = this.layers.terrain;
        
        // Calculate visible tile range
        const startX = Math.max(0, Math.floor((this.camera.x - this.canvas.width / (2 * this.camera.zoom)) / this.tileSize));
        const startY = Math.max(0, Math.floor((this.camera.y - this.canvas.height / (2 * this.camera.zoom)) / this.tileSize));
        const endX = Math.min(tileMap[0].length - 1, Math.ceil((this.camera.x + this.canvas.width / (2 * this.camera.zoom)) / this.tileSize));
        const endY = Math.min(tileMap.length - 1, Math.ceil((this.camera.y + this.canvas.height / (2 * this.camera.zoom)) / this.tileSize));
        
        // Render visible tiles
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const tile = tileMap[y][x];
                const tileX = x * this.tileSize;
                const tileY = y * this.tileSize;
                
                // Get tile sprite from tileset based on tile type
                const tilesetX = this._getTilesetCoord(tile).x;
                const tilesetY = this._getTilesetCoord(tile).y;
                
                // Draw the tile
                this.ctx.drawImage(
                    this.tileset,
                    tilesetX, tilesetY, 32, 32,  // Source coordinates and dimensions
                    tileX, tileY, this.tileSize, this.tileSize  // Destination coordinates and dimensions
                );
            }
        }
    }
    
    /**
     * Get tileset coordinates for a specific tile type
     */
    _getTilesetCoord(tileType) {
        // Map tile types to positions in the tileset
        const tileMapping = {
            'grass': { x: 0, y: 0 },
            'water': { x: 32, y: 0 },
            'forest': { x: 64, y: 0 },
            'mountain': { x: 96, y: 0 },
            'sand': { x: 128, y: 0 },
            'rock': { x: 160, y: 0 },
            'snow': { x: 192, y: 0 },
            'path': { x: 0, y: 32 },
            'wall': { x: 32, y: 32 },
            'door': { x: 64, y: 32 },
            'stone': { x: 96, y: 32 },
            'swamp': { x: 128, y: 32 },
            'cactus': { x: 160, y: 32 },
            'dune': { x: 192, y: 32 },
            'building': { x: 0, y: 64 },
            'corridor': { x: 32, y: 64 },
            'well': { x: 64, y: 64 },
            'tree': { x: 96, y: 64 }
        };
        
        // Return the coordinates or default to grass if tile type not found
        return tileMapping[tileType] || tileMapping['grass'];
    }
    
    /**
     * Render objects layer (items, trees, buildings, etc.)
     */
    _renderObjects(deltaTime) {
        for (const object of this.layers.objects) {
            if (!this._isInViewport(object)) continue;
            
            if (object.render) {
                // If object has custom render method, use it
                object.render(this.ctx, deltaTime);
            } else if (object.sprite && this.sprites[object.sprite]) {
                // Default rendering for objects with sprite
                const x = object.x;
                const y = object.y;
                const width = object.width || this.tileSize;
                const height = object.height || this.tileSize;
                
                this.ctx.drawImage(
                    this.sprites[object.sprite],
                    object.spriteX || 0, object.spriteY || 0, 
                    object.spriteWidth || 32, object.spriteHeight || 32,
                    x, y, width, height
                );
            }
        }
    }
    
    /**
     * Render entities layer (characters, NPCs, monsters)
     */
    _renderEntities(deltaTime) {
        for (const entity of this.layers.entities) {
            if (!this._isInViewport(entity)) continue;
            
            if (entity.render) {
                // If entity has custom render method, use it
                entity.render(this.ctx, deltaTime);
            } else if (entity.sprite && this.sprites[entity.sprite]) {
                // Default rendering for entities with sprite
                const x = entity.x;
                const y = entity.y;
                const width = entity.width || this.tileSize;
                const height = entity.height || this.tileSize;
                
                // Check if entity has animation
                if (entity.animation && entity.animationFrame !== undefined) {
                    const frameX = entity.animationFrame * (entity.spriteWidth || 32);
                    
                    this.ctx.drawImage(
                        this.sprites[entity.sprite],
                        frameX, entity.spriteY || 0, 
                        entity.spriteWidth || 32, entity.spriteHeight || 32,
                        x, y, width, height
                    );
                } else {
                    // Static sprite
                    this.ctx.drawImage(
                        this.sprites[entity.sprite],
                        entity.spriteX || 0, entity.spriteY || 0, 
                        entity.spriteWidth || 32, entity.spriteHeight || 32,
                        x, y, width, height
                    );
                }
                
                // Draw entity name or health bar if needed
                if (entity.name) {
                    this._drawEntityName(entity);
                }
                
                if (entity.health !== undefined && entity.maxHealth !== undefined) {
                    this._drawHealthBar(entity);
                }
            }
        }
    }
    
    /**
     * Draw entity name above the entity
     */
    _drawEntityName(entity) {
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 3;
        
        const x = entity.x + (entity.width || this.tileSize) / 2;
        const y = entity.y - 10;
        
        this.ctx.strokeText(entity.name, x, y);
        this.ctx.fillText(entity.name, x, y);
    }
    
    /**
     * Draw health bar above the entity
     */
    _drawHealthBar(entity) {
        const barWidth = entity.width || this.tileSize;
        const barHeight = 5;
        const x = entity.x;
        const y = entity.y - 20;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, barWidth, barHeight);
        
        // Health fill
        const healthPercentage = entity.health / entity.maxHealth;
        this.ctx.fillStyle = healthPercentage > 0.5 ? '#2ecc71' : (healthPercentage > 0.25 ? '#f39c12' : '#e74c3c');
        this.ctx.fillRect(x, y, barWidth * healthPercentage, barHeight);
    }
    
    /**
     * Render particles layer
     */
    _renderParticles(deltaTime) {
        // Update and render all particle systems
        for (const particleSystem of this.layers.particles) {
            if (particleSystem.update) {
                particleSystem.update(deltaTime);
            }
            
            if (particleSystem.render) {
                particleSystem.render(this.ctx);
            }
        }
    }
    
    /**
     * Render weather effects
     */
    _renderWeather(deltaTime) {
        for (const effect of this.layers.weather) {
            if (effect.render) {
                effect.render(this.ctx, deltaTime);
            }
        }
    }
    
    /**
     * Render UI elements (fixed to screen, not affected by camera)
     */
    _renderUI(deltaTime) {
        for (const element of this.layers.ui) {
            if (element.render) {
                element.render(this.ctx, deltaTime);
            }
        }
        
        // If minimap is enabled, render it
        if (this.minimap && this.minimapEnabled) {
            this._renderMinimap();
        }
    }
    
    /**
     * Render minimap in corner of screen
     */
    _renderMinimap() {
        const mapSize = 150;
        const padding = 10;
        const x = this.canvas.width - mapSize - padding;
        const y = padding;
        
        // Draw minimap background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, mapSize, mapSize);
        
        // Draw minimap border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, mapSize, mapSize);
        
        // Draw minimap content if we have terrain data
        if (this.layers.terrain.length > 0) {
            const mapWidth = this.layers.terrain[0].length;
            const mapHeight = this.layers.terrain.length;
            
            // Calculate scaling to fit in minimap
            const scaleX = mapSize / (mapWidth * this.tileSize);
            const scaleY = mapSize / (mapHeight * this.tileSize);
            
            // Draw each terrain tile as a small dot
            for (let ty = 0; ty < mapHeight; ty++) {
                for (let tx = 0; tx < mapWidth; tx++) {
                    const tile = this.layers.terrain[ty][tx];
                    const miniX = x + tx * scaleX * this.tileSize;
                    const miniY = y + ty * scaleY * this.tileSize;
                    const miniSize = Math.max(1, this.tileSize * scaleX);
                    
                    // Set color based on tile type
                    this.ctx.fillStyle = this._getTileColor(tile);
                    this.ctx.fillRect(miniX, miniY, miniSize, miniSize);
                }
            }
            
            // Draw player position
            const player = this.layers.entities.find(e => e.isPlayer);
            if (player) {
                const playerX = x + (player.x / this.tileSize) * scaleX * this.tileSize;
                const playerY = y + (player.y / this.tileSize) * scaleY * this.tileSize;
                
                this.ctx.fillStyle = 'red';
                this.ctx.beginPath();
                this.ctx.arc(playerX, playerY, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Draw viewport rectangle
            const viewportX = x + (this.camera.x - this.canvas.width / (2 * this.camera.zoom)) * scaleX;
            const viewportY = y + (this.camera.y - this.canvas.height / (2 * this.camera.zoom)) * scaleY;
            const viewportWidth = (this.canvas.width / this.camera.zoom) * scaleX;
            const viewportHeight = (this.canvas.height / this.camera.zoom) * scaleY;
            
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
        }
    }
    
    /**
     * Get color for minimap tile representation
     */
    _getTileColor(tileType) {
        const tileColors = {
            'grass': '#4CAF50',
            'water': '#2196F3',
            'forest': '#1B5E20',
            'mountain': '#795548',
            'sand': '#FFC107',
            'rock': '#757575',
            'snow': '#ECEFF1',
            'path': '#8D6E63',
            'wall': '#455A64',
            'door': '#FFB74D',
            'stone': '#607D8B',
            'swamp': '#7E57C2',
            'cactus': '#66BB6A',
            'dune': '#FFCA28',
            'building': '#D32F2F',
            'corridor': '#5D4037',
            'well': '#00BCD4',
            'tree': '#33691E'
        };
        
        return tileColors[tileType] || '#9E9E9E';
    }
    
    /**
     * Draw FPS counter
     */
    _drawFpsCounter() {
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
    }
    
    /**
     * Check if an object is within the current viewport
     */
    _isInViewport(object) {
        const viewportLeft = this.camera.x - this.canvas.width / (2 * this.camera.zoom);
        const viewportTop = this.camera.y - this.canvas.height / (2 * this.camera.zoom);
        const viewportRight = viewportLeft + this.canvas.width / this.camera.zoom;
        const viewportBottom = viewportTop + this.canvas.height / this.camera.zoom;
        
        const objectRight = object.x + (object.width || this.tileSize);
        const objectBottom = object.y + (object.height || this.tileSize);
        
        return (
            object.x < viewportRight &&
            objectRight > viewportLeft &&
            object.y < viewportBottom &&
            objectBottom > viewportTop
        );
    }
    
    /**
     * Set tilemap data for rendering
     */
    setTileMap(tileMap) {
        this.layers.terrain = tileMap;
    }
    
    /**
     * Add entity to the entities layer
     */
    addEntity(entity) {
        this.layers.entities.push(entity);
    }
    
    /**
     * Remove entity from the entities layer
     */
    removeEntity(entityId) {
        const index = this.layers.entities.findIndex(e => e.id === entityId);
        if (index !== -1) {
            this.layers.entities.splice(index, 1);
        }
    }
    
    /**
     * Add object to the objects layer
     */
    addObject(object) {
        this.layers.objects.push(object);
    }
    
    /**
     * Remove object from the objects layer
     */
    removeObject(objectId) {
        const index = this.layers.objects.findIndex(o => o.id === objectId);
        if (index !== -1) {
            this.layers.objects.splice(index, 1);
        }
    }
    
    /**
     * Add weather effect
     */
    setWeather(weatherType) {
        // Clear existing weather
        this.layers.weather = [];
        
        // Create weather effect based on type
        switch (weatherType) {
            case 'rain':
                this.layers.weather.push(new RainEffect(this.canvas.width, this.canvas.height));
                break;
            case 'snow':
                this.layers.weather.push(new SnowEffect(this.canvas.width, this.canvas.height));
                break;
            case 'fog':
                this.layers.weather.push(new FogEffect(this.canvas.width, this.canvas.height));
                break;
            // Add more weather types as needed
        }
    }
    
    /**
     * Enable/disable minimap
     */
    toggleMinimap(enabled) {
        this.minimapEnabled = enabled !== undefined ? enabled : !this.minimapEnabled;
    }
    
    /**
     * Create a particle system and add it to the particles layer
     */
    createParticleSystem(options) {
        const particleSystem = new ParticleSystem(options);
        this.layers.particles.push(particleSystem);
        return particleSystem;
    }
    
    /**
     * Remove a particle system
     */
    removeParticleSystem(id) {
        const index = this.layers.particles.findIndex(p => p.id === id);
        if (index !== -1) {
            this.layers.particles.splice(index, 1);
        }
    }
}

/**
 * Rain weather effect
 */
class RainEffect {
    constructor(width, height, options = {}) {
        this.width = width;
        this.height = height;
        this.dropCount = options.dropCount || 1000;
        this.drops = [];
        this.initialize();
    }
    
    initialize() {
        for (let i = 0; i < this.dropCount; i++) {
            this.drops.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                length: Math.random() * 10 + 10,
                speed: Math.random() * 10 + 15
            });
        }
    }
    
    render(ctx, deltaTime) {
        ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
        ctx.lineWidth = 1;
        
        for (const drop of this.drops) {
            // Move drop
            drop.y += drop.speed * deltaTime / 16;
            
            // Reset if offscreen
            if (drop.y > this.height) {
                drop.y = -drop.length;
                drop.x = Math.random() * this.width;
            }
            
            // Draw raindrop
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x - drop.length * 0.2, drop.y + drop.length);
            ctx.stroke();
        }
    }
}

/**
 * Snow weather effect
 */
class SnowEffect {
    constructor(width, height, options = {}) {
        this.width = width;
        this.height = height;
        this.flakeCount = options.flakeCount || 300;
        this.flakes = [];
        this.initialize();
    }
    
    initialize() {
        for (let i = 0; i < this.flakeCount; i++) {
            this.flakes.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 3 + 1,
                speed: Math.random() * 2 + 1,
                wobble: Math.random() * 2 - 1
            });
        }
    }
    
    render(ctx, deltaTime) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        for (const flake of this.flakes) {
            // Move flake
            flake.y += flake.speed * deltaTime / 16;
            flake.x += Math.sin(flake.y * 0.01) * flake.wobble;
            
            // Reset if offscreen
            if (flake.y > this.height) {
                flake.y = 0;
                flake.x = Math.random() * this.width;
            }
            
            // Draw snowflake
            ctx.beginPath();
            ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * Fog weather effect
 */
class FogEffect {
    constructor(width, height, options = {}) {
        this.width = width;
        this.height = height;
        this.density = options.density || 0.3;
        this.time = 0;
    }
    
    render(ctx, deltaTime) {
        this.time += deltaTime * 0.001;
        
        // Create gradient fog
        const gradient = ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, this.width / 2
        );
        
        gradient.addColorStop(0, 'rgba(200, 200, 210, 0)');
        gradient.addColorStop(0.5, `rgba(200, 200, 210, ${this.density * 0.5})`);
        gradient.addColorStop(1, `rgba(200, 200, 210, ${this.density})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Add some fog movement
        for (let i = 0; i < 3; i++) {
            const x = Math.sin(this.time * 0.1 + i) * 100 + this.width / 2;
            const y = Math.cos(this.time * 0.2 + i) * 50 + this.height / 2;
            
            const fogPatch = ctx.createRadialGradient(
                x, y, 0,
                x, y, 100 + Math.sin(this.time + i) * 20
            );
            
            fogPatch.addColorStop(0, `rgba(220, 220, 230, ${this.density * 0.7})`);
            fogPatch.addColorStop(1, 'rgba(220, 220, 230, 0)');
            
            ctx.fillStyle = fogPatch;
            ctx.fillRect(0, 0, this.width, this.height);
        }
    }
}

/**
 * Particle system for special effects
 */
class ParticleSystem {
    constructor(options = {}) {
        this.id = options.id || Math.random().toString(36).substr(2, 9);
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.particleCount = options.particleCount || 50;
        this.lifetime = options.lifetime || 1000; // milliseconds
        this.color = options.color || '#ffffff';
        this.size = options.size || { min: 2, max: 5 };
        this.speed = options.speed || { min: 1, max: 3 };
        this.gravity = options.gravity || 0;
        this.fadeOut = options.fadeOut !== false;
        
        this.particles = [];
        this.elapsed = 0;
        this.active = true;
        
        this.initialize();
    }
    
    initialize() {
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }
    
    createParticle() {
        const angle = Math.random() * Math.PI * 2;
        const speed = this.speed.min + Math.random() * (this.speed.max - this.speed.min);
        
        return {
            x: this.x,
            y: this.y,
            size: this.size.min + Math.random() * (this.size.max - this.size.min),
            velocityX: Math.cos(angle) * speed,
            velocityY: Math.sin(angle) * speed,
            lifetime: this.lifetime,
            age: 0
        };
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        for (const particle of this.particles) {
            // Update age
            particle.age += deltaTime;
            
            // Apply gravity
            particle.velocityY += this.gravity * deltaTime / 1000;
            
            // Move particle
            particle.x += particle.velocityX * deltaTime / 16;
            particle.y += particle.velocityY * deltaTime / 16;
            
            // Check if particle is dead
            if (particle.age >= particle.lifetime) {
                // Reset particle if system is still active
                Object.assign(particle, this.createParticle());
            }
        }
        
        // Auto-deactivate if system is temporary
        if (this.elapsed >= this.lifetime && this.lifetime > 0) {
            this.active = false;
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        for (const particle of this.particles) {
            // Calculate opacity based on age if fadeOut is enabled
            const opacity = this.fadeOut
                ? 1 - particle.age / particle.lifetime
                : 1;
                
            // Skip if completely transparent
            if (opacity <= 0) continue;
            
            // Draw particle
            ctx.fillStyle = this.color.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
