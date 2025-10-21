import { Projectile } from './Projectile.js';

export class Player {
    constructor(somniaConnector) {
        this.somniaConnector = somniaConnector;
        
        // Player properties
        this.health = 100;
        this.maxHealth = 100;
        this.energy = 100;
        this.maxEnergy = 100;
        this.speed = 200;
        this.jumpPower = 400;
        this.width = 24;
        this.height = 32;
        
        // Position and physics
        this.x = 0;
        this.y = 0;
        this.vx = 0; // velocity x
        this.vy = 0; // velocity y
        this.onGround = false;
        this.facing = 1; // 1 for right, -1 for left
        
        // Weapon system
        this.weapon = {
            damage: 25,
            fireRate: 0.3, // seconds between shots
            lastFireTime: 0,
            energyCost: 5
        };
        
        // Animation
        this.animationFrame = 0;
        this.animationSpeed = 0.2;
        this.currentAnimation = 'idle';
        
        // Visual effects
        this.hitFlash = 0;
        this.invulnerable = 0;
        
        console.log('👤 2D Player initialized');
    }

    async init() {
        console.log('✅ Player entity created');
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    update(deltaTime, inputManager, platforms) {
        // Handle input
        this.handleInput(deltaTime, inputManager);
        
        // Apply physics
        this.applyPhysics(deltaTime);
        
        // Check platform collisions
        this.checkPlatformCollisions(platforms);
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Update effects
        this.updateEffects(deltaTime);
        
        // Send movement data to blockchain (throttled)
        this.updateBlockchainPosition();
    }

    handleInput(deltaTime, inputManager) {
        const keys = inputManager.keys;
        
        // Horizontal movement
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            this.vx = -this.speed;
            this.facing = -1;
            this.currentAnimation = 'run';
        } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            this.vx = this.speed;
            this.facing = 1;
            this.currentAnimation = 'run';
        } else {
            this.vx *= 0.8; // Friction
            if (Math.abs(this.vx) < 10) {
                this.vx = 0;
                this.currentAnimation = 'idle';
            }
        }
        
        // Jumping
        if ((keys['ArrowUp'] || keys['w'] || keys['W'] || keys[' ']) && this.onGround) {
            this.vy = -this.jumpPower;
            this.onGround = false;
            this.currentAnimation = 'jump';
        }
        
