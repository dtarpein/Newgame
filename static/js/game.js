// Main Game JavaScript
const Game = (function() {
    // Game state
    let state = {
        regionData: null,
        characterPosition: { x: 0, y: 0 },
        mapData: null,
        mapLoaded: false,
        miniMapVisible: false,
        entities: [],
        npcs: [],
        landmarks: [],
        weather: 'clear',
        timeOfDay: 'day',
        activeAction: null
    };
    
    // Game canvas and context
    let canvas, ctx;
    
    // Tile images
    const tileImages = {};
    const tileSize = 32;
    
    // Game initialization
    function init(regionData, characterPosition) {
        console.log('Initializing game with region:', regionData);
        
        // Store region data
        state.regionData = regionData;
        
        // Set character position
        state.characterPosition = characterPosition || { x: 0, y: 0 };
        
        // Get canvas and context
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        
        // Resize canvas to fit container
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Load tiles
        loadTiles()
            .then(() => {
                // Process map data
                processMapData();
                
                // Initialize systems
                initRenderer();
                initInput();
                initAudio();
                
                // Add character entity
                addCharacterEntity();
                
                // Add NPCs and landmarks
                addNPCsAndLandmarks();
                
                // Hide loading overlay
                document.getElementById('loading-overlay').style.display = 'none';
                
                // Set map as loaded
                state.mapLoaded = true;
                
                // Start game loop
                gameLoop();
                
                // Log success
                console.log('Game initialized successfully');
            })
            .catch(error => {
                console.error('Error initializing game:', error);
            });
    }
    
    // Resize canvas to fit container
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Re-render if map is loaded
        if (state.mapLoaded) {
            render();
        }
    }
    
    // Load tile images
    function loadTiles() {
        return new Promise((resolve, reject) => {
            const tileTypes = [
                'grass', 'water', 'forest', 'mountain', 'sand', 'rock', 
                'path', 'snow', 'swamp', 'stone', 'wall', 'floor', 
                'door', 'tree', 'house', 'shop', 'well', 'cave'
            ];
            
            let loadedCount = 0;
            const totalTiles = tileTypes.length;
            
            tileTypes.forEach(type => {
                const img = new Image();
                img.src = `/static/assets/tiles/${type}.png`;
                
                img.onload = () => {
                    tileImages[type] = img;
                    loadedCount++;
                    
                    if (loadedCount === totalTiles) {
                        resolve();
                    }
                };
                
                img.onerror = () => {
                    console.warn(`Failed to load tile: ${type}`);
                    loadedCount++;
                    
                    // Create a placeholder for missing tiles
                    const placeholderCanvas = document.createElement('canvas');
                    placeholderCanvas.width = tileSize;
                    placeholderCanvas.height = tileSize;
                    const placeholderCtx = placeholderCanvas.getContext('2d');
                    
                    // Draw placeholder
                    placeholderCtx.fillStyle = '#FF00FF';
                    placeholderCtx.fillRect(0, 0, tileSize, tileSize);
                    placeholderCtx.strokeStyle = '#000';
                    placeholderCtx.strokeRect(0, 0, tileSize, tileSize);
                    placeholderCtx.fillStyle = '#000';
                    placeholderCtx.font = '10px Arial';
                    placeholderCtx.fillText(type, 2, 16);
                    
                    tileImages[type] = placeholderCanvas;
                    
                    if (loadedCount === totalTiles) {
                        resolve();
                    }
                };
            });
        });
    }
    
    // Process map data
    function processMapData() {
        if (state.regionData.mapData) {
            state.mapData = state.regionData.mapData;
        } else {
            // Generate default map if none provided
            state.mapData = {
                width: 32,
                height: 32,
                tiles: []
            };
            
            // Fill with grass
            for (let y = 0; y < state.mapData.height; y++) {
                const row = [];
                for (let x = 0; x < state.mapData.width; x++) {
                    row.push('grass');
                }
                state.mapData.tiles.push(row);
            }
        }
        
        // Parse landmarks
        if (state.regionData.landmarks) {
            state.landmarks = state.regionData.landmarks;
        }
    }
    
    // Initialize renderer
    function initRenderer() {
        // This is just a placeholder - actual renderer functionality is in renderer.js
        console.log('Renderer initialized');
    }
    
    // Initialize input handling
    function initInput() {
        // This is just a placeholder - actual input functionality is in input.js
        console.log('Input system initialized');
    }
    
    // Initialize audio
    function initAudio() {
        // This is just a placeholder - actual audio functionality is in audio.js
        console.log('Audio system initialized');
    }
    
    // Add character entity
    function addCharacterEntity() {
        const character = {
            id: 'player',
            type: 'player',
            position: { ...state.characterPosition },
            sprite: {
                src: '/static/assets/sprites/character.png',
                width: 32,
                height: 48,
                frame: 0,
                frames: 4,
                frameSpeed: 10,
                facing: 'down'
            }
        };
        
        state.entities.push(character);
    }
    
    // Add NPCs and landmarks
    function addNPCsAndLandmarks() {
        // Add landmarks as entities
        if (state.landmarks) {
            state.landmarks.forEach(landmark => {
                const entity = {
                    id: `landmark_${landmark.name.replace(/\s/g, '_').toLowerCase()}`,
                    type: 'landmark',
                    landmarkType: landmark.type,
                    name: landmark.name,
                    description: landmark.description,
                    position: { x: landmark.x, y: landmark.y },
                    sprite: {
                        src: `/static/assets/sprites/landmarks/${landmark.type}.png`,
                        width: 32,
                        height: 32,
                        frame: 0,
                        frames: 1
                    }
                };
                
                state.entities.push(entity);
            });
        }
        
        // Add NPCs (this would normally come from an API call)
        const mockNPCs = [
            {
                id: 'npc_mayor',
                type: 'npc',
                name: 'Mayor Thornwick',
                description: 'The portly mayor of Mistvale Village',
                position: { x: 10, y: 10 },
                sprite: {
                    src: '/static/assets/sprites/npcs/mayor.png',
                    width: 32,
                    height: 48,
                    frame: 0,
                    frames: 4,
                    frameSpeed: 15,
                    facing: 'down'
                },
                dialogue: {
                    greeting: "Hello there, adventurer! Welcome to our humble village."
                }
            },
            {
                id: 'npc_merchant',
                type: 'npc',
                name: 'Whisper',
                description: 'A traveling merchant with mysterious goods',
                position: { x: 15, y: 12 },
                sprite: {
                    src: '/static/assets/sprites/npcs/merchant.png',
                    width: 32,
                    height: 48,
                    frame: 0,
                    frames: 4,
                    frameSpeed: 15,
                    facing: 'down'
                },
                dialogue: {
                    greeting: "Pssst... looking for something special? I've got rare items from all corners of the realm."
                }
            }
        ];
        
        state.npcs = mockNPCs;
        state.entities.push(...mockNPCs);
    }
    
    // Game loop
    function gameLoop() {
        update();
        render();
        requestAnimationFrame(gameLoop);
    }
    
    // Update game state
    function update() {
        // Update entities
        updateEntities();
        
        // Update active action
        updateActiveAction();
    }
    
    // Update entities
    function updateEntities() {
        state.entities.forEach(entity => {
            // Update entity animation frames
            if (entity.sprite && entity.sprite.frames > 1) {
                if (!entity.sprite.frameCounter) {
                    entity.sprite.frameCounter = 0;
                }
                
                entity.sprite.frameCounter++;
                
                if (entity.sprite.frameCounter >= entity.sprite.frameSpeed) {
                    entity.sprite.frame = (entity.sprite.frame + 1) % entity.sprite.frames;
                    entity.sprite.frameCounter = 0;
                }
            }
        });
    }
    
    // Update active action
    function updateActiveAction() {
        if (state.activeAction) {
            // Handle different action types
            switch (state.activeAction.type) {
                case 'explore':
                    updateExploration();
                    break;
                case 'rest':
                    updateRest();
                    break;
                case 'interact':
                    // Interaction is handled by event
                    break;
            }
        }
    }
    
    // Update exploration action
    function updateExploration() {
        // Advance exploration timer
        if (!state.activeAction.timer) {
            state.activeAction.timer = 0;
            state.activeAction.duration = 3000; // 3 seconds
            
            // Add exploration started message
            addEventMessage("Exploring the area...");
        }
        
        state.activeAction.timer += 16; // Roughly 16ms per frame
        
        // Check if exploration is complete
        if (state.activeAction.timer >= state.activeAction.duration) {
            // Generate some random exploration result
            const results = [
                "You found nothing of interest.",
                "You discovered a small plant with healing properties.",
                "You notice tracks indicating monsters passed through recently.",
                "You found 5 gold coins hidden under a rock!",
                "You spot a rare herb that could be valuable."
            ];
            
            const result = results[Math.floor(Math.random() * results.length)];
            addEventMessage(result);
            
            // End exploration
            state.activeAction = null;
        }
    }
    
    // Update rest action
    function updateRest() {
        // Advance rest timer
        if (!state.activeAction.timer) {
            state.activeAction.timer = 0;
            state.activeAction.duration = 5000; // 5 seconds
            
            // Add rest started message
            addEventMessage("Resting to recover...");
        }
        
        state.activeAction.timer += 16; // Roughly 16ms per frame
        
        // Check if rest is complete
        if (state.activeAction.timer >= state.activeAction.duration) {
            // Generate rest result
            addEventMessage("You feel refreshed! Health and mana restored.");
            
            // End rest action
            state.activeAction = null;
        }
    }
    
    // Render the game
    function render() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw map
        drawMap();
        
        // Draw entities
        drawEntities();
        
        // Draw UI overlays
        drawUI();
    }
    
    // Draw the game map
    function drawMap() {
        if (!state.mapData || !state.mapData.tiles) {
            return;
        }
        
        // Calculate viewport
        const viewportWidth = Math.ceil(canvas.width / tileSize);
        const viewportHeight = Math.ceil(canvas.height / tileSize);
        
        // Calculate camera position (centered on player)
        const cameraX = Math.floor(state.characterPosition.x - viewportWidth / 2);
        const cameraY = Math.floor(state.characterPosition.y - viewportHeight / 2);
        
        // Clamp camera position to map boundaries
        const clampedCameraX = Math.max(0, Math.min(cameraX, state.mapData.width - viewportWidth));
        const clampedCameraY = Math.max(0, Math.min(cameraY, state.mapData.height - viewportHeight));
        
        // Draw visible tiles
        for (let y = 0; y < viewportHeight; y++) {
            for (let x = 0; x < viewportWidth; x++) {
                const mapX = clampedCameraX + x;
                const mapY = clampedCameraY + y;
                
                // Skip tiles outside map boundaries
                if (mapX >= state.mapData.width || mapY >= state.mapData.height || mapX < 0 || mapY < 0) {
                    continue;
                }
                
                const tileType = state.mapData.tiles[mapY][mapX];
                const tileImg = tileImages[tileType];
                
                if (tileImg) {
                    ctx.drawImage(tileImg, x * tileSize, y * tileSize, tileSize, tileSize);
                }
            }
        }
    }
    
    // Draw game entities
    function drawEntities() {
        if (!state.entities || state.entities.length === 0) {
            return;
        }
        
        // Sort entities by Y position for proper layering
        const sortedEntities = [...state.entities].sort((a, b) => a.position.y - b.position.y);
        
        // Calculate viewport and camera position
        const viewportWidth = Math.ceil(canvas.width / tileSize);
        const viewportHeight = Math.ceil(canvas.height / tileSize);
        const cameraX = Math.floor(state.characterPosition.x - viewportWidth / 2);
        const cameraY = Math.floor(state.characterPosition.y - viewportHeight / 2);
        const clampedCameraX = Math.max(0, Math.min(cameraX, state.mapData.width - viewportWidth));
        const clampedCameraY = Math.max(0, Math.min(cameraY, state.mapData.height - viewportHeight));
        
        // Draw each entity
        sortedEntities.forEach(entity => {
            // Skip entities outside viewport
            if (entity.position.x < clampedCameraX - 1 || 
                entity.position.y < clampedCameraY - 1 ||
                entity.position.x > clampedCameraX + viewportWidth ||
                entity.position.y > clampedCameraY + viewportHeight) {
                return;
            }
            
            // Calculate screen position
            const screenX = (entity.position.x - clampedCameraX) * tileSize;
            const screenY = (entity.position.y - clampedCameraY) * tileSize;
            
            // Draw entity sprite if available
            if (entity.sprite) {
                const img = new Image();
                img.src = entity.sprite.src;
                
                // Calculate frame offset for animations
                const frameOffsetX = entity.sprite.frame * entity.sprite.width;
                let frameOffsetY = 0;
                
                // Adjust frame offset Y based on facing direction
                if (entity.sprite.facing) {
                    const directionMap = {
                        'down': 0,
                        'left': 1,
                        'right': 2,
                        'up': 3
                    };
                    
                    frameOffsetY = directionMap[entity.sprite.facing] * entity.sprite.height;
                }
                
                // Draw sprite
                ctx.drawImage(
                    img,
                    frameOffsetX,
                    frameOffsetY,
                    entity.sprite.width,
                    entity.sprite.height,
                    screenX,
                    screenY - (entity.sprite.height - tileSize), // Adjust Y to align bottom of sprite with tile
                    entity.sprite.width,
                    entity.sprite.height
                );
                
                // Draw entity name for NPCs
                if (entity.type === 'npc') {
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 2;
                    
                    const nameY = screenY - (entity.sprite.height - tileSize) - 5;
                    
                    ctx.strokeText(entity.name, screenX + entity.sprite.width / 2, nameY);
                    ctx.fillText(entity.name, screenX + entity.sprite.width / 2, nameY);
                }
            } else {
                // Draw fallback rectangle if no sprite
                ctx.fillStyle = entity.color || '#FF0000';
                ctx.fillRect(screenX, screenY, tileSize, tileSize);
            }
        });
    }
    
    // Draw UI elements
    function drawUI() {
        // Draw mini-map if visible
        if (state.miniMapVisible) {
            drawMiniMap();
        }
        
        // Draw action indicators
        if (state.activeAction) {
            drawActionIndicator();
        }
    }
    
    // Draw mini-map
    function drawMiniMap() {
        // Mini-map dimensions
        const mapSize = 160;
        const tileMapSize = 4;
        const padding = 10;
        
        // Draw mini-map background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
            canvas.width - mapSize - padding,
            padding,
            mapSize,
            mapSize
        );
        
        // Draw mini-map border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            canvas.width - mapSize - padding,
            padding,
            mapSize,
            mapSize
        );
        
        // Draw map tiles
        if (state.mapData && state.mapData.tiles) {
            const mapWidth = state.mapData.width;
            const mapHeight = state.mapData.height;
            
            // Scale factor to fit entire map in mini-map
            const scaleX = mapSize / mapWidth;
            const scaleY = mapSize / mapHeight;
            
            // Draw each tile
            for (let y = 0; y < mapHeight; y++) {
                for (let x = 0; x < mapWidth; x++) {
                    const tileType = state.mapData.tiles[y][x];
                    
                    // Assign color based on tile type
                    let color;
                    switch (tileType) {
                        case 'water':
                            color = '#1E88E5';
                            break;
                        case 'forest':
                            color = '#2E7D32';
                            break;
                        case 'mountain':
                            color = '#5D4037';
                            break;
                        case 'sand':
                            color = '#FDD835';
                            break;
                        case 'path':
                            color = '#795548';
                            break;
                        case 'grass':
                        default:
                            color = '#7CB342';
                            break;
                    }
                    
                    // Draw tile
                    ctx.fillStyle = color;
                    ctx.fillRect(
                        canvas.width - mapSize - padding + (x * scaleX),
                        padding + (y * scaleY),
                        scaleX,
                        scaleY
                    );
                }
            }
            
            // Draw landmarks
            if (state.landmarks) {
                state.landmarks.forEach(landmark => {
                    ctx.fillStyle = '#FF5722';
                    ctx.fillRect(
                        canvas.width - mapSize - padding + (landmark.x * scaleX) - 1,
                        padding + (landmark.y * scaleY) - 1,
                        3,
                        3
                    );
                });
            }
            
            // Draw player position
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(
                canvas.width - mapSize - padding + (state.characterPosition.x * scaleX),
                padding + (state.characterPosition.y * scaleY),
                2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
        
        // Draw mini-map label
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.fillText(
            state.regionData.name,
            canvas.width - mapSize / 2 - padding,
            padding + mapSize + 15
        );
    }
    
    // Draw action indicator
    function drawActionIndicator() {
        if (!state.activeAction) {
            return;
        }
        
        // Action indicator dimensions
        const width = 200;
        const height = 40;
        const x = (canvas.width - width) / 2;
        const y = 20;
        
        // Draw background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, width, height);
        
        // Draw border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Draw action name
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.fillText(
            state.activeAction.type.charAt(0).toUpperCase() + state.activeAction.type.slice(1),
            x + width / 2,
            y + 18
        );
        
        // Draw progress bar if action has timer
        if (state.activeAction.timer !== undefined && state.activeAction.duration !== undefined) {
            const progress = state.activeAction.timer / state.activeAction.duration;
            const progressBarWidth = width - 20;
            const progressWidth = progressBarWidth * progress;
            
            // Draw progress bar background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x + 10, y + 25, progressBarWidth, 6);
            
            // Draw progress
            ctx.fillStyle = 'white';
            ctx.fillRect(x + 10, y + 25, progressWidth, 6);
        }
    }
    
    // Start exploration action
    function startExploration() {
        // Check if an action is already in progress
        if (state.activeAction) {
            addEventMessage("You're already busy with something.");
            return;
        }
        
        // Set active action
        state.activeAction = {
            type: 'explore'
        };
    }
    
    // Rest character action
    function restCharacter() {
        // Check if an action is already in progress
        if (state.activeAction) {
            addEventMessage("You're already busy with something.");
            return;
        }
        
        // Set active action
        state.activeAction = {
            type: 'rest'
        };
    }
    
    // Interact with nearby entities
    function interact() {
        // Check if an action is already in progress
        if (state.activeAction) {
            addEventMessage("You're already busy with something.");
            return;
        }
        
        // Find nearby NPCs or landmarks
        const nearbyEntities = findNearbyEntities();
        
        if (nearbyEntities.length === 0) {
            addEventMessage("There's nothing to interact with nearby.");
            return;
        }
        
        // If multiple entities, show selection dialog
        if (nearbyEntities.length > 1) {
            showInteractionChoices(nearbyEntities);
            return;
        }
        
        // Interact with the single entity
        interactWithEntity(nearbyEntities[0]);
    }
    
    // Find entities near the player
    function findNearbyEntities() {
        const interactionDistance = 2; // Maximum distance for interaction
        
        return state.entities.filter(entity => {
            // Skip player entity
            if (entity.id === 'player') {
                return false;
            }
            
            // Calculate distance
            const dx = entity.position.x - state.characterPosition.x;
            const dy = entity.position.y - state.characterPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            return distance <= interactionDistance;
        });
    }
    
    // Show interaction choices dialog
    function showInteractionChoices(entities) {
        const dialogPanel = document.getElementById('dialogPanel');
        const dialogTitle = document.getElementById('dialogTitle');
        const dialogContent = document.getElementById('dialogContent');
        const dialogOptions = document.getElementById('dialogOptions');
        
        // Set dialog title
        dialogTitle.textContent = 'Interact With';
        
        // Clear content and options
        dialogContent.innerHTML = 'Choose who or what to interact with:';
        dialogOptions.innerHTML = '';
        
        // Add option for each entity
        entities.forEach(entity => {
            const option = document.createElement('button');
            option.className = 'dialog-option';
            option.textContent = entity.name || `${entity.type} ${entity.id}`;
            
            option.addEventListener('click', () => {
                // Close dialog
                dialogPanel.classList.add('hidden');
                
                // Interact with selected entity
                interactWithEntity(entity);
            });
            
            dialogOptions.appendChild(option);
        });
        
        // Show dialog
        dialogPanel.classList.remove('hidden');
    }
    
    // Interact with a specific entity
    function interactWithEntity(entity) {
        console.log('Interacting with:', entity);
        
        // Handle different entity types
        switch (entity.type) {
            case 'npc':
                showNPCDialog(entity);
                break;
            case 'landmark':
                showLandmarkDialog(entity);
                break;
            default:
                addEventMessage(`You examine the ${entity.name || entity.type}.`);
                break;
        }
    }
    
    // Show NPC dialog
    function showNPCDialog(npc) {
        const dialogPanel = document.getElementById('dialogPanel');
        const dialogTitle = document.getElementById('dialogTitle');
        const dialogContent = document.getElementById('dialogContent');
        const dialogOptions = document.getElementById('dialogOptions');
        
        // Set dialog title
        dialogTitle.textContent = npc.name;
        
        // Set dialog content
        dialogContent.innerHTML = `<p>${npc.dialogue?.greeting || 'Hello there!'}</p>`;
        
        // Clear and add dialog options
        dialogOptions.innerHTML = '';
        
        // Add standard conversation options
        const talkOption = document.createElement('button');
        talkOption.className = 'dialog-option';
        talkOption.textContent = 'Talk';
        talkOption.addEventListener('click', () => {
            // Request dialog from server
            fetch('/api/npc/dialogue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    npc_id: npc.id.replace('npc_', ''),
                    intent: 'greeting'
                })
            })
            .then(response => response.json())
            .then(data => {
                dialogContent.innerHTML = `<p>${data.text}</p>`;
            })
            .catch(error => {
                console.error('Error fetching dialogue:', error);
                dialogContent.innerHTML = `<p>There seems to be a problem with the conversation.</p>`;
            });
        });
        dialogOptions.appendChild(talkOption);
        
        // Add trade option for merchants
        if (npc.name === 'Whisper') {
            const tradeOption = document.createElement('button');
            tradeOption.className = 'dialog-option';
            tradeOption.textContent = 'Trade';
            tradeOption.addEventListener('click', () => {
                // Redirect to shop page
                window.location.href = `/game/shop/${npc.id.replace('npc_', '')}`;
            });
            dialogOptions.appendChild(tradeOption);
        }
        
        // Add quest option for quest givers
        if (npc.name === 'Mayor Thornwick') {
            const questOption = document.createElement('button');
            questOption.className = 'dialog-option';
            questOption.textContent = 'Quests';
            questOption.addEventListener('click', () => {
                dialogContent.innerHTML = `<p>I might have some tasks for an adventurer like you. Come back later when this feature is implemented!</p>`;
            });
            dialogOptions.appendChild(questOption);
        }
        
        // Add close option
        const closeOption = document.createElement('button');
        closeOption.className = 'dialog-option';
        closeOption.textContent = 'Leave';
        closeOption.addEventListener('click', () => {
            dialogPanel.classList.add('hidden');
        });
        dialogOptions.appendChild(closeOption);
        
        // Show dialog
        dialogPanel.classList.remove('hidden');
    }
    
    // Show landmark dialog
    function showLandmarkDialog(landmark) {
        const dialogPanel = document.getElementById('dialogPanel');
        const dialogTitle = document.getElementById('dialogTitle');
        const dialogContent = document.getElementById('dialogContent');
        const dialogOptions = document.getElementById('dialogOptions');
        
        // Set dialog title
        dialogTitle.textContent = landmark.name;
        
        // Set dialog content
        dialogContent.innerHTML = `<p>${landmark.description}</p>`;
        
        // Clear and add dialog options
        dialogOptions.innerHTML = '';
        
        // Add options based on landmark type
        switch (landmark.landmarkType) {
            case 'dungeon':
                const enterOption = document.createElement('button');
                enterOption.className = 'dialog-option';
                enterOption.textContent = 'Enter Dungeon';
                enterOption.addEventListener('click', () => {
                    dialogContent.innerHTML = `<p>The dungeon feature is not yet implemented. Check back later!</p>`;
                });
                dialogOptions.appendChild(enterOption);
                break;
            case 'town':
                const visitOption = document.createElement('button');
                visitOption.className = 'dialog-option';
                visitOption.textContent = 'Visit Town';
                visitOption.addEventListener('click', () => {
                    // Redirect to town page
                    window.location.href = `/game/location/${landmark.id.replace('landmark_', '')}`;
                });
                dialogOptions.appendChild(visitOption);
                break;
        }
        
        // Add examine option
        const examineOption = document.createElement('button');
        examineOption.className = 'dialog-option';
        examineOption.textContent = 'Examine';
        examineOption.addEventListener('click', () => {
            addEventMessage(`You examine the ${landmark.name}.`);
            dialogContent.innerHTML = `<p>Upon closer inspection: ${landmark.description}</p>`;
        });
        dialogOptions.appendChild(examineOption);
        
        // Add close option
        const closeOption = document.createElement('button');
        closeOption.className = 'dialog-option';
        closeOption.textContent = 'Leave';
        closeOption.addEventListener('click', () => {
            dialogPanel.classList.add('hidden');
        });
        dialogOptions.appendChild(closeOption);
        
        // Show dialog
        dialogPanel.classList.remove('hidden');
    }
    
    // Toggle mini-map visibility
    function toggleMap() {
        state.miniMapVisible = !state.miniMapVisible;
    }
    
    // Add message to event log
    function addEventMessage(message) {
        const eventList = document.getElementById('eventList');
        
        // Create new event entry
        const entry = document.createElement('div');
        entry.className = 'event-entry';
        entry.textContent = message;
        
        // Add to log
        eventList.appendChild(entry);
        
        // Scroll to bottom
        eventList.scrollTop = eventList.scrollHeight;
    }
    
    // Public API
    return {
        init,
        startExploration,
        restCharacter,
        interact,
        toggleMap
    };
})();