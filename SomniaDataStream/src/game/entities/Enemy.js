import * as THREE from 'three';

export class Enemy {
    constructor(scene) {
        this.scene = scene;
        
        // Enemy properties
        this.health = 50;
        this.maxHealth = 50;
        this.speed = 8;
        this.damage = 15;
        this.radius = 1.2;
        this.attackRange = 20;
        this.detectionRange = 30;
        
        // Position and movement
        this.position = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        this.velocity = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
        
        // AI state
        this.state = 'patrol'; // patrol, chase, attack, dead
        this.target = null;
        this.lastAttackTime = 0;
        this.attackCooldown = 2; // seconds
        this.patrolCenter = new THREE.Vector3();
        this.patrolRadius = 15;
        this.patrolAngle = Math.random() * Math.PI * 2;
        
        // 3D objects
        this.mesh = null;
        this.weaponMesh = null;
        this.healthBar = null;
        
        // Visual effects
        this.trailPoints = [];
        this.maxTrailPoints = 10;
        this.isDead = false;
        this.deathTime = 0;
        
        // Enemy type
        this.type = this.selectRandomType();
        this.applyTypeProperties();
        
        console.log(`👾 Enemy created: ${this.type}`);
    }

    selectRandomType() {
        const types = ['scout', 'fighter', 'heavy', 'bomber'];
        return types[Math.floor(Math.random() * types.length)];
    }

    applyTypeProperties() {
        switch (this.type) {
            case 'scout':
                this.health = 30;
                this.maxHealth = 30;
                this.speed = 12;
                this.damage = 10;
                this.radius = 0.8;
                this.color = 0xff4444;
                break;
                
            case 'fighter':
                this.health = 50;
                this.maxHealth = 50;
                this.speed = 8;
                this.damage = 15;
                this.radius = 1.2;
                this.color = 0x44ff44;
                break;
                
            case 'heavy':
                this.health = 100;
                this.maxHealth = 100;
                this.speed = 5;
                this.damage = 25;
                this.radius = 1.8;
                this.color = 0x4444ff;
                break;
                
            case 'bomber':
                this.health = 75;
                this.maxHealth = 75;
                this.speed = 6;
                this.damage = 30;
                this.radius = 1.5;
                this.attackRange = 25;
                this.color = 0xff44ff;
                break;
        }
    }

    init() {
        this.createEnemyMesh();
        this.createWeaponMesh();
        this.createHealthBar();
        this.setRandomPatrolCenter();
        
        console.log(`✅ Enemy ${this.type} initialized`);
    }