        // Shooting
        if (keys['x'] || keys['X'] || inputManager.mouseButtons[0]) {
            this.shoot();
        }
    }

    applyPhysics(deltaTime) {
        // Apply gravity
        if (!this.onGround) {
            this.vy += 800 * deltaTime; // gravity
        }
        
        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // Terminal velocity
        if (this.vy > 600) {
            this.vy = 600;
        }
    }

    checkPlatformCollisions(platforms) {
        this.onGround = false;
        
        for (const platform of platforms) {
            // Check if player is colliding with platform
            if (this.x + this.width > platform.x && 
                this.x < platform.x + platform.width &&
                this.y + this.height > platform.y && 
                this.y < platform.y + platform.height) {
                
                // Determine collision side
                const overlapLeft = (this.x + this.width) - platform.x;
                const overlapRight = (platform.x + platform.width) - this.x;
                const overlapTop = (this.y + this.height) - platform.y;
                const overlapBottom = (platform.y + platform.height) - this.y;
                
                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                
                if (minOverlap === overlapTop && this.vy > 0) {
                    // Landing on top of platform
                    this.y = platform.y - this.height;
                    this.vy = 0;
                    this.onGround = true;
                } else if (minOverlap === overlapBottom && this.vy < 0) {
                    // Hitting platform from below
                    this.y = platform.y + platform.height;
                    this.vy = 0;
                } else if (minOverlap === overlapLeft && this.vx > 0) {
                    // Hitting platform from left
                    this.x = platform.x - this.width;
                    this.vx = 0;
                } else if (minOverlap === overlapRight && this.vx < 0) {
                    // Hitting platform from right
                    this.x = platform.x + platform.width;
                    this.vx = 0;
                }
            }
        }
    }

    shoot() {
        const currentTime = Date.now() / 1000;
        
        // Check fire rate and energy
        if (currentTime - this.weapon.lastFireTime < this.weapon.fireRate || 
            this.energy < this.weapon.energyCost) {
            return null;
        }
        
        // Consume energy
        this.energy -= this.weapon.energyCost;
        this.weapon.lastFireTime = currentTime;
        
        // Create projectile
        const projectile = new Projectile(
            this.x + (this.facing > 0 ? this.width : 0),
            this.y + this.height / 2,
            this.facing * 500, // velocity
            0,
            this.weapon.damage,
            'player'
        );
        
        // Send shooting event to blockchain
        this.somniaConnector.emitPlayerMovement({
            action: 'shoot',
            x: this.x,
            y: this.y,
            direction: this.facing,
            timestamp: Date.now()
        });
        
        return projectile;
    }

    updateAnimation(deltaTime) {
        this.animationFrame += this.animationSpeed * deltaTime;
        if (this.animationFrame >= 1) {
            this.animationFrame = 0;
        }
    }

    updateEffects(deltaTime) {
        // Update hit flash
        if (this.hitFlash > 0) {
            this.hitFlash -= deltaTime;
        }
        
        // Update invulnerability
        if (this.invulnerable > 0) {
            this.invulnerable -= deltaTime;
        }
        
        // Regenerate energy slowly
        if (this.energy < this.maxEnergy) {
            this.energy += 20 * deltaTime;
            if (this.energy > this.maxEnergy) {
                this.energy = this.maxEnergy;
            }
        }
    }

    updateBlockchainPosition() {
        // Throttle position updates to blockchain
        if (!this.lastPositionUpdate) {
            this.lastPositionUpdate = Date.now();
            return;
        }
        
        const now = Date.now();
        if (now - this.lastPositionUpdate > 1000) { // Update every 1 second
            this.somniaConnector.emitPlayerMovement({
                action: 'move',
                x: this.x,
                y: this.y,
                timestamp: now
            });
            this.lastPositionUpdate = now;
        }
    }

    takeDamage(damage) {
        if (this.invulnerable > 0) return;
        
        this.health -= damage;
        this.hitFlash = 0.2;
        this.invulnerable = 1.0; // 1 second of invulnerability
        
        if (this.health < 0) {
            this.health = 0;
        }
        
        // Send damage event to blockchain
        this.somniaConnector.emitPlayerMovement({
            action: 'damage',
            damage: damage,
            health: this.health,
            timestamp: Date.now()
        });
    }

    checkCollision(other) {
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }

    render(ctx) {
        // Save context for transformations
        ctx.save();
        
        // Apply hit flash effect
        if (this.hitFlash > 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // Apply invulnerability flicker
        if (this.invulnerable > 0 && Math.floor(this.invulnerable * 10) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }
        
        // Draw player body
        ctx.fillStyle = this.hitFlash > 0 ? '#ff6666' : '#00aaff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw player details
        this.drawPlayerDetails(ctx);
        
        // Draw weapon
        this.drawWeapon(ctx);
        
        // Draw health bar above player
        this.drawHealthBar(ctx);
        
        ctx.restore();
    }

    drawPlayerDetails(ctx) {
        // Draw helmet/head
        ctx.fillStyle = '#0088cc';
        ctx.fillRect(this.x + 4, this.y + 2, this.width - 8, 8);
        
        // Draw visor
        ctx.fillStyle = '#004466';
        ctx.fillRect(this.x + 6, this.y + 4, this.width - 12, 4);
        
        // Draw chest armor
        ctx.fillStyle = '#006699';
        ctx.fillRect(this.x + 2, this.y + 12, this.width - 4, 12);
        
        // Draw legs
        ctx.fillStyle = '#0088cc';
        ctx.fillRect(this.x + 6, this.y + 24, 6, 8);
        ctx.fillRect(this.x + this.width - 12, this.y + 24, 6, 8);
        
        // Draw direction indicator (eyes)
        ctx.fillStyle = '#ffffff';
        if (this.facing > 0) {
            ctx.fillRect(this.x + this.width - 8, this.y + 5, 2, 2);
        } else {
            ctx.fillRect(this.x + 6, this.y + 5, 2, 2);
        }
    }

    drawWeapon(ctx) {
        // Draw weapon
        ctx.fillStyle = '#666666';
        if (this.facing > 0) {
            ctx.fillRect(this.x + this.width, this.y + 14, 8, 4);
        } else {
            ctx.fillRect(this.x - 8, this.y + 14, 8, 4);
        }
        
        // Draw weapon tip
        ctx.fillStyle = '#888888';
        if (this.facing > 0) {
            ctx.fillRect(this.x + this.width + 6, this.y + 15, 4, 2);
        } else {
            ctx.fillRect(this.x - 6, this.y + 15, 4, 2);
        }
    }

    drawHealthBar(ctx) {
        const barWidth = this.width;
        const barHeight = 4;
        const barY = this.y - 8;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(this.x, barY, barWidth, barHeight);
        
        // Health
        ctx.fillStyle = this.health > 30 ? '#44ff44' : '#ff4444';
        const healthWidth = (this.health / this.maxHealth) * barWidth;
        ctx.fillRect(this.x, barY, healthWidth, barHeight);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, barY, barWidth, barHeight);
    }

    // Getters for compatibility
    getPosition() {
        return { x: this.x, y: this.y };
    }

    getRadius() {
        return Math.max(this.width, this.height) / 2;
    }

    isDead() {
        return this.health <= 0;
    }

    reset() {
        this.health = this.maxHealth;
        this.energy = this.maxEnergy;
        this.x = 100;
        this.y = 400;
        this.vx = 0;
        this.vy = 0;
        this.hitFlash = 0;
        this.invulnerable = 0;
        this.facing = 1;
    }
}