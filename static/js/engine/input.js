/**
 * Input Manager
 * Handles keyboard, mouse, and touch inputs
 */
class InputManager {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        
        // Track key states
        this.keys = {};
        
        // Track mouse position and state
        this.mousePosition = { x: 0, y: 0 };
        this.mouseWorldPosition = { x: 0, y: 0 };
        this.mouseButtons = { left: false, middle: false, right: false };
        this.mouseWheelDelta = 0;
        
        // Track touch state
        this.touches = [];
        this.touchStartPosition = null;
        this.touchCurrentPosition = null;
        this.pinchDistance = 0;
        this.isPinching = false;
        
        // Bind event handlers
        this.bindEvents();
    }
    
    /**
     * Attach event listeners
     */
    bindEvents() {
        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Mouse events
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleMouseWheel.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Prevent scrolling when touching the canvas
        this.canvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
        }, { passive: false });
        
        // Handle losing focus
        window.addEventListener('blur', this.handleBlur.bind(this));
    }
    
    /**
     * Handle key down events
     */
    handleKeyDown(e) {
        this.keys[e.key] = true;
        
        // Prevent default action for movement keys and space
        if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
        
        // Notify game of key change
        this.game.onInputChange({
            type: 'keydown',
            key: e.key,
            movementDirection: this.getMovementDirection()
        });
    }
    
    /**
     * Handle key up events
     */
    handleKeyUp(e) {
        this.keys[e.key] = false;
        
        // Notify game of key change
        this.game.onInputChange({
            type: 'keyup',
            key: e.key,
            movementDirection: this.getMovementDirection()
        });
    }
    
    /**
     * Calculate movement direction based on currently pressed keys
     */
    getMovementDirection() {
        let dx = 0;
        let dy = 0;
        
        // WASD or Arrow keys
        if (this.keys['w'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['s'] || this.keys['ArrowDown']) dy += 1;
        if (this.keys['a'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['d'] || this.keys['ArrowRight']) dx += 1;
        
        // Normalize for diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }
        
        return { x: dx, y: dy };
    }
    
    /**
     * Handle mouse movement
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Get mouse position relative to canvas
        this.mousePosition = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Convert to world coordinates
        this.updateMouseWorldPosition();
        
        // Notify game of mouse movement
        this.game.onInputChange({
            type: 'mousemove',
            position: this.mousePosition,
            worldPosition: this.mouseWorldPosition
        });
    }
    
    /**
     * Handle mouse button down
     */
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Update mouse position
        this.mousePosition = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Update world position
        this.updateMouseWorldPosition();
        
        // Set button state
        switch (e.button) {
            case 0: this.mouseButtons.left = true; break;
            case 1: this.mouseButtons.middle = true; break;
            case 2: this.mouseButtons.right = true; break;
        }
        
        // Notify game of mouse button down
        this.game.onInputChange({
            type: 'mousedown',
            button: e.button,
            position: this.mousePosition,
            worldPosition: this.mouseWorldPosition
        });
    }
    
    /**
     * Handle mouse button up
     */
    handleMouseUp(e) {
        // Set button state
        switch (e.button) {
            case 0: this.mouseButtons.left = false; break;
            case 1: this.mouseButtons.middle = false; break;
            case 2: this.mouseButtons.right = false; break;
        }
        
        // Notify game of mouse button up
        this.game.onInputChange({
            type: 'mouseup',
            button: e.button,
            position: this.mousePosition,
            worldPosition: this.mouseWorldPosition
        });
    }
    
    /**
     * Handle mouse wheel
     */
    handleMouseWheel(e) {
        // Track wheel delta for zooming
        this.mouseWheelDelta = e.deltaY;
        
        // Notify game of mouse wheel
        this.game.onInputChange({
            type: 'wheel',
            deltaY: e.deltaY
        });
        
        // Prevent default scrolling behavior
        e.preventDefault();
    }
    
    /**
     * Handle right-click context menu
     */
    handleContextMenu(e) {
        // Prevent default context menu
        e.preventDefault();
    }
    
    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        // Store all active touches
        this.touches = Array.from(e.touches);
        
        // Store initial position for first touch
        if (e.touches.length >= 1) {
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            
            this.touchStartPosition = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            
            this.touchCurrentPosition = { ...this.touchStartPosition };
            
            // Convert to world coordinates (for touch position instead of mouse)
            const worldX = this.game.camera.x + (this.touchCurrentPosition.x - this.canvas.width / 2) / this.game.camera.zoom;
            const worldY = this.game.camera.y + (this.touchCurrentPosition.y - this.canvas.height / 2) / this.game.camera.zoom;
            
            const worldPosition = { x: worldX, y: worldY };
            
            // Notify game of touch start (similar to mousedown)
            this.game.onInputChange({
                type: 'touchstart',
                position: this.touchCurrentPosition,
                worldPosition: worldPosition,
                touches: this.touches.length
            });
        }
        
        // Check for pinch gesture
        if (e.touches.length >= 2) {
            this.isPinching = true;
            this.pinchDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
        }
    }
    
    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        // Store all active touches
        this.touches = Array.from(e.touches);
        
        // Update current position for first touch
        if (e.touches.length >= 1) {
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            
            this.touchCurrentPosition = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            
            // Convert to world coordinates
            const worldX = this.game.camera.x + (this.touchCurrentPosition.x - this.canvas.width / 2) / this.game.camera.zoom;
            const worldY = this.game.camera.y + (this.touchCurrentPosition.y - this.canvas.height / 2) / this.game.camera.zoom;
            
            const worldPosition = { x: worldX, y: worldY };
            
            // Notify game of touch move (similar to mousemove)
            this.game.onInputChange({
                type: 'touchmove',
                position: this.touchCurrentPosition,
                worldPosition: worldPosition,
                touches: this.touches.length
            });
        }
        
        // Handle pinch gesture for zooming
        if (e.touches.length >= 2 && this.isPinching) {
            const currentDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
            const deltaDistance = currentDistance - this.pinchDistance;
            
            // Notify game of pinch (for zooming)
            this.game.onInputChange({
                type: 'pinch',
                deltaDistance: deltaDistance
            });
            
            this.pinchDistance = currentDistance;
        }
    }
    
    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        // Reset pinch state if all touches are gone
        if (e.touches.length < 2) {
            this.isPinching = false;
        }
        
        // Store remaining touches
        this.touches = Array.from(e.touches);
        
        // Calculate touch duration and distance for tap detection
        if (this.touchStartPosition && this.touchCurrentPosition) {
            const dx = this.touchCurrentPosition.x - this.touchStartPosition.x;
            const dy = this.touchCurrentPosition.y - this.touchStartPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Notify game of touch end
            this.game.onInputChange({
                type: 'touchend',
                position: this.touchCurrentPosition,
                distance: distance,
                touches: this.touches.length
            });
        }
        
        // If no touches remain, reset touch positions
        if (e.touches.length === 0) {
            this.touchStartPosition = null;
            this.touchCurrentPosition = null;
        }
    }
    
    /**
     * Handle window blur (e.g., switching tabs)
     */
    handleBlur() {
        // Reset all input states when window loses focus
        this.keys = {};
        this.mouseButtons = { left: false, middle: false, right: false };
        
        // Notify game of reset
        this.game.onInputChange({
            type: 'reset'
        });
    }
    
    /**
     * Calculate distance between two touch points
     */
    getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Convert mouse canvas position to world position
     */
    updateMouseWorldPosition() {
        const worldX = this.game.camera.x + (this.mousePosition.x - this.canvas.width / 2) / this.game.camera.zoom;
        const worldY = this.game.camera.y + (this.mousePosition.y - this.canvas.height / 2) / this.game.camera.zoom;
        
        this.mouseWorldPosition = { x: worldX, y: worldY };
    }
    
    /**
     * Check if a specific key is pressed
     */
    isKeyPressed(key) {
        return !!this.keys[key];
    }
    
    /**
     * Check if a mouse button is pressed
     */
    isMouseButtonPressed(button) {
        switch (button) {
            case 'left': return this.mouseButtons.left;
            case 'middle': return this.mouseButtons.middle;
            case 'right': return this.mouseButtons.right;
            default: return false;
        }
    }
    
    /**
     * Get the current mouse position in canvas coordinates
     */
    getMousePosition() {
        return { ...this.mousePosition };
    }
    
    /**
     * Get the current mouse position in world coordinates
     */
    getMouseWorldPosition() {
        return { ...this.mouseWorldPosition };
    }
    
    /**
     * Get movement input as normalized vector (-1 to 1)
     */
    getMovementVector() {
        return this.getMovementDirection();
    }
}