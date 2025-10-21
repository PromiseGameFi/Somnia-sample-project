export class InputManager {
    constructor() {
        this.keys = {};
        this.keysPressed = {};
        this.keysReleased = {};
        
        // Mouse state
        this.mouse = {
            x: 0,
            y: 0,
            leftButton: false,
            rightButton: false,
            leftPressed: false,
            rightPressed: false
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                this.keysPressed[e.code] = true;
            }
            this.keys[e.code] = true;
            
            // Prevent default for game controls
            if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.keysReleased[e.code] = true;
        });

        // Mouse events
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        document.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left button
                this.mouse.leftPressed = !this.mouse.leftButton;
                this.mouse.leftButton = true;
            } else if (e.button === 2) { // Right button
                this.mouse.rightPressed = !this.mouse.rightButton;
                this.mouse.rightButton = true;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) { // Left button
                this.mouse.leftButton = false;
            } else if (e.button === 2) { // Right button
                this.mouse.rightButton = false;
            }
        });

        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    update() {
        // Clear pressed/released states
        this.keysPressed = {};
        this.keysReleased = {};
        this.mouse.leftPressed = false;
        this.mouse.rightPressed = false;
    }

    // Key state methods
    isKeyDown(keyCode) {
        return !!this.keys[keyCode];
    }

    isKeyPressed(keyCode) {
        return !!this.keysPressed[keyCode];
    }

    isKeyReleased(keyCode) {
        return !!this.keysReleased[keyCode];
    }

    // Movement input helpers
    getHorizontalInput() {
        let horizontal = 0;
        
        if (this.isKeyDown('ArrowLeft') || this.isKeyDown('KeyA')) {
            horizontal -= 1;
        }
        if (this.isKeyDown('ArrowRight') || this.isKeyDown('KeyD')) {
            horizontal += 1;
        }
        
        return horizontal;
    }

    getVerticalInput() {
        let vertical = 0;
        
        if (this.isKeyDown('ArrowUp') || this.isKeyDown('KeyW')) {
            vertical -= 1;
        }
        if (this.isKeyDown('ArrowDown') || this.isKeyDown('KeyS')) {
            vertical += 1;
        }
        
        return vertical;
    }

    isJumpPressed() {
        return this.isKeyPressed('Space') || this.isKeyPressed('ArrowUp') || this.isKeyPressed('KeyW');
    }

    isShootPressed() {
        return this.mouse.leftPressed || this.isKeyPressed('KeyX') || this.isKeyPressed('ControlLeft');
    }

    isShootHeld() {
        return this.mouse.leftButton || this.isKeyDown('KeyX') || this.isKeyDown('ControlLeft');
    }

    // Mouse helpers
    getMousePosition(canvas) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: this.mouse.x - rect.left,
            y: this.mouse.y - rect.top
        };
    }

    getWorldMousePosition(canvas, camera) {
        const screenPos = this.getMousePosition(canvas);
        return {
            x: screenPos.x + camera.x,
            y: screenPos.y + camera.y
        };
    }

    // Special actions
    isPausePressed() {
        return this.isKeyPressed('Escape') || this.isKeyPressed('KeyP');
    }

    isDebugPressed() {
        return this.isKeyPressed('F3');
    }

    isRestartPressed() {
        return this.isKeyPressed('KeyR');
    }

    // Utility methods
    getInputSummary() {
        return {
            horizontal: this.getHorizontalInput(),
            vertical: this.getVerticalInput(),
            jump: this.isJumpPressed(),
            shoot: this.isShootPressed(),
            shootHeld: this.isShootHeld(),
            pause: this.isPausePressed(),
            debug: this.isDebugPressed(),
            restart: this.isRestartPressed(),
            mouse: {
                x: this.mouse.x,
                y: this.mouse.y,
                leftButton: this.mouse.leftButton,
                rightButton: this.mouse.rightButton
            }
        };
    }

    // Clean up event listeners
    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('contextmenu', this.handleContextMenu);
    }
}