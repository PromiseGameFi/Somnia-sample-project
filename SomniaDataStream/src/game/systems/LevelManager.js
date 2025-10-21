export class LevelManager {
    constructor(game) {
        this.game = game;
        this.currentLevel = 1;
        this.platforms = [];
        this.collectibles = [];
        this.obstacles = [];
        this.spawnPoints = [];
        this.levelWidth = 2000;
        this.levelHeight = 800;
        
        this.generateLevel(this.currentLevel);
    }

    generateLevel(levelNumber) {
        this.platforms = [];
        this.collectibles = [];
        this.obstacles = [];
        this.spawnPoints = [];

        // Base platform (ground)
        this.platforms.push({
            x: 0,
            y: this.levelHeight - 50,
            width: this.levelWidth,
            height: 50,
            type: 'ground'
        });

        // Generate platforms based on level
        const platformCount = Math.min(8 + levelNumber * 2, 20);
        
        for (let i = 0; i < platformCount; i++) {
            const platform = this.generatePlatform(i, levelNumber);
            if (platform) {
                this.platforms.push(platform);
            }
        }

        // Generate collectibles
        this.generateCollectibles(levelNumber);
        
        // Generate obstacles
        this.generateObstacles(levelNumber);
        
        // Generate enemy spawn points
        this.generateSpawnPoints(levelNumber);
    }

    generatePlatform(index, level) {
        const minHeight = 100;
        const maxHeight = this.levelHeight - 200;
        const platformWidth = 80 + Math.random() * 120;
        const platformHeight = 20;
        
        // Distribute platforms across the level width
        const x = (index + 1) * (this.levelWidth / 12) + Math.random() * 100 - 50;
        const y = minHeight + Math.random() * (maxHeight - minHeight);
        
        // Ensure platforms don't overlap too much
        const overlapping = this.platforms.some(platform => 
            Math.abs(platform.x - x) < platformWidth + 50 && 
            Math.abs(platform.y - y) < 100
        );
        
        if (overlapping) return null;

        return {
            x,
            y,
            width: platformWidth,
            height: platformHeight,
            type: 'platform'
        };
    }

    generateCollectibles(level) {
        const collectibleCount = 5 + level * 2;
        
        for (let i = 0; i < collectibleCount; i++) {
            // Place collectibles on or near platforms
            const platform = this.platforms[Math.floor(Math.random() * this.platforms.length)];
            
            const collectible = {
                x: platform.x + Math.random() * platform.width,
                y: platform.y - 30,
                width: 20,
                height: 20,
                type: this.getRandomCollectibleType(),
                value: 10 + level * 5,
                collected: false,
                id: `collectible_${i}_${Date.now()}`
            };
            
            this.collectibles.push(collectible);
        }
    }

    generateObstacles(level) {
        const obstacleCount = Math.min(3 + level, 10);
        
        for (let i = 0; i < obstacleCount; i++) {
            const platform = this.platforms[Math.floor(Math.random() * this.platforms.length)];
            
            if (platform.type === 'ground') continue; // Don't place on ground
            
            const obstacle = {
                x: platform.x + Math.random() * (platform.width - 30),
                y: platform.y - 40,
                width: 30,
                height: 40,
                type: this.getRandomObstacleType(),
                damage: 10 + level * 2
            };
            
            this.obstacles.push(obstacle);
        }
    }

    generateSpawnPoints(level) {
        const spawnCount = Math.min(4 + level, 12);
        
        for (let i = 0; i < spawnCount; i++) {
            const platform = this.platforms[Math.floor(Math.random() * this.platforms.length)];
            
            const spawnPoint = {
                x: platform.x + Math.random() * platform.width,
                y: platform.y - 50,
                type: this.getRandomEnemyType(level),
                active: true,
                cooldown: 0,
                maxCooldown: 3000 + Math.random() * 2000 // 3-5 seconds
            };
            
            this.spawnPoints.push(spawnPoint);
        }
    }

    getRandomCollectibleType() {
        const types = ['energy', 'health', 'score', 'weapon_upgrade'];
        return types[Math.floor(Math.random() * types.length)];
    }

    getRandomObstacleType() {
        const types = ['spike', 'laser', 'electric'];
        return types[Math.floor(Math.random() * types.length)];
    }

    getRandomEnemyType(level) {
        const types = ['basic', 'fast'];
        if (level >= 3) types.push('heavy');
        if (level >= 5) types.push('sniper');
        
        return types[Math.floor(Math.random() * types.length)];
    }

    update(deltaTime) {
        // Update spawn point cooldowns
        this.spawnPoints.forEach(spawn => {
            if (spawn.cooldown > 0) {
                spawn.cooldown -= deltaTime;
            }
        });

        // Check for collectible collection
        this.checkCollectibleCollection();
        
        // Check for obstacle collisions
        this.checkObstacleCollisions();
    }

    checkCollectibleCollection() {
        const player = this.game.player;
        
        this.collectibles.forEach(collectible => {
            if (collectible.collected) return;
            
            // Simple AABB collision detection
            if (player.x < collectible.x + collectible.width &&
                player.x + player.width > collectible.x &&
                player.y < collectible.y + collectible.height &&
                player.y + player.height > collectible.y) {
                
                this.collectCollectible(collectible);
            }
        });
    }

    collectCollectible(collectible) {
        collectible.collected = true;
        
        // Apply collectible effect
        switch (collectible.type) {
            case 'energy':
                this.game.player.energy = Math.min(100, this.game.player.energy + 20);
                break;
            case 'health':
                this.game.player.health = Math.min(100, this.game.player.health + 25);
                break;
            case 'score':
                this.game.gameState.addScore(collectible.value);
                break;
            case 'weapon_upgrade':
                this.game.player.weaponLevel = Math.min(3, this.game.player.weaponLevel + 1);
                break;
        }

        // Emit blockchain event
        if (this.game.somniaConnector) {
            this.game.somniaConnector.emitCollectiblePickup({
                type: collectible.type,
                value: collectible.value,
                position: { x: collectible.x, y: collectible.y },
                timestamp: Date.now()
            });
        }

        console.log(`🎁 Collected ${collectible.type}!`);
    }

    checkObstacleCollisions() {
        const player = this.game.player;
        
        this.obstacles.forEach(obstacle => {
            // Simple AABB collision detection
            if (player.x < obstacle.x + obstacle.width &&
                player.x + player.width > obstacle.x &&
                player.y < obstacle.y + obstacle.height &&
                player.y + player.height > obstacle.y) {
                
                // Damage player
                player.takeDamage(obstacle.damage);
                
                // Push player away from obstacle
                const pushX = player.x < obstacle.x ? -50 : 50;
                player.x += pushX;
            }
        });
    }

    getReadySpawnPoints() {
        return this.spawnPoints.filter(spawn => 
            spawn.active && spawn.cooldown <= 0
        );
    }

    useSpawnPoint(spawnPoint) {
        spawnPoint.cooldown = spawnPoint.maxCooldown;
    }

    nextLevel() {
        this.currentLevel++;
        this.generateLevel(this.currentLevel);
        
        // Emit level complete event
        if (this.game.somniaConnector) {
            this.game.somniaConnector.emitLevelComplete({
                level: this.currentLevel - 1,
                score: this.game.gameState.score,
                timestamp: Date.now()
            });
        }
        
        console.log(`🎯 Level ${this.currentLevel} started!`);
    }

    render(ctx, camera) {
        // Render platforms
        ctx.fillStyle = '#4a5568';
        this.platforms.forEach(platform => {
            const screenX = platform.x - camera.x;
            const screenY = platform.y - camera.y;
            
            if (screenX > -platform.width && screenX < camera.width &&
                screenY > -platform.height && screenY < camera.height) {
                
                ctx.fillRect(screenX, screenY, platform.width, platform.height);
                
                // Add platform border
                ctx.strokeStyle = '#2d3748';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX, screenY, platform.width, platform.height);
            }
        });

        // Render collectibles
        this.collectibles.forEach(collectible => {
            if (collectible.collected) return;
            
            const screenX = collectible.x - camera.x;
            const screenY = collectible.y - camera.y;
            
            if (screenX > -collectible.width && screenX < camera.width &&
                screenY > -collectible.height && screenY < camera.height) {
                
                // Different colors for different types
                switch (collectible.type) {
                    case 'energy':
                        ctx.fillStyle = '#3182ce';
                        break;
                    case 'health':
                        ctx.fillStyle = '#e53e3e';
                        break;
                    case 'score':
                        ctx.fillStyle = '#d69e2e';
                        break;
                    case 'weapon_upgrade':
                        ctx.fillStyle = '#805ad5';
                        break;
                }
                
                ctx.fillRect(screenX, screenY, collectible.width, collectible.height);
                
                // Add glow effect
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 10;
                ctx.fillRect(screenX, screenY, collectible.width, collectible.height);
                ctx.shadowBlur = 0;
            }
        });

        // Render obstacles
        ctx.fillStyle = '#e53e3e';
        this.obstacles.forEach(obstacle => {
            const screenX = obstacle.x - camera.x;
            const screenY = obstacle.y - camera.y;
            
            if (screenX > -obstacle.width && screenX < camera.width &&
                screenY > -obstacle.height && screenY < camera.height) {
                
                ctx.fillRect(screenX, screenY, obstacle.width, obstacle.height);
                
                // Add danger indicator
                ctx.strokeStyle = '#c53030';
                ctx.lineWidth = 3;
                ctx.strokeRect(screenX, screenY, obstacle.width, obstacle.height);
            }
        });

        // Render spawn points (for debugging)
        if (this.game.debug) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            this.spawnPoints.forEach(spawn => {
                const screenX = spawn.x - camera.x;
                const screenY = spawn.y - camera.y;
                
                ctx.fillRect(screenX - 10, screenY - 10, 20, 20);
            });
        }
    }

    getPlatforms() {
        return this.platforms;
    }

    getCurrentLevel() {
        return this.currentLevel;
    }

    getCollectibles() {
        return this.collectibles.filter(c => !c.collected);
    }

    getObstacles() {
        return this.obstacles;
    }
}