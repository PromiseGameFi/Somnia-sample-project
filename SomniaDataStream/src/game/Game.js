import * as THREE from 'three';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { PowerUp } from './entities/PowerUp.js';
import { Projectile } from './entities/Projectile.js';
import { InputManager } from './InputManager.js';
import { GameState } from './GameState.js';

export class Game {
    constructor(somniaConnector, uiManager) {
        this.somniaConnector = somniaConnector;
        this.uiManager = uiManager;
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Game entities
        this.player = null;
        this.enemies = [];
        this.powerUps = [];
        this.projectiles = [];
        this.particles = [];
        
        // Game systems
        this.inputManager = null;
        this.gameState = null;
        
        // Game loop
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.animationId = null;
        
        // Game settings
        this.settings = {
            maxEnemies: 10,
            maxPowerUps: 5,
            enemySpawnRate: 0.02,
            powerUpSpawnRate: 0.005,
            worldSize: 100
        };
        
        // Performance monitoring
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.fps = 0;
    }

    async init() {
        console.log('🎮 Initializing game engine...');
        
        try {
            // Initialize Three.js
            this.initThreeJS();
            
            // Initialize game systems
            this.inputManager = new InputManager();
            this.gameState = new GameState();
            
            // Create game world
            this.createWorld();
            
            // Initialize player
            this.player = new Player(this.scene, this.somniaConnector);
            await this.player.init();
            
            // Set up camera to follow player
            this.setupCamera();
            
            // Set up blockchain event listeners
            this.setupBlockchainEvents();
            
            // Initialize UI updates
            this.setupUIUpdates();
            
            console.log('✅ Game engine initialized successfully!');
            
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            throw error;
        }
    }

    initThreeJS() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        // Create renderer
        const canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add lighting
        this.setupLighting();
        
        console.log('🌟 Three.js initialized');
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
        
