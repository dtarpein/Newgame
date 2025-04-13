/**
 * Audio Manager for game sounds and music
 */
class AudioManager {
    constructor() {
        // Audio context
        this.context = null;
        this.initialized = false;
        
        // Sound buffers
        this.sounds = {};
        
        // Background music
        this.backgroundMusic = null;
        this.musicVolume = 0.3;
        this.soundVolume = 0.5;
        this.musicEnabled = true;
        this.soundEnabled = true;
        
        // Current music track
        this.currentMusic = null;
        
        // Ambient sound effects
        this.ambientSounds = {};
        
        // Audio groups for organization
        this.groups = {
            ui: { volume: 0.8 },
            footsteps: { volume: 0.5 },
            combat: { volume: 0.7 },
            ambient: { volume: 0.4 },
            voice: { volume: 0.9 }
        };
        
        // Initialize audio context on user interaction
        document.addEventListener('click', () => this.initAudio(), { once: true });
    }
    
    /**
     * Initialize audio context
     */
    initAudio() {
        if (this.initialized) return;
        
        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
            
            // Create master volume node
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);
            
            // Create group nodes
            this.groupNodes = {};
            for (const groupName in this.groups) {
                const group = this.groups[groupName];
                const gainNode = this.context.createGain();
                gainNode.gain.value = group.volume;
                gainNode.connect(this.masterGain);
                this.groupNodes[groupName] = gainNode;
            }
            
            // Load common sounds
            this.loadSounds();
            
