import { Projectile } from './Projectile.js';

export class Enemy {
    constructor(x, y, type = 'basic', somniaConnector) {
        this.somniaConnector = somniaConnector;
        
        // Position and physics
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.facing = 1; // 1 for right, -1 for left
        
        // Enemy type and properties
        this.type = type;
        this.setupEnemyType();
        
        // AI state
        this.state = 'patrol';
        this.stateTimer = 0;
        this.patrolStartX = x;
        this.patrolRange = 100;
        this.detectionRange = 80;
        this.attackRange = 60;
        
        // Combat
        this.weapon = {
            damage: 15,
            fireRate: 1.0,
            lastFireTime: 0,
            projectileSpeed: 300
        };
        
        // Animation
        this.animationFrame = 0;
        this.animationSpeed = 0.15;
        
        // Visual effects
        this.hitFlash = 0;
        this.deathAnimation = 0;
        this.isDead = false;
        
        console.log(`🤖 2D Enemy created: ${type} at (${x}, ${y})`);
    }

    setupEnemyType() {
        switch (this.type) {
            case 'basic':
                this.health = 50;
                this.maxHealth = 50;
                this.speed = 60;
                this.color = '#ff4444';
                this.weapon.damage = 15;
                this.weapon.fireRate = 1.5;
                break;
                
            case 'fast':
                this.health = 30;
                this.maxHealth = 30;
                this.speed = 120;
                this.color = '#ff8844';
                this.weapon.damage = 10;
                this.weapon.fireRate = 1.0;
                this.patrolRange = 150;
                break;
                
            case 'heavy':
                this.health = 100;
                this.maxHealth = 100;
                this.speed = 30;
                this.color = '#8844ff';
                this.weapon.damage = 25;
                this.weapon.fireRate = 2.0;
                this.width = 24;
                this.height = 24;
                this.detectionRange = 100;
                break;
                
            case 'sniper':
                this.health = 40;
                this.maxHealth = 40;
                this.speed = 40;
                this.color = '#44ff44';
                this.weapon.damage = 30;
                this.weapon.fireRate = 3.0;
                this.detectionRange = 120;
                this.attackRange = 100;
                this.weapon.projectileSpeed = 600;
                break;
        }
    }

    update(deltaTime, player, platforms, enemies) {
        if (this.isDead) {
            this.updateDeathAnimation(deltaTime);
            return;
        }
        
        // Update AI state
        this.updateAI(deltaTime, player);
        
        // Apply physics
        this.applyPhysics(deltaTime);
        
        // Check platform collisions
        this.checkPlatformCollisions(platforms);
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Update effects
        this.updateEffects(deltaTime);
        
        // Send enemy data to blockchain (throttled)
        this.updateBlockchainData();
    }

    updateAI(deltaTime, player) {
        this.stateTimer += deltaTime;
        
        const distanceToPlayer = Math.sqrt(
            Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)
        );
        
