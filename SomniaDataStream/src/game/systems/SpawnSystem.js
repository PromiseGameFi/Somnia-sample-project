import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { PowerUp } from '../entities/PowerUp.js';

export class SpawnSystem {
    constructor(game) {
        this.game = game;
        
        // Spawn configuration
        this.config = {
            enemies: {
                maxCount: 15,
                spawnRate: 2.0, // enemies per second
                spawnDistance: 50,
                minSpawnDistance: 30,
                types: {
                    scout: { weight: 0.4, minLevel: 1 },
                    fighter: { weight: 0.3, minLevel: 1 },
                    heavy: { weight: 0.2, minLevel: 3 },
                    bomber: { weight: 0.1, minLevel: 5 }
                }
            },
            powerUps: {
                maxCount: 5,
                spawnRate: 0.3, // power-ups per second
                spawnDistance: 40,
                minSpawnDistance: 20,
                spawnChance: 0.15, // chance per enemy kill
                types: {
                    health: { weight: 0.25 },
                    shield: { weight: 0.15 },
                    rapidFire: { weight: 0.15 },
                    energyBoost: { weight: 0.15 },
                    damage: { weight: 0.15 },
                    multiShot: { weight: 0.15 }
                }
            }
        };
        
        // Spawn timers
        this.timers = {
            enemySpawn: 0,
            powerUpSpawn: 0,
            waveSpawn: 0
        };
        
        // Wave system
        this.waveSystem = {
            currentWave: 1,
            enemiesInWave: 0,
            enemiesSpawnedInWave: 0,
            waveDelay: 5.0, // seconds between waves
            isWaveActive: false,
            waveStartTime: 0
        };
        
        // Spawn zones
        this.spawnZones = this.createSpawnZones();
        
        // Statistics
        this.stats = {
            totalEnemiesSpawned: 0,
            totalPowerUpsSpawned: 0,
            enemiesByType: {},
            powerUpsByType: {},
            wavesCompleted: 0
        };
        
        console.log('🎯 SpawnSystem initialized');
    }

    createSpawnZones() {
        const zones = [];
        const boundaries = this.game.getWorldBoundaries();
        const zoneCount = 8;
        
        // Create circular spawn zones around the arena
        for (let i = 0; i < zoneCount; i++) {
            const angle = (i / zoneCount) * Math.PI * 2;
            const distance = this.config.enemies.spawnDistance;
            
            zones.push({
                id: i,
                position: new THREE.Vector3(
                    Math.cos(angle) * distance,
                    Math.random() * 10 + 5, // Random height
                    Math.sin(angle) * distance
                ),
                radius: 10,
                type: 'enemy',
                active: true
            });
        }
        
        // Add power-up spawn zones (closer to center)
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const distance = this.config.powerUps.spawnDistance;
            
            zones.push({
                id: zoneCount + i,
                position: new THREE.Vector3(
                    Math.cos(angle) * distance,
                    Math.random() * 5 + 2,
                    Math.sin(angle) * distance
                ),
                radius: 15,
                type: 'powerUp',
                active: true
            });
        }
        
