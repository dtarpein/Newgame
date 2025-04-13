/**
 * Dialog System
 * Handles conversation dialogs with NPCs and story events
 */
class DialogSystem {
    constructor(game) {
        this.game = game;
        this.isOpen = false;
        
        // Current dialog state
        this.currentNPC = null;
        this.dialogHistory = [];
        this.responseOptions = [];
        
        // UI Elements
        this.panel = document.getElementById('dialogPanel');
        this.titleEl = document.getElementById('dialogTitle');
        this.contentEl = document.getElementById('dialogContent');
        this.optionsEl = document.getElementById('dialogOptions');
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Initialize dialog event listeners
     */
    initEventListeners() {
        // Close button
        const closeButton = document.getElementById('closeDialogBtn');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.close();
            });
        }
        
        // Keyboard shortcut (ESC to close)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    /**
     * Show dialog with an NPC
     */
    startDialog(npc, initialDialog) {
        // Set current NPC
        this.currentNPC = npc;
        
        // Reset dialog history
        this.dialogHistory = [];
        
        // Set dialog title
        this.titleEl.textContent = npc.name;
        
        // Show initial dialog
        this.showDialogText(initialDialog || npc.getDialogue('greeting'));
        
        // Show panel
        this.panel.classList.remove('hidden');
        this.isOpen = true;
        
        // Play sound
        if (this.game.audioManager) {
            this.game.audioManager.playUISound('open');
        }
        
        // Set previous game state
        this.previousGameState = this.game.state;
        this.game.state = 'dialogue';
    }
    
    /**
     * Show a story dialog (no NPC)
     */
    showStoryDialog(title, content, options) {
        // Clear current NPC
        this.currentNPC = null;
        
        // Reset dialog history
        this.dialogHistory = [];
        
        // Set dialog title
        this.titleEl.textContent = title;
        
        // Show content
        this.showDialogText(content, options);
        
        // Show panel
        this.panel.classList.remove('hidden');
        this.isOpen = true;
        
        // Play sound
        if (this.game.audioManager) {
            this.game.audioManager.playUISound('open');
        }
        
        // Set previous game state
        this.previousGameState = this.game.state;
        this.game.state = 'dialogue';
    }
    
    /**
     * Show dialog text and response options
     */
    showDialogText(text, options = []) {
        // Store in history
        this.dialogHistory.push({ 
            speaker: this.currentNPC ? this.currentNPC.name : 'Narrator',
            text: text
        });
        
        // Update text with typing effect
        this.typeText(text);
        
        // Store response options
        this.responseOptions = options;
        
        // Show response options
        this.updateResponseOptions();
    }
    
    /**
     * Apply typing effect to dialog text
     */
    typeText(text) {
        // Clear current content
        this.contentEl.textContent = '';
        
        if (!text) return;
        
        // Determine typing speed based on text length
        const typingSpeed = Math.max(10, Math.min(30, 20 - Math.floor(text.length / 50)));
        
        // Type each character with delay
        let i = 0;
        const typeInterval = setInterval(() => {
            if (i < text.length) {
                this.contentEl.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(typeInterval);
                
                // Make sure all response options are shown after typing is complete
                this.updateResponseOptions(true);
                
                // Indicate typing is complete
                this.contentEl.dataset.typingComplete = 'true';
            }
        }, typingSpeed);
        
        // Store interval reference to cancel if needed
        this.typeInterval = typeInterval;
        
        // Allow clicking to skip typing animation
        this.contentEl.onclick = () => {
            clearInterval(this.typeInterval);
            this.contentEl.textContent = text;
            this.contentEl.dataset.typingComplete = 'true';
            this.updateResponseOptions(true);
        };
    }
    
    /**
     * Update response options in the UI
     */
    updateResponseOptions(forceShow = false) {
        // Clear current options
        this.optionsEl.innerHTML = '';
        
        // Don't show options until typing is complete unless forced
        if (!forceShow && this.contentEl.dataset.typingComplete !== 'true') {
            return;
        }
        
        // If there are specific response options, show them
        if (this.responseOptions && this.responseOptions.length > 0) {
            this.responseOptions.forEach((option, index) => {
                const button = document.createElement('button');
                button.className = 'dialog-option';
                button.textContent = option.text;
                
                button.addEventListener('click', () => {
                    // Handle option click
                    this.handleResponseOption(option, index);
                    
                    // Play click sound
                    if (this.game.audioManager) {
                        this.game.audioManager.playUISound('click');
                    }
                });
                
                this.optionsEl.appendChild(button);
            });
        } 
        // Otherwise show standard continue/end options
        else {
            // If we have an NPC, show Continue or End Conversation
            if (this.currentNPC) {
                const hasMoreDialogue = this.currentNPC.hasMoreDialogue();
                
                const button = document.createElement('button');
                button.className = 'dialog-option';
                button.textContent = hasMoreDialogue ? 'Continue' : 'End Conversation';
                
                button.addEventListener('click', () => {
                    if (hasMoreDialogue) {
                        // Get next dialogue
                        const nextDialogue = this.currentNPC.getNextDialogue();
                        this.showDialogText(nextDialogue);
                    } else {
                        // End conversation
                        this.close();
                    }
                    
                    // Play click sound
                    if (this.game.audioManager) {
                        this.game.audioManager.playUISound('click');
                    }
                });
                
                this.optionsEl.appendChild(button);
                
                // If NPC is a shopkeeper, add Trade option
                if (this.currentNPC.isShopkeeper) {
                    const tradeButton = document.createElement('button');
                    tradeButton.className = 'dialog-option';
                    tradeButton.textContent = 'Trade';
                    
                    tradeButton.addEventListener('click', () => {
                        // Close dialog and open shop
                        this.close();
                        this.game.openShop(this.currentNPC);
                        
                        // Play trade sound
                        if (this.game.audioManager) {
                            this.game.audioManager.playUISound('inventory');
                        }
                    });
                    
                    this.optionsEl.appendChild(tradeButton);
                }
                
                // If NPC is a quest giver, add Quest option
                if (this.currentNPC.isQuestGiver) {
                    const questButton = document.createElement('button');
                    questButton.className = 'dialog-option';
                    questButton.textContent = 'Quests';
                    
                    questButton.addEventListener('click', () => {
                        // Close dialog and open quest dialog
                        this.close();
                        this.game.openQuestDialog(this.currentNPC);
                        
                        // Play quest sound
                        if (this.game.audioManager) {
                            this.game.audioManager.playUISound('confirm');
                        }
                    });
                    
                    this.optionsEl.appendChild(questButton);
                }
            } 
            // If no NPC (story dialog), just show Continue or Close
            else {
                const button = document.createElement('button');
                button.className = 'dialog-option';
                button.textContent = 'Continue';
                
                button.addEventListener('click', () => {
                    // Just close the dialog
                    this.close();
                    
                    // Play close sound
                    if (this.game.audioManager) {
                        this.game.audioManager.playUISound('click');
                    }
                });
                
                this.optionsEl.appendChild(button);
            }
        }
    }
    
    /**
     * Handle when player selects a response option
     */
    handleResponseOption(option, index) {
        // Add player response to history
        this.dialogHistory.push({
            speaker: 'Player',
            text: option.text
        });
        
        // If option has a next dialog, show it
        if (option.nextDialog) {
            this.showDialogText(option.nextDialog, option.nextOptions);
        } 
        // If option has an action, execute it
        else if (option.action) {
            // Close dialog first if needed
            if (option.closeDialog) {
                this.close();
            }
            
            // Execute the action
            option.action(this.game, this.currentNPC);
        } 
        // Otherwise, just close the dialog
        else {
            this.close();
        }
    }
    
    /**
     * Close the dialog
     */
    close() {
        if (!this.isOpen) return;
        
        // Cancel any ongoing typing animation
        if (this.typeInterval) {
            clearInterval(this.typeInterval);
            this.typeInterval = null;
        }
        
        // Hide panel
        this.panel.classList.add('hidden');
        this.isOpen = false;
        
        // Clear current NPC
        this.currentNPC = null;
        
        // Play close sound
        if (this.game.audioManager) {
            this.game.audioManager.playUISound('close');
        }
        
        // Restore previous game state
        this.game.state = this.previousGameState || 'running';
    }
    
    /**
     * Create a simple choice dialog
     */
    showChoiceDialog(title, question, choices) {
        // Format options for the dialog system
        const options = choices.map(choice => ({
            text: choice.text,
            action: choice.action,
            closeDialog: true
        }));
        
        // Show dialog
        this.showStoryDialog(title, question, options);
    }
    
    /**
     * Create a notification dialog
     */
    showNotification(title, message) {
        // Show dialog with just a continue option
        this.showStoryDialog(title, message, []);
    }
    
    /**
     * Show quest dialog
     */
    showQuestDialog(quest, isComplete = false) {
        let title = quest.title;
        let content = quest.description + "\n\n" + quest.objective;
        
        // Add reward information
        content += "\n\nRewards:";
        content += `\n• ${quest.xp_reward} XP`;
        content += `\n• ${quest.gold_reward} Gold`;
        
        if (quest.reward_items && quest.reward_items.length > 0) {
            quest.reward_items.forEach(item => {
                content += `\n• ${item.name}`;
            });
        }
        
        // Add current progress for active quests
        if (!isComplete && quest.steps && quest.steps.length > 0) {
            content += "\n\nProgress:";
            
            quest.steps.forEach((step, index) => {
                const isCurrentStep = index + 1 === quest.current_step;
                const isCompleted = index + 1 < quest.current_step;
                
                content += `\n${isCompleted ? '✓' : isCurrentStep ? '▶' : '○'} ${step.description}`;
            });
        }
        
        // Create options based on quest state
        const options = [];
        
        if (isComplete) {
            // Completed quest
            options.push({
                text: "Close",
                closeDialog: true
            });
        } else if (!quest.active) {
            // New quest
            options.push({
                text: "Accept Quest",
                action: (game) => {
                    game.acceptQuest(quest.id);
                },
                closeDialog: true
            });
            
            options.push({
                text: "Decline",
                closeDialog: true
            });
        } else {
            // Active quest
            options.push({
                text: "Close",
                closeDialog: true
            });
            
            // Add abandon option for non-main quests
            if (quest.quest_type !== 'main') {
                options.push({
                    text: "Abandon Quest",
                    action: (game) => {
                        game.abandonQuest(quest.id);
                    },
                    closeDialog: true
                });
            }
        }
        
        // Show dialog
        this.showStoryDialog(title, content, options);
    }
}

// Export for use in main game
window.DialogSystem = DialogSystem;