        // State transitions
        switch (this.state) {
            case 'patrol':
                this.patrolBehavior(deltaTime);
                
                // Check if player is detected
                if (distanceToPlayer < this.detectionRange) {
                    this.state = 'chase';
                    this.stateTimer = 0;
                }
                break;
                
            case 'chase':
                this.chaseBehavior(deltaTime, player);
                
                // Check if player is in attack range
                if (distanceToPlayer < this.attackRange) {
                    this.state = 'attack';
                    this.stateTimer = 0;
                }
                
                // Lose player if too far
                if (distanceToPlayer > this.detectionRange * 1.5) {
                    this.state = 'return';
                    this.stateTimer = 0;
                }
                break;
                
            case 'attack':
                this.attackBehavior(deltaTime, player);
                
                // Return to chase if player moves away
                if (distanceToPlayer > this.attackRange * 1.2) {
                    this.state = 'chase';
                    this.stateTimer = 0;
                }
                break;
                
            case 'return':
                this.returnBehavior(deltaTime);
                
                // Check if back at patrol start
                if (Math.abs(this.x - this.patrolStartX) < 10) {
                    this.state = 'patrol';
                    this.stateTimer = 0;
                }
                
                // Re-detect player if close
                if (distanceToPlayer < this.detectionRange * 0.8) {
                    this.state = 'chase';
                    this.stateTimer = 0;
                }
                break;
        }
    }

    patrolBehavior(deltaTime) {
        // Simple back and forth patrol
        const distanceFromStart = this.x - this.patrolStartX;
        
        if (distanceFromStart > this.patrolRange) {
            this.facing = -1;
        } else if (distanceFromStart < -this.patrolRange) {
            this.facing = 1;
        }
        
        // Change direction occasionally
        if (this.stateTimer > 3 + Math.random() * 2) {
            this.facing *= -1;
            this.stateTimer = 0;
        }
        
        this.vx = this.facing * this.speed * 0.5; // Slower patrol speed
    }

    chaseBehavior(deltaTime, player) {
        // Move towards player
        if (player.x > this.x + this.width / 2) {
            this.facing = 1;
            this.vx = this.speed;
        } else if (player.x < this.x + this.width / 2) {
            this.facing = -1;
            this.vx = -this.speed;
        } else {
            this.vx *= 0.8; // Slow down when close
        }
        
        // Jump if player is above and close
        if (player.y < this.y - 20 && Math.abs(player.x - this.x) < 40 && this.onGround) {
            this.vy = -300; // Jump
            this.onGround = false;
        }
    }

    attackBehavior(deltaTime, player) {
        // Stop moving and face player
        this.vx *= 0.9;
        
        if (player.x > this.x + this.width / 2) {
            this.facing = 1;
        } else {
            this.facing = -1;
        }
        
        // Try to shoot
        this.shoot(player);
    }

    returnBehavior(deltaTime) {
        // Return to patrol start position
        if (this.x > this.patrolStartX + 10) {
            this.facing = -1;
            this.vx = -this.speed * 0.7;
        } else if (this.x < this.patrolStartX - 10) {
            this.facing = 1;
            this.vx = this.speed * 0.7;
        } else {
            this.vx *= 0.8;
        }
    }

    shoot(player) {
        const currentTime = Date.now() / 1000;
        
        // Check fire rate
        if (currentTime - this.weapon.lastFireTime < this.weapon.fireRate) {
            return null;
        }
        
        this.weapon.lastFireTime = currentTime;
        
        // Calculate direction to player
        const dx = player.x + player.width / 2 - (this.x + this.width / 2);
        const dy = player.y + player.height / 2 - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return null;
        
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // Create projectile
        const projectile = new Projectile(
            this.x + this.width / 2,
            this.y + this.height / 2,
            dirX * this.weapon.projectileSpeed,
            dirY * this.weapon.projectileSpeed,
            this.weapon.damage,
            'enemy'
        );
        
        // Send shooting event to blockchain
        this.somniaConnector.emitEnemyAction({
            action: 'shoot',
            enemyType: this.type,
            x: this.x,
            y: this.y,
            targetX: player.x,
            targetY: player.y,
            timestamp: Date.now()
        });
        
        return projectile;
    }

    applyPhysics(deltaTime) {
        // Apply gravity
        if (!this.onGround) {
            this.vy += 600 * deltaTime; // gravity
        }
        
        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // Terminal velocity
        if (this.vy > 400) {
            this.vy = 400;
        }
    }

    checkPlatformCollisions(platforms) {
        this.onGround = false;
        
        for (const platform of platforms) {
            // Check if enemy is colliding with platform
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
                    this.facing = -1; // Turn around
                } else if (minOverlap === overlapRight && this.vx < 0) {
                    // Hitting platform from right
                    this.x = platform.x + platform.width;
                    this.vx = 0;
                    this.facing = 1; // Turn around
                }
            }
        }
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
    }

    updateDeathAnimation(deltaTime) {
        this.deathAnimation += deltaTime;
        // Enemy will be removed by game logic after death animation
    }

    updateBlockchainData() {
        // Throttle blockchain updates
        if (!this.lastBlockchainUpdate) {
            this.lastBlockchainUpdate = Date.now();
            return;
        }
        
        const now = Date.now();
        if (now - this.lastBlockchainUpdate > 2000) { // Update every 2 seconds
            this.somniaConnector.emitEnemyAction({
                action: 'update',
                enemyType: this.type,
                state: this.state,
                x: this.x,
                y: this.y,
                health: this.health,
                timestamp: now
            });
            this.lastBlockchainUpdate = now;
        }
    }

    takeDamage(damage) {
        if (this.isDead) return false;
        
        this.health -= damage;
        this.hitFlash = 0.2;
        
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            this.deathAnimation = 0;
            
            // Send death event to blockchain
            this.somniaConnector.emitEnemyAction({
                action: 'death',
                enemyType: this.type,
                x: this.x,
                y: this.y,
                timestamp: Date.now()
            });
            
            return true; // Enemy died
        }
        
        // Send damage event to blockchain
        this.somniaConnector.emitEnemyAction({
            action: 'damage',
            enemyType: this.type,
            damage: damage,
            health: this.health,
            x: this.x,
            y: this.y,
            timestamp: Date.now()
        });
        
        return false;
    }

    checkCollision(other) {
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }

    render(ctx) {
        if (this.isDead && this.deathAnimation > 1.0) {
            return; // Don't render if death animation is complete
        }
        
        // Save context for transformations
        ctx.save();
        
        // Apply hit flash effect
        if (this.hitFlash > 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // Apply death fade effect
        if (this.isDead) {
            ctx.globalAlpha = Math.max(0, 1 - this.deathAnimation);
        }
        
        // Draw enemy body
        ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw enemy details based on type
        this.drawEnemyDetails(ctx);
        
        // Draw health bar for living enemies
        if (!this.isDead && this.health < this.maxHealth) {
            this.drawHealthBar(ctx);
        }
        
        // Draw state indicator (debug)
        this.drawStateIndicator(ctx);
        
        ctx.restore();
    }

    drawEnemyDetails(ctx) {
        switch (this.type) {
            case 'basic':
                this.drawBasicEnemy(ctx);
                break;
            case 'fast':
                this.drawFastEnemy(ctx);
                break;
            case 'heavy':
                this.drawHeavyEnemy(ctx);
                break;
            case 'sniper':
                this.drawSniperEnemy(ctx);
                break;
        }
    }

    drawBasicEnemy(ctx) {
        // Draw simple robot design
        ctx.fillStyle = '#cc2222';
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 6); // Head
        
        ctx.fillStyle = '#aa1111';
        ctx.fillRect(this.x + 1, this.y + 8, this.width - 2, 8); // Body
        
        // Eyes
        ctx.fillStyle = '#ffff00';
        if (this.facing > 0) {
            ctx.fillRect(this.x + this.width - 6, this.y + 4, 2, 2);
        } else {
            ctx.fillRect(this.x + 4, this.y + 4, 2, 2);
        }
        
        // Legs
        ctx.fillStyle = '#cc2222';
        ctx.fillRect(this.x + 4, this.y + 16, 3, 4);
        ctx.fillRect(this.x + this.width - 7, this.y + 16, 3, 4);
    }

    drawFastEnemy(ctx) {
        // Draw sleek, angular design
        ctx.fillStyle = '#cc4422';
        
        // Angular body
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Speed lines
        ctx.strokeStyle = '#ff6644';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const offset = i * 3;
            ctx.beginPath();
            ctx.moveTo(this.x - offset, this.y + 5 + i * 3);
            ctx.lineTo(this.x - offset - 5, this.y + 5 + i * 3);
            ctx.stroke();
        }
    }

    drawHeavyEnemy(ctx) {
        // Draw bulky, armored design
        ctx.fillStyle = '#6622cc';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Armor plating
        ctx.fillStyle = '#4411aa';
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 4);
        ctx.fillRect(this.x + 1, this.y + 8, this.width - 2, 6);
        ctx.fillRect(this.x + 2, this.y + 16, this.width - 4, 4);
        
        // Heavy weapon
        ctx.fillStyle = '#333333';
        if (this.facing > 0) {
            ctx.fillRect(this.x + this.width, this.y + 8, 6, 6);
        } else {
            ctx.fillRect(this.x - 6, this.y + 8, 6, 6);
        }
    }

    drawSniperEnemy(ctx) {
        // Draw tall, thin sniper design
        ctx.fillStyle = '#22cc22';
        ctx.fillRect(this.x + 4, this.y, this.width - 8, this.height);
        
        // Scope
        ctx.fillStyle = '#116611';
        ctx.fillRect(this.x + 6, this.y + 2, this.width - 12, 4);
        
        // Long rifle
        ctx.fillStyle = '#444444';
        if (this.facing > 0) {
            ctx.fillRect(this.x + this.width, this.y + 8, 12, 2);
        } else {
            ctx.fillRect(this.x - 12, this.y + 8, 12, 2);
        }
        
        // Laser sight
        if (this.state === 'attack') {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            if (this.facing > 0) {
                ctx.moveTo(this.x + this.width + 12, this.y + 9);
                ctx.lineTo(this.x + this.width + 50, this.y + 9);
            } else {
                ctx.moveTo(this.x - 12, this.y + 9);
                ctx.lineTo(this.x - 50, this.y + 9);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    drawHealthBar(ctx) {
        const barWidth = this.width;
        const barHeight = 3;
        const barY = this.y - 6;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(this.x, barY, barWidth, barHeight);
        
        // Health
        ctx.fillStyle = this.health > this.maxHealth * 0.3 ? '#ff4444' : '#ff8888';
        const healthWidth = (this.health / this.maxHealth) * barWidth;
        ctx.fillRect(this.x, barY, healthWidth, barHeight);
    }

    drawStateIndicator(ctx) {
        // Small state indicator for debugging
        ctx.fillStyle = this.getStateColor();
        ctx.fillRect(this.x + this.width - 4, this.y - 4, 3, 3);
    }

    getStateColor() {
        switch (this.state) {
            case 'patrol': return '#00ff00';
            case 'chase': return '#ffff00';
            case 'attack': return '#ff0000';
            case 'return': return '#0000ff';
            default: return '#ffffff';
        }
    }

    // Getters for compatibility
    getPosition() {
        return { x: this.x, y: this.y };
    }

    getRadius() {
        return Math.max(this.width, this.height) / 2;
    }

    isAlive() {
        return !this.isDead;
    }

    shouldRemove() {
        return this.isDead && this.deathAnimation > 1.0;
    }
}