    createEnemyMesh() {
        // Create different geometries based on type
        let geometry;
        
        switch (this.type) {
            case 'scout':
                geometry = new THREE.TetrahedronGeometry(this.radius);
                break;
            case 'fighter':
                geometry = new THREE.OctahedronGeometry(this.radius);
                break;
            case 'heavy':
                geometry = new THREE.BoxGeometry(this.radius * 2, this.radius, this.radius * 2);
                break;
            case 'bomber':
                geometry = new THREE.SphereGeometry(this.radius, 8, 6);
                break;
            default:
                geometry = new THREE.OctahedronGeometry(this.radius);
        }
        
        const material = new THREE.MeshLambertMaterial({
            color: this.color,
            emissive: new THREE.Color(this.color).multiplyScalar(0.2)
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add glow effect
        const glowGeometry = geometry.clone();
        glowGeometry.scale(1.2, 1.2, 1.2);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.2
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(glowMesh);
        
        // Add detail elements based on type
        this.addTypeSpecificDetails();
        
        this.scene.add(this.mesh);
    }

    addTypeSpecificDetails() {
        switch (this.type) {
            case 'scout':
                // Add antenna
                const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 4);
                const antennaMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
                const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
                antenna.position.y = this.radius + 0.5;
                this.mesh.add(antenna);
                break;
                
            case 'heavy':
                // Add armor plates
                const plateGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.3);
                const plateMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
                
                for (let i = 0; i < 4; i++) {
                    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
                    const angle = (i / 4) * Math.PI * 2;
                    plate.position.x = Math.cos(angle) * this.radius * 0.8;
                    plate.position.z = Math.sin(angle) * this.radius * 0.8;
                    this.mesh.add(plate);
                }
                break;
                
            case 'bomber':
                // Add bomb bay
                const bayGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 6);
                const bayMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
                const bay = new THREE.Mesh(bayGeometry, bayMaterial);
                bay.position.y = -this.radius * 0.5;
                this.mesh.add(bay);
                break;
        }
    }

    createWeaponMesh() {
        // Create weapon based on type
        let weaponGeometry;
        
        switch (this.type) {
            case 'scout':
                weaponGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 4);
                break;
            case 'bomber':
                weaponGeometry = new THREE.SphereGeometry(0.2, 6, 4);
                break;
            default:
                weaponGeometry = new THREE.BoxGeometry(0.1, 0.6, 0.1);
        }
        
        const weaponMaterial = new THREE.MeshLambertMaterial({
            color: 0x888888
        });
        
        this.weaponMesh = new THREE.Mesh(weaponGeometry, weaponMaterial);
        this.weaponMesh.position.set(0, this.radius + 0.3, 0);
        this.mesh.add(this.weaponMesh);
    }

    createHealthBar() {
        // Create health bar above enemy
        const barWidth = 2;
        const barHeight = 0.2;
        
        // Background
        const bgGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
        const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const background = new THREE.Mesh(bgGeometry, bgMaterial);
        
        // Health bar
        const healthGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
        const healthMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const healthBar = new THREE.Mesh(healthGeometry, healthMaterial);
        
        // Group them
        this.healthBar = new THREE.Group();
        this.healthBar.add(background);
        this.healthBar.add(healthBar);
        this.healthBar.position.y = this.radius + 1;
        
        // Make health bar always face camera
        this.healthBar.userData = { healthMesh: healthBar, maxWidth: barWidth };
        
        this.mesh.add(this.healthBar);
    }

    setRandomPatrolCenter() {
        // Set patrol center within arena bounds
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 30;
        
        this.patrolCenter.set(
            Math.cos(angle) * distance,
            Math.random() * 5 + 3,
            Math.sin(angle) * distance
        );
    }

    update(deltaTime, player) {
        if (this.isDead) {
            this.updateDeath(deltaTime);
            return;
        }
        
        // Update AI
        this.updateAI(deltaTime, player);
        
        // Update movement
        this.updateMovement(deltaTime);
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Update mesh position
        this.updateMeshPosition();
        
        // Update health bar
        this.updateHealthBar();
    }

    updateAI(deltaTime, player) {
        if (!player) {
            this.state = 'patrol';
            return;
        }
        
        const playerPos = player.getPosition();
        const distanceToPlayer = this.position.distanceTo(playerPos);
        
        // State machine
        switch (this.state) {
            case 'patrol':
                this.patrol(deltaTime);
                
                // Check if player is in detection range
                if (distanceToPlayer <= this.detectionRange) {
                    this.state = 'chase';
                    this.target = player;
                    console.log(`👾 ${this.type} detected player!`);
                }
                break;
                
            case 'chase':
                this.chase(deltaTime, playerPos);
                
                // Check if player is in attack range
                if (distanceToPlayer <= this.attackRange) {
                    this.state = 'attack';
                }
                
                // Check if player escaped
                if (distanceToPlayer > this.detectionRange * 1.5) {
                    this.state = 'patrol';
                    this.target = null;
                }
                break;
                
            case 'attack':
                this.attack(deltaTime, player);
                
                // Check if player moved out of attack range
                if (distanceToPlayer > this.attackRange) {
                    this.state = 'chase';
                }
                break;
        }
    }

    patrol(deltaTime) {
        // Simple patrol behavior - circle around patrol center
        this.patrolAngle += deltaTime * 0.5;
        
        this.targetPosition.set(
            this.patrolCenter.x + Math.cos(this.patrolAngle) * this.patrolRadius,
            this.patrolCenter.y,
            this.patrolCenter.z + Math.sin(this.patrolAngle) * this.patrolRadius
        );
    }

    chase(deltaTime, playerPos) {
        // Move towards player with some prediction
        const direction = playerPos.clone().sub(this.position);
        direction.normalize();
        
        // Add some randomness to make movement less predictable
        direction.x += (Math.random() - 0.5) * 0.2;
        direction.z += (Math.random() - 0.5) * 0.2;
        direction.normalize();
        
        this.targetPosition.copy(this.position).add(direction.multiplyScalar(this.speed));
    }

    attack(deltaTime, player) {
        const currentTime = Date.now() / 1000;
        
        // Face the player
        const playerPos = player.getPosition();
        const direction = playerPos.clone().sub(this.position);
        this.rotation.y = Math.atan2(direction.x, direction.z);
        
        // Attack if cooldown is ready
        if (currentTime - this.lastAttackTime >= this.attackCooldown) {
            this.performAttack(player);
            this.lastAttackTime = currentTime;
        }
        
        // Move slightly to maintain distance
        if (this.position.distanceTo(playerPos) < this.attackRange * 0.7) {
            // Move away
            direction.normalize().multiplyScalar(-this.speed * 0.5);
            this.targetPosition.copy(this.position).add(direction);
        }
    }

    performAttack(player) {
        // Different attack patterns based on type
        switch (this.type) {
            case 'scout':
                this.rapidFireAttack(player);
                break;
            case 'fighter':
                this.standardAttack(player);
                break;
            case 'heavy':
                this.heavyAttack(player);
                break;
            case 'bomber':
                this.bombAttack(player);
                break;
        }
    }

    rapidFireAttack(player) {
        // Scout fires multiple quick shots
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.fireProjectile(player);
            }, i * 100);
        }
    }

    standardAttack(player) {
        // Fighter fires a single accurate shot
        this.fireProjectile(player);
    }

    heavyAttack(player) {
        // Heavy fires a powerful shot with splash damage
        this.fireProjectile(player, 2); // Double damage
    }

    bombAttack(player) {
        // Bomber drops an explosive
        this.dropBomb(player);
    }

    fireProjectile(player, damageMultiplier = 1) {
        const playerPos = player.getPosition();
        const direction = playerPos.clone().sub(this.position);
        direction.normalize();
        
        // Create projectile effect
        this.createProjectileEffect(direction);
        
        // Check if projectile would hit player (simplified)
        const distance = this.position.distanceTo(playerPos);
        const travelTime = distance / 30; // Projectile speed
        
        setTimeout(() => {
            // Check if player is still in roughly the same position
            const currentPlayerPos = player.getPosition();
            const predictedPos = playerPos.clone().add(
                currentPlayerPos.clone().sub(playerPos).multiplyScalar(travelTime)
            );
            
            if (this.position.distanceTo(predictedPos) <= this.attackRange) {
                const damage = this.damage * damageMultiplier;
                const hit = player.takeDamage(damage);
                
                if (hit) {
                    console.log(`💥 ${this.type} hit player for ${damage} damage!`);
                }
            }
        }, travelTime * 1000);
    }

    dropBomb(player) {
        // Create bomb effect at player's position
        const playerPos = player.getPosition();
        
        setTimeout(() => {
            // Explosion effect
            this.createExplosionEffect(playerPos);
            
            // Check if player is in blast radius
            const currentPlayerPos = player.getPosition();
            const blastRadius = 5;
            
            if (currentPlayerPos.distanceTo(playerPos) <= blastRadius) {
                const damage = this.damage;
                player.takeDamage(damage);
                console.log(`💣 ${this.type} bombed player for ${damage} damage!`);
            }
        }, 1000); // 1 second delay
    }

    createProjectileEffect(direction) {
        // Create visual projectile
        const geometry = new THREE.SphereGeometry(0.1);
        const material = new THREE.MeshBasicMaterial({ 
            color: this.color,
            emissive: this.color
        });
        const projectile = new THREE.Mesh(geometry, material);
        
        projectile.position.copy(this.position);
        this.scene.add(projectile);
        
        // Animate projectile
        const speed = 30;
        const startTime = Date.now();
        
        const animateProjectile = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const distance = speed * elapsed;
            
            projectile.position.copy(this.position).add(
                direction.clone().multiplyScalar(distance)
            );
            
            // Remove after traveling max range
            if (distance >= this.attackRange) {
                this.scene.remove(projectile);
                return;
            }
            
            requestAnimationFrame(animateProjectile);
        };
        
        animateProjectile();
    }

    createExplosionEffect(position) {
        // Create explosion visual effect
        const geometry = new THREE.SphereGeometry(1);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.8
        });
        const explosion = new THREE.Mesh(geometry, material);
        
        explosion.position.copy(position);
        this.scene.add(explosion);
        
        // Animate explosion
        const startTime = Date.now();
        const duration = 500; // ms
        
        const animateExplosion = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                this.scene.remove(explosion);
                return;
            }
            
            // Scale up and fade out
            const scale = 1 + progress * 4;
            explosion.scale.setScalar(scale);
            explosion.material.opacity = 0.8 * (1 - progress);
            
            requestAnimationFrame(animateExplosion);
        };
        
        animateExplosion();
    }

    updateMovement(deltaTime) {
        // Move towards target position
        const direction = this.targetPosition.clone().sub(this.position);
        const distance = direction.length();
        
        if (distance > 0.1) {
            direction.normalize();
            const moveDistance = Math.min(this.speed * deltaTime, distance);
            this.position.add(direction.multiplyScalar(moveDistance));
        }
        
        // Update rotation to face movement direction
        if (direction.length() > 0.1) {
            this.rotation.y = Math.atan2(direction.x, direction.z);
        }
        
        // Constrain to world bounds
        this.constrainToWorldBounds();
    }

    updateVisualEffects(deltaTime) {
        // Rotate mesh for visual interest
        if (this.mesh) {
            this.mesh.rotation.y += deltaTime * 0.5;
            
            // Weapon rotation
            if (this.weaponMesh) {
                this.weaponMesh.rotation.z += deltaTime * 2;
            }
        }
        
        // Update trail
        this.updateTrail();
    }

    updateTrail() {
        // Add current position to trail
        this.trailPoints.push(this.position.clone());
        
        // Limit trail length
        if (this.trailPoints.length > this.maxTrailPoints) {
            this.trailPoints.shift();
        }
    }

    updateMeshPosition() {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.rotation.y;
        }
    }

    updateHealthBar() {
        if (!this.healthBar) return;
        
        // Update health bar scale
        const healthMesh = this.healthBar.userData.healthMesh;
        const maxWidth = this.healthBar.userData.maxWidth;
        const healthPercent = this.health / this.maxHealth;
        
        healthMesh.scale.x = healthPercent;
        healthMesh.position.x = (healthPercent - 1) * maxWidth * 0.5;
        
        // Update color based on health
        if (healthPercent > 0.6) {
            healthMesh.material.color.setHex(0x00ff00);
        } else if (healthPercent > 0.3) {
            healthMesh.material.color.setHex(0xffff00);
        } else {
            healthMesh.material.color.setHex(0xff0000);
        }
        
        // Make health bar face camera (simplified)
        this.healthBar.lookAt(this.position.x, this.position.y + 10, this.position.z + 10);
    }

    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
        
        // Visual feedback
        this.flashDamage();
        
        if (this.health <= 0) {
            this.die();
        }
        
        console.log(`💔 ${this.type} took ${damage} damage. Health: ${this.health}`);
        
        return this.health <= 0;
    }

    flashDamage() {
        if (this.mesh) {
            const originalColor = this.mesh.material.color.clone();
            this.mesh.material.color.setHex(0xffffff);
            
            setTimeout(() => {
                if (this.mesh) {
                    this.mesh.material.color.copy(originalColor);
                }
            }, 100);
        }
    }

    die() {
        this.isDead = true;
        this.deathTime = Date.now();
        this.state = 'dead';
        
        // Death animation
        if (this.mesh) {
            // Start spinning and fading
            this.mesh.material.transparent = true;
        }
        
        console.log(`💀 ${this.type} destroyed!`);
    }

    updateDeath(deltaTime) {
        const elapsed = (Date.now() - this.deathTime) / 1000;
        
        if (this.mesh) {
            // Spin faster and fade out
            this.mesh.rotation.x += deltaTime * 5;
            this.mesh.rotation.z += deltaTime * 3;
            this.mesh.material.opacity = Math.max(0, 1 - elapsed * 2);
            
            // Scale down
            const scale = Math.max(0, 1 - elapsed);
            this.mesh.scale.setScalar(scale);
        }
    }

    constrainToWorldBounds() {
        const worldSize = 50;
        
        this.position.x = THREE.MathUtils.clamp(this.position.x, -worldSize, worldSize);
        this.position.z = THREE.MathUtils.clamp(this.position.z, -worldSize, worldSize);
        this.position.y = Math.max(1, Math.min(20, this.position.y));
    }

    // Getters
    getPosition() {
        return this.position.clone();
    }

    getRadius() {
        return this.radius;
    }

    isDead() {
        return this.isDead && this.mesh && this.mesh.material.opacity <= 0;
    }

    // Setters
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.updateMeshPosition();
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        
        console.log(`💥 ${this.type} enemy destroyed`);
    }
}