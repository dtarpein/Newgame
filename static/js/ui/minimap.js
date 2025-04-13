/**
 * Minimap System
 * Handles displaying a minimap of the current region
 */
class MinimapSystem {
    constructor(game) {
        this.game = game;
        this.visible = false;
        this.fullscreen = false;
        
        // Minimap properties
        this.padding = 10;
        this.size = 150;
        this.tileSize = 2; // Size of each tile in minimap
        this.playerMarkerSize = 4;
        this.fullscreenTileSize = 6;
        this.revealedTiles = {}; // Track which tiles have been seen
        
        // Create canvas element for minimap
        this.createMinimapCanvas();
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Create canvas element for minimap
     */
    createMinimapCanvas() {
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'minimap';
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.canvas.classList.add('minimap');
        this.ctx = this.canvas.getContext('2d');
        
        // Style canvas
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = this.padding + 'px';
        this.canvas.style.right = this.padding + 'px';
        this.canvas.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.canvas.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        this.canvas.style.borderRadius = '5px';
        this.canvas.style.zIndex = '100';
        this.canvas.style.display = 'none';
        
        // Add to document
        document.body.appendChild(this.canvas);
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Toggle minimap with M key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'm') {
                this.toggle();
            }
            
            // Toggle fullscreen map with Tab key
            if (e.key === 'Tab') {
                e.preventDefault(); // Prevent default tab behavior
                this.toggleFullscreen();
            }
        });
        
        // Click on minimap to go to that location
        this.canvas.addEventListener('click', (e) => {
            if (!this.fullscreen || !this.game.player) return;
            
            // Get click position relative to canvas
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Convert to world coordinates
            const mapWidth = this.game.currentRegion.mapData.width;
            const mapHeight = this.game.currentRegion.mapData.height;
            
            const tileSize = this.fullscreenTileSize;
            const worldX = Math.floor(x / tileSize) * this.game.renderer.tileSize;
            const worldY = Math.floor(y / tileSize) * this.game.renderer.tileSize;
            
            // Check if the clicked area is revealed
            const tileKey = `${Math.floor(worldX / this.game.renderer.tileSize)},${Math.floor(worldY / this.game.renderer.tileSize)}`;
            if (this.revealedTiles[tileKey]) {
                // Set as movement target
                this.game.player.setMoveTarget(worldX, worldY);
                
                // Add event
                this.game.addEvent(`Moving to marked location...`);
                
                // Close fullscreen map
                this.setFullscreen(false);
            }
        });
    }
    
    /**
     * Toggle minimap visibility
     */
    toggle() {
        this.visible = !this.visible;
        this.canvas.style.display = this.visible ? 'block' : 'none';
        
        // Play UI sound
        if (this.game.audioManager) {
            this.game.audioManager.playUISound(this.visible ? 'open' : 'close');
        }
        
        // Update minimap if now visible
        if (this.visible) {
            this.updateMinimap();
        }
    }
    
    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        this.setFullscreen(!this.fullscreen);
    }
    
    /**
     * Set fullscreen mode
     */
    setFullscreen(enabled) {
        // Must be visible first
        if (!this.visible && enabled) {
            this.toggle();
        }
        
        this.fullscreen = enabled;
        
        if (this.fullscreen) {
            // Expand to fullscreen
            this.canvas.classList.add('fullscreen');
            this.canvas.style.top = '50%';
            this.canvas.style.left = '50%';
            this.canvas.style.right = 'auto';
            this.canvas.style.transform = 'translate(-50%, -50%)';
            this.canvas.width = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
            this.canvas.height = this.canvas.width;
            
            // Add title and instructions
            this.canvas.dataset.title = this.game.currentRegion ? this.game.currentRegion.name : 'World Map';
            this.canvas.dataset.instructions = 'Click on the map to set a movement target. Press Tab to exit.';
            
            // Update with larger tiles
            this.updateMinimap();
            
            // Play open sound
            if (this.game.audioManager) {
                this.game.audioManager.playUISound('open');
            }
        } else {
            // Restore to minimap size
            this.canvas.classList.remove('fullscreen');
            this.canvas.style.top = this.padding + 'px';
            this.canvas.style.left = 'auto';
            this.canvas.style.right = this.padding + 'px';
            this.canvas.style.transform = 'none';
            this.canvas.width = this.size;
            this.canvas.height = this.size;
            
            // Remove title and instructions
            delete this.canvas.dataset.title;
            delete this.canvas.dataset.instructions;
            
            // Update with smaller tiles
            this.updateMinimap();
            
            // Play close sound
            if (this.game.audioManager) {
                this.game.audioManager.playUISound('close');
            }
        }
    }
    
    /**
     * Update minimap with current game state
     */
    updateMinimap() {
        if (!this.visible || !this.game.currentRegion) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Get map data
        const mapData = this.game.currentRegion.mapData;
        if (!mapData || !mapData.tiles) return;
        
        const mapWidth = mapData.width;
        const mapHeight = mapData.height;
        
        // Determine tile size based on mode
        const tileSize = this.fullscreen ? this.fullscreenTileSize : this.tileSize;
        
        // Adjust canvas size for fullscreen if needed
        if (this.fullscreen) {
            this.canvas.width = Math.min(window.innerWidth * 0.8, mapWidth * tileSize + 40);
            this.canvas.height = Math.min(window.innerHeight * 0.8, mapHeight * tileSize + 60);
        }
        
        // Calculate offsets to center map
        const offsetX = (this.canvas.width - mapWidth * tileSize) / 2;
        const offsetY = (this.canvas.height - mapHeight * tileSize) / 2;
        
        // Get player position
        let playerTileX = 0;
        let playerTileY = 0;
        
        if (this.game.player) {
            playerTileX = Math.floor(this.game.player.x / this.game.renderer.tileSize);
            playerTileY = Math.floor(this.game.player.y / this.game.renderer.tileSize);
            
            // Update fog of war
            this.updateFogOfWar(playerTileX, playerTileY);
        }
        
        // Draw map tiles
        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                // Check if tile is revealed in fog of war
                const tileKey = `${x},${y}`;
                if (!this.revealedTiles[tileKey] && !this.fullscreen) {
                    continue; // Skip unrevealed tiles in minimap mode
                }
                
                // Get tile type
                const tileType = mapData.tiles[y][x];
                
                // Get tile color based on type
                const tileColor = this.getTileColor(tileType);
                
                // Calculate position
                const posX = offsetX + x * tileSize;
                const posY = offsetY + y * tileSize;
                
                // Determine alpha based on fog of war
                const alpha = this.revealedTiles[tileKey] ? 1.0 : 0.3;
                
                // Draw tile
                this.ctx.fillStyle = this.adjustAlpha(tileColor, alpha);
                this.ctx.fillRect(posX, posY, tileSize, tileSize);
            }
        }
        
        // Draw landmarks
        if (this.game.currentRegion.landmarks) {
            for (const landmark of this.game.currentRegion.landmarks) {
                // Check if landmark is discovered
                const isDiscovered = this.isLandmarkDiscovered(landmark.id);
                
                // Skip undiscovered landmarks unless in debug mode
                if (!isDiscovered && !this.game.debugMode) continue;
                
                // Calculate position
                const posX = offsetX + landmark.x * tileSize;
                const posY = offsetY + landmark.y * tileSize;
                
                // Draw landmark marker
                this.ctx.fillStyle = this.getLandmarkColor(landmark.type, isDiscovered);
                this.ctx.beginPath();
                this.ctx.arc(posX + tileSize/2, posY + tileSize/2, tileSize * 1.2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Add landmark icon
                this.drawLandmarkIcon(landmark.type, posX, posY, tileSize);
                
                // Draw landmark name in fullscreen mode
                if (this.fullscreen && isDiscovered) {
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.font = '10px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(landmark.name, posX + tileSize/2, posY + tileSize * 2);
                }
            }
        }
        
        // Draw player position
        if (this.game.player) {
            // Calculate position
            const posX = offsetX + playerTileX * tileSize;
            const posY = offsetY + playerTileY * tileSize;
            
            // Draw player marker (arrow showing direction)
            this.ctx.save();
            this.ctx.translate(posX + tileSize/2, posY + tileSize/2);
            
            // Rotate based on player direction
            const playerDirection = this.game.player.direction || 0;
            this.ctx.rotate(playerDirection);
            
            // Draw an arrow
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.beginPath();
            this.ctx.moveTo(0, -tileSize);
            this.ctx.lineTo(tileSize/2, tileSize/2);
            this.ctx.lineTo(-tileSize/2, tileSize/2);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.restore();
        }
        
        // Draw current view area in fullscreen mode
        if (this.fullscreen && this.game.renderer) {
            // Calculate view boundaries
            const viewWidth = this.game.renderer.canvas.width / this.game.renderer.camera.zoom;
            const viewHeight = this.game.renderer.canvas.height / this.game.renderer.camera.zoom;
            
            const viewStartX = (this.game.renderer.camera.x - viewWidth/2) / this.game.renderer.tileSize;
            const viewStartY = (this.game.renderer.camera.y - viewHeight/2) / this.game.renderer.tileSize;
            const viewEndX = (this.game.renderer.camera.x + viewWidth/2) / this.game.renderer.tileSize;
            const viewEndY = (this.game.renderer.camera.y + viewHeight/2) / this.game.renderer.tileSize;
            
            // Draw view rectangle
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                offsetX + viewStartX * tileSize,
                offsetY + viewStartY * tileSize,
                (viewEndX - viewStartX) * tileSize,
                (viewEndY - viewStartY) * tileSize
            );
        }
        
        // Draw region name and legend in fullscreen mode
        if (this.fullscreen) {
            // Draw region name
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.game.currentRegion.name, this.canvas.width / 2, 20);
            
            // Draw legend
            this.drawMapLegend();
        }
    }
    
    /**
     * Update fog of war based on player position
     */
    updateFogOfWar(playerTileX, playerTileY) {
        // Vision range (how far player can see)
        const visionRange = 10;
        
        // Reveal tiles in vision range
        for (let dy = -visionRange; dy <= visionRange; dy++) {
            for (let dx = -visionRange; dx <= visionRange; dx++) {
                const x = playerTileX + dx;
                const y = playerTileY + dy;
                
                // Skip if out of bounds
                if (x < 0 || y < 0 || 
                    x >= this.game.currentRegion.mapData.width || 
                    y >= this.game.currentRegion.mapData.height) {
                    continue;
                }
                
                // Calculate distance to player
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Skip if outside vision range
                if (distance > visionRange) continue;
                
                // Reveal tile
                this.revealedTiles[`${x},${y}`] = true;
            }
        }
    }
    
    /**
     * Get color for a tile type
     */
    getTileColor(tileType) {
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
     * Get color for a landmark type
     */
    getLandmarkColor(landmarkType, discovered) {
        if (!discovered) return 'rgba(200, 200, 200, 0.5)';
        
        const landmarkColors = {
            'settlement': '#FF5722',
            'town': '#FF5722',
            'dungeon': '#9C27B0',
            'cave': '#673AB7',
            'ruins': '#FF9800',
            'natural': '#009688',
            'point_of_interest': '#FFC107'
        };
        
        return landmarkColors[landmarkType] || '#E91E63';
    }
    
    /**
     * Draw an icon for a landmark type
     */
    drawLandmarkIcon(landmarkType, x, y, tileSize) {
        // Adjust position to center
        const centerX = x + tileSize/2;
        const centerY = y + tileSize/2;
        
        this.ctx.fillStyle = '#FFFFFF';
        
        switch(landmarkType) {
            case 'settlement':
            case 'town':
                // Draw house icon
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, centerY - tileSize/2);
                this.ctx.lineTo(centerX + tileSize/2, centerY);
                this.ctx.lineTo(centerX + tileSize/2, centerY + tileSize/2);
                this.ctx.lineTo(centerX - tileSize/2, centerY + tileSize/2);
                this.ctx.lineTo(centerX - tileSize/2, centerY);
                this.ctx.closePath();
                this.ctx.fill();
                break;
            
            case 'dungeon':
                // Draw skull icon
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, tileSize/3, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Eyes
                this.ctx.fillStyle = '#000000';
                this.ctx.beginPath();
                this.ctx.arc(centerX - tileSize/6, centerY - tileSize/8, tileSize/8, 0, Math.PI * 2);
                this.ctx.arc(centerX + tileSize/6, centerY - tileSize/8, tileSize/8, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            
            case 'cave':
                // Draw cave entrance icon
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY + tileSize/4, tileSize/3, Math.PI, 0, true);
                this.ctx.fill();
                break;
            
            case 'ruins':
                // Draw ruins icon (broken columns)
                this.ctx.fillRect(centerX - tileSize/3, centerY - tileSize/4, tileSize/6, tileSize/2);
                this.ctx.fillRect(centerX, centerY - tileSize/3, tileSize/6, tileSize/3);
                this.ctx.fillRect(centerX + tileSize/3, centerY - tileSize/4, tileSize/6, tileSize/2);
                break;
            
            case 'natural':
                // Draw tree icon
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, centerY - tileSize/2);
                this.ctx.lineTo(centerX + tileSize/3, centerY);
                this.ctx.lineTo(centerX - tileSize/3, centerY);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.fillRect(centerX - tileSize/8, centerY, tileSize/4, tileSize/3);
                break;
            
            default:
                // Draw generic point of interest (diamond)
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, centerY - tileSize/3);
                this.ctx.lineTo(centerX + tileSize/3, centerY);
                this.ctx.lineTo(centerX, centerY + tileSize/3);
                this.ctx.lineTo(centerX - tileSize/3, centerY);
                this.ctx.closePath();
                this.ctx.fill();
        }
    }
    
    /**
     * Draw legend for fullscreen map
     */
    drawMapLegend() {
        const legendX = this.canvas.width - 130;
        const legendY = 40;
        const itemHeight = 20;
        
        // Draw legend background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(legendX - 10, legendY - 10, 140, 180);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.strokeRect(legendX - 10, legendY - 10, 140, 180);
        
        // Draw legend title
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Legend', legendX, legendY);
        
        // Draw legend items
        this.ctx.font = '10px Arial';
        
        // Map tiles
        this.drawLegendItem(legendX, legendY + itemHeight, '#4CAF50', 'Grass');
        this.drawLegendItem(legendX, legendY + itemHeight * 2, '#1B5E20', 'Forest');
        this.drawLegendItem(legendX, legendY + itemHeight * 3, '#2196F3', 'Water');
        this.drawLegendItem(legendX, legendY + itemHeight * 4, '#795548', 'Mountain');
        this.drawLegendItem(legendX, legendY + itemHeight * 5, '#8D6E63', 'Path');
        
        // Landmarks
        this.ctx.font = 'bold 10px Arial';
        this.ctx.fillText('Landmarks:', legendX, legendY + itemHeight * 6.5);
        this.ctx.font = '10px Arial';
        
        this.drawLegendItem(legendX, legendY + itemHeight * 7, '#FF5722', 'Town/Settlement');
        this.drawLegendItem(legendX, legendY + itemHeight * 8, '#9C27B0', 'Dungeon');
        this.drawLegendItem(legendX, legendY + itemHeight * 9, 'rgba(200, 200, 200, 0.5)', 'Undiscovered');
    }
    
    /**
     * Draw a legend item
     */
    drawLegendItem(x, y, color, text) {
        // Draw color box
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y - 8, 10, 10);
        
        // Draw text
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(text, x + 15, y);
    }
    
    /**
     * Check if a landmark has been discovered
     */
    isLandmarkDiscovered(landmarkId) {
        // In a real implementation, this would check player's discovered landmarks
        // For now, return true to show all landmarks in fullscreen mode
        return this.fullscreen || this.game.debugMode;
    }
    
    /**
     * Adjust color alpha
     */
    adjustAlpha(color, alpha) {
        if (color.startsWith('#')) {
            // Convert hex to rgba
            const r = parseInt(color.substr(1, 2), 16);
            const g = parseInt(color.substr(3, 2), 16);
            const b = parseInt(color.substr(5, 2), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else if (color.startsWith('rgb')) {
            // Replace rgba alpha or convert rgb to rgba
            return color.replace(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/, `rgba($1, $2, $3, ${alpha})`);
        }
        return color;
    }
}

// Export for use in main game
window.MinimapSystem = MinimapSystem;