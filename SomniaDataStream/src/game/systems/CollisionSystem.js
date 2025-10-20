import * as THREE from 'three';

export class CollisionSystem {
    constructor(game) {
        this.game = game;
        
        // Collision groups
        this.collisionGroups = {
            player: [],
            enemies: [],
            playerProjectiles: [],
            enemyProjectiles: [],
            powerUps: [],
            boundaries: []
        };
        
        // Spatial partitioning for optimization
        this.spatialGrid = new Map();
        this.gridSize = 10; // Size of each grid cell
        
        // Collision statistics
        this.stats = {
            checksPerFrame: 0,
            collisionsDetected: 0,
            totalChecks: 0,
            totalCollisions: 0
        };
        
        // Performance optimization
        this.lastUpdateTime = 0;
        this.updateInterval = 16; // ~60fps
        
        console.log('🎯 CollisionSystem initialized');
    }

    update(deltaTime) {
        const now = Date.now();
        
        // Throttle collision checks for performance
        if (now - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        
        this.lastUpdateTime = now;
        this.stats.checksPerFrame = 0;
        
        // Update spatial grid
        this.updateSpatialGrid();
        
        // Check all collision types
        this.checkPlayerCollisions();
        this.checkProjectileCollisions();
        this.checkPowerUpCollisions();
        this.checkBoundaryCollisions();
        
        // Update statistics
        this.updateStatistics();
    }

    updateSpatialGrid() {
        // Clear previous grid
        this.spatialGrid.clear();
        
        // Add all entities to spatial grid
        this.addToSpatialGrid('enemies', this.game.enemies);
        this.addToSpatialGrid('playerProjectiles', this.game.playerProjectiles);
        this.addToSpatialGrid('enemyProjectiles', this.game.enemyProjectiles);
        this.addToSpatialGrid('powerUps', this.game.powerUps);
        
        // Add player to grid
        if (this.game.player) {
            this.addEntityToGrid('player', this.game.player);
        }
    }

    addToSpatialGrid(groupName, entities) {
        entities.forEach(entity => {
            this.addEntityToGrid(groupName, entity);
        });
    }

    addEntityToGrid(groupName, entity) {
        const position = entity.getPosition();
        const gridX = Math.floor(position.x / this.gridSize);
        const gridZ = Math.floor(position.z / this.gridSize);
        const key = `${gridX},${gridZ}`;
        
        if (!this.spatialGrid.has(key)) {
            this.spatialGrid.set(key, {
                player: [],
                enemies: [],
                playerProjectiles: [],
                enemyProjectiles: [],
                powerUps: []
            });
        }
        
        this.spatialGrid.get(key)[groupName].push(entity);
    }

    getEntitiesInRadius(position, radius, excludeGroups = []) {
        const entities = [];
        const gridRadius = Math.ceil(radius / this.gridSize);
        const centerX = Math.floor(position.x / this.gridSize);
        const centerZ = Math.floor(position.z / this.gridSize);
        
        // Check surrounding grid cells
        for (let x = centerX - gridRadius; x <= centerX + gridRadius; x++) {
            for (let z = centerZ - gridRadius; z <= centerZ + gridRadius; z++) {
                const key = `${x},${z}`;
                const cell = this.spatialGrid.get(key);
                
                if (cell) {
                    Object.keys(cell).forEach(groupName => {
                        if (!excludeGroups.includes(groupName)) {
                            entities.push(...cell[groupName]);
                        }
                    });
                }
            }
        }
        
        return entities;
    }

    checkPlayerCollisions() {
        if (!this.game.player || !this.game.player.isAlive()) return;
        
        const playerPos = this.game.player.getPosition();
        const playerRadius = this.game.player.getRadius();
        
        // Check player vs enemies
        this.game.enemies.forEach(enemy => {
            if (this.checkSphereCollision(
                playerPos, playerRadius,
                enemy.getPosition(), enemy.getRadius()
            )) {
                this.handlePlayerEnemyCollision(this.game.player, enemy);
            }
        });
        
        // Check player vs enemy projectiles
        this.game.enemyProjectiles.forEach((projectile, index) => {
            if (projectile.isActive() && this.checkSphereCollision(
                playerPos, playerRadius,
                projectile.getPosition(), projectile.getRadius()
            )) {
                this.handlePlayerProjectileCollision(this.game.player, projectile);
                this.game.enemyProjectiles.splice(index, 1);
            }
        });
    }

    checkProjectileCollisions() {
        // Player projectiles vs enemies
        this.game.playerProjectiles.forEach((projectile, pIndex) => {
            if (!projectile.isActive()) return;
            
            const projectilePos = projectile.getPosition();
            const projectileRadius = projectile.getRadius();
            
            // Check against enemies
            this.game.enemies.forEach((enemy, eIndex) => {
                if (this.checkSphereCollision(
                    projectilePos, projectileRadius,
                    enemy.getPosition(), enemy.getRadius()
                )) {
                    this.handleProjectileEnemyCollision(projectile, enemy);
                    
                    // Remove projectile if it hit
                    if (!projectile.isActive()) {
                        this.game.playerProjectiles.splice(pIndex, 1);
                    }
                    
                    // Remove enemy if destroyed
                    if (!enemy.isAlive()) {
                        this.game.enemies.splice(eIndex, 1);
                    }
                }
            });
        });
        
        // Enemy projectiles vs player projectiles (optional - projectile vs projectile)
        this.checkProjectileVsProjectileCollisions();
    }

    checkProjectileVsProjectileCollisions() {
        this.game.playerProjectiles.forEach((playerProj, pIndex) => {
            if (!playerProj.isActive()) return;
            
            this.game.enemyProjectiles.forEach((enemyProj, eIndex) => {
                if (!enemyProj.isActive()) return;
                
                if (this.checkSphereCollision(
                    playerProj.getPosition(), playerProj.getRadius(),
                    enemyProj.getPosition(), enemyProj.getRadius()
                )) {
                    this.handleProjectileCollision(playerProj, enemyProj);
                    
                    // Remove both projectiles
                    this.game.playerProjectiles.splice(pIndex, 1);
                    this.game.enemyProjectiles.splice(eIndex, 1);
                }
            });
        });
    }

    checkPowerUpCollisions() {
        if (!this.game.player || !this.game.player.isAlive()) return;
        
        const playerPos = this.game.player.getPosition();
        const playerRadius = this.game.player.getRadius();
        
        this.game.powerUps.forEach((powerUp, index) => {
            if (powerUp.isExpired()) return;
            
            if (this.checkSphereCollision(
                playerPos, playerRadius,
                powerUp.getPosition(), powerUp.getRadius()
            )) {
                this.handlePowerUpCollision(this.game.player, powerUp);
                this.game.powerUps.splice(index, 1);
            }
        });
    }

    checkBoundaryCollisions() {
        const boundaries = this.game.getWorldBoundaries();
        
        // Check player boundaries
        if (this.game.player && this.game.player.isAlive()) {
            this.checkEntityBoundaries(this.game.player, boundaries);
        }
        
        // Check enemy boundaries
        this.game.enemies.forEach(enemy => {
            this.checkEntityBoundaries(enemy, boundaries);
        });
        
        // Check projectile boundaries
        this.checkProjectileBoundaries(this.game.playerProjectiles, boundaries);
        this.checkProjectileBoundaries(this.game.enemyProjectiles, boundaries);
    }

    checkEntityBoundaries(entity, boundaries) {
        const position = entity.getPosition();
        const radius = entity.getRadius();
        
        let corrected = false;
        
        // Check X boundaries
        if (position.x - radius < boundaries.minX) {
            position.x = boundaries.minX + radius;
            corrected = true;
        } else if (position.x + radius > boundaries.maxX) {
            position.x = boundaries.maxX - radius;
            corrected = true;
        }
        
        // Check Y boundaries
        if (position.y - radius < boundaries.minY) {
            position.y = boundaries.minY + radius;
            corrected = true;
        } else if (position.y + radius > boundaries.maxY) {
            position.y = boundaries.maxY - radius;
            corrected = true;
        }
        
        // Check Z boundaries
        if (position.z - radius < boundaries.minZ) {
            position.z = boundaries.minZ + radius;
            corrected = true;
        } else if (position.z + radius > boundaries.maxZ) {
            position.z = boundaries.maxZ - radius;
            corrected = true;
        }
        
        if (corrected && entity.setPosition) {
            entity.setPosition(position.x, position.y, position.z);
        }
    }

    checkProjectileBoundaries(projectiles, boundaries) {
        projectiles.forEach((projectile, index) => {
            const position = projectile.getPosition();
            
            if (position.x < boundaries.minX || position.x > boundaries.maxX ||
                position.y < boundaries.minY || position.y > boundaries.maxY ||
                position.z < boundaries.minZ || position.z > boundaries.maxZ) {
                
                projectile.destroy();
                projectiles.splice(index, 1);
            }
        });
    }

    // Collision detection methods
    checkSphereCollision(pos1, radius1, pos2, radius2) {
        this.stats.checksPerFrame++;
        this.stats.totalChecks++;
        
        const distance = pos1.distanceTo(pos2);
        const collision = distance <= (radius1 + radius2);
        
        if (collision) {
            this.stats.collisionsDetected++;
            this.stats.totalCollisions++;
        }
        
        return collision;
    }

    checkBoxCollision(pos1, size1, pos2, size2) {
        this.stats.checksPerFrame++;
        this.stats.totalChecks++;
        
        const collision = (
            Math.abs(pos1.x - pos2.x) <= (size1.x + size2.x) / 2 &&
            Math.abs(pos1.y - pos2.y) <= (size1.y + size2.y) / 2 &&
            Math.abs(pos1.z - pos2.z) <= (size1.z + size2.z) / 2
        );
        
        if (collision) {
            this.stats.collisionsDetected++;
            this.stats.totalCollisions++;
        }
        
        return collision;
    }

    checkRayCollision(origin, direction, target, targetRadius) {
        this.stats.checksPerFrame++;
        this.stats.totalChecks++;
        
        // Ray-sphere intersection
        const oc = origin.clone().sub(target);
        const a = direction.dot(direction);
        const b = 2.0 * oc.dot(direction);
        const c = oc.dot(oc) - targetRadius * targetRadius;
        const discriminant = b * b - 4 * a * c;
        
        const collision = discriminant >= 0;
        
        if (collision) {
            this.stats.collisionsDetected++;
            this.stats.totalCollisions++;
        }
        
        return collision;
    }

    // Collision handlers
    handlePlayerEnemyCollision(player, enemy) {
        console.log('💥 Player-Enemy collision');
        
        // Calculate collision force
        const direction = player.getPosition().clone().sub(enemy.getPosition()).normalize();
        const force = 10;
        
        // Apply damage to player
        player.takeDamage(enemy.getCollisionDamage());
        
        // Apply knockback to player
        if (player.applyKnockback) {
            player.applyKnockback(direction, force);
        }
        
        // Apply damage to enemy (collision damage)
        enemy.takeDamage(player.getCollisionDamage());
        
        // Create collision effect
        this.createCollisionEffect(player.getPosition(), enemy.getPosition());
        
        // Trigger blockchain event
        if (this.game.somniaConnector) {
            this.game.somniaConnector.emitPlayerDamaged(player.getHealth());
        }
    }

    handlePlayerProjectileCollision(player, projectile) {
        console.log('💥 Player-Projectile collision');
        
        // Apply projectile damage
        player.takeDamage(projectile.getDamage());
        
        // Trigger projectile hit effect
        projectile.onHit(player);
        
        // Create hit effect
        this.createHitEffect(projectile.getPosition(), projectile.getType());
        
        // Trigger blockchain event
        if (this.game.somniaConnector) {
            this.game.somniaConnector.emitPlayerDamaged(player.getHealth());
        }
    }

    handleProjectileEnemyCollision(projectile, enemy) {
        console.log('💥 Projectile-Enemy collision');
        
        // Apply projectile damage
        enemy.takeDamage(projectile.getDamage());
        
        // Trigger projectile hit effect
        projectile.onHit(enemy);
        
        // Create hit effect
        this.createHitEffect(projectile.getPosition(), projectile.getType());
        
        // Update game stats
        if (this.game.gameState) {
            this.game.gameState.addHit();
            
            // Check if enemy was destroyed
            if (!enemy.isAlive()) {
                this.game.gameState.addEnemyKilled();
                this.game.gameState.addScore(enemy.getScoreValue());
                
                // Trigger blockchain event
                if (this.game.somniaConnector) {
                    this.game.somniaConnector.emitEnemyDestroyed(
                        enemy.getType(),
                        enemy.getScoreValue()
                    );
                }
            }
        }
    }

    handleProjectileCollision(projectile1, projectile2) {
        console.log('💥 Projectile-Projectile collision');
        
        // Trigger hit effects for both projectiles
        projectile1.onHit();
        projectile2.onHit();
        
        // Create collision effect
        this.createCollisionEffect(projectile1.getPosition(), projectile2.getPosition());
        
        // Update accuracy stats (defensive shot)
        if (this.game.gameState) {
            this.game.gameState.addDefensiveShot();
        }
    }

    handlePowerUpCollision(player, powerUp) {
        console.log(`⚡ PowerUp collision: ${powerUp.getType()}`);
        
        // Apply power-up effect
        powerUp.applyEffect(player);
        
        // Create collection effect
        this.createPowerUpEffect(powerUp.getPosition(), powerUp.getType());
        
        // Update game stats
        if (this.game.gameState) {
            this.game.gameState.addPowerUpCollected();
        }
        
        // Trigger blockchain event
        if (this.game.somniaConnector) {
            this.game.somniaConnector.emitPowerUpCollected(powerUp.getType());
        }
    }

    // Visual effects
    createCollisionEffect(pos1, pos2) {
        const midpoint = pos1.clone().add(pos2).multiplyScalar(0.5);
        
        // Create explosion effect
        const geometry = new THREE.SphereGeometry(1);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.8
        });
        
