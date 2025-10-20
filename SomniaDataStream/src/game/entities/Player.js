import * as THREE from 'three';

export class Player {
    constructor(scene, somniaConnector) {
        this.scene = scene;
        this.somniaConnector = somniaConnector;
        
        // Player properties
        this.health = 100;
        this.maxHealth = 100;
        this.energy = 100;
        this.maxEnergy = 100;
        this.speed = 15;
        this.rotationSpeed = 3;
        this.radius = 1;
        
        // Position and rotation
        this.position = new THREE.Vector3(0, 2, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        // 3D objects
        this.mesh = null;
        this.weaponMesh = null;
        this.thrusterParticles = [];
        
        // Weapon system
        this.weapon = {
            damage: 25,
            fireRate: 0.2, // seconds between shots
            lastFireTime: 0,
            range: 50,
            energyCost: 5
        };
        
        // Movement state
        this.isMoving = false;
        this.isRunning = false;
        this.lastPosition = new THREE.Vector3();
        
        // Power-ups
        this.powerUps = {
            shield: { active: false, duration: 0 },
            rapidFire: { active: false, duration: 0 },
            energyBoost: { active: false, duration: 0 },
            damage: { active: false, duration: 0, multiplier: 1 }
        };
        
        // Visual effects
        this.shieldMesh = null;
        this.trailPoints = [];
        this.maxTrailPoints = 20;
        
        console.log('👤 Player initialized');
    }

    async init() {
        this.createPlayerMesh();
        this.createWeaponMesh();
        this.createShieldMesh();
        this.createThrusterEffects();
        
        // Set initial position
        this.updateMeshPosition();
        
        console.log('✅ Player entity created');
    }

    createPlayerMesh() {
        // Create player ship geometry
        const geometry = new THREE.ConeGeometry(0.8, 2.5, 8);
        const material = new THREE.MeshLambertMaterial({
            color: 0x00aaff,
            emissive: 0x002244
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Rotate to point forward
        this.mesh.rotation.x = Math.PI / 2;
        
        // Add glow effect
        const glowGeometry = new THREE.ConeGeometry(1.0, 2.7, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.3
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.rotation.x = Math.PI / 2;
        this.mesh.add(glowMesh);
        
        // Add detail elements
        this.addPlayerDetails();
        
        this.scene.add(this.mesh);
    }

    addPlayerDetails() {
        // Engine exhausts
        const exhaustGeometry = new THREE.CylinderGeometry(0.1, 0.2, 0.5, 6);
        const exhaustMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            emissive: 0xff2200
        });
        
        const positions = [
            { x: -0.4, y: -1, z: 0 },
            { x: 0.4, y: -1, z: 0 }
        ];
        
        positions.forEach(pos => {
            const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
            exhaust.position.set(pos.x, pos.y, pos.z);
            this.mesh.add(exhaust);
        });
        
        // Cockpit
        const cockpitGeometry = new THREE.SphereGeometry(0.3, 8, 6);
        const cockpitMaterial = new THREE.MeshLambertMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.8
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, 0.5, 0);
        this.mesh.add(cockpit);
    }

    createWeaponMesh() {
        // Create weapon attachment
        const weaponGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
        const weaponMaterial = new THREE.MeshLambertMaterial({
            color: 0x666666
        });
        
        this.weaponMesh = new THREE.Mesh(weaponGeometry, weaponMaterial);
        this.weaponMesh.position.set(0, 1, 0);
        this.mesh.add(this.weaponMesh);
    }

    createShieldMesh() {
        // Create shield effect (initially hidden)
        const shieldGeometry = new THREE.SphereGeometry(2, 16, 12);
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });
        
