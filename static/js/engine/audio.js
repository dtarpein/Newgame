// Audio system for Realm Weaver
// This module handles music and sound effects for the game

(function() {
    // Store audio elements
    const audioElements = {
        music: {},
        effects: {}
    };
    
    // Current playing music
    let currentMusic = null;
    
    // Audio volume settings
    const volume = {
        master: 1.0,
        music: 0.7,
        effects: 0.8
    };
    
    // Audio enabled flag
    let audioEnabled = true;
    
    // Initialize audio system
    function init() {
        // Try to preload common sounds
        preloadSounds();
        
        console.log('Audio system initialized');
        return true;
    }
    
    // Preload common sounds
    function preloadSounds() {
        // Background music
        preloadMusic('main_theme', '/static/assets/audio/music/main_theme.mp3');
        preloadMusic('combat', '/static/assets/audio/music/combat.mp3');
        preloadMusic('town', '/static/assets/audio/music/town.mp3');
        
        // Sound effects
        preloadEffect('footstep', '/static/assets/audio/effects/footstep.mp3');
        preloadEffect('menu_click', '/static/assets/audio/effects/menu_click.mp3');
        preloadEffect('attack', '/static/assets/audio/effects/attack.mp3');
        preloadEffect('item_pickup', '/static/assets/audio/effects/item_pickup.mp3');
    }
    
    // Preload music track
    function preloadMusic(id, url) {
        const audio = new Audio();
        audio.src = url;
        audio.preload = 'auto';
        audio.loop = true;
        audio.volume = volume.master * volume.music;
        
        audioElements.music[id] = audio;
        
        // Handle loading error gracefully
        audio.onerror = function() {
            console.warn(`Failed to load music: ${id}`);
            delete audioElements.music[id];
        };
    }
    
    // Preload sound effect
    function preloadEffect(id, url) {
        const audio = new Audio();
        audio.src = url;
        audio.preload = 'auto';
        audio.volume = volume.master * volume.effects;
        
        audioElements.effects[id] = audio;
        
        // Handle loading error gracefully
        audio.onerror = function() {
            console.warn(`Failed to load sound effect: ${id}`);
            delete audioElements.effects[id];
        };
    }
    
    // Play music
    function playMusic(id, fadeInTime = 1000) {
        if (!audioEnabled) return;
        
        // Check if music exists
        if (!audioElements.music[id]) {
            console.warn(`Music not found: ${id}`);
            return false;
        }
        
        // Stop current music if playing
        if (currentMusic) {
            stopMusic(true);
        }
        
        // Set as current music
        currentMusic = id;
        const music = audioElements.music[id];
        
        // Reset music to beginning
        music.currentTime = 0;
        
        // Fade in
        if (fadeInTime > 0) {
            music.volume = 0;
            music.play();
            
            // Gradually increase volume
            const startTime = Date.now();
            const targetVolume = volume.master * volume.music;
            
            function fadeIn() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / fadeInTime, 1);
                
                music.volume = targetVolume * progress;
                
                if (progress < 1) {
                    requestAnimationFrame(fadeIn);
                }
            }
            
            fadeIn();
        } else {
            // Play immediately at normal volume
            music.volume = volume.master * volume.music;
            music.play();
        }
        
        return true;
    }
    
    // Stop music
    function stopMusic(fadeOut = false, fadeOutTime = 1000) {
        if (!currentMusic) return;
        
        const music = audioElements.music[currentMusic];
        
        // Fade out
        if (fadeOut) {
            const startTime = Date.now();
            const startVolume = music.volume;
            
            function fadeOut() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / fadeOutTime, 1);
                
                music.volume = startVolume * (1 - progress);
                
                if (progress < 1) {
                    requestAnimationFrame(fadeOut);
                } else {
                    music.pause();
                    music.currentTime = 0;
                }
            }
            
            fadeOut();
        } else {
            // Stop immediately
            music.pause();
            music.currentTime = 0;
        }
        
        currentMusic = null;
    }
    
    // Pause music
    function pauseMusic() {
        if (!currentMusic) return;
        
        audioElements.music[currentMusic].pause();
    }
    
    // Resume music
    function resumeMusic() {
        if (!currentMusic || !audioEnabled) return;
        
        audioElements.music[currentMusic].play();
    }
    
    // Play sound effect
    function playEffect(id, volume = 1.0) {
        if (!audioEnabled) return;
        
        // Check if effect exists
        if (!audioElements.effects[id]) {
            console.warn(`Sound effect not found: ${id}`);
            return false;
        }
        
        // Clone the audio element to allow overlapping sounds
        const sound = audioElements.effects[id].cloneNode();
        sound.volume = volume.master * volume.effects * volume;
        
        // Play the sound
        sound.play();
        
        // Clean up after playing
        sound.onended = function() {
            sound.remove();
        };
        
        return true;
    }
    
    // Set master volume
    function setMasterVolume(level) {
        volume.master = Math.max(0, Math.min(1, level));
        
        // Update all current audio
        updateAllVolumes();
    }
    
    // Set music volume
    function setMusicVolume(level) {
        volume.music = Math.max(0, Math.min(1, level));
        
        // Update music volumes
        for (const id in audioElements.music) {
            audioElements.music[id].volume = volume.master * volume.music;
        }
    }
    
    // Set effects volume
    function setEffectsVolume(level) {
        volume.effects = Math.max(0, Math.min(1, level));
        
        // Effects are set individually when played
    }
    
    // Update all audio volumes
    function updateAllVolumes() {
        // Update music volumes
        for (const id in audioElements.music) {
            audioElements.music[id].volume = volume.master * volume.music;
        }
        
        // Effects are set individually when played
    }
    
    // Toggle audio
    function toggleAudio() {
        audioEnabled = !audioEnabled;
        
        if (audioEnabled) {
            // Resume music if it was playing
            if (currentMusic) {
                resumeMusic();
            }
        } else {
            // Pause all audio
            for (const id in audioElements.music) {
                audioElements.music[id].pause();
            }
        }
        
        return audioEnabled;
    }
    
    // Expose public API
    window.GameAudio = {
        init,
        playMusic,
        stopMusic,
        pauseMusic,
        resumeMusic,
        playEffect,
        setMasterVolume,
        setMusicVolume,
        setEffectsVolume,
        toggleAudio
    };
})();