            this.initialized = true;
            console.log('Audio system initialized');
        } catch (e) {
            console.error('Could not initialize audio system:', e);
        }
    }
    
    /**
     * Load common game sounds
     */
    loadSounds() {
        // Define sounds to load
        const soundsToLoad = [
            { name: 'click', url: '/static/assets/sounds/click.mp3', group: 'ui' },
            { name: 'hover', url: '/static/assets/sounds/hover.mp3', group: 'ui' },
            { name: 'confirm', url: '/static/assets/sounds/confirm.mp3', group: 'ui' },
            { name: 'cancel', url: '/static/assets/sounds/cancel.mp3', group: 'ui' },
            { name: 'menu_open', url: '/static/assets/sounds/menu_open.mp3', group: 'ui' },
            { name: 'menu_close', url: '/static/assets/sounds/menu_close.mp3', group: 'ui' },
            { name: 'inventory', url: '/static/assets/sounds/inventory.mp3', group: 'ui' },
            
            { name: 'footstep_grass', url: '/static/assets/sounds/footstep_grass.mp3', group: 'footsteps' },
            { name: 'footstep_stone', url: '/static/assets/sounds/footstep_stone.mp3', group: 'footsteps' },
            { name: 'footstep_wood', url: '/static/assets/sounds/footstep_wood.mp3', group: 'footsteps' },
            { name: 'footstep_water', url: '/static/assets/sounds/footstep_water.mp3', group: 'footsteps' },
            
            { name: 'sword_slash', url: '/static/assets/sounds/sword_slash.mp3', group: 'combat' },
            { name: 'impact', url: '/static/assets/sounds/impact.mp3', group: 'combat' },
            { name: 'spell_cast', url: '/static/assets/sounds/spell_cast.mp3', group: 'combat' },
            { name: 'bow_fire', url: '/static/assets/sounds/bow_fire.mp3', group: 'combat' },
            { name: 'enemy_hit', url: '/static/assets/sounds/enemy_hit.mp3', group: 'combat' },
            { name: 'player_hit', url: '/static/assets/sounds/player_hit.mp3', group: 'combat' },
            { name: 'enemy_death', url: '/static/assets/sounds/enemy_death.mp3', group: 'combat' },
            
            { name: 'item_pickup', url: '/static/assets/sounds/item_pickup.mp3', group: 'ui' },
            { name: 'gold_pickup', url: '/static/assets/sounds/gold_pickup.mp3', group: 'ui' },
            { name: 'levelup', url: '/static/assets/sounds/levelup.mp3', group: 'ui' },
            { name: 'potion_use', url: '/static/assets/sounds/potion_use.mp3', group: 'ui' },
            
            { name: 'ambient_forest', url: '/static/assets/sounds/ambient_forest.mp3', group: 'ambient' },
            { name: 'ambient_town', url: '/static/assets/sounds/ambient_town.mp3', group: 'ambient' },
            { name: 'ambient_dungeon', url: '/static/assets/sounds/ambient_dungeon.mp3', group: 'ambient' },
            { name: 'ambient_cave', url: '/static/assets/sounds/ambient_cave.mp3', group: 'ambient' },
            { name: 'ambient_night', url: '/static/assets/sounds/ambient_night.mp3', group: 'ambient' },
            
            { name: 'rain_light', url: '/static/assets/sounds/rain_light.mp3', group: 'ambient' },
            { name: 'rain_heavy', url: '/static/assets/sounds/rain_heavy.mp3', group: 'ambient' },
            { name: 'wind', url: '/static/assets/sounds/wind.mp3', group: 'ambient' },
            { name: 'thunder', url: '/static/assets/sounds/thunder.mp3', group: 'ambient' }
        ];
        
        // Load each sound
        soundsToLoad.forEach(sound => {
            this.loadSound(sound.name, sound.url, sound.group);
        });
        
        // Load music tracks
        this.loadMusic('exploration', '/static/assets/sounds/music_exploration.mp3');
        this.loadMusic('combat', '/static/assets/sounds/music_combat.mp3');
        this.loadMusic('town', '/static/assets/sounds/music_town.mp3');
        this.loadMusic('dungeon', '/static/assets/sounds/music_dungeon.mp3');
        this.loadMusic('boss', '/static/assets/sounds/music_boss.mp3');
        this.loadMusic('menu', '/static/assets/sounds/music_menu.mp3');
    }
    
    /**
     * Load a sound file
     */
    loadSound(name, url, group = 'ui') {
        if (!this.context) return;
        
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => this.context.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                this.sounds[name] = {
                    buffer: audioBuffer,
                    group: group
                };
                console.log(`Sound loaded: ${name}`);
            })
            .catch(error => console.error(`Error loading sound ${name}:`, error));
    }
    
    /**
     * Load a music track
     */
    loadMusic(name, url) {
        if (!this.context) return;
        
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => this.context.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                this.sounds[`music_${name}`] = {
                    buffer: audioBuffer,
                    group: 'music'
                };
                console.log(`Music loaded: ${name}`);
            })
            .catch(error => console.error(`Error loading music ${name}:`, error));
    }
    
    /**
     * Play a sound effect
     */
    playSound(name, options = {}) {
        if (!this.context || !this.soundEnabled) return null;
        
        const sound = this.sounds[name];
        if (!sound || !sound.buffer) {
            console.warn(`Sound not found: ${name}`);
            return null;
        }
        
        // Create source
        const source = this.context.createBufferSource();
        source.buffer = sound.buffer;
        
        // Set up playback options
        if (options.loop !== undefined) {
            source.loop = options.loop;
        }
        
        if (options.playbackRate !== undefined) {
            source.playbackRate.value = options.playbackRate;
        }
        
        // Create gain node for volume control
        const gainNode = this.context.createGain();
        const volume = options.volume !== undefined ? options.volume : this.soundVolume;
        gainNode.gain.value = volume;
        
        // Get appropriate group node
        const groupNode = this.groupNodes[sound.group] || this.masterGain;
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(groupNode);
        
        // Play sound
        if (options.delay) {
            source.start(this.context.currentTime + options.delay);
        } else {
            source.start(0);
        }
        
        // Handle stopping for looping sounds
        let stopHandler = null;
        if (source.loop && options.duration) {
            stopHandler = setTimeout(() => {
                this.stopSound(source);
            }, options.duration);
        }
        
        // Store for ambient sounds if needed
        if (options.ambient) {
            this.ambientSounds[name] = {
                source: source,
                gain: gainNode,
                stopHandler: stopHandler
            };
        }
        
        return {
            source: source,
            gain: gainNode,
            stopHandler: stopHandler
        };
    }
    
    /**
     * Stop a specific sound
     */
    stopSound(soundObj) {
        if (!soundObj) return;
        
        if (soundObj.source) {
            try {
                soundObj.source.stop();
            } catch (e) {
                // Already stopped
            }
        }
        
        if (soundObj.stopHandler) {
            clearTimeout(soundObj.stopHandler);
        }
    }
    
    /**
     * Play background music
     */
    playMusic(name, fadeInTime = 2) {
        if (!this.context || !this.musicEnabled) return;
        
        // Check if this track is already playing
        if (this.currentMusic === name && this.backgroundMusic) {
            return;
        }
        
        const musicKey = `music_${name}`;
        const music = this.sounds[musicKey];
        if (!music || !music.buffer) {
            console.warn(`Music not found: ${name}`);
            return;
        }
        
        // Fade out current music if playing
        if (this.backgroundMusic) {
            this.fadeOutMusic(fadeInTime / 2);
        }
        
        // Create source
        const source = this.context.createBufferSource();
        source.buffer = music.buffer;
        source.loop = true;
        
        // Create gain node for volume control
        const gainNode = this.context.createGain();
        
        // Start with zero volume if fading in
        if (fadeInTime > 0) {
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.musicVolume, this.context.currentTime + fadeInTime);
        } else {
            gainNode.gain.value = this.musicVolume;
        }
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Play music
        source.start(0);
        
        // Save references
        this.backgroundMusic = source;
        this.musicGainNode = gainNode;
        this.currentMusic = name;
        
        return {
            source: source,
            gain: gainNode
        };
    }
    
    /**
     * Fade out current music
     */
    fadeOutMusic(fadeTime = 2) {
        if (!this.backgroundMusic || !this.musicGainNode) return;
        
        // Capture current references
        const oldSource = this.backgroundMusic;
        const oldGain = this.musicGainNode;
        
        // Fade out volume
        oldGain.gain.linearRampToValueAtTime(0, this.context.currentTime + fadeTime);
        
        // Stop after fade out
        setTimeout(() => {
            try {
                oldSource.stop();
            } catch (e) {
                // Already stopped
            }
        }, fadeTime * 1000);
        
        // Clear references
        this.backgroundMusic = null;
        this.musicGainNode = null;
        this.currentMusic = null;
    }
    
    /**
     * Stop background music immediately
     */
    stopMusic() {
        if (this.backgroundMusic) {
            try {
                this.backgroundMusic.stop();
            } catch (e) {
                // Already stopped
            }
            this.backgroundMusic = null;
            this.musicGainNode = null;
            this.currentMusic = null;
        }
    }
    
    /**
     * Play ambient sound loop
     */
    playAmbientSound(name, options = {}) {
        // Stop current ambient sound of this type if playing
        this.stopAmbientSound(name);
        
        // Default options for ambient sounds
        const ambientOptions = {
            loop: true,
            ambient: true,
            volume: options.volume || 0.4,
            fadeIn: options.fadeIn || 2,
            duration: options.duration || null
        };
        
        // Create and play the ambient sound
        const soundObj = this.playSound(name, ambientOptions);
        
        // Apply fade in if specified
        if (ambientOptions.fadeIn > 0 && soundObj && soundObj.gain) {
            soundObj.gain.gain.setValueAtTime(0, this.context.currentTime);
            soundObj.gain.gain.linearRampToValueAtTime(
                ambientOptions.volume, 
                this.context.currentTime + ambientOptions.fadeIn
            );
        }
        
        return soundObj;
    }
    
    /**
     * Stop a specific ambient sound
     */
    stopAmbientSound(name, fadeOutTime = 2) {
        const ambient = this.ambientSounds[name];
        if (!ambient) return;
        
        // Fade out if time specified
        if (fadeOutTime > 0 && ambient.gain) {
            const currentVolume = ambient.gain.gain.value;
            ambient.gain.gain.setValueAtTime(currentVolume, this.context.currentTime);
            ambient.gain.gain.linearRampToValueAtTime(0, this.context.currentTime + fadeOutTime);
            
            // Stop after fade out
            setTimeout(() => {
                this.stopSound(ambient);
                delete this.ambientSounds[name];
            }, fadeOutTime * 1000);
        } else {
            // Stop immediately
            this.stopSound(ambient);
            delete this.ambientSounds[name];
        }
    }
    
    /**
     * Stop all ambient sounds
     */
    stopAllAmbientSounds(fadeOutTime = 2) {
        for (const name in this.ambientSounds) {
            this.stopAmbientSound(name, fadeOutTime);
        }
    }
    
    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        if (!this.context || !this.masterGain) return;
        
        const normalizedVolume = Math.max(0, Math.min(1, volume));
        this.masterGain.gain.setValueAtTime(normalizedVolume, this.context.currentTime);
    }
    
    /**
     * Set music volume
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        
        if (this.musicGainNode) {
            this.musicGainNode.gain.setValueAtTime(this.musicVolume, this.context.currentTime);
        }
    }
    
    /**
     * Set sound effects volume
     */
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
    }
    
    /**
     * Set volume for a sound group
     */
    setGroupVolume(groupName, volume) {
        if (!this.groupNodes[groupName]) return;
        
        const normalizedVolume = Math.max(0, Math.min(1, volume));
        this.groups[groupName].volume = normalizedVolume;
        this.groupNodes[groupName].gain.setValueAtTime(normalizedVolume, this.context.currentTime);
    }
    
    /**
     * Enable/disable music
     */
    toggleMusic(enabled) {
        this.musicEnabled = enabled !== undefined ? enabled : !this.musicEnabled;
        
        if (this.musicEnabled && this.currentMusic) {
            this.playMusic(this.currentMusic, 1);
        } else if (!this.musicEnabled) {
            this.fadeOutMusic(1);
        }
    }
    
    /**
     * Enable/disable sound effects
     */
    toggleSound(enabled) {
        this.soundEnabled = enabled !== undefined ? enabled : !this.soundEnabled;
        
        if (!this.soundEnabled) {
            this.stopAllAmbientSounds(1);
        }
    }
    
    /**
     * Play random footstep sound based on terrain
     */
    playFootstep(terrainType) {
        // Map terrain types to footstep sounds
        const footstepMap = {
            'grass': 'footstep_grass',
            'forest': 'footstep_grass',
            'path': 'footstep_stone',
            'stone': 'footstep_stone',
            'mountain': 'footstep_stone',
            'rock': 'footstep_stone',
            'sand': 'footstep_sand',
            'water': 'footstep_water',
            'swamp': 'footstep_water',
            'wooden': 'footstep_wood',
            'wood': 'footstep_wood'
        };
        
        // Get appropriate footstep sound
        const soundName = footstepMap[terrainType] || 'footstep_grass';
        
        // Add slight random variation to footsteps
        this.playSound(soundName, {
            volume: 0.3 + Math.random() * 0.2,  // Random volume
            playbackRate: 0.9 + Math.random() * 0.2  // Random pitch
        });
    }
    
    /**
     * Play environmental sounds based on region and weather
     */
    setEnvironmentalSounds(regionTheme, weather, timeOfDay) {
        // Stop all current ambient sounds with fade out
        this.stopAllAmbientSounds(2);
        
        // Start appropriate ambient background based on region
        switch (regionTheme) {
            case 'forest':
                this.playAmbientSound('ambient_forest', { volume: 0.3 });
                break;
            case 'town':
            case 'village':
                this.playAmbientSound('ambient_town', { volume: 0.3 });
                break;
            case 'dungeon':
            case 'cave':
                this.playAmbientSound('ambient_dungeon', { volume: 0.3 });
                break;
            case 'mountain':
                this.playAmbientSound('wind', { volume: 0.2 });
                break;
            default:
                // No ambient sound for other regions
                break;
        }
        
        // Add weather sounds
        if (weather === 'rain' || weather === 'light_rain') {
            this.playAmbientSound('rain_light', { volume: 0.4 });
        } else if (weather === 'heavy_rain' || weather === 'storm') {
            this.playAmbientSound('rain_heavy', { volume: 0.5 });
            
            // Occasional thunder for storms
            if (weather === 'storm') {
                this.scheduleRandomThunder();
            }
        } else if (weather === 'windy') {
            this.playAmbientSound('wind', { volume: 0.3 });
        }
        
        // Night sounds
        if (timeOfDay === 'night') {
            this.playAmbientSound('ambient_night', { volume: 0.2 });
        }
    }
    
    /**
     * Schedule random thunder sounds during storms
     */
    scheduleRandomThunder() {
        // Play initial thunder with delay
        const initialDelay = Math.random() * 10000 + 5000; // 5-15 seconds
        
        setTimeout(() => {
            this.playSound('thunder', { volume: 0.7 });
            
            // Schedule next thunder if storm is still active
            if (this.ambientSounds['rain_heavy']) {
                this.scheduleRandomThunder();
            }
        }, initialDelay);
    }
    
    /**
     * Play user interface sound
     */
    playUISound(action) {
        switch (action) {
            case 'click':
            case 'select':
                this.playSound('click', { volume: 0.5 });
                break;
            case 'hover':
                this.playSound('hover', { volume: 0.3 });
                break;
            case 'confirm':
                this.playSound('confirm', { volume: 0.5 });
                break;
            case 'cancel':
                this.playSound('cancel', { volume: 0.5 });
                break;
            case 'open':
                this.playSound('menu_open', { volume: 0.5 });
                break;
            case 'close':
                this.playSound('menu_close', { volume: 0.5 });
                break;
            case 'inventory':
                this.playSound('inventory', { volume: 0.5 });
                break;
            case 'error':
                this.playSound('cancel', { volume: 0.6 });
                break;
            default:
                // Default UI sound
                this.playSound('click', { volume: 0.5 });
        }
    }
}