        this.shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
        this.shieldMesh.visible = false;
        this.mesh.add(this.shieldMesh);
    }

    createThrusterEffects() {
        // Create thruster particle systems
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            colors[i * 3] = 1;     // R
            colors[i * 3 + 1] = 0.5; // G
            colors[i * 3 + 2] = 0;   // B
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.visible = false;
        this.mesh.add(particles);
        
        this.thrusterParticles = particles;
    }

    update(deltaTime, inputManager) {
        // Store last position for distance calculation
        this.lastPosition.copy(this.position);
        
        // Update power-ups
        this.updatePowerUps(deltaTime);
        
        // Handle input
        this.handleMovement(deltaTime, inputManager);
        this.handleRotation(deltaTime, inputManager);
        this.handleActions(deltaTime, inputManager);
        
        // Update energy regeneration
        this.updateEnergy(deltaTime);
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Update mesh position
        this.updateMeshPosition();
        
        // Calculate distance traveled
        const distance = this.position.distanceTo(this.lastPosition);
        if (window.gameState) {
            window.gameState.addDistanceTraveled(distance);
        }
    }

    handleMovement(deltaTime, inputManager) {
        const movement = inputManager.getMovementVector();
        this.isMoving = movement.x !== 0 || movement.z !== 0;
        this.isRunning = inputManager.isRunPressed();
        
        if (this.isMoving) {
            // Calculate movement speed
            let currentSpeed = this.speed;
            if (this.isRunning && this.energy > 0) {
                currentSpeed *= 1.5;
                this.energy = Math.max(0, this.energy - 30 * deltaTime);
            }
            
            // Apply movement
            const moveVector = new THREE.Vector3(movement.x, 0, movement.z);
            moveVector.normalize();
            moveVector.multiplyScalar(currentSpeed * deltaTime);
            
            // Apply rotation to movement vector
            moveVector.applyEuler(this.rotation);
            
            this.position.add(moveVector);
            
            // Constrain to world bounds
            this.constrainToWorldBounds();
            
            // Show thruster effects
            this.thrusterParticles.visible = true;
        } else {
            // Hide thruster effects
            this.thrusterParticles.visible = false;
        }
    }

    handleRotation(deltaTime, inputManager) {
        const rotation = inputManager.getRotationInput();
        
        if (rotation.y !== 0) {
            this.rotation.y -= rotation.y * this.rotationSpeed * deltaTime;
        }
        
        // Optional: Add pitch control
        if (rotation.x !== 0) {
            this.rotation.x = THREE.MathUtils.clamp(
                this.rotation.x - rotation.x * this.rotationSpeed * deltaTime,
                -Math.PI / 4,
                Math.PI / 4
            );
        }
    }

    handleActions(deltaTime, inputManager) {
        // Handle firing
        if (inputManager.isFirePressed()) {
            this.fire();
        }
        
        // Handle other actions
        if (inputManager.isReloadPressed()) {
            this.reload();
        }
    }

    fire() {
        const currentTime = Date.now() / 1000;
        
        // Check fire rate and energy
        if (currentTime - this.weapon.lastFireTime < this.getFireRate() || 
            this.energy < this.weapon.energyCost) {
            return false;
        }
        
        // Consume energy
        this.energy = Math.max(0, this.energy - this.weapon.energyCost);
        
        // Update fire time
        this.weapon.lastFireTime = currentTime;
        
        // Calculate projectile spawn position and direction
        const spawnPos = this.position.clone();
        spawnPos.y += 1;
        
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyEuler(this.rotation);
        
        // Create projectile data
        const projectileData = {
            position: spawnPos,
            direction: direction,
            damage: this.getWeaponDamage(),
            speed: 50,
            range: this.weapon.range
        };
        
        // Notify blockchain
        this.somniaConnector.fireWeapon(
            spawnPos.x, spawnPos.y, spawnPos.z,
            direction.x, direction.y, direction.z,
            projectileData.damage
        );
        
        // Update stats
        if (window.gameState) {
            window.gameState.addShotFired();
        }
        
        console.log('🔫 Player fired weapon');
        return true;
    }

    reload() {
        // Simple reload - restore some energy
        this.energy = Math.min(this.maxEnergy, this.energy + 20);
        console.log('🔄 Player reloaded');
    }

    takeDamage(damage) {
        // Check shield
        if (this.powerUps.shield.active) {
            damage *= 0.5; // Shield reduces damage
        }
        
        this.health = Math.max(0, this.health - damage);
        
        // Update stats
        if (window.gameState) {
            window.gameState.addDamageTaken(damage);
        }
        
        // Visual feedback
        this.flashDamage();
        
        console.log(`💔 Player took ${damage} damage. Health: ${this.health}`);
        
        return this.health <= 0;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        console.log(`💚 Player healed ${amount}. Health: ${this.health}`);
    }

    restoreEnergy(amount) {
        this.energy = Math.min(this.maxEnergy, this.energy + amount);
        console.log(`⚡ Player restored ${amount} energy. Energy: ${this.energy}`);
    }

    applyPowerUp(type, duration = 10) {
        switch (type) {
            case 'shield':
                this.powerUps.shield.active = true;
                this.powerUps.shield.duration = duration;
                this.shieldMesh.visible = true;
                break;
                
            case 'rapidFire':
                this.powerUps.rapidFire.active = true;
                this.powerUps.rapidFire.duration = duration;
                break;
                
            case 'energyBoost':
                this.powerUps.energyBoost.active = true;
                this.powerUps.energyBoost.duration = duration;
                this.maxEnergy = 150;
                this.energy = this.maxEnergy;
                break;
                
            case 'damage':
                this.powerUps.damage.active = true;
                this.powerUps.damage.duration = duration;
                this.powerUps.damage.multiplier = 2;
                break;
                
            case 'health':
                this.heal(50);
                break;
        }
        
        console.log(`⚡ Power-up applied: ${type}`);
    }

    updatePowerUps(deltaTime) {
        Object.keys(this.powerUps).forEach(type => {
            const powerUp = this.powerUps[type];
            
            if (powerUp.active && powerUp.duration !== undefined) {
                powerUp.duration -= deltaTime;
                
                if (powerUp.duration <= 0) {
                    this.removePowerUp(type);
                }
            }
        });
    }

    removePowerUp(type) {
        const powerUp = this.powerUps[type];
        powerUp.active = false;
        powerUp.duration = 0;
        
        switch (type) {
            case 'shield':
                this.shieldMesh.visible = false;
                break;
                
            case 'energyBoost':
                this.maxEnergy = 100;
                this.energy = Math.min(this.energy, this.maxEnergy);
                break;
                
            case 'damage':
                powerUp.multiplier = 1;
                break;
        }
        
        console.log(`⚡ Power-up expired: ${type}`);
    }

    updateEnergy(deltaTime) {
        if (!this.isRunning && this.energy < this.maxEnergy) {
            const regenRate = this.powerUps.energyBoost.active ? 40 : 20;
            this.energy = Math.min(this.maxEnergy, this.energy + regenRate * deltaTime);
        }
    }

    updateVisualEffects(deltaTime) {
        // Update shield animation
        if (this.shieldMesh.visible) {
            this.shieldMesh.rotation.y += deltaTime;
            this.shieldMesh.rotation.x += deltaTime * 0.5;
        }
        
        // Update thruster particles
        if (this.thrusterParticles.visible) {
            this.updateThrusterParticles(deltaTime);
        }
        
        // Update trail effect
        this.updateTrail();
    }

    updateThrusterParticles(deltaTime) {
        // Simple particle animation
        const positions = this.thrusterParticles.geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            // Move particles backward
            positions[i + 2] -= 20 * deltaTime;
            
            // Reset particles that have moved too far
            if (positions[i + 2] < -3) {
                positions[i] = (Math.random() - 0.5) * 0.5;
                positions[i + 1] = -1 + Math.random() * 0.2;
                positions[i + 2] = 0;
            }
        }
        
        this.thrusterParticles.geometry.attributes.position.needsUpdate = true;
    }

    updateTrail() {
        // Add current position to trail
        this.trailPoints.push(this.position.clone());
        
        // Limit trail length
        if (this.trailPoints.length > this.maxTrailPoints) {
            this.trailPoints.shift();
        }
    }

    flashDamage() {
        // Simple damage flash effect
        if (this.mesh) {
            const originalColor = this.mesh.material.color.clone();
            this.mesh.material.color.setHex(0xff0000);
            
            setTimeout(() => {
                if (this.mesh) {
                    this.mesh.material.color.copy(originalColor);
                }
            }, 100);
        }
    }

    constrainToWorldBounds() {
        const worldSize = 45; // Slightly smaller than arena
        
        this.position.x = THREE.MathUtils.clamp(this.position.x, -worldSize, worldSize);
        this.position.z = THREE.MathUtils.clamp(this.position.z, -worldSize, worldSize);
        this.position.y = Math.max(0.5, this.position.y); // Stay above ground
    }

    updateMeshPosition() {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
        }
    }

    // Getters
    getPosition() {
        return this.position.clone();
    }

    getRadius() {
        return this.radius;
    }

    getFireRate() {
        return this.powerUps.rapidFire.active ? this.weapon.fireRate * 0.5 : this.weapon.fireRate;
    }

    getWeaponDamage() {
        return this.weapon.damage * this.powerUps.damage.multiplier;
    }

    getHealth() {
        return this.health;
    }

    getEnergy() {
        return this.energy;
    }

    getHealthPercentage() {
        return (this.health / this.maxHealth) * 100;
    }

    getEnergyPercentage() {
        return (this.energy / this.maxEnergy) * 100;
    }

    // Setters
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.updateMeshPosition();
    }

    setRotation(x, y, z) {
        this.rotation.set(x, y, z);
        this.updateMeshPosition();
    }

    reset() {
        this.health = this.maxHealth;
        this.energy = this.maxEnergy;
        this.position.set(0, 2, 0);
        this.rotation.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        
        // Clear power-ups
        Object.keys(this.powerUps).forEach(type => {
            this.removePowerUp(type);
        });
        
        this.updateMeshPosition();
        
        console.log('🔄 Player reset');
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        
        console.log('💥 Player destroyed');
    }
}