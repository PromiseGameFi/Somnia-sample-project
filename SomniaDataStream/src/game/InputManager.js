export class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            leftButton: false,
            rightButton: false,
            middleButton: false
        };
        
        this.previousMouse = { x: 0, y: 0 };
        this.isPointerLocked = false;
        
        // Touch support for mobile
        this.touches = {};
        this.isTouchDevice = 'ontouchstart' in window;
        
        // Gamepad support
        this.gamepad = null;
        this.gamepadIndex = -1;
        
        this.init();
    }

    init() {
        this.setupKeyboardEvents();
        this.setupMouseEvents();
        this.setupTouchEvents();
        this.setupGamepadEvents();
        
        console.log('🎮 Input manager initialized');
    }

    setupKeyboardEvents() {
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            
            // Prevent default for game keys
            if (this.isGameKey(event.code)) {
                event.preventDefault();
            }
        });

        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });

        // Handle focus loss
        window.addEventListener('blur', () => {
            this.keys = {};
        });
    }

    setupMouseEvents() {
        const canvas = document.getElementById('gameCanvas');
        
        // Mouse movement
        document.addEventListener('mousemove', (event) => {
            if (this.isPointerLocked) {
                this.mouse.deltaX = event.movementX || 0;
                this.mouse.deltaY = event.movementY || 0;
            } else {
                this.mouse.x = event.clientX;
                this.mouse.y = event.clientY;
                this.mouse.deltaX = this.mouse.x - this.previousMouse.x;
                this.mouse.deltaY = this.mouse.y - this.previousMouse.y;
            }
            
            this.previousMouse.x = this.mouse.x;
            this.previousMouse.y = this.mouse.y;
        });

        // Mouse buttons
        document.addEventListener('mousedown', (event) => {
            switch (event.button) {
                case 0: this.mouse.leftButton = true; break;
                case 1: this.mouse.middleButton = true; break;
                case 2: this.mouse.rightButton = true; break;
            }
            
            // Request pointer lock on canvas click
            if (event.target === canvas) {
                this.requestPointerLock();
            }
        });

        document.addEventListener('mouseup', (event) => {
            switch (event.button) {
                case 0: this.mouse.leftButton = false; break;
                case 1: this.mouse.middleButton = false; break;
                case 2: this.mouse.rightButton = false; break;
            }
        });

        // Pointer lock events
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === canvas;
        });

        // Prevent context menu
        canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        // Mouse wheel
        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            // Handle zoom or other wheel actions
        });
    }

    setupTouchEvents() {
        if (!this.isTouchDevice) return;

        const canvas = document.getElementById('gameCanvas');

        canvas.addEventListener('touchstart', (event) => {
            event.preventDefault();
            
            for (let i = 0; i < event.changedTouches.length; i++) {
                const touch = event.changedTouches[i];
                this.touches[touch.identifier] = {
                    x: touch.clientX,
                    y: touch.clientY,
                    startX: touch.clientX,
                    startY: touch.clientY,
                    startTime: Date.now()
                };
            }
        });

        canvas.addEventListener('touchmove', (event) => {
            event.preventDefault();
            
            for (let i = 0; i < event.changedTouches.length; i++) {
                const touch = event.changedTouches[i];
                if (this.touches[touch.identifier]) {
                    this.touches[touch.identifier].x = touch.clientX;
                    this.touches[touch.identifier].y = touch.clientY;
                }
            }
        });

        canvas.addEventListener('touchend', (event) => {
            event.preventDefault();
            
            for (let i = 0; i < event.changedTouches.length; i++) {
                const touch = event.changedTouches[i];
                delete this.touches[touch.identifier];
            }
        });

        canvas.addEventListener('touchcancel', (event) => {
            event.preventDefault();
            this.touches = {};
        });
    }

    setupGamepadEvents() {
        window.addEventListener('gamepadconnected', (event) => {
            console.log('🎮 Gamepad connected:', event.gamepad.id);
            this.gamepad = event.gamepad;
            this.gamepadIndex = event.gamepad.index;
        });

        window.addEventListener('gamepaddisconnected', (event) => {
            console.log('🎮 Gamepad disconnected:', event.gamepad.id);
            this.gamepad = null;
            this.gamepadIndex = -1;
        });
    }

    update() {
        // Update gamepad state
        this.updateGamepad();
        
        // Reset mouse delta after each frame
        // Note: We don't reset here as it's handled in the movement calculation
    }

    updateGamepad() {
        if (this.gamepadIndex >= 0) {
            const gamepads = navigator.getGamepads();
            this.gamepad = gamepads[this.gamepadIndex];
        }
    }

    // Keyboard input methods
    isKeyPressed(keyCode) {
        return !!this.keys[keyCode];
    }

    isKeyJustPressed(keyCode) {
        // This would require tracking previous frame state
        // For now, just return current state
        return this.isKeyPressed(keyCode);
    }

    // Movement input methods
    getMovementVector() {
        const movement = { x: 0, z: 0 };
        
        // WASD movement
        if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) {
            movement.z -= 1;
        }
        if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) {
            movement.z += 1;
        }
        if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) {
            movement.x -= 1;
        }
        if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) {
            movement.x += 1;
        }
        
        // Gamepad movement
        if (this.gamepad) {
            const leftStick = this.getGamepadLeftStick();
            movement.x += leftStick.x;
            movement.z += leftStick.y;
        }
        
        // Touch movement (virtual joystick)
        if (this.isTouchDevice) {
            const touchMovement = this.getTouchMovement();
            movement.x += touchMovement.x;
            movement.z += touchMovement.z;
        }
        
        // Normalize diagonal movement
        const length = Math.sqrt(movement.x * movement.x + movement.z * movement.z);
        if (length > 1) {
            movement.x /= length;
            movement.z /= length;
        }
        
        return movement;
    }

    getRotationInput() {
        const rotation = { x: 0, y: 0 };
        
        // Mouse rotation
        rotation.x = this.mouse.deltaY * 0.002;
        rotation.y = this.mouse.deltaX * 0.002;
        
        // Gamepad rotation
        if (this.gamepad) {
            const rightStick = this.getGamepadRightStick();
            rotation.x += rightStick.y * 0.05;
            rotation.y += rightStick.x * 0.05;
        }
        
        // Reset mouse delta
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
        
        return rotation;
    }

    // Action input methods
    isFirePressed() {
        return this.mouse.leftButton || 
               this.isKeyPressed('Space') ||
               (this.gamepad && this.gamepad.buttons[0].pressed) ||
               this.isTouchFiring();
    }

    isJumpPressed() {
        return this.isKeyPressed('Space') ||
               (this.gamepad && this.gamepad.buttons[1].pressed);
    }

    isRunPressed() {
        return this.isKeyPressed('ShiftLeft') ||
               (this.gamepad && this.gamepad.buttons[4].pressed);
    }

    isReloadPressed() {
        return this.isKeyPressed('KeyR') ||
               (this.gamepad && this.gamepad.buttons[3].pressed);
    }

    isPausePressed() {
        return this.isKeyPressed('Escape') ||
               (this.gamepad && this.gamepad.buttons[9].pressed);
    }

    // Gamepad helper methods
    getGamepadLeftStick() {
        if (!this.gamepad) return { x: 0, y: 0 };
        
        const x = this.gamepad.axes[0] || 0;
        const y = this.gamepad.axes[1] || 0;
        
        // Apply deadzone
        const deadzone = 0.1;
        const magnitude = Math.sqrt(x * x + y * y);
        
        if (magnitude < deadzone) {
            return { x: 0, y: 0 };
        }
        
        return { x, y };
    }

    getGamepadRightStick() {
        if (!this.gamepad) return { x: 0, y: 0 };
        
        const x = this.gamepad.axes[2] || 0;
        const y = this.gamepad.axes[3] || 0;
        
        // Apply deadzone
        const deadzone = 0.1;
        const magnitude = Math.sqrt(x * x + y * y);
        
        if (magnitude < deadzone) {
            return { x: 0, y: 0 };
        }
        
        return { x, y };
    }

    // Touch helper methods
    getTouchMovement() {
        const movement = { x: 0, z: 0 };
        
        // Simple touch movement - use first touch as movement
        const touchIds = Object.keys(this.touches);
        if (touchIds.length > 0) {
            const touch = this.touches[touchIds[0]];
            const deltaX = touch.x - touch.startX;
            const deltaY = touch.y - touch.startY;
            
            // Convert to movement (normalize to screen size)
            movement.x = deltaX / (window.innerWidth * 0.5);
            movement.z = deltaY / (window.innerHeight * 0.5);
            
            // Clamp values
            movement.x = Math.max(-1, Math.min(1, movement.x));
            movement.z = Math.max(-1, Math.min(1, movement.z));
        }
        
        return movement;
    }

    isTouchFiring() {
        // Consider a tap as firing
        const touchIds = Object.keys(this.touches);
        for (const id of touchIds) {
            const touch = this.touches[id];
            const duration = Date.now() - touch.startTime;
            const distance = Math.sqrt(
                Math.pow(touch.x - touch.startX, 2) + 
                Math.pow(touch.y - touch.startY, 2)
            );
            
            // Short tap with minimal movement
            if (duration < 200 && distance < 20) {
                return true;
            }
        }
        
        return false;
    }

    // Utility methods
    isGameKey(keyCode) {
        const gameKeys = [
            'KeyW', 'KeyA', 'KeyS', 'KeyD',
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'Space', 'ShiftLeft', 'KeyR', 'Escape'
        ];
        
        return gameKeys.includes(keyCode);
    }

    requestPointerLock() {
        const canvas = document.getElementById('gameCanvas');
        if (canvas && canvas.requestPointerLock) {
            canvas.requestPointerLock();
        }
    }

    exitPointerLock() {
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    // Debug methods
    getDebugInfo() {
        return {
            keys: Object.keys(this.keys).filter(key => this.keys[key]),
            mouse: this.mouse,
            gamepad: this.gamepad ? {
                id: this.gamepad.id,
                connected: this.gamepad.connected,
                buttons: this.gamepad.buttons.map(b => b.pressed),
                axes: this.gamepad.axes
            } : null,
            touches: Object.keys(this.touches).length,
            pointerLocked: this.isPointerLocked
        };
    }

    destroy() {
        // Remove event listeners
        // Note: In a production app, you'd want to store references to the handlers
        // and remove them properly to prevent memory leaks
        
        this.keys = {};
        this.mouse = {
            x: 0, y: 0, deltaX: 0, deltaY: 0,
            leftButton: false, rightButton: false, middleButton: false
        };
        this.touches = {};
        this.gamepad = null;
        
        // Exit pointer lock
        this.exitPointerLock();
        
        console.log('🎮 Input manager destroyed');
    }
}