/**
 * Character UI System
 * Handles character status display and management UI
 */
class CharacterUI {
    constructor(game) {
        this.game = game;
        this.isStatsOpen = false;
        this.isSkillsOpen = false;
        
        // UI elements
        this.statusBars = {
            health: document.querySelector('.health-bar .bar-fill'),
            mana: document.querySelector('.mana-bar .bar-fill'),
            xp: document.querySelector('.xp-bar .bar-fill')
        };
        
        this.statusValues = {
            health: document.querySelector('.health-bar .status-value'),
            mana: document.querySelector('.mana-bar .status-value'),
            xp: document.querySelector('.xp-bar .status-value')
        };
        
        // Create character stats panel
        this.createStatsPanel();
        
        // Create skills panel
        this.createSkillsPanel();
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Create character stats panel
     */
    createStatsPanel() {
        // Create panel element
        this.statsPanel = document.createElement('div');
        this.statsPanel.className = 'character-stats-panel hidden';
        
        // Add panel content
        this.statsPanel.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">Character Stats</div>
                <button id="closeStatsBtn" class="close-button">&times;</button>
            </div>
            <div class="panel-content">
                <div class="character-header">
                    <div class="character-portrait" id="statsPortrait"></div>
                    <div class="character-info">
                        <div class="character-name" id="statsName">Character Name</div>
                        <div class="character-class" id="statsClass">Character Class</div>
                        <div class="character-level" id="statsLevel">Level 1</div>
                    </div>
                </div>
                
                <div class="stats-section">
                    <h3>Attributes</h3>
                    <div class="stats-grid" id="attributesGrid">
                        <!-- Attributes will be populated dynamically -->
                    </div>
                </div>
                
                <div class="stats-section">
                    <h3>Derived Stats</h3>
                    <div class="stats-grid" id="derivedStatsGrid">
                        <!-- Derived stats will be populated dynamically -->
                    </div>
                </div>
                
                <div class="stats-section">
                    <h3>Equipment</h3>
                    <div class="equipment-slots" id="equipmentSlots">
                        <!-- Equipment slots will be populated dynamically -->
                    </div>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(this.statsPanel);
    }
    
    /**
     * Create skills panel
     */
    createSkillsPanel() {
        // Create panel element
        this.skillsPanel = document.createElement('div');
        this.skillsPanel.className = 'character-skills-panel hidden';
        
        // Add panel content
        this.skillsPanel.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">Skills & Abilities</div>
                <button id="closeSkillsBtn" class="close-button">&times;</button>
            </div>
            <div class="panel-content">
                <div class="skills-tabs">
                    <button class="tab-button active" data-tab="active">Active</button>
                    <button class="tab-button" data-tab="passive">Passive</button>
                    <button class="tab-button" data-tab="all">All</button>
                </div>
                
                <div class="skills-grid" id="skillsGrid">
                    <!-- Skills will be populated dynamically -->
                </div>
                
                <div class="skill-details" id="skillDetails">
                    <!-- Selected skill details will be shown here -->
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(this.skillsPanel);
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Character panel toggle with C key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'c') {
                this.toggleStatsPanel();
            }
            
            if (e.key === 'k') {
                this.toggleSkillsPanel();
            }
        });
        
        // Close button for stats panel
        document.getElementById('closeStatsBtn').addEventListener('click', () => {
            this.hideStatsPanel();
        });
        
        // Close button for skills panel
        document.getElementById('closeSkillsBtn').addEventListener('click', () => {
            this.hideSkillsPanel();
        });
        
        // Tab buttons in skills panel
        const tabButtons = this.skillsPanel.querySelectorAll('.skills-tabs .tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked tab
                button.classList.add('active');
                
                // Filter skills based on tab
                this.filterSkills(button.dataset.tab);
            });
        });
    }
    
    /**
     * Update status bars with player stats
     */
    updateStatusBars() {
        if (!this.game.player) return;
        
        const player = this.game.player;
        
        // Update health bar
        if (this.statusBars.health && this.statusValues.health) {
            const healthPercent = (player.health / player.maxHealth) * 100;
            this.statusBars.health.style.width = `${healthPercent}%`;
            this.statusValues.health.textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;
            
            // Change color based on health percentage
            if (healthPercent < 25) {
                this.statusBars.health.style.backgroundColor = '#e74c3c';
            } else if (healthPercent < 50) {
                this.statusBars.health.style.backgroundColor = '#f39c12';
            } else {
                this.statusBars.health.style.backgroundColor = '#2ecc71';
            }
        }
        
        // Update mana bar
        if (this.statusBars.mana && this.statusValues.mana) {
            const manaPercent = (player.mana / player.maxMana) * 100;
            this.statusBars.mana.style.width = `${manaPercent}%`;
            this.statusValues.mana.textContent = `${Math.ceil(player.mana)}/${player.maxMana}`;
        }
        
        // Update XP bar
        if (this.statusBars.xp && this.statusValues.xp) {
            const xpPercent = (player.xp / player.experienceToNextLevel) * 100;
            this.statusBars.xp.style.width = `${xpPercent}%`;
            this.statusValues.xp.textContent = `${player.xp}/${player.experienceToNextLevel}`;
        }
    }
    
    /**
     * Show character stats panel
     */
    showStatsPanel() {
        if (this.isStatsOpen) return;
        
        // Hide skills panel if open
        if (this.isSkillsOpen) {
            this.hideSkillsPanel();
        }
        
        // Update stats
        this.updateStats();
        
        // Show panel
        this.statsPanel.classList.remove('hidden');
        this.isStatsOpen = true;
        
        // Play open sound
        if (this.game.audioManager) {
            this.game.audioManager.playUISound('open');
        }
        
        // Set previous game state
        this.previousGameState = this.game.state;
        this.game.state = 'menu';
    }
    
    /**
     * Hide character stats panel
     */
    hideStatsPanel() {
        if (!this.isStatsOpen) return;
        
        // Hide panel
        this.statsPanel.classList.add('hidden');
        this.isStatsOpen = false;
        
        // Play close sound
        if (this.game.audioManager) {
            this.game.audioManager.playUISound('close');
        }
        
        // Restore previous game state
        this.game.state = this.previousGameState || 'running';
    }
    
    /**
     * Toggle character stats panel
     */
    toggleStatsPanel() {
        if (this.isStatsOpen) {
            this.hideStatsPanel();
        } else {
            this.showStatsPanel();
        }
    }
    
    /**
     * Show skills panel
     */
    showSkillsPanel() {
        if (this.isSkillsOpen) return;
        
        // Hide stats panel if open
        if (this.isStatsOpen) {
            this.hideStatsPanel();
        }
        
        // Update skills
        this.updateSkills();
        
        // Show panel
        this.skillsPanel.classList.remove('hidden');
        this.isSkillsOpen = true;
        
        // Play open sound
        if (this.game.audioManager) {
            this.game.audioManager.playUISound('open');
        }
        
        // Set previous game state
        this.previousGameState = this.game.state;
        this.game.state = 'menu';
    }
    
    /**
     * Hide skills panel
     */
    hideSkillsPanel() {
        if (!this.isSkillsOpen) return;
        
        // Hide panel
        this.skillsPanel.classList.add('hidden');
        this.isSkillsOpen = false;
        
        // Play close sound
        if (this.game.audioManager) {
            this.game.audioManager.playUISound('close');
        }
        
        // Restore previous game state
        this.game.state = this.previousGameState || 'running';
    }
    
    /**
     * Toggle skills panel
     */
    toggleSkillsPanel() {
        if (this.isSkillsOpen) {
            this.hideSkillsPanel();
        } else {
            this.showSkillsPanel();
        }
    }
    
    /**
     * Update stats display with current player data
     */
    updateStats() {
        if (!this.game.player) return;
        
        const player = this.game.player;
        
        // Update basic info
        document.getElementById('statsName').textContent = player.name;
        document.getElementById('statsClass').textContent = player.character_class.charAt(0).toUpperCase() + 
                                                          player.character_class.slice(1);
        document.getElementById('statsLevel').textContent = `Level ${player.level}`;
        
        // Update portrait based on class/appearance
        const portrait = document.getElementById('statsPortrait');
        if (portrait) {
            // Set appropriate sprite offset based on class
            let spriteOffset = 0;
            switch (player.character_class) {
                case 'warrior': spriteOffset = 0; break;
                case 'mage': spriteOffset = -100; break;
                case 'rogue': spriteOffset = -200; break;
                case 'bard': spriteOffset = -300; break;
                default: spriteOffset = 0;
            }
            
            portrait.style.backgroundPosition = `${spriteOffset}px 0`;
        }
        
        // Update attributes grid
        const attributesGrid = document.getElementById('attributesGrid');
        if (attributesGrid) {
            attributesGrid.innerHTML = '';
            
            // Create stat entries for primary attributes
            this.createStatEntry(attributesGrid, 'Strength', player.attributes.strength);
            this.createStatEntry(attributesGrid, 'Intelligence', player.attributes.intelligence);
            this.createStatEntry(attributesGrid, 'Agility', player.attributes.agility);
            this.createStatEntry(attributesGrid, 'Charisma', player.attributes.charisma);
        }
        
        // Update derived stats grid
        const derivedStatsGrid = document.getElementById('derivedStatsGrid');
        if (derivedStatsGrid) {
            derivedStatsGrid.innerHTML = '';
            
            // Create stat entries for derived stats
            this.createStatEntry(derivedStatsGrid, 'Physical Defense', player.attributes.physical_defense);
            this.createStatEntry(derivedStatsGrid, 'Magic Defense', player.attributes.magic_defense);
            this.createStatEntry(derivedStatsGrid, 'Critical Chance', `${player.attributes.critical_chance}%`);
        }
        
        // Update equipment slots
        const equipmentSlots = document.getElementById('equipmentSlots');
        if (equipmentSlots) {
            equipmentSlots.innerHTML = '';
            
            // Create equipment slots
            const slots = [
                { id: 'head', name: 'Head' },
                { id: 'body', name: 'Body' },
                { id: 'hands', name: 'Hands' },
                { id: 'feet', name: 'Feet' },
                { id: 'main_hand', name: 'Main Hand' },
                { id: 'off_hand', name: 'Off Hand' },
                { id: 'neck', name: 'Neck' },
                { id: 'ring', name: 'Ring' }
            ];
            
            slots.forEach(slot => {
                const equippedItem = player.equipment && player.equipment[slot.id] ? 
                                    player.equipment[slot.id] : null;
                
                this.createEquipmentSlot(equipmentSlots, slot.id, slot.name, equippedItem);
            });
        }
    }
    
    /**
     * Create a stat entry in a grid
     */
    createStatEntry(container, name, value) {
        const entry = document.createElement('div');
        entry.className = 'stat-entry';
        
        const statName = document.createElement('div');
        statName.className = 'stat-name';
        statName.textContent = name;
        
        const statValue = document.createElement('div');
        statValue.className = 'stat-value';
        statValue.textContent = value;
        
        entry.appendChild(statName);
        entry.appendChild(statValue);
        container.appendChild(entry);
    }
    
    /**
     * Create an equipment slot
     */
    createEquipmentSlot(container, id, name, item) {
        const slot = document.createElement('div');
        slot.className = 'equipment-slot';
        slot.dataset.slot = id;
        
        const slotName = document.createElement('div');
        slotName.className = 'slot-name';
        slotName.textContent = name;
        
        const slotItem = document.createElement('div');
        slotItem.className = 'slot-item';
        
        if (item) {
            // Show equipped item
            slotItem.textContent = item.name;
            slotItem.style.color = this.getRarityColor(item.rarity);
            
            // Add tooltip with item details
            slotItem.title = `${item.name} (${item.rarity})\n${item.description}`;
            
            // Add click handler to show item details
            slotItem.addEventListener('click', () => {
                if (this.game.inventoryUI) {
                    this.game.inventoryUI.showItemDetails(item);
                }
            });
        } else {
            // Show empty slot
            slotItem.textContent = '(empty)';
            slotItem.classList.add('empty');
        }
        
        slot.appendChild(slotName);
        slot.appendChild(slotItem);
        container.appendChild(slot);
    }
    
    /**
     * Update skills display with current player data
     */
    updateSkills() {
        if (!this.game.player) return;
        
        const player = this.game.player;
        
        // Set active tab as default filter
        this.filterSkills('active');
    }
    
    /**
     * Filter skills based on tab selection
     */
    filterSkills(filter) {
        if (!this.game.player) return;
        
        const player = this.game.player;
        const skillsGrid = document.getElementById('skillsGrid');
        
        if (!skillsGrid) return;
        
        // Clear current skills
        skillsGrid.innerHTML = '';
        
        // Apply filter
        let filteredSkills = [];
        
        if (filter === 'all') {
            filteredSkills = player.skills || [];
        } else {
            filteredSkills = (player.skills || []).filter(skill => {
                return skill.skill_type === filter;
            });
        }
        
        // Display skills
        if (filteredSkills.length > 0) {
            filteredSkills.forEach(skill => {
                this.createSkillEntry(skillsGrid, skill);
            });
        } else {
            // Show message if no skills found
            const noSkills = document.createElement('div');
            noSkills.className = 'no-skills-message';
            noSkills.textContent = `No ${filter} skills available.`;
            skillsGrid.appendChild(noSkills);
        }
    }
    
    /**
     * Create a skill entry
     */
    createSkillEntry(container, skill) {
        const entry = document.createElement('div');
        entry.className = 'skill-entry';
        entry.dataset.skillId = skill.id;
        
        const skillIcon = document.createElement('div');
        skillIcon.className = 'skill-icon';
        
        // Set icon based on skill type/name
        let iconOffset = 0;
        switch (skill.skill_name) {
            case 'slash': iconOffset = 0; break;
            case 'fireball': iconOffset = -40; break;
            case 'heal': iconOffset = -80; break;
            case 'stealth': iconOffset = -120; break;
            default: iconOffset = 0;
        }
        
        skillIcon.style.backgroundPosition = `${iconOffset}px 0`;
        
        const skillInfo = document.createElement('div');
        skillInfo.className = 'skill-info';
        
        const skillName = document.createElement('div');
        skillName.className = 'skill-name';
        skillName.textContent = skill.skill_name.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
        
        const skillLevel = document.createElement('div');
        skillLevel.className = 'skill-level';
        skillLevel.textContent = `Level ${skill.skill_level}`;
        
        skillInfo.appendChild(skillName);
        skillInfo.appendChild(skillLevel);
        
        entry.appendChild(skillIcon);
        entry.appendChild(skillInfo);
        
        // Add click handler to show skill details
        entry.addEventListener('click', () => {
            this.showSkillDetails(skill);
        });
        
        container.appendChild(entry);
    }
    
    /**
     * Show skill details
     */
    showSkillDetails(skill) {
        const skillDetails = document.getElementById('skillDetails');
        if (!skillDetails) return;
        
        // Format skill name
        const formattedName = skill.skill_name.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
        
        // Create details content
        let detailsHTML = `
            <h3>${formattedName}</h3>
            <div class="skill-level-detail">Level ${skill.skill_level}</div>
            <p class="skill-description">${skill.skill_description || 'No description available.'}</p>
        `;
        
        // Add skill effects if available
        const effect = skill.skill_effect ? JSON.parse(skill.skill_effect) : {};
        
        if (Object.keys(effect).length > 0) {
            detailsHTML += `<div class="skill-effects"><h4>Effects:</h4><ul>`;
            
            for (const [key, value] of Object.entries(effect)) {
                detailsHTML += `<li><span class="effect-name">${key}:</span> ${value}</li>`;
            }
            
            detailsHTML += `</ul></div>`;
        }
        
        // Show hotkey if assigned
        const hotkey = this.getSkillHotkey(skill.id);
        if (hotkey) {
            detailsHTML += `<div class="skill-hotkey">Hotkey: ${hotkey}</div>`;
        } else {
            detailsHTML += `
                <div class="assign-hotkey">
                    <button class="assign-hotkey-btn" data-skill-id="${skill.id}">Assign Hotkey</button>
                </div>
            `;
        }
        
        // Update details content
        skillDetails.innerHTML = detailsHTML;
        
        // Add event listener for assign hotkey button
        const assignBtn = skillDetails.querySelector('.assign-hotkey-btn');
        if (assignBtn) {
            assignBtn.addEventListener('click', () => {
                this.startHotkeyAssignment(skill.id);
            });
        }
        
        // Show the details
        skillDetails.style.display = 'block';
        
        // Play select sound
        if (this.game.audioManager) {
            this.game.audioManager.playUISound('click');
        }
    }
    
    /**
     * Start hotkey assignment process
     */
    startHotkeyAssignment(skillId) {
        const skillDetails = document.getElementById('skillDetails');
        if (!skillDetails) return;
        
        // Create prompt
        const promptHTML = `
            <div class="hotkey-prompt">
                Press a key to assign as hotkey for this skill...
                <button class="cancel-hotkey-btn">Cancel</button>
            </div>
        `;
        
        // Add prompt to details
        skillDetails.innerHTML += promptHTML;
        
        // Add event listener for cancel button
        const cancelBtn = skillDetails.querySelector('.cancel-hotkey-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                // Remove the prompt
                const prompt = skillDetails.querySelector('.hotkey-prompt');
                if (prompt) {
                    prompt.remove();
                }
            });
        }
        
        // Add temporary event listener for key press
        const handleKeyPress = (e) => {
            // Ignore certain keys
            if (['Escape', 'Tab', 'Control', 'Alt', 'Shift'].includes(e.key)) {
                return;
            }
            
            // Assign hotkey
            this.assignSkillHotkey(skillId, e.key);
            
            // Remove the prompt
            const prompt = skillDetails.querySelector('.hotkey-prompt');
            if (prompt) {
                prompt.remove();
            }
            
            // Remove event listener
            document.removeEventListener('keydown', handleKeyPress);
            
            // Update skill details
            this.showSkillDetails(this.getSkillById(skillId));
        };
        
        document.addEventListener('keydown', handleKeyPress);
    }
    
    /**
     * Assign a hotkey to a skill
     */
    assignSkillHotkey(skillId, key) {
        // In a real implementation, this would store the hotkey mapping
        // For simplicity, we'll just use local storage
        const hotkeyMap = JSON.parse(localStorage.getItem('skillHotkeys') || '{}');
        hotkeyMap[skillId] = key;
        localStorage.setItem('skillHotkeys', JSON.stringify(hotkeyMap));
        
        // Play confirm sound
        if (this.game.audioManager) {
            this.game.audioManager.playUISound('confirm');
        }
    }
    
    /**
     * Get the hotkey assigned to a skill
     */
    getSkillHotkey(skillId) {
        // In a real implementation, this would retrieve from a persistent store
        const hotkeyMap = JSON.parse(localStorage.getItem('skillHotkeys') || '{}');
        return hotkeyMap[skillId];
    }
    
    /**
     * Get a skill by ID
     */
    getSkillById(skillId) {
        if (!this.game.player || !this.game.player.skills) return null;
        
        return this.game.player.skills.find(skill => skill.id === skillId);
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
}

// Export for use in main game
window.CharacterUI = CharacterUI;