        // Point lights for atmosphere
        const colors = [0x00ffff, 0xff00ff, 0xffff00];
        for (let i = 0; i < 3; i++) {
            const pointLight = new THREE.PointLight(colors[i], 0.5, 50);
            pointLight.position.set(
                (Math.random() - 0.5) * 200,
                Math.random() * 50 + 10,
                (Math.random() - 0.5) * 200
            );
            this.scene.add(pointLight);
        }
    }

    createWorld() {
        // Create starfield
        this.createStarfield();
        
        // Create space platform/arena
        this.createArena();
        
        // Create boundary walls
        this.createBoundaries();
    }

    createStarfield() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2,
            sizeAttenuation: false
        });
        
        const starsVertices = [];
        for (let i = 0; i < 10000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            starsVertices.push(x, y, z);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
    }

    createArena() {
        // Create main platform
        const platformGeometry = new THREE.CylinderGeometry(50, 50, 2, 32);
        const platformMaterial = new THREE.MeshLambertMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.8
        });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.y = -1;
        platform.receiveShadow = true;
        this.scene.add(platform);
        
        // Add platform glow effect
        const glowGeometry = new THREE.RingGeometry(48, 52, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0.1;
        this.scene.add(glow);
    }

    createBoundaries() {
        // Create invisible boundary walls
        const boundarySize = this.settings.worldSize;
        const wallHeight = 20;
        const wallThickness = 1;
        
        const wallMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.1,
            wireframe: true
        });
        
        // Create 4 walls
        const positions = [
            { x: boundarySize / 2, z: 0, rotY: 0 },
            { x: -boundarySize / 2, z: 0, rotY: 0 },
            { x: 0, z: boundarySize / 2, rotY: Math.PI / 2 },
            { x: 0, z: -boundarySize / 2, rotY: Math.PI / 2 }
        ];
        
        positions.forEach(pos => {
            const wallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, boundarySize);
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(pos.x, wallHeight / 2, pos.z);
            wall.rotation.y = pos.rotY;
            this.scene.add(wall);
        });
    }

    setupCamera() {
        // Position camera behind and above player
        this.camera.position.set(0, 10, 15);
        this.camera.lookAt(0, 0, 0);
    }

    setupBlockchainEvents() {
        // Listen for blockchain events
        this.somniaConnector.on('playerMoved', (data) => {
            console.log('📍 Player moved on blockchain:', data);
        });
        
        this.somniaConnector.on('weaponFired', (data) => {
            console.log('🔫 Weapon fired on blockchain:', data);
            this.createWeaponEffect(data);
        });
        
        this.somniaConnector.on('powerUpCollected', (data) => {
            console.log('⚡ Power-up collected on blockchain:', data);
            this.uiManager.showNotification('Power-up collected!', 'success');
        });
        
        this.somniaConnector.on('scoreUpdated', (data) => {
            console.log('🏆 Score updated on blockchain:', data);
            this.gameState.updateScore(data.newScore);
        });
    }

    setupUIUpdates() {
        // Update UI periodically
        setInterval(() => {
            this.updateUI();
        }, 100); // Update every 100ms for smooth UI
    }

    updateUI() {
        if (!this.gameState || !this.player) return;
        
        // Update player stats
        this.uiManager.updatePlayerStats({
            score: this.gameState.score,
            health: this.player.health,
            energy: this.player.energy,
            level: this.gameState.level
        });
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        
        // Start game loop
        this.gameLoop();
        
        console.log('🚀 Game started!');
    }

    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        if (!this.isPaused) {
            this.update(deltaTime);
            this.render();
        }
        
        // Update FPS counter
        this.updateFPS(currentTime);
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        // Update input
        this.inputManager.update();
        
        // Update player
        if (this.player) {
            this.player.update(deltaTime, this.inputManager);
            this.updateCameraFollow();
        }
        
        // Update enemies
        this.updateEnemies(deltaTime);
        
        // Update power-ups
        this.updatePowerUps(deltaTime);
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Spawn new entities
        this.spawnEntities();
        
        // Check collisions
        this.checkCollisions();
        
        // Update game state
        this.gameState.update(deltaTime);
        
        // Send position updates to blockchain (throttled)
        this.updateBlockchainPosition();
    }

    updateCameraFollow() {
        if (!this.player) return;
        
        const playerPos = this.player.getPosition();
        const targetPos = new THREE.Vector3(
            playerPos.x,
            playerPos.y + 10,
            playerPos.z + 15
        );
        
        // Smooth camera follow
        this.camera.position.lerp(targetPos, 0.05);
        this.camera.lookAt(playerPos);
    }

    updateEnemies(deltaTime) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime, this.player);
            
            // Remove dead enemies
            if (enemy.isDead()) {
                enemy.destroy();
                this.scene.remove(enemy.mesh);
                this.enemies.splice(i, 1);
                
                // Award points
                this.gameState.addScore(100);
                this.somniaConnector.updateScore(this.gameState.score);
            }
        }
    }

    updatePowerUps(deltaTime) {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.update(deltaTime);
            
            // Remove expired power-ups
            if (powerUp.isExpired()) {
                powerUp.destroy();
                this.scene.remove(powerUp.mesh);
                this.powerUps.splice(i, 1);
            }
        }
    }

    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(deltaTime);
            
            // Remove expired projectiles
            if (projectile.isExpired()) {
                projectile.destroy();
                this.scene.remove(projectile.mesh);
                this.projectiles.splice(i, 1);
            }
        }
    }

    updateParticles(deltaTime) {
        // Update particle systems (placeholder)
        // In a full implementation, this would handle visual effects
    }

    spawnEntities() {
        // Spawn enemies
        if (this.enemies.length < this.settings.maxEnemies && Math.random() < this.settings.enemySpawnRate) {
            this.spawnEnemy();
        }
        
        // Spawn power-ups
        if (this.powerUps.length < this.settings.maxPowerUps && Math.random() < this.settings.powerUpSpawnRate) {
            this.spawnPowerUp();
        }
    }

    spawnEnemy() {
        const enemy = new Enemy(this.scene);
        enemy.init();
        
        // Random spawn position around the arena
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 20;
        enemy.setPosition(
            Math.cos(angle) * distance,
            Math.random() * 10 + 5,
            Math.sin(angle) * distance
        );
        
        this.enemies.push(enemy);
    }

    spawnPowerUp() {
        const powerUp = new PowerUp(this.scene);
        powerUp.init();
        
        // Random spawn position on the platform
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 40;
        powerUp.setPosition(
            Math.cos(angle) * distance,
            2,
            Math.sin(angle) * distance
        );
        
        this.powerUps.push(powerUp);
    }

    checkCollisions() {
        if (!this.player) return;
        
        const playerPos = this.player.getPosition();
        const playerRadius = this.player.getRadius();
        
        // Check power-up collisions
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            const distance = playerPos.distanceTo(powerUp.getPosition());
            
            if (distance < playerRadius + powerUp.getRadius()) {
                // Collect power-up
                this.collectPowerUp(powerUp, i);
            }
        }
        
        // Check enemy collisions
        for (const enemy of this.enemies) {
            const distance = playerPos.distanceTo(enemy.getPosition());
            
            if (distance < playerRadius + enemy.getRadius()) {
                // Player hit by enemy
                this.player.takeDamage(10);
                this.uiManager.updateHealth(this.player.health);
                
                if (this.player.health <= 0) {
                    this.gameOver();
                }
            }
        }
        
        // Check projectile collisions
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            const projectilePos = projectile.getPosition();
            
            // Check against enemies
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                const distance = projectilePos.distanceTo(enemy.getPosition());
                
                if (distance < projectile.getRadius() + enemy.getRadius()) {
                    // Hit enemy
                    enemy.takeDamage(projectile.damage);
                    
                    // Remove projectile
                    projectile.destroy();
                    this.scene.remove(projectile.mesh);
                    this.projectiles.splice(i, 1);
                    
                    break;
                }
            }
        }
    }

    collectPowerUp(powerUp, index) {
        // Apply power-up effect
        powerUp.applyEffect(this.player);
        
        // Remove from scene
        powerUp.destroy();
        this.scene.remove(powerUp.mesh);
        this.powerUps.splice(index, 1);
        
        // Notify blockchain
        this.somniaConnector.collectPowerUp(powerUp.id);
        
        // Update UI
        this.uiManager.showNotification(`Collected ${powerUp.type}!`, 'success');
    }

    createWeaponEffect(data) {
        // Create visual effect for weapon fire
        const projectile = new Projectile(this.scene);
        projectile.init();
        projectile.setPosition(data.targetX, data.targetY, data.targetZ);
        this.projectiles.push(projectile);
    }

    updateBlockchainPosition() {
        // Throttle position updates to blockchain
        if (!this.player || !this.lastPositionUpdate) {
            this.lastPositionUpdate = Date.now();
            return;
        }
        
        const now = Date.now();
        if (now - this.lastPositionUpdate > 500) { // Update every 500ms
            const pos = this.player.getPosition();
            this.somniaConnector.updatePlayerPosition(pos.x, pos.y, pos.z);
            this.lastPositionUpdate = now;
        }
    }

    updateFPS(currentTime) {
        this.frameCount++;
        
        if (currentTime - this.lastFPSUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
            
            // Log FPS for debugging
            if (this.fps < 30) {
                console.warn(`⚠️ Low FPS: ${this.fps}`);
            }
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    handleResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    pause() {
        this.isPaused = true;
        console.log('⏸️ Game paused');
    }

    resume() {
        this.isPaused = false;
        this.lastTime = performance.now();
        console.log('▶️ Game resumed');
    }

    gameOver() {
        console.log('💀 Game Over!');
        this.uiManager.showNotification('Game Over!', 'error', 5000);
        
        // Reset game state
        setTimeout(() => {
            this.resetGame();
        }, 3000);
    }

    resetGame() {
        // Reset player
        if (this.player) {
            this.player.reset();
        }
        
        // Clear entities
        this.clearEntities();
        
        // Reset game state
        this.gameState.reset();
        
        console.log('🔄 Game reset');
    }

    clearEntities() {
        // Clear enemies
        this.enemies.forEach(enemy => {
            enemy.destroy();
            this.scene.remove(enemy.mesh);
        });
        this.enemies = [];
        
        // Clear power-ups
        this.powerUps.forEach(powerUp => {
            powerUp.destroy();
            this.scene.remove(powerUp.mesh);
        });
        this.powerUps = [];
        
        // Clear projectiles
        this.projectiles.forEach(projectile => {
            projectile.destroy();
            this.scene.remove(projectile.mesh);
        });
        this.projectiles = [];
    }

    stop() {
        this.isRunning = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Clean up
        this.clearEntities();
        
        if (this.inputManager) {
            this.inputManager.destroy();
        }
        
        console.log('🛑 Game stopped');
    }
}