        const explosion = new THREE.Mesh(geometry, material);
        explosion.position.copy(midpoint);
        this.game.scene.add(explosion);
        
        // Animate explosion
        const startTime = Date.now();
        const duration = 300;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                this.game.scene.remove(explosion);
                return;
            }
            
            const scale = 1 + progress * 2;
            explosion.scale.setScalar(scale);
            explosion.material.opacity = 0.8 * (1 - progress);
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    createHitEffect(position, projectileType) {
        const color = projectileType === 'player' ? 0x00ff88 : 0xff4400;
        
        // Create hit spark
        const geometry = new THREE.SphereGeometry(0.3);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1.0
        });
        
        const spark = new THREE.Mesh(geometry, material);
        spark.position.copy(position);
        this.game.scene.add(spark);
        
        // Animate spark
        const startTime = Date.now();
        const duration = 150;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                this.game.scene.remove(spark);
                return;
            }
            
            spark.material.opacity = 1 - progress;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    createPowerUpEffect(position, powerUpType) {
        // Create collection burst based on power-up type
        const colors = {
            health: 0x00ff00,
            shield: 0x00ffff,
            rapidFire: 0xff4400,
            energyBoost: 0xffff00,
            damage: 0xff0044,
            multiShot: 0x8844ff
        };
        
        const color = colors[powerUpType] || 0xffffff;
        
        // Create burst effect
        const geometry = new THREE.SphereGeometry(2);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6
        });
        
        const burst = new THREE.Mesh(geometry, material);
        burst.position.copy(position);
        this.game.scene.add(burst);
        
        // Animate burst
        const startTime = Date.now();
        const duration = 400;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                this.game.scene.remove(burst);
                return;
            }
            
            const scale = 1 + progress * 3;
            burst.scale.setScalar(scale);
            burst.material.opacity = 0.6 * (1 - progress);
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    updateStatistics() {
        // Reset per-frame stats
        this.stats.checksPerFrame = 0;
        this.stats.collisionsDetected = 0;
    }

    // Utility methods
    getCollisionStats() {
        return { ...this.stats };
    }

    getOptimizationInfo() {
        return {
            gridSize: this.gridSize,
            gridCells: this.spatialGrid.size,
            updateInterval: this.updateInterval
        };
    }

    // Configuration
    setGridSize(size) {
        this.gridSize = size;
        console.log(`🎯 CollisionSystem grid size set to ${size}`);
    }

    setUpdateInterval(interval) {
        this.updateInterval = interval;
        console.log(`🎯 CollisionSystem update interval set to ${interval}ms`);
    }

    // Debug methods
    debugDrawGrid() {
        // Draw spatial grid for debugging (optional)
        this.spatialGrid.forEach((cell, key) => {
            const [x, z] = key.split(',').map(Number);
            const position = new THREE.Vector3(
                x * this.gridSize + this.gridSize / 2,
                0,
                z * this.gridSize + this.gridSize / 2
            );
            
            // Create debug cube
            const geometry = new THREE.BoxGeometry(this.gridSize, 0.1, this.gridSize);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.1,
                wireframe: true
            });
            
            const cube = new THREE.Mesh(geometry, material);
            cube.position.copy(position);
            this.game.scene.add(cube);
        });
    }

    reset() {
        // Clear all collision groups
        Object.keys(this.collisionGroups).forEach(key => {
            this.collisionGroups[key] = [];
        });
        
        // Clear spatial grid
        this.spatialGrid.clear();
        
        // Reset statistics
        this.stats = {
            checksPerFrame: 0,
            collisionsDetected: 0,
            totalChecks: 0,
            totalCollisions: 0
        };
        
        console.log('🎯 CollisionSystem reset');
    }
}