        return zones;
    }

    update(deltaTime) {
        // Update timers
        this.updateTimers(deltaTime);
        
        // Update wave system
        this.updateWaveSystem(deltaTime);
        
        // Spawn enemies
        this.updateEnemySpawning(deltaTime);
        
        // Spawn power-ups
        this.updatePowerUpSpawning(deltaTime);
        
        // Clean up expired entities
        this.cleanupEntities();
        
        // Update difficulty scaling
        this.updateDifficultyScaling();
    }

    updateTimers(deltaTime) {
        this.timers.enemySpawn += deltaTime;
        this.timers.powerUpSpawn += deltaTime;
        this.timers.waveSpawn += deltaTime;
    }

    updateWaveSystem(deltaTime) {
        const gameState = this.game.gameState;
        if (!gameState) return;
        
        const currentLevel = gameState.getLevel();
        
        // Check if we need to start a new wave
        if (!this.waveSystem.isWaveActive && this.game.enemies.length === 0) {
            this.startNewWave(currentLevel);
        }
        
        // Check if current wave is complete
        if (this.waveSystem.isWaveActive && 
            this.waveSystem.enemiesSpawnedInWave >= this.waveSystem.enemiesInWave &&
            this.game.enemies.length === 0) {
            this.completeWave();
        }
    }

    startNewWave(level) {
        this.waveSystem.currentWave++;
        this.waveSystem.isWaveActive = true;
        this.waveSystem.waveStartTime = Date.now();
        this.waveSystem.enemiesSpawnedInWave = 0;
        
        // Calculate enemies for this wave
        this.waveSystem.enemiesInWave = Math.min(
            5 + level * 2 + Math.floor(this.waveSystem.currentWave / 3),
            this.config.enemies.maxCount * 2
        );
        
        // Increase spawn rate for higher waves
        this.config.enemies.spawnRate = Math.min(
            2.0 + this.waveSystem.currentWave * 0.2,
            5.0
        );
        
        console.log(`🌊 Wave ${this.waveSystem.currentWave} started - ${this.waveSystem.enemiesInWave} enemies`);
        
        // Trigger blockchain event
        if (this.game.somniaConnector) {
            this.game.somniaConnector.emitWaveStarted(
                this.waveSystem.currentWave,
                this.waveSystem.enemiesInWave
            );
        }
        
        // Update UI
        if (this.game.uiManager) {
            this.game.uiManager.showWaveNotification(this.waveSystem.currentWave);
        }
    }

    completeWave() {
        this.waveSystem.isWaveActive = false;
        this.stats.wavesCompleted++;
        
        console.log(`✅ Wave ${this.waveSystem.currentWave} completed!`);
        
        // Bonus score for wave completion
        if (this.game.gameState) {
            const bonus = this.waveSystem.currentWave * 100;
            this.game.gameState.addScore(bonus);
        }
        
        // Trigger blockchain event
        if (this.game.somniaConnector) {
            this.game.somniaConnector.emitWaveCompleted(
                this.waveSystem.currentWave,
                this.stats.wavesCompleted
            );
        }
        
        // Spawn bonus power-up
        this.spawnBonusPowerUp();
        
        // Reset spawn timer for next wave
        this.timers.waveSpawn = 0;
    }

    updateEnemySpawning(deltaTime) {
        // Check if we should spawn enemies
        const spawnInterval = 1.0 / this.config.enemies.spawnRate;
        
        if (this.timers.enemySpawn >= spawnInterval &&
            this.game.enemies.length < this.config.enemies.maxCount &&
            this.waveSystem.isWaveActive &&
            this.waveSystem.enemiesSpawnedInWave < this.waveSystem.enemiesInWave) {
            
            this.spawnEnemy();
            this.timers.enemySpawn = 0;
        }
    }

    updatePowerUpSpawning(deltaTime) {
        // Check if we should spawn power-ups
        const spawnInterval = 1.0 / this.config.powerUps.spawnRate;
        
        if (this.timers.powerUpSpawn >= spawnInterval &&
            this.game.powerUps.length < this.config.powerUps.maxCount) {
            
            // Random chance to spawn
            if (Math.random() < 0.1) { // 10% chance per check
                this.spawnPowerUp();
                this.timers.powerUpSpawn = 0;
            }
        }
    }

    spawnEnemy() {
        const playerPos = this.game.player ? this.game.player.getPosition() : new THREE.Vector3();
        const spawnPos = this.getEnemySpawnPosition(playerPos);
        
        if (!spawnPos) return;
        
        // Select enemy type based on current level and weights
        const enemyType = this.selectEnemyType();
        
        // Create enemy
        const enemy = new Enemy(this.game.scene, enemyType);
        enemy.init();
        enemy.setPosition(spawnPos.x, spawnPos.y, spawnPos.z);
        
        // Set target to player
        if (this.game.player) {
            enemy.setTarget(this.game.player);
        }
        
        // Add to game
        this.game.enemies.push(enemy);
        
        // Update statistics
        this.stats.totalEnemiesSpawned++;
        this.stats.enemiesByType[enemyType] = (this.stats.enemiesByType[enemyType] || 0) + 1;
        this.waveSystem.enemiesSpawnedInWave++;
        
        console.log(`👾 Enemy spawned: ${enemyType} at (${spawnPos.x.toFixed(1)}, ${spawnPos.y.toFixed(1)}, ${spawnPos.z.toFixed(1)})`);
        
        // Trigger blockchain event
        if (this.game.somniaConnector) {
            this.game.somniaConnector.emitEnemySpawned(enemyType, spawnPos);
        }
    }

    spawnPowerUp(forceType = null) {
        const playerPos = this.game.player ? this.game.player.getPosition() : new THREE.Vector3();
        const spawnPos = this.getPowerUpSpawnPosition(playerPos);
        
        if (!spawnPos) return;
        
        // Create power-up
        const powerUp = new PowerUp(this.game.scene);
        
        // Override type if specified
        if (forceType) {
            powerUp.type = forceType;
            powerUp.applyTypeProperties();
        }
        
        powerUp.init();
        powerUp.setPosition(spawnPos.x, spawnPos.y, spawnPos.z);
        
        // Add to game
        this.game.powerUps.push(powerUp);
        
        // Update statistics
        this.stats.totalPowerUpsSpawned++;
        this.stats.powerUpsByType[powerUp.getType()] = (this.stats.powerUpsByType[powerUp.getType()] || 0) + 1;
        
        console.log(`⚡ PowerUp spawned: ${powerUp.getType()} at (${spawnPos.x.toFixed(1)}, ${spawnPos.y.toFixed(1)}, ${spawnPos.z.toFixed(1)})`);
        
        // Trigger blockchain event
        if (this.game.somniaConnector) {
            this.game.somniaConnector.emitPowerUpSpawned(powerUp.getType(), spawnPos);
        }
    }

    spawnBonusPowerUp() {
        // Spawn a guaranteed good power-up after wave completion
        const bonusTypes = ['shield', 'damage', 'multiShot'];
        const randomType = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
        
        this.spawnPowerUp(randomType);
        
        console.log(`🎁 Bonus PowerUp spawned: ${randomType}`);
    }

    getEnemySpawnPosition(playerPos) {
        const attempts = 10;
        
        for (let i = 0; i < attempts; i++) {
            // Try to find a valid spawn zone
            const enemyZones = this.spawnZones.filter(zone => zone.type === 'enemy' && zone.active);
            if (enemyZones.length === 0) continue;
            
            const zone = enemyZones[Math.floor(Math.random() * enemyZones.length)];
            
            // Random position within zone
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * zone.radius;
            
            const spawnPos = new THREE.Vector3(
                zone.position.x + Math.cos(angle) * distance,
                zone.position.y + (Math.random() - 0.5) * 5,
                zone.position.z + Math.sin(angle) * distance
            );
            
            // Check minimum distance from player
            const distanceToPlayer = spawnPos.distanceTo(playerPos);
            if (distanceToPlayer >= this.config.enemies.minSpawnDistance) {
                return spawnPos;
            }
        }
        
        // Fallback: spawn at fixed distance from player
        const angle = Math.random() * Math.PI * 2;
        const distance = this.config.enemies.spawnDistance;
        
        return new THREE.Vector3(
            playerPos.x + Math.cos(angle) * distance,
            playerPos.y + Math.random() * 10,
            playerPos.z + Math.sin(angle) * distance
        );
    }

    getPowerUpSpawnPosition(playerPos) {
        const attempts = 10;
        
        for (let i = 0; i < attempts; i++) {
            // Try to find a valid spawn zone
            const powerUpZones = this.spawnZones.filter(zone => zone.type === 'powerUp' && zone.active);
            if (powerUpZones.length === 0) continue;
            
            const zone = powerUpZones[Math.floor(Math.random() * powerUpZones.length)];
            
            // Random position within zone
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * zone.radius;
            
            const spawnPos = new THREE.Vector3(
                zone.position.x + Math.cos(angle) * distance,
                zone.position.y + (Math.random() - 0.5) * 3,
                zone.position.z + Math.sin(angle) * distance
            );
            
            // Check minimum distance from player
            const distanceToPlayer = spawnPos.distanceTo(playerPos);
            if (distanceToPlayer >= this.config.powerUps.minSpawnDistance) {
                return spawnPos;
            }
        }
        
        // Fallback: spawn at fixed distance from player
        const angle = Math.random() * Math.PI * 2;
        const distance = this.config.powerUps.spawnDistance;
        
        return new THREE.Vector3(
            playerPos.x + Math.cos(angle) * distance,
            playerPos.y + Math.random() * 5,
            playerPos.z + Math.sin(angle) * distance
        );
    }

    selectEnemyType() {
        const gameState = this.game.gameState;
        const currentLevel = gameState ? gameState.getLevel() : 1;
        
        // Filter available types based on level
        const availableTypes = Object.entries(this.config.enemies.types)
            .filter(([type, config]) => currentLevel >= config.minLevel);
        
        if (availableTypes.length === 0) {
            return 'scout'; // Fallback
        }
        
        // Weighted random selection
        const totalWeight = availableTypes.reduce((sum, [type, config]) => sum + config.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const [type, config] of availableTypes) {
            random -= config.weight;
            if (random <= 0) {
                return type;
            }
        }
        
        return availableTypes[0][0]; // Fallback
    }

    cleanupEntities() {
        // Remove expired power-ups
        this.game.powerUps = this.game.powerUps.filter(powerUp => {
            if (powerUp.isExpired()) {
                powerUp.destroy();
                return false;
            }
            return true;
        });
        
        // Remove inactive projectiles
        this.game.playerProjectiles = this.game.playerProjectiles.filter(projectile => {
            if (!projectile.isActive()) {
                projectile.destroy();
                return false;
            }
            return true;
        });
        
        this.game.enemyProjectiles = this.game.enemyProjectiles.filter(projectile => {
            if (!projectile.isActive()) {
                projectile.destroy();
                return false;
            }
            return true;
        });
        
        // Remove dead enemies
        this.game.enemies = this.game.enemies.filter(enemy => {
            if (!enemy.isAlive()) {
                // Chance to spawn power-up on enemy death
                if (Math.random() < this.config.powerUps.spawnChance) {
                    const enemyPos = enemy.getPosition();
                    setTimeout(() => {
                        this.spawnPowerUp();
                    }, 500); // Delay spawn slightly
                }
                
                enemy.destroy();
                return false;
            }
            return true;
        });
    }

    updateDifficultyScaling() {
        const gameState = this.game.gameState;
        if (!gameState) return;
        
        const currentLevel = gameState.getLevel();
        const timePlayed = gameState.getGameTime();
        
        // Scale spawn rates based on level and time
        const levelMultiplier = 1 + (currentLevel - 1) * 0.1;
        const timeMultiplier = 1 + Math.floor(timePlayed / 60) * 0.05; // Every minute
        
        this.config.enemies.spawnRate = Math.min(
            2.0 * levelMultiplier * timeMultiplier,
            6.0 // Cap at 6 enemies per second
        );
        
        // Increase max enemy count for higher levels
        this.config.enemies.maxCount = Math.min(
            15 + Math.floor(currentLevel / 2),
            25 // Cap at 25 enemies
        );
        
        // Adjust power-up spawn rate (slightly increase)
        this.config.powerUps.spawnRate = Math.min(
            0.3 + currentLevel * 0.02,
            0.8 // Cap at 0.8 per second
        );
    }

    // Event handlers
    onEnemyKilled(enemy) {
        // Called when an enemy is destroyed
        console.log(`💀 Enemy killed: ${enemy.getType()}`);
        
        // Update wave progress
        // (Enemy removal is handled in cleanupEntities)
    }

    onPowerUpCollected(powerUp) {
        // Called when a power-up is collected
        console.log(`⚡ PowerUp collected: ${powerUp.getType()}`);
        
        // (PowerUp removal is handled in collision system)
    }

    // Configuration methods
    setEnemySpawnRate(rate) {
        this.config.enemies.spawnRate = Math.max(0.1, rate);
        console.log(`🎯 Enemy spawn rate set to ${rate}`);
    }

    setPowerUpSpawnRate(rate) {
        this.config.powerUps.spawnRate = Math.max(0.01, rate);
        console.log(`🎯 PowerUp spawn rate set to ${rate}`);
    }

    setMaxEnemyCount(count) {
        this.config.enemies.maxCount = Math.max(1, count);
        console.log(`🎯 Max enemy count set to ${count}`);
    }

    // Getters
    getWaveInfo() {
        return {
            currentWave: this.waveSystem.currentWave,
            enemiesInWave: this.waveSystem.enemiesInWave,
            enemiesSpawned: this.waveSystem.enemiesSpawnedInWave,
            isActive: this.waveSystem.isWaveActive,
            progress: this.waveSystem.enemiesInWave > 0 ? 
                this.waveSystem.enemiesSpawnedInWave / this.waveSystem.enemiesInWave : 0
        };
    }

    getSpawnStats() {
        return { ...this.stats };
    }

    getSpawnConfig() {
        return { ...this.config };
    }

    // Debug methods
    forceSpawnEnemy(type = null) {
        if (type && this.config.enemies.types[type]) {
            const playerPos = this.game.player ? this.game.player.getPosition() : new THREE.Vector3();
            const spawnPos = this.getEnemySpawnPosition(playerPos);
            
            if (spawnPos) {
                const enemy = new Enemy(this.game.scene, type);
                enemy.init();
                enemy.setPosition(spawnPos.x, spawnPos.y, spawnPos.z);
                
                if (this.game.player) {
                    enemy.setTarget(this.game.player);
                }
                
                this.game.enemies.push(enemy);
                console.log(`🔧 Debug: Forced spawn ${type} enemy`);
            }
        } else {
            this.spawnEnemy();
        }
    }

    forceSpawnPowerUp(type = null) {
        this.spawnPowerUp(type);
        console.log(`🔧 Debug: Forced spawn ${type || 'random'} power-up`);
    }

    reset() {
        // Reset wave system
        this.waveSystem = {
            currentWave: 0,
            enemiesInWave: 0,
            enemiesSpawnedInWave: 0,
            waveDelay: 5.0,
            isWaveActive: false,
            waveStartTime: 0
        };
        
        // Reset timers
        this.timers = {
            enemySpawn: 0,
            powerUpSpawn: 0,
            waveSpawn: 0
        };
        
        // Reset statistics
        this.stats = {
            totalEnemiesSpawned: 0,
            totalPowerUpsSpawned: 0,
            enemiesByType: {},
            powerUpsByType: {},
            wavesCompleted: 0
        };
        
        console.log('🎯 SpawnSystem reset');
    }
}