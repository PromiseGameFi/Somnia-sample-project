import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { InputManager } from './systems/InputManager.js';
import { GameState } from './systems/GameState.js';
import { DataStreamVisualizer } from './systems/DataStreamVisualizer.js';
import { LevelManager } from './systems/LevelManager.js';
import { GameUI } from './ui/GameUI.js';

export class Game {
    constructor(canvas, somniaConnector) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.somniaConnector = somniaConnector;
        
        // Canvas dimensions
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Camera for 2D side-scrolling
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            smoothing: 0.1
        };
        
        // Game entities
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        
        // Game systems
        this.inputManager = new InputManager();
        this.gameState = new GameState();
        this.dataStreamVisualizer = new DataStreamVisualizer(somniaConnector);
        this.levelManager = new LevelManager(this);
        this.gameUI = new GameUI(this);
        
        // Game loop
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.animationId = null;
        
        // Game settings
        this.settings = {
            gravity: 0.8,
            maxEnemies: 5,
            maxCollectibles: 8,
            enemySpawnRate: 0.01,
            collectibleSpawnRate: 0.008,
            worldWidth: 2400,
            worldHeight: 600
        };
        
        // Debug mode
        this.debug = false;
        
        // Level design
        this.currentLevel = 1;
        this.levelData = this.generateLevel();
        
        // Performance monitoring
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.fps = 0;
        
        console.log('🎮 2D Platformer Game initialized');
    }

    async init() {
        try {
            this.setupCanvas();
            this.setupGameSystems();
            await this.createGameEntities();
            this.setupEventListeners();
            
            console.log('✅ Game initialization complete');
            return true;
        } catch (error) {
            console.error('❌ Game initialization failed:', error);
            return false;
        }
    }

    setupCanvas() {
        // Canvas is already provided in constructor
        this.canvas.style.border = '2px solid #00aaff';
        this.canvas.style.background = 'linear-gradient(180deg, #001122 0%, #003366 100%)';
        
        console.log('🖼️ Canvas setup complete');
    }

    setupGameSystems() {
        // Initialize data stream monitoring
        this.dataStreamVisualizer.init();
        
        console.log('⚙️ Game systems initialized');
    }

    async createGameEntities() {
        // Create player
        this.player = new Player(this.somniaConnector);
        await this.player.init();
        this.player.setPosition(100, this.height - 150);
        
        // Create platforms from level data
        this.createPlatforms();
        
        // Create initial enemies
        this.spawnEnemies();
        
        // Create initial collectibles
        this.spawnCollectibles();
        
        console.log('🎯 Game entities created');
    }

    generateLevel() {
        // Simple level with platforms
        return {
            platforms: [
                { x: 0, y: this.height - 40, width: 200, height: 40 },
                { x: 300, y: this.height - 120, width: 150, height: 20 },
                { x: 500, y: this.height - 200, width: 120, height: 20 },
                { x: 700, y: this.height - 160, width: 100, height: 20 },
                { x: 900, y: this.height - 240, width: 150, height: 20 },
                { x: 1100, y: this.height - 180, width: 120, height: 20 },
                { x: 1300, y: this.height - 120, width: 200, height: 20 },
                { x: 1600, y: this.height - 200, width: 150, height: 20 },
                { x: 1800, y: this.height - 280, width: 120, height: 20 },
                { x: 2000, y: this.height - 160, width: 400, height: 40 }
            ],
            enemies: [
                { x: 350, y: this.height - 140, type: 'patrol' },
                { x: 550, y: this.height - 220, type: 'guard' },
                { x: 950, y: this.height - 260, type: 'patrol' },
                { x: 1350, y: this.height - 140, type: 'guard' },
                { x: 1850, y: this.height - 300, type: 'patrol' }
            ],
            collectibles: [
                { x: 320, y: this.height - 150, type: 'data' },
                { x: 520, y: this.height - 230, type: 'energy' },
                { x: 720, y: this.height - 190, type: 'data' },
                { x: 920, y: this.height - 270, type: 'health' },
                { x: 1120, y: this.height - 210, type: 'data' },
                { x: 1320, y: this.height - 150, type: 'energy' },
                { x: 1620, y: this.height - 230, type: 'data' },
                { x: 1820, y: this.height - 310, type: 'health' }
            ]
        };
    }

    createPlatforms() {
        this.platforms = [];
        this.levelData.platforms.forEach(platformData => {
            const platform = new Platform(platformData.x, platformData.y, platformData.width, platformData.height);
            this.platforms.push(platform);
        });
    }

    spawnEnemies() {
        this.enemies = [];
        this.levelData.enemies.forEach(enemyData => {
            const enemy = new Enemy(enemyData.x, enemyData.y, enemyData.type);
            enemy.init();
            this.enemies.push(enemy);
        });
    }

    spawnCollectibles() {
        this.collectibles = [];
        this.levelData.collectibles.forEach(collectibleData => {
            const collectible = new Collectible(collectibleData.x, collectibleData.y, collectibleData.type);
            this.collectibles.push(collectible);
        });
    }

    setupEventListeners() {
        // Canvas focus for input
        this.canvas.tabIndex = 1;
        this.canvas.focus();
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        console.log('🎧 Event listeners setup');
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        this.gameLoop();
        
        console.log('▶️ Game started');
    }

    pause() {
        this.isPaused = !this.isPaused;
        console.log(this.isPaused ? '⏸️ Game paused' : '▶️ Game resumed');
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        console.log('⏹️ Game stopped');
    }

    gameLoop(currentTime = performance.now()) {
        if (!this.isRunning) return;
        
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        if (!this.isPaused) {
            this.update(deltaTime);
            this.render();
        }
        
        this.updateFPS(currentTime);
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        if (this.isPaused) return;

        this.deltaTime = deltaTime;

        // Update input
        this.inputManager.update();
        
        // Update game systems
        this.gameState.update(deltaTime);
        this.dataStreamVisualizer.update(deltaTime);
        this.levelManager.update(deltaTime);
        this.gameUI.update(deltaTime);
        
        // Update player
        if (this.player) {
            this.player.update(deltaTime, this.inputManager, this.levelManager.getPlatforms());
        }
        
        // Update camera to follow player
        this.updateCamera();
        
        // Spawn enemies from level manager
        const readySpawns = this.levelManager.getReadySpawnPoints();
        readySpawns.forEach(spawn => {
            if (this.enemies.length < 8) { // Limit concurrent enemies
                const enemy = new Enemy(spawn.x, spawn.y, this.somniaConnector);
                enemy.type = spawn.type;
                this.enemies.push(enemy);
                this.levelManager.useSpawnPoint(spawn);
            }
        });
        
        // Update enemies
        this.enemies.forEach((enemy, index) => {
            enemy.update(deltaTime, this.player, this.levelManager.getPlatforms());
            
            // Remove dead enemies
            if (enemy.health <= 0) {
                this.gameState.addScore(enemy.scoreValue || 50);
                this.enemies.splice(index, 1);
            }
        });
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
        // Update collectibles
        this.updateCollectibles(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Check collisions
        this.checkCollisions();
        
        // Spawn new entities if needed
        this.spawnNewEntities();
        
        // Check for level completion
        if (this.enemies.length === 0 && this.levelManager.getCollectibles().length === 0) {
            this.nextLevel();
        }
    }

    nextLevel() {
        this.levelManager.nextLevel();
        
        // Reset player position
        if (this.player) {
            this.player.x = 100;
            this.player.y = this.height - 150;
            this.player.health = Math.min(100, this.player.health + 25); // Heal on level up
            this.player.energy = 100;
        }
        
        // Clear enemies and projectiles
        this.enemies = [];
        this.projectiles = [];
        
        console.log(`🎯 Advanced to level ${this.levelManager.getCurrentLevel()}`);
    }

    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    toggleDebug() {
        this.debug = !this.debug;
        console.log(`Debug mode: ${this.debug ? 'ON' : 'OFF'}`);
    }

    getGameState() {
        return {
            level: this.levelManager.getCurrentLevel(),
            score: this.gameState.score,
            playerHealth: this.player ? this.player.health : 0,
            playerEnergy: this.player ? this.player.energy : 0,
            enemiesRemaining: this.enemies.length,
            collectiblesRemaining: this.collectibles.length
        };

        // Handle input for UI
        if (this.inputManager.isKeyPressed('F3')) {
            this.gameUI.handleInput('F3');
        }
    }

    updateCamera() {
        // Follow player with smooth camera movement
        this.camera.targetX = this.player.x - this.width / 2;
        this.camera.targetY = this.player.y - this.height / 2;
        
        // Clamp camera to world bounds
        this.camera.targetX = Math.max(0, Math.min(this.settings.worldWidth - this.width, this.camera.targetX));
        this.camera.targetY = Math.max(0, Math.min(this.settings.worldHeight - this.height, this.camera.targetY));
        
        // Smooth camera movement
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;
    }

    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(deltaTime);
            
            // Check collisions with enemies
            if (projectile.owner === 'player') {
                this.enemies.forEach(enemy => {
                    if (this.checkCollision(projectile, enemy)) {
                        enemy.takeDamage(projectile.damage);
                        this.projectiles.splice(i, 1);
                    }
                });
            }
            
            // Check collisions with player
            if (projectile.owner === 'enemy' && this.player) {
                if (this.checkCollision(projectile, this.player)) {
                    this.player.takeDamage(projectile.damage);
                    this.projectiles.splice(i, 1);
                }
            }
            
            // Remove projectiles that are out of bounds or expired
            if (projectile.x < -50 || projectile.x > this.settings.worldWidth + 50 || 
                projectile.y < -50 || projectile.y > this.settings.worldHeight + 50 ||
                projectile.lifetime <= 0) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    updateCollectibles(deltaTime) {
        this.collectibles.forEach(collectible => {
            collectible.update(deltaTime);
        });
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime);
            
            if (particle.lifetime <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    checkCollisions() {
        // Player vs collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];
            if (this.player.checkCollision(collectible)) {
                this.collectItem(collectible);
                this.collectibles.splice(i, 1);
            }
        }
        
        // Projectiles vs enemies
        this.projectiles.forEach((projectile, pIndex) => {
            if (projectile.owner === 'player') {
                this.enemies.forEach((enemy, eIndex) => {
                    if (projectile.checkCollision(enemy)) {
                        this.hitEnemy(enemy, projectile.damage);
                        this.projectiles.splice(pIndex, 1);
                        this.createHitEffect(enemy.x, enemy.y);
                    }
                });
            }
        });
        
        // Player vs enemies
        this.enemies.forEach(enemy => {
            if (this.player.checkCollision(enemy)) {
                this.player.takeDamage(10);
                this.createHitEffect(this.player.x, this.player.y);
            }
        });
    }

    collectItem(collectible) {
        // Trigger data stream event
        this.dataStreamVisualizer.addEvent({
            type: 'collect',
            data: collectible.type,
            timestamp: Date.now(),
            position: { x: collectible.x, y: collectible.y }
        });
        
        // Apply collectible effect
        switch (collectible.type) {
            case 'data':
                this.gameState.score += 100;
                this.gameState.dataCollected++;
                break;
            case 'energy':
                this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 25);
                break;
            case 'health':
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 20);
                break;
        }
        
        this.createCollectEffect(collectible.x, collectible.y, collectible.type);
    }

    hitEnemy(enemy, damage) {
        enemy.takeDamage(damage);
        
        // Trigger data stream event
        this.dataStreamVisualizer.addEvent({
            type: 'combat',
            data: { damage, enemyType: enemy.type },
            timestamp: Date.now(),
            position: { x: enemy.x, y: enemy.y }
        });
        
        if (enemy.health <= 0) {
            this.gameState.score += 50;
            this.gameState.enemiesDefeated++;
        }
    }

    spawnNewEntities() {
        // Spawn new enemies occasionally
        if (Math.random() < this.settings.enemySpawnRate && this.enemies.length < this.settings.maxEnemies) {
            const spawnX = this.camera.x + this.width + 100;
            const spawnY = this.height - 100;
            const enemy = new Enemy(spawnX, spawnY, 'patrol');
            enemy.init();
            this.enemies.push(enemy);
        }
        
        // Spawn new collectibles occasionally
        if (Math.random() < this.settings.collectibleSpawnRate && this.collectibles.length < this.settings.maxCollectibles) {
            const spawnX = this.camera.x + this.width + 50;
            const spawnY = Math.random() * (this.height - 200) + 100;
            const types = ['data', 'energy', 'health'];
            const type = types[Math.floor(Math.random() * types.length)];
            const collectible = new Collectible(spawnX, spawnY, type);
            this.collectibles.push(collectible);
        }
    }

    createHitEffect(x, y) {
        // Create hit particles
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                lifetime: 0.5,
                maxLifetime: 0.5,
                color: '#ff4444',
                size: 3,
                update: function(deltaTime) {
                    this.x += this.vx * deltaTime;
                    this.y += this.vy * deltaTime;
                    this.lifetime -= deltaTime;
                    this.size *= 0.98;
                }
            });
        }
    }

    createCollectEffect(x, y, type) {
        const colors = {
            data: '#00aaff',
            energy: '#ffaa00',
            health: '#00ff44'
        };
        
        // Create collect particles
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150,
                lifetime: 1.0,
                maxLifetime: 1.0,
                color: colors[type] || '#ffffff',
                size: 4,
                update: function(deltaTime) {
                    this.x += this.vx * deltaTime;
                    this.y += this.vy * deltaTime;
                    this.lifetime -= deltaTime;
                    this.size *= 0.99;
                }
            });
        }
    }

    render() {
        // Clear canvas with gradient background
        this.ctx.fillStyle = 'linear-gradient(180deg, #001122 0%, #003366 100%)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Set camera transform for world rendering
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Render level (platforms, collectibles, obstacles)
        this.levelManager.render(this.ctx, this.camera);
        
        // Render enemies
        this.enemies.forEach(enemy => {
            enemy.render(this.ctx, this.camera);
        });
        
        // Render player
        if (this.player) {
            this.player.render(this.ctx, this.camera);
        }
        
        // Render projectiles
        this.projectiles.forEach(projectile => {
            projectile.render(this.ctx, this.camera);
        });
        
        // Render particles
        this.particles.forEach(particle => {
            particle.render(this.ctx, this.camera);
        });
        
        // Restore camera transform
        this.ctx.restore();
        
        // Render data stream visualization (screen space)
        this.dataStreamVisualizer.render(this.ctx);
        
        // Render UI (screen space)
        this.gameUI.render();
    }

    renderUI() {
        // Health bar
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillRect(20, 20, 200, 20);
        this.ctx.fillStyle = '#44ff44';
        this.ctx.fillRect(20, 20, (this.player.health / this.player.maxHealth) * 200, 20);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.strokeRect(20, 20, 200, 20);
        
        // Energy bar
        this.ctx.fillStyle = '#444444';
        this.ctx.fillRect(20, 50, 200, 15);
        this.ctx.fillStyle = '#00aaff';
        this.ctx.fillRect(20, 50, (this.player.energy / this.player.maxEnergy) * 200, 15);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.strokeRect(20, 50, 200, 15);
        
        // Score and stats
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Score: ${this.gameState.score}`, 20, 90);
        this.ctx.fillText(`Data Collected: ${this.gameState.dataCollected}`, 20, 110);
        this.ctx.fillText(`FPS: ${this.fps}`, this.width - 80, 30);
        
        // Blockchain connection status
        const connectionStatus = this.somniaConnector.isConnected ? 'Connected' : 'Disconnected';
        this.ctx.fillStyle = this.somniaConnector.isConnected ? '#44ff44' : '#ff4444';
        this.ctx.fillText(`Blockchain: ${connectionStatus}`, 20, 130);
    }

    updateFPS(currentTime) {
        this.frameCount++;
        if (currentTime - this.lastFPSUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSUpdate));
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
        }
    }

    // Public methods for external control
    addProjectile(projectile) {
        this.projectiles.push(projectile);
    }

    getPlayerPosition() {
        return { x: this.player.x, y: this.player.y };
    }

    getCameraPosition() {
        return { x: this.camera.x, y: this.camera.y };
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }
}